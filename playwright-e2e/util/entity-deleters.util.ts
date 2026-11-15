import * as fs from 'fs';
import * as path from 'path';
import type { WorkerInfo } from '@playwright/test';
import { ApiUtil } from './api.util';
import { CommonFunctions } from './common.util';
import { logger } from './logger';
import { applyRealmKeyOverride } from './gateway.util';
import { deleteProcessWithReferences } from './process-fixture.util';
import { ActionItemApiHelper } from './action-item.util';
import { cleanupCalendars, cleanupEntityViewProcedureMaps, cleanupSupplyChainActions, type AlmCleanupContext } from './alm-migration.util';
import { deleteScenarioById, findScenarioEntity, searchScenarios } from './scenario-cleanup.util';
import { deleteViewById, deleteViewGroupById } from './dashboard.util';
import { deleteSavedFilter, listSavedFilters, type IVerticalFilterAccess } from './vertical-filter.util';
import { assertDeletedStatus, CreatedEntities, type CreatedEntity, type Deleter, type Deleters, type EntityKind } from './created-entities.util';

export const CLEANUP_REPORT_DIR = path.join(__dirname, '..', 'reports', 'cleanup');

/*
 * One deleter per EntityKind, built on the existing API helpers. What each kind expects at registration:
 *   process            name = process name; context.subjectId (optional) is unassigned from the process roles too.
 *   scenario           id = simulationId, or name + context.processName (or context.searchBody, a JSON search body).
 *   view               id = view id (required).
 *   viewGroup          id = view group (container) id (required).
 *   scopeFilter        id (required; the saved filter id from listSavedFilters) + context.baseUrl and context.instance + authorization (user-owned).
 *   calendar           name = calendar name; shared calendars are never deleted.
 *   supplyChainAction  name = supply chain action name.
 *   actionItem         id = action item id (required).
 *   procedureMapping   context.entityId and context.viewId (subprocess entity).
 * `authorization` (the captured user header) is used where given; otherwise the machine client token, fetched once
 * per realm per cleanup run. Every deleter treats 404 / "already gone" as success.
 */

type Headers = Record<string, string>;

const requireValue = (value: string | undefined, entity: CreatedEntity, field: string): string => {
  if (!value) {
    throw new Error(`${entity.kind} '${entity.name}' was registered without ${field}`);
  }
  return value;
};

const requireAll = (results: boolean[], label: string): void => {
  if (!results.every(Boolean)) {
    throw new Error(`${label} did not complete`);
  }
};

/** Builds the default deleters. Call once per cleanup run: the machine token is cached per realm for that run only. */
export function defaultDeleters(apiUtil: ApiUtil = new ApiUtil(), commonFunctions: CommonFunctions = new CommonFunctions()): Deleters {
  const machineHeaders = new Map<string, Promise<Headers>>();
  const headersFor = (entity: CreatedEntity): Promise<Headers> => {
    if (entity.authorization) {
      return Promise.resolve({ accept: 'application/json', Authorization: entity.authorization });
    }
    const key = entity.realmKey || '';
    if (!machineHeaders.has(key)) {
      const pending = apiUtil.buildAuthHeaders();
      pending.catch(() => machineHeaders.delete(key));
      machineHeaders.set(key, pending);
    }
    return machineHeaders.get(key) as Promise<Headers>;
  };
  const almContext = async (entity: CreatedEntity): Promise<AlmCleanupContext> => {
    const headers = await headersFor(entity);
    return { apiUtil, commonFunctions, sourceHeaders: headers, targetHeaders: headers };
  };

  const deleters: Record<EntityKind, Deleter> = {
    process: async (entity) => {
      const done = await deleteProcessWithReferences(apiUtil, commonFunctions, await headersFor(entity), entity.name, [entity.context?.subjectId]);
      requireAll([done], `Delete process ${entity.name} with its references`);
    },

    scenario: async (entity) => {
      const headers = await headersFor(entity);
      let simulationId = entity.id;
      if (!simulationId) {
        const searchBody = entity.context?.searchBody ? JSON.parse(entity.context.searchBody) : { sourceIds: [requireValue(entity.context?.processName, entity, 'id or context.processName')] };
        const search = await searchScenarios(searchBody, headers, `Find scenario ${entity.name} for cleanup`);
        // A failed search must not read as "already gone".
        if (String(search?.status) !== '200' || !Array.isArray(search?.data?.entities)) {
          throw new Error(`Scenario search for ${entity.name} returned ${search?.status}`);
        }
        simulationId = findScenarioEntity(search.data.entities, [entity.name])?.simulationId;
        if (!simulationId) {
          return;
        }
      }
      const response = await deleteScenarioById(simulationId, headers, `Cleanup scenario ${entity.name}`);
      assertDeletedStatus(response?.status, `Delete scenario ${entity.name}`);
    },

    view: async (entity) => {
      const response = await deleteViewById(requireValue(entity.id, entity, 'id'), await headersFor(entity), `Cleanup view ${entity.name}`);
      assertDeletedStatus(response?.status, `Delete view ${entity.name}`);
    },

    viewGroup: async (entity) => {
      const response = await deleteViewGroupById(requireValue(entity.id, entity, 'id'), await headersFor(entity), `Cleanup view group ${entity.name}`);
      assertDeletedStatus(response?.status, `Delete view group ${entity.name}`);
    },

    scopeFilter: async (entity) => {
      const access: IVerticalFilterAccess = {
        baseUrl: requireValue(entity.context?.baseUrl, entity, 'context.baseUrl'),
        instance: requireValue(entity.context?.instance, entity, 'context.instance'),
        authorization: requireValue(entity.authorization, entity, 'authorization')
      };
      if (!entity.id) {
        // A label match could hit another run's filter with the same name, so only a registered id is deleted.
        throw new Error(`scopeFilter '${entity.name}' was registered without id; take it from listSavedFilters after saving`);
      }
      const filter = (await listSavedFilters(access)).find(({ id }) => id === entity.id);
      if (filter) {
        await deleteSavedFilter(access, filter);
      }
    },

    calendar: async (entity) => {
      requireAll(await cleanupCalendars({ calendars: [entity.name] }, 'createdEntities', await almContext(entity)), `Delete calendar ${entity.name}`);
    },

    supplyChainAction: async (entity) => {
      requireAll(await cleanupSupplyChainActions({ supplyChainActions: [entity.name] }, 'createdEntities', await almContext(entity)), `Delete supply chain action ${entity.name}`);
    },

    actionItem: async (entity) => {
      const helper = new ActionItemApiHelper(apiUtil, await headersFor(entity));
      requireAll([await helper.deleteActionItem(requireValue(entity.id, entity, 'id'))], `Delete action item ${entity.name}`);
    },

    procedureMapping: async (entity) => {
      const entityId = requireValue(entity.context?.entityId, entity, 'context.entityId');
      const viewId = requireValue(entity.context?.viewId, entity, 'context.viewId');
      const entityType = entity.context?.entityType;
      const poJson = { links: { entityViewsProcedure: [{ entityId, entityType, views: [{ id: viewId }] }] } };
      requireAll(await cleanupEntityViewProcedureMaps(poJson, 'createdEntities', await almContext(entity)), `Delete procedure mapping ${entityId}/${viewId}`);
    }
  };

  // Worker teardown runs after the per-test REALM_KEY override is restored, so switch back to the entity's tenant.
  return Object.fromEntries(Object.entries(deleters).map(([kind, deleter]) => [kind, async (entity: CreatedEntity) => {
    const restore = applyRealmKeyOverride(entity.realmKey);
    try {
      await deleter(entity);
    } finally {
      restore();
    }
  }])) as Deleters;
}

/**
 * Worker-scoped `createdEntities` fixture shared by configs/fixtures.ts and configs/api-fixtures.ts. Teardown runs after
 * the worker's last test, even after failures, deletes what is left, and writes reports/cleanup/[<PW_REPORT_TAG>-]worker-<index>.json
 * (kinds, names, ids and the registering test only). Never throws.
 */
export async function createdEntitiesWorkerFixture({}: object, use: (registry: CreatedEntities) => Promise<void>, workerInfo: WorkerInfo): Promise<void> {
  const registry = new CreatedEntities({ deleters: () => defaultDeleters(), log: (message) => { logger.info(message); } });
  await use(registry);
  try {
    await registry.cleanup();
    const summary = registry.summary();
    if (summary.deleted.length > 0 || summary.failed.length > 0) {
      fs.mkdirSync(CLEANUP_REPORT_DIR, { recursive: true });
      const report = { workerIndex: workerInfo.workerIndex, project: workerInfo.project.name, finishedAt: new Date().toISOString(), ...summary };
      // Parallel batches (PW_REPORT_TAG) share the checkout and all start at worker 0, so the tag keeps their files apart.
      const reportTag = (process.env.PW_REPORT_TAG || '').replace(/[^a-zA-Z0-9_-]+/g, '_');
      const fileName = `${reportTag ? `${reportTag}-` : ''}worker-${workerInfo.workerIndex}.json`;
      fs.writeFileSync(path.join(CLEANUP_REPORT_DIR, fileName), JSON.stringify(report, null, 2), 'utf-8');
    }
  } catch (error) {
    logger.warn(`[createdEntities] Worker cleanup report failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
