# UI Fields: PSR APIs missing from Playwright backend tests

| Item | Value |
| --- | --- |
| Date | 2026-10-01 |
| Service | `plan-sop-ui-fields-service` (root package `com.blueyonder.crud`), gateway path `ui-fields/v1` |
| PSR source | [jmeter/Tests/PSRGatewayTest.jmx](../../../../jmeter/Tests/PSRGatewayTest.jmx): 3 distinct UI Fields routes in 10 samplers |
| Playwright source | None. The service has **zero** Playwright coverage and no URL variable in [configs/setup.js](../../../configs/setup.js). |
| Companion plans | [Process Orchestration](01-ProcessOrchestration-PSR-Gap-Plan.md), [Link Management](02-LinkManagement-PSR-Gap-Plan.md), [Action Items](03-ActionItems-PSR-Gap-Plan.md) |
| Status | Implemented (2026-10-01): `tests/ProcessOrchestrationBackend/UIFields/Test_001_PageConfigContracts.spec.ts` (UF-01 to UF-03, 32 cases) and `Test_002_PageEditorConfig.spec.ts` (UF-R1, 7 cases). INTEROP Azure, INTEROP Gravitee, QA Azure and QA Gravitee all pass (a QA Gravitee 500 on every route earlier that day was transient). QA field lists differ from INTEROP (tenant configuration), so each environment keeps its own expected lists. Observed behaviour that differs from section 7: `cmp` and the header `groupName` can be null, and lower-case `entityName` matches. The page-type gaps (a listing page accepted as `filterPageId` or as a details page, formerly UF-02-E03 and UF-03-E03) are recorded as defects in [ActionItems-UIFields-Defect-Report.html](ActionItems-UIFields-Defect-Report.html) instead of tests. |

## 1. Scope

**In scope:** the three UI Fields routes that `PSRGatewayTest.jmx` calls: `GET /list-page-config`, `GET /list-page-config-with-filter` and `GET /detail-page-config`.

**Recommended additions (section 7.4):** UI Fields routes that lui calls but PSR does not, namely `GET /page/{name}/editor` and the list or detail configuration for the calendar, cycle and transition pages.

**Out of scope:** UI Fields write routes (attributes, UI fields, values, import and export) and the deprecated subscription routes. See [ui-fields-api-coverage-matrix.html](../ui-fields-api-coverage-matrix.html).

## 2. Summary

| Metric | Count |
| --- | --- |
| Distinct UI Fields routes in PSR | 3 |
| Covered by Playwright | 0 |
| **Gap APIs in this plan** | **3** (UF-01 to UF-03) plus 1 recommended (UF-R1) |
| Proposed test cases | 41 (see section 7) |

### Correction to the existing repository documentation

[usage-across-repositories.md](../../repositories/plan-sop-ui-fields-service/usage-across-repositories.md) (2026-09-21) concludes that *"No source-visible HTTP consumer of `plan-sop-ui-fields-service` was found"*. **That conclusion is wrong.** `plan-sop-lui` calls these routes through config keys rather than literal routes:

| Evidence in lui | What it does |
| --- | --- |
| `src/config.ts:62-65`, `:89`, `:134` | `editorConfig`, `listingPageConfig`, `listingPageConfigWithFilter`, `detailPageConfig`, `processTemplateEditor` and `uiFieldConfig` all point at `${apiURL}/ui-fields/v1/...` |
| `src/reducers/app_selections.ts:290-291` | `setListPageConfig` calls `list-page-config` or `list-page-config-with-filter` |
| `src/reducers/app_selections.ts:334` | `setUIConfig` calls `list-page-config?pageId&entityName&entityId` |
| `src/reducers/process_details.ts:109` and `:262` | Call `detail-page-config` for process (page 2) and subprocess (page 4) details |
| `src/reducers/calendarDetail.ts:31` | Calls `detail-page-config` for calendar details (page 24) |
| `src/reducers/calendarCycle.ts:45`, `calendarmodal.ts:35`, `create_process_form_modal.ts:64`, `create_subprocess_form_modal.ts:34`, `create_process_template_modal.ts:52` | Call `page/{name}/editor` for the editor forms |

The PSR samplers mirror these calls exactly, including `pageId` values 1, 2, 3, 4 and 21 and the literal `entityId=null` that lui sends. **This makes UI Fields a P1 dependency of the PO UI**: process listing, process and subprocess details, calendar manager and the create/edit forms. A broken UI Fields response shows up as missing grid columns, filters or form fields.

**Gateway prefix (confirmed):** in OLD URL mode it is `cbp/<env>/ibp/ui-fields/v1`. lui builds `apiURL = https://<domain>.jdadelivers.com/cbp/<env>/ibp`, and the JMX calls `/cbp/psr/ibp/ui-fields/v1/...`. The NEW-mode prefix, the equivalent of `po/api/v1`, is still **unconfirmed**.

## 3. Method and evidence

- **PSR:** the samplers and their query arguments were taken from the JMX. All 10 have **no assertions**.
- **Contracts:** read from `rest/controller/FieldController.java`, `service/impl/FieldService.java`, the OpenAPI spec `open-api3-specification/v1/ui-fields-oas-spec.yaml` (schemas `FieldDto`, `FieldGroupDto`, `FilterDto`, `UiMetadata`, `FieldValueDto`) and the page seed `src/main/resources/db/changelog/insert_pages.xml`.
- **Shared library:** the configuration assembly (`CrudMetadataService`) comes from the external `com.by:plan-sop-crud-framework:1.0.7-SNAPSHOT`, which is not one of the 7 repositories. Action Item builds its own editor, filter and list configurations with the **same** library (see [AI-01 and AI-02](03-ActionItems-PSR-Gap-Plan.md)).
- **Callers:** lui and planning-mfe non-test source, plus the backend outbound clients.

## 4. Coverage matrix

| # | Method | Route | PSR samplers (query) | Playwright | Gap ID |
| --- | --- | --- | --- | --- | --- |
| 1 | GET | `/list-page-config` | 5. POListingPage4 (`pageId=1&entityName=PROCESS&entityId=null`), PO Details Page 2 (`pageId=3&entityName=SUBPROCESS&entityId=null`), Subprocess Details Page 2, PS To PO 2, PS To Subprocess 10 (`pageId=3&entityName=SUBPROCESS`) | None | **UF-01** |
| 2 | GET | `/list-page-config-with-filter` | 1. POListingPage5 (`pageId=1&filterPageId=21&entityName=PROCESS`) | None | **UF-02** |
| 3 | GET | `/detail-page-config` | 4. PO Details Page 5 and PS To PO 6 (`pageId=2&entityName=PROCESS&entityId=<process guid>`), Subprocess Details Page 9 and PS To Subprocess 9 (`pageId=4&entityName=SUBPROCESS&entityId=<subprocess guid>`) | None | **UF-03** |

Page seeds from the UI Fields `db/changelog/insert_pages.xml` and the lui constants that reference them:

| Page id | Page name | Type / entity | lui constant (or call) |
| --- | --- | --- | --- |
| 1 | `PROCESS_LISTING_PAGE` | LIST / PROCESS | `PROCESS_LISTING_PAGEID` (`config/CommonConstants.ts:48`) |
| 2 | `PROCESS_SUMMARY_PAGE` | SUMMARY / PROCESS | `PROCESS_DETAILS_PAGEID` (`:50`) |
| 3 | `L1_SUBPROCESS_LISTING_PAGE` | LIST / SUBPROCESS | `SUBPROCESS_LISTING_PAGEID` (`:52`) |
| 4 | `L1_SUBPROCESS_SUMMARY_PAGE` | SUMMARY / SUBPROCESS | `SUBPROCESS_DETAILS_PAGEID` (`:51`) |
| 21 | `PROCESS_FILTERS_PAGE` | FILTER / PROCESS | `PROCESS_LISTING_FILTERID` (`:49`) |
| 22 | `CALENDAR_LISTING_PAGE` | LIST / CALENDAR | `CALENDAR_LISTING_PAGEID` (`Components/CalendarManager/index.tsx:38`) |
| 23 | `CYCLE_LISTING_PAGE` | LIST / CYCLE | `CYCLE_LISTING_PAGEID` (`Components/CalendarManager/index.tsx:37`) |
| 24 | `CALENDAR_DETAILS_PAGE` | SUMMARY / CALENDAR | `CALENDAR_DETAILS_PAGEID` (`reducers/calendarDetail.ts:8`) |
| 25 | `CALENDAR_EDITOR_PAGE` | EDITOR / CALENDAR | `page/CALENDAR_EDITOR_PAGE/editor` (`reducers/calendarmodal.ts`) |
| 26 | `CYCLE_DETAILS_PAGE` | SUMMARY / CYCLE | Not referenced by lui |
| 27 | `CYCLE_EDITOR_PAGE` | EDITOR / CYCLE | `page/CYCLE_EDITOR_PAGE/editor` (`reducers/calendarCycle.ts`) |
| 29 | `PROCESS_EDITOR_PAGE` | EDITOR / PROCESS | `page/PROCESS_EDITOR_PAGE/editor` (`reducers/create_process_form_modal.ts`) |
| 30 | `SUBPROCESS_EDITOR_PAGE` | EDITOR / SUBPROCESS | `page/SUBPROCESS_EDITOR_PAGE/editor` (`reducers/create_subprocess_form_modal.ts`) |
| 31 | `PROCESS_EDITOR_WITH_TEMPLATE_PAGE` | EDITOR / PROCESS | `processTemplateEditor` (`config.ts:89`) |
| 32 | `PROCESS_TRANSITION_SUMMARY_PAGE` | LIST / PROCESS | `TRANSITIONS_LISTING_PAGEID` (`:53`) |

The older gap report's sample request `list-page-config-with-filter?pageId=1&filterPageId=1` is wrong: the filter page is **21**.

## 5. Repository usage matrix

Legend: **O** owns (implements) the route. **UI** calls it from browser code. **S2S** calls it service to service. **-** means no usage was found in non-test source. `plan-sop-po-be-commons` supplies shared auth and logging to every service and calls none of these routes, so it has no column.

| ID | Route | UI Fields | lui | planning-mfe | PO service | Action Item | Link Mgmt |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UF-01 | GET `/list-page-config` | O | UI | - | - | - (serves its own page configuration through the same crud framework) | - |
| UF-02 | GET `/list-page-config-with-filter` | O | UI | - | - | - | - |
| UF-03 | GET `/detail-page-config` | O | UI | - | - | - | - |
| UF-R1 | GET `/page/{name}/editor` | O | UI | - | - | - | - |

planning-mfe has no UI Fields call. Its `uiFields` hits (`pages/ActionPlanner/ActionPages/LeverPage/uiConfig.ts`, `.../LeverPage/Components/AddLeverModal.tsx`, `reducers/supplyChainActionConfig/sampleActionConfig.js`) are local configuration objects. lui's `processFilters` key (`/page/filter?entityType=PROCESS`, `config.ts:56`) is defined, but its only use is commented out (`reducers/all_process_table_data.ts:56`).

## 6. Gap API contracts

### Shared conventions

| Aspect | Value |
| --- | --- |
| Base URL | **New variable needed.** Add `UI_FIELDS_BASE` to [configs/setup.js](../../../configs/setup.js) for QA, INTEROP and PSR: `cbp/<env>/ibp/ui-fields/v1`. Until the gateway team confirms a NEW-mode prefix, use the OLD path in both URL modes. |
| PSR equivalent | `https://${API_HOST}/cbp/psr/ibp/ui-fields/v1/...` |
| Auth / RBAC | Bearer. `FieldController` has **no `@PreAuthorize`**, although the OAS documents `401` and `403`. |
| Tenant scope | Fields are selected by `pageId + tenantId + entityType` (`fieldRepository.findByPageIdAndTenantIdAndEntityType`, `FieldService.java:81`) |
| Localisation | `displayName` is resolved through `MessageSource` with code `<entityName>.field.<uniqueName>` (`FieldService.java:85`), and value names with `<entityName>.field.<uniqueName>.value.<valueName>`, both using `Accept-Language`. Assert on `name`, not on `displayName`. |
| `entityId` | Changes the field list only for `entityName=INSIGHT` (`FieldService.java:77`). For PROCESS, SUBPROCESS, CALENDAR and CYCLE it has no effect, so the literal `entityId=null` that lui sends is harmless. |
| Field values | Attribute values come from `fieldValueRepository.findByAttributeIdAndTenantIdAndEntityType` (tenant scoped). User-picker components (`SINGLE_`/`MULTI_SELECT_USER_UI_COMPONENT`) are filled from RBAC (`rbacService.getAllUsersByResource`). |
| Errors | A missing required parameter returns `400`. A non-numeric `pageId` makes `Long.parseLong` throw `NumberFormatException`, an `IllegalArgumentException` that `LocalExceptionHandler.java:146` maps to `ILLEGAL_ARGUMENT_ERROR`; the status comes from the external error-code library (expected 400). An unknown numeric page is expected to return `200 []`. |

### UF-01 GET `/list-page-config` (P1)

| Item | Detail |
| --- | --- |
| Handler | `rest/controller/FieldController.java:57` → `getListPageConfig(pageId, tenantId, entityName, entityId)` |
| Query | `pageId` (**required**), `entityName` (**required**: `PROCESS`, `SUBPROCESS`, `CALENDAR`, `CYCLE`, ...), `entityId` (optional) |
| Response 200 | `[ FieldDto { name, displayName, cmp, type, format, isAttribute, attributeId, rules, values, defaultValue, dependsOn, dynamicData, dataUrl } ]`. lui builds the grid columns from this array. |
| Used by | lui `app_selections.ts:291` (`setListPageConfig`) → `Components/ProcessOrchestration/ViewProcess/ProcessDetails.tsx:320` (page 3, SUBPROCESS) and `Components/Settings/NodeTransitions/index.tsx:330` (page 32, PROCESS). lui `app_selections.ts:334` (`setUIConfig`, which always appends `entityId=${entityId}` and defaults it to `null`) → `Components/CalendarManager/index.tsx:136` (page 22, CALENDAR) and `Components/CalendarManager/calendarDetails.tsx:161` (page 23, CYCLE). |

### UF-02 GET `/list-page-config-with-filter` (P1)

| Item | Detail |
| --- | --- |
| Handler | `FieldController.java:79`. It returns `getListPageConfig(pageId, ..., entityId)` **plus** `getFiltersConfig(filterPageId, tenantId, entityName, null, null, null)`. The filters ignore `entityId`. |
| Query | `pageId`, `filterPageId` and `entityName` (all **required**), plus `entityId` (optional) |
| Response 200 | `UiMetadata { fields: [FieldDto], filters: [FilterDto { id, name, displayName, cmp, type, format, isAttribute, values, defaultValue }] }`. `groups` is not set. |
| Used by | lui `app_selections.ts:290`, called from `Components/ProcessOrchestration/ListProcesses/ListProcess.tsx:165` (the PO listing page: page 1, filter page 21, PROCESS) |

### UF-03 GET `/detail-page-config` (P2)

| Item | Detail |
| --- | --- |
| Handler | `FieldController.java:68` → `getDetailPageConfig(pageId, tenantId, entityName, entityId)` |
| Query | `pageId` and `entityName` (**required**), plus `entityId` (optional) |
| Response 200 | `[ FieldGroupDto { groupName, fields: [FieldDto] } ]` |
| Used by | lui `process_details.ts:109`, only as a **fallback** when the process details response has no `groups`. lui `process_details.ts:262`, **always** called for subprocess details with `entityId = <subprocess id>`. lui `calendarDetail.ts:31` (page 24, CALENDAR). |

### UF-R1 GET `/page/{name}/editor` (recommended, P2, not in PSR)

| Item | Detail |
| --- | --- |
| Handler | `PageController.java:55` |
| Request | Path `name` = `<ENTITY>_EDITOR_PAGE` (for example `PROCESS_EDITOR_PAGE`, `SUBPROCESS_EDITOR_PAGE`, `CALENDAR_EDITOR_PAGE`, `CYCLE_EDITOR_PAGE`) or `PROCESS_EDITOR_WITH_TEMPLATE_PAGE`. Query `entityType` (**required**). |
| Response 200 | `[ FieldGroupDto ]`, the editor layout |
| Used by | lui `calendarCycle.ts:45`, `calendarmodal.ts:35`, `create_process_form_modal.ts:64`, `create_subprocess_form_modal.ts:34`, `create_process_template_modal.ts:52` (which sends `params: {entityType: PROCESS}`) |

## 7. Test cases

Type: **P** positive, **N** negative, **E** edge. Every case is **read-only**, so they are safe on any environment and good smoke candidates.

### 7.1 UF-01 list-page-config (14)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| UF-01-P01 | P | `pageId=1&entityName=PROCESS` | `200` non-empty array. Every item has non-empty string `name`, `displayName` and `cmp`. |
| UF-01-P02 | P | `pageId=3&entityName=SUBPROCESS` (PSR PO Details Page 2) | `200` non-empty array |
| UF-01-P03 | P | lui shape `pageId=1&entityName=PROCESS&entityId=null` (PSR POListingPage4) | `200`, deep-equal to P01. The literal `"null"` is harmless. |
| UF-01-P04 | P | UI parity: page 22/CALENDAR, page 23/CYCLE, page 32/PROCESS | `200` arrays. These come from the lui calendar manager and node transitions, not from PSR. |
| UF-01-P05 | P | Baseline: the sorted `name` list per `(pageId, entityName)` | Equals `testdata/<ENV>/ProcessOrchestrationBackend/UIFields/Test_001_PageConfigContracts.json` → `LIST_BASELINE`. Record it on the first run. Drift fails with a diff. |
| UF-01-P06 | P | Two consecutive calls | Identical arrays, including order. This guards against unordered repository results. |
| UF-01-N01 | N | `pageId` missing | `"400"` |
| UF-01-N02 | N | `entityName` missing | `"400"` |
| UF-01-N03 | N | No token | `"401"` |
| UF-01-E01 | E | `pageId=abc` | `IllegalArgumentException` (NumberFormatException). Record the status (`"400"` expected). |
| UF-01-E02 | E | Unknown `pageId=999999` | `200 []` |
| UF-01-E03 | E | Page and entity mismatch: `pageId=1&entityName=SUBPROCESS` | Record the result (`200 []` expected) |
| UF-01-E04 | E | `Accept-Language: fr-FR` | Same `name` list. `displayName` may differ. |
| UF-01-E05 | E | Lower-case `entityName=process` | Record the result (`[]` expected, because the match is case-sensitive) |

### 7.2 UF-02 list-page-config-with-filter (10)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| UF-02-P01 | P | `pageId=1&filterPageId=21&entityName=PROCESS` (PSR POListingPage5, lui ListProcess) | `200`. `fields` and `filters` are both non-empty arrays. `groups` is absent or null. |
| UF-02-P02 | P | Consistency | `fields` deep-equals the UF-01-P01 response |
| UF-02-P03 | P | Filter contract | Every filter has `name`, `displayName`, `cmp` and `values` (an array). The process `status` filter is present; confirm its name on the first run. |
| UF-02-P04 | P | `entityId` does not affect filters | `filters` are equal with and without `entityId` |
| UF-02-N01 | N | `filterPageId` missing | `"400"` |
| UF-02-N02 | N | `pageId` or `entityName` missing | `"400"` |
| UF-02-N03 | N | No token | `"401"` |
| UF-02-E01 | E | `filterPageId=abc` | Record the status (`"400"` expected) |
| UF-02-E02 | E | Unknown `filterPageId=999999` | `200`. `filters` is `[]` and `fields` is unchanged. |
| UF-02-E03 | E | `filterPageId=1` (the old report's example) | `filters` is `[]`, because page 1 is a LIST page. This shows the old sample was wrong. |

### 7.3 UF-03 detail-page-config (10)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| UF-03-P01 | P | `pageId=2&entityName=PROCESS&entityId=<process id>` (PSR PO Details Page 5). Read the process id from `GET /process/{p}`. | `200` non-empty array. Every group has a non-empty `groupName` and a `fields` array whose items have a `name`. |
| UF-03-P02 | P | `pageId=4&entityName=SUBPROCESS&entityId=<subprocess id>` (PSR Subprocess Details Page 9, always called by lui) | `200` non-empty array |
| UF-03-P03 | P | Without `entityId` | Deep-equal to P01. `entityId` only matters for INSIGHT. |
| UF-03-P04 | P | Baseline: `groupName` and field `name`s per page | Equals `DETAIL_BASELINE` in the test data. Record it on the first run. |
| UF-03-P05 | P | UI parity: `pageId=24&entityName=CALENDAR` (lui calendar details) | `200` |
| UF-03-N01 | N | `pageId` or `entityName` missing | `"400"` |
| UF-03-N02 | N | No token | `"401"` |
| UF-03-E01 | E | `pageId=abc` | Record the status (`"400"` expected) |
| UF-03-E02 | E | Unknown `pageId` | `200 []` |
| UF-03-E03 | E | Listing page id used for details (`pageId=1&entityName=PROCESS`) | Record the result (groups empty or missing). This guards against `pageId` constant mix-ups in lui. |

### 7.4 UF-R1 page editor (7, recommended)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| UF-R1-P01 | P | `/page/PROCESS_EDITOR_PAGE/editor?entityType=PROCESS` | `200` non-empty `FieldGroupDto[]` |
| UF-R1-P02 | P | `SUBPROCESS_EDITOR_PAGE/SUBPROCESS`, `CALENDAR_EDITOR_PAGE/CALENDAR`, `CYCLE_EDITOR_PAGE/CYCLE` | `200` arrays |
| UF-R1-P03 | P | `/page/PROCESS_EDITOR_WITH_TEMPLATE_PAGE/editor?entityType=PROCESS` | `200`. Record whether the variant field is present, since lui gates it with a feature flag. |
| UF-R1-P04 | P | Baseline of editor field names per page | Equals `EDITOR_BASELINE` |
| UF-R1-N01 | N | `entityType` missing | `"400"` |
| UF-R1-N02 | N | No token | `"401"` |
| UF-R1-E01 | E | Unknown page name | Record the result (`200 []` or `404`) |

**Total: 41 test cases** (34 for the PSR gaps and 7 recommended).

## 8. Data dependencies and environment prerequisites

| Dependency | Needed by | Notes |
| --- | --- | --- |
| `UI_FIELDS_BASE` in `configs/setup.js` for QA, INTEROP and PSR | All | **Blocking.** The value is `cbp/qa/ibp/ui-fields/v1`, `cbp/interop/ibp/ui-fields/v1` or `cbp/psr/ibp/ui-fields/v1`. The NEW-mode prefix is unconfirmed. |
| Page seeds 1-4, 21-27, 29-32 | All | Global Liquibase seeds in `insert_pages.xml`, so the ids are stable across tenants and environments. The field rows under each page are tenant scoped. |
| Tenant field configuration | Baselines | Field lists are tenant scoped. Keep one baseline per environment (`testdata/<ENV>/...`), and re-baseline deliberately when a configuration changes. |
| Process id and subprocess id | UF-03 | Read at runtime: `GET /process/{p}` → `id`, and `GET /process/{p}/subprocess/{sp}` → `id`. The PSR JMX hardcodes `5a61b5d3-…` and `5A66D3CF-…`. |
| Gateway route through Gravitee | PSR and INTEROP Gravitee runs | The JMX calls the OLD path on both gateways. Run UF-01-P01 on `GATEWAY_TYPE=GRAVITEE` to confirm the route exists. |
| Locale | UF-01-E04 | Send `Accept-Language` explicitly in every test (`en-US`), so that `displayName` assertions, if any, are deterministic |

## 9. Implementation blueprint

| Step | Change |
| --- | --- |
| 1 | Add `process.env.UI_FIELDS_BASE` to each environment block of [configs/setup.js](../../../configs/setup.js) |
| 2 | Create `tests/ProcessOrchestrationBackend/UIFields/Test_001_PageConfigContracts.spec.ts` (UF-01 to UF-03) and `Test_002_PageEditorConfig.spec.ts` (UF-R1) |
| 3 | Create test data `testdata/<ENV>/ProcessOrchestrationBackend/UIFields/Test_001_PageConfigContracts.json`, with a `_schema` block and the keys `PAGES` (id, entity, type), `PROCESS_NAME`, `SUBPROCESS_NAME`, `LIST_BASELINE`, `DETAIL_BASELINE`. Do the same for `Test_002`. |
| 4 | Create the suite `tests/TestSuites/POBackendUIFieldsBatch.json`, add UF-01-P01, UF-02-P01 and UF-03-P01/P02 to `POBackendSmokeBatch.json`, and **add the new suite to the backend CI workflows**. It is a new top-level area. |
| 5 | Run `npm run docs:testcases`, and run each spec on its own (`--workers=1`) on INTEROP, then QA and PSR |

Notes:
- All cases are GETs, so no cleanup is needed and the specs can run in parallel with other suites.
- For the baseline comparison, sort the names and compare the arrays. On mismatch, attach the diff to the report (`test.info().attach`).

## 10. Risks and findings

| ID | Finding | Impact | Test |
| --- | --- | --- | --- |
| U1 | The repository documentation says UI Fields has no caller, but lui calls 4 route families | A missing route or broken configuration is mis-triaged as a UI defect | This plan |
| U2 | No `@PreAuthorize` on `FieldController`, although the OAS documents 403 | Any authenticated tenant user can read any page configuration of their tenant (low sensitivity, but inconsistent) | UF-*-N03 |
| U3 | The configuration logic sits in the external `plan-sop-crud-framework` SNAPSHOT shared with Action Item | One framework change can break both PO grids and the AI editor and filters at the same time | AI-01, AI-02, UF baselines |
| U4 | A non-numeric `pageId` surfaces as `IllegalArgumentException` | The status depends on the shared handler mapping | UF-01-E01 |
| U5 | All 10 PSR samplers have no assertions | PSR cannot detect a failed configuration load | R1 |

## 11. Other recommendations

- **R1. Add PSR assertions.** Add `200` and a non-empty `$` or `$.fields` check to the 10 UI Fields samplers in `PSRGatewayTest.jmx`.
- **R2. Correct the documentation.** Fix [usage-across-repositories.md](../../repositories/plan-sop-ui-fields-service/usage-across-repositories.md) and the UI Fields row of the gateway prefixes table in [repo-map.md](../../repositories/repo-map.md), which still says *unconfirmed* although the OLD path is now confirmed. Use the evidence in section 2.
- **R3. Capture traffic once.** Record browser traffic for the lui PO listing and process details on QA. This confirms the NEW-mode gateway prefix and any extra query parameters.

## 12. Open questions

1. What is the NEW URL-mode prefix for UI Fields, the equivalent of `po/api/v1`? Until it is confirmed, use the OLD path in both modes.
2. Who owns re-baselining when a product configuration change intentionally alters the field lists?

## 13. Related documents

- [UI Fields API contract](../../repositories/plan-sop-ui-fields-service/api-contract.md) and [automation coverage](../../repositories/plan-sop-ui-fields-service/automation-coverage.md)
- [ui-fields-api-coverage-matrix.html](../ui-fields-api-coverage-matrix.html) and the [backend API coverage dashboard](../backend-api-coverage-dashboard.html)
- [Coverage matrix: priority gap 1](../../repositories/coverage-matrix.md#1-ui-fields-configuration-contract--critical-low-effort)
