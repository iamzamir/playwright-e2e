# Troubleshooting — plan-sop-link-management

## Known failure signatures
| Symptom | Likely cause | Check / fix |
| --- | --- | --- |
| HTTP 400 on a mapping call | `{type}` is not a seeded entity type | Check the `entity_types` lookup — assumption views use `assumptiontype`, not `assumption` |
| HTTP 404 on `/view-entity-map` | The view ID or the source entity does not exist | `GET /views` to resolve real view IDs; confirm the entity is registered |
| UI shows the wrong views, API returns 200 | Mapping succeeded for a different entity or type | Re-`search` the exact `(view, type, entity)` triple |
| UI shows no views at all | `POST /view-entity-map/clear` ran, or a `DataSetupBatch` cleanup interleaved | Re-run `DataSetupBatch/UIDataReset/Test_002_MapViewsToContext` |
| Duplicate views in the list | Repeated seeding without cleanup | Run `DataSetupBatch/UIDataReset/Test_005_CleanupDuplicateViews` |
| Cleanup deletes nothing | `DELETE_VIEW_ENTITY_MAP` is hardcoded to `type/subprocess` | Build the path manually for process/assumption entities |
| Every endpoint 404s / service will not start | Liquibase changelog lock held after a crashed deploy | Liquibase waits up to **45 minutes**; clear the lock row |
| Validation spec times out | `POST /validate` is async | Poll `GET /job/validation/{task_id}`, use the `EXTENDED` tier |
| Scope changes not visible | `PATCH` vs `PUT` semantics — `PATCH` only sets `quickFilterConfigId` | Use `PUT /scope` for a full replacement |
| 403 on a view that exists | View not visible to the calling user | Check realm role; this is the mechanism behind `ViewsBatch/Test_002`, `Test_003` |
| Intermittent slowness on bulk mapping | Batch size 50, pool 100 | Prefer `lm-search/v2` for bulk reads |
| `POST /view-entity-map` removed other mappings | It replaces **all** mappings of the listed entities | Send the full intended set, or use the single-view `PUT`/`DELETE` routes (`MappingUtil.mapSingleView`) |
| Favourite created with a new name, but the old name comes back | `POST` favourites is find-or-create on `(viewId, containerId)`; name/`isScopeEnabled` are ignored for an existing row | Use stable favourite ids; `purgeFavourites` in teardown |
| Favourite catalogue keeps growing | `DELETE` removes the user's association, not the catalogue row | Expected; do not assert catalogue size |
| Typed favourite DELETE fails only on Gravitee with `400 BY-API-G-C40020` | planning-mfe builds `links/v1//type/...` (double slash); Azure tolerates it | Known defect LM-D01 — see the defect report |
| Global preset with `applyToAllUsers: true` → `404 IBP_LINK_40_SRV_006_404` | LIAM has no `*.*` resource | Known behaviour; use an entity-specific preset |
| Entity-specific preset hides the global one | `/search-preset` keeps one preset per view | Clear the entity preset first |
| Malformed-JSON negative gets a type error, not `400 IBP_40_1022` | `processAPIRequest` JSON-encodes string bodies | Use `ApiUtil.processRawRequest` |
| After ALM import, a view that had "no procedures" now has none mapped *and* a reason row | SM-33313 preserves `PLANNER_WANTS_NO_PROCEDURES` on import | Expected since 2026-09-24 — assert the reason, not the absence of a row |

## Where to look
| Signal | Location |
| --- | --- |
| Resolved env config | `[setup] ...` console line |
| Effective mappings | `POST /view-entity-map/search` for the exact entity |
| Async job state | `job` table / `GET /job/validation/{task_id}` |
| Soft-deleted rows | `archived_records` table |
| Liquibase lock | `DATABASECHANGELOGLOCK` in `linkMgr` |
| Hibernate statistics | Enabled (`generate_statistics: true`) in service logs |

## Flaky areas
| Area | Why | Mitigation |
| --- | --- | --- |
| View mapping vs. UI render | UI caches the view list | Reload the page rather than waiting; assert on the API first |
| Shared views across specs | Views are realm-scoped, entities are not | Scope assertions by entity, never by global view list |
| Preset and scope specs | Order-dependent state | Use `test.describe.serial`; clear presets in teardown |
| Entity validation | Async, no coverage today | Always poll the job endpoint |
| Post-`DataSetupBatch` runs | Realm-wide destructive cleanup | Never interleave data-setup with functional suites |
| Kafka-driven downstream state | Eventual consistency | Poll the consumer, never assert immediately |
