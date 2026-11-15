import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';
import { launchEntityContext, PlanningEntity } from '../../../util/planning-entity.util';

// Test data keys of the two scenarios each entity selects.
const entities: { name: string; entity: PlanningEntity; scenarioKeys: [string, string] }[] = [
  { name: 'Process', entity: 'Process', scenarioKeys: ['SCENARIO_NAME1', 'SCENARIO_NAME2'] },
  { name: 'Sub-process', entity: 'Subprocess', scenarioKeys: ['SUBPROCESS_SCENARIO_NAME1', 'SUBPROCESS_SCENARIO_NAME2'] },
];

// Title kept from when it covered Assumption too (removed 2026-11-09: no longer supported), so Allure history carries on.
test.describe.serial('Select Scenario in Sidenav (All Entities)', () => {
  test.beforeAll(async ({ testUtil, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
  });

  for (const { name, entity, scenarioKeys } of entities) {
    test(`${name} - Test Case 1: Check scenarios in the scenario filter`, async ({ testUtil, planningListingPage, planningPage, scenarioPage, commonFunctions, testData }) => {
      const scenarioNames = scenarioKeys.map((key) => testData[key]);
      await testUtil.navigateToPlanningListingPage();
      await launchEntityContext(planningListingPage, entity, testData);
      await planningPage.goToManageScenarios();
      await scenarioPage.waitForScenarioTable();
      await scenarioPage.clickResetButton();
      // Seeded scenarios with fixed names: recreate any that were cleared, so this spec doesn't depend on the manual DataSetup run.
      for (const scenarioName of scenarioNames) {
        if (!(await scenarioPage.isScenarioVisible(scenarioName, getTimeout('MEDIUM')))) {
          await testUtil.createChildScenarioFromBase(scenarioName, `${scenarioName} Description`);
          expect(await scenarioPage.isScenarioVisibleUnderManageScenarios(scenarioName), `${scenarioName} recreated`).toBe(true);
        }
      }
      await scenarioPage.closeManageScenarios();
      await testUtil.clickLeftpaneLinks('Planning');
      await planningPage.selectViewInPlanning(testData.VIEW_NAME);
      const isScenariosTabOpened = await commonFunctions.compareTwoValues(await planningPage.openComponent('Scenarios'), true, 'Scenarios tab clicked');
      await scenarioPage.scenarioSelect(scenarioNames, 'Check');
      await planningPage.clickApply();
      await planningPage.openComponent('Scenarios');
      // The drawer's rows render after it opens, so a single read can see an empty list.
      const isScenarioMapped = await expect.poll(() => scenarioPage.scenarioMap(scenarioNames, true), { timeout: getTimeout('XLARGE') }).toBe(true).then(() => true, () => false);
      expect(isScenariosTabOpened && isScenarioMapped).toBeTruthy();
    });

    test(`${name} - Test Case 2: Verify selected scenario is appeared`, async ({ testUtil, planningPage, scenarioPage, commonFunctions, testData }) => {
      const scenarioNames = scenarioKeys.map((key) => testData[key]);
      await testUtil.clickLeftpaneLinks('Action Items');
      await testUtil.clickLeftpaneLinks('Planning');
      const isScenariosTabOpened = await commonFunctions.compareTwoValues(await planningPage.openComponent('Scenarios'), true, 'Scenarios tab clicked');
      // Returning to Planning can close the drawer while the page reloads, so reopen it (a no-op when open) before each read.
      const isScenarioMapped = await expect.poll(async () => {
        await planningPage.openComponent('Scenarios');
        return scenarioPage.scenarioMap(scenarioNames, true);
      }, { timeout: getTimeout('XLARGE') }).toBe(true).then(() => true, () => false);
      expect(isScenariosTabOpened && isScenarioMapped).toBeTruthy();
    });

    test(`${name} - Test Case 3: Reset - UnCheck scenarios in the scenario filter`, async ({ planningPage, scenarioPage, testData }) => {
      const scenarioNames = scenarioKeys.map((key) => testData[key]);
      await scenarioPage.scenarioSelect(scenarioNames, 'Uncheck');
      await planningPage.clickApply();
      await planningPage.openComponent('Scenarios');
      await expect.poll(async () => await scenarioPage.scenarioMap(scenarioNames, true), { timeout: getTimeout('XLARGE'), message: `Expected ${name} scenarios to be unmapped after uncheck` }).toBe(false);
    });
  }
});
