import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Scenario Creation Incremental', () => {
  const childScenario = uniqueName('Subset_Child');
  const incrementalchildScenario = uniqueName('Incremental_Child');
  const subProcessChildScenario = uniqueName('Subprocess_Subset_Child');
  const subProcessIncrementalchildScenario = uniqueName('Subprocess_Incremental_Child');
  const assumptionChildScenario = uniqueName('Assumption_Subset_Child');
  const assumptionIncrementalchildScenario = uniqueName('Assumption_Incremental_Child');

  test('Test Case 1: Create Child Scenario, subset Scenario & Delete Scenarios - Process', async ({ planningPage, testUtil, scenarioPage, commonFunctions, testData }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test Case 1');
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.goToManageScenarios();
    await testUtil.createChildScenarioFromBase(childScenario, `${childScenario} Description`);
    const validation1 = await scenarioPage.isScenarioVisibleUnderManageScenarios(childScenario);
    await testUtil.createChildScenarioFromChild(childScenario, incrementalchildScenario, `${incrementalchildScenario} Description`);
    const validation2 = await scenarioPage.isScenarioVisibleUnderManageScenarios(incrementalchildScenario);
    const isDelete = await scenarioPage.deleteChildScenario(childScenario);
    expect(validation1 && validation2 && isDelete).toBe(true);
    await commonFunctions.logMessage('PASS', 'Test Case 1 completed successfully');
  });

  test('Test Case 2: Create Child Scenario, subset Scenario & Delete Scenarios - SubProcess', async ({ planningListingPage,planningPage, testUtil, scenarioPage, commonFunctions, testData }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test Case 2');
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext("Subprocess", testData.PROCESS_NAME, testData.SUBPROCESS_NAME);
    await planningPage.goToManageScenarios();
    await testUtil.createChildScenarioFromBase(subProcessChildScenario, `${subProcessChildScenario} Description`);
    const validation1 = await scenarioPage.isScenarioVisibleUnderManageScenarios(subProcessChildScenario);
    await testUtil.createChildScenarioFromChild(subProcessChildScenario, subProcessIncrementalchildScenario, `${subProcessIncrementalchildScenario} Description`);
    const validation2 = await scenarioPage.isScenarioVisibleUnderManageScenarios(subProcessIncrementalchildScenario);
    const isDelete = await scenarioPage.deleteChildScenario(subProcessChildScenario);
    expect(validation1 && validation2 && isDelete).toBe(true);
    await commonFunctions.logMessage('PASS', 'Test Case 2 completed successfully');
  });

  test('Test Case 3: Create Child Scenario, subset Scenario & Delete Scenarios - Assumption', async ({ planningListingPage, planningPage, testUtil, scenarioPage, commonFunctions, testData }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test Case 3');
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext("Assumption", testData.PROCESS_NAME, undefined, testData.ASSUMPTION_NAME);
    await planningPage.goToManageScenarios();
    await testUtil.createChildScenarioFromBase(assumptionChildScenario, `${assumptionChildScenario} Description`);
    const validation1 = await scenarioPage.isScenarioVisibleUnderManageScenarios(assumptionChildScenario);
    await testUtil.createChildScenarioFromChild(assumptionChildScenario, assumptionIncrementalchildScenario, `${assumptionIncrementalchildScenario} Description`);
    const validation2 = await scenarioPage.isScenarioVisibleUnderManageScenarios(assumptionIncrementalchildScenario);
    const isDelete = await scenarioPage.deleteChildScenario(assumptionChildScenario);
    expect(validation1 && validation2 && isDelete).toBe(true);
    await commonFunctions.logMessage('PASS', 'Test Case 3 completed successfully');
  });
});
