import type { Reporter } from '@playwright/test/reporter';
import * as path from 'path';
// Delegate core JSON cleaning and unlinking logic to the shared script
const { stripAllureTraces } = require('../scripts/strip-allure-traces.js');

// Allure trace/video attachment filter for CI runs.
//
// Playwright retains traces on failure into `test-results/` (uploaded as CI artifacts).
// However, allure-playwright also attaches the raw `trace.zip` and video `.webm` files to
// `reports/allure-results/`. When `allure generate` is deployed to GitHub Pages, committing
// these non-compressible 20-80MB binaries inflates the `gh-pages` branch and hits GitHub limits.
//
// This reporter runs in onEnd after allure-playwright has written every *-result.json.
// When running in CI (or when PW_STRIP_ALLURE_TRACES=true), it cleans trace and video attachments
// from the Allure result JSONs and unlinks the heavy files from `reports/allure-results/`.
//
// For parallel multi-process runs (where multiple Playwright processes share `allure-results`),
// set `PW_DISABLE_INLINE_ALLURE_FILTER=true` to prevent race conditions during test execution;
// the workflow will then execute `node scripts/strip-allure-traces.js` once after all processes complete.

const ALLURE_RESULTS_DIR = path.resolve(__dirname, '..', 'reports', 'allure-results');

class AllureTraceFilter implements Reporter {
  async onEnd(): Promise<void> {
    if (process.env.PW_DISABLE_INLINE_ALLURE_FILTER === 'true') {
      return;
    }

    const shouldStrip = !!process.env.CI || (process.env.PW_STRIP_ALLURE_TRACES || '').toLowerCase() === 'true';
    if (!shouldStrip) {
      return;
    }

    try {
      stripAllureTraces(ALLURE_RESULTS_DIR);
    } catch (error) {
      console.warn(`[allure-trace-filter] Cleanup skipped (non-fatal): ${(error as Error).message}`);
    }
  }
}

export { stripAllureTraces };
export default AllureTraceFilter;
