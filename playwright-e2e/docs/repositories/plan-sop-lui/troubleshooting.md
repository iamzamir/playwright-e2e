# Troubleshooting — plan-sop-lui

## Known failure signatures
| Symptom | Likely cause | Check / fix |
| --- | --- | --- |
| Clicked the wrong menu action | `action-menu-item-N` is **index-based** and the menu reordered | Target by accessible name: `getByRole('menuitem', { name })` |
| Refresh locator not found | Three spellings exist: `refresh-icon-button`, `refreshIconBtn`, `refresh-button` | Verify against the live DOM |
| Cancel locator not found | Two spellings: `cancel-btn`, `cancel-button` | Same |
| Dropdown locator not found | The ID is misspelled `drpdown` | Use `drpdown` or `simple-select` |
| `lui-*` locator stopped matching | `@by/lui-*` or CCL version bump changed the DOM | Compare package versions; most (not all) are shared with Planning Space — vertical filter and scaffolding differ |
| UI shows stale data after an API change | `src/apis/cache.ts` response cache | Reload the page; use a fresh browser context |
| App points at the wrong environment | Stale generated runtime config in `public/` | Re-run `npm run setLocalEnv:<env>` |
| `npm install` fails on `@by/*` or `@jda/*` | JFrog registry not configured | Set the `@jda` registry and auth token — see [environments.md](environments.md#npm-registry) |
| Process shows the wrong status | Start/stop is async server-side | Poll `GET /process/{name}/status` via the API, then assert the UI |
| Column, detail field or editor field missing in the PO listing/details/forms | Configuration in UI Fields | Check the `POBackendUIFieldsBatch` run for the same environment, then [UI Fields troubleshooting](../plan-sop-ui-fields-service/troubleshooting.md) |
| `drawer-close-btn` / `pinned-icon` not found in PO | Removed from lui with the old view UI (ABP-19158) | They only exist in Planning Space now |
| Saved UI preference lost after reload | Before SM-40685 the cache config was saved to one service and read from another | Fixed 2026-09-29 (`uiConfiguration/v1`) — check the deployed build |
| View manager change not visible in Planning Space | Cross-app state and caching | Reload Planning Space; verify via the Link Management API |
| Grid empty but data exists | Filter preset from a previous spec still applied | Reset filters in teardown; presets are per-user |
| Authorization spec gets the wrong result | Second automation user missing from the realm | Confirm `FUNCTIONAL_TEST_USERNAME2` exists |
| Login fails suite-wide | Portal URL or realm mismatch | Check `LUMINATE_PORTAL_URL`, `POLINK`, `REALM_NAME` in the `[setup]` line |
| Visual spec diffs unexpectedly | Baseline from a different environment or viewport | Regenerate per environment under `testdata/<ENV>/VisualAutomation/` |
| Locator built from `dataTestId` / `props` / `testId` never matches | Those are **variable names**, not DOM attributes | Use a literal test ID — see [ui-inventory.md](ui-inventory.md#most-frequent-test-ids) |

## Where to look
| Signal | Location |
| --- | --- |
| Resolved env config | `[setup] ...` console line |
| Network traffic | Allure attachments (`PW_NETWORK_ARTIFACT_MODE`) |
| Which service produced a value | `src/apis/apis.ts`, `src/apis/apiInfo.ts` |
| Client cache behaviour | `src/apis/cache.ts` (and `cache.test.ts`) |
| Client state | `src/actions/`, `src/reducers/` |
| Runtime config in use | Generated files under `public/` |
| Legacy WDIO reference | `e2e/` — for migration context only |

## Flaky areas
| Area | Why | Mitigation |
| --- | --- | --- |
| Overflow-menu actions | Index-based locators, 63 usages of the trigger | Target by accessible name |
| Grid rendering | Async data, pagination | Wait on `lui-ccl-table-row` or `lui-empty-state` |
| Search inputs | Debounced | `TYPE_CHAR_DELAY` + `POST_INPUT_SETTLE` |
| Process start/stop | Async server-side | Poll the API, then assert the UI |
| Filter presets and settings | Per-user state persisting across specs | Reset in teardown |
| API response cache | Silent staleness | Reload or use a fresh context |
| Cross-app state (view manager) | Affects Planning Space suites | Sequence suites deliberately |
| Test-ID naming drift | Multiple spellings for the same concept | Verify against the DOM before adding a locator |
