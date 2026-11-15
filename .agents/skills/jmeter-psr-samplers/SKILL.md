---
name: jmeter-psr-samplers
description: 'Add or change HTTP samplers in the PSR JMeter plans (jmeter/Tests/PSRGatewayTest.jmx and siblings). Use when adding API coverage to a JMX, writing JMeter assertions, extractors, If/ForEach controllers, JSR223 scripts or tearDown clean-up, or when load-testing Process Orchestration (PO), Link Management or Action Items endpoints on PSR.'
argument-hint: 'Endpoints to add and target JMX file'
---

# Adding samplers to the PSR JMeter plans

## When to use
- You're adding API coverage to `jmeter/Tests/PSRGatewayTest.jmx`, or to `PSRGraviteeTest.jmx` or `PSRTest.jmx`.
- You're adding assertions, extractors, or clean-up to existing samplers.
- You're turning a coverage report in `jmeter/plans/*.html` into samplers.

## Procedure
1. **Confirm the API contract from service source, not guesses.** The sibling repos live at `C:\Backend\<repo>`, for example `plan-sop-process-orchestration-service/src/main/java/.../rest/controller`. Read the controller, the request DTO, the entity (check which columns are NOT NULL or unique) and the service method, so you know the response shape and side effects. The workspace search tools can't see sibling repos, so use `Select-String` in the terminal.
2. **Plan before editing large JMX changes.** Write the plan in `jmeter/plans/<Plan>-<Phase>-Plan.md`, give it to the user for review, and wait for approval.
3. **Edit the XML directly**, using the templates in [xml-snippets.md](./references/xml-snippets.md). Follow the rules below.
4. **Validate the structure:** `powershell -File .agents/skills/jmeter-psr-samplers/scripts/validate-jmx.ps1 -Path jmeter/Tests/PSRGatewayTest.jmx -NamePattern '^(MyPrefix)'`. It must report 0 pairing issues.
5. **Run it.** A real run needs JMeter on PATH plus `CLIENT_SECRET`. If either is missing, tell the user the plan is validated only as XML, not executed. Smoke-test with 1 thread on both gateways, `GATEWAY_TYPE=AZURE` and `GRAVITEE`, then run 10 threads.

## Rules for new samplers
- **Match the existing samplers.** Use the full path `/cbp/psr/ibp/<service>/v1/...` on `${API_HOST}` over https. Give every sampler its own Header Manager. Name samplers with a numbered prefix, like `AreaN: Description`.
- **Gateway variables:** use `${aiProcessName}` and the other variables that the thread-group JSR223 "Set Gateway Entity IDs" sets, so both gateways work. Samplers inside the existing "… To PS" parallel controllers hardcode `IntegratedBusinessPlanning`, so match that when you add to them.
- **Assertions:** every sampler gets a response-code assertion plus a JSONPath, text or JSR223 body check.
- **Extract only on sequential samplers.** Put any extractor whose value a later sampler needs in a `GenericController`, never inside a Parallel Controller. Give every extractor a default value (`NOT_FOUND`), and guard dependent samplers with an If Controller.
- **Encode names for URL paths.** `__urlencode` turns a space into `+`, which is wrong in a URL path. Use a JSR223 script: `URLEncoder.encode(v,'UTF-8').replace('+','%20')`.
- **Writes only touch data the thread owns.** Give created data a per-thread name (`JMeterPerf<Thing><threadNum>`). Add a timestamp when the table has a unique name constraint. Delete it again in the same iteration.
  - Add a pre-clean DELETE that accepts `200|404`, with `assume_success=true`.
  - Add a tearDown thread group that deletes anything left with the `JMeterPerf*` prefix.
- **Writes to shared data must be no-op round trips.** Read the value, send it back unchanged, then read again and check with a JSR223 Assertion that it matches.

## PO service facts (verified in source, 2026-09-24)
- **Process scope:** `PUT /process/{p}/scope` stores the whole body as the new scope, does no validation, and writes an audit row on every call.
- **Process context:** `GET /process/{p}/context?all=true` does the same work as `GET /process/{p}` and then reads the scope.
- **Calendars and cycles:**
  - Creating or updating a cycle on a calendar a process uses writes `node_schedule` rows, so only write to calendars no process is attached to.
  - A calendar that's in use can't be deleted (409, code 2006).
  - Deleting a calendar also deletes its cycles.
  - A duplicate calendar name returns 409 (code 2020).
  - `PUT /calendar/{name}` requires the body's `calendarName` to equal the path name.
- **Supply chain actions:**
  - The body is the JPA entity. `(tenant_id, name)` is unique, and `name`, `procedure_name` and `ui_config` are NOT NULL.
  - `PUT` replaces the whole record.
  - `uiConfig` must be valid JSON (use `"{}"`), because planning-mfe runs `JSON.parse` on it.
  - Global seed types include `PUBLISH_SCENARIO`, `CREATE_SCENARIO`, `CHANGE_MEASURE` and `COPY_MEASURE`.
- **RBAC:** calendar routes need `RBAC_CALENDAR` CREATE, EDIT, DELETE or VIEW. Supply chain action routes have no `@PreAuthorize`.
