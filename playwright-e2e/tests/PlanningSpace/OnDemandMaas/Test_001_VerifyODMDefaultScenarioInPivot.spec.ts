import { test, expect } from '../../../configs/fixtures';
import { uniqueName } from '../../../util/unique-name.util';

const scenarioName = uniqueName('ODM multi scenario');

test.describe.serial('ODM - Create default scenario and verify in pivot', () => {
  test('Test case 1: Create a default scenario and verify scenario in the pivot card', async ({ planningPage, scenarioPage, odmPage, commonFunctions, testUtil, testData, createdEntities }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    const accessTokenPromise = scenarioPage.waitForAccessTokenFromRequestHeader(process.env.SEARCH_SIMULATION || 'simulations/search');
    await testUtil.setBaseAsDefaultScenario();
    const authorization = await accessTokenPromise;
    createdEntities.register('scenario', scenarioName, { context: { processName: testData.PROCESS_NAME }, authorization });
    await testUtil.createChildScenarioFromProcedure(testData.PROCEDURE_NAME, scenarioName, testData.SCENARIO_DESC, "Private", "Check", true, true, false);
    await scenarioPage.closeManageScenarios();
    await planningPage.openComponent('Scenarios');
    const bValidation1: boolean = await scenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(scenarioName);
    await commonFunctions.compareTwoValues(bValidation1, true, `${scenarioName} exist in scenarios pop up`);
    await planningPage.closeDrawer();
    await commonFunctions.logMessage('INFO', 'Clicking scenario live button in pivot');
    await scenarioPage.clickOnScenarioLiveIcon(testData.CARD_NAME);
    const bValidation: boolean = await scenarioPage.verifyScenarioInPivotPopup(scenarioName, true);
    await commonFunctions.compareTwoValues(bValidation, true, `Provided ${scenarioName} scenario exist in pivot popup with checked`);

    const isInteractiveDataStatusVisible = await odmPage.clickInteractiveDataStatusIcon();
    await commonFunctions.compareTwoValues(isInteractiveDataStatusVisible, true, 'Interactive Data Status icon should be clickable');

    const isDataSyncStatusMessageVisible = await odmPage.verifyDataSyncStatusMessage(testData.DATA_SYNC_STATUS_MESSAGE, testData.DATA_SYNC_STATUS);
    await commonFunctions.compareTwoValues(isDataSyncStatusMessageVisible, true, 'ODM data sync status message should be displayed');

    const dataFromScenarios = await odmPage.getDataFromScenariosInODM();
    const isDefaultScenarioOnlyInDataFrom = await commonFunctions.compareTwoValues(JSON.stringify(dataFromScenarios), JSON.stringify([scenarioName]), 'Default scenario should appear in ODM data from section');

    const hoveredScenarios = await odmPage.getHoveredScenariosInODM();
    const isDefaultScenarioPresentInHoveredList = await commonFunctions.compareTwoValues(hoveredScenarios.includes(scenarioName), true, 'Default scenario should appear in ODM hovered scenarios');

    expect(bValidation && bValidation1 && isInteractiveDataStatusVisible && isDataSyncStatusMessageVisible && isDefaultScenarioOnlyInDataFrom && isDefaultScenarioPresentInHoveredList).toBe(true);
  });

  test('Test case 2: Clean up - Delete created scenario', async ({ planningPage, scenarioPage }) => {
    await planningPage.goToManageScenarios();
    const bValidation1: boolean = await scenarioPage.deleteChildScenario(scenarioName);
    expect(bValidation1).toBe(true);
  });

  test.afterAll('Cleanup: Delete created scenario using API', async ({ createdEntities }) => {
    const { failed } = await createdEntities.cleanupFile();
    expect(failed.map((entity) => entity.name), 'Scenario API cleanup must succeed').toEqual([]);
  });
});
