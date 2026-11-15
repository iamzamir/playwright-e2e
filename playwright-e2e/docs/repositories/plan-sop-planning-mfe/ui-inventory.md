# UI inventory — plan-sop-planning-mfe

The locator reference for Planning Space page objects. **2,063 `data-testid` occurrences, 1,083 unique** (regenerated 2026-10-05 against `origin/main`).

> Locator hierarchy for this repo: `getByRole` > `getByTestId` > `getByLabel`/`getByPlaceholder`/`getByText` > CSS. **Never XPath.**
> All locators live in `playwright-e2e/pageobjects/**`, never inline in a spec.

## Routes
Base URL: `NAVIGATE_TO_PLANNING_SPACE = LUMINATE_PORTAL_URL + PSLINK`.

| Route | Context |
| --- | --- |
| `/process/:processName/plan` | Process plan — the most-used route in the app |
| `/process/:processName/summary` | Process summary |
| `/process/:processName/subprocess/:subprocessName` | Subprocess summary |
| `/process/:processName/assumptionView/:assumptionID` | Assumption view |
| `/process/:processName/:pageName/link/:linkId` | Deep link into a view |
| `/process/:processName/settings/:settingsId` | Settings |
| `/process/:processName/actionslog/entity/:id` | Supply chain action log |
| `/process/:processName/processplan/entity/:id` | Process plan by entity |
| `/views` | View listing |

Named back-route IDs used for breadcrumb navigation: `PROCESS_SUMMARY`, `SUBPROCESS_SUMMARY`, `PROCESS_PLAN`, `ASSUMPTION`, `SUPPLY_CHAIN_ACTION`, `NAV_BACK`. Relevant to `DrillThroughBatch/Test_010_ContextOverrideNavUsingBreadcrumbs`.

## Pages
`src/pages/` — each maps to an automation feature area.

| Page folder | Feature area | Related specs |
| --- | --- | --- |
| `ActionPlanner` | Action planning | `PlanningSpace/CardsBatch` |
| `Assumptions` | Assumption views | `ObjectiveBar/Test_003`, `PowerBar/Test_007` |
| `ContextSetting` | Context switching | `PowerBar/Test_005_ContextSwitcher` |
| `GuidedWorkflow` | Guided workflow | `WorkFlowFilter/**` |
| `InteractivePlanning` | Interactive planning grid | `LiveBlocks/**`, `DynConstraints/**` |
| `InteractivePlanningScope` | Scope within planning | `ScopeBatch/Test_008_ScopeInInteractiveProcedure` |
| `PortalDashboardRenderer` | Dashboard host | `CardsBatch/**` |
| `SCADetails`, `SCAListTable` | Supply chain actions | `SupplyChainActionsBatch/**` |
| `ScenarioDetails`, `ScenarioTable` | Scenarios | `ScenarioBatch/**` |
| `FlyoutWrapper`, `ModalWrapper`, `PageWrapper` | Layout shells | Cross-cutting |

## Components
`src/components/` — 24 folders.

| Component | Notable test IDs | Related specs |
| --- | --- | --- |
| `ScenarioSelector` | `scenario-search`, `scenario-selection-checkbox`, `edit-scenario-modal` | `ScenarioBatch/**` |
| `SideNav`, `SCASideNav` | `side-drawer`, `dashboard-nav` | `ScenarioBatch/Test_011_SelectScenarioinSidenav` |
| `QuickFilter` | `quick-filter`, `vertical-filter`, `default-vertical-filter` | `ScopeBatch/Test_015_QuickFilter` |
| `PivotTable` | `common-datatable`, `lui-ccl-table-row` | `CardsBatch/Test_003_MaasPivotCard` |
| `LiveBlocks` | — | `LiveBlocks/Test_001..003` |
| `ActionItemFormModal` | `form-modal`, `form-builder`, `save-btn`, `cancel-btn` | `ActionItemsBatch/**` |
| `AssumptionFormModal` | `form-modal`, `modal-title` | Assumption specs |
| `ConfirmationModal`, `DirtyStateConfirmationModal` | `delete-confirmation`, `modal-content` | `DirtyState/Test_001_DirtyState` |
| `Toolbar` | `action-box`, `header-actions`, `refresh-btn` | Cross-cutting |
| `DynamicDashboardLoader` | `dashboard-renderer`, `lui-card` | `CardsBatch/**` |
| `EditView` | `save-btn`, `cancel-btn` | `ViewsBatch/Test_004_RefreshAndEditView` |
| `ProcedureAlerts`, `SnackbarAlert` | — | Error-path assertions |
| `ConfigCacheStaleBanner` | — | See the config-cache note below |
| `TextFieldsSkeleton` | `skeleton-text`, `text-skeleton` | **Loading-state markers — useful as negative waits** |

## Most frequent test IDs
Highest-occurrence IDs, i.e. the ones page objects should standardise on.

| Test ID | Count | Use |
| --- | --- | --- |
| `tooltip-trigger` | 28 | Tooltip anchors |
| `dataTestId` / `getTestId` / `testId` / `props` | 23/12/10/11 | **Prop pass-through, not real DOM IDs — do not target** |
| `form-modal` | 20 | Generic modal container |
| `side-drawer` | 19 | Side navigation drawer |
| `lui-card` | 19 | Dashboard card |
| `cancel-btn` | 17 | Cancel action |
| `latest-scp-inprogress` | 15 | SCP progress indicator |
| `save-btn` | 13 | Save action |
| `modal-title` | 14 | Modal heading |
| `action-box` | 14 | Action container |
| `app-header-block` | 13 | App header |
| `vertical-filter` | 13 | Vertical filter panel |
| `lui-popover` | 13 | Popover |
| `delete-confirmation` | 13 | Delete confirmation dialog |
| `common-datatable` | 12 | Data grid |
| `lui-modal` | 12 | LUI modal |
| `lui-chip` | 11 | Chip |
| `close-button` / `close-icon` | 11 / 8 | Dismiss |
| `lui-ccl-table-checkbox-cell` | 10 | Grid checkbox cell |
| `dimension-scope` | 10 | Scope dimension |
| `quick-filter` | 9 | Quick filter |
| `search-input` | 8 | Search box |
| `tabs-component` | 8 | Tabs |
| `scenario-search` | 7 | Scenario search |
| `skeleton-text` / `text-skeleton` | 7 / 7 | Loading placeholders |
| `power-bar` | 5 | Power bar |

`dataTestId`, `getTestId`, `testId`, `props`, `box`, `styled-box` are **variable names captured by the scan**, not literal DOM attributes. Never build a locator from them.

## Library-owned test IDs
IDs prefixed `lui-` come from `@by/lui-*` packages, not this repo: `lui-card`, `lui-modal`, `lui-popover`, `lui-chip`, `lui-divider`, `lui-empty-state`, `lui-searchbar-clear`, `lui-list-item`, `lui-object-status`, `lui-drill-down-menu`, `lui-ccl-table-row`, `lui-ccl-table-checkbox-cell`.

These are largely stable across both micro-frontends but change when the library version changes. Most shared libraries are at the same version in lui; `lui-vertical-filter-component` (3.25.7 here, 3.25.5 in lui), scaffolding and `plan-sop-ui-library` differ.

## Changes since 2026-09-16
- Removed with the old Scenario/View UI (ABP-19158): `scenario-information-column`, `scenario-list-filter-icon`, `horizon-filter-side-nav`, `plan-sop-process-details-sideNav`. No automation page object used them.
- Added: `date-range-picker` (playbooks custom date range), `my-playbooks-sort-direction-btn`, `sort-direction-btn` (guided workflow sort), `scenario-chip`. `scenario-chip-btn`, used by `planning.page.ts`, `powerbar.page.ts` and `scenario.page.ts`, is unchanged.
- `OVERFLOW_FLAG_TEST_ID`, `TEST_ID`, `WRAPPER_TEST_ID` and `test.title.typography` are constants/expressions captured by the scan (text-truncation refactor), not literal IDs. A locator break confined to `lui-*` IDs points at a dependency bump, not an application change.

## Loading and empty states
| Test ID | Meaning |
| --- | --- |
| `skeleton-text`, `text-skeleton` | Content still loading |
| `lui-empty-state`, `empty-state-heading`, `empty-state-subheading` | No data |

Prefer waiting for a skeleton to **detach** over waiting for a fixed timeout — this is the deterministic alternative to a static sleep on this app. `OnDemandMaas/Test_008_VerifyTheUnifiedEmptyState` asserts the empty state directly.

## Regenerating this inventory
```powershell
Get-ChildItem C:\Backend\plan-sop-planning-mfe -Recurse -File -Include *.ts,*.tsx |
  Where-Object { $_.FullName -notmatch 'node_modules|\\dist\\' } |
  Select-String -Pattern 'data-testid\s*=\s*["''{]([A-Za-z0-9_\-\.]+)' -AllMatches |
  ForEach-Object { $_.Matches } | ForEach-Object { $_.Groups[1].Value } |
  Group-Object | Sort-Object Count -Descending
```
