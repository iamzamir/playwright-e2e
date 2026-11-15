import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';
import apiUtil from '../../../util/api.util';
import { registerScenario, SCENARIO_SEARCH_URL_PART } from '../../../util/scenario-cleanup.util';

test.describe.serial('Create Multiple Child Scenarios After Drill Through Popup', () => {
  test.describe.configure({ retries: 0 });

  const firstScenarioName = uniqueName('DT_Created_Scenario');
  const firstScenarioDesc = `Scenario created after Drill Through ${firstScenarioName}`;
  const secondScenarioName = uniqueName('Created_Scenario_From_DT');
  const secondScenarioDesc = `Scenario creation child of Default Scenario ${secondScenarioName}`;
  const thirdScenarioName = uniqueName('Created_Scenario_Base');
  const thirdScenarioDesc = `Scenario created child of base ${thirdScenarioName}`;

  let baseScenario = '';
  let accessToken = '';
  let searchSimulationUrl = '';
  let newCreatedScenario = '';
  let scenarioRequests: () => { authorization: string; body: string } = () => ({ authorization: '', body: '' });

  const getScenarioCaptured = () => {
    const req = scenarioRequests();
    return req.authorization ? req : { authorization: accessToken, body: req.body };
  };

  test.beforeAll(async ({ testUtil, testData, scenarioPage }) => {
    scenarioRequests = scenarioPage.trackApiRequests(SCENARIO_SEARCH_URL_PART);
    await testUtil.loginToPlanningSpaceWithProcess(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      testData.PROCESS_NAME
    );
    baseScenario = await testUtil.setBaseAsDefaultScenario();
    searchSimulationUrl = `${process.env.API_BASE_URL as string}${process.env.SEARCH_SIMULATION as string}`;
  });

  test('Test Case 1: Perform Drill Through to Target View', async ({ planningPage, drillThroughPage, commonFunctions, testUtil, testData }) => {
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    await drillThroughPage.waitForViewName(testData.VIEW_NAME);
    // Route the parent tab before the popup opens: on a parent tab already in the background this call never returned.
    await testUtil.page.route('**/searchNotifications', (route) => route.abort());
    await commonFunctions.logMessage('INFO', 'Aborted searchNotifications on parent tab to prevent notification race condition');
    await drillThroughPage.performDrillThroughOnBDECard(testData.CARD_NAME);

    await testUtil.switchToSpecificWindow(1);
    planningPage.page = testUtil.page;
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
    const requestValidationPromise = scenarioPage.validateTheJsonRequest(
      testData.REQUEST_URL,
      testData.PROCEDURE_TYPE,
      firstScenarioName,
      baseScenario,
      testData.PARENT_SCENARIO_ID
    );

    await planningPage.selectSupplyChainProceduresAction(testData.PROCEDURE_NAME);
    registerScenario(createdEntities, firstScenarioName, testData.PROCESS_NAME, getScenarioCaptured());
    await scenarioPage.createScenarioFromSCA(firstScenarioName, firstScenarioDesc, baseScenario, true, testData.isPublic, testData.isWizard);

    const running = await scenarioPage.verifyAlertMsg('running', getTimeout('XLARGE')) || await scenarioPage.verifyAlertMsg('procedure is running', getTimeout('XLARGE'));
    const success = await scenarioPage.verifyAlertMsg('success', getTimeout('EXTREME') * 2);
    accessToken = await accessTokenPromise;
    const requestValidation = await requestValidationPromise;

    const runningValidation = await commonFunctions.compareTwoValues(running, true, 'verify running alert');
    const successValidation = await commonFunctions.compareTwoValues(success, true, 'verify success alert');
    const requestVal = await commonFunctions.compareTwoValues(requestValidation, true, 'verify requestValidation');
    expect(runningValidation && successValidation && requestVal).toBe(true);
  });

  test('Test Case 3: Validate the scenario name in the API response Search Simulation', async ({ testData, commonFunctions }) => {
    test.skip(!searchSimulationUrl, 'API_BASE_URL or SEARCH_SIMULATION environment variables are missing for Search Simulation validation.');

    const headers = {
      accept: 'application/json',
      Authorization: accessToken
    };

    const response = await apiUtil.processAPIRequest(
      'POST',
      `${searchSimulationUrl}?filter=isDefault%3D${testData.IS_DEFAULT_SEARCH}`,
      testData.REQUEST_BODY,
      headers,
      'Fetching Scenarios',
      'data'
    );

    const matchedEntity = response?.entities?.find((entity: any) => entity.scenarioName === firstScenarioName) ?? response?.entities?.[0];
    newCreatedScenario = matchedEntity?.scenarioId ?? '';
    const scenarioName = matchedEntity?.scenarioName ?? '';
    const scenarioValidation = await commonFunctions.compareTwoValues(scenarioName, firstScenarioName, 'Default scenario from API should match newly created scenario');
    expect(scenarioValidation && newCreatedScenario !== '').toBe(true);
  });

  test('Test Case 4: Create a Child Scenario from created default child scenario', async ({ planningPage, scenarioPage, commonFunctions, testData, testUtil, createdEntities }) => {
    await testUtil.switchToSpecificWindow(1);
    planningPage.page = testUtil.page;
    scenarioPage.page = testUtil.page;

    const requestValidationPromise = scenarioPage.validateTheJsonRequest(
      testData.REQUEST_URL,
      testData.PROCEDURE_TYPE,
      secondScenarioName,
      firstScenarioName,
      newCreatedScenario
    );

    await planningPage.selectSupplyChainProceduresAction(testData.PROCEDURE_NAME);
    registerScenario(createdEntities, secondScenarioName, testData.PROCESS_NAME, getScenarioCaptured());
    await scenarioPage.createScenarioFromSCA(secondScenarioName, secondScenarioDesc, '', false, testData.isPublic, testData.isWizard);

    const running = await scenarioPage.verifyAlertMsg('running', getTimeout('XLARGE')) || await scenarioPage.verifyAlertMsg('procedure is running', getTimeout('XLARGE'));
    const success = await scenarioPage.verifyAlertMsg('success', getTimeout('EXTREME') * 2);
    const requestValidation = await requestValidationPromise;

    const runningValidation = await commonFunctions.compareTwoValues(running, true, 'verify running alert');
    const successValidation = await commonFunctions.compareTwoValues(success, true, 'verify success alert');
    const requestVal = await commonFunctions.compareTwoValues(requestValidation, true, 'verify requestValidation');

    expect(runningValidation && successValidation && requestVal).toBe(true);
  });

  test('Test Case 5: Create a Child Scenario from Base Scenario', async ({ planningPage, scenarioPage, commonFunctions, testData, testUtil, createdEntities }) => {
    await testUtil.switchToSpecificWindow(1);
    planningPage.page = testUtil.page;
    scenarioPage.page = testUtil.page;

    const requestValidationPromise = scenarioPage.validateTheJsonRequest(
      testData.REQUEST_URL,
      testData.PROCEDURE_TYPE,
      thirdScenarioName,
      baseScenario,
      testData.PARENT_SCENARIO_ID
    );

    await planningPage.selectSupplyChainProceduresAction(testData.PROCEDURE_NAME);
    registerScenario(createdEntities, thirdScenarioName, testData.PROCESS_NAME, getScenarioCaptured());
    await scenarioPage.createScenarioFromSCA(thirdScenarioName, thirdScenarioDesc, baseScenario, false, testData.isPublic, testData.isWizard);

    const running = await scenarioPage.verifyAlertMsg('running', getTimeout('XLARGE')) || await scenarioPage.verifyAlertMsg('procedure is running', getTimeout('XLARGE'));
    const success = await scenarioPage.verifyAlertMsg('success', getTimeout('EXTREME') * 2);
    const requestValidation = await requestValidationPromise;

    const runningValidation = await commonFunctions.compareTwoValues(running, true, 'verify running alert');
    const successValidation = await commonFunctions.compareTwoValues(success, true, 'verify success alert');
    const requestVal = await commonFunctions.compareTwoValues(requestValidation, true, 'verify requestValidation');

    expect(runningValidation && successValidation && requestVal).toBe(true);
  });

  test.afterAll('Cleanup: delete the scenarios this file created', async ({ testUtil, createdEntities }) => {
    const pages = testUtil.page.context().pages();
    const parentTab = pages[0];
    try {
      for (let i = pages.length - 1; i >= 1; i--) {
        await pages[i].close().catch(() => { });
      }
      await testUtil.switchToSpecificWindow(0).catch(() => { });
    } catch (error) {
      console.warn('Error during popup tab cleanup in afterAll:', error);
    }

    // unroute on this tab has hung before. Keep it last and bounded so the API cleanup below still runs and no other page work is left behind.
    if (parentTab) {
      let unrouteGuard: NodeJS.Timeout | undefined;
      await Promise.race([
        parentTab.unroute('**/searchNotifications').catch(() => { }),
        new Promise<void>((resolve) => { unrouteGuard = setTimeout(resolve, getTimeout('XLARGE')); }),
      ]);
      clearTimeout(unrouteGuard);
    }

    const { failed } = await createdEntities.cleanupFile();
    expect(failed, 'Created scenarios deleted through the API').toHaveLength(0);
  });
});
