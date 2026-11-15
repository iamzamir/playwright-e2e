# API contract — plan-sop-link-management

Source of truth: 10 controllers under `src/main/java/**/controller`.

> Full URL = `${API_BASE_URL}` + gateway prefix + path. See [environments.md](environments.md).
> INTEROP old-mode prefix: `cbp/interop/ibp/links/v1`.

## Auth
| Aspect | Value |
| --- | --- |
| Scheme | OAuth2 Bearer |
| RBAC | LIAM-backed; view visibility is also filtered per user |

## ViewEntityMapController — the core mapping surface
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/view-entity-map/search` | Views for a single entity |
| POST | `/view-entity-map/lm-search/v2` | Views for **many** entities — preferred bulk read |
| POST | `/view-entity-map` | Map views to an entity |
| PUT | `/view-entity-map/views/{view}/type/{type}/entity/{entity}` | Update one mapping |
| DELETE | `/view-entity-map/views/{view}/type/{type}/entity/{entity}` | Remove one mapping |
| POST | `/view-entity-map/clear` | **Remove all mappings for an entity — destructive** |

`{type}` is the entity type: `process`, `subprocess`, or `assumption`.

## EntityViewProcedureMapController
| Method | Path |
| --- | --- |
| POST | `/entity-view-procedure-map` |
| POST | `/entity-view-procedure-map/search` |
| DELETE | `/entity-view-procedure-map/type/{type}/entity/{entity}/views/{viewId}` |

## LinksController — views and favourites
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/views` | All views |
| POST | `/views` | Create a view |
| GET | `/entity/{entityId}/views` | User favourites for an entity |
| POST | `/entity/{entityId}/views` | Add a favourite |
| DELETE | `/entity/{entityId}/views/{viewId}` | Remove a favourite |
| GET | `/type/{type}/entity/{entity}/views` | Favourites by entity type |
| POST | `/type/{type}/entity/{entity}/views` | Add favourite by entity type |
| DELETE | `/type/{type}/entity/{entity}/views/{viewId}` | Remove favourite by entity type |

## FilterPresetController
| Method | Path |
| --- | --- |
| POST | `/search-preset` |
| POST | `/preset` |
| POST | `/preset/clear` |

## ScopeController
Class-level `@RequestMapping("/scope")`.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/scope` | Read scope |
| PUT | `/scope` | Replace scope |
| PATCH | `/scope` | Partial update — `ScopePatchRequest(String quickFilterConfigId)` |

## EntityValidationController
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/validate` | **Async** — returns `JobResponseDto` |
| GET | `/job/validation/{task_id}` | Poll validation job status |

## Remaining controllers
| Controller | Paths |
| --- | --- |
| `SourceEntityController` | `POST /entity`, `DELETE /entity/{id}` |
| `TenantController` | `/tenant`, `/tenants`, `/tenants/{tenantId}` |
| `UserController` | `/users`, `/users/{user_id}`, `/users/me` |
| `ImportExportController` | `POST /exportData`, `POST /importData` |

## Status codes used by tests
| Code | Meaning here |
| --- | --- |
| 200 | Mapping read/write succeeded |
| 400 | Invalid entity type or unknown view ID |
| 403 | View not visible to the caller |
| 404 | Entity or view does not exist |

## Contract watch
| Endpoint | Used by |
| --- | --- |
| `POST /view-entity-map` | `LinkManagement/Test_001..003` (process / subprocess / assumption) |
| `POST /view-entity-map/lm-search/v2` | View resolution across the Planning Space suites |
| `DELETE /view-entity-map/views/{view}/type/{type}/entity/{entity}` | `DataSetupBatch/.../Test_004_DeleteAllViewMappings` |
| `POST /entity-view-procedure-map` | `LinkManagement/Test_004..008` |
| `POST /preset`, `POST /search-preset` | `LinkManagement/Test_009_PresetFilterManagement`, `Test_011_AdminFilterManagement` |
| `GET/PUT/PATCH /scope` | `LinkManagement/Test_010_ScopeMapping`, `ScopeBatch` suites |
| `POST /exportData`, `POST /importData` | `Migration/Test_007_LinkManagementALMValidation` |
