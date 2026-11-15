// Visual validation helpers.
//
// Two capabilities are exposed:
//   1. waitForPageFullyLoaded(page) — block until the selected page has finished
//      loading (DOM ready, network quiet, web-fonts resolved, no in-flight
//      animations) so a full-page baseline is captured against a settled UI.
//   2. validateAreaSnapshot(...) — pixel-compare a single region (a locator)
//      instead of the whole viewport, so a spec can assert just the part of the
//      screen it cares about.
//
// Both reuse Playwright's native `toHaveScreenshot` so the baselines are stored
// under the same per-suite folder configured in playwright.visual.config.ts.

import { expect } from '@playwright/test';
import type { Locator, Page, TestInfo } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { getTimeout } from '../constants/timeouts';
import { generateHighlightedDiffPair, compositeRegionOntoFullPage } from './visual-diff.util';
import { VISUAL_DIFF_DEFAULTS } from '../constants/visual';

export interface PageLoadOptions {
  // Hard ceiling for the whole "fully loaded" wait.
  timeout?: number;
  // Upper bound spent waiting for the network to go idle (best-effort).
  networkIdleTimeout?: number;
  // Upper bound spent waiting for the DOM to stop changing (best-effort).
  domStableTimeout?: number;
  // Per-comparison tolerance; falls back to the config-level default when unset.
  maxDiffPixelRatio?: number;
  // Absolute changed-pixel limit; fails if exceeded.
  maxDiffPixels?: number;
  // Pixel comparison sensitivity threshold.
  threshold?: number;
  // Regions to blank out before comparison (dynamic content, live data, etc.).
  mask?: Locator[];
  // Mask the portal header icons and hide scrollbars (see STABLE_CAPTURE_STYLE). Use with mocked data (`useVisualApiHar`).
  stableCapture?: boolean;
}

/**
 * Portal header icons outside the app under test: realm tag, AI assistant, collaboration, notification badge (`99+`).
 * They come and go with portal releases and per-user notification counts (visual run 78, 2026-11-12).
 */
const PORTAL_HEADER_ICONS_SELECTOR = '[data-testid="lui-portal-appbar-icons-container"]';

/**
 * CSS applied to the page and its frames during a `stableCapture` snapshot; the file says why each rule is there.
 * `toHaveScreenshot` takes only `stylePath` (it silently ignores `style`).
 */
const STABLE_CAPTURE_STYLE_PATH = path.resolve(__dirname, '..', 'constants', 'visual-stable-capture.css');

type CaptureOptions = { mask?: Locator[]; stylePath?: string };

const resolveCaptureOptions = (page: Page, options: { mask?: Locator[]; stableCapture?: boolean }): CaptureOptions => {
  if (!options.stableCapture) {
    return { mask: options.mask };
  }
  return { mask: [...(options.mask ?? []), page.locator(PORTAL_HEADER_ICONS_SELECTOR)], stylePath: STABLE_CAPTURE_STYLE_PATH };
};

/**
 * Waits until two consecutive captures are identical. Without it, a seeded baseline caught the View Settings dialog
 * mid-load (spinner, Save disabled) although Save had already been enabled once (2026-11-12). Best-effort: returns at
 * the deadline and lets the comparison report what it sees.
 */
const waitForStableCapture = async (take: () => Promise<Buffer>, timeout: number): Promise<void> => {
  let previous = await take();
  await expect.poll(async () => {
    const current = await take();
    const isStable = current.equals(previous);
    previous = current;
    return isStable;
  }, { timeout, intervals: [250] }).toBe(true).catch(() => undefined);
};

/**
 * Options for the helper's own `page.screenshot` / `locator.screenshot` calls (seeded baselines, the stability wait,
 * report images). They take the CSS as a string, and they repeat the `toHaveScreenshot` defaults from
 * `playwright.visual.config.ts` (animations disabled, caret hidden), so a raw capture matches what is compared.
 */
const toScreenshotOptions = (capture: CaptureOptions): { mask?: Locator[]; style?: string; animations: 'disabled'; caret: 'hide' } => ({
  mask: capture.mask,
  style: capture.stylePath ? fs.readFileSync(capture.stylePath, 'utf-8') : undefined,
  animations: 'disabled',
  caret: 'hide',
});

export interface AreaSnapshotOptions {
  // Max time to wait for the target region to become visible.
  timeout?: number;
  // Per-comparison tolerance; falls back to the config-level default when unset.
  maxDiffPixelRatio?: number;
  // Absolute changed-pixel limit; fails if exceeded.
  maxDiffPixels?: number;
  // Pixel comparison sensitivity threshold.
  threshold?: number;
  // Regions to blank out before comparison (dynamic content, timestamps, etc.).
  mask?: Locator[];
  // See PageLoadOptions.stableCapture.
  stableCapture?: boolean;
}

type DiffStats = {
  diffPixels: number;
  totalPixels: number;
  diffRatio: number;
  regionCount: number;
};

type VisualArtifactPaths = {
  baselinePath: string;
  actualPath: string;
  stats: DiffStats;
};

// Mirrors Playwright's snapshot-path sanitization so attachment names match the
// baseline file on disk (e.g. Test-001-PowerBarPOVisualValidation.png).
const sanitize = (value: string, maxLength: number = 60): string => {
  return value
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength) || 'unknown';
};

// Playwright defaults `updateSnapshots` to 'missing', which is a compare run —
// only the explicit update modes may bypass the baseline-missing guard.
const SNAPSHOT_UPDATE_MODES = new Set(['all', 'changed']);

const isUpdateSnapshotsRun = (testInfo: TestInfo): boolean => {
  const configValue = String((testInfo.config as { updateSnapshots?: unknown }).updateSnapshots ?? '').toLowerCase();
  if (SNAPSHOT_UPDATE_MODES.has(configValue)) {
    return true;
  }

  return process.argv.some(arg => arg.trim() === '--update-snapshots' || arg.trim().startsWith('--update-snapshots='));
};

const buildSnapshotName = (testInfo: TestInfo, explicitName?: string): string => {
  // An explicit name keeps multiple comparisons in one spec from colliding on a
  // single baseline; otherwise fall back to the spec file name.
  if (explicitName?.trim()) {
    return `${sanitize(explicitName.replace(/\.png$/i, ''), 80)}.png`;
  }

  const rawFileName = path.basename(testInfo.file);
  const withoutSpecAndExt = rawFileName.replace(/\.spec\.[cm]?[jt]sx?$/i, '').replace(/\.[cm]?[jt]sx?$/i, '');
  const fileSlug = sanitize(withoutSpecAndExt, 80);

  return `${fileSlug}.png`;
};

const buildDiffStats = (diffPixels: number, totalPixels: number, regionCount: number): DiffStats => {
  const diffRatio = totalPixels === 0 ? 0 : diffPixels / totalPixels;
  return {
    diffPixels,
    totalPixels,
    diffRatio,
    regionCount,
  };
};

const formatDiffStats = (stats: DiffStats): string => {
  return `diffPixels=${stats.diffPixels}, totalPixels=${stats.totalPixels}, diffRatio=${stats.diffRatio.toFixed(6)}, regionCount=${stats.regionCount}`;
};

const attachVisualArtifacts = async (
  testInfo: TestInfo,
  snapshotName: string,
  baselinePath: string,
  expectedBuffer: Buffer,
  actualBuffer: Buffer,
): Promise<VisualArtifactPaths> => {
  const pair = await generateHighlightedDiffPair(expectedBuffer, actualBuffer, {
    threshold: VISUAL_DIFF_DEFAULTS.threshold,
  });

  if (!pair) {
    throw new Error(`Unable to generate visual diff for ${snapshotName}.`);
  }

  const stem = snapshotName.replace(/\.png$/i, '');
  const expectedPath = testInfo.outputPath(`${stem}__expected.png`);
  const actualPath = testInfo.outputPath(`${stem}__actual.png`);

  fs.writeFileSync(expectedPath, expectedBuffer);
  fs.writeFileSync(actualPath, actualBuffer);

  await testInfo.attach(`Visual Expected - ${snapshotName}`, {
    body: pair.expectedHighlighted,
    contentType: 'image/png',
  });
  await testInfo.attach(`Visual Actual - ${snapshotName}`, {
    body: pair.actualHighlighted,
    contentType: 'image/png',
  });

  return {
    baselinePath,
    actualPath,
    stats: buildDiffStats(pair.diffPixels, pair.totalPixels, pair.regionCount),
  };
};

const findPlaywrightMismatchAttachment = (testInfo: TestInfo, suffix: '-expected.png' | '-actual.png'): string | undefined => {
  const match = testInfo.attachments.find(attachment => attachment.name.endsWith(suffix) && !!attachment.path);
  if (!match?.path || !fs.existsSync(match.path)) {
    return undefined;
  }
  return match.path;
};

const buildComparisonFailureError = (
  snapshotName: string,
  artifactPaths: VisualArtifactPaths,
  originalError: unknown,
): Error => {
  const details = [
    `Visual validation failed for ${snapshotName}.`,
    `Baseline path: ${artifactPaths.baselinePath}`,
    `Actual path: ${artifactPaths.actualPath}`,
    `Diff stats: ${formatDiffStats(artifactPaths.stats)}`,
    `Original error: ${(originalError as Error).message}`,
  ].join('\n');

  return new Error(details);
};

// Seeding writes whatever the UI currently renders, so an unreviewed or broken
// screen would silently become the source of truth. Allowed for local authoring;
// CI must fail on a missing baseline unless explicitly opted in.
const isBaselineSeedingAllowed = (): boolean => {
  const optIn = (process.env.VISUAL_ALLOW_BASELINE_SEED || '').trim().toLowerCase();
  if (optIn) {
    return optIn === 'true';
  }
  return !process.env.CI;
};

// Atomically reserves `baselinePath`, returning null when a baseline already
// exists. A single 'wx' open leaves no window for a parallel worker to create
// the file, which an existsSync guard followed by a write would.
const claimBaselinePath = (baselinePath: string): number | null => {
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  try {
    return fs.openSync(baselinePath, 'wx');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      return null;
    }
    throw error;
  }
};

// Seeds a baseline from the current UI when none exists yet, so local authoring
// runs continue straight into the comparison instead of failing with "no snapshot".
const ensureBaselineExists = async (
  baselinePath: string,
  snapshotName: string,
  testInfo: TestInfo,
  capture: () => Promise<Buffer>,
): Promise<boolean> => {
  if (isUpdateSnapshotsRun(testInfo)) {
    return false;
  }

  const handle = claimBaselinePath(baselinePath);
  if (handle === null) {
    return false;
  }

  let seeded = false;
  try {
    const capturedBuffer = await capture();

    if (!isBaselineSeedingAllowed()) {
      await testInfo.attach(`Visual Actual (missing baseline) - ${snapshotName}`, {
        body: capturedBuffer,
        contentType: 'image/png',
      });

      throw new Error(
        [
          `Baseline is missing for ${snapshotName}.`,
          `Expected baseline path: ${baselinePath}`,
          'Create baselines locally with: npm run test:visual:update, then commit them.',
          'To seed in this environment instead, set VISUAL_ALLOW_BASELINE_SEED=true.',
        ].join('\n')
      );
    }

    fs.writeSync(handle, capturedBuffer);
    seeded = true;

    await testInfo.attach(`Visual Baseline Created - ${snapshotName}`, {
      body: capturedBuffer,
      contentType: 'image/png',
    });
    console.log(`[visual] Baseline created for ${snapshotName} at ${baselinePath}; commit it to keep future runs comparable.`);
  } finally {
    fs.closeSync(handle);
    // An empty placeholder would be read as a valid baseline by the next run.
    if (!seeded) {
      fs.rmSync(baselinePath, { force: true });
    }
  }

  return true;
};

const getAreaDocumentCoordinates = async (area: Locator): Promise<{ docX: number; docY: number } | null> => {
  const page = area.page();
  const [scrollX, scrollY] = await page.evaluate(() => [window.scrollX, window.scrollY] as [number, number]);
  const bbox = await area.boundingBox();
  if (!bbox) {
    return null;
  }

  return {
    docX: Math.round(bbox.x + scrollX),
    docY: Math.round(bbox.y + scrollY),
  };
};

const shouldApplyForcedVisualDiff = (testInfo: TestInfo): boolean => {
  if ((process.env.VISUAL_FORCE_DIFF || '').trim().toLowerCase() !== 'true') {
    return false;
  }

  const match = (process.env.VISUAL_FORCE_DIFF_MATCH || '').trim();
  if (!match) {
    return true;
  }

  return testInfo.title.includes(match) || testInfo.titlePath.join(' ').includes(match);
};

const injectForcedVisualDiffMarker = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const markerId = 'visual-framework-controlled-diff-marker';
    const existing = document.getElementById(markerId);
    if (existing) {
      existing.remove();
    }

    const marker = document.createElement('div');
    marker.id = markerId;
    // Fixed inside the app content: appended in flow it landed below the 100vh portal, outside the capture, and the
    // top-right corner is under the `stableCapture` header mask (T9.11, 2026-11-12).
    marker.style.position = 'fixed';
    marker.style.top = '120px';
    marker.style.left = '50%';
    marker.style.zIndex = '2147483647';
    marker.style.background = 'transparent';
    marker.style.color = 'transparent';
    marker.style.padding = '14px';
    marker.style.fontSize = '14px';
    marker.style.fontWeight = '700';
    marker.style.border = '8px solid #b71c1c';
    marker.style.borderRadius = '10px';
    marker.style.fontFamily = 'Arial, sans-serif';
    document.body.appendChild(marker);
  });
};

/**
 * Area snapshots clip to the element's box, so a viewport-fixed marker can fall outside it (a panel or dialog crop).
 * Put the marker inside the captured element instead (T9.11 review, 2026-11-12).
 */
const injectForcedVisualDiffMarkerInto = async (area: Locator): Promise<void> => {
  await area.evaluate((element) => {
    const markerId = 'visual-framework-controlled-diff-marker';
    element.ownerDocument.getElementById(markerId)?.remove();
    const host = element as HTMLElement;
    if (getComputedStyle(host).position === 'static') {
      host.style.position = 'relative';
    }
    const marker = element.ownerDocument.createElement('div');
    marker.id = markerId;
    marker.style.position = 'absolute';
    marker.style.top = '8px';
    marker.style.left = '8px';
    marker.style.width = '24px';
    marker.style.height = '24px';
    marker.style.zIndex = '2147483647';
    marker.style.border = '8px solid #b71c1c';
    marker.style.borderRadius = '10px';
    host.appendChild(marker);
  });
};

const maybeApplyForcedVisualDiff = async (page: Page, testInfo: TestInfo, area?: Locator): Promise<void> => {
  if (!shouldApplyForcedVisualDiff(testInfo)) {
    return;
  }

  if (area) {
    await injectForcedVisualDiffMarkerInto(area);
    return;
  }
  await injectForcedVisualDiffMarker(page);
};

const isStrictVisualComparisonEnabled = (): boolean => {
  // Strict (zero tolerance) when unset; playwright.visual.config.ts defaults it to false for visual runs.
  return (process.env.VISUAL_STRICT_COMPARE || 'true').trim().toLowerCase() !== 'false';
};

// Blocks until the rendered DOM stops changing across consecutive animation
// frames, so lazily populated panels are not captured mid-render. Best-effort:
// returns once the budget is spent even if the page never settles.
const waitForDomToSettle = async (page: Page, timeout: number): Promise<void> => {
  const settled = page.evaluate(async (budget: number) => {
    const signature = (): string => {
      const body = document.body;
      if (!body) {
        return 'no-body';
      }
      return [
        document.readyState,
        body.scrollHeight,
        body.scrollWidth,
        body.getElementsByTagName('*').length,
        (body.innerText || '').length,
      ].join('|');
    };

    // A backgrounded/throttled renderer may never fire rAF, so always race it
    // against a timer to keep the loop advancing towards the deadline.
    const nextTick = (): Promise<void> => new Promise(resolve => {
      let done = false;
      const finish = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };
      requestAnimationFrame(finish);
      setTimeout(finish, 100);
    });

    const requiredStableFrames = 20;
    const deadline = Date.now() + budget;

    let previous = signature();
    let stableFrames = 0;

    while (Date.now() < deadline) {
      await nextTick();
      const current = signature();
      if (current === previous) {
        stableFrames++;
        if (stableFrames >= requiredStableFrames) {
          return;
        }
        continue;
      }
      previous = current;
      stableFrames = 0;
    }
  }, timeout);

  // Hard ceiling: a hung or detached renderer must not stall the capture.
  const abandoned = new Promise<void>(resolve => setTimeout(resolve, timeout + getTimeout('SHORT')));

  // Navigation or an execution-context swap during the wait — proceed anyway.
  settled.catch(() => { });
  await Promise.race([settled.catch(() => { }), abandoned]);
};

// Strict mode is a deliberate global override: it ignores per-call tolerances so
// any delta fails. Relax it with VISUAL_STRICT_COMPARE=false to use the
// per-call/config values.
const resolveVisualThreshold = (customThreshold: number | undefined): number => {
  if (isStrictVisualComparisonEnabled()) {
    return 0;
  }
  return customThreshold ?? VISUAL_DIFF_DEFAULTS.threshold;
};

const resolveVisualMaxDiffPixelRatio = (customRatio: number | undefined): number => {
  if (isStrictVisualComparisonEnabled()) {
    return 0;
  }
  return customRatio ?? VISUAL_DIFF_DEFAULTS.maxDiffPixelRatio;
};

const resolveVisualMaxDiffPixels = (customPixels: number | undefined): number | undefined => {
  if (isStrictVisualComparisonEnabled()) {
    return 0;
  }
  return customPixels ?? VISUAL_DIFF_DEFAULTS.maxDiffPixels;
};

/**
 * Wait until the selected page has completely loaded before a snapshot is taken.
 *
 * Deterministic and bounded — no static sleeps. Network idle and font readiness
 * are best-effort: a busy long-poll or a missing Font Loading API never fails
 * the wait, it just proceeds once the ceiling is reached.
 */
export async function waitForPageFullyLoaded(page: Page, options: PageLoadOptions = {}): Promise<void> {
  const timeout = options.timeout ?? getTimeout('XLARGE');
  const networkIdleTimeout = options.networkIdleTimeout ?? getTimeout('MEDIUM');

  await page.waitForLoadState('domcontentloaded', { timeout });
  await page.waitForLoadState('load', { timeout });

  // Network idle can legitimately never fire (websockets, polling); cap it.
  try {
    await page.waitForLoadState('networkidle', { timeout: networkIdleTimeout });
  } catch {
    // Best-effort only — proceed once the network-idle budget is exhausted.
  }

  // Ensure web fonts are resolved so text is not captured mid-swap.
  try {
    await page.evaluate(() => (document as Document & { fonts?: FontFaceSet }).fonts?.ready);
  } catch {
    // Font Loading API unavailable — safe to ignore.
  }

  await waitForDomToSettle(page, options.domStableTimeout ?? getTimeout('MEDIUM'));
}

/**
 * Full-page visual validation that first waits for the page to load completely.
 *
 * @param name Optional baseline name, e.g. `PowerBar-PO-Process-FullPage`; defaults
 *             to the spec file name. Sanitized to `<name>.png` on disk.
 */
export async function validatePageSnapshot(page: Page, testInfo: TestInfo, name?: string, options: PageLoadOptions = {}): Promise<void> {
  await waitForPageFullyLoaded(page, options);
  await maybeApplyForcedVisualDiff(page, testInfo);

  const snapshotName = buildSnapshotName(testInfo, name);
  const baselinePath = testInfo.snapshotPath(snapshotName);
  const capture = resolveCaptureOptions(page, options);
  if (options.stableCapture) {
    // The pointer stays where the last click was and leaves a hover state in the shot (View Settings dialog, 2026-11-12).
    await page.mouse.move(0, 0);
    await waitForStableCapture(() => page.screenshot({ fullPage: true, scale: 'css', ...toScreenshotOptions(capture) }), getTimeout('LONG'));
  }

  await ensureBaselineExists(
    baselinePath,
    snapshotName,
    testInfo,
    () => page.screenshot({ fullPage: true, scale: 'css', ...toScreenshotOptions(capture) }),
  );

  try {
    await expect(page).toHaveScreenshot(snapshotName, {
      fullPage: true,
      maxDiffPixelRatio: resolveVisualMaxDiffPixelRatio(options.maxDiffPixelRatio),
      maxDiffPixels: resolveVisualMaxDiffPixels(options.maxDiffPixels),
      threshold: resolveVisualThreshold(options.threshold),
      ...capture,
      // Give data-driven pages time to settle into two stable frames rather than
      // relying on the default 5s expect window.
      timeout: getTimeout('XLARGE')
    });

    const expectedBuffer = fs.readFileSync(baselinePath);
    const actualBuffer = await page.screenshot({ fullPage: true, scale: 'css', ...toScreenshotOptions(capture) });
    await attachVisualArtifacts(testInfo, snapshotName, baselinePath, expectedBuffer, actualBuffer);
  } catch (error) {
    const expectedPathFromMismatch = findPlaywrightMismatchAttachment(testInfo, '-expected.png');
    const actualPathFromMismatch = findPlaywrightMismatchAttachment(testInfo, '-actual.png');

    if (expectedPathFromMismatch && actualPathFromMismatch) {
      const artifactPaths = await attachVisualArtifacts(
        testInfo,
        snapshotName,
        baselinePath,
        fs.readFileSync(expectedPathFromMismatch),
        fs.readFileSync(actualPathFromMismatch),
      );
      throw buildComparisonFailureError(snapshotName, artifactPaths, error);
    }

    throw error;
  }
}

/**
 * Validate a single area of the page and capture only that region's snapshot.
 *
 * The target region is scrolled into view and its own visual stability is
 * awaited (via `toHaveScreenshot`'s built-in retry) before comparison, so only
 * the requested part of the UI is asserted — surrounding dynamic content is
 * ignored.
 *
 * @param area The locator whose bounding box is compared against the baseline.
 * @param name Baseline file name for this region, e.g. `powerbar-scope-chip.png`.
 */
export async function validateAreaSnapshot(area: Locator, name: string, testInfo: TestInfo, options: AreaSnapshotOptions = {}): Promise<void> {
  const timeout = options.timeout ?? getTimeout('LONG');

  await area.scrollIntoViewIfNeeded({ timeout });
  await area.waitFor({ state: 'visible', timeout });
  await maybeApplyForcedVisualDiff(area.page(), testInfo, area);

  const snapshotName = buildSnapshotName(testInfo, name);
  const baselinePath = testInfo.snapshotPath(snapshotName);
  const page = area.page();
  const capture = resolveCaptureOptions(page, options);
  if (options.stableCapture) {
    // The pointer stays where the last click was and leaves a hover state in the shot (View Settings dialog, 2026-11-12).
    await page.mouse.move(0, 0);
    await waitForStableCapture(() => area.screenshot({ scale: 'css', ...toScreenshotOptions(capture) }), getTimeout('LONG'));
  }

  await ensureBaselineExists(
    baselinePath,
    snapshotName,
    testInfo,
    () => area.screenshot({ scale: 'css', ...toScreenshotOptions(capture) }),
  );

  try {
    await expect(area).toHaveScreenshot(snapshotName, {
      maxDiffPixelRatio: resolveVisualMaxDiffPixelRatio(options.maxDiffPixelRatio),
      maxDiffPixels: resolveVisualMaxDiffPixels(options.maxDiffPixels),
      threshold: resolveVisualThreshold(options.threshold),
      ...capture
    });

    const coordinates = await getAreaDocumentCoordinates(area);
    if (!coordinates) {
      return;
    }

    const actualFullPage = await page.screenshot({ fullPage: true, scale: 'css', ...toScreenshotOptions(capture) });
    const expectedRegion = fs.readFileSync(baselinePath);
    const expectedFullPage = compositeRegionOntoFullPage(actualFullPage, expectedRegion, coordinates.docX, coordinates.docY);
    await attachVisualArtifacts(testInfo, snapshotName, baselinePath, expectedFullPage, actualFullPage);
  } catch (error) {
    const coordinates = await getAreaDocumentCoordinates(area);
    if (!coordinates || !fs.existsSync(baselinePath)) {
      throw error;
    }

    const actualFullPage = await page.screenshot({ fullPage: true, scale: 'css', ...toScreenshotOptions(capture) });
    const expectedRegion = fs.readFileSync(baselinePath);
    const expectedFullPage = compositeRegionOntoFullPage(actualFullPage, expectedRegion, coordinates.docX, coordinates.docY);
    const artifactPaths = await attachVisualArtifacts(testInfo, snapshotName, baselinePath, expectedFullPage, actualFullPage);
    throw buildComparisonFailureError(snapshotName, artifactPaths, error);
  }
}

