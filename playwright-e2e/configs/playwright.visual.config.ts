import { defineConfig } from '@playwright/test';
require('./setup.js');
import * as path from 'path';
import * as fs from 'fs';
import { getTimeout } from '../constants/timeouts';
import { VISUAL_DIFF_DEFAULTS } from '../constants/visual';

// Single switch that activates the gated visual-validation fixture; unset in functional runs.
process.env.VISUAL_VALIDATION = 'true';
// Tolerance mode by default: strict zero-tolerance fails every screen on anti-aliasing noise. Set VISUAL_STRICT_COMPARE=true to opt back in.
process.env.VISUAL_STRICT_COMPARE = process.env.VISUAL_STRICT_COMPARE || 'false';

const isHeadless = (process.env.HEADLESS || '').toLowerCase() === 'true';
const ENVIRONMENT_NAME = process.env.ENVIRONMENT || process.env.PSENV || 'INTEROP';
// Suite JSONs live in their own folder, separate from the visual spec files.
const VISUAL_SUITES_DIR = path.resolve(__dirname, '..', 'tests', 'VisualAutomation', 'VisualSuites');
// Rooted at VisualSpecs so {testFileDir} resolves to the area folder (PlanningSpace, ProcessOrchestration).
const TESTS_DIR = path.resolve(__dirname, '..', 'tests', 'VisualAutomation', 'VisualSpecs');
// Lower-case `testdata` is the on-disk folder name; Linux runners are case-sensitive.
const VISUAL_BASELINE_DIR = path.resolve(__dirname, '..', 'testdata', ENVIRONMENT_NAME, 'VisualBaseValidations');
const VISUAL_OUTPUT_DIR = path.resolve(__dirname, '..', 'test-results', 'visual');
const VISUAL_REPORT_DIR = path.resolve(__dirname, '..', 'reports', 'visual-report');
// Reuse the functional Allure folder so `npm run report` shows screenshots and diffs together.
const ALLURE_RESULTS_DIR = path.resolve(__dirname, '..', 'reports', 'allure-results');

const SUITE_NAME = process.env.VISUAL_SUITE || process.env.SUITENAME || 'POSmokeVisual';

function loadVisualSuite(): string[] {
  const suiteName = SUITE_NAME;
  console.log(`Visual Suite Name: ${suiteName}`);
  const suiteFilePath = path.join(VISUAL_SUITES_DIR, `${suiteName}.json`);
  if (!fs.existsSync(suiteFilePath)) {
    // Fail fast instead of silently running every spec in tests/ — a mismatched
    // VISUAL_SUITE name previously ran the whole functional tree with no
    // visual diff snapshots to show for it (see playwright-e2e/reports history).
    throw new Error(
      `Visual suite "${suiteName}" not found at ${suiteFilePath}. `
      + `Check VISUAL_SUITE/SUITENAME against files in ${VISUAL_SUITES_DIR}.`
    );
  }
  const suiteData = JSON.parse(fs.readFileSync(suiteFilePath, 'utf-8'));
  console.log(`Loading visual suite: ${suiteName}`);
  return suiteData.testFiles || [];
}

// Reuse existing specs from the suite JSON; no spec files are duplicated.
const visualSpecs = loadVisualSuite();

// Reuse cached auth via global-setup; disable with PW_ENABLE_GLOBAL_SETUP=false for local reruns.
const enableGlobalSetup = (process.env.PW_ENABLE_GLOBAL_SETUP || '').toLowerCase() !== 'false';

const enableVisualHtmlReport = !process.env.CI || (process.env.PW_ENABLE_HTML_REPORT || '').toLowerCase() === 'true';

const visualReporters: any[] = [
  ['list'],
  ['json', { outputFile: path.join(VISUAL_REPORT_DIR, 'visual-results.json') }],
  ['monocart-reporter', {
    name: `PS Visual Automation - ${SUITE_NAME} (${ENVIRONMENT_NAME})`,
    outputFile: path.resolve(__dirname, '..', 'reports', 'monocart-report', 'index.html')
  }],
  // Publish screenshot/diff attachments to the shared Allure results folder.
  ['allure-playwright', {
    resultsDir: ALLURE_RESULTS_DIR,
    suiteTitle: 'PS Visual Automation Suite',
    detail: false,
    environmentInfo: {
      Environment: process.env.ENVIRONMENT || 'INTEROP',
      Suite: SUITE_NAME,
      Mode: 'Visual Validation',
      OS: process.platform,
      NodeVersion: process.version
    }
  }],
  // Strips Playwright's default expected/actual/diff screenshots from the
  // Allure results so only the in-place highlighted pair is shown.
  [require.resolve('./visual-attachment-filter'), {}],
  // Posts a Teams summary at run end; no-op when no webhook env var is set.
  [require.resolve('./visual-teams-reporter'), {}]
];

if (enableVisualHtmlReport) {
  visualReporters.splice(1, 0, ['html', { outputFolder: VISUAL_REPORT_DIR, open: 'never' }]);
}

const defaultVisualRetries = 0;
const configuredVisualRetries = process.env.PW_RETRIES !== undefined && process.env.PW_RETRIES !== ''
  ? parseInt(process.env.PW_RETRIES, 10)
  : defaultVisualRetries;
const visualRetries = Number.isInteger(configuredVisualRetries) && configuredVisualRetries >= 0
  ? configuredVisualRetries
  : defaultVisualRetries;

// Spec files run in parallel, one test each (T9.11). 3 workers fit an 8-core runner, as PSMockedBatch uses. The
// sign-out specs (PS 007/008) already overlap the 17-lane PS nightly with the same users, so they get no separate lane:
// a dependent project would be skipped whenever any other visual test failed. PW_VISUAL_WORKERS=1 restores serial runs.
const defaultVisualWorkers = 3;
const configuredVisualWorkers = parseInt(process.env.PW_VISUAL_WORKERS || '', 10);
const visualWorkers = Number.isInteger(configuredVisualWorkers) && configuredVisualWorkers >= 1
  ? configuredVisualWorkers
  : defaultVisualWorkers;

export default defineConfig({
  globalSetup: enableGlobalSetup ? require.resolve('./global-setup') : undefined,
  testDir: TESTS_DIR,
  testMatch: visualSpecs,
  outputDir: VISUAL_OUTPUT_DIR,
  // Baselines mirror the spec folder layout, independent of which suite runs the spec.
  snapshotPathTemplate: path.join(VISUAL_BASELINE_DIR, '{testFileDir}', '{arg}{ext}'),
  // Compare-only by default; `--update-snapshots` on the CLI still overrides this.
  updateSnapshots: 'none',
  fullyParallel: false,
  timeout: getTimeout('TEST'),
  forbidOnly: !!process.env.CI,
  retries: visualRetries,
  workers: visualWorkers,
  reporter: visualReporters,
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      threshold: VISUAL_DIFF_DEFAULTS.threshold,
      maxDiffPixelRatio: VISUAL_DIFF_DEFAULTS.maxDiffPixelRatio,
      maxDiffPixels: VISUAL_DIFF_DEFAULTS.maxDiffPixels
    }
  },
  use: {
    headless: isHeadless,
    viewport: { width: 1920, height: 1080 },
    trace: 'off',
    actionTimeout: getTimeout('ACTION'),
    // Keep Allure focused on visual-comparison artifacts (expected/actual/diff),
    // not generic failure screenshots from functional-style capture.
    screenshot: 'off',
    video: 'off'
  },
  projects: [
    {
      name: 'Google Chrome',
      use: {
        channel: 'chrome',
        launchOptions: {
          args: ['--disable-notifications', '--disable-infobars', '--disable-extensions']
        },
        headless: isHeadless
      }
    }
  ]
});
