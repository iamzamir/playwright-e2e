# Environments — plan-sop-ui-automation

`configs/env/` is the **single source of truth**: `environments.ts` has one row per environment (hosts, realms, UI links, Gravitee settings, secret variable *names*) and `endpoints.ts` one row per endpoint (with per-environment overrides). `configs/setup.js` builds every URL, realm, and endpoint variable from three inputs, writes them to `process.env`, and prints the result at startup:

```
[setup] ENVIRONMENT=... URL_MODE=... GATEWAY_TYPE=... REALM_KEY=...
```

Read that line first when anything looks misrouted. Utils read the same values through `getConfig()` / `endpoint()` from `configs/env`, which follow per-test changes such as `applyRealmKeyOverride()`.

## The three switches
| Variable | Default | Values |
| --- | --- | --- |
| `ENVIRONMENT` | `INTEROP` | `QA`, `INTEROP`, `PSR`, `STAGE` (RnD stage); any other value fails at startup |
| `URL_MODE` | `OLD` | `OLD` (legacy `cbp/...`) or `NEW` (short gateway paths). NEW is discontinued and exists for QA and INTEROP only; PSR and STAGE use OLD and log a warning |
| `GATEWAY_TYPE` | `AZURE` | `AZURE` or `GRAVITEE`; STAGE is always `GRAVITEE` |

## Environment matrix
| | QA | INTEROP | PSR | STAGE |
| --- | --- | --- | --- | --- |
| `REALM_NAME` | `cbp-e2e-qa` | `cbp-interop-ps-automation-2` | `cbp-psr-po-ps-01` | `cbprndsg-demo` (forced, also `REALMS`) |
| `REALM_KEY` (Azure / Gravitee) | `cbpf-qa23` / `cbpf-test27` | `cbpf-test23` / incoming or `cbpf-test23` | `cbpf-test23` / `popspsr-psr` | — / `cbprndsg-demo` (forced) |
| `PSLINK` | `IBPPlanQA/` | `ibppsintegration/` (incoming wins) | `planning-space-psr/` | empty (incoming wins) |
| `POLINK` | `pofeatureqa/` | `pointegration/` | `process-orchestration-psr/` | empty (incoming wins) |
| `SNALINK` | `semantic-network-architect-qa/` | `semantic-network-architect-interop/` | `semantic-network-architect-psr/` | empty (incoming wins) |
| `LUMINATE_PORTAL_URL` | `https://bylumuiportalpltna.azureedge.net/` | same (or Gravitee portal) | `https://bylumuiportalpltpsr.azureedge.net/` | Gravitee portal |
| Gateway segment (`cbp/<seg>/...`) | `qa` | `interop` | `psr` | `demo` |
| ALM segment (`alm/core/<seg>/...`) | `staging` | `staging` | `psr` | `demo` |
| `URL_MODE=NEW` | yes (`qa/` prefix) | yes | no (OLD) | no (OLD) |
| Gravitee domain | `interop.na.blueyonder.dev` | `interop.na.blueyonder.dev` | `psr.na.blueyonder.dev` | `interop.na.blueyonder.dev` |
| Gravitee client vars | `QA_GRAVITEE_CLIENT_ID/_SECRET` | `GRAVITEE_CLIENT_ID_<REALM_KEY>` or `GRAVITEE_CLIENT_ID` (and `_SECRET`) | `PSR_GRAVITEE_CLIENT_ID/_SECRET` | `STAGE_GRAVITEE_CLIENT_ID/_SECRET` |
| SQL suffix | `QA` | `IOP` | `PSR` | `STAGE` |

## Gateway base URLs
### AZURE (default)
| Variable | Value |
| --- | --- |
| `API_BASE_URL` | `https://api-tst.jdadelivers.com/` |
| `AUTH_URL` | `https://blueyonderinteroptestus.b2clogin.com/blueyonderinteroptestus.onmicrosoft.com/B2C_1A_ClientCredential/oauth2/v2.0/token` |
| `SCOPE` | `https://blueyonderinteroptestus.onmicrosoft.com/6ad21424-b4b2-462e-80df-252ec22dd6a9/.default` |

### GRAVITEE
| Variable | Pattern |
| --- | --- |
| `API_BASE_URL` | `https://${REALM_KEY}.api.${domainSuffix}/` |
| `AUTH_URL` | `https://${REALM_KEY}.auth.${domainSuffix}/oauth/token` |
| `LUMINATE_PORTAL_URL` | `https://${REALM_KEY}.portal.${domainSuffix}/` |

Overridable via `GRAVITEE_API_BASE_URL`, `GRAVITEE_AUTH_URL`, `GRAVITEE_PORTAL_URL`, `GRAVITEE_DOMAIN_SUFFIX`. STAGE reads only the `STAGE_GRAVITEE_*` equivalents, since the generic ones may point at an INTEROP tenant.

## Service path prefixes
| Service | QA (OLD / NEW) | INTEROP (OLD / NEW) | PSR (OLD only) | STAGE (OLD only) |
| --- | --- | --- | --- | --- |
| Process Orchestration | `cbp/qa/ibp/process-orchestration/v1` / `qa/po/api/v1` | `cbp/interop/ibp/process-orchestration/v1` / `po/api/v1` | `cbp/psr/ibp/process-orchestration/v1` | `cbp/demo/ibp/process-orchestration/v1` |
| Action Item | `cbp/qa/ibp/actionitems/v1` / `qa/ai/api/v1` | `cbp/interop/ibp/actionitems/v1` / `ai/api/v1` | `cbp/psr/ibp/actionitems/v1` | `cbp/demo/ibp/actionitems/v1` |
| Link Management | `cbp/qa/ibp/links/v1` / `qa/lm/api/v1` | `cbp/interop/ibp/links/v1` / `lm/api/v1` | `cbp/psr/ibp/links/v1` | `cbp/demo/ibp/links/v1` |
| UI Fields (`UI_FIELDS_BASE`) | `cbp/qa/ibp/ui-fields/v1` (both modes) | `cbp/interop/ibp/ui-fields/v1` (both modes) | `cbp/psr/ibp/ui-fields/v1` | `cbp/demo/ibp/ui-fields/v1` |

Only QA carries the `qa/` prefix in NEW mode. NEW mode is discontinued: it is kept for QA and INTEROP, and new endpoints get an OLD path only.

UI Fields has a single `UI_FIELDS_BASE` variable (added 2026-09) instead of per-endpoint variables; specs build URLs with `buildUiFieldsUrl()` in `util/ui-fields.util.ts`. Its OLD prefix matches lui's `apiURL` and `PSRGatewayTest.jmx`; the NEW-mode prefix is still unconfirmed, so both URL modes use the OLD path.

## Non-gateway services
| Variable | QA | INTEROP | PSR |
| --- | --- | --- | --- |
| `SIMULATION` | `cbp/foundation-simulation/v1qa` | `cbp/foundation-simulation/v1ioptst` | `cbp/psr/foundation/simulation/` |
| `PLANNING_INSTANCE` | `cbp/foundation-interactive-planning/v1qa/planningInstance` | interop equivalent | `cbp/cbp/psr/foundation/interactive-planning/planningInstance` |
| `SEARCH_SIMULATION` | `cbp/foundation-simulation/v1qa/simulations/search` | interop equivalent | `cbp/psr/foundation/simulation/v1/simulations/search` |
| `RESOURCE_POOL_MANAGER` | `cbp/qa/maas/resource-pool-manager/v1/clusters` | `cbp/interop/maas/...` | `cbp/psr/maas/...` |
| `MAAS_CONFIG` | `cbp/qa/maas/config/v1/calcEngines` | `cbp/interop/maas/...` | `cbp/psr/maas/...` |
| `ALM_VALIDATION` | `cbp/qa/foundation/model/v1/cbpConfigurations/validate` | `cbp/interop/foundation/...` | psr equivalent |

## ALM deployment endpoints
`staging` below is the QA/INTEROP segment; PSR uses `psr` and STAGE `demo`.

| Variable | Path |
| --- | --- |
| `ALM_DEPLOY_RESOURCE` | `alm/core/staging/deployments/resource/{resourceId}` |
| `ALM_DEPLOYMENT_STATUS` | `alm/core/staging/deployments/{deploymentId}` |
| `ALM_DOWNLOAD_ZIP` | `alm/exchange/staging/resources/{resourceId}/downloadZip` |
| `ALM_DELETE_RESOURCE` | `alm/exchange/staging/resources/{resourceId}` |

## Migration realms (source → target)
| Variable | QA value |
| --- | --- |
| `REALM_NAME_SOURCE` | `cbp-qa-po-migration-1` |
| `REALM_NAME_TARGET` | `cbp-qa-po-migration-2` |
| `REALM_CLIENT_ID_SOURCE` | `99770f27-aa3f-421f-b453-6a03ae1e7da9` |
| `REALM_CLIENT_ID_TARGET` | `dea9530f-3bfa-4006-afbd-5dccd5707033` |
| `REALM_ID_SOURCE` | `6d54cd6d-2cab-4e4f-aa11-43050e29fbf7` |
| `REALM_ID_TARGET` | `43eb63e3-6e79-4118-a9db-ec439dd008bd` |
| `REALM_MACHINE_SUBJECT_ID_SOURCE` | `86528d7a-029b-43e0-a65a-b413dcd3938b` |
| `REALM_MACHINE_SUBJECT_ID_TARGET` | `718ce689-d2a1-4c45-8ba4-5d180f494b08` |

Secrets resolve from `REALM_CLIENT_SECRET_PO_QA_MIG_1` / `_2` in `process.env` (INTEROP: `REALM_CLIENT_SECRET_PO_IOP_MIG_1` / `_2`). INTEROP also defines `REALM_MACHINE_SUBJECT_ID_SOURCE_GVT` / `_TARGET_GVT`, the Gravitee machine subjects used when migration specs clean up IAM role assignments.

Under strict realm security policies (e.g. `cbpf-test23`), unassigning a machine subject from an IAM role can return 403, after which deleting the role returns 409.

## Foundation (SNA BFF) endpoints
INTEROP actor/procedure cleanup moved from `cbp/foundation-bff/v1ioptst/...` to `cbp/interop/foundation/sna-bff/v1/...` (`DELETE_ACTOR`, `GET_PROCEDURES`, `DELETE_PROCEDURE`), and `GET_PROCESSMODEL_ENTITY` to `cbp/interop/foundation/model/v1/processModels/`. A 404 on these in an older branch means it predates that change.

## Identity
| Variable | Value |
| --- | --- |
| `REALM_ID` | `ca7623d3-b234-431c-a445-4a1d5444668e` |
| `SUBJECT_ID` | `1941bac5-7ea3-40af-af9d-4166fd2a3d05` |
| `CLIENT_ID` | `bcaa9b9c-d391-4d24-9c37-e3822cd45d8a` |
| `PORTAL_CLIENT_ID` | `8c715d67-a278-48fb-8177-9afe1cc672b5` |
| `USER_TOKEN_REALM` | `cbp-interop-ps-automation-2` |

`REALM_ID` matches the first entry in the audit-log allowlist in [`plan-sop-po-be-commons`](../plan-sop-po-be-commons/environments.md#realm-alignment-with-automation) — the INTEROP automation realm emits audit events.

## Credentials — never hardcode
`setup.js` maps from `process.env`:

| Framework variable | Source |
| --- | --- |
| `FUNCTIONAL_TEST_USERNAME` | `TEST_AUTOMATION_USER_1` |
| `FUNCTIONAL_TEST_USERNAME2` | `TEST_AUTOMATION_USER_2` |
| `FUNCTIONAL_TEST_PASSWORD` | `TEST_AUTOMATION_PASSWORD` |
| `CLIENT_SECRET` | `CLIENT_SECRET_QA` (QA) |
| `SAUCE_USERNAME` | `SAUCE_PS_USERNAME` |
| `SAUCE_ACCESS_KEY` | `SAUCE_PS_ACCESS_KEY` |

## Navigation URLs
```
NAVIGATE_TO_PROCESS_ORCHESTRATION = LUMINATE_PORTAL_URL + POLINK
NAVIGATE_TO_PLANNING_SPACE        = LUMINATE_PORTAL_URL + PSLINK
NAVIGATE_TO_SNA                   = LUMINATE_PORTAL_URL + SNALINK
NAVIGATE_TO_IDENTITI_AND_ACCESS   = LUMINATE_PORTAL_URL + IDENTITY_AND_ACCESS   (identityaccess/)
```

`navigationUrls()` in `configs/env` builds these, at startup and again when `applyRealmKeyOverride()` switches the Gravitee tenant for a test.

## Timezone
Every npm script sets `TZ=Australia/Adelaide`. Date-sensitive specs — calendars, cycles, due dates — depend on it. Running Playwright directly without it can produce off-by-one-day failures.
