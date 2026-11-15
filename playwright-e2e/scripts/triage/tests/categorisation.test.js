// Categorisation rules tuned on the 2026-11-04 night: visual smoke diffs, assumption launch 500s, twin backend specs
// and rate limiting. Run: npm run test:triage
const test = require('node:test');
const assert = require('node:assert/strict');
const { classify } = require('../lib/classify');
const { clusterFailures } = require('../lib/cluster');

function failure(overrides = {}) {
  return {
    id: overrides.id || `id-${Math.random()}`,
    spec: 'PlanningSpace/CardsBatch/Test_010.spec.ts',
    name: 'TC1',
    status: 'failed',
    signature: 'TimeoutError: locator.waitFor: Timeout Nms exceeded.',
    kind: 'regression',
    error: { type: 'TimeoutError', message: 'TimeoutError: locator.waitFor: Timeout 15000ms exceeded.', location: { file: 'pageobjects/cards.page.ts', line: 10, function: 'CardsPage.open' } },
    failedStep: null,
    stepTrail: [],
    httpErrors: [],
    knownIssue: null,
    quarantine: null,
    ...overrides
  };
}

function run(suite, tests) {
  return { suite, environment: 'INTEROP', gateway: null, trigger: 'schedule', runNumber: 1, tests };
}

const http = (method, status, endpoint, msBeforeFailure = 5000) => ({ method, status, endpoint, msBeforeFailure, requestId: null, body: null, failure: null });

function visualFailure(png, area, last7, overrides = {}) {
  const message = `Error: Visual validation failed for ${png}.\nBaseline path: /home/runner/work/r/r/playwright-e2e/testdata/INTEROP/VisualBaseValidations/${area}/${png}\nDiff stats: diffPixels=51819, diffRatio=0.024990`;
  return failure({
    spec: `${area}/Test_001_${png}.spec.ts`,
    name: `Visual ${png}`,
    signature: `Error: Visual validation failed for ${png}.`,
    last7,
    error: { type: 'Error', message, location: { file: 'util/visual-helper.util.ts', line: 174, function: 'buildComparisonFailureError' } },
    ...overrides
  });
}

test('a visual diff that kept failing is a stale baseline; a new one stays to investigate', () => {
  const stale = classify(visualFailure('PS-AllViewsPanel.png', 'PlanningSpace', 'FFFFFFF'), {});
  assert.equal(stale.category, 'AUTOMATION_ISSUE');
  assert.equal(stale.confidence, 'medium');
  assert.match(stale.reasons[0], /7 of the previous 7 nights/);
  assert.equal(classify(visualFailure('PS-AllViewsPanel.png', 'PlanningSpace', 'PFFPPPF'), {}).category, 'AUTOMATION_ISSUE', 'three earlier failures are enough');
  for (const last7 of ['PPPPFFP', 'PPPPPPP', '', undefined]) {
    assert.equal(classify(visualFailure('PS-AllViewsPanel.png', 'PlanningSpace', last7), {}).category, 'TO_INVESTIGATE', `history ${last7}`);
  }
});

test('visual diffs group per baseline area and history, not per screenshot', () => {
  const tests = [
    visualFailure('PS-AllViewsPanel.png', 'PlanningSpace', 'FFFFFFF', { id: 'a' }),
    visualFailure('PS-HiddenViewsPanel.png', 'PlanningSpace', 'FFFFFFF', { id: 'b' }),
    visualFailure('PS-FaultTolerance-NoViewsAdmin-FullPage.png', 'PlanningSpace', 'PPPPFFP', { id: 'c' }),
    visualFailure('PS-FaultTolerance-NoBaselineAdmin-FullPage.png', 'PlanningSpace', 'PPPPPPP', { id: 'd' }),
    visualFailure('PO-Settings-PlanningViews-FullPage.png', 'ProcessOrchestration', 'FFFFFFF', { id: 'e' })
  ];
  const { clusters } = clusterFailures([run('VISUAL-CompleteSmokeVisual', tests)]);
  assert.deepEqual(clusters.map((cluster) => [cluster.category, cluster.counts.failed, cluster.title]), [
    ['AUTOMATION_ISSUE', 2, 'Visual baseline out of date (PlanningSpace screens that keep failing)'],
    ['AUTOMATION_ISSUE', 1, 'Visual baseline out of date (ProcessOrchestration screens that keep failing)'],
    ['TO_INVESTIGATE', 2, 'New visual diff vs baseline (PlanningSpace screens)']
  ]);
});

test('a causal 5xx on the page still wins over the visual rule', () => {
  const broken = visualFailure('PS-AllViewsPanel.png', 'PlanningSpace', 'FFFFFFF', { httpErrors: [http('GET', 500, '/ibp/views/v1/views')] });
  assert.equal(classify(broken, {}).category, 'PRODUCT_DEFECT');
});

test('a widespread 5xx that no passing test hit explains the failures; one seen on passing tests stays background', () => {
  const launch = (i) => failure({
    id: `l${i}`,
    name: `TC${i}`,
    signature: `TimeoutError: page.waitForURL: Timeout Nms exceeded. ${i % 3}`,
    error: { type: 'TimeoutError', message: 'TimeoutError: page.waitForURL: Timeout 60000ms exceeded.', location: { file: 'pageobjects/planning-listing.page.ts', function: 'PlanningListingPage.launchContext' } },
    httpErrors: [http('GET', 500, '/cbp/interop/ibp/assumptions/v1/assumption/editor', 59000), http('GET', 500, '/cbp/interop/ibp/assumptions/v1/assumption/{id}', 59100)]
  });
  const tests = Array.from({ length: 6 }, (_, i) => launch(i));
  const baseline = { passedTests: 368, errors: { 'GET 500 /cbp/interop/ibp/assumptions/v1/assumption/editor': 145 } };

  const { clusters, widespread } = clusterFailures([run('PS', tests)], { baseline });
  assert.deepEqual(widespread.map((finding) => [finding.endpoint, finding.failingOnly]), [
    ['/cbp/interop/ibp/assumptions/v1/assumption/editor', false],
    ['/cbp/interop/ibp/assumptions/v1/assumption/{id}', true]
  ]);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].category, 'PRODUCT_DEFECT');
  assert.equal(clusters[0].title, '500 on GET /cbp/interop/ibp/assumptions/v1/assumption/{id}');
  assert.ok(clusters[0].reasons.includes('Seen in many failures tonight but on none of the 368 passing UI tests'));

  const background = [{ key: 'GET 500 /cbp/interop/ibp/assumptions/v1/assumption/{id}', tests: 20, passedTests: 300 }];
  assert.equal(clusterFailures([run('PS', tests)], { baseline, background }).clusters[0].category, 'PRODUCT_DEFECT', 'tonight\'s passing tests outrank the 14-night background list');

  assert.ok(clusterFailures([run('PS', tests)]).clusters.every((cluster) => cluster.category === 'TO_INVESTIGATE'), 'no baseline: still widespread noise');
  const fewPassing = { passedTests: 10, errors: {} };
  assert.ok(clusterFailures([run('PS', tests)], { baseline: fewPassing }).clusters.every((cluster) => cluster.category === 'TO_INVESTIGATE'), 'too few passing tests to trust "never seen"');
});

test('a widespread 4xx is never promoted to a cause, even if no passing test hit it', () => {
  const tests = Array.from({ length: 6 }, (_, i) => failure({ id: `n${i}`, signature: `sig-${i % 3}`, httpErrors: [http('GET', 404, '/procedureExecutions/latest')] }));
  const { clusters, widespread } = clusterFailures([run('PS', tests)], { baseline: { passedTests: 368, errors: {} } });
  assert.equal(widespread[0].failingOnly, false);
  assert.ok(clusters.every((cluster) => cluster.category === 'TO_INVESTIGATE'));
});

test('a manually confirmed noise entry is never promoted to a cause', () => {
  const tests = Array.from({ length: 6 }, (_, i) => failure({ id: `k${i}`, signature: `sig-${i % 3}`, httpErrors: [http('POST', 502, '/cbp/dev/foundation/objectivebar-kpi/v1/kpis')] }));
  const manualNoise = [{ method: 'POST', status: 502, endpointRegex: '/objectivebar-kpi/', reason: 'dev widget' }];
  const { clusters } = clusterFailures([run('PS', tests)], { manualNoise, baseline: { passedTests: 368, errors: {} } });
  assert.ok(clusters.every((cluster) => cluster.category === 'TO_INVESTIGATE'));
});

test('the same error in the test body of sibling specs forms one group; page-object frames still split by method', () => {
  const body = (spec, line) => failure({
    id: `${spec}${line}`,
    spec: `ProcessOrchestrationBackend/LinkManagement/${spec}`,
    signature: "TypeError: Cannot read properties of undefined (reading '…')",
    error: { type: 'TypeError', message: "TypeError: Cannot read properties of undefined (reading 'procedures')", location: { file: `tests/ProcessOrchestrationBackend/LinkManagement/${spec}`, line, function: null } }
  });
  const twins = [body('Test_005_Process.spec.ts', 58), body('Test_005_Process.spec.ts', 89), body('Test_007_SubProcess.spec.ts', 58)];
  const other = failure({
    id: 'x',
    spec: 'ProcessOrchestrationBackend/ActionItem/Test_001.spec.ts',
    signature: twins[0].signature,
    error: { ...twins[0].error, location: { file: 'tests/ProcessOrchestrationBackend/ActionItem/Test_001.spec.ts', line: 3, function: null } }
  });
  const { clusters } = clusterFailures([run('PW-PO-BACKEND-QA-GRAVITEE', [...twins, other])]);
  assert.deepEqual(clusters.map((cluster) => cluster.counts.failed).sort(), [1, 3], 'another folder is another group');

  const pom = (fn) => failure({ id: fn, signature: 'TypeError: x', error: { type: 'TypeError', message: "TypeError: Cannot read properties of undefined (reading 'x')", location: { file: 'pageobjects/a.page.ts', function: fn } } });
  assert.equal(clusterFailures([run('PS', [pom('A.one'), pom('A.two')])]).clusters.length, 2);
});

test('a 429 reported by an API check is rate limiting, not left to investigate', () => {
  const limited = failure({ error: { message: 'Error: expect(received).toBeTruthy()' }, failedStep: 'LM-01-P04 /search scsactor - Status Code Validation Failed!! Expected Value:: 200 || Actual Value:: 429' });
  assert.equal(classify(limited, {}).category, 'ENVIRONMENT_ISSUE');
});

test('a gateway outage during one run forms one environment group across API areas', () => {
  const endpoints = ['/lui/notification/v1/searchNotifications', '/iam/realm/v1/realmSettings', '/cbp/interop/foundation/model/v1/dimensions',
    '/genai/brief/v2/brief-summary', '/lui/uiRegistration/v1/apps'];
  const outage = endpoints.map((endpoint, i) => failure({ id: `g${i}`, signature: `sig-${i}`, httpErrors: [http('GET', 502, endpoint)] }));
  const checkOnly = failure({ id: 'check', error: { message: 'Error: expect(received).toBeTruthy()' }, failedStep: 'Fetch IAM policies Failed! Error: 502 Bad Gateway' });
  const unrelated = failure({ id: 'other' });
  const { clusters } = clusterFailures([run('PW-PS-UI-INTEROP-GRAVITEE', [...outage, checkOnly, unrelated])]);
  const burst = clusters.find((cluster) => cluster.title.startsWith('Gateway errors'));
  assert.ok(burst, 'one burst group');
  assert.equal(burst.category, 'ENVIRONMENT_ISSUE');
  assert.equal(burst.confidence, 'high');
  assert.equal(burst.counts.failed, 6, 'a 502 reported by a check joins the burst');
  assert.equal(burst.service, null, 'a burst names no single service');
  assert.match(burst.reasons[0], /6 failures got 502\/503\/504 or no response from 5 API areas/);
  assert.equal(clusters.length, 2, 'the unrelated timeout keeps its own group');
});

test('gateway errors below the burst thresholds, or spread over runs, keep their own groups', () => {
  const sameArea = Array.from({ length: 6 }, (_, i) => failure({ id: `s${i}`, signature: `sig-${i}`, httpErrors: [http('POST', null, '/lui/notification/v1/searchNotifications')] }));
  sameArea.forEach((item) => { item.httpErrors[0].failure = 'net::ERR_FAILED'; });
  assert.ok(!clusterFailures([run('PS', sameArea)]).clusters.some((cluster) => cluster.title.startsWith('Gateway errors')), 'one API area is not an outage');

  const endpoints = ['/lui/a/v1', '/iam/b/v1', '/genai/c/v1', '/lui/d/v1', '/iam/e/v1', '/genai/f/v1'];
  const spread = endpoints.map((endpoint, i) => run(`suite-${i % 2}`, [failure({ id: `p${i}`, signature: `sig-${i}`, httpErrors: [http('GET', 503, endpoint)] })]));
  assert.ok(!clusterFailures(spread).clusters.some((cluster) => cluster.title.startsWith('Gateway errors')), 'three failures per run is below the minimum');

  const fiveSame = Array.from({ length: 5 }, (_, i) => failure({ id: `h${i}`, signature: `sig-${i}`, httpErrors: [http('GET', 500, ['/lui/a/v1', '/iam/b/v1', '/genai/c/v1', '/lui/d/v1', '/iam/e/v1'][i])] }));
  assert.ok(!clusterFailures([run('PS', fiveSame)]).clusters.some((cluster) => cluster.title.startsWith('Gateway errors')), 'a 500 is a product error, not a gateway outage');
});

test('a cancelled navigation or a call to another environment never counts toward a gateway outage', () => {
  const aborted = failure({ error: { message: 'Error: page.goto: net::ERR_ABORTED at https://host/app' } });
  const abortedResult = classify(aborted, { environment: 'INTEROP' });
  assert.equal(abortedResult.category, 'ENVIRONMENT_ISSUE', 'category unchanged');
  assert.equal(abortedResult.gateway, false);

  const crossEnv = failure({ error: { message: 'Error: expect(received).toBeTruthy()' }, failedStep: 'Fetch KPIs Failed! Error: 502 Bad Gateway',
    httpErrors: [http('POST', 502, '/cbp/dev/foundation/objectivebar-kpi/v1/kpis')] });
  const crossResult = classify(crossEnv, { environment: 'INTEROP' });
  assert.equal(crossResult.category, 'ENVIRONMENT_ISSUE', 'category unchanged');
  assert.equal(crossResult.gateway, false);

  const textOnly = failure({ error: { message: 'Error: 502 Bad Gateway from https://host/cbp/dev/foundation/objectivebar-kpi/v1/kpis' }, httpErrors: [] });
  const textResult = classify(textOnly, { environment: 'INTEROP' });
  assert.equal(textResult.category, 'ENVIRONMENT_ISSUE', 'category unchanged');
  assert.equal(textResult.gateway, false, 'another environment named only in the message');

  const real = failure({ error: { message: 'Error: expect(received).toBeTruthy()' }, failedStep: 'Fetch IAM policies Failed! Error: 502 Bad Gateway' });
  assert.equal(classify(real, { environment: 'INTEROP' }).gateway, true);
});
