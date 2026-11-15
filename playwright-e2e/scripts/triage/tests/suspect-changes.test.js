// Unit tests for change correlation (scripts/triage/lib/suspect-changes.js). Run: npm run test:triage
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { withSuspectChanges, groupFiles, MAX_SUSPECTS } = require('../lib/suspect-changes');
const { automationChange } = require('../build-day');
const { buildCard } = require('../teams-digest');
const { withDrafts } = require('../lib/defect-draft');

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const C = 'c'.repeat(40);
const D = 'd'.repeat(40);
const REPO = 'BY-Product-Development/plan-sop-ui-automation';

function group(id, overrides = {}) {
  return {
    id,
    title: `Group ${id}`,
    category: 'TO_INVESTIGATE',
    trend: 'new',
    counts: { failed: 1, blocked: 0 },
    reasons: [],
    suites: ['PS'],
    tests: [{ spec: 'PlanningSpace/ViewsBatch/Test_006_ConfigureViews.spec.ts' }],
    location: 'pageobjects/views.page.ts › ViewsPage.open',
    environments: ['INTEROP'],
    gateways: ['AZURE'],
    ...overrides
  };
}

const suites = [
  {
    key: 'PS',
    builds: [{ key: 'planning-mfe', name: 'Planning Space UI', repository: 'BY-Product-Development/plan-sop-planning-mfe', sha: B }],
    buildChanges: [{ key: 'planning-mfe', name: 'Planning Space UI', from: A, to: B }],
    automationChange: { from: C, to: D }
  },
  { key: 'API', builds: [], buildChanges: [{ key: 'planning-mfe', name: 'Planning Space UI', from: A, to: B }], automationChange: null }
];

test('suspect changes: app build changes for UI groups, automation only when it touched the group files', async () => {
  const calls = [];
  const changedFiles = async (from, to) => {
    calls.push(`${from.slice(0, 1)}..${to.slice(0, 1)}`);
    return ['playwright-e2e/pageobjects/views.page.ts', 'playwright-e2e/configs/setup.js'];
  };
  const [ui, unrelated, api, old, known, outage] = await withSuspectChanges([
    group('ui'),
    group('unrelated', { tests: [{ spec: 'PlanningSpace/Cards/Test_001.spec.ts' }], location: 'tests/PlanningSpace/Cards/Test_001.spec.ts' }),
    group('api', { suites: ['API'], tests: [{ spec: 'ProcessOrchestrationBackend/Calendar/Test_001.spec.ts' }], location: null }),
    group('old', { trend: 'recurring' }),
    group('known', { category: 'KNOWN_ISSUE' }),
    group('outage', { category: 'ENVIRONMENT_ISSUE' })
  ], suites, { repository: REPO, changedFiles });

  assert.deepEqual(ui.suspectChanges.map((suspect) => suspect.kind), ['app', 'automation']);
  assert.equal(ui.suspectChanges[0].url, `https://github.com/BY-Product-Development/plan-sop-planning-mfe/compare/${A}...${B}`);
  assert.deepEqual(ui.suspectChanges[1].files, ['playwright-e2e/pageobjects/views.page.ts']);
  assert.equal(ui.suspectChanges[1].url, `https://github.com/${REPO}/compare/${C}...${D}`);
  assert.deepEqual(unrelated.suspectChanges.map((suspect) => suspect.kind), ['app'], 'the commit range did not touch its spec or failing file');
  assert.equal(api.suspectChanges, undefined, 'an API-only group is not tied to a UI app build');
  assert.equal(old.suspectChanges, undefined, 'only new groups get suspects');
  assert.equal(known.suspectChanges, undefined, 'tracked groups are left alone');
  assert.equal(outage.suspectChanges, undefined, 'an environment issue is not blamed on a code change');
  assert.deepEqual(calls, ['c..d'], 'one compare call per commit range');
});

test('suspect changes: an unknown file list is still named, and suites sharing a change are merged', async () => {
  const both = [suites[0], { ...suites[0], key: 'PS2' }];
  const [cluster] = await withSuspectChanges([group('g', { suites: ['PS', 'PS2'] })], both, { repository: REPO, changedFiles: async () => null });
  assert.equal(cluster.suspectChanges.length, 2);
  assert.deepEqual(cluster.suspectChanges[0].suites, ['PS', 'PS2']);
  assert.equal(cluster.suspectChanges[1].files, null, 'null means the files were not checked');
  const [failing] = await withSuspectChanges([group('g')], suites, { repository: REPO, changedFiles: async () => { throw new Error('API down'); } });
  assert.equal(failing.suspectChanges[1].files, null, 'an API error counts as not checked');
  assert.equal(MAX_SUSPECTS, 5);
});

test('suspect changes: links only for well-formed repositories and SHAs', async () => {
  const odd = [{ ...suites[0], builds: [{ key: 'planning-mfe', repository: 'not a repo', sha: B }], automationChange: { from: 'main', to: D } }];
  const [cluster] = await withSuspectChanges([group('g')], odd, { repository: REPO, changedFiles: async () => [] });
  assert.equal(cluster.suspectChanges.length, 1, 'a non-SHA automation range is ignored');
  assert.equal(cluster.suspectChanges[0].url, null);
});

test('suspect changes: the app repository falls back to its service-map repo name', async () => {
  const fallback = [{ ...suites[0], builds: [{ key: 'planning-mfe', repo: 'plan-sop-planning-mfe', sha: B }], automationChange: null }];
  const [cluster] = await withSuspectChanges([group('g')], fallback, { repository: REPO, changedFiles: async () => [] });
  assert.equal(cluster.suspectChanges[0].repository, 'BY-Product-Development/plan-sop-planning-mfe');
  assert.equal(cluster.suspectChanges[0].url, `https://github.com/BY-Product-Development/plan-sop-planning-mfe/compare/${A}...${B}`);
  const bad = [{ ...fallback[0], builds: [{ key: 'planning-mfe', repo: '../evil', sha: B }] }];
  const [none] = await withSuspectChanges([group('g')], bad, { repository: REPO, changedFiles: async () => [] });
  assert.equal(none.suspectChanges[0].url, null, 'a malformed repo name gets no link');
});

test('group files are repo paths of its specs and failing frame', () => {
  assert.deepEqual([...groupFiles(group('g'))], [
    'playwright-e2e/tests/PlanningSpace/ViewsBatch/Test_006_ConfigureViews.spec.ts',
    'playwright-e2e/pageobjects/views.page.ts'
  ]);
  const specFrame = group('g', { location: 'tests/PlanningSpace/ViewsBatch/Test_006_ConfigureViews.spec.ts' });
  assert.deepEqual([...groupFiles(specFrame)], ['playwright-e2e/tests/PlanningSpace/ViewsBatch/Test_006_ConfigureViews.spec.ts'], 'a frame in the spec is the spec, not tests/tests/');
  const prefixed = group('g', { tests: [{ spec: 'tests/PlanningSpace/A.spec.ts' }], location: 'playwright-e2e/util/common.util.ts › logMessage' });
  assert.deepEqual([...groupFiles(prefixed)], ['playwright-e2e/tests/PlanningSpace/A.spec.ts', 'playwright-e2e/util/common.util.ts']);
});

test('automation change: compared with the previous night from the index row, or the previous day file', () => {
  assert.deepEqual(automationChange(D, { sha: C }, null), { from: C, to: D });
  assert.deepEqual(automationChange(D, {}, { key: 'PS', sha: C }), { from: C, to: D }, 'older index rows have no sha');
  assert.equal(automationChange(D, { sha: D }, null), null);
  assert.equal(automationChange(D, null, null), null, 'no previous run');
  assert.equal(automationChange(null, { sha: C }, null), null);
});

test('draft and digest name the change', async () => {
  const [cluster] = await withSuspectChanges([group('g', { category: 'AUTOMATION_ISSUE' })], suites, { repository: REPO, changedFiles: async () => ['playwright-e2e/pageobjects/views.page.ts'] });
  const [drafted] = withDrafts([{ ...cluster, tests: [{ ...cluster.tests[0], name: 'Test 1', suite: 'PS', environment: 'INTEROP', gateway: 'AZURE' }] }], { suites });
  assert.match(drafted.draft.text, /Automation: {3}changed since the previous night: playwright-e2e\/pageobjects\/views\.page\.ts \(ccccccc -> ddddddd\)/);

  const day = { date: '2026-11-11', suites: [], categories: {}, widespread: [], clusters: [cluster] };
  const texts = buildCard(day, 'https://example.test/dashboard/').attachments[0].content.body.map((block) => block.text || '');
  assert.ok(texts.some((text) => text.endsWith('(1 failed, new; changed: planning-mfe, test code)')), texts.join('\n'));
});
