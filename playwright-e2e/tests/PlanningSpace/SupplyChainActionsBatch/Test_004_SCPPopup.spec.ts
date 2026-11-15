import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';
import { registerScenario, SCENARIO_SEARCH_URL_PART } from '../../../util/scenario-cleanup.util';

test.describe.serial('Supply Chain Procedures - Create Scenario - Popup Layout', () => {
  const scenarioName = uniqueName('SCA_popup_scenario');
  const scenarioDescription = `Description for popup layout in SCA ${scenarioName}`;
  let defaultScenario = '';
  let scenarioRequests: () => { authorization: string; body: string } = () => ({ authorization: '', body: '' });

  test('Test Case 1: Fetch default scenario name in create scenario', async ({ testUtil, planningPage, scenarioPage, testData }) => {
    scenarioRequests = scenarioPage.trackApiRequests(SCENARIO_SEARCH_URL_PART);
    await testUtil.loginToPlanningSpaceWithProcess(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      testData.PROCESS_NAME
    );
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    await planningPage.goToManageScenarios();
    defaultScenario = await scenarioPage.getBaseScenario();
    await scenarioPage.closeManageScenarios();
    expect(defaultScenario).toBeTruthy();
  });

  test('Test Case 2: Create a public scenario through SCP and verify alert messages', async ({ scenarioPage, commonFunctions, testData, planningPage, createdEntities }) => {
    await planningPage.selectSupplyChainProceduresAction(testData.PROCEDURE_NAME);
    registerScenario(createdEntities, scenarioName, testData.PROCESS_NAME, scenarioRequests());
    await scenarioPage.createScenarioFromSCA(scenarioName, scenarioDescription, defaultScenario, false, testData.IS_PUBLIC, false);

    const running = await scenarioPage.verifyAlertMsg('running', getTimeout('XLARGE'))
      || await scenarioPage.verifyAlertMsg('procedure is running', getTimeout('XLARGE'));
    const success = await scenarioPage.verifyAlertMsg('success', getTimeout('EXTREME'));

    const runningValidation = await commonFunctions.compareTwoValues(running, true, 'verify alert');
    const successValidation = await commonFunctions.compareTwoValues(success, true, 'success');
    expect(runningValidation && successValidation).toEqual(true);
  });

  test('Test Case 3: Validate created scenario exists in manage scenarios', async ({ planningPage, scenarioPage, commonFunctions }) => {
    await planningPage.goToManageScenarios();
    const scenarioExists = await scenarioPage.verifyScenarioName(scenarioName, true);
    const scenarioExistsValidation = await commonFunctions.compareTwoValues(scenarioExists, true, `verify created scenario exists - ${scenarioName}`);
    expect(scenarioExistsValidation).toEqual(true);
    await scenarioPage.closeManageScenarios();
  });

  test.afterAll('Cleanup: delete the scenarios this file created', async ({ createdEntities }) => {
    const { failed } = await createdEntities.cleanupFile();
    expect(failed, 'Created scenarios deleted through the API').toHaveLength(0);
  });
});
