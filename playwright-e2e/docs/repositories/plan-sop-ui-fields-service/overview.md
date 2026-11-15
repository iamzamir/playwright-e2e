# UI Fields Service

| Field | Value |
| --- | --- |
| Repository | `plan-sop-ui-fields-service` |
| GitHub | `BY-Product-Development/plan-sop-ui-fields-service` |
| Type | Backend Microservice |
| Language / Runtime | Java 21 |
| Framework | Spring Boot 3.5.16, Spring Cloud 2023.0.3 |
| Build tool | Gradle |
| Database | Azure SQL Server (`${azuresql_dc_database}`), Liquibase-managed |
| Local Swagger | `http://localhost:8086/swagger-ui/index.html` |
| Shared library | `com.blueyonder.process-orchestration:plan-sop-po-be-commons` `2dacec2-SNAPSHOT` |
| Root package | `com.blueyonder.crud` (not `uifields`) |

## Purpose
The **metadata service that tells the UI how to render itself**. It owns attribute definitions and allowed values, UI field definitions, field groups and rules, page registration, UI component registration, and list/detail/filter page configuration.

**lui is a verified caller.** Its `src/config.ts` builds `${apiURL}/ui-fields/v1/...` URLs under config keys (`listingPageConfig`, `listingPageConfigWithFilter`, `detailPageConfig`, `uiFieldConfig`, `editorConfig`, `processTemplateEditor`), so a literal-route grep misses them. They drive the PO process/subprocess listing, process, subprocess and calendar details, and the process, subprocess, template, calendar and cycle editors. Planning Space has no UI Fields call. See the [cross-repository usage report](usage-across-repositories.md).

## Why automation cares
A field-configuration change surfaces as "the column/field is missing" in a `ProcessOrchestration/**` UI spec, with every API still returning 200. Since 2026-10-01 two backend specs (`tests/ProcessOrchestrationBackend/UIFields/`, 39 tests) assert the four lui-used routes against per-environment baselines, so that drift now fails fast at the API layer.

Field lists are **tenant-configured**: QA and INTEROP return different columns for the same page, so expectations live in `testdata/<ENV>/ProcessOrchestrationBackend/UIFields/`.

## Repository layout
| Path | Contents |
| --- | --- |
| `src/main/java/**/controller` | 9 REST controllers — see [api-contract.md](api-contract.md) |
| `src/main/java/**/entity` | 10 JPA entities |
| `src/main/resources/application.yaml` | Datasource, Liquibase, LIAM security block |
| `.github/workflows/` | 13 workflows |

## Build and run
```bash
./gradlew clean build
./gradlew bootRun
```
Requires `azuresql_host`, `azuresql_port`, `azuresql_dc_database`, `azuresql_dc_user`, `azuresql_dc_password` — unlike the other services, these have **no defaults** and startup fails without them.

## Notable configuration
| Setting | Default | Relevance |
| --- | --- | --- |
| `LIAM_ENABLED` | `true` | Master switch for LIAM security |
| `LIAM_RBAC_ENABLED` | `true` | Role-based checks |
| `LIAM_ABAC_ENABLED` | `true` | Attribute-based checks |
| `liamRbacCacheTimeout` | `0` | RBAC cache lifetime in minutes — `0` disables caching |
| `liamRbacCacheSize` | `0` | RBAC cache size |
| JPA static metamodel | `hibernate-jpamodelgen` | Powers dynamic criteria queries for search |
| ECS logging | `log4j2-ecs-layout` 1.7.0 | Structured logs |

Because the RBAC cache defaults to `0`, permission changes take effect immediately here — unlike Process Orchestration, which needs `GET /cache/clear`.

## Upstream dependencies
| Target | Purpose |
| --- | --- |
| `plan-sop-po-be-commons` | Shared library (Liquibase and SQL Server driver excluded) |
| LIAM | RBAC + ABAC enforcement |

## Downstream consumers
| Consumer | Purpose | Source-verified call |
| --- | --- | --- |
| `plan-sop-lui` | PO listing columns/filters, process/subprocess/calendar details, process/subprocess/template/calendar/cycle editors | **Yes** — 4 routes (see [usage report](usage-across-repositories.md)) |
| `plan-sop-planning-mfe` | — | No (its `uiFields` identifiers are local card/lever config objects) |
| `plan-sop-actionitem` | Mirrors the same UI-field table family | No; duplicated model, not a call |
| `plan-sop-ui-automation` | `POBackendUIFieldsBatch` contract specs | Yes — same 4 routes |

## Recent changes (since 2026-09-16)
- Spring Boot 3.5.14 → 3.5.16, commons `aa6e444` → `2dacec2-SNAPSHOT`, JFrog Xray workflow and build CVE fixes (ABP-19137). No route changes.

## CI/CD workflows
`pull-request.yml`, `build-and-push-docker-image.yml`, `deployWorkflow.yml`, `deployWorkflow-staging.yml`, `deployWorkflow-prod.yml`, `internal-rnd-staging-deployments.yml`, `prod-cval-deployments.yml`, `prod-customer-ecosystem-deployments.yml`, `bd-scan.yaml`, `jfrog-xray-scan.yml`, `42crunch-wf-call.yaml`.

## Quality gates
CodeQL · Codacy · 42Crunch · BlackDuck · Spotless

## Related docs
- [architecture.md](architecture.md)
- [api-contract.md](api-contract.md)
- [usage-across-repositories.md](usage-across-repositories.md)
- [data-model.md](data-model.md)
- [environments.md](environments.md)
- [test-hooks.md](test-hooks.md)
- [automation-coverage.md](automation-coverage.md)
- [troubleshooting.md](troubleshooting.md)
