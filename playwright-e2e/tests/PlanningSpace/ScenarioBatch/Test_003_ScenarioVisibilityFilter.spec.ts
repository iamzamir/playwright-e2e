import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';
import { launchEntityContext, PlanningEntity } from '../../../util/planning-entity.util';

/**
 * Real E2E for scenario visibility (plan T9.5): a private child scenario is listed for its owner and hidden from
 * another user. The Private/Public/All filter permutations run against recorded data in
 * tests/PlanningSpace/Mocked/ScenarioBatch/Test_003_ScenarioVisibilityFilterMocked.spec.ts.
 */
const entities: { name: string; entity: PlanningEntity; privateScenarioName: string }[] = [
  { name: 'Process', entity: 'Process', privateScenarioName: 'test_private_scenario_do_not_delete' },
  { name: 'Subprocess', entity: 'Subprocess', privateScenarioName: 'test_private_scenario_do_not_delete' },
];

// Title kept from when it covered Assumption too (dropped 2026-10-27: no longer supported), so Allure history carries on.
test.describe.serial('Scenario Visibility Filter (All Entities)', () => {
  test.beforeAll(async ({ testUtil, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.PSLINK as string);
  });

  entities.forEach(({ name, entity, privateScenarioName }) => {
    test(`${name} - Test Case 1: Create a private child scenario`, async ({ testUtil, planningListingPage, planningPage, scenarioPage, commonFunctions, testData }) => {
      await testUtil.navigateToPlanningListingPage();
      await launchEntityContext(planningListingPage, entity, testData);
      await planningPage.goToManageScenarios();
      if (!(await scenarioPage.isScenarioVisible(privateScenarioName, getTimeout('SHORT')))) {
        const baseScenario = await scenarioPage.getBaseScenario();
        await scenarioPage.tableActionClick(baseScenario, 'Create Child Scenario');
        await scenarioPage.createChildScenario(privateScenarioName, `${privateScenarioName} Description`, 'Private', 'Uncheck');
      }

      await scenarioPage.clickResetButton();
      const validation = await commonFunctions.compareTwoValues(await scenarioPage.isScenarioVisible(privateScenarioName, getTimeout('EXTREME')), true, `Private scenario - ${privateScenarioName} listed for its owner`);
      expect(validation).toBe(true);
    });
  });

  test('Test Case 2: Private child scenarios are hidden from another user', async ({ testUtil, planningListingPage, planningPage, scenarioPage, commonFunctions, testData }) => {
    await testUtil.signOutAndLoginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    const results: boolean[] = [];
    for (const { name, entity, privateScenarioName } of entities) {
      await testUtil.navigateToPlanningListingPage();
      await launchEntityContext(planningListingPage, entity, testData);
      await planningPage.goToManageScenarios();
      await scenarioPage.clickResetButton();
      // The Base scenario proves the list loaded, so "hidden" can't pass on an empty table.
      const isBaseListed = await expect.poll(async () => scenarioPage.getBaseScenario(), { timeout: getTimeout('LONG') }).not.toEqual('').then(() => true, () => false);
      results.push(await commonFunctions.compareTwoValues(isBaseListed, true, `${name}: Base scenario listed for user2`));
      results.push(await commonFunctions.compareTwoValues(await scenarioPage.isScenarioVisible(privateScenarioName, getTimeout('MEDIUM')), false, `${name}: private scenario ${privateScenarioName} hidden from user2`));
    }
    expect(results.every(Boolean)).toBe(true);
  });
});
