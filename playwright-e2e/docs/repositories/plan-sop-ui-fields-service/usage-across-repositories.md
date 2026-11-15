# UI Fields Service usage across repositories

Investigation date: 2026-09-21. **Revised 2026-10-05** — the original conclusion ("no source-visible consumer") was wrong for lui and is out of date for automation.

## Executive conclusion

**lui is a verified production caller of `plan-sop-ui-fields-service`; no other sibling repository calls it.**

- **4 of 28 non-deprecated endpoints have a verified caller** (all from `plan-sop-lui`): `GET /list-page-config`, `GET /list-page-config-with-filter`, `GET /detail-page-config`, `GET /page/{name}/editor`.
- **The same 4 endpoints are covered by automation** since 2026-10-01 (`POBackendUIFieldsBatch.json`, 2 specs, 39 tests).
- `GET /page/filter` has a lui config key (`processFilters`) whose only call site is commented out, so it is not a live caller.
- **0 of 3 deprecated subscription endpoints** have a caller. The two `/mock/**` methods are a development LIAM mock.
- `plan-sop-planning-mfe` does **not** call the service. Its `uiFields` identifiers are local configuration objects (lever page, supply-chain-action configs).

### Why the 2026-09-21 scan missed lui
lui builds UI Fields URLs from **config keys**, not literal routes, so a search for route literals such as `'/list-page-config'` at call sites finds nothing. In `plan-sop-lui/src/config.ts`:

```ts
const apiURL = `${baseURL}/${envPath}`;                       // e.g. https://api-tst.jdadelivers.com/cbp/qa/ibp
listingPageConfig:           `${apiURL}/ui-fields/v1/list-page-config`,
listingPageConfigWithFilter: `${apiURL}/ui-fields/v1/list-page-config-with-filter`,
detailPageConfig:            `${apiURL}/ui-fields/v1/detail-page-config`,
editorConfig:                `${apiURL}/ui-fields/v1`,      // + /page/{name}/editor
uiFieldConfig:               `${apiURL}/ui-fields/v1`,      // + /list-page-config, /page/{name}/editor, /detail-page-config
processTemplateEditor:       `${apiURL}/ui-fields/v1/page/PROCESS_EDITOR_WITH_TEMPLATE_PAGE/editor`,
```

Lesson for future scans: search for the service path segment (`ui-fields/v1`) and the config keys, not only for route literals.

## Scope and method

The original 2026-09-21 scan covered these checkouts under `C:\Backend`; the 2026-10-05 revision re-checked each with `git grep` against `origin/main` for `ui-fields`, the config keys above, and every controller route.

| Repository | Areas searched |
| --- | --- |
| `plan-sop-planning-mfe` | Frontend source, API registries/clients, configuration, package manifest, tests |
| `plan-sop-lui` | Frontend source, `src/config.ts` API registry, reducers, package manifest, tests |
| `plan-sop-actionitem` | Java source, outbound HTTP clients/proxies, application configuration, tests, build dependencies |
| `plan-sop-link-management` | Java source, outbound HTTP clients/proxies, application configuration, tests, build dependencies |
| `plan-sop-process-orchestration-service` | Java source, proxies, application configuration, tests, build dependencies |
| `plan-sop-po-be-commons` | Shared HTTP/security infrastructure, configuration, tests |
| `plan-sop-ui-automation` | `configs`, `tests`, `testdata`, `util`, `pageobjects`, scripts, package manifest, suite JSON |

The endpoint inventory was read from the nine controller classes under `plan-sop-ui-fields-service/src/main/java/com/blueyonder/crud`. No `OpsController` or `/ops/db/state` route exists in the checked-out source.

## Repository-by-repository result

| Repository | Verified UI Fields usage | Evidence and interpretation |
| --- | --- | --- |
| `plan-sop-lui` | **4 routes** | `src/config.ts` keys used by `reducers/app_selections.ts` (listing columns/filters), `process_details.ts` (process and subprocess details), `calendarDetail.ts` (calendar details), `calendarmodal.ts` / `calendarCycle.ts` (calendar and cycle editors), `create_process_form_modal.ts` / `create_subprocess_form_modal.ts` (process/subprocess editors), `create_process_template_modal.ts` (template editor). |
| `plan-sop-planning-mfe` | **None** | No `ui-fields` path segment anywhere in source or env files. `uiFields` hits are local config objects. |
| `plan-sop-actionitem` | **No call; duplicated domain only** | Owns its own `/attribute-config/**`, `/ui-field-config/**`, `/page`, `/ui-component` surface and structurally similar tables. `ui_fields` in its import/export DTOs and Postman collection are Action Item payloads. |
| `plan-sop-link-management` | **None** | No UI Fields URL or outbound client. |
| `plan-sop-process-orchestration-service` | **None** | No UI Fields proxy/client. `ui_fields` in its OpenAPI examples are migration payload fields; `deploy-apim.yaml` lists services for gateway deployment. |
| `plan-sop-po-be-commons` | **No call** | `POCentralEFSPublisher` has a `UF_SERVICE("ui-fields-service")` publisher identity; there is no HTTP client for UI Fields. |
| `plan-sop-ui-automation` | **4 routes (tests)** | `UI_FIELDS_BASE` in `configs/setup.js`, `util/ui-fields.util.ts`, `tests/ProcessOrchestrationBackend/UIFields/Test_001..002`, `POBackendUIFieldsBatch.json`, baselines in `testdata/<ENV>/ProcessOrchestrationBackend/UIFields/`. Migration test data containing `ui_fields` describes Action Item payloads, not this service. |

## Endpoint usage matrix

### Field configuration: 3 used, 1 unused

| Method and path | Purpose | Verified consumers | Automation |
| --- | --- | --- | --- |
| `GET /filter-config` | Resolve filter controls for a page/entity/context | None | — |
| `GET /list-page-config` | List/grid fields for a page and entity | **lui** (`app_selections.ts`) | `UIFields/Test_001` |
| `GET /detail-page-config` | Grouped detail fields | **lui** (`process_details.ts`, `calendarDetail.ts`) | `UIFields/Test_001` |
| `GET /list-page-config-with-filter` | List fields and filters together | **lui** (`app_selections.ts`) | `UIFields/Test_001` |

### Page metadata: 1 used, 3 unused

| Method and path | Purpose | Verified consumers | Automation |
| --- | --- | --- | --- |
| `GET /page` | List tenant pages | None | — |
| `GET /page/{name}` | Resolve a page name to its ID | None | — |
| `GET /page/{name}/editor` | Editor fields for a page/entity | **lui** (5 editors) | `UIFields/Test_002` |
| `GET /page/filter` | Filter fields for an entity | None live — lui `processFilters` key, call site commented out | — |

`/page` is also implemented by Action Item. A same-path match without the `ui-fields` path segment is not evidence of cross-service use. The coverage dashboard (`docs/Coverage/backend-api-coverage-dashboard.html`) lists `GET /page/filter` as a lui-used P1 gap because the config key exists; that row is a false positive while the call stays commented out.

### Attribute configuration: 11 unused endpoints

| Method and path | Purpose | Verified consumers |
| --- | --- | --- |
| `POST /entity/{entityType}/attribute` | Create an attribute | None |
| `GET /entity/{entityType}/attribute` | List attributes for an entity type | None |
| `GET /entity/{entityType}/attribute/{name}` | Read one attribute | None |
| `PUT /entity/{entityType}/attribute/{name}` | Update an attribute | None |
| `DELETE /entity/{entityType}/attribute/{name}` | Delete an attribute | None |
| `GET /attribute/tenant` | List all tenant attributes | None |
| `POST /entity/{entityType}/attribute/{attributeName}/values` | Add allowed values | None |
| `GET /entity/{entityType}/attribute/{attributeName}/values` | List allowed values | None |
| `PUT /entity/{entityType}/attribute/{attributeName}/values/{name}` | Update an allowed value | None |
| `DELETE /entity/{entityType}/attribute/{attributeName}/values/{name}` | Delete an allowed value | None |
| `POST /entity/{entityType}/attribute/valueNames` | Resolve display names in bulk | None |

Action Item has its own attribute configuration model. Similar entity/table names in that repository are duplication, not integration. Process attributes in the PO UI go through PO (`/process/{p}/attribute`), not this service.

### UI field and component registry: 6 unused endpoints

| Method and path | Purpose | Verified consumers |
| --- | --- | --- |
| `POST /ui-field` | Create a renderable UI field | None |
| `GET /ui-field` | List all tenant UI fields | None |
| `GET /ui-field/{id}` | Read one UI field | None |
| `PUT /ui-field/{id}` | Update a UI field | None |
| `DELETE /ui-field/{id}` | Delete a UI field | None |
| `GET /ui-component` | List registered rendering components | None |

The Action Item routes are `/ui-field-config/**`, not this service's `/ui-field/**`.

### Import, export, and diagnostics: 3 unused endpoints

| Method and path | Purpose | Verified consumers |
| --- | --- | --- |
| `POST /exportData` | Export UI metadata/configuration | None |
| `POST /importData` | Import UI metadata/configuration | None |
| `POST /echo` | Diagnostic echo | None; Postman/manual use only |

The automation suite calls same-named migration routes on Process Orchestration and Link Management. Those resolve through different service prefixes and do not exercise UI Fields.

### Deprecated subscriptions: 3 intentionally unused endpoints

The entire `SubscriptionController` is annotated `@Deprecated`.

| Method and path | Purpose | Verified consumers |
| --- | --- | --- |
| `POST /entity/{entityId}/attribute/{attrName}/page/{pageName}/subscribe` | Create a page subscription | None |
| `PUT /entity/{entityId}/attribute/{attrName}/page/{pageName}/subscribe` | Update a page subscription | None |
| `DELETE /entity/{entityId}/attribute/{attrName}/page/{pageName}/subscribe` | Delete a page subscription | None |

Do not create new consumers for these methods without first confirming their replacement and removal plan.

### Development-only LIAM mock: 2 methods, excluded

`UiFieldsLiamMockController` lives under `utils.development.controller` and has a class prefix of `/mock`.

| Method and path | Classification |
| --- | --- |
| `POST /mock/` | Development LIAM mock; not a production service contract |
| `GET /mock/convert` | Development token-conversion mock; not a production service contract |

## Patterns that look like usage but are not

1. **Action Item's local configuration surface** — a duplicated model in a separate database, not a downstream call.
2. **Same-named migration endpoints** — Process Orchestration and Link Management each own `/exportData` and `/importData`.
3. **Migration payload fields** — `uiFields`, `ui_fields`, `ui_fields_values` in Action Item/PO migration payloads and automation test data.
4. **planning-mfe `uiFields`** — local card and lever configuration objects.

## Risks

| Risk | Impact |
| --- | --- |
| 24 of 28 routes have no caller in source | Either reached only by tools outside these repos, or orphaned surface; confirm with gateway logs before retiring |
| lui depends on 4 routes | Config drift breaks the PO listing, details and editors; now caught by `POBackendUIFieldsBatch` |
| Duplicated model in Action Item | Schema/seed drift and uncertainty about the authoritative metadata owner |
| NEW-mode gateway prefix unconfirmed | `URL_MODE=NEW` reuses the OLD path; a NEW-only deployment would break the specs |
| Deprecated controller remains exposed | Unsupported subscription behaviour may remain reachable |

## Recommended actions

1. **Keep the four lui routes under contract test** — done (2026-10-01). Update baselines in `testdata/<ENV>/ProcessOrchestrationBackend/UIFields/` only for intended config changes.
2. **Confirm runtime traffic for the other 24 routes** from gateway/APIM access logs before deciding on retirement or new coverage.
3. **Decide the authority boundary** between UI Fields and Action Item for each metadata family.
4. **Confirm the NEW-mode gateway prefix** and update `UI_FIELDS_BASE` in `configs/setup.js`.
5. **Keep deprecated subscriptions out of new tests.**

## Confidence

| Conclusion | Confidence |
| --- | --- |
| lui calls the four page-config/editor routes | High (source, and the same routes pass in automation on both gateways) |
| planning-mfe and the backend repos do not call UI Fields | High |
| Action Item UI-field references are local/duplicated, not cross-service calls | High |
| No deployed runtime caller exists for the other 24 routes | Unknown until gateway logs are inspected |
