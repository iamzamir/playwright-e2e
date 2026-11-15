import { test, expect } from '../../../../configs/fixtures';
import { mockPlanningInstanceStatus, pinDefaultScenario, UnrouteFn } from '../../../../util/api-mock.util';
import { getTimeout } from '../../../../constants/timeouts';

/**
 * Mocked UI contract for OnDemandMaas Test_008 (Phase 9 - T9.6):
 * Tests the Unified Error State screen (when Planning Instance enters 'error' state).
 * The Unified Empty State test is in its own spec, Test_008_VerifyTheUnifiedEmptyStateMocked, so it gets a new browser context.
 *
 * Mocking replaces brittle shared INTEROP cluster states with deterministic contract intercepts routed on the BrowserContext.
 */
test.describe('Unified error state in ODM (Mocked UI Contract)', () => {
  const routes: UnrouteFn[] = [];

  test.skip((process.env.ENVIRONMENT || process.env.PSENV || 'INTEROP').trim().toUpperCase() !== 'INTEROP', 'Mocked test data configured on INTEROP only');
  test.skip((process.env.GATEWAY_TYPE || '').toUpperCase() === 'GRAVITEE', 'Test data configured for the Azure gateway');

  test.afterEach(async () => {
    await Promise.all(routes.splice(0).map((unroute) => unroute()));
  });

  test('Test case 1: Verify Unified Error Screen for Planning Instance in Error State when VF is applied', async ({
    planningPage,
    odmPage,
    commonFunctions,
    testUtil,
    testData,
    page,
  }) => {
    // Intercept planningInstance endpoints to deterministically simulate 'error' cluster state
    const planningInstanceMock = await mockPlanningInstanceStatus(page.context(), 'error', {
      scenarioId: testData.SCENARIO_NAME,
    });
    const defaultScenarioPin = await pinDefaultScenario(page.context(), testData.SCENARIO_NAME);
    routes.push(planningInstanceMock, defaultScenarioPin);

    await testUtil.loginToPlanningSpaceWithProcess(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      testData.PROCESS_NAME
    );

    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);

    // Contract assertion: the view title can render before the MFE sends this request, so poll for it.
    await expect
      .poll(
        () => planningInstanceMock.calls.some((c) => c.url.includes('planningInstance/getMatchingSession') && c.method === 'POST'),
        { timeout: getTimeout('XLARGE') }
      )
      .toBe(true);

    // Without the pin, the chip check below would depend on the live default scenario.
    await expect
      .poll(
        () => defaultScenarioPin.calls.some((c) => c.url.includes('simulations/search') && c.method === 'POST'),
        { message: 'simulations/search should go through the default scenario pin', timeout: getTimeout('XLARGE') }
      )
      .toBe(true);

    // 1. Scenario chip text validation
    // A request seen by the pin may not have reached the chip yet, so wait for the expected text.
    await expect
      .poll(() => planningPage.getScenarioChipText(), {
        message: `Scenario chip text should contain '${testData.SCENARIO_NAME}'`,
        timeout: getTimeout('XLARGE'),
      })
      .toContain(testData.SCENARIO_NAME);

    // 2. Interactive Data Status Icon in header
    const isIconVisible = await odmPage.clickInteractiveDataStatusIcon();
    const interactiveIconValidation = await commonFunctions.compareTwoValues(
      isIconVisible,
      true,
      'Interactive Data Status Icon should be visible on the interactive view'
    );

    // 3. Data Sync Error message in DataSyncStatusCard popover
    const isDataSyncErrorDisplayed = await odmPage.verifyDataSyncStatusMessage(testData.DATA_SYNC_ERROR_MESSAGE, 'error');
    const dataSyncValidation = await commonFunctions.compareTwoValues(
      isDataSyncErrorDisplayed,
      true,
      `"${testData.DATA_SYNC_ERROR_MESSAGE}" text should be displayed on Data Sync card`
    );

    // 4. "Run a different scope" button on Unified Error Screen
    const runDifferentScopeBtn = await planningPage.verifyRunDifferentScopeBtn('Run a different scope');
    const scopeBtnValidation = await commonFunctions.compareTwoValues(
      runDifferentScopeBtn,
      true,
      '"Run a different scope" button should be displayed on the unified error screen'
    );

    // 5. Open and close Scope drawer via action link
    await planningPage.clickOnRunDifferentScopeOrScenarioBtn('Run a different scope');
    const isScopeOverlayDisplayed = await planningPage.doesDrawerOpened('Scope');
    const scopeOverlayValidation = await commonFunctions.compareTwoValues(
      isScopeOverlayDisplayed,
      true,
      'Scope overlay with title "Scope" should be displayed after clicking "Run a different scope"'
    );
    await planningPage.closeDrawer();

    // 6. "Run a different scenario" button on Unified Error Screen
    const runDifferentScenarioBtn = await planningPage.verifyRunDifferentScenarioBtn('Run a different scenario');
    const scenarioBtnValidation = await commonFunctions.compareTwoValues(
      runDifferentScenarioBtn,
      true,
      '"Run a different scenario" button should be displayed on the unified error screen'
    );

    // 7. Open and close Scenarios drawer via action link
    await planningPage.clickOnRunDifferentScopeOrScenarioBtn('Run a different scenario');
    const isScenarioOverlayDisplayed = await planningPage.doesDrawerOpened('Scenarios');
    const scenarioOverlayValidation = await commonFunctions.compareTwoValues(
      isScenarioOverlayDisplayed,
      true,
      'Scenario overlay with title "Scenarios" should be displayed after clicking "Run a different scenario"'
    );
    await planningPage.closeDrawer();

    // 8. Supply Chain Actions dropdown disabled status
    const isSCADisabled = await planningPage.validateSCADropdownStatus();
    const scaDisabledValidation = await commonFunctions.compareTwoValues(
      isSCADisabled,
      true,
      'Supply Chain Actions should be disabled on the Error state screen'
    );

    expect(
      interactiveIconValidation &&
      dataSyncValidation &&
      scopeBtnValidation &&
      scopeOverlayValidation &&
      scenarioBtnValidation &&
      scenarioOverlayValidation &&
      scaDisabledValidation
    ).toBeTruthy();
  });
});
