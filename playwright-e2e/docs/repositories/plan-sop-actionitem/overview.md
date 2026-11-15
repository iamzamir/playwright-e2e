# Action Item Service

| Field | Value |
| --- | --- |
| Repository | `plan-sop-actionitem` |
| GitHub | `BY-Product-Development/plan-sop-actionitem` |
| Type | Backend Microservice |
| Language / Runtime | Java 21 |
| Framework | Spring Boot 3.5.16, Spring Cloud 2023.0.3 |
| Build tool | Gradle |
| Artifact group / version | `com.blueyonder.actionitem` / `0.0.1-SNAPSHOT` |
| Database | Azure SQL Server (`actionitem`), Liquibase-managed |
| Local port | `8080` (`${port:8080}`) |
| Local Swagger | `http://localhost:8080/swagger-ui/index.html` |

## Purpose
Owns **action items** and **playbooks** across the ecosystem: creation, assignment, status tracking, bulk operations, due-date extension, templates, comments, and KPI roll-ups. It also carries its own UI-field/attribute configuration surface (`attribute-config`, `ui-field-config`) so action-item editors and list pages can be configured per tenant.

## Why automation cares
Action items are created both directly against this service and indirectly through Process Orchestration's `ActionItemProxyController`. Backend specs under `tests/ProcessOrchestrationBackend/ActionItem/` and UI specs under `tests/ProcessOrchestration/ActionItemsBatch/` both depend on it. The service also drives the "My Task" card in Planning Space.

## Repository layout
| Path | Contents |
| --- | --- |
| `src/main/java/**/controller` | 14 REST controllers — see [api-contract.md](api-contract.md) |
| `src/main/java/**/entity` | 32 JPA entities including the playbook family |
| `src/main/resources/application.yaml` | Datasource, Liquibase, Jackson, Hikari (max pool 50) |
| `.github/workflows/` | 18 workflows |

## Build and run
```bash
./gradlew clean build
./gradlew bootRun
```
Override `azuresql_host`, `azuresql_ai_database`, `azuresql_ai_user`, `azuresql_ai_password` for a local DB.

## Notable configuration
| Setting | Value | Relevance |
| --- | --- | --- |
| `server.port` | `${port:8080}` | Local Swagger port |
| `hikari.maximum-pool-size` | `50` | Higher headroom than PO |
| `hibernate.connection.isolation` | `4096` (SNAPSHOT) | Reduces lock contention on bulk ops |
| `jpa.open-in-view` | `true` | Lazy loading during serialization |
| ShedLock 4.42.0 | — | Distributed scheduler locks — recurring playbooks run once per cluster |
| `reflectoring.trace` | `ACTIONITEM_PRINT_STACKTRACE` (default `false`) | Turn on to get stack traces in error responses |

## Upstream dependencies
| Target | Purpose |
| --- | --- |
| Collaboration service | `CollaborationProxyController` → `POST /channel` |
| LIAM / RBAC | `RbacProxyController`, `@PreAuthorize` on playbooks and attributes |

## Downstream consumers
| Consumer | Purpose |
| --- | --- |
| `plan-sop-process-orchestration-service` | Proxies action-item CRUD in process context |
| `plan-sop-lui` | Action item list/detail UI |
| `plan-sop-planning-mfe` | "My Task" card |
| `plan-sop-ui-automation` | `ProcessOrchestrationBackend/ActionItem/**`, `ProcessOrchestration/ActionItemsBatch/**` |

## Recent changes (since 2026-09-16)
| Change | Ticket | Test impact |
| --- | --- | --- |
| Playbook search computes "today" in **UTC** (was the server's default zone) | ABPIBP-7362 | Due/overdue playbook filters near midnight can differ from an `Australia/Adelaide` expectation by a day |
| Playbook-initiated notification now carries the playbook id (not the instance id) and is sent once per initiation; templated notifications drop `navLink` and no longer substitute entity type/title/subtitle | ABPIBP-7362 | Notification assertions must not expect a deep link |
| Spring 7 webmvc/webflux pins dropped; JFrog Xray workflow and build CVE fixes; commons `aa6e444` → `2dacec2-SNAPSHOT` | ABP-19137 | None expected; no route changes |

## CI/CD workflows
`pull-request.yml`, `build-and-push-docker-image.yml`, `deployWorkflow.yml`, `deployWorkflow-staging.yml`, `deployWorkflow-prod.yml`, `internal-rnd-staging-deployments.yml`, `prod-cval-deployments.yml`, `prod-customer-ecosystem-deployments.yml`, `update_apim.yaml`, plus `bd-scan.yaml`, `jfrog-xray-scan.yml`, `42crunch-wf-call.yaml`.

## Quality gates
CodeQL · Codacy (grade + coverage) · 42Crunch · BlackDuck · SonarQube 6.0.1.5171 · Spotless 7.0.2

## Related docs
- [architecture.md](architecture.md)
- [api-contract.md](api-contract.md)
- [data-model.md](data-model.md)
- [environments.md](environments.md)
- [test-hooks.md](test-hooks.md)
- [automation-coverage.md](automation-coverage.md)
- [troubleshooting.md](troubleshooting.md)
