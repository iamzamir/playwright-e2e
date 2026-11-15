/**
 * Backend API automation coverage report generator.
 *
 * Measures which REST endpoints of the four backend services are exercised by the
 * Playwright backend suite, using two sources of truth:
 *   - the service source code (every Spring @*Mapping in the sibling repos), and
 *   - request logs captured in allure-results of real runs ("Sending <METHOD> request to <URL>").
 *
 * Writes into docs/Coverage/:
 *   - backend-api-coverage-dashboard.html   cross-service summary, suite health, change since last snapshot
 *   - <service>-api-coverage-matrix.html    per-service module roll-up, gap register, covered endpoints
 *   - data/coverage-snapshot.json           current + previous snapshot (drives the "change" sections)
 * Curated per-endpoint guidance lives in docs/Coverage/data/endpoint-notes.json.
 *
 * Usage (from playwright-e2e/):
 *   npm run docs:api-coverage                              download the newest green nightly backend run per environment via gh
 *   node scripts/generate-api-coverage-report.js --allure <dir> [--allure <dir> ...]
 * Options: --backend-root <dir> (default: parent of this repo), --runs <n> environments to collect (default 4), --date YYYY-MM-DD.
 * Pull main in every sibling repo first; the report records each repo's HEAD.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const PW_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(PW_ROOT, '..');
const OUT_DIR = path.join(PW_ROOT, 'docs', 'Coverage');
const DATA_DIR = path.join(OUT_DIR, 'data');
const CI_WORKFLOW = 'playwright-po-backend-suite.yaml';

const SERVICES = {
  PO: { repo: 'plan-sop-process-orchestration-service', name: 'Process Orchestration', file: 'process-orchestration-api-coverage-matrix.html', detail: 'process-orchestration-api-gap-analysis.html', psrPlan: 'PSR-Gap-Plans/01-ProcessOrchestration-PSR-Gap-Plan.md', prefix: /^\/(?:qa\/)?(?:cbp\/[^/]+\/ibp\/process-orchestration\/v1|po\/api\/v1)(\/.*)?$/ },
  AI: { repo: 'plan-sop-actionitem', name: 'Action Items', file: 'action-items-api-coverage-matrix.html', detail: 'action-items-api-gap-analysis.html', psrPlan: 'PSR-Gap-Plans/03-ActionItems-PSR-Gap-Plan.md', prefix: /^\/(?:qa\/)?(?:cbp\/[^/]+\/ibp\/actionitems\/v1|(?:actionitems|ai)\/api\/v1)(\/.*)?$/ },
  LM: { repo: 'plan-sop-link-management', name: 'Link Management', file: 'link-management-api-coverage-matrix.html', detail: 'link-management-api-gap-analysis.html', psrPlan: 'PSR-Gap-Plans/02-LinkManagement-PSR-Gap-Plan.md', prefix: /^\/(?:qa\/)?(?:cbp\/[^/]+\/ibp\/links\/v1|(?:links|lm)\/api\/v1)(\/.*)?$/ },
  UIF: { repo: 'plan-sop-ui-fields-service', name: 'UI Fields', file: 'ui-fields-api-coverage-matrix.html', detail: 'ui-fields-api-gap-analysis.html', psrPlan: 'PSR-Gap-Plans/04-UIFields-PSR-Gap-Plan.md', prefix: /^\/(?:qa\/)?(?:cbp\/[^/]+\/ibp\/ui-fields\/v1|ui-?fields\/api\/v1)(\/.*)?$/ },
};
const UI_REPOS = { mfe: 'plan-sop-planning-mfe', lui: 'plan-sop-lui' };
const JMX_UI_REPORTS = { PO: 'jmeter/plans/PSRGatewayTest-ProcessOrchestration-Coverage.html', LM: 'jmeter/plans/PSRGatewayTest-LinkManagement-Coverage.html' };

const MODULES = {
  PO: { CalendarController: 'Calendar & cycle', ProcessController: 'Process', NodeController: 'Subprocess', NodeAttributeController: 'Node attributes', TransitionController: 'Transitions', NodeScheduleController: 'Node schedule', ExecutionStatusController: 'Job status', ActionItemProxyController: 'Action item proxy', KpiController: 'KPI', SupplyChainActionController: 'Supply chain actions', SupplyChainActionControllerV2: 'Supply chain actions', TemplateController: 'Templates', TemplateEntityController: 'Templates', QuotaController: 'Quota & metering', MeteringController: 'Quota & metering', UserController: 'Users & roles', RbacProxyController: 'RBAC proxy', TenantController: 'Tenant & onboarding', TenantControllerV2: 'Tenant & onboarding', ProcedureProxyController: 'Tenant & onboarding', POConfigurationController: 'Configuration & ALM', ImportExportController: 'Import / export', ReportingController: 'Reporting', InsightController: 'Insight' },
  AI: { ActionItemController: 'Action items', ActionItemTemplateController: 'Templates', AttributeConfigurationController: 'Attribute & UI config', KpiConfigurationController: 'KPI', KpiController: 'KPI', PlaybookController: 'Playbooks', SourceEntityController: 'Source entity', ImportExportController: 'Import / export', TenantController: 'Tenant', RbacProxyController: 'Users & RBAC', UserConfigurationController: 'Users & RBAC', CommentsController: 'Comments', CollaborationProxyController: 'Collaboration' },
  LM: { ViewEntityMapController: 'View-entity map', EntityViewProcedureMapController: 'Entity-view-procedure map', LinksController: 'Views & favourites', FilterPresetController: 'Filter presets', ScopeController: 'Scope', SourceEntityController: 'Source entity', ImportExportController: 'Import / export', EntityValidationController: 'Entity validation', TenantController: 'Tenant', UserController: 'Users' },
  UIF: { FieldController: 'Page config reads', PageController: 'Pages', AttributeController: 'Attributes', UiFieldController: 'UI fields', UiComponentsController: 'UI components', ImportExportController: 'Import / export', EchoController: 'Diagnostics', SubscriptionController: 'Subscriptions' },
};

// Downstream calls PO makes on behalf of its own routes (ActionItemProxyService, LinksProxyService, EntityServiceHelper, KpiService).
const PO_NODE_SAVE = ['POST /process', 'POST /process/template', 'POST /process/{processName}/subprocess'];
const INDIRECT = {
  'AI POST /searchActionItems': ['POST /process/{processName}/actionitem/search', 'POST /process/{processName}/subprocess/{subprocessName}/actionitem/search'],
  'AI GET /actionitems/{id}': ['GET /actionitem/{id}'],
  'AI POST /actionitems': ['POST /process/{processName}/actionitem', 'POST /process/{processName}/subprocess/{subprocessName}/actionitem'],
  'AI PUT /actionitems/{id}': ['PUT /process/{processName}/actionitem/{id}', 'PUT /process/{processName}/subprocess/{subprocessName}/actionitem/{id}'],
  'AI POST /actionitems/bulk': ['POST /process/{processName}/actionitem/bulk', 'POST /process/{processName}/subprocess/{subprocessName}/actionitem/bulk'],
  'AI POST /kpi/entities': ['GET /process/{processName}/kpi', 'GET /process/{processName}/subprocess/{subprocessName}/kpi'],
  'AI POST /entity': PO_NODE_SAVE,
  'AI POST /exportData': ['POST /exportData'],
  'AI POST /importData': ['POST /importData'],
  'AI GET /tenant': ['POST /tenant/onboard'],
  'LM POST /entity': PO_NODE_SAVE,
  'LM POST /view-entity-map/clear': ['DELETE /process/{processName}', 'DELETE /process/{processName}/subprocess/{subprocessName}'],
  'LM POST /exportData': ['POST /exportData'],
  'LM POST /importData': ['POST /importData'],
  'LM GET /tenant': ['POST /tenant/onboard'],
};

const P3_PATHS = {
  PO: /^\/(tenant|tenants|user\/onboard|procedure\/onboard|realm|cache|configuration\/realmConfiguration|process\/migrate)/,
  AI: /^\/(tenant|users\/info)$/,
  LM: /^\/tenant$/,
  UIF: /^\/(echo|attribute\/tenant)$/,
};
const LARGE_PATHS = /(transition\/generate|nodeschedule|reschedule|initiate|onboard|deploy|publish|importData|exportData|\/import$|\/export$|validate|bulk)/;
const SIZE_DAYS = { S: 0.5, M: 1, L: 2 };

// ---------------------------------------------------------------- helpers

function parseArgs(argv) {
  const args = { allure: [], fromCi: false, runs: 4, backendRoot: path.resolve(REPO_ROOT, '..'), date: new Date().toISOString().slice(0, 10) };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--allure') args.allure.push(argv[++i]);
    else if (a === '--from-ci') args.fromCi = true;
    else if (a === '--runs') args.runs = Number(argv[++i]);
    else if (a === '--backend-root') args.backendRoot = argv[++i];
    else if (a === '--date') args.date = argv[++i];
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pct = (n, d) => (d ? (100 * n) / d : 0);
const fmtPct = (v) => `${v.toFixed(1)}%`;
const normPath = (p) => p.replace(/\{[^}]*\}/g, '{}').replace(/\/$/, '');
const readJson = (f, fallback) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : fallback);
const git = (repo, args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();

function walkFiles(dir, accept, skipDir = /node_modules|\.git|target|build|dist/) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!skipDir.test(e.name)) out.push(...walkFiles(p, accept, skipDir)); }
    else if (accept(p)) out.push(p);
  }
  return out;
}

// ---------------------------------------------------------------- 1. routes from source

function annotationPaths(args) {
  if (!args) return [''];
  const m = args.match(/(?:value|path)\s*=\s*(\{[^}]*\}|"[^"]*")/) || args.match(/^\s*(\{[^}]*\}|"[^"]*")/);
  if (!m) return [''];
  const strs = [...m[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]);
  return strs.length ? strs : [''];
}

function extractRoutes(repoDir) {
  const routes = [];
  for (const file of walkFiles(path.join(repoDir, 'src', 'main'), (p) => p.endsWith('.java'))) {
    const src = fs.readFileSync(file, 'utf8');
    if (!/@(Rest)?Controller\b/.test(src)) continue;
    const clsMatch = src.match(/^\s*(?:public\s+)?(?:abstract\s+|final\s+)?class\s+(\w+)[^{]*\{/m);
    if (!clsMatch) continue;
    const header = src.slice(0, clsMatch.index);
    const body = src.slice(clsMatch.index);
    const cm = header.match(/@RequestMapping\s*\(([^)]*)\)/);
    const bases = cm ? annotationPaths(cm[1]) : [''];
    const classDeprecated = /@Deprecated/.test(header);
    const devOnly = /@Profile\s*\(\s*"local"\s*\)/.test(header);
    const re = /@(Get|Post|Put|Delete|Patch|Request)Mapping\s*(?:\(([\s\S]*?)\))?\s*((?:@\w+(?:\([^)]*\))?\s*)*)(?:public|private|protected)?\s*[\w<>[\], ?.]+\s+(\w+)\s*\(/g;
    let m;
    while ((m = re.exec(body))) {
      let methods = [m[1].toUpperCase()];
      if (m[1] === 'Request') {
        const mm = [...(m[2] || '').matchAll(/RequestMethod\.(\w+)/g)].map((x) => x[1]);
        methods = mm.length ? mm : ['ANY'];
      }
      const before = body.slice(Math.max(0, m.index - 400), m.index);
      const deprecated = classDeprecated || /@Deprecated[^;{}]*$/.test(before) || /@Deprecated/.test(m[3]);
      for (const b of bases) for (const p of annotationPaths(m[2])) for (const method of methods) {
        const full = ('/' + b + '/' + p).replace(/\/+/g, '/').replace(/(.)\/$/, '$1');
        routes.push({ method, path: full, controller: clsMatch[1], handler: m[4], deprecated, devOnly, file: path.relative(repoDir, file).replace(/\\/g, '/') });
      }
    }
  }
  return routes;
}

/** Collapse routes mapped by more than one controller (v1 + v2) into one endpoint. */
function uniqueEndpoints(svc, routes) {
  const map = new Map();
  for (const r of routes) {
    const key = `${r.method} ${r.path}`;
    const prev = map.get(key);
    if (prev) {
      prev.controllers.push(r.controller);
      prev.deprecated = prev.deprecated && r.deprecated;
      continue;
    }
    const segs = r.path.split('/').filter(Boolean);
    const isEventAction = svc === 'PO' && /\/eventAction/.test(r.path);
    map.set(key, {
      svc, key: `${svc} ${key}`, method: r.method, path: r.path, controllers: [r.controller],
      module: isEventAction ? 'Event actions' : (MODULES[svc][r.controller] || r.controller.replace(/Controller(V\d)?$/, '')),
      deprecated: r.deprecated, devOnly: r.devOnly,
      literal: segs.filter((s) => !s.startsWith('{')).length,
      re: new RegExp('^/' + segs.map((s) => (s.startsWith('{') ? '[^/]*' : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('/') + '/?$', 'i'),
    });
  }
  return [...map.values()];
}

// ---------------------------------------------------------------- 2. evidence from allure-results

function readEnvLabel(dir) {
  const f = path.join(dir, 'environment.properties');
  if (!fs.existsSync(f)) return path.basename(dir);
  const props = Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => l.split('=').map((x) => x.trim())));
  return [props.Environment, props.Gateway].filter(Boolean).join('-') || path.basename(dir);
}

function collectEvidence(allureDirs, endpoints) {
  const REQ = /(?:Sending|Making) (GET|POST|PUT|DELETE|PATCH) request to (https?:\/\/[^"\r\n\\]+)/g;
  const hits = new Map();
  const unmatched = new Map();
  const health = {};
  const envs = [];

  const record = (method, rawUrl, spec, env, scope) => {
    let u;
    try { u = new URL(rawUrl.trim().replace(/ /g, '%20')); } catch { return; }
    let p;
    try { p = decodeURIComponent(u.pathname); } catch { p = u.pathname; }
    p = p.replace(/\/\/+/g, '/');
    for (const [svc, cfg] of Object.entries(SERVICES)) {
      const m = p.match(cfg.prefix);
      if (!m) continue;
      const rest = m[1] || '/';
      const cands = endpoints[svc].filter((e) => (e.method === method || e.method === 'ANY') && e.re.test(rest));
      if (!cands.length) { const k = `${svc} ${method} ${rest}`; unmatched.set(k, (unmatched.get(k) || 0) + 1); return; }
      const best = Math.max(...cands.map((c) => c.literal));
      for (const e of cands.filter((c) => c.literal === best)) {
        const h = hits.get(e.key) || { calls: 0, specs: new Set(), testSpecs: new Set(), envs: new Set(), scopes: new Set() };
        h.calls++; h.specs.add(spec); h.envs.add(env); h.scopes.add(scope);
        if (scope === 'test') h.testSpecs.add(spec);
        hits.set(e.key, h);
      }
      return;
    }
  };

  const stepTexts = (node, acc, scope) => {
    if (!node) return;
    if (/^(Before|After) Hooks$/.test((node.name || '').trim())) scope = 'hook';
    if (node.name) acc.push([node.name, scope]);
    for (const s of node.steps || []) stepTexts(s, acc, scope);
  };

  for (const dir of allureDirs) {
    const env = readEnvLabel(dir);
    envs.push({ env, dir });
    const last = new Map();
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('-result.json'))) {
      const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      const spec = (j.fullName || '').replace(/:\d+:\d+$/, '');
      if (!spec.startsWith('ProcessOrchestrationBackend/')) continue;
      const texts = [];
      for (const s of j.steps || []) stepTexts(s, texts, 'test');
      for (const a of j.attachments || []) {
        const ap = path.join(dir, a.source);
        if (/\.(txt|log)$/.test(ap) && fs.existsSync(ap)) texts.push([fs.readFileSync(ap, 'utf8'), 'log']);
      }
      for (const [t, scope] of texts) for (const m of t.matchAll(REQ)) record(m[1], m[2], spec, env, scope);
      const k = `${j.fullName}|${j.name}`;
      const prev = last.get(k);
      if (!prev || prev.stop < j.stop) last.set(k, { spec, status: j.status, stop: j.stop, name: j.name, msg: ((j.statusDetails && j.statusDetails.message) || '').split('\n')[0] });
    }
    for (const t of last.values()) {
      const s = (health[t.spec] = health[t.spec] || {});
      const e = (s[env] = s[env] || { tests: 0, passed: 0, failed: 0, skipped: 0, failures: [] });
      e.tests++;
      if (t.status === 'passed') e.passed++;
      else if (t.status === 'skipped') e.skipped++;
      else { e.failed++; e.failures.push({ name: t.name, msg: t.msg }); }
    }
  }
  return { hits, unmatched, health, envs };
}

// ---------------------------------------------------------------- 3. UI callers

function jmxUiCallers(svc) {
  const f = JMX_UI_REPORTS[svc] && path.join(REPO_ROOT, JMX_UI_REPORTS[svc]);
  if (!f || !fs.existsSync(f)) return null;
  const out = new Map();
  const h = fs.readFileSync(f, 'utf8');
  for (const m of h.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => c[1].replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim());
    const mi = cells.findIndex((c) => /^(GET|POST|PUT|DELETE|PATCH)$/.test(c));
    if (mi < 0) continue;
    const p = cells.slice(mi + 1).find((c) => c.startsWith('/'));
    if (!p) continue;
    const pi = cells.indexOf(p);
    const ui = [];
    if (/^yes/i.test(cells[pi + 1] || '')) ui.push('mfe');
    if (/^yes/i.test(cells[pi + 2] || '')) ui.push('lui');
    out.set(`${cells[mi]} ${normPath(p.split(/[ ?]/)[0])}`, ui);
  }
  return out;
}

/** Path-level scan of string literals in the UI repos; method is not resolved, so it marks every method on the path. */
function literalUiCallers(backendRoot, endpoints) {
  const out = new Map();
  // A literal like '/tenant' can't be attributed to one service when several expose the same path.
  const owners = new Map();
  for (const svc of Object.keys(SERVICES)) for (const e of endpoints[svc]) owners.set(normPath(e.path), new Set([...(owners.get(normPath(e.path)) || []), svc]));
  const candidates = Object.keys(SERVICES).flatMap((svc) => endpoints[svc]).filter((e) => e.literal >= 1 && owners.get(normPath(e.path)).size === 1);
  for (const [ui, repo] of Object.entries(UI_REPOS)) {
    const files = walkFiles(path.join(backendRoot, repo, 'src'), (p) => /\.(ts|tsx|js|jsx)$/.test(p) && !/\.(test|spec|stories)\./.test(p), /node_modules|__tests__|__mocks__|^test$|mocks|stories/i);
    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8');
      for (const m of src.matchAll(/(['"`])((?:\\.|(?!\1)[^\\\n])*?)\1/g)) {
        let s = m[2];
        if (!s.includes('/') || s.length > 200 || /^https?:|\.(png|svg|css|json|js)$|^\.\.?\//.test(s)) continue;
        s = s.replace(/\$\{[^}]*\}/g, 'X').split('?')[0].replace(/\/\/+/g, '/').replace(/^.*?\/(?:process-orchestration|actionitems|links|ui-fields)\/v1(?=\/|$)/, '');
        const segs = s.split('/').filter(Boolean);
        for (let i = 0; i < segs.length; i++) {
          const cand = '/' + segs.slice(i).join('/');
          const found = candidates.filter((e) => e.re.test(cand));
          if (!found.length) continue;
          const best = Math.max(...found.map((e) => e.literal));
          for (const e of found.filter((x) => x.literal === best)) {
            const v = out.get(e.key) || [];
            if (!v.includes(ui)) v.push(ui);
            out.set(e.key, v);
          }
          break;
        }
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- 4. assemble

function classify(svc, e, ctx) {
  const h = ctx.hits.get(e.key);
  e.ui = [];
  const jmx = ctx.jmx[svc];
  if (jmx) e.ui = jmx.get(`${e.method} ${normPath(e.path)}`) || [];
  else e.ui = ctx.literal.get(e.key) || [];
  e.uiSource = jmx ? 'method' : 'path';
  e.status = 'gap';
  if (e.deprecated) e.status = 'deprecated';
  else if (e.devOnly) e.status = 'dev';
  if (h) {
    e.envs = [...h.envs].sort();
    e.specs = [...h.specs].sort();
    e.level = h.scopes.has('test') ? 'test' : h.scopes.has('hook') ? 'hook' : 'log';
    if (e.status === 'gap') e.status = e.level === 'test' ? 'covered' : 'setup';
  }
  const via = (INDIRECT[e.key] || []).filter((k) => ctx.hits.has(`PO ${k}`));
  e.indirect = via;
  if (e.status === 'gap' && via.length) e.status = 'indirect';
  if (['gap', 'setup', 'indirect'].includes(e.status)) {
    const p3 = P3_PATHS[svc].test(e.path);
    e.priority = e.ui.length && e.status === 'gap' ? 'P1' : p3 ? 'P3' : 'P2';
    e.size = LARGE_PATHS.test(e.path) ? 'L' : e.method === 'GET' ? 'S' : 'M';
  }
  e.note = ctx.notes[e.key] || '';
}

function summarise(list) {
  const active = list.filter((e) => !['deprecated', 'dev'].includes(e.status));
  const count = (s) => active.filter((e) => e.status === s).length;
  const covered = count('covered');
  return { active: active.length, covered, setup: count('setup'), indirect: count('indirect'), gap: count('gap'), pct: pct(covered, active.length), deprecated: list.filter((e) => e.status === 'deprecated').length, dev: list.filter((e) => e.status === 'dev').length };
}

function apiChanges(repoDir, since) {
  try {
    const out = git(repoDir, ['log', `--since=${since}`, '--format=%h|%cs|%s', 'HEAD', '--', '*Controller*.java', '*Dto*.java', '*DTO*.java', '*Request*.java', '*Response*.java', 'src/main/resources/db/changelog', 'open-api3-specification']);
    return out ? out.split('\n').map((l) => { const [sha, date, ...s] = l.split('|'); return { sha, date, subject: s.join('|') }; }) : [];
  } catch { return []; }
}

function downloadFromCi(envCount) {
  // `gh run list --status success` returns runs out of date order, so filter and sort locally.
  const list = JSON.parse(execFileSync('gh', ['run', 'list', '--workflow', CI_WORKFLOW, '--limit', '40', '--json', 'databaseId,createdAt,status,conclusion'], { cwd: REPO_ROOT, encoding: 'utf8' }))
    .filter((r) => r.status === 'completed' && r.conclusion === 'success')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'api-coverage-'));
  const picked = [];
  const seenEnvs = new Set();
  for (const r of list) {
    if (picked.length >= envCount) break;
    const dir = path.join(base, String(r.databaseId));
    try {
      execFileSync('gh', ['run', 'download', String(r.databaseId), '-n', 'allure-results', '-D', dir], { cwd: REPO_ROOT, stdio: 'ignore' });
    } catch {
      console.warn(`Skipping run ${r.databaseId}: allure-results could not be downloaded`);
      continue;
    }
    const env = readEnvLabel(dir);
    if (seenEnvs.has(env)) continue;
    seenEnvs.add(env);
    picked.push({ dir, runId: r.databaseId, createdAt: r.createdAt });
  }
  return picked;
}

// ---------------------------------------------------------------- 5. HTML

const CSS = `
:root{--ink:#14202b;--muted:#5a6876;--line:#d9e0e7;--soft:#f5f7fa;--ok:#1a7f45;--warn:#b26100;--bad:#b3001b;--info:#0b6b8f;--grey:#6b7785}
*{box-sizing:border-box}body{margin:0;font:13px/1.5 "Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:#fff}
main{max-width:1200px;margin:0 auto;padding:28px 34px 60px}h1{font-size:25px;margin:0 0 4px}h2{font-size:17px;margin:32px 0 10px;padding-bottom:5px;border-bottom:2px solid var(--ink)}
h3{font-size:14px;margin:20px 0 8px}p{margin:7px 0}a{color:var(--info)}.sub{color:var(--muted);margin:0 0 14px}
.meta{display:flex;flex-wrap:wrap;gap:6px 24px;font-size:11.5px;color:var(--muted);border:1px solid var(--line);background:var(--soft);padding:9px 13px;border-radius:6px}.meta b{color:var(--ink)}
.cards{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}.card{flex:1 1 140px;border:1px solid var(--line);border-radius:8px;padding:10px 13px;background:var(--soft)}
.card .n{font-size:22px;font-weight:700;line-height:1.15}.card .l{font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px}
.ok{color:var(--ok)}.bad{color:var(--bad)}.warn{color:var(--warn)}.muted{color:var(--muted)}
table{width:100%;border-collapse:collapse;margin:8px 0 16px;font-size:11.5px}th,td{border:1px solid var(--line);padding:5px 7px;text-align:left;vertical-align:top}
th{background:#eef2f6;font-size:10.5px;text-transform:uppercase;letter-spacing:.3px}tbody tr:nth-child(even){background:#fbfcfd}td.n,th.n,td.id{text-align:right;white-space:nowrap}td.id{text-align:left}
code{font:11px Consolas,"Cascadia Mono",monospace;background:#eef2f6;padding:1px 4px;border-radius:3px}.ep{font:11px Consolas,"Cascadia Mono",monospace;word-break:break-all}
.m{display:inline-block;min-width:50px;text-align:center;font-weight:700;font-size:9.5px;color:#fff;border-radius:3px;padding:1px 4px}
.GET{background:#0b6b8f}.POST{background:#1a7f45}.PUT{background:#c25e00}.DELETE{background:#b3001b}.PATCH{background:#6a3fb5}.ANY{background:#6b7785}
.pill{display:inline-block;padding:1px 7px;border-radius:9px;font-size:9.5px;font-weight:700;color:#fff;white-space:nowrap}
.P1{background:var(--bad)}.P2{background:var(--warn)}.P3{background:var(--grey)}.ui{background:#3d5a80}.env{background:#e6ebf0;color:var(--ink);font-weight:600}.hook{background:#8a6d00}.ind{background:#5a6876}
.bar{height:10px;background:#e6ebf0;border-radius:5px;overflow:hidden;min-width:90px}.bar>span{display:block;height:100%;background:linear-gradient(90deg,#1a7f45,#37a866)}
.note{border-left:3px solid var(--info);background:#f0f7fb;padding:8px 12px;margin:10px 0}.note.warn{border-color:var(--warn);background:#fff7ec}
ul{margin:6px 0;padding-left:20px}footer{margin-top:36px;border-top:1px solid var(--line);padding-top:10px;color:var(--muted);font-size:11px}
@media print{main{max-width:none;padding:0 6mm}h2{break-after:avoid}tr{break-inside:avoid}}@page{size:A4 landscape;margin:10mm}`;

const method = (m) => `<span class="m ${esc(m)}">${esc(m)}</span>`;
const bar = (v) => `<div class="bar"><span style="width:${Math.min(100, v).toFixed(1)}%"></span></div>`;
const uiPills = (e) => e.ui.map((u) => `<span class="pill ui" title="${e.uiSource === 'path' ? 'path-level match in UI source' : 'method-level (JMeter coverage report)'}">${u}</span>`).join(' ');
const shortEnv = (env) => env.replace('INTEROP', 'IOP').replace('-AZURE', '·AZ').replace('-GRAVITEE', '·GR');
const shortSpec = (s) => s.replace(/^ProcessOrchestrationBackend\//, '').replace(/\.spec\.ts$/, '');
const page = (title, body) => `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${esc(title)}</title>\n<style>${CSS}</style>\n</head>\n<body>\n<main>\n${body}\n</main>\n</body>\n</html>\n`;

function deltaText(cur, prev) {
  if (prev == null) return '<span class="muted">n/a</span>';
  const d = cur - prev;
  return `<span class="${d > 0 ? 'ok' : d < 0 ? 'bad' : 'muted'}">${d > 0 ? '+' : ''}${d.toFixed(1)} pt</span>`;
}

function specList(specs, max = 4) {
  const names = specs.map(shortSpec);
  return esc(names.slice(0, max).join(', ')) + (names.length > max ? ` <span class="muted">+${names.length - max} more</span>` : '');
}

function serviceReport(svc, list, ctx) {
  const cfg = SERVICES[svc];
  const sum = ctx.summary[svc];
  const prev = ctx.prevSnap && ctx.prevSnap.services[svc];
  const prevKeys = new Set(prev ? prev.keys : []);
  const curKeys = list.filter((e) => e.status === 'covered').map((e) => e.key);
  const gained = curKeys.filter((k) => !prevKeys.has(k));
  const lost = [...prevKeys].filter((k) => !curKeys.includes(k));
  const gaps = list.filter((e) => ['gap', 'setup', 'indirect'].includes(e.status)).sort((a, b) => a.priority.localeCompare(b.priority) || a.module.localeCompare(b.module) || a.path.localeCompare(b.path));
  const effort = gaps.reduce((s, e) => s + SIZE_DAYS[e.size], 0);
  const byPri = (p) => gaps.filter((e) => e.priority === p);
  const modules = [...new Set(list.map((e) => e.module))].map((m) => {
    const ms = list.filter((e) => e.module === m && !['deprecated', 'dev'].includes(e.status));
    const cov = ms.filter((e) => e.status === 'covered').length;
    return { m, total: ms.length, cov, other: ms.filter((e) => ['setup', 'indirect'].includes(e.status)).length, gap: ms.filter((e) => e.status === 'gap').length, p1: ms.filter((e) => e.priority === 'P1').length };
  }).filter((x) => x.total).sort((a, b) => b.gap - a.gap || a.m.localeCompare(b.m));
  const changes = ctx.apiChanges[svc];

  let b = `<p><a href="backend-api-coverage-dashboard.html">&larr; Backend API coverage dashboard</a></p>
<h1>${esc(cfg.name)} service &mdash; API automation coverage</h1>
<p class="sub">Which <code>${esc(cfg.repo)}</code> endpoints the Playwright backend suite exercises, and the prioritised gap register.</p>
<div class="meta"><div><b>Generated:</b> ${esc(ctx.date)}</div><div><b>Service HEAD:</b> ${esc(ctx.heads[svc])}</div><div><b>Automation HEAD:</b> ${esc(ctx.heads.automation)}</div><div><b>Evidence:</b> ${ctx.envs.map((e) => esc(e.env)).join(', ')}</div><div><b>Suite:</b> <code>playwright-e2e/tests/ProcessOrchestrationBackend</code></div></div>
<div class="cards">
<div class="card"><div class="n">${sum.active}</div><div class="l">Active endpoints</div></div>
<div class="card"><div class="n ok">${sum.covered}</div><div class="l">Exercised in a test</div></div>
<div class="card"><div class="n">${sum.setup + sum.indirect}</div><div class="l">Setup-only / via PO</div></div>
<div class="card"><div class="n bad">${sum.gap}</div><div class="l">Not exercised</div></div>
<div class="card"><div class="n">${fmtPct(sum.pct)}</div><div class="l">Coverage</div></div>
<div class="card"><div class="n">${prev ? deltaText(sum.pct, pct(prev.covered, prev.active)) : 'n/a'}</div><div class="l">Since ${esc(ctx.prevSnap ? ctx.prevSnap.date : '-')}</div></div>
</div>
${bar(sum.pct)}
<p class="muted">Active excludes ${sum.deprecated} <code>@Deprecated</code> and ${sum.dev} <code>@Profile("local")</code> routes. Shared <code>/ops/**</code> routes from plan-sop-po-be-commons are out of scope. Rough effort to close every open item: <b>${effort.toFixed(1)} person-days</b> (S&nbsp;=&nbsp;0.5, M&nbsp;=&nbsp;1, L&nbsp;=&nbsp;2).</p>

<h2>1. Change since ${esc(ctx.prevSnap ? ctx.prevSnap.date : 'last snapshot')}</h2>`;
  if (ctx.prevSnap) {
    b += `<p class="muted">Previous figures: ${prev ? `${prev.covered} of ${prev.active} (${fmtPct(pct(prev.covered, prev.active))})` : 'none'} &mdash; ${esc(ctx.prevSnap.source || '')}.</p>`;
    b += `<h3>Newly exercised (${gained.length})</h3>`;
    b += gained.length ? `<table><thead><tr><th style="width:70px">Method</th><th>Endpoint</th><th>Exercised by</th></tr></thead><tbody>${gained.map((k) => { const e = list.find((x) => x.key === k); return `<tr><td>${method(e.method)}</td><td class="ep">${esc(e.path)}</td><td>${specList(e.specs)}</td></tr>`; }).join('')}</tbody></table>` : '<p class="muted">None.</p>';
    if (lost.length) {
      b += `<h3>Exercised before, not exercised now (${lost.length})</h3><table><thead><tr><th>Endpoint</th><th>Now</th></tr></thead><tbody>${lost.map((k) => { const e = list.find((x) => x.key === k); return `<tr><td class="ep">${esc(k.replace(/^\w+ /, ''))}</td><td>${e ? esc(e.status === 'indirect' ? 'exercised only via PO (' + e.indirect.join(', ') + ')' : e.status === 'setup' ? 'setup/teardown only' : e.status) : 'route no longer exists'}</td></tr>`; }).join('')}</tbody></table>`;
    }
  }
  b += `<h3>API-surface commits in the service since ${esc(ctx.prevSnap ? ctx.prevSnap.date : '-')} (${changes.length})</h3>`;
  b += changes.length ? `<p class="muted">Commits touching controllers, DTOs, Liquibase changelogs or the OpenAPI spec. Review these for behaviour the suite does not assert yet.</p><table><thead><tr><th style="width:80px">Commit</th><th style="width:90px">Date</th><th>Subject</th></tr></thead><tbody>${changes.slice(0, 25).map((c) => `<tr><td><code>${esc(c.sha)}</code></td><td>${esc(c.date)}</td><td>${esc(c.subject)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">None.</p>';

  b += `<h2>2. Coverage by module</h2><table><thead><tr><th>Module</th><th class="n">Active</th><th class="n">Exercised</th><th class="n">Setup / via PO</th><th class="n">Gap</th><th class="n">UI-used gaps</th><th class="n">Coverage</th><th style="width:140px"></th></tr></thead><tbody>`;
  for (const x of modules) b += `<tr><td>${esc(x.m)}</td><td class="n">${x.total}</td><td class="n">${x.cov}</td><td class="n">${x.other || ''}</td><td class="n">${x.gap || ''}</td><td class="n">${x.p1 ? `<b class="bad">${x.p1}</b>` : ''}</td><td class="n">${fmtPct(pct(x.cov, x.total))}</td><td>${bar(pct(x.cov, x.total))}</td></tr>`;
  b += `<tr style="font-weight:700"><td>Total</td><td class="n">${sum.active}</td><td class="n">${sum.covered}</td><td class="n">${sum.setup + sum.indirect}</td><td class="n">${sum.gap}</td><td class="n">${byPri('P1').length}</td><td class="n">${fmtPct(sum.pct)}</td><td>${bar(sum.pct)}</td></tr></tbody></table>`;

  b += `<h2>3. Gap register (${gaps.length})</h2>
<p><span class="pill P1">P1</span> called by planning-mfe or lui and not exercised &nbsp; <span class="pill P2">P2</span> product API with no UI caller, or exercised only in setup / via PO &nbsp; <span class="pill P3">P3</span> onboarding, admin, credentials and cache routes. Size is a rough build estimate including negatives and cleanup.</p>
<p class="muted">P1: ${byPri('P1').length} &nbsp; P2: ${byPri('P2').length} &nbsp; P3: ${byPri('P3').length}. UI usage for ${svc === 'PO' || svc === 'LM' ? 'this service is method-level, from the JMeter coverage report' : 'this service is a path-level scan of planning-mfe and lui source'}.</p>
<table><thead><tr><th style="width:64px">ID</th><th style="width:66px">Method</th><th>Endpoint</th><th style="width:120px">Module</th><th style="width:70px">UI</th><th style="width:40px">Pri</th><th style="width:34px">Size</th><th style="width:38%">Notes</th></tr></thead><tbody>`;
  gaps.forEach((e, i) => {
    const state = e.status === 'setup' ? `<span class="pill hook">setup only</span> ${specList(e.specs, 2)}. ` : e.status === 'indirect' ? `<span class="pill ind">via PO</span> ${esc(e.indirect.join(', '))}. ` : '';
    b += `<tr><td class="id">${svc}-G${String(i + 1).padStart(2, '0')}</td><td>${method(e.method)}</td><td class="ep">${esc(e.path)}</td><td>${esc(e.module)}</td><td>${uiPills(e)}</td><td><span class="pill ${e.priority}">${e.priority}</span></td><td>${e.size}</td><td>${state}${esc(e.note)}</td></tr>`;
  });
  b += `</tbody></table><p class="muted">Gap IDs are regenerated on every run; reference endpoints, not IDs, in plans and tickets.</p>`;

  const covered = list.filter((e) => e.status === 'covered').sort((a, b) => a.module.localeCompare(b.module) || a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
  b += `<h2>4. Exercised endpoints (${covered.length})</h2><table><thead><tr><th style="width:66px">Method</th><th>Endpoint</th><th style="width:120px">Module</th><th style="width:70px">UI</th><th style="width:150px">Environments</th><th style="width:36%">Specs</th></tr></thead><tbody>`;
  for (const e of covered) b += `<tr><td>${method(e.method)}</td><td class="ep">${esc(e.path)}</td><td>${esc(e.module)}</td><td>${uiPills(e)}</td><td>${e.envs.map((x) => `<span class="pill env">${esc(shortEnv(x))}</span>`).join(' ')}</td><td>${specList(e.specs, 5)}</td></tr>`;
  b += '</tbody></table>';

  const excluded = list.filter((e) => ['deprecated', 'dev'].includes(e.status));
  if (excluded.length) {
    b += `<h2>5. Excluded routes (${excluded.length})</h2><table><thead><tr><th style="width:66px">Method</th><th>Endpoint</th><th style="width:160px">Reason</th><th>Controller</th></tr></thead><tbody>`;
    for (const e of excluded) b += `<tr><td>${method(e.method)}</td><td class="ep">${esc(e.path)}</td><td>${e.status === 'dev' ? '<code>@Profile("local")</code> mock' : '<code>@Deprecated</code>'}</td><td>${esc(e.controllers.join(', '))}</td></tr>`;
    b += '</tbody></table>';
  }
  b += `<h2>Related</h2><ul><li><a href="${cfg.detail}">Detailed gap analysis</a> &mdash; hand-maintained: sample payloads, ordered test-case plan and delivery roadmap, with per-row status badges. Update it when this report changes materially.</li><li><a href="${cfg.psrPlan}">PSR gap plan</a> &mdash; contracts verified in source and on INTEROP/QA for the PSR-used routes.</li><li><a href="PSR-Gap-Plans/ActionItems-UIFields-Defect-Report.html">Defect report</a> &mdash; known defects the specs deliberately do not assert.</li><li><a href="../repositories/${cfg.repo}/api-contract.md">Repository API contract</a> and <a href="../repositories/${cfg.repo}/automation-coverage.md">automation coverage notes</a>.</li></ul>`;
  b += `<footer>Generated by <code>playwright-e2e/scripts/generate-api-coverage-report.js</code>. Endpoints come from every Spring <code>@*Mapping</code> in <code>${esc(cfg.repo)}/src/main</code>; coverage comes from request logs in allure-results. An endpoint counts as exercised when a test body (not a hook) sends at least one request to it in any listed environment. Curated notes: <code>docs/Coverage/data/endpoint-notes.json</code>.</footer>`;
  return page(`${cfg.name} - API automation coverage`, b);
}

function dashboard(ctx) {
  const tot = Object.values(ctx.summary).reduce((a, s) => ({ active: a.active + s.active, covered: a.covered + s.covered, gap: a.gap + s.gap, other: a.other + s.setup + s.indirect }), { active: 0, covered: 0, gap: 0, other: 0 });
  const prev = ctx.prevSnap;
  const prevTot = prev ? Object.values(prev.services).reduce((a, s) => ({ active: a.active + s.active, covered: a.covered + s.covered }), { active: 0, covered: 0 }) : null;
  const p1 = Object.values(ctx.lists).flat().filter((e) => e.priority === 'P1' && ['gap'].includes(e.status));
  const healthEnv = {};
  for (const s of Object.values(ctx.health)) for (const [env, v] of Object.entries(s)) { const h = (healthEnv[env] = healthEnv[env] || { tests: 0, passed: 0, failed: 0, skipped: 0 }); for (const k of Object.keys(h)) h[k] += v[k]; }
  const failures = [];
  for (const [spec, s] of Object.entries(ctx.health)) for (const [env, v] of Object.entries(s)) for (const f of v.failures) failures.push({ spec, env, ...f });

  let b = `<h1>Backend API automation coverage</h1>
<p class="sub">Endpoint coverage of the four backend services by the Playwright backend suite, measured from service source and real run evidence.</p>
<div class="meta"><div><b>Generated:</b> ${esc(ctx.date)}</div><div><b>Automation HEAD:</b> ${esc(ctx.heads.automation)}</div><div><b>Evidence:</b> ${ctx.envs.map((e) => esc(e.env) + (e.runId ? ` (run ${e.runId})` : '')).join(', ')}</div></div>
<div class="cards">
<div class="card"><div class="n">${tot.active}</div><div class="l">Active endpoints</div></div>
<div class="card"><div class="n ok">${tot.covered}</div><div class="l">Exercised in a test</div></div>
<div class="card"><div class="n">${tot.other}</div><div class="l">Setup-only / via PO</div></div>
<div class="card"><div class="n bad">${tot.gap}</div><div class="l">Not exercised</div></div>
<div class="card"><div class="n">${fmtPct(pct(tot.covered, tot.active))}</div><div class="l">Coverage</div></div>
<div class="card"><div class="n bad">${p1.length}</div><div class="l">UI-used gaps (P1)</div></div>
</div>
${bar(pct(tot.covered, tot.active))}
${prevTot ? `<p>Up from <b>${prevTot.covered} of ${prevTot.active} (${fmtPct(pct(prevTot.covered, prevTot.active))})</b> on ${esc(prev.date)} (${esc(prev.source || '')}).</p>` : ''}

<h2>1. By service</h2>
<table><thead><tr><th>Service</th><th class="n">Active</th><th class="n">Exercised</th><th class="n">Setup / via PO</th><th class="n">Gap</th><th class="n">P1 gaps</th><th class="n">Coverage</th><th class="n">Previous</th><th class="n">Change</th><th style="width:130px"></th><th>Report</th><th>Detailed analysis</th></tr></thead><tbody>`;
  for (const [svc, cfg] of Object.entries(SERVICES)) {
    const s = ctx.summary[svc];
    const ps = prev && prev.services[svc];
    const pp = ps ? pct(ps.covered, ps.active) : null;
    b += `<tr><td><b>${esc(cfg.name)}</b><br><span class="muted">${esc(cfg.repo)}</span></td><td class="n">${s.active}</td><td class="n">${s.covered}</td><td class="n">${s.setup + s.indirect}</td><td class="n">${s.gap}</td><td class="n">${ctx.lists[svc].filter((e) => e.priority === 'P1' && e.status === 'gap').length}</td><td class="n"><b>${fmtPct(s.pct)}</b></td><td class="n">${pp == null ? 'n/a' : `${ps.covered}/${ps.active} (${fmtPct(pp)})`}</td><td class="n">${deltaText(s.pct, pp)}</td><td>${bar(s.pct)}</td><td><a href="${cfg.file}">${esc(cfg.file)}</a></td><td><a href="${cfg.detail}">${esc(cfg.detail)}</a></td></tr>`;
  }
  b += `</tbody></table>`;
  if (prev && /31-Aug-2026/.test(prev.source || '')) b += `<p class="note warn">The 2026-08-31 figures came from the per-service reports, which counted endpoints by hand against the legacy WDIO suite (<code>e2e/specs</code>) and treated calls made only in setup as covered. Today's numbers come from source and run logs, so compare trends, not single endpoints.</p>`;

  b += `<h2>2. UI-used endpoints with no test (P1, ${p1.length})</h2><p class="muted">Called by planning-mfe or lui and not exercised by any backend spec. These carry the highest regression risk.</p><table><thead><tr><th style="width:44px">Svc</th><th style="width:66px">Method</th><th>Endpoint</th><th style="width:130px">Module</th><th style="width:70px">UI</th><th style="width:34px">Size</th></tr></thead><tbody>`;
  for (const e of p1.sort((a, b) => a.svc.localeCompare(b.svc) || a.module.localeCompare(b.module) || a.path.localeCompare(b.path))) b += `<tr><td>${e.svc}</td><td>${method(e.method)}</td><td class="ep">${esc(e.path)}</td><td>${esc(e.module)}</td><td>${uiPills(e)}</td><td>${e.size}</td></tr>`;
  b += '</tbody></table>';

  b += `<h2>3. Suite health in the evidence runs</h2><table><thead><tr><th>Environment</th><th class="n">Tests</th><th class="n">Passed</th><th class="n">Failed</th><th class="n">Skipped</th><th class="n">Pass rate</th></tr></thead><tbody>`;
  for (const [env, h] of Object.entries(healthEnv).sort()) b += `<tr><td>${esc(env)}</td><td class="n">${h.tests}</td><td class="n ok">${h.passed}</td><td class="n ${h.failed ? 'bad' : ''}">${h.failed}</td><td class="n">${h.skipped}</td><td class="n">${fmtPct(pct(h.passed, h.tests - h.skipped))}</td></tr>`;
  b += `</tbody></table><p class="muted">${Object.keys(ctx.health).length} backend specs. Status is each test's final retry. Skips are mostly deliberate environment guards (for example QA-only data gaps).</p>`;
  if (failures.length) {
    b += `<h3>Failures (${failures.length})</h3><table><thead><tr><th style="width:130px">Environment</th><th style="width:30%">Spec</th><th>Test</th><th style="width:30%">Message</th></tr></thead><tbody>`;
    for (const f of failures.sort((a, b) => a.spec.localeCompare(b.spec) || a.env.localeCompare(b.env))) b += `<tr><td>${esc(f.env)}</td><td>${esc(shortSpec(f.spec))}</td><td>${esc(f.name)}</td><td>${esc(f.msg.slice(0, 160))}</td></tr>`;
    b += '</tbody></table>';
  }

  b += `<h2>4. Method</h2><ul>
<li><b>Endpoints</b>: every Spring <code>@GetMapping</code>/<code>@PostMapping</code>/<code>@PutMapping</code>/<code>@DeleteMapping</code>/<code>@PatchMapping</code>/<code>@RequestMapping</code> in each service's <code>src/main</code>, combined with the class-level prefix. Routes mapped by both a v1 and v2 controller count once. <code>@Deprecated</code> and <code>@Profile("local")</code> routes are listed but excluded from the denominator.</li>
<li><b>Evidence</b>: <code>Sending &lt;METHOD&gt; request to &lt;URL&gt;</code> lines in the allure-results of the runs above, attributed to the spec that produced them. Gateway prefixes for Azure and Gravitee are stripped, and each URL matches the most specific route.</li>
<li><b>Exercised</b> means at least one request from a test body. <b>Setup only</b> means the request happened only in <code>beforeAll</code>/<code>afterAll</code>. <b>Via PO</b> means PO calls the route downstream while serving a route the suite exercises (verified in the PO proxy services).</li>
<li><b>UI usage</b>: method-level for PO and LM (JMeter coverage reports in <code>jmeter/plans/</code>); path-level literal scan of planning-mfe and lui source for Action Items and UI Fields, which can miss URLs built by concatenation.</li>
<li>Exercised does not mean fully asserted: depth varies by spec. See the PSR gap plans for the verified contracts.</li></ul>
<h2>5. Related documents</h2><ul>
<li><a href="PSR-Gap-Plans/01-ProcessOrchestration-PSR-Gap-Plan.md">PSR gap plans</a> (PO, LM, AI, UI Fields) and the <a href="PSR-Gap-Plans/ActionItems-UIFields-Defect-Report.html">defect report</a>.</li>
<li><a href="../../../jmeter/plans/PSRGatewayTest-ProcessOrchestration-Coverage.html">JMeter PO coverage</a> and <a href="../../../jmeter/plans/PSRGatewayTest-LinkManagement-Coverage.html">JMeter LM coverage</a>.</li>
<li><a href="../repositories/README.md">Repository docs</a> and the cross-repo <a href="../repositories/coverage-matrix.md">coverage matrix</a>.</li>
<li><a href="../testcases/ProcessOrchestrationBackend.md">Backend test-case catalogue</a>.</li></ul>
<footer>Regenerate from <code>playwright-e2e/</code> with <code>npm run docs:api-coverage</code> after pulling <code>main</code> in every sibling repo. Generated by <code>scripts/generate-api-coverage-report.js</code>.</footer>`;
  return page('Backend API automation coverage', b);
}

// ---------------------------------------------------------------- main

function main() {
  const args = parseArgs(process.argv.slice(2));
  let runs = args.allure.map((dir) => ({ dir }));
  if (args.fromCi || !runs.length) runs = runs.concat(downloadFromCi(args.runs));

  const heads = { automation: git(REPO_ROOT, ['log', '-1', '--format=%h %cs']) };
  const endpoints = {};
  for (const [svc, cfg] of Object.entries(SERVICES)) {
    const dir = path.join(args.backendRoot, cfg.repo);
    if (!fs.existsSync(dir)) throw new Error(`Missing service repo: ${dir}`);
    heads[svc] = git(dir, ['log', '-1', '--format=%h %cs']);
    endpoints[svc] = uniqueEndpoints(svc, extractRoutes(dir));
  }

  const ev = collectEvidence(runs.map((r) => r.dir), endpoints);
  const envs = ev.envs.map((e) => ({ ...e, runId: (runs.find((r) => r.dir === e.dir) || {}).runId }));
  const notes = readJson(path.join(DATA_DIR, 'endpoint-notes.json'), {});
  const snapFile = path.join(DATA_DIR, 'coverage-snapshot.json');
  const snap = readJson(snapFile, { current: null, previous: null });
  const prevSnap = snap.current && snap.current.date !== args.date ? snap.current : snap.previous;

  const ctx = { date: args.date, heads, envs, hits: ev.hits, health: ev.health, notes, prevSnap, lists: {}, summary: {}, apiChanges: {}, jmx: {} };
  for (const svc of Object.keys(SERVICES)) ctx.jmx[svc] = jmxUiCallers(svc);
  ctx.literal = literalUiCallers(args.backendRoot, endpoints);
  for (const svc of Object.keys(SERVICES)) {
    for (const e of endpoints[svc]) classify(svc, e, ctx);
    ctx.lists[svc] = endpoints[svc];
    ctx.summary[svc] = summarise(endpoints[svc]);
    ctx.apiChanges[svc] = prevSnap ? apiChanges(path.join(args.backendRoot, SERVICES[svc].repo), prevSnap.date) : [];
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const [svc, cfg] of Object.entries(SERVICES)) fs.writeFileSync(path.join(OUT_DIR, cfg.file), serviceReport(svc, ctx.lists[svc], ctx));
  fs.writeFileSync(path.join(OUT_DIR, 'backend-api-coverage-dashboard.html'), dashboard(ctx));

  const current = { date: args.date, source: `generated from ${envs.map((e) => e.env).join(', ')}`, services: {} };
  for (const svc of Object.keys(SERVICES)) current.services[svc] = { active: ctx.summary[svc].active, covered: ctx.summary[svc].covered, keys: ctx.lists[svc].filter((e) => e.status === 'covered').map((e) => e.key).sort() };
  fs.writeFileSync(snapFile, JSON.stringify({ current, previous: prevSnap }, null, 2) + '\n');

  for (const svc of Object.keys(SERVICES)) {
    const s = ctx.summary[svc];
    console.log(`${svc.padEnd(4)} active=${s.active} exercised=${s.covered} setup=${s.setup} viaPO=${s.indirect} gap=${s.gap} coverage=${fmtPct(s.pct)}`);
  }
  if (ev.unmatched.size) {
    console.log(`Requests that matched no route (${ev.unmatched.size}):`);
    for (const [k, v] of ev.unmatched) console.log(`  ${k} x${v}`);
  }
  console.log(`Reports written to ${path.relative(PW_ROOT, OUT_DIR)}`);
}

main();
