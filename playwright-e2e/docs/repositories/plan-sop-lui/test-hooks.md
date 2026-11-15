# Test hooks — plan-sop-lui

## Automation entry points
| Asset | Path |
| --- | --- |
| Page objects | `process.page.ts`, `process-settings.page.ts`, `action-items.page.ts`, `powerbar.page.ts`, `assumption.page.ts`, `scope.page.ts`, `global-settings.page.ts`, `portal.page.ts`, `login.page.ts` |
| Base class | `pageobjects/page.ts` |
| Fixtures | `processPage`, `processSettingsPage`, `actionItemsPage`, `powerBarPage`, `assumptionPage`, `scopePage`, `globalSettingsPage`, `portalPage`, `loginPage` |
| Visual fixture | `visual` — `validatePage()`, `validateArea()` |
| Test data | `testdata/<ENV>/ProcessOrchestration/` |
| Entry URL | `NAVIGATE_TO_PROCESS_ORCHESTRATION` |

## Timeout tiers
From `constants/timeouts.ts`. **Never hardcode a timeout.**

| Tier | Value | Typical use here |
| --- | --- | --- |
| `SHORT` | 5s | Menu open |
| `MEDIUM` | 10s | Modal open, dropdown populate |
| `LONG` | 15s | Grid render |
| `XLARGE` | 30s | Process list load, calendar render |
| `EXTREME` / `ACTION` | 60s | Process start/stop through the UI |
| `POLL_INTERVAL` | 500ms | `expect.poll` cadence |
| `TYPE_CHAR_DELAY` | 50ms | Typing into `lui-searchbar` |
| `POST_INPUT_SETTLE` | 200ms | Debounce settle |

## Setup recipes

### Standard Process Orchestration spec
| Step | Action |
| --- | --- |
| 1 | Seed the process via the PO API (`POST /process/template`) — far faster and more reliable than the UI |
| 2 | Log in through `loginPage` / `portalPage` |
| 3 | Navigate to `NAVIGATE_TO_PROCESS_ORCHESTRATION` |
| 4 | Wait for `common-datatable` rows or `lui-empty-state`, whichever is expected |
| 5 | Assert |

### Row actions via the overflow menu
The dominant interaction pattern in this app (`lui-ccl-threedot-menu-icon-button`, 63 occurrences):

| Step | Action |
| --- | --- |
| 1 | Locate the row (`lui-ccl-table-row`) |
| 2 | Click `lui-ccl-threedot-menu-icon-button` within that row |
| 3 | Wait for `lui-ccl-threedot-menu-list` |
| 4 | Select the item **by accessible name**, not by `action-menu-item-N` index |

### Calendar and cycle
| Step | Action |
| --- | --- |
| 1 | Create via `CalendarManager` / `calendarmodal` / `cyclemodal`, or seed via the API |
| 2 | Wait for modal `lui-modal` / `form-modal` |
| 3 | Save (`save-btn`) and wait for the modal to detach |
| 4 | Verify in the grid |

### Process start / stop through the UI
| Step | Action |
| --- | --- |
| 1 | Trigger start from the process row menu |
| 2 | **Poll `GET /process/{name}/status` via the API** rather than waiting on UI text |
| 3 | Then assert the UI reflects the new status |

Start and stop are asynchronous server-side — see [PO test hooks](../plan-sop-process-orchestration-service/test-hooks.md#async-behaviour--what-to-wait-on).

### View manager setup for Planning Space specs
`ViewManagerBatch/Test_001_MapPlanningViewToViewGroup` configures state that Planning Space suites then rely on. Run it before the dependent suites, or seed the same state through the Link Management API.

## Deterministic waits — what to use instead of a sleep
| Situation | Wait on |
| --- | --- |
| Grid populated | `lui-ccl-table-row` count, or `lui-empty-state` |
| Menu open | `lui-ccl-threedot-menu-list` visible |
| Modal open | `lui-modal` / `lui-ccl-modal` / `form-modal` visible |
| Modal closed | Same locator detached |
| Search debounce | `POST_INPUT_SETTLE` after typing, then assert |
| Pagination change | `lui-ccl-pagination-page-selector-select` then row refresh |
| Async server work | `expect.poll` against the API, not the UI |

## API response cache
`src/apis/cache.ts` caches API responses client-side. After mutating data through the API mid-spec, the UI may still show the previous value. Reload the page rather than waiting, and prefer a fresh browser context when a spec must start from a clean cache.

## Teardown / cleanup
| Step | Spec / call |
| --- | --- |
| Delete processes | `DataSetupBatch/ProcessOrchestration/Test_001_DeleteProcesses` |
| Delete calendars | `Test_005_DeleteAllCalendars` |
| Delete supply chain actions | `Test_007_DeleteAllSupplyChainActions` |
| Delete unused roles | `Test_008_DeleteUnusedProcessRoles` |
| Reset filters in settings | Clear presets via Link Management |

## Idempotency and isolation
- Process names are unique per realm — generate a run-scoped suffix.
- Settings and filter presets are **per-user** state that survives across specs; reset in teardown.
- View-manager changes affect Planning Space suites running against the same realm.
- `DataSetupBatch` is realm-destructive — never interleave it with functional suites.
- Do not extend the legacy `e2e/` WebdriverIO suite in this repo; new coverage belongs in `playwright-e2e/`.
