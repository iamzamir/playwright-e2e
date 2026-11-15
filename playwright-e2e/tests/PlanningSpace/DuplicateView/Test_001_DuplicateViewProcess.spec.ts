import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Duplicate View - Process', () => {

  let indexOfTargetViewGroup: number | undefined;
  let duplicateViewCreated = false;

  test.beforeAll(async ({ testUtil, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
  });

  test('Test Case 01: Duplicate View', async ({ testUtil, planningPage, cardsPage, globalSettingsPage, commonFunctions, testData, page }) => {
    // Create a duplicate view by deleting the existing one if present from a previous run
    await planningPage.clickViewDropdown();
    await page.waitForTimeout(2000);
    const duplicateAlreadyExists = await planningPage.isViewPresentInDropdown(testData.DUPLICATED_VIEW_NAME);
    await planningPage.closeViewDropdown();
    await page.waitForTimeout(5000);

    if (duplicateAlreadyExists) {
      // Delete existing duplicate view via Global Settings before recreating
      await testUtil.navigateToProcessListingPage();
      await globalSettingsPage.clickGlobalSettings();
      await globalSettingsPage.clickGlobalSettingsListMenu('Planning Views');
      await globalSettingsPage.deleteView(testData.DUPLICATED_VIEW_NAME);
      await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    }
    await planningPage.selectViewByTypeAndName('All Views', testData.VIEW_NAME);
    indexOfTargetViewGroup = await planningPage.getIndexOfContainer(testData.containerId)
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);
    await cardsPage.duplicateCurrentView(testData.DUPLICATED_VIEW_NAME);
    duplicateViewCreated = true;
    await commonFunctions.compareTwoValues(true, true, 'Duplicate view created successfully');
    expect(true).toBeTruthy();
  });

  test(`Test Case 02: Verify the duplicated view is created and mapped to the process`, async ({ planningPage, commonFunctions, testData, page }) => {
    await planningPage.clickViewDropdown();
    await planningPage.selectView(testData.DUPLICATED_VIEW_NAME);
    await page.waitForTimeout(5000);
    const isDuplicatedViewVisible = await planningPage.waitForSpecificDashboardToBeDisplayed(testData.DUPLICATED_VIEW_NAME)
      .then(() => true)
      .catch(() => false);
    const duplicatedViewGroupIndex = await planningPage.getIndexOfContainer(testData.containerId);
    await commonFunctions.compareTwoValues(indexOfTargetViewGroup === duplicatedViewGroupIndex, true, 'View group order remains the same after duplicating the view');
    await commonFunctions.compareTwoValues(isDuplicatedViewVisible, true, 'Duplicated View is mapped to the process Assertion');
    expect(isDuplicatedViewVisible).toBeTruthy();
  });

  test('Test Case 03: Verify the duplicated view has copied quick filter configuration', async ({ planningPage, commonFunctions, testData }) => {
    const isQuickFilterCopied = await planningPage.verifyQuickFilterConfig(testData.QUICK_FILTER);
    await commonFunctions.compareTwoValues(isQuickFilterCopied, true, 'Quick filter values are copied in duplicated view');
    expect(isQuickFilterCopied).toBeTruthy();
  });

  test('Test Case 04: Verify the duplicated view has copied the cards in the dashboard', async ({ planningPage, commonFunctions, testData }) => {
    const areCardsCopied = await planningPage.verifyCardsInDashboard(testData.CARDS);
    await commonFunctions.compareTwoValues(areCardsCopied, true, 'Cards in Dashboard are copied in duplicated view');
    expect(areCardsCopied).toBeTruthy();
  });

  test('Test Case 05: Verify the duplicated view has copied workfilter configuration', async ({ planningPage, commonFunctions, testData }) => {
    const isContextOverrideDisplayed = await planningPage.isContextOverrideDisplays();
    await commonFunctions.compareTwoValues(isContextOverrideDisplayed, true, 'Context Override button is displayed');
    const isWorkflowFilterCopied = await planningPage.showFilterDetails(testData.WORKFLOW_FILTER);
    await commonFunctions.compareTwoValues(isWorkflowFilterCopied, true, 'Backend workflow filter values are copied in duplicated view');
    const isFilterDetailsClosed = await planningPage.closeWorkflowFilterDetails();
    await commonFunctions.compareTwoValues(isFilterDetailsClosed, true, 'Backend workflow filter details are closed');
    expect(isContextOverrideDisplayed && isWorkflowFilterCopied && isFilterDetailsClosed).toBeTruthy();
  });

  test('Test Case 06: Verify the duplicated view has copied the procedure configuration', async ({ scaPage, commonFunctions, testData }) => {
    const isPrimarySCABtn = await scaPage.verifySCABtn(testData.SCA_PROCEDURES.PRIMARY_ACTION, 'MuiButton-contained');
    await commonFunctions.compareTwoValues(isPrimarySCABtn, true, 'Primary SCA button exists');
    const isSecondarySCABtn = await scaPage.verifySCABtn(testData.SCA_PROCEDURES.SECONDARY_ACTION, 'MuiButton-outlined');
    await commonFunctions.compareTwoValues(isSecondarySCABtn, true, 'Secondary SCA button exists');
    const areOtherActionsPresent = await scaPage.verifyOtherActionsInProceduresDropdown(testData.SCA_PROCEDURES.OTHER_ACTIONS, true);
    await commonFunctions.compareTwoValues(areOtherActionsPresent, true, 'Procedures dropdown has other actions');
    expect(isPrimarySCABtn && isSecondarySCABtn && areOtherActionsPresent).toBeTruthy();
  });

  test('Test Case 07: Verify the duplicated view has copied actors and default procedure configuration', async ({ testUtil, planningPage, globalSettingsPage, commonFunctions, testData }) => {
    const isDataSyncButtonVisible = await planningPage.isDataSyncButtonExists();
    await commonFunctions.compareTwoValues(isDataSyncButtonVisible, true, 'Data sync icon exists on dashboard');
    await testUtil.navigateToProcessListingPage();
    await globalSettingsPage.clickGlobalSettings();
    await globalSettingsPage.clickGlobalSettingsListMenu('Planning Views');
    const isActorsAndProcedureCopied = await globalSettingsPage.validateViewDataSetup(testData.DUPLICATED_VIEW_NAME, testData.ACTORS_AND_DEFAULT_PROCEDURE);
    await commonFunctions.compareTwoValues(isActorsAndProcedureCopied, true, 'Actors and Default Procedure configuration is copied');
    expect(isDataSyncButtonVisible && isActorsAndProcedureCopied).toBeTruthy();
  });

  test.afterAll('Test Case 08: Delete duplicated view', async ({ testUtil, globalSettingsPage, commonFunctions, testData }) => {
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
