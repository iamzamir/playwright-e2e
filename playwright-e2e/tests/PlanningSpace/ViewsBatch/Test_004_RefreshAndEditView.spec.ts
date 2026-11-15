import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Dashboard Refresh and Edit Icon With Edit Permission', () => {
  test.beforeAll(async ({ testUtil, planningPage, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      testData.PROCESS_NAME
    );
    await planningPage.waitForViewToBeDisplayed();
  });

  test('Test Case 1: Edit & Refresh Button In View Manager exists', async ({ planningPage, commonFunctions, testData }) => {
    await planningPage.clickViewDropdown();
    await planningPage.selectView(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);

    await commonFunctions.logMessage('INFO', 'Clicking Refresh Button');
    const refreshBtn: boolean = await planningPage.clickOnDashboardRefreshBtn();
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);

    await commonFunctions.logMessage('INFO', 'Clicking Edit View Button');
    let editDashboarBtn = true;
    try {
      await planningPage.openEditView();
    } catch (error) {
      await commonFunctions.logMessage('INFO', String(error));
      editDashboarBtn = false;
    }

    await commonFunctions.compareTwoValues(editDashboarBtn, true, 'Edit button clicked successfully');
    expect(refreshBtn && editDashboarBtn).toBeTruthy();
  });
});
