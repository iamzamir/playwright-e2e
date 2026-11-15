// Unit tests for the POM instability ranking (T7.1). Run: npm run test:triage
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { scanSource, enclosingMethod, resolveLocation, selectNights, rankPomMethods, renderMarkdown, regenerateCommand } = require('../rank-pom-methods');

const RUNS_DIR = path.join(__dirname, 'fixtures', 'pom-ranking', 'runs');
const SAMPLE_PAGE = [
  "import { Page } from '@playwright/test';",
  '',
  'export class SamplePage {',
  '  async openCard(name: string): Promise<void> {',
  '    await this.page.waitForTimeout(500);',
  '    await this.page.locator("//div[@title=\'card\']").click();',
  '  }',
  '',
  '  public async selectView(viewName: string): Promise<void> {',
  "    if (await this.page.locator('xpath=//li').isVisible()) {",
  "      await this.page.getByRole('button').click();",
  '    }',
  '  }',
  '',
  '  get viewList() {',
  "    return this.page.getByTestId('views');",
  '  }',
  '',
  '  closeAll = async (): Promise<void> => {',
  '    await this.page.keyboard.press(\'Escape\');',
  '  };',
  '}',
  '',
  'export async function helper(page: Page): Promise<void> {',
  '  await page.waitForTimeout(100);',
  '}'
].join('\n');

const SCANS = { 'pageobjects/sample.page.ts': scanSource(SAMPLE_PAGE) };
const getScan = (file) => SCANS[file] || null;

function loadFixtureNights() {
  return fs.readdirSync(RUNS_DIR).sort().map((date) => ({
    date,
    runs: fs.readdirSync(path.join(RUNS_DIR, date)).map((file) => JSON.parse(fs.readFileSync(path.join(RUNS_DIR, date, file), 'utf-8')))
  }));
}

test('scanSource finds class members, arrow properties and top-level functions with their debt', () => {
  const { methods } = SCANS['pageobjects/sample.page.ts'];
  assert.deepEqual(methods.map((method) => [method.name, method.start, method.end]), [
    ['openCard', 4, 8],
    ['selectView', 9, 14],
    ['viewList', 15, 18],
    ['closeAll', 19, 23],
    ['helper', 24, 26]
  ]);
  const byName = Object.fromEntries(methods.map((method) => [method.name, method]));
  assert.deepEqual([byName.openCard.xpath, byName.openCard.sleeps, byName.openCard.isVisible], [1, 1, 0]);
  assert.deepEqual([byName.selectView.xpath, byName.selectView.sleeps, byName.selectView.isVisible], [1, 0, 1]);
  assert.equal(byName.helper.className, null);
  assert.equal(enclosingMethod(SCANS['pageobjects/sample.page.ts'], 11).name, 'selectView');
  assert.equal(enclosingMethod(SCANS['pageobjects/sample.page.ts'], 2), null);
});

test('resolveLocation maps lines to methods and marks moved lines and missing files approximate', () => {
  const exact = resolveLocation({ file: 'pageobjects/sample.page.ts', line: 10, function: 'SamplePage.selectView' }, getScan);
  assert.deepEqual([exact.key, exact.approximate, exact.debt], ['pageobjects/sample.page.ts:selectView', false, { xpath: 1, sleeps: 0, isVisible: 1 }]);

  const moved = resolveLocation({ file: 'pageobjects/sample.page.ts', line: 16, function: 'SamplePage.openCard' }, getScan);
  assert.deepEqual([moved.method, moved.approximate], ['openCard', true]);

  const anonymous = resolveLocation({ file: 'pageobjects/sample.page.ts', line: 5, function: 'SamplePage.<anonymous>' }, getScan);
  assert.deepEqual([anonymous.method, anonymous.approximate], ['openCard', false]);

  const missing = resolveLocation({ file: 'pageobjects/removed.page.ts', line: 3, function: 'RemovedPage.doThing' }, getScan);
  assert.deepEqual([missing.key, missing.approximate, missing.debt], ['pageobjects/removed.page.ts:doThing', true, null]);

  // Renamed or removed since the run: keep the recorded name, never credit the method now at that line.
  const renamed = resolveLocation({ file: 'pageobjects/sample.page.ts', line: 5, function: 'SamplePage.openCardOld' }, getScan);
  assert.deepEqual([renamed.key, renamed.approximate, renamed.debt], ['pageobjects/sample.page.ts:openCardOld', true, null]);

  assert.equal(resolveLocation({ file: 'tests/PlanningSpace/Test_001.spec.ts', line: 3, function: null }, getScan), null);
  assert.equal(resolveLocation(null, getScan), null);
});

test('selectNights keeps the newest N nights up to --until', () => {
  const nights = ['2026-10-03', 'index.json', '2026-10-01', '2026-10-02'];
  assert.deepEqual(selectNights(nights, 2), ['2026-10-02', '2026-10-03']);
  assert.deepEqual(selectNights(nights, 30, '2026-10-02'), ['2026-10-01', '2026-10-02']);
});

test('rankPomMethods counts failures, flaky passes and blocked tests per POM method', () => {
  const nights = loadFixtureNights();
  // A manual re-run on the same night is ignored, as on the dashboard (scheduled run wins).
  nights[0].runs.push({
    suite: 'PW-PS-UI-INTEROP-LOCAL',
    runNumber: 12,
    trigger: 'workflow_dispatch',
    tests: [{ id: 'views-1', spec: 'x', name: 'manual', status: 'failed', error: { location: { file: 'pageobjects/sample.page.ts', line: 9, function: 'SamplePage.selectView' } } }]
  });

  const { rows, totals, dates } = rankPomMethods({ nights, getScan });
  assert.deepEqual(dates, ['2026-10-01', '2026-10-02']);
  assert.deepEqual(
    rows.map((row) => [row.rank, row.key, row.failures, row.flaky, row.blocked, row.nights, row.approximate]),
    [
      [1, 'pageobjects/sample.page.ts:openCard', 2, 0, 1, 2, true],
      [2, 'pageobjects/sample.page.ts:selectView', 1, 1, 2, 1, false],
      [3, 'pageobjects/removed.page.ts:doThing', 1, 0, 0, 1, true]
    ]
  );
  assert.deepEqual(totals, {
    nights: 2,
    runs: 2,
    failures: 6,
    failuresByArea: { pageobjects: 4, tests: 1, util: 1, other: 0, none: 0 },
    flaky: 2,
    flakyAttributed: 1,
    blocked: 3,
    blockedAttributed: 3,
    approximate: 2
  });
});

test('renderMarkdown writes the ranking table with debt columns and approximate markers', () => {
  const markdown = renderMarkdown(rankPomMethods({ nights: loadFixtureNights(), getScan }), { top: 2, generatedAt: '2026-10-09T00:00:00.000Z' });
  assert.match(markdown, /^# POM instability ranking \(2026-10-01 to 2026-10-02\)/);
  assert.match(markdown, /\| Rank \| File:method \| Failures \| Flaky \| Blocked \| Nights \| XPath \| Sleeps \| `isVisible` \|/);
  assert.match(markdown, /\| 1 \| `sample\.page\.ts:openCard` ~ \| 2 \| 0 \| 1 \| 2 \| 1 \| 1 \| 0 \|/);
  assert.match(markdown, /\| 2 \| `sample\.page\.ts:selectView` \| 1 \| 1 \| 2 \| 1 \| 1 \| 0 \| 1 \|/);
  assert.doesNotMatch(markdown, /removed\.page\.ts:doThing/);
  assert.match(markdown, /- 2× PlanningSpace\/Cards\/Test_002\.spec\.ts › TC1 open card/);
});

test('flaky passes are credited only from failures of the same test in the same suite', () => {
  const failure = { id: 't-1', spec: 's', name: 'n', status: 'failed', error: { location: { file: 'pageobjects/sample.page.ts', line: 10, function: 'SamplePage.selectView' } } };
  const nights = [
    { date: '2026-10-01', runs: [{ suite: 'PO-QA', runNumber: 1, trigger: 'schedule', tests: [failure] }] },
    { date: '2026-10-02', runs: [
      { suite: 'PO-QA', runNumber: 2, trigger: 'schedule', tests: [{ id: 't-1', status: 'passed', flaky: true }] },
      { suite: 'PO-INTEROP', runNumber: 3, trigger: 'schedule', tests: [{ id: 't-1', status: 'passed', flaky: true }] }
    ] }
  ];
  const { rows, totals } = rankPomMethods({ nights, getScan });
  assert.deepEqual([rows[0].flaky, totals.flaky, totals.flakyAttributed], [1, 2, 1]);
});

test('regenerateCommand pins the window and keeps the source arguments', () => {
  const dates = ['2026-10-06', '2026-10-08'];
  assert.equal(regenerateCommand({ days: 30, top: 30, dates, repo: 'BY-Product-Development/plan-sop-ui-automation', ref: 'gh-pages' }),
    'cd playwright-e2e\nnpm run triage:rank-pom -- --days 30 --until 2026-10-08 --out <file.md>');
  assert.equal(regenerateCommand({ days: 7, top: 10, dates, runsDir: "C:\\data dir\\it's runs" }),
    "cd playwright-e2e\nnpm run triage:rank-pom -- --days 7 --until 2026-10-08 --top 10 --runs-dir 'C:\\data dir\\it'\\''s runs' --out <file.md>");
  assert.equal(regenerateCommand({ days: 30, top: 30, dates: [], repo: 'me/fork', ref: 'pages' }),
    'cd playwright-e2e\nnpm run triage:rank-pom -- --days 30 --repo me/fork --ref pages --out <file.md>');
});

test('CLI reads a local runs folder and writes the report', () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pom-rank-')), 'ranking.md');
  execFileSync(process.execPath, [path.join(__dirname, '..', 'rank-pom-methods.js'), '--runs-dir', RUNS_DIR, '--days', '1', '--out', out], { stdio: 'pipe' });
  const markdown = fs.readFileSync(out, 'utf-8');
  assert.match(markdown, /Nights: 1 \(2026-10-02\)/);
  assert.match(markdown, /`removed\.page\.ts:doThing` ~ \| 1 \| 0 \| 0 \| 1 \| n\/a \| n\/a \| n\/a \|/);
  assert.match(markdown, /--days 1 --until 2026-10-02 --runs-dir /);
});

test('CLI rejects an --until that is not a real date', () => {
  const run = () => execFileSync(process.execPath, [path.join(__dirname, '..', 'rank-pom-methods.js'), '--runs-dir', RUNS_DIR, '--until', '2026-02-31'], { stdio: 'pipe' });
  assert.throws(run, /Invalid --until "2026-02-31"/);
});
