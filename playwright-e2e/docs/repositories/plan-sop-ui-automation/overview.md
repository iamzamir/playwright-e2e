# UI & API Automation Framework

| Field | Value |
| --- | --- |
| Repository | `plan-sop-ui-automation` |
| GitHub | `BY-Product-Development/plan-sop-ui-automation` |
| Type | Test Automation |
| Primary framework | Playwright Test (`@playwright/test` ^1.52) + TypeScript |
| Legacy framework | WebdriverIO (`e2e/`) — being migrated |
| Performance | JMeter (`jmeter/`) |
| HTTP client | `axios` via `util/api.util.ts` |
| Logging | `winston` |
| Reporting | Allure, Monocart, Playwright HTML |
| Cloud runs | Sauce Labs (`saucectl`) |
| Environments | `INTEROP`, `QA`, `PSR` |
| Timezone | `TZ=Australia/Adelaide` on every run |

## Purpose
End-to-end UI and API test automation for **Planning Space** and **Process Orchestration** — this repo, and the document set you are reading.

## Repository map
| Path | Contents |
| --- | --- |
| `playwright-e2e/` | **Active** Playwright framework |
| `e2e/` | Legacy WebdriverIO suite |
| `jmeter/` | PSR performance plans. `Tests/PSRGatewayTest.jmx` is the unified Azure + Gravitee plan; coverage reports and the PO phase-1 plan are in `jmeter/plans/`. Edit samplers with the `jmeter-psr-samplers` skill |
| `.agents/` | Shared agent learnings (`learnings.md`) and skills (`skills/`) |

### Inside `playwright-e2e/`
| Path | Contents |
| --- | --- |
| `tests/` | 226 specs across 6 areas |
| `tests/TestSuites/*.json` | 21 suite definitions CI executes |
| `pageobjects/` | 22 page objects; base class `pageobjects/page.ts` |
| `util/` | 22 utilities — see [framework-reference.md](framework-reference.md) |
| `configs/` | Playwright configs, fixtures, global setup/teardown, `setup.js` |
| `constants/` | `timeouts.ts` (11 tiers), `visual.ts` |
| `testdata/<ENV>/<area>/` | Per-environment test data JSON |
| `scripts/` | Codegen, spec finalization, test-case and API-coverage doc generation, parallel batch runner |
| `docs/` | Architecture, coverage (incl. `docs/Coverage/` backend API dashboard and PSR gap plans), strategy, test cases, **and these repository docs** |
| `network/`, `templates/` | Network artifacts and templates |

## Spec areas
| Area | Specs | Target repo |
| --- | --- | --- |
| `PlanningSpace/` | 126 | [`plan-sop-planning-mfe`](../plan-sop-planning-mfe/overview.md) |
| `ProcessOrchestration/` | 29 | [`plan-sop-lui`](../plan-sop-lui/overview.md) |
| `ProcessOrchestrationBackend/` | 45 | PO service, Action Item, Link Management, UI Fields |
| `DataSetupBatch/` | 19 | All backends (**destructive**) |
| `Performance/` | 4 | Planning Space |
| `VisualAutomation/` | 3 | Both micro-frontends |

## Key commands
Run from `playwright-e2e/`.

| Command | Purpose |
| --- | --- |
| `npm run test:target` | Targeted run, INTEROP, `--workers=1` |
| `npm run test:target:qa` / `:psr` | Same for QA / PSR |
| `npm run test:interop` / `test:qa` / `test:psr` | Full environment run |
| `npm run test:debug` | Playwright inspector |
| `npm run test:interop:pobackend:parallel` | Parallel backend batches via `scripts/run-po-backend-batches-parallel.js` |
| `npm run test:visual` / `:update` / `:create-baseline` | Visual suite |
| `npm run sauce:interop` / `po-ui:sauce:interop` | Sauce Labs |
| `npm run report` | Generate + open Allure |
| `npm run report:monocart` / `report:html` | Alternative reports |
| `npm run clean-reports` | Clear reports, logs, cached API tokens |
| `npm run codegen` | Environment-aware Playwright codegen |
| `npm run finalize-spec` | Post-authoring spec checks |
| `npm run docs:testcases` | **Regenerate test-case docs — required when specs are added or renamed** |
| `npm run docs:api-coverage` | Regenerate `docs/Coverage/` backend API coverage dashboard from service source + latest green CI runs (needs `gh`; in PowerShell call `node scripts/generate-api-coverage-report.js` directly to pass flags) |
| `npm run trace` | Open a trace |
| `npm run snapshot` | Save a snapshot |

Per-area scripts exist too, e.g. `test:interop:poui:calendar`, `test:qa:pobackend:linkmanagement`, `test:interop:pobackend:uifields`. Folder scripts pass `USE_SPECIFIC_TESTS=false`; set it yourself when running a folder directly, or the config's hardcoded specific-test list wins and you get "No tests found".

## Notable conventions
- 2-space indentation, spaces only — never tabs.
- Function and method parameters stay on a single line.
- Locator hierarchy: `getByRole` > `getByTestId` > `getByLabel`/`getByPlaceholder`/`getByText` > CSS. **Never XPath.**
- No inline selectors in specs — every locator lives in a page object.
- No static sleeps — use `getTimeout(tier)` from `constants/timeouts.ts`.
- New specs **must** be registered in the correct `tests/TestSuites/*.json`.
- Secrets come from `process.env` via `configs/setup.js`; never hardcoded.

## Related docs
- [architecture.md](architecture.md) — framework layering and execution lifecycle
- [framework-reference.md](framework-reference.md) — utilities, fixtures, page objects, timeouts
- [data-model.md](data-model.md) — test data and suite JSON schemas
- [environments.md](environments.md) — the full environment matrix
- [test-hooks.md](test-hooks.md) — authoring workflow and Definition of Done
- [automation-coverage.md](automation-coverage.md) — suite inventory and gaps
- [troubleshooting.md](troubleshooting.md) — framework-level failures

Repo-level guidance also lives in `AGENTS.md`, `.github/copilot-instructions.md` and `.github/instructions/*.instructions.md`. Verified gotchas are in `.agents/learnings.md`; repeatable procedures are skills in `.agents/skills/` (`jmeter-psr-samplers`, `psr-gap-api-tests`).
