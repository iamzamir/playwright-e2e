/**
 * Every gateway endpoint, defined once. Paths are relative to API_BASE_URL.
 *
 * Placeholders:
 *   {gw}   cbp/<gatewaySegment>        (cbp/qa, cbp/interop, cbp/psr, cbp/demo)
 *   {alm}  <almSegment>                (staging, staging, psr, demo)
 *   {new}  <newUrlPrefix>              (qa/ on QA, empty on INTEROP)
 * `{processName}`-style tokens are left for the caller to fill.
 *
 * `newPath` is legacy (URL_MODE=NEW is discontinued) and is used only for environments with a
 * `newUrlPrefix` (QA, INTEROP). Give a new endpoint an `oldPath` only.
 */

import type { EnvName } from './environments';

export type Service = 'po' | 'ai' | 'lm' | 'uif' | 'alm' | 'iam' | 'foundation' | 'maas' | 'assumptions' | 'featuretoggle' | 'lui';

export interface EndpointDef {
  service: Service;
  oldPath: string;
  newPath?: string;
  /** Environments that define this key; absent means all. */
  envs?: readonly EnvName[];
  /** Paths that don't follow the {gw} pattern in a given environment. */
  overrides?: Partial<Record<EnvName, string>>;
}

const po = (path: string): EndpointDef => ({
  service: 'po',
  oldPath: `{gw}/ibp/process-orchestration/v1${path}`,
  newPath: `{new}po/api/v1${path}`,
});
const ai = (path: string): EndpointDef => ({
  service: 'ai',
  oldPath: `{gw}/ibp/actionitems/v1${path}`,
  newPath: `{new}ai/api/v1${path}`,
});
const lm = (path: string): EndpointDef => ({
  service: 'lm',
  oldPath: `{gw}/ibp/links/v1${path}`,
  newPath: `{new}lm/api/v1${path}`,
});
const of = (service: Service, oldPath: string, extra: Partial<EndpointDef> = {}): EndpointDef => ({ service, oldPath, ...extra });

const SNA_BFF_PAGE = '?offset=0&limit=10&hidden=false';
// QA and INTEROP reach some foundation services through their own versioned gateway routes.
const QA_FOUNDATION = 'v1qa';
const IOP_FOUNDATION = 'v1ioptst';
// PSR exposes the SNA BFF and process models as foundation-bff / foundation-model.
const snaBff = (path: string): EndpointDef => of('foundation', `{gw}/foundation/sna-bff/v1${path}`, {
  overrides: {
    QA: `cbp/foundation-bff/${QA_FOUNDATION}${path}`,
    PSR: `cbp/psr/foundation-bff/v1${path}`,
  },
});

export const ENDPOINTS = {
  // Process Orchestration
  CALENDAR: po('/calendar'),
  DELETE_CALENDAR: po('/calendar/{calendarName}'),
  ADD_CALENDAR_CYCLE: po('/calendar/{calendarName}/cycle'),
  ACTIONITEM: po('/'),
  EXCHANGE_PUBLISH: po('/configuration/exchange/publish'),
  PO_JOB_STATUS_BASE: po(''),
  EXPORT_DATA: po('/exportData'),
  IMPORT_DATA: po('/importData'),
  CREATE_PROCESS_WITH_TEMPLATE: po('/process/template'),
  GET_PROCESS_WITH_NAME: po('/process'),
  DELETE_PROCESS: po('/process/{processName}'),
  CREATE_SUBPROCESS: po('/process/{processName}/subprocess'),
  GET_SUBPROCESS_WITH_NAME: po('/process/{processName}/subprocess/{subprocessName}'),
  SUBPROCESS_ATTRIBUTE: po('/process/{processName}/subprocess/{subprocessName}/attribute'),
  UPDATE_SUBPROCESS_ATTRIBUTE: po('/process/{processName}/subprocess/{subprocessName}/attribute/{attrName}/value/{attrValue}'),
  DELETE_SUBPROCESS_ATTRIBUTE: po('/process/{processName}/subprocess/{subprocessName}/attribute/{attrName}/value/{attrValue}'),
  PROCESS_ATTRIBUTE: po('/process/{processName}/attribute'),
  DELETE_PROCESS_ATTRIBUTE: po('/process/{processName}/attribute/{attrName}/value/{attrValue}'),
  UPDATE_PROCESS_ATTRIBUTE: po('/process/{processName}/attribute/{attrName}/value/{attrValue}'),
  GET_SUPPLY_CHAIN_ACTIONS: po('/supplyChainAction'),
  DELETE_SUPPLY_CHAIN_ACTION: po('/supplyChainAction/{id}'),

  // Action Items
  ACTIONITEM2: ai('/actionitems'),
  DELETE_ACTIONITEM: ai('/actionitems/'),
  CREATE_ACTIONITEM_KPI_CONFIG: ai('/kpis'),
  DELETE_ACTIONITEM_KPI: ai('/kpis/{id}'),

  // Link Management
  VIEW_ENTITY_MAP: lm('/view-entity-map'),
  VIEW_ENTITY_PROCEDURE_MAP: lm('/entity-view-procedure-map'),
  DELETE_VIEW_ENTITY_MAP: lm('/view-entity-map/views/{viewId}/type/subprocess/entity/{entity}'),
  DELETE_ENTITY_VIEW_PROCEDURE_MAP: lm('/entity-view-procedure-map/type/{type}/entity/{entity}/views/{viewId}'),

  // UI Fields: the NEW-mode gateway prefix is unconfirmed, so both URL modes use the OLD path.
  UI_FIELDS_BASE: of('uif', '{gw}/ibp/ui-fields/v1'),

  // Assumptions and feature toggles
  CREATE_ASSUMPTION_KPI_CONFIG: of('assumptions', '{gw}/ibp/assumptions/v1/kpi_config/'),
  GET_ASSUMPTION_KPI_CONFIG: of('assumptions', '{gw}/ibp/assumptions/v1/kpi_config/'),
  DELETE_ASSUMPTION_KPI_CONFIG: of('assumptions', '{gw}/ibp/assumptions/v1/kpi_config/{id}?hard=false'),
  DELETE_ASSUMPTION_KPI_CONFIG_HARD: of('assumptions', '{gw}/ibp/assumptions/v1/kpi_config/{id}?hard=true'),
  UPDATE_FEATURE_TOGGLE: of('featuretoggle', '{gw}/ibp/featuretoggle/v1/featuretoggle/{featureFlagName}'),

  // LUI user preferences (planning-mfe `useUtil` saves UI state here); called with a user token, stored per token subject.
  USER_PREFERENCES: of('lui', 'lui/uiConfiguration/v1/userPreferences'),
  GET_USER_PREFERENCES: of('lui', 'lui/uiConfiguration/v1/preferences?applicationId={applicationId}'),

  // Foundation (simulation, interactive planning, SNA, model)
  SIMULATION: of('foundation', '{gw}/foundation/simulation/', {
    overrides: { QA: `cbp/foundation-simulation/${QA_FOUNDATION}`, INTEROP: `cbp/foundation-simulation/${IOP_FOUNDATION}` },
  }),
  SEARCH_SIMULATION: of('foundation', '{gw}/foundation/simulation/v1/simulations/search', {
    overrides: {
      QA: `cbp/foundation-simulation/${QA_FOUNDATION}/simulations/search`,
      INTEROP: `cbp/foundation-simulation/${IOP_FOUNDATION}/simulations/search`,
    },
  }),
  PLANNING_INSTANCE: of('foundation', '{gw}/foundation/interactive-planning/v1/planningInstance', {
    overrides: {
      QA: `cbp/foundation-interactive-planning/${QA_FOUNDATION}/planningInstance`,
      INTEROP: `cbp/foundation-interactive-planning/${IOP_FOUNDATION}/planningInstance`,
      // As configured historically (doubled cbp/, no version); kept until someone confirms the PSR route.
      PSR: 'cbp/cbp/psr/foundation/interactive-planning/planningInstance',
    },
  }),
  ALL_PROCEDURES_CONFIG_NAME_LIST: of('foundation', '{gw}/foundation/sna-bff/v1/allProceduresConfigNameList'),
  DELETE_ACTOR: snaBff(`/actorsConfig/{actorName}${SNA_BFF_PAGE}`),
  GET_PROCEDURES: snaBff(`/proceduresConfig${SNA_BFF_PAGE}`),
  DELETE_PROCEDURE: snaBff(`/proceduresConfig/{procedureName}${SNA_BFF_PAGE}`),
  ALM_VALIDATION: of('foundation', '{gw}/foundation/model/v1/cbpConfigurations/validate'),
  PROCESS_MODELS: of('foundation', '{gw}/foundation/model/v1/processModels', {
    overrides: {
      QA: `cbp/foundation-model/${QA_FOUNDATION}/processModels`,
      INTEROP: `cbp/foundation-model/${IOP_FOUNDATION}/processModels`,
      PSR: 'cbp/psr/foundation-model/v1/processModels',
    },
  }),
  GET_PROCESSMODEL_ENTITY: of('foundation', '{gw}/foundation/model/v1/processModels/', {
    envs: ['INTEROP', 'PSR', 'STAGE'],
    overrides: { PSR: 'cbp/psr/foundation-model/v1/processModels/' },
  }),

  // MaaS
  RESOURCE_POOL_MANAGER: of('maas', '{gw}/maas/resource-pool-manager/v1/clusters'),
  MAAS_CONFIG: of('maas', '{gw}/maas/config/v1/calcEngines'),

  // ALM
  ALM_DEPLOY_RESOURCE: of('alm', 'alm/core/{alm}/deployments/resource/{resourceId}'),
  ALM_DEPLOYMENT_STATUS: of('alm', 'alm/core/{alm}/deployments/{deploymentId}'),
  ALM_DOWNLOAD_ZIP: of('alm', 'alm/exchange/{alm}/resources/{resourceId}/downloadZip'),
  ALM_DELETE_RESOURCE: of('alm', 'alm/exchange/{alm}/resources/{resourceId}'),

  // IAM (no environment segment)
  GET_PROCESS_ROLES: of('iam', 'iam/realm/v1/roles'),
  ASSIGN_ROLE_TO_USER: of('iam', 'iam/realm/v1/roles/{roleId}/subjects'),
  UNASSIGN_ROLE_TO_USER: of('iam', 'iam/realm/v1/roles/{roleId}/subjects/{subjectId}'),
  DELETE_ROLE: of('iam', 'iam/realm/v1/roles/{roleId}'),
} satisfies Record<string, EndpointDef>;

export type EndpointKey = keyof typeof ENDPOINTS;
export const ENDPOINT_KEYS = Object.keys(ENDPOINTS) as EndpointKey[];
