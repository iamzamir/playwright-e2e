import { test, expect } from '../../../configs/fixtures';

test.describe.serial('PowerBar - recently viewed entities - Planning Space', () => {
  test('Test Case 1: To test the recently viewed tabs for power bar', async ({ powerBarPage, commonFunctions, testUtil, planningListingPage, testData }) => {
    await test.step('Step 1: Launch app and open Process context', async () => {
      await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
      await testUtil.navigateToPlanningListingPage();
      await planningListingPage.launchContext('Process', testData.PROCESS_NAME);
    });

    await test.step('Step 2: Verify recently viewed tabs in power bar', async () => {
      const verifyRecentlyViewedProcess = await powerBarPage.verifyRecentlyViewedProcess(testData.PROCESS_NAME, 'Process', testData.RECENTLY_OPENED_PROCESS, testData.IS_PLANNING_SPACE);
      const validation = await commonFunctions.compareTwoValues(verifyRecentlyViewedProcess, true, 'verify recently viewed entities in power bar');
      expect(validation).toEqual(true);
      await commonFunctions.logMessage('INFO', 'Test case 1: recently viewed tabs for power bar verified successfully');
    });
  });
});


