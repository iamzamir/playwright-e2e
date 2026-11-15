import { defineConfig } from '@playwright/test';
require('./setup.js');
import * as path from 'path';
import * as fs from 'fs';
import { getTimeout } from '../constants/timeouts';
import { DESTRUCTIVE_SPEC_GLOB, isDataSetupSuite, isDestructiveRunAllowed } from '../util/destructive-guard.util';

process.env.PW_LOCAL_RUN_ID ??= `local${Date.now().toString(36)}`;

const SUITES_DIR = path.join(__dirname, '../tests/TestSuites');

function listSuites(): string[] {
  return fs.readdirSync(SUITES_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_')).map((f) => f.replace(/\.json$/, '')).sort();
}

function loadSpecificTests(): string[] {
  console.log('Using specific test configuration');
  const envTests = (process.env.SPECIFIC_TESTS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (envTests.length > 0) {
    return envTests.map((file) => file.replace(/^\*\*\/playwright-e2e\/tests\//, '**/'));
  }

  const localConfigPath = path.join(__dirname, 'specific-tests.local.json');
  if (fs.existsSync(localConfigPath)) {
    const localData = JSON.parse(fs.readFileSync(localConfigPath, 'utf-8'));
    const files: string[] = (localData.testFiles || []).map((s: string) => s.trim()).filter(Boolean);
    if (files.length > 0) {
      return files.map((file) => file.replace(/^\*\*\/playwright-e2e\/tests\//, '**/'));
    }
  }

  throw new Error('USE_SPECIFIC_TESTS=true but neither SPECIFIC_TESTS nor configs/specific-tests.local.json lists any spec.');
}

function loadTestSuite(): string[] {
  const suiteName = (process.env.SUITENAME || '').trim();
  console.log(`Suite Name: ${process.env.SUITENAME}`);
  console.log(`USE_SPECIFIC_TESTS: ${process.env.USE_SPECIFIC_TESTS}`);
  if (isDataSetupSuite(suiteName) && !isDestructiveRunAllowed()) {
    throw new Error(`SUITENAME=${suiteName} requires ALLOW_DESTRUCTIVE=true (DataSetup specs change or delete shared data).`);
  }
  if (process.env.USE_SPECIFIC_TESTS === 'true') {
    return loadSpecificTests();
  }
  if (!suiteName) {
    return ['**/*.spec.ts'];
  }
  const availableSuites = listSuites();
  const suiteFilePath = path.join(SUITES_DIR, `${suiteName}.json`);
  if (!availableSuites.includes(suiteName)) {
    throw new Error(`Suite "${suiteName}" not found at ${suiteFilePath}. Available suites: ${availableSuites.join(', ')}. Unset SUITENAME to run by path.`);
  }
  const files: string[] = JSON.parse(fs.readFileSync(suiteFilePath, 'utf-8')).testFiles || [];
  if (files.length === 0) {
    throw new Error(`Suite "${suiteName}" has no testFiles.`);
  }
  console.log(`Loading test suite: ${suiteName}`);
  return files.map((file) => file.replace(/^\*\*\/playwright-e2e\/tests\//, '**/'));
}

const testSpecs = loadTestSuite();
const isHeadless = (process.env.HEADLESS || '').toLowerCase() === 'true';

// Comma-separated spec paths/globs excluded for a single run (used by CI batches to park a spec).
const testIgnore = (process.env.TEST_IGNORE || '')
  .split(',')
  .map((pattern) => pattern.trim())
  .filter(Boolean)
  .map((pattern) => (pattern.startsWith('**/') ? pattern : `**/${pattern}`));

// testIgnore also applies to spec paths passed on the command line, so a bare or path-based run can't
// reach DataSetupBatch without the flag.
const allowDestructive = isDestructiveRunAllowed();
if (!allowDestructive) {
  testIgnore.push(DESTRUCTIVE_SPEC_GLOB);
}
console.log(`Destructive DataSetup specs: ${allowDestructive ? 'ENABLED (ALLOW_DESTRUCTIVE=true)' : 'excluded (set ALLOW_DESTRUCTIVE=true to run them)'}`);

function shouldEnableGlobalSetup(specs: string[]): boolean {
  // Manual switch to disable global setup for any run.
  if ((process.env.PW_ENABLE_GLOBAL_SETUP || '').toLowerCase() === 'false') {
    return false;
  }

  const suiteName = (process.env.SUITENAME || '').toLowerCase();
  if (suiteName.includes('backend')) {
    return false;
  }

  const specText = specs.join(' ').toLowerCase();
  if (specText.includes('processorchestrationbackend')) {
    return false;
  }

  const cliArgs = process.argv.join(' ').toLowerCase();
  if (cliArgs.includes('processorchestrationbackend')) {
    return false;
  }

  return true;
}

const enableGlobalSetup = shouldEnableGlobalSetup(testSpecs);
console.log(`Global setup enabled: ${enableGlobalSetup}`);

// Set when several Playwright processes run concurrently against one checkout
// (e.g. the PO Backend parallel batches) so each gets its own report folder.
const reportTag = process.env.PW_REPORT_TAG || '';
const htmlReportDir = path.resolve(__dirname, '..', 'reports', 'html-report', reportTag);
const monocartReportFile = process.env.MONOCART_REPORT_PATH
  ? path.resolve(__dirname, '..', process.env.MONOCART_REPORT_PATH)
  : path.resolve(__dirname, '..', 'reports', 'monocart-report', reportTag, 'index.html');
const outputDir = reportTag
  ? path.resolve(__dirname, '..', 'test-results', reportTag)
  : path.resolve(__dirname, '..', 'test-results');

const reporters: any[] = [
  ['list'],
  // Single-file interactive report; downloadable as a CI artifact for offline viewing.
  ['monocart-reporter', {
    name: `PS Automation - ${process.env.SUITENAME || reportTag || 'Default'} (${process.env.ENVIRONMENT || 'INTEROP'})`,
    outputFile: monocartReportFile
  }],
  ['allure-playwright', {
    resultsDir: path.resolve(__dirname, '..', 'reports', 'allure-results'),
    suiteTitle: 'PS Automation Test Suite',
    detail: false,
    environmentInfo: {
      Environment: process.env.ENVIRONMENT || 'INTEROP',
      Gateway: process.env.GATEWAY_TYPE || 'AZURE',
      RealmKey: process.env.REALM_KEY || 'cbpf-test23',
      Suite: process.env.SUITENAME || 'Default',
      OS: process.platform,
      NodeVersion: process.version
    }
  }],
  // Strips heavy trace.zip and video binaries from Allure results on CI to keep GitHub Pages lean.
  [require.resolve('./allure-trace-filter'), {}]
];

// For local runs, keep Playwright's native multi-file HTML report for trace inspection and local debugging.
// For CI runs, omit it by default to avoid redundant artifact storage, unless explicitly enabled via PW_ENABLE_HTML_REPORT=true.
const enableHtmlReport = !process.env.CI || (process.env.PW_ENABLE_HTML_REPORT || '').toLowerCase() === 'true';
if (enableHtmlReport) {
  reporters.splice(1, 0, ['html', { outputFolder: htmlReportDir, open: 'never' }]);
}

const defaultRetries = process.env.CI ? 1 : 0;
const configuredRetries = process.env.PW_RETRIES !== undefined && process.env.PW_RETRIES !== ''
  ? parseInt(process.env.PW_RETRIES, 10)
  : defaultRetries;
const retries = Number.isInteger(configuredRetries) && configuredRetries >= 0
  ? configuredRetries
  : defaultRetries;

export default defineConfig({
  globalSetup: enableGlobalSetup ? require.resolve('./global-setup') : undefined,
  globalTeardown: require.resolve('./global-teardown'),
  testDir: '../tests',
  testMatch: testSpecs,
  testIgnore,
  outputDir,
  fullyParallel: false,  // Enable parallel execution
  timeout: getTimeout('TEST'),
  forbidOnly: !!process.env.CI,
  retries,
  workers: process.env.CI ? 5 : 1,
  reporter: reporters,
  use: {
    headless: isHeadless,
    viewport: process.env.CI ? { width: 1920, height: 1080 } : null,
    trace: {
      mode: (process.env.CI && retries > 0) ? 'on-first-retry' : 'retain-on-failure',
      sources: false,
      attachments: false,
      screenshots: true,
      snapshots: true,
    },
    actionTimeout: getTimeout('ACTION'),
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'Google Chrome',
      use: {
        channel: 'chrome',
        launchOptions: {
          args: process.env.CI
            ? ['--disable-notifications', '--disable-infobars', '--disable-extensions']
            : ['--disable-notifications', '--disable-infobars', '--disable-extensions', '--start-maximized'],
        },
        headless: isHeadless
      }
    }
  ]
});
