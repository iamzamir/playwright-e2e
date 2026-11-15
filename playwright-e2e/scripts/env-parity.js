#!/usr/bin/env node

/**
 * Environment config parity check (T7.4)
 *
 * Runs configs/setup.js for every ENVIRONMENT × URL_MODE × GATEWAY_TYPE × input variant
 * in a clean child process (no .env, secrets replaced by placeholders) and records the
 * resulting process.env and [setup] log lines. --compare runs the same matrix against
 * setup.js from a git ref and reports every difference, marking the deliberate ones.
 *
 * Usage (from playwright-e2e/):
 *   node scripts/env-parity.js                        # snapshot the working tree to reports/env-parity/current
 *   node scripts/env-parity.js --compare [--ref main] # diff git ref vs working tree; writes reports/env-parity/diff.md
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CONFIGS = path.join(ROOT, 'configs');
const OUT = path.join(ROOT, 'reports', 'env-parity');

// Every environment in configs/env, plus unset (defaults to INTEROP) and an unknown value. Read from the
// source text rather than the module, so the baseline run never loads the code under test.
const TYPED_ENVIRONMENTS = JSON.parse(
  fs.readFileSync(path.join(CONFIGS, 'env', 'environments.ts'), 'utf8')
    .match(/export const ENV_NAMES[^=]*=\s*(\[[^\]]*\])/)[1].replace(/'/g, '"'),
);
const ENVIRONMENTS = [undefined, ...TYPED_ENVIRONMENTS, 'BOGUS'];
const URL_MODES = ['OLD', 'NEW'];
const GATEWAYS = ['AZURE', 'GRAVITEE'];

// Every secret or credential variable setup.js reads. Values are placeholders, never real.
const SECRET_VARS = [
  'TEST_AUTOMATION_USER_1', 'TEST_AUTOMATION_USER_2', 'TEST_AUTOMATION_PASSWORD',
  'SAUCE_PS_USERNAME', 'SAUCE_PS_ACCESS_KEY',
  'CLIENT_SECRET_QA', 'CLIENT_SECRET_IOP',
  'REALM_CLIENT_SECRET_PO_QA_MIG_1', 'REALM_CLIENT_SECRET_PO_QA_MIG_2',
  'REALM_CLIENT_SECRET_IOP_PO_PS_1', 'REALM_CLIENT_SECRET_PO_IOP_MIG_1', 'REALM_CLIENT_SECRET_PO_IOP_MIG_2',
  'REALM_CLIENT_SECRET_GVT_SOURCE_PO_PS_1',
  'SQL_PASSWORD',
];
const GRAVITEE_CREDENTIAL_VARS = [
  'GRAVITEE_CLIENT_ID', 'GRAVITEE_CLIENT_SECRET',
  'QA_GRAVITEE_CLIENT_ID', 'QA_GRAVITEE_CLIENT_SECRET',
  'PSR_GRAVITEE_CLIENT_ID', 'PSR_GRAVITEE_CLIENT_SECRET',
  'STAGE_GRAVITEE_CLIENT_ID', 'STAGE_GRAVITEE_CLIENT_SECRET',
];
const placeholders = names => Object.fromEntries(names.map(n => [n, `__SECRET_${n}__`]));

// Incoming values a caller, .env or CI may set; STAGE must ignore the INTEROP-flavoured ones.
const OVERRIDES = {
  REALM_KEY: 'pspoat-test1',
  REALM_NAME: 'leaked-realm-name',
  REALMS: 'leaked-realms',
  POLINK: 'custom-po/', PSLINK: 'custom-ps/', SNALINK: 'custom-sna/',
  USER_TOKEN_REALM: 'custom-user-token-realm',
  PORTAL_CLIENT_ID: 'custom-portal-client',
  GRAVITEE_DOMAIN_SUFFIX: 'generic.example.dev',
  STAGE_GRAVITEE_DOMAIN_SUFFIX: 'stage.example.dev',
  GRAVITEE_API_BASE_URL: 'https://generic-api.example.dev/',
  GRAVITEE_AUTH_URL: 'https://generic-auth.example.dev/oauth/token',
  GRAVITEE_PORTAL_URL: 'https://generic-portal.example.dev/',
  STAGE_GRAVITEE_API_BASE_URL: 'https://stage-api.example.dev/',
  SQL_SERVER: 'generic-sql', SQL_SERVER_QA: 'qa-sql', SQL_SERVER_IOP: 'iop-sql', SQL_SERVER_PSR: 'psr-sql', SQL_SERVER_STAGE: 'stage-sql',
  ...placeholders(['SQL_PASSWORD_QA', 'SQL_PASSWORD_IOP', 'SQL_PASSWORD_PSR', 'SQL_PASSWORD_STAGE']),
  HEADLESS: 'true', PW_PAGE_CACHE_SCOPE: 'worker', PW_NETWORK_ARTIFACT_MODE: 'always',
  REDACT_BEARER_TOKEN: 'FALSE', ENABLE_TOKEN_CACHE: 'false', USE_SPECIFIC_TESTS: 'TRUE',
  DEBUG: 'false', PERFORMANCE_RUN_ITERATIONS: '7',
  TEST_GREP_PATTERN: '@smoke',
};

const VARIANTS = {
  default: () => ({ ...placeholders(GRAVITEE_CREDENTIAL_VARS) }),
  overrides: () => ({ ...placeholders(GRAVITEE_CREDENTIAL_VARS), ...OVERRIDES }),
  'no-gravitee-creds': () => ({}),
  'realm-source-target': () => ({
    ...placeholders(GRAVITEE_CREDENTIAL_VARS),
    REALM_KEY_SOURCE: 'source-key', REALM_KEY_TARGET: 'target-key',
    GRAVITEE_AUTH_URL_SOURCE: undefined,
  }),
  'realm-own-client': () => ({
    ...placeholders(GRAVITEE_CREDENTIAL_VARS),
    ...placeholders(['GRAVITEE_CLIENT_ID_PSPOAT_TEST1', 'GRAVITEE_CLIENT_SECRET_PSPOAT_TEST1']),
    REALM_KEY: 'pspoat-test1',
  }),
};

// Deliberate behaviour changes in T7.4. Each returns a reason when a diff is expected.
const DELIBERATE = [
  // The new builder throws before writing anything, so only the error, the log and keys it no longer writes may differ.
  (c, key, to, ctx) => c.environment === 'BOGUS' && (key === '__error__' || key === '__log__' || ctx.untouched) &&
    'Unknown ENVIRONMENT now throws instead of leaving URLs unset',
  (c, key) => key === 'DEBUG' && c.variant === 'overrides' && 'DEBUG honours an incoming value',
  (c, key) => key === 'PERFORMANCE_RUN_ITERATIONS' && c.variant === 'overrides' && 'PERFORMANCE_RUN_ITERATIONS honours an incoming value',
  // Same error, but the builder no longer leaves half-written process.env keys behind when it throws. Only keys
  // the new run left untouched (still the incoming value) count; any value it did write must still match.
  (c, key, to, ctx) => ctx.sameError && key !== '__log__' && key !== '__error__' && ctx.untouched &&
    'No partial process.env writes when setup throws',
  (c, key, to, ctx) => key === 'NAVIGATE_TO_IDENTITI_AND_ACCESS' && /undefined$/.test(ctx.from) &&
    to === ctx.from.replace(/undefined$/, 'identityaccess/') && 'Built after IDENTITY_AND_ACCESS is set (was ...undefined)',
  // A PSR/STAGE NEW run must now equal the matching OLD run, except for the fallback warning in the log.
  (c, key, to, ctx) => c.urlMode === 'NEW' && ['PSR', 'STAGE'].includes(c.environment) &&
    (key === '__log__'
      ? to.split('\n').filter(l => !/^\[setup\] URL_MODE=\S+ is only supported for /.test(l)).join('\n') === ctx.oldTwin.log.join('\n')
      : ctx.oldTwin && to === ctx.oldTwin.env[key]) &&
    'URL_MODE=NEW is QA/INTEROP only; PSR and STAGE fall back to OLD',
];

function combos() {
  const list = [];
  for (const environment of ENVIRONMENTS)
    for (const urlMode of URL_MODES)
      for (const gateway of GATEWAYS)
        for (const variant of Object.keys(VARIANTS)) {
          const name = [environment || 'UNSET', urlMode, gateway, variant].join('__');
          list.push({ name, environment, urlMode, gateway, variant });
        }
  return list;
}

function baseEnv() {
  // Keep only what node needs to start; everything else must come from the combination.
  const keep = ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'APPDATA', 'COMSPEC', 'ComSpec'];
  return Object.fromEntries(keep.filter(k => process.env[k] !== undefined).map(k => [k, process.env[k]]));
}

function runOne(setupPath, combo, cwd) {
  const env = { ...baseEnv(), ...placeholders(SECRET_VARS), ...VARIANTS[combo.variant]() };
  if (combo.environment) env.ENVIRONMENT = combo.environment;
  env.URL_MODE = combo.urlMode;
  env.GATEWAY_TYPE = combo.gateway;
  for (const k of Object.keys(env)) if (env[k] === undefined) delete env[k];
  const before = new Set(Object.keys(baseEnv()));

  const probe = `
    const before = ${JSON.stringify([...before])};
    let error = null;
    try { require(${JSON.stringify(setupPath)}); } catch (e) { error = String(e && e.message || e); }
    const out = {};
    for (const [k, v] of Object.entries(process.env)) if (!before.includes(k)) out[k] = v;
    process.stdout.write('\\n__PARITY__' + JSON.stringify({ env: out, error }));
  `;
  // cwd is an empty directory, so dotenv finds no .env and local values can't leak in.
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-e', probe], { cwd, env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('error', reject);
    child.on('close', () => {
      const [log, payload] = stdout.split('\n__PARITY__');
      if (!payload) return reject(new Error(`[env-parity] ${combo.name}: no output. stderr:\n${stderr}`));
      const { env: resultEnv, error } = JSON.parse(payload);
      const sorted = Object.fromEntries(Object.keys(resultEnv).sort().map(k => [k, resultEnv[k]]));
      // dotenv prints a rotating tip when it loads; that line isn't setup.js output.
      const lines = log.split(/\r?\n/).filter(l => l && !l.includes('injected env'));
      const input = Object.fromEntries(Object.entries(env).filter(([k]) => !before.has(k)));
      resolve({ combo, error, log: lines, env: sorted, input });
    });
  });
}

async function snapshot(setupPath, label) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'env-parity-'));
  const dir = path.join(OUT, label);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const results = {};
  try {
    const queue = combos();
    const worker = async () => {
      for (let combo = queue.shift(); combo; combo = queue.shift()) {
        const r = await runOne(setupPath, combo, cwd);
        results[combo.name] = r;
        fs.writeFileSync(path.join(dir, `${combo.name}.json`), JSON.stringify(r, null, 2));
      }
    };
    await Promise.all(Array.from({ length: Math.max(2, os.cpus().length - 1) }, worker));
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
  return results;
}

function baselineSetup(ref) {
  // Written next to setup.js so its relative requires (./gravitee-realms.json, ./env) resolve the same way.
  const source = execFileSync('git', ['show', `${ref}:playwright-e2e/configs/setup.js`], { cwd: ROOT, encoding: 'utf8' });
  const file = path.join(CONFIGS, '.setup.parity-baseline.js');
  fs.writeFileSync(file, source);
  return file;
}

function deliberateReason(combo, key, to, ctx) {
  for (const rule of DELIBERATE) {
    const reason = rule(combo, key, to, ctx);
    if (reason) return reason;
  }
  return null;
}

async function compare(ref) {
  const baseFile = baselineSetup(ref);
  let before;
  try {
    before = await snapshot(baseFile, 'baseline');
  } finally {
    fs.rmSync(baseFile, { force: true });
  }
  const after = await snapshot(path.join(CONFIGS, 'setup.js'), 'current');

  const unexplained = [];
  const explained = new Map();
  const note = (combo, key, from, to) => {
    const oldTwin = after[combo.name.replace('__NEW__', '__OLD__')];
    const current = after[combo.name];
    const sameError = Boolean(before[combo.name].error) && before[combo.name].error === current.error;
    // The new run threw before writing this key, so it still holds whatever came in (or nothing).
    const untouched = Boolean(current.error) && to === current.input[key];
    const reason = deliberateReason(combo, key, to, { from, oldTwin, sameError, untouched });
    const row = { combo: combo.name, key, from, to };
    if (reason) {
      if (!explained.has(reason)) explained.set(reason, []);
      explained.get(reason).push(row);
    } else {
      unexplained.push(row);
    }
  };

  for (const name of Object.keys(before).sort()) {
    const a = before[name];
    const b = after[name];
    if (a.error !== b.error) note(a.combo, '__error__', a.error, b.error);
    const keys = new Set([...Object.keys(a.env), ...Object.keys(b.env)]);
    for (const key of keys) if (a.env[key] !== b.env[key]) note(a.combo, key, a.env[key], b.env[key]);
    const logA = a.log.join('\n');
    const logB = b.log.join('\n');
    if (logA !== logB) note(a.combo, '__log__', logA, logB);
  }

  const lines = [`# env-parity: \`${ref}\` vs working tree`, '', `Combinations: ${Object.keys(before).length}`, ''];
  lines.push(`## Unexplained differences: ${unexplained.length}`, '');
  for (const d of unexplained) lines.push(`- \`${d.combo}\` \`${d.key}\`: \`${d.from}\` → \`${d.to}\``);
  lines.push('', '## Deliberate differences', '');
  for (const [reason, rows] of explained) {
    lines.push(`### ${reason} (${rows.length})`, '');
    for (const d of rows.slice(0, 8)) lines.push(`- \`${d.combo}\` \`${d.key}\`: \`${d.from}\` → \`${d.to}\``);
    if (rows.length > 8) lines.push(`- … and ${rows.length - 8} more`);
    lines.push('');
  }
  fs.writeFileSync(path.join(OUT, 'diff.md'), lines.join('\n'));

  console.log(`[env-parity] ${Object.keys(before).length} combinations compared against ${ref}`);
  for (const [reason, rows] of explained) console.log(`[env-parity] deliberate: ${reason} (${rows.length})`);
  console.log(`[env-parity] unexplained differences: ${unexplained.length}`);
  for (const d of unexplained.slice(0, 40)) console.log(`  ${d.combo} ${d.key}: ${JSON.stringify(d.from)} -> ${JSON.stringify(d.to)}`);
  console.log(`[env-parity] report: ${path.relative(ROOT, path.join(OUT, 'diff.md'))}`);
  return unexplained.length;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--compare')) {
    const refIdx = args.indexOf('--ref');
    const ref = refIdx >= 0 ? args[refIdx + 1] : 'origin/main';
    process.exitCode = (await compare(ref)) ? 1 : 0;
  } else {
    const results = await snapshot(path.join(CONFIGS, 'setup.js'), 'current');
    console.log(`[env-parity] ${Object.keys(results).length} combinations written to ${path.relative(ROOT, path.join(OUT, 'current'))}`);
  }
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exitCode = 2; });
}

module.exports = { combos, SECRET_VARS, GRAVITEE_CREDENTIAL_VARS };
