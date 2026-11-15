/**
 * Nightly run verdict (docs/strategy/Test-Report-Dashboard-and-Triage-Plan.md §4.1).
 *
 * Red means "someone must act today"; failures that are already accounted for keep the run green:
 *   BROKEN               - no results, far fewer tests than usual, the test job failed/was cancelled, or (with
 *                          --env-health-mode enforce) the environment health probe failed before the tests (E8)
 *   UNEXPLAINED_FAILURES - a failing test that is neither a known issue nor quarantined
 *   DEGRADED             - pass rate dropped more than the threshold vs the recent median
 *   KNOWN_FAILURES_ONLY  - every failure is a registered known issue or quarantined (green)
 *   ALL_PASSED           - nothing failed (green)
 *
 * Never fails the step itself: it writes the job summary, step outputs (verdict, red, headline) and a JSON file.
 * The workflow decides whether a red verdict fails the run (PW_VERDICT_MODE=enforce) or is only reported.
 *
 * Usage: node scripts/triage/verdict.js --results <allure-results> [--suite <name>] [--history <dir>]
 *          [--env QA|INTEROP] [--gateway AZURE|GRAVITEE] [--mode report|enforce] [--check-count true|false]
 *          [--upstream-result success|failure|cancelled] [--test-outcome success|failure|cancelled]
 *          [--batches-failed <batches>] [--env-health <env-health.json>] [--env-health-mode report|enforce]
 *          [--out <verdict.json>]
 */
const fs = require('fs');
const path = require('path');
const { isFailure, readResults, summarizeTests, countTests } = require('./lib/allure-results');
const { loadRegistry, findKnownIssue, findQuarantine, findRecoveredKnownIssues } = require('./lib/registry');

const ENV_HEALTH_REASON = 'environment unhealthy before tests';

const TRIAGE_DIR = path.resolve(__dirname, '../../triage');
const DEFAULTS = {
  degradedThresholdPoints: 10,
  minCountRatio: 0.8,
  recentRuns: 7,
  regressionWindow: 3,
  persistentMinFailures: 5,
  maxRowsInSummary: 50
};

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    args[key] = next === undefined || next.startsWith('--') ? 'true' : next;
    if (args[key] === next) i++;
  }
  return args;
}

function readJson(filePath, fallback) {
  try {
    return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : fallback;
  } catch (err) {
    console.warn(`[triage:verdict] Could not read ${filePath}: ${err.message}`);
    return fallback;
  }
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function batchMatchesTest(batchName, test) {
  const b = String(batchName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const spec = String((test && test.spec) || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!b) return false;
  if (spec.includes(b)) return true;
  if (b.includes('smoke')) {
    return spec.includes('processorchestrationbackend');
  }
  return false;
}

// Allure history items are newest first and hold previous runs only (this run is not in them yet).
function failureKind(historyItems) {
  if (!historyItems || historyItems.length === 0) return 'new-test';
  const recent = historyItems.slice(0, DEFAULTS.regressionWindow);
  if (recent.some((item) => item.status === 'passed')) return 'regression';
  // Persistent = failed in at least 5 of the last 7 previous runs (plan §7.3); fewer is recurring.
  const failedLastWeek = historyItems.slice(0, DEFAULTS.recentRuns).filter((item) => isFailure(item.status)).length;
  return failedLastWeek >= DEFAULTS.persistentMinFailures ? 'persistent' : 'recurring';
}

/** One line naming the failed probes, e.g. "po-gateway 503, lm-gateway timeout" (same text as env-health.js). */
function envHealthDetail(health) {
  return ((health && health.checks) || [])
    .filter((check) => !check.ok)
    .map((check) => `${check.name} ${check.status && !String(check.error || '').startsWith('skipped') ? check.status : check.error}`)
    .join(', ');
}

/**
 * The E8 probe result as the verdict reports it. `enforce` makes an unhealthy probe a BROKEN reason; `report`
 * (the default while the probe proves itself) only shows it. A probe that couldn't run (healthy: null) never counts.
 */
function summarizeEnvHealth(health, mode) {
  if (!health || typeof health !== 'object') return null;
  const healthy = health.healthy === true ? true : health.healthy === false ? false : null;
  return {
    healthy,
    mode: mode === 'enforce' ? 'enforce' : 'report',
    checkedAt: health.checkedAt || null,
    failed: Array.isArray(health.failed) ? health.failed : [],
    detail: healthy === false ? envHealthDetail(health) : healthy === null ? `probe could not run: ${health.error || 'unknown'}` : '',
    breaksRun: healthy === false && mode === 'enforce'
  };
}

function computeVerdict({ tests, history, trend, registry, context, options }) {
  const counts = countTests(tests);
  const unexplained = [];
  const knownById = new Map();
  const quarantined = [];

  for (const test of tests.filter((item) => isFailure(item.status))) {
    const knownIssue = findKnownIssue(registry, test, context);
    if (knownIssue) {
      if (!knownById.has(knownIssue.id)) knownById.set(knownIssue.id, { ...knownIssue, tests: [] });
      knownById.get(knownIssue.id).tests.push(test.name);
      continue;
    }
    const quarantine = findQuarantine(registry, test, context);
    if (quarantine) {
      quarantined.push({ id: quarantine.id, owner: quarantine.owner, spec: test.spec, test: test.name });
      continue;
    }
    const items = (history[test.historyId] || {}).items || [];
    unexplained.push({
      spec: test.spec,
      test: test.name,
      kind: failureKind(items),
      failedOfLast7: items.slice(0, DEFAULTS.recentRuns).filter((item) => isFailure(item.status)).length,
      historyRuns: Math.min(items.length, DEFAULTS.recentRuns),
      message: test.message,
      signature: test.signature
    });
  }

  const mayBeFixed = findRecoveredKnownIssues(registry, tests, history, context)
    .map(({ issue, requiredPasses }) => ({ id: issue.id, jira: issue.jira || null, title: issue.title, requiredPasses }));

  const recentTrend = trend.slice(0, DEFAULTS.recentRuns).map((entry) => entry.data || {}).filter((data) => data.total > 0);
  const usualTotal = median(recentTrend.map((data) => data.total));
  const usualPassRate = median(recentTrend.map((data) => data.passed / data.total));
  const passRate = counts.total ? counts.passed / counts.total : 0;
  const comparable = options.checkCount && recentTrend.length >= DEFAULTS.regressionWindow;

  const brokenReasons = [];
  if (['failure', 'cancelled'].includes(options.upstreamResult)) brokenReasons.push(`test job ${options.upstreamResult}`);
  if (options.testOutcome === 'cancelled') brokenReasons.push('test step cancelled');
  if (options.testOutcome === 'failure' && counts.failed === 0) {
    brokenReasons.push('test step exited non-zero without recorded test failures');
  }

  if (options.batchesFailed) {
    const failedBatches = String(options.batchesFailed)
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const batch of failedBatches) {
      const batchFailures = tests.filter((item) => isFailure(item.status) && batchMatchesTest(batch, item));
      if (batchFailures.length === 0) {
        brokenReasons.push(`batch ${batch} exited non-zero without recorded test failures`);
      }
    }
  }

  const envHealth = summarizeEnvHealth(options.envHealth, options.envHealthMode);
  if (envHealth && envHealth.breaksRun) brokenReasons.push(`${ENV_HEALTH_REASON} (${envHealth.detail})`);

  if (counts.total === 0) brokenReasons.push('no test results');
  else if (comparable && counts.total < usualTotal * DEFAULTS.minCountRatio) brokenReasons.push(`only ${counts.total} tests ran (usually ${usualTotal})`);

  const dropPoints = comparable && usualPassRate !== null ? Math.round((usualPassRate - passRate) * 1000) / 10 : 0;
  const degraded = comparable && dropPoints > options.degradedThresholdPoints;

  let verdict = 'ALL_PASSED';
  if (brokenReasons.length) verdict = 'BROKEN';
  else if (unexplained.length) verdict = 'UNEXPLAINED_FAILURES';
  else if (degraded) verdict = 'DEGRADED';
  else if (counts.failed > 0) verdict = 'KNOWN_FAILURES_ONLY';

  const red = ['BROKEN', 'UNEXPLAINED_FAILURES', 'DEGRADED'].includes(verdict);
  const kinds = unexplained.reduce((acc, item) => ({ ...acc, [item.kind]: (acc[item.kind] || 0) + 1 }), {});
  const detail = {
    BROKEN: `run broken: ${brokenReasons.join('; ')}`,
    UNEXPLAINED_FAILURES: `${unexplained.length} unexplained failure(s) (${Object.entries(kinds).map(([kind, n]) => `${n} ${kind}`).join(', ')})`,
    DEGRADED: `pass rate ${(passRate * 100).toFixed(1)}% is ${dropPoints} points below the recent median`,
    KNOWN_FAILURES_ONLY: `${counts.failed} failure(s), all known or quarantined`,
    ALL_PASSED: 'all tests passed'
  }[verdict];
  const headline = `${red ? '🔴' : '🟢'} ${verdict.replace(/_/g, ' ')}: ${detail} · ${counts.passed} passed · ${counts.failed} failed · ${counts.blocked} blocked · ${counts.flaky} flaky`;

  return {
    suite: options.suite,
    mode: options.mode,
    context,
    verdict,
    red,
    headline,
    counts,
    passRate: Math.round(passRate * 1000) / 10,
    baseline: { runs: recentTrend.length, usualTotal, usualPassRate: usualPassRate === null ? null : Math.round(usualPassRate * 1000) / 10, comparable },
    brokenReasons,
    envHealth,
    unexplained,
    known: [...knownById.values()].map((issue) => ({ id: issue.id, jira: issue.jira || null, title: issue.title, category: issue.category, tests: issue.tests })),
    quarantined,
    mayBeFixed,
    expired: registry.expired
  };
}

function escapeCell(text) {
  return String(text || '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').slice(0, 200);
}

function renderSummary(result) {
  const lines = [];
  lines.push(`## Run verdict: ${result.suite || 'nightly run'}`, '', `**${result.headline}**`, '');
  if (result.mode !== 'enforce') lines.push('> Report-only mode: this verdict does not change the run status yet (`PW_VERDICT_MODE=report`).', '');
  lines.push('| Passed | Failed | Blocked | Skipped | Flaky | Pass rate | Usual pass rate |', '|---|---|---|---|---|---|---|');
  lines.push(`| ${result.counts.passed} | ${result.counts.failed} | ${result.counts.blocked} | ${result.counts.skipped} | ${result.counts.flaky} | ${result.passRate}% | ${result.baseline.usualPassRate === null ? 'n/a' : `${result.baseline.usualPassRate}%`} |`, '');

  if (result.envHealth && result.envHealth.healthy !== true) {
    const state = result.envHealth.healthy === false ? `unhealthy: ${result.envHealth.detail}` : result.envHealth.detail;
    let effect;
    if (result.envHealth.breaksRun) effect = 'the run is BROKEN';
    else if (result.envHealth.mode === 'enforce') effect = 'not counted: a probe that could not run never breaks the run';
    else effect = 'report-only: the verdict ignores it while `TRIAGE_ENV_HEALTH_VERDICT=report`';
    lines.push(`> Environment health before tests: ${state} (${effect}).`, '');
  }

  if (result.unexplained.length) {
    lines.push(`### Unexplained failures (${result.unexplained.length})`, '', 'Register each one in `triage/known-issues.json` (with the Jira key) or `triage/quarantine.json`, or fix it.', '');
    lines.push('| Spec | Test | Kind | Failed in last runs | Error |', '|---|---|---|---|---|');
    for (const item of result.unexplained.slice(0, DEFAULTS.maxRowsInSummary)) {
      lines.push(`| ${escapeCell(item.spec)} | ${escapeCell(item.test)} | ${item.kind} | ${item.failedOfLast7}/${item.historyRuns} | ${escapeCell(item.message)} |`);
    }
    if (result.unexplained.length > DEFAULTS.maxRowsInSummary) lines.push('', `…and ${result.unexplained.length - DEFAULTS.maxRowsInSummary} more in triage-verdict.json.`);
    lines.push('');
  }
  if (result.known.length) {
    lines.push(`### Known issues seen (${result.known.length})`, '', '| Id | Jira | Title | Tests |', '|---|---|---|---|');
    for (const issue of result.known) lines.push(`| ${issue.id} | ${issue.jira || '—'} | ${escapeCell(issue.title)} | ${issue.tests.length} |`);
    lines.push('');
  }
  if (result.quarantined.length) {
    lines.push(`### Quarantined failures (${result.quarantined.length})`, '', '| Id | Owner | Spec | Test |', '|---|---|---|---|');
    for (const item of result.quarantined) lines.push(`| ${item.id} | ${item.owner || '—'} | ${escapeCell(item.spec)} | ${escapeCell(item.test)} |`);
    lines.push('');
  }
  if (result.mayBeFixed.length) {
    lines.push('### Known issues that may be fixed', '', ...result.mayBeFixed.map((issue) => `- ${issue.id} ${issue.jira || ''}: ${issue.title} (passed ${issue.requiredPasses} runs in a row)`), '');
  }
  if (result.expired.length) {
    lines.push('### Expired registry entries (re-check and renew or remove)', '', ...result.expired.map((entry) => `- ${entry.type} ${entry.id}: ${entry.title} (expired ${entry.expires})`), '');
  }
  return lines.join('\n');
}

function writeOutputs(result, outPath) {
  if (outPath) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');
  }
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${renderSummary(result)}\n`, 'utf-8');
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `verdict=${result.verdict}\nred=${result.red}\nheadline=${result.headline.replace(/\r?\n/g, ' ')}\n`, 'utf-8');
  }
  if (process.env.GITHUB_ACTIONS) {
    const level = result.red ? 'warning' : 'notice';
    console.log(`::${level} title=Run verdict::${result.headline}`);
  }
  console.log(`[triage:verdict] ${result.headline}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const resultsDir = args.results || 'reports/allure-results';
  const historyDir = args.history || path.join(resultsDir, 'history');
  const options = {
    suite: args.suite || '',
    mode: (args.mode || process.env.PW_VERDICT_MODE || 'report').toLowerCase() === 'enforce' ? 'enforce' : 'report',
    checkCount: (args['check-count'] || 'true') === 'true',
    upstreamResult: args['upstream-result'] || '',
    testOutcome: args['test-outcome'] || '',
    batchesFailed: args['batches-failed'] || '',
    envHealth: args['env-health'] ? readJson(args['env-health'], null) : null,
    envHealthMode: (args['env-health-mode'] || process.env.TRIAGE_ENV_HEALTH_VERDICT || 'report').toLowerCase() === 'enforce' ? 'enforce' : 'report',
    degradedThresholdPoints: Number(args['degraded-threshold'] || DEFAULTS.degradedThresholdPoints)
  };
  const context = {
    environment: args.env || process.env.TEST_ENV || process.env.ENVIRONMENT || '',
    gateway: args.gateway || process.env.GATEWAY_TYPE || ''
  };

  const registry = loadRegistry({
    knownIssuesPath: args['known-issues'] || path.join(TRIAGE_DIR, 'known-issues.json'),
    quarantinePath: args.quarantine || path.join(TRIAGE_DIR, 'quarantine.json')
  });
  const tests = summarizeTests(readResults(resultsDir));
  const history = readJson(path.join(historyDir, 'history.json'), {});
  const trend = readJson(path.join(historyDir, 'history-trend.json'), []);

  const result = computeVerdict({ tests, history, trend, registry, context, options });
  writeOutputs(result, args.out || path.join(resultsDir, '..', 'triage', 'verdict.json'));
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    // The verdict must never break report publishing; surface the problem and let the run continue.
    console.log(`::warning title=Run verdict::Verdict could not be computed: ${err.message}`);
    console.error(err);
  }
}

module.exports = { computeVerdict, failureKind, renderSummary, parseArgs, batchMatchesTest, summarizeEnvHealth, envHealthDetail, ENV_HEALTH_REASON };
