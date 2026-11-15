# Link Management Service

> **Full documentation:** [plan-sop-link-management/](plan-sop-link-management/overview.md)
> **Browser dossier:** [plan-sop-link-management.html](plan-sop-link-management.html)

| | |
| --- | --- |
| Repository | `plan-sop-link-management` |
| Type | Backend Microservice |
| Stack | Java 21, Spring Boot 3.5.16, Gradle, Azure SQL, Kafka |
| Direct specs | 17 (14 in `POBackendLinkManagementBatch.json` + 3 migration) — 21 of 30 active routes |

Owns the link layer between planning entities and the views that render them: view↔entity mapping, view↔procedure mapping, favourites, scope and filter presets, and entity validation jobs. Answers "which views should this entity show, and in what order".

| Detail | Link |
| --- | --- |
| Overview, stack, CI/CD | [overview.md](plan-sop-link-management/overview.md) |
| **Architecture diagrams** | [architecture.md](plan-sop-link-management/architecture.md) — v1 / v2-refactor split |
| All endpoints | [api-contract.md](plan-sop-link-management/api-contract.md) |
| Entities and tables | [data-model.md](plan-sop-link-management/data-model.md) |
| Per-environment URLs | [environments.md](plan-sop-link-management/environments.md) |
| Setup, teardown, waits | [test-hooks.md](plan-sop-link-management/test-hooks.md) |
| Coverage and gaps | [automation-coverage.md](plan-sop-link-management/automation-coverage.md) |
| Failure signatures | [troubleshooting.md](plan-sop-link-management/troubleshooting.md) |
