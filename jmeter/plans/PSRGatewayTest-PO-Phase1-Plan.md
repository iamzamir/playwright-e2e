# PSRGatewayTest.jmx: PO coverage, phase 1 plan

Status: **implemented in the JMX, not yet run against PSR** (2026-09-24). Section 10 lists what changed from the draft.
Branch: `ABP-19338/psr-po-coverage`
Source report: [PSRGatewayTest-ProcessOrchestration-Coverage.html](PSRGatewayTest-ProcessOrchestration-Coverage.html)
Target file: [jmeter/Tests/PSRGatewayTest.jmx](../Tests/PSRGatewayTest.jmx)

## 1. Scope

17 PO routes. All request and response shapes below were checked against the `plan-sop-process-orchestration-service` source (`ProcessController`, `ProcessService`, `CalendarController`, `CalendarService`, `SupplyChainActionController`, `SupplyChainActionService` and their DTOs and entities).

| # | Method | Path | Used by a UI | RBAC | Success |
|---|---|---|---|---|---|
| 1 | GET | `/process/{p}/context?all=true` | mfe, on every Planning Space load | PROCESS.{p}:VIEW | 200 map |
| 2 | GET | `/process/{p}/context` | lui, Settings → horizon | PROCESS.{p}:VIEW | 200 map (16 keys + scope) |
| 3 | GET | `/process/{p}/scope` | mfe and lui | PROCESS.{p}:VIEW | 200 map |
| 4 | PUT | `/process/{p}/scope` | lui, Settings → Process Scope | PROCESS.{p}:EDIT | 200 text `Scope updated successfully` |
| 5 | GET | `/calendar?pageNumber&pageSize` | lui, Calendar Manager | CALENDAR:VIEW | 200 `{data[], pager}` |
| 6 | POST | `/calendar` | lui | CALENDAR:CREATE | 201, empty body |
| 7 | GET | `/calendar/{name}` | lui | CALENDAR:VIEW | 200 `{name, description}` |
| 8 | PUT | `/calendar/{name}` | lui | CALENDAR:EDIT | 200, empty body |
| 9 | DELETE | `/calendar/{name}` | lui | CALENDAR:DELETE | 200, empty body |
| 10 | GET | `/calendar/{c}/cycle?pageNumber&pageSize` | lui, Assumptions page | CALENDAR:VIEW | 200 `{data[], pager}` |
| 11 | POST | `/calendar/{c}/cycle` | lui | CALENDAR:CREATE | 201, empty body |
| 12 | GET | `/calendar/{c}/cycle/{cycleName}` | none | CALENDAR:VIEW | 200 `{id, name, startDate, endDate, description}` |
| 13 | PUT | `/calendar/{c}/cycle/{cycleName}` | lui | CALENDAR:EDIT | 200, empty body |
| 14 | DELETE | `/calendar/{c}/cycle/{cycleName}` | lui | CALENDAR:DELETE | 200, empty body |
| 15 | POST | `/supplyChainAction` | none | none | 201 entity (with `id`) |
| 16 | GET | `/supplyChainAction/{id}` | mfe | none | 200 DTO, or 404 with no body |
| 17 | PUT | `/supplyChainAction/{id}` | none | none | 200 entity |
| 18 | DELETE | `/supplyChainAction/{id}` | none | none | 200 text `Supply Chain Action with id [..] deleted successfully.` |

Rows 1 and 2 are the same route called two ways, so the table has 18 rows for 17 routes. `GET /supplyChainAction` (the list) is already covered by 3 samplers and doesn't change.

**Coverage change:** UI-used PO routes driven go from 18 to 31 of 58. Four more routes that no UI calls are also added: cycle by name, and SCA POST, PUT and DELETE.

## 2. Design rules

1. **Match the existing JMX conventions.** Each sampler uses the full path `/cbp/psr/ibp/process-orchestration/v1/...` on `${API_HOST}` over https, gets the same per-sampler HTTP Header Manager (Content-Type, `Bearer ${__property(access_token)}`, accept), and uses the gateway variables from "Set Gateway Entity IDs" (`${aiProcessName}`). That way both `GATEWAY_TYPE=AZURE` and `GRAVITEE` work unchanged.
2. **Every new sampler gets an assertion.** Each one has a Response Assertion on the response code, plus a JSONPath or text assertion on the body. The LinkManagement samplers set the pattern.
3. **Only sequential samplers extract variables.** Any value a later sampler needs is extracted in a `GenericController`, not inside a Parallel Controller.
4. **Writes run only on data the thread owns, or are no-op round trips.** No write ever targets the process's real calendar or a real SCA.
5. **Names with spaces are encoded for URL paths.** `__urlencode` turns a space into `+`, which is wrong in a path. A JSR223 PostProcessor sets `*Enc` variables with `URLEncoder.encode(v, 'UTF-8').replace('+', '%20')`.
6. **Sampler names use numbered prefixes:** `POContextN:`, `POScopeN:`, `CalendarN:`, `CalendarCycleN:`, `SCAN:`.

## 3. Placement in the thread group

```
Thread Group - Tests
  ... existing samplers ...
  PO To PS (parallel)            + "PO To PS 11: Process Context"          (A6)
  Subprocess To PS (parallel)    + "Subprocess To PS 14: Process Context"  (A7)
  Action Items To PS (parallel)  + "AI To PS 11: Process Context"          (A8)
  [NEW] PO Process Context and Scope   (GenericController, A1–A5)
  [NEW] PO Calendar Reads              (GenericController, B1–B4)
  [NEW] PO Calendar Writes             (GenericController, C0–C10)
  [NEW] PO Supply Chain Action CRUD    (GenericController, D1–D5)
  Aggregate Report / View Results Tree
[NEW] tearDown Thread Group - PO Perf Data Cleanup (E1–E2)
```

## 4. Samplers

`{PO}` means `/cbp/psr/ibp/process-orchestration/v1`.

### A. PO Process Context and Scope

| ID | Name | Request | Assertions | Extract / post-process |
|---|---|---|---|---|
| A1 | `POContext1: Get Process Context - Full (Planning Space)` | GET `{PO}/process/${aiProcessName}/context?all=true` | 200; `$.name` = `${aiProcessName}`; `$.scope` exists | `poCalendarName` = `$.calendarName`, `poCycleName` = `$.cycleName` (default `NOT_FOUND`); JSR223 sets `poCalendarNameEnc` and `poCycleNameEnc` |
| A2 | `POContext2: Get Process Context - Summary (Settings)` | GET `{PO}/process/${aiProcessName}/context` | 200; `$.scope` exists; `$.calendarName` exists | none |
| A3 | `POScope1: Get Process Scope` | GET `{PO}/process/${aiProcessName}/scope` | 200; the body is a JSON object (`dimensions` and `horizon` are optional) | JSR223 stores the raw body in `poScopeBody`, but only on a 200 whose body starts with `{` |
| A4 | `POScope2: Update Process Scope (round-trip)`, inside an If Controller that checks `poScopeBody` is set | PUT `{PO}/process/${scopeProcessName}/scope`, body `${poScopeBody}` | 200; body contains `Scope updated successfully` | none |
| A5 | `POScope3: Get Process Scope after Update` | GET `{PO}/process/${scopeProcessName}/scope` | 200; a JSR223 Assertion parses the body and checks it equals the parsed `poScopeBody`, which proves the PUT changed nothing | none |
| A6–A8 | `… : Process Context` in the 3 parallel controllers | GET `{PO}/process/${aiProcessName}/context?all=true` | 200; `$.scope` exists | none |

`scopeProcessName` defaults to `${aiProcessName}` (see Q1).

What the service does on each call (from the code):
- `context` runs `getProcessDetails()` (the same work as `GET /process/{p}`), then `getScope()`. It then works out `processStartDate` and `processEndDate` from `cycleStartDate` and `scope.horizon`, defaulting to 30 past and 30 future days.
- `PUT scope` writes the whole body as the new scope JSON and writes an **audit-log row on every call**. It does no validation. A partial body replaces the whole scope for every Planning Space user of that process, so the body always comes from A3.

### B. PO Calendar Reads (the process's real calendar, read-only)

The whole controller is wrapped in an If Controller that runs only when `poCalendarName` isn't `NOT_FOUND`.

| ID | Name | Request | Assertions |
|---|---|---|---|
| B1 | `Calendar1: Get All Calendars` | GET `{PO}/calendar?pageNumber=0&pageSize=10` | 200; `$.data` and `$.pager` exist |
| B2 | `Calendar2: Get Calendar By Name` | GET `{PO}/calendar/${poCalendarNameEnc}` | 200; `$.name` = `${poCalendarName}` |
| B3 | `CalendarCycle1: Get Cycles For Calendar (Assumptions page)` | GET `{PO}/calendar/${poCalendarNameEnc}/cycle?pageNumber=0&pageSize=100` | 200; `$.data` and `$.pager` exist |
| B4 | `CalendarCycle2: Get Cycle By Name` | GET `{PO}/calendar/${poCalendarNameEnc}/cycle/${poCycleNameEnc}` | 200; `$.name` = `${poCycleName}` |

### C. PO Calendar Writes (on a calendar the thread owns)

A JSR223 PreProcessor on the controller sets `perfCalendar = JMeterPerfCalendar<threadNum>`. Cycle names are `PerfCycle1` and `PerfCycle2`, so the path needs no encoding. This calendar is never attached to a process. That matters because `createCycle` and `updateCycle` on a calendar that a process uses write `node_schedule` rows for every process attached to it.

| ID | Name | Request | Assertions |
|---|---|---|---|
| C0 | `CalendarSetup: Pre-clean Perf Calendar` | DELETE `{PO}/calendar/${perfCalendar}` | code matches `200\|404` (this deletes anything a failed earlier iteration left behind) |
| C1 | `Calendar3: Create Calendar` | POST `{PO}/calendar`, body C1 | 201 |
| C2 | `Calendar4: Get Created Calendar` | GET `{PO}/calendar/${perfCalendar}` | 200; `$.name` = `${perfCalendar}` |
| C3 | `Calendar5: Update Calendar` | PUT `{PO}/calendar/${perfCalendar}`, body C3 | 200 |
| C4 | `CalendarCycle3: Create Cycle` | POST `{PO}/calendar/${perfCalendar}/cycle`, body C4 | 201 |
| C5 | `CalendarCycle4: Get Cycles For Perf Calendar` | GET `{PO}/calendar/${perfCalendar}/cycle?pageNumber=0&pageSize=20` | 200; `$.pager.totalElements` = 2 |
| C6 | `CalendarCycle5: Get Perf Cycle By Name` | GET `{PO}/calendar/${perfCalendar}/cycle/PerfCycle2` | 200; `$.name` = `PerfCycle2` |
| C7 | `CalendarCycle6: Update Cycle` | PUT `{PO}/calendar/${perfCalendar}/cycle/PerfCycle2`, body C7 | 200 |
| C8 | `CalendarCycle7: Delete Cycle` | DELETE `{PO}/calendar/${perfCalendar}/cycle/PerfCycle2` | 200 |
| C9 | `Calendar6: Delete Calendar` | DELETE `{PO}/calendar/${perfCalendar}` | 200 (this also removes `PerfCycle1`, as Playwright `Test_002_CyclesCRUD` TC14 shows) |
| C10 | `Calendar7: Get Deleted Calendar` (optional, Q5) | GET `{PO}/calendar/${perfCalendar}` | 404 |

Bodies (the shapes follow `CalendarRequestDto` and `CycleRequestDto`, and the date format follows the PSR Playwright test data):

```jsonc
// C1: POST /calendar
{ "calendarName": "${perfCalendar}", "description": "JMeter perf calendar",
  "cycles": [ { "cycleName": "PerfCycle1", "description": "PerfCycle1",
                "startDate": "2030-01-01T00:00:00.000Z", "endDate": "2030-01-31T00:00:00.000Z" } ] }

// C3: PUT /calendar/{name}. calendarName must equal the path name.
// Leaving out "cycles" means the service doesn't upsert any cycles.
{ "calendarName": "${perfCalendar}", "description": "JMeter perf calendar - updated" }

// C4: POST /calendar/{c}/cycle. Name and startDate must be unique per calendar,
// otherwise the call fails with IBP_PO_50_2100.
{ "cycleName": "PerfCycle2", "description": "PerfCycle2",
  "startDate": "2030-02-01T00:00:00.000Z", "endDate": "2030-02-28T00:00:00.000Z" }

// C7: PUT /calendar/{c}/cycle/{cycleName}. The dates stay the same, so the
// service skips its node-schedule recalculation.
{ "cycleName": "PerfCycle2", "description": "PerfCycle2 - updated",
  "startDate": "2030-02-01T00:00:00.000Z", "endDate": "2030-02-28T00:00:00.000Z" }
```

Error codes that matter here: `2020` CALENDAR_NAME_ALREADY_EXISTS (409, which is why C0 exists), `2004` CALENDAR_NOT_FOUND (404), `2005` CYCLE_NOT_FOUND (404), `2006` CALENDAR_ASSOCIATED_TO_PROCESS (409), `2007` CYCLES_ASSOCIATED_TO_PROCESS_AND_NODE (409).

### D. PO Supply Chain Action CRUD (on an SCA the thread owns)

A JSR223 PreProcessor sets `perfScaName = JMeterPerfSCA<threadNum>`.

| ID | Name | Request | Assertions | Extract |
|---|---|---|---|---|
| D1 | `SCA1: Create Supply Chain Action` | POST `{PO}/supplyChainAction`, body D1 | 201; `$.id` exists; `$.name` = `${perfScaName}`; `$.isActive` = true | `perfScaId` = `$.id` (default `NOT_FOUND`) |
| D2–D5 run inside an If Controller that checks `perfScaId` isn't `NOT_FOUND` | | | | |
| D2 | `SCA2: Get Supply Chain Action By Id` | GET `{PO}/supplyChainAction/${perfScaId}` | 200; `$.id` = `${perfScaId}`; `$.uiConfig` exists | none |
| D3 | `SCA3: Update Supply Chain Action` | PUT `{PO}/supplyChainAction/${perfScaId}`, body D3 | 200; `$.description` = `JMeter perf SCA - updated` | none |
| D4 | `SCA4: Delete Supply Chain Action` | DELETE `{PO}/supplyChainAction/${perfScaId}` | 200; body contains `deleted successfully` | none |
| D5 | `SCA5: Get Deleted Supply Chain Action` (optional, Q5) | GET `{PO}/supplyChainAction/${perfScaId}` | 404 | none |

```jsonc
// D1: POST /supplyChainAction. The body is the SupplyChainAction entity. id,
// tenantId, isActive and isEnabled are set by the server.
{ "name": "${perfScaName}", "type": "<see Q4>", "description": "JMeter perf SCA",
  "procedureName": "JMeterPerfProcedure", "uiConfig": "{}" }

// D3: PUT /supplyChainAction/{id}. This is a full replace, so name, description,
// procedureName and uiConfig are required (NOT NULL columns). Leaving one out gives a 500.
{ "name": "${perfScaName}", "type": "<see Q4>", "description": "JMeter perf SCA - updated",
  "procedureName": "JMeterPerfProcedure", "uiConfig": "{}" }
```

`uiConfig` is `"{}"`, not `""`. planning-mfe runs `JSON.parse(uiConfig)` on it (`actions_procedure_config.ts`, `ActionSteps.tsx`), so an empty string would break the UI if a PS user opened the SCA while it exists.

### E. tearDown Thread Group: PO Perf Data Cleanup (1 thread, 1 loop)

This is a safety net for rows left behind when an iteration failed partway.

| ID | Steps |
|---|---|
| E1 | GET `{PO}/calendar?pageNumber=0&pageSize=500`, then a JSON Extractor (match `-1`) on `$.data[?(@.name =~ /JMeterPerfCalendar.*/)].name`, then a ForEach Controller that sends DELETE `{PO}/calendar/${leftoverCalendar}` |
| E2 | GET `{PO}/supplyChainAction`, then a JSON Extractor (match `-1`) on `$[?(@.name =~ /JMeterPerfSCA.*/)].id`, then a ForEach Controller that sends DELETE `{PO}/supplyChainAction/${leftoverScaId}` |

## 5. Risks and data rules

| Risk | Mitigation |
|---|---|
| A PUT on the shared process scope overwrites a concurrent edit by a person with an older copy, and writes one audit row per call | The body is a round trip from A3 and A5 checks it didn't change. Q1 offers a perf-only process instead, and Q3 offers throttling |
| The process has no stored scope, so `getScope` fails because `readValue(null)` throws | Pre-check P1. The A4 guard skips the PUT when A3 fails |
| The perf calendar collides with an earlier run (409, code 2020) | C0 pre-clean, plus the E1 tearDown |
| A perf SCA shows up briefly in every PS user's SCA list (`GET /supplyChainAction` runs on every mfe load) | The SCA is created and deleted in the same iteration, E2 cleans up leftovers, and `uiConfig` is valid JSON |
| The client-credentials identity doesn't have CALENDAR CREATE, EDIT or DELETE, or PROCESS EDIT | Pre-check P2 with a 1-thread smoke run |
| A calendar or cycle name with a space in a URL path | The `*Enc` variables, set by the JSR223 URLEncoder described in section 2 |

## 6. Pre-checks before editing (a 1-thread manual call in PSR)

- **P1:** `GET /process/IntegratedBusinessPlanning/scope` and `GET /process/PSR1/scope` both return 200 with a JSON object.
- **P2:** `POST /calendar` and `DELETE /calendar/{name}` work with the JMeter client-credentials token, on both gateways.
- **P3:** Record `calendarName` and `cycleName` from `GET /process/{p}/context` for both processes. This confirms that B2–B4 have real values.

## 7. Validation after editing

1. Load the JMX as XML (`[xml](Get-Content …)`) to confirm it's well-formed, then open it in JMeter 5.6.3 to confirm it loads.
2. Smoke run with 1 thread and the default 60 s, with `GATEWAY_TYPE=AZURE`. Every new sampler must pass its assertions, and afterwards there must be no `JMeterPerfCalendar*` or `JMeterPerfSCA*` rows left.
3. Repeat step 2 with `GATEWAY_TYPE=GRAVITEE`.
4. Full run with 10 threads. Compare the error % and p90 of the existing samplers against a baseline run, to check the new controllers don't disturb them.
5. Update the matrix and KPIs in `PSRGatewayTest-ProcessOrchestration-Coverage.html` (Q8).

## 8. Out of scope for phase 1

The rest of the P1 list (`entity/ACTION_ITEM`, `validate/SCENARIO`), P2 items such as action item by ID, transitions and template reads, all P3 lifecycle writes, and the sibling plans `PSRGraviteeTest.jmx` and `PSRTest.jmx` (Q7).

## 9. Open questions for review

Each question has a default in brackets. That default is what I'll do unless you say otherwise.

- **Q1: Scope PUT target.** Should it round-trip on `${aiProcessName}` (IntegratedBusinessPlanning or PSR1), or use a perf-only process? If a perf-only process, which name? [round-trip on `${aiProcessName}`]
Answer: you can use IntegratedBusinessPlanning process

- **Q2:** Should `context?all=true` also be added to the 3 parallel "… To PS" controllers (A6–A8)? [yes]
Answer: Yes, lets add in all 3

- **Q3: Write rate.** Should the writes (A4, C, D) run every iteration, or go under a Throughput Controller (for example 20%) to keep the write:read ratio realistic? [every iteration]
Answer: As per your recommendation

- **Q4: SCA `type`.** Should I copy the `type` of an existing PSR SCA, or leave it out (the column allows null)? [leave it out]
Answer: Copy existing type

- **Q5:** Should C10 and D5 (the "get after delete returns 404" samplers) be included? [yes]
Answer: yes include

- **Q6:** Should the tearDown cleanup thread group (E) be added? [yes]
Answer: yes
- **Q7:** Should the same changes go into `PSRGraviteeTest.jmx` and `PSRTest.jmx`? [no, PSRGatewayTest only]
Answer: no, PSRGatewayTest only
- **Q8:** Should the coverage HTML be updated after the run passes? [yes]
Answer: yes

## 10. Implementation notes (what differs from the draft)

- **Scope target (Q1):** A3–A5 use `${__P(SCOPE_PROCESS_NAME,IntegratedBusinessPlanning)}` on both gateways. Pass `-JSCOPE_PROCESS_NAME=<name>` to point them at another process.
- **A6–A8 (Q2):** these hardcode `IntegratedBusinessPlanning`, the same as the other samplers in those parallel controllers.
- **Write rate (Q3):** writes run every iteration. No Throughput Controller was added.
- **SCA type (Q4):** a new `SCA0: Get All Supply Chain Actions (type source)` sampler copies the first non-null `type` from PSR into `perfScaType`. If none is found it falls back to the global seed type `CHANGE_MEASURE`.
- **SCA name:** `supply_chain_actions` has a unique `(tenant_id, name)` constraint, so the name is `JMeterPerfSCA<threadNum>_<epochMillis>`. That stops a leftover from a failed iteration blocking the next create. E2 still cleans up by the `JMeterPerfSCA` prefix.
- **Perf calendar name:** a JSR223 PreProcessor on the "PO Calendar Writes" controller sets `perfCalendar = JMeterPerfCalendar<threadNum>`.
- **Assertions:** the 404 and pre-clean checks set "Ignore Status" (`assume_success=true`), so a matching 4xx counts as a pass.
- **tearDown:** the tearDown thread group has no listener of its own. Its samples appear only in the `-l` results file.
- **Validation so far:** the JMX parses as XML and every element has its matching `hashTree` (202 samplers). JMeter isn't on PATH and `CLIENT_SECRET` isn't set here, so the steps in section 7 still need to be run.
