# Coverage matrix

Automation coverage across all eight repositories, derived from `tests/**` and each repo's source. Last reviewed 2026-10-05.

For endpoint-by-endpoint backend coverage, use the generated dashboard `../Coverage/backend-api-coverage-dashboard.html` (`npm run docs:api-coverage`); this page summarises it.

## Coverage by repo
| Repo | Type | Direct specs | Surface | Endpoint coverage | Assessment |
| --- | --- | --- | --- | --- | --- |
| [plan-sop-planning-mfe](plan-sop-planning-mfe/automation-coverage.md) | Frontend | 126 | 14 pages, 24 components, 1,083 test IDs | — | Strong |
| [plan-sop-lui](plan-sop-lui/automation-coverage.md) | Frontend | 29 | 13 components, 910 test IDs | — | Moderate |
| [plan-sop-process-orchestration-service](plan-sop-process-orchestration-service/automation-coverage.md) | Backend | 21 (+2 AI-proxy) | 25 controllers, 144 active routes | 59 / 144 (41.0%) | Moderate |
| [plan-sop-link-management](plan-sop-link-management/automation-coverage.md) | Backend | 17 | 10 controllers, 30 active routes | 21 / 30 (70.0%) | Strong |
| [plan-sop-actionitem](plan-sop-actionitem/automation-coverage.md) | Backend | 8 | 14 controllers, 73 active routes | 13 / 73 (17.8%) | Weak-moderate |
| [plan-sop-ui-fields-service](plan-sop-ui-fields-service/automation-coverage.md) | Backend | 2 | 9 controllers, 28 active routes | 4 / 28 (14.3%) — the 4 lui uses | Narrow |
| [plan-sop-po-be-commons](plan-sop-po-be-commons/automation-coverage.md) | Library | 0 | `/ops/**` controller (+ a sample `/hello`) | — | N/A by design |
| [plan-sop-ui-automation](plan-sop-ui-automation/automation-coverage.md) | Automation | 226 total | 22 POMs, 22 utils, 21 suites | 97 / 275 (35.3%) | — |

Backend endpoint coverage was 45 / 304 (14.8%) on 2026-08-31; the PSR gap plans 01–04 added 15 backend specs on 2026-10-01.

## Suite → repo
| Suite JSON | Primary repo |
| --- | --- |
| `CardsBatchA.json`, `CardsBatchB.json` | Planning Space MFE |
| `ScenarioBatchA.json`, `ScenarioBatchB.json` | Planning Space MFE |
| `DrillThroughBatch.json` | Planning Space MFE |
| `OnDemandMaasBatch.json` | Planning Space MFE |
| `SupplyChainActionsBatch.json` | Planning Space MFE |
| `PSSmokeBatch.json` | Planning Space MFE |
| `ViewsBatchA.json`, `ViewsBatchB.json` | Link Management (via both UIs) |
| `ScopeBatch.json` | Link Management (via both UIs) |
| `WorkflowFilterAndDuplicateViewsBatch.json` | Link Management (via Planning Space) |
| `ObjectiveQuickLinksViewSearchBatch.json` | Both frontends |
| `PowerBarBatch.json` | Both frontends |
| `POBackendProcessBatch.json` | PO service |
| `POBackendCalendarBatch.json` | PO service |
| `POBackendMigrationBatch.json` | PO service + Link Management |
| `POBackendActionItemBatch.json` | Action Item (Test_004/005 via the PO proxy) |
| `POBackendLinkManagementBatch.json` | Link Management |
| `POBackendUIFieldsBatch.json` | UI Fields |
| `POBackendSmokeBatch.json` | All backends (24-spec subset) |
| `DataSetup.json` | All backends (**destructive**, 9-spec subset) |

## Environment coverage
| Area | INTEROP | QA | PSR |
| --- | --- | --- | --- |
| PlanningSpace | ✅ | ✅ | ❌ |
| ProcessOrchestration | ✅ | ✅ | ❌ |
| ProcessOrchestrationBackend | ✅ | ✅ | ⚠️ no UIFields; ActionItem Test_001–003 only |
| DataSetupBatch | ✅ | ❌ | ❌ |
| Performance | ✅ | ❌ | ✅ |
| VisualAutomation | ✅ | ✅ | ❌ |
| VisualBaseValidations | ✅ | ❌ | ❌ |

From the `testdata/<ENV>/` tree. INTEROP is the reference environment. Nightly backend runs cover INTEROP and QA on both `AZURE` and `GRAVITEE`.

## Priority gaps
Ranked by risk × effort.

### 1. UI-used backend endpoints with no test — *high, medium effort*
23 routes called by lui or planning-mfe have no backend spec: PO transitions (5), subprocess start/stop, `POST/PUT /process`, cycle reschedule, `validate`, AI bulk/status/page-summary, templates. Listed as P1 on the coverage dashboard. (`GET /page/filter` on that list is a false positive — lui's call site is commented out.)

### 2. Accessibility — *high, low effort*
No a11y assertions anywhere across 155 functional UI specs. An Axe scan in the smoke suites establishes a baseline cheaply.

### 3. Action Item playbooks — *high, medium effort*
18 endpoints, all RBAC-gated, with scheduled recurring execution. Completely untested; the service now computes playbook "today" in UTC (ABPIBP-7362).
→ [Detail](plan-sop-actionitem/automation-coverage.md#coverage-gaps)

### 4. LUI settings and lever-based planning — *medium-high, medium effort*
Assumption types, schedule & structure, node transitions and `LeverBasedPlanning` have no UI coverage.
→ [Detail](plan-sop-lui/automation-coverage.md#coverage-gaps)

### 5. UI Fields beyond page config — *medium, medium effort*
Page config (the 4 lui routes) is now covered. Attributes, UI-field CRUD, RBAC and the component registry are not; they are tenant-wide, so specs must be serial with teardown.
→ [Detail](plan-sop-ui-fields-service/automation-coverage.md#coverage-gaps)

### 6. commons version-drift check — *medium, very low effort*
All four consumers pin `2dacec2-SNAPSHOT` today, but only by convention (they differed until 2026-09-17). A CI check keeps them aligned.
→ [Detail](plan-sop-po-be-commons/automation-coverage.md#recommended-additions)

### 7. `createdBy` / `updatedBy` assertions — *medium, very low effort*
Add audit-column assertions to existing backend CRUD specs to catch authentication-context bugs that currently pass silently.

### 8. PO service — quotas, insights, templates, event actions, reporting — *medium, medium effort*
60 active routes across these controller groups have 0% coverage.
→ [Detail](plan-sop-process-orchestration-service/automation-coverage.md#coverage-gaps)

### 9. Link Management entity-validation job — *medium, low effort*
`POST /validate` plus its polling endpoint are async and untested.

### 10. Visual coverage breadth and PSR/QA test data — *medium*
3 visual specs against 155 functional UI specs; missing data files mean specs silently cannot run in PSR and QA.

## Untested surface by repo
| Repo | Untested areas |
| --- | --- |
| UI Fields | Attributes, UI-field CRUD, RBAC, component registry, `filter-config`, page registry, rules, subscriptions (deprecated) |
| Action Item | Playbooks, comments, bulk/status (UI-only), direct `/searchActionItems`, KPI entity mapping, attribute/UI-field config |
| PO service | Transitions, subprocess start/stop, process create/update, quotas/metering, insights, reporting, event actions, templates, node schedules, tenant |
| Link Management | Validation jobs, tenant/user, Kafka events |
| LUI | Lever-based planning, settings screens, pagination, a11y, iframe, cache staleness |
| Planning Space MFE | A11y, guided workflow sort, playbooks UI, action planner, shortcuts, i18n, config-cache staleness, alert paths |
| po-be-commons | Audit events, realm allowlist, version drift, codec boundary |

Closed since 2026-09-16: UI Fields page config (4 routes), AI templates/KPIs/editor/filters/PO-proxy search, LM `lm-search/v2`/favourites/global preset, PO search/context/scope/details/SCA/calendar listing.

## Currently quarantined
Excluded via `TEST_IGNORE` — open items, not permanent exclusions.

| Spec |
| --- |
| `ProcessOrchestration/PowerBar/Test_003_PowerBarForAssumptionInPO.spec.ts` |
| `ProcessOrchestration/ProcessBatch/Test_002_AdoptVariantWhileCreateEditProcess.spec.ts` |
| `ProcessOrchestration/ViewSearch/Test_003_ViewSearchForAssumptionInPO.spec.ts` |

## Regenerating this matrix
Backend endpoint numbers come from `npm run docs:api-coverage` (see `.agents/learnings.md` → *Docs and diagrams*). The per-repo `metadata.json` files carry the structured facts (`automation.specGlobs`, `automation.testSuites`, `automation.untestedAreas`, `automation.endpointCoverage`); spec counts come from `tests/**`, and test-ID counts from the snippet at the bottom of each `ui-inventory.md`.
