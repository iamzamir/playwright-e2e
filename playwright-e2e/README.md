# Playwright E2E Starter Guide

This folder contains the Playwright implementation for Plan SOP automation.

## Documentation

| Document | Description |
|---|---|
| [Running Specific Tests Locally (Markdown)](docs/running-specific-tests-locally.md) | Practical guide for running single specs, test lists, and local configs. |
| [Architecture Diagram (PDF)](docs/architecture/Plan-SOP-Playwright-Architecture.pdf) | Visual blueprint of the framework's layered architecture and runtime flow. |
| [Test Strategy (Markdown)](docs/strategy/test-strategy.md) | How we test Plan SOP: scope, layering, principles, environments, quality gates, and metrics. |
| [Test Strategy (PDF)](docs/strategy/Plan-SOP-Test-Strategy.pdf) | Printable/shareable version of the test strategy. |

## Project Structure

```
playwright-e2e/
  configs/        Playwright, Sauce, performance, and shared setup config + fixtures + global setup + failure-hook
  constants/      Centralized timeout tiers (timeouts.ts)
  network/        Request/response interceptor for redacted network capture
  pageobjects/    BasePage facade (page.ts) + 20 domain page objects
  scripts/        Helper runners (parallel PO backend batches, live-page snapshot CLI)
  templates/      Report templates (performance report)
  tests/          Specs grouped by business capability + TestSuites/*.json manifests
  testdata/       Environment-scoped datasets (INTEROP/QA/PSR) + .auth/ storage state
  util/           Common functions, API, logging, OIDC login, performance metrics, wait helpers, DOM cleaner
  reports/        Allure results/report + snapshots/ (DOM/ARIA captures, failure evidence) [git-ignored]
  docs/           Architecture and strategy documentation
```

## Quick Start

1. Install dependencies

```bash
cd playwright-e2e
npm install
npx playwright install
```

2. Run tests by environment

```bash
npm run test:interop
npm run test:qa
npm run test:psr
```

3. Run a focused suite

```bash
npm run test:interop:poui:powerbar
npm run test:interop:pobackend:linkmanagement
```

4. Run a single target spec (used by healer/autopilot loops)

```bash
npm run test:target -- tests/ProcessOrchestrationBackend/LinkManagement/Test_001_LinkCreation.spec.ts
npm run test:target:qa -- tests/ProcessOrchestrationBackend/LinkManagement/Test_001_LinkCreation.spec.ts
npm run test:target:psr -- tests/ProcessOrchestrationBackend/LinkManagement/Test_001_LinkCreation.spec.ts
```

5. Debug a run

```bash
npm run test:debug
```

## NPM Script Catalog

Scripts are defined in [package.json](package.json). Common groups:

| Group | Examples |
|---|---|
| Environment runs | `test:interop`, `test:qa`, `test:psr` |
| PO UI suites | `test:interop:poui`, `test:interop:poui:powerbar`, `test:interop:poui:processbatch`, `test:interop:poui:scope`, `test:interop:poui:actionitems`, `test:interop:poui:calendar`, `test:interop:poui:other` |
| PO backend suites | `test:interop:pobackend:actionitem`, `test:interop:pobackend:calendar`, `test:interop:pobackend:linkmanagement`, `test:interop:pobackend:migration`, `test:interop:pobackend:processbatch` (also `test:qa:pobackend:*`) |
| STAGE (Gravitee, backend smoke only) | `test:stage:pobackend:smokebatch`, `test:target:stage` |
| Parallel backend batches | `test:interop:pobackend:parallel`, `test:qa:pobackend:parallel` |
| Pages & Blocks | `test:interop:pagesAndBlocks` |
| Targeted spec | `test:target`, `test:target:qa`, `test:target:psr` |
| Debug | `test:debug` |
| Sauce Labs | `sauce:interop`, `po-ui:sauce:interop`, `test:interop:saucelabs`, `test:interop:saucelabs:pagesAndBlocks` |
| Visual | `test:visual`, `test:visual:update`, `test:visual:sauce` |
| Performance (Sauce) | `sauce:performance:interop`, `sauce:performance:psr` |
| Reporting | `generate-allure`, `open-allure`, `report`, `clean-reports` |
| AI authoring | `snapshot` (capture a cleaned DOM + ARIA snapshot of a live page for POM drafting) |

### Parallel PO Backend Batches

`test:interop:pobackend:parallel` (and the QA variant) run via [scripts/run-po-backend-batches-parallel.js](scripts/run-po-backend-batches-parallel.js). This launches the six ProcessOrchestrationBackend batches (action item, calendar, link management, migration, process batch, UI fields) concurrently, each with `workers=1` except migration which uses `workers=2`, and aggregates the exit codes. On QA the migration batch is skipped, as in the nightly workflow: it isn't supported there, and `test:qa:pobackend:migration` exits with an error that points to the INTEROP script.

### Performance Testing

UI performance metrics are collected through [configs/performance-test.config.ts](configs/performance-test.config.ts) and the performance utilities in [util/](util/) (`performance.metrics.util.ts`, `performance.metrics.enhanced.util.ts`, `performance.test.utils.ts`), with output rendered from [templates/performance-report.template.ts](templates/performance-report.template.ts). Protocol-level API load tests live in the sibling `jmeter/` folder. Run performance suites on Sauce Labs with `sauce:performance:interop` or `sauce:performance:psr`.

## MCP Server Setup (Workspace)

This repository includes a workspace MCP configuration in .vscode/mcp.json that enables the Playwright MCP server:

- Server name: playwright
- Command: npx -y @playwright/mcp

To start using it in VS Code:

1. Open Command Palette.
2. Run: MCP: List Servers.
3. Start the playwright server and trust it.
4. In chat, open tool picker and enable playwright tools.

## Custom Agent and Prompts

This repository includes Copilot customizations under `.github/`.

Playwright agents (`.github/agents/`):

- playwright-api-tester.agent.md
- playwright-autopilot.agent.md
- playwright-healer.agent.md
- playwright-planner.agent.md
- playwright-test-author.agent.md

Slash prompts (`.github/prompts/`):

- autopilot-playwright.prompt.md
- create-playwright-api-test.prompt.md
- create-playwright-test.prompt.md
- heal-playwright-test.prompt.md
- plan-playwright-tests.prompt.md

Path-scoped and always-on rules (`.github/instructions/`):

- workflow.instructions.md (always-on: branch policy, Definition of Done, prohibited actions)
- playwright-specs.instructions.md, playwright-pom.instructions.md, playwright-api.instructions.md
- playwright-advanced-ui.instructions.md (a11y, dialogs, uploads, layout, async settling)
- testdata.instructions.md

How to use:

1. Open Chat.
2. Type / and select one of the Playwright prompts.
3. Provide requested inputs (paths, scenario, environment).
4. Let the selected agent implement and run a targeted test command.

## Autonomous MCP Cycle (Explore -> Create -> Heal)

Use the `playwright-autopilot` agent (or the `autopilot-playwright` prompt) when you want a single agent flow to:

1. Explore the application workflow (using Playwright MCP browser tools when enabled).
2. Create or update tests for the requested scope.
3. Run targeted specs.
4. Self-heal failures in focused fix/re-run loops.

Recommended invocation input:

- Base URL
- Environment (`INTEROP`, `QA`, or `PSR`)
- Feature scope and acceptance criteria
- Target test path under `playwright-e2e/tests`
- Auth/login context

## AI Authoring & Self-Healing Artifacts

The framework produces compact, token-efficient page artifacts that the authoring and healer agents consume instead of raw multi-hundred-KB DOM.

### Seed a Page Object from a live page

```bash
npm run snapshot -- <url> <page-name> [--interactive|-i] [--wait <ms>] [--auth <storageState.json>]
```

- Writes `reports/snapshots/<page-name>.html` (cleaned DOM) and `<page-name>.yaml` (ARIA tree).
- `--interactive` opens a headful browser and waits for ENTER — use it for B2C/SSO/MFA login or dynamic content.
- Auth defaults to the newest storage state under `testdata/.auth/` when `--auth` is omitted.
- Backed by [util/dom-cleaner.ts](util/dom-cleaner.ts), which strips scripts/styles/invisible nodes and keeps only locator-relevant attributes.

### Failure evidence for the healer

On a `failed`/`timedOut` test, [configs/failure-hook.ts](configs/failure-hook.ts) (wired as an auto fixture in [configs/fixtures.ts](configs/fixtures.ts)) captures secret-redacted evidence to fixed paths the `playwright-healer` agent reads first:

- `reports/snapshots/failure-dom.html` — cleaned DOM at the point of failure
- `reports/snapshots/failure-aria.yaml` — ARIA tree
- `reports/snapshots/failure-context.json` — test title, file, error, URL, timestamp

Per-test copies are also attached to the Playwright/Allure report. Capture is best-effort and never masks the original failure. Re-run the failing spec in isolation (`--workers=1`) before healing so the fixed-name artifacts match that run.

## Timeout Configuration

All timeouts are centralized in [constants/timeouts.ts](constants/timeouts.ts) with the following tiers:

| Tier | Value | Use Case |
|------|-------|----------|
| TINY | 2000ms | Micro-waits, brief settle delays |
| SHORT | 5000ms | Quick UI interactions, element presence |
| MEDIUM | 10000ms | Form field rendering, simple dropdowns |
| LONG | 15000ms | Modal dialogs, complex card rendering |
| XLARGE | 30000ms | Async operations, bulk operations |
| EXTREME | 60000ms | Slow CI, stress conditions |
| ACTION | 60000ms | Default Playwright action timeout |
| TEST | 900000ms | Global test timeout |
| POLL_INTERVAL | 500ms | Polling interval for custom waits |
| TYPE_CHAR_DELAY | 50ms | Per-character delay when typing |
| POST_INPUT_SETTLE | 200ms | Settle delay after input |

### Override Timeouts for Slow CI Runners

Set the `PW_TIMEOUT_MULTIPLIER` environment variable to scale all timeouts proportionally:

```bash
# Scale all timeouts by 1.5x for slow runners
PW_TIMEOUT_MULTIPLIER=1.5 npm run test:interop

# Example: getTimeout('XLARGE') = 30000 * 1.5 = 45000ms
```

### Using Timeout Constants in POMs

```typescript
import { getTimeout, TIMEOUTS } from '../constants/timeouts';

// Parameterized (scales with multiplier)
await locator.waitFor({ timeout: getTimeout('LONG') });

// Direct constant (also scales)
await page.waitForTimeout(TIMEOUTS.SHORT);
```

## Network Artifact Mode

Network capture runs for each test via shared fixtures, and artifact persistence is controlled by the `PW_NETWORK_ARTIFACT_MODE` environment variable.

Allowed values:

- `always`: write and attach network logs for every test.
- `failure-only`: write and attach network logs only for unexpected outcomes (default).
- `never`: do not write or attach network logs.

Default behavior:

- `configs/setup.js` sets `PW_NETWORK_ARTIFACT_MODE` to `failure-only` when the variable is missing or invalid.
- Terminal or CI values still take precedence because setup only normalizes and validates the provided value.

Examples:

```powershell
# PowerShell (current shell)
$env:PW_NETWORK_ARTIFACT_MODE = "always"
npm run test:interop

$env:PW_NETWORK_ARTIFACT_MODE = "never"
npm run test:qa
```

```bash
# Linux/macOS shell
PW_NETWORK_ARTIFACT_MODE=failure-only npm run test:interop
```

## Environment Variables

Environments, hosts and endpoints are defined once in [configs/env/](configs/env/): one row per environment in `environments.ts` and one row per endpoint in `endpoints.ts`. `configs/setup.js` applies them to `process.env` at startup and prints the `[setup] ...` lines. Utils read them through `getConfig()` / `endpoint()` from `configs/env`. To add an environment, add a row to `ENVIRONMENTS` (the compiler insists on every field), any endpoint overrides it needs, and `testdata/<PSENV>/`, then run `npm run test:config` and `npm run env:parity` (compares every `ENVIRONMENT` × `URL_MODE` × `GATEWAY_TYPE` combination with `origin/main`).

> [!WARNING]
> **Run safety (T1.1 / T1.2):** `tests/DataSetupBatch/**` changes or deletes shared data, so it is excluded from every run unless `ALLOW_DESTRUCTIVE=true`. A bare `npm run test:interop`, `test:qa` or `test:psr` still selects every other spec, which is long and touches shared environments, so prefer a folder path (e.g. `npx playwright test tests/PlanningSpace/PowerBar`) or a suite. Set `ALLOW_DESTRUCTIVE=true` only for the single command that is meant to run DataSetup.

| Variable | Purpose |
|---|---|
| `ENVIRONMENT` | Target environment: `INTEROP` (default), `QA`, `PSR`, or `STAGE`; any other value fails at startup. Selects portal URL, realm, and test data. `STAGE` is Gravitee-only (realm `cbprndsg-demo`, forced over any `REALM_KEY`/`REALM_NAME`/`REALMS`; creds `STAGE_GRAVITEE_CLIENT_ID`/`STAGE_GRAVITEE_CLIENT_SECRET`; host overrides only via `STAGE_GRAVITEE_API_BASE_URL`/`_AUTH_URL`/`_PORTAL_URL`/`_DOMAIN_SUFFIX`, never the generic `GRAVITEE_*` ones) and is onboarded for the PO backend smoke batch. |
| `URL_MODE` | `OLD` (default, `cbp/<env>/...` paths) or `NEW` (short `po/api/v1`-style paths). NEW is discontinued and exists for `QA` and `INTEROP` only; `PSR` and `STAGE` use OLD and log a `[setup]` warning. |
| `GATEWAY_TYPE` | `AZURE` (default) or `GRAVITEE`. `STAGE` is always `GRAVITEE`. |
| `SUITENAME` | Resolves a suite manifest from `tests/TestSuites/*.json` to scope the spec list; unknown name fails fast. When unset or empty, no suite is selected (runs by CLI path or filters; a bare run lists every spec except `DataSetupBatch`, see `ALLOW_DESTRUCTIVE`). Any `DataSetup*` suite fails fast without `ALLOW_DESTRUCTIVE=true`. |
| `USE_SPECIFIC_TESTS` | When `true`, runs specs specified by `SPECIFIC_TESTS` or `configs/specific-tests.local.json`; fails fast if neither is configured. Otherwise resolves specs from `SUITENAME` (or runs by CLI path/filters if no suite). |
| `ALLOW_DESTRUCTIVE` | `true` lets a run include `tests/DataSetupBatch/**`, which change or delete shared data (wipers, seeders and resets). Without it those specs are ignored for every selection: a bare run, an explicit path, `SPECIFIC_TESTS`, and the Sauce config. Any `DataSetup*` suite fails at config load, and the five migration-realm deletes (`ProcessOrchestration/Test_002`, `Test_004`–`Test_007`) also refuse in `beforeAll` unless the active environment's own row in `configs/env/environments.ts` defines their realm variables (QA and INTEROP do; PSR and STAGE don't, and values left over in `.env` don't count). On QA and INTEROP the flag is the only guard (`util/destructive-guard.util.ts`). CI sets it only on the PS UI workflow's "Run DataSetup Tests" step, the `allow-destructive` input of `playwright-custom-tests`, and the `pr-checks` list step (which runs nothing). `pr-checks` also lists without the flag and fails if any `DataSetupBatch` spec appears. **Don't keep it in your `.env`;** set it for a single command. |
| `SPECIFIC_TESTS` | Comma-separated spec paths or globs used when `USE_SPECIFIC_TESTS=true`. If unset, falls back to `configs/specific-tests.local.json`. |
| `PW_RETRIES` | Number of test retries for failed tests (defaults to `1` in CI, `0` locally). Configurable in GitHub Actions via `workflow_dispatch`. |
| `PW_ENABLE_HTML_REPORT` | Enables native Playwright HTML report generation and upload (`true`/`false`). Default is `false` in CI to conserve runner time and artifact size, and `true` locally. |
| `PW_REPORT_TAG` | Tag used to scope `reports/html-report/<tag>`, `reports/monocart-report/<tag>`, and `test-results/<tag>` during concurrent batch execution so processes do not overwrite each other. |
| `PW_DISABLE_INLINE_ALLURE_FILTER` | Set to `true` during concurrent multi-process runs (e.g. PO backend parallel batches) to disable the inline reporter cleanup and prevent race conditions; the post-run script executes cleanup once when all batches complete. |
| `PW_TIMEOUT_MULTIPLIER` | Scales every timeout tier (see Timeout Configuration). |
| `PW_NETWORK_ARTIFACT_MODE` | Controls network log persistence: `always`, `failure-only` (default), or `never`. |
| `PW_PAGE_CACHE_SCOPE` | Reuses page/context per worker and file for faster serial flows. |
| `PW_UNASSERTED_CHECKS` | What happens when a test passes although a `compareTwoValues` check in it failed: `warn` (default until T3.2 ends) adds an `unasserted-check` annotation and a WARNING log line, `fail` fails the test and names the check, `off` does nothing. A failing test always gets a `failed-checks` annotation naming its failed checks. A check that fails in `beforeAll` or `afterAll` always gets a `hook-failed-check` annotation instead; this switch does not apply to it. |
| `TZ` | Time zone for runs (suites default to `Australia/Adelaide`). |
| `DEBUG` | Enables verbose/debug behavior alongside `npm run test:debug`; defaults to `true`, an incoming value wins. |
| `PERFORMANCE_RUN_ITERATIONS` | Iterations for performance specs; defaults to `3`, an incoming value wins. |

Authentication state is created once per realm/user by [configs/global-setup.ts](configs/global-setup.ts) via the OIDC login flow in [util/oidc-login.helper.ts](util/oidc-login.helper.ts) and persisted under `testdata/.auth/` for reuse across specs (`user1` / `user2`).

---

## Test Reporting, Artifacts & GitHub Pages Optimization

### Reporting Strategy (Local vs. CI)
- **Local Runs**: All 3 reporters run by default:
  - Playwright HTML Report (`reports/html-report/index.html`)
  - Monocart Interactive Single-File Report (`reports/monocart-report/index.html`)
  - Allure Results (`reports/allure-results/`)
- **CI Runs**:
  - `monocart-reporter` and `allure-playwright` run by default for every CI schedule and dispatch.
  - Native Playwright HTML report is **disabled by default** (`enable-html-report: 'false'`) to eliminate redundant generation overhead. It can be enabled on demand in any workflow via `workflow_dispatch`.

### GitHub Pages Disk Space Optimization
Playwright traces (`trace.zip`, 20–80 MB each) and videos (`*.webm`), when attached to Allure results, are uncompressed binaries that quickly inflate the `gh-pages` branch history:
1. **Trace & Video Filtering**:
   - [scripts/strip-allure-traces.js](scripts/strip-allure-traces.js) and [configs/allure-trace-filter.ts](configs/allure-trace-filter.ts) strip trace and video attachment entries from Allure `*-result.json` files and unlink the binaries from `reports/allure-results/` before deployment to `gh-pages`.
   - Legitimate test diagnostic ZIP files (e.g. `<uuid>-attachment.zip`) and screenshots are safely preserved.
2. **Offline Triage Assets**:
   - Traces and video recordings are saved into `test-results/` and uploaded as a dedicated GitHub Actions run artifact (`playwright-assets`).
   - Developers can download full Playwright traces from the GitHub Actions run summary anytime and inspect them using `npx playwright show-trace <trace.zip>`.
3. **Trace Recording Tuning**:
   - Traces are recorded with `sources: false` and `attachments: false` to reduce file sizes.
   - Trace mode is dynamically set to `(process.env.CI && retries > 0) ? 'on-first-retry' : 'retain-on-failure'`.

### Concurrent Batch Isolation
When executing parallel Playwright processes on a single runner (e.g., `test:interop:pobackend:parallel`):
- Each process sets `PW_REPORT_TAG=<batch>` (e.g., `actionitem`, `calendar`, `migration`).
- Output directories are isolated per batch: `test-results/<batch>`, `reports/html-report/<batch>`, and `reports/monocart-report/<batch>`.
- Playwright's startup directory clean only clears its own subfolder, preventing batches from clobbering each other's traces or videos.
- `strip-allure-traces.js` runs once after all parallel children have exited, ensuring thread-safe, atomic Allure result processing.

## Run Status & Quality Gates

Every test execution step in CI uses `continue-on-error: true` so that failure artifacts, Allure results, and GitHub Pages reports always publish regardless of test outcome. Quality gates are enforced in dedicated final jobs (`run-verdict` or `outcome-gate`) that run **after** report deployment (`needs: [generate-report, deploy-pages]`).

| Workflow Type | Workflows | Gate Mechanism | Configuration Variables | Default Mode |
|---|---|---|---|---|
| Functional | `playwright-po-backend-suite.yaml`<br>`playwright-po-iop-ui-local-suite.yaml`<br>`playwright-ps-iop-ui-local-suite.yaml` | `run-verdict` job via `scripts/triage/verdict.js` (red only on unexplained failures or broken runs) | Global: `PW_VERDICT_MODE`<br>Per-suite: `PW_VERDICT_MODE_PO_BACKEND`, `PW_VERDICT_MODE_PO_UI`, `PW_VERDICT_MODE_PS_UI` | `report` |
| Visual | `visual-automation-test.yaml` | `run-verdict` job via `scripts/triage/verdict.js` (`--suite VISUAL-<suite>`, `--check-count false`) | Global: `PW_VERDICT_MODE`<br>Per-suite: `PW_VERDICT_MODE_VISUAL` | `report` |
| Performance | `playwright-performance.yaml` | `outcome-gate` job inspecting test step `outcome` | `PW_OUTCOME_GATE` | `report` (enforces when set to `enforce`) |
| Custom Dispatches | `playwright-custom-tests.yaml` | `outcome-gate` job inspecting test step `outcome` | `PW_OUTCOME_GATE` | `enforce` (fails on test failure unless set to `report`) |

### Switching Modes

- **Global Enforcement**: `gh variable set PW_VERDICT_MODE --body enforce`
- **Staged Functional Rollout**: Set per-suite variables (e.g. `gh variable set PW_VERDICT_MODE_PO_BACKEND --body enforce`) as defect registries (`triage/known-issues.json` and `triage/quarantine.json`) achieve 10 consecutive green nights.
- **Rollback**: `gh variable set PW_VERDICT_MODE --body report` (immediate, no code change required).

## Formatting Defaults

Use these defaults for generated or migrated Playwright code:

- Function and method parameters should be on a single line.
- Indentation should use 2 spaces (`spaces: 2`).
- Do not use tab characters for indentation.
