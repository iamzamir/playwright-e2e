# API contract — plan-sop-po-be-commons

This repo is a **library**, not a deployed service. It exposes almost no HTTP surface of its own; the endpoints that matter are the ones it contributes *into* consuming services.

## Own endpoints
| Method | Path | Controller | Notes |
| --- | --- | --- | --- |
| GET | `/hello` | `SampleController` | Smoke endpoint for the library's standalone app on port `9999`. Not deployed to any environment — **never target it from a spec** |

## Capabilities contributed to consumers
These are the behaviours the library injects into every consuming service. They are what automation actually observes.

| Capability | Provided by | Observable effect |
| --- | --- | --- |
| Bearer/JWT validation | `nimbus-jose-jwt` 10.9 + Spring Security | 401 responses across all services share a common shape |
| RBAC expression root | `@ibp.hasAction(...)` support | 403 responses across all services share a common shape |
| OpenAPI/Swagger wiring | `springdoc-openapi-starter-webmvc-ui` | `/swagger-ui/index.html` exists in every consumer |
| WebClient base config | `spring-boot-starter-webflux` | Inter-service call timeouts and codec limits |
| Codec limit | `spring.codec.max-in-memory-size: 30MB` | Large-payload ceiling; **consumers are told not to override it** |
| Kafka audit producer | `spring-kafka` + `po-audit-log-producer` | Audit events emitted for allowlisted realms |
| ECS structured logging | `log4j2-ecs-layout` | Consistent log schema for triage |
| Elastic APM | `elastic-apm-agent` | Distributed traces across services |
| Liquibase core | `liquibase-core` | Migration engine; `enabled: false` here, switched on per consumer |
| MapStruct | `mapstruct` | DTO ↔ entity mapping |
| Key Vault | `azure.kv-resource-name` | Secret resolution |

## Audit-log contract
| Property | Value |
| --- | --- |
| Toggle | `efs.is-enabled` ← `IS_EFS_INTEGRATION_ENABLED` (default `true`) |
| Allowlisted realms | `ca7623d3-b234-431c-a445-4a1d5444668e`, `9beb5e0f-8e95-4979-b438-edbc7b054981` |
| Topic | `EFS_AUDIT_LOG_TOPIC_NAME` |
| Brokers | `EFS_BOOTSTRAP_SERVERS` |
| Ack pool size | `PUBLISH_ACK_PROCESSOR_POOL_SIZE` (test default `3`) |

Audit publishing is **asynchronous and fire-and-forget**. It is not on the request path, so a broker outage will not fail an API call — but it also means an audit assertion must poll, never read-after-write.

## Contract watch
| Change here | Blast radius |
| --- | --- |
| JWT/security config | 401/403 behaviour in **all four** backend services simultaneously |
| Codec `max-in-memory-size` | Large-payload endpoints (view mapping, ALM export) across services |
| Liquibase version | Startup and migration behaviour in every consumer |
| Kafka producer config | Audit-event emission platform-wide |
| Logging layout | Every triage workflow that greps service logs |

A failure appearing in **more than one service at the same time** is the signature of a commons-level change.
