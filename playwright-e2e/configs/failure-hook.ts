import type { Page, TestInfo } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { getCleanDom, getAccessibilityTree } from '../util/dom-cleaner';

/**
 * Failure-capture hook.
 *
 * On a failing test, captures the cleaned DOM, the ARIA tree, and a JSON
 * context packet (title, file, error, URL, timestamp) so the AI healer
 * (`playwright-healer` agent) can diagnose selector drift against real
 * evidence instead of guessing.
 *
 * Two output styles are produced:
 * - Fixed "latest failure" files under `reports/snapshots/` — a predictable
 *   path the healer always reads (`failure-dom.html`, `failure-aria.yaml`,
 *   `failure-context.json`).
 * - Per-test copies attached to the Playwright/Allure report for history.
 *
 * This is best-effort: any error here is swallowed so it never masks the
 * original test failure.
 */

const SNAPSHOT_DIR = path.resolve(__dirname, '../reports/snapshots');

/** Light redaction for tokens that may appear in URLs or error text. */
function redact(input: string): string {
  return input
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}\.[A-Za-z0-9._-]{10,}\b/g, '[REDACTED_JWT]')
    .replace(/((?:access_token|refresh_token|id_token|code|token)=)[^&\s"']+/gi, '$1[REDACTED]')
    .replace(/(bearer\s+)[A-Za-z0-9._-]+/gi, '$1[REDACTED]');
}

export async function captureFailureState(page: Page, testInfo: TestInfo): Promise<void> {
  try {
    console.log(`[Failure Hook] Capturing state for failing test: "${testInfo.title}"...`);

    const cleanDom = redact(await getCleanDom(page));
    let cleanAria = '';
    try {
      cleanAria = redact(await getAccessibilityTree(page));
    } catch (e) {
      console.warn('[Failure Hook] Could not capture accessibility tree:', e);
    }

    const context = {
      testTitle: testInfo.title,
      testFile: path.relative(process.cwd(), testInfo.file),
      status: testInfo.status,
      expectedStatus: testInfo.expectedStatus,
      error: redact(testInfo.errors.map(e => e.message || e.value || '').join('\n\n')),
      url: redact(page.url()),
      timestamp: new Date().toISOString()
    };
    const contextJson = JSON.stringify(context, null, 2);

    if (!fs.existsSync(SNAPSHOT_DIR)) {
      fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    }

    // Fixed "latest failure" artifacts — the path the healer agent reads.
    const htmlPath = path.join(SNAPSHOT_DIR, 'failure-dom.html');
    const yamlPath = path.join(SNAPSHOT_DIR, 'failure-aria.yaml');
    const jsonPath = path.join(SNAPSHOT_DIR, 'failure-context.json');
    fs.writeFileSync(htmlPath, cleanDom, 'utf-8');
    fs.writeFileSync(yamlPath, cleanAria, 'utf-8');
    fs.writeFileSync(jsonPath, contextJson, 'utf-8');

    // Per-test copies attached to the report for history.
    await testInfo.attach('failure-dom.html', { body: Buffer.from(cleanDom, 'utf-8'), contentType: 'text/html' });
    await testInfo.attach('failure-aria.yaml', { body: Buffer.from(cleanAria, 'utf-8'), contentType: 'text/yaml' });
    await testInfo.attach('failure-context.json', { body: Buffer.from(contextJson, 'utf-8'), contentType: 'application/json' });

    console.log('[Failure Hook] Failure state captured. Heal with the playwright-healer agent using:');
    console.log(`  DOM:     file:///${htmlPath.replace(/\\/g, '/')}`);
    console.log(`  ARIA:    file:///${yamlPath.replace(/\\/g, '/')}`);
    console.log(`  Context: file:///${jsonPath.replace(/\\/g, '/')}`);
  } catch (error) {
    console.error('[Failure Hook] Error capturing failure state (non-fatal):', error);
  }
}
