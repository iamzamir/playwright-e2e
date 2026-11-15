# Environments — plan-sop-planning-mfe

## How automation reaches the app
```
NAVIGATE_TO_PLANNING_SPACE = LUMINATE_PORTAL_URL + PSLINK
```

| ENVIRONMENT | `LUMINATE_PORTAL_URL` | `PSLINK` |
| --- | --- | --- |
| QA | `https://bylumuiportalpltna.azureedge.net/` | `IBPPlanQA/` |
| INTEROP | `https://bylumuiportalpltna.azureedge.net/` | `ibppsintegration/` |
| INTEROP (Gravitee) | `https://${REALM_KEY}.portal.interop.na.blueyonder.dev/` | `ibppsintegration/` |
| PSR | `https://bylumuiportalpltpsr.azureedge.net/` | `planning-space-psr/` |

`PSLINK` is overridable in INTEROP (`process.env.PSLINK || 'ibppsintegration/'`).

Sibling surfaces on the same portal: `POLINK` (Process Orchestration), `SNALINK` (Semantic Network Architect).

## Realms
| ENVIRONMENT | `REALM_NAME` | `REALM_KEY` |
| --- | --- | --- |
| QA | `cbp-e2e-qa` | `cbpf-qa23` |
| INTEROP | `cbp-interop-ps-automation-2` | `cbpf-test23` |
| PSR | `cbp-psr-po-ps-01` | `cbpf-test23` |

`USER_TOKEN_REALM` defaults to `cbp-interop-ps-automation-2`.

## The app's own environment matrix
`.github/envs/` holds 16 runtime configs, materialised into `public/` by `setRuntimeEnv.js`:

| Env file | Target |
| --- | --- |
| `.env` | Default / local |
| `.env-noauth` | Local, auth bypassed |
| `pltpsr.env` | PSR |
| `pldena.env` | Demo NA |
| `plppreview.env` | Production preview |
| `plpstgna.env`, `plpstgeu.env` | Production staging NA / EU |
| `plpna.env`, `plpeu.env`, `plpap.env`, `plpau.env` | Production NA / EU / AP / AU |
| `plpvalna.env`, `plpvaleu.env`, `plpvalap.env`, `plpvalau.env` | Validation NA / EU / AP / AU |

Build modes add more: `qa`, `qa_dev`, `qa_new`, `qa_experiment`, `pmg`, `integration`, `portal-integration`, `development`, `security`, `demo`, `release`, `production`.

Note the naming mismatch: the automation suite uses `QA` / `INTEROP` / `PSR`, while the app uses `qa` / `integration` / `pltpsr`. Only PSR lines up cleanly.

## Backend model paths per environment
Observed in the frontend config:

| Env | `envPath` | `processModelEnvPath` |
| --- | --- | --- |
| dev | `cbp/dev/ibp` | `foundation-model/v1dev` |
| qa | `cbp/qa/ibp` | `foundation-model/v1qa` |
| interop | `cbp/interop/ibp` | `foundation-model/v1ioptst` |
| psr | `cbp/psr/ibp` | `psr/foundation/model/v1` |
| demo | `cbp/demo/ibp` | `demo/foundation/model/v1` |
| prodstage | `cbp/prodstage/ibp` | `prodstage/foundation/model/v1` |

These match the `URL_MODE=OLD` prefixes the automation suite uses — see [Process Orchestration environments](../plan-sop-process-orchestration-service/environments.md#service-path-prefix).

## Auth
| Variable | Purpose |
| --- | --- |
| `AUTH_URL` | B2C `B2C_1A_ClientCredential` token endpoint |
| `PORTAL_CLIENT_ID` | Default `8c715d67-a278-48fb-8177-9afe1cc672b5` |
| `CLIENT_ID` / `CLIENT_SECRET` | Client-credentials pair, secret from `process.env` |
| `SCOPE` | `https://blueyonderinteroptestus.onmicrosoft.com/6ad21424-.../.default` |
| `FUNCTIONAL_TEST_USERNAME` / `_USERNAME2` / `_PASSWORD` | UI login users |

Never hardcode credentials — `configs/setup.js` reads them from `process.env`.

## Local run
| Command | Result |
| --- | --- |
| `npm install --legacy-peer-deps` | Install (plain `npm install` fails on peer deps) |
| `npm run start-vite` | Planning Space alone |
| `npm run start:local` | Mock + Planning Space + Luminate Portal |
| `npm run start:local:noauth` | Auth bypassed |
| `npm run start:dev` | Port 3000 |
| `npm run setLocalEnv:<env>` | Switch the runtime environment written into `public/` |

Node **22.13.1** (`.nvmrc`, upgraded from 18 in Feb 2025). Build and deploy workflows use `node-version-file: .nvmrc`; the repo README still says 18.19.0 and a few auxiliary workflows still pin Node 18, so trust `.nvmrc`.

**Runtime config is regenerated on each `setLocalEnv` run.** Switching environments without re-running it leaves the previous environment's config in `public/`, and the app silently talks to the wrong backend.
