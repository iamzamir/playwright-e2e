# Automation coverage — plan-sop-lui

**28 specs across 9 feature areas** under `tests/ProcessOrchestration/**`, plus visual specs. The listing, details and editor screens these specs drive are configured by [UI Fields](../plan-sop-ui-fields-service/automation-coverage.md), whose four lui-used routes now have backend contract specs (`POBackendUIFieldsBatch`).

## Feature → spec map
| Feature area | Specs | Suite JSON |
| --- | --- | --- |
| Process management | `ProcessBatch/Test_001_ProcessActions`, `Test_002_AdoptVariantWhileCreateEditProcess`, `Test_003_SubProcessActionsFromSettings`, `Test_004_ValidateSubProcessCreation`, `Test_005_ProcedureTriggersOnProcessStart`, `Test_006_ProcessStartCloseCases`, `Test_007_CloseSubprocessProcess`, `Test_008_ProcedureMappingToProcess` | — |
| Action items | `ActionItemsBatch/Test_001..004` | — |
| Calendar | `Calendar/Test_001_CreateEditDeleteCalendarAndCycles`, `Test_002_EditProcessCalendarAndCycle` | — |
| Power bar | `PowerBar/Test_001..005` | `PowerBarBatch.json` |
| Objective bar | `ObjectiveBar/Test_001_ObjectiveBarInPO` | `ObjectiveQuickLinksViewSearchBatch.json` |
| View search | `ViewSearch/Test_001..003` | `ObjectiveQuickLinksViewSearchBatch.json` |
| Quick links | `QuickLinks/Test_001_EasyAccessQuickLinksFromPO` | `ObjectiveQuickLinksViewSearchBatch.json` |
| Scope | `ScopeBatch/Test_001_SaveAndDeleteFilterInAssumption`, `Test_002_ScopePresetMappingInAssumption`, `Test_003_SaveAndDeleteFilterInSettings` | `ScopeBatch.json` |
| View manager | `ViewManagerBatch/Test_001_MapPlanningViewToViewGroup` | `ViewsBatchA.json`, `ViewsBatchB.json` |

## Visual specs
| Spec |
| --- |
| `VisualAutomation/VisualSpecs/Test_001_PowerBarPOVisualValidation` |
| `VisualAutomation/VisualSpecs/Test_002_ViewSearchPOVisualValidation` |
| `VisualAutomation/VisualSpecs/Test_001_EasyAccessQuickLinksFromPO` |

Baselines under `testdata/<ENV>/VisualAutomation/`.

## Coverage gaps
| Gap | Risk | Suggested spec |
| --- | --- | --- |
| **`LeverBasedPlanning` component** | Medium-High — an entire feature folder with no coverage | End-to-end lever-based planning flow |
| **Node transitions** (`/node-transitions`) | Medium-High — a settings screen over `TransitionController`, untested via UI | Create, view hierarchy, delete transitions |
| **Assumption types** (`/assumption-types`) | Medium | Settings CRUD |
| **Data & Attributes** (`/data-attributes`) | Medium | Assumption-type CRUD over the assumptions service (not UI Fields) |
| **Schedule & Structure** (`/schedule-structure`) | Medium | Node schedule configuration |
| Supply chain actions in PO UI | Medium — covered in Planning Space, not here | SCA management from the PO surface |
| Templates UI | Medium | Template CRUD from the UI |
| `IframeComponent` | Low-Medium | Embedded content rendering |
| Pagination | Medium — `lui-ccl-pagination-*` is heavily used, never asserted | Page-size and navigation behaviour |
| Accessibility | Medium-High | Axe scan on the main PO routes |
| `NotFoundPage` (`*` route) | Low | 404 handling |
| API response cache staleness | Medium | Mutate via API → assert the UI refreshes |

Four of the settings sub-navigation screens are entirely untested, and they are exactly where configuration that other suites depend on is edited.

## Legacy WDIO coverage
The repo carries its own `e2e/` WebdriverIO suite with Sauce Labs and mobile-availability configs. It is **superseded** by `playwright-e2e/`. Treat it as reference material when migrating, and do not extend it.

## Risk ranking
| Area | Risk | Reason |
| --- | --- | --- |
| Settings screens | **High** | Four untested screens that configure state other suites depend on |
| Process lifecycle UI | High | Well covered, but async start/stop makes it timing-sensitive |
| Overflow-menu interactions | Medium-High | Index-based `action-menu-item-N` locators break silently on reorder |
| View manager | Medium-High | Single spec, but it seeds state for Planning Space suites |
| Calendar | Medium | Two specs; date-boundary sensitive |
| Test-ID naming drift | Medium | Multiple spellings for refresh, cancel, dropdown, search |
| Accessibility | Medium | Unmeasured |
