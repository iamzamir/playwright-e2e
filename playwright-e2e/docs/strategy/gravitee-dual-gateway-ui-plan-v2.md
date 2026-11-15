# Plan v2: One JSON per spec with a `GRAVITEE` block, for dual-gateway PS and PO UI runs

Supersedes the test-data approach in [gravitee-dual-gateway-ui-plan.md](gravitee-dual-gateway-ui-plan.md). The workflow, login and seeding sections carry over, trimmed to what changes.

## 1. Confirmed inputs

| Item | Azure | Gravitee |
|---|---|---|
| Realm name | `cbp-interop-ps-automation-2` | `pspo-int-automation` |
| Realm key | n/a | `pspoat-test1` |
| Tenant | existing | **new tenant**, data cloned from the Azure realm |
| Machine client | `CLIENT_SECRET_IOP_CBP_INTEROP_PS_AUTOMATION_2` | **own client**, new secrets `GRAVITEE_CLIENT_ID_PSPOAT_TEST1` / `GRAVITEE_CLIENT_SECRET_PSPOAT_TEST1` |
| Portal | `https://bylumuiportalpltna.azureedge.net/` | `https://pspoat-test1.portal.interop.na.blueyonder.dev/` |
| API | `https://api-tst.jdadelivers.com/` | `https://pspoat-test1.api.interop.na.blueyonder.dev/` |
| App paths (`PSLINK`/`POLINK`/`SNALINK`) | unchanged | **same**, only the base URL changes |
| Gateway switch | `GATEWAY_TYPE=AZURE` (default) | `GATEWAY_TYPE=GRAVITEE` |

Still to capture: the tenant ID (`tid` claim) and the machine subject ID for `pspoat-test1`, plus any GUIDs that differ after cloning (§5.2).

---

## 2. Review of the proposed approach

**Proposal:** keep one JSON file per spec, add a `GRAVITEE` key to it holding the Gravitee values, and let one environment variable decide which set a test uses.

### Verdict: it works, and it's simpler than v1. Recommended.

| | v1 (shared defaults file + optional per-file block) | v2 (per-file `GRAVITEE` block, your proposal) |
|---|---|---|
| Where Gravitee values live | Spread across `_gateway/GRAVITEE.json` and some spec files | **In the spec's own JSON, next to the Azure values** |
| Merge rules to learn | 3 layers, plus a "only keys already in the base file" rule | **1 layer**: base, then `GRAVITEE` on top |
| Files touched | About 10 | About 160, but the edit is scripted (1 key per file for most) |
| Reviewability | Hidden defaults, so a reviewer must know the defaults file exists | Everything for a spec is in one file |
| Missing Gravitee data | Silently falls back to Azure values | **Fails fast** with a clear error (see rule 4 below) |
| New spec authoring | Easy to forget the Gravitee case | The `_schema` and instructions require the block |
| Code to write | Loader, defaults file, key-filter rule | Loader only (about 20 lines) |

The extra file edits are a one-time scripted change. You get explicit, self-contained data and a single rule.

### Rules that make it work
1. **Reuse `GATEWAY_TYPE`.** Don't add a new variable. `setup.js`, `api.util.ts`, `oidc-login.helper.ts` and the backend workflow already use it, so one switch then drives URLs, auth **and** test data.
2. **`GRAVITEE` holds overrides only, not a full copy.** It lists only the keys that differ; everything else comes from the base. Merge rules:
   - Nested objects are deep-merged.
   - Arrays and scalars are replaced as a whole.
3. **Specs never see the block.** The loader always strips the `GRAVITEE` key. On Azure the spec gets exactly today's object.
4. **Fail fast on Gravitee.** With `GATEWAY_TYPE=GRAVITEE`, a file with no `GRAVITEE` block throws `"<file> has no GRAVITEE block"`. A spec never runs silently against Azure data.
   - `"GRAVITEE": {}` is a valid, explicit statement that nothing differs.
5. **Same key names as the base.** For example `"GRAVITEE": { "REALM_NAME": ... }`, not `GRAVITEE_REALM_NAME`, so no spec code changes.
6. **Backend is unaffected.** `ProcessOrchestrationBackend/LinkManagement/Test_011` keeps its own lowercase `gravitee` block, which it reads itself and which fully replaces the data. The new loader only looks at the uppercase `GRAVITEE` key, so there's no clash. Aligning the backend is optional later work.

---

## 3. JSON contract

### 3.1 Typical file (most specs need only the realm name)
`testdata/INTEROP/PlanningSpace/ScopeBatch/Test_016_AdminFilter.json`
```json
{
  "_schema": {
    "REALM_NAME": "string (required)",
    "PROCESS_NAME": "string (required)",
    "SUB_PROCESS_NAME": "string (required)",
    "PROCESS_VIEW_NAME": "string (required)",
    "SUB_PROCESS_VIEW_NAME": "string (required)",
    "ADMIN_FILTER_NAME": "string (required)",
    "RESET_DEFAULT_FILTER": "string (required)",
    "GRAVITEE": "object (required for GATEWAY_TYPE=GRAVITEE; overrides merged over base keys)"
  },
  "REALM_NAME": "cbp-interop-ps-automation-2",
  "PROCESS_NAME": "PSAutomation",
  "SUB_PROCESS_NAME": "Demand Review",
  "PROCESS_VIEW_NAME": "ViewOne",
  "SUB_PROCESS_VIEW_NAME": "Edit View Disabled",
  "ADMIN_FILTER_NAME": "AdminFilterCheck",
  "RESET_DEFAULT_FILTER": "No Filter Override",
  "GRAVITEE": {
    "REALM_NAME": "pspo-int-automation"
  }
}
```

### 3.2 File with realm-specific IDs and nested data
```json
{
  "REALM_NAME": "cbp-interop-ps-automation-2",
  "CALC_ENGINE_ID": "50fcfd1f-8905-4df3-8fc6-72346b019679",
  "constraintDetails": { "ResourceDetails": { "resource": "R1", "site": "S1" } },
  "GRAVITEE": {
    "REALM_NAME": "pspo-int-automation",
    "CALC_ENGINE_ID": "<pspoat-test1 calc engine id>",
    "constraintDetails": { "ResourceDetails": { "site": "S1-GVT" } }
  }
}
```
On Gravitee the result is `constraintDetails.ResourceDetails = { "resource": "R1", "site": "S1-GVT" }`, because nested objects are deep-merged.

---

## 4. Framework changes (file by file)

### 4.1 New `util/gateway.util.ts` (the only new code)
```ts
const GATEWAY_BLOCK_KEY = 'GRAVITEE';

const isPlainObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const deepMerge = (base: Record<string, any>, override: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    result[key] = isPlainObject(value) && isPlainObject(base[key]) ? deepMerge(base[key], value) : value;
  }
  return result;
};

export const isGraviteeGateway = (): boolean => (process.env.GATEWAY_TYPE || 'AZURE').toUpperCase() === 'GRAVITEE';

export const applyGatewayOverrides = <T extends Record<string, any>>(data: T, source: string = 'test data'): T => {
  const { [GATEWAY_BLOCK_KEY]: overrides, ...base } = data;
  if (!isGraviteeGateway()) {
    return base as T;
  }
  if (!isPlainObject(overrides)) {
    throw new Error(`[testdata] GATEWAY_TYPE=GRAVITEE but ${source} has no "${GATEWAY_BLOCK_KEY}" block`);
  }
  return deepMerge(base, overrides) as T;
};
```

### 4.2 `configs/fixtures.ts`: 2 call sites
- The `testData` fixture: `const testData = applyGatewayOverrides(await loadTestDataCached(testDataPath), testDataPath);`
- `resolveAuthStatePathForTest`: apply the same overrides before reading `REALM_NAME`, so the storageState folder is the Gravitee realm's.
- The raw-file cache stays as is. The merge is cheap, and applying it on every read keeps the cache independent of the gateway.

### 4.3 The 27 `require()`-style specs: one-line wrap each
```ts
// before
const TestData = require('../../../testdata/' + process.env.PSENV + '/PlanningSpace/CardsBatch/Test_002_CardActions.json');
// after
const TestData = applyGatewayOverrides(require('../../../testdata/' + process.env.PSENV + '/PlanningSpace/CardsBatch/Test_002_CardActions.json'));
```
Affected folders:
- `DataSetupBatch/{ODM,ProcessOrchestration,Scenarios,UIDataReset}`
- `PlanningSpace/{CardsBatch,ObjectiveBar,QuickLinks}`
- `ProcessOrchestration/ActionItemsBatch`

`DataSetupBatch/ProcessOrchestration/Test_002` reads the backend migration JSON, which has no `GRAVITEE` block. Leave it unwrapped, or give that file a `GRAVITEE` block.

### 4.4 `configs/setup.js`
1. Realm registry (non-secret), declared inside the INTEROP Gravitee branch:
   ```js
   const graviteeRealms = {
     'pspoat-test1': { realmName: 'pspo-int-automation', realmId: '2a098426-4f14-4c2c-8f14-8f61692840d6', subjectId: 'a5b17f53-8455-44d0-b17f-538455d4d0ec' },
   };
   ```
   When an entry exists, set `REALM_NAME`, `REALM_ID` and `SUBJECT_ID` from it. `global-setup.ts`, which builds its login list from `process.env.REALM_NAME`, then picks up `pspo-int-automation`.
2. Per-realm-key credentials, falling back to the backend client:
   ```js
   const keyEnv = realmKey.toUpperCase().replace(/[^A-Z0-9]/g, '_');
   process.env.CLIENT_ID = process.env[`GRAVITEE_CLIENT_ID_${keyEnv}`] || process.env.GRAVITEE_CLIENT_ID;
   process.env.CLIENT_SECRET = process.env[`GRAVITEE_CLIENT_SECRET_${keyEnv}`] || process.env.GRAVITEE_CLIENT_SECRET;
   ```
   The fail-fast check tests the resolved values and names both variable options. DataSetup specs that use `REALM_CLIENT_SECRET_TARGET` already inherit `CLIENT_SECRET` on Gravitee.
3. No `PSLINK`/`POLINK` changes (confirmed same).
4. Remove the duplicate INTEROP portal override (current lines ~157–160).
5. Still to verify on the Gravitee API host (one machine-token call each): simulation, sna-bff, assumptions, featuretoggle, maas and `iam/realm/v1/roles`. Add Gravitee-specific paths only if one of them fails.

### 4.5 Auth and login (unchanged from v1 WS2, condensed)
| File | Change |
|---|---|
| `util/oidc-login.helper.ts` | Use only `isGraviteeGateway()` to pick the flow. Drop the `cbpf-` prefix check, which `pspoat-` doesn't match. |
| `util/test.util.ts` | Make the `signOut()` fallback gateway-aware: on Gravitee, wait for the email field instead of the realm field. Add a Gravitee variant of `enterRealmAndCompleteOidcPopup()` (new method, per the POM rule), used by `LastAccessedContext/Test_001` and `Test_002`. |
| `configs/global-setup.ts` + `fixtures.ts` | Name the storageState folder `<realm>` on Azure and `gravitee-<REALM_KEY>-<realm>` on Gravitee (e.g. `gravitee-pspoat-test1-pspo-int-automation`) through one shared helper, so the two gateways, and two Gravitee tenants, never share a login state. |

### 4.6 Spec fixes (unchanged from v1 WS4)
- `SupplyChainActionsBatch/Test_005_PublishScenario`: build the token URL hint from `API_BASE_URL`.
- `DataSetupBatch/UIDataReset/Test_003_CleanupProcess`: remove the hard-coded host and the `cbp/qa` path.
- `DynConstraints/Test_001`: restore the env vars it overrides in `afterAll`.

---

## 5. Test data rollout

### 5.1 Bulk add (scripted, one-off)
A small Node script, run once and not committed, does the following for every JSON under `testdata/INTEROP/{PlanningSpace,ProcessOrchestration,DataSetupBatch}/**` where `REALM_NAME === "cbp-interop-ps-automation-2"`:
- Append `"GRAVITEE": { "REALM_NAME": "pspo-int-automation" }` as the last key.
- Add a `"GRAVITEE"` entry to `_schema` when `_schema` exists.
- Write back with 2-space indent and a trailing newline. Check `git diff --stat` for accidental reformatting before committing.

DataSetup files without `REALM_NAME` get `"GRAVITEE": {}` only if they are wrapped (§4.3) or fixture-loaded.

### 5.2 Manual additions after cloning (GUIDs that will differ in a new tenant)
| File | Keys to add under `GRAVITEE` |
|---|---|
| `PlanningSpace/CardsBatch/Test_002`, `Test_008`, `Test_010` | `CALC_ENGINE_ID` |
| `PlanningSpace/DrillThroughBatch/Test_005`, `Test_006` | `PARENT_SCENARIO_ID` |
| `PlanningSpace/ViewsBatch/Test_008` | `ASSUMPTION_ID` |
| `PlanningSpace/OnDemandMaas/Test_004`, `Test_007` | `REALM_ID` (tenant id) |
| `ProcessOrchestration/ProcessBatch/Test_001` | `SUBJECT_ID` |
| `DataSetupBatch/Scenarios/Test_003`, `DataSetupBatch/ODM/*` | calc engine, planning instance and cluster IDs |

Any spec that fails on Gravitee for missing data gets its differing keys added here. The failure should never be worked around in the spec.

### 5.3 Specs not supported on Gravitee (no block, so they fail fast and are excluded)
These specs are pinned to other Azure realms: `AddLanePopup/*`, `NPI/Test_001`, `OnDemandMaas/Test_006`, `ProcessOrchestration/ProcessBatch/Test_002` and `DynConstraints/Test_001`.
- They get **no** `GRAVITEE` block.
- They are listed in `tests/TestSuites/GraviteeExclusions.json`, each with a reason, and the workflow passes that list as `TEST_IGNORE` only when `GATEWAY_TYPE=GRAVITEE`.
- `DynConstraints/Test_001` already targets a Gravitee realm (`augtwo-test1`). It can be brought in later with its own `GRAVITEE` block.

### 5.4 Rules and docs
- `testdata.instructions.md`: document the `GRAVITEE` block, its overrides-only rule, the merge rules and the fail-fast behavior. New INTEROP UI specs must include the block.
- `.agents/learnings.md`: one line on the contract.

---

## 6. Workflows (from v1 WS5, condensed)
For `playwright-ps-iop-ui-local-suite.yaml`, `playwright-po-iop-ui-local-suite.yaml`, and `playwright-po-iop-suite.yaml` with its `.sauce/*.yml`:
1. Inputs: `gateway-type` (AZURE/GRAVITEE, default AZURE) and `realm-key` (default `pspoat-test1`).
2. A second cron per workflow for Gravitee, mapped the same way the backend workflow does it:
   ```yaml
   GATEWAY_TYPE: ${{ (github.event_name == 'schedule' && github.event.schedule == '00 23 * * *') && 'GRAVITEE' || github.event.inputs['gateway-type'] || 'AZURE' }}
   REALM_KEY: ${{ github.event.inputs['realm-key'] || 'pspoat-test1' }}
   GRAVITEE_CLIENT_ID_PSPOAT_TEST1: ${{ secrets.GRAVITEE_CLIENT_ID_PSPOAT_TEST1 }}
   GRAVITEE_CLIENT_SECRET_PSPOAT_TEST1: ${{ secrets.GRAVITEE_CLIENT_SECRET_PSPOAT_TEST1 }}
   ```
3. Pass `GATEWAY_TYPE`/`REALM_KEY` into the data-setup and run-tests step `env:`. On Gravitee, also pass `TEST_IGNORE` built from `GraviteeExclusions.json`.
4. Include the gateway in artifact names, the Allure history path (`...-INTEROP-GRAVITEE`), the concurrency group and the Teams/report title.
5. Local runs: `GATEWAY_TYPE=GRAVITEE`, `REALM_KEY=pspoat-test1` and the two client secrets in `.env`.

---

## 7. Realm cloning checklist (`cbp-interop-ps-automation-2` → `pspo-int-automation`)
1. Users `TEST_AUTOMATION_USER_1` and `_2` exist with the same roles, including the process roles.
2. Same feature flags.
3. ALM deploy of the same solution package: process models, views and cards, SNA actors and procedures, MAAS models and calc engines.
4. PO and LM data: PO `exportData` → `importData`, then the view-entity-map and entity-view-procedure-map migrations. The `ProcessOrchestrationBackend/Migration/*` specs already exercise this path.
5. Run `DataSetupBatch` with `GATEWAY_TYPE=GRAVITEE` (scenarios, ODM, UI data reset).
6. Record the GUIDs that differ in the `GRAVITEE` blocks (§5.2).

---

## 8. Phases
| Phase | Work | Exit criteria |
|---|---|---|
| 1: Framework | §4.1–4.6 on `feature/gravitee-ui-dual-gateway` | The Azure nightly is unchanged. `ScopeBatch/Test_001` logs in and loads data on Gravitee locally. |
| 2: Data | §5.1 script, §7 cloning, §5.2 GUIDs, §5.3 exclusions | `PSSmokeBatch` passes on Gravitee at Azure parity, or has only logged product bugs. |
| 3: PO UI CI | §6 for the PO workflows | All 6 PO batches run on the Gravitee cron with separate reports. |
| 4: PS UI CI | §6 for the PS sharded workflow, including DataSetup | All 12 PS shards run on the Gravitee cron. |
| 5: Hardening | Flake triage, docs, learnings | Two consecutive green nightlies per gateway. |

## 9. Remaining open items
- Tenant ID (`tid`) and machine subject ID for `pspoat-test1`, for the realm registry and `REALM_ID`/`SUBJECT_ID` overrides. Both can be read from a decoded token after the first login or token call.
- Results of verifying the non-PO API paths on the Gravitee host (§4.4.5).
- Gravitee nightly cadence: full suite or smoke first.

## 10. Definition of Done
- [ ] One JSON per spec. Gravitee values sit only in its `GRAVITEE` block, and the `_schema` documents it.
- [ ] `GATEWAY_TYPE` is the only switch. Specs don't branch on the gateway (except the documented §4.6 items).
- [ ] With `GATEWAY_TYPE=GRAVITEE`, a missing block fails fast. Excluded specs are listed with reasons.
- [ ] No secrets in JSON or `setup.js`.
- [ ] No TypeScript errors. The targeted specs pass with `--workers=1` on both gateways.
- [ ] Workflows run on both gateways with separate artifacts, history and notifications.
