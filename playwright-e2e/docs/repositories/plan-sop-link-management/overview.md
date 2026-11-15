# Link Management Service

| Field | Value |
| --- | --- |
| Repository | `plan-sop-link-management` |
| GitHub | `BY-Product-Development/plan-sop-link-management` |
| Type | Backend Microservice |
| Language / Runtime | Java 21 |
| Framework | Spring Boot 3.5.16, Spring Cloud 2023.0.0, Spring Kafka |
| Shared library | `plan-sop-po-be-commons` `2dacec2-SNAPSHOT` (was `251ccd3`, a different SHA from the other services) |
| Build tool | Gradle |
| Artifact group / version | `com.blueyonder.linkmanagement` / `0.0.1-SNAPSHOT` |
| Database | Azure SQL Server (`linkMgr`), Liquibase-managed |

## Purpose
Owns the **link layer** between planning entities and the views/dashboards that render them: view registration, view-to-entity mapping, view-to-procedure mapping, user favourites, scope and filter presets, admin filters, and entity validation jobs. It is the service that answers "which views should this process/subprocess/assumption show, and in what order".

## Why automation cares
Link Management underpins the largest backend suite in the repo — `POBackendLinkManagementBatch.json` covers 14 specs, and 70% of its active routes are exercised (the highest of any service). Every Planning Space load calls `lm-search/v2`. It is also the invisible dependency behind most Planning Space view specs (`ViewsBatch`, `ViewSearch`, `DuplicateView`, `ScopeBatch`): if a mapping is wrong, the UI renders the wrong views and the failure surfaces as a UI assertion, not an API error.

## Repository layout
| Path | Contents |
| --- | --- |
| `src/main/java/**/controller` | 10 REST controllers — see [api-contract.md](api-contract.md) |
| `src/main/java/**/entity` | 15 JPA entities |
| `src/main/resources/application.yaml` | Datasource, Liquibase (45-min lock wait), Kafka, codec limits |
| `.github/workflows/` | 15 workflows |

## Build and run
```bash
./gradlew clean build
./gradlew bootRun
```

## Notable configuration
| Setting | Value | Relevance |
| --- | --- | --- |
| `spring.codec.max-in-memory-size` | `30MB` | Large view-mapping payloads |
| `spring.mvc.async.request-timeout` | `1800000` (30 min) | Bulk mapping and validation jobs |
| `liquibase.changelogLockWaitTimeInMinutes` | `45` | A stuck lock delays startup for up to 45 minutes |
| Hikari pool | max `100`, min idle `75` | Highest pool in the platform — mapping is read-heavy |
| `LM_JDBC_BATCH_SIZE` | `50` | Batch inserts for bulk mapping |
| ShedLock 7.7.0 (JDBC) | — | Distributed scheduler locks |
| Spring Kafka | — | Event publishing |

## Upstream dependencies
| Target | Purpose |
| --- | --- |
| LIAM / RBAC | Permission checks |
| Kafka | Event publication |
| Procedure service | Entity-view-procedure mapping references |

## Downstream consumers
| Consumer | Purpose |
| --- | --- |
| `plan-sop-planning-mfe` | Resolves which views to render for a context |
| `plan-sop-lui` | View manager and settings UI |
| `plan-sop-process-orchestration-service` | Scope and view context |
| `plan-sop-ui-automation` | `ProcessOrchestrationBackend/LinkManagement/**` |

## Recent changes (since 2026-09-16)
| Change | Ticket | Test impact |
| --- | --- | --- |
| Entity-view-procedure **export now carries a per-view `reason`**, and import honours it: `PLANNER_WANTS_NO_PROCEDURES` is preserved (a view with no active procedures is exported with that reason and re-created as a deliberate "no procedures" mapping), `PROCEDURES_NEVER_MAPPED_TO_VIEW` and the default (null) are handled separately | SM-33313 | `Migration/Test_008_EntityViewProcedureMappingMigration` round-trips should now preserve the planner's "no procedures" choice instead of dropping it |
| Unused Key Vault entry removed from `actions/keyVaultConfig.json` (the starter was already commented out in `build.gradle`) | #310 | None |
| JFrog Xray workflow, Dockerfile and build CVE fixes; Spring Boot 3.5.14 → 3.5.16; commons → `2dacec2-SNAPSHOT` | ABP-19137 | None expected; no route changes |

## CI/CD workflows
`pull-request.yml`, `build-and-push-docker-image.yml`, `deployWorkflow.yml`, `deployWorkflow-staging.yml`, `deployWorkflow-prod.yml`, `internal-rnd-staging-deployments.yml`, `prod-cval-deployments.yml`, `prod-customer-ecosystem-deployments.yml`, `update_apim.yaml`, `bd-scan.yaml`, `jfrog-xray-scan.yml`, `42crunch-wf-call.yaml`.

## Quality gates
CodeQL · Codacy · 42Crunch · BlackDuck · SonarQube · Spotless

## Related docs
- [architecture.md](architecture.md) — includes the v1 / v2-refactor split
- [api-contract.md](api-contract.md)
- [data-model.md](data-model.md)
- [environments.md](environments.md)
- [test-hooks.md](test-hooks.md)
- [automation-coverage.md](automation-coverage.md)
- [troubleshooting.md](troubleshooting.md)
