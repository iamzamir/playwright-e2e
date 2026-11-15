# Repository documentation

Complete, automation-focused documentation for every repository in the Plan-SOP platform.

Written for one purpose: **when a test fails, or a new test needs writing, find the answer here instead of reading four codebases.**

## The repositories

| Repo | Type | Purpose | Direct specs |
| --- | --- | --- | --- |
| [plan-sop-process-orchestration-service](plan-sop-process-orchestration-service/overview.md) | Backend · Java 21 | Process/subprocess hierarchy, calendars, transitions, templates, scope, ALM | 21 |
| [plan-sop-actionitem](plan-sop-actionitem/overview.md) | Backend · Java 21 | Action items, playbooks, comments, KPIs | 8 |
| [plan-sop-link-management](plan-sop-link-management/overview.md) | Backend · Java 21 | View↔entity mapping, favourites, scope presets | 17 |
| [plan-sop-ui-fields-service](plan-sop-ui-fields-service/overview.md) | Backend · Java 21 | Field, column and editor metadata for the PO UI (lui) | 2 |
| [plan-sop-po-be-commons](plan-sop-po-be-commons/overview.md) | Shared library | Security, logging, Kafka audit, Liquibase for all backends | 0 |
| [plan-sop-planning-mfe](plan-sop-planning-mfe/overview.md) | Frontend · React | Planning Space UI | 126 |
| [plan-sop-lui](plan-sop-lui/overview.md) | Frontend · React | Process Orchestration UI + settings | 29 |
| [plan-sop-ui-automation](plan-sop-ui-automation/overview.md) | Test automation | This repo — Playwright framework | — |

## HTML dossiers
Each repository also has a standalone, browser-friendly HTML dossier with comprehensive functionality, architecture, runtime-flow, automation, and risk sections. Mermaid diagrams render through jsDelivr when online.

| Repository dossier | Open |
| --- | --- |
| Process Orchestration Service | [plan-sop-process-orchestration-service.html](plan-sop-process-orchestration-service.html) |
| Action Item Service | [plan-sop-actionitem.html](plan-sop-actionitem.html) |
| Link Management Service | [plan-sop-link-management.html](plan-sop-link-management.html) |
| UI Fields Service | [plan-sop-ui-fields-service.html](plan-sop-ui-fields-service.html) |
| PO Backend Commons | [plan-sop-po-be-commons.html](plan-sop-po-be-commons.html) |
| Planning Space Micro-Frontend | [plan-sop-planning-mfe.html](plan-sop-planning-mfe.html) |
| LUI / Process Orchestration UI | [plan-sop-lui.html](plan-sop-lui.html) |
| UI and API Automation Framework | [plan-sop-ui-automation.html](plan-sop-ui-automation.html) |

Cross-repo request flow, ownership, and blast radius: **[repo-map.md](repo-map.md)**.
Coverage at a glance: **[coverage-matrix.md](coverage-matrix.md)**. Endpoint-level backend coverage (generated from source and CI runs): `../Coverage/backend-api-coverage-dashboard.html`.

## Architecture diagrams
Every repo has an `architecture.md` with Mermaid diagrams derived from its actual package and folder structure — context, internal layering, domain model, key async flow, and automation touchpoints.

| Repo | Diagram highlights |
| --- | --- |
| [Process Orchestration](plan-sop-process-orchestration-service/architecture.md) | `service.proxy` outbound layer, async start flow, ALM migration sequence |
| [Action Item](plan-sop-actionitem/architecture.md) | Playbook definition-vs-instance lifecycle, direct call vs PO proxy |
| [Link Management](plan-sop-link-management/architecture.md) | **v1 legacy vs v2 vertical-slice refactor**, dual JDBC/JPA data layer |
| [UI Fields](plan-sop-ui-fields-service/architecture.md) | Configuration model, lui-only consumption, and how a config change becomes a "UI defect" |
| [po-be-commons](plan-sop-po-be-commons/architecture.md) | Blast radius, SNAPSHOT version drift, audit-event flow |
| [Planning Space MFE](plan-sop-planning-mfe/architecture.md) | Loading state machine, IndexedDB config cache, test-ID ownership |
| [LUI](plan-sop-lui/architecture.md) | Overflow-menu interaction pattern, test-ID naming drift, route map |
| [UI Automation](plan-sop-ui-automation/architecture.md) | Framework layering, env resolution, execution lifecycle, isolation model |

Platform-wide diagrams (system view, request flow, blast radius) live in [repo-map.md](repo-map.md).

Diagram colour conventions are documented in [_template/architecture.md](_template/architecture.md#conventions-used-in-these-diagrams) — red marks untested areas and anti-patterns, blue marks notable subsystems, green marks the correct pattern.

## What is in each repo folder

| File | Contents |
| --- | --- |
| `overview.md` | Identity, stack, layout, build/run, dependencies, CI/CD, quality gates |
| `architecture.md` | Mermaid diagrams: context, internal layering, domain model, key flows, touchpoints |
| `api-contract.md` *(backend)* | Every endpoint: method, path, RBAC, notes, plus a contract-watch list |
| `ui-inventory.md` *(frontend)* | Routes, pages, components, and the full `data-testid` inventory |
| `framework-reference.md` *(automation)* | Utilities, fixtures, page objects, timeout tiers, env vars |
| `data-model.md` | Entities, tables, enums, identifiers, seed data |
| `environments.md` | Per-environment URLs, prefixes, realms, auth, local run |
| `test-hooks.md` | Setup/teardown recipes, async behaviour, deterministic waits, isolation |
| `automation-coverage.md` | Feature→spec map, gaps, risk ranking |
| `troubleshooting.md` | Failure signatures, where to look, flaky areas |
| `metadata.json` | Machine-readable facts for scripting |

`_template/` holds the skeleton to copy when a new repository joins the platform.

## Common tasks

| I need to… | Go to |
| --- | --- |
| Understand how a repo is built internally | The repo's `architecture.md` |
| Write a new UI spec | Target repo's `ui-inventory.md`, then [authoring workflow](plan-sop-ui-automation/test-hooks.md#authoring-a-new-spec) |
| Write a new API spec | Target repo's `api-contract.md` + `environments.md` |
| Find a `data-testid` | [Planning Space](plan-sop-planning-mfe/ui-inventory.md) · [LUI](plan-sop-lui/ui-inventory.md) |
| Find an endpoint | [PO](plan-sop-process-orchestration-service/api-contract.md) · [Action Item](plan-sop-actionitem/api-contract.md) · [Link Management](plan-sop-link-management/api-contract.md) · [UI Fields](plan-sop-ui-fields-service/api-contract.md) |
| Find which repositories use UI Fields | [UI Fields cross-repository usage report](plan-sop-ui-fields-service/usage-across-repositories.md) (lui only) |
| See which backend endpoints are tested | `../Coverage/backend-api-coverage-dashboard.html` (regenerate with `npm run docs:api-coverage`) |
| See what changed recently in a repo | The "Recent changes" section of its `overview.md` |
| Work out a URL for an environment | [Automation environments](plan-sop-ui-automation/environments.md#service-path-prefixes) |
| Replace a static sleep | The target repo's `test-hooks.md` |
| Debug a failing spec | [Framework triage](plan-sop-ui-automation/troubleshooting.md#triage-order), then the target repo's `troubleshooting.md` |
| Understand what a change will break | [repo-map.md](repo-map.md#blast-radius) |
| Find a coverage gap to fill | [coverage-matrix.md](coverage-matrix.md#priority-gaps) |

## Fast diagnostics

| Symptom | Most likely owner |
| --- | --- |
| Column, filter or editor field missing in Process Orchestration (lui) | [UI Fields](plan-sop-ui-fields-service/troubleshooting.md) — configuration, not a UI defect |
| Column or filter missing in Planning Space | Card/dashboard config or the IndexedDB cache — see [Planning Space troubleshooting](plan-sop-planning-mfe/troubleshooting.md) |
| A backend assertion looks wrong but matches the service | Known defect — `../Coverage/PSR-Gap-Plans/ActionItems-UIFields-Defect-Report.html` |
| Wrong views rendered | [Link Management](plan-sop-link-management/troubleshooting.md) |
| Process not starting / status wrong | [PO service](plan-sop-process-orchestration-service/troubleshooting.md) — async, must be polled |
| `getByTestId` stopped matching | `@by/lui-*` version bump — see the frontend `ui-inventory.md` |
| Same failure in several backends at once | [po-be-commons](plan-sop-po-be-commons/troubleshooting.md) — shared library change |
| Spec never ran | Not registered in `tests/TestSuites/*.json` |
| Everything 404s | Wrong `URL_MODE` / `GATEWAY_TYPE` — check the `[setup]` log line |

## Maintaining these docs

| When | Do |
| --- | --- |
| A new endpoint is added | Update the repo's `api-contract.md` and its contract-watch table |
| A package or module is added | Update the internal-structure diagram in `architecture.md` |
| A `data-testid` changes | Update the frontend `ui-inventory.md` and the affected page object |
| A new spec is added | Update the target repo's `automation-coverage.md`, then run `npm run docs:testcases` (and `npm run docs:api-coverage` for backend specs) |
| A sibling repo changes | Add a row to that repo's "Recent changes" table in `overview.md` |
| A gateway path changes | Update `configs/setup.js` **and** the repo's `environments.md` |
| A new repo joins | Copy `_template/`, fill it in, add a row here and in `repo-map.md` |

Test-ID inventories can be regenerated with the PowerShell snippet at the bottom of each `ui-inventory.md`.

> These documents were compiled from the source repositories under `C:\Backend`. Facts such as endpoint
> lists, entity/table names, gateway prefixes and test-ID counts were extracted directly from source;
> anything unconfirmed is marked as such (for example, the UI Fields NEW-mode gateway prefix).

## Review log
| Date | Scope |
| --- | --- |
| 2026-09-16 | Initial generation (#716) |
| 2026-09-21 | UI Fields cross-repository usage report |
| 2026-10-05 | Full review against `origin/main` of all eight repos: new backend specs and endpoint coverage (PSR gap plans 01–04); UI Fields consumers corrected (lui calls it, Planning Space does not); Spring Boot 3.5.16 and commons `2dacec2` pins; recent service changes (ALM error 2104, LM reason codes, AI playbook UTC); frontend dependency bumps and retired feature flags; test-ID inventories regenerated; frontend Node version corrected to 22.13.1 |
