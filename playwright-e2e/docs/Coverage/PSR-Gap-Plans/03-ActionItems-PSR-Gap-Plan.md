# Action Items: PSR APIs missing from Playwright backend tests

| Item | Value |
| --- | --- |
| Date | 2026-10-01 |
| Service | `plan-sop-actionitem`, gateway path `actionitems/v1`. It also covers the PO-owned action-item search proxy (`process-orchestration/v1/.../actionitem/search`). |
| PSR source | [jmeter/Tests/PSRGatewayTest.jmx](../../../../jmeter/Tests/PSRGatewayTest.jmx): 10 distinct Action Item routes in 18 samplers, plus 6 PO proxy routes in 18 samplers |
| Playwright source | [tests/ProcessOrchestrationBackend/ActionItem](../../../tests/ProcessOrchestrationBackend/ActionItem) (3 specs) and Migration Test_005, which creates and cleans up KPIs |
| Companion plans | [Process Orchestration](01-ProcessOrchestration-PSR-Gap-Plan.md), [Link Management](02-LinkManagement-PSR-Gap-Plan.md), [UI Fields](04-UIFields-PSR-Gap-Plan.md) |
| Status | Implemented (2026-10-01) in `tests/ProcessOrchestrationBackend/ActionItem/`: `Test_004_ActionItemSearchForProcess` (AI-08, 14 tests), `Test_005_ActionItemSearchForSubprocess` (AI-09, 10), `Test_006_ActionItemEditorAndFilterConfig` (AI-01/AI-02, 19), `Test_007_ActionItemTemplates` (AI-03, 8) and `Test_008_ActionItemKpiConfigCrud` (AI-04 to AI-07, 23), with the shared helper `util/action-item.util.ts`. INTEROP Azure, INTEROP Gravitee, QA Azure and QA Gravitee all pass. Cases that only reproduce a defect (A1–A7, A9, AI-08-E05, AI-04-E04) are not tests; they are recorded with request, response, expected and actual in [ActionItems-UIFields-Defect-Report.html](ActionItems-UIFields-Defect-Report.html), with two new ones (PUT `/kpis/{id}` without `kpiId` returns 500; PUT clears `createdBy`). Not implemented: AI-03-P03 (PSR only) and the sandbox-only inactive-KPI cases AI-04-E03 and AI-06-E03. Skipped by design: AI-09-P03 on QA Gravitee (its machine client cannot delete subprocesses) and AI-05-E01 where no second-realm credentials work. Observed behaviour that differs from sections 6 to 10: QA Azure `IntegratedBusinessPlanning` has no `actionItemEntityId`, so the QA test data uses `ProcessWithCustomAttribute`; search items carry no `createdOn`; user-picker `values` are omitted when the entity has no participants; status and priority codes are tenant-configured (INTEROP status `0,1,2,4`, priority `0`–`3`); an unregistered KPI `entityId` returns 404 with no orphan; template `entityId` matching is case-insensitive. |

## 1. Scope

**In scope:**
- Every Action Item (AI) service route that `PSRGatewayTest.jmx` calls.
- The two PSR search routes that **PO serves as a proxy** in front of AI: `POST /process/{p}/actionitem/search` and `POST /process/{p}/subprocess/{sp}/actionitem/search`. They are planned here because the existing proxy tests (create and update) live in `ActionItem/`, run in `POBackendActionItemBatch.json`, and check Action Item behaviour. The PO plan points here for them.

**Out of scope:** AI routes that PSR never calls, such as playbooks, comments, bulk and status updates. See [action-items-api-coverage-matrix.html](../action-items-api-coverage-matrix.html).

## 2. Summary

| Metric | Count |
| --- | --- |
| Distinct AI routes in PSR | 10 |
| PO action-item proxy routes in PSR | 6 (4 covered, 2 not covered) |
| Covered by Playwright | 3 AI routes (`POST /actionitems`, `PUT /actionitems/{id}`, `DELETE /actionitems/{id}`) plus 4 proxy routes (`POST`/`PUT` for process and subprocess) |
| Partial | 1 (`POST /kpis`, Migration Test_005 only) |
| Indirect | 1 (`DELETE /kpis/{id}`, cleanup only) |
| Not covered | 5 AI routes and 2 proxy routes |
| **Gap APIs in this plan** | **9** (AI-01 to AI-09) |
| Proposed test cases | 92 (see section 7) |

Priorities:
- **P1:** the PO search proxies (AI-08, AI-09) feed every action-item grid: the lui PO action-items tab and the Assumptions flyout in both UIs. Seven PSR samplers use each one.
- **P1:** `GET /actionitems/filters` (AI-02). lui loads it when the side nav, process details and action-item details open.
- **P2:** the editor (AI-01) and template list (AI-03). The editor is the create/edit modal; the template list is the "create from template" flow.
- **P3:** the KPI configuration CRUD (AI-04 to AI-07). No UI calls it. PO calls `POST /kpis` service to service when it creates a process from a template that defines `ACTION_ITEM_KPI`.

Reading the source turned up 9 defect candidates (section 10). Examples: `POST /kpis` without attributes throws an NPE, `PUT /kpis/{id}` skips validation, a `GET` for an unknown KPI returns `200 {"data": null}`, and a search body declared optional is dereferenced anyway.

## 3. Method and evidence

The method is the same as in the [PO plan](01-ProcessOrchestration-PSR-Gap-Plan.md#3-method-and-evidence). Playwright builds Action Item URLs from `ACTIONITEM` (the PO base with a trailing slash), `ACTIONITEM2` (`.../actionitems/v1/actionitems`), `DELETE_ACTIONITEM`, `CREATE_ACTIONITEM_KPI_CONFIG` (`.../actionitems/v1/kpis`) and `DELETE_ACTIONITEM_KPI` (`.../kpis/{id}`). These are defined for QA, INTEROP and PSR in [configs/setup.js](../../../configs/setup.js).

## 4. Coverage matrix

### 4.1 Action Item service routes (10)

| # | Method | Route | PSR samplers | Playwright | Evidence or gap ID |
| --- | --- | --- | --- | --- | --- |
| 1 | POST | `/actionitems` | 1 (ActionItems9) | Covered | ActionItem Test_003 |
| 2 | PUT | `/actionitems/{id}` | 1 (ActionItems11) | Covered | Test_003 TC3, plus null-field negatives in Test_001–Test_003 |
| 3 | DELETE | `/actionitems/{id}` | 3 (ActionItems4, 8, 12) | Covered | Test_001–Test_003 `afterAll` asserts `200` |
| 4 | GET | `/actionitems/editor` | 3 | None | **AI-01** |
| 5 | GET | `/actionitems/filters` | 3 | None | **AI-02** |
| 6 | GET | `/actionitemTemplates` | 3 | None | **AI-03** |
| 7 | POST | `/kpis` | 1 (ActionItemKpis1) | Partial | Migration Test_005 TC4 asserts only `201` and `displayName`. **AI-04** |
| 8 | GET | `/kpis/{id}` | 1 (ActionItemKpis2) | None | **AI-05** |
| 9 | PUT | `/kpis/{id}` | 1 (ActionItemKpis3) | None | **AI-06** |
| 10 | DELETE | `/kpis/{id}` | 1 (ActionItemKpis4) | Indirect | Cleanup in Migration Test_005 and `alm-migration.util.ts`, which accept `200` or `404`. **AI-07** |

### 4.2 PO action-item proxy routes (6)

| # | Method | Route (PO base) | PSR samplers | Playwright | Evidence or gap ID |
| --- | --- | --- | --- | --- | --- |
| 11 | POST | `/process/{p}/actionitem` | 1 | Covered | ActionItem Test_001 |
| 12 | PUT | `/process/{p}/actionitem/{id}` | 1 | Covered | ActionItem Test_001 |
| 13 | POST | `/process/{p}/subprocess/{sp}/actionitem` | 1 | Covered | ActionItem Test_002 |
| 14 | PUT | `/process/{p}/subprocess/{sp}/actionitem/{id}` | 1 | Covered | ActionItem Test_002 |
| 15 | POST | `/process/{p}/actionitem/search` | 7 | None | **AI-08** |
| 16 | POST | `/process/{p}/subprocess/{sp}/actionitem/search` | 7 | None | **AI-09** |

PSR assertions on the gap samplers: **none**. ActionItems2, 6 and 10 have no assertions. ActionItemKpis1 and 3 only extract ids, and ActionItemKpis1 extracts the attribute ids **by array index**, which is fragile (see A8). ActionItemKpis2 and 4, and every editor, filter and template sampler, have no assertions.

## 5. Repository usage matrix for the gap APIs

Legend: **O** owns (implements) the route. **UI** calls it from browser code. **S2S** calls it service to service. **-** means no usage was found in non-test source. `plan-sop-po-be-commons` supplies shared auth, logging and routing to every service and calls none of these routes, so it has no column.

| ID | Route | Action Item | PO service | lui | planning-mfe | Link Mgmt | UI Fields |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AI-01 | GET `/actionitems/editor` | O | - | UI | UI | - | - |
| AI-02 | GET `/actionitems/filters` | O | - | UI | UI | - | - |
| AI-03 | GET `/actionitemTemplates` | O | - | UI | UI | - | - |
| AI-04 | POST `/kpis` | O | S2S | - | - | - | - |
| AI-05 | GET `/kpis/{id}` | O | - | - (`multiKpis` config key unused) | - | - | - |
| AI-06 | PUT `/kpis/{id}` | O | - | - | - | - | - |
| AI-07 | DELETE `/kpis/{id}` | O | - | - | - | - | - |
| AI-08 | POST `/process/{p}/actionitem/search` | O (downstream `POST /searchActionItems`) | O (proxy) | UI | UI | - | - |
| AI-09 | POST `/process/{p}/subprocess/{sp}/actionitem/search` | O (downstream) | O (proxy) | UI | - | - | - |

Shared dependency: both Action Item and UI Fields build their page configurations, which AI-01, AI-02 and the `fields` of AI-08 return, through the same external library `com.by:plan-sop-crud-framework:1.0.7-SNAPSHOT` (`CrudMetadataService`). A framework change affects both services.

## 6. Gap API contracts

### Shared conventions

| Aspect | Value |
| --- | --- |
| AI base | `${API_BASE_URL}` + `ACTIONITEM2` with the trailing `/actionitems` removed. That gives `cbp/<env>/ibp/actionitems/v1` in OLD mode and `ai/api/v1` (`qa/ai/api/v1` on QA) in NEW mode. |
| PO base | `${API_BASE_URL}` + `ACTIONITEM` (`cbp/<env>/ibp/process-orchestration/v1/`) |
| PSR equivalent | `https://${API_HOST}/cbp/psr/ibp/actionitems/v1/...` and `.../process-orchestration/v1/...` |
| RBAC | **None** of the gap routes has `@PreAuthorize`, neither in the AI controllers nor in the PO proxy |
| Display values | `status`, `priority` and `actionType` are sent as codes (`"0"`, `"4"`) and returned as display names (`"Not Started"`, `"Low"`, `"Task"`). **QA returns `"Not started"`** with a lower-case s (see ActionItem Test_001). |
| Gateway quirk | Right after a write, the Azure gateway can return `400 IBP_40_1027` for a valid call. Poll with `expect.poll`, as `requestUntilStatus` in Test_001 does. |
| Error mapping | AI `LocalExceptionHandler`: bean validation and malformed JSON give `400`. `EntityNotFoundException` gives `ENTITY_NOT_FOUND` (expected 404). `IllegalArgumentException` gives `ILLEGAL_ARGUMENT_ERROR` (expected 400). Unhandled exceptions give `UNHANDLED_EXCEPTION` (500). The status codes come from the shared RBAC i18n library, so confirm them on the first run. |

### AI-01 GET `/actionitems/editor` (P2)

| Item | Detail |
| --- | --- |
| Handler | `controllers/ActionItemController.java:92` → `ActionItemService.getEditorConfig(contextType, contextId)` |
| Query | `contextType` (**required**: `ENTITY`, `ACTION_ITEM` or `ALL`, case-sensitive) and `contextId` (**required**: the entity whose participants fill the user pickers) |
| Response 200 | `EditorConfigResponse { groups: [ FieldGroupDto { groupName, fields: [ FieldDto { name, displayName, cmp, type, format, isAttribute, attributeId, rules, values, defaultValue, dependsOn, dynamicData, dataUrl } ] } ] }`. The schema names come from the UI Fields OpenAPI spec, which uses the same crud framework. |
| Behaviour | Reads the `ACTION_ITEMS_EDITOR_PAGE` configuration. Fields whose component is a single-select or multi-select user picker get values from the participants of `contextId` (`EntityTypeEnum.valueOf(contextType)`). The `commentsActive` default value key is converted from `1`/`0` to `"true"`/`"false"`. |
| Errors | A missing parameter returns `400`. An invalid `contextType` (`FOO`, or lower-case `entity`) throws `IllegalArgumentException` from `valueOf`. |
| PSR samplers | AI 3 (process), AI 4 - Subprocess, PS To AI 3. Query `contextType=ENTITY&contextId=<entity guid>`. |
| Used by | lui `src/reducers/action_item_form_modal.ts:41`. planning-mfe `src/reducers/action_item_form_modal.ts:33`, which hardcodes `contextType=ENTITY`. |

### AI-02 GET `/actionitems/filters` (P1)

| Item | Detail |
| --- | --- |
| Handler | `ActionItemController.java:145` → `getFilterConfig(contextType, contextId)`, which reads the `ACTION_ITEMS_FILTERS_PAGE` configuration |
| Query | Same as AI-01 |
| Response 200 | `FilterConfigResponse { filters: [ FilterDto { id, name, displayName, cmp, type, format, isAttribute, values, defaultValue } ] }` |
| PSR samplers | AI 5, AI 6 - Subprocess, PS To AI 5 |
| Used by | lui `src/reducers/activities_data.ts:93`, dispatched from `Components/Common/SideNav/utils.tsx:101`, `Components/ProcessOrchestration/ActionItems/ActionItemDetails.tsx:229` and `Components/ProcessOrchestration/ViewProcess/ProcessDetails.tsx:544`. Also lui `Components/ProcessOrchestration/Assumptions/AssumptionsFlyout/ActionItems/useActionItemList.ts:73`. planning-mfe `src/pages/Assumptions/AssumptionsFlyout/ActionItems/useActionItemList.ts:67`. |

### AI-03 GET `/actionitemTemplates` (P2)

| Item | Detail |
| --- | --- |
| Handler | `controllers/ActionItemTemplateController.java:82` → `ActionItemTemplateService.queryActionItemTemplatesByEntityId` |
| Query | `entityId` (**required**). Both UIs pass the **process id**, not the `actionItemEntityId`. |
| Response 200 | `[ ActionItemTemplateResponse { id, name, entityId, description, isActive, isDeleted, createdBy, createdOn, updatedBy, updatedOn, data: [ActionItemDto] } ]`. Only active templates of the caller's tenant are returned. An unknown entity returns `[]`. |
| Setup route (not in PSR) | `POST /actionitemTemplates { name (unique per tenant), entityId, description, ids: [<action item ids>] }` snapshots those action items into the template. `DELETE /actionitemTemplates/{id}` removes it. |
| PSR samplers | AI 4, AI 5 - Subprocess, PS To AI 4 (`entityId=35FD7D0C-2F3D-47D3-9CA6-460B3C912A84`) |
| Used by | lui `src/reducers/activities_data.ts:169`. planning-mfe `src/reducers/activities_data.ts:65`. |

### AI-04 to AI-07 KPI configuration (P2/P3)

| Route | Handler (`controllers/configuration/KpiConfigurationController.java`) | Request | Response |
| --- | --- | --- | --- |
| POST `/kpis` (AI-04) | `:75`, with `@Valid` | `KpiRequestDto { attrName (@NotEmpty, ≤100), displayName (@NotEmpty, ≤100), description (≤100), entityId (≤36, optional), isActive = true, isEnabled = true, kpiConfigAttributes: [ { kpiAttrName, attrValue, isActive, isEnabled } ] }` | `201` `KpiDto { id, attrName, displayName, description, isActive, isEnabled, kpiConfigAttributes: [ { id, kpiAttrName, attrValue, kpiId, isActive, isEnabled } ], createdOn, createdBy, updatedOn, updatedBy }`. If `entityId` is set, the entity must already be registered in AI, and the KPI is mapped to it. |
| GET `/kpis/{id}` (AI-05) | `:100` | Path `id` | `200` `KpiResponse { data: [KpiDto] }`, a **list wrapper**. An unknown id returns **`200 {"data": null}`**. |
| GET `/kpis` (list, helper) | `:125` | None | `200` `{ data: [KpiDto] }`. The automation cleanup already uses it. |
| PUT `/kpis/{id}` (AI-06) | `:151`, **without `@Valid`** | `KpiUpdateRequestDto` (same fields, without `entityId`) | `200` `KpiDto`. This is a **full replace**: a new entity is mapped with the same id and saved. Attributes have `orphanRemoval = true`. An unknown id gives `EntityNotFoundException("Kpi")`. |
| DELETE `/kpis/{id}` (AI-07) | `:178` | Path `id` | `200` text `KPI deleted successfully.`. Deletes the KPI-to-entity maps, then the KPI. An unknown id gives `EntityNotFoundException`. |

- The `Kpi` entity has `@Where(clause = "is_active=1")`, so an inactive KPI is invisible to GET, PUT and DELETE.
- **Callers:** PO `EntityServiceHelper.java:208` (`createActionItemKpiConfiguration`, which runs asynchronously during `POST /process/template` when the template contains `ACTION_ITEM_KPI`). It then calls `POST /kpi/map/entities` (`:218`). No UI calls any KPI configuration route.
- **PSR samplers:** ActionItemKpis1 to ActionItemKpis4.

```jsonc
// POST /kpis (PSR ActionItemKpis1)
{ "attrName": "Open High Priority Action Items <run>", "displayName": "Open High Priority Action Items <run>",
  "description": "Open High Priority Action Items", "isActive": true, "isEnabled": true,
  "kpiConfigAttributes": [
    { "kpiAttrName": "status",   "attrValue": "1", "isActive": true, "isEnabled": true },
    { "kpiAttrName": "priority", "attrValue": "2", "isActive": true, "isEnabled": true } ] }
```

### AI-08 POST `/process/{p}/actionitem/search` (P1, PO proxy)

| Item | Detail |
| --- | --- |
| Handler | PO `rest/controller/ActionItemProxyController.java:228` → `ActionItemProxyService.getActionItemsWithUiConfig(processId, "origin", ...)` → AI `POST /searchActionItems` (`ActionItemController.java:227`) |
| Request | `ActionItemSearchRequestDto { filter: Map<String,String>, pageNumber = 0, pageSize = 5 }`. The body is declared `required = false` but is dereferenced (see A5). |
| PO behaviour | Resolves the process hierarchy. If it is empty, returns `400` `Process or hierarchy retrieval error`. Then sets `filter.origin = <processId>`. A caller-supplied `filter.entityId` is passed through. |
| AI filter keys | `entityId` (a comma list means IN), `status`, `origin`, `priority`, `actionType`, `dueDate`, `dueDateRange`, `source`, `createdBy`, `author`, `assigneeUsers`, `notifyUsers`. Any other key is treated as a **custom attribute** filter. `filter.sort` takes `"field,dir[,field,dir]"`. The default sort is `createdOn DESC`. |
| Response 200 | `ActionItemsResponse { data: [ActionItemDto], fields: [FieldDto], pager: { pageNumber, pageSize, numberOfElements, totalElements, totalPages } }`. `fields` is the `ACTION_ITEMS_PAGE` list configuration, which lui uses to build the grid columns. |
| PO post-processing | Replaces `origin` (an id) with the origin node's **display name**, and `sourceName` with the source node's display name |
| PSR samplers (7) | ActionItems2 (`{filter:{}, pageNumber:0, pageSize:10}`), AI 6, Load Action Items With Page Size 5/10/20, Action Items Attribute Search - Process (`status "0,1,2,4,5,6,7,8"`, `actionType "4,3,1"`, `priority "0,1,2,3,4"`), PS To AI 6 |
| Used by | lui `src/Components/ProcessOrchestration/ActionItems/ActionItemDetails.tsx:274`. For an assumption it sends `filter.entityId = <assumption actionItemEntityId>`. planning-mfe `src/pages/Assumptions/AssumptionsFlyout/ActionItems/useActionItemList.ts:26` sends `{filter:{entityId, ...}, pageNumber, pageSize, sort:"createdOn,desc"}`, and the **top-level `sort` is ignored**. |

### AI-09 POST `/process/{p}/subprocess/{sp}/actionitem/search` (P1, PO proxy)

| Item | Detail |
| --- | --- |
| Handler | PO `ActionItemProxyController.java:260` → `getActionItemsWithUiConfig(nodeId, "sourceId", hierarchyEntityIds, ...)` |
| PO behaviour | Resolves the subprocess hierarchy. If it is empty, returns `400` `Node or hierarchy retrieval error`. Then it replaces `sourceId` with `entityId IN (<actionItemEntityId of the node and all descendants>[, caller filter.entityId])`. |
| Effect | Returns action items raised on the subprocess **or any of its descendants**. Supplying an assumption `entityId` adds that entity to the IN list. This is PSR ActionItems10, on `InitiativesAndAssumptionsReview`. |
| Response | Same as AI-08 |
| PSR samplers (7) | ActionItems6, ActionItems10, AI 7 - Subprocess, Load Action Items With Page Size 5/10/20 - Subprocess, Action Items Attribute Search - Subprocess |
| Used by | lui `ActionItemDetails.tsx:274` (the `urlParams.subprocessName` branch) |

## 7. Test cases

Type: **P** positive, **N** negative, **E** edge.

### AI-01 Editor configuration (12)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| AI-01-P01 | P | `contextType=ENTITY&contextId=<process actionItemEntityId>` | `200`. `groups` is a non-empty array, every group has a `fields` array, and every field has a non-empty `name`. |
| AI-01-P02 | P | Required editor fields | The field names include `name`, `status`, `priority`, `actionType` and `dueDate`. Pin the exact set after the first run. |
| AI-01-P03 | P | `commentsActive` default value | `fieldValues.defaultValue[].key` is `"true"` or `"false"` (normalised) |
| AI-01-P04 | P | Subprocess `contextId` (`SupplyReview` `actionItemEntityId`) | `200`, same structure |
| AI-01-P05 | P | User-picker fields (assignee and notify) | Their values are an array, possibly empty. Each participant has an `id`. |
| AI-01-N01 | N | `contextType` missing | `"400"` |
| AI-01-N02 | N | `contextId` missing | `"400"` |
| AI-01-N03 | N | No token | `"401"` |
| AI-01-E01 | E | `contextType=FOO` | `IllegalArgumentException`. Record the status (`"400"` expected). Defect A7 if 500. |
| AI-01-E02 | E | `contextType=entity` (lower case) | Same as E01, because `valueOf` is case-sensitive |
| AI-01-E03 | E | Unknown `contextId` (random UUID) | `200`. User-picker values are empty. |
| AI-01-E04 | E | `Accept-Language: fr-FR` | Same structure. Titles may be localised, so assert structure only. |

### AI-02 Filter configuration (8)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| AI-02-P01 | P | Process `contextId` | `200`. `filters` is a non-empty array. Each item has `name`, `displayName`, `cmp` and `values`. |
| AI-02-P02 | P | Standard filters | `status`, `priority` and `actionType` are present. Their `values` entries have `key` and `displayName`. |
| AI-02-P03 | P | Code coverage | The `status` keys include the PSR codes `0,1,2,4,5,6,7,8`, the `priority` keys include `0`–`4`, and the `actionType` keys include `1,3,4`. AI-08-P05 uses this map. |
| AI-02-P04 | P | Subprocess `contextId` | `200`, same structure |
| AI-02-N01 | N | `contextType` or `contextId` missing | `"400"` |
| AI-02-N02 | N | No token | `"401"` |
| AI-02-E01 | E | `contextType=FOO` | Record the status (A7) |
| AI-02-E02 | E | Unknown `contextId` | `200` |

### AI-03 Action item templates (9)

Setup: create an action item on the process through the PO proxy (Test_001 payload). Then `POST /actionitemTemplates {name:"PWTemplate_<run>", entityId:<processId>, description, ids:[<aiId>]}`. In `afterAll`, delete the template and then the action item.

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| AI-03-P01 | P | `GET ?entityId=<processId>` | `200` array containing the template: `entityId` is the process id, `isActive` is `true`, `isDeleted` is `false` |
| AI-03-P02 | P | Template snapshot | `data[0].name` equals the action item's name |
| AI-03-P03 | P | PSR parity with the PSR `entityId`, on PSR only | `200` array |
| AI-03-N01 | N | `entityId` missing | `"400"` |
| AI-03-N02 | N | No token | `"401"` |
| AI-03-E01 | E | Unknown `entityId` | `200 []` |
| AI-03-E02 | E | After `DELETE /actionitemTemplates/{id}` | The template is no longer returned |
| AI-03-E03 | E | Upper-case and lower-case GUID for `entityId` | Record whether the match is case-insensitive (SQL Server collation) |
| AI-03-E04 | E | Setup guard: create a second template with the same name | Rejected with `TEMPLATE_WITH_NAME_ALREADY_EXISTS`. Record the status. |

### AI-04 POST /kpis (14)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| AI-04-P01 | P | PSR body with `attrName` suffixed `<run>` | `201`. `id` is a UUID. `attrName`, `displayName` and `description` echo. `isActive` and `isEnabled` are `true`. Two attributes, **looked up by `kpiAttrName`, not by index**: `status = "1"` and `priority = "2"`, each with an `id`. |
| AI-04-P02 | P | Audit fields | `createdOn` and `createdBy` are present |
| AI-04-P03 | P | `entityId` set to the process `actionItemEntityId` | `201`. AI `GET /kpi/entities/{entityId}` lists the KPI. Confirm the response shape on the first run. |
| AI-04-N01 | N | `attrName` missing | `"400"` |
| AI-04-N02 | N | `displayName` missing | `"400"` |
| AI-04-N03 | N | `attrName` of 101 characters | `"400"` |
| AI-04-N04 | N | `entityId` of 37 characters | `"400"` |
| AI-04-N05 | N | `entityId` not registered in AI | An error status. `GET /kpis` must **not** list the `attrName` afterwards (no orphan row). |
| AI-04-N06 | N | No token | `"401"` |
| AI-04-N07 | N | Malformed JSON | `"400"` |
| AI-04-E01 | E | `kpiConfigAttributes` omitted | `KpiMapper.kpi()` iterates a null list, so expect `"500"` (A1) |
| AI-04-E02 | E | Attribute with `isActive: true` and `isEnabled: false` | The stored `isEnabled` is `true`, because the mapper copies `isActive` (A2) |
| AI-04-E03 | E | `isActive: false` | `201`, but GET then returns `data: null` (`@Where`). **Sandbox only**: the row can no longer be deleted through the API. |
| AI-04-E04 | E | The same `attrName` twice | Record the result. No unique constraint was found in the source. |

### AI-05 GET /kpis/{id} (5)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| AI-05-P01 | P | GET after create | `200`. `data` has length 1 and equals the POST response, ignoring audit fields. |
| AI-05-P02 | P | `GET /kpis` (list) | Contains the id |
| AI-05-N01 | N | Unknown UUID | **`200 {"data": null}`**. Assert this as current behaviour and link defect A4 (expected `404`). |
| AI-05-N02 | N | No token | `"401"` |
| AI-05-E01 | E | Id read with the target-realm credentials (Migration source/target) | `data: null` (tenant isolation) |

### AI-06 PUT /kpis/{id} (10)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| AI-06-P01 | P | PSR update body, with the attribute ids and `kpiId` from create and the description set to `"... - Updated"` | `200`. `description` is updated and the attribute ids are unchanged |
| AI-06-P02 | P | Change the `status` attribute value from `"1"` to `"0"` | GET reflects it |
| AI-06-P03 | P | Leave the `priority` attribute out of the list | GET shows only `status` (`orphanRemoval`) |
| AI-06-P04 | P | Add a third attribute with no id | GET shows 3 attributes and the new one has an id |
| AI-06-N01 | N | Unknown id | `"404"` (`EntityNotFoundException "Kpi"`) |
| AI-06-N02 | N | No token | `"401"` |
| AI-06-N03 | N | Malformed JSON | `"400"` |
| AI-06-E01 | E | `attrName: ""` | POST would reject this, but PUT has no `@Valid`. Record the status (A3). |
| AI-06-E02 | E | No attribute carries an id | The attribute ids change and the count stays the same. Record this. |
| AI-06-E03 | E | `isActive: false` | GET then returns `data: null`. Later PUT and DELETE calls return `404`. **Sandbox only.** |

### AI-07 DELETE /kpis/{id} (5)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| AI-07-P01 | P | DELETE the created KPI | `200` text `KPI deleted successfully.`. GET returns `data: null` and the list no longer contains it. |
| AI-07-P02 | P | DELETE a KPI created with `entityId` | `GET /kpi/entities/{entityId}` no longer lists it, because the maps are removed |
| AI-07-N01 | N | DELETE the same id again | `"404"` |
| AI-07-N02 | N | Unknown id | `"404"` |
| AI-07-N03 | N | No token | `"401"` |

### AI-08 PO process search (18)

Setup: create action item `PW Search <run>` on the process with the Test_001 payload, and another on subprocess `SupplyReview` with the Test_002 payload. Delete both in `afterAll` through the AI `DELETE /actionitems/{id}`.

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| AI-08-P01 | P | `{filter:{}, pageNumber:0, pageSize:10}` | `200`. `data` has at most 10 items, `fields` is a non-empty array, and `pager.pageSize` is 10 with `totalElements` ≥ 1. |
| AI-08-P02 | P | `{filter:{entityId:<process actionItemEntityId>}, pageSize:50}` (poll) | The created item is in `data` (newest first) |
| AI-08-P03 | P | Item contract | Each item has `id`, `name`, `entityId`, `sourceId`, `sourceType`, `status`, `actionType`, `priority`, `dueDate`, `origin`, `sourceName` and `attributes[]` |
| AI-08-P04 | P | PSR page sizes 5, 10 and 20 | `data.length` ≤ pageSize and `pager.pageSize` matches |
| AI-08-P05 | P | PSR attribute filter (`status`, `actionType` and `priority` code lists) | Every item's display values map, through the AI-02 filter values, to one of the requested codes |
| AI-08-P06 | P | `filter.entityId = <assumption entity>` (the lui assumption flow, with an item created by the Test_003 pattern) | Only that entity's items are returned |
| AI-08-P07 | P | Item raised on `SupplyReview` | It also appears in the **process** search, because its origin is the process |
| AI-08-P08 | P | `filter.sort = "createdOn,asc"` | `createdOn` ascending. Without a sort, it is descending. |
| AI-08-P09 | P | PO rewrite | `origin` equals the process **display name** and `sourceName` the node display name, not their ids |
| AI-08-N01 | N | Unknown process | `"400"` `Process or hierarchy retrieval error` |
| AI-08-N02 | N | No token | `"401"` |
| AI-08-N03 | N | Malformed JSON | `"400"` |
| AI-08-E01 | E | No body at all | NPE in the proxy, so expect 5xx (A5) |
| AI-08-E02 | E | `pageSize` omitted | `pager.pageSize` is 5 (the PO default) |
| AI-08-E03 | E | Top-level `sort: "createdOn,asc"` (planning-mfe shape) | Ignored: the order stays descending (A6) |
| AI-08-E04 | E | Unknown filter key `{"foo":"bar"}` | `200`, `data: []`. The key is treated as an attribute filter. |
| AI-08-E05 | E | `filter.sort = "foo,asc"` | Error (unknown sort property). Record the status. |
| AI-08-E06 | E | `pageNumber` past the last page | `200`, `data: []` |

### AI-09 PO subprocess search (11)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| AI-09-P01 | P | Item created on `SupplyReview` | Present in `.../subprocess/SupplyReview/actionitem/search` |
| AI-09-P02 | P | Process-level item from AI-08 setup | **Not** present in the subprocess search |
| AI-09-P03 | P | Hierarchy: dedicated process with `LEVEL_ONE` and `LEVEL_TWO` (ProcessBatch Test_005 pattern). Create an item on `LEVEL_TWO`. | It appears in the `LEVEL_ONE` search. Optional, because it needs data. |
| AI-09-P04 | P | PSR ActionItems10 shape: `.../subprocess/InitiativesAndAssumptionsReview/actionitem/search` with `filter.entityId = <assumption entity>` | The assumption's action item is included (IN list = hierarchy + assumption) |
| AI-09-P05 | P | Page sizes 5, 10 and 20 | `data.length` ≤ pageSize |
| AI-09-P06 | P | PSR subprocess attribute filter | Every item matches |
| AI-09-N01 | N | Unknown subprocess | `"400"` `Node or hierarchy retrieval error` |
| AI-09-N02 | N | Unknown process | `"400"` |
| AI-09-N03 | N | No token | `"401"` |
| AI-09-E01 | E | No body | 5xx (A5) |
| AI-09-E02 | E | Subprocess name in a different letter case | Record whether it resolves |

**Total: 92 test cases.**

## 8. Data dependencies and environment prerequisites

| Dependency | Needed by | INTEROP | QA | PSR | Notes |
| --- | --- | --- | --- | --- | --- |
| Process `IntegratedBusinessPlanning` and its `actionItemEntityId` | AI-01, AI-02, AI-04-P03, AI-08 | Yes | Yes | Yes | Read it at runtime from `GET /process/{p}/context?all=true`, as Test_001 does. Do not hardcode it. |
| Process **id**, for templates | AI-03 | Runtime | Runtime | Runtime | `GET /process/{p}` → `id` |
| Subprocess `SupplyReview` and its `actionItemEntityId` | AI-01-P04, AI-09 | Yes | Yes | Yes | `GET /process/{p}/subprocess/{sp}`, as in Test_002 |
| Assumption entity id | AI-08-P06, AI-09-P04 | `c0d30cc0-…` (Test_003 data) | `da2a26e6-…` | **Same value as INTEROP**, which looks copied | Validate the PSR value. The PSR JMX uses `f80cf56e-…` (Azure) and `596f07a3-…` (Gravitee). |
| Status display text | All search assertions | `Not Started` | **`Not started`** | `Not Started` | Reuse the per-environment switch from Test_001 |
| Assignee user ids for updates | AI-06 (none), AI-08 setup | Test data `updateReqest.assigneeUsers` | Same | Same | Already present |
| Unique names | AI-03, AI-04 | `<prefix>_<runId>` | Same | Same | Template names must be unique per tenant |
| Cleanup | All | - | - | - | Action items: `DELETE /actionitems/{id}`. Templates: `DELETE /actionitemTemplates/{id}`. KPIs: `DELETE /kpis/{id}`, with a fallback `GET /kpis` filtered by the `attrName` prefix (the Migration Test_005 pattern). |
| Inactive-KPI tests | AI-04-E03, AI-06-E03 | Sandbox only | Sandbox only | Never | They leave rows the API can no longer delete |

## 9. Implementation blueprint

| Spec (new) | Covers | Suite | Testdata (`testdata/<ENV>/ProcessOrchestrationBackend/ActionItem/`) |
| --- | --- | --- | --- |
| `ActionItem/Test_004_ActionItemSearchForProcess.spec.ts` | AI-08 | `POBackendActionItemBatch.json`, plus P01/P02 in `POBackendSmokeBatch.json` | `Test_004_ActionItemSearchForProcess.json` (`PROCESS_NAME`, `SUBPROCESS_NAME`, `ATTRIBUTE_FILTER`, `PAGE_SIZES`, `ASSUMPTION_ENTITY_ID`) |
| `ActionItem/Test_005_ActionItemSearchForSubprocess.spec.ts` | AI-09 | `POBackendActionItemBatch.json` | `Test_005_ActionItemSearchForSubprocess.json` |
| `ActionItem/Test_006_ActionItemEditorAndFilterConfig.spec.ts` | AI-01, AI-02 | `POBackendActionItemBatch.json`, plus P01s in smoke | `Test_006_ActionItemEditorAndFilterConfig.json` (`EXPECTED_EDITOR_FIELDS`, `EXPECTED_FILTERS`) |
| `ActionItem/Test_007_ActionItemTemplates.spec.ts` | AI-03 | `POBackendActionItemBatch.json` | `Test_007_ActionItemTemplates.json` |
| `ActionItem/Test_008_ActionItemKpiConfigCrud.spec.ts` | AI-04 to AI-07 | `POBackendActionItemBatch.json` | `Test_008_ActionItemKpiConfigCrud.json` (the PSR KPI body) |

Notes:
- The action-item create and delete helpers already exist inline in Test_001–Test_003 (`requestUntilStatus`). Move them into one shared helper, for example `util/action-item.util.ts`, before adding five more specs.
- Error statuses come back from `ApiUtil` as strings: assert `toBe("400")`.
- Find KPI attributes by `kpiAttrName`, never by array index.

## 10. Defect candidates found in the source

| ID | Route | Finding | Evidence | Test |
| --- | --- | --- | --- | --- |
| A1 | POST `/kpis` | A missing `kpiConfigAttributes` causes an NPE (the custom mapping iterates without a null check) | `mappers/KpiMapper.java` `@Named("kpiConfigAttributes")` | AI-04-E01 |
| A2 | POST `/kpis` | The attribute `isEnabled` is copied from `isActive` | `KpiMapper.kpi()`: `setIsEnabled(kpi.getIsActive())` | AI-04-E02 |
| A3 | PUT `/kpis/{id}` | No `@Valid`, so the limits enforced on POST are skipped | `KpiConfigurationController.java:151` | AI-06-E01 |
| A4 | GET `/kpis/{id}` | An unknown id returns `200 {"data": null}` instead of 404 | `KpiConfigurationService.findKpiById` | AI-05-N01 |
| A5 | PO search proxies, and AI `/searchActionItems` | The body is declared optional but `getFilter()` is called on it, so an empty body produces an NPE (5xx) | `ActionItemProxyService.getActionItemsWithUiConfig`, `ActionItemController.java:227` | AI-08-E01, AI-09-E01 |
| A6 | PO search | The top-level `sort` that planning-mfe sends is ignored. Only `filter.sort` is honoured. | `useActionItemList.ts:26` vs `PagingAndSortingUtil.getSortOrderWithoutAlias` | AI-08-E03 |
| A7 | Editor and filters | An invalid or lower-case `contextType` reaches `EntityTypeEnum.valueOf` | `ActionItemCrudMetadataService.getFieldValues` | AI-01-E01, AI-02-E01 |
| A8 | PSR JMX | ActionItemKpis1 reads the attribute ids by index (`kpiConfigAttributes[0]` and `[1]`), but the order is not guaranteed | JMX extractor | (JMX fix) |
| A9 | PO search | `origin` and `sourceName` are rewritten to display names. API consumers that expect ids get names instead. | `ActionItemProxyController.updateActionItemsResponse` | AI-08-P09 |

## 11. Other recommendations

- **R1. Add PSR assertions.** Add assertions to the 14 PSR search samplers (`200`, `$.pager`, `$.fields`) and to the editor, filter and template samplers (`$.groups`, `$.filters`, array). Fix A8 by using a JSONPath filter such as `$.kpiConfigAttributes[?(@.kpiAttrName=='status')].id`.
- **R2. Pin the field lists.** Pin the editor and filter field-name lists per environment (AI-01-P02, AI-02-P02) as a baseline file. A configuration drift then fails as an API test instead of a confusing UI failure.
- **R3. Cover the template-KPI path.** PO creates AI KPIs when it creates a process from a template that contains `ACTION_ITEM_KPI`. No test covers that path. Add a check to ProcessBatch Test_005 that `GET /kpis` contains the template's KPIs after the process is created.

## 12. Open questions

1. Should A4 and A5 be asserted as current behaviour or as desired behaviour (`test.fail()`)? The default is current behaviour with a linked annotation.
2. Is there a sandbox realm where the inactive-KPI cases (AI-04-E03, AI-06-E03) may run?

## 13. Related documents

- [Action Item API contract](../../repositories/plan-sop-actionitem/api-contract.md) and [automation coverage](../../repositories/plan-sop-actionitem/automation-coverage.md)
- [action-items-api-coverage-matrix.html](../action-items-api-coverage-matrix.html) and the [backend API coverage dashboard](../backend-api-coverage-dashboard.html)
- [PSRGatewayTest-ProcessOrchestration-Coverage.html](../../../../jmeter/plans/PSRGatewayTest-ProcessOrchestration-Coverage.html)
