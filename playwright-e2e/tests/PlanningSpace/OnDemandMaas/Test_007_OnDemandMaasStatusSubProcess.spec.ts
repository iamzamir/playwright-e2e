import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Interactive View - Maas - Sub process', () => {
  test('Test Case 1: Verify Inprogress Data Sync status in Sub process', async ({ planningPage, planningListingPage, scopePage, commonFunctions, testUtil, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.PSLINK as string);
    await planningListingPage.launchContext('Subprocess', testData.PROCESS_NAME, testData.SUBPROCESS_NAME);
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    await planningPage.openComponent('Scope');
    const configuredFilter: boolean = await scopePage.searchFilter(testData.FILTER_TO_APPLY_IN_SCOPE);
    await scopePage.clickOnApplyFiltersBtn();
    await commonFunctions.compareTwoValues(configuredFilter, true, 'Scope filter configured successfully for sub process');
    expect(configuredFilter).toBe(true);
  });

  test('Test Case 2: Verify Started Data Sync status in Sub process', async ({ odmPage, scenarioPage, commonFunctions, testData }) => {
    const result = await odmPage.verifyDataSyncStatusTest('started', 'Data is Synced', true, 2, testData.LoGGEDIN_USER_NAME);
    const bValidation1: boolean = await scenarioPage.verifyColumnExistsInPivotTable(['ITEM'], testData.CARD_NAME);
    const bValidation2: boolean = await odmPage.dataNotAvailableIsExist();
    await commonFunctions.compareTwoValues(bValidation1, true, 'ITEM columns reflected in table');

    const verifyAllScenariosInODM = await odmPage.verifyAllScenariosInODM();
    const expectedScenarios = Array.isArray(testData.SCENARIOS) ? testData.SCENARIOS : [testData.SCENARIOS];
    const bValidation3 = await commonFunctions.compareTwoValues((verifyAllScenariosInODM.toString()).includes(expectedScenarios.toString()), true, 'Scenarios in data sync panel should match expected scenarios');
    const verifyGlobalSave = await odmPage.clickGlobalSaveAndVerify();
    await commonFunctions.compareTwoValues(verifyGlobalSave, true, 'Global Save successful');
    expect(result && (bValidation1 || bValidation2) && bValidation3 && verifyGlobalSave).toBe(true);
  });

  test('Test Case 3: Verify show more details in Data Sync Status in Sub process', async ({ odmPage, commonFunctions, testData }) => {
    const result = await odmPage.verifyDataSyncStatusTest('started', 'Data is Synced', true, 2, testData.LoGGEDIN_USER_NAME);
    await odmPage.openMoreDetailsODM();

    const dataFromMoreDetails = await odmPage.verifyDataFromMoreDetailsODM();
    const expectedScenarios = Array.isArray(testData.SCENARIOS) ? testData.SCENARIOS : [testData.SCENARIOS];
    const bValidation1 = await commonFunctions.compareTwoValues((dataFromMoreDetails.toString()).includes(expectedScenarios.toString()), true, 'More details scenarios should match expected scenarios');

    const bValidation2 = await commonFunctions.compareTwoValues(await odmPage.verifyRunByFromMoreDetailsODM(), true, 'Run By should be there in more details');
    const bValidation3 = await commonFunctions.compareTwoValues(await odmPage.verifyProcedureDetailsFromMoreDetailsODM(), true, 'Procedure Details should be there in more details');
    const bValidation4 = await commonFunctions.compareTwoValues(await odmPage.verifyPlanningInstanceIdFromMoreDetailsODM(), true, 'Planning Instance ID should be there in more details');
    const bValidation5 = await commonFunctions.compareTwoValues(await odmPage.verifyRunIdFromMoreDetailsODM(), true, 'Run ID should be there in more details');
    const bValidation6 = await commonFunctions.compareTwoValues(await odmPage.verifyProcedureTimeFromMoreDetailsODM(), true, 'Procedure Time should be there in more details');
    const bValidation7 = await commonFunctions.compareTwoValues(await odmPage.verifyScenarioIdFromMoreDetailsODM(), true, 'Scenario ID should be there in more details');
    const bValidation8 = await commonFunctions.compareTwoValues(await odmPage.verifyRealmIdDataSyncStatus(testData.REALM_ID), true, 'Verify Realm ID');

    const allValidations = bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8;
    expect(result && allValidations).toBe(true);
  });

  test('Test Case 4: Close Data Sync Status more details popup in Sub process', async ({ odmPage, commonFunctions }) => {
    const moreDetailsPopup = await odmPage.closeMoreDetailsODM();
    const bValidation1 = await commonFunctions.compareTwoValues(!moreDetailsPopup, false, 'More details popup closed');
    expect(bValidation1).toBe(true);
  });

  test('Test Case 5: Apply Hierarchy level filter in sub-process', async ({ planningPage, scenarioPage, scopePage, commonFunctions, testData }) => {
    await planningPage.openComponent('Scenarios');
    const defaultScenario = await scenarioPage.getDefaultScenarioNameFromPlanningSpace();
    await scenarioPage.scenarioSelectandSetDetault([testData.BASE_SCENARIO_NAME], 'Check');

    await planningPage.openComponent('Scenarios');
    const defaultScenarioInPs = await scenarioPage.getDefaultScenarioNameFromPlanningSpace();
    const bValidation1 = await commonFunctions.compareTwoValues(defaultScenario, defaultScenarioInPs, 'Default scenario set successfully');
    await planningPage.clickApply();

    await planningPage.openComponent('Scope');
    const configuredFilter: boolean = await scopePage.searchFilter(testData.HIERARCHY_LEVEL_TO_APPLY_IN_SCOPE);
    await scopePage.clickOnApplyFiltersBtn();

    const bValidation2 = await commonFunctions.compareTwoValues(configuredFilter, true, 'Sub level filters should be applied');
    expect(bValidation1 && bValidation2).toBe(true);
  });

  test('Test Case 6: Verify Started Data Sync status in Hierarchy level filter in sub-process', async ({ odmPage, scenarioPage, commonFunctions, testData }) => {
    const result = await odmPage.verifyDataSyncStatusTest('started', 'Data is Synced', true, 2, testData.LoGGEDIN_USER_NAME);

    const verifyAllScenariosInODM = await odmPage.verifyAllScenariosInODM();
    const expectedScenarios = Array.isArray(testData.SCENARIOS) ? testData.SCENARIOS : [testData.SCENARIOS];
    const bValidation = await commonFunctions.compareTwoValues((verifyAllScenariosInODM.toString()).includes(expectedScenarios.toString()), true, 'Scenarios in data sync panel should match expected scenarios');

    await odmPage.openMoreDetailsODM();
    const verifyScenariosInODM = await odmPage.verifyDataFromMoreDetailsODM();
    const bValidation1 = await commonFunctions.compareTwoValues((verifyScenariosInODM.toString()).includes(expectedScenarios.toString()), true, 'Scenarios in more details should match expected scenarios');
    await odmPage.closeMoreDetailsODM();

    const bValidation2: boolean = await scenarioPage.verifyColumnExistsInPivotTable(['LOCATION'], testData.CARD_NAME);
    const bValidation3: boolean = await odmPage.dataNotAvailableIsExist();
    await commonFunctions.compareTwoValues(bValidation2, true, 'LOCATION columns reflected in table');

    expect(result && (bValidation2 || bValidation3) && bValidation && bValidation1).toBe(true);
  });
});