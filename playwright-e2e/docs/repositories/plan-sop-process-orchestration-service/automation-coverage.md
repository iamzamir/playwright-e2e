# Automation coverage — plan-sop-process-orchestration-service

Endpoint coverage: **59 of 144 active routes exercised (41.0%)** on the coverage dashboard (2026-10-05; was 16.4% on 2026-08-31). 18 untested routes are used by lui or planning-mfe (P1).

## Backend API specs
| Feature | Specs | Tests | Suite JSON |
| --- | --- | --- | --- |
| Process start/stop | `ProcessOrchestrationBackend/ProcessBatch/Test_001_ProcessApiStartStop`, `Test_004_ProcessApiStartStopTwice` | 13 + 6 | `POBackendProcessBatch.json` |
| Process lifecycle CRUD | `ProcessBatch/Test_005_ProcessLifecycleCrud` | 16 | `POBackendProcessBatch.json` |
| Process / subprocess attributes | `ProcessBatch/Test_002_ProcessAttribute`, `Test_003_SubprocessAttribute` | 14 + 12 | `POBackendProcessBatch.json` |
| Process search (PO-03) *(new)* | `ProcessBatch/Test_006_ProcessSearch` | 17 | `POBackendProcessBatch.json` |
| Context and scope (PO-04 – PO-06) *(new)* | `ProcessBatch/Test_007_ProcessContextAndScope` | 19 | `POBackendProcessBatch.json` |
| Details reads — tree, children, Gantt, users, KPIs, entity (PO-07 – PO-12) *(new)* | `ProcessBatch/Test_008_ProcessDetailsReads` | 15 | `POBackendProcessBatch.json` |
| Supply chain action CRUD (PO-15 – PO-19) *(new)* | `ProcessBatch/Test_009_SupplyChainActionCrud` | 15 | `POBackendProcessBatch.json` |
| Calendars and cycles CRUD | `Calendar/Test_001_CalendarsCRUD`, `Test_002_CyclesCRUD` | 15 + 15 | `POBackendCalendarBatch.json` |
| Calendar and cycle listing (PO-13, PO-14) *(new)* | `Calendar/Test_003_CalendarAndCycleListing` | 12 | `POBackendCalendarBatch.json` |
| Action items via process context | `ActionItem/Test_001..002` (CRUD), `Test_004..005` (PO-proxy search) | — | `POBackendActionItemBatch.json` |
| ALM migration | `Migration/Test_001..009` | 74 | `POBackendMigrationBatch.json` |
| Smoke | ProcessBatch 002, 003, 005, 006, 008; Calendar 001, 002 | — | `POBackendSmokeBatch.json` |

*(new)* = added 2026-10-01 by PSR gap plan 01. Specs that need a writable process create one from a template with `util/process-fixture.util.ts` and delete it with its model, procedure, actor and IAM roles.

### Coverage by module (dashboard)
| Module | Active | Exercised | Coverage |
| --- | --- | --- | --- |
| Calendar & cycle, Import/export, Job status, KPI, Node attributes, Supply chain actions | 29 | 29 | 100% |
| Action item proxy | 9 | 7 | 77.8% |
| Process | 28 | 16 | 57.1% |
| Subprocess | 11 | 6 | 54.5% |
| Configuration & ALM | 7 | 1 | 14.3% |
| Tenant & onboarding, Templates, Transitions, Users & roles, Quota & metering, Reporting, Event actions, RBAC proxy, Node schedule | 60 | 0 | 0% |

## UI specs backed by this service
| Feature | Specs | Suite JSON |
| --- | --- | --- |
| Process actions / variants | `ProcessOrchestration/ProcessBatch/Test_001..009` | — |
| Calendar UI | `ProcessOrchestration/Calendar/Test_001`, `Test_002` | — |
| Power bar and context switching | `ProcessOrchestration/PowerBar/Test_001..005` | `PowerBarBatch.json` |
| Objective bar | `ProcessOrchestration/ObjectiveBar/Test_001` | `ObjectiveQuickLinksViewSearchBatch.json` |
| View search | `ProcessOrchestration/ViewSearch/Test_001..003` | `ObjectiveQuickLinksViewSearchBatch.json` |
| Quick links | `ProcessOrchestration/QuickLinks/Test_001` | `ObjectiveQuickLinksViewSearchBatch.json` |
| Scope | `ProcessOrchestration/ScopeBatch/Test_001..003` | `ScopeBatch.json` |
| View manager | `ProcessOrchestration/ViewManagerBatch/Test_001` | `ViewsBatch.json` |
| Action items UI | `ProcessOrchestration/ActionItemsBatch/Test_001..004` | — |

## Data setup specs
| Spec | Effect |
| --- | --- |
| `DataSetupBatch/ProcessOrchestration/Test_001_DeleteProcesses` | Removes all test processes |
| `Test_002_DeleteProceduresStartingWithTestprocessforMig` | Clears migration leftovers |
| `Test_005_DeleteAllCalendars` | Clears calendars |
| `Test_006_DeleteAllAssumptionKpis` | Clears assumption KPIs |
| `Test_007_DeleteAllSupplyChainActions` | Clears SCAs |
| `Test_008_DeleteUnusedProcessRoles` | Clears orphan roles |
| `DataSetupBatch/UIDataReset/Test_003_CleanupProcess` | Per-run process reset |

## Coverage gaps
| Gap | Risk | Suggested spec |
| --- | --- | --- |
| **Transitions** (`/process/{p}/transition`, `/transition-options`, `/transitionhierarchy`, subprocess variants) — lui-used, P1 | High | Transition options → apply → poll `/transitionJob/{jobId}/status` |
| **Subprocess start/stop** — lui-used, P1 | High | Mirror `Test_001` for subprocesses |
| `POST /process`, `PUT /process/{p}`, `PUT .../calendarcycle/{cycle}/reschedule` — lui-used, P1 | High | Create/update contract; reschedule writes `node_schedule` rows |
| `POST /process/{p}/validate/{entity}` — mfe-used, P1 | Medium | Use `isAsync=false` for a synchronous check |
| Action-item proxy bulk (`.../actionitem/bulk`) — lui-used, P1 | Medium | Partial-failure contract |
| Templates (`/template/**`, `/template-entity`) — mfe-used | Medium | Direct read + schema validation spec |
| Quota and metering (`/quota/**`, `/meter/**`) | Medium — limits are enforced silently | Backend spec asserting 4xx when a quota is exceeded |
| Insights and subscriptions (`/insight/**`) | Medium | Subscribe → trigger → assert insight payload |
| Event actions (`/process/{name}/eventAction/**`) | Medium — RBAC is currently commented out in source | Contract + authorization spec |
| Node schedules (`/nodeschedule`) | Medium | Schedule creation and reschedule assertions |
| Reporting config (`/reporting/config/**`) | Low | CRUD contract spec |
| Tenant onboarding (`/tenant/onboard`) | High if it regresses, but environment-scoped; no current UI caller | Smoke check in `POBackendSmokeBatch` |

The full list of the 18 PO P1 rows is on `docs/Coverage/backend-api-coverage-dashboard.html`.

## Risk ranking
| Area | Risk | Reason |
| --- | --- | --- |
| Process start/stop | High | Async, polled, and a prerequisite for most UI specs |
| Transitions | High | lui-used, async, zero backend coverage |
| ALM migration | High | Two realms, multipart upload, long-running jobs, 10MB ceiling; error `2104` now surfaces a missing ALM customer instead of a hang |
| RBAC `@PreAuthorize` | High | Silent 403s look like functional failures; unknown process names return 401 on guarded routes |
| Calendar/cycle | Medium | Fully covered but date-sensitive |
| Context, scope, search, SCA | Medium | Now covered; several known defects (PO-D01–D10) are documented rather than asserted |
| Attributes | Low | Fully covered by backend specs |
