import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Base scenario should be shown as default if the user doesnt have any default scenario', () => {
  const scenarioName = uniqueName('Public_test');
  let baseScenario = '';

  test.beforeAll(async ({ testUtil, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
  });

  test('Test Case 1: Create child scenario from current base scenario', async ({ testUtil, scenarioPage, commonFunctions, createdEntities, testData }) => {
    // A default left by an earlier attempt would make the new scenario its child instead of the base's.
    const accessTokenPromise = scenarioPage.waitForAccessTokenFromRequestHeader(process.env.SEARCH_SIMULATION || 'simulations/search');
    baseScenario = await testUtil.setBaseAsDefaultScenario();
    const authorization = await accessTokenPromise;
    createdEntities.register('scenario', scenarioName, { context: { processName: testData.PROCESS_NAME }, authorization });
    const isScenarioCreated = await testUtil.createChildScenarioFromProcedure('CreateScenarioPopup', scenarioName, 'Public Scenario', 'Public', 'Uncheck', false, false);
    const validation = await commonFunctions.compareTwoValues(isScenarioCreated, true, `Child Scenario ${scenarioName} Created`);
    expect(validation).toBe(true);
  });

  test('Test Case 2: Set the new child scenario as default from Manage Scenarios', async ({ scenarioPage, commonFunctions, planningPage }) => {
    await planningPage.goToManageScenarios();
    await scenarioPage.clickResetButton();
    const dataIndex = await scenarioPage.getDataIndexByColumnName('Information');
    await scenarioPage.editScenarioItemIsDefault(scenarioName);
    const isDefaultIconExist = await scenarioPage.verifyDefaultInScenarioTable(scenarioName, dataIndex);
    await commonFunctions.compareTwoValues(isDefaultIconExist, true, `Is default icon exist for ${scenarioName} scenario`);
    expect(isDefaultIconExist).toBe(true);
  });

  test('Test Case 3: Verify and toggle defaults in Scenario component, then confirm in Manage Scenarios', async ({ planningPage, scenarioPage, commonFunctions }) => {
    await scenarioPage.closeManageScenarios();
    await planningPage.openComponent('Scenarios');

    const isChildDefaultInScenarioComponent = await scenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(scenarioName);
    await commonFunctions.compareTwoValues(isChildDefaultInScenarioComponent, true, `Child scenario ${scenarioName} is default in Scenario component`);
    expect(isChildDefaultInScenarioComponent).toBe(true);

    const isBaseSetAsDefault = await scenarioPage.setDefaultScenarioInScenarioComponent(baseScenario);
    await commonFunctions.compareTwoValues(isBaseSetAsDefault, true, `Base scenario ${baseScenario} set as default from Scenario component`);
    expect(isBaseSetAsDefault).toBe(true);
    await planningPage.clickApply();
    await planningPage.openComponent('Scenarios');
    const isBaseDefaultInScenarioComponent = await scenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(baseScenario);
    await commonFunctions.compareTwoValues(isBaseDefaultInScenarioComponent, true, `Base scenario ${baseScenario} is default in Scenario component after Apply`);
    expect(isBaseDefaultInScenarioComponent).toBe(true);

    const isChildSetAsDefaultAgain = await scenarioPage.setDefaultScenarioInScenarioComponent(scenarioName);
    await commonFunctions.compareTwoValues(isChildSetAsDefaultAgain, true, `Child scenario ${scenarioName} set as default again from Scenario component`);
    expect(isChildSetAsDefaultAgain).toBe(true);
    await planningPage.clickApply();
    await planningPage.openComponent('Scenarios');
    const isChildDefaultAgainInScenarioComponent = await scenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(scenarioName);
    await commonFunctions.compareTwoValues(isChildDefaultAgainInScenarioComponent, true, `Child scenario ${scenarioName} is default again in Scenario component after Apply`);
    expect(isChildDefaultAgainInScenarioComponent).toBe(true);

    await planningPage.clickManageScenarios();
    await scenarioPage.clickResetButton();
    const dataIndex = await scenarioPage.getDataIndexByColumnName('Information');
    const isChildDefaultInManageScenarios = await scenarioPage.verifyDefaultInScenarioTable(scenarioName, dataIndex);
    await commonFunctions.compareTwoValues(isChildDefaultInManageScenarios, true, `Child scenario ${scenarioName} remains default in Manage Scenarios`);
    expect(isChildDefaultInManageScenarios).toBe(true);
  });

  test('Test Case 4: Delete the child scenario', async ({ scenarioPage, commonFunctions }) => {
    await scenarioPage.clickResetButton();
    const isDeleted = await scenarioPage.deleteChildScenario(scenarioName);
    await commonFunctions.compareTwoValues(isDeleted, true, `Is ${scenarioName} scenario deleted`);
    expect(isDeleted).toBe(true);
  });

  test('Test Case 5: Base scenario should be default after child deletion', async ({ planningPage, scenarioPage, commonFunctions }) => {
    await scenarioPage.clickResetButton();
    const dataIndex = await scenarioPage.getDataIndexByColumnName('Information');
    const isBaseScenarioDefault = await scenarioPage.verifyDefaultInScenarioTable(baseScenario, dataIndex);
    await commonFunctions.compareTwoValues(isBaseScenarioDefault, true, `Is default icon exist for ${baseScenario} scenario`);
    expect(isBaseScenarioDefault).toBe(true);

    await scenarioPage.closeManageScenarios();
    await planningPage.openComponent('Scenarios');
    const isBaseDefaultInScenarioComponent = await scenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(baseScenario);
    await commonFunctions.compareTwoValues(isBaseDefaultInScenarioComponent, true, `Base scenario ${baseScenario} is default in Scenario component after child deletion`);
    expect(isBaseDefaultInScenarioComponent).toBe(true);
  });

  test.afterAll('Cleanup: Delete created scenario using API', async ({ createdEntities }) => {
    const { failed } = await createdEntities.cleanupFile();
    expect(failed.map((entity) => entity.name), 'Scenario API cleanup must succeed').toEqual([]);
  });
});
