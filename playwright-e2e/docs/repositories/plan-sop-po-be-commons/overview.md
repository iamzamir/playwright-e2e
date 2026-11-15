# PO Backend Commons (shared library)

| Field | Value |
| --- | --- |
| Repository | `plan-sop-po-be-commons` |
| GitHub | `BY-Product-Development/plan-sop-po-be-commons` |
| Type | **Shared library — not a deployable service** |
| Language / Runtime | Java 21 + Kotlin (JVM) |
| Framework | Spring Boot 3.4.3 |
| Build tool | Gradle, published to JFrog Artifactory (`com.jfrog.artifactory` 4.33.1) |
| Artifact | `com.blueyonder.process-orchestration:plan-sop-po-be-commons` |
| Owner | sairaghava.katepally@blueyonder.com |
| Standalone port | `9999` (HTTP/2 enabled) — used only when running the lib's own sample app |

## Purpose
Central library holding code shared by **all PO backend services**, so each service stays light and consistent. Stated goal in its README: *"Avoid duplicate code in all PO-Backend Services and keep them light."*

It provides:
- Shared security/JWT handling (`nimbus-jose-jwt`)
- WebClient/WebFlux base configuration
- Kafka producers, including the **EFS audit-log producer**
- Elastic APM agent + ECS structured logging (`log4j2-ecs-layout`)
- Liquibase core, MapStruct mappers, shared JPA/auditing plumbing
- Azure Key Vault **secrets** (`spring-cloud-azure-starter-keyvault-secrets`; since 2026-09-17 the aggregate starter, with its JCA and certificates sub-starters, is no longer pulled)
- Springdoc/OpenAPI wiring
- Central ops-admin configuration (`po.central.ops.admins`)

## Why automation cares
There are no tests for this repo, and there should not be direct UI/API specs against it. It matters for a different reason: **a version bump here changes behaviour in every consuming service at once**. Auth, logging, audit events, and Liquibase all originate from this library, so a platform-wide, cross-service failure pattern is a signal to check which commons version each service pins.

Every consumer pins it by git SHA. `plan-sop-ui-fields-service` also excludes `org.liquibase` and `com.microsoft.sqlserver`:
```gradle
implementation(group: 'com.blueyonder.process-orchestration',
               name: 'plan-sop-po-be-commons',
               version: '2dacec2-SNAPSHOT') { ... }
```
The version is a **git-SHA snapshot**, not semantic — two services can silently run different commons builds. As of 2026-10-05 all four consumers pin `2dacec2` (on 2026-09-16 Link Management was on `251ccd3`, the others on `aa6e444`).

## Repository layout
| Path | Contents |
| --- | --- |
| `src/main/resources/application.yaml` | Global defaults; consumers must override the datasource |
| `src/main/resources/application-dev.yaml` | Dev overrides |
| `src/test/resources/application-test.yaml` | Test profile (Testcontainers-backed) |
| `src/main/resources/po-commons-central-log4j.xml` | Central logging config |
| `gradle.properties` | All versions are externalised as properties |

## Build and publish
```bash
./gradlew clean build
./gradlew artifactoryPublish   # publishes the SNAPSHOT to JFrog
```

## Notable configuration
| Setting | Value | Relevance |
| --- | --- | --- |
| `spring.codec.max-in-memory-size` | `30MB` | Comment says **do not override in consumers** |
| `spring.liquibase.enabled` | `false` | Consumers enable it themselves |
| `server.port` / `http2` | `9999`, HTTP/2 on | Library's own sample app only |
| `logging.config` | `classpath:po-commons-central-log4j.xml` | Central log format for all consumers |
| `efs.is-enabled` | `IS_EFS_INTEGRATION_ENABLED`, default `true` | Audit-log publishing to Kafka |
| `efs.audit-log-enabled-realm-ids` | `ca7623d3-b234-431c-a445-4a1d5444668e`, `9beb5e0f-8e95-4979-b438-edbc7b054981` | **Audit logging is realm-allowlisted** |
| `efs.producers.po-audit-log-producer` | `EFS_AUDIT_LOG_TOPIC_NAME`, `EFS_BOOTSTRAP_SERVERS` | Kafka target |
| `po.central.ops.admins` | `PO_OPS_ADMINS` | Ops admin subject IDs |
| `azure.kv-resource-name` | `AZ_KV_NAME` | Key Vault |

The first allowlisted audit realm, `ca7623d3-b234-431c-a445-4a1d5444668e`, is the same GUID as `REALM_ID` in `playwright-e2e/configs/setup.js` — so audit events **are** produced for the automation realm.

## Consumers
| Consumer | Pinned version (2026-10-05) |
| --- | --- |
| `plan-sop-process-orchestration-service` | `2dacec2-SNAPSHOT` — core consumer |
| `plan-sop-ui-fields-service` | `2dacec2-SNAPSHOT` — excludes Liquibase and the SQL Server driver |
| `plan-sop-actionitem` | `2dacec2-SNAPSHOT` |
| `plan-sop-link-management` | `2dacec2-SNAPSHOT` (was `251ccd3`) |

## Recent changes (since 2026-09-16)
| Change | Ticket | Impact |
| --- | --- | --- |
| Depend on `spring-cloud-azure-starter-keyvault-secrets` instead of the aggregate Key Vault starter. The JCA jar bundled its own `httpclient5` 5.4.3 / `httpcore5` 5.3.4, which Xray flagged (incl. one critical) on every PO service | ABP-19137 (`2dacec2`) | Consumers on older SHAs still carry the finding |
| `HttpClient` imports fixed: `Arrays` had resolved to a BouncyCastle class shaded in the JCA jar, and `Objects` to a Guava copy inside `kotlin-gradle-plugin`. Both now use `java.util`; hash values are unchanged | ABP-19137 | Explains `NoClassDefFoundError` from `HttpClient` when a consumer excluded the JCA jar on an older SHA |

## CI/CD workflows
| Workflow | Purpose |
| --- | --- |
| `pr.yml` | PR build |
| `main.yml` | Main branch build |
| `publish.yml` | Publish artifact to Artifactory |
| `byx-jfrog-xray-default-branch-push.yml` | Xray security scan |

## Quality gates
JFrog Xray · Spotless · Testcontainers-backed integration tests (`testcontainers-kafka` 2.0.3)

## Related docs
- [architecture.md](architecture.md)
- [api-contract.md](api-contract.md)
- [data-model.md](data-model.md)
- [environments.md](environments.md)
- [test-hooks.md](test-hooks.md)
- [automation-coverage.md](automation-coverage.md)
- [troubleshooting.md](troubleshooting.md)
