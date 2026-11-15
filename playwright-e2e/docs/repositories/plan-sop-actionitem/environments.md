# Environments — plan-sop-actionitem

Resolved by `playwright-e2e/configs/setup.js` from `ENVIRONMENT`, `URL_MODE`, `GATEWAY_TYPE`.

## Service path prefix
| ENVIRONMENT | `URL_MODE=OLD` | `URL_MODE=NEW` |
| --- | --- | --- |
| QA | `cbp/qa/ibp/actionitems/v1` | `qa/ai/api/v1` |
| INTEROP | `cbp/interop/ibp/actionitems/v1` | `ai/api/v1` |
| PSR | `cbp/psr/ibp/actionitems/v1` | `ai/api/v1` |

## Environment variables set by `setup.js`
| Variable | QA (OLD) | INTEROP (OLD) | PSR (OLD) |
| --- | --- | --- | --- |
| `ACTIONITEM2` | `cbp/qa/ibp/actionitems/v1/actionitems` | `cbp/interop/ibp/actionitems/v1/actionitems` | `cbp/psr/ibp/actionitems/v1/actionitems` |
| `DELETE_ACTIONITEM` | `cbp/qa/ibp/actionitems/v1/actionitems/` | `cbp/interop/ibp/actionitems/v1/actionitems/` | `cbp/psr/ibp/actionitems/v1/actionitems/` |
| `ACTIONITEM` | `cbp/qa/ibp/process-orchestration/v1/` | `cbp/interop/ibp/process-orchestration/v1/` | `cbp/psr/ibp/process-orchestration/v1/` |

`ACTIONITEM` intentionally points at **Process Orchestration**, because process-scoped action items go through PO's `ActionItemProxyController`. `ACTIONITEM2` targets this service directly. Pick the one that matches the behaviour under test.

## Base URLs
Identical to the rest of the platform — see
[Process Orchestration environments](../plan-sop-process-orchestration-service/environments.md#base-urls-azure-gateway).

| Variable | Value |
| --- | --- |
| `API_BASE_URL` (AZURE) | `https://api-tst.jdadelivers.com/` |
| `API_BASE_URL` (GRAVITEE) | `https://${REALM_KEY}.api.${domainSuffix}/` |
| `AUTH_URL` (AZURE) | B2C `B2C_1A_ClientCredential` token endpoint |
| `SCOPE` | `https://blueyonderinteroptestus.onmicrosoft.com/6ad21424-.../.default` |

## Realms
| ENVIRONMENT | `REALM_NAME` |
| --- | --- |
| QA | `cbp-e2e-qa` |
| INTEROP | `cbp-interop-ps-automation-2` |
| PSR | `cbp-psr-po-ps-01` |

## Credentials
From `process.env` only: `FUNCTIONAL_TEST_USERNAME`, `FUNCTIONAL_TEST_USERNAME2`, `FUNCTIONAL_TEST_PASSWORD`, `CLIENT_ID`, `CLIENT_SECRET`. Assignment specs need both users to exist in the target realm.

## Local run
| Setting | Value |
| --- | --- |
| Port | `8080` (`${port:8080}`) |
| Swagger | `http://localhost:8080/swagger-ui/index.html` |
| DB defaults | db `actionitem`, user `aiuser` |
| Stack traces | `ACTIONITEM_PRINT_STACKTRACE=true` |
