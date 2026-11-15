# Copilot Instructions — plan-sop-ui-automation

Always-on guidance for this repository. Path-scoped rules live in `.github/instructions/`.

## What this repo is
End-to-end test automation for Planning Space & Process Orchestration.
- **`playwright-e2e/`** — active Playwright framework (`@playwright/test` ^1.52, TypeScript).
- **`e2e/`** — RETIRED legacy WebdriverIO (WDIO) suite, kept for reference only (see `e2e/RETIRED.md`). Don't add, fix or migrate specs there.
- **`jmeter/`** — performance tests. For sampler work use the `jmeter-psr-samplers` skill (`.agents/skills/`).

## Tech stack & tooling
- Test runner: Playwright Test. API calls: `axios` via `playwright-e2e/util/api.util.ts`.
- Logging: `winston`. Reporting: Allure. Cloud runs: Sauce Labs (`saucectl`).
- Environments: `INTEROP`, `QA`, `PSR` — selected via `cross-env ENVIRONMENT=<env>`.

## Repository map (playwright-e2e)
- `pageobjects/*.page.ts` — Page Object Model; base class `pageobjects/page.ts`.
- `tests/**` — specs grouped by area: `PlanningSpace/`, `ProcessOrchestration/`,
  `ProcessOrchestrationBackend/`, `DataSetupBatch/`, `Performance/`, `VisualAutomation/`.
- `tests/TestSuites/*.json` — suite globs that CI executes. New specs MUST be registered here.
- `util/` — `api.util.ts`, `common.util.ts`, `test.util.ts`, `wait-helpers.ts`.
- `configs/` — `playwright.config.ts`, `fixtures.ts`, `global-setup.ts`, `setup.js`, and `env/` (typed environment and endpoint tables, `getConfig()`).
- `constants/timeouts.ts` — centralized timeout tiers (never hardcode timeouts).
- `testdata/<ENV>/<area>/*.json` — per-environment test data.

## Global conventions (apply everywhere)
- **Indentation**: 2 spaces, spaces only — never tabs.
- **Signatures**: keep function/method parameters on a single line.
- **Locators**: prefer `getByRole` > `getByTestId`/`data-testid` > `getByLabel`/`getByPlaceholder`/`getByText` > CSS. **NEVER use XPath.**
- **No inline selectors in specs** — all locators live in page objects.
- **Timeouts**: use `getTimeout(tier)` from `constants/timeouts.ts`; never hardcode `waitForTimeout` values.
- **Waits**: replace static sleeps with deterministic conditions (`locator.waitFor`, `expect.poll`, network idle).
- **Reuse before create**: search for an existing POM method/util/fixture before adding a new one.
- **Secrets**: never hardcode credentials; read auth from `process.env` via `setup.js`.
- **Scope**: do not edit files unrelated to the task.

## Key commands (run from `playwright-e2e/`)
- Type check: `npm run typecheck`.
- Lint: `npm run lint` (update baseline: `npm run lint:baseline`).
- Validate suites: `npm run validate:suites`.
- Check testcase docs drift: `npm run docs:testcases:check` (regenerate: `npm run docs:testcases`).
- Single spec/folder: `npm run test:target` (INTEROP), `test:target:qa`, `test:target:psr`.
- Full env run: `npm run test:interop` | `test:qa` | `test:psr`.
- Debug: `npm run test:debug`. Report: `npm run report` (Allure). Clean: `npm run clean-reports`.

## Safety
- Prefer local, reversible edits. Confirm before destructive actions (deleting files, force pushes).
- Do not create documentation markdown unless explicitly requested.
- Workflow governance (branch policy, Definition of Done, prohibited actions) lives in `instructions/workflow.instructions.md` — it is always-on.
- Memory and learnings rules (shared by all IDEs and models) live in the root `AGENTS.md`.
