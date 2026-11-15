import { defineConfig } from '@playwright/test';
require('./setup.js');
import * as path from 'path';
import { DESTRUCTIVE_SPEC_GLOB, isDestructiveRunAllowed } from '../util/destructive-guard.util';

const isCI = !!process.env.CI;
const enableHtmlReport = process.env.PW_ENABLE_HTML_REPORT === 'true' || !isCI;
const defaultRetries = isCI ? 1 : 0;
const configuredRetries = process.env.PW_RETRIES !== undefined && process.env.PW_RETRIES !== ''
  ? parseInt(process.env.PW_RETRIES, 10)
  : defaultRetries;
const retries = Number.isInteger(configuredRetries) && configuredRetries >= 0
  ? configuredRetries
  : defaultRetries;

const reporters: any[] = [
  ['list'],
  ['monocart-reporter', {
    name: `PS Automation - Sauce (${process.env.ENVIRONMENT || 'INTEROP'})`,
    outputFile: path.resolve(__dirname, '..', 'reports', 'monocart-report', 'index.html')
  }],
  ['allure-playwright', {
    resultsDir: path.resolve(__dirname, '..', 'reports', 'allure-results'),
    detail: true,
  }],
  [path.resolve(__dirname, 'allure-trace-filter.ts')],
];

if (enableHtmlReport) {
  reporters.splice(1, 0, ['html', { outputFolder: path.resolve(__dirname, '..', 'reports', 'html-report'), open: 'never' }]);
}

export default defineConfig({
  // testDir stays at playwright-e2e/ because the .sauce/*.yml suites pass
  // testMatch paths relative to it (tests/...). Only match Playwright specs,
  // so the node:test files under scripts/ are not loaded.
  testDir: '..',
  testMatch: 'tests/**/*.spec.ts',
  testIgnore: isDestructiveRunAllowed() ? [] : [DESTRUCTIVE_SPEC_GLOB],
  outputDir: path.resolve(__dirname, '..', 'test-results'),
  timeout: 300000,
  retries,
  grep: process.env.TEST_GREP_PATTERN ? new RegExp(process.env.TEST_GREP_PATTERN) : undefined,
  reporter: reporters,
  use: {
    headless: false, // change to true for CI/cloud environments like Sauce Labs
    actionTimeout: 60000,
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: null,
    launchOptions: {
      args: ['--window-size=1920,1080', '--start-maximized', '--disable-notifications', '--disable-infobars', '--disable-extensions']
    },
  }
});