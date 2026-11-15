# LUI — Process Orchestration Micro-Frontend

| Field | Value |
| --- | --- |
| Repository | `plan-sop-lui` |
| GitHub | `BY-Product-Development/plan-sop-lui` |
| Type | Micro-Frontend (React) |
| Version | `0.0.3` |
| Bundler | Vite (`vite.config.ts`), TypeScript pre-pass |
| Unit tests | Vitest (migrated from Jest — see `migrate-to-vitest.ps1`, `migrate-tests.js`) |
| In-repo E2E | **WebdriverIO** (`e2e/configs/*.conf.ts`) with Allure — legacy, being superseded by this repo's Playwright suite |
| Package registry | `@jda` / `@by` scope on JFrog |
| Source size | 322 `.tsx`/`.jsx` files |
| Test IDs | 2,178 occurrences, **910 unique** (2026-10-05) |

## Purpose
The **Process Orchestration** UI, plus the shared administration surfaces of the platform: process and subprocess management, calendars and cycles, view manager, data and attributes, settings, scenario selection, lever-based planning, and sub-navigation. It is a micro-frontend hosted in the Luminate Portal alongside Planning Space.

## Why automation cares
Target of `tests/ProcessOrchestration/**` (29 specs across 9 areas) and the visual suite. It also owns the **settings and view-manager screens** that other suites depend on for setup — for example `ViewManagerBatch/Test_001_MapPlanningViewToViewGroup`, which configures state that Planning Space specs then assert against.

Its 910 unique test IDs are documented in [ui-inventory.md](ui-inventory.md).

## npm registry setup
```bash
npm config set @jda:registry https://jdasoftware.jfrog.io/jdasoftware/api/npm/npm/
npm config set //jdasoftware.jfrog.io/jdasoftware/api/npm/npm/:_auth="<auth-token>"
npm config set email <your-jda-email>
```

## Repository layout
| Path | Contents |
| --- | --- |
| `src/Components/` | 13 feature folders (note the capital `C`) |
| `src/apis/` | `apis.ts`, `apiInfo.ts`, `useApi.ts`, **`cache.ts`** |
| `src/actions/`, `src/reducers/` | Redux-style state |
| `src/hooks/`, `src/config/`, `src/i18n/`, `src/static/` | Hooks, config, localization, assets |
| `e2e/` | **Legacy WebdriverIO suite** — do not extend; new coverage belongs in `playwright-e2e/` |
| `.github/envs/*.env` | 16 per-environment runtime configs |

## Build and run
```bash
npm install
npm start                     # setLocalEnv && vite
npm run start:local           # mock + LUI + Luminate Portal
npm run start:local:noauth    # auth bypassed
npm test                      # Vitest + coverage
npm run lint:fix
```

Build modes: `qa`, `qa_dev` (`build-posales`), `development`, `integration`, `psr`, `demo`, `prodstg`, `plpstgeu`, `prodpreview`, `production`, `security`, `pmg`, `release`, plus the four `plpval*` and four `plp*` regional targets.

Runtime config is generated into `public/` by `setRuntimeEnv.js`, exactly as in [Planning Space](../plan-sop-planning-mfe/environments.md#local-run).

## Legacy WDIO scripts
| Script | Purpose |
| --- | --- |
| `npm run wdio` | Local Chrome |
| `npm run wdio:saucelabs` | Sauce Labs |
| `npm run wdio:saucelabs:ios` | Mobile availability |
| `npm run openReports` / `showReport` | Allure |

Timezone is pinned to `Australia/Adelaide` in these scripts. Present for reference only — new tests belong in `playwright-e2e/`.

## Key dependencies
| Package | Version | Role |
| --- | --- | --- |
| `@by/lui-dashboard-library` | 10.10.4 | Dashboard rendering |
| `@by/lui-dashboard-scaffolding-core` | 2.25.1 | Scaffolding |
| `@by/lui-dashboard-scaffolding-components` | 0.11.1 | Scaffolding components |
| `@by/lui-vertical-filter-component` | 3.25.5 | Vertical filter |
| `@by/lui-quick-filter-library` | 3.1.1-rc.1 | Quick filter (was 2.3.1) |
| `@by/lui-settings-ui-library` | 1.2.5 | Settings UI |
| `@by/experience-system` | 1.1.1 | Design system |
| `@by/plan-sop-ui-library` | 2026.4.3 | Shared Plan SOP UI (was 1.1.277; new view/scenario UI now permanent) |
| `@jda/lui-common-component-library-mui5` (CCL) | 3.12.2 | `lui-ccl-*` components (was 3.12.0) |
| `highcharts` | 11.4.8 | Charts (was 10.3.3) |
| `yfiles` | ^26.0.5 | Graph rendering |

Most of these match Planning Space exactly (dashboard library, quick filter, settings UI, experience system, CCL), so `lui-*`/`lui-ccl-*` test IDs are mostly shared. Scaffolding, `lui-vertical-filter-component` (3.25.5 here, 3.25.7 in Planning Space) and `plan-sop-ui-library` (2026.4.3 vs 2026.4.4) differ.

## Upstream dependencies
| Target | Purpose |
| --- | --- |
| `plan-sop-process-orchestration-service` | Processes, calendars, templates, SCA |
| `plan-sop-link-management` | View manager, mappings, presets |
| `plan-sop-ui-fields-service` | PO listing columns/filters, process/subprocess/calendar details, process/subprocess/template/calendar/cycle editors (4 routes via `src/config.ts` keys) |
| Assumptions service | Assumption types (Data & Attributes), assumptions, Gantt |
| `plan-sop-actionitem` | Action item list and detail |

## Recent changes (since 2026-09-16)
| Change | Ticket | Test impact |
| --- | --- | --- |
| Old Scenario and View UI retired; the new view UI is permanent (feature-flag branch removed, `NAV_BACK` always filtered from side-nav items, assumption chips always use the entity chip type) | ABP-19158 | Locators for the old side-nav/drawer are gone: `drawer-close-btn`, `drawer-open-btn`, `pinned-icon`, `unpinned-icon`, `category-List`, `child-category`, `ArrowChevronDownIcon` no longer exist in lui source. `drawer-close-btn`, `pinned-icon` and `unpinned-icon` still exist in planning-mfe, which is where `planning.page.ts`/`scope.page.ts`/`scenario.page.ts` use them |
| UI cache preferences now read/write `${luiURL}/uiConfiguration/v1/configuration` (new `cachePreferences` key) so save and read hit the same service | SM-40685 | Cached UI configuration should now persist across reloads |
| Delete container URL → `${luiURL}/dashboard/v2/dashboards/containersRealm/{id}/` | ABP-19225 | View/container deletion from the view manager |
| Action item form field-label style fix | ABP-19177 | Visual baselines of the action item modal may shift |
| Dependency bumps: `plan-sop-ui-library` 2026.4.x, quick filter 3.1.1-rc.1, CCL 3.12.2, Highcharts 11.4.8, yfiles 26.0.5; translations | ABP-19279 and others | `lui-*`/chart DOM may change; re-check visual baselines |

New test IDs: `assumption-create`, `invalid-submit`.

## CI/CD
8 workflows. Quality gates: BlackDuck · CodeQL · Vitest coverage · ESLint · Prettier · Husky

## Related docs
- [architecture.md](architecture.md)
- [ui-inventory.md](ui-inventory.md)
- [data-model.md](data-model.md)
- [environments.md](environments.md)
- [test-hooks.md](test-hooks.md)
- [automation-coverage.md](automation-coverage.md)
- [troubleshooting.md](troubleshooting.md)
