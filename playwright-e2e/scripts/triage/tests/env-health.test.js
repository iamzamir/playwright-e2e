// Unit tests for the E8 environment health probe and how the verdict and run data use it. Run: npm run test:triage
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildChecks, probeEnvironment, renderSummary, safeUrl } = require('../env-health');
const { computeVerdict, summarizeEnvHealth, ENV_HEALTH_REASON } = require('../verdict');
const { envHealthRecord } = require('../build-run-data');
const { summarizeTests } = require('../lib/allure-results');

const ENV = {
  ENVIRONMENT: 'INTEROP',
  GATEWAY_TYPE: 'AZURE',
  AUTH_URL: 'https://login.example.test/oauth2/token',
  REALM_ID: 'realm-1',
  CLIENT_ID: 'client-1',
  CLIENT_SECRET: 'super-secret',
  SCOPE: 'scope/.default',
  LUMINATE_PORTAL_URL: 'https://portal.example.test/',
  PSLINK: 'ibppsintegration/',
  POLINK: 'pointegration/',
  API_BASE_URL: 'https://api.example.test/',
  CALENDAR: 'cbp/interop/ibp/process-orchestration/v1/calendar',
  VIEW_ENTITY_MAP: 'cbp/interop/ibp/links/v1/view-entity-map',
  ACTIONITEM2: 'cbp/interop/ibp/actionitems/v1/actionitems',
  UI_FIELDS_BASE: 'cbp/interop/ibp/ui-fields/v1',
  GET_PROCESS_ROLES: 'iam/realm/v1/roles'
};
const TOKEN = 'eyJhbGciOi.token.value';

function response(status, json) {
  return { status, ok: status >= 200 && status < 300, json: async () => json, body: { cancel: async () => {} } };
}

/** fetch stub: `routes` maps a URL substring to a status, a function, or a list of either (one per attempt). */
function fakeFetch(routes) {
  const calls = [];
  const counts = {};
  const impl = async (url, init = {}) => {
    calls.push({ url, init });
    const key = Object.keys(routes).find((part) => url.includes(part));
    if (!key) return response(200);
    const entry = routes[key];
    const index = counts[key] = (counts[key] ?? -1) + 1;
    const step = Array.isArray(entry) ? entry[Math.min(index, entry.length - 1)] : entry;
    if (typeof step === 'function') return step(url, init);
    return response(step, key === 'oauth2' ? { access_token: TOKEN } : {});
  };
  return { impl, calls };
}

const probe = (fetchImpl, extra = {}) => probeEnvironment({ env: ENV, fetchImpl, sleepImpl: async () => {}, now: () => new Date('2026-11-05T19:00:00Z'), ...extra });

test('env health: checks follow the environment and skip what it does not define', () => {
  assert.deepEqual(buildChecks(ENV).map((check) => check.name), ['token', 'portal', 'planning-mfe', 'po-ui', 'po-gateway', 'lm-gateway', 'ai-gateway', 'uif-gateway', 'liam']);
  const byName = Object.fromEntries(buildChecks(ENV).map((check) => [check.name, check]));
  assert.equal(byName['ai-gateway'].url, 'https://api.example.test/cbp/interop/ibp/actionitems/v1/kpis');
  assert.equal(byName['uif-gateway'].url, 'https://api.example.test/cbp/interop/ibp/ui-fields/v1/list-page-config?pageId=1&entityName=PROCESS');
  assert.equal(byName.liam.url, 'https://api.example.test/iam/realm/v1/roles');
  assert.deepEqual([byName['po-gateway'].timeoutMs, byName['ai-gateway'].timeoutMs, byName['uif-gateway'].timeoutMs, byName['lm-gateway'].timeoutMs, byName.liam.timeoutMs], [20000, 20000, 20000, undefined, undefined], 'slow services get 20 s');
  const lm = buildChecks(ENV).find((check) => check.name === 'lm-gateway');
  assert.equal(lm.url, 'https://api.example.test/cbp/interop/ibp/links/v1/tenant');
  // STAGE has no UI links; setup.js writes an empty PSLINK/POLINK.
  assert.deepEqual(buildChecks({ ...ENV, PSLINK: '', POLINK: '' }).map((check) => check.name), ['token', 'portal', 'po-gateway', 'lm-gateway', 'ai-gateway', 'uif-gateway', 'liam']);
  assert.deepEqual(buildChecks(ENV, ['token', 'po-gateway']).map((check) => check.name), ['token', 'po-gateway']);
  // Azure adds realmId to the token URL; Gravitee scopes the realm by host instead.
  assert.match(buildChecks(ENV)[0].url, /realmId=realm-1/);
  assert.doesNotMatch(buildChecks({ ...ENV, GATEWAY_TYPE: 'GRAVITEE' })[0].url, /realmId/);
});

test('env health: all checks answering is healthy, gateway calls carry the token, only the token call is a POST', async () => {
  const { impl, calls } = fakeFetch({ oauth2: 200 });
  const health = await probe(impl);
  assert.equal(health.healthy, true);
  assert.deepEqual(health.failed, []);
  assert.equal(health.checks.length, 9);
  const methods = calls.map((call) => call.init.method);
  assert.deepEqual(methods.filter((method) => method !== 'GET'), ['POST']);
  const gateway = calls.find((call) => call.url.includes('/calendar'));
  assert.equal(gateway.init.headers.Authorization, `Bearer ${TOKEN}`);
  // Azure sends the scope; the secret goes in the body, never the URL.
  const tokenCall = calls.find((call) => call.url.includes('oauth2'));
  assert.equal(tokenCall.init.body.get('scope'), 'scope/.default');
  assert.doesNotMatch(tokenCall.url, /super-secret/);
});

test('env health: a 5xx is retried twice and then reported unhealthy', async () => {
  const { impl, calls } = fakeFetch({ oauth2: 200, '/calendar': 503 });
  const health = await probe(impl);
  assert.equal(health.healthy, false);
  assert.deepEqual(health.failed, ['po-gateway']);
  const po = health.checks.find((check) => check.name === 'po-gateway');
  assert.equal(po.status, 503);
  assert.equal(po.error, 'HTTP 503');
  assert.equal(po.attempts, 3);
  assert.equal(calls.filter((call) => call.url.includes('/calendar')).length, 3);
});

test('env health: a retry that succeeds is healthy and records the attempts', async () => {
  const { impl } = fakeFetch({ oauth2: 200, '/tenant': [502, 200] });
  const health = await probe(impl);
  assert.equal(health.healthy, true);
  assert.equal(health.checks.find((check) => check.name === 'lm-gateway').attempts, 2);
});

test('env health: a timeout is reported as timeout, with no status', async () => {
  const timeout = async () => {
    const err = new Error('The operation was aborted due to timeout');
    err.name = 'TimeoutError';
    throw err;
  };
  const { impl } = fakeFetch({ oauth2: 200, 'portal.example.test/ibppsintegration': timeout });
  const health = await probe(impl);
  const mfe = health.checks.find((check) => check.name === 'planning-mfe');
  assert.equal(mfe.ok, false);
  assert.equal(mfe.status, null);
  assert.equal(mfe.error, 'timeout');
  assert.equal(mfe.attempts, 3);
});

test('env health: a network error names its cause', async () => {
  const refused = async () => {
    const err = new TypeError('fetch failed');
    err.cause = { code: 'ENOTFOUND' };
    throw err;
  };
  const { impl } = fakeFetch({ oauth2: 200, 'api.example.test': refused });
  const health = await probe(impl, { retries: 0 });
  assert.equal(health.checks.find((check) => check.name === 'po-gateway').error, 'ENOTFOUND');
});

test('env health: no token skips the gateway checks and is unhealthy', async () => {
  const { impl, calls } = fakeFetch({ oauth2: 401 });
  const health = await probe(impl);
  assert.equal(health.healthy, false);
  assert.deepEqual(health.failed, ['token', 'po-gateway', 'lm-gateway', 'ai-gateway', 'uif-gateway', 'liam']);
  assert.equal(health.checks.find((check) => check.name === 'po-gateway').error, 'skipped: no token');
  assert.equal(calls.filter((call) => call.url.includes('api.example.test')).length, 0);
});

test('env health: gateway redirects are not followed and fail the check', async () => {
  const { impl, calls } = fakeFetch({ oauth2: 200, '/calendar': 302 });
  const health = await probe(impl, { retries: 0 });
  assert.equal(health.checks.find((check) => check.name === 'po-gateway').ok, false);
  assert.equal(calls.find((call) => call.url.includes('/calendar')).init.redirect, 'manual');
  assert.equal(calls.find((call) => call.url.endsWith('/pointegration/')).init.redirect, 'follow');
});

test('env health: a 200 token response without access_token counts as a token failure', async () => {
  const { impl } = fakeFetch({ oauth2: () => response(200, { error: 'nope' }) });
  const health = await probe(impl, { retries: 0 });
  assert.equal(health.checks[0].ok, false);
  assert.equal(health.checks[0].error, 'no access_token in response');
});

test('env health: pages accept redirects but the gateway must answer 2xx; 4xx on the gateway is unhealthy', async () => {
  const { impl } = fakeFetch({ oauth2: 200, 'portal.example.test/pointegration': 302, '/tenant': 403 });
  const health = await probe(impl, { retries: 0 });
  assert.equal(health.checks.find((check) => check.name === 'po-ui').ok, true);
  assert.equal(health.checks.find((check) => check.name === 'lm-gateway').ok, false);
  assert.deepEqual(health.failed, ['lm-gateway']);
});

test('env health: the token request never follows a redirect, and a 3xx fails it', async () => {
  const { impl, calls } = fakeFetch({ oauth2: 307 });
  const health = await probe(impl, { retries: 0 });
  assert.equal(calls.find((call) => call.url.includes('oauth2')).init.redirect, 'manual');
  assert.equal(health.checks[0].ok, false);
  assert.equal(health.checks[0].status, 307);
});

test('env health: the file holds no token, secret, query string or response body', async () => {
  const { impl } = fakeFetch({ oauth2: 200, '/calendar': () => ({ ...response(500), json: async () => ({ secret: 'body' }) }) });
  const text = JSON.stringify(await probe(impl));
  assert.doesNotMatch(text, /eyJ|super-secret|realmId|body/);
  assert.equal(safeUrl('https://a.test/x/y?realmId=1&token=2'), 'https://a.test/x/y');
  assert.equal(safeUrl('not a url'), null);
});

test('env health: no checks at all is "could not run", not unhealthy', async () => {
  const health = await probeEnvironment({ env: {}, fetchImpl: async () => response(200) });
  assert.equal(health.healthy, null);
  assert.match(renderSummary(health), /could not run/);
});

const OPTIONS = { suite: 'test', mode: 'report', checkCount: false, upstreamResult: 'success', degradedThresholdPoints: 10 };
const TESTS = summarizeTests([{ name: 'TC1', status: 'passed', start: 1, stop: 2, historyId: 'h1', fullName: 'PlanningSpace/A.spec.ts:1:1', statusDetails: {}, labels: [] }]);
const REGISTRY = { knownIssues: [], quarantine: [], expired: [] };
const UNHEALTHY = {
  healthy: false,
  checkedAt: '2026-11-05T19:00:00.000Z',
  failed: ['po-gateway', 'lm-gateway'],
  checks: [
    { name: 'token', ok: true, status: 200 },
    { name: 'po-gateway', ok: false, status: 503, error: 'HTTP 503' },
    { name: 'lm-gateway', ok: false, status: null, error: 'timeout' }
  ]
};
const verdictWith = (envHealth, envHealthMode) => computeVerdict({ tests: TESTS, history: {}, trend: [], registry: REGISTRY, context: {}, options: { ...OPTIONS, envHealth, envHealthMode } });

test('verdict: an unhealthy probe in enforce mode is BROKEN with the environment reason', () => {
  const result = verdictWith(UNHEALTHY, 'enforce');
  assert.equal(result.verdict, 'BROKEN');
  assert.deepEqual(result.brokenReasons, [`${ENV_HEALTH_REASON} (po-gateway 503, lm-gateway timeout)`]);
  assert.match(result.headline, /environment unhealthy before tests \(po-gateway 503, lm-gateway timeout\)/);
  assert.equal(result.envHealth.breaksRun, true);
});

test('verdict: an unhealthy probe in report mode is shown but does not change the verdict', () => {
  const result = verdictWith(UNHEALTHY, 'report');
  assert.equal(result.verdict, 'ALL_PASSED');
  assert.equal(result.envHealth.healthy, false);
  assert.equal(result.envHealth.breaksRun, false);
  const { renderSummary: renderVerdict } = require('../verdict');
  assert.match(renderVerdict(result), /Environment health before tests: unhealthy: po-gateway 503, lm-gateway timeout \(report-only:/);
});

test('verdict: a healthy probe, a probe that could not run, or no probe never breaks the run', () => {
  assert.equal(verdictWith({ healthy: true, checks: [] }, 'enforce').verdict, 'ALL_PASSED');
  const notRun = verdictWith({ healthy: null, error: 'missing credentials', checks: [] }, 'enforce');
  assert.equal(notRun.verdict, 'ALL_PASSED');
  assert.equal(notRun.envHealth.detail, 'probe could not run: missing credentials');
  const { renderSummary: renderVerdict } = require('../verdict');
  assert.match(renderVerdict(notRun), /probe could not run: missing credentials \(not counted: a probe that could not run never breaks the run\)/);
  assert.doesNotMatch(renderVerdict(notRun), /report-only/);
  const none = verdictWith(null, 'enforce');
  assert.equal(none.verdict, 'ALL_PASSED');
  assert.equal(none.envHealth, null);
  assert.equal(summarizeEnvHealth('garbage', 'enforce'), null);
});

test('run data: env health is copied field by field', () => {
  const record = envHealthRecord({ ...UNHEALTHY, extra: 'dropped', checks: [{ ...UNHEALTHY.checks[1], url: 'https://api.test/x', body: 'dropped' }] });
  assert.equal(record.healthy, false);
  assert.deepEqual(record.failed, ['po-gateway', 'lm-gateway']);
  assert.equal(record.extra, undefined);
  assert.deepEqual(Object.keys(record.checks[0]).sort(), ['attempts', 'durationMs', 'error', 'method', 'name', 'ok', 'service', 'status', 'url']);
  assert.equal(envHealthRecord(null), null);
});
