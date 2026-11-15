# Troubleshooting — plan-sop-process-orchestration-service

## Known failure signatures
| Symptom | Likely cause | Check / fix |
| --- | --- | --- |
| HTTP 413 on exchange publish | ZIP exceeds `MULTIPART_MAX_FILE_SIZE` (10MB) | Reduce the exported tree, or raise `MULTIPART_MAX_FILE_SIZE` / `MULTIPART_MAX_REQUEST_SIZE` in the deployed config |
| HTTP 403 on a call that used to pass | `@PreAuthorize("@ibp.hasAction(...)")` denied, or stale RBAC cache | Confirm the user's role; call `GET /cache/clear`; check `REALM_NAME` matches the environment |
| HTTP 401 mid-suite | Bearer token expired or cached across realms | Call `clearApiTokenCache()`; verify `AUTH_URL`, `SCOPE`, `CLIENT_ID`, `CLIENT_SECRET` |
| 404 on `/process/{name}` right after create | Using display name instead of system name | Resolve via `GET /process/name/{displayName}` |
| Start returns 2xx but the UI shows "not started" | Start is async | Poll `GET /process/{name}/status` instead of asserting on the POST response |
| Migration spec hangs then fails | Job still running past the test timeout | Poll `GET /job/{jobId}/status`; use the `EXTENDED` timeout tier |
| Intermittent DB/connection timeouts under high parallelism | Hikari pool capped at 29 | Lower Playwright workers, or stagger data-setup specs |
| 404 on every endpoint | Wrong `URL_MODE` or `GATEWAY_TYPE` | Check the `[setup]` log line printed at startup |
| Spec passes locally, fails in CI | Different `ENVIRONMENT` / `REALM_KEY` | Compare the `[setup] ENVIRONMENT=... URL_MODE=... GATEWAY_TYPE=... REALM_KEY=...` line |
| Cross-test interference | Reused process name across workers | Generate a run-scoped unique name |
| Export job fails with `2104` "No ALM customer found for realm X" | ALM has no customer registered under the realm name or realm id PO sends | Register the realm in ALM; before SM-39457 (2026-09-25) this hung at `INPROGRESS` on Gravitee |
| Liquibase checksum error on startup for `get-process`/`export-process` | Procedure changed after it was applied | Fixed by `validCheckSum ANY` (ABP-19388); older builds need the checksum cleared |
| Procedure triggered on process start fails with "invalid access token" | Async thread had no user bearer to forward | Fixed by SM-37556 (2026-09-22) — check the deployed build |
| Unknown or wrong-case process name returns `401 IBP_40_1032`, not 404 | RBAC-guarded routes (`/context`, `/scope`, `/processGantt`, GET subprocess) check permission first | Check the exact process name; unguarded routes differ (`/entity/{type}` → `404 IBP_PO_40_2002`, `/users` → `401 IBP_40_1005`, KPI and `/children` → `200` empty) |
| Every `GET /process/{p}/context` returns 400 | A non-numeric `scope.horizon.pastDays`/`futureDays` was stored (PO-D08) | Never write scope horizons outside a dedicated process; restore the `GET /scope` body exactly |
| `POST /process/search` returns 500 | Any `sort` element is sent — the service ignores sort and always orders by `created_on DESC` (PO-D04) | Omit `sort` |
| Search rows show `Not Started` for a `NOT_STARTED` filter, or `"null"` strings | Display status and stringified nulls in search rows; `totalPages` is one too high on exact multiples | Known defects PO-D01–PO-D10 in `docs/Coverage/PSR-Gap-Plans/ActionItems-UIFields-Defect-Report.html` |
| `PUT /supplyChainAction/{id}` or create returns `400 IBP_40_1031` | Duplicate `(tenant, name)` or a missing NOT NULL field (`name`, `procedure_name`, `ui_config`) | `PUT` is a full replace; send `uiConfig: "{}"`, never an empty string |
| `GET /process/{p}/scope` has no `dimensions`/`horizon` | Both are optional (e.g. PSR `IntegratedBusinessPlanning`) | Assert the body is an object, not that it has keys |
| Export payload has an object where an array was expected | Export errors replace entity arrays with `{ isDataExportSuccessful, errorReason }` | Guard extractors with `Array.isArray()` |

## Where to look
| Signal | Location |
| --- | --- |
| Resolved env config | `[setup] ...` console line from `configs/setup.js` |
| Request/response bodies | Allure attachments; network artifacts controlled by `PW_NETWORK_ARTIFACT_MODE` |
| Async job state | `job_execution_status` table / `GET /job/{jobId}/status` |
| Service logs | Deployed container logs for the target environment |
| API contract | `/swagger-ui/index.html` on the running service |
| Security findings | 42Crunch, BlackDuck, CodeQL, Codacy dashboards linked from the repo README |

## Flaky areas
| Area | Why | Mitigation |
| --- | --- | --- |
| Process start/stop | Async with variable duration | `expect.poll` on `/status`, `EXTREME` tier |
| ALM migration | Two realms, network upload, long jobs | Run serially; poll job status; assert on the target realm, not the response |
| Calendar cycles | Date/time-boundary sensitive | Use fixed, relative dates from test data JSON |
| RBAC-gated endpoints | Permission cache | Clear cache after role changes |
| Anything after a `DataSetupBatch` run | Destructive realm-wide cleanup | Never interleave data-setup and functional suites on one realm |
