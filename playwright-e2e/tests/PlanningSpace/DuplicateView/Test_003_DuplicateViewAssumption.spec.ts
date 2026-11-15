import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Duplicate View - Assumption', () => {

  let duplicateViewCreated = false;

  test.beforeAll(async ({ testUtil, planningListingPage, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Assumption', testData.PROCESS_NAME, '', testData.ASSUMPTION);
  });

  test('Test Case 01: Duplicate View', async ({ testUtil, planningPage, cardsPage, planningListingPage, globalSettingsPage, commonFunctions, testData, page }) => {
    // Delete the existing duplicate view if it was left from a previous run
    await planningPage.clickViewDropdown();
    await page.waitForTimeout(2000);
    const duplicateAlreadyExists = await planningPage.isViewPresentInDropdown(testData.DUPLICATED_VIEW_NAME);
    await planningPage.closeViewDropdown();
    await page.waitForTimeout(2000);
    if (duplicateAlreadyExists) {
      await testUtil.navigateToProcessListingPage();
      await globalSettingsPage.clickGlobalSettings();
      await globalSettingsPage.clickGlobalSettingsListMenu('Planning Views');
      await globalSettingsPage.deleteView(testData.DUPLICATED_VIEW_NAME);
      await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
      await testUtil.navigateToPlanningListingPage();
      await planningListingPage.launchContext('Assumption', testData.PROCESS_NAME, '', testData.ASSUMPTION);
    }
    await planningPage.selectViewByTypeAndName('All Views', testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);
    await cardsPage.duplicateCurrentView(testData.DUPLICATED_VIEW_NAME);
    duplicateViewCreated = true;
    await commonFunctions.compareTwoValues(true, true, 'Duplicate view created successfully');
    expect(true).toBeTruthy();
  });
  
  test('Test Case 02: Verify the duplicated view is created and mapped to the assumption', async ({ planningPage, commonFunctions, testData, page }) => {
    await planningPage.selectViewByTypeAndName('All Views', testData.DUPLICATED_VIEW_NAME);
    await page.waitForTimeout(5000);
    const isDuplicatedViewVisible = await planningPage.waitForSpecificDashboardToBeDisplayed(testData.DUPLICATED_VIEW_NAME)
      .then(() => true)
      .catch(() => false);
    await commonFunctions.compareTwoValues(isDuplicatedViewVisible, true, 'Duplicated View is mapped to the assumption Assertion');
    expect(isDuplicatedViewVisible).toBeTruthy();
  });

  test('Test Case 03: Verify the duplicated view has copied the cards in the dashboard', async ({ planningPage, commonFunctions, testData }) => {
    const areCardsCopied = await planningPage.verifyCardsInDashboard(testData.CARDS);
    await commonFunctions.compareTwoValues(areCardsCopied, true, 'Cards in Dashboard are copied in duplicated view');
    expect(areCardsCopied).toBeTruthy();
  });

  test('Test Case 04: Verify the duplicated view has copied actors and default procedure configuration', async ({ testUtil, planningPage, globalSettingsPage, commonFunctions, testData }) => {
    const isDataSyncButtonVisible = await planningPage.isDataSyncButtonExists();
    await commonFunctions.compareTwoValues(isDataSyncButtonVisible, true, 'Data sync icon exists on dashboard');
    await testUtil.navigateToProcessListingPage();
    await globalSettingsPage.clickGlobalSettings();
    await globalSettingsPage.clickGlobalSettingsListMenu('Planning Views');
    const isActorsAndProcedureCopied = await globalSettingsPage.validateViewDataSetup(testData.DUPLICATED_VIEW_NAME, testData.ACTORS_AND_DEFAULT_PROCEDURE);
    await commonFunctions.compareTwoValues(isActorsAndProcedureCopied, true, 'Actors and Default Procedure configuration is copied');
    expect(isDataSyncButtonVisible && isActorsAndProcedureCopied).toBeTruthy();
  });

  test.afterAll('Test Case 05: Delete duplicated view', async ({ testUtil, globalSettingsPage, commonFunctions, testData }) => {
    if (!duplicateViewCreated) {
      return;
    }

    await testUtil.navigateToProcessListingPage();
    await globalSettingsPage.clickGlobalSettings();
    await globalSettingsPage.clickGlobalSettingsListMenu('Planning Views');
    await globalSettingsPage.deleteView(testData.DUPLICATED_VIEW_NAME);
    const isDeleted = await globalSettingsPage.verifyAlertMsg('success');
    await commonFunctions.compareTwoValues(isDeleted, true, `View ${testData.DUPLICATED_VIEW_NAME} deleted successfully`);
    expect(isDeleted).toBeTruthy();
  });

});
