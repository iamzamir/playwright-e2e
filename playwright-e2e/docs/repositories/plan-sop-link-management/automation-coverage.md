# Automation coverage — plan-sop-link-management

The strongest backend coverage in the repo — 14 dedicated specs in `POBackendLinkManagementBatch.json`, plus 3 migration specs. **21 of 30 active routes are exercised (70%)**, plus 3 reached in setup or via PO (coverage dashboard, 2026-10-05; was 34.2% on 2026-08-31).

## Backend API specs
| Feature | Spec | Tests |
| --- | --- | --- |
| View ↔ entity mapping (process) | `ProcessOrchestrationBackend/LinkManagement/Test_001_EntityViewMappingForProcess` | 20 |
| View ↔ entity mapping (subprocess) | `Test_002_EntityViewMappingForSubprocess` | 8 |
| View ↔ entity mapping (assumption) | `Test_003_EntityViewMappingForAssumption` *(unscheduled)* | 8 |
| Procedure mapping, single view, process | `Test_004_EntityViewProcedureMappingWithSingleViewForProcess` | 20 |
| Procedure mapping, multiple views, process | `Test_005_EntityViewProcedureMappingWithMultipleViewsForProcess` | 14 |
| Procedure mapping, single view, subprocess | `Test_006_EntityViewProcedureMappingWithSingleViewForSubProcess` | 14 |
| Procedure mapping, multiple views, subprocess | `Test_007_EntityViewProcedureMappingWithMultipleViewsForSubProcess` | 14 |
| Actors and procedures | `Test_008_EntityViewActorsProcedures` | 4 |
| Preset filters | `Test_009_PresetFilterManagement` | 14 |
| Scope mapping (`GET`/`PUT`/`PATCH /scope`) | `Test_010_ScopeMapping` | 11 |
| Admin filters | `Test_011_AdminFilterManagement` | 6 |
| `lm-search/v2` and multi-entity procedure search | `Test_012_LmSearchV2ActorsAndProcedures` *(new 2026-10-01)* | 19 |
| User favourite views (untyped and typed) | `Test_013_UserFavouriteViews` *(new 2026-10-01)* | 23 |
| Global (`*`) preset filter | `Test_014_GlobalPresetFilter` *(new 2026-10-01)* | 7 |

Test_012–014 come from PSR gap plan 02 and have test data in INTEROP, QA and PSR. They seed their own views with `MappingUtil.mapSingleView`/`buildLinksUrl` and favourites with `MappingUtil.createFavourite`/`purgeFavourites` (`util/mapping.util.ts`), because LM accepts synthetic view and entity ids. Test_001, 002, 004–010 and 012 are also in `POBackendSmokeBatch.json`.

## Migration specs
| Feature | Spec | Suite |
| --- | --- | --- |
| ALM validation of link data | `Migration/Test_007_LinkManagementALMValidation` | `POBackendMigrationBatch.json` |
| Entity-view mapping migration | `Migration/Test_006_EntityViewMappingMigration` | `POBackendMigrationBatch.json` |
| Entity-view-procedure mapping migration (now carries per-view `reason`, SM-33313) | `Migration/Test_008_EntityViewProcedureMappingMigration` | `POBackendMigrationBatch.json` |

## UI specs that depend on this service
| Area | Specs | Suite |
| --- | --- | --- |
| Views management | `PlanningSpace/ViewsBatch/Test_001..017` | `ViewsBatchA.json`, `ViewsBatchB.json` |
| View search | `PlanningSpace/ViewSearch/Test_001..003`, `ProcessOrchestration/ViewSearch/Test_001..003` | `ObjectiveQuickLinksViewSearchBatch.json` |
| Duplicate view | `PlanningSpace/DuplicateView/Test_001..003` | `WorkflowFilterAndDuplicateViewsBatch.json` |
| Scope and filters | `PlanningSpace/ScopeBatch/Test_001..016`, `ProcessOrchestration/ScopeBatch/Test_001..003` | `ScopeBatch.json` |
| View ↔ procedure mapping (UI) | `PlanningSpace/ViewsBatch/Test_014_ViewProcedureMapping` | `ViewsBatchA.json`, `ViewsBatchB.json` |
| View manager | `ProcessOrchestration/ViewManagerBatch/Test_001_MapPlanningViewToViewGroup` | `ViewsBatchA.json`, `ViewsBatchB.json` |
| Favourites | `PlanningSpace/ViewsBatch/Test_005_Favourites` | `ViewsBatchA.json`, `ViewsBatchB.json` |
| Hidden views | `ViewsBatch/Test_011..013` | `ViewsBatchA.json`, `ViewsBatchB.json` |
| Drill-through view transitions | `PlanningSpace/DrillThroughBatch/Test_002`, `Test_003` | `DrillThroughBatch.json` |

## Data setup specs
| Spec | Effect |
| --- | --- |
| `DataSetupBatch/ProcessOrchestration/Test_004_DeleteAllViewMappings` | Clears all view mappings |
| `DataSetupBatch/UIDataReset/Test_001_ResetProcessScope` | Resets scope |
| `DataSetupBatch/UIDataReset/Test_002_MapViewsToContext` | Re-seeds mappings |
| `DataSetupBatch/UIDataReset/Test_005_CleanupDuplicateViews` | Removes duplicate views |

## Coverage gaps
| Gap | Risk | Suggested spec |
| --- | --- | --- |
| Entity validation job (`POST /validate`, `GET /job/validation/{task_id}`) | Medium-High — async and untested | Submit → poll → assert terminal state and payload |
| Tenant and user endpoints | Low | Smoke contract |
| Kafka event publication | Medium | Consumer-side assertion |
| Export/import `reason` round-trip as a direct API assertion | Medium | Export a view with no active procedures → import → assert `PLANNER_WANTS_NO_PROCEDURES` survives |

Closed since 2026-09-16: `lm-search/v2` bulk read (Test_012), favourites API (Test_013), `PATCH /scope` and `POST /view-entity-map/clear` (exercised in Test_010 / mapping specs).

## Known behaviour the specs rely on
- Favourites: `POST` is find-or-create on `(viewId, containerId)`, so every entity and type shares one catalogue `id` and a new `name`/`isScopeEnabled` is ignored for an existing row; `DELETE` of a missing association is 404; the untyped `GET` also returns typed favourites.
- `/search-preset` keeps one preset per view: an entity-specific preset hides the global (`*`) one. A global preset with `applyToAllUsers: true` returns `404 IBP_LINK_40_SRV_006_404`.
- planning-mfe's typed favourite `DELETE` uses `links/v1//type/...`; Azure accepts it, Gravitee answers `400 BY-API-G-C40020` (defect LM-D01 in `docs/Coverage/PSR-Gap-Plans/ActionItems-UIFields-Defect-Report.html`).
- True malformed-JSON negatives need `ApiUtil.processRawRequest` (LM answers `400 IBP_40_1022`).

## Risk ranking
| Area | Risk | Reason |
| --- | --- | --- |
| View ↔ entity mapping | High | Silently changes what the entire Planning Space UI renders |
| Scope and presets | High | Drives 16 `ScopeBatch` specs; failures look like UI bugs |
| Entity validation job | Medium-High | Async, untested |
| Procedure mapping | Medium | Well covered by `Test_004..008`; import/export semantics changed in SM-33313 |
| Favourites | Medium | Per-user state; now covered directly by `Test_013` |
