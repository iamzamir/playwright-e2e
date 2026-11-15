# Test hooks — plan-sop-ui-automation

The authoring workflow for this repo. Governance lives in `.github/instructions/workflow.instructions.md`; this page is the practical companion.

## Branch policy
Never commit to `main` or a long-lived integration branch. One logical change per branch:

| Prefix | Use |
| --- | --- |
| `feature/<name>` | New tests, page objects, utilities, capabilities |
| `bugfix/<name>` | Fixing a broken or flaky test/helper |
| `test/<name>` | Coverage only |
| `refactor/<area>` | Non-behavioural restructuring |

## Authoring a new spec

### 1. Find the target repo
Start from [the repository index](../README.md) and the target repo's `ui-inventory.md` (frontend) or `api-contract.md` (backend). That gives you real test IDs or real endpoints before you write a line.

### 2. Fill POM gaps first
No inline selectors in specs. If a locator is missing, add it to the page object first.

Locator hierarchy:
```
getByRole  >  getByTestId  >  getByLabel / getByPlaceholder / getByText  >  CSS
```
**Never XPath.**

Check the target repo's `ui-inventory.md` for test IDs that are variable names rather than DOM attributes, and for index-based locators to avoid.

### 3. Write the spec
```typescript
import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';

test.describe.serial('Feature', () => {
  test('does the thing', async ({ processPage, testUtil }) => {
    // ...
  });
});
```

- Inject fixtures — never instantiate page objects directly.
- Use `test.describe.serial` when order matters.
- Use `getTimeout(tier)` — never a hardcoded number, never a static sleep.
- 2-space indentation, spaces only. Parameters on one line.

### 4. Create test data
```
testdata/<ENV>/<area>/<SpecName>.json
```
Create it for **every environment** the spec will run in. Environment-specific expectations (columns, filters, labels) belong here, not in the spec.

### 5. Register the spec in a suite
Add the glob to the correct `tests/TestSuites/*.json`:
```json
{ "testFiles": ["**/playwright-e2e/tests/<Area>/<Folder>/<SpecName>.spec.ts"] }
```
**An unregistered spec never runs in CI.** New top-level areas must also be checked against the CI workflows.

### 6. Regenerate docs
```bash
npm run docs:testcases
```
Required whenever specs are added or renamed.

### 7. Run in isolation
```bash
npm run test:target -- tests/<Area>/<Folder>/<SpecName>.spec.ts
```
`test:target` pins `--workers=1`.

### 8. Finalize
```bash
npm run finalize-spec
```

## Deterministic waits
| Instead of | Use |
| --- | --- |
| `waitForTimeout(3000)` | `locator.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') })` |
| Sleeping for a grid | Wait on the row locator, or the empty-state locator |
| Sleeping after typing | `TYPE_CHAR_DELAY` + `POST_INPUT_SETTLE` |
| Sleeping for a backend job | `expect.poll` with `POLL_INTERVAL` against the status endpoint |
| Sleeping for a page load | Wait for the loading skeleton to **detach** |

Per-app guidance: [Planning Space](../plan-sop-planning-mfe/test-hooks.md#deterministic-waits--what-to-use-instead-of-a-sleep), [LUI](../plan-sop-lui/test-hooks.md#deterministic-waits--what-to-use-instead-of-a-sleep).

## API-first setup
Seed prerequisites through the API, not the UI — faster and far more stable:

| Need | Call | Helper |
| --- | --- | --- |
| A process | `POST /process/template` ([PO](../plan-sop-process-orchestration-service/test-hooks.md)) | `createProcessFromTemplate` / `deleteProcessWithReferences` in `util/process-fixture.util.ts` |
| View mappings | `POST /view-entity-map` ([Link Management](../plan-sop-link-management/test-hooks.md)) | `MappingUtil.mapSingleView` in `util/mapping.util.ts` (LM accepts synthetic view/entity ids) |
| Favourites | `POST /entity/{entityId}/views` | `MappingUtil.createFavourite` / `purgeFavourites` |
| Action items | `POST /actionitems` ([Action Item](../plan-sop-actionitem/test-hooks.md)) | `ActionItemApiHelper` in `util/action-item.util.ts` |
| An assumption-style AI entity | `POST /entity` | `ActionItemApiHelper.registerEntity` / `deleteEntity` |
| Scenarios | `DataSetupBatch/Scenarios/Test_004_CreateScenarios` | — |

## API spec rules
From `.github/instructions/playwright-api.instructions.md` — the backend specs follow these:

| Rule | Detail |
| --- | --- |
| Client | `ApiUtil`; token once per file in `beforeAll` |
| Status assertions | Success numeric (`toBe(200)`), error **string** (`toBe("404")`) — `ApiUtil` returns `status.toString()` on error |
| Both gateways | Specs must pass on `AZURE` and `GRAVITEE`, INTEROP and QA. Gateway-specific behaviour is in `.agents/learnings.md` |
| Writes vs reads | `ActionItemApiHelper.write()` for POST/PUT/DELETE (sends once); `sendUntilStatus` only for reads |
| Malformed JSON | `ApiUtil.processRawRequest` — `processAPIRequest` JSON-encodes strings |
| Known service defects | Never assert them as correct; record them in `docs/Coverage/PSR-Gap-Plans/ActionItems-UIFields-Defect-Report.html` |
| Environment-wide 500s | A blanket 500 on every route of one service on one gateway is an environment problem, not a test defect |

For a new PSR gap API spec, use the `psr-gap-api-tests` skill in `.agents/skills/`.

## Switching users
```typescript
clearApiTokenCache();  // from util/api.util.ts
```
Call it before switching between `user1` and `user2`, otherwise the cached Bearer token for the previous user is reused.

## Data setup suites are destructive
`DataSetupBatch/**` deletes processes, calendars, views, scenarios, SCAs and roles across the whole realm. Never interleave it with functional suites on the same realm.

## Definition of Done
- [ ] Fixture injection used; `test.describe.serial` where ordered
- [ ] No inline selectors — POM gaps filled first
- [ ] Locator hierarchy respected; **no XPath**
- [ ] No static sleeps; timeouts via `getTimeout(tier)`
- [ ] Test data JSON exists at `testdata/<ENV>/<area>/<SpecName>.json`
- [ ] Spec registered in the correct `tests/TestSuites/*.json`
- [ ] `npm run docs:testcases` run if specs were added or renamed
- [ ] No TypeScript errors
- [ ] Spec runs green in isolation with `--workers=1`
- [ ] Changed files, commands run, and results reported

## Prohibited
- Pushing to `main` or force-pushing shared branches
- Bypassing hooks (`--no-verify`) or skipping tests to make CI green
- Removing functionality or coverage unless explicitly requested
- Committing secrets — auth comes from `process.env` via `setup.js`
- Editing files unrelated to the task
- Leaving `TODO` in place of implementation
- Renaming or changing the signature of a page-object method with more than one caller — add a new method and `@deprecate` the old one
