# Test hooks — plan-sop-process-orchestration-service

## Automation entry points
| Asset | Path |
| --- | --- |
| API helper | [playwright-e2e/util/api.util.ts](../../../util/api.util.ts) (axios + Bearer token cache) |
| Common helpers | [playwright-e2e/util/common.util.ts](../../../util/common.util.ts) |
| Wait helpers | [playwright-e2e/util/wait-helpers.ts](../../../util/wait-helpers.ts) |
| Timeout tiers | [playwright-e2e/constants/timeouts.ts](../../../constants/timeouts.ts) |
| Page objects | `process.page.ts`, `process-settings.page.ts`, `assumption.page.ts`, `powerbar.page.ts` |
| Fixtures | `processPage`, `processSettingsPage`, `assumptionPage`, `powerBarPage` from [configs/fixtures.ts](../../../configs/fixtures.ts) |
| Test data | `playwright-e2e/testdata/<ENV>/ProcessOrchestrationBackend/`, `.../ProcessOrchestration/` |

## Token handling
`api.util.ts` caches the Bearer token (`ENABLE_TOKEN_CACHE`, default `true`) and redacts it from artifacts (`REDACT_BEARER_TOKEN`, default `true`). Call `clearApiTokenCache()` when a spec must force a fresh token — for example after changing a user's roles.

## Setup recipes

### Create a process for a UI spec
| Step | Call |
| --- | --- |
| 1 | `POST /process/template` with a unique `processName` — or `createProcessFromTemplate()` in `util/process-fixture.util.ts` |
| 2 | `GET /process/{processName}` to confirm it exists |
| 3 | Optional: `POST /process/{processName}/subprocess` for child nodes |
| 4 | Optional: `PUT /process/{processName}/scope` to seed scope — the body **replaces the whole scope** with no validation and writes an audit row, so send back exactly what `GET` returned plus your change |
| Teardown | `deleteProcessWithReferences()` removes the process with its model, procedure, actor and IAM roles |

Never write a non-numeric `scope.horizon.pastDays`/`futureDays` on a shared process: every `GET /context` for it then returns 400 (PO-D08). Use a dedicated process from the fixture util for scope writes.

### Start a process and wait
| Step | Call |
| --- | --- |
| 1 | `POST /process/{processName}/start` |
| 2 | Poll `GET /process/{processName}/status` with `expect.poll` until the terminal status |
| 3 | Never assume the response to step 1 means the process is running |

### Calendar + cycle
| Step | Call |
| --- | --- |
| 1 | `POST /calendar` |
| 2 | `POST /calendar/{calendarName}/cycle` |
| 3 | `GET /calendar/{calendarName}/cycle/{cycleName}` to confirm |

### ALM migration (source → target realm)
| Step | Call |
| --- | --- |
| 1 | `GET /process/{processName}/export` or `POST /exportData` on source |
| 2 | `POST /configuration/exchange/publish` (multipart ZIP, ≤10MB) |
| 3 | Poll `GET /job/{jobId}/status` |
| 4 | `POST /importData` or exchange deploy on target |
| 5 | Verify with `GET /process/{processName}` on target |

## Teardown / cleanup
| Step | Call | Owning spec |
| --- | --- | --- |
| Delete processes | `DELETE /process/{processName}` | `DataSetupBatch/ProcessOrchestration/Test_001_DeleteProcesses.spec.ts` |
| Delete migration procedures | — | `Test_002_DeleteProceduresStartingWithTestprocessforMig.spec.ts` |
| Delete view mappings | Link Management | `Test_004_DeleteAllViewMappings.spec.ts` |
| Delete calendars | `DELETE /calendar/{name}` | `Test_005_DeleteAllCalendars.spec.ts` |
| Delete assumption KPIs | — | `Test_006_DeleteAllAssumptionKpis.spec.ts` |
| Delete supply chain actions | `DELETE /supplyChainAction/{id}` | `Test_007_DeleteAllSupplyChainActions.spec.ts` |
| Delete unused process roles | `POST /users/roles/remove` | `Test_008_DeleteUnusedProcessRoles.spec.ts` |

## Async behaviour — what to wait on
Never use a static sleep. Use `getTimeout(tier)` and poll a real condition.

| Operation | Async? | Deterministic wait |
| --- | --- | --- |
| `POST /process/{name}/start` | Yes | Poll `GET /process/{name}/status` |
| `POST /process/{name}/stop` | Yes | Poll `GET /process/{name}/status` |
| Transition generate | Yes | Poll `GET /transitionJob/{jobId}/status` |
| Export / import | Yes | Poll `GET /job/{jobId}/status` |
| Exchange publish / deploy | Yes | Poll `GET /job/{jobId}/status` (`PO_JOB_STATUS_BASE`) |
| Process delete | Mostly sync | Re-`GET` and expect 404 |
| RBAC change | Cached | `GET /cache/clear` on the RBAC proxy, then retry |

Suggested tiers: `XLARGE` (30s) for single API calls, `EXTREME` (60s) for start/stop, `EXTENDED` (30 min) for migration jobs — matching `spring.mvc.async.request-timeout`.

## Idempotency and isolation
- Process names are globally unique per realm. Generate a run-scoped suffix.
- `DataSetupBatch` specs are destructive across the whole realm — never run them concurrently with functional suites on the same realm.
- Hikari pool is capped at 29 connections; very high Playwright worker counts can queue DB work and surface as timeouts rather than functional failures.
- Migration specs mutate two realms (`_SOURCE`, `_TARGET`); run them serially.
