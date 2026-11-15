# Planning Space Micro-Frontend

| Field | Value |
| --- | --- |
| Repository | `plan-sop-planning-mfe` |
| GitHub | `BY-Product-Development/plan-sop-planning-mfe` |
| Type | Micro-Frontend (React) |
| Node version | **22.13.1** (`.nvmrc`; README still says 18.19.0) |
| Bundler | Vite (`vite.config.ts`), TypeScript pre-pass (`tsc && vite build`) |
| Unit tests | Vitest (`vitest.config.ts`) + coverage |
| Lint / format | ESLint + Prettier, Husky pre-commit |
| Package registry | `@jda` / `@by` scope on JFrog (`.npmrc`) |
| Source size | 504 `.tsx`/`.jsx` files |
| Test IDs | 2,063 occurrences, **1,083 unique** (2026-10-05) |

## Purpose
The **Planning Space** UI — the planning surface where users work with dashboards, cards, scenarios, scope and filters, drill-through, supply chain actions, and interactive planning. It is a micro-frontend hosted inside the Luminate Portal and composed from Blue Yonder's `@by/lui-*` component libraries.

## Why automation cares
This is the target of the largest UI suite in the repo — everything under `tests/PlanningSpace/**` (126 specs across 21 feature folders), plus `tests/Performance/**`. Its 1,083 unique `data-testid` values are the raw material for every Planning Space page object. See [ui-inventory.md](ui-inventory.md).

## Branch policy
| Branch | Deploys to |
| --- | --- |
| `main` | QA (master code) |
| `24.1-Hardening-Release-Branch` | Release and production |

Hotfixes for PROD/release branch from `24.1-Hardening-Release-Branch` and PR back into it — **not** into `main`.

## Repository layout
| Path | Contents |
| --- | --- |
| `src/pages/` | 14 route-level pages — see [ui-inventory.md](ui-inventory.md#pages) |
| `src/components/` | 24 feature component folders |
| `src/apis/` | `apis.ts`, `apiInfo.ts`, `useApi.tsx` — all backend calls funnel through here |
| `src/reducers/` | Redux-style state |
| `src/hooks/`, `src/cache/`, `src/config/` | Hooks, IndexedDB config cache, runtime config |
| `src/e2eTesting/` | **In-repo E2E context tests** (`dashboard`, `mfeContext`) |
| `src/shortcuts/`, `src/i18n/`, `src/static/` | Keyboard shortcuts, localization, assets |
| `.github/envs/*.env` | 16 per-environment runtime configs |
| `scripts/analyze-bundle.js`, `check-chunk-init.js` | Bundle health tooling |

## Build and run
```bash
npm install --legacy-peer-deps      # required — peer deps do not resolve cleanly
npm run start-vite                  # Planning Space alone
npm run start:local                 # with mock + Luminate Portal
npm run start:local:noauth          # auth bypassed
npm test                            # Vitest + coverage
npm run lint
```

`start-vite` runs `setLocalEnv` first, which materialises `.github/envs/.env` into `public/` via `setRuntimeEnv.js`. **Runtime config is generated, not compiled in** — a stale `public/` config is a common source of "pointing at the wrong environment".

Builds allocate a large heap: `NODE_OPTIONS=--max-old-space-size=16384`.

## Key dependencies
| Package | Version | Role |
| --- | --- | --- |
| `@by/lui-dashboard-library` | 10.10.4 | Core dashboard rendering |
| `@by/lui-dashboard-scaffolding-core` / `-components` / `-cardtypes` | ^2.26.0 / 0.13.1 / 5.11.0 | Dashboard scaffolding (differs from lui) |
| `@by/lui-dashboard-ca-cardtypes-mui5` | 1.52.2 | Card types |
| `@by/plan-seq-dashboard-cardtypes-mui5` / `-calendar-` | 0.1.67 / 0.0.24 | Card types |
| `@by/plan-abp-common-cardtypes` | ^0.0.4 | Common card types (demand prioritization card; default-disabled flag) |
| `@by/plan-cdp-cardtypes`, `@by/plan-sop-cdsp-cardtypes` | 1.0.6, 0.0.101 | Card types |
| `@by/maas-scaffolding-mui5` | 26.3.13 | MaaS scaffolding |
| `@by/lui-quick-filter-library` | 3.1.1-rc.1 | Quick filter (same as lui) |
| `@by/lui-vertical-filter-component` | 3.25.7 | Vertical filter (lui is on 3.25.5) |
| `@by/plan-sop-ui-library` | 2026.4.4 | Shared Plan SOP UI (was 1.1.280) |
| `@jda/lui-common-component-library-mui5` (CCL) | 3.12.2 | `lui-ccl-*` components |
| `highcharts` | 11.4.8 | Charts (was 10.3.3) |
| `@by/lui-dashboard-crp-cardtypes-mui5` | 1.3.14 | Card types |
| `@by/lui-dashboard-cso-cardtypes` | 1.4.25 | Card types |
| `@by/jdp-sna-kg-ui-library` | 0.0.65 | Semantic Network Architect |
| `@by/experience-system` | 1.1.1 | Design system |

A version bump in any `@by/lui-*` package can change the rendered DOM and therefore break locators — see [troubleshooting.md](troubleshooting.md).

## Upstream dependencies (services it calls)
| Target | Purpose |
| --- | --- |
| `plan-sop-process-orchestration-service` | Process/subprocess context, scope, SCA |
| `plan-sop-link-management` | Which views to render, favourites, presets |
| lui platform services (`uiConfiguration/v1`, `uiRegistration/v1`, `dashboard/v2`·`v3`, `verticalFilterBff/v1`) | Dashboard/card configuration (IndexedDB-cached), containers, vertical filters |
| `plan-sop-actionitem` | My Task card, action item modals |
| MaaS / simulation / foundation model | Planning instances, scenarios, on-demand MaaS |

Planning Space does **not** call `plan-sop-ui-fields-service` (verified 2026-10-05: no `ui-fields` path anywhere in source).

## Recent changes (since 2026-09-16)
| Change | Ticket | Test impact |
| --- | --- | --- |
| Old Scenario and View UI retired; `WITH_NEW_SCENARIO_FILTER` and `WITH_NEW_VIEW_FILTER_UI` flags removed (new UI permanent) | ABP-19158 | Removed IDs: `scenario-information-column`, `scenario-list-filter-icon`, `horizon-filter-side-nav`, `plan-sop-process-details-sideNav`. Automation still toggles the two retired flags in `UIDataReset/Test_004` and some test data — harmless no-ops |
| **Dirty state on by default** | ABP-19438 | Leaving an edited view now prompts unless `WITH_DIRTY_STATE` is explicitly disabled |
| `WITH_SCENARIO_CREATION_SIGNAL` default-disabled; new `WITH_DEMAND_PRIORITIZATION_CARDS` (default-disabled) and `WITH_ENABLE_TIME_DIMENSION` flags | SM-36531, SM-39631 | Demand-prioritization cards need the flag |
| Playbooks custom date selector; My Playbooks / Guided Workflow sort-by; action-step auto-expand | ABPIBP-7534 and others | New IDs `date-range-picker`, `my-playbooks-sort-direction-btn`, `sort-direction-btn`, `scenario-chip` |
| Drill-through event now carries context | SM-39844 | `DrillThroughBatch` context assertions |
| Process display name fix; Planning Space not-loading fix; `scenario_comparison_metadata_v3`; text-truncation refactor | ABP-19731, SM-36237, SM-37412, ABPIBP-7543 | Truncated labels may render differently in visual baselines |
| Card-type, scaffolding, CCL 3.12.2, Highcharts 11.4.8 and `plan-sop-ui-library` 2026.4.4 bumps | many | Card DOM may change; re-check `CardsBatch` and visual baselines |

New in-repo docs: `docs/cache-eviction-feature.md`, `docs/BYX-Notification.excalidraw`, and an experience-system migration assessment.

## CI/CD workflows
6 workflows including `blackduck-scan.yml` and `codeql.yml`.

## Quality gates
BlackDuck · CodeQL · Vitest coverage · ESLint · Prettier · Husky pre-commit

## Related docs
- [architecture.md](architecture.md)
- [ui-inventory.md](ui-inventory.md)
- [data-model.md](data-model.md)
- [environments.md](environments.md)
- [test-hooks.md](test-hooks.md)
- [automation-coverage.md](automation-coverage.md)
- [troubleshooting.md](troubleshooting.md)
