# Process Orchestration Service

> **Full documentation:** [plan-sop-process-orchestration-service/](plan-sop-process-orchestration-service/overview.md)
> **Browser dossier:** [plan-sop-process-orchestration-service.html](plan-sop-process-orchestration-service.html)

| | |
| --- | --- |
| Repository | `plan-sop-process-orchestration-service` |
| Type | Core Backend Microservice |
| Stack | Java 21, Spring Boot 3.5.16, Gradle, Azure SQL |
| Surface | 23 controllers (+2 v2 under `v2/refactor`), 28 entities, 144 active routes |
| Direct specs | 21 (9 process + 3 calendar + 9 migration), plus 2 AI-proxy search specs — 59 of 144 active routes |

The most load-bearing repo in the platform. Owns the process → subprocess → node hierarchy, calendars and cycles, transitions, templates, scope, supply chain actions, insights, quotas, and ALM publish/deploy.

Nearly every UI spec needs a process to exist, so a change here has the widest blast radius of any service.

| Detail | Link |
| --- | --- |
| Overview, stack, CI/CD | [overview.md](plan-sop-process-orchestration-service/overview.md) |
| **Architecture diagrams** | [architecture.md](plan-sop-process-orchestration-service/architecture.md) |
| All endpoints | [api-contract.md](plan-sop-process-orchestration-service/api-contract.md) |
| Entities and tables | [data-model.md](plan-sop-process-orchestration-service/data-model.md) |
| Per-environment URLs | [environments.md](plan-sop-process-orchestration-service/environments.md) |
| Setup, teardown, polling | [test-hooks.md](plan-sop-process-orchestration-service/test-hooks.md) |
| Coverage and gaps | [automation-coverage.md](plan-sop-process-orchestration-service/automation-coverage.md) |
| Failure signatures | [troubleshooting.md](plan-sop-process-orchestration-service/troubleshooting.md) |
