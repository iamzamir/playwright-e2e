# Test hooks — plan-sop-po-be-commons

There is nothing to drive directly. This page describes how the library's behaviour shows up in specs that target the consuming services.

## Automation entry points
| Asset | Path |
| --- | --- |
| Direct | **None** — never target `GET /hello` or port `9999` from a spec |
| Indirect | Every backend spec under `tests/ProcessOrchestrationBackend/**` |

## Behaviours to rely on
| Behaviour | Where it surfaces | How to use it |
| --- | --- | --- |
| Uniform 401 shape | All backend services | A shared auth-failure assertion helper is safe across services |
| Uniform 403 shape | All backend services | Same for RBAC negative assertions |
| Swagger at `/swagger-ui/index.html` | All backend services | Contract discovery |
| Audit columns (`createdBy`, `updatedBy`, …) | All entities | Assert the acting identity after a mutation |
| 30MB codec limit | All services | Upper bound for large-payload specs |
| ECS structured logs | All services | Same log schema when triaging |
| APM trace IDs | All services | Correlate a failing request across services |

## Verifying the acting identity
After a create or update through any backend service:

| Step | Check |
| --- | --- |
| 1 | Read the entity back |
| 2 | Assert `createdBy` / `updatedBy` equals the expected subject ID |
| 3 | Compare against `SUBJECT_ID` in `configs/setup.js` |

A machine/client-credentials subject ID where a user ID was expected means the spec authenticated as the service principal rather than the test user.

## Audit events
| Aspect | Guidance |
| --- | --- |
| Emission | Async, fire-and-forget over Kafka — never on the request path |
| Realm scope | Only allowlisted realms emit; INTEROP's `REALM_ID` **is** allowlisted |
| Assertion style | Poll the consumer side with `expect.poll`; read-after-write will flake |
| Disabling | `IS_EFS_INTEGRATION_ENABLED=false` |
| Failure mode | A broker outage does **not** fail API calls — a passing suite says nothing about audit health |

## Negative RBAC specs
Before asserting a 403, confirm the "unauthorized" user is **not** listed in `PO_OPS_ADMINS`. Central ops admins carry elevated rights in every consuming service, so a spec expecting a denial will get a 200 instead.

## When to suspect this library
| Signal | Interpretation |
| --- | --- |
| The same failure in two or more backend services at once | Commons-level change |
| Auth behaviour changed everywhere with no service-side diff | Security config in commons |
| 413/codec errors across unrelated endpoints | Codec limit change |
| Startup/migration failures in several services | Liquibase version change |
| Log format changed and triage tooling broke | Logging layout change |

First action: compare the pinned `plan-sop-po-be-commons` SHA in each consumer's `build.gradle`.

## Idempotency and isolation
Nothing to set up or tear down. The only cross-run concern is version drift: a republished SNAPSHOT under the same coordinate can change behaviour with no visible change in any repo.
