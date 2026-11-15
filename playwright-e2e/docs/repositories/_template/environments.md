# Environments — <repo-name>

All values are resolved by [configs/setup.js](../../../configs/setup.js) from `ENVIRONMENT`.

## Gateway prefixes
`GATEWAY_TYPE=AZURE` uses `API_BASE_URL = https://api-tst.jdadelivers.com/`.
`GATEWAY_TYPE=GRAVITEE` uses `https://${REALM_KEY}.api.${domainSuffix}/`.

| ENVIRONMENT | URL_MODE=OLD prefix | URL_MODE=NEW prefix |
| --- | --- | --- |
| QA | | |
| INTEROP | | |
| PSR | | |

## Realms and tenants
| ENVIRONMENT | Realm | Realm key |
| --- | --- | --- |

## Auth
| Variable | Purpose |
| --- | --- |

## Local run
| Setting | Value |
| --- | --- |
| Port | |
| Profile | |
| Required env vars | |

## Feature toggles affecting tests
| Toggle | Default | Effect |
| --- | --- | --- |
