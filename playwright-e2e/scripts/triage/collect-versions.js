/**
 * System-under-test versions for one run (triage plan E7).
 *
 * The UI builds inline their build identity into the JavaScript bundle (planning-mfe and lui both carry GITHUB_SHA,
 * BUILD_TIME, GITHUB_RUN_NUMBER, GITHUB_REF_NAME and GITHUB_REPOSITORY). For each app in triage/sut-versions.json this
 * fetches the app page, finds its bundle and reads those fields, so the dashboard can say which build a night tested
 * and when a new one landed. The backend services expose no version through the gateway, so they aren't collected.
 *
 * Read-only GETs of public static files: no token is sent. Every request stays on the configured app's HTTPS origin:
 * scripts from other hosts are ignored and redirects are only followed within that origin, so a changed page can't send
 * the runner anywhere else. Only the whitelisted, format-checked fields are kept; the bundle inlines other build
 * variables, and none of them is ever written. Never fails the step.
 *
 * Usage: node scripts/triage/collect-versions.js [--env INTEROP] [--config triage/sut-versions.json]
 *          [--timeout-ms 20000] [--retries 1] [--out reports/triage/versions.json]
 */
const fs = require('fs');
const path = require('path');
const { parseArgs } = require('./verdict');

const SCHEMA_VERSION = 1;
const TRIAGE_DIR = path.resolve(__dirname, '../../triage');
const DEFAULTS = { timeoutMs: 20000, retries: 1, retryDelayMs: 2000, maxScripts: 3, maxRedirects: 3 };

// Field -> [bundle key, format]. Anything that doesn't match its format is dropped.
const FIELDS = {
  sha: ['GITHUB_SHA', /^[0-9a-f]{40}$/],
  buildTime: ['BUILD_TIME', /^\d{4}-\d{2}-\d{2}T[\d:.]+Z?$/],
  runNumber: ['GITHUB_RUN_NUMBER', /^\d{1,9}$/],
  ref: ['GITHUB_REF_NAME', /^[\w./-]{1,100}$/],
  repository: ['GITHUB_REPOSITORY', /^[\w.-]+\/[\w.-]+$/]
};

function readJson(filePath, fallback) {
  try {
    return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : fallback;
  } catch {
    return fallback;
  }
}

/** The whitelisted build fields from a bundle's text; null when it carries no commit SHA. */
function extractBuildInfo(text) {
  const info = {};
  for (const [field, [key, format]] of Object.entries(FIELDS)) {
    const match = String(text || '').match(new RegExp(`["']?\\b${key}["']?\\s*:\\s*["']([^"']{0,120})["']`));
    if (match && format.test(match[1])) info[field] = field === 'runNumber' ? Number(match[1]) : match[1];
  }
  return info.sha ? info : null;
}

/** The HTTPS origin a URL belongs to, or null (anything that isn't https is never fetched). */
function httpsOrigin(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.origin : null;
  } catch {
    return null;
  }
}

/** Script URLs in an app page on the page's own HTTPS origin, bundle candidates first; env.js only holds runtime settings. */
function findScripts(html, pageUrl) {
  const origin = httpsOrigin(pageUrl);
  const urls = [];
  if (!origin) return urls;
  for (const match of String(html || '').matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js)["']/gi)) {
    try {
      const url = new URL(match[1], pageUrl).toString();
      if (httpsOrigin(url) !== origin) continue;
      if (!/\/env\.js$/.test(url) && !urls.includes(url)) urls.push(url);
    } catch {
      // Not a URL; skip it.
    }
  }
  const rank = (url) => (/(ps-bundle|index)[.-][\w-]+\.js$/.test(url) ? 0 : 1);
  return urls.sort((a, b) => rank(a) - rank(b));
}

function safeUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return null;
  }
}

function describeError(err) {
  if (!err) return 'unknown error';
  if (err.name === 'TimeoutError' || err.name === 'AbortError') return 'timeout';
  const cause = err.cause && (err.cause.code || err.cause.message);
  return String(cause || err.message || err).slice(0, 120);
}

// One GET that follows redirects by hand, only within `origin`; a redirect anywhere else is an error, never a request.
async function fetchSameOrigin(url, origin, { fetchImpl, timeoutMs, maxRedirects }) {
  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (httpsOrigin(current) !== origin) return { error: `refused ${hop ? 'redirect' : 'request'} outside ${origin}` };
    const response = await fetchImpl(current, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) });
    if (response.status < 300 || response.status >= 400) return { response, finalUrl: current };
    const location = response.headers && typeof response.headers.get === 'function' ? response.headers.get('location') : null;
    if (!location) return { response, finalUrl: current };
    current = new URL(location, current).toString();
  }
  return { error: 'too many redirects' };
}

async function getText(url, { fetchImpl, timeoutMs, retries, retryDelayMs, sleep, maxRedirects = DEFAULTS.maxRedirects, origin = httpsOrigin(url) }) {
  if (!origin) return { error: 'not an https URL' };
  let last;
  for (let i = 0; i <= retries; i++) {
    if (i > 0) await sleep(retryDelayMs);
    try {
      const { response, error, finalUrl } = await fetchSameOrigin(url, origin, { fetchImpl, timeoutMs, maxRedirects });
      if (error) return { error };
      // finalUrl is where redirects ended; relative links in the page resolve against it, not the configured URL.
      if (response.ok) return { text: await response.text(), finalUrl };
      last = { error: `HTTP ${response.status}` };
      if (response.status < 500) break;
    } catch (err) {
      last = { error: describeError(err) };
    }
  }
  return last;
}

async function collectApp(app, service, options) {
  const base = { key: app.key, name: (service && service.name) || app.key, repo: (service && service.repo) || null, url: safeUrl(app.url) };
  const page = await getText(app.url, options);
  if (page.error) return { ...base, ok: false, error: `page: ${page.error}` };
  const scripts = findScripts(page.text, page.finalUrl || app.url).slice(0, options.maxScripts);
  if (!scripts.length) return { ...base, ok: false, error: 'no script bundle on the page' };
  let lastError = 'no build information in the bundle';
  for (const script of scripts) {
    const bundle = await getText(script, { ...options, origin: httpsOrigin(app.url) });
    if (bundle.error) {
      lastError = `bundle: ${bundle.error}`;
      continue;
    }
    const info = extractBuildInfo(bundle.text);
    if (info) return { ...base, ok: true, ...info, bundle: safeUrl(script), error: null };
  }
  return { ...base, ok: false, error: lastError };
}

async function collectVersions({ environment, gateway = null, config, services = [], fetchImpl = globalThis.fetch, timeoutMs = DEFAULTS.timeoutMs, retries = DEFAULTS.retries, retryDelayMs = DEFAULTS.retryDelayMs, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), now = () => new Date() }) {
  const env = String(environment || '').toUpperCase();
  const apps = ((((config || {}).environments || {})[env] || {}).apps || []).filter((app) => app && app.key && app.url);
  const byKey = new Map(services.map((service) => [service.key, service]));
  const options = { fetchImpl, timeoutMs, retries, retryDelayMs, sleep, maxScripts: DEFAULTS.maxScripts, maxRedirects: DEFAULTS.maxRedirects };
  const collectedAt = now().toISOString();
  const results = await Promise.all(apps.map((app) => collectApp(app, byKey.get(app.key), options)));
  return {
    schemaVersion: SCHEMA_VERSION,
    collectedAt,
    environment: env || null,
    gateway,
    note: apps.length ? null : `no apps configured for ${env || 'this environment'} in triage/sut-versions.json`,
    apps: results
  };
}

/** "planning-mfe cf39328 (2026-11-04), lui 8046368 (2026-09-29)" for summaries. */
function describeVersions(versions) {
  return ((versions && versions.apps) || [])
    .map((app) => (app.ok ? `${app.key} ${app.sha.slice(0, 7)}${app.buildTime ? ` (${app.buildTime.slice(0, 10)})` : ''}` : `${app.key} unknown (${app.error})`))
    .join(', ');
}

function writeOutputs(versions, outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(versions, null, 2), 'utf-8');
  const line = versions.apps.length ? describeVersions(versions) : versions.note;
  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = versions.apps.map((app) => `| ${app.name} | ${app.ok ? `\`${app.sha.slice(0, 7)}\`` : '—'} | ${app.buildTime || '—'} | ${app.runNumber ?? '—'} | ${app.ok ? (app.repository || app.repo || '—') : app.error} |`);
    const table = rows.length ? ['| App | Commit | Built | Build run | Repo |', '|---|---|---|---|---|', ...rows] : [versions.note];
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, ['## System-under-test builds', '', ...table, ''].join('\n') + '\n', 'utf-8');
  }
  console.log(`[triage:versions] ${line}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outPath = args.out || 'reports/triage/versions.json';
  const environment = args.env || process.env.ENVIRONMENT || process.env.TEST_ENV || 'INTEROP';
  let versions;
  try {
    versions = await collectVersions({
      environment,
      gateway: args.gateway || process.env.GATEWAY_TYPE || null,
      config: readJson(args.config || path.join(TRIAGE_DIR, 'sut-versions.json'), {}),
      services: (readJson(path.join(TRIAGE_DIR, 'service-map.json'), {}) || {}).services || [],
      timeoutMs: Number(args['timeout-ms'] || DEFAULTS.timeoutMs),
      retries: Number(args.retries ?? DEFAULTS.retries)
    });
  } catch (err) {
    versions = { schemaVersion: SCHEMA_VERSION, collectedAt: new Date().toISOString(), environment, gateway: null, note: `could not collect: ${String(err.message || err).slice(0, 200)}`, apps: [] };
  }
  writeOutputs(versions, outPath);
}

if (require.main === module) {
  main().catch((err) => {
    console.log(`::warning title=SUT versions::Version collection failed: ${err.message}`);
    console.error(err);
  });
}

module.exports = { collectVersions, extractBuildInfo, findScripts, describeVersions, FIELDS };
