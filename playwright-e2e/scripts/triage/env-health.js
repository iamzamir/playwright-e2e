/**
 * Environment health probe, run before the tests (triage plan E8).
 *
 * Checks that the system under test is reachable before a nightly run spends an hour on it: a machine token
 * from the identity provider, the portal and UI app pages, one read-only list call per gateway service (PO, LM,
 * Action Items, UI Fields) and LIAM, which every service calls for permissions. Each check gets a 10 s timeout
 * (20 s for PO, Action Items and UI Fields: their first calls with a fresh token take 4 s on Azure and 9-10 s on
 * Gravitee, measured 2026-11-05) and 2 retries. The result goes to `reports/triage/env-health.json` and the
 * step output `healthy`; verdict.js and build-run-data.js read the file.
 *
 * Read-only: every check is a GET, apart from the OAuth client-credentials token request (a POST that changes
 * nothing). Nothing secret is stored: URLs are written without query strings and response bodies are dropped.
 * Never fails the step: a probe that can't run writes `healthy: null` with the reason.
 *
 * Usage (from playwright-e2e/, with the same env as the test step):
 *   node scripts/triage/env-health.js [--checks token,portal,planning-mfe,po-ui,po-gateway,lm-gateway,ai-gateway,uif-gateway,liam]
 *     [--timeout-ms 10000] [--retries 2] [--out reports/triage/env-health.json]
 */
const fs = require('fs');
const path = require('path');
const { parseArgs, envHealthDetail: describeFailures } = require('./verdict');

const SCHEMA_VERSION = 1;
const DEFAULTS = { timeoutMs: 10000, slowTimeoutMs: 20000, retries: 2, retryDelayMs: 2000 };
const ALL_CHECKS = ['token', 'portal', 'planning-mfe', 'po-ui', 'po-gateway', 'lm-gateway', 'ai-gateway', 'uif-gateway', 'liam'];

/** Origin + path, never the query string (AUTH_URL can carry ids; nothing else belongs in the file). */
function safeUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return null;
  }
}

function joinUrl(base, pathPart) {
  if (!base || pathPart === undefined || pathPart === null || pathPart === 'undefined') return null;
  return `${String(base).replace(/\/+$/, '')}/${String(pathPart).replace(/^\/+/, '')}`;
}

/**
 * The checks for the active environment, from the variables configs/setup.js writes. A check whose URL the
 * environment doesn't define (for example no PSLINK on STAGE) is left out rather than failed.
 */
function buildChecks(env, names = ALL_CHECKS) {
  const isGravitee = String(env.GATEWAY_TYPE || '').toUpperCase() === 'GRAVITEE';
  const api = env.API_BASE_URL;
  const linksBase = env.VIEW_ENTITY_MAP ? String(env.VIEW_ENTITY_MAP).replace(/\/view-entity-map$/, '') : null;
  const actionItemsBase = env.ACTIONITEM2 ? String(env.ACTIONITEM2).replace(/\/actionitems$/, '') : null;
  const all = {
    token: () => {
      if (!env.AUTH_URL || env.AUTH_URL === 'undefined') return null;
      let url = env.AUTH_URL;
      if (!isGravitee && env.REALM_ID && env.REALM_ID !== 'undefined' && !url.includes('realmId=')) {
        url = `${url}${url.includes('?') ? '&' : '?'}realmId=${env.REALM_ID}`;
      }
      return { name: 'token', service: 'identity', kind: 'token', url };
    },
    portal: () => env.LUMINATE_PORTAL_URL && env.LUMINATE_PORTAL_URL !== 'undefined'
      ? { name: 'portal', service: 'portal', kind: 'page', url: env.LUMINATE_PORTAL_URL } : null,
    'planning-mfe': () => env.PSLINK && env.PSLINK !== 'undefined'
      ? { name: 'planning-mfe', service: 'planning-mfe', kind: 'page', url: joinUrl(env.LUMINATE_PORTAL_URL, env.PSLINK) } : null,
    'po-ui': () => env.POLINK && env.POLINK !== 'undefined'
      ? { name: 'po-ui', service: 'lui', kind: 'page', url: joinUrl(env.LUMINATE_PORTAL_URL, env.POLINK) } : null,
    // Small list calls that a machine token may read. Alone they answer in ~0.5 s, but the first PO, Action Items and
    // UI Fields calls with a fresh token take 4 s on Azure and 9-10 s on Gravitee (2026-11-05), so those get 20 s.
    'po-gateway': () => env.CALENDAR
      ? { name: 'po-gateway', service: 'process-orchestration', kind: 'api', url: joinUrl(api, env.CALENDAR), timeoutMs: DEFAULTS.slowTimeoutMs } : null,
    'lm-gateway': () => linksBase
      ? { name: 'lm-gateway', service: 'link-management', kind: 'api', url: joinUrl(api, `${linksBase}/tenant`) } : null,
    // The only list a machine token can read on Action Items (2026-11-05: actionitems, playbook and templates answer 400).
    // It ignores paging (up to 680 KB), but the probe reads only the status and drops the body.
    'ai-gateway': () => actionItemsBase
      ? { name: 'ai-gateway', service: 'actionitem', kind: 'api', url: joinUrl(api, `${actionItemsBase}/kpis`), timeoutMs: DEFAULTS.slowTimeoutMs } : null,
    // A 1.4 KB page config (the PROCESS list page).
    'uif-gateway': () => env.UI_FIELDS_BASE
      ? { name: 'uif-gateway', service: 'ui-fields', kind: 'api', url: `${joinUrl(api, `${env.UI_FIELDS_BASE}/list-page-config`)}?pageId=1&entityName=PROCESS`, timeoutMs: DEFAULTS.slowTimeoutMs } : null,
    // LIAM: every service checks permissions there (RBAC LiamProxyService, iam/realm/v1). The roles list is the read the
    // tests already make with the machine token; 0.3-1.2 s on both gateways.
    liam: () => env.GET_PROCESS_ROLES
      ? { name: 'liam', service: 'liam', kind: 'api', url: joinUrl(api, env.GET_PROCESS_ROLES) } : null
  };
  return names
    .map((name) => (all[name] ? all[name]() : null))
    .filter((check) => check && check.url);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function describeError(err) {
  if (!err) return 'unknown error';
  if (err.name === 'TimeoutError' || err.name === 'AbortError') return 'timeout';
  const cause = err.cause && (err.cause.code || err.cause.message);
  return String(cause || err.message || err).slice(0, 120);
}

/** One attempt. Returns { status, error, durationMs, token? }; the token never leaves this module's caller. */
async function attempt(check, { fetchImpl, timeoutMs: defaultTimeoutMs, credentials, bearer }) {
  const started = Date.now();
  const timeoutMs = check.timeoutMs || defaultTimeoutMs;
  try {
    let response;
    if (check.kind === 'token') {
      const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: credentials.clientId || '', client_secret: credentials.clientSecret || '' });
      if (!credentials.isGravitee && credentials.scope) body.set('scope', credentials.scope);
      response = await fetchImpl(check.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        // The body carries the client secret: never forward it to a redirect target (a 3xx fails the check).
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs)
      });
    } else {
      const headers = check.kind === 'api' ? { Authorization: `Bearer ${bearer}`, Accept: 'application/json' } : { Accept: 'text/html' };
      // Pages may redirect to sign-in; a gateway call must answer itself, so its redirects are not followed (3xx fails).
      response = await fetchImpl(check.url, { method: 'GET', headers, redirect: check.kind === 'api' ? 'manual' : 'follow', signal: AbortSignal.timeout(timeoutMs) });
    }
    const result = { status: response.status, error: null, durationMs: Date.now() - started };
    if (check.kind === 'token' && response.ok) {
      const json = await response.json().catch(() => ({}));
      if (json && json.access_token) result.token = json.access_token;
      else result.error = 'no access_token in response';
    } else if (response.body && typeof response.body.cancel === 'function') {
      // Bodies are never stored; release the connection.
      await response.body.cancel().catch(() => {});
    }
    return result;
  } catch (err) {
    return { status: null, error: describeError(err), durationMs: Date.now() - started };
  }
}

function attemptOk(check, result) {
  if (result.error || result.status === null) return false;
  // Pages may redirect to a sign-in page (fetch follows it); the gateway must answer 2xx to a valid token.
  return check.kind === 'page' ? result.status < 400 : result.status >= 200 && result.status < 300;
}

async function runCheck(check, options) {
  const attempts = [];
  for (let i = 0; i <= options.retries; i++) {
    if (i > 0) await options.sleep(options.retryDelayMs);
    const result = await attempt(check, options);
    attempts.push(result);
    if (attemptOk(check, result)) break;
  }
  const last = attempts[attempts.length - 1];
  const ok = attemptOk(check, last);
  return {
    record: {
      name: check.name,
      service: check.service,
      method: check.kind === 'token' ? 'POST' : 'GET',
      url: safeUrl(check.url),
      ok,
      status: last.status,
      error: ok ? null : (last.error || `HTTP ${last.status}`),
      attempts: attempts.length,
      durationMs: last.durationMs
    },
    token: ok ? last.token : undefined
  };
}

async function probeEnvironment({ env, names, fetchImpl = globalThis.fetch, timeoutMs = DEFAULTS.timeoutMs, retries = DEFAULTS.retries, retryDelayMs = DEFAULTS.retryDelayMs, sleepImpl = sleep, now = () => new Date() }) {
  const checks = buildChecks(env, names);
  const credentials = {
    clientId: env.CLIENT_ID,
    clientSecret: env.CLIENT_SECRET,
    scope: env.SCOPE,
    isGravitee: String(env.GATEWAY_TYPE || '').toUpperCase() === 'GRAVITEE'
  };
  const base = { fetchImpl, timeoutMs, retries, retryDelayMs, sleep: sleepImpl, credentials };
  const startedAt = now();
  const records = [];
  let bearer;

  const tokenCheck = checks.find((check) => check.kind === 'token');
  if (tokenCheck) {
    const { record, token } = await runCheck(tokenCheck, base);
    records.push(record);
    bearer = token;
  }
  const others = checks.filter((check) => check.kind !== 'token');
  const results = await Promise.all(others.map((check) => {
    if (check.kind === 'api' && !bearer) {
      return Promise.resolve({ record: { name: check.name, service: check.service, method: 'GET', url: safeUrl(check.url), ok: false, status: null, error: 'skipped: no token', attempts: 0, durationMs: 0 } });
    }
    return runCheck(check, { ...base, bearer });
  }));
  for (const { record } of results) records.push(record);

  const failed = records.filter((record) => !record.ok);
  return {
    schemaVersion: SCHEMA_VERSION,
    checkedAt: startedAt.toISOString(),
    environment: env.ENVIRONMENT || env.PSENV || null,
    gateway: env.GATEWAY_TYPE || null,
    healthy: records.length ? failed.length === 0 : null,
    error: records.length ? null : 'no checks could be built for this environment',
    failed: failed.map((record) => record.name),
    checks: records
  };
}


function renderSummary(health) {
  const lines = ['## Environment health before tests', ''];
  if (health.healthy === null) {
    lines.push(`Probe could not run: ${health.error}`, '');
    return lines.join('\n');
  }
  lines.push(health.healthy ? '**Healthy**' : `**Unhealthy:** ${describeFailures(health)}`, '');
  lines.push('| Check | Service | Result | Status | Attempts | Time |', '|---|---|---|---|---|---|');
  for (const check of health.checks) {
    lines.push(`| ${check.name} | ${check.service} | ${check.ok ? 'ok' : `failed: ${check.error}`} | ${check.status ?? '—'} | ${check.attempts} | ${check.durationMs} ms |`);
  }
  lines.push('');
  return lines.join('\n');
}

function writeOutputs(health, outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(health, null, 2), 'utf-8');
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${renderSummary(health)}\n`, 'utf-8');
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `healthy=${health.healthy}\n`, 'utf-8');
  const line = health.healthy === null ? `probe could not run: ${health.error}` : health.healthy ? 'healthy' : `unhealthy: ${describeFailures(health)}`;
  if (process.env.GITHUB_ACTIONS && health.healthy !== true) console.log(`::warning title=Environment health::${line}`);
  console.log(`[triage:env-health] ${line}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outPath = args.out || 'reports/triage/env-health.json';
  const names = args.checks ? args.checks.split(',').map((name) => name.trim()).filter(Boolean) : ALL_CHECKS;
  let health;
  try {
    // Resolves hosts, endpoint paths and the machine client exactly as the test run does.
    require('../../configs/setup.js');
    health = await probeEnvironment({
      env: process.env,
      names,
      timeoutMs: Number(args['timeout-ms'] || DEFAULTS.timeoutMs),
      retries: Number(args.retries ?? DEFAULTS.retries)
    });
  } catch (err) {
    health = { schemaVersion: SCHEMA_VERSION, checkedAt: new Date().toISOString(), environment: process.env.ENVIRONMENT || null, gateway: process.env.GATEWAY_TYPE || null, healthy: null, error: String(err.message || err).split('\n')[0].slice(0, 200), failed: [], checks: [] };
  }
  writeOutputs(health, outPath);
}

if (require.main === module) {
  main().catch((err) => {
    console.log(`::warning title=Environment health::Probe failed: ${err.message}`);
    console.error(err);
  });
}

module.exports = { buildChecks, probeEnvironment, describeFailures, renderSummary, safeUrl, ALL_CHECKS };
