# API contract — plan-sop-ui-fields-service

Source of truth: 9 controllers under `src/main/java/**/controller`. Swagger UI at `http://localhost:8086/swagger-ui/index.html`.

> Automation reaches it through `UI_FIELDS_BASE` (`cbp/<env>/ibp/ui-fields/v1`) in `configs/setup.js`;
> build URLs with `buildUiFieldsUrl()` in `util/ui-fields.util.ts`. See [environments.md](environments.md).

## Auth
| Aspect | Value |
| --- | --- |
| Scheme | OAuth2 Bearer |
| RBAC | `@PreAuthorize("@ibp.hasAction(...)")` on all mutating attribute, UI-field, and subscription endpoints |
| ABAC | `LIAM_ABAC_ENABLED`, default `true` |
| Cache | `liamRbacCacheTimeout` defaults to `0` — permission changes apply immediately |

## FieldController — page configuration (read-only, high traffic)
| Method | Path | Returns | Notes | lui caller | Spec |
| --- | --- | --- | --- | --- | --- |
| GET | `/filter-config` | `List<FilterDto>` | Filter panel definition | — | — |
| GET | `/list-page-config` | `List<FieldDto>` | Grid columns (`pageId`, `entityName`, optional `entityId`) | `app_selections.ts` | `UIFields/Test_001` |
| GET | `/detail-page-config` | `List<FieldGroupDto>` | Detail form layout | `process_details.ts`, `calendarDetail.ts` | `UIFields/Test_001` |
| GET | `/list-page-config-with-filter` | `UiMetadata` | Combined grid + filter payload (`filterPageId`) | `app_selections.ts` | `UIFields/Test_001` |

These endpoints decide what the lui grids and detail panes render. If a Process Orchestration UI spec cannot find a column or filter, check them first. `pageId` is parsed with `Long.parseLong`; `entityId` only changes the result for `INSIGHT`, so the literal `entityId=null` lui sends is harmless for `PROCESS`/`SUBPROCESS`.

## AttributeController
| Method | Path | RBAC |
| --- | --- | --- |
| POST | `/entity/{entityType}/attribute` | yes |
| GET | `/entity/{entityType}/attribute` | yes |
| GET | `/entity/{entityType}/attribute/{name}` | yes |
| PUT | `/entity/{entityType}/attribute/{name}` | yes |
| DELETE | `/entity/{entityType}/attribute/{name}` | yes |
| GET | `/attribute/tenant` | yes — all attributes for the tenant |
| POST | `/entity/{entityType}/attribute/{attributeName}/values` | yes |
| GET | `/entity/{entityType}/attribute/{attributeName}/values` | yes |
| PUT | `/entity/{entityType}/attribute/{attributeName}/values/{name}` | yes |
| DELETE | `/entity/{entityType}/attribute/{attributeName}/values/{name}` | yes |
| POST | `/entity/{entityType}/attribute/valueNames` | — returns `Map<String, Map<String,String>>` |

## UiFieldController
| Method | Path | RBAC |
| --- | --- | --- |
| POST | `/ui-field` | yes |
| GET | `/ui-field` | — all fields for the tenant |
| GET | `/ui-field/{id}` | — |
| PUT | `/ui-field/{id}` | yes |
| DELETE | `/ui-field/{id}` | yes |

## PageController
| Method | Path | Returns |
| --- | --- | --- |
| GET | `/page` | `List<PageDto>` |
| GET | `/page/{name}` | `Long` — the page ID |
| GET | `/page/{name}/editor` | `List<FieldGroupDto>` — editor layout. **Called by lui** for process, subprocess, template, calendar and cycle editors; covered by `UIFields/Test_002` |
| GET | `/page/filter` | `List<FilterDto>` — lui has a `processFilters` config key for it, but its only call site is commented out |

## SubscriptionController — deprecated
The controller class is annotated `@Deprecated`, and no caller was found in the sibling repositories.

| Method | Path | RBAC |
| --- | --- | --- |
| POST | `/entity/{entityId}/attribute/{attrName}/page/{pageName}/subscribe` | yes |
| PUT | `/entity/{entityId}/attribute/{attrName}/page/{pageName}/subscribe` | yes |
| DELETE | `/entity/{entityId}/attribute/{attrName}/page/{pageName}/subscribe` | yes |

## Remaining controllers
| Controller | Paths |
| --- | --- |
| `UiComponentsController` | `GET /ui-component` — component registry |
| `ImportExportController` | `POST /exportData`, `POST /importData` |
| `EchoController` | `POST /echo` — health/diagnostic |
| `UiFieldsLiamMockController` | `POST /mock/`, `GET /mock/convert` — **development mock**, do not target |

## Cross-repository usage
lui calls four routes (`/list-page-config`, `/list-page-config-with-filter`, `/detail-page-config`, `/page/{name}/editor`); no other sibling repo calls this service. Same-named routes in Action Item, Link Management, and Process Orchestration are contracts owned by those services, not UI Fields calls. See the [endpoint-by-endpoint usage report](usage-across-repositories.md).

## Status codes used by tests
| Code | Meaning here |
| --- | --- |
| 200 | Config returned. An **unknown page id returns `200 []`**, not 404, and so does a page/entity mismatch |
| 400 | Missing required parameter; non-numeric `pageId`/`filterPageId` (`IBP_40_1027`); unknown `entityType` or malformed attribute definition |
| 401 | No or invalid token |
| 403 | RBAC/ABAC denied — applies immediately, no cache delay |
| 404 | Attribute, field, or page name not found; `/page/{name}/editor` with an unknown page or entity mismatch (`IBP_UF_40_1020`) |

Verified on INTEROP and QA, both gateways, 2026-10-01. `entityName` matches case-insensitively, and `filterPageId=1` returns the page-1 columns as filters (no page-type check).

## Contract watch
| Endpoint | UI effect | Guarded by |
| --- | --- | --- |
| `GET /list-page-config`, `/list-page-config-with-filter` | PO listing columns and filters (`ProcessOrchestration/**`) | `UIFields/Test_001` baselines |
| `GET /detail-page-config` | Process, subprocess and calendar detail panes | `UIFields/Test_001` baselines |
| `GET /page/{name}/editor` | Create/edit forms for process, subprocess, template, calendar, cycle | `UIFields/Test_002` baselines |
| `GET /ui-component` | Which widgets render, and therefore which `data-testid` values exist | — |
| `GET /entity/{entityType}/attribute` | Available attributes in filters and editors | — |
