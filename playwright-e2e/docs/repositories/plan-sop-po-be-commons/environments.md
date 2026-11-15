# Environments — plan-sop-po-be-commons

The library is not deployed to QA / INTEROP / PSR. It is packaged **inside** each consuming service, so its configuration takes effect wherever those services run.

## Where it runs
| ENVIRONMENT | Presence |
| --- | --- |
| QA / INTEROP / PSR | Embedded in `plan-sop-process-orchestration-service`, `plan-sop-actionitem`, `plan-sop-link-management`, `plan-sop-ui-fields-service` |
| Standalone | Only locally, on port `9999`, for library development |

## Environment variables it introduces into every consumer
| Variable | Default | Effect |
| --- | --- | --- |
| `IS_EFS_INTEGRATION_ENABLED` | `true` | Enables Kafka audit-log publishing |
| `AUDIT_LOG_ENABLED_REALM_IDS` | `ca7623d3-b234-431c-a445-4a1d5444668e`, `9beb5e0f-8e95-4979-b438-edbc7b054981` | Realm allowlist for audit events |
| `EFS_AUDIT_LOG_TOPIC_NAME` | *(empty)* | Kafka topic |
| `EFS_BOOTSTRAP_SERVERS` | *(empty)* | Kafka brokers |
| `PUBLISH_ACK_PROCESSOR_POOL_SIZE` | `3` (test) | Ack processing threads |
| `PO_OPS_ADMINS` | *(empty)* | Central ops-admin subject IDs |
| `AZ_KV_NAME` | `OVERRIDE_AS_PER_RUNTIME_ENV` | Azure Key Vault resource name |

## Realm alignment with automation
`configs/setup.js` sets `REALM_ID = "ca7623d3-b234-431c-a445-4a1d5444668e"` — the first entry in the audit allowlist. The INTEROP automation realm therefore emits audit events on every mutating call the suite makes.

## Version pinning — the thing to watch
The artifact is published as a **git-SHA snapshot**, not a semantic version:

```gradle
version: '2dacec2-SNAPSHOT'   // pinned by all four consumers as of 2026-10-05
```

On 2026-09-16 the pins differed (Link Management `251ccd3`, the others `aa6e444`); the ABP-19137 CVE work aligned them. Nothing enforces the alignment.

Consequences:
- Two services can run different commons builds at the same time in the same environment.
- A SNAPSHOT can be republished under the same coordinate, so "same version" does not guarantee "same bytes".
- When a cross-service failure appears, compare the pinned commons SHA in each consumer's `build.gradle` before investigating the services individually.

## Local run
| Setting | Value |
| --- | --- |
| Port | `9999`, HTTP/2 enabled |
| Smoke endpoint | `GET /hello` |
| Liquibase | Disabled (`spring.liquibase.enabled: false`) |
| Test profile | `application-test.yaml`, Testcontainers-provided datasource, `efs.is-enabled: false` |
| Publish | `./gradlew artifactoryPublish` |
