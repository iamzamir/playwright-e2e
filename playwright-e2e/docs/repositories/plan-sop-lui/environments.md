# Environments — plan-sop-lui

## How automation reaches the app
```
NAVIGATE_TO_PROCESS_ORCHESTRATION = LUMINATE_PORTAL_URL + POLINK
```

| ENVIRONMENT | `LUMINATE_PORTAL_URL` | `POLINK` |
| --- | --- | --- |
| QA | `https://bylumuiportalpltna.azureedge.net/` | `pofeatureqa/` |
| INTEROP | `https://bylumuiportalpltna.azureedge.net/` | `pointegration/` |
| INTEROP (Gravitee) | `https://${REALM_KEY}.portal.interop.na.blueyonder.dev/` | `pointegration/` |
| PSR | `https://bylumuiportalpltpsr.azureedge.net/` | `process-orchestration-psr/` |

Sibling surfaces on the same portal: `PSLINK` (Planning Space), `SNALINK` (Semantic Network Architect), `IDENTITY_AND_ACCESS`.

## Realms
| ENVIRONMENT | `REALM_NAME` | `REALM_KEY` |
| --- | --- | --- |
| QA | `cbp-e2e-qa` | `cbpf-qa23` |
| INTEROP | `cbp-interop-ps-automation-2` | `cbpf-test23` |
| PSR | `cbp-psr-po-ps-01` | `cbpf-test23` |

## The app's own environment matrix
`.github/envs/` holds 16 runtime configs, materialised into `public/` by `setRuntimeEnv.js`:

| Env file | Target |
| --- | --- |
| `.env` | Default / local |
| `.env-noauth` | Local, auth bypassed |
| `pltpsr.env` | PSR |
| `pldena.env` | Demo NA |
| `prodpreview.env` | Production preview |
| `prodstg.env`, `plpstgeu.env` | Production staging NA / EU |
| `plpna.env`, `plpeu.env`, `plpap.env`, `plpau.env` | Production NA / EU / AP / AU |
| `plpvalna.env`, `plpvaleu.env`, `plpvalap.env`, `plpvalau.env` | Validation NA / EU / AP / AU |

Build modes: `qa`, `qa_dev` (via `build-posales`), `development`, `integration`, `psr`, `demo`, `prodstg`, `plpstgeu`, `prodpreview`, `production`, `security`, `pmg`, `release`.

`REACT_APP_DEPLOY_ENV` is set alongside the Vite mode by the `build-*` scripts — for example `build-qa` sets `REACT_APP_DEPLOY_ENV=qa`.

As with Planning Space, the automation suite's `QA` / `INTEROP` / `PSR` names do not map one-to-one onto the app's `qa` / `integration` / `psr` modes.

## Auth
| Variable | Purpose |
| --- | --- |
| `AUTH_URL` | B2C `B2C_1A_ClientCredential` token endpoint (AZURE) or `https://${REALM_KEY}.auth.${domainSuffix}/oauth/token` (GRAVITEE) |
| `PORTAL_CLIENT_ID` | Default `8c715d67-a278-48fb-8177-9afe1cc672b5` |
| `CLIENT_ID` / `CLIENT_SECRET` | Client-credentials pair; secret from `process.env` |
| `FUNCTIONAL_TEST_USERNAME` / `_USERNAME2` / `_PASSWORD` | UI login users |

Authorization specs such as `ActionItemsBatch/Test_002_ActionItemPermissionsAndBulkActions` need **both** users present in the target realm.

## npm registry
The `@jda` scope resolves from JFrog and requires an auth token:
```bash
npm config set @jda:registry https://jdasoftware.jfrog.io/jdasoftware/api/npm/npm/
npm config set //jdasoftware.jfrog.io/jdasoftware/api/npm/npm/:_auth="<auth-token>"
npm config set email <your-jda-email>
```
Without this, `npm install` fails on `@by/*` and `@jda/*` packages.

## Local run
| Command | Result |
| --- | --- |
| `npm start` | `setLocalEnv && vite` |
| `npm run start:dev` | Port 3000 |
| `npm run start:local` | Mock + LUI + Luminate Portal |
| `npm run start:local:noauth` | Auth bypassed |
| `npm run setLocalEnv:<env>` | Switch the runtime environment written into `public/` |

**Runtime config is regenerated on each `setLocalEnv` run.** Switching environments without re-running it leaves the previous environment's config in `public/`.

## Legacy WDIO environment
The in-repo `e2e/` WebdriverIO suite pins `TZ=Australia/Adelaide` and reads `e2e/configs/wdio.*.conf.ts`. It is retained for reference only — new coverage belongs in `playwright-e2e/`.
