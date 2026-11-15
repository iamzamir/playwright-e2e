import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';
import { ScenarioPage } from '../../../pageobjects/scenario.page';
import { CommonFunctions } from '../../../util/common.util';

/** Waits for the Manage Scenarios table to show `scenarioName` as the default (it refreshes after the action). */
const isDefaultInManageScenarios = async (scenarioPage: ScenarioPage, scenarioName: string): Promise<boolean> =>
  expect.poll(() => scenarioPage.getDefaultScenario(), { timeout: getTimeout('LONG') }).toBe(scenarioName).then(() => true, () => false);

/**
 * Sets the scenario as default from its row menu and checks the success alert and the Default chip. A scenario that is
 * already default (e.g. on a retry) has no "Set as Default" item, so the action is skipped then.
 */
const setDefaultInManageScenarios = async (scenarioPage: ScenarioPage, commonFunctions: CommonFunctions, scenarioName: string): Promise<boolean> => {
  let defaultSetAlert = true;
  if (await scenarioPage.verifyIsDefaultScenario(scenarioName)) {
    await commonFunctions.logMessage('INFO', `Scenario ${scenarioName} is already default; skipping Set as Default`);
  } else {
    await scenarioPage.editScenarioItemIsDefault(scenarioName);
    defaultSetAlert = await scenarioPage.verifyAlertMsg('success', getTimeout('EXTREME'));
  }
  await scenarioPage.clickResetButton();
  const isDefault = await isDefaultInManageScenarios(scenarioPage, scenarioName);
  await commonFunctions.compareTwoValues(defaultSetAlert, true, `Scenario ${scenarioName} default action success`);
  await commonFunctions.compareTwoValues(isDefault, true, `Scenario ${scenarioName} is default in Manage Scenarios`);
  return defaultSetAlert && isDefault;
};

test.describe.serial('Scenario defaults in Manage Scenarios and Scenario component', () => {
  const privateScenarioName = 'test_private_scenario_do_not_delete';
  const publicScenarioName = 'test_scenario_do_not_delete';
  let baseScenario = '';

  test.beforeAll(async ({ testUtil, planningListingPage, planningPage, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.PSLINK as string);
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Process', testData.PROCESS_NAME);
    await planningPage.goToManageScenarios();
  });

  test('Test Case 1: Verify base and existing scenarios are visible in Manage Scenarios', async ({ scenarioPage, commonFunctions }) => {
    baseScenario = await scenarioPage.getBaseScenario();
    await scenarioPage.clickResetButton();
    const privateScenarioVisible = await scenarioPage.isScenarioVisible(privateScenarioName, getTimeout('XLARGE'));
    const publicScenarioVisible = await scenarioPage.isScenarioVisible(publicScenarioName, getTimeout('XLARGE'));

    await commonFunctions.compareTwoValues(privateScenarioVisible, true, `Private scenario ${privateScenarioName} exists`);
    await commonFunctions.compareTwoValues(publicScenarioVisible, true, `Public scenario ${publicScenarioName} exists`);
    expect(privateScenarioVisible && publicScenarioVisible && !!baseScenario).toBe(true);
  });

  test('Test Case 2: Set private scenario as default and verify in Manage Scenarios', async ({ scenarioPage, commonFunctions }) => {
    expect(await setDefaultInManageScenarios(scenarioPage, commonFunctions, privateScenarioName)).toBe(true);
  });

  test('Test Case 3: Set public scenario as default and verify in Manage Scenarios', async ({ scenarioPage, commonFunctions }) => {
    expect(await setDefaultInManageScenarios(scenarioPage, commonFunctions, publicScenarioName)).toBe(true);
  });

  test('Test Case 4: Set base scenario as default and verify in Manage Scenarios', async ({ scenarioPage, commonFunctions }) => {
    expect(await setDefaultInManageScenarios(scenarioPage, commonFunctions, baseScenario)).toBe(true);
  });

  test('Test Case 5: Repeat default workflow in Scenario component and verify', async ({ planningPage, scenarioPage, commonFunctions }) => {
    await scenarioPage.closeManageScenarios();
    await planningPage.openComponent('Scenarios');

    const results: boolean[] = [];
    for (const [label, scenarioName] of [['Private child', privateScenarioName], ['Public child', publicScenarioName], ['Base', baseScenario]]) {
      const isSet = await scenarioPage.setDefaultScenarioInScenarioComponent(scenarioName);
      await planningPage.clickApply();
      await planningPage.openComponent('Scenarios');
      const isDefault = await scenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(scenarioName);
      results.push(await commonFunctions.compareTwoValues(isSet && isDefault, true, `${label} scenario ${scenarioName} is default in Scenario component`));
    }

    await planningPage.clickManageScenarios();
    await scenarioPage.clickResetButton();
    results.push(await commonFunctions.compareTwoValues(await isDefaultInManageScenarios(scenarioPage, baseScenario), true, `Base scenario ${baseScenario} remains default in Manage Scenarios`));
    expect(results.every(Boolean)).toBe(true);
  });
});
