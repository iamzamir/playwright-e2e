import { test, expect } from '../../../configs/fixtures';

test.describe.serial('View Settings to change view group - Process', () => {
  test.beforeAll(async ({ testUtil, planningPage, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      testData.PROCESS_NAME
    );
    await planningPage.waitForViewToBeDisplayed();
  });

  test('Test case 01: Change view group of the view', async ({ planningPage, commonFunctions, testData }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test case 01: Change view group of the view');
    await planningPage.clickViewDropdown();
    await planningPage.changeViewGroupOfView(testData.VIEW_NAME, testData.TARGET_VIEW_GROUP);
    await planningPage.clickViewDropdown();

    const isViewGroupUpdated = await planningPage.checkViewExistsWithViewGroup(testData.TARGET_VIEW_GROUP, testData.VIEW_NAME);
    const bValidation1 = await commonFunctions.compareTwoValues(isViewGroupUpdated, true, 'Verify view group is updated for the view');

    const selectedView = await planningPage.getSelectedViewName();
    const bValidation2 = await commonFunctions.compareTwoValues(selectedView, testData.VIEW_NAME, 'Verify the selected view in dashboard');

    expect(bValidation1 && bValidation2).toBeTruthy();
    await commonFunctions.logMessage('INFO', 'Completed Test case 01: Change view group of the view');
  });

  test('Test case 02: Verify the view group is updated in PO', async ({ testUtil, globalSettingsPage, commonFunctions, testData }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test case 02: Verify the view group is updated in PO');
    await testUtil.navigateToProcessListingPage();
    await globalSettingsPage.clickGlobalSettings();
    await globalSettingsPage.clickGlobalSettingsListMenu('Planning Views');

    const viewExists = await globalSettingsPage.verifyViewGroupInPO(testData.TARGET_VIEW_GROUP, testData.VIEW_NAME);
    const bValidation = await commonFunctions.compareTwoValues(
      viewExists,
      true,
      `Verify view: ${testData.VIEW_NAME} exists under view group: ${testData.TARGET_VIEW_GROUP} in PO`
    );

    expect(bValidation).toBeTruthy();
    await commonFunctions.logMessage('INFO', 'Completed Test case 02: Verify the view group is updated in PO');
  });

  test.afterAll('Reset: Change the view to source view group', async ({ testUtil, planningPage, commonFunctions, testData }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test case 03: Change the view to source view group');
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.clickViewDropdown();
    await planningPage.changeViewGroupOfView(testData.VIEW_NAME, testData.INITIAL_VIEW_GROUP);
    const isViewGroupUpdated = await planningPage.checkViewExistsWithViewGroup(testData.INITIAL_VIEW_GROUP, testData.VIEW_NAME);
    const bValidation1 = await commonFunctions.compareTwoValues(isViewGroupUpdated, true, 'Verify view group is updated for the view');
    expect(bValidation1).toBeTruthy();
    await commonFunctions.logMessage('INFO', 'Completed Test case 03: Change the view to source view group');
  });
});