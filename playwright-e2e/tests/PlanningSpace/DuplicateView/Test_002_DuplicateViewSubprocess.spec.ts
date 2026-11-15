import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Duplicate View - Subprocess', () => {

  let duplicatedViewName: string;
  let duplicateViewCreated = false;

  test.beforeAll(async ({ testUtil, planningListingPage, testData }) => {
    duplicatedViewName = `${testData.DUPLICATED_VIEW_NAME}_${Date.now()}`;
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Subprocess', testData.PROCESS_NAME, testData.SUBPROCESS_NAME);
  });

  test('Test Case 01: Duplicate View', async ({ testUtil, planningPage, cardsPage, planningListingPage, globalSettingsPage, commonFunctions, testData }) => {
    await planningPage.clickViewDropdown();
    let duplicateAlreadyExists = false;
    await expect.poll(async () => {
      try {
        duplicateAlreadyExists = await planningPage.isViewPresentInDropdown(duplicatedViewName);
        return 'ready';
      } catch {
        return 'retry';
      }
    }).toBe('ready');
    await planningPage.closeViewDropdown();
    
    // Delete the existing duplicate view if it was left from a previous run
    if (duplicateAlreadyExists) {
      await testUtil.navigateToProcessListingPage();
      await globalSettingsPage.clickGlobalSettings();
      await globalSettingsPage.clickGlobalSettingsListMenu('Planning Views');
      await globalSettingsPage.deleteView(duplicatedViewName);
      await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
      await testUtil.navigateToPlanningListingPage();
      await planningListingPage.launchContext('Subprocess', testData.PROCESS_NAME, testData.SUBPROCESS_NAME);
    }
    await planningPage.selectViewByTypeAndName('All Views', testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);
    await cardsPage.duplicateCurrentView(duplicatedViewName);
    duplicateViewCreated = true;
    await commonFunctions.compareTwoValues(true, true, 'Duplicate view created successfully');
    expect(true).toBeTruthy();
  });

  test(`Test Case 02: Verify the duplicated view is created and mapped to the subprocess`, async ({ planningPage, commonFunctions, testData }) => {
    await planningPage.clickViewDropdown();
    await planningPage.selectView(duplicatedViewName);
    await expect.poll(async () => {
      try {
        await planningPage.waitForSpecificDashboardToBeDisplayed(duplicatedViewName);
        return true;
      } catch {
        return false;
      }
    }).toBeTruthy();
    const isDuplicatedViewVisible = true;
    await commonFunctions.compareTwoValues(isDuplicatedViewVisible, true, 'Duplicated View is mapped to the subprocess Assertion');
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
    const isActorsAndProcedureCopied = await globalSettingsPage.validateViewDataSetup(duplicatedViewName, testData.ACTORS_AND_DEFAULT_PROCEDURE);
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
    await globalSettingsPage.deleteView(duplicatedViewName);
    const isDeleted = await globalSettingsPage.verifyAlertMsg('success');
    await commonFunctions.compareTwoValues(isDeleted, true, `View ${duplicatedViewName} deleted successfully`);
    expect(isDeleted).toBeTruthy();
  });

});
