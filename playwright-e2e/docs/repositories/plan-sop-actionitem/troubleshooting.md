# Troubleshooting — plan-sop-actionitem

## Known failure signatures
| Symptom | Likely cause | Check / fix |
| --- | --- | --- |
| 404 creating an action item | The source entity (process/subprocess/assumption) does not exist | Create the parent first; confirm `entityId` |
| 403 on playbook or attribute-config calls | `@PreAuthorize` denied | Check the user's role in the realm; `clearApiTokenCache()` after a role change |
| Bulk status update reports fewer IDs than sent | Partial failure — some items were not in an updatable state | Inspect the returned `List<String>`; do not assume all-or-nothing |
| Action items reappear after cleanup | Deleted the process but not its items | Call `DELETE /actionitems/entity/{id}` explicitly |
| Playbook edit not reflected in a running instance | Definition vs. instance separation is by design | Re-`initiate` to pick up the new definition |
| Duplicate playbook instances | Concurrent scheduled recurring run | ShedLock guards the cluster, not your test — scope assertions by name |
| Empty editor / filter fields in UI | Attribute or UI-field config missing for the tenant | `GET /actionitems/editor` and `/actionitems/filters` to confirm |
| Error response with no detail | `reflectoring.trace` is off | Set `ACTIONITEM_PRINT_STACKTRACE=true` in a non-production environment |
| 401 after switching test users | Cached Bearer token for the previous user | `clearApiTokenCache()` |
| Hitting the wrong service | `ACTIONITEM` points at PO, `ACTIONITEM2` at this service | Pick the variable matching the behaviour under test |
| 500 creating a process-level item on QA Azure | `IntegratedBusinessPlanning` has no `actionItemEntityId` there | Use `ProcessWithCustomAttribute` (has entity ids on both QA gateways) |
| `GET /kpis/{id}` returns 200 for a deleted KPI | Unknown id returns `200 {"data": null}`, not 404 | Assert on `data === null` |
| 500 `TransientPropertyValueException` on `PUT /kpis/{id}` | Full replace: new attributes need `kpiId` | Send `kpiId` on every attribute; omitted attributes are deleted and `createdBy` becomes null |
| 400 `IBP_40_1027` on `/actionitems/editor` or `/filters` | Invalid `contextType` — only checked while resolving local user-picker values | Use a valid context type; filters may still return 200 |
| Editor/filter field lists differ between QA Azure and QA Gravitee | Tenant-configured (e.g. `assigneeUsers`) | Keep expectations in per-environment test data |
| Playbook due/overdue search off by one day near midnight | Since ABPIBP-7362, playbook search computes "today" in UTC | Avoid date boundaries, or compute expectations in UTC |
| Duplicate items after a retried create | `sendUntilStatus` used for a write | Use `ActionItemApiHelper.write()` |

## Where to look
| Signal | Location |
| --- | --- |
| Resolved env config | `[setup] ...` console line |
| API contract | `http://localhost:8080/swagger-ui/index.html` |
| Request/response bodies | Allure attachments (`PW_NETWORK_ARTIFACT_MODE`) |
| DB state | `action_items`, `playbook_instance`, `playbook_instance_item` |
| Scheduler locks | ShedLock table (recurring playbook execution) |

## Flaky areas
| Area | Why | Mitigation |
| --- | --- | --- |
| Recurring playbooks | Cluster-wide scheduled execution | Assert on run-scoped names only |
| Notifications | Eventual delivery | Poll with `expect.poll`; never assert synchronously |
| Bulk operations | Larger payloads, longer latency | Use the `XLARGE` timeout tier |
| UI list after an API mutation | Grid refresh is eventual | Wait on the grid locator in `action-items.page.ts` |
| User-assignment specs | Depend on both automation users existing | Verify realm membership before the run |
