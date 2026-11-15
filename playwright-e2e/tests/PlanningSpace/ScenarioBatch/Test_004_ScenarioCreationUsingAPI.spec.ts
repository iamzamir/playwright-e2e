import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';

test.describe.serial('Scenario Creation Via New Scenario API', () => {
  const scenarioName = uniqueName('Created_Scenario');
  const scenarioDesc = `Scenario Creation using API ${scenarioName}`;

  test.beforeAll(async ({ testUtil, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
  });

  test('Test Case 1: Create a child scenario Using "+" icon from the Scenario layout.', async ({ testUtil, planningPage, scenarioPage, commonFunctions, createdEntities, testData }) => {
    const accessTokenPromise = scenarioPage.waitForAccessTokenFromRequestHeader(process.env.SEARCH_SIMULATION || 'simulations/search');
    await testUtil.setBaseAsDefaultScenario();
    const authorization = await accessTokenPromise;
    await planningPage.openComponent('Scenarios');
    const selectionLimitVerified = await scenarioPage.verifyMultiScenarioSelectionLimitedTo4();
    await commonFunctions.compareTwoValues(selectionLimitVerified, true, 'Multi-scenario selection properly limited to 4');
    await scenarioPage.clickApplyScenarioTab();
    await planningPage.openComponent('Scenarios');
    const selectedAfterApply = (await scenarioPage.getSelectedScenarioNamesFromNewUI()).length;
    await commonFunctions.logMessage('INFO', `Scenarios selected after apply: ${selectedAfterApply}`);
    await scenarioPage.openScenarioCreationPopupUsingIcon();
    createdEntities.register('scenario', scenarioName, { context: { processName: testData.PROCESS_NAME }, authorization });
    await scenarioPage.createChildScenario(scenarioName, scenarioDesc, 'Private', 'Check');
    const successAlertMsg = await scenarioPage.verifyAlertMsg('Scenario created successfully', getTimeout('EXTREME'));
    await commonFunctions.compareTwoValues(successAlertMsg, true, 'Scenario created successfully');
    await planningPage.openComponent('Scenarios');
    const isDefaultScenarioInFilter = await scenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(scenarioName);
    await commonFunctions.compareTwoValues(isDefaultScenarioInFilter, true, `Is default scenario ${scenarioName} available under scenario filters`);
    const selectedScenariosAfterDefScnCreation = await scenarioPage.getSelectedScenarioNamesFromNewUI();
    const validateSelectedScn = selectedScenariosAfterDefScnCreation.length === 1 && selectedScenariosAfterDefScnCreation[0] === scenarioName;
    await commonFunctions.compareTwoValues(validateSelectedScn, true, `SelectedScenarios: ${selectedScenariosAfterDefScnCreation}`);
    expect(successAlertMsg && isDefaultScenarioInFilter && selectionLimitVerified && selectedAfterApply <= 4 && validateSelectedScn).toBeTruthy();
  });

  test('Test Case 2: Verify Scenario Selection from Scenario Layout.', async ({ planningPage, scenarioPage, commonFunctions }) => {
    await planningPage.clickManageScenarios();
    const createdScenarioExists = await scenarioPage.isScenarioVisible(scenarioName, getTimeout('XLARGE'));
    await commonFunctions.compareTwoValues(createdScenarioExists, true, `Created scenario ${scenarioName} exists in scenarios list`);
    const defaultIconExists = await scenarioPage.verifyIsDefaultScenario(scenarioName);
    await commonFunctions.compareTwoValues(defaultIconExists, true, `Created scenario ${scenarioName} has default icon in scenarios list`);
    expect(createdScenarioExists && defaultIconExists).toBeTruthy();
  });

  test('Test Case 3: Delete Created Scenario and Validate Base Scenario is Set as Default', async ({ scenarioPage, commonFunctions }) => {
    const baseScenarioName = await scenarioPage.getBaseScenario();
    await commonFunctions.logMessage('INFO', `Base scenario name: ${baseScenarioName}`);
    const deletionVal = await scenarioPage.deleteChildScenario(scenarioName);
    await commonFunctions.compareTwoValues(deletionVal, true, `Successfully deleted scenario ${scenarioName}`);
    // The table refreshes after the delete, so wait for the base scenario to become the default.
    const isBaseScenarioSameAsDefault = await expect.poll(() => scenarioPage.getDefaultScenario(), { timeout: getTimeout('LONG') })
      .toBe(baseScenarioName).then(() => true, () => false);
    await commonFunctions.compareTwoValues(isBaseScenarioSameAsDefault, true, `Base scenario ${baseScenarioName} is the current default scenario`);
    expect(deletionVal && isBaseScenarioSameAsDefault).toBeTruthy();
  });

  test('Test Case 4: Navigate back to Planning Space and validate the Base Scenario is Set as Default in the Scenarios panel', async ({ planningPage, scenarioPage, commonFunctions }) => {
    await scenarioPage.closeManageScenarios();
    await planningPage.openComponent('Scenarios');
    const baseScenarioName = await scenarioPage.getBaseScenarioFromScenariosPanel();
    await commonFunctions.logMessage('INFO', `Base scenario name: ${baseScenarioName}`);
    const validation = await scenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(baseScenarioName);
    await commonFunctions.compareTwoValues(validation, true, `Base scenario ${baseScenarioName} is displayed with default icon in scenarios panel`);
    expect(validation).toBeTruthy();
  });

  test.afterAll('Cleanup: Delete created scenario using API', async ({ createdEntities }) => {
    const { failed } = await createdEntities.cleanupFile();
    expect(failed.map((entity) => entity.name), 'Scenario API cleanup must succeed').toEqual([]);
  });
});
