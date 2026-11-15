import { test, expect } from '../../../configs/fixtures';

const TestData = require("../../../testdata/" + process.env.PSENV + "/PlanningSpace/ObjectiveBar/Test_003_ObjectiveBarForAssumption.json");

test.describe.serial('objective bar for Assumption', () => {
  test('Test Case 1: Verify objective bar details', async ({ testUtil, planningListingPage, planningPage, portalPage, commonFunctions, page }) => {
    await testUtil.launchAppFromCatalog(
      TestData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME2 as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
    );
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext("Assumption", TestData.PROCESS, undefined, TestData.ASSUMPTION.ASSUMPTION_NAME);
    await page.waitForTimeout(5000);
    const validation1 = await portalPage.verifyObjectiveBarDetails();
    await commonFunctions.compareTwoValues(validation1, true, 'verify details in objective bar');
    expect(validation1).toEqual(true);
    await commonFunctions.logMessage('INFO', 'Test case 1: Objective bar details verified successfully');
  });

  test('Test Case 2: Verify objective bar if there is no data for assumption', async ({ testUtil, planningListingPage, portalPage, commonFunctions, page }) => {
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext("Assumption", TestData.PROCESS_NAME, undefined, TestData.ASSUMPTION.ASSUMPTION_NAME);
    await page.waitForTimeout(5000);
    const validation1 = await portalPage.verifyObjectiveBarDetails();
    await commonFunctions.compareTwoValues(validation1, false, 'verify objective bar details when no data is configured');
    expect(validation1).toEqual(false);
    await commonFunctions.logMessage('INFO', 'Test case 2: Objective bar is not displayed when no data is configured successfully');
  });
});
