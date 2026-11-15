import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';

test.describe.serial('Scenario Selection', () => {
  const scenarioName = 'Scenario_Selection_1';

  test.beforeAll(async ({ testUtil, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
  });

  test('Test Case 1: Create a public child scenario', async ({ planningPage, scenarioPage, commonFunctions }) => {
    await planningPage.goToManageScenarios();
    if (!(await scenarioPage.isScenarioVisible(scenarioName, getTimeout('SHORT')))) {
      const baseScenario = await scenarioPage.getBaseScenario();
      await scenarioPage.tableActionClick(baseScenario, 'Create Child Scenario');
      await scenarioPage.createChildScenario(scenarioName, `${scenarioName} Description`, 'Public', 'Uncheck');
    }

    const validation = await commonFunctions.compareTwoValues(await scenarioPage.isScenarioVisibleUnderManageScenarios(scenarioName), true, `Child Scenario ${scenarioName} Created Assertion`);
    expect(validation).toBe(true);
  });

  test('Test Case 2: Mapping Scenario in the Scenario Tab', async ({ planningPage, scenarioPage, testUtil, testData }) => {
    await scenarioPage.closeManageScenarios();
    await testUtil.clickLeftpaneLinks('Planning');
    await planningPage.clickViewDropdown();
    await planningPage.selectView(testData.VIEW_NAME);
    await planningPage.openComponent('Scenarios');
    await scenarioPage.scenarioSelect([scenarioName], 'Check');
    expect(await scenarioPage.verifySCselectedScenario(scenarioName)).toBe(true);
  });

  test('Test Case 3: Validating Scenario Map', async ({ scenarioPage }) => {
    expect(await scenarioPage.verifyScenarioNameInPSFilter(scenarioName)).toBe(true);
  });
});
