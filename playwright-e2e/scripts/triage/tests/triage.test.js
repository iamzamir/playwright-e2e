// Unit tests for the nightly triage scripts. Run: npm run test:triage
const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeTests, countTests, errorSignature } = require('../lib/allure-results');
const { globToRegExp, matchesTest, loadRegistry } = require('../lib/registry');
const { computeVerdict, failureKind, renderSummary, batchMatchesTest } = require('../verdict');
const { deriveLabels } = require('../enrich-allure-results');
const { suggest } = require('../suggest-known-issues');

const SPEC = 'PlanningSpace/CardsBatch/Test_010_BulletChart.spec.ts';

function result(name, status, { spec = SPEC, start = 1, stop = 2, message = '', historyId = `${spec}:${name}` } = {}) {
  return { name, status, start, stop, historyId, fullName: `${spec}:10:5`, statusDetails: message ? { message } : {}, labels: [] };
}

function registry(knownIssues = [], quarantine = []) {
  return { knownIssues, quarantine, expired: [] };
}

function trendOf(runs, total = 10, passed = 9) {
  return Array.from({ length: runs }, () => ({ data: { total, passed, failed: total - passed } }));
}

const OPTIONS = { suite: 'test', mode: 'report', checkCount: true, upstreamResult: 'success', degradedThresholdPoints: 10 };

test('last attempt wins and a pass after a failed retry is flaky', () => {
  const tests = summarizeTests([
    result('TC1', 'failed', { start: 1, stop: 2, message: 'boom' }),
    result('TC1', 'passed', { start: 3, stop: 4 })
  ]);
  assert.equal(tests.length, 1);
  assert.equal(tests[0].status, 'passed');
  assert.equal(tests[0].flaky, true);
});

test('skips without a reason in a spec with a failure are blocked by that failure', () => {
  const tests = summarizeTests([
    result('TC1', 'passed', { start: 1 }),
    result('TC2', 'failed', { start: 2, message: 'Error: boom' }),
    result('TC3', 'skipped', { start: 3 }),
    result('Other', 'skipped', { spec: 'PlanningSpace/Other/Test_001.spec.ts', start: 3 }),
    result('Reasoned', 'skipped', { start: 3, message: 'SQL env not set' })
  ]);
  const byName = Object.fromEntries(tests.map((item) => [item.name, item]));
  assert.equal(byName.TC3.blockedBy, 'TC2');
  assert.equal(byName.Other.blockedBy, null);
  assert.equal(byName.Reasoned.blockedBy, null);
  assert.deepEqual(countTests(tests), { total: 5, passed: 1, failed: 1, skipped: 2, blocked: 1, flaky: 0 });
});

test('error signatures mask numbers and ids', () => {
  assert.equal(errorSignature('TimeoutError: locator.waitFor: Timeout 15000ms exceeded.\nCall log'), 'TimeoutError: locator.waitFor: Timeout Nms exceeded.');
  assert.equal(errorSignature('Not found: 6821986bbe9e88651f4afc09'), 'Not found: {id}');
  assert.equal(errorSignature('View "Dirty state view1" did not become visible'), 'View "…" did not become visible');
  assert.equal(errorSignature("Couldn't find 'Monthly Calendar' in export"), "Couldn't find '…' in export");
});

test('spec globs: ** spans folders, * stays in one folder', () => {
  assert.ok(globToRegExp('PlanningSpace/**/Test_010_*.spec.ts').test(SPEC));
  assert.ok(globToRegExp('**/Test_010_BulletChart.spec.ts').test(SPEC));
  assert.ok(!globToRegExp('PlanningSpace/*.spec.ts').test(SPEC));
});

test('registry matching honours message, environment and gateway', () => {
  const failing = { spec: SPEC, name: 'TC2', message: 'Error: expect(received).toBe(expected)', fullMessage: 'Error: expect(received).toBe(expected)\nExpected: "400"\nReceived: "500"' };
  const match = { spec: '**/Test_010_BulletChart.spec.ts', messageRegex: 'Received: "500"', gateway: ['AZURE'] };
  assert.ok(matchesTest(match, failing, { environment: 'QA', gateway: 'AZURE' }));
  assert.ok(!matchesTest(match, failing, { environment: 'QA', gateway: 'GRAVITEE' }));
  assert.ok(!matchesTest({ ...match, messageRegex: 'Received: "404"' }, failing, { gateway: 'AZURE' }));
  assert.ok(!matchesTest({}, failing, {}), 'an entry without selectors matches nothing');
});

test('registry testRegex anchors the title where the test substring would collide', () => {
  const sub = { spec: SPEC, name: 'Sub-process - Test Case 1: Check scenarios' };
  const proc = { spec: SPEC, name: 'Process - Test Case 1: Check scenarios' };
  assert.ok(matchesTest({ test: 'Process - Test Case 1' }, sub, {}), 'substring selector also hits Sub-process');
  assert.ok(matchesTest({ testRegex: '^Process - Test Case 1:' }, proc, {}));
  assert.ok(!matchesTest({ testRegex: '^Process - Test Case 1:' }, sub, {}));
});

test('expired registry entries stop applying and are reported', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'triage-'));
  fs.writeFileSync(path.join(dir, 'ki.json'), JSON.stringify({ issues: [{ id: 'KI-1', title: 'old', expires: '2026-01-01', match: { spec: '**' } }, { id: 'KI-2', title: 'live', match: { spec: '**' } }] }));
  const loaded = loadRegistry({ knownIssuesPath: path.join(dir, 'ki.json'), quarantinePath: path.join(dir, 'missing.json'), today: '2026-10-06' });
  assert.deepEqual(loaded.knownIssues.map((entry) => entry.id), ['KI-2']);
  assert.equal(loaded.expired[0].id, 'KI-1');
});

test('failure kind comes from the previous runs', () => {
  assert.equal(failureKind([]), 'new-test');
  assert.equal(failureKind([{ status: 'failed' }, { status: 'passed' }]), 'regression');
  assert.equal(failureKind(Array(7).fill({ status: 'failed' })), 'persistent');
  assert.equal(failureKind([...Array(5).fill({ status: 'failed' }), { status: 'passed' }, { status: 'passed' }]), 'persistent', '5 of the last 7 is persistent');
  assert.equal(failureKind(Array(3).fill({ status: 'failed' })), 'recurring', 'three failures alone are not persistent');
  assert.equal(failureKind([{ status: 'failed' }, { status: 'failed' }, { status: 'failed' }, { status: 'passed' }]), 'recurring');
});

test('unknown (interrupted) results count as failures, never as passes or skips', () => {
  const tests = summarizeTests([result('TC1', 'unknown')]);
  assert.equal(countTests(tests).failed, 1);
  const verdict = computeVerdict({ tests, history: {}, trend: [], registry: registry(), context: {}, options: { ...OPTIONS, checkCount: false } });
  assert.equal(verdict.verdict, 'UNEXPLAINED_FAILURES');
});

test('summary table cells escape backslashes and pipes', () => {
  const tests = summarizeTests([...Array.from({ length: 9 }, (_, i) => result(`P${i}`, 'passed')), result('a\\|b', 'failed', { message: 'Error: x' })]);
  const verdict = computeVerdict({ tests, history: {}, trend: [], registry: registry(), context: {}, options: { ...OPTIONS, checkCount: false } });
  assert.ok(renderSummary(verdict).includes('a\\\\\\|b'));
});

test('spec globs treat backslashes as path separators', () => {
  assert.ok(globToRegExp('PlanningSpace\\CardsBatch\\Test_010_*.spec.ts').test(SPEC));
});

test('verdict: all passed is green', () => {
  const tests = summarizeTests([result('TC1', 'passed'), result('TC2', 'passed')]);
  const verdict = computeVerdict({ tests, history: {}, trend: trendOf(5, 2, 2), registry: registry(), context: {}, options: OPTIONS });
  assert.equal(verdict.verdict, 'ALL_PASSED');
  assert.equal(verdict.red, false);
});

test('verdict: failures covered by known issues or quarantine are green', () => {
  const tests = summarizeTests([
    ...Array.from({ length: 8 }, (_, i) => result(`P${i}`, 'passed')),
    result('TC1', 'failed', { message: 'Error: Received: 500' }),
    result('Flaky', 'failed', { spec: 'PlanningSpace/Other/Test_002.spec.ts', message: 'Timeout' })
  ]);
  const verdict = computeVerdict({
    tests,
    history: {},
    trend: trendOf(5, 10, 8),
    registry: registry([{ id: 'KI-1', jira: 'ABP-1', title: 'x', match: { spec: SPEC, test: 'TC1' } }], [{ id: 'Q-1', owner: 'me', match: { spec: '**/Test_002.spec.ts' } }]),
    context: {},
    options: OPTIONS
  });
  assert.equal(verdict.verdict, 'KNOWN_FAILURES_ONLY');
  assert.equal(verdict.red, false);
  assert.equal(verdict.known[0].tests.length, 1);
  assert.equal(verdict.quarantined.length, 1);
});

test('verdict: an unregistered failure is red and labelled by kind', () => {
  const tests = summarizeTests([...Array.from({ length: 9 }, (_, i) => result(`P${i}`, 'passed')), result('TC1', 'failed', { message: 'Error: boom' })]);
  const history = { [`${SPEC}:TC1`]: { items: [{ status: 'passed' }] } };
  const verdict = computeVerdict({ tests, history, trend: trendOf(5), registry: registry(), context: {}, options: OPTIONS });
  assert.equal(verdict.verdict, 'UNEXPLAINED_FAILURES');
  assert.equal(verdict.red, true);
  assert.equal(verdict.unexplained[0].kind, 'regression');
});

test('verdict: broken when there are no results, too few tests, or the test job failed', () => {
  const base = { history: {}, registry: registry(), context: {} };
  assert.equal(computeVerdict({ ...base, tests: [], trend: [], options: OPTIONS }).verdict, 'BROKEN');
  const few = summarizeTests([result('TC1', 'passed')]);
  assert.equal(computeVerdict({ ...base, tests: few, trend: trendOf(5, 10, 10), options: OPTIONS }).verdict, 'BROKEN');
  assert.equal(computeVerdict({ ...base, tests: few, trend: trendOf(5, 10, 10), options: { ...OPTIONS, checkCount: false } }).verdict, 'ALL_PASSED', 'manual batch runs skip the count check');
  assert.equal(computeVerdict({ ...base, tests: few, trend: [], options: { ...OPTIONS, upstreamResult: 'cancelled' } }).verdict, 'BROKEN');
});

test('verdict: a pass-rate drop with only known failures is degraded', () => {
  const tests = summarizeTests([
    ...Array.from({ length: 6 }, (_, i) => result(`P${i}`, 'passed')),
    ...Array.from({ length: 4 }, (_, i) => result(`F${i}`, 'failed', { message: 'Error: known' }))
  ]);
  const verdict = computeVerdict({ tests, history: {}, trend: trendOf(5, 10, 9), registry: registry([{ id: 'KI-1', title: 'x', match: { spec: SPEC } }]), context: {}, options: OPTIONS });
  assert.equal(verdict.verdict, 'DEGRADED');
  assert.equal(verdict.red, true);
});

test('verdict: a known issue whose tests failed before and then passed three runs in a row may be fixed', () => {
  const tests = summarizeTests([result('TC1', 'passed'), result('TC2', 'passed')]);
  const history = { [`${SPEC}:TC1`]: { items: [{ status: 'passed' }, { status: 'passed' }, { status: 'failed' }] } };
  const issue = { id: 'KI-1', jira: 'ABP-1', title: 'x', match: { spec: SPEC, test: 'TC1' } };
  const run = (entry, runTests = tests) => computeVerdict({ tests: runTests, history, trend: [], registry: registry([entry]), context: {}, options: { ...OPTIONS, checkCount: false } });
  assert.deepEqual(run(issue).mayBeFixed.map((item) => [item.id, item.requiredPasses]), [['KI-1', 3]]);
  assert.equal(run({ ...issue, autoCloseAfterPasses: 4 }).mayBeFixed.length, 0, 'autoCloseAfterPasses raises the threshold');
  assert.equal(run({ ...issue, match: { messageRegex: '500' } }).mayBeFixed.length, 0, 'message-only entries have no stable test identity');
  assert.deepEqual(run({ ...issue, match: { testRegex: '^TC1$' } }).mayBeFixed.map((item) => item.id), ['KI-1'], 'a testRegex-only entry is eligible for recovery');
  const flaky = summarizeTests([result('TC1', 'failed', { start: 1, stop: 2, message: 'Error: 500' }), result('TC1', 'passed', { start: 3, stop: 4 })]);
  assert.equal(run(issue, flaky).mayBeFixed.length, 0, 'a pass after a retry is not a recovery');
});

test('labels are derived from the spec path', () => {
  const labels = Object.fromEntries(deriveLabels('ProcessOrchestrationBackend/ActionItem/Test_003_X.spec.ts').map((label) => [label.name, label.value]));
  assert.deepEqual(labels, { epic: 'Process Orchestration Backend API', layer: 'api', service: 'actionitem', feature: 'ActionItem' });
  assert.deepEqual(deriveLabels('Unknown/Test.spec.ts'), []);
});

test('suggest lists recurring unregistered failures only', () => {
  const tests = summarizeTests([result('TC1', 'failed', { message: 'Error: Received: "500"' }), result('TC2', 'failed', { message: 'Error: new' })]);
  const history = { [`${SPEC}:TC1`]: { items: [{ status: 'failed' }, { status: 'failed' }] } };
  const candidates = suggest({ tests, history, registry: registry(), context: { environment: 'QA' }, minFailed: 3 });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].category, 'PRODUCT_DEFECT');
  assert.deepEqual(candidates[0].match.environment, ['QA']);
});

test('batchMatchesTest matches batch identifiers against spec paths', () => {
  assert.ok(batchMatchesTest('calendar', { spec: 'tests/ProcessOrchestrationBackend/Calendar/Test_001.spec.ts' }));
  assert.ok(batchMatchesTest('actionitem', { spec: 'ProcessOrchestrationBackend/ActionItem/Test_002.spec.ts' }));
  assert.ok(batchMatchesTest('smokebatch', { spec: 'tests/ProcessOrchestrationBackend/Calendar/Test_001.spec.ts' }));
  assert.ok(!batchMatchesTest('calendar', { spec: 'tests/ProcessOrchestrationBackend/ActionItem/Test_002.spec.ts' }));
});

test('verdict: test-outcome failure without recorded test failures is broken (process crash)', () => {
  const base = { history: {}, registry: registry(), context: {} };
  const partialPasses = summarizeTests([result('TC1', 'passed'), result('TC2', 'passed')]);
  const verdict = computeVerdict({
    ...base,
    tests: partialPasses,
    trend: trendOf(5, 10, 10),
    options: { ...OPTIONS, checkCount: false, testOutcome: 'failure' }
  });
  assert.equal(verdict.verdict, 'BROKEN');
  assert.ok(verdict.brokenReasons.includes('test step exited non-zero without recorded test failures'));
});

test('verdict: test-outcome failure with recorded known failure preserves KNOWN_FAILURES_ONLY', () => {
  const tests = summarizeTests([
    result('TC1', 'passed'),
    result('TC2', 'failed', { message: 'Error: known issue' })
  ]);
  const verdict = computeVerdict({
    tests,
    history: {},
    trend: trendOf(5, 10, 9),
    registry: registry([{ id: 'KI-1', title: 'known', match: { spec: SPEC, test: 'TC2' } }]),
    context: {},
    options: { ...OPTIONS, checkCount: false, testOutcome: 'failure' }
  });
  assert.equal(verdict.verdict, 'KNOWN_FAILURES_ONLY');
  assert.equal(verdict.red, false);
});

test('verdict: batches-failed flags broken when a batch exits non-zero without recorded failures', () => {
  const tests = summarizeTests([
    result('TC1', 'passed', { spec: 'ProcessOrchestrationBackend/Calendar/Test_001.spec.ts' }),
    result('TC2', 'passed', { spec: 'ProcessOrchestrationBackend/ActionItem/Test_001.spec.ts' })
  ]);
  const verdict = computeVerdict({
    tests,
    history: {},
    trend: trendOf(5, 10, 10),
    registry: registry(),
    context: {},
    options: { ...OPTIONS, checkCount: false, batchesFailed: 'calendar' }
  });
  assert.equal(verdict.verdict, 'BROKEN');
  assert.ok(verdict.brokenReasons.includes('batch calendar exited non-zero without recorded test failures'));
});

test('verdict: batches-failed preserves known failures if failing batch has recorded test failure', () => {
  const calSpec = 'ProcessOrchestrationBackend/Calendar/Test_001.spec.ts';
  const tests = summarizeTests([
    result('TC1', 'passed', { spec: calSpec }),
    result('TC2', 'failed', { spec: calSpec, message: 'Error: known calendar defect' })
  ]);
  const verdict = computeVerdict({
    tests,
    history: {},
    trend: trendOf(5, 10, 9),
    registry: registry([{ id: 'KI-1', title: 'known calendar defect', match: { spec: calSpec, test: 'TC2' } }]),
    context: {},
    options: { ...OPTIONS, checkCount: false, batchesFailed: 'calendar' }
  });
  assert.equal(verdict.verdict, 'KNOWN_FAILURES_ONLY');
  assert.equal(verdict.red, false);
});

test('verdict: batches-failed flags broken if one batch has known failure but another batch crashed', () => {
  const calSpec = 'ProcessOrchestrationBackend/Calendar/Test_001.spec.ts';
  const aiSpec = 'ProcessOrchestrationBackend/ActionItem/Test_001.spec.ts';
  const tests = summarizeTests([
    result('TC1', 'failed', { spec: calSpec, message: 'Error: known calendar defect' }),
    result('TC2', 'passed', { spec: aiSpec })
  ]);
  const verdict = computeVerdict({
    tests,
    history: {},
    trend: trendOf(5, 10, 9),
    registry: registry([{ id: 'KI-1', title: 'known calendar defect', match: { spec: calSpec, test: 'TC1' } }]),
    context: {},
    options: { ...OPTIONS, checkCount: false, batchesFailed: 'calendar actionitem' }
  });
  assert.equal(verdict.verdict, 'BROKEN');
  assert.ok(verdict.brokenReasons.includes('batch actionitem exited non-zero without recorded test failures'));
});

