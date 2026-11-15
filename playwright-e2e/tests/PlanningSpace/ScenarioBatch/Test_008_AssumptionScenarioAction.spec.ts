import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Scenario Actions - Assumptions', () => {
  const publicScenarioName = uniqueName('Private_test');

  test.beforeAll(async ({ testUtil, planningListingPage, planningPage, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Assumption', testData.PROCESS_NAME, '', testData.ASSUMPTION_NAME);
    await planningPage.goToManageScenarios();
  });

  test('Test Case 1: Create Child Scenario', async ({ testUtil, scenarioPage, commonFunctions }) => {
    const validation1 = await testUtil.createChildScenarioFromBase(publicScenarioName, `${publicScenarioName} Description`);
    const validation2 = await commonFunctions.compareTwoValues(await scenarioPage.isScenarioVisibleUnderManageScenarios(publicScenarioName), true, `Child Scenario ${publicScenarioName} Created Assertion`);
    expect(validation1 && validation2).toBe(true);
  });

  test('Test Case 2: Edit Child Scenario', async ({ scenarioPage, commonFunctions }) => {
    const dataIndex = await scenarioPage.getDataIndexByColumnName('Information');
    await scenarioPage.editScenarioItemIsDefault(publicScenarioName);
    const validation = await scenarioPage.verifyDefaultInScenarioTable(publicScenarioName, dataIndex);
    await commonFunctions.compareTwoValues(validation, true, `Is right icon exist for ${publicScenarioName} scenario`);
    expect(validation).toBeTruthy();
  });

  test('Test Case 3: Delete Child Scenario', async ({ scenarioPage, commonFunctions }) => {
    const isDelete = await scenarioPage.deleteChildScenario(publicScenarioName);
    await commonFunctions.compareTwoValues(isDelete, true, `Is ${publicScenarioName} scenario deleted`);
    expect(isDelete).toBeTruthy();
  });
});
