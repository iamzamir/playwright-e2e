---
description: "Spec structure, fixtures, waits, and suite registration for Playwright UI tests"
applyTo: "playwright-e2e/tests/**/*.spec.ts"
---
# Spec rules

These apply on top of the global conventions in `.github/copilot-instructions.md`.

## Structure
- Use `test.describe.serial` for ordered flows; inject fixtures rather than constructing page objects manually.
- Lifecycle: `test.beforeAll`/`afterAll` for suite setup/teardown, `beforeEach`/`afterEach` for per-test state.
- Each acceptance criterion maps to at least one explicit assertion.

## Locators & waits
- **NEVER inline selectors** in a spec — every locator lives in a page object. Add missing POM methods first.
- Locator priority: `getByRole` > `getByTestId` > `getByLabel`/`getByPlaceholder`/`getByText` > CSS. **NEVER XPath.**
- No static sleeps — use `locator.waitFor`, `expect.poll`, `expect(...).toBeVisible()`, or network-idle conditions.
- Timeouts come from `getTimeout(tier)` in `constants/timeouts.ts` — never hardcode millisecond values.

## Test data
- Load per-environment data from `testdata/<ENV>/<area>/<SpecName>.json` via the `testData` fixture.
- Names for created data come from `uniqueName(prefix)` (from `util/unique-name.util.ts`), and clean them up in `afterAll`.
- Register every entity a spec creates: `createdEntities.register('scenario', name)` right after creation succeeds (pass `{ id }` whenever the create call returns one). The worker-scoped `createdEntities` fixture (both `configs/fixtures.ts` and `configs/api-fixtures.ts`) deletes them through the API at worker teardown, even after a failure; call `createdEntities.cleanupFile()` in `afterAll` to clean up per file. What each kind needs at registration is listed in `util/entity-deleters.util.ts`.

## Suite registration (required)
- Register every new spec glob in the correct `playwright-e2e/tests/TestSuites/*.json` so CI executes it.
- A migrated or new spec is not "done" until it is registered.
- When you introduce a **new top-level test area** (a new folder directly under `tests/`), also add or update the matching CI workflow under `.github/workflows/` so the area actually runs in CI. Adding a spec to an existing, already-wired area needs no workflow change.

## Destructive specs (`tests/DataSetupBatch/`)
- A spec that deletes or resets shared data belongs in `tests/DataSetupBatch/`. The config ignores that folder unless `ALLOW_DESTRUCTIVE=true`, and any `DataSetup*` suite fails without the flag.
- A spec that deletes in a dedicated realm (for example the migration target) also calls `assertDestructiveRunAllowed([...realm env keys])` from `util/destructive-guard.util.ts` first in `beforeAll`. It throws; never turn it into `test.skip()`, which would hide a misconfigured run. The realm check passes only when the active environment's row in `configs/env/environments.ts` defines those keys (QA, INTEROP); a value left over in `.env` doesn't count. On QA and INTEROP `ALLOW_DESTRUCTIVE` is the real guard.
- Only the PS UI workflow's "Run DataSetup Tests" step sets the flag on a schedule. Don't add it to other steps.

## Catalog sync (required)
- After adding, renaming, or deleting a spec, regenerate the test-case docs: `npm run docs:testcases`.
- Commit the regenerated catalog together with the spec change so the docs never drift from the suite.

## Mocked UI-contract specs (`tests/PlanningSpace/Mocked/`, plan Phase 9)
- Mock only to remove permutations or to reach states the environment can't produce on demand (filter combinations, status, empty, error and unauthorized states, card rendering). Never mock cross-service flows, persistence, PO configuration shown in PS, backend clones, LiveBlocks, or anything the nightly is meant to catch. Keep one real E2E test per feature.
- Use `useApiHar(page.context(), { area, name, url })` from `util/har.util.ts` in `beforeAll`, before the first navigation that makes the call, and `finishApiHar` in `afterAll`. Routes go on the context: the MFE relays API calls to the portal.
- Keep `url` to the data API the spec needs (for example `**/simulations/search**`); never IAM, CDN or `**/*`. Add a `guard` for the rest of that resource (for example `**/simulations/**`): replay aborts unrecorded requests on `url` and blocks guarded ones, so a test can't pass on live data.
- HARs hold one gateway's URLs: a spec recorded on Azure skips on `GATEWAY_TYPE=GRAVITEE` and has no `GRAVITEE` test data block.
- Assert what the UI sent (`page.waitForRequest`) as well as what it shows; a test that only reads back the mock proves nothing.
- HARs live at `testdata/<ENV>/har/<area>/<name>.har`. Record with `npm run har:record:interop -- <spec path>` after the real spec has seeded the data; check the file has no tokens or emails before committing.
