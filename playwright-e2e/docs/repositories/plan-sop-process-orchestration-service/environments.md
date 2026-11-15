# Environments — plan-sop-process-orchestration-service

All values are resolved by `playwright-e2e/configs/setup.js` from `ENVIRONMENT`, `URL_MODE`, and `GATEWAY_TYPE`.

## Gateway selection
| Variable | Default | Effect |
| --- | --- | --- |
| `ENVIRONMENT` | `INTEROP` | Selects the QA / INTEROP / PSR block |
| `URL_MODE` | `OLD` | `OLD` = legacy `cbp/...` paths, `NEW` = short `po/api/v1` paths |
| `GATEWAY_TYPE` | `AZURE` | `AZURE` = `api-tst.jdadelivers.com`, `GRAVITEE` = `https://${REALM_KEY}.api.${domainSuffix}/` |
| `REALM_KEY` | `cbpf-qa23` (QA) / `cbpf-test23` (others) | Used to build Gravitee hostnames |

## Service path prefix
| ENVIRONMENT | `URL_MODE=OLD` | `URL_MODE=NEW` |
| --- | --- | --- |
| QA | `cbp/qa/ibp/process-orchestration/v1` | `qa/po/api/v1` |
| INTEROP | `cbp/interop/ibp/process-orchestration/v1` | `po/api/v1` |
| PSR | `cbp/psr/ibp/process-orchestration/v1` | `po/api/v1` |

Full URL = `${API_BASE_URL}` + prefix + endpoint path from [api-contract.md](api-contract.md).

## Base URLs (AZURE gateway)
| Variable | Value |
| --- | --- |
| `API_BASE_URL` | `https://api-tst.jdadelivers.com/` |
| `AUTH_URL` | `https://blueyonderinteroptestus.b2clogin.com/blueyonderinteroptestus.onmicrosoft.com/B2C_1A_ClientCredential/oauth2/v2.0/token` |
| `SCOPE` | `https://blueyonderinteroptestus.onmicrosoft.com/6ad21424-b4b2-462e-80df-252ec22dd6a9/.default` |
| `LUMINATE_PORTAL_URL` (QA/INTEROP) | `https://bylumuiportalpltna.azureedge.net/` |
| `LUMINATE_PORTAL_URL` (PSR) | `https://bylumuiportalpltpsr.azureedge.net/` |

## Base URLs (GRAVITEE gateway)
| Variable | Pattern |
| --- | --- |
| `API_BASE_URL` | `https://${REALM_KEY}.api.${domainSuffix}/` |
| `AUTH_URL` | `https://${REALM_KEY}.auth.${domainSuffix}/oauth/token` |
| `LUMINATE_PORTAL_URL` | `https://${REALM_KEY}.portal.${domainSuffix}/` |

Overridable via `GRAVITEE_API_BASE_URL`, `GRAVITEE_AUTH_URL`, `GRAVITEE_PORTAL_URL`.

## Realms
| ENVIRONMENT | `REALM_NAME` | PO UI link (`POLINK`) |
| --- | --- | --- |
| QA | `cbp-e2e-qa` | `pofeatureqa/` |
| INTEROP | `cbp-interop-ps-automation-2` | `pointegration/` |
| PSR | `cbp-psr-po-ps-01` | `process-orchestration-psr/` |

Navigation URL: `NAVIGATE_TO_PROCESS_ORCHESTRATION = LUMINATE_PORTAL_URL + POLINK`.

## Migration (source → target realm) — INTEROP/QA only
| Variable | Purpose |
| --- | --- |
| `REALM_NAME_SOURCE` / `REALM_NAME_TARGET` | Source and target realms for ALM migration specs |
| `REALM_CLIENT_ID_SOURCE` / `_TARGET` | Client IDs |
| `REALM_CLIENT_SECRET_SOURCE` / `_TARGET` | From `process.env` — **never hardcode** |
| `REALM_ID_SOURCE` / `_TARGET` | Realm GUIDs |
| `API_BASE_URL_SOURCE` / `_TARGET`, `AUTH_URL_SOURCE` / `_TARGET` | Per-realm endpoints |

Related endpoint variables used by the migration suite: `EXCHANGE_PUBLISH`, `PO_JOB_STATUS_BASE`, `ALM_VALIDATION`, `ALM_DEPLOY_RESOURCE`, `ALM_DEPLOYMENT_STATUS`, `ALM_DOWNLOAD_ZIP`, `ALM_DELETE_RESOURCE`, `EXPORT_DATA`, `IMPORT_DATA`.

## Credentials
Read from `process.env` only. `setup.js` maps:
- `FUNCTIONAL_TEST_USERNAME` ← `TEST_AUTOMATION_USER_1`
- `FUNCTIONAL_TEST_USERNAME2` ← `TEST_AUTOMATION_USER_2`
- `FUNCTIONAL_TEST_PASSWORD` ← `TEST_AUTOMATION_PASSWORD`
- `CLIENT_SECRET` ← `CLIENT_SECRET_QA` (QA)

## Local run
| Setting | Value |
| --- | --- |
| Profile | `spring.profiles.active=local` |
| Swagger | `http://localhost:<port>/swagger-ui/index.html` |
| DB defaults | host `localhost:1433`, db `process_orchestration_db`, user `pouser` |
