import type { Reporter } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

// Visual attachment filter (Allure post-processing).
//
// The visual framework attaches its own in-place highlighted pair
// ("expected (diff highlighted).png" / "actual (diff highlighted).png") on a
// screenshot mismatch. Playwright's `toHaveScreenshot` additionally records its
// default expected / actual / diff images (as Allure steps) plus a top-level
// Allure image-diff widget. This reporter removes those defaults after the run
// so the report shows ONLY the highlighted pair.
//
// Runs in onEnd, after allure-playwright has written every *-result.json, and
// before `allure generate`. Best-effort and non-fatal.

const ALLURE_RESULTS_DIR = path.resolve(__dirname, '..', 'reports', 'allure-results');
const DEFAULT_SNAPSHOT_STEP = /-(expected|actual|diff)\.png$/i;
const ALLURE_IMAGE_DIFF_TYPE = 'application/vnd.allure.image.diff';

interface AllureAttachment {
  name?: string;
  type?: string;
  source?: string;
}

interface AllureStep {
  name?: string;
  attachments?: AllureAttachment[];
  steps?: AllureStep[];
}

interface AllureResult {
  attachments?: AllureAttachment[];
  steps?: AllureStep[];
}

function collectSources(step: AllureStep, out: string[]): void {
  for (const attachment of step.attachments ?? []) {
    if (attachment.source) {
      out.push(attachment.source);
    }
  }
  for (const child of step.steps ?? []) {
    collectSources(child, out);
  }
}

class VisualAttachmentFilter implements Reporter {
  async onEnd(): Promise<void> {
    try {
      if (!fs.existsSync(ALLURE_RESULTS_DIR)) {
        return;
      }

      const resultFiles = fs.readdirSync(ALLURE_RESULTS_DIR).filter(file => file.endsWith('-result.json'));

      for (const file of resultFiles) {
        const fullPath = path.join(ALLURE_RESULTS_DIR, file);

        let result: AllureResult;
        try {
          result = JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as AllureResult;
        } catch {
          continue;
        }

        const removedSources: string[] = [];
        let changed = false;

        // Drop the default expected / actual / diff screenshot steps.
        if (Array.isArray(result.steps)) {
          const keptSteps: AllureStep[] = [];
          for (const step of result.steps) {
            if (typeof step.name === 'string' && DEFAULT_SNAPSHOT_STEP.test(step.name)) {
              collectSources(step, removedSources);
              changed = true;
              continue;
            }
            keptSteps.push(step);
          }
          result.steps = keptSteps;
        }

        // Drop the top-level Allure image-diff widget(s).
        if (Array.isArray(result.attachments)) {
          const keptAttachments: AllureAttachment[] = [];
          for (const attachment of result.attachments) {
            if (attachment.type === ALLURE_IMAGE_DIFF_TYPE) {
              if (attachment.source) {
                removedSources.push(attachment.source);
              }
              changed = true;
              continue;
            }
            keptAttachments.push(attachment);
          }
          result.attachments = keptAttachments;
        }

        if (!changed) {
          continue;
        }

        fs.writeFileSync(fullPath, JSON.stringify(result));

        for (const source of removedSources) {
          const sourcePath = path.join(ALLURE_RESULTS_DIR, source);
          try {
            if (fs.existsSync(sourcePath)) {
              fs.unlinkSync(sourcePath);
            }
          } catch {
            // Orphaned source file removal is best-effort.
          }
        }
      }
    } catch (error) {
      console.warn(`[visual-attachment-filter] Cleanup skipped (non-fatal): ${(error as Error).message}`);
    }
  }
}

export default VisualAttachmentFilter;
