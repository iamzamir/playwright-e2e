# Action Items UI suite: duplication and consolidation review

- **Scope:** `tests/ProcessOrchestration/ActionItemsBatch/` (UI only; backend `ProcessOrchestrationBackend/ActionItem` is out of scope for this review)
- **CI:** `playwright-po-iop-ui-local-suite.yaml`, matrix batch `actionitems` → `npm run test:interop:poui:actionitems` (`--workers=1`). Specs are listed in `tests/TestSuites/_unscheduled.json` (pending T6.1).
- **Date:** 2026-10-12
- **Status:** Implemented on `feature/gravitee-ui-dual-gateway`: sections 3.1, 3.2 and 5 (I1–I5). Section 3.3 (API setup) not done.

## Implementation summary

- Test_002, Test_003 and Test_004 are merged into [Test_002_ActionItemPermissionsAndBulkActions](../../tests/ProcessOrchestration/ActionItemsBatch/Test_002_ActionItemPermissionsAndBulkActions.spec.ts) (9 serial tests, one switch to user 2, run-unique names, `afterAll` logs back in as user 1 and deletes its items). The old specs and their test data are deleted.
- [Test_001_CreateEditDeleteActionItem](../../tests/ProcessOrchestration/ActionItemsBatch/Test_001_CreateEditDeleteActionItem.spec.ts) is one serial flow with one catalog launch, the `testData` fixture and an `afterAll` that deletes an item a failed step left behind.
- `action-items.page.ts`: the two `waitForTimeout` sleeps are replaced by `waitForGridToSettle()` (no skeleton rows, stable row count); toasts are cleared before each action (`waitForToastToClear()`); instant `isVisible()` permission checks now wait; new `waitForColumnValue()`, `waitForActionItemRemoved()`, `getDisabledRowActions()` and `closeOpenMenu()`.
- `planning-listing.page.ts`: the two `waitForTimeout(300)` calls in `selectProcess` are replaced by a poll on the input value.
- Result: 4 specs / 20 tests become 2 specs / 12 tests; local INTEROP run times are in section 4.

## 1. Current inventory

| Spec | Tests | What it does | UI logins | Catalog launches | UI creates |
|---|---|---|---|---|---|
| [Test_001_CreateEditDeleteActionItem](../../tests/ProcessOrchestration/ActionItemsBatch/Test_001_CreateEditDeleteActionItem.spec.ts) | 3 | User 1: create, edit priority, delete in Process / Subprocess / Assumption. Each test relaunches from catalog. | 0 | 3 | 3 |
| [Test_002_EditAndDeleteActionItemsWithUnAuthorizedUsers](../../tests/ProcessOrchestration/ActionItemsBatch/Test_002_EditAndDeleteActionItemsWithUnAuthorizedUsers.spec.ts) | 2 | User 1 creates `AI_PROCESS/SUBPROCESS/ASSUMPTION`; user 2 checks Edit/Delete disabled + tooltip in 3 contexts. | 1 | 1 | 3 |
| [Test_003_BulkEditAndDeleteActionItems](../../tests/ProcessOrchestration/ActionItemsBatch/Test_003_BulkEditAndDeleteActionItems.spec.ts) | 10 | User 1 creates 3 items; user 2 creates own items in Process and Subprocess, bulk edit/delete expects partial alert, own items changed, user 1 items untouched. | 1 | 1 | 5 |
| [Test_004_BulkEditAndDeleteActionItemsWithAssignedUser](../../tests/ProcessOrchestration/ActionItemsBatch/Test_004_BulkEditAndDeleteActionItemsWithAssignedUser.spec.ts) | 5 | User 1 creates an item assigned to user 2; user 2 bulk edits/deletes it; checks bulk tooltips afterwards. | 1 | 1 | 1 |
| **Total** | **20** | | **3** | **6** | **12** |

All four specs use the same data in INTEROP and QA: process `PSAutomation`, subprocess `Demand Review`, assumption `PS Auto Assumption 5` (QA: `PS Auto Assumption`). No new test data context is needed to merge them.

## 2. Duplication found

| # | Duplicated flow | Where | Impact |
|---|---|---|---|
| D1 | User 1 creates one action item per context (Process, Subprocess, Assumption) with the "already exists → skip" guard | Test_002 TC1 and Test_003 TC1–3 (same steps, different names) | 3 redundant UI creates and 1 redundant catalog launch per run |
| D2 | User 1 creates → sign out → user 2 logs in → bulk edit → bulk delete on Process | Test_003 TC1/TC4–7 and Test_004 TC1–4 | Same bulk flow run twice; one extra login |
| D3 | `signOutAndLoginFromCatalog` as user 2 | Test_002, Test_003, Test_004 | 3 logins where 1 is enough (login is the slowest step) |
| D4 | `launchAppFromCatalog` at the start of every test | Test_001 TC1–3 | 2 avoidable catalog launches |
| D5 | `msg.includes("success") \|\| msg.includes("Success")` + `compareTwoValues` | ~20 copies across all specs | Maintenance only; move to one helper/assertion |
| D6 | Navigate → open context → click "Action Items" (3 lines) | Every test | Maintenance only; one `openActionItems(context)` helper |

## 3. Proposed structure

### 3.1 Merge Test_002 + Test_003 + Test_004 → one serial spec

Proposed name: `Test_002_ActionItemPermissionsAndBulkOperations.spec.ts` (`test.describe.serial`).

| Phase | Step | Source |
|---|---|---|
| User 1 | Create `AI_PROCESS`, `AI_SUBPROCESS`, `AI_ASSUMPTION` (run-unique names). Used by both the permission and the bulk checks. | 002 TC1, 003 TC1–3 |
| User 1 | Create `AI_ASSIGNED` in Process, assigned to user 2 | 004 TC1 |
| Switch | Log in as user 2 **once** (keep the runtime-built `'FUNCTIONAL_TEST_USERNAME' + '2'` so the auth fixture doesn't preload user 2 storage state for the whole file) | 002/003/004 |
| Process | Edit and Delete disabled + tooltip on `AI_PROCESS` | 002 TC2 step 2 |
| Process | Create `AI_PROCESS2` | 003 TC5 |
| Process | Bulk edit → partial alert + success; `AI_PROCESS2` **and `AI_ASSIGNED`** changed, `AI_PROCESS/SUBPROCESS/ASSUMPTION` unchanged | 003 TC6, 004 TC3 |
| Process | Bulk delete → partial alert + success; `AI_PROCESS2` and `AI_ASSIGNED` gone, user 1 items remain | 003 TC7, 004 TC4 |
| Process | Bulk Change / Bulk Delete tooltips after bulk action | 004 TC5 |
| Subprocess | Edit and Delete disabled + tooltip on `AI_SUBPROCESS` | 002 TC2 step 3 |
| Subprocess | Create `AI_SUBPROCESS2`, bulk edit, bulk delete | 003 TC8–10 |
| Assumption | Edit and Delete disabled + tooltip on `AI_ASSUMPTION` | 002 TC2 step 4 |
| Cleanup | `afterAll`: delete user 1 items (log back in as user 1, or delete via API) | new |

**Coverage check:** every assertion from 002, 003 and 004 is kept. Test_004 never asserts the alert message, so putting its assigned item in a run that also has unauthorized items (partial alert) loses nothing. Today the process grid already contains Test_003's leftover user 1 items when Test_004 runs, so Test_004 is already running in a "partial" situation.

### 3.2 Test_001 → one serial flow

Launch from the catalog once, then move Process → Subprocess → Assumption with `navigateToPlanningListingPage` + `launchContext` (as Test_002 already does). Keep the create/edit/delete assertions per context.

### 3.3 Optional: API setup for user 1 items

UI create is already covered by Test_001, so the merged spec could create user 1's items with `ActionItemApiHelper` (`util/action-item.util.ts`) instead of the UI. **Check first:** the partial-alert checks need the items owned by someone other than user 2. The API token may be a machine token, so confirm the UI treats those items as non-editable for user 2 before switching.

## 4. Effect (measured)

| Metric | Before (4 specs) | After (2 specs) |
|---|---|---|
| Specs | 4 | 2 |
| Tests | 20 | 12 |
| Catalog launches | 6 | 2 |
| User switches (sign out + log in) | 3 | 2 (user 2, then user 1 for cleanup) |
| Context navigations (planning listing → context → Action Items) | 16 | 10 |
| UI creates | 12 (when not skipped by the "already exists" guard) | 9 |
| Bulk edit/delete cycles | 3 | 2 |
| Items left behind per run | all user 1 items (fixed names) | none (run-unique names, `afterAll` cleanup) |

Local INTEROP run, 2026-10-12, CI viewport (`CI=true PW_RETRIES=0 HEADLESS=true`), `npm run test:interop:poui:actionitems`: **12 passed in 12.7 min** (before the Bulk Actions reopen fix; that fix later cut Test Case 8 from 31.7 s to 9.4 s, so expect about 12.3 min).

| Spec | Per test | Total |
|---|---|---|
| Test_001 | 55 s, 1.2 min, 1.1 min | ~3.2 min |
| Test_002 | 2.9 min, 1.5 min, 11 s, 5 s, 1 s, 58 s, 11 s, 9 s, 56 s, then ~1.5 min `afterAll` cleanup | ~8.9 min |

There is no passing "before" run to compare against (see section 6). Using the measured costs (~50 s per context navigation, ~30–40 s per catalog launch/login), the 6 navigations and 5 catalog loads removed are worth roughly 6–8 min, so the old batch would have taken about 18–20 min when passing.

**Where the time goes now:** context navigation (`navigateToPlanningListingPage` + `launchContext`, ~50 s each) is most of every test. That is the next place to save time across all PO UI batches, not just Action Items.

**Note:** the `actionitems` batch runs in parallel with the other PO UI matrix batches. The slowest job is `processbatch` (~26 min) against `actionitems` (~16.5 min), so this change saves runner minutes and maintenance, **not** wall-clock time of the nightly PO UI suite.

## 5. Issues to fix while merging

| # | Issue | Where | Fix |
|---|---|---|---|
| I1 | Fixed item names (`AI_PROCESS_BULK_1` etc.) are never cleaned up. The "already exists → skip" guard means the create step and its assertion are mostly skipped, and results depend on leftovers from earlier runs. | Test_002, Test_003, Test_004 | Run-unique names (timestamp/`uniqueRunId`) and `afterAll` cleanup |
| I2 | Bulk "select all" acts on every row on the page. Leftovers, or more than 20 rows with `setPageSize("20")`, change the outcome. | Test_003, Test_004 | Same as I1; filter the grid to the run's items if a filter exists |
| I3 | No `test.describe.serial` even though TC2 depends on TC1 | Test_002 | Merged spec is serial |
| I4 | Test_001 creates items without cleanup on failure (delete is the last step) | Test_001 | `afterAll` delete if the item still exists |
| I5 | Mixed test-data loading: Test_001/002 `require(...)` + `applyGatewayOverrides`; Test_003/004 use the `testData` fixture | All | Use the `testData` fixture in both resulting specs |

## 6. Blocker: the batch was failing every night (resolved)

**Status:** the locator was fixed in commit `7e1058c` before the merge; the merged batch passes locally (section 4). Confirm with the next scheduled nightly.

Scheduled runs 2026-10-06 to 2026-10-11 (6 nights): **7 failed, 13 did not run** each night. The job shows "success" because failures are tolerated.

All failures stop at the same place:

```
pageobjects/action-items.page.ts:53  clickCreateNewIcon()
waiting for locator('//iframe[@id="mfe"]').contentFrame().locator('//button[@title=\'Create new\']') to be visible
TimeoutError: locator.waitFor: Timeout 60000ms exceeded.
```

This looks like selector drift on the "Create new" button (both parts of the locator are XPath, which the repo rules don't allow). Fix the locator in the page object first (role/test id based); it's a one-place fix. Only then can the merged batch be timed against a real baseline.

## 7. Order (done)

1. Locator fix: done (`7e1058c`).
2. Sections 3.1 + 3.2 + section 5: done on `feature/gravitee-ui-dual-gateway`; `typecheck`, `lint`, `validate:suites`, `docs:testcases:check` pass.
3. Optional: section 3.3 after confirming item ownership behaviour.
