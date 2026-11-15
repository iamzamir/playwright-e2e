# Automation coverage — plan-sop-ui-automation

Coverage of the framework itself: what exists, how it is organised, and where the framework's own gaps are.

## Spec inventory
| Area | Specs | Primary target |
| --- | --- | --- |
| `PlanningSpace/` | 126 across 21 folders | [`plan-sop-planning-mfe`](../plan-sop-planning-mfe/automation-coverage.md) |
| `ProcessOrchestrationBackend/` | 45 across 6 folders | PO service, Action Item, Link Management, UI Fields |
| `ProcessOrchestration/` | 29 across 9 folders | [`plan-sop-lui`](../plan-sop-lui/automation-coverage.md) |
| `DataSetupBatch/` | 19 across 4 folders | All backends (**destructive**) |
| `Performance/` | 4 | Planning Space |
| `VisualAutomation/` | 3 | Both micro-frontends |

## Backend spec breakdown
| Folder | Specs | Service | Suite |
| --- | --- | --- | --- |
| `LinkManagement/` | 14 | [Link Management](../plan-sop-link-management/automation-coverage.md) | `POBackendLinkManagementBatch.json` |
| `Migration/` | 9 | PO service + Link Management (ALM) | `POBackendMigrationBatch.json` |
| `ProcessBatch/` | 9 | [PO service](../plan-sop-process-orchestration-service/automation-coverage.md) | `POBackendProcessBatch.json` |
| `ActionItem/` | 8 | [Action Item](../plan-sop-actionitem/automation-coverage.md) (Test_004/005 go through the PO proxy) | `POBackendActionItemBatch.json` |
| `Calendar/` | 3 | PO service | `POBackendCalendarBatch.json` |
| `UIFields/` | 2 | [UI Fields](../plan-sop-ui-fields-service/automation-coverage.md) | `POBackendUIFieldsBatch.json` |

`POBackendSmokeBatch.json` picks a cross-service subset (24 specs). 15 of the 45 backend specs were added between 2026-09-16 and 2026-10-01 by the PSR gap plans in `docs/Coverage/PSR-Gap-Plans/` (01 PO, 02 LM, 03 AI, 04 UI Fields).

### Endpoint coverage
Measured by `npm run docs:api-coverage` from service source and the latest green CI runs (`docs/Coverage/backend-api-coverage-dashboard.html`, generated 2026-10-05):

| Service | Active endpoints | Exercised | Coverage | 2026-08-31 |
| --- | --- | --- | --- | --- |
| Process Orchestration | 144 | 59 | 41.0% | 16.4% |
| Action Item | 73 | 13 (+8 setup / via PO) | 17.8% | 9.1% |
| Link Management | 30 | 21 (+3 setup / via PO) | 70.0% | 34.2% |
| UI Fields | 28 | 4 | 14.3% | 0% |
| **Total** | **275** | **97** | **35.3%** | 14.8% |

The dashboard also lists 23 UI-used endpoints with no test (P1). Use it, not this table, for current endpoint-level status. Known service defects found by these specs are tracked in `docs/Coverage/PSR-Gap-Plans/ActionItems-UIFields-Defect-Report.html` and are not asserted in specs.

## Data setup breakdown
| Folder | Specs | Effect |
| --- | --- | --- |
| `ProcessOrchestration/` | 7 | Delete processes, procedures, view mappings, calendars, KPIs, SCAs, roles |
| `UIDataReset/` | 5 | Reset scope, re-map views, clean process, feature toggles, dedupe views |
| `Scenarios/` | 4 | Delete, default, add-to-MaaS, create scenarios |
| `ODM/` | 3 | Delete planning instances, restart MaaS cluster, restart planning instance |

`DataSetup.json` runs a 9-spec subset; the other DataSetup specs are run on demand.

## Coverage by target repo
| Repo | Direct specs | Assessment |
| --- | --- | --- |
| [`plan-sop-planning-mfe`](../plan-sop-planning-mfe/automation-coverage.md) | 126 | Strong |
| [`plan-sop-lui`](../plan-sop-lui/automation-coverage.md) | 29 | Moderate — four settings screens untested |
| [`plan-sop-link-management`](../plan-sop-link-management/automation-coverage.md) | 14 + 3 migration | Strong — 70% of endpoints |
| [`plan-sop-process-orchestration-service`](../plan-sop-process-orchestration-service/automation-coverage.md) | 9 + 3 + 9 migration (+2 AI proxy) | Moderate — 41%; quota, insights, templates, transitions untested |
| [`plan-sop-actionitem`](../plan-sop-actionitem/automation-coverage.md) | 8 | Weak-moderate — templates and KPIs now covered; playbooks, comments, bulk still untested |
| [`plan-sop-ui-fields-service`](../plan-sop-ui-fields-service/automation-coverage.md) | 2 | Narrow — the four lui-used page-config routes only |
| [`plan-sop-po-be-commons`](../plan-sop-po-be-commons/automation-coverage.md) | 0 | Appropriate (shared library) |

## Framework-level gaps
| Gap | Risk | Suggested action |
| --- | --- | --- |
| **Accessibility testing** | High | No a11y assertions anywhere; add an Axe scan to the smoke suites |
| UI Fields beyond page config | Medium | Page config is now covered; attributes, UI-field CRUD, RBAC and the component registry are not — see [UI Fields coverage](../plan-sop-ui-fields-service/automation-coverage.md#coverage-gaps) |
| **PSR test data is sparse** | Medium-High | Only `Performance` and `ProcessOrchestrationBackend` exist; specs silently cannot run there |
| **QA missing `DataSetupBatch` data** | Medium | Cleanup cannot run in QA the way it does in INTEROP |
| Visual coverage breadth | Medium | 3 visual specs against 155 functional UI specs |
| Playbooks (Action Item) | Medium-High | 18 endpoints, no coverage |
| LUI settings screens | Medium-High | Four screens that configure state other suites rely on |
| UI-used endpoints with no test | Medium-High | 23 P1 rows on the coverage dashboard (mostly PO transitions, AI bulk, subprocess start/stop) |
| Cross-service commons version drift | Low today | All four services pin `2dacec2-SNAPSHOT`; a CI check would keep it that way — see [po-be-commons](../plan-sop-po-be-commons/automation-coverage.md#recommended-additions) |
| Legacy WDIO migration | Medium | `e2e/` still carries unmigrated coverage |

## Environment coverage
| Area | INTEROP | QA | PSR |
| --- | --- | --- | --- |
| `PlanningSpace` | Yes | Yes | No |
| `ProcessOrchestration` | Yes | Yes | No |
| `ProcessOrchestrationBackend` | Yes | Yes | Yes (partial — no `UIFields` data; `ActionItem` only Test_001–003) |
| `DataSetupBatch` | Yes | No | No |
| `Performance` | Yes | No | Yes |
| `VisualAutomation` | Yes | Yes | No |
| `VisualBaseValidations` | Yes | No | No |

Derived from the `testdata/<ENV>/` tree. INTEROP is the reference environment; PSR is backend- and performance-only. The nightly backend workflow (`playwright-po-backend-suite.yaml`) runs four schedules: QA and INTEROP, each on `AZURE` and `GRAVITEE`.

## Execution strategy
| Mechanism | Purpose |
| --- | --- |
| `SUITENAME` + suite JSON | Select what CI runs |
| Batch splitting (`CardsBatchA/B`, `ScenarioBatchA/B`) | Bound suite runtime |
| `--workers=1` on most scripts | Avoid shared-state interference |
| `--workers=2` on migration | Limited parallelism for long jobs |
| `scripts/run-po-backend-batches-parallel.js` | Runs the 6 backend batches (incl. `uifields`) in parallel |
| `TEST_IGNORE` | Quarantine specific specs (currently used for three) |
| Sauce Labs configs | Cloud execution |

Specs currently quarantined via `TEST_IGNORE`: `ProcessOrchestration/PowerBar/Test_003_PowerBarForAssumptionInPO`, `ProcessOrchestration/ProcessBatch/Test_002_AdoptVariantWhileCreateEditProcess`, `ProcessOrchestration/ViewSearch/Test_003_ViewSearchForAssumptionInPO`. Each is an open item, not a permanent exclusion.
