# Process Orchestration: PSR APIs missing from Playwright backend tests

| Item | Value |
| --- | --- |
| Date | 2026-10-01 |
| Service | `plan-sop-process-orchestration-service`, gateway path `process-orchestration/v1` |
| PSR source | [jmeter/Tests/PSRGatewayTest.jmx](../../../../jmeter/Tests/PSRGatewayTest.jmx): 203 HTTP samplers, 37 distinct PO routes |
| Playwright source | [tests/ProcessOrchestrationBackend](../../../tests/ProcessOrchestrationBackend) (29 specs) and the helpers they import |
| Companion plans | [Link Management](02-LinkManagement-PSR-Gap-Plan.md), [Action Items](03-ActionItems-PSR-Gap-Plan.md), [UI Fields](04-UIFields-PSR-Gap-Plan.md) |
| Status | PO-03 to PO-19 implemented on 2026-10-01 in `ProcessBatch/Test_006` to `Test_009` and `Calendar/Test_003` (78 tests, green on INTEROP and QA, Azure and Gravitee). PO-01 and PO-02 (`Test_010_TenantDetails`) are not implemented. Defects PO-D01 to PO-D10 are in [ActionItems-UIFields-Defect-Report.html](ActionItems-UIFields-Defect-Report.html). |

## 1. Scope

**In scope:** every Process Orchestration (PO) route that `PSRGatewayTest.jmx` calls.

**Cross-reference:** two PO-owned routes, `POST /process/{p}/actionitem/search` and `POST /process/{p}/subprocess/{sp}/actionitem/search`, are planned in the [Action Items plan](03-ActionItems-PSR-Gap-Plan.md) (AI-08, AI-09). Their controller is in PO, but the existing tests for these proxy routes live in `ActionItem/`, run in `POBackendActionItemBatch.json`, and check Action Item behaviour.

**Out of scope:** `featuretoggle/v1/**` (11 PSR samplers). The feature-toggle service is not one of the 7 repositories. PO (`FeatureToggleProxyService`) and LM (`AuditLogService`) only call it.

## 2. Summary

| Metric | Count |
| --- | --- |
| Distinct PO routes in PSR | 37 |
| Covered by Playwright (dedicated assertions) | 16 |
| Partial (asserted only inside another flow) | 2 |
| Indirect (setup or cleanup only, response not asserted) | 2 |
| Not covered | 17 (2 moved to the Action Items plan) |
| **Gap APIs in this plan** | **19** (PO-01 to PO-19) |
| Proposed test cases | 140 (see section 7) |

The highest-risk gaps (P1) sit on the critical UI path:

- `POST /process/search` loads the PO listing page in lui, and planning-mfe and lui call it to fill the context switcher.
- `GET /process/{p}/context` runs on every Planning Space load (planning-mfe, `all=true`) and on lui Settings (summary form).
- `GET` and `PUT /process/{p}/scope` drive the process scope that every Planning Space user of a process sees. `PUT` replaces the whole scope with no validation.

Reading the source turned up 11 defect candidates (section 10). Examples: invalid search paging returns 500 instead of 400, `pager.totalPages` is off by one, an empty-array search filter produces broken SQL, and `GET /process/{p}/kpi` returns `200 []` for an unknown process.

## 3. Method and evidence

1. **PSR inventory.** The JMX was parsed as XML. Each `HTTPSamplerProxy` was recorded with its method, path, query arguments, body, enabled flag, parent controller chain, and attached assertions and extractors. All 203 samplers are enabled.
2. **Playwright inventory.** Every `apiUtil.processAPIRequest(...)` call was collected from the 29 specs under `tests/ProcessOrchestrationBackend/**`, together with the helpers those specs import: `util/mapping.util.ts`, `util/process-start.util.ts`, `util/calendar-cycle.util.ts` and `util/alm-migration.util.ts`.
3. **Coverage levels:**
   - **Covered:** a dedicated test asserts the status and the body.
   - **Partial:** the route is asserted only as one step of another flow, such as migration verification.
   - **Indirect:** the route is called only in setup or cleanup. The result is not asserted, or any of 200/404 is accepted.
   - **None:** the route is never called.
4. **Contracts** were read from the PO source (controller, service, repository and DTOs) on 2026-10-01. Line numbers below refer to that checkout.
5. **Callers** were found by searching non-test source in `plan-sop-lui` and `plan-sop-planning-mfe`, and by finding outbound REST calls in the backend repositories.

## 4. Coverage matrix: all 37 PSR PO routes

`{p}` is the process name, `{sp}` the subprocess name, `{c}` the calendar name and `{cy}` the cycle name.

| # | Method | Route | PSR samplers | Playwright | Evidence or gap ID |
| --- | --- | --- | --- | --- | --- |
| 1 | GET | `/process/{p}` | 9 | Covered | ProcessBatch Test_001, Test_002, Test_005 |
| 2 | GET | `/process/{p}/tree` | 4 | Covered | ProcessBatch Test_005 |
| 3 | GET | `/process/{p}/children` | 5 | Covered | ProcessBatch Test_005 (pages through pageSize 10) |
| 4 | GET | `/process/{p}/subprocess/{sp}` | 6 | Covered | ProcessBatch Test_003, Test_005; ActionItem Test_002 |
| 5 | POST | `/process/{p}/actionitem` | 1 | Covered | ActionItem Test_001 |
| 6 | PUT | `/process/{p}/actionitem/{id}` | 1 | Covered | ActionItem Test_001 |
| 7 | POST | `/process/{p}/subprocess/{sp}/actionitem` | 1 | Covered | ActionItem Test_002 |
| 8 | PUT | `/process/{p}/subprocess/{sp}/actionitem/{id}` | 1 | Covered | ActionItem Test_002 |
| 9 | POST | `/calendar` | 1 | Covered | Calendar Test_001 |
| 10 | GET | `/calendar/{c}` | 3 | Covered | Calendar Test_001 |
| 11 | PUT | `/calendar/{c}` | 1 | Covered | Calendar Test_001 |
| 12 | DELETE | `/calendar/{c}` | 3 | Covered | Calendar Test_001 |
| 13 | POST | `/calendar/{c}/cycle` | 1 | Covered | Calendar Test_002 |
| 14 | GET | `/calendar/{c}/cycle/{cy}` | 2 | Covered | Calendar Test_002 |
| 15 | PUT | `/calendar/{c}/cycle/{cy}` | 1 | Covered | Calendar Test_002 |
| 16 | DELETE | `/calendar/{c}/cycle/{cy}` | 1 | Covered | Calendar Test_002 |
| 17 | GET | `/process/{p}/context` (`?all=true` and summary) | 5 | Indirect | ActionItem Test_001/003 and Migration Test_005 read `actionItemEntityId` in `beforeAll`, with no assertion. **PO-04** |
| 18 | GET | `/calendar/{c}/cycle` (list) | 2 | Partial | Migration Test_001 checks cycle names. `calendar-cycle.util.ts` and `process-start.util.ts` use it as a helper. **PO-14** |
| 19 | GET | `/supplyChainAction` (list) | 5 | Partial | Migration Test_004 checks only the imported names. **PO-15** |
| 20 | DELETE | `/supplyChainAction/{id}` | 2 | Indirect | Cleanup only, in Migration Test_004 and `alm-migration.util.ts`. **PO-19** |
| 21 | GET | `/tenant` | 6 | None | **PO-01** |
| 22 | POST | `/tenant/onboard` | 5 | None | **PO-02** |
| 23 | POST | `/process/search` | 9 | None | **PO-03** |
| 24 | GET | `/process/{p}/scope` | 2 | None | **PO-05** |
| 25 | PUT | `/process/{p}/scope` | 1 | None | **PO-06** |
| 26 | GET | `/process/{p}/users` | 7 | None | **PO-07** (Test_005 only calls the IAM `roles/{id}/users`) |
| 27 | GET | `/process/{p}/processGantt` | 2 | None | **PO-08** |
| 28 | GET | `/process/{p}/kpi` | 2 | None | **PO-09** |
| 29 | GET | `/process/{p}/subprocess/{sp}/kpi` | 2 | None | **PO-10** |
| 30 | GET | `/process/{p}/subprocess/{sp}/children` | 5 | None | **PO-11** |
| 31 | GET | `/process/{p}/entity/{entityName}` | 1 | None | **PO-12** |
| 32 | GET | `/calendar` (list) | 2 | None | **PO-13** |
| 33 | POST | `/supplyChainAction` | 1 | None | **PO-16** |
| 34 | GET | `/supplyChainAction/{id}` | 2 | None | **PO-17** |
| 35 | PUT | `/supplyChainAction/{id}` | 1 | None | **PO-18** |
| 36 | POST | `/process/{p}/actionitem/search` | 7 | None | See [AI-08](03-ActionItems-PSR-Gap-Plan.md) |
| 37 | POST | `/process/{p}/subprocess/{sp}/actionitem/search` | 7 | None | See [AI-09](03-ActionItems-PSR-Gap-Plan.md) |

> Most PO samplers in PSR have **no assertions**. The exceptions are the phase-1 additions: context, scope, calendar and SCA. A PSR run can show these routes as "passing" while they return errors. The Playwright contract checks below catch that.

## 5. Repository usage matrix for the gap APIs

Legend: **O** owns (implements) the route. **UI** calls it from browser code. **S2S** calls it service to service. **-** means no usage was found in non-test source. `plan-sop-po-be-commons` supplies shared auth, logging and Gravitee routing to every service and calls none of these routes, so it has no column.

| ID | Route | PO service | lui | planning-mfe | Action Item | Link Mgmt | UI Fields |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PO-01 | GET `/tenant` | O | UI | UI | - | - | - |
| PO-02 | POST `/tenant/onboard` | O | - (see note) | - | S2S target (PO calls AI `GET /tenant`) | S2S target (PO calls LM `GET /tenant`) | - |
| PO-03 | POST `/process/search` | O | UI | UI | - | - | - |
| PO-04 | GET `/process/{p}/context` | O | UI (summary) | UI (`all=true`) | - | - | - |
| PO-05 | GET `/process/{p}/scope` | O | UI | UI | - | - | - |
| PO-06 | PUT `/process/{p}/scope` | O | UI | - | - | - | - |
| PO-07 | GET `/process/{p}/users` | O | UI | UI | - | - | - |
| PO-08 | GET `/process/{p}/processGantt` | O | UI | - | - | - | - |
| PO-09 | GET `/process/{p}/kpi` | O (fans out to AI) | UI | - | S2S target (`POST /kpi/entities`) | - | - |
| PO-10 | GET `/process/{p}/subprocess/{sp}/kpi` | O (fans out to AI) | UI | - | S2S target (`POST /kpi/entities`) | - | - |
| PO-11 | GET `/process/{p}/subprocess/{sp}/children` | O | UI | - | - | - | - |
| PO-12 | GET `/process/{p}/entity/{entityName}` | O | UI | - | - | - | - |
| PO-13 | GET `/calendar` | O | UI | - | - | - | - |
| PO-14 | GET `/calendar/{c}/cycle` | O | UI | - | - | - | - |
| PO-15 | GET `/supplyChainAction` | O | UI | UI | - | - | - |
| PO-16 | POST `/supplyChainAction` | O | - | - | - | - | - |
| PO-17 | GET `/supplyChainAction/{id}` | O | - | UI | - | - | - |
| PO-18 | PUT `/supplyChainAction/{id}` | O | - | - | - | - | - |
| PO-19 | DELETE `/supplyChainAction/{id}` | O | - | - | - | - | - |

Note on PO-02: lui `src/reducers/user_data.ts:18` (`onboardUser`, dispatched from `App.tsx:455`) now only decodes the JWT and no longer calls `POST /tenant/onboard`. planning-mfe has only an i18n key (`plan.sop.ps.api.error.onboardUser`). **No current UI source calls this route.** PSR still sends it in 5 parallel controllers. See recommendation R2.

## 6. Gap API contracts

### Shared conventions

| Aspect | Value |
| --- | --- |
| Base URL | `${API_BASE_URL}` plus the PO prefix. Reuse `process.env.PO_JOB_STATUS_BASE` from [configs/setup.js](../../../configs/setup.js) (`cbp/<env>/ibp/process-orchestration/v1` in OLD mode, `po/api/v1` or `qa/po/api/v1` in NEW mode). `GET_PROCESS_WITH_NAME`, `CALENDAR`, `GET_SUPPLY_CHAIN_ACTIONS` and `DELETE_SUPPLY_CHAIN_ACTION` already exist. |
| PSR equivalent | `https://${API_HOST}/cbp/psr/ibp/process-orchestration/v1/...` |
| Auth | `Authorization: Bearer <token>` from `ApiUtil.getBearerToken()`. A missing or invalid token returns `401` at the gateway or security filter. |
| RBAC | `@PreAuthorize("@ibp.hasAction('PROCESS.'+name, {VIEW/EDIT})")` on most `/process/{p}/**` reads and writes, and `CALENDAR:{VIEW/CREATE/EDIT/DELETE}` on calendars. Routes **without** RBAC are flagged per API. |
| Unknown process | On RBAC-guarded routes the RBAC check fails before the handler runs, so the status is `400`, `401` or `404`, not a clean `404`. Existing ProcessBatch Test_005 TC13 accepts `[400, 401, 404]`. Pin the actual value after the first green run. |
| Error body | The shared `ApiError` JSON. Assert `message` (and `code`, for example `IBP_PO_40_2082`, where shown). PO error codes: 2002 PROCESS_NOT_FOUND (404), 2003 NODE_NOT_FOUND (404), 2004 CALENDAR_NOT_FOUND (404), 2016 INVALID_JSON (400), 2018 UNHANDLED_EXCEPTION (500), 2020 CALENDAR_NAME_ALREADY_EXISTS (409), 2031 PAGE_OFFSET_INVALID (500), 2082 BAD_REQUEST_SERVICE_ERROR (400), 2098 CAUGHT_EXCEPTION (500), 3000 DB_SERVICE_ERROR (500). |
| Response header | Some routes set `endpoint: <route template>`, noted per API. Asserting it proves the request reached the intended handler, for example the v2 controller. |

### PO-01 GET `/tenant` (P2)

| Item | Detail |
| --- | --- |
| Handler | `v2/refactor/tenant/TenantControllerV2.java:58` → `TenantServiceV2.getTenantDetails(tenantId)`. The v1 mapping in `TenantController.java:246` is commented out. |
| Auth / RBAC | Bearer only. No `@PreAuthorize`. |
| Request | No parameters. The tenant comes from the token. |
| Response 200 | `TenantResponseDto` (`@JsonInclude(NON_NULL)`), with header `endpoint: /tenant` |
| Errors | `401` without a token. An unknown tenant row returns **200 with an empty body** (the service returns `null`). |
| PSR samplers | POListingPage1, PO To PS 4, PS To PO 4, Subprocess To PS 5, PS To Subprocess 12, AI To PS 4. None has an assertion. |
| Used by | lui `src/reducers/app_selections.ts:69` (`getRealmLevelDetails`, which reads `namespace`, `galleryId`, `verticalFilterInstance`, `id`). planning-mfe `src/reducers/app_selections.ts:355` and `:399` (`config.tenantDetails`). |

```jsonc
// 200 OK (fields are omitted when null)
{
  "id": "<tenant id>",
  "namespace": "<solution-area namespace>",
  "galleryId": "<gallery id>",
  "verticalFilterInstance": "<vf instance>",
  "notificationSource": "<source>",
  "isActive": true,
  "isDeleted": false,
  "onboardStatus": { "<taskName>": true },
  "reportTeam": "<team>",
  "createdOn": "...", "createdBy": "...", "updatedOn": "...", "updatedBy": "..."
}
```

### PO-02 POST `/tenant/onboard` (P3, guarded)

| Item | Detail |
| --- | --- |
| Handler | `rest/controller/TenantController.java:440` → `OnboardingService.onboardUser(false)` |
| Auth / RBAC | Bearer only. No `@PreAuthorize`. |
| Request | No body (PSR sends none). |
| Response 200 | `{ "statusApi": "/tenant/onboard/status" }`. The source has a TODO to change this to 202. |
| Side effects | Submits **asynchronous** onboarding tasks: tenant, vertical filter, namespace, LIAM roles, calendar then process, procedure then SCA (copies global SCAs), action item (calls AI `GET /tenant`), link service (calls LM `GET /tenant`), assumption type, intelligent insight, RAAS, and notification source then custom actions. Each task checks the `onboardStatus` flags, so a fully onboarded tenant should be a no-op. |
| Follow-up | `GET /tenant/onboard/status` returns `Map<String, Boolean>`. |
| PSR samplers | PO To PS 3, PS To PO 3, Subprocess To PS 4, PS To Subprocess 11, AI To PS 3. None has an assertion. |
| Used by | No current UI caller (see the note in section 5). The only callers are the S2S fan-out targets in AI and LM. |

### PO-03 POST `/process/search` (P1)

| Item | Detail |
| --- | --- |
| Handler | `ProcessController.java:311` → `ProcessService.searchProcesses` → `ProcessDynamicRepository.searchProcesses` |
| Auth / RBAC | No `@PreAuthorize`. Rows are **filtered by RBAC**: only processes for which the caller has `PROCESS:VIEW` are returned (`getFilterIds` → `rbacService.getAuthorizedEntityIds`). |
| Request body | `ProcessSearchRequestDto`: `filters` (**@NotNull** map), `sort` (`[{columnName, direction ASC|DESC, sequence}]`, **ignored**: the repository always sorts by `n.created_on DESC`), `pageNumber` (default 0), `pageSize` (default 20). |
| Filter keys | `status` maps to the node status, `calendarName` and `cycleName` match on name (keys are case-insensitive), and **any other key** is treated as a custom process attribute name. A scalar value matches with `=`. An array, or a string containing commas, matches with `IN (...)`. |
| Response 200 | `{ "data": [ ... ], "pager": { "pageNumber", "pageSize", "numberOfElements", "totalElements", "totalPages" } }` with header `endpoint: /process/search` |
| Row fields | `id, name, description, displayName, startTransitionType, endTransitionType, sequence, startApi, endApi, statusCallbackApi, actionItemEntityId, linkEntityId, isActive, namespaceId, galleryId, templateId, updatedOn, createdBy, updatedBy, reportFolderId?, calendarName, calendarDescription, cycleName, cycleDescription, status, startDate, endDate, actualStartDate, actualEndDate, createdOn, attributes?, progress` |
| Errors | Missing `filters` or a missing body returns `400`. Malformed JSON returns `400`. **pageSize ≤ 0** throws 2082 (400), but the generic `catch (Exception)` in `searchProcesses` rewraps it as **2018 (500)**. **pageNumber < 0** throws 2031 (500), also rewrapped as 2018. |
| PSR samplers (9) | POListingPage3, Load Process With Page Size 5/10/20 (5 is sent twice), Next Page with Page Size 5/10/20, and PO Attribute Search (`filters: {"status": "NOT_STARTED"}`). None has an assertion. |
| Used by | lui `src/Components/ProcessOrchestration/ListProcesses/ListProcess.tsx:250` (PO listing), `src/hooks/ContextSwitcher/useContextSwitcher.tsx:38`, `src/reducers/view_mapping.ts:27`. planning-mfe `src/reducers/all_process_data.ts:28`, `src/hooks/ContextSwitcher/useContextSwitcher.tsx:57`. |

```jsonc
// Request (PSR "PO Attribute Search")
{ "pageNumber": 0, "pageSize": 10, "filters": { "status": "NOT_STARTED" } }
```

### PO-04 GET `/process/{p}/context` (P1, currently Indirect)

| Item | Detail |
| --- | --- |
| Handler | `ProcessController.java:490` → `ProcessService.getProcessContext(name, all)` |
| Auth / RBAC | `PROCESS.{p}:VIEW` |
| Request | Query `all` (Boolean, default `false`). planning-mfe sends `all=true`, lui sends no parameter. |
| Response 200, `all=true` | Every key from `getProcessDetails` (the same data as `GET /process/{p}`, including `actionItemEntityId`, `linkEntityId`, `templateId`), plus `scope` (the same map as PO-05), plus `processStartDate` and `processEndDate` when `cycleStartDate` exists |
| Response 200, summary | Exactly these 16 keys, which can be `null`: `id, name, description, displayName, isActive, calendarName, cycleName, status, startDate, endDate, actualStartDate, actualEndDate, attributes, progress, planStartDate, variant`. Plus `scope`, plus `processStartDate` and `processEndDate`. |
| Horizon rule | `processStartDate = cycleStartDate - scope.horizon.pastDays` and `processEndDate = cycleStartDate + scope.horizon.futureDays`. If `horizon` is missing or empty, both default to **30**. |
| Errors | Unknown process: the RBAC result (`400`, `401` or `404`). A process with no stored scope: `readValue(null)` throws `IllegalArgumentException`. |
| PSR samplers (5) | POContext1 (`all=true`, asserts `$.name` and `$.scope`), POContext2 (summary, asserts `$.scope` and `$.calendarName`), and PO To PS 11, Subprocess To PS 14, AI To PS 11 (`all=true`, assert `$.scope`) |
| Used by | planning-mfe `src/reducers/all_process_data.ts:93` (`all: true` at `:109`). `src/apis/apis.ts:54` treats a failed `/context` call as a fatal page error. lui `src/reducers/process_details.ts:61` (summary). |

### PO-05 GET `/process/{p}/scope` (P1)

| Item | Detail |
| --- | --- |
| Handler | `ProcessController.java:229` → `ProcessService.getScope` reads the stored JSON and deserialises it to a map |
| Auth / RBAC | `PROCESS.{p}:VIEW` |
| Response 200 | A free-form JSON object. `dimensions` (array) and `horizon` (object) are **optional**: the PSR `IntegratedBusinessPlanning` scope has neither. |
| Errors | Unknown process: the RBAC result. Stored scope `null`: `IllegalArgumentException`. |
| PSR samplers | POScope1 and POScope3. A JSR223 assertion checks the body is a JSON object, and POScope3 deep-compares it with POScope1. |
| Used by | lui `src/reducers/process_details.ts:167` (reads `dimensions`, which can be null, and `horizon`, default `{}`). planning-mfe `src/reducers/planning_scope_details.ts:28`. |

### PO-06 PUT `/process/{p}/scope` (P1, writes shared state)

| Item | Detail |
| --- | --- |
| Handler | `ProcessController.java:240` → `ProcessService.updateScope` writes the **whole body** as the new scope JSON and writes **one audit row per call** (`auditLogService.doAuditLogOnProcessScopeUpdate`) |
| Auth / RBAC | `PROCESS.{p}:EDIT` |
| Request body | Any JSON object (`Map<String,Object>`). There is no validation. A partial body replaces the whole scope. |
| Response 200 | Plain text `Scope updated successfully` |
| Errors | A non-object body (array or empty) returns `400`. Any persistence error returns 2098 (500). |
| PSR samplers | POScope2 sends back exactly what POScope1 returned, so the call changes nothing. |
| Used by | lui `src/reducers/process_details.ts:220` (Settings → Process Scope). |

### PO-07 GET `/process/{p}/users` (P2)

| Item | Detail |
| --- | --- |
| Handler | `ProcessController.java:321` → `rbacService.getAllUsersByResource("PROCESS", name)` |
| Auth / RBAC | **No `@PreAuthorize`.** Any authenticated caller can list the users of any process. |
| Response 200 | An array of `UsersDto` from the shared RBAC library (`id` plus name and e-mail fields), with header `endpoint: /process/{processName}/users` |
| Errors | An RBAC lookup failure is rethrown as UNAUTHORIZED. Any other failure returns 2098 (500). |
| PSR samplers (7) | PO Details Page 6, Subprocess Details Page 5, AI 2, AI 3 - Subprocess, PS To PO 7, PS To Subprocess 5, PS To AI 2 |
| Used by | lui `src/reducers/process_users.ts:20`. planning-mfe `src/reducers/process_users.ts:22`. Both use it for assignee pickers. |

### PO-08 GET `/process/{p}/processGantt` (P2)

| Item | Detail |
| --- | --- |
| Handler | `ProcessController.java:461` → `NodeService.getProcessGantt` (stored procedure that returns JSON) |
| Auth / RBAC | `PROCESS.{p}:VIEW` |
| Response 200 | An array of Gantt rows. lui reads `id`, `originalName` and `dependency.{reference, referenceNodeNames[]}`. Every `referenceNodeNames` entry must match the `originalName` of another row (`transformGanttData`). |
| Quirk | A JSON parse error from the procedure is **swallowed** and the route returns `200 []`. |
| PSR samplers | PO Details Page 4, PS To PO 10 |
| Used by | lui `src/reducers/process_details.ts:195` → `GanttChart.tsx` |

### PO-09 GET `/process/{p}/kpi` (P2)

| Item | Detail |
| --- | --- |
| Handler | `KpiController.java:46` → `KpiService.getKPIForProcess`. This calls AI `POST /kpi/entities` with `origin=<processId>`, then appends the assumption-service KPIs. |
| Auth / RBAC | No `@PreAuthorize` |
| Request | Optional `objectType` (array). It is **ignored**: the controller only supplies defaults when it is absent, and the service never reads it. |
| Response 200 | An array of `AttributeDto` `{ id, name, title, displayValue, value, isEnabled, isActive, createdOn, ... }` |
| Quirk | The service **catches every exception** and returns the list built so far. An unknown process returns **`200 []`**. If AI or the assumption service is down, the list is partial and still returns 200. |
| PSR samplers | PO Details Page 7, PS To PO 8 |
| Used by | lui `src/reducers/mutli_kpi_card_data.ts:49` (KPI cards on Process Details) |

### PO-10 GET `/process/{p}/subprocess/{sp}/kpi` (P2)

| Item | Detail |
| --- | --- |
| Handler | `KpiController.java:75` → `KpiService.getKPIForNode`. This uses the node's `actionItemEntityId` and its descendants' entity ids, then calls AI `POST /kpi/entities` and appends the assumption KPIs. |
| Auth / RBAC | No `@PreAuthorize` |
| Response 200 | Same shape as PO-09 |
| Errors | **No try/catch**, unlike PO-09. An unknown subprocess fails, with NODE_NOT_FOUND (404) or an NPE (500). Record which. |
| PSR samplers | Subprocess Details Page 7, PS To Subprocess 7 (note: PSR calls `IntegratedBusinessPlanning/subprocess/subprocess1`) |
| Used by | lui `src/reducers/mutli_kpi_card_data.ts:81` |

### PO-11 GET `/process/{p}/subprocess/{sp}/children` (P2)

| Item | Detail |
| --- | --- |
| Handler | `NodeController.java:104` → `NodeService.getChildNodes` (stored procedure) |
| Auth / RBAC | **No `@PreAuthorize`.** The process-level `/children` route requires `PROCESS:VIEW`. |
| Request | `pageNumber` (default 0, negative values become 0), `pageSize` (default 20, values ≤ 0 become 20). Sort is `created_on DESC`. |
| Response 200 | `{ "data": [ <child nodes> ], "pager": { ..., "totalPages" } }`, the same shape as the covered process `/children` |
| PSR samplers (5) | Subprocess Details Page 8, Subprocess children With Page Size 5/10/20, PS To Subprocess 8 (`PSR1/subprocess/subprocess1`) |
| Used by | lui `src/Components/ProcessOrchestration/ViewProcess/ProcessDetails.tsx:389` (`getPhaseTableData`, used when `nodeLevel === 1`) |

### PO-12 GET `/process/{p}/entity/{entityName}` (P2)

| Item | Detail |
| --- | --- |
| Handler | `ProcessController.java:532` → `ProcessService.getEntityLimits`. This resolves the process template id, then merges the template quota limits for the entity type. |
| Auth / RBAC | No `@PreAuthorize`. Because RBAC does not run first, an unknown process gives a **clean PROCESS_NOT_FOUND 404 (2002)**. |
| Response 200 | `{ "entityLimits": [ { "operationtype": "...", "limit": <number>, "enforcementtype": "..." } ] }` |
| PSR samplers | PO Details Page 10 (`entity/ACTION_ITEM`) |
| Used by | lui `src/reducers/app_selections.ts:203` (`setProcessTemplateDetails`, dispatched from `Components/Common/SideNav/SideNavTabPanel.tsx:266`). lui spreads `entityLimits`, so **a missing array breaks the UI**. |

### PO-13 GET `/calendar` (P2)

| Item | Detail |
| --- | --- |
| Handler | `CalendarController.java:128` → `getCalendarsByPage` |
| Auth / RBAC | `CALENDAR:VIEW` |
| Request | `pageNumber` (default 0), `pageSize` (default **5**). Sort is `createdOn DESC`. |
| Response 200 | `{ "data": [ { "name", "description" } ], "pager": { "pageNumber", "pageSize", "numberOfElements", "totalElements", "totalPages" } }` |
| Errors | `pageSize=0` or `pageNumber<0` make `PageRequest.of` throw `IllegalArgumentException`. |
| PSR samplers | Calendar1 (asserts `$.data` and `$.pager`), and Cleanup1 in tearDown (`pageSize=500`) |
| Used by | lui `src/Components/CalendarManager/index.tsx:123` (Calendar Manager grid) |

### PO-14 GET `/calendar/{c}/cycle` (P2, currently Partial)

| Item | Detail |
| --- | --- |
| Handler | `CalendarController.java:238` → `getCyclesForCalendarByPage` |
| Auth / RBAC | `CALENDAR:VIEW` |
| Request | `pageNumber` (default 0), `pageSize` (default 5). Sort is **`startDate ASC`**. |
| Response 200 | `{ "data": [ { "id": <int>, "name", "startDate", "endDate", "description" } ], "pager": {...} }` |
| Unknown calendar | **200 with an empty page**, not 404. The query is a JPQL join on the calendar name. |
| PSR samplers | CalendarCycle1 (Assumptions page; asserts `$.data` and `$.pager`), CalendarCycle4 (asserts `$.pager.totalElements` = 2) |
| Used by | lui `src/reducers/calendarCycle.ts:80` (Assumptions pages find the current cycle by name) and `src/Components/CalendarManager/calendarDetails.tsx:148` |

### PO-15 GET `/supplyChainAction` (P2, currently Partial)

| Item | Detail |
| --- | --- |
| Handler | `v2/refactor/supplychainaction/SupplyChainActionControllerV2.java:54`. The v1 list mapping is commented out. |
| Auth / RBAC | No `@PreAuthorize` |
| Response 200 | An array of `SupplyChainActionDto` `{ id, name, type, description, procedureName, uiConfig, isActive, isEnabled, createdOn, createdBy, updatedOn, updatedBy }`, with header `endpoint: /supplyChainAction` |
| PSR samplers (5) | PO To PS 6, Subprocess To PS 12, AI To PS 6, SCA0 (asserts `$[0].id`), Cleanup3 |
| Used by | planning-mfe `src/reducers/actions_procedure_config.ts:326` (runs `JSON.parse(uiConfig)`). lui `src/reducers/actions_procedure_config.ts:18` (spreads `response.data`, so it **must be an array**). |

### PO-16 to PO-19: Supply chain action CRUD (P2/P3)

| Route | Handler | Request | Response |
| --- | --- | --- | --- |
| POST `/supplyChainAction` (PO-16) | `SupplyChainActionController.java:121` | The `SupplyChainAction` entity: `name`, `type`, `description`, `procedureName`, `uiConfig`. The server **overrides** `id` (generated), `tenantId` (from the token) and `isActive`/`isEnabled` (both `true`). If `uiConfig` is `null` it is stored as `""`. | `201` with the entity (**includes `tenantId`**) |
| GET `/supplyChainAction/{id}` (PO-17) | `:86` | Path `id` | `200` DTO, or **`404` with no body** |
| PUT `/supplyChainAction/{id}` (PO-18) | `:153` | The full entity. **This is a full replace, not a patch.** `isActive`/`isEnabled` are forced to `true` and a `null` `uiConfig` becomes `""`. | `200` with the entity. An unknown id raises `EntityNotFoundException`. |
| DELETE `/supplyChainAction/{id}` (PO-19) | `:190` | Path `id` | `200` text `Supply Chain Action with id [<id>] deleted successfully.` An unknown id raises `EntityNotFoundException`. |

- **Auth / RBAC:** none of the four routes has `@PreAuthorize`.
- **Constraints:** `(tenant_id, name)` is unique. `name`, `procedure_name` and `ui_config` are NOT NULL. `description` is nullable in Liquibase although the entity says otherwise (see the [PO phase-1 plan](../../../../jmeter/plans/PSRGatewayTest-PO-Phase1-Plan.md)). There is no bean validation, so a missing field fails at the database.
- **Isolation:** every read and write uses `findByIdAndTenantId`.
- **PSR samplers:** SCA1 to SCA5 (all asserted), and Cleanup4.
- **Used by:** planning-mfe `src/reducers/actions_procedure_config.ts:345` (GET by id). **No UI caller** for POST, PUT or DELETE. PO onboarding `OnboardSCA` copies the global SCAs into a new tenant.

```jsonc
// POST /supplyChainAction (copy "type" from an existing SCA; fall back to "CHANGE_MEASURE")
{ "name": "PWAutoSCA_<runId>", "type": "<type>", "description": "Playwright SCA",
  "procedureName": "PWAutoProcedure", "uiConfig": "{}" }
```

## 7. Test cases

Type: **P** positive, **N** negative, **E** edge. Every write test uses data the test created and cleans it up in `afterAll`.

### PO-01 GET /tenant (8)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| PO-01-P01 | P | GET with a valid token | `200`. `id`, `namespace`, `galleryId`, `verticalFilterInstance` are non-empty strings (the 4 fields lui reads). `isActive` is `true`. Header `endpoint` is `/tenant`. |
| PO-01-P02 | P | Check `onboardStatus` | If present, an object whose values are all booleans. For an onboarded realm every value is `true`. |
| PO-01-P03 | P | Two calls in a row | Identical bodies |
| PO-01-N01 | N | No `Authorization` header | `"401"` |
| PO-01-N02 | N | Malformed or expired token | `"401"` |
| PO-01-E01 | E | NON_NULL serialisation | No key has a `null` value. Absent fields are omitted. |
| PO-01-E02 | E | Tenant identity | `id` matches the realm the token was issued for (`REALM_ID` on Azure). Record the mapping on the first run. |
| PO-01-E03 | E | Gateway parity | Run on `GATEWAY_TYPE=AZURE` and `GRAVITEE`. Same shape. |

### PO-02 POST /tenant/onboard (6). Run only when `RUN_TENANT_ONBOARD=true`

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| PO-02-P01 | P | POST with no body on an onboarded realm | `200` `{ "statusApi": "/tenant/onboard/status" }` |
| PO-02-P02 | P | Poll `GET /tenant/onboard/status` | `200` map of booleans. Every flag is `true` for an onboarded realm. Use `expect.poll`, because the tasks are asynchronous. |
| PO-02-E01 | E | Idempotency: count `GET /supplyChainAction` and `GET /calendar` before, POST twice, count again | Counts unchanged, so no duplicate global SCAs or default calendars |
| PO-02-E02 | E | `GET /tenant` after onboarding | `onboardStatus` matches `GET /tenant/onboard/status` |
| PO-02-N01 | N | No token | `"401"` |
| PO-02-N02 | N | `GET` on `/tenant/onboard` (wrong method) | `"405"` (or `"404"`, depending on the gateway) |

### PO-03 POST /process/search (17)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| PO-03-P01 | P | `{pageNumber:0,pageSize:10,filters:{}}` | `200`. `data.length` ≤ 10. `pager.pageNumber` is 0, `pager.pageSize` 10, `pager.numberOfElements` equals `data.length`, and `totalElements` ≥ `data.length`. Header `endpoint` is `/process/search`. |
| PO-03-P02 | P | Row contract | Every row has string `id`, `name`, `displayName`, `status`, `calendarName`, `cycleName`, `actionItemEntityId`, `linkEntityId`, plus `isActive === true`, a numeric `progress` and `createdOn`. |
| PO-03-P03 | P | PSR page sizes 5, 10 and 20 | `data.length` ≤ pageSize and `pager.pageSize` matches each time |
| PO-03-P04 | P | Page 0 then page 1, `pageSize=5` | The ids are disjoint. The union has `min(10, totalElements)` items. |
| PO-03-P05 | P | `filters:{status:"NOT_STARTED"}` (PSR "PO Attribute Search") | `200`. Every row has `status === "NOT_STARTED"`, the raw node status. |
| PO-03-P06 | P | `filters:{calendarName:"<seed calendar>"}` | Every row has that `calendarName` |
| PO-03-P07 | P | `filters:{status:["NOT_STARTED","IN_PROGRESS"]}` and the comma string `"NOT_STARTED,IN_PROGRESS"` | Both apply IN semantics and return the same row set |
| PO-03-P08 | P | Custom-attribute filter: add attribute `PWAttr=<run>` with the ProcessBatch Test_002 pattern, then `filters:{PWAttr:"<run>"}` | Only the attributed process is returned (poll for eventual consistency) |
| PO-03-P09 | P | A process created in `beforeAll` | It appears on page 0, because sorting is `created_on DESC` |
| PO-03-N01 | N | `filters` missing | `"400"` (`@NotNull`) |
| PO-03-N02 | N | No body, and separately malformed JSON | `"400"` |
| PO-03-N03 | N | No token | `"401"` |
| PO-03-E01 | E | `pageSize: 0` | Source throws 2082 (400) but the error is **rewrapped as 2018 (500)**. Assert the actual status and raise defect D1 if it is 500. |
| PO-03-E02 | E | `pageNumber: -1` | Same as E01 (2031 rewrapped). Expect `"500"`. Defect D1. |
| PO-03-E03 | E | `filters:{status:[]}` (empty array) | Source emits `AND ns.status` with no operand, which is invalid SQL, so expect 5xx. Defect D3. The correct behaviour is to ignore the filter or return 400. |
| PO-03-E04 | E | Total exactly divisible by pageSize, for example 10 items and pageSize 5 | `totalPages` = `totalElements/pageSize + 1`, which gives 3 instead of 2. Assert `totalPages === ceil(total/size)` and file defect D2 if not. |
| PO-03-E05 | E | `pageNumber` past the last page | `200`, `data: []`. Source derives `totalElements` from the returned rows, so it reports **0** and `totalPages` 1. Record this. Defect D2. Also cover: an unknown filter key `{foo:"bar"}` is treated as a custom attribute, so expect `200 data: []`. A `sort` array has no effect on order (always `created_on DESC`). |

### PO-04 GET /process/{p}/context (12)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| PO-04-P01 | P | `?all=true` on the seeded process | `200`. `name === p`. `scope` is an object. `actionItemEntityId`, `linkEntityId`, `calendarName`, `cycleName`, `id`, `displayName` are present. |
| PO-04-P02 | P | No `all` parameter (lui) | `200`. The 16 whitelisted keys are all present (values may be null). `scope` is present. `actionItemEntityId` and `templateId` are **absent**. |
| PO-04-P03 | P | `?all=false` | Identical to P02 |
| PO-04-P04 | P | Compare with `GET /process/{p}` | Every non-scope key in the `all=true` response equals the process GET |
| PO-04-P05 | P | Compare `scope` with `GET /process/{p}/scope` | Deep-equal |
| PO-04-P06 | P | Dedicated process with horizon `{pastDays:"10",futureDays:"20"}` (set through PO-06) | `processEndDate - processStartDate` = 30 days, anchored on `cycleStartDate` |
| PO-04-P07 | P | Dedicated process with scope `{}` | Defaults apply: the window is 60 days |
| PO-04-N01 | N | Unknown process | `"400"`, `"401"` or `"404"`, the same allowed set as Test_005 TC13. Pin it on the first run. |
| PO-04-N02 | N | No token | `"401"` |
| PO-04-N03 | N | `?all=notABoolean` | `"400"` (type mismatch) |
| PO-04-E01 | E | Process name in a different letter case | Record whether it resolves (SQL Server collation) |
| PO-04-E02 | E | Response-time budget, because it is called on every PS load | Soft check: under `getTimeout('SHORT')`. Log, do not fail. |

### PO-05 GET /process/{p}/scope (6)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| PO-05-P01 | P | Seeded process | `200` and the body is a JSON object, which may be `{}` |
| PO-05-P02 | P | If present: `dimensions` | It is an array |
| PO-05-P03 | P | If present: `horizon` | It is an object, and `pastDays`/`futureDays` are numeric strings |
| PO-05-N01 | N | Unknown process | RBAC result (`"400"`, `"401"` or `"404"`) |
| PO-05-N02 | N | No token | `"401"` |
| PO-05-E01 | E | A newly created process (template) before any PUT | Record whether the stored scope is `{}` or null. If null, `IllegalArgumentException` is a defect (D10). |

### PO-06 PUT /process/{p}/scope (12). Dedicated process only, serial

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| PO-06-P01 | P | PUT the full scope `{dimensions:[...], horizon:{pastDays:"10",futureDays:"20"}}` | `200` text `Scope updated successfully`. GET deep-equals the body. |
| PO-06-P02 | P | PUT back exactly what GET returned (the PSR round trip) | `200`. The following GET is unchanged. |
| PO-06-P03 | P | PUT `{}` | `200`. GET returns `{}`. The context horizon falls back to 30/30 (PO-04-P07). |
| PO-06-P04 | P | Context reflects the update | `GET /context` `scope` equals the new body |
| PO-06-N01 | N | JSON array body `[]` | `"400"` |
| PO-06-N02 | N | Empty body | `"400"` |
| PO-06-N03 | N | No token | `"401"` |
| PO-06-N04 | N | Unknown process | RBAC rejects (`"400"`, `"401"` or `"404"`). If it returns `200`, that is a defect: no row is updated but an audit row is written. |
| PO-06-E01 | E | Partial body `{horizon:{...}}` after a full scope | Full replace: GET has **no** `dimensions` |
| PO-06-E02 | E | Large scope, for example 200 dimension values | `200`. The round trip is intact. |
| PO-06-E03 | E | Unicode and special characters in values (`ü`, `"`, `&`) | The round trip is byte-identical |
| PO-06-E04 | E | Concurrency: two PUTs in parallel with different bodies | The final GET equals one of them (last write wins). Document that there is no optimistic locking. |

### PO-07 GET /process/{p}/users (6)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| PO-07-P01 | P | Seeded process | `200` array. Each element has a string `id`. Header `endpoint` is `/process/{processName}/users`. |
| PO-07-P02 | P | Dedicated process after a role is assigned (reuse the Test_005 role/assign flow) | The assigned user's id is in the list |
| PO-07-N01 | N | No token | `"401"` |
| PO-07-E01 | E | Unknown process | Record the result: `200 []` or UNAUTHORIZED |
| PO-07-E02 | E | Restricted user token (`util/user-token.util.ts`) | The route has no `@PreAuthorize`, so it is expected to return `200`. Flag it to the security team if the user has no access to the process (D8). |
| PO-07-E03 | E | No duplicate user ids in the array | Pass |

### PO-08 GET /process/{p}/processGantt (6)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| PO-08-P01 | P | Seeded process with subprocesses | `200` non-empty array. Each row has `id` and `originalName`. |
| PO-08-P02 | P | Referential integrity | Every `dependency.referenceNodeNames[i]` equals some row's `originalName` |
| PO-08-P03 | P | Consistency with `/children` | Every subprocess `name` from `GET /process/{p}/children` appears as an `originalName` |
| PO-08-N01 | N | Unknown process | RBAC result |
| PO-08-N02 | N | No token | `"401"` |
| PO-08-E01 | E | `200 []` for a process whose `/children` is non-empty | Fail with "procedure error swallowed" (D9) |

### PO-09 and PO-10 KPI reads (11)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| PO-09-P01 | P | Process KPIs | `200` array. Each item has `name`, `title`, `value` (string), `isActive` and `isEnabled` (booleans). |
| PO-09-P02 | P | Create an action item on the process (ActionItem Test_001 flow), then read the KPI again | If an AI KPI configuration is mapped, its `value` increases by 1. Skip with an annotation when no configuration is mapped. |
| PO-09-P03 | P | `?objectType=0` | Response equal to the call with no parameter (the parameter is ignored, D5) |
| PO-09-N01 | N | No token | `"401"` |
| PO-09-E01 | E | Unknown process | **`200 []`**, because the service swallows errors (D4). Assert it as the current contract and link the defect. |
| PO-10-P01 | P | Subprocess KPIs (`SupplyReview`) | `200` array with the same item shape |
| PO-10-P02 | P | Subprocess vs process | Count-type KPI values on the subprocess are ≤ the process values for the same `name` |
| PO-10-N01 | N | Unknown subprocess | An error status. Record `404` (2003) or `500` (NPE). If 500, that is defect D4b. |
| PO-10-N02 | N | Unknown process | An error status |
| PO-10-N03 | N | No token | `"401"` |
| PO-10-E01 | E | A PSR sampler mixes process and subprocess (`IntegratedBusinessPlanning/subprocess/subprocess1`) | Record the behaviour. This is a data issue in PSR (section 11). |

### PO-11 GET /process/{p}/subprocess/{sp}/children (9)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| PO-11-P01 | P | A dedicated level-1 subprocess with one level-2 child (Test_005 `LEVEL_ONE`/`LEVEL_TWO` pattern) | `200`. `data` contains the child `name`. `pager.totalElements` is 1. |
| PO-11-P02 | P | Page sizes 5, 10 and 20 (PSR parity) | `data.length` ≤ pageSize and `pager.pageSize` matches |
| PO-11-P03 | P | Page through every page | The union size equals `totalElements` with no duplicates |
| PO-11-P04 | P | Leaf subprocess | `200`, `data: []`, `totalElements` 0 |
| PO-11-N01 | N | No token | `"401"` |
| PO-11-E01 | E | `pageSize=0` | Coerced to 20: `pager.pageSize === 20` |
| PO-11-E02 | E | `pageNumber=-1` | Coerced to 0 |
| PO-11-E03 | E | `pageSize=abc` | `"400"` |
| PO-11-E04 | E | Unknown subprocess | Record `200 data:[]` or an error. Then compare with the RBAC behaviour of the process `/children` route (D8). |

### PO-12 GET /process/{p}/entity/{entityName} (6)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| PO-12-P01 | P | `entity/ACTION_ITEM` on the seeded process | `200`. `entityLimits` is an array. Each item has `operationtype` (string), `limit` (number) and `enforcementtype` (string). |
| PO-12-P02 | P | `entity/PROCESS` and `entity/ASSUMPTION` | `200` and `entityLimits` is an array |
| PO-12-N01 | N | Unknown process | `"404"` with code 2002 (no RBAC, so a clean 404) |
| PO-12-N02 | N | No token | `"401"` |
| PO-12-E01 | E | Unknown entity `FOO` | `404` `IBP_PO_40_1020` "Entity of type ENTITY with id FOO does not exist" (observed on INTEROP and QA, both gateways, 2026-10-01). |
| PO-12-E02 | E | Lower-case `action_item` | Record whether the match is case-sensitive |

### PO-13 GET /calendar (9)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| PO-13-P01 | P | Create calendar `PWCalList_<run>` (Calendar Test_001 payload), then `?pageNumber=0&pageSize=10` | `200`. `data` items have `name` and `description`. `pager.pageSize` is 10. |
| PO-13-P02 | P | No parameters | `pager.pageSize === 5` and `pager.pageNumber === 0` (defaults) |
| PO-13-P03 | P | Newly created calendar | It is `data[0]`, because sorting is `createdOn DESC` (poll) |
| PO-13-P04 | P | Page through with `pageSize=50` | The created calendar is found. `totalElements` equals the sum of `numberOfElements`. |
| PO-13-N01 | N | No token | `"401"` |
| PO-13-E01 | E | `pageSize=0` | `IllegalArgumentException`. Record the status (`400` expected). |
| PO-13-E02 | E | `pageNumber=-1` | As E01 |
| PO-13-E03 | E | `pageSize=500` (the PSR tearDown and `process-start.util.ts` use it) | `200` |
| PO-13-E04 | E | After DELETE of the created calendar | It is gone from every page |

### PO-14 GET /calendar/{c}/cycle (8)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| PO-14-P01 | P | Own calendar with 3 cycles | `200`. `pager.totalElements` is 3. Each item has `id` (number), `name`, `startDate`, `endDate`, `description`. |
| PO-14-P02 | P | `pageSize=2` | Page 0 has 2 items and page 1 has 1. `totalPages` is 2. |
| PO-14-P03 | P | Ordering | `startDate` ascending across pages |
| PO-14-P04 | P | No parameters | Default `pageSize` 5 |
| PO-14-N01 | N | No token | `"401"` |
| PO-14-E01 | E | Unknown calendar | **`200`**, `data: []`, `totalElements: 0`, not 404. Record it. |
| PO-14-E02 | E | Calendar name with spaces | Path-encode with `%20` (not `+`). Expect `200`. |
| PO-14-E03 | E | After deleting one cycle | `totalElements` drops by 1 |

### PO-15 to PO-19 Supply chain actions (24)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| PO-15-P01 | P | GET the list | `200` array of at least 1 item. Each has `id`, `name`, `procedureName`, `uiConfig`. Header `endpoint` is `/supplyChainAction`. |
| PO-15-P02 | P | `uiConfig` parses as JSON for every item | `JSON.parse` succeeds. List any item with `""` as a data warning (D6). |
| PO-15-P03 | P | After PO-16 | The new id is in the list |
| PO-15-N01 | N | No token | `"401"` |
| PO-16-P01 | P | POST `{name:"PWAutoSCA_<run>", type, description, procedureName, uiConfig:"{}"}` | `201`. `id` is a UUID. `name` echoes. `isActive` and `isEnabled` are `true`. `tenantId` is the caller's tenant. |
| PO-16-P02 | P | Client sends `id`, `tenantId`, `isActive:false`, `isEnabled:false` | Server overrides them: a new id, the token tenant, and `true`/`true` |
| PO-16-N01 | N | Same `name` again | Unique violation. Record the status (`409` or `500`). |
| PO-16-N02 | N | No `name`; separately no `procedureName` | Database NOT NULL error. Record the status. There is no 400 validation (D7). |
| PO-16-N03 | N | Malformed JSON | `"400"` |
| PO-16-N04 | N | No token | `"401"` |
| PO-16-E01 | E | `uiConfig` omitted | `201` and the stored `uiConfig` is `""`. That breaks planning-mfe `JSON.parse` (D6). |
| PO-16-E02 | E | Name of 300 characters | Column length error. Record the status. |
| PO-17-P01 | P | GET by id after create | `200`. Fields equal the POST. `createdOn` and `createdBy` are present. |
| PO-17-N01 | N | Unknown UUID | `"404"` with an empty body |
| PO-17-N02 | N | Non-UUID id `abc` | `"404"` |
| PO-17-E01 | E | An id from another realm (migration source/target credentials) | `"404"` (tenant isolation) |
| PO-18-P01 | P | PUT the full body with a new `description` | `200`. GET reflects it. `createdOn` is unchanged and `updatedOn` is later. |
| PO-18-P02 | P | PUT with `isActive:false` | Ignored: the response has `isActive === true` |
| PO-18-N01 | N | Unknown id | `EntityNotFoundException`. Record the status (`404` expected). |
| PO-18-N02 | N | Partial body (no `name`) | Full-replace semantics, so the database errors. Record the status. |
| PO-18-N03 | N | Rename to an existing SCA name | Unique violation |
| PO-19-P01 | P | DELETE the created id | `200` text `Supply Chain Action with id [<id>] deleted successfully.`. Then GET returns `"404"` and the id is gone from the list. |
| PO-19-N01 | N | DELETE the same id again | Not found. Record the status (`404` expected). |
| PO-19-N02 | N | No token | `"401"` |

**Total: 140 test cases** across 19 APIs.

## 8. Data dependencies and environment prerequisites

| Dependency | Needed by | INTEROP | QA | PSR | Notes |
| --- | --- | --- | --- | --- | --- |
| Seeded process `IntegratedBusinessPlanning` with subprocesses `InitiativesAndAssumptionsReview`, `DemandReview`, `SupplyReview`, ... | PO-03/04/05/07/08/09/10/12 reads | Yes | Yes | Yes | Read-only. **Never** run PUT scope against it from Playwright. |
| `PSR1/subprocess1` hierarchy | PSR-parity reads | - | - | Gravitee realm `popspsr-psr` only | The JMX hardcodes `PSR1` for some samplers whatever the gateway. |
| Calendar `Monthly Calendar` with at least 1 cycle | Dedicated process from template | Yes | Yes | Verify | Use `getFirstCalendarCycle()` in `util/calendar-cycle.util.ts` |
| Template `BY-Template` | Dedicated process (PO-04/05/06/11) | Yes | Yes | Verify | ProcessBatch Test_005 pattern. Cleanup must remove the process, its IAM roles and its procedures (see `cleanupCreatedResources` in Test_005). |
| Machine-token permissions: `PROCESS:VIEW/EDIT`, `CALENDAR:*` | All | Yes | Yes | Verify | A failure looks like `"401"` or `"403"` on positive tests |
| An AI KPI configuration mapped to the process entity | PO-09-P02 | Optional | Optional | Optional | Skip with `test.info().annotations` when absent |
| Existing SCA `type` | PO-16 | From the GET list | From the GET list | From the GET list | Fall back to `CHANGE_MEASURE` (global seed) |
| `API_BASE_URL`, `AUTH_URL`, `CLIENT_ID`/`SECRET` for PSR | All PSR runs | - | - | **Only set under `GATEWAY_TYPE=GRAVITEE`** | The PSR block of [configs/setup.js](../../../configs/setup.js) does not set the Azure values. Run PSR with Gravitee or put them in `.env`. |
| Restricted user token | PO-07-E02, optional RBAC checks | Via `util/user-token.util.ts` | Via the same util | - | Optional |

Data rules:
- Name everything you create `PW<Area>_<runId>`, where `runId = Date.now()-<rand>`, and delete it in `afterAll` with tolerant cleanup (accept `200` or `404`).
- Right after a write, the Azure gateway sometimes returns `400 IBP_40_1027`. Wrap read-after-write in `expect.poll` (see `requestUntilStatus` in ActionItem Test_001).
- `PUT /process/{p}/scope` writes an audit row on every call. Keep scope writes serial and few.

## 9. Implementation blueprint

| Spec (new) | Covers | Suite | Testdata (`testdata/<ENV>/ProcessOrchestrationBackend/...`) |
| --- | --- | --- | --- |
| `ProcessBatch/Test_006_ProcessSearch.spec.ts` | PO-03 | `POBackendProcessBatch.json`, plus P01–P05 in `POBackendSmokeBatch.json` | `ProcessBatch/Test_006_ProcessSearch.json` (`PROCESS_NAME`, `CALENDAR_NAME`, `STATUS_VALUES`, `PAGE_SIZES`) |
| `ProcessBatch/Test_007_ProcessContextAndScope.spec.ts` | PO-04, PO-05, PO-06 | `POBackendProcessBatch.json` | `ProcessBatch/Test_007_ProcessContextAndScope.json` (template, calendar, `SCOPE_FULL`, `SCOPE_PARTIAL`) |
| `ProcessBatch/Test_008_ProcessDetailsReads.spec.ts` | PO-07 to PO-12 | `POBackendProcessBatch.json`, plus P01s in smoke | `ProcessBatch/Test_008_ProcessDetailsReads.json` (`PROCESS_NAME`, `SUBPROCESS_NAME`, `ENTITY_TYPES`) |
| `ProcessBatch/Test_009_SupplyChainActionCrud.spec.ts` | PO-15 to PO-19 | `POBackendProcessBatch.json` | `ProcessBatch/Test_009_SupplyChainActionCrud.json` (`SCA_NAME_PREFIX`, `PROCEDURE_NAME`, `FALLBACK_TYPE`) |
| `ProcessBatch/Test_010_TenantDetails.spec.ts` | PO-01, PO-02 (guarded) | `POBackendProcessBatch.json` | `ProcessBatch/Test_010_TenantDetails.json` |
| `Calendar/Test_003_CalendarAndCycleListing.spec.ts` | PO-13, PO-14 | `POBackendCalendarBatch.json` | `Calendar/Test_003_CalendarAndCycleListing.json` |

Keeping the new specs in the existing `ProcessBatch/` and `Calendar/` folders avoids a new suite JSON and a CI workflow change. If you prefer a dedicated `SupplyChainAction/` folder, add `POBackendSupplyChainActionBatch.json` and register it in the backend workflows.

Implementation notes:
- Follow [playwright-api.instructions.md](../../../../.github/instructions/playwright-api.instructions.md). `processAPIRequest` returns a **number** status on success and a **string** status on error, so assert `toBe(200)` and `toBe("404")`.
- Use `test.describe.serial`. Get the token once in `beforeAll`. Use timeouts only through `getTimeout(tier)`.
- Factor the Test_005 "create process from template and clean up" logic into a shared helper (for example `util/process-fixture.util.ts`) before copying it a third time. ProcessBatch Test_001, Test_002 and Test_005 already repeat parts of it.
- For error-mapping cases recorded as "record the status", add `test.info().annotations.push({ type: 'contract', description: ... })` on the first run, then pin the value.
- Run `npm run docs:testcases` after adding specs, and run each spec on its own (`--workers=1`) on INTEROP, then QA and PSR.

## 10. Defect candidates found in the source

| ID | Route | Finding | Evidence | Test |
| --- | --- | --- | --- | --- |
| D1 | POST `/process/search` | `pageSize ≤ 0` (2082, 400) and `pageNumber < 0` (2031) are caught by `catch (Exception)` and rethrown as 2018 UNHANDLED (500) | `ProcessService.searchProcesses` | PO-03-E01, E02 |
| D2 | POST `/process/search` | `totalPages = totalElements/pageSize + 1`, which is off by one on exact multiples. `totalElements` is 0 when the page is past the end. | `ProcessDynamicRepository.searchProcesses` / `convertToObject` | PO-03-E04, E05 |
| D3 | POST `/process/search` | An empty-array filter value leaves a dangling `AND ns.status` and produces invalid SQL | `ProcessDynamicRepository.buildFilterClause` | PO-03-E03 |
| D4 | GET `/process/{p}/kpi` | All exceptions are swallowed, so an unknown process returns `200 []` and a partial outage returns a partial list | `KpiService.getKPIForProcess` | PO-09-E01 |
| D4b | GET `.../subprocess/{sp}/kpi` | Error handling differs from the process route: no try/catch | `KpiService.getKPIForNode` | PO-10-N01 |
| D5 | Both KPI routes | The `objectType` parameter is accepted but never used | `KpiController.java:46` and `:75` | PO-09-P03 |
| D6 | POST/PUT `/supplyChainAction` | A `null` `uiConfig` is stored as `""`, which planning-mfe `JSON.parse` cannot handle | `SupplyChainActionService.create/update` | PO-16-E01 |
| D7 | POST/PUT `/supplyChainAction` | No bean validation on the entity, so missing required fields surface as database errors | `SupplyChainAction` entity | PO-16-N02 |
| D8 | GET `/process/{p}/users`, `.../subprocess/{sp}/children`, KPI routes, entity limits | No `@PreAuthorize`, which is inconsistent with the process-level routes | Controllers | PO-07-E02, PO-11-E04 |
| D9 | GET `/process/{p}/processGantt` | A procedure JSON error is swallowed and returns `200 []` | `NodeService.getProcessGantt` | PO-08-E01 |
| D10 | GET `/process/{p}/scope` | `readValue(null)` when no scope is stored | `ProcessService.getScope` | PO-05-E01 |

## 11. Other recommendations

- **R1. Add PSR assertions.** 0 of the 9 `POST /process/search` samplers and 0 of the 7 `/users` samplers assert anything. Mirror the P01 contract checks (status, `$.pager`, `$.data`) into the JMX using the `jmeter-psr-samplers` skill.
- **R2. Review `POST /tenant/onboard` in PSR.** No current UI calls it, yet PSR sends it 5 times per iteration, and each call submits an asynchronous fan-out to AI, LM, assumptions, IIS, RAAS and notifications. Either remove it or throttle it.
- **R3. Fix PSR data mix-ups.** `IntegratedBusinessPlanning/subprocess/subprocess1/kpi` (PSR Subprocess Details Page 7 and PS To Subprocess 7) combines the Azure process with a Gravitee subprocess. `PS To Subprocess 5/6` use `PSR1` inside an IBP flow.
- **R4. Cover lui routes that PSR never calls.** The same UIs call routes that neither PSR nor Playwright touch: `GET /process/{p}/transitionhierarchy`, `/transition-options`, `PUT /process/{p}/calendarcycle/{c}/reschedule` and `GET /process/{p}/subprocess/{sp}/referenceableNodes`. Plan them in a follow-up, using the lui `config.ts` keys `getTransitions`, `getProcessTransitions`, `reschedule` and `referenceableNodes`.
- **R5. Assert the `endpoint` header.** Where it exists (`/tenant`, `/supplyChainAction`, `/process/search`, `/process/{p}/users`, `GET /process/{p}`) it proves the v2 controllers stay wired in.

## 12. Open questions

1. PO-02: may onboarding run in the shared INTEROP and QA realms, or only in a sandbox realm? The default is to skip it unless `RUN_TENANT_ONBOARD=true`.
2. PO-06: which process may scope writes target per environment? The default is a dedicated process created from a template and deleted afterwards.
3. Error-status policy: should defects D1, D3 and D7 be asserted as current behaviour, with the defect linked, or as the desired behaviour (`test.fail()`)? The default is current behaviour plus a linked annotation.

## 13. Related documents

- [PO API contract](../../repositories/plan-sop-process-orchestration-service/api-contract.md) and [PO automation coverage](../../repositories/plan-sop-process-orchestration-service/automation-coverage.md)
- [PSRGatewayTest-ProcessOrchestration-Coverage.html](../../../../jmeter/plans/PSRGatewayTest-ProcessOrchestration-Coverage.html) and [PSRGatewayTest-PO-Phase1-Plan.md](../../../../jmeter/plans/PSRGatewayTest-PO-Phase1-Plan.md)
- [process-orchestration-api-coverage-matrix.html](../process-orchestration-api-coverage-matrix.html) and the [backend API coverage dashboard](../backend-api-coverage-dashboard.html)
