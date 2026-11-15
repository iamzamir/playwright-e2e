# Framework reference — plan-sop-ui-automation

The internal API of the test framework. Check here before writing a new helper — **reuse before create**.

## Utilities (`util/`)
| File | Purpose |
| --- | --- |
| `api.util.ts` | axios wrapper, Bearer token acquisition and two-tier (memory + disk) caching, `clearApiTokenCache()`. `processAPIRequest` JSON-encodes string bodies; use `processRawRequest` to send a malformed-JSON body as-is |
| `common.util.ts` | Shared helpers, including `logMessage(level, msg)` (writes winston + an Allure step) |
| `test.util.ts` | Test-scoped helpers (exposed as the `testUtil` fixture), e.g. `clickPowerBarLinkOpeningNewTab` |
| `wait-helpers.ts` | `getTimeout(tier)` and deterministic wait helpers |
| `db.util.ts` | Direct DB verification |
| `logger.ts` | winston logger |
| `mapping.util.ts` | View/entity mapping helpers: `mapSingleView`/`unmapSingleView`, favourites (`createFavourite`, `getFavourites`, `deleteFavourite`, `purgeFavourites`), `buildLinksUrl` |
| `action-item.util.ts` | `ActionItemApiHelper` for AI backend specs: `write()` for POST/PUT/DELETE (single send, retries only provably safe transient 400s), `sendUntilStatus`/`searchUntil` for reads, node-context resolution, entity registration, PO-proxy search URLs |
| `process-fixture.util.ts` | `createProcessFromTemplate` / `deleteProcessWithReferences` — a writable process plus cleanup of its model, procedure, actor and IAM roles |
| `ui-fields.util.ts` | `buildUiFieldsUrl` (uses `UI_FIELDS_BASE`), field/group name extractors, `compareWithBaseline` against per-environment test data |
| `alm-migration.util.ts` | ALM export/publish/deploy flows, `cleanupActionItemKpis` |
| `calendar-cycle.util.ts` | Calendar and cycle helpers |
| `process-start.util.ts` | Process start/stop with status polling |
| `user-token.util.ts` | Per-user token acquisition |
| `oidc-login.helper.ts` | OIDC/portal login |
| `dom-cleaner.ts` | DOM normalisation before assertions/snapshots |
| `visual-helper.util.ts`, `visual-diff.util.ts` | Visual comparison |
| `performance.metrics.util.ts`, `performance.metrics.enhanced.util.ts` | Performance capture |
| `performance.run.reporter.ts`, `performance.test.utils.ts` | Performance reporting |

## Fixtures (`configs/fixtures.ts`)
Injected per test via `test.extend`.

### Page object fixtures
`actionItemsPage`, `assumptionPage`, `basePage`, `cardsPage`, `drillThroughPage`, `globalSettingsPage`, `loginPage`, `odmPage`, `planningListingPage`, `planningPage`, `portalPage`, `powerBarPage`, `processPage`, `processSettingsPage`, `scaPage`, `scenarioPage`, `scopePage`

### Support fixtures
| Fixture | Provides |
| --- | --- |
| `page` | Context-managed page with caching and artifact capture |
| `commonFunctions` | Shared helpers |
| `testUtil` | Test utilities |
| `visual` | `validatePage(name?, options?)`, `validateArea(locator, name, options?)` |

### Internal types
`AuthUserAlias` (`'user1' \| 'user2'`), `PageCacheScope` (`'worker' \| 'file-worker'`), `NetworkArtifactMode` and `ObservabilityArtifactMode` (`'always' \| 'failure-only' \| 'never'`).

Always inject fixtures. Do not instantiate a page object directly in a spec.

## Page objects (`pageobjects/`)
Base class: `page.ts`.

| Page object | Target app |
| --- | --- |
| `action-items.page.ts` | Action items (both apps) |
| `assumption.page.ts` | Assumption views |
| `cards.page.ts` (+ `cards/*.component.ts`) | Planning Space cards, card gallery and settings, Duplicate View |
| `constraint.page.ts` | Dynamic constraints |
| `drillthrough.page.ts` | Drill-through |
| `global-settings.page.ts` | Global settings |
| `login.page.ts` | Login |
| `odm.page.ts` | On-demand MaaS |
| `planning.page.ts`, `planning-listing.page.ts` | Planning Space |
| `portal.page.ts` | Luminate Portal |
| `powerbar.page.ts` | Power bar |
| `process.page.ts`, `process-settings.page.ts` | Process Orchestration |
| `sca.page.ts` | Supply chain actions (delegates to `planning/procedures.component.ts`, `global-settings/view-procedures.component.ts`, `global-settings/process-procedures.component.ts`) |
| `scenario.page.ts` | Scenarios |
| `scope.page.ts` | Scope and filters |

**Do not rename or change the signature of a page-object method with more than one caller.** Add a new method and mark the old one `@deprecate`.

## Timeout tiers (`constants/timeouts.ts`)
| Tier | Value |
| --- | --- |
| `TINY` | 2,000 ms |
| `SHORT` | 5,000 ms |
| `MEDIUM` | 10,000 ms |
| `LONG` | 15,000 ms |
| `XLARGE` | 30,000 ms |
| `EXTREME` | 60,000 ms |
| `ACTION` | 60,000 ms |
| `TEST` | 900,000 ms (15 min) |
| `EXTENDED` | 1,800,000 ms (30 min) |
| `POLL_INTERVAL` | 500 ms |
| `TYPE_CHAR_DELAY` | 50 ms |
| `POST_INPUT_SETTLE` | 200 ms |

```typescript
import { getTimeout, TIMEOUTS } from '../constants/timeouts';
```

A global `PW_TIMEOUT_MULTIPLIER` scales every tier — use it for slow environments instead of editing individual values. **Never hardcode a timeout.**

## Configuration (`configs/`)
| File | Purpose |
| --- | --- |
| `playwright.config.ts` | Default config |
| `playwright.sauce.config.ts` | Sauce Labs |
| `playwright.visual.config.ts` | Visual suite |
| `performance-test.config.ts` | Performance suite |
| `fixtures.ts` | Fixture definitions |
| `global-setup.ts`, `global-teardown.ts` | Suite lifecycle |
| `env/` | **Environment resolution — the single source of every URL, realm, and endpoint** (`environments.ts`, `endpoints.ts`; utils read `getConfig()` / `endpoint()`) |
| `setup.js` | Applies `env/` to `process.env` at startup and prints the `[setup]` lines |
| `failure-hook.ts` | Failure handling |
| `allure-trace-filter.ts`, `visual-attachment-filter.ts` | Artifact size control |
| `visual-teams-reporter.ts` | Teams notifications |

## Scripts (`scripts/`)
| Script | npm command | Purpose |
| --- | --- | --- |
| `codegen.ts` | `codegen`, `codegen:qa`, `codegen:psr` | Environment-aware codegen |
| `finalize-spec.js` | `finalize-spec` | Post-authoring checks |
| `generate-testcase-docs.js` | `docs:testcases` | Regenerate `docs/testcases/*.md` |
| `generate-api-coverage-report.js` | `docs:api-coverage` | Regenerate `docs/Coverage/backend-api-coverage-dashboard.html` and per-service matrices from sibling-repo routes + the newest green `playwright-po-backend-suite` run per environment (needs `gh`; pull `main` in every sibling repo first) |
| `run-po-backend-batches-parallel.js` | `test:*:pobackend:parallel` | Runs the 6 backend batches in parallel (action item, calendar, link management, migration, process, UI Fields) |
| `save-snapshot.ts` | `snapshot` | Save a snapshot |
| `strip-allure-traces.js` | — | Strip trace/video binaries so GitHub Pages does not bloat |

## Runtime environment variables
| Variable | Default | Effect |
| --- | --- | --- |
| `ENVIRONMENT` | `INTEROP` | QA / INTEROP / PSR |
| `URL_MODE` | `OLD` | Legacy `cbp/...` vs short gateway paths |
| `GATEWAY_TYPE` | `AZURE` | `AZURE` or `GRAVITEE` |
| `SUITENAME` | `complete-iop-suite` (`complete-qa-suite` in QA) | Suite JSON to run |
| `USE_SPECIFIC_TESTS` | unset (local `.env` may set it) | `true` runs the hardcoded `specificTests` list in `playwright.config.ts`; pass `false` when running a folder or suite |
| `TEST_IGNORE` | — | Comma-separated specs to skip |
| `PW_RETRIES` | `1` in CI, `0` locally | Retry count; CI traces are `on-first-retry` when retries > 0 |
| `REALM_KEY` | per environment | Gravitee host prefix (`https://{REALM_KEY}.api...`) |
| `PW_ENABLE_GLOBAL_SETUP` | `true` | Global setup toggle |
| `PW_PAGE_CACHE_SCOPE` | `file-worker` | Page reuse scope |
| `PW_NETWORK_ARTIFACT_MODE` | — | `always` / `failure-only` / `never` |
| `PW_TIMEOUT_MULTIPLIER` | `1` | Scales all timeout tiers |
| `ENABLE_TOKEN_CACHE` | `true` | Bearer token caching |
| `REDACT_BEARER_TOKEN` | `true` | Redact tokens from artifacts |
| `HEADLESS` | `false` | Headless mode |
| `CI` | unset | When set: fixed 1920×1080 viewport. Locally the viewport is `null` and Chrome starts maximised |
| `DEBUG` | `true` | Debug logging |
| `PERFORMANCE_RUN_ITERATIONS` | `3` | Performance iterations |
