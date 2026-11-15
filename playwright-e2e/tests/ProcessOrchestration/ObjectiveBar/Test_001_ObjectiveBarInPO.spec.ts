import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';
import { waitForDelay } from '../../../util/wait-helpers';

test.describe('Objective bar for process', () => {

  test.describe.serial('Objective Bar Test Suite', () => {

    test('Test Case 1: Verify objective bar details', async ({ page, testUtil, processPage, portalPage, commonFunctions, testData }) => {
      await testUtil.launchAppFromCatalog(testData.REALM_NAME);
      await testUtil.navigateToProcessListingPage();
      await processPage.clickOnProcess(testData.PROCESS_NAME1);
      await waitForDelay(page, getTimeout('MEDIUM'));
      const validation1 = await portalPage.verifyObjectiveBarDetails();
      await commonFunctions.compareTwoValues(validation1, true, "verify details in objective bar");
      expect(validation1).toEqual(true);
      await commonFunctions.logMessage("INFO", "Test case 1: Objective bar details verified successfully");
    });

    test('Test Case 2: Verify objective bar if there is no data is configured', async ({ page, testUtil, processPage, portalPage, commonFunctions, testData }) => {
      await portalPage.clickBYLogo();
      await testUtil.navigateToProcessListingPage();
      await processPage.clickOnProcess(testData.PROCESS_NAME2);
      await waitForDelay(page, getTimeout('MEDIUM'));
      const validation1 = await portalPage.verifyObjectiveBarDetails();
      await commonFunctions.compareTwoValues(validation1, false, "verify objective bar details when no data is configured");
      expect(validation1).toEqual(false);
      await commonFunctions.logMessage("INFO", "Test case 2: Objective bar is not displayed when no data is configured successfully");
    });

  });
});

