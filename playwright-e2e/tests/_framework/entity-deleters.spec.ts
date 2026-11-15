import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { test, expect } from '@playwright/test';
import { ApiUtil } from '../../util/api.util';
import { CreatedEntities, type EntityKind, type RegisterOptions } from '../../util/created-entities.util';
import { defaultDeleters } from '../../util/entity-deleters.util';
import { cleanupEntityViewProcedureMaps } from '../../util/alm-migration.util';

// Contract tests for util/entity-deleters.util.ts: every deleter runs against a fake axios adapter, so the request each
// one sends and how it reads the answer are checked without an environment.

const API = 'https://api.test/';
const ENV: Record<string, string> = {
  ENVIRONMENT: 'INTEROP',
  GATEWAY_TYPE: 'AZURE',
  REALM_KEY: '',
  API_BASE_URL: API,
  ACTIONITEM: 'po/',
  ACTIONITEM2: 'ai/actionitems',
  SIMULATION: 'sim',
  SEARCH_SIMULATION: 'sim/simulations/search',
  GET_SUPPLY_CHAIN_ACTIONS: 'po/supplyChainAction',
  DELETE_SUPPLY_CHAIN_ACTION: 'po/supplyChainAction/{id}',
  DELETE_CALENDAR: 'po/calendar/{calendarName}',
  DELETE_ENTITY_VIEW_PROCEDURE_MAP: 'lm/entity-view-procedure-map/type/{type}/entity/{entity}/views/{viewId}',
  GET_PROCEDURES: 'sna/proceduresConfig?offset=0&limit=10&hidden=false',
  DELETE_PROCEDURE: 'sna/proceduresConfig/{procedureName}?offset=0&limit=10&hidden=false',
  DELETE_ACTOR: 'sna/actorsConfig/{actorName}?offset=0&limit=10&hidden=false',
  GET_PROCESS_ROLES: 'iam/realm/v1/roles',
  UNASSIGN_ROLE_TO_USER: 'iam/realm/v1/roles/{roleId}/subjects/{subjectId}',
  DELETE_ROLE: 'iam/realm/v1/roles/{roleId}',
  SUBJECT_ID: 'machine-subject'
};
const CLEARED = ['GET_PROCESSMODEL_ENTITY'];

type Reply = { status: number; data?: unknown };
type Call = { method: string; url: string; authorization?: string };
type Route = (method: string, url: string) => Reply | undefined;

let calls: Call[] = [];
let route: Route = () => undefined;

const fakeAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const method = String(config.method).toUpperCase();
  const url = String(config.url);
  calls.push({ method, url, authorization: config.headers?.Authorization as string | undefined });
  const reply = route(method, url) ?? { status: 599, data: { message: `unexpected ${method} ${url}` } };
  const response = { data: reply.data ?? '', status: reply.status, statusText: String(reply.status), headers: {}, config, request: {} };
  const valid = config.validateStatus ? config.validateStatus(reply.status) : reply.status >= 200 && reply.status < 300;
  if (!valid) {
    throw new AxiosError(`Request failed with status code ${reply.status}`, 'ERR_BAD_RESPONSE', config, {}, response);
  }
  return response;
};

const stubApiUtil = (): ApiUtil => {
  const apiUtil = new ApiUtil();
  apiUtil.buildAuthHeaders = async () => ({ accept: 'application/json', Authorization: 'Bearer machine' });
  return apiUtil;
};

const runCleanup = async (kind: EntityKind, name: string, extra: RegisterOptions = {}) => {
  const registry = new CreatedEntities({ deleters: () => defaultDeleters(stubApiUtil()), log: () => {} });
  registry.register(kind, name, extra);
  const result = await registry.cleanup();
  return { result, failure: registry.summary().failed[0]?.error };
};

const reply = (status: number, data?: unknown): Reply => ({ status, data });

test.describe('defaultDeleters contract', () => {
  const savedEnv: Record<string, string | undefined> = {};
  let savedAdapter: typeof axios.defaults.adapter;

  test.beforeAll(() => {
    for (const key of [...Object.keys(ENV), ...CLEARED]) savedEnv[key] = process.env[key];
    Object.assign(process.env, ENV);
    for (const key of CLEARED) delete process.env[key];
    savedAdapter = axios.defaults.adapter;
    axios.defaults.adapter = fakeAdapter;
  });

  test.afterAll(() => {
    axios.defaults.adapter = savedAdapter;
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  test.beforeEach(() => {
    calls = [];
    route = () => undefined;
  });

  test('process: deletes the process, then its procedure, actor and roles', async () => {
    route = (method, url) => {
      if (method === 'DELETE' && url === `${API}po/process/P1`) return reply(200);
      if (method === 'GET' && url.startsWith(`${API}sna/proceduresConfig?`)) return reply(200, { entities: [{ name: 'P1_IM', actorsConfig: ['P1_actor'] }, { name: 'Other_IM' }] });
      if (method === 'DELETE' && url.startsWith(`${API}sna/proceduresConfig/P1_IM?`)) return reply(204);
      if (method === 'DELETE' && url.startsWith(`${API}sna/actorsConfig/P1_actor?`)) return reply(404);
      if (method === 'GET' && url === `${API}iam/realm/v1/roles`) return reply(200, { entities: [{ id: 'r1', name: 'p1_admin' }, { id: 'r2', name: 'unrelated_admin' }] });
      if (method === 'GET' && url.startsWith(`${API}iam/realm/v1/roles/r1/users?`)) return reply(200, { entities: [] });
      if (method === 'DELETE' && url === `${API}iam/realm/v1/roles/r1/subjects/machine-subject`) return reply(204);
      if (method === 'DELETE' && url === `${API}iam/realm/v1/roles/r1`) return reply(204);
      return undefined;
    };
    const { result } = await runCleanup('process', 'P1');
    expect(result.deleted).toBe(1);
    expect(calls.filter((call) => call.method === 'DELETE').map((call) => call.url.split('?')[0])).toEqual([
      `${API}po/process/P1`,
      `${API}sna/proceduresConfig/P1_IM`,
      `${API}sna/actorsConfig/P1_actor`,
      `${API}iam/realm/v1/roles/r1/subjects/machine-subject`,
      `${API}iam/realm/v1/roles/r1`
    ]);
    expect(calls.every((call) => call.authorization === 'Bearer machine')).toBe(true);
  });

  test('process: 401 IBP_40_1032 counts as gone; a failed role lookup fails the cleanup', async () => {
    route = (method, url) => {
      if (method === 'DELETE' && url === `${API}po/process/P2`) return reply(401, { errorCode: 'IBP_40_1032' });
      if (method === 'GET' && url.startsWith(`${API}sna/proceduresConfig?`)) return reply(200, { entities: [] });
      if (method === 'GET' && url === `${API}iam/realm/v1/roles`) return reply(500);
      return undefined;
    };
    const { result } = await runCleanup('process', 'P2');
    expect(result.failed).toHaveLength(1);
    expect(calls.some((call) => call.method === 'DELETE' && call.url === `${API}po/process/P2`)).toBe(true);
  });

  test('scenario by id: deletes the simulation with the registered user token; 404 is gone, 500 fails', async () => {
    route = (method, url) => (method === 'DELETE' && url === `${API}sim/simulations/sim-1` ? reply(404) : undefined);
    expect((await runCleanup('scenario', 'S1', { id: 'sim-1', authorization: 'Bearer user' })).result.deleted).toBe(1);
    expect(calls[0].authorization).toBe('Bearer user');

    route = (method, url) => (method === 'DELETE' && url === `${API}sim/simulations/sim-1` ? reply(500) : undefined);
    expect((await runCleanup('scenario', 'S1', { id: 'sim-1' })).failure).toMatch(/returned 500/);
  });

  test('scenario by name: searches by process, deletes the exact match, and fails on a failed search', async () => {
    route = (method, url) => {
      if (method === 'POST' && url === `${API}sim/simulations/search?limit=1000`) return reply(200, { entities: [{ scenarioName: 'S10', simulationId: 'x' }, { scenarioName: 'S1', simulationId: 'sim-2' }] });
      if (method === 'DELETE' && url === `${API}sim/simulations/sim-2`) return reply(204);
      return undefined;
    };
    expect((await runCleanup('scenario', 'S1', { context: { processName: 'Proc' }, authorization: 'Bearer user' })).result.deleted).toBe(1);
    expect(calls.map((call) => call.method)).toEqual(['POST', 'DELETE']);
    expect(calls.every((call) => call.authorization === 'Bearer user')).toBe(true);

    calls = [];
    route = (method) => (method === 'POST' ? reply(200, { entities: [] }) : undefined);
    expect((await runCleanup('scenario', 'Gone', { context: { processName: 'Proc' } })).result.deleted).toBe(1);
    expect(calls.map((call) => call.method)).toEqual(['POST']);

    route = (method) => (method === 'POST' ? reply(401) : undefined);
    expect((await runCleanup('scenario', 'S1', { context: { processName: 'Proc' } })).failure).toMatch(/search .* returned 401/i);

    expect((await runCleanup('scenario', 'S1')).failure).toMatch(/without id or context\.processName/);
  });

  test('view and view group: delete by id on the dashboard service; 404 is gone; id is required', async () => {
    route = (method, url) => (method === 'DELETE' && url === `${API}lui/dashboard/v2/dashboardsByViewId/v-1` ? reply(204) : undefined);
    expect((await runCleanup('view', 'V1', { id: 'v-1' })).result.deleted).toBe(1);

    route = (method, url) => (method === 'DELETE' && url === `${API}lui/dashboard/v2/dashboards/containersRealm/vg-1` ? reply(404) : undefined);
    expect((await runCleanup('viewGroup', 'VG1', { id: 'vg-1' })).result.deleted).toBe(1);

    route = () => reply(403);
    expect((await runCleanup('viewGroup', 'VG1', { id: 'vg-1' })).failure).toMatch(/returned 403/);
    expect((await runCleanup('view', 'V1')).failure).toMatch(/without id/);
  });

  test('scopeFilter: deletes only the registered id with the user token; absent id is gone; id is required', async () => {
    const context = { baseUrl: 'https://bff.test/lui/verticalFilterBff/v1', instance: 'vf-cognitive-planning' };
    const listUrl = 'https://bff.test/lui/verticalFilterBff/v1/config/vf-cognitive-planning';
    route = (method, url) => {
      if (method === 'GET' && url === listUrl) return reply(200, { entities: [{ id: 'f-1', label: 'F1' }, { id: 'f-2', label: 'F1' }] });
      if (method === 'DELETE' && url === 'https://bff.test/lui/verticalFilterBff/v1/filters/vf-cognitive-planning/f-1?isDraft=false') return reply(404);
      return undefined;
    };
    expect((await runCleanup('scopeFilter', 'F1', { id: 'f-1', context, authorization: 'Bearer user' })).result.deleted).toBe(1);
    expect(calls.filter((call) => call.method === 'DELETE')).toHaveLength(1);
    expect(calls.every((call) => call.authorization === 'Bearer user')).toBe(true);

    calls = [];
    route = (method, url) => (method === 'GET' && url === listUrl ? reply(200, { entities: [] }) : undefined);
    expect((await runCleanup('scopeFilter', 'F1', { id: 'f-9', context, authorization: 'Bearer user' })).result.deleted).toBe(1);
    expect(calls.map((call) => call.method)).toEqual(['GET']);

    expect((await runCleanup('scopeFilter', 'F1', { context, authorization: 'Bearer user' })).failure).toMatch(/without id/);
    expect((await runCleanup('scopeFilter', 'F1', { id: 'f-1', context })).failure).toMatch(/without authorization/);
  });

  test('calendar: deletes by name, 404 is gone, shared calendars are never deleted', async () => {
    route = (method, url) => (method === 'DELETE' && url === `${API}po/calendar/Cal1` ? reply(404) : undefined);
    expect((await runCleanup('calendar', 'Cal1')).result.deleted).toBe(1);

    calls = [];
    expect((await runCleanup('calendar', 'Monthly Calendar')).result.deleted).toBe(1);
    expect(calls).toHaveLength(0);

    route = () => reply(409);
    expect((await runCleanup('calendar', 'Cal1')).failure).toMatch(/did not complete/);
  });

  test('supplyChainAction: deletes exact-name matches by id; 404 is gone; a failed list fails', async () => {
    route = (method, url) => {
      if (method === 'GET' && url === `${API}po/supplyChainAction`) return reply(200, [{ id: 'a1', name: 'SCA1' }, { id: 'a2', name: 'SCA10' }]);
      if (method === 'DELETE' && url === `${API}po/supplyChainAction/a1`) return reply(404);
      return undefined;
    };
    expect((await runCleanup('supplyChainAction', 'SCA1')).result.deleted).toBe(1);
    expect(calls.filter((call) => call.method === 'DELETE').map((call) => call.url)).toEqual([`${API}po/supplyChainAction/a1`]);

    route = (method) => (method === 'GET' ? reply(500, { message: 'down' }) : undefined);
    expect((await runCleanup('supplyChainAction', 'SCA1')).failure).toMatch(/did not complete/);
  });

  test('actionItem: deletes by id on the action item service; 404 is gone; id is required', async () => {
    route = (method, url) => (method === 'DELETE' && url === `${API}ai/actionitems/ai-1` ? reply(404) : undefined);
    expect((await runCleanup('actionItem', 'AI1', { id: 'ai-1' })).result.deleted).toBe(1);

    route = () => reply(500);
    expect((await runCleanup('actionItem', 'AI1', { id: 'ai-1' })).failure).toMatch(/did not complete/);
    expect((await runCleanup('actionItem', 'AI1')).failure).toMatch(/without id/);
  });

  test('procedureMapping: deletes the entity/view mapping; 404 is gone; context is required', async () => {
    route = (method, url) => (method === 'DELETE' && url === `${API}lm/entity-view-procedure-map/type/subprocess/entity/e-1/views/v-1` ? reply(404) : undefined);
    expect((await runCleanup('procedureMapping', 'M1', { context: { entityId: 'e-1', viewId: 'v-1' } })).result.deleted).toBe(1);

    route = (method, url) => (method === 'DELETE' && url === `${API}lm/entity-view-procedure-map/type/process/entity/proc-1/views/v-2` ? reply(204) : undefined);
    expect((await runCleanup('procedureMapping', 'M2', { context: { entityId: 'proc-1', viewId: 'v-2', entityType: 'process' } })).result.deleted).toBe(1);

    expect((await runCleanup('procedureMapping', 'M1', { context: { entityId: 'e-1' } })).failure).toMatch(/without context\.viewId/);
  });

  test('cleanupEntityViewProcedureMaps: resolves process vs subprocess route via entityType or poJson process names', async () => {
    const deletedUrls: string[] = [];
    route = (method, url) => {
      if (method === 'DELETE') {
        deletedUrls.push(url);
        return reply(204);
      }
      return undefined;
    };

    const poJson = {
      processes: [{ name: 'ProcessAlpha' }],
      links: {
        entityViewsProcedure: [
          { entityId: 'ProcessAlpha', views: [{ id: 'v-100' }] },
          { entityId: 'SubprocessBeta', views: [{ id: 'v-200' }] },
          { entityId: 'SubWithExplicitType', entityType: 'process', views: [{ id: 'v-300' }] }
        ]
      }
    };

    const almCtx = {
      apiUtil: stubApiUtil(),
      commonFunctions: {
        logMessage: () => {},
        isStatus: (status: any, code: number) => status === code || status === String(code),
        compareTwoValues: (actual: any, expected: any) => actual === expected
      } as any,
      sourceHeaders: { Authorization: 'Bearer test' },
      targetHeaders: { Authorization: 'Bearer test' }
    };

    const results = await cleanupEntityViewProcedureMaps(poJson, 'test', almCtx);
    expect(results).toEqual([true, true, true]);
    expect(deletedUrls).toEqual([
      `${API}lm/entity-view-procedure-map/type/process/entity/ProcessAlpha/views/v-100`,
      `${API}lm/entity-view-procedure-map/type/subprocess/entity/SubprocessBeta/views/v-200`,
      `${API}lm/entity-view-procedure-map/type/process/entity/SubWithExplicitType/views/v-300`
    ]);
  });
});
