import { test, expect } from '../../../configs/fixtures';

test.describe.serial('PowerBar Details for sub process - Planning Space', () => {
  test('Test Case 1: verify context type for sub process', async ({ powerBarPage, commonFunctions, testUtil, planningListingPage, testData }) => {
    await test.step('Step 1: Launch app and Subprocess context', async () => {
      await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
      await testUtil.navigateToPlanningListingPage();
      await planningListingPage.launchContext('Subprocess', testData.PROCESS_NAME, testData.SUBPROCESS_NAME);
    });

    await test.step('Step 2: Verify context type for subprocess', async () => {
      const verifyContextType = await powerBarPage.verifyContextEntity(testData.PROCESS_NAME, testData.SUBPROCESS_DISPLAY_NAME);
      const validation = await commonFunctions.compareTwoValues(verifyContextType, true, 'verify context type for sub process Assertion');
      const isBackButtonExists = await powerBarPage.verifyBackButtonExists();
      const backButtonValidation = await commonFunctions.compareTwoValues(isBackButtonExists, false, 'verify back button is not shown in side nav panel');
      expect(validation && backButtonValidation).toEqual(true);
      await commonFunctions.logMessage('INFO', 'Test case 1: context type for sub process in power bar verified successfully');
    });
  });

  test('Test Case 2: Verify scope chip click opens scope tab', async ({ powerBarPage, commonFunctions }) => {
    await test.step('Step 1: Click scope chip and verify drawer opens', async () => {
      const validation1 = await powerBarPage.verifyPowerBarScopeChipClick();
      await commonFunctions.compareTwoValues(validation1, true, 'scope chip click opens scope tab');
      expect(validation1).toEqual(true);
      await commonFunctions.logMessage('INFO', 'Test case 2: scope chip in Powerbar verified successfully');
    });
  });

  test('Test Case 3: Verify scenario chip click opens scenario tab', async ({ powerBarPage, commonFunctions }) => {
    await test.step('Step 1: Click scenario chip and verify drawer opens', async () => {
      const validation1 = await powerBarPage.verifyPowerBarScenarioChipClick();
      await commonFunctions.compareTwoValues(validation1, true, 'scenario chip click opens scenarios tab');
      expect(validation1).toEqual(true);
      await commonFunctions.logMessage('INFO', 'Test case 3: scenario chip in Powerbar verified successfully');
    });
  });

  test('Test Case 4: Verify sub process details in power tooltip', async ({ powerBarPage, commonFunctions, testData }) => {
    await test.step('Step 1: Verify sub process details in power tooltip', async () => {
      const verifyPowerBarDetails = await powerBarPage.verifyPowerBarToolTipDetails(testData.PROCESS_NAME, 'Process', testData.SUBPROCESS_DISPLAY_NAME);
      const validation = await commonFunctions.compareTwoValues(verifyPowerBarDetails, true, 'verify sub process details in power bar tooltip');
      expect(validation).toEqual(true);
      await commonFunctions.logMessage('INFO', 'Test case 4: sub process details in Powerbar tool tip verified successfully');
    });
  });

  test('Test Case 5: Verify navigating to process summary page on click of process if context is sub process', async ({ powerBarPage, commonFunctions, testData }) => {
    await test.step('Step 1: Verify navigation on process chip click', async () => {
      const verifyNavigation = await powerBarPage.verifyNavigationOnClickOfEntityChipInPo('PROCESS', testData.PROCESS_NAME);
      const validation = await commonFunctions.compareTwoValues(verifyNavigation, true, 'verify navigation to process summary page on click of process in power bar');
      expect(validation).toEqual(true);
      await commonFunctions.logMessage('INFO', 'Test case 5: Navigation to process summary page on click of process in power bar verified successfully for sub process');
    });
  });
});
