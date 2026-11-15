---
name: visual-regression-baselines
description: 'Add, update or debug Playwright visual regression specs and baselines (tests/VisualAutomation, playwright.visual.config.ts, testdata/<ENV>/VisualBaseValidations). Use when creating a visual smoke spec, regenerating or reviewing a baseline PNG, choosing between a full-page and an area snapshot, masking dynamic content, or investigating a visual-automation-test failure or diff.'
argument-hint: 'Screen to cover, or the failing visual spec and run id'
---

# Visual regression baselines

## How the framework works
- The config is `playwright-e2e/configs/playwright.visual.config.ts`. It sets `VISUAL_VALIDATION=true` and loads the specs listed in `tests/VisualAutomation/VisualSuites/<VISUAL_SUITE>.json`.
- Specs call the `visual` fixture: `visual.validatePage(name, opts)` compares the full page, and `visual.validateArea(locator, name, opts)` compares one region. Both are implemented in `util/visual-helper.util.ts`.
- Baselines are stored under `testdata/<ENV>/VisualBaseValidations/`. Read `snapshotPathTemplate` in the config for the exact layout (flat, or mirroring the spec's folder) instead of assuming one.
- A missing baseline fails in CI (`ensureBaselineExists`). Locally it is seeded from the current screen unless `CI` is set, and `VISUAL_ALLOW_BASELINE_SEED` overrides either way.
- `VISUAL_STRICT_COMPARE` makes every comparison zero-tolerance and ignores per-call tolerances. Check its default in the config before you tune `maxDiffPixelRatio`.

## Mocked visual specs (T9.11, preferred)
Live INTEROP data and per-user state (last process, last view, filters) change under the suite, because the PS UI nightly uses the same users. A visual spec should depend only on the deployed UI bundle:
1. Find the data calls that decide what the screen shows (log `fetch`/`xhr` responses once). Add `useVisualApiHar({ name, url, guard })` from `util/visual-har.util.ts` inside the `describe`, with `url` limited to those JSON data endpoints and `guard` around their resources.
2. Record with `PW_HAR_MODE=record` (Azure gateway, INTEROP). Redaction handles tokens and emails, but not people's names, so grep the HAR for `fullName|firstName|lastName` and keep user-list endpoints out of `url`. A shared pattern may already fit: `PS_VIEWS_DATA` or `PO_PROCESS_MAPPING_DATA`.
3. Compare with `stableCapture: true` and `maxDiffPixelRatio: 0`. `stableCapture` masks the portal header icons and hides the animated portal background and scrollbars.
4. Add the spec to `VisualSuites/MockedSmokeVisual.json` too. Generate its baseline on the CI runner: run `visual-automation-test` with `branch=<yours>`, `visual-suite=MockedSmokeVisual` and `update-baselines=true`. The workflow refuses any other suite, so live-data baselines are never overwritten, and it uploads the `visual-baselines` artifact only when the run passed. Open the PNGs and commit them. A Windows baseline won't match Linux at zero tolerance.
5. Prove it: three replays pass, and `VISUAL_FORCE_DIFF=true` fails.

## Adding a visual spec
1. Pick a screen whose content doesn't depend on live data, or one where you can mask the dynamic parts. Data grids, dates, user names and animated loaders will fail every night.
2. Reach the state with existing page-object methods (`role-playwright-automation` rules apply), and wait for a concrete UI signal before you compare.
3. Prefer `validateArea` on the stable panel when the rest of the page holds live data. Use `mask: [...]` for small dynamic regions. Make the area cover the whole component, not just a text label inside it.
4. Name the snapshot `<PS|PO>-<Screen>[-FullPage]` and keep the name unique across suites.
5. Create the baseline locally against the target environment: `npm run test:visual:update` with `VISUAL_SUITE` set to a suite holding just your spec. Open the PNG and check it shows the intended screen before committing.
6. Commit the spec, its baseline, and its entry in the right `VisualSuites/*.json` (area suite plus `CompleteSmokeVisual.json`) together. Never register a spec in a suite without its baseline.
7. Run `npm run docs:testcases` and commit the regenerated `docs/testcases/VisualAutomation.md`, `TEST-CASES.md` and `test-cases-index.csv`.
8. If you add a new suite JSON, add it to the `visual-suite` choice list in `.github/workflows/visual-automation-test.yaml`.

## Investigating a diff
- Download the run's artifacts (`gh run download <id> --pattern "visual-*"`). The Allure attachments show the expected and actual images with differences highlighted.
- Decide which it is: a product change (update the baseline in a reviewed PR and say why), environment data drift (mask the region or switch to an area snapshot), or rendering noise (anti-aliasing; tune tolerance only within the config's defaults).
- `VISUAL_FORCE_DIFF=true` injects a controlled diff to prove the pipeline reports failures. Never leave it on.

## Rules
- Never regenerate baselines just to turn a run green without looking at the diff.
- Baselines are per environment. Don't copy INTEROP PNGs into another environment's folder.
