import { test, expect } from '../../../configs/fixtures';
import type { Page } from '@playwright/test';
import { getTimeout } from '../../../constants/timeouts';
import { PlanningPage } from '../../../pageobjects/planning.page';
import { ScopePage } from '../../../pageobjects/scope.page';
import { CommonFunctions } from '../../../util/common.util';
import apiUtil from '../../../util/api.util';

test.describe.serial('Admin Default Filter', () => {
  // Teardown replays every preset call the app made, so no admin filter is left pinned on the
  // shared process when a test fails before the UI reset in the last case.
  type CapturedPreset = { url: string; authorization: string; body: Record<string, any> };
  const capturedPresets = new Map<string, CapturedPreset>();

  function capturePresetRequest(page: Page): void {
    page.context().on('request', (request) => {
      const url = request.url().split('?')[0];
      if (!['POST', 'PUT'].includes(request.method()) || !/\/preset(\/|$)/.test(url) || /\/clear$/.test(url)) {
        return;
      }
      const authorization = request.headers()['authorization'];
      if (!authorization?.toLowerCase().startsWith('bearer ')) {
        return;
      }
      let body: Record<string, any> | null = null;
      try {
        body = request.postDataJSON();
      } catch {
        return;
      }
      if (!body?.entityId) {
        return;
      }
      const viewIds = Array.isArray(body.viewIds) ? body.viewIds : [body.viewId];
      // A preset row is keyed by entity + view, so keep one entry per combination.
      capturedPresets.set(`${body.entityType}|${body.entityId}|${viewIds.join(',')}`, { url, authorization, body });
    });
  }

  test.afterAll(async ({ commonFunctions }) => {
    if (capturedPresets.size === 0) {
      await commonFunctions.logMessage('WARN', 'Skipping admin filter teardown; no preset request was captured');
      return;
    }
    for (const { url, authorization, body } of capturedPresets.values()) {
      const clearRequest = {
        viewIds: Array.isArray(body.viewIds) ? body.viewIds : [body.viewId],
        entityId: body.entityId,
        entityType: body.entityType,
        applyToAllUsers: true,
        entityName: body.entityName
      };
      const headers = {
        accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: authorization
      };
      const clearUrl = `${url.replace(/\/preset(\/.*)?$/, '/preset')}/clear`;
      const label = `${clearRequest.entityType} ${clearRequest.entityName} (views ${clearRequest.viewIds.join(', ')})`;
      const response = await apiUtil.processAPIRequest('POST', clearUrl, clearRequest, headers, `Teardown: Clear admin default scope filter for ${label}`, 'full');
      const cleared = commonFunctions.isStatus(response?.status, 200);
      await commonFunctions.logMessage(cleared ? 'INFO' : 'WARN', `Teardown clear of admin filter on ${label} returned ${response?.status}`);
    }
  });

  test.beforeAll(async ({ testUtil, planningListingPage, planningPage, powerBarPage, commonFunctions, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.PSLINK as string);
    await planningListingPage.launchContext('Process', testData.PROCESS_NAME);
    await planningPage.waitForViewToBeDisplayed();

    // Start from a cleared admin preset on both views. The power bar chip shows the user's active context,
    // not the admin preset, so it can't tell us whether a reset is needed (see .agents/learnings.md).
    await planningPage.selectViewInPlanning(testData.PROCESS_VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.PROCESS_VIEW_NAME);
    await clearAdminPresetBestEffort(planningPage, commonFunctions, testData.PROCESS_VIEW_NAME, testData.RESET_DEFAULT_FILTER);

    // Switch to subprocess and reset subprocess view if needed
    const switched = await powerBarPage.selectEntityFromContext({ process: testData.PROCESS_NAME, subProcess: testData.SUB_PROCESS_NAME }, false, true);
    if (switched) {
      await planningPage.selectViewInPlanning(testData.SUB_PROCESS_VIEW_NAME);
      await planningPage.waitForSpecificDashboardToBeDisplayed(testData.SUB_PROCESS_VIEW_NAME);
      await clearAdminPresetBestEffort(planningPage, commonFunctions, testData.SUB_PROCESS_VIEW_NAME, testData.RESET_DEFAULT_FILTER);
      // Return to process context for Test Case 1
      await powerBarPage.selectEntityFromContext({ process: testData.PROCESS_NAME }, false, true);
    }
  });

  /** Starts a wait for the app's `preset/clear` call; resolves to its HTTP status, or null if none is sent. */
  function waitForPresetClear(planningPage: PlanningPage, timeout: number): Promise<number | null> {
    return planningPage.page.waitForResponse(
      (response) => response.request().method() === 'POST' && /\/preset\/clear$/.test(response.url().split('?')[0]),
      { timeout }
    ).then((response) => response.status(), () => null);
  }

  /**
   * Resets the view's admin preset to `resetFilterName` without failing the caller. When the view is already
   * cleared the save is a no-op (no toast, no request), so a failure only gets logged; Escape then closes the
   * select menu and the Set Default Filter dialog so the next step doesn't run behind an open modal.
   */
  async function clearAdminPresetBestEffort(planningPage: PlanningPage, commonFunctions: CommonFunctions, viewName: string, resetFilterName: string): Promise<void> {
    try {
      await planningPage.setAdminDefaultScopeFilter(resetFilterName);
      await planningPage.verifyAlertMsg('Preset is saved for the view', getTimeout('SHORT'));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      await commonFunctions.logMessage('WARN', `Could not reset admin preset on ${viewName} to ${resetFilterName} (likely already cleared): ${msg}`);
      await planningPage.page.keyboard.press('Escape');
      await planningPage.page.keyboard.press('Escape');
    }
  }

  async function setAdminFilterOnView(planningPage: PlanningPage, scopePage: ScopePage, commonFunctions: CommonFunctions, viewName: string, filterName: string): Promise<boolean> {
    await planningPage.selectViewInPlanning(viewName);
    await planningPage.waitForSpecificDashboardToBeDisplayed(viewName);
    // Clear first so setting filterName is always a real change: re-saving the same preset shows no "Preset is saved" toast.
    await clearAdminPresetBestEffort(planningPage, commonFunctions, viewName, 'No Filter Override');

    await planningPage.setAdminDefaultScopeFilter(filterName);
    const isPresetSaved = await planningPage.verifyAlertMsg('Preset is saved for the view', getTimeout('SHORT'));
    const bSaved = await commonFunctions.compareTwoValues(isPresetSaved, true, `Preset saved alert shown for ${viewName}`);
    const scopeName = await planningPage.waitForScopeNameInPowerBar(filterName, getTimeout('XLARGE'));
    const bChip = await commonFunctions.compareTwoValues(scopeName.replace(/\*/g, '').trim(), filterName, `Scope chip for ${viewName} is ${scopeName}`);
    await planningPage.openScopeFilterByChip();
    const appliedTitle = await scopePage.waitForAppliedVFTitle(filterName, getTimeout('XLARGE'));
    const bTitle = await commonFunctions.compareTwoValues(appliedTitle.replace(/\*/g, '').trim(), filterName, `Applied filter for ${viewName} is ${appliedTitle}`);
    await planningPage.closeDrawer();
    return bSaved && bChip && bTitle;
  }

  async function verifyFilterOnView(planningPage: PlanningPage, scopePage: ScopePage, commonFunctions: CommonFunctions, viewName: string, filterName: string): Promise<boolean> {
    await planningPage.selectViewInPlanning(viewName);
    await planningPage.waitForSpecificDashboardToBeDisplayed(viewName);
    const scopeName = await planningPage.waitForScopeNameInPowerBar(filterName, getTimeout('XLARGE'));
    const bChip = await commonFunctions.compareTwoValues(scopeName.replace(/\*/g, '').trim(), filterName, `Scope chip for ${viewName} is ${scopeName}`);
    await planningPage.openScopeFilterByChip();
    const appliedTitle = await scopePage.waitForAppliedVFTitle(filterName, getTimeout('XLARGE'));
    const bTitle = await commonFunctions.compareTwoValues(appliedTitle.replace(/\*/g, '').trim(), filterName, `Applied filter for ${viewName} is ${appliedTitle}`);
    await planningPage.closeDrawer();
    return bChip && bTitle;
  }

  async function resetAdminFilterOnView(planningPage: PlanningPage, commonFunctions: CommonFunctions, viewName: string, resetFilterName: string): Promise<boolean> {
    await planningPage.selectViewInPlanning(viewName);
    await planningPage.waitForSpecificDashboardToBeDisplayed(viewName);
    // Always reset: the chip shows the user's active context, not the admin preset, so it can't prove the preset is cleared.
    const clearStatus = waitForPresetClear(planningPage, getTimeout('XLARGE'));
    await planningPage.setAdminDefaultScopeFilter(resetFilterName);
    const status = await clearStatus;
    if (status === 200) {
      // Don't depend on the toast: if the user's previous personal filter was deleted on the backend, the app falls
      // back to it after the clear and shows "Failed to get presets data" (404) instead of "Preset is saved".
      return commonFunctions.compareTwoValues(status, 200, `preset/clear status after resetting ${viewName}`);
    }
    await commonFunctions.logMessage('INFO', `No successful preset/clear response seen for ${viewName} (status ${status}); checking the save toast`);
    const isPresetSaved = await planningPage.verifyAlertMsg('Preset is saved for the view', getTimeout('SHORT'));
    return commonFunctions.compareTwoValues(isPresetSaved, true, `Preset saved alert shown after resetting ${viewName}`);
  }

  async function expectFilterCleared(planningPage: PlanningPage, viewName: string, filterName: string): Promise<void> {
    await planningPage.selectViewInPlanning(viewName);
    await planningPage.waitForSpecificDashboardToBeDisplayed(viewName);
    await expect.poll(async () => (await planningPage.getScopeNameFromPowerBar()).replace(/\*/g, '').trim(), {
      timeout: getTimeout('XLARGE'),
      message: `Expected ${filterName} to be cleared on ${viewName}`
    }).not.toBe(filterName);
  }

  test('Test Case 1: Set AdminFilterCheck as admin default scope filter on process view', async ({ page, testUtil, planningListingPage, planningPage, scopePage, commonFunctions, testData }) => {
    capturePresetRequest(page);
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.PSLINK as string);
    await planningListingPage.launchContext('Process', testData.PROCESS_NAME);
    await planningPage.waitForViewToBeDisplayed();
    const bValidation = await setAdminFilterOnView(planningPage, scopePage, commonFunctions, testData.PROCESS_VIEW_NAME, testData.ADMIN_FILTER_NAME);
    expect(bValidation).toBeTruthy();
  });

  test('Test Case 2: Set AdminFilterCheck as admin default scope filter on subprocess view', async ({ powerBarPage, planningPage, scopePage, commonFunctions, testData }) => {
    const contextSwitched = await powerBarPage.selectEntityFromContext({ process: testData.PROCESS_NAME, subProcess: testData.SUB_PROCESS_NAME }, false, true);
    const bContext = await commonFunctions.compareTwoValues(contextSwitched, true, `Switched context to ${testData.SUB_PROCESS_NAME}`);
    const processName = await planningPage.getLaunchedProcessFromPowerbar();
    const subProcessName = await planningPage.getLaunchedSubProcessFromPowerbar();
    const bProcess = await commonFunctions.compareTwoValues(processName, testData.PROCESS_NAME, `Launched process is ${processName}`);
    const bSubProcess = await commonFunctions.compareTwoValues(subProcessName, testData.SUB_PROCESS_NAME, `Launched subprocess is ${subProcessName}`);
    const bValidation = await setAdminFilterOnView(planningPage, scopePage, commonFunctions, testData.SUB_PROCESS_VIEW_NAME, testData.ADMIN_FILTER_NAME);
    expect(bContext && bProcess && bSubProcess && bValidation).toBeTruthy();
  });

  test('Test Case 3: Sign out and login with second user', async ({ testUtil, processPage, planningPage, testData }) => {
    const secondUserName = process.env['FUNCTIONAL_TEST_USERNAME' + '2'] as string;
    await testUtil.signOutAndLoginFromCatalog(testData.REALM_NAME, secondUserName, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string);
    await processPage.clickOnProcess(testData.PROCESS_NAME);
    await testUtil.clickLeftpaneLinks('Planning');
    await planningPage.waitForViewToBeDisplayed();
  });

  test('Test Case 4: Verify AdminFilterCheck is inherited on process view for second user', async ({ planningPage, scopePage, commonFunctions, testData }) => {
    const bValidation = await verifyFilterOnView(planningPage, scopePage, commonFunctions, testData.PROCESS_VIEW_NAME, testData.ADMIN_FILTER_NAME);
    expect(bValidation).toBeTruthy();
  });

  test('Test Case 5: Switch context to subprocess and verify AdminFilterCheck on Edit View Disabled', async ({ powerBarPage, planningPage, scopePage, commonFunctions, testData }) => {
    const contextSwitched = await powerBarPage.selectEntityFromContext({ process: testData.PROCESS_NAME, subProcess: testData.SUB_PROCESS_NAME }, false, true);
    const bContext = await commonFunctions.compareTwoValues(contextSwitched, true, `Switched context to ${testData.SUB_PROCESS_NAME}`);
    const bValidation = await verifyFilterOnView(planningPage, scopePage, commonFunctions, testData.SUB_PROCESS_VIEW_NAME, testData.ADMIN_FILTER_NAME);
    expect(bContext && bValidation).toBeTruthy();
  });

  test('Test Case 6: Reset admin default scope filter on subprocess view as second user', async ({ planningPage, commonFunctions, testData }) => {
    const bReset = await resetAdminFilterOnView(planningPage, commonFunctions, testData.SUB_PROCESS_VIEW_NAME, testData.RESET_DEFAULT_FILTER);
    expect(bReset).toBeTruthy();
  });

  test('Test Case 7: Reset admin default scope filter on process view as second user', async ({ powerBarPage, planningPage, commonFunctions, testData }) => {
    const contextSwitched = await powerBarPage.selectEntityFromContext({ process: testData.PROCESS_NAME }, false, true);
    const bContext = await commonFunctions.compareTwoValues(contextSwitched, true, `Switched context to ${testData.PROCESS_NAME}`);
    const bReset = await resetAdminFilterOnView(planningPage, commonFunctions, testData.PROCESS_VIEW_NAME, testData.RESET_DEFAULT_FILTER);
    expect(bContext && bReset).toBeTruthy();
  });

  // The second user performs both resets, so the first user proves they cleared for everyone.
  test('Test Case 8: Sign back in as first user and verify AdminFilterCheck is cleared on process view', async ({ testUtil, processPage, planningPage, testData }) => {
    await testUtil.signOutAndLoginFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string);
    await processPage.clickOnProcess(testData.PROCESS_NAME);
    await testUtil.clickLeftpaneLinks('Planning');
    await planningPage.waitForViewToBeDisplayed();
    await expectFilterCleared(planningPage, testData.PROCESS_VIEW_NAME, testData.ADMIN_FILTER_NAME);
  });

  test('Test Case 9: Verify AdminFilterCheck is cleared on subprocess view for first user', async ({ powerBarPage, planningPage, commonFunctions, testData }) => {
    const contextSwitched = await powerBarPage.selectEntityFromContext({ process: testData.PROCESS_NAME, subProcess: testData.SUB_PROCESS_NAME }, false, true);
    const bContext = await commonFunctions.compareTwoValues(contextSwitched, true, `Switched context to ${testData.SUB_PROCESS_NAME}`);
    await expectFilterCleared(planningPage, testData.SUB_PROCESS_VIEW_NAME, testData.ADMIN_FILTER_NAME);
    expect(bContext).toBeTruthy();
  });
});
