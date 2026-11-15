# Test hooks — plan-sop-ui-fields-service

Two read-only backend specs target this service directly (`tests/ProcessOrchestrationBackend/UIFields/`). Through the UI it is exercised only by lui (Process Orchestration) screens, which makes it a hidden cause of `ProcessOrchestration/**` failures.

## Automation entry points
| Asset | Path |
| --- | --- |
| API helper | [playwright-e2e/util/api.util.ts](../../../util/api.util.ts) |
| UI Fields helper | [playwright-e2e/util/ui-fields.util.ts](../../../util/ui-fields.util.ts) — `buildUiFieldsUrl`, `sortedFieldNames`, `groupedFieldNames`, `compareWithBaseline` |
| Specs | `UIFields/Test_001_PageConfigContracts`, `UIFields/Test_002_PageEditorConfig` |
| Suite | `POBackendUIFieldsBatch.json` (and `Test_001` in `POBackendSmokeBatch.json`) |
| Page objects (indirect) | `process.page.ts`, `process-settings.page.ts` (lui listing, details, editors) |
| Test data | Per-environment baselines in `testdata/<ENV>/ProcessOrchestrationBackend/UIFields/` (INTEROP, QA) |
| Env variable | `UI_FIELDS_BASE` — see [environments.md](environments.md) |

The existing specs are read-only, so they need no setup or teardown. The recipes below apply to any future write spec.

## Diagnostic recipes
Use these when a UI spec fails with "field/column/filter not found".

### Is the field configured at all?
| Step | Call |
| --- | --- |
| 1 | `GET /page` — confirm the page is registered |
| 2 | `GET /page/{name}/editor` — confirm the field is in the editor layout |
| 3 | `GET /list-page-config?pageId=<id>&entityName=<ENTITY>` — confirm the column exists on the grid |
| 4 | `GET /list-page-config-with-filter?...&filterPageId=21` — confirm the filter exists (page 21 is the process filter page, not page 1) |

If the field is absent here, the UI is rendering correctly and the **configuration** is the defect. Remember an unknown page id returns `200 []`, so an empty list can mean a wrong id rather than missing config.

### Is the attribute available?
| Step | Call |
| --- | --- |
| 1 | `GET /entity/{entityType}/attribute` |
| 2 | `GET /entity/{entityType}/attribute/{attributeName}/values` |
| 3 | `POST /entity/{entityType}/attribute/valueNames` for bulk display-name resolution |

### Did a component swap break a locator?
| Step | Call |
| --- | --- |
| 1 | `GET /ui-component` |
| 2 | Compare against the test IDs in [the LUI inventory](../plan-sop-lui/ui-inventory.md) |
| 3 | A different component means a different `data-testid` — update the page object, not the spec |

## Setup recipes

### Configure an attribute for an editor spec
| Step | Call |
| --- | --- |
| 1 | `POST /entity/{entityType}/attribute` |
| 2 | `POST /entity/{entityType}/attribute/{attributeName}/values` |
| 3 | `POST /ui-field` to make it renderable |
| 4 | `GET /page/{name}/editor` to confirm it appears |

### Subscribe an attribute to a page
| Step | Call |
| --- | --- |
| 1 | `POST /entity/{entityId}/attribute/{attrName}/page/{pageName}/subscribe` |
| 2 | `GET /page/{pageName}/editor` to verify |
| 3 | `DELETE .../subscribe` in teardown |

## Teardown / cleanup
| Step | Call |
| --- | --- |
| Remove attribute values | `DELETE /entity/{entityType}/attribute/{attributeName}/values/{name}` |
| Remove attribute | `DELETE /entity/{entityType}/attribute/{name}` |
| Remove UI field | `DELETE /ui-field/{id}` |
| Remove subscription | `DELETE /entity/{entityId}/attribute/{attrName}/page/{pageName}/subscribe` |

Configuration is **tenant-wide**. Anything created here affects every spec running against that realm — always clean up.

## Async behaviour — what to wait on
| Operation | Async? | Deterministic wait |
| --- | --- | --- |
| Attribute / UI-field CRUD | Sync | Re-`GET` the config endpoint |
| RBAC/ABAC permission change | **Immediate** | No cache clear needed (`liamRbacCacheTimeout: 0`) |
| Config change → UI reflects it | Eventual | Hard-reload the page; the frontend caches config |
| Import / export | Async | Poll the job response |

## Idempotency and isolation
- Attribute and field configuration is tenant-scoped and **not** run-scoped. Two parallel specs mutating the same attribute will collide.
- Treat configuration changes as serial, realm-affecting operations — use `test.describe.serial` and always tear down.
- Expected columns and filters differ per environment. Read them from `testdata/<ENV>/`, never hardcode.
- Field rules can legitimately hide a field. Check `ui_fields_rules` before filing a defect.
