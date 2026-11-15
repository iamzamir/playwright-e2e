---
description: "Auth, status, and contract conventions for API-style Playwright tests"
applyTo: "playwright-e2e/tests/ProcessOrchestrationBackend/**/*.spec.ts,playwright-e2e/tests/DataSetupBatch/**/*.spec.ts"
---
# API test rules

These apply on top of the global conventions in `.github/copilot-instructions.md`.

## Auth & requests
- Import `test` and `expect` from `configs/api-fixtures` (not `@playwright/test`): it records the last API calls and attaches `api-calls.json` and a curl repro (`api-repro.sh`) to failing tests. No browser is started.
- Use `ApiUtil` from `playwright-e2e/util/api.util.ts`.
- Obtain the token once per file with `getBearerToken()` in `beforeAll`; pass it as `Authorization: Bearer <token>`.
- Never hardcode credentials or URLs. Environments and endpoint paths are defined once in `configs/env/` and resolved from `ENVIRONMENT`, `URL_MODE` and `GATEWAY_TYPE` (`AZURE` or `GRAVITEE`); `configs/setup.js` writes them to `process.env`. In utils, read them with `getConfig()` / `endpoint()` from `configs/env`. A new endpoint is one row in `configs/env/endpoints.ts` with an OLD path only (`URL_MODE=NEW` is discontinued). `ApiUtil` builds the token request, so do not read `AUTH_URL`/`CLIENT_SECRET` in specs.
- Specs must pass on both gateways (Azure and Gravitee) and on INTEROP and QA. Check any gateway-specific behaviour in `.agents/learnings.md` before asserting it.
- `processAPIRequest` returns `response[responseType]` on success (`data` by default) and a `{ status, data, headers }` object on error — handle both shapes.

## Status assertions
- **Success**: numeric — `expect(status).toBe(200)` / `toBe(201)`.
- **Error**: string — `expect(status).toBe("400")` / `toBe("404")` (util returns `error.response.status.toString()`).

## Contract assertions
- Success: assert required fields exist with correct types.
- List endpoints: assert the response is an array and spot-check one element's shape.
- Create/update: assert the returned entity reflects the submitted payload.
- Negative cases: assert both the status code and a meaningful error message field where available.

## Helpers (reuse before writing new ones)
- `ApiUtil.processRawRequest` for malformed-JSON cases; `processAPIRequest` JSON-encodes string bodies, so the service never sees invalid JSON.
- Action Items: `ActionItemApiHelper` in `util/action-item.util.ts`. Use `write()` for POST/PUT/DELETE and `sendUntilStatus` for reads only.
- Writable processes: `util/process-fixture.util.ts` (creates from a template and deletes with its model, procedure, actor and IAM roles).
- Link Management seed data: `util/mapping.util.ts`.

## Known service defects
- Do not assert a known defect as correct behaviour. Record it in `playwright-e2e/docs/Coverage/PSR-Gap-Plans/ActionItems-UIFields-Defect-Report.html` (request, response, expected, actual) and assert the intended contract only where it already holds.
- A blanket 500 across every route of one service on one gateway is an environment problem, not a test defect.

## Structure
- Use `test.describe.serial` when tests depend on each other (create, then read, then delete). Independent read-only checks may be plain tests.
- Test data for backend specs follows `testdata.instructions.md` (`testdata/<ENV>/<area>/`); check the sibling specs in the same folder for the exact layout.

## Determinism
- Use unique names for created data and clean up in `afterAll`.
