# Phase 3: Assertion integrity

**Priority:** P1 · **Effort:** about 1 week of code, plus 3 nights of observation · **Lead personas:** `role-playwright-automation`, `role-playwright-healer` · **Reviewer:** `role-sdet-architect`
**Navigation:** [Planning hub](../../README.md) · [Master plan](../../Master/master_plan.md) · Previous: [Phase 2](../phase_2_pr_quality_gate/README.md) · Next: [Phase 4](../phase_4_test_data_isolation/README.md)

## Goal
A check that fails makes its test fail, and the report says which check failed.

## The house pattern: soft check, hard assertion at the end
`commonFunctions.compareTwoValues(actual, expected, message)` is a soft check by design. It logs PASS or FAIL with the message, expected and actual values (a FAIL is a failed Allure step), returns a boolean and never throws. A test keeps each result in a boolean and makes one hard assertion at the end:

```ts
const isEditDisabled = await commonFunctions.compareTwoValues(access.isEditDisabled, true, "Edit should be disabled");
const editTooltip    = await commonFunctions.compareTwoValues(access.editToolTip, testData.TOOL_TIP, "Edit tooltip");
const isDeleteDisabled = await commonFunctions.compareTwoValues(access.isDeleteDisabled, true, "Delete should be disabled");
expect(isEditDisabled && editTooltip && isDeleteDisabled).toBeTruthy();
```

The first mismatch does not stop the test, so one run reports every check, and the test still fails if any check failed. API specs use the same idea with an array: `const validations = [await compareTwoValues(…), …]; expect(validations.every(Boolean)).toBeTruthy();`. This phase keeps that pattern. It does **not** make `compareTwoValues` throw or raise `expect.soft` (the earlier T3.1 idea, dropped on 2026-10-16, see decision D2 in the master plan).

## What is actually broken (verified 2026-10-16 on `main` @ `865f9848d`)
A heuristic classification of every `compareTwoValues` call in the 232 spec files (each call against the `expect(...)` calls later in the same test):

| How the result is used | Calls | Fails the test today? |
|---|---|---|
| Captured in a boolean that reaches the final `expect` (the house pattern) | 1,651 | Yes |
| In a validations array asserted with `every(Boolean)` | 133 | Yes |
| Wrapped directly in `expect(await compareTwoValues(…))` | 13 | Yes |
| Result discarded, but the same value has its own `expect` (log + assert) | 327 | Yes |
| **Result discarded and the value never asserted** | **69** (30 of them in `Migration/Test_007`, where most are re-asserted on an expression the heuristic misses; 39 real, in 26 specs) | **No** |
| **Captured, never asserted** | **4** (PS/PO `QuickLinks/Test_001` `urlValidation`, PS `ScopeBatch/Test_007` ×2) | **No** |
| Used only as a condition (`if (...)`), in hooks, commented out, or returned | 118 | n/a |

**Measured 2026-11-06 on 22 nightly runs:** 13 of 7,434 passing test executions (0.17%) contained a failed check, from 4 root causes, none a confirmed product bug (one needs investigating). See T3.2 section 2. One item in the static count, `ScopeBatch/Test_007`, turned out to be a probe rather than a gap.

So the pattern works almost everywhere. The real gaps are:
1. **43 checks in 28 specs whose result never reaches an assertion** (39 discarded, 4 captured; listed in T3.3). Example: PO `PowerBar/Test_002` Test Case 4 compares `bValidation2` and never asserts it, so that test case cannot fail.
2. **The final hard assertion does not name the check.** `expect(a && b && c).toBeTruthy()` fails with "Received: false". The FAIL step in Allure (and the triage `failedStep`) names it, but the Playwright error message, the HTML and line reporters, and the run-verdict summary do not.
3. **Nothing stops new gaps.** The rule "every captured boolean reaches the final `expect`" is not written down or checked.

Two facts constrain the fix:
- `compareTwoValues` is also used in page objects and utils: 84 calls on 2026-11-06 (38 in `util/mapping.util.ts`, 12 in `util/alm-migration.util.ts`). T3.1 traced their callers and found no true probes in page objects or utils today (every result is asserted true or discarded), but keeping the helper non-throwing leaves the soft-check pattern intact.
- No spec expects a `compareTwoValues` result to be `false`; negative checks pass `false` as the expected value (48 calls). So recording every mismatch made from a spec is safe.

## Approach (decision D2, revised 2026-10-16)
Keep the soft-check / hard-assert pattern and make it airtight:
- T3.1: `compareTwoValues` records each mismatch in a per-test ledger (no throw, return value and logs unchanged). An auto fixture names the failed checks on a failing test, and flags a passing test whose ledger has mismatches (an unasserted check), in `warn` mode by default. A non-recording `valuesMatch` helper is there for probes.
- T3.2: fix the 4 measured causes, read 3 nights of `warn` results, then make `fail` the default in one change (re-scoped 2026-11-06; the per-suite waves are dropped).
- T3.3: fix the statically known gaps, write the pattern into the spec instructions, and add a report-only static check for new gaps.

## Tasks

| Task | Title | Implement | Depends on | Status |
|---|---|---|---|---|
| [T3.1](tasks/T3.1_failed_check_ledger.md) | Failed-check ledger: name failed checks, flag unasserted ones | role-playwright-automation | none | Done |
| [T3.2](tasks/T3.2_unasserted_check_rollout.md) | Fix the measured unasserted checks; make the guard fail by default | role-playwright-healer | T3.1, T1.4 | In progress (slice 1 of 2) |
| [T3.3](tasks/T3.3_fix_unasserted_checks_and_guidance.md) | Fix the known unasserted checks; document the pattern | role-playwright-automation | T3.1 | Not started |

## Exit criteria
- A failing test's report lists the names of the checks that failed, not only "Received: false".
- `PW_UNASSERTED_CHECKS=fail` is the default in every suite (`off` stays as an emergency switch).
- Every unasserted check that surfaced has an outcome: added to the test's final assertion, removed as a log-only step (changed to `logMessage`), product defect registered (known issue with a Jira key), or test data fixed.
- `playwright-specs.instructions.md` documents the soft-check / hard-assert pattern, and the static check reports no new unasserted call.
