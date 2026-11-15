# Playwright Execution Time Improvement — Implementation Tasks

Target file: playwright-e2e/documentation/execution-time-improvement-tasks.md

## Baseline
| Metric | Value |
|---|---|
| Total workflow run time | ~1h 55m |
| Slowest batch | ondemandmaas (1h 51m) |
| Second slowest | cardsbatch (1h 9m) |
| Root cause 1 | Full OIDC login per spec file (~40s x ~68 logins = ~45 min wasted) |
| Root cause 2 | CardsBatch: 20 files serial in one job |
| Root cause 3 | Video/trace recorded on every test including passing ones |

## Target: < 1 hour total

---

## PHASE 1 - Login Storage State (Multi-Realm + Two Users) (savings: 35-45 min)

### Task 1.1 - Create playwright-e2e/configs/global-setup.ts
Status: [x] DONE | Type: New file

Purpose: Run once before workers and pre-auth all required realm/user combinations. Save one storageState per realm and per user.

Target auth layout:
- testdata/.auth/<realm-slug>/user1.json
- testdata/.auth/<realm-slug>/user2.json

Inputs:
- LUMINATE_PORTAL_URL
- REALMS (comma-separated realm list; fallback to REALM_NAME when omitted)
- FUNCTIONAL_TEST_USERNAME / FUNCTIONAL_TEST_PASSWORD
- FUNCTIONAL_TEST_USERNAME_2 / FUNCTIONAL_TEST_PASSWORD_2

Implementation notes:
1. Build an auth matrix from realms x users.
2. Login once per matrix row and persist storageState to the mapped file path.
3. Keep existing support-sign-in branch for realms that require it.
4. Log a per-combination summary at end of setup.

### Task 1.2 - Update playwright-e2e/configs/playwright.config.ts
Status: [x] DONE

Change 1: Add globalSetup before testDir:
  globalSetup: require.resolve('./global-setup'),

Change 2: Do NOT set a single static storageState under use:{}.
Reason: auth state must be selected dynamically by realm + user in fixtures.

### Task 1.3 - Update playwright-e2e/configs/fixtures.ts
Status: [x] DONE
Location: createCachedPage() function

Update createCachedPage() to resolve auth file dynamically:
1. Resolve test data file from testInfo.file using existing test-data resolver.
2. Read REALM_NAME from test data JSON.
3. Resolve auth user alias:
   - default: user1
   - override path: user2 (for specs tagged/flagged to run as second user)
4. Build authStatePath as testdata/.auth/<realm-slug>/<user-alias>.json.
5. Inject storageState only when file exists.

Expected merged context:
  const mergedContextOptions: BrowserContextOptions = {
    ...(contextOptions || {}),
    ...(authStatePath && fs.existsSync(authStatePath) ? { storageState: authStatePath } : {}),
    ...(contextOptions?.recordVideo === undefined
      ? { recordVideo: { dir: buildVideoDir(testInfo) } }
      : {}),
  };

### Task 1.4 - Verify launchAppFromCatalog() fallback behavior (VERIFY ONLY, no code change)
Status: [x] DONE
Validate for both user1 and user2 across at least two realms:
- With valid storageState: page.goto(portal) -> isLoggedIn() true -> fast exit.
- With missing/expired storageState: login flow executes and test continues.

Verification evidence (executed):
1. With storageState enabled (default fixture behavior):
  - Command: npx playwright test tests/PlanningSpace/DrillThroughBatch/Test_009_MultiLevelDrillThroughMassBdeWithAssumption.spec.ts --config=configs/playwright.config.ts --workers=1
  - Result: 2 passed
  - Log evidence: "User already logged in after navigation."
2. With storageState injection disabled (fallback path):
  - Command: PW_DISABLE_AUTH_STATE=true + same spec run
  - Result: 2 passed
  - Log evidence: "Already Logged In?:: false" then "Login flow completed. Validating portal landing state."

Note:
- user2 auth-state generation is currently skipped in this environment because user2 credential env vars are not configured yet.

### Task 1.5 - Create/Update playwright-e2e/.gitignore
Status: [x] DONE
Content:
  testdata/.auth/
  test-results/
  reports/
  logs/

### Task 1.6 - Phase 1 Smoke Tests (matrix validation)
Status: [x] DONE (with non-auth test failures)
Run at least these checks:
1. user1 + realmA
2. user2 + realmA
3. user1 + realmB

Confirm:
- Realm/user auth files are created under testdata/.auth/<realm-slug>/.
- Logs show fast-exit path: "User already logged in after navigation." on second run.
- No forced relogin loops between specs in same worker/file cache scope.

Execution summary:
1. QuickLinks smoke command executed with workers=1 and USE_SPECIFIC_TESTS=false.
2. Auth validation passed:
  - Auth file created: testdata/.auth/cbp-interop-ps-automation-2/user1.json
  - Fast-exit log observed: "User already logged in after navigation."
3. Suite had unrelated functional failures in QuickLinks tests (navigation/frame timing), not auth bootstrap issues.
4. Matrix gaps remain blocked by environment setup:
  - user2 credentials missing in env
  - second realm execution not configured in current run env

---

## PHASE 2 — Split CardsBatch (savings: ~30-35 min)

### Task 2.1 — Update workflow matrix + shell case
Status: [ ] TODO
File: .github/workflows/playwright-ps-iop-ui-local-suite.yaml

1. Both fromJSON arrays: replace "cardsbatch" with "cardsbatch-a","cardsbatch-b"
2. Remove cardsbatch) case, add:
   cardsbatch-a) runs Test_001 through Test_011 (11 files)
   cardsbatch-b) runs Test_012 through Test_021 (9 files, no Test_019)
3. workflow_dispatch options: replace cardsbatch with cardsbatch-a and cardsbatch-b

CardsBatch-a files: Test_001_WhiteListedCards, Test_002_CardActions, Test_003_MaasPivotCard, Test_004_MaasChartCard, Test_005_BDECard, Test_006_DonutChart, Test_007_LineChart, Test_008_MultiKPICard, Test_009_CombinationChart, Test_010_BulletChart, Test_011_ColumnChart
CardsBatch-b files: Test_012_NetworkCard, Test_013_MyTask, Test_014_TreeCard, Test_015_TableCard, Test_016_NPICard, Test_017_HeatmapChart, Test_018_ScenarioComparisionWithActor, Test_020_TabbedCard, Test_021_VerifycardsResize

### Task 2.2 — Update Publish Run Summary Python script
Status: [ ] TODO
1. batch_order list: replace "cardsbatch" with "cardsbatch-a","cardsbatch-b"
2. batch_match dict: replace "planningspace/cardsbatch": "cardsbatch" with 20 per-file entries routing Test_001-011 to cardsbatch-a and Test_012-021 to cardsbatch-b

---

## PHASE 4 — Investigate OnDemandMaas

### Task 4.1 — Profile test durations
Status: [ ] TODO
Open Allure run #30, filter ondemandmaas, note per-test times.
Expected: backend MAAS computation takes 15-20 min/test = not reducible.

### Task 4.2 — Split OnDemandMaas
Status: [ ] ON HOLD (after 4.1)
ondemandmaas-a: Test_001,002,003,004 | ondemandmaas-b: Test_006,007,008

---

## PHASE 5 — ScenarioBatch Split (Optional)

### Task 5.1 — Split ScenarioBatch
Status: [ ] ON HOLD (after Phase 1-3 results)
scenariobatch-a: Test_001-007 | scenariobatch-b: Test_008-014

---

## Progress Tracker

| # | Task | Status |
|---|---|---|
| 1.1 | Create global-setup.ts auth matrix | [x] DONE |
| 1.2 | playwright.config.ts - globalSetup only | [x] DONE |
| 1.3 | fixtures.ts - dynamic realm/user storageState | [x] DONE |
| 1.4 | Verify launchAppFromCatalog fallback + fast-exit | [x] DONE |
| 1.5 | Create .gitignore | [x] DONE |
| 1.6 | Phase 1 matrix smoke tests | [x] DONE* |
| 2.1 | Workflow matrix cardsbatch split | [ ] TODO |
| 2.2 | Python summary batch_order + batch_match | [ ] TODO |
| 3.1 | video/trace on-first-retry | [ ] TODO |
| 3.2 | Retries decision | [ ] DECISION |
| 4.1 | Profile OnDemandMaas | [ ] TODO |
| 4.2 | Split OnDemandMaas | [ ] ON HOLD |
| 5.1 | Split ScenarioBatch | [ ] ON HOLD |
