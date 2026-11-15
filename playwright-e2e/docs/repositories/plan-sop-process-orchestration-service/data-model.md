# Data model — plan-sop-process-orchestration-service

## Persistence
| Aspect | Value |
| --- | --- |
| Database | Azure SQL Server, DB name `${azuresql_po_db:process_orchestration_db}` |
| Driver | `com.microsoft.sqlserver.jdbc.SQLServerDriver` |
| Dialect | `org.hibernate.dialect.SQLServerDialect` |
| Migrations | Liquibase — `classpath:db/changelog/db.changelog-master.xml` |
| Connection pool | HikariCP, max 29, min idle 20, connect timeout 30s |
| Batch size | `hibernate.jdbc.batch_size = 100` |
| Env vars | `azuresql_host`, `azuresql_port`, `azuresql_po_db`, `azuresql_po_user`, `azuresql_po_password` |

## Entities
| Entity | Table | Purpose |
| --- | --- | --- |
| `Node` | `node` | The core hierarchy row — a process *and* a subprocess are both nodes |
| `Process` | *(view/abstraction over `node`)* | Process-level projection |
| `Transition` | *(no explicit `@Table`)* | Node-to-node transitions |
| `NodeAttribute` | `node_attr_mapping` | Attributes attached to a process/subprocess |
| `NodeSchedule` | `node_schedule` | Schedule instances per node |
| `Calendar` | `calendar` | Planning calendar |
| `CalendarCycle` | `calendar_cycles` | Cycles inside a calendar |
| `Template` | `template` | Process templates |
| `TemplateSchema` | `template_schema` | Template JSON schema |
| `TemplateExclusionTenants` | `template_exclusion_tenants` | Tenants excluded from a template |
| `SupplyChainAction` | `supply_chain_actions` | SCA definitions |
| `EventAction` | `event_action` | Event-driven actions |
| `EventActionExecution` | `event_action_execution` | Execution log for event actions |
| `JobExecutionStatus` | `job_execution_status` | **Async job state — backs `GET /job/{jobId}/status`** |
| `Organisation` | `organisation` | Realm/ALM configuration |
| `Customer` | `customer` | Customer record |
| `Tenant` | `tenants` | Tenant registry |
| `QuotaLimits` | `quota_limits` | Quota ceilings per scope |
| `QuotaMeteringConfiguration` | `quota_metering_configuration` | Metering rules |
| `ScopeMetering` | `scope_metering` | Consumption counters |
| `ReportConfiguration` | `report_configuration` | Reporting workspace config |
| `ProcessReportDirectory` | `process_report_directory` | Report folder mapping |
| `DefaultThreshold` | `default_thresholds` | KPI/insight thresholds |
| `NotificationEvents` | `notification_events` | Notification definitions |
| `SourceNotificationMapping` | `source_notification_mapping` | Source → notification link |
| `SourceTypes` | `source_types` | Source type lookup |
| `Auditable` | *(mapped superclass)* | `createdBy` / `createdAt` / `updatedBy` / `updatedAt` |

## Enums and converters
| Type | Notes |
| --- | --- |
| `EventActionType` + `EventActionTypeConverter` | Event action classification |
| `SCAEventType` + `SCAEventTypeConverter` | Supply chain action event type |
| `SCAStatus` + `SCAStatusConverter` | Supply chain action status |
| `EnforcementType` | Quota enforcement mode |
| `OnboardAssumptionType` | Assumption onboarding classification |
| `DataTypeConverter` | Attribute data types |
| `QuotaScopeTypeFactory` / `IQuotaScopeTypeHandler` | Quota scope resolution strategy |

## Identifier conventions
- `processName` and `subprocessName` are **system names**, not display names. They are the path variables in almost every endpoint.
- Display name → system name resolution: `GET /process/name/{displayName}`.
- ID → system name resolution: `GET /process/id/{processId}`.
- Automation must generate unique process names per run; reusing a name across parallel workers causes cross-test interference.

## Seed data required by automation
| Object | Where defined | Notes |
| --- | --- | --- |
| Process templates | Service DB, per realm | `POST /process/template` requires an existing template |
| Calendar + cycle | Created per-spec | `ProcessOrchestrationBackend/Calendar/*` |
| Realm/tenant onboarding | `POST /tenant/onboard` | Must be complete before process creation |
| Roles | `POST /role/admin`, `POST /role/planner` | RBAC specs depend on these |
| Test data JSON | `playwright-e2e/testdata/<ENV>/ProcessOrchestrationBackend/` | Per-spec inputs |
