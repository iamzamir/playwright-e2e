# UI inventory — plan-sop-lui

The locator reference for Process Orchestration page objects. **2,178 `data-testid` occurrences, 910 unique** (regenerated 2026-10-05 against `origin/main`).

> Locator hierarchy: `getByRole` > `getByTestId` > `getByLabel`/`getByPlaceholder`/`getByText` > CSS. **Never XPath.**
> All locators live in `playwright-e2e/pageobjects/**`, never inline in a spec.

## Routes
Base URL: `NAVIGATE_TO_PROCESS_ORCHESTRATION = LUMINATE_PORTAL_URL + POLINK`.

| Route | Context |
| --- | --- |
| `/process/:processName/summary/link/:linkId` | Process summary, deep-linked view |
| `/process/:processName/subprocess/:subprocessName/summary/link/:linkId` | Subprocess summary |
| `/process/:processName/subprocess/:subprocessName/link/:linkId` | Subprocess view |
| `/process/:processName/assumptionView/:assumptionsId/link/:linkId` | Assumption view |
| `/process/:processName/settings/:settingsId/link/:linkId` | Settings |
| `/process/:processName/:pageName/link/:linkId` | Generic page deep link |
| `/products/:processName`, `/products/:subprocessName`, `/products/:assumptionsId` | Product context |
| `*` | `NotFoundPage` |

Settings sub-navigation (`id`, `label`, `path`):

| ID | Label | Path |
| --- | --- | --- |
| `assumption-types` | Assumption Types | `/assumption-types` |
| `data-attributes` | Data Attributes | `/data-attributes` |
| `schedule-structure` | Schedule & Structure | `/schedule-structure` |
| `node-transitions` | Node Transitions | `/node-transitions` |

Back-route IDs: `PROCESS_SUMMARY`, `SUBPROCESS_SUMMARY`. `NAV_BACK` is always filtered out of side-nav items since the old view UI was retired (ABP-19158).

> The settings ids above come from lui unit-test fixtures (`DataAssumptionType.test.tsx`, `SheduleAndStructure.test.tsx`), not from a source route table; confirm them in the live DOM before locating by them.

## Components
`src/Components/` — note the capital `C`.

| Component folder | Feature area | Related specs |
| --- | --- | --- |
| `ProcessOrchestration` | Process and subprocess management — listing columns, details and editors are rendered from [UI Fields](../plan-sop-ui-fields-service/api-contract.md) config | `ProcessOrchestration/ProcessBatch/Test_001..009` |
| `CalendarManager`, `calendarmodal`, `cyclemodal` | Calendars and cycles — details and editors from UI Fields pages 22–27 | `Calendar/Test_001`, `Test_002` |
| `ViewManager` | View ↔ view-group mapping | `ViewManagerBatch/Test_001` |
| `DataAndAttributes` | Assumption types only (`AssumptionType`, `CreateAssumptionTypeModal`) — assumptions service `assumptions/v1/assumption_type`, **not** UI Fields | — **no direct coverage** |
| `Settings` | Settings screens | `ScopeBatch/Test_003_SaveAndDeleteFilterInSettings` |
| `ScenarioSelector` | Scenario selection | Shared with Planning Space |
| `SubNav` | Sub-navigation | Cross-cutting |
| `LeverBasedPlanning` | Lever-based planning | — **no direct coverage** |
| `IframeComponent` | Embedded content | — |
| `Common`, `CustomComponents` | Shared primitives | Cross-cutting |

## Most frequent test IDs
| Test ID | Count | Use |
| --- | --- | --- |
| `lui-ccl-threedot-menu-icon-button` | 63 | **Row/card overflow menu — the most common interaction in this app** |
| `lui-toolbar` | 33 | Toolbar |
| `lui-modal` | 33 | Modal |
| `common-datatable` | 31 | Data grid |
| `lui-searchbar-clear` | 29 | Clear search |
| `lui-ccl-table-row` | 28 | Grid row |
| `app-header-block` | 23 | App header |
| `lui-ccl-modal-title-close-button` | 22 | Modal close |
| `drpdown` | 20 | Dropdown *(note the spelling — `drpdown`, not `dropdown`)* |
| `threeDotButton` | 20 | Overflow menu (camelCase variant) |
| `lui-ccl-background-scroller` | 20 | Scroll container |
| `lui-ccl-table-checkbox-cell` | 19 | Grid checkbox |
| `edit-dimensions` | 17 | Dimension editor |
| `lui-ccl-button-with-dropdown-item` | 17 | Split-button item |
| `modal-title` | 16 | Modal heading |
| `lui-ccl-pagination-page-selector-select` | 16 | Pagination |
| `refresh-icon-button` / `refreshIconBtn` / `refresh-button` | 16 / 12 / 8 | **Refresh — three spellings, verify which is in the DOM** |
| `lui-ccl-threedot-menu-list` | 16 | Overflow menu list |
| `CheckBoxIcon` | 15 | Checkbox icon |
| `simple-select` | 13 | Select |
| `lui-card` | 13 | Card |
| `lui-ccl-modal` | 13 | CCL modal |
| `lui-searchbar` / `lui-search` | 12 / 12 | Search |
| `pagination` | 12 | Pagination |
| `form-modal` | 13 | Form modal |
| `action-menu-item-0..3` | 11/10/7/6 | **Positional menu items — index-based, fragile if the menu reorders** |
| `chipElement` | 11 | Chip |
| `cancel-btn` / `cancel-button` | 10 / 8 | **Cancel — two spellings** |
| `tabs-component` | 10 | Tabs |
| `vf-save-filterInstance-input-create` | 9 | Vertical filter save |
| `vf-filter-card-dropdown-button` | 8 | Vertical filter dropdown |
| `vf-filter-button` | 6 | Vertical filter trigger |
| `filter-attributes` | 8 | Filter attributes |
| `lui-empty-state` | 8 | Empty state |
| `confirmation-modal` | 7 | Confirmation dialog |
| `po-to-po-modal-procedure-autocomplete` | 7 | Procedure autocomplete |
| `po-to-po-context-modal-primary-btn` | 7 | PO-to-PO context modal |
| `form-layout-builder` | 6 | Form layout builder |
| `dialog-base` | 6 | Dialog base |

`dataTestId` (25), `props` (18), `testId` (6), `props.dataTestId` (6) are **variable names captured by the scan**, not DOM attributes. Never build a locator from them.

## Naming inconsistencies to watch
This app has several IDs with multiple spellings. Verify against the live DOM rather than assuming:

| Concept | Variants |
| --- | --- |
| Refresh | `refresh-icon-button`, `refreshIconBtn`, `refresh-button` |
| Cancel | `cancel-btn`, `cancel-button` |
| Overflow menu | `lui-ccl-threedot-menu-icon-button`, `threeDotButton` |
| Dropdown | `drpdown` (misspelled), `simple-select` |
| Search | `lui-searchbar`, `lui-search` |

## Positional locators — use with care
`action-menu-item-0` through `action-menu-item-3` and `lui-ccl-threedot-menu-listitem-0-button` are **index-based**. They break silently when a menu gains, loses, or reorders an item — and the failure looks like "clicked the wrong action" rather than "locator not found". Prefer `getByRole('menuitem', { name })` where the accessible name is stable.

## Library-owned test IDs
`lui-*` and `lui-ccl-*` come from `@by/lui-*` and CCL (`@jda/lui-common-component-library-mui5` 3.12.2) packages, mostly at the **same versions as Planning Space** — so these IDs are largely consistent across both apps. A break confined to `lui-*` IDs indicates a dependency bump, not an application change.

`vf-*` IDs come from `@by/lui-vertical-filter-component` 3.25.5 — Planning Space is on 3.25.7, so `vf-*` behaviour can differ between the apps.

## Changes since 2026-09-16
Removed with the old Scenario/View UI (ABP-19158): `drawer-close-btn`, `drawer-open-btn`, `pinned-icon`, `unpinned-icon`, `category-List`, `child-category`, `ArrowChevronDownIcon`. Added: `assumption-create`, `invalid-submit`. The drawer/pin IDs still exist in planning-mfe.

## Regenerating this inventory
```powershell
Get-ChildItem C:\Backend\plan-sop-lui -Recurse -File -Include *.ts,*.tsx |
  Where-Object { $_.FullName -notmatch 'node_modules|\\dist\\' } |
  Select-String -Pattern 'data-testid\s*=\s*["''{]([A-Za-z0-9_\-\.]+)' -AllMatches |
  ForEach-Object { $_.Matches } | ForEach-Object { $_.Groups[1].Value } |
  Group-Object | Sort-Object Count -Descending
```
