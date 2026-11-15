# Troubleshooting — plan-sop-ui-fields-service

This service is a common **hidden** cause of Process Orchestration (lui) UI spec failures. When a field, column, or filter is "missing" in lui, check here before assuming a UI defect. Planning Space does not call this service.

First check the `POBackendUIFieldsBatch` run for the same environment and gateway: if `UIFields/Test_001`/`Test_002` fail on a baseline diff, the configuration changed and the UI failure follows from it.

## Known failure signatures
| Symptom | Likely cause | Check / fix |
| --- | --- | --- |
| UI spec fails: column not found in a lui grid | Column removed from list-page config | `GET /list-page-config` |
| UI spec fails: filter not in the PO listing filter panel | Filter config changed | `GET /list-page-config-with-filter` with `filterPageId=21` |
| `UIFields` spec fails on a baseline diff | Tenant field config changed (or baseline belongs to another environment) | Compare against `testdata/<ENV>/ProcessOrchestrationBackend/UIFields/`; update the baseline only if the change is intended |
| Every UI Fields route returns 500 on one gateway | Environment outage (QA Gravitee, 2026-10-01) | Check PO/AI on the same gateway; if they are 200, it is environmental |
| Empty `[]` where you expected fields | Unknown or wrong page id (returns 200, not 404) | Check the page id against the seeds in [data-model.md](data-model.md#page-ids-used-by-lui-and-the-specs) |
| 400 `IBP_40_1027` | Non-numeric `pageId`/`filterPageId` | Pass the numeric id |
| 404 `IBP_UF_40_1020` on `/page/{name}/editor` | Unknown page name or page/entity mismatch | Check name and `entityType` |
| UI spec fails: field missing from an editor | Field removed, or a rule hid it | `GET /page/{name}/editor`, then inspect `ui_fields_rules` |
| Dropdown has no options | Attribute values missing for the tenant | `GET /entity/{entityType}/attribute/{name}/values` |
| `getByTestId` no longer matches | Component swapped in `ui_components` | `GET /ui-component`; update the page object locator |
| Spec passes in INTEROP, fails in QA | Field config is **tenant-scoped** and differs per realm | Move expectations into `testdata/<ENV>/` |
| 403 on a config write | RBAC/ABAC denied | Applies immediately — no cache clear needed |
| Service will not start | `azuresql_*` variables have **no defaults** | Supply `azuresql_host`, `azuresql_port`, `azuresql_dc_database`, `azuresql_dc_user`, `azuresql_dc_password` |
| Config change not visible in the UI | Frontend caches configuration | Hard-reload the page |
| Field present in action items but missing elsewhere | Duplicated table family drifted between services | Compare with [`plan-sop-actionitem`](../plan-sop-actionitem/data-model.md#configuration--ui-field-entities) |
| 400 on an attribute call | Unknown `entityType` | Check the entity type spelling and case |

## Triage order for a "missing field" failure
1. `GET /page` — is the page registered?
2. `GET /page/{name}/editor` or `GET /list-page-config` — is the field configured?
3. `GET /entity/{entityType}/attribute` — does the attribute exist?
4. Inspect `ui_fields_rules` — is a rule hiding it?
5. `GET /ui-component` — did the rendering component change?
6. Only then treat it as a frontend defect.

## Where to look
| Signal | Location |
| --- | --- |
| API contract | `http://localhost:8086/swagger-ui/index.html` |
| Health | `POST /echo` |
| Structured logs | ECS layout (`log4j2-ecs-layout`) |
| Config tables | `pages`, `ui_fields`, `ui_fields_groups`, `ui_fields_rules`, `attributes`, `attribute_values`, `ui_components` |
| Security toggles | `LIAM_ENABLED`, `LIAM_RBAC_ENABLED`, `LIAM_ABAC_ENABLED` |

## Flaky areas
| Area | Why | Mitigation |
| --- | --- | --- |
| Tenant-wide configuration | Not run-scoped; parallel specs collide | Serialize config changes and always tear down |
| Environment drift | Each realm has its own config | Keep expectations in `testdata/<ENV>/` |
| Frontend config cache | UI holds a stale config | Hard-reload rather than waiting |
| Cross-service table drift | Same tables in two services | Compare both when behaviour differs by area |
