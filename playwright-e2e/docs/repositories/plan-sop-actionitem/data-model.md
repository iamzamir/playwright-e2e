# Data model — plan-sop-actionitem

## Persistence
| Aspect | Value |
| --- | --- |
| Database | Azure SQL Server, `${azuresql_ai_database:actionitem}` |
| Driver | `com.microsoft.sqlserver.jdbc.SQLServerDriver` |
| Dialect | `org.hibernate.dialect.SQLServerDialect` |
| Migrations | Liquibase — `db/changelog/db.changelog-master.xml` |
| Pool | Hikari, max 50, min idle 5, connect timeout 20s |
| Isolation | `4096` (SNAPSHOT) |
| Batch size | `100`, with `order_inserts` / `order_updates` |
| Env vars | `azuresql_host`, `azuresql_port`, `azuresql_ai_database`, `azuresql_ai_user`, `azuresql_ai_password` |

## Core action-item entities
| Entity | Table | Purpose |
| --- | --- | --- |
| `ActionItem` | `action_items` | The action item record |
| `ActionItemAttrMapping` | `action_items_attr_mapping` | Custom attribute values per action item |
| `ActionItemTemplate` | `action_item_template` | Reusable action-item definitions |
| `Comments` | `comments` | Threaded comments on an action item |
| `SourceEntity` | `source_entity` | The owning entity (process, subprocess, assumption) |
| `SourceAttrMapping` | `source_attr_mapping` | Attributes on a source entity |
| `SourceTypes` | `source_types` | Source type lookup |

## Playbook entities
| Entity | Table | Purpose |
| --- | --- | --- |
| `Playbook` | `playbook` | Playbook definition |
| `PlaybookActionItem` | `playbook_action_item` | Template items inside a playbook |
| `PlaybookInstance` | `playbook_instance` | A running instance created by `/playbook/{name}/initiate` |
| `PlaybookInstanceItem` | `playbook_instance_item` | Per-instance item with its own status |
| `PlaybookArchive` | `playbook_archive` | Archived playbooks |

Definition vs. instance is the key distinction: editing a `Playbook` does **not** retroactively change existing `PlaybookInstance` rows.

## Configuration / UI-field entities
| Entity | Table | Purpose |
| --- | --- | --- |
| `Attributes` | `attributes` | Attribute definitions |
| `FieldValue` | `attribute_values` | Allowed attribute values |
| `Field` | `ui_fields` | UI field definition |
| `FieldGroup` | `ui_fields_groups` | Field grouping for editors |
| `FieldRule` | `ui_fields_rules` | Conditional field rules |
| `FieldRuleDef` | `ui_fields_rules_defs` | Rule definitions |
| `Page` | `pages` | Page registry |
| `UiComponents` | `ui_components` | Component registry |

These mirror the same tables in `plan-sop-ui-fields-service` — see [the UI Fields data model](../plan-sop-ui-fields-service/data-model.md). Keeping them consistent matters when a change lands in only one service.

## KPI and notification entities
| Entity | Table | Purpose |
| --- | --- | --- |
| `Kpi` | `kpi` | KPI definition |
| `KpiConfigAttributes` | `kpi_config_attributes` | KPI attribute config |
| `KpiEntityMap` | `kpi_entity_map` | KPI ↔ entity mapping |
| `NotificationEvents` | `notification_events` | Notification definitions |
| `NotifyUser` | `notify_users` | Recipients |
| `UserNotification` | `user_notifications` | Delivered notifications |
| `SourceNotificationMapping` | `source_notification_mapping` | Source → notification |
| `UserResourcesMap` | `user_resources_map` | User ↔ resource access |
| `Tenant` | `tenants` | Tenant registry |
| `Auditable` | *(mapped superclass)* | Audit columns |

## Identifier conventions
- Action items use a generated `id` returned by `POST /actionitems` — capture it; most follow-up calls need it.
- `entityId` is the source entity (process/subprocess/assumption) the item hangs off.
- Playbooks are addressed by `playbookName`; instances by `instanceId`.

## Seed data required by automation
| Object | Notes |
| --- | --- |
| Source entity | A process or subprocess must exist before an action item can be attached |
| Assigned users | `TEST_AUTOMATION_USER_1` / `_USER_2` must exist in the realm for assignment specs |
| Attribute config | Custom attributes must be configured for editor-field assertions |
| Test data JSON | `testdata/<ENV>/ProcessOrchestrationBackend/` |
