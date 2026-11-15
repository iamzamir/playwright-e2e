import { test } from '../configs/fixtures';
import { finishApiHar, trackApiHarResult, useApiHar, ApiHarHandle } from './har.util';

/**
 * Planning Space views (panel, View Settings), mapped 2026-11-12: view definitions and groups (`lui/dashboard/...`), every
 * Link Management call (`ibp/links/v1/`: views mapped to the process, entity views, scope, presets, procedure map) and
 * the user's preferences (`uiConfiguration/v1/preferences`), which decide the view opened on load. Functional ViewsBatch
 * specs move and delete these views, and the PS nightly opens other views as the same user. Whole resources are
 * recorded, so an unrecorded call on them is aborted in replay instead of reaching live data.
 * `process/<name>/users` stays live: it holds colleagues' names. The View Settings "Owned By" name comes from the IAM directory
 * (`iam/realm/v1/users`), which never goes in a HAR.
 */
export const PS_VIEWS_DATA = /\/lui\/dashboard\/|\/ibp\/links\/v1\/|\/lui\/uiConfiguration\/v1\/preferences/;
export const PS_VIEWS_GUARD = /\/lui\/dashboard\/|\/ibp\/links\/v1\//;

/**
 * PO Global Settings > Mapping > Process, mapped 2026-11-12: every process call (`process-orchestration/v1/process/...`:
 * list, trees, scopes), every Link Management call (`ibp/links/v1/`: the views mapped to each node), the views and groups
 * (`lui/dashboard/...`), and preferences (the process selected on load).
 */
export const PO_PROCESS_MAPPING_DATA = /\/process-orchestration\/v1\/process\/|\/ibp\/links\/v1\/|\/lui\/dashboard\/|\/lui\/uiConfiguration\/v1\/preferences/;
export const PO_PROCESS_MAPPING_GUARD = /\/process-orchestration\/v1\/process\/|\/lui\/dashboard\/|\/ibp\/links\/v1\//;

/**
 * Planning listing, mapped 2026-11-12: the listing pre-selects the first process of
 * `process-orchestration/v1/process/search`, which other specs add to, and the portal reads the user's preferences.
 */
export const PS_LISTING_DATA = /\/process-orchestration\/v1\/process\/|\/lui\/uiConfiguration\/v1\/preferences/;
export const PS_LISTING_GUARD = /\/process-orchestration\/v1\/process\//;

export interface VisualApiHarOptions {
  /** HAR file name under `testdata/<ENV>/har/Visual/`; use the snapshot name. */
  name: string;
  /** Data APIs that decide what the screen shows. Keep it to JSON data endpoints; never IAM or CDN traffic. */
  url: string | RegExp;
  /** Wider pattern around `url`; in replay, anything it matches that `url` doesn't is aborted and fails the spec. */
  guard?: string | RegExp;
}

/**
 * Plan T9.11: serves a visual spec's screen data from a HAR, so the screenshot depends only on the deployed UI bundle and
 * not on live INTEROP data or per-user state other workflows change. Call it inside `test.describe`, before the tests.
 * It installs the route before the first navigation (`beforeAll`), tracks results, and closes the recording.
 * Record: `PW_HAR_MODE=record` with the visual suite (see the `visual-regression-baselines` skill).
 * The HARs hold INTEROP Azure gateway URLs, so the spec is skipped elsewhere.
 */
export const useVisualApiHar = (options: VisualApiHarOptions): void => {
  let har: ApiHarHandle | undefined;

  test.skip((process.env.ENVIRONMENT || process.env.PSENV || 'INTEROP').trim().toUpperCase() !== 'INTEROP', 'Visual HAR recorded on INTEROP only');
  test.skip((process.env.GATEWAY_TYPE || '').toUpperCase() === 'GRAVITEE', 'Visual HAR recorded on the Azure gateway');

  test.beforeAll(async ({ page }) => {
    har = await useApiHar(page.context(), { area: 'Visual', ...options });
  });

  test.afterEach(async ({}, testInfo) => {
    trackApiHarResult(har, testInfo);
  });

  test.afterAll(async ({ page }) => {
    if (har) {
      await finishApiHar(page.context(), har);
    }
  });
};
