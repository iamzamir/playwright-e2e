# Test hooks — plan-sop-link-management

## Automation entry points
| Asset | Path |
| --- | --- |
| API helper | [playwright-e2e/util/api.util.ts](../../../util/api.util.ts) |
| LM helper | [playwright-e2e/util/mapping.util.ts](../../../util/mapping.util.ts) — `buildLinksUrl`, `MappingUtil.mapSingleView`/`unmapSingleView`, `createFavourite`, `getFavourites`, `deleteFavourite`, `purgeFavourites` |
| Page objects | `scope.page.ts`, `planning.page.ts`, `planning-listing.page.ts`, `global-settings.page.ts` |
| Fixtures | `scopePage`, `planningPage`, `planningListingPage`, `globalSettingsPage` |
| Test data | `playwright-e2e/testdata/<ENV>/ProcessOrchestrationBackend/` |
| Env vars | `VIEW_ENTITY_MAP`, `VIEW_ENTITY_PROCEDURE_MAP`, `DELETE_VIEW_ENTITY_MAP`, `DELETE_ENTITY_VIEW_PROCEDURE_MAP` |

## Setup recipes

### Map views to an entity
| Step | Call |
| --- | --- |
| 1 | Ensure the process/subprocess/assumption exists |
| 2 | Resolve view IDs — `GET /views` |
| 3 | `POST /view-entity-map` with `{view, type, entity}` |
| 4 | Verify with `POST /view-entity-map/search` |

`type` must be a seeded entity type (`process`, `subprocess`, `assumptiontype` for assumption views, actor types…) — an unknown value returns 400. `POST /view-entity-map` **replaces all mappings** of the listed entities.

LM does not check that view or entity ids exist for `lm-search/v2`, favourites or presets, so backend specs can seed synthetic ids with `MappingUtil.mapSingleView` instead of creating real dashboards (`Test_012`–`014` do this).

### Map a view to a procedure
| Step | Call |
| --- | --- |
| 1 | Create the view mapping first |
| 2 | `POST /entity-view-procedure-map` |
| 3 | Verify with `POST /entity-view-procedure-map/search` |

### Scope and filter presets
| Step | Call |
| --- | --- |
| 1 | `POST /preset` to create a preset |
| 2 | `PUT /scope` or `PATCH /scope` (`quickFilterConfigId`) to bind it |
| 3 | `GET /scope` to verify |
| 4 | `POST /preset/clear` to reset |

### Entity validation (async)
| Step | Call |
| --- | --- |
| 1 | `POST /validate` → capture `task_id` from `JobResponseDto` |
| 2 | Poll `GET /job/validation/{task_id}` with `expect.poll` |
| 3 | Never assert on the `POST /validate` response body alone |

## Teardown / cleanup
| Step | Call | Owning spec |
| --- | --- | --- |
| Remove one mapping | `DELETE /view-entity-map/views/{view}/type/{type}/entity/{entity}` | `DataSetupBatch/.../Test_004_DeleteAllViewMappings` |
| Remove all mappings for an entity | `POST /view-entity-map/clear` | — (**destructive**) |
| Remove procedure mapping | `DELETE /entity-view-procedure-map/type/{type}/entity/{entity}/views/{viewId}` | — |
| Clear presets | `POST /preset/clear` | — |
| Remove favourites | `DELETE /entity/{entityId}/views/{viewId}` | — |
| Deduplicate views | — | `DataSetupBatch/UIDataReset/Test_005_CleanupDuplicateViews` |
| Re-map views to context | — | `DataSetupBatch/UIDataReset/Test_002_MapViewsToContext` |
| Reset process scope | — | `DataSetupBatch/UIDataReset/Test_001_ResetProcessScope` |

## Async behaviour — what to wait on
| Operation | Async? | Deterministic wait |
| --- | --- | --- |
| View mapping create/delete | Sync | Re-`search` and assert the mapping set |
| `POST /view-entity-map/clear` | Sync | `search` returns empty |
| `POST /validate` | **Async** | Poll `GET /job/validation/{task_id}` |
| Export / import | Async | Poll the corresponding job endpoint |
| UI view list after a mapping change | Eventual | Wait on the view-list locator; a hard reload may be required |
| Kafka-published events | Eventual | Poll the consuming service, never assert immediately |

Suggested tiers: `XLARGE` for mapping calls, `EXTENDED` (30 min) for validation jobs, matching `spring.mvc.async.request-timeout`.

## Idempotency and isolation
- Mappings are keyed on `(view, type, entity)`; re-posting updates rather than duplicating, so setup is re-runnable.
- `POST /view-entity-map/clear` wipes every mapping for an entity — never run it against a shared entity.
- The `DELETE_*` env-var templates assume `type/subprocess`; build paths manually for other entity types.
- Views are shared across the realm. Two specs mapping different view sets to the same entity will interfere — scope by entity, not by view.
- Liquibase's 45-minute lock wait means a crashed deployment can leave the service unstartable; a suite-wide 404 storm is a symptom.
