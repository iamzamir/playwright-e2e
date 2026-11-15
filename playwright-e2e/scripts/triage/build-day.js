/**
 * Builds the dashboard day file from the night's run data (plan §7.1):
 *   <data-dir>/days/<date>.json  - per-suite status, root-cause clusters, widespread errors, flaky tests
 *   <data-dir>/index.json        - one summary row per day (feeds the run matrix), newest first
 * Run data files (<data-dir>/runs/<date>/*.json) are written by build-run-data.js in each suite workflow.
 * Data older than --retention-days is pruned.
 *
 * Usage: node scripts/triage/build-day.js --data-dir <gh-pages>/dashboard/data [--date YYYY-MM-DD | --night-of <ISO time>]
 *          [--retention-days 90] [--now <ISO time>] [--rebuild-for-run <workflow file>:<run number>[:<attempt>]]
 * Without --date the night is the latest one whose first suite (19:30 UTC) has started, so a triage run delayed
 * past midnight, or run by hand the next morning, still builds that night. --night-of picks the night of another time.
 * --rebuild-for-run (late suite or re-run): rebuild only if the night was already built without that run attempt.
 * With GITHUB_TOKEN and GITHUB_REPOSITORY set, suites without data are checked against the Actions API
 * to tell "still running" and "ran but did not report" from "did not run".
 */
const fs = require('fs');
const path = require('path');
const { clusterFailures, findBackgroundErrors, mergeBaselines } = require('./lib/cluster');
const { loadRegistry, loadServiceMap, matchesTest } = require('./lib/registry');
const { knownIssuesReport, flakyReport, FLAKY } = require('./lib/registry-report');
const { applyDecisions, decisionPrecision } = require('./lib/decisions');
const { withDrafts } = require('./lib/defect-draft');
const { withSuspectChanges } = require('./lib/suspect-changes');
const { buildTestHistory } = require('./lib/test-history');
const { parseArgs } = require('./verdict');

const TRIAGE_DIR = path.resolve(__dirname, '../../triage');
const SCHEMA_VERSION = 1;
const NIGHT_START_MS = (19 * 60 + 30) * 60000;
const BASELINE_NIGHTS = 14;
// Plan §7.3 history modifiers: NEW = first failure in 30 nights, PERSISTENT = failed on at least 5 of the last 7.
const HISTORY = { nights: 30, persistentNights: 7, persistentMin: 5 };
// Long-running: first seen at least 14 nights ago and failed on all but at most 2 of the last 14 nights with data for
// that group (a night none of its suites reported is left out, not counted as a pass). These groups leave the action queue for their own section.
const LONG_RUNNING = { nights: 14, maxMisses: 2, minNightsWithData: 7 };

function defaultNight(now) {
  return new Date(now - NIGHT_START_MS).toISOString().slice(0, 10);
}

// A finished suite run needs a rebuild only when its night was already built and does not report that run attempt yet
// ("Re-run jobs" keeps the run number and overwrites the run data file).
function needsRebuild(existingDay, suiteKeys, runNumber, runAttempt = 1) {
  if (!existingDay || !Array.isArray(existingDay.suites)) return false;
  return !existingDay.suites.some((suite) => suiteKeys.includes(suite.key) && suite.status === 'reported'
    && suite.runNumber === runNumber && (suite.runAttempt || 1) >= runAttempt);
}

function readJson(filePath, fallback) {
  try {
    return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : fallback;
  } catch (err) {
    console.warn(`[triage:day] Could not read ${filePath}: ${err.message}`);
    return fallback;
  }
}

function loadRuns(runsDir) {
  if (!fs.existsSync(runsDir)) return [];
  return fs.readdirSync(runsDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => readJson(path.join(runsDir, file), null))
    .filter(Boolean);
}

// One run per suite: the latest scheduled run, otherwise the latest manual run (flagged as manual).
function selectRuns(runs) {
  const bySuite = new Map();
  for (const run of runs) {
    const current = bySuite.get(run.suite);
    const score = (candidate) => [candidate.trigger === 'schedule' ? 1 : 0, candidate.runNumber || 0];
    if (!current) {
      bySuite.set(run.suite, run);
      continue;
    }
    const [a1, a2] = score(run);
    const [b1, b2] = score(current);
    if (a1 > b1 || (a1 === b1 && a2 > b2)) bySuite.set(run.suite, run);
  }
  return bySuite;
}

// Real calendar date only: Date.parse would roll 2026-02-31 over to March, so round-trip it.
function isValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return false;
  const parsed = Date.parse(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed) && new Date(parsed).toISOString().slice(0, 10) === date;
}

function passRate(totals) {
  return totals && totals.total ? Math.round((totals.passed / totals.total) * 1000) / 10 : null;
}

function scheduledAt(date, cron) {
  const [minute, hour] = String(cron || '').split(/\s+/);
  if (minute === undefined || hour === undefined) return null;
  return Date.parse(`${date}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00Z`);
}

// Several suites share a workflow with schedules 30 minutes apart, so take the run that started
// closest after this suite's cron time rather than the first one inside the window.
function pickScheduledRun(runs, due) {
  return runs
    .map((run) => ({ run, lag: Date.parse(run.created_at) - due }))
    .filter(({ lag }) => lag >= -5 * 60000 && lag <= 90 * 60000)
    .sort((a, b) => a.lag - b.lag)
    .map(({ run }) => run)[0];
}

// Finds the scheduled Actions run for a suite on that date (cron runs can start up to ~1h late).
async function findScheduledRun(suite, date) {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const due = scheduledAt(date, suite.schedule);
  if (!token || !repository || !suite.workflow || !due) return null;
  // suites.json is repo-controlled, but only well-formed names ever reach the API URL.
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !/^[\w.-]+\.ya?ml$/.test(suite.workflow) || !isValidDate(date)) return null;
  const url = `https://api.github.com/repos/${repository}/actions/workflows/${encodeURIComponent(suite.workflow)}/runs?event=schedule&created=${date}&per_page=50`;
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } });
    if (!response.ok) return null;
    const body = await response.json();
    const match = pickScheduledRun(body.workflow_runs || [], due);
    return match ? { id: match.id, status: match.status, conclusion: match.conclusion, url: match.html_url } : { id: null };
  } catch (err) {
    console.warn(`[triage:day] Actions API lookup failed for ${suite.key}: ${err.message}`);
    return null;
  }
}

// E7 builds a run tested, compact for the day file: only apps whose build was read.
function runBuilds(run) {
  return (((run && run.versions) || {}).apps || [])
    .filter((app) => app && app.ok && app.sha)
    .map((app) => ({ key: app.key, name: app.name || app.key, repo: app.repo || null, repository: app.repository || null, sha: app.sha, buildTime: app.buildTime || null, runNumber: app.runNumber ?? null }));
}

// Apps whose build differs from the previous night's run of the same suite (index rows keep `builds: { key: sha }`).
function buildChanges(builds, before) {
  const previousBuilds = (before && before.builds) || null;
  if (!previousBuilds) return [];
  return builds
    .filter((build) => previousBuilds[build.key] && previousBuilds[build.key] !== build.sha)
    .map((build) => ({ key: build.key, name: build.name, from: previousBuilds[build.key], to: build.sha }));
}

// This repo's commit differs from the previous night's run of the same suite (index rows keep `sha`; older rows fall
// back to the previous day file).
function automationChange(sha, before, previousDaySuite) {
  const from = (before && before.sha) || (previousDaySuite && previousDaySuite.sha) || null;
  return sha && from && from !== sha ? { from, to: sha } : null;
}

// Files changed between two commits of this repo (GitHub compare API), or null when that can't be read.
async function compareFiles(from, to) {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const sha = /^[0-9a-f]{7,40}$/i;
  if (!token || !repository || !/^[\w.-]+\/[\w.-]+$/.test(repository) || !sha.test(from) || !sha.test(to)) return null;
  try {
    const response = await fetch(`https://api.github.com/repos/${repository}/compare/${from}...${to}?per_page=300`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } });
    if (!response.ok) return null;
    const body = await response.json();
    const files = (body.files || []).map((file) => file.filename);
    // The API lists at most 300 files; a longer range can't rule a file out.
    return files.length >= 300 ? null : files;
  } catch (err) {
    console.warn(`[triage:day] Compare API lookup failed for ${from}...${to}: ${err.message}`);
    return null;
  }
}

// E8 probe result, compact for the day file.
function runEnvHealth(run) {
  const health = run && run.envHealth;
  if (!health) return null;
  return { healthy: health.healthy ?? null, failed: Array.isArray(health.failed) ? health.failed : [], error: health.error || null };
}

async function suiteStatus(suite, run, previous, date, now, previousDay = null) {
  const base = { key: suite.key, label: suite.label, area: suite.area, environment: suite.environment, gateway: suite.gateway };
  if (run) {
    const rate = passRate(run.totals);
    const before = previous && previous.suites && previous.suites[suite.key];
    const builds = runBuilds(run);
    return {
      ...base,
      status: 'reported',
      manual: run.trigger !== 'schedule',
      runNumber: run.runNumber,
      runAttempt: run.runAttempt || 1,
      verdict: run.verdict ? run.verdict.verdict : null,
      red: run.verdict ? run.verdict.red : null,
      headline: run.verdict ? run.verdict.headline : null,
      totals: run.totals,
      passRate: rate,
      deltaPassRate: before && before.passRate !== null && before.passRate !== undefined && rate !== null ? Math.round((rate - before.passRate) * 10) / 10 : null,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      sha: run.sha || null,
      links: run.links,
      envHealth: runEnvHealth(run),
      builds,
      buildChanges: buildChanges(builds, before),
      automationChange: automationChange(run.sha, before, ((previousDay && previousDay.suites) || []).find((item) => item.key === suite.key))
    };
  }
  const due = scheduledAt(date, suite.schedule);
  if (due && now < due) return { ...base, status: 'pending' };
  const actionsRun = await findScheduledRun(suite, date);
  if (actionsRun && actionsRun.id) {
    const running = ['queued', 'in_progress', 'waiting', 'requested', 'pending'].includes(actionsRun.status);
    return { ...base, status: running ? 'running' : 'no-data', conclusion: actionsRun.conclusion, links: { workflow: actionsRun.url } };
  }
  return { ...base, status: 'missing' };
}

function categoryCounts(clusters) {
  const counts = {};
  for (const cluster of clusters) counts[cluster.category] = (counts[cluster.category] || 0) + cluster.counts.failed;
  return counts;
}

// A covered test failing tonight in any run (whatever the message) means the issue is not fixed.
function collectKnownIssueRecoveries(runs, clusters, registry = null) {
  const stillFailing = new Set(clusters
    .filter((cluster) => cluster.category === 'KNOWN_ISSUE' && cluster.knownIssue)
    .map((cluster) => cluster.knownIssue.id));
  for (const issue of registry ? registry.knownIssues : []) {
    const failing = runs.some((run) => (run.tests || []).some((test) => test.status === 'failed'
      && matchesTest(issue.match, test, { environment: run.environment, gateway: run.gateway }, { ignoreMessage: true })));
    if (failing) stillFailing.add(issue.id);
  }
  const recoveries = new Map();
  for (const run of runs) {
    for (const recovery of run.knownIssueRecoveries || []) {
      if (stillFailing.has(recovery.id)) continue;
      const key = `${recovery.id}|${run.suite}|${recovery.testId}`;
      recoveries.set(key, { ...recovery, suite: run.suite, environment: run.environment, gateway: run.gateway });
    }
  }
  return [...recoveries.values()];
}

function addNights(date, nights) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + nights * 86400000).toISOString().slice(0, 10);
}

// Group ids of earlier nights from the index; rows written before clusterIds existed fall back to their day file (30-night window only).
// Nights in the long-running window also carry each group's suites from their day file (see withHistory).
function previousClusterIds(dataDir, index, date) {
  const from = addNights(date, -(HISTORY.nights - 1));
  const from14 = addNights(date, -(LONG_RUNNING.nights - 1));
  return (index.days || [])
    .filter((row) => row.date < date && (Array.isArray(row.clusterIds) || row.date >= from))
    .map((row) => {
      const needDay = !Array.isArray(row.clusterIds) || row.date >= from14;
      const dayClusters = needDay ? ((readJson(path.join(dataDir, 'days', `${row.date}.json`), {}) || {}).clusters || []) : [];
      return {
        date: row.date,
        // Suites with results that night; null when the row predates per-suite status (then every suite counts as reported).
        reported: row.suites && typeof row.suites === 'object'
          ? new Set(Object.entries(row.suites).filter(([, suite]) => suite && suite.status === 'reported').map(([key]) => key))
          : null,
        ids: new Set(Array.isArray(row.clusterIds) ? row.clusterIds : dayClusters.map((cluster) => cluster.id)),
        suites: new Map(dayClusters.map((cluster) => [cluster.id, cluster.suites || []]))
      };
    });
}

function withHistory(clusters, nights, date) {
  const from30 = addNights(date, -(HISTORY.nights - 1));
  const from7 = addNights(date, -(HISTORY.persistentNights - 1));
  const from14 = addNights(date, -(LONG_RUNNING.nights - 1));
  const nights30d = nights.filter((night) => night.date >= from30).length + 1;
  const recent = nights.filter((night) => night.date >= from14);
  // A night is data for a group only when it failed then, or when a suite it failed in during the window (tonight or
  // an earlier night's day file) reported; otherwise its absence isn't a pass. Group ids aren't suite-specific.
  const hadData = (night, cluster, suites) => night.ids.has(cluster.id) || !night.reported || !suites.size
    || [...suites].some((suite) => night.reported.has(suite));
  return clusters.map((cluster) => {
    const suites = new Set([...(cluster.suites || []), ...recent.flatMap((night) => (night.suites && night.suites.get(cluster.id)) || [])]);
    const nights14d = recent.filter((night) => hadData(night, cluster, suites)).length + 1;
    const seen = nights.filter((night) => night.ids.has(cluster.id)).map((night) => night.date).sort();
    const occurrences30d = seen.filter((night) => night >= from30).length + 1;
    const last7 = seen.filter((night) => night >= from7).length + 1;
    const occurrences14d = seen.filter((night) => night >= from14).length + 1;
    const firstSeen = seen[0] || date;
    const trend = occurrences30d === 1 ? 'new' : last7 >= HISTORY.persistentMin ? 'persistent' : 'recurring';
    const longRunning = firstSeen < from14 && nights14d >= LONG_RUNNING.minNightsWithData
      && occurrences14d >= nights14d - LONG_RUNNING.maxMisses;
    return { ...cluster, firstSeen, occurrences30d, nights30d, occurrences14d, nights14d, longRunning, trend };
  });
}

// Groups that failed on the calendar night before and are gone tonight, although every suite they failed in reported a usable run.
function recoveringClusters(dataDir, date, clusters, suites) {
  const previousDate = addNights(date, -1);
  const previousDay = readJson(path.join(dataDir, 'days', `${previousDate}.json`), null);
  if (!previousDay) return [];
  const tonight = new Set(clusters.map((cluster) => cluster.id));
  const reported = new Set(suites.filter((suite) => suite.status === 'reported' && suite.verdict !== 'BROKEN').map((suite) => suite.key));
  return (previousDay.clusters || [])
    .filter((cluster) => !tonight.has(cluster.id) && !['KNOWN_ISSUE', 'FLAKY'].includes(cluster.category)
      && (cluster.suites || []).length && cluster.suites.every((suite) => reported.has(suite)))
    .map((cluster) => ({ id: cluster.id, title: cluster.title, category: cluster.category, lastSeen: previousDate, failed: cluster.counts ? cluster.counts.failed : 0, suites: cluster.suites }));
}

function prune(dataDir, keepFrom) {
  const removed = [];
  const runsRoot = path.join(dataDir, 'runs');
  if (fs.existsSync(runsRoot)) {
    for (const day of fs.readdirSync(runsRoot)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(day) && day < keepFrom) {
        fs.rmSync(path.join(runsRoot, day), { recursive: true, force: true });
        removed.push(`runs/${day}`);
      }
    }
  }
  const daysRoot = path.join(dataDir, 'days');
  if (fs.existsSync(daysRoot)) {
    for (const file of fs.readdirSync(daysRoot)) {
      if (/^\d{4}-\d{2}-\d{2}\.json$/.test(file) && file.slice(0, 10) < keepFrom) {
        fs.rmSync(path.join(daysRoot, file), { force: true });
        removed.push(`days/${file}`);
      }
    }
  }
  return removed;
}

// Network baselines of the nights before `date` inside the baseline window, read from their day files.
function previousBaselines(dataDir, date) {
  const daysRoot = path.join(dataDir, 'days');
  if (!fs.existsSync(daysRoot)) return [];
  const from = new Date(Date.parse(`${date}T00:00:00Z`) - (BASELINE_NIGHTS - 1) * 86400000).toISOString().slice(0, 10);
  return fs.readdirSync(daysRoot)
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file) && file.slice(0, 10) >= from && file.slice(0, 10) < date)
    .map((file) => (readJson(path.join(daysRoot, file), {}) || {}).networkBaseline || null);
}

async function buildDay({ dataDir, date, now = Date.now(), retentionDays = 90, suitesConfig, manualNoise, registry = null, services = [], changedFiles = compareFiles }) {
  const runs = loadRuns(path.join(dataDir, 'runs', date));
  const selected = selectRuns(runs);
  const index = readJson(path.join(dataDir, 'index.json'), { days: [] });
  const previous = (index.days || []).filter((day) => day.date < date).sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null;

  const configured = suitesConfig.suites || [];
  const extraKeys = [...selected.keys()].filter((key) => !configured.some((suite) => suite.key === key));
  const suites = [];
  const previousDay = previous ? readJson(path.join(dataDir, 'days', `${previous.date}.json`), null) : null;
  for (const suite of [...configured, ...extraKeys.map((key) => ({ key, label: key, area: 'Other' }))]) {
    suites.push(await suiteStatus(suite, selected.get(suite.key), previous, date, now, previousDay));
  }

  const networkBaseline = mergeBaselines([...selected.values()].map((run) => run.networkBaseline || null));
  const background = findBackgroundErrors([networkBaseline, ...previousBaselines(dataDir, date)]);
  const { clusters: tonight, widespread, flaky } = clusterFailures([...selected.values()], { manualNoise, background, services, baseline: networkBaseline });
  // Decisions come from the GitHub triage issues (sync-issues.js), so a rebuild keeps them.
  const decisions = (readJson(path.join(dataDir, 'decisions.json'), {}) || {}).clusters || {};
  const historied = applyDecisions(withHistory(tonight, previousClusterIds(dataDir, index, date), date), decisions);
  const correlated = await withSuspectChanges(historied, suites, { repository: process.env.GITHUB_REPOSITORY || null, changedFiles });
  const clusters = withDrafts(correlated, { suites });
  const decisionStats = decisionPrecision(clusters);
  const recovering = recoveringClusters(dataDir, date, clusters, suites);
  const recovered = collectKnownIssueRecoveries([...selected.values()], clusters, registry);
  const knownTonight = {};
  for (const run of selected.values()) {
    for (const test of run.tests || []) {
      if (test.status === 'failed' && test.knownIssue) knownTonight[test.knownIssue.id] = (knownTonight[test.knownIssue.id] || 0) + 1;
    }
  }
  const totals = suites.reduce((sum, suite) => {
    for (const [key, value] of Object.entries(suite.totals || {})) sum[key] = (sum[key] || 0) + value;
    return sum;
  }, {});

  const day = {
    schema: SCHEMA_VERSION,
    date,
    generatedAt: new Date(now).toISOString(),
    totals,
    passRate: passRate(totals),
    categories: categoryCounts(clusters),
    decisionStats,
    suites,
    clusters,
    widespread,
    backgroundErrors: background.slice(0, 30),
    recovering,
    recovered,
    networkBaseline,
    flaky
  };

  fs.mkdirSync(path.join(dataDir, 'days'), { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'days', `${date}.json`), JSON.stringify(day), 'utf-8');

  const keepFrom = new Date(Date.parse(`${date}T00:00:00Z`) - retentionDays * 86400000).toISOString().slice(0, 10);
  const row = {
    date,
    totals,
    passRate: day.passRate,
    clusters: clusters.length,
    clusterIds: clusters.map((cluster) => cluster.id),
    knownIssues: knownTonight,
    red: suites.filter((suite) => suite.red).length,
    notReported: suites.filter((suite) => !['reported', 'pending'].includes(suite.status)).length,
    categories: day.categories,
    decisionStats,
    suites: Object.fromEntries(suites.map((suite) => [suite.key, {
      status: suite.status,
      verdict: suite.verdict || null,
      red: suite.red || false,
      passRate: suite.passRate ?? null,
      failed: suite.totals ? suite.totals.failed : null,
      manual: suite.manual || false,
      ...(suite.sha ? { sha: suite.sha } : {}),
      ...(suite.builds && suite.builds.length ? { builds: Object.fromEntries(suite.builds.map((build) => [build.key, build.sha])) } : {})
    }]))
  };
  const days = [row, ...(index.days || []).filter((item) => item.date !== date && item.date >= keepFrom)].sort((a, b) => (a.date < b.date ? 1 : -1));
  const suiteList = configured.map((suite) => ({ key: suite.key, label: suite.label, area: suite.area, environment: suite.environment, gateway: suite.gateway }));
  fs.writeFileSync(path.join(dataDir, 'index.json'), JSON.stringify({ schema: SCHEMA_VERSION, updatedAt: day.generatedAt, suites: suiteList, days }), 'utf-8');

  // Registry and history pages show the current state, so only the newest night writes them (rebuilding an old night must not roll them back).
  if (registry && days[0].date === date) {
    const nights = [];
    for (let i = HISTORY.nights - 1; i >= 1; i--) {
      const night = addNights(date, -i);
      const nightRuns = [...selectRuns(loadRuns(path.join(dataDir, 'runs', night))).values()];
      if (!nightRuns.length) continue;
      const nightDay = readJson(path.join(dataDir, 'days', `${night}.json`), null);
      nights.push({ date: night, runs: nightRuns, clusters: nightDay ? nightDay.clusters : [] });
    }
    nights.push({ date, runs: [...selected.values()], clusters });
    const flakyFrom = addNights(date, -(FLAKY.nights - 1));
    const report = {
      schema: SCHEMA_VERSION,
      date,
      generatedAt: day.generatedAt,
      ...knownIssuesReport({ registry, runs: [...selected.values()], history: days.slice(1), recovered, date }),
      flaky: flakyReport({ nights: nights.filter((night) => night.date >= flakyFrom), registry })
    };
    fs.writeFileSync(path.join(dataDir, 'registry.json'), JSON.stringify(report), 'utf-8');
    fs.writeFileSync(path.join(dataDir, 'tests.json'), JSON.stringify({ schema: SCHEMA_VERSION, date, generatedAt: day.generatedAt, ...buildTestHistory({ nights, services }) }), 'utf-8');
  }

  const removed = prune(dataDir, keepFrom);
  return { day, removed };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args['data-dir']) throw new Error('--data-dir is required');
  const now = args.now ? Date.parse(args.now) : Date.now();
  const nightOf = args['night-of'] ? Date.parse(args['night-of']) : now;
  if (Number.isNaN(nightOf)) throw new Error(`Invalid --night-of "${args['night-of']}" (expected an ISO time)`);
  const date = args.date || defaultNight(nightOf);
  if (!isValidDate(date)) throw new Error(`Invalid --date "${date}" (expected a real date as YYYY-MM-DD)`);
  const suitesConfig = readJson(path.join(TRIAGE_DIR, 'suites.json'), { suites: [] });

  if (args['rebuild-for-run']) {
    const match = String(args['rebuild-for-run']).match(/^([\w.-]+\.ya?ml):(\d+)(?::(\d+))?$/);
    if (!match) throw new Error(`Invalid --rebuild-for-run "${args['rebuild-for-run']}" (expected <workflow file>:<run number>[:<attempt>])`);
    const keys = (suitesConfig.suites || []).filter((suite) => suite.workflow === match[1]).map((suite) => suite.key);
    const existing = readJson(path.join(args['data-dir'], 'days', `${date}.json`), null);
    const attempt = Number(match[3] || 1);
    if (!keys.length || !needsRebuild(existing, keys, Number(match[2]), attempt)) {
      const why = !keys.length ? 'not a dashboard suite' : existing ? 'already included' : 'night not built yet; the scheduled triage will include it';
      console.log(`[triage:day] ${date}: no rebuild for ${match[1]} run #${match[2]} attempt ${attempt} (${why}).`);
      if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `date=${date}\nbuilt=false\n`, 'utf-8');
      return;
    }
  }

  const { day, removed } = await buildDay({
    dataDir: args['data-dir'],
    date,
    now,
    retentionDays: Number(args['retention-days'] || 90),
    suitesConfig,
    manualNoise: readJson(path.join(TRIAGE_DIR, 'ambient-noise.json'), { noise: [] }).noise || [],
    registry: loadRegistry({ knownIssuesPath: path.join(TRIAGE_DIR, 'known-issues.json'), quarantinePath: path.join(TRIAGE_DIR, 'quarantine.json'), today: date }),
    services: loadServiceMap(path.join(TRIAGE_DIR, 'service-map.json'))
  });

  const reported = day.suites.filter((suite) => suite.status === 'reported').length;
  const failed = day.totals.failed || 0;
  const summary = `${date}: ${reported}/${day.suites.length} suites reported · ${failed} failures in ${day.clusters.length} clusters · ${day.widespread.length} widespread error(s) · ${day.backgroundErrors.length} background error(s) (${day.networkBaseline.passedTests} passing UI tests tonight)`;
  console.log(`[triage:day] ${summary}${removed.length ? ` · pruned ${removed.length} old item(s)` : ''}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `date=${date}\nbuilt=true\nsummary=${summary}\n`, 'utf-8');
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { buildDay, runBuilds, buildChanges, automationChange, selectRuns, scheduledAt, passRate, pickScheduledRun, isValidDate, defaultNight, needsRebuild, collectKnownIssueRecoveries, withHistory, categoryCounts };
