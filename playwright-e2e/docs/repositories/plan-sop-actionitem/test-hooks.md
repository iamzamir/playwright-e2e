# Test hooks — plan-sop-actionitem

## Automation entry points
| Asset | Path |
| --- | --- |
| API helper | [playwright-e2e/util/api.util.ts](../../../util/api.util.ts) |
| Action Item helper | [playwright-e2e/util/action-item.util.ts](../../../util/action-item.util.ts) — `ActionItemApiHelper` (`write`, `sendUntilStatus`, `searchUntil`, `resolveNodeContext`, `createProcessActionItem`, `createSubprocessActionItem`, `registerEntity`, `deleteActionItem`, `deleteEntity`, `filterCodeMaps`) |
| Page object | `action-items.page.ts` |
| Fixture | `actionItemsPage` from [configs/fixtures.ts](../../../configs/fixtures.ts) |
| Test data | `playwright-e2e/testdata/<ENV>/ProcessOrchestrationBackend/`, `.../ProcessOrchestration/` |
| Env vars | `ACTIONITEM` (via PO proxy), `ACTIONITEM2` (direct), `DELETE_ACTIONITEM` |

## Choosing the right route
| Scenario | Use |
| --- | --- |
| Action item within a process/subprocess context | PO proxy: `POST /process/{processName}/actionitem` |
| Direct CRUD / cleanup / bulk operations | This service: `POST /actionitems`, `DELETE /actionitems/{id}` |
| Assertions on RBAC in process context | PO proxy — the proxy is where process-level permissions are enforced |

## Setup recipes

### Create an action item for a process
| Step | Call |
| --- | --- |
| 1 | Ensure the process exists (see [PO test hooks](../plan-sop-process-orchestration-service/test-hooks.md)) |
| 2 | `POST /process/{processName}/actionitem` (proxy) or `POST /actionitems` with `entityId` |
| 3 | Capture the returned `id` — every follow-up call needs it |
| 4 | Verify with `GET /actionitems/{id}` |

### Create an assumption-style entity (stand-alone fixture)
| Step | Call |
| --- | --- |
| 1 | `POST /entity {name, description, isActive, sourceAttributes: []}` (`ActionItemApiHelper.registerEntity`) |
| 2 | Create items against the returned id |
| 3 | `DELETE /entity/{id}` in teardown — it also deletes the entity's action items |

### Writes vs reads in specs
Use `ActionItemApiHelper.write()` for every POST/PUT/DELETE: it sends once and retries the gateway's transient 400 only when the write is idempotent or a lookup proves nothing was committed. `sendUntilStatus` retries until a status matches and is for reads (GET and search POSTs) only — using it for writes creates duplicates.

### Bulk create and bulk edit
| Step | Call |
| --- | --- |
| 1 | `POST /actionitems/bulk` → `ActionItemBulkResponse` |
| 2 | `PUT /actionitems/status` for bulk status change → returns the list of affected IDs |
| 3 | Assert on the returned ID list, not on a re-query count |

### Playbook instance
| Step | Call |
| --- | --- |
| 1 | `POST /playbook` |
| 2 | `POST /playbook/{playbookName}/action-items` for each item |
| 3 | `POST /playbook/{playbookName}/initiate` → creates a `PlaybookInstance` |
| 4 | `GET /playbook/instances/{instanceId}/action-items` to verify |

### Assignment / unauthorized-user specs
| Step | Call |
| --- | --- |
| 1 | Assign to `FUNCTIONAL_TEST_USERNAME2` |
| 2 | Re-authenticate as that user (`AuthUserAlias` `user2` in fixtures) |
| 3 | `clearApiTokenCache()` before switching users on the API side |

## Teardown / cleanup
| Step | Call |
| --- | --- |
| Delete one | `DELETE /actionitems/{id}` |
| Delete many | `DELETE /actionitems/bulk` |
| Delete everything for an entity | `DELETE /actionitems/entity/{id}` — **destructive** |
| Delete comments for an entity | `DELETE /comments/entity/{id}` |
| Delete templates | `DELETE /actionitemTemplates/{id}` |

Deleting the parent process does not guarantee its action items are gone — clean up explicitly.

## Async behaviour — what to wait on
| Operation | Async? | Deterministic wait |
| --- | --- | --- |
| Single create/update/delete | Sync | Assert on the response, then `GET` to confirm |
| Bulk create | Sync but slower | `XLARGE` tier; assert on `ActionItemBulkResponse` |
| Bulk status update | Sync | Assert on the returned ID list |
| `POST /playbook/recurring/initiate` | **Scheduled, ShedLock-guarded** | Do not assert immediately; poll `GET /playbook/instances/...` |
| Notifications | Eventual | Poll; do not assert synchronously |
| UI list refresh after API change | Eventual | Wait on the grid locator in `action-items.page.ts`, not a sleep |

## Idempotency and isolation
- Action item IDs are server-generated, so parallel creation is safe.
- `DELETE /actionitems/entity/{id}` removes **all** items for an entity — never run it against a shared entity mid-suite.
- Playbook names are unique per tenant; generate a run-scoped suffix.
- Recurring playbook initiation is cluster-wide (ShedLock). A test asserting "exactly one instance created" can be broken by a concurrent scheduled run.
