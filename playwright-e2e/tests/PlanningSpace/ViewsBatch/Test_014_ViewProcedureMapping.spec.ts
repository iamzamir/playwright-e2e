import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Data Configuration from Data Setup', () => {
  test.beforeAll(async ({ testUtil, planningPage, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      testData.PROCESS_NAME
    );
    await planningPage.waitForViewToBeDisplayed();
  });

  test('Test Case 1: Configure Data Setup with Actors and Procedure', async ({
    testUtil,
    globalSettingsPage,
    commonFunctions,
    testData,
  }) => {
    await testUtil.navigateToProcessListingPage();
    await globalSettingsPage.clickGlobalSettings();
    await globalSettingsPage.clickGlobalSettingsListMenu('Planning Views');
    await globalSettingsPage.planningViewSearch(testData.VIEW_NAME);
    await globalSettingsPage.AddDataSetupConfig(testData.VIEW_NAME, testData.ACTORS_PROCEDURE1);
    await globalSettingsPage.ValidateSelectedValues(testData.ACTORS_PROCEDURE1);

    await expect.poll(async () => globalSettingsPage.dataSetupConfiguredValidate(), { timeout: 60000 }).toBeTruthy();
    const isConfiguredAfterAdd = await globalSettingsPage.dataSetupConfiguredValidate();
    await commonFunctions.compareTwoValues(isConfiguredAfterAdd, true, 'Data Setup should be configured after Submit');
    expect(isConfiguredAfterAdd).toBeTruthy();
  });

  test('Test Case 2: Edit the configured Data with different actors & Procedures', async ({
    globalSettingsPage,
    commonFunctions,
    testData,
  }) => {
    await globalSettingsPage.AddDataSetupConfig(testData.VIEW_NAME, testData.ACTORS_PROCEDURE2);
    await globalSettingsPage.ValidateSelectedValues(testData.ACTORS_PROCEDURE2);

    await expect.poll(async () => globalSettingsPage.dataSetupConfiguredValidate(), { timeout: 60000 }).toBeTruthy();
    const isConfiguredAfterEdit = await globalSettingsPage.dataSetupConfiguredValidate();
    await commonFunctions.compareTwoValues(isConfiguredAfterEdit, true, 'Data Setup should be configured after Edit');
    expect(isConfiguredAfterEdit).toBeTruthy();
  });

  test('Test Case 3: Remove the configured Data', async ({ globalSettingsPage, commonFunctions, testData }) => {
    await globalSettingsPage.removeDataSetupConfiguration(testData.VIEW_NAME);
    await expect.poll(async () => globalSettingsPage.isInteractivePlanningConfigured(), { timeout: 60000 }).toBeFalsy();

    const isConfiguredAfterRemoval = await globalSettingsPage.isInteractivePlanningConfigured();
    const isRemovalSuccessful = await commonFunctions.compareTwoValues(
      isConfiguredAfterRemoval,
      false,
      'Data configuration Removed'
    );
    expect(isRemovalSuccessful).toBeTruthy();
  });
});
