# Automation coverage — plan-sop-po-be-commons

## Direct coverage
**None, and none is appropriate.** A shared library should not have end-to-end specs pointed at it. Its own correctness is covered by unit and Testcontainers-backed integration tests inside the repo (`testcontainers-kafka` 2.0.3).

## Indirect coverage
The library is exercised by every backend spec, because every request to every consuming service passes through its security, logging, and serialization layers.

| Capability | Effectively covered by |
| --- | --- |
| JWT validation / 401 handling | All `ProcessOrchestrationBackend/**` specs |
| RBAC 403 handling | `ProcessOrchestration/ActionItemsBatch/Test_002`, `PlanningSpace/ViewsBatch/Test_002`, `Test_003` |
| Large-payload codec limit | `Migration/**` (ALM export/publish), Link Management bulk mapping |
| Liquibase startup | Any suite — a migration failure takes the service down entirely |
| Audit logging | **Nothing** |
| APM tracing | **Nothing** |
| Key Vault resolution | **Nothing** |

## Coverage gaps
| Gap | Risk | Suggested approach |
| --- | --- | --- |
| **Audit-event emission** | Medium-High — compliance-relevant and completely unverified | Consumer-side spec: perform a mutation in the INTEROP realm, then poll the audit topic/store for the event |
| Audit realm allowlist | Medium | Assert an allowlisted realm emits and a non-allowlisted one does not |
| `createdBy` / `updatedBy` correctness | Medium — cheap to add, catches identity bugs | Assert audit columns after create/update in existing backend specs |
| Commons version drift across services | Medium | CI check comparing the pinned SHA across all four consumers (currently aligned on `2dacec2`) |
| Codec limit boundary | Low-Medium | Payload just under and just over 30MB |
| `PO_OPS_ADMINS` elevation | Medium | Confirm negative-RBAC users are not ops admins before asserting 403 |

## Recommended additions
1. **Audit column assertions** — add `expect(entity.createdBy).toBe(expectedSubjectId)` to existing backend CRUD specs. Near-zero cost, catches authentication-context bugs that otherwise pass silently.
2. **Commons version drift check** — a CI job that fails when the four consumers pin different `plan-sop-po-be-commons` SHAs. SNAPSHOT coordinates hide the drift entirely; it happened until 2026-09-17 (Link Management on `251ccd3`, the others on `aa6e444`) and is aligned today only by convention.
3. **Audit-event smoke spec** — one consumer-side spec proving events reach the topic for the automation realm.

## Risk ranking
| Area | Risk | Reason |
| --- | --- | --- |
| Version drift (SNAPSHOT pinning) | Medium | Silent and platform-wide; pins are aligned on `2dacec2` today but nothing enforces it |
| Security/JWT changes | High | Blast radius is all four services at once |
| Audit logging | Medium-High | Compliance-relevant, zero coverage, silent failure mode |
| Codec limits | Medium | Surfaces as confusing 413s on unrelated endpoints |
| Logging/APM | Low | Affects triage speed, not correctness |
