/**
 * Writes the dashboard data file for one workflow run (plan §5.1–5.2):
 *   <out-dir>/<night YYYY-MM-DD>/<suite>__<run_number>.json  (night = the one started at 19:30 UTC, see build-day.js)
 * Failed tests carry their evidence (error, location, failing step, step trail, HTTP errors) and links into the
 * run's Allure report; passed / skipped / blocked tests are kept compact. Classification and clustering happen
 * later, centrally, in build-day.js.
 *
 * Usage: node scripts/triage/build-run-data.js --results <allure-results> --suite <name> --out-dir <dir>
 *          [--report <generated allure report dir>] [--report-url <url>] [--verdict <verdict.json>] [--env-health <env-health.json>]
 *          [--versions <versions.json>]
 * A run with no test results is still written when it has an env-health or versions file, so the night shows why it broke.
 *          [--env QA|INTEROP] [--gateway AZURE|GRAVITEE] [--workflow <name>] [--workflow-url <url>]
 *          [--run-id <id>] [--run-number <n>] [--run-attempt <n>] [--trigger schedule|workflow_dispatch] [--branch <name>] [--sha <sha>]
 */
const fs = require('fs');
const path = require('path');
const { isFailure, readResults, summarizeTests, countTests } = require('./lib/allure-results');
const { loadRegistry, findKnownIssue, findRecoveredKnownIssues, findQuarantine } = require('./lib/registry');
const { extractEvidence, networkErrorKeys } = require('./lib/evidence');
const { deriveLabels } = require('./enrich-allure-results');
const { parseArgs, failureKind } = require('./verdict');
const { defaultNight } = require('./build-day');

const TRIAGE_DIR = path.resolve(__dirname, '../../triage');
const SCHEMA_VERSION = 1;

function readJson(filePath, fallback) {
  try {
    return filePath && fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : fallback;
  } catch {
    return fallback;
  }
}

// historyId -> { uid, screenshot } from the generated Allure report (Allure renames attachments when generating).
function readReportIndex(reportDir) {
  const index = new Map();
  const casesDir = reportDir ? path.join(reportDir, 'data', 'test-cases') : null;
  if (!casesDir || !fs.existsSync(casesDir)) return index;
  for (const file of fs.readdirSync(casesDir)) {
    try {
      const testCase = JSON.parse(fs.readFileSync(path.join(casesDir, file), 'utf-8'));
      const attachments = [];
      const walk = (node) => {
        for (const attachment of (node && node.attachments) || []) attachments.push(attachment);
        for (const step of (node && node.steps) || []) walk(step);
      };
      walk(testCase.testStage);
      (testCase.afterStages || []).forEach(walk);
      const screenshot = attachments.find((attachment) => attachment.name === 'screenshot');
      index.set(testCase.historyId, { uid: testCase.uid, screenshot: screenshot ? screenshot.source : null });
    } catch {
      // A malformed test case only loses its links.
    }
  }
  return index;
}

// HTTP errors seen on passing UI tests (plan E5), per endpoint key. Null for runs without UI tests (API suites).
function networkBaseline(tests) {
  const ui = tests.filter((test) => deriveLabels(test.spec).some((label) => label.name === 'layer' && label.value === 'ui'));
  if (!ui.length) return null;
  const passed = ui.filter((test) => test.status === 'passed');
  const errors = {};
  for (const test of passed) {
    for (const key of networkErrorKeys(test.result)) errors[key] = (errors[key] || 0) + 1;
  }
  return { passedTests: passed.length, errors };
}

// The E8 probe result (scripts/triage/env-health.js), whitelisted field by field so nothing else can leak in.
function envHealthRecord(health) {
  if (!health || typeof health !== 'object') return null;
  return {
    healthy: health.healthy === true ? true : health.healthy === false ? false : null,
    checkedAt: health.checkedAt || null,
    error: health.error || null,
    failed: Array.isArray(health.failed) ? health.failed : [],
    checks: (Array.isArray(health.checks) ? health.checks : []).map((check) => ({
      name: check.name,
      service: check.service || null,
      method: check.method || null,
      url: check.url || null,
      ok: Boolean(check.ok),
      status: check.status ?? null,
      error: check.error || null,
      attempts: check.attempts ?? null,
      durationMs: check.durationMs ?? null
    }))
  };
}

// The E7 build identity (scripts/triage/collect-versions.js), whitelisted field by field.
function versionsRecord(versions) {
  if (!versions || typeof versions !== 'object' || !Array.isArray(versions.apps)) return null;
  return {
    collectedAt: versions.collectedAt || null,
    note: versions.note || null,
    apps: versions.apps.filter((app) => app && app.key).map((app) => ({
      key: String(app.key),
      name: app.name || null,
      repo: app.repo || null,
      ok: Boolean(app.ok),
      sha: app.ok && /^[0-9a-f]{40}$/.test(String(app.sha)) ? app.sha : null,
      buildTime: app.buildTime || null,
      runNumber: app.runNumber ?? null,
      ref: app.ref || null,
      repository: app.repository || null,
      url: app.url || null,
      error: app.ok ? null : (app.error || null)
    }))
  };
}

function buildRunData({ tests, history, registry, reportIndex, verdict, envHealth, versions, meta }) {
  const starts = tests.map((test) => test.start).filter(Boolean);
  const stops = tests.map((test) => test.stop).filter(Boolean);
  // A run with no results starts when its probe ran, so it lands on the right night.
  const probedAt = Date.parse((envHealth && envHealth.checkedAt) || (versions && versions.collectedAt) || '');
  const startedAt = starts.length ? Math.min(...starts) : (Number.isNaN(probedAt) ? Date.now() : probedAt);
  const reportUrl = meta.reportUrl ? meta.reportUrl.replace(/\/$/, '') : null;
  const context = { environment: meta.environment, gateway: meta.gateway };
  const knownIssueRecoveries = findRecoveredKnownIssues(registry, tests, history, context).flatMap(({ issue, requiredPasses, tests: streaks }) =>
    streaks.map(({ test, consecutivePasses }) => {
      const report = reportIndex.get(test.historyId);
      return {
        id: issue.id,
        jira: issue.jira || null,
        title: issue.title,
        consecutivePasses,
        requiredPasses,
        testId: test.historyId,
        spec: test.spec,
        name: test.name,
        testLink: reportUrl && report ? `${reportUrl}/#testresult/${report.uid}` : null
      };
    }));

  const records = tests.map((test) => {
    const record = {
      id: test.historyId,
      spec: test.spec,
      name: test.name,
      status: isFailure(test.status) ? 'failed' : test.blockedBy ? 'blocked' : test.status,
      durationMs: test.stop && test.start ? test.stop - test.start : null
    };
    if (test.attempts > 1) record.attempts = test.attempts;
    if (test.flaky) record.flaky = true;
    if (test.blockedBy) {
      record.blockedBy = test.blockedBy;
      record.blockedById = test.blockedById;
    }
    if (!isFailure(test.status)) return record;

    const knownIssue = findKnownIssue(registry, test, context);
    const quarantine = findQuarantine(registry, test, context);
    const items = (history[test.historyId] || {}).items || [];
    const report = reportIndex.get(test.historyId);
    return {
      ...record,
      signature: test.signature,
      kind: failureKind(items),
      last7: items.slice(0, 7).map((item) => (item.status === 'passed' ? 'P' : isFailure(item.status) ? 'F' : 'S')).join(''),
      knownIssue: knownIssue ? { id: knownIssue.id, jira: knownIssue.jira || null, title: knownIssue.title, category: knownIssue.category || null } : null,
      quarantine: quarantine ? { id: quarantine.id, owner: quarantine.owner || null } : null,
      ...extractEvidence(test.result),
      links: {
        test: reportUrl && report ? `${reportUrl}/#testresult/${report.uid}` : null,
        screenshot: reportUrl && report && report.screenshot ? `${reportUrl}/data/attachments/${report.screenshot}` : null
      }
    };
  });

  return {
    schema: SCHEMA_VERSION,
    date: defaultNight(startedAt),
    suite: meta.suite,
    environment: meta.environment || null,
    gateway: meta.gateway || null,
    workflow: meta.workflow || null,
    runId: meta.runId ? Number(meta.runId) : null,
    runNumber: meta.runNumber ? Number(meta.runNumber) : null,
    runAttempt: meta.runAttempt ? Number(meta.runAttempt) : 1,
    trigger: meta.trigger || null,
    branch: meta.branch || null,
    sha: meta.sha || null,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: stops.length ? new Date(Math.max(...stops)).toISOString() : null,
    totals: countTests(tests),
    verdict: verdict ? { verdict: verdict.verdict, red: verdict.red, headline: verdict.headline, mode: verdict.mode, passRate: verdict.passRate } : null,
    links: { report: reportUrl, workflow: meta.workflowUrl || null },
    envHealth: envHealthRecord(envHealth),
    versions: versionsRecord(versions),
    networkBaseline: networkBaseline(tests),
    knownIssueRecoveries,
    tests: records
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const resultsDir = args.results || 'reports/allure-results';
  if (!args.suite || !args['out-dir']) throw new Error('--suite and --out-dir are required');

  const tests = summarizeTests(readResults(resultsDir));
  const envHealth = readJson(args['env-health'], null);
  const versions = readJson(args.versions, null);
  if (!tests.length && !envHealth && !versions) {
    console.log('[triage:run-data] No test results; nothing written.');
    return;
  }
  const data = buildRunData({
    tests,
    history: readJson(path.join(args.history || path.join(resultsDir, 'history'), 'history.json'), {}),
    registry: loadRegistry({ knownIssuesPath: path.join(TRIAGE_DIR, 'known-issues.json'), quarantinePath: path.join(TRIAGE_DIR, 'quarantine.json') }),
    reportIndex: readReportIndex(args.report),
    verdict: readJson(args.verdict, null),
    envHealth,
    versions,
    meta: {
      suite: args.suite,
      environment: args.env || process.env.TEST_ENV || '',
      gateway: args.gateway || '',
      workflow: args.workflow,
      workflowUrl: args['workflow-url'],
      runId: args['run-id'],
      runNumber: args['run-number'],
      runAttempt: args['run-attempt'],
      trigger: args.trigger,
      branch: args.branch,
      sha: args.sha,
      reportUrl: args['report-url']
    }
  });

  const outFile = path.join(args['out-dir'], data.date, `${data.suite}__${data.runNumber || Date.now()}.json`);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(data), 'utf-8');
  const failures = data.tests.filter((test) => test.status === 'failed').length;
  console.log(`[triage:run-data] ${data.tests.length} tests (${failures} failed) -> ${outFile} (${Math.round(fs.statSync(outFile).size / 1024)} KB)`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.log(`::warning title=Dashboard data::Run data could not be built: ${err.message}`);
    console.error(err);
  }
}

module.exports = { buildRunData, readReportIndex, networkBaseline, envHealthRecord, versionsRecord };
