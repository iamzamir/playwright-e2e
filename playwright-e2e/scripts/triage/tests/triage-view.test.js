// Unit tests for what the dashboard's Triage page shows (dashboard/triage-view.js). Run: npm run test:triage
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const view = require('../../../dashboard/triage-view');

function group(id, category, overrides = {}) {
  return { id, title: `Group ${id}`, category, counts: { failed: 1, blocked: 0 }, trend: 'recurring', reasons: [], suites: [], ...overrides };
}

test('queue: leaves out tracked groups and puts new, undecided, high-impact groups first', () => {
  const clusters = [
    group('small-old', 'AUTOMATION_ISSUE'),
    group('big-old', 'TO_INVESTIGATE', { counts: { failed: 2, blocked: 40 } }),
    group('confirmed-big', 'PRODUCT_DEFECT', { counts: { failed: 9, blocked: 90 }, triage: { decision: 'confirmed' } }),
    group('new-small', 'TEST_DATA_ISSUE', { trend: 'new' }),
    group('known', 'KNOWN_ISSUE', { trend: 'new', counts: { failed: 9, blocked: 0 } }),
    group('quarantined', 'FLAKY')
  ];
  assert.deepEqual(view.actionQueue(clusters).map((item) => item.id), ['new-small', 'big-old', 'small-old', 'confirmed-big']);
  assert.deepEqual(view.actionQueue(clusters, 'KNOWN_ISSUE').map((item) => item.id), ['known'], 'a filter can still show tracked groups');
  assert.deepEqual(view.byPriority(clusters.filter(view.isTracked)).map((item) => item.id), ['known', 'quarantined']);
});

test('long-running groups leave the queue for their own list, oldest first; tracked ones stay tracked', () => {
  const clusters = [
    group('fresh', 'TO_INVESTIGATE', { trend: 'new' }),
    group('since-oct-20', 'TEST_DATA_ISSUE', { longRunning: true, firstSeen: '2026-10-20', counts: { failed: 1, blocked: 0 } }),
    group('since-oct-07-small', 'TO_INVESTIGATE', { longRunning: true, firstSeen: '2026-10-07' }),
    group('since-oct-07-big', 'PRODUCT_DEFECT', { longRunning: true, firstSeen: '2026-10-07', counts: { failed: 3, blocked: 2 } }),
    group('known-long', 'KNOWN_ISSUE', { longRunning: true, firstSeen: '2026-10-07' })
  ];
  assert.deepEqual(view.actionQueue(clusters).map((item) => item.id), ['fresh']);
  assert.deepEqual(view.longRunningQueue(clusters).map((item) => item.id), ['since-oct-07-big', 'since-oct-07-small', 'since-oct-20']);
  assert.deepEqual(view.actionQueue(clusters, 'TO_INVESTIGATE').map((item) => item.id), ['fresh', 'since-oct-07-small'], 'a category filter shows long-running groups too');
  assert.equal(view.isLongRunning(clusters[4]), false, 'a known issue is tracked, not long-running');

  const summary = view.nightSummary({ categories: {}, clusters, suites: [{ status: 'reported' }] });
  assert.deepEqual([summary.waiting, summary.longRunning, summary.tracked], [1, 3, 1], 'long-running groups are not counted as waiting');
  const quiet = view.nightSummary({ categories: {}, clusters: clusters.slice(1), suites: [{ status: 'reported' }] });
  assert.equal(view.nightHeadline(quiet), 'No new failures · 3 long-running groups still failing');
});

test('needs a decision: closing an issue without a label does not count as one', () => {
  assert.equal(view.needsDecision(group('open', 'AUTOMATION_ISSUE')), true);
  assert.equal(view.needsDecision(group('closed', 'AUTOMATION_ISSUE', { triage: { decision: 'pending', state: 'closed' } })), true);
  assert.equal(view.needsDecision(group('confirmed', 'AUTOMATION_ISSUE', { triage: { decision: 'confirmed' } })), false);
  assert.equal(view.needsDecision(group('moved', 'AUTOMATION_ISSUE', { triage: { decision: 'pending', reclassified: true } })), false);
  assert.equal(view.needsDecision(group('known', 'KNOWN_ISSUE')), false);
});

test('failing again: a group whose triage issue is closed comes right after new groups, decided or not', () => {
  const closed = (decision, extra = {}) => ({ issue: 788, state: 'closed', decision, resolution: 'not planned', ...extra });
  const clusters = [
    group('big-open', 'TO_INVESTIGATE', { counts: { failed: 5, blocked: 40 }, triage: { issue: 1, state: 'open', decision: 'pending' } }),
    group('again-confirmed', 'TEST_DATA_ISSUE', { triage: closed('confirmed') }),
    group('again-pending', 'TO_INVESTIGATE', { triage: closed('pending') }),
    group('fresh', 'AUTOMATION_ISSUE', { trend: 'new' }),
    group('known-closed', 'KNOWN_ISSUE', { triage: closed('pending') }),
    group('again-long', 'TEST_DATA_ISSUE', { longRunning: true, firstSeen: '2026-10-07', triage: closed('confirmed') })
  ];
  assert.deepEqual(clusters.map(view.isFailingAgain), [false, true, true, false, false, true]);
  assert.deepEqual(view.actionQueue(clusters).map((item) => item.id), ['fresh', 'again-pending', 'again-confirmed', 'big-open'], 'a decided group still needs its issue reopened');
  const summary = view.nightSummary({ categories: {}, clusters, suites: [{ status: 'reported' }] });
  assert.equal(summary.failingAgain, 3, 'long-running ones count too, they keep their own list');
  assert.equal(view.nightHeadline({ ...summary, newGroups: 0 }), 'No new failures · 3 groups failing again on a closed issue');
  assert.equal(view.nightHeadline({ ...summary, newGroups: 0, failingAgain: 1 }), 'No new failures · 1 group failing again on a closed issue');
  assert.equal(view.nightHeadline(summary), '1 new failure group to look at', 'new groups still come first');
});

test('summary: counts what needs attention, and tracked groups are not new or waiting', () => {
  const summary = view.nightSummary({
    categories: { TO_INVESTIGATE: 1, AUTOMATION_ISSUE: 2, KNOWN_ISSUE: 1 },
    clusters: [
      group('a', 'TO_INVESTIGATE', { trend: 'new', counts: { failed: 1, blocked: 5 } }),
      group('b', 'AUTOMATION_ISSUE', { counts: { failed: 2, blocked: 0 } }),
      group('k', 'KNOWN_ISSUE', { trend: 'new' })
    ],
    suites: [{ status: 'reported', verdict: 'BROKEN' }, { status: 'reported', verdict: 'ALL_PASSED' }, { status: 'missing' }, { status: 'no-data' }, { status: 'pending' }]
  });
  assert.deepEqual(
    [summary.failed, summary.blocked, summary.newGroups, summary.waiting, summary.tracked, summary.explainedPct, summary.reported, summary.broken, summary.notReported, summary.pending],
    [4, 5, 1, 2, 1, 75, 2, 1, 2, 1]
  );
  assert.equal(view.nightSummary({ clusters: [], suites: [] }).explainedPct, null, 'no failures: nothing to divide by');
});

test('headline: names the most urgent thing', () => {
  const headline = (overrides) => view.nightHeadline({ reported: 3, notReported: 0, newGroups: 0, broken: 0, waiting: 0, failed: 0, ...overrides });
  assert.equal(headline({ newGroups: 2, broken: 1 }), '2 new failure groups to look at');
  assert.equal(headline({ newGroups: 1 }), '1 new failure group to look at');
  assert.equal(headline({ broken: 1, waiting: 4 }), '1 broken run to look at');
  assert.equal(headline({ notReported: 2, waiting: 4 }), '2 suites did not report');
  assert.equal(headline({ waiting: 4, failed: 6 }), 'No new failures · 4 groups waiting on a decision');
  assert.equal(headline({ failed: 6 }), 'Only known failures tonight');
  assert.equal(headline({}), 'All clear');
  assert.equal(headline({ pending: 1 }), 'No failures so far · 1 suite still to report', 'a night in progress is not all clear');
  assert.equal(headline({ failed: 6, pending: 2 }), 'Only known failures so far · 2 suites still to report');
  assert.equal(headline({ reported: 0 }), 'Waiting for suites to report');
  assert.equal(headline({ reported: 0, notReported: 2 }), '2 suites did not report', 'a night where nothing reported is not just waiting');
});

test('suites: group by area and environment, with shared builds listed once', () => {
  const build = (key, sha) => ({ key, sha });
  const suites = [
    { key: 'q-a', area: 'PO Backend', environment: 'QA', gateway: 'AZURE' },
    { key: 'q-g', area: 'PO Backend', environment: 'QA', gateway: 'GRAVITEE' },
    { key: 'ui-a', area: 'PO UI', environment: 'INTEROP', gateway: 'AZURE', builds: [build('lui', 'aaa')] },
    { key: 'ui-g', area: 'PO UI', environment: 'INTEROP', gateway: 'GRAVITEE', builds: [build('lui', 'aaa'), build('mfe', 'bbb')], buildChanges: [{ key: 'lui', to: 'aaa' }] },
    { key: 'visual', label: 'Visual smoke', area: 'Visual', environment: 'INTEROP' }
  ];
  const groups = view.groupSuites(suites);
  assert.deepEqual(groups.map((item) => [item.title, item.suites.length]), [['PO Backend · QA', 2], ['PO UI · INTEROP', 2], ['Visual · INTEROP', 1]]);
  assert.deepEqual(groups[0].suites.map(view.suiteShortName), ['Azure', 'Gravitee']);
  assert.equal(view.suiteShortName(suites[4]), 'Visual smoke');
  assert.deepEqual(view.groupBuilds(groups[1].suites).map((entry) => [entry.build.key, entry.changed]), [['lui', true], ['mfe', false]]);
  assert.equal(view.compactSuites(['q-a', 'q-g', 'visual', 'gone'], suites), 'PO Backend QA (Azure, Gravitee), Visual INTEROP, gone');
});

test('broken run: the reason comes from the verdict headline', () => {
  const reason = (verdict, headline) => view.brokenReason({ verdict, headline });
  assert.equal(reason('BROKEN', 'BROKEN: run broken: only 63 tests ran (usually 90) · 30 passed · 7 failed'), 'only 63 tests ran (usually 90)');
  assert.equal(reason('BROKEN', 'BROKEN: run broken: no results'), 'no results');
  assert.equal(reason('BROKEN', 'something else'), null);
  assert.equal(reason('ALL_PASSED', 'run broken: not this one'), null);
});

test('trend: oldest first, ends on the chosen night and skips nights with no rate', () => {
  const days = [{ date: 'd5', passRate: 90 }, { date: 'd4', passRate: 80 }, { date: 'd3', passRate: null }, { date: 'd2', passRate: 70 }, { date: 'd1', passRate: 60 }];
  assert.deepEqual(view.passRateSeries(days, 'd4').map((point) => point.date), ['d1', 'd2', 'd4']);
  assert.deepEqual(view.passRateSeries(days, 'd5', 2).map((point) => point.date), ['d4', 'd5']);
  assert.deepEqual(view.passRateSeries(days, 'nope'), []);
  assert.deepEqual(view.sparklinePoints([{ passRate: 50 }, { passRate: 100 }], 100, 40, 4), [{ x: 4, y: 36 }, { x: 96, y: 4 }], 'lowest rate at the bottom, highest at the top');
  assert.deepEqual(view.sparklinePoints([{ passRate: 50 }], 100, 40), [], 'one night is not a trend');
  assert.deepEqual(view.sparklinePoints([{ passRate: 80 }, { passRate: 80 }], 100, 40, 4).map((point) => point.y), [4, 4], 'a flat line needs no scale');
});

test('publishing: every file the page loads is in the workflow copy step', () => {
  const dashboard = path.resolve(__dirname, '../../../dashboard');
  const workflow = fs.readFileSync(path.resolve(__dirname, '../../../../.github/workflows/nightly-triage.yaml'), 'utf8');
  const copyStep = workflow.split(/\r?\n/).find((text) => /^\s*cp .*dashboard\/index\.html/.test(text));
  const html = fs.readFileSync(path.join(dashboard, 'index.html'), 'utf8');
  const loaded = [...html.matchAll(/(?:src|href)="([\w.-]+\.(?:js|css))"/g)].map((match) => match[1]);
  assert.ok(loaded.includes('triage-view.js') && loaded.includes('app.js') && loaded.includes('app.css'));
  for (const file of loaded) assert.ok(copyStep.includes(`playwright-e2e/dashboard/${file}`), `${file} is not published`);
  assert.ok(html.indexOf('triage-view.js') < html.indexOf('src="app.js"'), 'app.js needs TriageView loaded first');
});
