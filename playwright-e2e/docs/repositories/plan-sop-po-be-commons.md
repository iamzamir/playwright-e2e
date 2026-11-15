# PO Backend Commons

> **Full documentation:** [plan-sop-po-be-commons/](plan-sop-po-be-commons/overview.md)
> **Browser dossier:** [plan-sop-po-be-commons.html](plan-sop-po-be-commons.html)

| | |
| --- | --- |
| Repository | `plan-sop-po-be-commons` |
| Type | **Shared library — not deployable** |
| Stack | Java 21 + Kotlin, Spring Boot 3.4.3, Gradle → JFrog |
| Versioning | **git-SHA SNAPSHOT**, not semver — all four consumers pin `2dacec2-SNAPSHOT` (2026-10-05) |
| Direct specs | 0 (correctly) |

Central library packaged into all four backend services: JWT security, RBAC expression root, WebClient config, Kafka audit-log producer, ECS logging, Elastic APM, Liquibase, MapStruct, Key Vault.

**Never target this repo from a spec.** It matters because a change here alters behaviour in every backend service at once — a failure spanning multiple services is the signature of a commons change.

| Detail | Link |
| --- | --- |
| Overview, stack, CI/CD | [overview.md](plan-sop-po-be-commons/overview.md) |
| **Architecture diagrams** | [architecture.md](plan-sop-po-be-commons/architecture.md) — blast radius, version drift |
| Contributed capabilities | [api-contract.md](plan-sop-po-be-commons/api-contract.md) |
| Auditing and event model | [data-model.md](plan-sop-po-be-commons/data-model.md) |
| Config it injects | [environments.md](plan-sop-po-be-commons/environments.md) |
| How it shows up in specs | [test-hooks.md](plan-sop-po-be-commons/test-hooks.md) |
| Coverage and gaps | [automation-coverage.md](plan-sop-po-be-commons/automation-coverage.md) |
| Failure signatures | [troubleshooting.md](plan-sop-po-be-commons/troubleshooting.md) |
