# Automation coverage — plan-sop-actionitem

Endpoint coverage: **13 of 73 active routes exercised (17.8%)**, plus 8 reached only in setup/teardown or through the PO proxy (coverage dashboard, 2026-10-05; was 9.1% on 2026-08-31).

## Backend API specs
Active specs in `POBackendActionItemBatch.json`. Test_004–008 were added 2026-10-01 (PSR gap plan 03). `Test_003_ActionItemCRUDWithAssumptions` is unscheduled (`_unscheduled.json`) following assumption context retirement.

| Feature | Spec | Tests | Route(s) |
| --- | --- | --- | --- |
| Action item CRUD in process context | `ProcessOrchestrationBackend/ActionItem/Test_001_ActionItemCRUDWithProcess` | 7 | PO proxy `POST/PUT /process/{p}/actionitem`, `GET /actionitem/{id}` |
| Action item CRUD in subprocess context | `Test_002_ActionItemCRUDWithSubProcess` | 7 | PO proxy, subprocess variants |
| Action item CRUD on assumptions | `Test_003_ActionItemCRUDWithAssumptions` *(unscheduled)* | 7 | `POST /actionitems`, `PUT /actionitems/{id}` |
| Search through the PO process proxy (AI-08) | `Test_004_ActionItemSearchForProcess` | 13 | `POST /process/{p}/actionitem/search` |
| Search through the PO subprocess proxy (AI-09) | `Test_005_ActionItemSearchForSubprocess` | 9 | `POST /process/{p}/subprocess/{sp}/actionitem/search` |
| Editor and filter configuration (AI-01, AI-02) | `Test_006_ActionItemEditorAndFilterConfig` | 19 | `GET /actionitems/editor`, `GET /actionitems/filters` |
| Templates (AI-03) | `Test_007_ActionItemTemplates` | 8 | `GET/POST /actionitemTemplates`, `DELETE /actionitemTemplates/{id}` |
| KPI configuration CRUD (AI-04 – AI-07) | `Test_008_ActionItemKpiConfigCrud` | 23 | `GET/POST /kpis`, `GET/PUT/DELETE /kpis/{id}`, `GET /kpi/entities/{id}` |

`Test_001`, `002`, `004` and `006` are also in `POBackendSmokeBatch.json`. PSR has test data for Test_001 and Test_002.

Helpers: `ActionItemApiHelper` in `util/action-item.util.ts` (`write()` for POST/PUT/DELETE, `sendUntilStatus`/`searchUntil` for reads, `registerEntity`/`deleteEntity` for assumption-style entities). `cleanupActionItemKpis` in `util/alm-migration.util.ts`.

## Migration specs
| Feature | Spec | Suite |
| --- | --- | --- |
| Assumption and action-item KPI migration | `Migration/Test_005_AssumptionAndActionItemKPIMigration` | `POBackendMigrationBatch.json` |

## UI specs
| Feature | Specs |
| --- | --- |
| Create / edit / delete | `ProcessOrchestration/ActionItemsBatch/Test_001_CreateEditDeleteActionItem` |
| Authorization, bulk edit / delete, bulk with assigned user | `Test_002_ActionItemPermissionsAndBulkActions` |
| My Task card (Planning Space) | `PlanningSpace/CardsBatch/Test_013_MyTask` |

The UI specs exercise bulk and status routes, but no backend spec asserts them yet.

## Data setup
| Spec | Effect |
| --- | --- |
| `DataSetupBatch/ProcessOrchestration/Test_006_DeleteAllAssumptionKpis` | Clears KPI mappings owned partly by this service |
| `DataSetupBatch/UIDataReset/Test_003_CleanupProcess` | Indirectly removes attached action items |

## Coverage gaps
| Gap | Risk | Suggested spec |
| --- | --- | --- |
| **Playbooks — entire surface (18 endpoints) is untested** | High | Definition CRUD → `initiate` → instance item status → history |
| Recurring playbook initiation | High | Scheduled behaviour + ShedLock single-execution assertion |
| Bulk create/delete and bulk status (`/actionitems/bulk`, `/actionitems/status`) — lui-used, **P1** on the dashboard | High | Partial-failure contract on the returned ID list |
| `GET /actionitems/page/summary` — lui-used, P1 | Medium | Shape contract |
| Comments (`/comments`) | Medium | CRUD + `DELETE /comments/entity/{id}` cascade |
| Due-date extension (`PUT /actionitems/{id}/extend`) | Medium | Boundary and past-date validation |
| KPI entity mapping (`/kpi/entity`, `/kpi/map/entities`) | Medium | CRUD |
| Attribute / UI-field config | Medium | `/attribute-config`, `/ui-field-config` CRUD + RBAC 403 assertions |
| Direct search (`POST /searchActionItems`) — lui-used | Medium | Filter, paging, and sort contract (PO-proxy search is covered) |
| Import / export | Low | Round-trip spec (currently reached only via PO) |
| Notifications | Medium | Eventual-delivery assertion |

Playbooks are the single largest untested area in this repo.

## Known behaviour the specs rely on
- QA Azure `IntegratedBusinessPlanning` has no `actionItemEntityId`, so QA specs Test_004–008 use `ProcessWithCustomAttribute`.
- `GET /kpis/{id}` for an unknown id returns `200 {"data": null}`, not 404. `PUT /kpis/{id}` is a full replace (new attributes need `kpiId`; omitted attributes are deleted).
- PO search items have no `createdOn`; sort order is checked by relative position of two items created in sequence.
- QA Gravitee (`cbpf-test27`) can create but not delete subprocesses (401 `IBP_40_1032`), so Test_005 AI-09-P03 is skipped there.
- Known AI defects are recorded in `docs/Coverage/PSR-Gap-Plans/ActionItems-UIFields-Defect-Report.html`, not asserted.

## Risk ranking
| Area | Risk | Reason |
| --- | --- | --- |
| Playbooks | High | Large surface, RBAC-gated, scheduled execution, zero coverage |
| Bulk operations | Medium-High | Covered only through the UI; partial-failure paths not asserted |
| Authorization | Medium-High | Covered by UI `Test_002`; 403s are easy to misread as functional failures |
| Editor/filter config, templates, KPIs | Medium | Now covered by backend specs; tenant-configured, so baselines differ per environment |
| Core CRUD and PO-proxy search | Low | Well covered at both API and UI layers |
