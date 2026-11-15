# Plan — ALM Deploy Resource Migration API Test

> Status: **IMPLEMENTED — spec + INTEROP testdata committed (QA deferred).**
> Reference tests: `tests/ProcessOrchestrationBackend/Migration/*` (esp. `Test_004_SupplyChainActionsMigration`, `Test_006_EntityViewMappingMigration`, `Test_008_EntityViewProcedureMappingMigration`, `Test_007_LinkManagementALMValidation`).

## 1. Goal

Add a single, end-to-end API spec that validates the **ALM publish → deploy → export-compare → cleanup** lifecycle:

1. Publish a PO resource (exchange/publish) from the **source realm**.
2. Poll the PO job status until `COMPLETED`; capture `resourceId` + `version`.
3. Deploy that resource to the **target realm** via ALM.
4. Poll the ALM deployment status until `completed`; capture `deploymentId`.
5. Download the deployed resource ZIP, extract it, and locate `po.json` (the source-of-truth for what was migrated).
6. Export data from the **target realm** (`exportData`).
7. Validate every item present in `po.json` (step 5) also exists in the target export (step 6) — target may legitimately contain *more*.
8. Clean up all migrated content in the target realm (processes, link-management mappings, supply chain actions).
9. Re-export from the target realm and confirm the migrated content is gone.

## 2. New files & folders

| Path | Purpose |
| --- | --- |
| `tests/ProcessOrchestrationBackend/ALMDeploy/Test_001_ALMDeployResourceMigration.spec.ts` | The new spec. |
| `testdata/INTEROP/ProcessOrchestrationBackend/ALMDeploy/Test_001_ALMDeployResourceMigration.json` | INTEROP test data. |
| `tests/TestSuites/ALMDeployBatch.json` *(optional — see §8)* | Suite registration glob. |

> **Scope: INTEROP only** for this iteration. QA testdata (`testdata/QA/...`) and QA URL variants are deferred to a follow-up.

No new page objects (API-only). No edits to unrelated files.

## 3. Endpoint / env-var mapping

All URLs are built as `process.env.API_BASE_URL + <endpoint key>` (base already ends with `/`). Requirement URLs are INTEROP (`cbp/interop/...`). **Only the INTEROP block of `configs/setup.js` is edited this iteration**; QA values are listed for reference/follow-up but not added yet.

### Already available (reuse — no change)
| Env key | INTEROP value | Used in step |
| --- | --- | --- |
| `EXPORT_DATA` | `cbp/interop/ibp/process-orchestration/v1/exportData` | 6, 9 |
| `DELETE_PROCESS` | `cbp/interop/ibp/process-orchestration/v1/process/{processName}` | 8 |
| `GET_SUPPLY_CHAIN_ACTIONS` | `cbp/interop/ibp/process-orchestration/v1/supplyChainAction` | 8 |
| `DELETE_SUPPLY_CHAIN_ACTION` | `cbp/interop/ibp/process-orchestration/v1/supplyChainAction/{id}` | 8 |
| `VIEW_ENTITY_MAP` | `cbp/interop/ibp/links/v1/view-entity-map` | 8 (base for delete) |
| `VIEW_ENTITY_PROCEDURE_MAP` | `cbp/interop/ibp/links/v1/entity-view-procedure-map` | 8 (base for delete) |

### New env keys to add to `configs/setup.js` (INTEROP block now; QA column for later)
| Env key | INTEROP value | QA value (deferred) | Step |
| --- | --- | --- | --- |
| `EXCHANGE_PUBLISH` | `cbp/interop/ibp/process-orchestration/v1/configuration/exchange/publish` | `cbp/qa/ibp/process-orchestration/v1/configuration/exchange/publish` | 1 |
| `PO_JOB_STATUS_BASE` | `cbp/interop/ibp/process-orchestration/v1` | `cbp/qa/ibp/process-orchestration/v1` | 2 |
| `ALM_DEPLOY_RESOURCE` | `alm/core/staging/deployments/resource/{resourceId}` | `alm/core/staging/deployments/resource/{resourceId}` | 3 |
| `ALM_DEPLOYMENT_STATUS` | `alm/core/staging/deployments/{deploymentId}` | `alm/core/staging/deployments/{deploymentId}` | 4 |
| `ALM_DOWNLOAD_ZIP` | `alm/exchange/staging/resources/{resourceId}/downloadZip` | `alm/exchange/staging/resources/{resourceId}/downloadZip` | 5 |
| `DELETE_VIEW_ENTITY_MAP` | `cbp/interop/ibp/links/v1/view-entity-map/views/{viewId}/type/subprocess/entity/{entity}` | `cbp/qa/ibp/links/v1/view-entity-map/views/{viewId}/type/subprocess/entity/{entity}` | 8 |
| `DELETE_ENTITY_VIEW_PROCEDURE_MAP` | `cbp/interop/ibp/links/v1/entity-view-procedure-map/type/subprocess/entity/{entity}/views/{viewId}` | `cbp/qa/ibp/links/v1/entity-view-procedure-map/type/subprocess/entity/{entity}/views/{viewId}` | 8 |

> **Note on `PO_JOB_STATUS_BASE`:** the publish response returns a relative `statusUrl` like `/job/<id>/status`. We will build the poll URL as `API_BASE_URL + PO_JOB_STATUS_BASE + statusUrl`. (`statusUrl` already begins with `/job/...`.)

> The `alm/...` paths are **not** environment-prefixed in the requirement, so QA and INTEROP share the same value. Will confirm during implementation whether QA uses a different ALM host/prefix.

## 4. Auth / realm strategy (CONFIRMED)

- **Source realm:** `cbp-interop-po-migration-1` — env `REALM_CLIENT_ID_SOURCE`, `REALM_CLIENT_SECRET_SOURCE`, `REALM_ID_SOURCE` → **source token** (`headers`).
- **Target realm:** `cbp-interop-po-migration-2` — env `REALM_CLIENT_ID_TARGET`, `REALM_CLIENT_SECRET_TARGET`, `REALM_ID_TARGET` → **target token** (`headersForTarget`).
- Token obtained once per file in `beforeAll` via `ApiUtil.getBearerToken(undefined, clientId, clientSecret, undefined, realmId)`.

Per-step token usage (confirmed):
| Step | Realm / token |
| --- | --- |
| 1 Publish | **source** |
| 2 Job status poll | **source** |
| 3 ALM deploy | **target** |
| 4 Deployment status poll | **target** |
| 5 Download ZIP | **target** |
| 6 Export target | **target** |
| 7 Validation | n/a |
| 8 Cleanup | **target** |
| 9 Re-export target | **target** |

## 5. Test-data JSON shape (proposed)

```jsonc
{
  "RESOURCE_NAME_PREFIX": "PO",              // final name = prefix + <ddMMyyyy> + <random>
  "PUBLISH_PAYLOAD": {                        // exact body from requirement step 1
    "calendars": [], "processes": [],
    "customFields": { "attributes": [], "uiFields": [] },
    "actionItems": { "attributes": [], "kpis": [], "ui_fields": [] },
    "assumptions": { "attributes": [], "ui_fields": [], "ui_fields_values": [], "insight_types": [], "kpi_configs": [], "insight_configs": [], "assumption_types": [] },
    "links": { "entityViews": [], "entityViewsProcedure": [] },
    "supplyChainActions": [],
    "featureToggle": { "tenantLevel": [], "processes": [], "subProcesses": [], "assumptions": [] }
  },
  "EXPORT_PAYLOAD": { /* same empty-envelope body from requirement step 6 */ },
  "DEPLOY_PAYLOAD": { "resourceVersion": "1.0.0", "forceDeployment": true }
}
```

> `resourceVersion` in `DEPLOY_PAYLOAD` is overridden at runtime with the `version` returned by the job-status response; the JSON value is a fallback/default.

## 6. Spec structure (`test.describe.serial`)

Shared state declared at describe scope: `resourceId`, `resourceVersion`, `deploymentId`, `poJson` (parsed from ZIP), `targetExport`, `headers`, `headersForTarget`.

Helpers (module/local scope):
- `buildHeaders(clientId, clientSecret, realmId)` — same as Migration tests.
- `pollUntil(fetchFn, isDone, { intervalMs, maxAttempts })` — generic poller; **interval 30s**, **maxAttempts 20** (≈10 min ceiling). Uses `await new Promise(r => setTimeout(r, intervalMs))` like `Test_007`. Polling tests set `test.setTimeout(getTimeout('TEST'))` (900s).
- Terminal states: job status (step 2) → `COMPLETED`; deployment status (step 4) → `success` (lowercase). Break early on failure states if returned.
- `downloadAndExtractPoJson(downloadUrl, headers)` — fetch (arraybuffer), resolve the returned download link, download the ZIP, extract, and read `po.json` (see §7 ZIP note).
- `collectNames(section)` helpers to normalize process names, link views, calendars, SCA, action items, assumptions from both `po.json` and target export for comparison.
- `assertSubset(sourceItems, targetItems, label)` — asserts every source item exists in target (target may have extra).

Test cases (mapped to requirement steps):

| TC | Title | Requirement step |
| --- | --- | --- |
| TC1 | Publish PO resource in source realm; assert `201/200` + `statusUrl` present | 1 |
| TC2 | Poll job status every 30s until `COMPLETED`; parse `resourceId` + `version` from message | 2 |
| TC3 | Deploy resource to target realm; assert `message` + `id` (deploymentId) present | 3 |
| TC4 | Poll deployment status every 30s until `success`; assert resource metadata | 4 |
| TC5 | Download + extract ZIP; locate & parse `po.json`; assert non-empty | 5 |
| TC6 | Export data from target realm; capture full payload | 6 |
| TC7 | Validate `po.json` content ⊆ target export (processes, links, calendars, SCA, action items, assumptions) | 7 |
| TC8 | Cleanup target: delete processes, entity-view maps, entity-view-procedure maps, supply chain actions | 8 |
| TC9 | Re-export target; assert migrated content no longer present | 9 |

## 7. ZIP download & extraction (decision required — see §9)

`downloadZip` returns a *link* to the archive, so the flow is: `GET downloadZip` → read redirect/JSON link → `GET <link>` as `arraybuffer` → write to `test-results/almdeploy/<resourceId>.zip` → extract → read `po.json` (searching nested folders).

Node has **no built-in ZIP archive extractor** (`zlib` is gzip only).

**Decision: Option A — add `adm-zip`** (small, sync API) to `dependencies` (plus `@types/adm-zip` to devDependencies). Clean, cross-platform, no shelling out.

Extraction writes to `test-results/` (git-ignored artifact area) and is cleaned per run.

## 8. Suite registration

- Add `test:interop:pobackend:almdeploy` npm script mirroring the `migration` script (folder `tests/ProcessOrchestrationBackend/ALMDeploy`, `--workers=1`). QA script deferred.
- Optionally add `tests/TestSuites/ALMDeployBatch.json` if this needs to run inside an existing CI suite. **Confirm whether CI should pick this up automatically or run on-demand only.**

## 9. Decisions (CONFIRMED) & remaining assumptions

Confirmed:
1. **Realm/token:** source = `cbp-interop-po-migration-1`, target = `cbp-interop-po-migration-2`. Steps 3, 4, 5 all use the **target** realm bearer token (see §4).
2. **ZIP extraction:** Option A — `adm-zip`.
3. **Deployment terminal status:** `success` (lowercase). Job status terminal: `COMPLETED`.
4. **Polling budget:** 30s interval, max 10 min (maxAttempts 20), polling tests use 900s per-test timeout.
5. **Scope:** **INTEROP only** for now (QA testdata/URLs deferred).

Remaining working assumptions (will validate during implementation, flag if wrong):
- **Job-status parsing:** `resourceId` + `version` extracted from the free-text `message` (`"Successfully created resource: <id> version: <ver>"`) via regex.
- **Link-management cleanup inputs:** `{viewId}` and `{entity}` (processName) derived from `po.json` `links.entityViews` / `links.entityViewsProcedure`.
- **Step-7 validation depth:** subset match by identity fields — process by `name`, SCA by `name`, calendars by `calendarName`, links by view id + entity, action items/assumptions by name/id.

## 10. Validation (after implementation)

- Lint/type check the new spec via `get_errors`.
- Focused run: `npx playwright test tests/ProcessOrchestrationBackend/ALMDeploy --config=configs/playwright.config.ts --workers=1` (INTEROP).
- Report changed files, commands, and pass/fail.

---
**Next step:** review §9 answers. On confirmation, implementation proceeds in this order: setup.js env keys → testdata JSON → spec → (zip dep) → npm scripts/suite → focused run.
