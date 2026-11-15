import type { Reporter, FullConfig, Suite, TestCase, FullResult } from '@playwright/test/reporter';
import * as path from 'path';
import * as https from 'https';
import { URL } from 'url';

// Visual Automation Teams reporter: posts an Adaptive Card summary to a webhook after the run.
// Non-breaking: no webhook set = does nothing; any send error is swallowed so the run never fails.
// Webhook order: VISUAL_TEAMS_WEBHOOK_URL -> TEAMS_WEBHOOK_URL -> PS_REPORT_MS_TEAMS_WEBHOOK.
const REPORT_DIR = path.resolve(__dirname, '..', 'reports', 'visual-report');

type FailureDetail = { title: string; artifacts: string[] };

function resolveWebhookUrl(): string {
  return (
    process.env.VISUAL_TEAMS_WEBHOOK_URL
    || process.env.TEAMS_WEBHOOK_URL
    || process.env.PS_REPORT_MS_TEAMS_WEBHOOK
    || ''
  ).trim();
}

class VisualTeamsReporter implements Reporter {
  private rootSuite: Suite | undefined;

  onBegin(_config: FullConfig, suite: Suite): void {
    this.rootSuite = suite;
  }

  async onEnd(result: FullResult): Promise<void> {
    const webhookUrl = resolveWebhookUrl();
    if (!webhookUrl) {
      console.log('[visual-teams-reporter] No Teams webhook configured (set VISUAL_TEAMS_WEBHOOK_URL). Skipping notification.');
      return;
    }

    const tests: TestCase[] = this.rootSuite ? this.rootSuite.allTests() : [];
    let passed = 0;
    let failed = 0;
    let flaky = 0;
    let skipped = 0;
    const failures: FailureDetail[] = [];

    for (const test of tests) {
      const outcome = test.outcome();
      if (outcome === 'expected') passed++;
      else if (outcome === 'flaky') flaky++;
      else if (outcome === 'skipped') skipped++;
      else failed++;

      if (outcome === 'unexpected') {
        const artifacts: string[] = [];
        for (const r of test.results) {
          for (const a of r.attachments) {
            if (a.path && /(-diff(?:-highlighted)?|-actual|-expected)\.png$/i.test(a.path)) {
              artifacts.push(a.path);
            }
          }
        }
        failures.push({ title: test.title, artifacts });
      }
    }

    const total = tests.length;
    const payload = this.buildAdaptiveCard(result.status, { total, passed, failed, flaky, skipped, failures });

    try {
      const ok = await this.postToTeams(webhookUrl, payload);
      console.log(`[visual-teams-reporter] Teams notification ${ok ? 'sent' : 'not sent'}.`);
    } catch (err) {
      console.log(`[visual-teams-reporter] Teams notification error (non-fatal): ${(err as Error).message}`);
    }
  }

  private buildAdaptiveCard(
    runStatus: FullResult['status'],
    s: { total: number; passed: number; failed: number; flaky: number; skipped: number; failures: FailureDetail[] }
  ): unknown {
    const status = s.failed > 0 ? 'FAILED' : (runStatus === 'passed' ? 'PASSED' : runStatus.toUpperCase());
    const title = 'Visual Automation Test Results - Playwright';
    const summaryText =
      `Status: ${status}  |  Total: ${s.total}  |  Passed: ${s.passed}  |  Failed: ${s.failed}`
      + (s.flaky ? `  |  Flaky: ${s.flaky}` : '')
      + (s.skipped ? `  |  Skipped: ${s.skipped}` : '');

    const body: unknown[] = [
      { type: 'TextBlock', size: 'Medium', weight: 'Bolder', text: title, wrap: true },
      { type: 'TextBlock', text: summaryText, wrap: true, spacing: 'Small' },
      { type: 'TextBlock', text: `Report: ${REPORT_DIR}`, wrap: true, spacing: 'Small', isSubtle: true }
    ];

    if (s.failures.length > 0) {
      const lines = s.failures.slice(0, 10).map(f => {
        const imgs = f.artifacts.length ? `\n${f.artifacts.map(p => `- ${p}`).join('\n')}` : '';
        return `• ${f.title}${imgs}`;
      });
      body.push({
        type: 'TextBlock',
        text: `Failed screenshots:\n${lines.join('\n')}`,
        wrap: true,
        spacing: 'Medium'
      });
    }

    return {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.4',
            body
          }
        }
      ]
    };
  }

  private postToTeams(webhookUrl: string, payload: unknown): Promise<boolean> {
    return new Promise((resolve) => {
      let target: URL;
      try {
        target = new URL(webhookUrl);
      } catch {
        console.log('[visual-teams-reporter] Webhook URL is invalid. Skipping notification.');
        return resolve(false);
      }

      const bodyStr = JSON.stringify(payload);
      const options: https.RequestOptions = {
        method: 'POST',
        hostname: target.hostname,
        path: target.pathname + target.search,
        port: target.port || 443,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr)
        }
      };

      const req = https.request(options, (res) => {
        res.on('data', () => { });
        res.on('end', () => {
          const ok = (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300;
          console.log(`[visual-teams-reporter] Teams webhook responded with status ${res.statusCode}.`);
          resolve(ok);
        });
      });
      req.on('error', (err) => {
        console.log(`[visual-teams-reporter] Failed to send Teams notification: ${err.message}`);
        resolve(false);
      });
      req.write(bodyStr);
      req.end();
    });
  }
}

export default VisualTeamsReporter;
