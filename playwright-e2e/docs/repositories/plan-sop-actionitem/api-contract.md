# API contract — plan-sop-actionitem

Source of truth: 14 controllers under `src/main/java/**/controller`. Swagger UI at `http://localhost:8080/swagger-ui/index.html`.

> Full URL = `${API_BASE_URL}` + gateway prefix + path. See [environments.md](environments.md).
> INTEROP old-mode prefix: `cbp/interop/ibp/actionitems/v1`.

## Auth
| Aspect | Value |
| --- | --- |
| Scheme | OAuth2 Bearer |
| RBAC | `@PreAuthorize("@ibp.hasAction('<RESOURCE>', {'<ACTION>'})")` on playbooks and attribute config |
| Resources | `RBAC_ATTRIBUTE` (and playbook-scoped actions) |
| Actions | `LSNOP_CREATE`, `LSNOP_EDIT`, `LSNOP_DELETE`, `LSNOP_VIEW` |

## ActionItemController
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/actionitems/editor` | Editor field configuration |
| GET | `/actionitems/page/summary` | Summary page fields |
| GET | `/actionitems/filters` | Filter field configuration |
| GET | `/actionitems/{id}` | Single action item |
| GET | `/actionitems/{entityId}/{id}` | Scoped to an entity |
| POST | `/searchActionItems` | Search — **POST, not GET** |
| POST | `/actionitems` | Create (`ActionItemRequestDto`) |
| POST | `/actionitems/bulk` | Bulk create → `ActionItemBulkResponse` |
| PUT | `/actionitems/{id}` | Update |
| PUT | `/actionitems/status` | Bulk status change → `List<String>` of affected IDs |
| PUT | `/actionitems/{id}/extend` | Extend due date |
| DELETE | `/actionitems/{id}` | Delete one |
| DELETE | `/actionitems/bulk` | Bulk delete |
| DELETE | `/actionitems/entity/{id}` | Delete all for an entity — **destructive, used by cleanup** |

## ActionItemTemplateController
| Method | Path |
| --- | --- |
| POST | `/actionitemTemplates` |
| GET | `/actionitemTemplates` (by entity ID) |
| PUT | `/actionitemTemplates/{id}` |
| DELETE | `/actionitemTemplates/{id}` |

## CommentsController
| Method | Path |
| --- | --- |
| GET | `/comments` |
| POST | `/comments` |
| PUT | `/comments/{id}` |
| DELETE | `/comments/{id}` |
| DELETE | `/comments/entity/{id}` |

## PlaybookController
All endpoints are `@PreAuthorize`-gated.

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/playbook` | Create playbook |
| PUT | `/playbook/{playbookName}` | Update |
| DELETE | `/playbook/{playbookName}` | Delete |
| POST | `/playbook/{playbookName}/action-items` | Add item |
| PUT | `/playbook/{playbookName}/action-items/{actionItemName}` | Update item |
| GET | `/playbook/{playbookName}/action-items` | List items |
| DELETE | `/playbook/{playbookName}/action-items/{actionItemName}` | Remove item |
| DELETE | `/playbook/{playbookName}/action-items` | Remove all items |
| POST | `/playbook/{playbookName}/initiate` | **Creates a playbook instance** |
| POST | `/playbook/recurring/initiate` | Scheduled batch — ShedLock-guarded |
| PUT | `/playbook/instances/{instanceId}/action-items/{actionItemName}` | Update instance item status |
| PUT | `/playbook/instances/{instanceId}/action-items` | Bulk instance status update |
| GET | `/playbook/instances/{instanceId}/action-items` | Instance items |
| GET | `/playbook/{playbookName}/instances/action-items` | Instance items by user |
| GET | `/playbook/history` | History |
| GET | `/playbooks` | Manage list |
| POST | `/playbook/search` | Instance search |
| POST | `/playbook/search/grouped` | Grouped instance search |

## KpiController / KpiConfigurationController
| Method | Path |
| --- | --- |
| POST | `/kpi/entities` — KPI summary for entities |
| GET | `/kpi/entities/{id}` — KPI detail for an entity |
| POST/GET/PUT/DELETE | `/kpis`, `/kpis/{id}` |
| POST/PUT/DELETE/GET | `/kpi-config-attributes`, `/kpi-config-attributes/{id}` |
| POST | `/kpi/entity` — map KPI to entity |
| POST | `/kpi/map/entities` — map KPI to many entities |
| DELETE | `/kpi/{kpiId}/entity/{entityId}` — unmap |

## AttributeConfigurationController
| Method | Path | RBAC |
| --- | --- | --- |
| GET | `/page` | — |
| GET | `/ui-component` | — |
| GET | `/attribute-config`, `/attribute-config/{id}` | — |
| POST | `/attribute-config` | ATTRIBUTE:CREATE |
| PUT | `/attribute-config/{id}` | ATTRIBUTE:EDIT |
| DELETE | `/attribute-config/{id}` | ATTRIBUTE:DELETE |
| GET | `/attribute-config/{id}/values` | — |
| POST | `/attribute-config/values` | ATTRIBUTE:CREATE |
| PUT | `/attribute-config/values/{id}` | ATTRIBUTE:EDIT |
| DELETE | `/attribute-config/values/{id}` | ATTRIBUTE:DELETE |
| POST | `/ui-field-config` | *(RBAC currently commented out in source)* |
| GET | `/ui-field-config`, `/ui-field-config/{id}` | — |
| PUT | `/ui-field-config/{id}` | ATTRIBUTE:EDIT |
| DELETE | `/ui-field-config/{id}` | ATTRIBUTE:DELETE |

## Remaining controllers
| Controller | Paths |
| --- | --- |
| `SourceEntityController` | `POST /entity`, `DELETE /entity/{id}`, `PATCH /entity/attribute` |
| `TenantController` | `/tenant`, `/tenants`, `/tenants/{tenantId}` |
| `UserConfigurationController` | `/users`, `/users/{user_id}`, `/users/me` |
| `RbacProxyController` | `/entity/{entityId}/users`, `/users/info` |
| `CollaborationProxyController` | `POST /channel` |
| `ImportExportController` | `POST /exportData`, `POST /importData` |
| `MockController` | `/mock/**` — **non-production mock**, do not target |

## Contract watch
| Endpoint | Used by |
| --- | --- |
| `POST /actionitems` | `ProcessOrchestrationBackend/ActionItem/Test_001..003` |
| `PUT /actionitems/{id}`, `PUT /actionitems/status` | `ProcessOrchestration/ActionItemsBatch/Test_003`, `Test_004` |
| `DELETE /actionitems/{id}`, `DELETE /actionitems/bulk` | `ActionItemsBatch/Test_001`, `Test_003` |
| `POST /searchActionItems` | Action item list assertions |
| `DELETE /actionitems/entity/{id}` | Cleanup paths |
| `GET /actionitems/editor`, `/filters` | Editor and filter UI rendering |
