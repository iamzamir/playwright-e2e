import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Quick Filter Validations', () => {
  test.beforeAll(async ({ testUtil, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string );
  });

  test('Test Case 1: Enable Quick Filter checkbox in Workflow filters', async ({testUtil, globalSettingsPage, commonFunctions, testData }) => {
    await testUtil.navigateToProcessListingPage();
    await globalSettingsPage.selectProcessDropdown(testData.PROCESS_NAME);
    const enableQuickFilterVal = await globalSettingsPage.enableQuickFilterCheckbox(testData.PROCESS_NAME,[testData.SOURCE_VIEW[0].SourceView1, testData.TARGET_VIEW[0].TargetView1]);
    await commonFunctions.compareTwoValues(enableQuickFilterVal, true, 'Quick Filter checkbox enabled successfully');
    expect(enableQuickFilterVal).toBeTruthy();
  });

  test('Test Case 2: Configure Quick Filter on source view, drill through to target view and validate customer cell and scope values', async ({testUtil, planningPage, scopePage, drillThroughPage, cardsPage, powerBarPage, commonFunctions, testData}) => {
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);
    await planningPage.selectViewInPlanning(testData.SOURCE_VIEW[0].SourceView1);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.SOURCE_VIEW[0].SourceView1);
    await planningPage.openEditView();
    await scopePage.clickOnQuickFilterConfigIcon();
    const QFfilterConfig = await scopePage.configureQuickFilter(testData.QUICK_FILTER_ATTRIBUTES);
    await commonFunctions.compareTwoValues(QFfilterConfig, true, 'Quick Filter configured successfully');
    await cardsPage.saveCardInView();
    const QFvalueSelection = await scopePage.selectAndApplyQF(testData.QUICK_FILTER_VALUES);
    await drillThroughPage.performDrillThroughOnCardField(testData.DRILL_THROUGH_CELLS[0].SourceView1, testData.TARGET_VIEW[0].TargetView1 );
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.TARGET_VIEW[0].TargetView1);
    const customerValidation = await scopePage.verifyExistingCustomerCellInTable(testData.CUSTOMER_VALUE);
    await commonFunctions.compareTwoValues(customerValidation, true, `Customer value ${testData.CUSTOMER_VALUE} exists in ${testData.TARGET_VIEW[0].TargetView1} after drill through`);
    await powerBarPage.verifyPowerBarScopeChipClick();
    const verifyScopeAfterDrillThrough = await scopePage.verifyScopeFilterValueAfterDrillThrough(testData.SCOPE_FILTER_VALUES_AFTER_DRILLTHROUGH);
    await commonFunctions.compareTwoValues(verifyScopeAfterDrillThrough, true,'Quick Filter values are retained in Scope after drill through');
    expect(QFfilterConfig && QFvalueSelection && customerValidation && verifyScopeAfterDrillThrough).toBeTruthy();
  });

  test('Test Case 3: Configure Quick Filter on target view, drill through from source and validate QF values are retained', async ({planningPage, scopePage, drillThroughPage, cardsPage, commonFunctions, testData}) => {
    await planningPage.closeDrawer();
    await planningPage.selectViewInPlanning(testData.TARGET_VIEW[1].TargetView2);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.TARGET_VIEW[1].TargetView2);
    await planningPage.openEditView();
    await scopePage.clickOnQuickFilterConfigIcon();
    const QFfilterConfig = await scopePage.configureQuickFilter(testData.QUICK_FILTER_TARGET_VIEW_ATTRIBUTES);
    await commonFunctions.compareTwoValues(QFfilterConfig, true, 'Quick Filter configured successfully on target view');
    await cardsPage.saveCardInView();
    await planningPage.selectViewInPlanning(testData.SOURCE_VIEW[1].SourceView2);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.SOURCE_VIEW[1].SourceView2);
    await drillThroughPage.performDrillThroughOnCardField(testData.DRILL_THROUGH_CELLS[1].SourceView2,testData.TARGET_VIEW[1].TargetView2);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.TARGET_VIEW[1].TargetView2);
    const bQFRetained = await scopePage.verifyAndApplyQFChipValuesAfterDrillThrough(testData.QUICK_FILTER_VALUE_VALIDATION);
    await commonFunctions.compareTwoValues(bQFRetained, true,`Quick Filter values are retained in ${testData.TARGET_VIEW[1].TargetView2} after drill through`);
    expect(QFfilterConfig && bQFRetained).toBeTruthy();
  });

  test('Test Case 4: Hydrate the cluster by configuring Scope filter and edit by removing Region-20 value', async ({testUtil, planningPage, scopePage, odmPage, scenarioPage, powerBarPage, commonFunctions, testData}) => {
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);   
    await planningPage.selectViewInPlanning(testData.HYDRATE_VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.HYDRATE_VIEW_NAME);
    await powerBarPage.verifyPowerBarScopeChipClick();
    const updateScopeFilter = await scopePage.searchFilter(testData.FILTER_TO_APPLY_IN_SCOPE);
    await commonFunctions.compareTwoValues(updateScopeFilter, true, `Is ${testData.FILTER_TO_APPLY_IN_SCOPE} filter selected under scope tab`);
    await scopePage.clickOnApplyFiltersBtn();
    const result = await odmPage.verifyDataSyncStatusTest('started', 'Data is Synced', true, 2, testData.LoGGEDIN_USER_NAME);
    await commonFunctions.compareTwoValues(result, true, 'ODM Maas data synced successfully');
    await powerBarPage.verifyPowerBarScopeChipClick();
    await scopePage.clickFilterValuesIconByDimensionAndHierarchy(testData.SCOPE_EDIT_DIMENSION, testData.SCOPE_EDIT_HIERARCHY);
    await scopePage.checkOrUncheckFilters([testData.SCOPE_UNCHECK_VALUE], 'uncheck');
    await scopePage.clickSaveInFilterValuesBox();
    await scopePage.clickOnApplyFiltersBtn();
    const scopeDataValidation = await scenarioPage.verifyColumnExistsInPivotTable(['LOCATION'], testData.CARD_NAME);
    await commonFunctions.compareTwoValues(scopeDataValidation, true, `LOCATION reflected in table after removing ${testData.SCOPE_UNCHECK_VALUE}`);
    expect(updateScopeFilter && result && scopeDataValidation).toBeTruthy();
  });

  test('Test Case 5: Set workflow filter on view, configure QF, and verify ODM Maas sync', async ({testUtil, globalSettingsPage, planningPage, scopePage, odmPage, cardsPage, powerBarPage, commonFunctions, testData}) => {
    await testUtil.navigateToProcessListingPage();
    await globalSettingsPage.selectProcessDropdown(testData.PROCESS_NAME);
    const bValidation = await globalSettingsPage.configureWorkflowFilter(testData.PROCESS_NAME, testData.WORKFLOW_FILTER.VIEW_NAME, testData.WORKFLOW_FILTER_SCOPE_TO_DEFINE,'Define filter', true);
    await commonFunctions.compareTwoValues(bValidation, true,`Workflow filter configured for ${testData.WORKFLOW_FILTER.VIEW_NAME} view`);
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME,process.env.FUNCTIONAL_TEST_USERNAME as string,process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.selectViewInPlanning(testData.WORKFLOW_FILTER.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.WORKFLOW_FILTER.VIEW_NAME);
    await planningPage.openEditView();
    await scopePage.clickOnQuickFilterConfigIcon();
    const bQFConfig = await scopePage.configureQuickFilter(testData.QUICK_FILTER_ATTRIBUTES);
    await commonFunctions.compareTwoValues(bQFConfig, true, 'Quick Filter configured successfully on workflow filter view');
    await cardsPage.saveCardInView();
    await powerBarPage.verifyPowerBarScopeChipClick();
    const bScopeFilter = await scopePage.searchFilter(testData.FILTER_TO_APPLY_IN_SCOPE);
    await commonFunctions.compareTwoValues( bScopeFilter, true, `Scope filter '${testData.FILTER_TO_APPLY_IN_SCOPE}' selected`);
    await scopePage.clickOnApplyFiltersBtn();
    const bODMSync = await odmPage.verifyDataSyncStatusTest('started', 'Data is Synced', true, 2, testData.LoGGEDIN_USER_NAME);
    await commonFunctions.compareTwoValues(bODMSync, true, 'ODM Maas data synced successfully');
    expect(bValidation && bQFConfig && bScopeFilter && bODMSync).toBeTruthy();
  });
});
