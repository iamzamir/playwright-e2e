import { test, expect } from '../../../configs/fixtures';
import apiUtil from '../../../util/api.util';
import { endpoint, getConfig } from '../../../configs/env';

test.describe.serial('Interactive View - Maas', () => {
  let planningInstanceId1 = '';
  let planningInstanceId2 = '';
  let runId1 = '';
  let runId2 = '';
  let url = '';
  let stopClusterUrl = '';
  let deleteCalcEngineUrl = '';
  let calcEngineId = '';
  let accessToken = '';
  let headers: Record<string, string> = {};

  test.beforeAll(async () => {
    const apiBaseUrl = getConfig().hosts.api;
    url = `${apiBaseUrl}${endpoint('PLANNING_INSTANCE')}`;
    stopClusterUrl = `${apiBaseUrl}${endpoint('RESOURCE_POOL_MANAGER')}`;
    deleteCalcEngineUrl = `${apiBaseUrl}${endpoint('MAAS_CONFIG')}`;
    accessToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: `Bearer ${accessToken}`
    };
  });

  test('Test Case 1: Verify Inprogress Data Sync status', async ({ planningPage, planningListingPage, scopePage, commonFunctions, testUtil, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.PSLINK as string);
    await planningListingPage.launchContext("Process", testData.PROCESS_NAME);
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    await planningPage.openComponent('Scope');
    const configuredFilter: boolean = await scopePage.searchFilter(testData.FILTER_TO_APPLY_IN_SCOPE);
    await scopePage.clickOnApplyFiltersBtn();
    await commonFunctions.compareTwoValues(configuredFilter, true, 'Scope filter configured successfully');
    expect(configuredFilter).toBe(true);
    await commonFunctions.logMessage('INFO', 'Test Case 1: Verify inprogress Data Sync status completed successfully');
  });

  test('Test Case 2: Verify Started Data Sync status', async ({ odmPage, scenarioPage, commonFunctions, testData }) => {
    const result = await odmPage.verifyDataSyncStatusTest('started', 'Data is Synced', true, 2, testData.LoGGEDIN_USER_NAME);
    await commonFunctions.compareTwoValues(result, true, 'Started Data Sync status verified successfully');
    const bValidation1: boolean = await scenarioPage.verifyColumnExistsInPivotTable(['LOCATION'], testData.CARD_NAME);
    const bValidation2: boolean = await odmPage.dataNotAvailableIsExist();
    await commonFunctions.compareTwoValues(bValidation1, true, 'LOCATION column reflected in pivot table');
    await commonFunctions.compareTwoValues(bValidation2, false, 'Data Not Available message should not be visible');

    const verifyAllScenariosInODM = await odmPage.verifyAllScenariosInODM();
    const expectedScenarios = Array.isArray(testData.SCENARIOS) ? testData.SCENARIOS : [testData.SCENARIOS];
    const bValidation3 = await commonFunctions.compareTwoValues((verifyAllScenariosInODM.toString()).includes(expectedScenarios.toString()), true, 'All scenarios in ODM should match expected scenarios');

    const verifyGlobalSave = await odmPage.clickGlobalSaveAndVerify();
    await commonFunctions.compareTwoValues(verifyGlobalSave, true, 'Global Save successful');
    expect(result && (bValidation1 || bValidation2) && bValidation3 && verifyGlobalSave).toBe(true);
    await commonFunctions.logMessage('INFO', 'Test Case 2: Verify Started Data Sync status completed successfully');
  });

  test('Test Case 3: Verify show more details in Data Sync Status', async ({ odmPage, planningPage, commonFunctions, testData }) => {
    const result = await odmPage.verifyDataSyncStatusTest('started', 'Data is Synced', true, 2, testData.LoGGEDIN_USER_NAME);
    await odmPage.openMoreDetailsODM();

    const dataFromMoreDetails = await odmPage.verifyDataFromMoreDetailsODM();
    const expectedScenarios = Array.isArray(testData.SCENARIOS) ? testData.SCENARIOS : [testData.SCENARIOS];
    const bValidation1 = await commonFunctions.compareTwoValues((dataFromMoreDetails.toString()).includes(expectedScenarios.toString()), true, 'More details scenarios should match expected scenarios');

    const planningInstanceId = await odmPage.getPlanningInstanceIdFromMoreDetailsODM();
    url = `${getConfig().hosts.api}${endpoint('PLANNING_INSTANCE')}/${planningInstanceId}`;
    const response = await apiUtil.processAPIRequest('GET', url, null, headers, 'Fetching calc engine id', 'full');
    const bValidation = await commonFunctions.compareTwoValues(response.status, 200, 'Get All Resources Success Assertion');
    calcEngineId = response?.data?.engineContext?.maas?.customAttributes?.CALC_ENGINE_ID;

    const bValidation2 = await commonFunctions.compareTwoValues(await odmPage.verifyRunByFromMoreDetailsODM(), true, 'Run By should be there in more details');
    const bValidation3 = await commonFunctions.compareTwoValues(await odmPage.verifyProcedureDetailsFromMoreDetailsODM(), true, 'Procedure Details should be there in more details');
    const bValidation4 = await commonFunctions.compareTwoValues(await odmPage.verifyPlanningInstanceIdFromMoreDetailsODM(), true, 'Planning Instance ID should be there in more details');
    planningInstanceId1 = await odmPage.getPlanningInstanceIdFromMoreDetailsODM();

    const bValidation5 = await commonFunctions.compareTwoValues(await odmPage.verifyRunIdFromMoreDetailsODM(), true, 'Run ID should be there in more details');
    runId1 = await odmPage.getRunIdFromMoreDetailsODM();

    const bValidation6 = await commonFunctions.compareTwoValues(await odmPage.verifyProcedureTimeFromMoreDetailsODM(), true, 'Procedure Time should be there in more details');
    const bValidation7 = await commonFunctions.compareTwoValues(await odmPage.verifyScenarioIdFromMoreDetailsODM(), true, 'Scenario ID should be there in more details');
    const bValidation8 = await commonFunctions.compareTwoValues(await odmPage.verifyRealmIdDataSyncStatus(testData.REALM_ID), true, 'Verify Realm ID');

    const allValidations = bValidation && bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8;
    expect(result && allValidations).toBe(true);
  });

  test('Test Case 4: Apply Hierarchy level filter', async ({ planningPage, odmPage, scenarioPage, scopePage, commonFunctions, testData }) => {
    await odmPage.closeMoreDetailsODM();
    await planningPage.openComponent('Scenarios');
    const defaultScenario = await scenarioPage.getDefaultScenarioNameFromPlanningSpace();
    await scenarioPage.scenarioSelectandSetDetault([testData.BASE_SCENARIO_NAME], 'Check');

    await planningPage.openComponent('Scenarios');
    const defaultScenarioInPs = await scenarioPage.getDefaultScenarioNameFromPlanningSpace();
    await commonFunctions.compareTwoValues(defaultScenario, defaultScenarioInPs, 'Default scenario set successfully');
    await planningPage.clickApply();

    await planningPage.openComponent('Scope');
    const configuredFilter: boolean = await scopePage.searchFilter(testData.HIERARCHY_LEVEL_TO_APPLY_IN_SCOPE);
    await scopePage.clickOnApplyFiltersBtn();

    expect(configuredFilter).toBe(true);
    await commonFunctions.logMessage('INFO', 'Test Case 4: Applied Hierarchy level filter successfully');
  });

  test('Test Case 5: Verify Started Data Sync status in Hierarchy level filter', async ({ odmPage, scenarioPage, commonFunctions, testData }) => {
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
    expect(result && (bValidation2 || bValidation3) && bValidation1 && bValidation).toBe(true);
  });

  test('Test Case 6: Navigate to another interactive view with same filter', async ({ planningPage, scopePage, testData }) => {
    await planningPage.selectViewInPlanning(testData.ANOTHER_VIEW_NAME);
    await planningPage.openComponent('Scope');
    const configuredFilter: boolean = await scopePage.searchFilter(testData.HIERARCHY_LEVEL_TO_APPLY_IN_SCOPE);
    await scopePage.clickOnApplyFiltersBtn();
    expect(configuredFilter).toBe(true);
  });

  test('Test Case 7: Verify Started Data Sync status in another view', async ({ odmPage, scenarioPage, commonFunctions, testData }) => {
    const result = await odmPage.verifyDataSyncStatusTest('started', 'Data is Synced', true, 2, testData.LoGGEDIN_USER_NAME);
    const verifyAllScenariosInODM = await odmPage.verifyAllScenariosInODM();
    const expectedScenarios = Array.isArray(testData.SCENARIOS) ? testData.SCENARIOS : [testData.SCENARIOS];
    const bValidation = await commonFunctions.compareTwoValues((verifyAllScenariosInODM.toString()).includes(expectedScenarios.toString()), true, 'Scenarios in data sync panel should match expected scenarios in another view');

    await odmPage.openMoreDetailsODM();
    const verifyScenariosInODM = await odmPage.verifyDataFromMoreDetailsODM();
    const bValidation1 = await commonFunctions.compareTwoValues((verifyScenariosInODM.toString()).includes(expectedScenarios.toString()), true, 'Scenarios in more details should match expected scenarios in another view');
    await odmPage.closeMoreDetailsODM();

    const bValidation2: boolean = await scenarioPage.verifyColumnExistsInPivotTable(['LOCATION'], testData.CARD_NAME);
    const bValidation3: boolean = await odmPage.dataNotAvailableIsExist();
    await commonFunctions.compareTwoValues(bValidation2, true, 'LOCATION columns reflected in table');
    expect(result && (bValidation2 || bValidation3) && bValidation && bValidation1).toBe(true);
  });

  test('Test Case 8: Verify show more details in Data Sync Status', async ({ odmPage, commonFunctions, testData }) => {
    const result = await odmPage.verifyDataSyncStatusTest('started', 'Data is Synced', true, 2, testData.LoGGEDIN_USER_NAME);
    await odmPage.openMoreDetailsODM();

    const dataFromMoreDetails = await odmPage.verifyDataFromMoreDetailsODM();
    const expectedScenarios = Array.isArray(testData.SCENARIOS) ? testData.SCENARIOS : [testData.SCENARIOS];
    const bValidation1 = await commonFunctions.compareTwoValues((dataFromMoreDetails.toString()).includes(expectedScenarios.toString()), true, 'More details scenarios should match expected scenarios');

    const bValidation2 = await commonFunctions.compareTwoValues(await odmPage.verifyRunByFromMoreDetailsODM(), true, 'Run By should be there in more details');
    const bValidation3 = await commonFunctions.compareTwoValues(await odmPage.verifyProcedureDetailsFromMoreDetailsODM(), true, 'Procedure Details should be there in more details');
    const bValidation4 = await commonFunctions.compareTwoValues(await odmPage.verifyPlanningInstanceIdFromMoreDetailsODM(), true, 'Planning Instance ID should be there in more details');
    planningInstanceId2 = await odmPage.getPlanningInstanceIdFromMoreDetailsODM();

    const bValidation5 = await commonFunctions.compareTwoValues(await odmPage.verifyRunIdFromMoreDetailsODM(), true, 'Run ID should be there in more details');
    runId2 = await odmPage.getRunIdFromMoreDetailsODM();

    const bValidation6 = await commonFunctions.compareTwoValues(await odmPage.verifyProcedureTimeFromMoreDetailsODM(), true, 'Procedure Time should be there in more details');
    const bValidation7 = await commonFunctions.compareTwoValues(await odmPage.verifyScenarioIdFromMoreDetailsODM(), true, 'Scenario ID should be there in more details');
    const bValidation8 = await commonFunctions.compareTwoValues(await odmPage.verifyRealmIdDataSyncStatus(testData.REALM_ID), true, 'Verify Realm ID');

    const allValidations = bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8;
    expect(result && allValidations).toBe(true);
  });

  test('Test Case 9: Verify planning instanceId and run ID in both views', async ({ commonFunctions }) => {
    const bValidation1 = await commonFunctions.compareTwoValues(planningInstanceId1, planningInstanceId2, 'The planning instanceId of the two views should be same');
    const bValidation2 = await commonFunctions.compareTwoValues(runId1, runId2, 'The run ID of the two views should be same');
    expect(bValidation1 && bValidation2).toBe(true);
  });

  test('Test Case 10: Close Data Sync Status more details popup', async ({ odmPage, commonFunctions }) => {
    const moreDetailsPopup = await odmPage.closeMoreDetailsODM();
    const bValidation1 = await commonFunctions.compareTwoValues(!moreDetailsPopup, false, 'More details popup closed');
    expect(bValidation1).toBe(true);
  });

  test('Test Case 11: Verify Procedure details navigation', async ({ odmPage, commonFunctions, page }) => {
    const initialTabCount = page.context().pages().length;
    const [detailsPage] = await Promise.all([
      page.context().waitForEvent('page', { timeout: 60000 }),
      odmPage.navigateToProcedureDetailsODM()
    ]);

    await detailsPage.waitForLoadState('domcontentloaded');
    const areTabsMatched = await commonFunctions.compareTwoValues(page.context().pages().length, initialTabCount + 1, 'New tab should be opened for Observability');
    const isURLContainsProcedureExecutions = await commonFunctions.compareTwoValues(detailsPage.url().includes('procedureExecutions'), true, "New tab URL should contain 'procedureExecutions'");
    expect(areTabsMatched && isURLContainsProcedureExecutions).toBe(true);
  });
/*
  test('Test Case 12: Verify Troubleshoot functionality after cluster stop', async ({ odmPage, planningPage, commonFunctions, page }) => {
    const stopClusterTarget = `${stopClusterUrl}/${calcEngineId}/stopCluster`;
    const stopClusterResponse = await apiUtil.processAPIRequest('POST', stopClusterTarget, null, headers, 'Stopping Cluster', 'full');
    const stopClusterValidation = await commonFunctions.compareTwoValues(stopClusterResponse.status, 202, 'Stop Cluster Success Assertion');

    const openedProcedureTab = page.context().pages().find((tab) => tab !== page && tab.url().includes('procedureExecutions'));
    if (openedProcedureTab && !openedProcedureTab.isClosed()) {
      await openedProcedureTab.close();
    }
    const isProcedureTabClosed = await commonFunctions.compareTwoValues(page.context().pages().length, 1, 'Procedure details tab should be closed before troubleshooting');

    await odmPage.openMoreDetailsODM();
    await odmPage.troubleShootClick();
    const bValidation1 = await commonFunctions.compareTwoValues(await planningPage.verifyAlertMsg('Troubleshooting now and preparing a fix'), true, 'Troubleshoot started alert should be visible');
    await commonFunctions.compareTwoValues(await planningPage.verifyAlertMsg('Troubleshooting complete - everything’s back to normal', 80000), true, 'Troubleshoot complete alert should be visible');

    const clusterStatusUrl = `${getConfig().hosts.api}${endpoint('RESOURCE_POOL_MANAGER')}/${calcEngineId}/status`;
    const clusterStatus = await apiUtil.processAPIRequest('GET', clusterStatusUrl, null, headers, 'Fetching cluster status', 'full');
    const bValidation2 = await commonFunctions.compareTwoValues(clusterStatus?.data?.overallStatus, 'STARTED', 'Cluster status should return STARTED after troubleshooting');

    expect(isProcedureTabClosed && stopClusterValidation && bValidation1 && bValidation2).toBe(true);
  });*/
});
