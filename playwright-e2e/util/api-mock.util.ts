import type { BrowserContext, Page, Route } from '@playwright/test';
import { CommonFunctions } from './common.util';

const log = new CommonFunctions();

export interface MockCall {
  method: string;
  url: string;
  timestamp: string;
  /** Request body, recorded by mocks whose contract includes what the UI sent. */
  body?: string;
}

export interface MockHandle {
  (): Promise<void>;
  unroute: () => Promise<void>;
  calls: MockCall[];
}

export type UnrouteFn = MockHandle;

export interface JsonMockHandle extends MockHandle {
  /** Changes what the route answers from now on. */
  respondWith: (body: unknown, status?: number) => void;
}

/** Installs `handler` on `url` and returns a handle that removes it, without waiting long on a closing context. */
const trackedRoute = async (
  context: BrowserContext,
  url: string | RegExp,
  handler: (route: Route) => Promise<void>,
  calls: MockCall[]
): Promise<MockHandle> => {
  await context.route(url, handler);
  const unrouteFn: any = async () => {
    await Promise.race([
      context.unroute(url, handler).catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  };
  unrouteFn.unroute = unrouteFn;
  unrouteFn.calls = calls;
  return unrouteFn as MockHandle;
};

const serializeBody = (body: unknown): string => (typeof body === 'string' ? body : JSON.stringify(body));

/**
 * Mocks a network request on the BrowserContext with a JSON response.
 * Planning Space MFE relays its API calls to the portal shell via `apim:relay:request`,
 * so routes must be set on the BrowserContext to intercept traffic from all frames.
 * Install it before the first navigation: `context.route` on a loaded MFE page can hang (T9.7, 2026-11-06).
 * To test several states in one file, keep one route and change its answer with `respondWith`.
 * Returns a callable handle with request tracking (`.calls`).
 */
export const mockJson = async (
  context: BrowserContext,
  url: string | RegExp,
  body: unknown,
  options: { status?: number; headers?: Record<string, string> } = {}
): Promise<JsonMockHandle> => {
  let status = options.status ?? 200;
  let serializedBody = serializeBody(body);
  const pattern = typeof url === 'string' ? url : url.source;
  const calls: MockCall[] = [];

  const handler = async (route: Route) => {
    const method = route.request().method();
    const reqUrl = route.request().url();
    // Read together, so a respondWith during the log can't pair one state's status with another's body.
    const responseStatus = status;
    const responseBody = serializedBody;
    calls.push({ method, url: reqUrl, timestamp: new Date().toISOString() });
    await log.logMessage('INFO', `[MOCK] ${method} ${pattern} -> ${responseStatus}`);
    await route.fulfill({
      status: responseStatus,
      contentType: 'application/json',
      headers: {
        'access-control-allow-origin': '*',
        ...options.headers,
      },
      body: responseBody,
    });
  };

  await context.route(url, handler);

  const unrouteFn: any = async () => {
    try {
      await Promise.race([
        context.unroute(url, handler),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch {
      // Ignored if context is already closing/closed
    }
  };
  unrouteFn.unroute = unrouteFn;
  unrouteFn.calls = calls;
  unrouteFn.respondWith = (nextBody: unknown, nextStatus = 200) => {
    serializedBody = serializeBody(nextBody);
    status = nextStatus;
  };

  return unrouteFn as JsonMockHandle;
};

/**
 * Fulfills matched requests with a specific HTTP status code (e.g. 401, 403, 500).
 */
export const mockStatus = async (
  context: BrowserContext,
  url: string | RegExp,
  status: number,
  body?: unknown
): Promise<UnrouteFn> => {
  const responseBody = body !== undefined
    ? body
    : { status, message: `Synthetic mock response for status ${status}` };
  return mockJson(context, url, responseBody, { status });
};

/**
 * Simulates network latency by delaying the request before allowing it to proceed.
 */
export const mockDelay = async (
  context: BrowserContext,
  url: string | RegExp,
  delayMs: number
): Promise<UnrouteFn> => {
  const pattern = typeof url === 'string' ? url : url.source;

  const handler = async (route: Route) => {
    await log.logMessage('INFO', `[MOCK DELAY] Delaying ${pattern} by ${delayMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.continue();
  };

  await context.route(url, handler);

  const unrouteFn: any = async () => {
    try {
      await Promise.race([
        context.unroute(url, handler),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch {
      // Ignored
    }
  };
  unrouteFn.unroute = unrouteFn;
  unrouteFn.calls = [];

  return unrouteFn as MockHandle;
};

/**
 * Mocks Vertical Filter config and presets to return an empty list.
 * This triggers the "no filter configured" / Unified Empty State prompt
 * (`filterConfigure-title` "Welcome to the <process>." and "Set Filter" action button)
 * for interactive OnDemandMaas views without altering live tenant database state.
 * Returns a MockHandle with aggregated request tracking across all VF endpoints.
 */
export const mockEmptyVerticalFilter = async (context: BrowserContext): Promise<MockHandle> => {
  const handles: MockHandle[] = [];

  // Mapped presets for view
  handles.push(await mockJson(context, '**/search-preset**', { presets: [] }));
  // Vertical filter BFF preference/config
  handles.push(await mockJson(context, '**/lui/verticalFilterBff/v1/config/**', { entities: [] }));
  // Vertical filter presets
  handles.push(await mockJson(context, '**/view-filter/v1/presets**', { entities: [] }));
  // Empty filters list
  handles.push(await mockJson(context, '**/lui/verticalFilterBff/v1/filters/**', { filters: [], entities: [] }));

  const unrouteFn: any = async () => {
    try {
      await Promise.race([
        Promise.all(handles.map((handle) => handle().catch(() => {}))),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch {
      // Ignored
    }
  };
  unrouteFn.unroute = unrouteFn;
  Object.defineProperty(unrouteFn, 'calls', {
    get: () => handles.flatMap((h) => h.calls),
  });

  return unrouteFn as MockHandle;
};

/**
 * Makes `scenarioName` the user's default scenario in the live scenario list (`POST simulations/search`), which is what
 * the scenario chip shows. Live specs for the same user, such as OnDemandMaas Test_001, change the real default while
 * they run, so a mocked spec that checks the chip has to pin it.
 */
export const pinDefaultScenario = async (context: BrowserContext, scenarioName: string): Promise<MockHandle> => {
  const url = '**/simulations/search*';
  const calls: MockCall[] = [];

  const handler = async (route: Route) => {
    const request = route.request();
    calls.push({ method: request.method(), url: request.url(), timestamp: new Date().toISOString() });
    const response = await route.fetch();
    if (!response.ok()) {
      await route.fulfill({ response });
      return;
    }
    const body = await response.json();
    await route.fulfill({
      response,
      json: {
        ...body,
        entities: (body.entities ?? []).map((scenario: { scenarioName?: string }) => ({
          ...scenario,
          isDefault: scenario.scenarioName === scenarioName,
        })),
      },
    });
  };

  await context.route(url, handler);

  const unrouteFn: any = async () => {
    await Promise.race([
      context.unroute(url, handler).catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  };
  unrouteFn.unroute = unrouteFn;
  unrouteFn.calls = calls;

  return unrouteFn as MockHandle;
};

/** Removes the MFE's cached process feature flags (`contextFeatures_<realm>_<process>` in localStorage) from every frame. */
export const clearCachedProcessFeatures = async (page: Page): Promise<void> => {
  await Promise.all(page.frames().map((frame) => frame.evaluate(() => {
    Object.keys(localStorage).filter((key) => key.startsWith('contextFeatures_')).forEach((key) => localStorage.removeItem(key));
  }).catch(() => undefined)));
};

/**
 * Turns on one process-level feature flag in the live response of `GET .../featuretoggle/process/<name>`.
 * The MFE caches that response in localStorage, so the cache is cleared on every page load from here on. Install this
 * before the first navigation and call `clearCachedProcessFeatures` when finished, or the mocked value reaches later specs.
 */
export const enableProcessFeature = async (context: BrowserContext, featureName: string): Promise<MockHandle> => {
  const url = '**/featuretoggle/process/**';
  const calls: MockCall[] = [];
  await context.addInitScript(() => {
    Object.keys(localStorage).filter((key) => key.startsWith('contextFeatures_')).forEach((key) => localStorage.removeItem(key));
  });

  const handler = async (route: Route) => {
    calls.push({ method: route.request().method(), url: route.request().url(), timestamp: new Date().toISOString() });
    const response = await route.fetch();
    const body = response.ok() ? await response.json() : null;
    if (!Array.isArray(body)) {
      await route.fulfill({ response });
      return;
    }
    const others = body.filter((feature: { name?: string }) => feature.name !== featureName);
    await route.fulfill({ response, json: [...others, { name: featureName, isEnabled: true }] });
  };

  return trackedRoute(context, url, handler, calls);
};

/** Rewrites the live scenario list (`POST simulations/search`), e.g. to give rows a sync status that can't be set up for real. */
export const patchScenarioList = async (
  context: BrowserContext,
  transform: (entities: Array<Record<string, unknown>>) => Array<Record<string, unknown>>
): Promise<MockHandle> => {
  const url = '**/simulations/search*';
  const calls: MockCall[] = [];

  const handler = async (route: Route) => {
    calls.push({ method: route.request().method(), url: route.request().url(), timestamp: new Date().toISOString() });
    const response = await route.fetch();
    if (!response.ok()) {
      await route.fulfill({ response });
      return;
    }
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, entities: transform(body.entities ?? []) } });
  };

  return trackedRoute(context, url, handler, calls);
};

/**
 * Rewrites the `user` part of the live preferences (`GET uiConfiguration/v1/preferences`), which holds what the user
 * last selected (scenarios, filters, panel state). Install it before the first navigation: the MFE reads the
 * preferences once per page load.
 */
export const patchUserPreferences = async (
  context: BrowserContext,
  transform: (user: Record<string, unknown>) => Record<string, unknown>
): Promise<MockHandle> => {
  const url = /\/uiConfiguration\/v1\/preferences(?:\?|$)/;
  const calls: MockCall[] = [];

  const handler = async (route: Route) => {
    calls.push({ method: route.request().method(), url: route.request().url(), timestamp: new Date().toISOString() });
    const response = await route.fetch();
    if (!response.ok()) {
      await route.fulfill({ response });
      return;
    }
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, user: transform(body.user ?? {}) } });
  };

  return trackedRoute(context, url, handler, calls);
};

/**
 * Makes `scenarioIds` the scenarios the user has selected in `processName` (the `selectedScenarios` preference, which
 * the power bar badge counts next to the default scenario). Ids that aren't in the scenario list are ignored by the MFE.
 * The key is `plan.sop.lui.<namespace>.<process>.selectedScenarios`; an existing one is reused for the namespace.
 */
export const selectScenariosInPreferences = async (context: BrowserContext, processName: string, scenarioIds: string[]): Promise<MockHandle> => {
  const suffix = `.${processName}.selectedScenarios`;
  return patchUserPreferences(context, (user) => {
    const key = Object.keys(user).find((name) => name.endsWith(suffix)) ?? `plan.sop.lui.ibppsintegration${suffix}`;
    return { ...user, [key]: { selectedScenarios: scenarioIds } };
  });
};

/**
 * Mocks the MaaS Planning Instance matching session and cluster details
 * to return a specific state ('error', 'started', 'inprogress', etc.).
 *
 * NOTE (T9.6 / Copilot review): Response schema is strictly aligned with the production
 * MFE contract (`MatchedSessionDetails` and `DataSyncCardProps`) defined in
 * `plan-sop-planning-mfe/src/hooks/useUpdateMfeInfo.ts` and `DataSyncWidget.tsx`.
 * On shared live environments, instances rarely stay in error states naturally,
 * so this contract reflects the exact Redux and hook contract consumed by the UI.
 *
 * Returns a MockHandle with aggregated request tracking across matching session and polling routes.
 */
export const mockPlanningInstanceStatus = async (
  context: BrowserContext,
  status: 'error' | 'started' | 'inprogress' | 'stopped',
  options: {
    instanceId?: string;
    procedureExecutionId?: string;
    procedureName?: string;
    scenarioId?: string;
  } = {}
): Promise<MockHandle> => {
  const instanceId = options.instanceId || 'mock-planning-instance-001';
  const procedureExecutionId = options.procedureExecutionId || 'mock-proc-exec-001';
  const procedureName = options.procedureName || 'MockProcedureExecution';
  const scenarioId = options.scenarioId || 'MockScenario';

  const instancePayload = {
    id: instanceId,
    status,
    procedureExecutionId,
    procedureName,
    scenarioId,
    dateUpdated: new Date().toISOString(),
    lastUpdateDate: new Date().toISOString(),
    createdBy: 'AutomationUser',
    runByUser: 'AutomationUser',
  };

  const matchingSessionPayload = {
    sessionMatched: true,
    sparqAssociated: false,
    finalScope: null,
    planningInstance: instancePayload,
  };

  const handles: MockHandle[] = [];

  // 1. matchingSession endpoint (with optional query parameters)
  handles.push(
    await mockJson(
      context,
      '**/planningInstance/getMatchingSession*',
      matchingSessionPayload
    )
  );

  // 2. direct instance status polling endpoint
  handles.push(
    await mockJson(
      context,
      new RegExp(`/planningInstance/(?:clusters/)?${instanceId}(?:/|\\?|$)`),
      instancePayload
    )
  );

  const unrouteFn: any = async () => {
    try {
      await Promise.race([
        Promise.all(handles.map((handle) => handle().catch(() => {}))),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch {
      // Ignored
    }
  };
  unrouteFn.unroute = unrouteFn;
  Object.defineProperty(unrouteFn, 'calls', {
    get: () => handles.flatMap((h) => h.calls),
  });

  return unrouteFn as MockHandle;
};

export interface ActivePlanningInstanceOptions {
  instanceId?: string;
  procedureExecutionId?: string;
  procedureName?: string;
  /** User id the Data Sync card resolves to a name through the process user list (`mockProcessUsers`). */
  createdBy?: string;
  calcEngineId?: string;
  /** Defaults to true. False with `sparqAssociated` makes the MFE ask which session to use (the Sync Interactive Data popup). */
  sessionMatched?: boolean;
  /** Defaults to false. */
  sparqAssociated?: boolean;
}

/**
 * Mocks a planning instance that is `started` or `inprogress`: `POST planningInstance/getMatchingSession` and the
 * `GET planningInstance/clusters/<id>` poll. The scenario hierarchy is built from the `scenarioId` the MFE sends in the
 * matching-session request (its default scenario), so the Data Sync card and More details modal list the live default
 * scenario. `engineContext.maas` is required: planning-mfe `getCalEngineId` reads it as soon as the status is `started`.
 * The status is upper case like the service sends it: the Troubleshoot button compares it with `STARTED` as is.
 * Calls to the matching session keep the request body, to assert what the UI sent.
 */
export const mockActivePlanningInstance = async (
  context: BrowserContext,
  status: 'started' | 'inprogress',
  options: ActivePlanningInstanceOptions = {}
): Promise<MockHandle> => {
  const instanceId = options.instanceId || 'mock-planning-instance-001';
  const calcEngineId = options.calcEngineId || 'mock-calc-engine-001';
  const timestamp = new Date().toISOString();
  const calls: MockCall[] = [];
  let scenarioId = '';

  const instance = () => ({
    id: instanceId,
    status: status.toUpperCase(),
    scenarioId,
    scenarioHierarchy: scenarioId ? [{ scenarioId, parentScenarioId: null }] : [],
    procedureExecutionId: options.procedureExecutionId || 'mock-proc-exec-001',
    procedureName: options.procedureName || 'MockProcedureExecution',
    procedureStartTime: timestamp,
    dateUpdated: timestamp,
    createdBy: options.createdBy || 'mock-user-001',
    engineContext: { maas: { engineId: calcEngineId, customAttributes: { CALC_ENGINE_ID: calcEngineId } } },
  });

  const fulfillJson = async (route: Route, label: string, body: unknown) => {
    await log.logMessage('INFO', `[MOCK] ${route.request().method()} ${label} -> 200 (status: ${status})`);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(body),
    });
  };

  const matchingSessionHandler = async (route: Route) => {
    const request = route.request();
    calls.push({ method: request.method(), url: request.url(), timestamp: new Date().toISOString(), body: request.postData() ?? undefined });
    try {
      scenarioId = request.postDataJSON()?.scenarioId || scenarioId;
    } catch {
      // A body that isn't JSON leaves the hierarchy as it was.
    }
    await fulfillJson(route, 'planningInstance/getMatchingSession', {
      sessionMatched: options.sessionMatched ?? true,
      sparqAssociated: options.sparqAssociated ?? false,
      finalScope: null,
      planningInstance: instance(),
    });
  };

  const pollHandler = async (route: Route) => {
    const request = route.request();
    calls.push({ method: request.method(), url: request.url(), timestamp: new Date().toISOString() });
    await fulfillJson(route, `planningInstance/clusters/${instanceId}`, instance());
  };

  const handles = [
    await trackedRoute(context, '**/planningInstance/getMatchingSession*', matchingSessionHandler, calls),
    await trackedRoute(context, new RegExp(`/planningInstance/(?:clusters/)?${instanceId}(?:\\?|$)`), pollHandler, calls),
  ];

  const unrouteFn: any = async () => {
    await Promise.all(handles.map((handle) => handle()));
  };
  unrouteFn.unroute = unrouteFn;
  unrouteFn.calls = calls;

  return unrouteFn as MockHandle;
};

export interface MockProcessUser {
  userId: string;
  fullName: string;
}

/** Serves the user list of a process (`GET /process/<name>/users`), which the Data Sync card uses to turn `createdBy` into the "Run by" name. */
export const mockProcessUsers = async (context: BrowserContext, processName: string, users: MockProcessUser[]): Promise<JsonMockHandle> => {
  const escapedName = processName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return mockJson(context, new RegExp(`/process/${escapedName}/users(?:\\?|$)`), users);
};
