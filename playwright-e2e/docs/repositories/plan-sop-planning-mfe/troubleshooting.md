# Troubleshooting — plan-sop-planning-mfe

## Known failure signatures
| Symptom | Likely cause | Check / fix |
| --- | --- | --- |
| `getByTestId` no longer matches a `lui-*` ID | `@by/lui-*` dependency version bump changed the DOM | Compare the package version; update the page object, not the spec |
| Element found but not interactable | Skeleton still rendered over it | Wait for `skeleton-text` / `text-skeleton` to **detach** |
| Grid empty but data exists | View mapping wrong, or scope filter excludes everything | Check [Link Management](../plan-sop-link-management/troubleshooting.md); reset scope |
| Column or filter missing | Card/dashboard configuration or vertical-filter configuration changed, or a stale IndexedDB config cache | Reload with a fresh context; check the view's card config and `verticalFilterBff`. (UI Fields is not called by Planning Space.) |
| Unexpected "unsaved changes" prompt when leaving a view | Dirty state is **on by default** since ABP-19438 (2026-09-29) | Save or discard explicitly before navigating; `WITH_DIRTY_STATE` only turns it off |
| Demand-prioritization cards missing | `WITH_DEMAND_PRIORITIZATION_CARDS` is default-disabled | Enable the flag for the realm if a spec needs those cards |
| Old scenario filter / view filter UI never appears | `WITH_NEW_SCENARIO_FILTER` and `WITH_NEW_VIEW_FILTER_UI` were removed — the new UI is permanent (ABP-19158) | Toggling those flags has no effect any more |
| Old configuration shown after an API change | **IndexedDB config cache** | Use a fresh browser context; look for `ConfigCacheStaleBanner` |
| App points at the wrong environment | Stale generated runtime config in `public/` | Re-run `npm run setLocalEnv:<env>` |
| `npm install` fails on peer dependencies | Peer deps do not resolve cleanly | Use `npm install --legacy-peer-deps` |
| Build fails or behaves oddly | Wrong Node version | Use Node **22.13.1** from `.nvmrc` (the README's 18.19.0 is stale) |
| Build runs out of memory | Large bundle | `NODE_OPTIONS=--max-old-space-size=16384` is already set in the build scripts |
| Locator built from `dataTestId` / `getTestId` / `testId` / `props` never matches | These are **variable names**, not DOM attributes | Use a real literal test ID — see [ui-inventory.md](ui-inventory.md#most-frequent-test-ids) |
| Scenario spec sees the wrong scenario | Shared per-process scenario state | Run scenario specs serially; reset the default scenario |
| Dirty-state prompt blocks navigation unexpectedly | Unsaved state left by a previous spec | Clean up in teardown; `DirtyState/Test_001` is sensitive to this |
| On-demand MaaS spec times out | Cluster or planning instance not running | Run `DataSetupBatch/ODM/Test_002`, `Test_003` first; use the `EXTENDED` tier |
| Drill-through lands on the wrong context | Breadcrumb back-route resolution | Check the back-route IDs in [ui-inventory.md](ui-inventory.md#routes) |
| Card renders blank | Cardtype library mismatch, or no data for the scenario/scope | Check the browser console and the card's backing API call |
| Visual spec diffs on unrelated pixels | Baseline captured on a different environment or viewport | Regenerate baselines per environment under `testdata/<ENV>/VisualAutomation/` |
| Suite-wide login failures | Portal URL or realm mismatch | Check `LUMINATE_PORTAL_URL`, `PSLINK`, `REALM_NAME` in the `[setup]` log line |

## Where to look
| Signal | Location |
| --- | --- |
| Resolved env config | `[setup] ...` console line from `configs/setup.js` |
| Network traffic | Allure attachments, controlled by `PW_NETWORK_ARTIFACT_MODE` |
| Which service produced a value | `src/apis/apis.ts`, `src/apis/apiInfo.ts` |
| Client state | `src/reducers/` |
| Cached configuration | IndexedDB, store keyed on `cacheKey` |
| Runtime config in use | Generated files under `public/` |
| App's own context tests | `src/e2eTesting/` — useful reference for expected context resolution |
| Bundle health | `npm run analyze:health`, `npm run check:chunks` |

## Flaky areas
| Area | Why | Mitigation |
| --- | --- | --- |
| Card rendering | Third-party cardtype libraries, async data | Wait on `lui-card` / `dashboard-renderer`, never a fixed delay |
| Skeleton → content transition | Variable load time | Assert skeleton detachment |
| Search and filter inputs | Debounced | Use `TYPE_CHAR_DELAY` and `POST_INPUT_SETTLE` |
| Scenario selection | Shared per-process state | Serialize; reset defaults |
| Scope and presets | Per-user state persists across specs | Reset in teardown |
| On-demand MaaS | Infrastructure-dependent, long-running | `EXTENDED` tier; restart cluster in data setup |
| Config cache | Silent staleness | Fresh context per spec |
| Drill-through | Multi-step navigation | Assert context at each hop, not only at the end |
| Visual specs | Font/render variance across machines | Pin the environment; keep baselines per environment |
