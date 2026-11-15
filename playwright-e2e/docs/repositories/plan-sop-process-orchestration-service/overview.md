# Process Orchestration Service

| Field | Value |
| --- | --- |
| Repository | `plan-sop-process-orchestration-service` |
| GitHub | `BY-Product-Development/plan-sop-process-orchestration-service` |
| Type | Backend Microservice |
| Language / Runtime | Java 21 (`JavaLanguageVersion.of(21)`) |
| Framework | Spring Boot 3.5.16, Spring Cloud 2025.0.2 |
| Build tool | Gradle (`settings.gradle` → `plan-sop-process-orchestration-service`, build cache enabled) |
| Artifact group / version | `com.blueyonder.po` / `1.0.0` |
| Database | Azure SQL Server (`process_orchestration_db`), Liquibase-managed |
| Local Swagger | `http://localhost:<port>/swagger-ui/index.html` |
| Local profile | `spring.profiles.active=local` |

## Purpose
The core backend of Process Orchestration. It owns the **process → subprocess → node** hierarchy, the calendar/cycle scheduling model, node transitions, templates, scope, supply chain actions, insights, quotas, RBAC proxying, and ALM publish/deploy of PO configuration. Most other Plan-SOP services hang off the entities this service defines.

## Why automation cares
This is the single most load-bearing repo for the suite. Nearly every UI spec needs a process to exist, and every backend spec under `tests/ProcessOrchestrationBackend/` calls it directly. It is also the service behind the `DataSetupBatch/ProcessOrchestration/` cleanup specs — if its APIs change, both the data-setup layer and the functional layer break at once.

## Repository layout
| Path | Contents |
| --- | --- |
| `src/main/java/**/controller` | 23 REST controllers — see [api-contract.md](api-contract.md) |
| `src/main/java/**/entity` | 28 JPA entities — see [data-model.md](data-model.md) |
| `src/main/resources/application.yaml` | Default profile; datasource, multipart, async timeouts |
| `src/main/resources/db/changelog/db.changelog-master.xml` | Liquibase master changelog |
| `.github/workflows/` | 16 workflows (build, deploy, scan, APIM) |
| `Dockerfile` | Container image build |

## Build and run
```bash
./gradlew clean build
./gradlew bootRun            # add -Dspring.profiles.active=local
```
Set `spring.profiles.active=local` in the run configuration before starting locally.

## Notable configuration
| Setting | Value | Why it matters to tests |
| --- | --- | --- |
| `spring.servlet.multipart.max-file-size` | `10MB` (`MULTIPART_MAX_FILE_SIZE`) | ALM exchange deploy posts a ZIP; smaller values return HTTP 413 |
| `spring.servlet.multipart.max-request-size` | `12MB` | Must exceed max-file-size to fit MIME boundaries |
| `spring.mvc.async.request-timeout` | `1800000` (30 min) | Long-running migration/export calls |
| `spring.datasource.hikari.maximum-pool-size` | `29` | Caps parallel DB work — relevant to high-worker runs |
| `az_sql_connection_timeout` | `30000` | DB connect timeout |

## Upstream dependencies (this repo calls)
| Target | Purpose |
| --- | --- |
| `plan-sop-actionitem` | Proxied action-item CRUD via `ActionItemProxyController` |
| LIAM / RBAC | Permission resolution via `RbacProxyController`, `@PreAuthorize("@ibp.hasAction(...)")` |
| Procedure service | `ProcedureProxyController` onboarding |
| ALM / Foundation Model | Config publish, deploy, exchange |
| `plan-sop-po-be-commons` | Shared library |

## Downstream consumers (call this repo)
| Consumer | Purpose |
| --- | --- |
| `plan-sop-lui` | Process Orchestration UI |
| `plan-sop-planning-mfe` | Process context for Planning Space |
| `plan-sop-ui-automation` | `ProcessOrchestrationBackend/` + `DataSetupBatch/` specs |

## Recent changes (since 2026-09-16)
| Change | Ticket | Test impact |
| --- | --- | --- |
| ALM export looks up the ALM customer by realm **id** when the name lookup finds nothing (Gravitee tokens carry no `by_realm` claim). If neither finds a customer, the job now **fails with error `2104` (404, "No ALM customer found for realm X")** instead of hanging at `INPROGRESS` | SM-39457 | Gravitee migration/export specs should no longer time out waiting on a stuck job; a missing ALM realm registration is now an explicit job failure |
| Export/import carries the process **template id and name** (`export-process` procedure, `ProcessTreeStruct`); import validates them and falls back to the default-template flow when id and name disagree | ABP-18453 | `Migration/Test_002_ProcessMigration`, `Test_003_FullAndPartialExport` payloads include template info |
| Async threads always restore the user bearer, so modern-flow headers forward it as `X-Invocation-User-Access-Token` (previously skipped on Gravitee realms) | SM-37556 | Fixes "invalid access token" from procedures triggered asynchronously (e.g. on process start) |
| `validCheckSum ANY` on the `get-process` / `export-process` Liquibase procedures | ABP-19388 | Fixes checksum-error startup failures after those procedures change |
| JFrog Xray fixes; Spring Boot 3.5.14 → 3.5.16; commons → `2dacec2-SNAPSHOT` | ABP-19137 | None expected; no route changes |

## CI/CD workflows
| Workflow | Purpose |
| --- | --- |
| `pull-request.yml` | PR build + checks |
| `build-and-push-docker-image.yml` | Image build/push |
| `deployWorkflow.yml`, `deployWorkflow-staging.yml`, `deployWorkflow-prod.yml` | Environment deploys |
| `prod-cval-deployments.yml`, `prod-customer-ecosystem-deployments.yml` | Production rollouts |
| `internal-rnd-staging-deployments.yml` | Internal R&D staging |
| `deploy-apim.yaml`, `update_apim.yaml` | API Management gateway config |
| `checkKeyVaultEntries.yml` | Key Vault validation |
| `bd-scan.yaml`, `jfrog-xray-scan.yml`, `42crunch-wf-call.yaml` | Security scans |

## Quality gates
| Gate | Where |
| --- | --- |
| CodeQL | GitHub code scanning |
| Codacy | Grade + coverage badges in repo README |
| 42Crunch | API security audit report |
| BlackDuck | OSS composition |
| SonarQube | `org.sonarqube` 6.0.1.5171 |
| Spotless | `com.diffplug.spotless` 7.0.2 |

## Related docs
- [architecture.md](architecture.md)
- [api-contract.md](api-contract.md)
- [data-model.md](data-model.md)
- [environments.md](environments.md)
- [test-hooks.md](test-hooks.md)
- [automation-coverage.md](automation-coverage.md)
- [troubleshooting.md](troubleshooting.md)
