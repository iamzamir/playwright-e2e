# OnDemandMaas Test_003 and Test_008 Mocking Plan

**Task Reference:** [T9.6: OnDemandMaas status and empty states](../../../planning/Phases/phase_9_mocked_ui_contract_tier/tasks/T9.6_ondemand_maas_states.md)  
**Parent Phase:** [Phase 9: Mocked UI-contract tier](../../../planning/Phases/phase_9_mocked_ui_contract_tier/README.md)  
**Prerequisites:** [T9.2: Synthetic response helpers](../../../planning/Phases/phase_9_mocked_ui_contract_tier/tasks/T9.2_synthetic_route_helpers.md)  
**Lead Personas:** `role-playwright-automation`, `role-sdet-architect`  

---

## 1. Executive Summary & Objective

The goal of this plan is to migrate two highly flaky OnDemandMaas (ODM) specs:
1. `Test_003_OnDemandNoFilterConfigured.spec.ts` (Empty filter state / prompt)
2. `Test_008_VerifyTheUnifiedEmptyState.spec.ts` (Planning instance in Error state & Empty filter state)

from live, shared INTEROP dependencies to deterministic, mocked UI-contract specs running under `tests/PlanningSpace/Mocked/OnDemandMaas/`.

### Why the Live Specs Fail Today
- **`Test_008` (Test Case 1 - Error State):** Requires the MaaS cluster planning instance for process `FaultTolerance` and scenario `Fault_Tolerance_Scenario` to be actively in an `error` state. In shared INTEROP environments, cluster instances are either automatically cleaned up, never hydrated, or remain in `inprogress` ("Data is currently syncing") indefinitely (documented in `.agents/learnings.md` line 22). As a result, `Test_008` fails almost every nightly run.
- **`Test_003` & `Test_008` (Test Case 2 - Empty Filter State):** Require the interactive view to have no scope or filter dimensions applied. If any developer, scheduled job, or prior test sets a default filter override or global scope, the empty state screen is bypassed, causing immediate test failures.

---

## 2. Dev Repo Deep-Dive (`plan-sop-planning-mfe`)

Analysis of `C:\Backend\plan-sop-planning-mfe` reveals the exact front-end hooks, Redux actions, API endpoints, and DOM states governing these flows:

### A. Planning Instance in Error State (`Test_008` Test Case 1)

* **Key Source Files:**
  * `src/hooks/useUpdateMfeInfo.ts`: `getMatchingSession` (lines 416–430, 526–575) and `getSessionDetails` (lines 586–615).
  * `src/components/SideNav/SideNavWithRightPanel.tsx`: lines 1788–1805.
  * `src/components/utility.ts`: `setNewUIForODMErrorState` (lines 533–565).
  * `src/components/SideNav/DataSyncStatusCard/DataSyncStatusCard.tsx`: lines 115–150.
* **Underlying Logic:**
  1. The MFE calls `POST {config.interactivePlaning}/planningInstance/getMatchingSession`.
  2. If a session is matched, it inspects `result.planningInstance.status` or polls `GET {config.interactivePlaningClusters}/{instanceId}`.
  3. If the planning instance returns `status: "error"` (or if `getMatchingSession` / `getSessionDetails` throws an HTTP 500 error), `useUpdateMfeInfo.ts` catches it:
     ```typescript
     dispatch(setMatchedSessionId(null));
     dispatch(setMatchedSessionDetails({ status: 'error' }));
     if (odmErrorStateNewUiEnabled) {
       setNewUIForODMErrorState(setText, dispatch);
     }
     ```
  4. `setNewUIForODMErrorState` dispatches a dynamic loader payload with:
     * `testIdPrefix: 'error'`
     * `titleKey: setText('dataCouldNotBeSynced')` ("Data could not be synced")
     * `descriptionKey: setText('dataCouldNotBeSyncedStatusMessage')` ("Try one of the options below to continue.")
     * Action links:
       * `labelKey: setText('runDifferentScope')` ("Run a different scope") $\rightarrow$ dispatches `{ openScopeTab: true, openScenarioTab: false }`
       * `labelKey: setText('runDifferentScenario')` ("Run a different scenario") $\rightarrow$ dispatches `{ openScopeTab: false, openScenarioTab: true }`
  5. The header Data Sync Status button displays the error icon (`data-sync-status-icon-error`). Clicking it opens `DataSyncStatusCard` showing:
     * Status message: `"Data couldn’t be synced"` (`dataSync.syncFailed`)
  6. The Supply Chain Actions (SCA) dropdown is disabled.

---

### B. Filter Not Configured / Unified Empty State (`Test_003` & `Test_008` Test Case 2)

* **Key Source Files:**
  * `src/components/SideNav/SideNavWithRightPanel.tsx`: `showUndefinedFilterAlert` (lines 2730–2765).
  * `src/components/SideNav/utility.ts`: `isVFDimensionsUndefined` (lines 244–255).
  * `src/components/SideNav/SideNavWithRightPanel.tsx`: `fetchPresets` (line 2043).
* **Underlying Logic:**
  1. When navigating to an interactive view (`isViewInteractiveView === true`), `showUndefinedFilterAlert` checks if Vertical Filter dimensions are defined:
     ```typescript
     export const isVFDimensionsUndefined = async (appSelections, backendWorkflowFilter) => {
       const dimensions = appSelections?.filterContext?.dimensions;
       if ((dimensions === null || dimensions === undefined || dimensions?.length <= 0) && !backendWorkflowFilter) {
         return true;
       }
       return false;
     };
     ```
  2. If `vfDimensionsUndefined === true`:
     * Under the current UI (`odmErrorStateNewUiEnabled === true`), it dispatches `setDynamicLoader` with:
       * `testIdPrefix: 'filterConfigure'`
       * `titleKey: setText('setFilterTitleNew').replace('%Process Name%', processName)` ("Welcome to the %Process Name%.")
       * `subtitleKey: setText('setEmptyFilterSubTitle')` ("Choose a shared filter or create your own filter configuration to begin.")
       * `actionButton: { labelKey: setText('openFilter'), onClick: ... }` ("Set Filter", opens Scope drawer)
     * Under the legacy UI (`odmErrorStateNewUiEnabled === false`), it displayed a snackbar toast (which is why `Test_003` was originally titled "Toast Message Test").
  3. The Vertical Filter configuration APIs called are:
     * `GET {verticalFilterUrl}/config/{instanceName}`
     * `GET /view-filter/v1/presets`
  4. Fulfilling these requests with `{ entities: [] }` or empty dimensions deterministically triggers the empty state.

---

## 3. Mocking Strategy & Endpoint Contracts

Because Planning Space microfrontends relay API calls to the shell portal via `postMessage('apim:relay:request')`, **all routes must be established on the `BrowserContext` (`context.route(...)`)**, capturing requests across all frames.

### Mock Contract 1: Planning Instance Error State (`Test_008` Case 1)
* **Route Pattern:** `**/foundation/interactive-planning/v1/planningInstance/**`
* **Handler:**
  ```typescript
  await context.route('**/foundation/interactive-planning/v1/planningInstance/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/getMatchingSession')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionMatched: true,
          sparqAssociated: false,
          planningInstance: {
            id: 'mock-error-instance-001',
            status: 'error',
            procedureExecutionId: 'mock-proc-exec-001',
            procedureName: 'MockProcedure',
            scenarioId: 'Fault_Tolerance_Scenario'
          }
        })
      });
      return;
    }

    // Direct instance details polling
    if (url.includes('/mock-error-instance-001')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-error-instance-001',
          status: 'error',
          procedureExecutionId: 'mock-proc-exec-001',
          procedureName: 'MockProcedure'
        })
      });
      return;
    }

    await route.continue();
  });
  ```

### Mock Contract 2: Empty Filter / Vertical Filter Presets (`Test_003` & `Test_008` Case 2)
* **Route Pattern:** `**/lui/verticalFilterBff/v1/config/**` and `**/view-filter/v1/presets**`
* **Handler:**
  ```typescript
  await context.route('**/lui/verticalFilterBff/v1/config/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ entities: [] })
    });
  });
  ```

---

## 4. Step-by-Step Implementation Roadmap

### Step 1: Create Route Helpers in `playwright-e2e/util/api-mock.util.ts`
Implement standard synthetic routing helpers:
1. `mockPlanningInstanceStatus(context: BrowserContext, status: 'error' | 'started' | 'inprogress', details?: Partial<PlanningInstanceDetails>): Promise<() => Promise<void>>`
   - Intercepts matching session and instance ID endpoints.
   - Logs `[MOCK] POST **/planningInstance/getMatchingSession -> 200 (status: <status>)` using `CommonFunctions.logMessage`.
   - Returns an `unroute` function for test teardown.
2. `mockEmptyVerticalFilter(context: BrowserContext): Promise<() => Promise<void>>`
   - Intercepts vertical filter config and preset APIs, returning `{ entities: [] }`.
   - Returns an `unroute` function.

### Step 2: Implement Mocked Specs

`Test_008` was split into two specs on 2026-11-06. Each needs a new browser context, because after another test in the same context the MFE serves `search-preset` from its IndexedDB cache.

#### `Test_008_VerifyTheUnifiedErrorStateMocked.spec.ts`
* **Path:** `tests/PlanningSpace/Mocked/OnDemandMaas/Test_008_VerifyTheUnifiedErrorStateMocked.spec.ts`
* **Test Case 1: Unified Error Screen for Planning Instance in Error State**
  1. Install `mockPlanningInstanceStatus(context, 'error')` and `pinDefaultScenario(context, scenarioName)`, because live specs for the same user change the default scenario.
  2. Launch process and view, then verify the scenario chip shows the pinned scenario.
  3. Validate Data Sync status icon in header.
  4. Click status icon $\rightarrow$ verify message `"Data couldn’t be synced"`.
  5. Validate Unified Error Screen on canvas:
     - Verify `"Run a different scope"` button is visible.
     - Click `"Run a different scope"` $\rightarrow$ verify Scope drawer opens $\rightarrow$ close drawer.
     - Verify `"Run a different scenario"` button is visible.
     - Click `"Run a different scenario"` $\rightarrow$ verify Scenarios drawer opens $\rightarrow$ close drawer.
     - Verify SCA dropdown is disabled.

#### `Test_008_VerifyTheUnifiedEmptyStateMocked.spec.ts`
* **Path:** `tests/PlanningSpace/Mocked/OnDemandMaas/Test_008_VerifyTheUnifiedEmptyStateMocked.spec.ts`
* **Test Case 2: Unified Empty State Screen when VF is not available**
  1. Install `mockEmptyVerticalFilter(context)`.
  2. Launch view.
  3. Verify `"Welcome to the <process>."` text is displayed.
  4. Verify `"Set Filter"` button is visible.
  5. Click `"Set Filter"` $\rightarrow$ verify Scope drawer opens $\rightarrow$ close drawer.
  6. Verify SCA dropdown is disabled.

#### `Test_003_OnDemandNoFilterConfiguredMocked.spec.ts`
* **Path:** `tests/PlanningSpace/Mocked/OnDemandMaas/Test_003_OnDemandNoFilterConfiguredMocked.spec.ts`
* **Test Case 1: Filter Configuration Prompt Displayed When Filter is Not Configured**
  1. Install `mockEmptyVerticalFilter(context)`.
  2. Launch process and view.
  3. Verify `"Welcome to the <process>."` prompt is displayed.
  4. Open Scope drawer $\rightarrow$ assert `scopePage.isFilterConfigured() === false`.
  5. Verify Interactive Data Status icon is visible.

### Step 3: Test Data Management
* Add test data JSON files:
  * `testdata/INTEROP/PlanningSpace/Mocked/OnDemandMaas/Test_003_OnDemandNoFilterConfiguredMocked.json`
  * `testdata/INTEROP/PlanningSpace/Mocked/OnDemandMaas/Test_008_VerifyTheUnifiedErrorStateMocked.json`
  * `testdata/INTEROP/PlanningSpace/Mocked/OnDemandMaas/Test_008_VerifyTheUnifiedEmptyStateMocked.json`
* Data should use standard stable process names (e.g. `PSAutomationProcess`), since the backend data is mocked and not modified.

### Step 4: Suite Wiring & Retiring Live Specs
1. Register new mocked specs in `tests/TestSuites/PSMockedBatch.json`:
   ```json
   "tests/PlanningSpace/Mocked/OnDemandMaas/Test_003_OnDemandNoFilterConfiguredMocked.spec.ts",
   "tests/PlanningSpace/Mocked/OnDemandMaas/Test_008_VerifyTheUnifiedErrorStateMocked.spec.ts",
   "tests/PlanningSpace/Mocked/OnDemandMaas/Test_008_VerifyTheUnifiedEmptyStateMocked.spec.ts"
   ```
2. Unschedule/retire the old live specs:
   - Remove `Test_003_OnDemandNoFilterConfigured.spec.ts` and `Test_008_VerifyTheUnifiedEmptyState.spec.ts` from `tests/TestSuites/OnDemandMaasBatch.json`.
   - Add entries into `tests/TestSuites/_unscheduled.json` noting they were migrated to the mocked tier under Phase 9 (T9.6).

### Step 5: Verification & Quality Gates
Execute standard repository verification:
```bash
cd playwright-e2e
npm run typecheck
npm run lint
npm run validate:suites
npm run docs:testcases:check
SUITENAME=PSMockedBatch PW_RETRIES=0 npx playwright test tests/PlanningSpace/Mocked/OnDemandMaas/ --config=configs/playwright.config.ts
```

---

## 5. Review & Acceptance Criteria

- [ ] Route helpers live in `util/api-mock.util.ts` and route cleanly on `BrowserContext`.
- [ ] No `waitForTimeout` or hardcoded sleeps are introduced; all waits leverage timeout tiers and locator states.
- [ ] All mock routes are cleaned up in `afterEach` via unroute handlers to avoid test leakage.
- [ ] Mocked specs run deterministically with 0 flakiness across multiple consecutive runs.
- [ ] `OnDemandMaasBatch.json` and `PSMockedBatch.json` pass `npm run validate:suites`.
- [ ] Test case documentation regenerated and validated via `npm run docs:testcases:check`.
