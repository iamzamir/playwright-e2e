# Automation coverage — plan-sop-planning-mfe

The most heavily covered repo in the platform — **126 specs across 21 feature folders** under `tests/PlanningSpace/**`, plus performance and visual suites.

## Feature → spec map
| Feature area | Specs | Suite JSON |
| --- | --- | --- |
| Cards and dashboards | `CardsBatch/Test_001..021` (20 specs: pivot, chart, BDE, donut, line, multi-KPI, combination, bullet, column, network, my-task, tree, table, NPI, heatmap, tabbed, resize) | `CardsBatchA.json`, `CardsBatchB.json` |
| Views management | `ViewsBatch/Test_001..017` (18 specs) | `ViewsBatchA.json`, `ViewsBatchB.json` |
| Scope and filters | `ScopeBatch/Test_001..016` | `ScopeBatch.json` |
| Scenarios | `ScenarioBatch/Test_001..015` | `ScenarioBatchA.json`, `ScenarioBatchB.json` |
| Drill-through | `DrillThroughBatch/Test_001..010` | `DrillThroughBatch.json` |
| On-demand MaaS | `OnDemandMaas/Test_001..009` (8 specs) | `OnDemandMaasBatch.json` |
| Supply chain actions | `SupplyChainActionsBatch/Test_001..006` | `SupplyChainActionsBatch.json` |
| Power bar | `PowerBar/Test_001..007` | `PowerBarBatch.json` |
| Objective bar | `ObjectiveBar/Test_001..003` | `ObjectiveQuickLinksViewSearchBatch.json` |
| View search | `ViewSearch/Test_001..003` | `ObjectiveQuickLinksViewSearchBatch.json` |
| Quick links | `QuickLinks/Test_001`, `Test_002` | `ObjectiveQuickLinksViewSearchBatch.json` |
| Workflow filter | `WorkFlowFilter/Test_001..003` | `WorkflowFilterAndDuplicateViewsBatch.json` |
| Duplicate view | `DuplicateView/Test_001..003` | `WorkflowFilterAndDuplicateViewsBatch.json` |
| Live blocks | `LiveBlocks/Test_001..003` | — |
| Last accessed context | `LastAccessedContext/Test_001`, `Test_002` | — |
| Add lane popup | `AddLanePopup/Test_011`, `Test_014` | — |
| Collaboration | `Collaboration/Test_001_CollaborationPanel` | — |
| Dirty state | `DirtyState/Test_001_DirtyState` (dirty state is **on by default** since ABP-19438; `WITH_DIRTY_STATE` now only needs setting to turn it off) | — |
| Dynamic constraints | `DynConstraints/Test_001_ConstraintsFromCapacityPivot` | — |
| NPI | `NPI/Test_001_CreatePlaceholderWithNPIFlyout` | — |
| Portal BYO | `PortalBYO/Test_001_PortalBYO` | — |
| Smoke | — | `PSSmokeBatch.json` |

The process/subprocess multilevel drill-through specs (`DrillThroughBatch/Test_007` and `Test_008`) select a currently visible numeric pivot cell without prescribing its value. They verify target navigation, context ID, scope, scenario and context controls, not service-owned measure values. An empty pivot still fails rather than skipping coverage.

## Performance specs
| Spec | Focus |
| --- | --- |
| `Performance/Test_001_NavigateToPlanning` | Baseline navigation |
| `Test_002_NavigateToPlanningParallel` | Parallel navigation |
| `Test_003_NavigateToPlanningEnhanced` | Enhanced metrics |
| `Test_004_NavigateToPlanningPage` | Page-level timing |

Config: `configs/performance-test.config.ts`, `PERFORMANCE_RUN_ITERATIONS=3`. Test data in `testdata/INTEROP/Performance/`, `testdata/PSR/Performance/`.

## Visual specs
`tests/VisualAutomation/VisualSpecs/**` with `configs/playwright.visual.config.ts`, `constants/visual.ts`, and the `visual` fixture (`validatePage`, `validateArea`). Baselines under `testdata/<ENV>/VisualAutomation/`, `testdata/INTEROP/VisualBaseValidations/`.

## Coverage gaps
| Gap | Risk | Suggested spec |
| --- | --- | --- |
| Accessibility | Medium-High — no a11y assertions anywhere | Axe scan on the main Planning Space routes |
| `GuidedWorkflow` page | Medium — a whole page folder with no direct suite | Guided workflow end-to-end |
| `ActionPlanner` page | Medium | Action planning flow |
| Playbooks UI — My Playbooks sort, custom date-range selector (ABPIBP-7534, new `date-range-picker`, `my-playbooks-sort-direction-btn`) | Medium | Playbook list filter/sort; note the AI service now computes "today" in UTC |
| Guided Workflow sort-by and action-step auto-expand (new `sort-direction-btn`) | Low-Medium | Extend `WorkFlowFilter/**` |
| `InteractivePlanningScope` | Medium — covered only via `ScopeBatch/Test_008` | Dedicated interactive-planning scope specs |
| Keyboard shortcuts (`src/shortcuts/`) | Low-Medium | Shortcut coverage |
| Localization (`src/i18n/`) | Low-Medium | Non-default locale rendering |
| IndexedDB config-cache staleness | Medium — `ConfigCacheStaleBanner` exists but is unasserted | Change config via API → assert the banner → assert refresh |
| Error/alert paths (`ProcedureAlerts`, `SnackbarAlert`) | Medium | Negative-path assertions |
| Visual coverage breadth | Medium — only 3 visual specs vs 126 functional | Extend to cards, scope, and scenario surfaces |
| Responsive / viewport variations | Low-Medium | Card resize is covered (`Test_021`), layout is not |

## Risk ranking
| Area | Risk | Reason |
| --- | --- | --- |
| Cards and dashboards | High | 20 specs over third-party `@by/lui-*` cardtype libraries; a version bump changes the DOM |
| On-demand MaaS | High | Long-running, infrastructure-dependent, needs cluster restarts |
| Scenarios | High | Shared per-process state, 15 specs, split across two batches |
| Drill-through | Medium-High | Multi-level navigation with context override |
| Scope and filters | Medium-High | 16 specs over per-user persisted state |
| Config cache | Medium | Silent staleness, no assertion today |
| Accessibility | Medium | Entirely unmeasured |
