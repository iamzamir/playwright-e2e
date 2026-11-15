# Environments — plan-sop-link-management

Resolved by `playwright-e2e/configs/setup.js`.

## Service path prefix
| ENVIRONMENT | `URL_MODE=OLD` | `URL_MODE=NEW` |
| --- | --- | --- |
| QA | `cbp/qa/ibp/links/v1` | `qa/lm/api/v1` |
| INTEROP | `cbp/interop/ibp/links/v1` | `lm/api/v1` |
| PSR | `cbp/psr/ibp/links/v1` | `lm/api/v1` |

## Environment variables set by `setup.js`
| Variable | Path suffix |
| --- | --- |
| `VIEW_ENTITY_MAP` | `<prefix>/view-entity-map` |
| `VIEW_ENTITY_PROCEDURE_MAP` | `<prefix>/entity-view-procedure-map` |
| `DELETE_VIEW_ENTITY_MAP` | `<prefix>/view-entity-map/views/{viewId}/type/subprocess/entity/{entity}` |
| `DELETE_ENTITY_VIEW_PROCEDURE_MAP` | `<prefix>/entity-view-procedure-map/type/{type}/entity/{entity}/views/{viewId}` |

`DELETE_VIEW_ENTITY_MAP` is hardcoded to `type/subprocess`. `DELETE_ENTITY_VIEW_PROCEDURE_MAP` is parameterized with `{type}` (`process` or `subprocess`), matching Link Management's route requirement. For assumption cleanup or `DELETE_VIEW_ENTITY_MAP` with non-subprocess entities, build the path from the contract instead of reusing these variables.

## Base URLs
Shared platform values — see
[Process Orchestration environments](../plan-sop-process-orchestration-service/environments.md#base-urls-azure-gateway).

| Variable | Value |
| --- | --- |
| `API_BASE_URL` (AZURE) | `https://api-tst.jdadelivers.com/` |
| `API_BASE_URL` (GRAVITEE) | `https://${REALM_KEY}.api.${domainSuffix}/` |
| `AUTH_URL` | B2C `B2C_1A_ClientCredential` token endpoint |

## Realms
| ENVIRONMENT | `REALM_NAME` | Planning Space link (`PSLINK`) |
| --- | --- | --- |
| QA | `cbp-e2e-qa` | `IBPPlanQA/` |
| INTEROP | `cbp-interop-ps-automation-2` | `ibppsintegration/` |
| PSR | `cbp-psr-po-ps-01` | `planning-space-psr/` |

## ALM validation
| Variable | Value |
| --- | --- |
| `ALM_VALIDATION` (QA) | `cbp/qa/foundation/model/v1/cbpConfigurations/validate` |
| `ALM_VALIDATION` (INTEROP) | `cbp/interop/foundation/model/v1/cbpConfigurations/validate` |

Used by `Migration/Test_007_LinkManagementALMValidation.spec.ts`.

## Local run
| Setting | Value |
| --- | --- |
| DB defaults | db `linkMgr`, user `linkuser` |
| Startup caveat | Liquibase waits up to **45 minutes** for a changelog lock |
| Tunables | `LM_DB_MAX_POOL_SIZE`, `LM_DB_MIN_IDLE`, `LM_DB_CONNECTION_TIMEOUT`, `LM_JDBC_BATCH_SIZE` |
