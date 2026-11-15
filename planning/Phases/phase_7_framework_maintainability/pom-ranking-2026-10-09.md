# POM instability ranking (2026-10-06 to 2026-10-08)

Generated 2026-10-09 by `scripts/triage/rank-pom-methods.js` (task [T7.1](tasks/T7.1_rank_unstable_pom_methods.md)). Feeds the work order of [T7.2](tasks/T7.2_planning_page_refactor.md) and [T7.3](tasks/T7.3_other_large_poms.md).

## Data
- Nights: 3 (2026-10-06, 2026-10-07, 2026-10-08), one run per suite per night as on the dashboard (scheduled run first): 19 runs, read from `dashboard/data/runs` on `gh-pages`.
- Failed tests: 320. First stack frame in our code: pageobjects 138 (43%), tests 144, util 38, other 0, none 0. Only pageobjects frames are ranked.
- Flaky passes: 55, 7 credited to a POM method (the test also failed in that method during the window; run data keeps no stack for passing tests).
- Blocked tests (describe.serial cascade): 954, 375 caused by a POM method failure.
- ~ marks approximate rows: for at least one failure the line moved since that run (the method recorded in the stack is not the one at that line in the current source), so the row uses the recorded method name; 24 failure(s) affected. Debt counts are from the current source.

## Top 30 methods

| Rank | File:method | Failures | Flaky | Blocked | Nights | XPath | Sleeps | `isVisible` |
|---|---|---|---|---|---|---|---|---|
| 1 | `drillthrough.page.ts:performDrillThroughOnCardField` | 22 | 0 | 42 | 3 | 0 | 0 | 1 |
| 2 | `planning.page.ts:selectView` ~ | 13 | 1 | 43 | 3 | 0 | 0 | 1 |
| 3 | `powerbar.page.ts:verifyPowerBarEntityToolTipDetails` | 9 | 0 | 6 | 3 | 0 | 2 | 1 |
| 4 | `process.page.ts:goToPOListingPageAndVerify` | 9 | 0 | 0 | 3 | 1 | 0 | 0 |
| 5 | `action-items.page.ts:isActionItemDisplayed` | 8 | 0 | 30 | 3 | 0 | 1 | 1 |
| 6 | `action-items.page.ts:clickCreateNewIcon` | 8 | 0 | 0 | 3 | 0 | 0 | 0 |
| 7 | `pages-and-blocks.page.ts:selectViewSettingsAction` | 6 | 0 | 36 | 3 | 0 | 0 | 0 |
| 8 | `drillthrough.page.ts:performDrillThroughOnBDECard` | 6 | 0 | 27 | 3 | 0 | 0 | 2 |
| 9 | `scope.page.ts:clickOnEditDimensions` | 6 | 0 | 15 | 3 | 0 | 0 | 0 |
| 10 | `page.ts:doClick` | 5 | 0 | 2 | 3 | 0 | 0 | 0 |
| 11 | `planning.page.ts:selectSupplyChainProceduresAction` ~ | 3 | 2 | 2 | 1 | 0 | 1 | 1 |
| 12 | `planning.page.ts:waitForViewToBeDisplayed` ~ | 3 | 0 | 39 | 3 | 0 | 0 | 0 |
| 13 | `global-settings.page.ts:workFlowFilterActionItemClick` | 3 | 0 | 36 | 3 | 0 | 0 | 0 |
| 14 | `planning.page.ts:clickViewDropdown` ~ | 3 | 0 | 15 | 3 | 0 | 0 | 0 |
| 15 | `page.ts:doGetText` | 3 | 0 | 12 | 3 | 0 | 0 | 0 |
| 16 | `scenario.page.ts:clickScenarioAction` | 3 | 0 | 9 | 3 | 0 | 0 | 0 |
| 17 | `planning.page.ts:performRightClickOnCardCell` ~ | 3 | 0 | 3 | 3 | 0 | 0 | 0 |
| 18 | `planning.page.ts:selectCardInTabbedCard` ~ | 3 | 0 | 3 | 3 | 0 | 0 | 0 |
| 19 | `cards.page.ts:applyAndCloseCardConfiguration` | 3 | 0 | 0 | 3 | 0 | 1 | 0 |
| 20 | `planning.page.ts:waitForComponentDrawer` ~ | 3 | 0 | 0 | 3 | 2 | 0 | 1 |
| 21 | `planning.page.ts:openComponent` ~ | 2 | 0 | 14 | 2 | 0 | 0 | 1 |
| 22 | `odm.page.ts:verifyAllScenariosInODM` | 2 | 0 | 13 | 1 | 0 | 0 | 0 |
| 23 | `planning-listing.page.ts:launchContext` | 2 | 0 | 9 | 2 | 0 | 0 | 0 |
| 24 | `scope.page.ts:selectAndApplyQF` | 2 | 0 | 6 | 2 | 0 | 3 | 1 |
| 25 | `scenario.page.ts:closeManageScenarios` | 2 | 0 | 2 | 2 | 0 | 0 | 0 |
| 26 | `odm.page.ts:verifyDataSyncStatusMessage` | 1 | 2 | 1 | 1 | 0 | 0 | 0 |
| 27 | `sca.page.ts:clickOnProceduresDropdown` | 1 | 1 | 3 | 1 | 2 | 2 | 3 |
| 28 | `global-settings.page.ts:createCalendarCycle` | 1 | 1 | 0 | 1 | 0 | 0 | 0 |
| 29 | `scenario.page.ts:click3DotIconForScenario` | 1 | 0 | 3 | 1 | 0 | 0 | 2 |
| 30 | `scope.page.ts:clickOnQuickFilterConfigIcon` | 1 | 0 | 3 | 1 | 0 | 0 | 0 |

## By page object

| Page object | Methods ranked | Failures | Flaky | Blocked |
|---|---|---|---|---|
| `planning.page.ts` | 8 | 33 | 3 | 119 |
| `drillthrough.page.ts` | 2 | 28 | 0 | 69 |
| `action-items.page.ts` | 2 | 16 | 0 | 30 |
| `powerbar.page.ts` | 1 | 9 | 0 | 6 |
| `process.page.ts` | 1 | 9 | 0 | 0 |
| `scope.page.ts` | 3 | 9 | 0 | 24 |
| `page.ts` | 2 | 8 | 0 | 14 |
| `pages-and-blocks.page.ts` | 1 | 6 | 0 | 36 |
| `scenario.page.ts` | 3 | 6 | 0 | 14 |
| `global-settings.page.ts` | 3 | 5 | 1 | 37 |
| `cards.page.ts` | 1 | 3 | 0 | 0 |
| `odm.page.ts` | 2 | 3 | 2 | 14 |
| `planning-listing.page.ts` | 1 | 2 | 0 | 9 |
| `sca.page.ts` | 1 | 1 | 1 | 3 |

## Top 3 detail (for spot checks against the dashboard)

### 1. `drillthrough.page.ts:performDrillThroughOnCardField`
- 3× PlanningSpace/DrillThroughBatch/Test_003_HiddenViewTransitionInNewTab.spec.ts › Test Case 1: Transits from non hidden view to non hidden views on a new tab
- 3× PlanningSpace/DrillThroughBatch/Test_008_MultiLevelDrillThroughMassBdeWithSubprocess.spec.ts › Test Case 1: First Level Drill Through From Source to Target(Mass Pivot to BDE card)
- 3× PlanningSpace/DrillThroughBatch/Test_009_MultiLevelDrillThroughMassBdeWithAssumption.spec.ts › Test Case 1: First Level Drill Through From Source to Target(Mass Pivot to BDE card)
- 3× PlanningSpace/WorkFlowFilter/Test_002_DrillThroughSourceWithoutMerge.spec.ts › Test Case 1: Drill Through From Source without merge context to Target view without backend filter
- 3× PlanningSpace/WorkFlowFilter/Test_002_DrillThroughSourceWithoutMerge.spec.ts › Test Case 1: First Level Drill Through From Source without merge context to Target view without backend filter
- Error (22×): `TimeoutError: locator.waitFor: Timeout Nms exceeded.`

### 2. `planning.page.ts:selectView`
- 3× PlanningSpace/DirtyState/Test_001_DirtyState.spec.ts › Test Case 1: *Should be appended for view name when data is modified in the card
- 3× PlanningSpace/DrillThroughBatch/Test_004_OnRowDrillThrough.spec.ts › Test Case 1: Arrow should be displayed for the row with matching cell name
- 3× PlanningSpace/DrillThroughBatch/Test_010_ContextOverrideNavUsingBreadcrumbs.spec.ts › Case 1: Validate Context Override popup and their Breadcrumbs labels in same Tab after First level Drill through.
- 2× PlanningSpace/DuplicateView/Test_003_DuplicateViewAssumption.spec.ts › Test Case 02: Verify the duplicated view is created and mapped to the assumption
- 2× PlanningSpace/OnDemandMaas/Test_008_VerifyTheUnifiedEmptyState.spec.ts › Test case 2: Verify Unified Empty State Screen when VF is not available
- Error (9×): `Error: View "…" did not become visible in the All Views list.`
- Error (1×): `Error: View "Dirty state viewN" did not become visible in the All Views list.`
- Error (1×): `Error: View "Empty State" did not become visible in the All Views list.`

### 3. `powerbar.page.ts:verifyPowerBarEntityToolTipDetails`
- 3× PlanningSpace/PowerBar/Test_003_PowerBarForAssumption.spec.ts › Test Case 4: Verify Assumption details in power bar tooltip
- 3× PlanningSpace/PowerBar/Test_006_PowerBarForSubProcessForNewUiInPs.spec.ts › Test Case 1: Verify sub process tooltip details in sub process details page for power bar
- 3× PlanningSpace/PowerBar/Test_007_PowerBarForAssumptionInPs.spec.ts › Test Case 1: Verify assumption tooltip details in assumption details page for power bar
- Error (9×): `TimeoutError: locator.waitFor: Timeout Nms exceeded.`

## Regenerate

```bash
cd playwright-e2e
npm run triage:rank-pom -- --days 30 --until 2026-10-08 --out <file.md>
```
