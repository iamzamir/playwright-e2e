# Test hooks — plan-sop-planning-mfe

## Automation entry points
| Asset | Path |
| --- | --- |
| Page objects | `planning.page.ts`, `planning-listing.page.ts`, `cards.page.ts`, `scenario.page.ts`, `scope.page.ts`, `drillthrough.page.ts`, `odm.page.ts`, `sca.page.ts`, `constraint.page.ts`, `powerbar.page.ts`, `assumption.page.ts`, `portal.page.ts`, `login.page.ts` |
| Base class | `pageobjects/page.ts` |
| Fixtures | `planningPage`, `planningListingPage`, `cardsPage`, `scenarioPage`, `scopePage`, `drillThroughPage`, `odmPage`, `scaPage`, `powerBarPage`, `assumptionPage`, `portalPage`, `loginPage` |
| Visual fixture | `visual` — `validatePage()`, `validateArea()` |
| Test data | `testdata/<ENV>/PlanningSpace/`, `testdata/<ENV>/Performance/` |
| Entry URL | `NAVIGATE_TO_PLANNING_SPACE` |

## Timeout tiers
From `constants/timeouts.ts`. **Never hardcode a timeout.**

| Tier | Value | Typical use in this app |
| --- | --- | --- |
| `TINY` | 2s | Micro-settles |
| `SHORT` | 5s | Simple element appearance |
| `MEDIUM` | 10s | Modal open, panel expand |
| `LONG` | 15s | Grid render |
| `XLARGE` | 30s | Dashboard/card load |
| `EXTREME` / `ACTION` | 60s | Scenario creation, drill-through |
| `TEST` | 15min | Whole-spec budget |
| `EXTENDED` | 30min | On-demand MaaS runs |
| `POLL_INTERVAL` | 500ms | `expect.poll` cadence |
| `TYPE_CHAR_DELAY` | 50ms | Typing into search boxes |
| `POST_INPUT_SETTLE` | 200ms | Debounce settle |

## Setup recipes

### Standard Planning Space spec
| Step | Action |
| --- | --- |
| 1 | Seed the process/subprocess via the PO API |
| 2 | Map views via the Link Management API |
| 3 | Log in through `loginPage` / `portalPage` |
| 4 | Navigate to `NAVIGATE_TO_PLANNING_SPACE` |
| 5 | Wait for skeletons (`skeleton-text`, `text-skeleton`) to **detach** |
| 6 | Assert on real content |

Steps 1 and 2 through the API are far more reliable than driving the UI to create prerequisites.

### Scenario specs
| Step | Action |
| --- | --- |
| 1 | `DataSetupBatch/Scenarios/Test_004_CreateScenarios` seeds scenarios |
| 2 | `Test_002_SetBaseScenarioAsDefault` establishes the default |
| 3 | Select via `scenarioPage`, waiting on `scenario-search` / `scenario-selection-checkbox` |
| 4 | Clean up with `Test_001_DeleteScenarios` |

`ScenarioBatch` is split across `ScenarioBatchA.json` and `ScenarioBatchB.json` for runtime.

### On-demand MaaS specs
| Step | Action |
| --- | --- |
| 1 | `DataSetupBatch/ODM/Test_002_RestartMaasCluster` |
| 2 | `Test_003_RestartPlanningInstance` |
| 3 | Run `OnDemandMaas/**` |
| 4 | Poll status through `odmPage`; use the `EXTENDED` tier |

## Deterministic waits — what to use instead of a sleep
| Situation | Wait on |
| --- | --- |
| Page still loading | `skeleton-text` / `text-skeleton` to detach |
| Grid populated | `common-datatable` row locator, not a fixed delay |
| Card rendered | `lui-card` / `dashboard-renderer` visible |
| Modal open | `form-modal` / `lui-modal` visible |
| Modal closed | Same locator detached |
| Genuinely empty result | `lui-empty-state` visible |
| Search debounce | `POST_INPUT_SETTLE` after typing, then assert results |
| Long backend job | `expect.poll` with `POLL_INTERVAL` against the API |

## Browser context and caching
| Setting | Effect |
| --- | --- |
| `PW_PAGE_CACHE_SCOPE` | `worker` or `file-worker` (default `file-worker`) |
| `PW_NETWORK_ARTIFACT_MODE` | `always` / `failure-only` / `never` |
| `PW_ENABLE_GLOBAL_SETUP` | Default `true` |
| `HEADLESS` | Default `false` locally |

The app persists configuration in **IndexedDB** (see [data-model.md](data-model.md#the-indexeddb-config-cache--read-this-before-debugging-a-stale-ui)). A reused page context carries that cache between specs. If a spec must see fresh configuration, force a new context rather than reloading.

## Teardown / cleanup
| Step | Spec |
| --- | --- |
| Reset process scope | `DataSetupBatch/UIDataReset/Test_001_ResetProcessScope` |
| Re-map views | `Test_002_MapViewsToContext` |
| Clean the process | `Test_003_CleanupProcess` |
| Reset feature toggles | `Test_004_UpdateFeatureToggle` |
| Remove duplicate views | `Test_005_CleanupDuplicateViews` |
| Delete scenarios | `DataSetupBatch/Scenarios/Test_001_DeleteScenarios` |
| Delete planning instances | `DataSetupBatch/ODM/Test_001_DeletePIanningInstances` |

## Idempotency and isolation
- Scope, filter presets and favourites are **per-user** state that survives across specs — reset in teardown.
- Scenario state is shared per process; parallel scenario specs on one process will interfere.
- `DataSetupBatch` is realm-destructive — never interleave it with functional suites.
- `PlanningSpace/DirtyState/Test_001_DirtyState` depends on unsaved-state prompts; a leftover dirty state from a previous spec will break the next one.
- Card specs are split (`CardsBatchA.json`, `CardsBatchB.json`) to bound runtime — keep new card specs balanced across the two.
