import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';
import apiUtil from '../../../util/api.util';
import { registerScenario, SCENARIO_SEARCH_URL_PART } from '../../../util/scenario-cleanup.util';

test.describe.serial('Create Multiple Child Scenarios After Drill Through - BDE Card', () => {
  test.describe.configure({ retries: 0 });

  const firstScenarioName = uniqueName('DT_Created_Scenario');
  const firstScenarioDesc = `Scenario created after Drill Through ${firstScenarioName}`;
  const secondScenarioName = uniqueName('Created_Scenario_From_DT');
  const secondScenarioDesc = `Scenario creation child of Default Scenario ${secondScenarioName}`;
  const thirdScenarioName = uniqueName('Created_Scenario_Base');
  const thirdScenarioDesc = `Scenario created child of base ${thirdScenarioName}`;

  let baseScenario = '';
  let searchSimulationUrl = '';
  let accessToken = '';
  let newCreatedScenario = '';
  let scenarioRequests: () => { authorization: string; body: string } = () => ({ authorization: '', body: '' });

  const getScenarioCaptured = () => {
    const req = scenarioRequests();
    return req.authorization ? req : { authorization: accessToken, body: req.body };
  };

  test.beforeAll(async ({ testUtil, testData, scenarioPage }) => {
    scenarioRequests = scenarioPage.trackApiRequests(SCENARIO_SEARCH_URL_PART);
    const apiBaseUrl = process.env.API_BASE_URL;
    const searchSimulation = process.env.SEARCH_SIMULATION;
    if (apiBaseUrl && searchSimulation) {
      searchSimulationUrl = `${apiBaseUrl}${searchSimulation}`;
    }
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME, false);
    baseScenario = await testUtil.setBaseAsDefaultScenario();
  });

  test('Test Case 1: Perform Drill Through to Target View', async ({ planningPage, scenarioPage, drillThroughPage, commonFunctions, testUtil, testData }) => {
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    await drillThroughPage.waitForViewName(testData.VIEW_NAME);

    await planningPage.openComponent('Scenarios');
    const defaultScenario = await scenarioPage.getDefaultScenarioNameFromPlanningSpace();
    await commonFunctions.logMessage('INFO', `Default Scenario: ${defaultScenario}`);
    const baseDefaultValidation = await commonFunctions.compareTwoValues(defaultScenario, baseScenario, 'Is Base Scenario already set as default');

    if (!baseDefaultValidation) {
      await scenarioPage.setDefaultScenarioInScenarioComponent(baseScenario);
      await planningPage.clickApply();
      await planningPage.openComponent('Scenarios');
    }

    const availableScenarios = await scenarioPage.getScenarioNamesFromNewUI();
    const selectedScenarios = await scenarioPage.getSelectedScenarioNamesFromNewUI();
    if (selectedScenarios.length === 1 && availableScenarios.length > 1) {
      const scenarioCandidates = availableScenarios.filter((item: string) => item !== baseScenario).slice(0, 2);
      if (scenarioCandidates.length > 0) {
        await scenarioPage.scenarioSelect(scenarioCandidates, 'Check');
        await planningPage.clickApply();
      }
      else {
        await planningPage.closeDrawer();
        await commonFunctions.logMessage('WARN', 'No additional scenarios available to select besides the base scenario.');
      }
    } else {
      await planningPage.closeDrawer();
    }

    // Route the parent tab before the popup opens: on a parent tab already in the background this call never returned.
    await testUtil.page.route('**/searchNotifications', route => route.abort()).catch(() => {});
    await drillThroughPage.performDrillThroughOnBDECard(testData.CARD_NAME);
    await testUtil.switchToSpecificWindow(1);
    planningPage.page = testUtil.page;
    scenarioPage.page = testUtil.page;
    drillThroughPage.page = testUtil.page;

    await drillThroughPage.waitForViewName(testData.VIEW_NAME1);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME1);
    const actualViewName = await planningPage.getViewTitleName();
    const viewValidation = await commonFunctions.compareTwoValues(actualViewName, testData.VIEW_NAME1, `View switched to ${testData.VIEW_NAME1}`);
    expect(viewValidation).toBe(true);
  });

  test('Test Case 2: Create Default Child Scenario in Target View', async ({ planningPage, scenarioPage, commonFunctions, testData, testUtil, createdEntities }) => {
    await testUtil.switchToSpecificWindow(1);
    planningPage.page = testUtil.page;
    scenarioPage.page = testUtil.page;

    const accessTokenPromise = scenarioPage.waitForAccessTokenFromRequestHeader(testData.PROCEDURE_EXECUTION_URL);
    await planningPage.selectSupplyChainProceduresAction(testData.PROCEDURE_NAME);
    registerScenario(createdEntities, firstScenarioName, testData.PROCESS_NAME, getScenarioCaptured());
    await scenarioPage.createScenarioFromSCA(firstScenarioName, firstScenarioDesc, baseScenario, true, testData.isPublic, testData.isWizard);
    accessToken = await accessTokenPromise;

    const running = await scenarioPage.verifyAlertMsg('running', getTimeout('XLARGE')) || await scenarioPage.verifyAlertMsg('procedure is running', getTimeout('XLARGE'));
    const success = await scenarioPage.verifyAlertMsg('success', getTimeout('EXTREME') * 2);
    const runningValidation = await commonFunctions.compareTwoValues(running, true, 'verify running alert');
    const successValidation = await commonFunctions.compareTwoValues(success, true, 'verify success alert');
    expect(runningValidation && successValidation).toBe(true);
  });

  test('Test Case 3: Validate the scenario name in Search Simulation API response', async ({ commonFunctions, testData }) => {
    test.skip(!searchSimulationUrl, 'API_BASE_URL or SEARCH_SIMULATION environment variables are missing for Search Simulation validation.');

    const headers = {
      accept: 'application/json',
      Authorization: accessToken
    };

    const response = await apiUtil.processAPIRequest('POST', `${searchSimulationUrl}?filter=isDefault%3D${testData.IS_DEFAULT_SEARCH}`, testData.REQUEST_BODY, headers, 'Fetching Scenarios', 'full');
    const statusValidation = await commonFunctions.compareTwoValues(response.status, 200, 'Search Simulation status should be 200');

    const matchedEntity = response.data?.entities?.find((entity: any) => entity.scenarioName === firstScenarioName) ?? response.data?.entities?.[0];
    newCreatedScenario = matchedEntity?.scenarioId ?? '';
    const scenarioName = matchedEntity?.scenarioName ?? '';
    const scenarioValidation = await commonFunctions.compareTwoValues(scenarioName, firstScenarioName, 'Default scenario from API should match newly created scenario');

    expect(statusValidation && scenarioValidation && newCreatedScenario !== '').toBe(true);
  });

  test('Test Case 4: Validate only newly created default scenario should be selected', async ({ planningPage, scenarioPage, commonFunctions, testUtil }) => {
    await testUtil.switchToSpecificWindow(1);
    planningPage.page = testUtil.page;
    scenarioPage.page = testUtil.page;

    await planningPage.openComponent('Scenarios');
    const isDefaultScenarioInFilter = await scenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(firstScenarioName);
    const selectedScenarios = await scenarioPage.getSelectedScenarioNamesFromNewUI();
    const isSelected = selectedScenarios.includes(firstScenarioName);
    const countValidation = await commonFunctions.compareTwoValues(isSelected, true, 'newly created default scenario should be selected');
    const defaultValidation = await commonFunctions.compareTwoValues(selectedScenarios[0], firstScenarioName, 'default scenario should be selected');
    await planningPage.closeDrawer();
    expect(isDefaultScenarioInFilter && countValidation && defaultValidation).toBe(true);
  });

  test('Test Case 5: Create a Child Scenario from created default child scenario', async ({ planningPage, scenarioPage, commonFunctions, testData, testUtil, createdEntities }) => {
    await testUtil.switchToSpecificWindow(1);
    planningPage.page = testUtil.page;
    scenarioPage.page = testUtil.page;

    await planningPage.selectSupplyChainProceduresAction(testData.PROCEDURE_NAME);
    registerScenario(createdEntities, secondScenarioName, testData.PROCESS_NAME, getScenarioCaptured());
    await scenarioPage.createScenarioFromSCA(secondScenarioName, secondScenarioDesc, '', false, testData.isPublic, testData.isWizard);

    const running = await scenarioPage.verifyAlertMsg('running', getTimeout('XLARGE')) || await scenarioPage.verifyAlertMsg('procedure is running', getTimeout('XLARGE'));
    const success = await scenarioPage.verifyAlertMsg('success', getTimeout('EXTREME') * 2);
    const runningValidation = await commonFunctions.compareTwoValues(running, true, 'verify running alert for second scenario');
    const successValidation = await commonFunctions.compareTwoValues(success, true, 'verify success alert for second scenario');

    await planningPage.goToManageScenarios();
    await scenarioPage.expandScenarioInManageScenarios(firstScenarioName);
    const createdScenarioExists = await scenarioPage.verifyScenarioName(secondScenarioName, true);
    await scenarioPage.closeManageScenarios();

    const createdValidation = await commonFunctions.compareTwoValues(createdScenarioExists, true, `Second scenario should exist: ${secondScenarioName}`);
    const parentRefValidation = await commonFunctions.compareTwoValues(newCreatedScenario !== '', true, 'newly created default scenario id should exist');

    expect(runningValidation && successValidation && createdValidation && parentRefValidation).toBe(true);
  });

  test('Test Case 6: Create a Child Scenario from Base Scenario', async ({ planningPage, scenarioPage, commonFunctions, testData, testUtil, createdEntities }) => {
    await testUtil.switchToSpecificWindow(1);
    planningPage.page = testUtil.page;
    scenarioPage.page = testUtil.page;

    await planningPage.selectSupplyChainProceduresAction(testData.PROCEDURE_NAME);
    registerScenario(createdEntities, thirdScenarioName, testData.PROCESS_NAME, getScenarioCaptured());
    await scenarioPage.createScenarioFromSCA(thirdScenarioName, thirdScenarioDesc, baseScenario, false, testData.isPublic, testData.isWizard);

    const running = await scenarioPage.verifyAlertMsg('running', getTimeout('XLARGE')) || await scenarioPage.verifyAlertMsg('procedure is running', getTimeout('XLARGE'));
    const success = await scenarioPage.verifyAlertMsg('success', getTimeout('EXTREME') * 2);
    const runningValidation = await commonFunctions.compareTwoValues(running, true, 'verify running alert for third scenario');
    const successValidation = await commonFunctions.compareTwoValues(success, true, 'verify success alert for third scenario');

    await planningPage.goToManageScenarios();
    const createdScenarioExists = await scenarioPage.verifyScenarioName(thirdScenarioName, true);
    await scenarioPage.closeManageScenarios();

    const createdValidation = await commonFunctions.compareTwoValues(createdScenarioExists, true, `Third scenario should exist: ${thirdScenarioName}`);

    expect(runningValidation && successValidation && createdValidation).toBe(true);
  });

  test.afterAll('Cleanup: delete the scenarios this file created', async ({ testUtil, createdEntities }) => {
    try {
      const pages = testUtil.page.context().pages();
      for (let i = pages.length - 1; i >= 1; i--) {
        await pages[i].close().catch(() => {});
      }
      await testUtil.switchToSpecificWindow(0).catch(() => {});
    } catch (error) {
      console.warn('Error during popup tab cleanup in afterAll:', error);
    }

    const { failed } = await createdEntities.cleanupFile();
    expect(failed, 'Created scenarios deleted through the API').toHaveLength(0);
  });
});
