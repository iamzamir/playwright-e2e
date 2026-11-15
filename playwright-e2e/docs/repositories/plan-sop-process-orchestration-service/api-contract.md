# API contract — plan-sop-process-orchestration-service

Source of truth: 23 controllers under `src/main/java/**/controller`, plus `TenantControllerV2` (`GET /tenant`) and `SupplyChainActionControllerV2` (`GET /supplyChainAction`) under `v2/refactor/**` — a `*Controller.java` filter misses those. 163 mappings, 144 active. Swagger UI at `/swagger-ui/index.html`.

> Paths are **service-relative**. Full URL = `${API_BASE_URL}` + gateway prefix + path.
> Gateway prefix per environment is in [environments.md](environments.md) —
> e.g. INTEROP old-mode prefix is `cbp/interop/ibp/process-orchestration/v1`.

## Auth
| Aspect | Value |
| --- | --- |
| Scheme | OAuth2 Bearer token (`Authorization: Bearer <token>`) |
| Token source | `AUTH_URL` client-credentials grant, cached by `util/api.util.ts` |
| RBAC | `@PreAuthorize("@ibp.hasAction('<RESOURCE>', {'<ACTION>'})")` |
| Resources | `RBAC_PROCESS`, `RBAC_SUBPROCESS`, `RBAC_CALENDAR`, `RBAC_ATTRIBUTE` |
| Actions | `LSNOP_CREATE`, `LSNOP_EDIT`, `LSNOP_DELETE`, `LSNOP_VIEW` |

Cache-busting: `GET /cache/clear` on `RbacProxyController` clears the RBAC cache.

## ProcessController
| Method | Path | RBAC | Notes |
| --- | --- | --- | --- |
| POST | `/process` | PROCESS:CREATE | Body is a free-form `Map<String,Object>` |
| POST | `/process/template` | PROCESS:CREATE | Create from template — used heavily by data setup |
| POST | `/process/import` | PROCESS:CREATE | Import a previously exported process |
| GET | `/process` | — | List processes |
| GET | `/process/{processName}` | PROCESS:VIEW | |
| GET | `/process/name/{displayName}` | — | Resolve names by display name |
| GET | `/process/id/{processId}` | — | Resolve name by ID |
| GET | `/process/{processName}/export` | PROCESS:VIEW | Full/partial export |
| GET | `/process/{processName}/tree` | PROCESS:VIEW | Full hierarchy |
| GET | `/process/{processName}/children` | PROCESS:VIEW | Direct subprocesses |
| GET | `/process/{processName}/scope` | PROCESS:VIEW | |
| PUT | `/process/{processName}/scope` | PROCESS:EDIT | |
| POST | `/process/{processName}/start` | PROCESS:EDIT | **Async** — poll status |
| POST | `/process/{processName}/stop` | PROCESS:EDIT | **Async** — poll status |
| GET | `/process/{processName}/status` | PROCESS:VIEW | Poll target for start/stop |
| PUT | `/process/{processName}` | PROCESS:EDIT | |
| DELETE | `/process/{processName}` | PROCESS:DELETE | |
| POST | `/process/search` | — | Paged search |
| POST | `/process/status` | — | Bulk status lookup |
| GET | `/process/{processName}/users` | — | |
| PUT | `/process/{processName}/planstartdate` | PROCESS:EDIT | |
| GET | `/process/{processName}/processGantt` | PROCESS:VIEW | |
| GET | `/process/{processName}/processGanttWithTree` | PROCESS:VIEW | |
| GET | `/process/{processName}/context` | PROCESS:VIEW | |
| PUT | `/process/{processName}/calendarcycle/{cycleName}/reschedule` | PROCESS:EDIT | |
| POST | `/process/{processName}/validate/{entityName}` | — | Entity-limit validation |
| GET | `/process/{processName}/entity/{entityName}` | — | Entity limits |
| PUT | `/process/{processName}/report/folder` | PROCESS:EDIT | |
| GET/POST/PUT/DELETE | `/process/{processName}/eventAction[/{eventName}]` | — | Event actions |
| POST | `/process/migrate/namespace` | — | Solution-area migration |
| POST | `/process/migrate/namespace/role/{roleName}` | — | Role creation for migration |

## NodeController (subprocess)
| Method | Path | RBAC |
| --- | --- | --- |
| POST | `/process/{processName}/subprocess` | SUBPROCESS:CREATE |
| GET | `/process/{processName}/subprocess/{subprocessName}` | SUBPROCESS:VIEW |
| GET | `/process/{processName}/subprocess/{subprocessName}/children` | — |
| GET | `/process/{processName}/subprocess/{subprocessName}/tree` | SUBPROCESS:VIEW |
| POST | `/process/{processName}/subprocess/{subprocessName}/start` | SUBPROCESS:EDIT |
| POST | `/process/{processName}/subprocess/{subprocessName}/stop` | SUBPROCESS:EDIT |
| PUT | `/process/{processName}/subprocess/{subprocessName}` | SUBPROCESS:EDIT |
| DELETE | `/process/{processName}/subprocess/{subprocessName}` | SUBPROCESS:DELETE |
| GET | `/process/{processName}/subprocess/{subprocessName}/referenceableNodes` | — |
| GET | `/process/{processName}/subprocess/{subprocessName}/processGantt` | SUBPROCESS:VIEW |
| GET | `/process/{processName}/subprocess/{subprocessName}/processGanttWithTree` | SUBPROCESS:VIEW |

## CalendarController
| Method | Path | RBAC |
| --- | --- | --- |
| POST | `/calendar` | CALENDAR:CREATE |
| GET | `/calendar` | CALENDAR:VIEW |
| GET | `/calendar/{name}` | CALENDAR:VIEW |
| PUT | `/calendar/{name}` | CALENDAR:EDIT |
| DELETE | `/calendar/{name}` | CALENDAR:DELETE |
| POST | `/calendar/{calendarName}/cycle` | CALENDAR:CREATE |
| GET | `/calendar/{calendarName}/cycle` | CALENDAR:VIEW |
| GET | `/calendar/{calendarName}/cycle/{cycleName}` | CALENDAR:VIEW |
| PUT | `/calendar/{calendarName}/cycle/{cycleName}` | CALENDAR:EDIT |
| DELETE | `/calendar/{calendarName}/cycle/{cycleName}` | CALENDAR:DELETE |

## TransitionController
| Method | Path |
| --- | --- |
| POST | `/process/{process_name}/cycle/{cycle_name}/transition/generate` |
| POST | `/process/{process_name}/transition` |
| POST | `/process/{process_name}/subprocess/{subprocess_name}/transition` |
| GET | `/process/{process_name}/transitionhierarchy` |
| GET | `/process/{process_name}/subprocess/{subprocess_name}/transitionhierarchy` |
| GET | `/process/{process_name}/transition-options` |
| GET | `/process/{process_name}/subprocess/{subprocess_name}/transition-options` |
| DELETE | `/process/{process_name}/transition` |
| DELETE | `/process/{process_name}/subprocess/{subprocess_name}/transition` |
| DELETE | `/process/{process_name}/transition/tree` |

## NodeAttributeController
| Method | Path |
| --- | --- |
| POST/GET | `/process/{processName}/attribute` |
| PUT/DELETE | `/process/{processName}/attribute/{attrName}/value/{attrValue}` |
| POST/GET | `/process/{processName}/subprocess/{subprocessName}/attribute` |
| PUT/DELETE | `/process/{processName}/subprocess/{subprocessName}/attribute/...` |

## ActionItemProxyController
Proxies to `plan-sop-actionitem` while enforcing process context.

| Method | Path |
| --- | --- |
| POST | `/process/{processName}/actionitem` |
| POST | `/process/{processName}/subprocess/{subprocessName}/actionitem` |
| POST | `/process/{processName}/actionitem/bulk` |
| POST | `/process/{processName}/subprocess/{subprocessName}/actionitem/bulk` |
| PUT | `/process/{processName}/actionitem/{id}` |
| PUT | `/process/{processName}/subprocess/{subprocessName}/actionitem/{id}` |
| POST | `/process/{processName}/actionitem/search` |
| POST | `/process/{processName}/subprocess/{subprocessName}/actionitem/search` |
| GET | `/actionitem/{id}` |

## TemplateController / TemplateEntityController
| Method | Path |
| --- | --- |
| GET | `/template/schema/type/{templateType}` |
| GET | `/template/{templateType}` |
| GET | `/template/{templateType}/{templateName}` |
| GET | `/template/Id/{templateId}` |
| POST | `/template` |
| PUT | `/template/{templateName}/type/{templateType}` |
| PUT | `/template/{templateName}/type/{templateType}/status/{status}` |
| DELETE | `/template/{templateName}/type/{templateType}` |
| GET/POST | `/template/{templateName}/type/{templateType}/template-entity` |
| DELETE | `/template-entity/{id}` |

## SupplyChainActionController
| Method | Path |
| --- | --- |
| GET | `/supplyChainAction` |
| GET | `/supplyChainAction/{id}` |
| POST | `/supplyChainAction` |
| PUT | `/supplyChainAction/{id}` |
| DELETE | `/supplyChainAction/{id}` |

## POConfigurationController (ALM)
| Method | Path | Notes |
| --- | --- | --- |
| GET/POST/PUT | `/configuration/realmConfiguration` | Organisation/realm config |
| POST | `/configuration/publish` | Publish PO configuration |
| POST | `/configuration/deploy` | Deploy PO configuration |
| POST | `/configuration/exchange/publish` | **Multipart ZIP**, ≤10MB |
| POST | `/configuration/exchange/deploy` | Deploy an exchange package |

## ExecutionStatusController — the polling endpoints
| Method | Path | Use |
| --- | --- | --- |
| GET | `/job/{jobId}/status` | Poll any async job |
| GET | `/transitionJob/{jobId}/status` | Poll transition generation |

## Other controllers
| Controller | Paths |
| --- | --- |
| `ImportExportController` | `POST /exportData`, `POST /importData` |
| `InsightController` | `/insight`, `/insight/{id}`, `/insight/{id}/impact`, `/process/{processName}/insight/subscribe` |
| `KpiController` | `/process/{processName}/kpi`, `/process/{processName}/subprocess/{subprocessName}/kpi` |
| `QuotaController` | `/quota`, `/quota/{id}`, `/quota/scope/{scopeType}/{scopeId}`, `/quota/{entityType}/{entityOperation}/{scopeType}/{scopeId}` |
| `MeteringController` | `/meter/{entityType}/{entityOperation}/{scopeType}/{scopeId}` |
| `ReportingController` | `/reporting/config`, `/reporting/config/{type}`, `/reporting/config/workspace/{workspaceId}/type/{type}`, `/reporting/config/team/{teamName}` |
| `NodeScheduleController` | `/process/{process_name}/calendarcycle/{cycle_name}/nodeschedule` |
| `TenantController` | `/tenant`, `/tenants`, `/tenants/{tenantId}`, `/tenant/onboard`, `/tenant/onboard/status`, `/tenants/machineCreds`, `/tenants/snowflakeCreds`, `/realm/solutionArea`, `/realm/filter-instance`, `/realm/solutionArea/gallery` |
| `UserController` | `/user`, `/user/{id}`, `/user/{entityType}/{entityName}`, `/user/onboard`, `/role`, `/role/admin`, `/role/planner`, `/users/roles/add`, `/users/roles/remove` |
| `RbacProxyController` | `/users/{userId}/entities/{entityId}/actions`, `/resources`, `/cache/clear` |
| `ProcedureProxyController` | `/procedure/onboard` |
| `ProcessOrchestrationLiamMockController` | `/mock/**` — **non-production mock**, do not target in env tests |

## Contract watch
Endpoints automation depends on most. A breaking change here fails the listed specs first.

| Endpoint | Used by |
| --- | --- |
| `POST /process/template` | `DataSetupBatch/ProcessOrchestration/*`, most PO UI specs |
| `DELETE /process/{processName}` | `DataSetupBatch/ProcessOrchestration/Test_001_DeleteProcesses.spec.ts` |
| `POST /process/{name}/start` + `GET /process/{name}/status` | `ProcessOrchestrationBackend/ProcessBatch/Test_001`, `Test_004`, `Test_005` |
| `/calendar/**` | `ProcessOrchestrationBackend/Calendar/*`, `DataSetupBatch/.../Test_005_DeleteAllCalendars` |
| `/process/{name}/attribute`, `/subprocess/.../attribute` | `ProcessOrchestrationBackend/ProcessBatch/Test_002`, `Test_003` |
| `POST /exportData`, `POST /importData` | `ProcessOrchestrationBackend/Migration/*` |
| `POST /configuration/exchange/publish` | `Migration/Test_009_ALMDeployResourceMigration.spec.ts` |
| `GET /job/{jobId}/status` | All migration specs |
| `/supplyChainAction/**` | `Migration/Test_004_SupplyChainActionsMigration.spec.ts` |
