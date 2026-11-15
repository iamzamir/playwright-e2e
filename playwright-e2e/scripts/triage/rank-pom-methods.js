/**
 * Ranks page-object methods by how often they break the nightly suites (planning task T7.1).
 *
 * Reads the dashboard run data (<runs-dir>/<night>/<suite>__<run>.json, written by build-run-data.js), takes the
 * run per suite per night that the dashboard uses (build-day.js selectRuns) and counts per POM method:
 * - failures: failed tests whose first stack frame in our code (error.location) is inside pageobjects/;
 * - flaky:    tests that passed on retry, credited to the POM method the same test failed in during the window
 *             (run data keeps no stack for passing tests, so a test that never failed outright stays unattributed);
 * - blocked:  tests skipped by describe.serial after a failure in that method (blockedById).
 * Line numbers are mapped to the enclosing method in the current source; when the method recorded in the stack
 * differs from the one at that line now, the row is marked approximate (~). XPath, waitForTimeout and .isVisible(
 * counts come from the same scan, using the regexes behind the Phase 7 debt table.
 *
 * Usage: node scripts/triage/rank-pom-methods.js [--days 30] [--top 30] [--out <file.md>]
 *          [--runs-dir <dashboard/data/runs>] [--repo <owner/name>] [--ref gh-pages] [--until YYYY-MM-DD]
 * Without --runs-dir the run data is read from the gh-pages branch through the GitHub API
 * (token from GITHUB_TOKEN / GH_TOKEN, otherwise `gh auth token`).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { selectRuns, isValidDate } = require('./build-day');
const { parseArgs } = require('./verdict');

const ROOT = path.resolve(__dirname, '../..');
const DEFAULT_REPO = 'BY-Product-Development/plan-sop-ui-automation';
const RUNS_PATH = 'dashboard/data/runs';
const POM_PREFIX = 'pageobjects/';
const XPATH = /xpath=|["'`]\(?\.?\/\//;
const SLEEP = /waitForTimeout\(/;
const IS_VISIBLE = /\.isVisible\(/;
const CLASS_LINE = /^(\s*)(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([\w$]+)/;
const FUNCTION_LINE = /^\s*(?:export\s+)?(?:async\s+)?function\s*\*?\s*([\w$]+)\s*[<(]/;
const METHOD_LINE = /^\s*(?:(?:public|private|protected|static|override|readonly)\s+)*(?:async\s+)?(?:get\s+|set\s+)?\*?\s*([\w$]+)\s*(?:<[^()]*>)?\s*(?:\(|=\s*(?:async\s+)?(?:\([^)]*\)|[\w$]+)\s*(?::[^=]+)?=>)/;
const NOT_METHODS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'await', 'new', 'typeof', 'function', 'super', 'this', 'else', 'do', 'try', 'with']);
const NIGHT = /^\d{4}-\d{2}-\d{2}$/;

function indentOf(line) {
  return line.match(/^\s*/)[0].length;
}

/**
 * Methods of a page-object source with their line range (1-based, inclusive) and debt counts.
 * Class members are lines at the class's member indentation that look like a method or arrow property;
 * top-level functions are picked up too, so helpers outside a class still resolve.
 */
function scanSource(text) {
  const lines = String(text).split(/\r?\n/);
  const methods = [];
  let className = null;
  let memberIndent = null;
  let classIndent = -1;
  lines.forEach((line, index) => {
    const lineNo = index + 1;
    if (!line.trim() || /^\s*(\/\/|\/?\*)/.test(line)) return;
    const cls = line.match(CLASS_LINE);
    if (cls) {
      className = cls[2];
      classIndent = cls[1].length;
      memberIndent = null;
      return;
    }
    const indent = indentOf(line);
    if (className && indent <= classIndent && /^\s*}/.test(line)) {
      className = null;
      memberIndent = null;
      return;
    }
    const fn = line.match(FUNCTION_LINE);
    if (fn && (!className || indent <= classIndent)) {
      methods.push({ name: fn[1], className: null, start: lineNo });
      return;
    }
    if (!className) return;
    if (memberIndent === null && indent > classIndent) memberIndent = indent;
    if (indent !== memberIndent) return;
    const method = line.match(METHOD_LINE);
    if (method && !NOT_METHODS.has(method[1])) methods.push({ name: method[1], className, start: lineNo });
  });

  methods.forEach((method, index) => {
    method.end = index + 1 < methods.length ? methods[index + 1].start - 1 : lines.length;
    const body = lines.slice(method.start - 1, method.end);
    method.xpath = body.filter((line) => XPATH.test(line)).length;
    method.sleeps = body.filter((line) => SLEEP.test(line)).length;
    method.isVisible = body.filter((line) => IS_VISIBLE.test(line)).length;
  });
  return { methods, lineCount: lines.length };
}

function enclosingMethod(scan, line) {
  let found = null;
  for (const method of scan.methods) {
    if (method.start > line) break;
    found = method;
  }
  return found && line <= found.end ? found : null;
}

// "PlanningPage.selectView" -> "selectView"; anonymous frames give null.
function recordedMethodName(fn) {
  const name = String(fn || '').split('.').pop();
  return name && !name.includes('<') && name !== 'Object' ? name : null;
}

/**
 * Maps a run-data error location ({ file, line, function }) to a POM method of the current source.
 * Returns null for locations outside pageobjects/.
 */
function resolveLocation(location, getScan) {
  if (!location || !String(location.file || '').startsWith(POM_PREFIX)) return null;
  const file = location.file;
  const recorded = recordedMethodName(location.function);
  const scan = getScan(file);
  if (!scan) {
    return { key: `${file}:${recorded || `line ${location.line}`}`, file, method: recorded || `line ${location.line}`, approximate: true, debt: null };
  }
  const atLine = enclosingMethod(scan, location.line);
  let method = atLine;
  let approximate = false;
  if (recorded && (!atLine || atLine.name !== recorded)) {
    // The line moved since the run: trust the method recorded in the stack. When it was renamed or removed since,
    // keep its recorded name rather than crediting whatever method now sits at that line.
    method = scan.methods.find((candidate) => candidate.name === recorded) || null;
    approximate = true;
  }
  const name = method ? method.name : recorded || `line ${location.line}`;
  return {
    key: `${file}:${name}`,
    file,
    method: name,
    approximate: approximate || !method,
    debt: method ? { xpath: method.xpath, sleeps: method.sleeps, isVisible: method.isVisible } : null
  };
}

// The newest `days` nights up to and including `until` (or the newest available night).
function selectNights(nights, days, until) {
  return nights
    .filter((night) => NIGHT.test(night) && (!until || night <= until))
    .sort()
    .slice(-days);
}

function areaOf(file) {
  const top = String(file || '').split('/')[0];
  return ['pageobjects', 'tests', 'util'].includes(top) ? top : 'other';
}

/**
 * nights: [{ date, runs: [run data] }]. getScan(file) returns scanSource() of the current file, or null.
 * Returns ranked rows plus totals for the report header.
 */
function rankPomMethods({ nights, getScan }) {
  const rows = new Map();
  const totals = { nights: nights.length, runs: 0, failures: 0, failuresByArea: { pageobjects: 0, tests: 0, util: 0, other: 0, none: 0 }, flaky: 0, flakyAttributed: 0, blocked: 0, blockedAttributed: 0, approximate: 0 };
  const selected = nights.map(({ date, runs }) => ({ date, runs: [...selectRuns(runs).values()] }));

  const rowFor = (resolved) => {
    if (!rows.has(resolved.key)) {
      rows.set(resolved.key, { key: resolved.key, file: resolved.file, method: resolved.method, approximate: false, debt: resolved.debt, failures: 0, flaky: 0, blocked: 0, nights: new Set(), tests: new Map(), signatures: new Map() });
    }
    const row = rows.get(resolved.key);
    row.approximate = row.approximate || resolved.approximate;
    return row;
  };

  // Pass 1: failures, and which POM method each test failed in (to credit its flaky passes).
  const failedIn = new Map();
  for (const { date, runs } of selected) {
    for (const run of runs) {
      totals.runs++;
      run._failureRows = new Map();
      for (const record of run.tests || []) {
        if (record.status !== 'failed') continue;
        totals.failures++;
        const location = record.error && record.error.location;
        totals.failuresByArea[location ? areaOf(location.file) : 'none']++;
        const resolved = resolveLocation(location, getScan);
        if (!resolved) continue;
        if (resolved.approximate) totals.approximate++;
        const row = rowFor(resolved);
        row.failures++;
        row.nights.add(date);
        const testName = `${record.spec} › ${record.name}`;
        row.tests.set(testName, (row.tests.get(testName) || 0) + 1);
        if (record.signature) row.signatures.set(record.signature, (row.signatures.get(record.signature) || 0) + 1);
        run._failureRows.set(record.id, row);
        // The same spec runs in several suites (environments, gateways), so flaky credit stays within one suite.
        const testKey = `${run.suite}|${record.id}`;
        if (!failedIn.has(testKey)) failedIn.set(testKey, new Map());
        failedIn.get(testKey).set(row, (failedIn.get(testKey).get(row) || 0) + 1);
      }
    }
  }

  // Pass 2: flaky passes and serial-cascade blocks.
  for (const { runs } of selected) {
    for (const run of runs) {
      for (const record of run.tests || []) {
        if (record.flaky) {
          totals.flaky++;
          const candidates = failedIn.get(`${run.suite}|${record.id}`);
          if (candidates) {
            const [row] = [...candidates.entries()].sort((a, b) => b[1] - a[1])[0];
            row.flaky++;
            totals.flakyAttributed++;
          }
        }
        if (record.status === 'blocked') {
          totals.blocked++;
          const row = record.blockedById ? run._failureRows.get(record.blockedById) : null;
          if (row) {
            row.blocked++;
            totals.blockedAttributed++;
          }
        }
      }
      delete run._failureRows;
    }
  }

  const ranked = [...rows.values()]
    .sort((a, b) => b.failures - a.failures || b.flaky - a.flaky || b.blocked - a.blocked || a.key.localeCompare(b.key))
    .map((row, index) => ({ ...row, rank: index + 1, nights: row.nights.size }));
  return { rows: ranked, totals, dates: selected.map(({ date }) => date) };
}

function percent(part, whole) {
  return whole ? `${Math.round((part / whole) * 100)}%` : '0%';
}

function topEntries(map, count) {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, count);
}

function renderMarkdown({ rows, totals, dates }, { top = 30, generatedAt = new Date().toISOString(), source = '', command = '' } = {}) {
  const shown = rows.slice(0, top);
  const debt = (row, field) => (row.debt ? row.debt[field] : 'n/a');
  const areas = totals.failuresByArea;
  const lines = [
    `# POM instability ranking (${dates.length ? `${dates[0]} to ${dates[dates.length - 1]}` : 'no data'})`,
    '',
    `Generated ${generatedAt.slice(0, 10)} by \`scripts/triage/rank-pom-methods.js\` (task [T7.1](tasks/T7.1_rank_unstable_pom_methods.md)). Feeds the work order of [T7.2](tasks/T7.2_planning_page_refactor.md) and [T7.3](tasks/T7.3_other_large_poms.md).`,
    '',
    '## Data',
    `- Nights: ${dates.length} (${dates.join(', ') || 'none'}), one run per suite per night as on the dashboard (scheduled run first): ${totals.runs} runs${source ? `, read from ${source}` : ''}.`,
    `- Failed tests: ${totals.failures}. First stack frame in our code: pageobjects ${areas.pageobjects} (${percent(areas.pageobjects, totals.failures)}), tests ${areas.tests}, util ${areas.util}, other ${areas.other}, none ${areas.none}. Only pageobjects frames are ranked.`,
    `- Flaky passes: ${totals.flaky}, ${totals.flakyAttributed} credited to a POM method (the test also failed in that method during the window; run data keeps no stack for passing tests).`,
    `- Blocked tests (describe.serial cascade): ${totals.blocked}, ${totals.blockedAttributed} caused by a POM method failure.`,
    `- ~ marks approximate rows: for at least one failure the line moved since that run (the method recorded in the stack is not the one at that line in the current source), so the row uses the recorded method name; ${totals.approximate} failure(s) affected. Debt counts are from the current source.`,
    '',
    `## Top ${shown.length} methods`,
    '',
    '| Rank | File:method | Failures | Flaky | Blocked | Nights | XPath | Sleeps | `isVisible` |',
    '|---|---|---|---|---|---|---|---|---|'
  ];
  for (const row of shown) {
    const name = `\`${row.file.slice(POM_PREFIX.length)}:${row.method}\`${row.approximate ? ' ~' : ''}`;
    lines.push(`| ${row.rank} | ${name} | ${row.failures} | ${row.flaky} | ${row.blocked} | ${row.nights} | ${debt(row, 'xpath')} | ${debt(row, 'sleeps')} | ${debt(row, 'isVisible')} |`);
  }
  if (!shown.length) lines.push('| - | No failures in pageobjects/ in this window | 0 | 0 | 0 | 0 | - | - | - |');

  const files = new Map();
  for (const row of rows) {
    const entry = files.get(row.file) || { failures: 0, flaky: 0, blocked: 0, methods: 0 };
    entry.failures += row.failures;
    entry.flaky += row.flaky;
    entry.blocked += row.blocked;
    entry.methods++;
    files.set(row.file, entry);
  }
  lines.push('', '## By page object', '', '| Page object | Methods ranked | Failures | Flaky | Blocked |', '|---|---|---|---|---|');
  for (const [file, entry] of [...files.entries()].sort((a, b) => b[1].failures - a[1].failures || a[0].localeCompare(b[0]))) {
    lines.push(`| \`${file.slice(POM_PREFIX.length)}\` | ${entry.methods} | ${entry.failures} | ${entry.flaky} | ${entry.blocked} |`);
  }

  lines.push('', '## Top 3 detail (for spot checks against the dashboard)');
  for (const row of shown.slice(0, 3)) {
    lines.push('', `### ${row.rank}. \`${row.file.slice(POM_PREFIX.length)}:${row.method}\``);
    for (const [name, count] of topEntries(row.tests, 5)) lines.push(`- ${count}× ${name}`);
    for (const [signature, count] of topEntries(row.signatures, 3)) lines.push(`- Error (${count}×): \`${signature.replace(/`/g, "'")}\``);
  }
  if (command) lines.push('', '## Regenerate', '', '```bash', command, '```');
  return `${lines.join('\n')}\n`;
}

function sourceScanner(root) {
  const cache = new Map();
  return (file) => {
    if (!cache.has(file)) {
      const fullPath = path.join(root, file);
      cache.set(file, fs.existsSync(fullPath) ? scanSource(fs.readFileSync(fullPath, 'utf-8')) : null);
    }
    return cache.get(file);
  };
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, ''));
  } catch (err) {
    console.warn(`[triage:rank-pom] Skipping unreadable ${filePath}: ${err.message}`);
    return null;
  }
}

function loadLocalNights(runsDir, days, until) {
  if (!fs.existsSync(runsDir)) throw new Error(`--runs-dir ${runsDir} does not exist`);
  return selectNights(fs.readdirSync(runsDir), days, until).map((date) => ({
    date,
    runs: fs.readdirSync(path.join(runsDir, date)).filter((file) => file.endsWith('.json')).map((file) => readJson(path.join(runsDir, date, file))).filter(Boolean)
  }));
}

function githubToken() {
  if (process.env.GITHUB_TOKEN || process.env.GH_TOKEN) return process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    throw new Error('No GitHub token: set GITHUB_TOKEN or log in with `gh auth login`, or pass --runs-dir');
  }
}

async function loadRemoteNights({ repo, ref, days, until }) {
  const token = githubToken();
  const api = async (apiPath, raw = false) => {
    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${apiPath}?ref=${encodeURIComponent(ref)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`GET ${apiPath}@${ref}: HTTP ${response.status}`);
    return raw ? response.text() : response.json();
  };
  const dates = selectNights((await api(RUNS_PATH)).filter((item) => item.type === 'dir').map((item) => item.name), days, until);
  const nights = [];
  for (const date of dates) {
    const files = (await api(`${RUNS_PATH}/${date}`)).filter((item) => item.type === 'file' && item.name.endsWith('.json'));
    const runs = await Promise.all(files.map(async (file) => {
      try {
        return JSON.parse(await api(`${RUNS_PATH}/${date}/${file.name}`, true));
      } catch (err) {
        console.warn(`[triage:rank-pom] Skipping ${date}/${file.name}: ${err.message}`);
        return null;
      }
    }));
    nights.push({ date, runs: runs.filter(Boolean) });
  }
  return nights;
}

function shellQuote(value) {
  const text = String(value);
  return /^[\w@%+=:,./-]+$/.test(text) ? text : `'${text.replace(/'/g, "'\\''")}'`;
}

// Command that reproduces the same report: same source, top, and window pinned with --until to the newest night read.
function regenerateCommand({ days, top, dates, runsDir, repo, ref }) {
  const parts = ['npm run triage:rank-pom --', '--days', days];
  if (dates.length) parts.push('--until', dates[dates.length - 1]);
  if (top !== 30) parts.push('--top', top);
  if (runsDir) parts.push('--runs-dir', shellQuote(runsDir));
  else {
    if (repo && repo !== DEFAULT_REPO) parts.push('--repo', shellQuote(repo));
    if (ref && ref !== 'gh-pages') parts.push('--ref', shellQuote(ref));
  }
  parts.push('--out', '<file.md>');
  return `cd playwright-e2e\n${parts.join(' ')}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const days = Number(args.days || 30);
  const top = Number(args.top || 30);
  if (!Number.isInteger(days) || days < 1) throw new Error(`Invalid --days "${args.days}"`);
  if (!Number.isInteger(top) || top < 1) throw new Error(`Invalid --top "${args.top}"`);
  if (args.until && !isValidDate(args.until)) throw new Error(`Invalid --until "${args.until}" (expected a real date as YYYY-MM-DD)`);
  const repo = args.repo || DEFAULT_REPO;
  const ref = args.ref || 'gh-pages';
  const nights = args['runs-dir']
    ? loadLocalNights(path.resolve(args['runs-dir']), days, args.until)
    : await loadRemoteNights({ repo, ref, days, until: args.until });
  const result = rankPomMethods({ nights, getScan: sourceScanner(ROOT) });
  const markdown = renderMarkdown(result, {
    top,
    source: args['runs-dir'] ? `\`${args['runs-dir']}\`` : `\`${RUNS_PATH}\` on \`${ref}\``,
    command: regenerateCommand({ days, top, dates: result.dates, runsDir: args['runs-dir'], repo, ref })
  });
  if (args.out) {
    fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
    fs.writeFileSync(args.out, markdown, 'utf-8');
    console.log(`[triage:rank-pom] ${result.dates.length} night(s), ${result.totals.runs} run(s), ${result.rows.length} POM method(s) ranked -> ${args.out}`);
  } else {
    process.stdout.write(markdown);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}

module.exports = { scanSource, enclosingMethod, resolveLocation, selectNights, rankPomMethods, renderMarkdown, regenerateCommand };
