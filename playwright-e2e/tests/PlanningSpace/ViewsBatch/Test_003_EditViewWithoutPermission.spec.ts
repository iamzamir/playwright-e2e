import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Edit Icon Without Edit Permission', () => {
  test.beforeAll(async ({ testUtil, planningPage, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME2 as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      testData.PROCESS_NAME
    );
    await planningPage.waitForViewToBeDisplayed();
  });

  test('Test Case 1: Edit Should be Disabled', async ({ planningPage, commonFunctions, testData }) => {
    await planningPage.selectViewByTypeAndName('All Views', testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);

    await commonFunctions.logMessage('INFO', 'Clicking Refresh Button');
    const refreshBtn: boolean = await planningPage.clickOnDashboardRefreshBtn();
    await commonFunctions.compareTwoValues(refreshBtn, true, 'Refresh Button Clicked successfully');

    await commonFunctions.logMessage('INFO', 'Validating Edit View is disabled');
    const isEditViewVisible: boolean = await planningPage.isViewActionVisible('Edit View');
    await commonFunctions.compareTwoValues(isEditViewVisible, false, 'Edit button disabled successfully');
    expect(refreshBtn && !isEditViewVisible).toBeTruthy();
  });
});
