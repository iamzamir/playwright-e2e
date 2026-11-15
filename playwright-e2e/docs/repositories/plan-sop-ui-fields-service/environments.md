# Environments — plan-sop-ui-fields-service

## Gateway routing
`configs/setup.js` exposes one base variable, `UI_FIELDS_BASE` (added 2026-09), and specs build full URLs with `buildUiFieldsUrl(route, query)` in `util/ui-fields.util.ts`:

```
${API_BASE_URL} + ${UI_FIELDS_BASE} + /<path from api-contract.md>
```

| ENVIRONMENT | `UI_FIELDS_BASE` (both URL modes) |
| --- | --- |
| QA | `cbp/qa/ibp/ui-fields/v1` |
| INTEROP | `cbp/interop/ibp/ui-fields/v1` |
| PSR | `cbp/psr/ibp/ui-fields/v1` |

The OLD-mode prefix is confirmed: it matches lui's `${apiURL}/ui-fields/v1` and the UI Fields samplers in `jmeter/Tests/PSRGatewayTest.jmx`, and the specs pass on both `AZURE` and `GRAVITEE` in INTEROP and QA. The NEW-mode (`<abbrev>/api/v1`) prefix is **still unconfirmed**, so `URL_MODE=NEW` deliberately reuses the OLD path.

## Base URLs
Shared platform values — see
[Process Orchestration environments](../plan-sop-process-orchestration-service/environments.md#base-urls-azure-gateway).

| Variable | Value |
| --- | --- |
| `API_BASE_URL` (AZURE) | `https://api-tst.jdadelivers.com/` |
| `API_BASE_URL` (GRAVITEE) | `https://${REALM_KEY}.api.${domainSuffix}/` |
| `AUTH_URL` | B2C `B2C_1A_ClientCredential` token endpoint |

## Realms
| ENVIRONMENT | `REALM_NAME` |
| --- | --- |
| QA | `cbp-e2e-qa` |
| INTEROP | `cbp-interop-ps-automation-2` |
| PSR | `cbp-psr-po-ps-01` |

Field configuration is **tenant-scoped**: the same page can render different columns in QA and INTEROP. Expected-field assertions must come from `testdata/<ENV>/`, never be hardcoded in a spec.

Verified differences (2026-10-01): QA `cbp-e2e-qa` lists `processName` instead of `actualStartDate`/`actualEndDate`, adds `participants` to subprocess details, and has 6 status filter keys (adds `AUTO_COMPLETED`, `START_INITIATED`, `STOP_INITIATED`). Within one environment the Azure and Gravitee tenants match.

QA Gravitee (`cbpf-test27`) once returned 500 on every UI Fields route for a morning (2026-10-01) while PO and AI on the same gateway were fine; it cleared without changes. Treat a blanket 500 as an environment problem.

## Security toggles
| Variable | Default | Effect |
| --- | --- | --- |
| `LIAM_ENABLED` | `true` | Master security switch |
| `LIAM_RBAC_ENABLED` | `true` | Role-based checks |
| `LIAM_ABAC_ENABLED` | `true` | Attribute-based checks |
| `liamRbacCacheTimeout` | `0` | Cache lifetime in minutes — `0` means changes apply immediately |
| `liamRbacCacheSize` | `0` | Cache size |

## Local run
| Setting | Value |
| --- | --- |
| Swagger | `http://localhost:8086/swagger-ui/index.html` |
| Required env vars | `azuresql_host`, `azuresql_port`, `azuresql_dc_database`, `azuresql_dc_user`, `azuresql_dc_password` — **no defaults; startup fails without them** |
| Health probe | `POST /echo` |
