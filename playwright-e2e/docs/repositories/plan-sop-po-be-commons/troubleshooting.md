# Troubleshooting — plan-sop-po-be-commons

**The diagnostic rule for this repo:** if the same failure appears in more than one backend service at the same time, suspect commons before investigating any individual service.

## Known failure signatures
| Symptom | Likely cause | Check / fix |
| --- | --- | --- |
| 401s appear across several services at once | Security/JWT config changed in commons | Compare the pinned commons SHA in each consumer's `build.gradle` |
| 403s where the user clearly has the role | Subject is in `PO_OPS_ADMINS`, or the RBAC expression root changed | Check `PO_OPS_ADMINS`; check the commons version |
| Negative RBAC spec gets 200 instead of 403 | The "unauthorized" user is a central ops admin | Pick a user not listed in `PO_OPS_ADMINS` |
| 413 / codec errors on unrelated large-payload endpoints | `spring.codec.max-in-memory-size` (30MB) changed, or a consumer overrode it | The library's own comment says **do not override in consumers** |
| Several services fail to start after a release | Liquibase version change in commons | Check the migration engine version and changelog compatibility |
| Log format changed, triage tooling broke | ECS layout (`log4j2-ecs-layout`) updated | Check `po-commons-central-log4j.xml` |
| `createdBy` holds a machine subject ID | The call authenticated as the service principal, not the test user | Verify the token identity; `clearApiTokenCache()` after switching users |
| No audit events for a realm | Realm is not in `AUDIT_LOG_ENABLED_REALM_IDS`, or `IS_EFS_INTEGRATION_ENABLED=false` | Check the allowlist; INTEROP's `REALM_ID` is allowlisted by default |
| Audit events missing but APIs healthy | Publishing is fire-and-forget over Kafka | Check broker health — a passing suite proves nothing about audit health |
| Two services behave differently on identical input | Different commons SNAPSHOT builds | Compare pinned SHAs |
| "Same version" but different behaviour | A SNAPSHOT was republished under the same coordinate | Rebuild consumers; treat SNAPSHOT coordinates as non-reproducible |
| Missing secrets at startup | `AZ_KV_NAME` unset or wrong | Defaults to the literal `OVERRIDE_AS_PER_RUNTIME_ENV` |
| `NoClassDefFoundError` from `com.by.po.commons.http.HttpClient` | Consumer excluded the Key Vault JCA jar while on a commons SHA older than `2dacec2` (`HttpClient` imported a BouncyCastle class shaded inside that jar) | Move the consumer to `2dacec2-SNAPSHOT` or later |
| Xray critical on `httpclient5` 5.4.3 / `httpcore5` 5.3.4 | Copy bundled inside the Key Vault JCA jar pulled by the aggregate Key Vault starter | Fixed in `2dacec2` (secrets-only starter); a Gradle pin cannot reach a bundled copy |

## Where to look
| Signal | Location |
| --- | --- |
| Pinned version per consumer | `build.gradle` in each backend repo |
| Global defaults | `src/main/resources/application.yaml` |
| Log configuration | `po-commons-central-log4j.xml` |
| Audit toggles | `efs.is-enabled`, `efs.audit-log-enabled-realm-ids` |
| Ops admins | `PO_OPS_ADMINS` |
| Distributed trace | Elastic APM trace ID across services |
| Dependency vulnerabilities | JFrog Xray workflow |

## Flaky areas
| Area | Why | Mitigation |
| --- | --- | --- |
| SNAPSHOT version drift | Same coordinate, different bytes | CI check that all consumers pin the same SHA |
| Audit-event assertions | Async, fire-and-forget | Always poll; never read-after-write |
| Cross-service auth behaviour | One library change moves every service | Re-run a smoke suite across **all** services after a commons bump |
| Kafka-dependent behaviour | Broker availability | Audit failures are silent by design — monitor the broker separately |
