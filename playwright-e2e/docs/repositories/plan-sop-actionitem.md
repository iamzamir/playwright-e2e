# Action Item Service

> **Full documentation:** [plan-sop-actionitem/](plan-sop-actionitem/overview.md)
> **Browser dossier:** [plan-sop-actionitem.html](plan-sop-actionitem.html)

| | |
| --- | --- |
| Repository | `plan-sop-actionitem` |
| Type | Backend Microservice |
| Stack | Java 21, Spring Boot 3.5.16, Gradle, Azure SQL |
| Local port | 8080 |
| Direct specs | 8 (`POBackendActionItemBatch.json`) — 13 of 73 active routes |

Owns action items and **playbooks**: creation, assignment, status, bulk operations, templates, comments, and KPI roll-ups. Reached both directly and through Process Orchestration's `ActionItemProxyController`.

| Detail | Link |
| --- | --- |
| Overview, stack, CI/CD | [overview.md](plan-sop-actionitem/overview.md) |
| **Architecture diagrams** | [architecture.md](plan-sop-actionitem/architecture.md) |
| All endpoints | [api-contract.md](plan-sop-actionitem/api-contract.md) |
| Entities and tables | [data-model.md](plan-sop-actionitem/data-model.md) |
| Per-environment URLs | [environments.md](plan-sop-actionitem/environments.md) |
| Setup, teardown, waits | [test-hooks.md](plan-sop-actionitem/test-hooks.md) |
| Coverage and gaps | [automation-coverage.md](plan-sop-actionitem/automation-coverage.md) |
| Failure signatures | [troubleshooting.md](plan-sop-actionitem/troubleshooting.md) |
