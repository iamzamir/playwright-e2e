# Repo Health Review Plan (plan-sop-ui-automation)

Review date: 2026-10-06 · Baseline: `main` @ `3150241` · Scope: whole repo, focus on `playwright-e2e/`

This plan lists 10 improvement items from a full-repo review: 5 must-do (M1–M5) and 5 good-to-do (G1–G5). Each item has evidence, steps and a "done when" check. The **Priority** and **Owner** columns are blank so the team can fill them in.

Effort: S = under 1 day, M = 1–3 days, L = more than 3 days or ongoing.

## Summary

| ID | Item | Type | Effort | Priority | Owner | Status |
|---|---|---|:---:|:---:|---|---|
| M1 | CI reports green even when tests fail | Must | S | | | Not started |
| M2 | Unknown `SUITENAME` silently runs all specs, including the delete-all specs | Must | S | | | Not started |
| M3 | `compareTwoValues` checks that never fail the test | Must | S–M | | | Not started |
| M4 | No PR quality gate (typecheck, lint, suite validation) | Must | M | | | Not started |
| M5 | Test-data isolation and cleanup | Must | L | | | Not started |
| G1 | Clean up XPath, fixed sleeps and `isVisible()` in the largest POMs | Good | L | | | Not started |
| G2 | Retire the legacy `e2e/` WDIO suite | Good | S | | | Not started |
| G3 | Consolidate `configs/setup.js` into one typed config | Good | M | | | Not started |
| G4 | Run every spec on a schedule (suites to tags/projects) | Good | M | | | Not started |
| G5 | Remove duplication across workflows (composite action or reusable workflow) | Good | M | | | Not started |

Suggested order if no other constraint applies: **M2 → M1 → M3 → M4 → M5**, then G5 (it makes the M1 fix a one-place change), G2, G3, G4, G1.

---

## Must-do

### M1. CI reports green even when tests fail

**Evidence**
- Every Playwright test step has `continue-on-error: true`, for example `.github/workflows/playwright-po-backend-suite.yaml:272` and `:317`, the PS/PO UI suites, the visual suite and the performance suite.
- All of the last 30 scheduled runs (2026-10-04/05) concluded `success`. Failures show up only in Allure and Teams.
- Related bug: in the single-batch path of `playwright-po-backend-suite.yaml` (lines 305–317), `EXTRA_ARGS="-- --grep-invert=\"ALM Deploy Resource Migration\""` is appended to a string and run as `$CMD`. Word splitting turns it into `--grep-invert="ALM` plus `Deploy`, `Resource` and `Migration"` as file filters.
- In the "all batches" path, the `&` + `wait` fallback (used when `RUN_ALM_DEPLOY=false`) ignores the children's exit codes.

**Steps**
1. In each workflow, give the test step an `id` and keep `continue-on-error: true` so the report, upload and Teams steps still run.
2. Add a final step, `if: always() && steps.<id>.outcome == 'failure'`, that runs `exit 1`. The run status then matches the test result. This can be a separate summary job if reports deploy in another job.
3. Build the batch-mode command as a bash array: `CMD=(npm run "test:${ENV_KEY}:pobackend:${BATCH_SCRIPT}")` and `CMD+=(-- --grep-invert "ALM Deploy Resource Migration")`, then run `"${CMD[@]}"`.
4. Replace `&` … `wait` with per-PID waits that collect exit codes, or route both paths through `scripts/run-po-backend-batches-parallel.js` with a grep-invert option.
5. Decide whether flaky tests (passed on retry) should fail the run. Recommendation: they shouldn't, but list them in the Teams summary.

**Done when** a deliberately failing spec makes the workflow run red, while the Allure report and Teams notification are still published.

### M2. Unknown `SUITENAME` silently runs all 226 specs

**Evidence**
- `configs/playwright.config.ts` `loadTestSuite()` falls back to `['**/**.spec.ts']` when `tests/TestSuites/<SUITENAME>.json` doesn't exist.
- `configs/setup.js` defaults `SUITENAME` to `complete-iop-suite` or `complete-qa-suite`, and neither file exists.
- `npm run test:interop:poui` uses `SUITENAME=POUIInterop`, which doesn't exist either.
- So `npm run test:interop`, `test:qa`, `test:psr` and `test:interop:poui` run every spec. That includes the `DataSetupBatch` delete-all specs (`Test_004_DeleteAllViewMappings`, `Test_005_DeleteAllCalendars`, `Test_006_DeleteAllAssumptionKpis`, `Test_007_DeleteAllSupplyChainActions`) against shared environments.
- `playwright.config.ts` lines 12–23 hold a committed `specificTests` list with one active entry.

**Steps**
1. In `loadTestSuite()`, throw an error that lists the available suites when `SUITENAME` is set but the file is missing. Don't fall back to all specs.
2. Remove the non-existent defaults from `setup.js`. No `SUITENAME` should mean "use the CLI path or filters"; check that the folder-based npm scripts and the workflows using `env -u SUITENAME` still work.
3. Fix or remove `test:interop:poui` (create `POUIInterop.json` or point it at the existing `poui:*` scripts).
4. Guard destructive specs: tag `DataSetupBatch` specs `@destructive` and skip them unless `ALLOW_DESTRUCTIVE=true` (set only by the DataSetup workflow step).
5. Move `specificTests` out of the committed config, for example into a `SPECIFIC_TESTS` env var or a gitignored local file.

**Done when** `SUITENAME=DoesNotExist npm run test:target` fails immediately with a clear message, and `npx playwright test --list` with no suite and no path lists no `DataSetupBatch` specs unless `ALLOW_DESTRUCTIVE=true`.

### M3. `compareTwoValues` checks that never fail the test

**Evidence**
- `util/common.util.ts:29` `compareTwoValues()` logs PASS or FAIL and returns a boolean; it never throws.
- It is called 2,507 times in 210 specs, and about 464 calls (in 90 files) discard the result.
- A heuristic scan found about 40 calls outside DataSetup that are real checks never asserted afterwards: a FAIL is logged but the test passes. Examples:
  - `tests/PlanningSpace/AddLanePopup/Test_011_AddLaneSCA.spec.ts:19`, `:23`, `:26`
  - `tests/PlanningSpace/AddLanePopup/Test_014_AddLaneThroughCardCell.spec.ts:20`, `:24`
  - `tests/PlanningSpace/DrillThroughBatch/Test_005_CreateMultipleChildScenariosAfterDrillThrough.spec.ts:109`
- 518 assertions have the form `expect(a && b && …).toBe(true)`, so a failure reports "expected true, got false" with no hint of which check broke.

**Steps**
1. Inside `compareTwoValues`, call `expect.soft(actual, message).toBe(expected)` (honouring `bIgnoreCase`). Every existing call then becomes a labelled assertion with no spec changes, and the boolean return value stays.
2. Run the PS smoke, PO UI and backend suites on INTEROP. Some tests will start failing; for each one, decide whether it's a real product bug (log the defect) or a wrong expectation (fix the spec). Don't skip tests to get green.
3. Optional follow-up: replace `expect(v1 && v2 && …)` with individual assertions as specs are touched. With step 1 in place this matters less.
4. Add a rule to `.github/instructions/playwright-specs.instructions.md`: new code uses `expect`/`expect.soft` directly; `compareTwoValues` is legacy.

**Done when** a forced mismatch in any `compareTwoValues` call fails the test with the call's message in the report.

### M4. No PR quality gate

**Evidence**
- The only workflows that run on pull requests are CodeQL and Copilot review. `playwright-e2e` has no ESLint.
- Rules from `.github/copilot-instructions.md` and `.github/instructions/*` that aren't enforced, with current counts:
  - XPath in POMs: 495, mostly in `planning.page.ts` (176), `scope.page.ts` (65), `cards.page.ts` (64), `global-settings.page.ts` (62).
  - `waitForTimeout`: 233 (131 in POMs, 102 in specs).
  - Non-retrying `isVisible()` in POMs: 212.
- `npx tsc --noEmit` currently has 1 error: `tests/Performance/Test_002_NavigateToPlanningParallel.spec.ts:47` (`PerfMetrics` is missing `processSelect`, `processLaunch` and `viewNavigation`).

**Steps**
1. Fix the `tsc` error.
2. Add `npm run typecheck` (`tsc --noEmit`) and `npm run lint` (ESLint + `@typescript-eslint` + `eslint-plugin-playwright`). Rules to start with:
   - `playwright/no-wait-for-timeout`
   - `playwright/missing-playwright-await`
   - `playwright/no-focused-test`
   - `playwright/no-skipped-test` (warn)
   - `no-restricted-syntax` for XPath strings
3. Introduce lint against a baseline: commit existing violations as warnings (or use `eslint --max-warnings` with a recorded count) and fail only on new ones.
4. Add `scripts/validate-suites.js`: every `tests/TestSuites/*.json` entry resolves to a file, every `SUITENAME` used in `package.json` and the workflows exists, and every spec is in a suite, an npm folder script or an explicit allow-list (see G4).
5. Add `.github/workflows/pr-checks.yaml` (on `pull_request`, paths `playwright-e2e/**`) that runs typecheck, lint, the suite validator and `npx playwright test --list`.
6. Make the check required in branch protection (needs repo admin).

**Done when** a PR that adds a `waitForTimeout`, an XPath selector, a type error or a broken suite entry is blocked.

### M5. Test-data isolation and cleanup

**Evidence**
- `afterAll` cleanup exists in 26 of 126 Planning Space specs, 4 of 29 Process Orchestration UI specs and 31 of 45 backend specs.
- The UI suites rely on the nightly `DataSetup` bulk deletes, which also make the shared environments unsafe for other parallel runs.
- 32 specs build unique names with `Math.floor(Math.random() * 900) + 100`; with sharding and 5 CI workers, collisions are likely.
- Test cases inside `describe.serial` blocks (203 specs) share created entities, so a failure in TC1 cascades into the rest.

**Steps**
1. Add `util/unique-name.util.ts`: `uniqueName(prefix)` returns `${prefix}_${RUN_ID}_${workerIndex}_${Date.now().toString(36)}`. `RUN_ID` comes from `GITHUB_RUN_ID` or a local value.
2. Add a `createdEntities` fixture (worker scope) where specs register each process, scenario, view, calendar, action item, etc. they create. Its teardown deletes them through the API, logs failures and doesn't throw.
3. Migrate specs folder by folder, starting with the ones that create the most data: ScenarioBatch, ScopeBatch, ViewsBatch, then Process Orchestration ProcessBatch.
4. Narrow the DataSetup bulk deletes to the automation prefixes and `RUN_ID`s so they stop deleting other runs' data.

**Done when** every spec that creates data either cleans it up or is listed with a reason, and two INTEROP runs started at the same time don't interfere.

---

## Good-to-do

### G1. Clean up XPath, fixed sleeps and `isVisible()` in the largest POMs

**Evidence:**
- `pageobjects/planning.page.ts` is 2,523 lines (176 XPath, 24 sleeps).
- Next are `cards.page.ts` (1,361), `global-settings.page.ts` (929), `scenario.page.ts` (926), `sca.page.ts` (877) and `scope.page.ts` (864).
- `ACTION` timeout is 60s and `TEST` timeout is 15 min, so flaky steps run slowly before they fail.

**Steps**
1. Use the Allure/Monocart retry and flaky data from the last 30 nightly runs to rank which POM methods to fix first.
2. Replace XPath with `getByRole`/`getByTestId` (the test-ID inventory is in `docs/repositories/*/ui-inventory.md`). Replace `waitForTimeout` with web-first waits (`expect(locator).toBeVisible()`, `waitForResponse`). Replace boolean `isVisible()` checks with `locator.waitFor` or `expect`.
3. Split `planning.page.ts` into component objects (left pane, toolbar, grid, alerts, wizard), keeping existing methods as deprecated delegates (rule: don't change the signature of a POM method that has more than one caller).
4. Track the counts from M4's lint baseline and aim for a falling trend.

**Done when** the XPath and `waitForTimeout` counts in the six largest POMs are below 25% of today's values.

### G2. Retire the legacy `e2e/` WDIO suite

**Evidence:**
- `e2e/` has 704 tracked files.
- All four workflows that run it (`complete-qa-suite`, `po-qa-suite`, `ps-iop-suite-windows`, `playwright-po-iop-suite`) are `disabled_manually`.
- It's still documented in the root `README.md` and still gets dependency PRs.

**Steps**
1. Confirm with the team that no one runs WDIO locally and that the WDIO-to-Playwright migration is done or abandoned.
2. Tag the current state (`legacy-wdio-final`) and delete `e2e/` plus the four disabled workflows.
3. Update `README.md`, `.github/copilot-instructions.md`, and the WDIO migration agent and prompt (`.github/agents/playwright-migration.agent.md`, `.github/prompts/migrate-wdio-spec-to-playwright.prompt.md`).

**Done when** `e2e/` and the disabled workflows are gone and the docs no longer mention WDIO as current.

### G3. Consolidate `configs/setup.js` into one typed config

**Evidence:**
- `setup.js` is 408 lines with 314 `process.env` assignments. The QA, INTEROP and PSR blocks repeat the same ~90 endpoints and differ only by gateway prefix (`cbp/qa/ibp/...` vs `qa/po/api/...`).
- It always sets `DEBUG = true`.
- It mutates `process.env` as a global config store.

**Steps**
1. Create `configs/env/endpoints.ts` with one table, `{ key, oldPath, newPath }` using `{env}` placeholders, plus a per-environment table of realm IDs and client IDs.
2. Add `configs/env/index.ts` that builds a typed, frozen `Config` object. Keep writing `process.env` for backward compatibility at first.
3. Write a one-off script that compares the old and new `process.env` output for every combination of ENVIRONMENT × URL_MODE × GATEWAY_TYPE. They must be identical before switching over.
4. Migrate `util/api.util.ts` and the other utils to read from `Config`, then delete the env writes.

**Done when** each endpoint is defined once and the comparison script shows no differences.

### G4. Run every spec on a schedule (suites to tags/projects)

**Evidence**
- 59 of 226 specs aren't in any suite JSON. Those intentionally outside a suite:
  - Process Orchestration UI, run by folder through the npm `poui:*` scripts. Three of those specs are permanently excluded with `TEST_IGNORE`: PowerBar Test_003, ProcessBatch Test_002, ViewSearch Test_003.
  - DataSetup, Performance and Visual.
- But 18 Planning Space specs (LiveBlocks, NPI, ObjectiveBar ×3, PortalBYO, QuickLinks, ScenarioBatch ×2, OnDemandMaas ×2, AddLanePopup ×2 …) only run when someone picks the folder by hand.
- `tests/PlanningSpace/AddLanePopup` isn't even in the workflow's `folder_map`.
- `shouldEnableGlobalSetup` decides whether to log in by searching suite names and CLI args for the text "backend".

**Steps**
1. Short term: add the missing Planning Space specs to suites (or document why they're excluded), add AddLanePopup to `folder_map`, and review the three `TEST_IGNORE` specs.
2. Longer term: tag specs (`@ps`, `@po-ui`, `@backend`, `@smoke`, `@destructive`) and define Playwright `projects`: a `backend` project with no global setup or browser, a `ui` project with a setup dependency, and `visual`. Shard and select with `--project`/`--grep` instead of JSON globs, and remove `shouldEnableGlobalSetup`.
3. Update `scripts/generate-testcase-docs.js` and `docs/testcases` to read the tags.

**Done when** the suite validator (M4) reports zero specs with no known runner, and global setup is chosen by project rather than by matching text.

### G5. Remove duplication across workflows

**Evidence:**
- 14 workflows total about 7,000 lines.
- These steps are copied into each one: disk cleanup, JFrog `.npmrc`, `npm ci`, apt-source workaround with `playwright install`, Allure generate, gh-pages publish with history restore, and the Teams card.

**Steps**
1. Create `.github/actions/setup-playwright` (a composite action for node, JFrog, npm ci and the browser install).
2. Create `.github/workflows/_publish-report.yaml` (a reusable workflow for Allure, gh-pages and Teams, plus the M1 "fail the run" step).
3. Migrate the workflows one at a time, comparing a dispatch run before and after each.

**Done when** each shared step exists in one place and the M1 fix is applied only in the shared report workflow.

---

## Also noted (lower priority)
- 312 of 385 test-data JSON files are missing the `_schema` block required by `.github/instructions/testdata.instructions.md`.
- `tsconfig.json` has `noImplicitAny: false`; specs contain 324 `: any`. Turn strictness on per folder.
- 67 specs import `test` from `@playwright/test` instead of `configs/fixtures`, mostly in DataSetup, so they skip the fixture logging and artifacts.
- QA test data exists for 121 of 226 specs and PSR for 39. That's fine if intentional, but write down which specs are expected to run in each environment.
- The secret scan of tracked files and history was clean, and `testdata/.auth/` and `.env` are gitignored. Keep it that way (consider adding `gitleaks` to the M4 PR checks).
