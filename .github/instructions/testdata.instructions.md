---
description: "Schema and layout rules for per-environment test data JSON"
applyTo: "playwright-e2e/testdata/**/*.json"
---
# Test data rules

These apply on top of the global conventions in `.github/copilot-instructions.md`.

## Layout
- Path convention: `testdata/<ENV>/<area>/<SpecName>.json` where `<ENV>` is `INTEROP`, `QA`, or `PSR`.
- Keep one data file per spec; do not share mutable data across specs.

## Schema
- When creating or updating a testdata JSON file, include a `_schema` block documenting required fields and their types:
  ```json
  {
    "_schema": {
      "REALM_NAME": "string (required)",
      "PROCESS_NAME": "string (required)"
    },
    "REALM_NAME": "cbp-interop-ps-automation-2",
    "PROCESS_NAME": "Automation Process"
  }
  ```
- Every file under `testdata/` except `testdata/.auth/` must have `_schema`. `npm run validate:suites`, which runs in `pr-checks`, fails without it. To draft one, run `node scripts/add-testdata-schema.js --write <file>` from `playwright-e2e/`. It types each top-level key from its value and marks it required, without touching the rest of the file. Then edit the notes, for example to mark a key `(optional)` or describe it.
- Fail fast: the `testData` fixture auto-loads this file and will throw if it is missing or invalid JSON; use `_schema` as documentation and ensure the required keys are present for the spec.
- Never store credentials or secrets in test data — those come from `process.env`.

## Gateway overrides (Azure vs Gravitee)
- Base keys hold the Azure values. Gravitee values go in a top-level `GRAVITEE` object in the same file, containing only the keys that differ (e.g. `"GRAVITEE": { "REALM_NAME": "pspo-int-automation" }`).
- `applyGatewayOverrides()` in `util/gateway.util.ts` strips the block and, when `GATEWAY_TYPE=GRAVITEE`, deep-merges it over the base (objects merge; arrays and scalars replace). The `testData` fixture applies it automatically; specs that `require()` their JSON must wrap it.
- With `GATEWAY_TYPE=GRAVITEE`, a file without a `GRAVITEE` block throws. Use `"GRAVITEE": {}` when nothing differs; omit it only for specs excluded from Gravitee runs.
- Every new INTEROP UI test data file under `ProcessOrchestration/` must include the block.
- A `REALM_KEY` inside the `GRAVITEE` block pins the Gravitee tenant for that spec: the auto `_realmKeyOverride` fixture (`applyRealmKeyOverride()` in `util/gateway.util.ts`) repoints `REALM_KEY`, `LUMINATE_PORTAL_URL`, `API_BASE_URL`, `AUTH_URL`, `NAVIGATE_TO_PLANNING_SPACE` (and `CLIENT_ID`/`CLIENT_SECRET` when `GRAVITEE_CLIENT_ID_<KEY>`/`GRAVITEE_CLIENT_SECRET_<KEY>` exist) for each test and restores them afterwards. Global setup still logs in with the env `REALM_KEY`.
