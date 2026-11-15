# Phase 7: Framework maintainability

**Priority:** P3 (ongoing) · **Effort:** several weeks, in small PRs · **Lead personas:** `role-playwright-automation`, `role-playwright-healer` · **Reviewer:** `role-sdet-architect`
**Navigation:** [Planning hub](../../README.md) · [Master plan](../../Master/master_plan.md) · Previous: [Phase 6](../phase_6_coverage_completeness/README.md) · Next: [Phase 8](../phase_8_legacy_and_docs/README.md)

## Goal
The largest page objects follow the repo's own locator and wait rules. Environment configuration is defined once and typed. Test data and TypeScript settings catch mistakes earlier.

## Why
Debt in the six largest page objects (2026-10-08):

| Page object | Lines | XPath | `waitForTimeout` | `.isVisible(` |
|---|---|---|---|---|
| `planning.page.ts` | 2,562 | 180 | 24 | 70 |
| `cards.page.ts` | 1,361 | 65 | 14 | 49 |
| `global-settings.page.ts` | 929 | 65 | 19 | 10 |
| `scenario.page.ts` | 926 | 56 | 11 | 18 |
| `sca.page.ts` | 877 | 60 | 14 | 7 |
| `scope.page.ts` | 864 | 65 | 20 | 14 |
| **Total (6)** | | **491** | **102** | **168** |

**Now (re-checked 2026-10-26, `main` @ `7415f6e`; XPath, sleep and `.isVisible(` counts unchanged since 2026-10-19)**: each page object except two is a thin page class with one-line delegates over components in a folder named after it. The exceptions: `sca.page.ts` delegates to components in `planning/` and `global-settings/` (it has no `sca/` folder), and `scope.page.ts` is not split. The counts below include those components; `sca.page.ts` counts `global-settings/view-procedures` and `process-procedures`, while its shared `planning/procedures.component.ts` stays under `planning.page.ts`.

| Page object | Refactor PR | Lines (page + components) | XPath | `waitForTimeout` | `.isVisible(` |
|---|---|---|---|---|---|
| `planning.page.ts` + `planning/` | #786, #797 (T7.2); last 5 XPath in T7.7 | 1,008 + 11 files | 0 | 0 | 52 |
| `cards.page.ts` + `cards/` | #887 | 617 + 1,625 | 0 | 0 | 26 |
| `global-settings.page.ts` + `global-settings/` | #841 | 405 + 833 | 0 | 0 | 10 |
| `scenario.page.ts` + `scenario/` | #886 | 407 + 837 | 0 | 0 | 10 |
| `sca.page.ts` + 2 `global-settings/` components | #875 | 283 + 354 | 0 | 0 | 3 |
| `scope.page.ts` | #852 (no component split) | 808 | 0 | 0 | 11 |
| **Total (6)** | | | **0** | **0** | **112** |

On 2026-10-08 `configs/setup.js` was 408 lines with 272 `process.env.X =` assignments, repeating ~90 endpoints for QA, INTEROP and PSR; T7.4 (PR #900) moved them into typed `configs/env`, and `setup.js` is now a 27-line loader. Before T7.5 (2026-10-26, `main` @ `7415f6e`), 148 of 402 test data files had the `_schema` block the testdata instructions require, and `noImplicitAny` was off, although turning it on gave only 3 errors. T7.5 backfilled the other 254 files, made `validate:suites` enforce the block, and turned `noImplicitAny` on.

The lint baseline from T2.2 tracks the counts; this phase brings them down where failures actually happen first (T7.1 ranks them).

## Tasks

| Task | Title | Implement | Depends on | Status |
|---|---|---|---|---|
| [T7.1](tasks/T7.1_rank_unstable_pom_methods.md) | Rank unstable POM methods from triage data | role-playwright-healer | none | Done |
| [T7.2](tasks/T7.2_planning_page_refactor.md) | `planning.page.ts`: locators, waits, component split | role-playwright-automation | T7.1, T2.2 | Done (PRs #786, #797 merged) |
| [T7.3](tasks/T7.3_other_large_poms.md) | The other five large POMs | role-playwright-automation | T7.2 | Done (XPath and sleeps at 0; `.isVisible(` and caller failures moved to T7.8) |
| [T7.4](tasks/T7.4_typed_environment_config.md) | Typed environment config replacing `setup.js` | role-playwright-automation | T2.1 | Done |
| [T7.5](tasks/T7.5_testdata_schema_and_strictness.md) | Test data `_schema` backfill and TypeScript strictness | role-playwright-automation | T2.2 | Done |
| [T7.6](tasks/T7.6_locator_drift_detection.md) | Locator drift detection (test-ID check, nightly page fingerprints) | role-playwright-automation, role-devops-engineer | T7.2 slice 2 | Not started |
| [T7.7](tasks/T7.7_remaining_small_poms.md) | XPath and sleeps in the remaining small page objects | role-playwright-automation | T7.3 | Done |
| [T7.8](tasks/T7.8_failure_driven_pom_waits.md) | Failure-driven POM wait hardening (`.isVisible(` checks, caller failures) | role-playwright-healer | T7.3 | Not started |

### Pending (re-checked 2026-11-11, `origin/main` @ `339751f`)
- **T7.3:** closed. Its purpose, XPath and sleeps at 0 in the five POMs, is met. The `.isVisible(` count is not going down (~70 in the five POMs and their components by plain grep, against 60 on 2026-10-26). Of the triage issues it waited on, #884 and #889 were closed on 2026-11-06; #873, #891 and #893 are open. Both moved to T7.8.
- **T7.8:** new. It works from nightly failures rather than a count target, and also takes T7.2's unticked planning-component target.
- **T7.6:** not started, P3.
- **No owning task:** the lint baseline outside `pageobjects/`: 58 `no-wait-for-timeout` suppressions in 26 spec files and 9 XPath suppressions in `util/test.util.ts`.

### Pending (re-checked 2026-10-26, `main` @ `7415f6e`, kept for history)
- **T7.3:** two criteria left. `.isVisible(` is 60 against a target of 22 across the five POMs, components included. "Callers pass" is still open: triage issues #873, #884, #889, #891 and #893 are open, and the 2026-10-24 and 2026-10-25 nightlies hit them again.
- **T7.5:** done. All 402 test data files have `_schema`, which `validate:suites` now enforces; `noImplicitAny` is on; and the 4 Performance specs document their plain import.
- **T7.6:** not started. Its dependency, T7.2, is done. Both UI repos now have `node_modules`, so the library test-ID list can come from either repo.
- **T7.7:** done. Its last slice replaced the 5 `waitForDelay` sleeps in `pageobjects/` with condition waits and deprecated the unused `doClick` wait parameters.
- **No owning task:** T7.2's unticked planning-component `.isVisible(` target (52 against ≤ 18), and the lint baseline outside `pageobjects/`: 62 `no-wait-for-timeout` suppressions in 26 files and 9 XPath suppressions in `util/test.util.ts`.

## Exit criteria
- XPath and `waitForTimeout` counts in the six POMs below 25% of the table above (≤ 123 XPath, ≤ 25 sleeps). **Met 2026-10-19:** 0 XPath (the last 5 in `planning.page.ts` went in T7.7) and 0 sleeps, components included.
- Each endpoint defined once; old and new config produce identical environment values for every ENVIRONMENT × URL_MODE × GATEWAY_TYPE combination. **Met 2026-10-19 (T7.4, PR #900):** the parity script shows no unexplained differences for QA, INTEROP, PSR and STAGE.
- `_schema` present in every test data file; `noImplicitAny` on in `tsconfig.json`. **Met 2026-10-26 (T7.5):** 402 of 402 files, enforced by `validate:suites`; `typecheck` passes with `noImplicitAny`.
