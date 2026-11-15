# Data model — plan-sop-po-be-commons

The library owns **no tables of its own**. It supplies persistence plumbing that every consuming service inherits.

## Persistence contract for consumers
| Aspect | Value |
| --- | --- |
| Datasource | **Must be overridden by the consumer** — the library ships commented-out placeholders |
| Liquibase | `spring.liquibase.enabled: false` here; each consumer enables and points at its own changelog |
| JPA | `spring-boot-starter-data-jpa` provided |
| Mapping | MapStruct for DTO ↔ entity |
| Driver | Not pinned by the library — `plan-sop-ui-fields-service` explicitly excludes `com.microsoft.sqlserver` and `org.liquibase` from the dependency to control its own versions |

```yaml
# From src/main/resources/application.yaml — consumers MUST override:
#datasource:
#  driver-class-name: ${OVERRIDE-IN-CONSUMER}
#  url: ${OVERRIDE-IN-CONSUMER}
#  username: ${OVERRIDE-IN-CONSUMER}
#  password: ${OVERRIDE-IN-CONSUMER}
```

## Shared auditing
Every consuming service defines an `Auditable` mapped superclass with the same audit columns:

| Column | Meaning |
| --- | --- |
| `createdBy` | Subject ID of the creator |
| `createdAt` | Creation timestamp |
| `updatedBy` | Subject ID of the last modifier |
| `updatedAt` | Last modification timestamp |

`Auditable` appears in `plan-sop-process-orchestration-service`, `plan-sop-actionitem`, `plan-sop-link-management`, and `plan-sop-ui-fields-service` — the consistency comes from this library.

For automation this means: after a create or update, `createdBy` / `updatedBy` should hold the automation user's subject ID (`SUBJECT_ID` in `configs/setup.js`). A mismatch usually means the call ran under the machine/client-credentials identity rather than the intended test user.

## Event model (EFS audit log)
| Element | Value |
| --- | --- |
| Producer | `po-audit-log-producer` |
| Transport | Kafka |
| Topic | `EFS_AUDIT_LOG_TOPIC_NAME` |
| Brokers | `EFS_BOOTSTRAP_SERVERS` |
| Enabled | `IS_EFS_INTEGRATION_ENABLED`, default `true` (test profile default `false`) |
| Realm allowlist | `AUDIT_LOG_ENABLED_REALM_IDS` — defaults to `ca7623d3-b234-431c-a445-4a1d5444668e`, `9beb5e0f-8e95-4979-b438-edbc7b054981` |
| Ack processing | `PUBLISH_ACK_PROCESSOR_POOL_SIZE` |

Only allowlisted realms emit audit events. The first GUID matches `REALM_ID` in `playwright-e2e/configs/setup.js`, so the INTEROP automation realm **does** produce audit events.

## Ops configuration
| Property | Env var | Purpose |
| --- | --- | --- |
| `po.central.ops.admins` | `PO_OPS_ADMINS` | Subject IDs granted central ops-admin rights across services |
| `azure.kv-resource-name` | `AZ_KV_NAME` | Key Vault holding service secrets |

An account listed in `PO_OPS_ADMINS` carries elevated rights in every consuming service — a negative RBAC spec will not see the expected 403 if its "unauthorized" user is in that list.

## Test-profile model
The library's own tests use Testcontainers (`testcontainers-kafka` 2.0.3) with the datasource injected via `@DynamicPropertySource`, and `efs.is-enabled: false` by default — so unit tests do not publish audit events.
