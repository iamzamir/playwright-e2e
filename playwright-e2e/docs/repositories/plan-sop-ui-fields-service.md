# UI Fields Service

> **Full documentation:** [plan-sop-ui-fields-service/](plan-sop-ui-fields-service/overview.md)
> **Browser dossier:** [plan-sop-ui-fields-service.html](plan-sop-ui-fields-service.html)

| | |
| --- | --- |
| Repository | `plan-sop-ui-fields-service` |
| Type | Backend Microservice |
| Stack | Java 21, Spring Boot 3.5.16, Gradle, Azure SQL |
| Local port | 8086 |
| Gateway prefix (OLD) | `cbp/<env>/ibp/ui-fields/v1` (`UI_FIELDS_BASE` in `setup.js`) |
| Direct specs | 2 (`POBackendUIFieldsBatch.json`) — 4 of 28 active routes |

The metadata service that tells the UI how to render itself: attribute definitions and values, UI fields, field groups and rules, page registration, component registry, and list/detail/filter page configuration.

**lui calls it** for the Process Orchestration listing, process/subprocess/calendar details, and every create/edit form (`list-page-config`, `list-page-config-with-filter`, `detail-page-config`, `page/{name}/editor`). Planning Space does not call it. Configuration drift here surfaces as "missing column/field" failures in `ProcessOrchestration/**` UI specs; the two backend specs now catch that drift at the API layer for the routes lui uses.

| Detail | Link |
| --- | --- |
| Overview, stack, CI/CD | [overview.md](plan-sop-ui-fields-service/overview.md) |
| **Architecture diagrams** | [architecture.md](plan-sop-ui-fields-service/architecture.md) |
| All endpoints | [api-contract.md](plan-sop-ui-fields-service/api-contract.md) |
| **Cross-repository usage and unused endpoints** | [usage-across-repositories.md](plan-sop-ui-fields-service/usage-across-repositories.md) |
| Entities and tables | [data-model.md](plan-sop-ui-fields-service/data-model.md) |
| Per-environment URLs | [environments.md](plan-sop-ui-fields-service/environments.md) |
| **"Missing field" triage order** | [test-hooks.md](plan-sop-ui-fields-service/test-hooks.md) |
| Coverage and gaps | [automation-coverage.md](plan-sop-ui-fields-service/automation-coverage.md) |
| Failure signatures | [troubleshooting.md](plan-sop-ui-fields-service/troubleshooting.md) |
