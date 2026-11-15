import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';
import { launchEntityContext, PlanningEntity } from '../../../util/planning-entity.util';

/**
 * Real E2E golden path for the Created By filter (plan T9.5): create a private child as the current user, then filter by
 * that user. Sub-process permutations run against recorded data in
 * tests/PlanningSpace/Mocked/ScenarioBatch/Test_006_ScenarioUsersFilterMocked.spec.ts; Assumption is no longer supported.
 */
const entities: { name: string; entity: PlanningEntity; privateScenarioName: string }[] = [
  { name: 'Process', entity: 'Process', privateScenarioName: 'test_private_scenario_do_not_delete' },
];

// Title kept from when it covered every context, so Allure history carries on.
test.describe.serial('Scenario Users Filter (All Entities)', () => {
  test.beforeAll(async ({ testUtil, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
  });

  entities.forEach(({ name, entity, privateScenarioName }) => {
    let currentLoginUser = '';
    let userAvatar = '';

    test(`${name} - Test Case 1: Verify user login`, async ({ testUtil, planningListingPage, planningPage, scenarioPage, commonFunctions, testData }) => {
      await testUtil.navigateToPlanningListingPage();
      await launchEntityContext(planningListingPage, entity, testData);
      await planningPage.goToManageScenarios();
      const user = await scenarioPage.getCurrentLoginUserName();
      userAvatar = testData.USER_AVATAR || user;
      currentLoginUser = testData.LOGGEDIN_USER || user;
      const validation = await commonFunctions.compareTwoValues(user, userAvatar, 'Is user exist');
      expect(validation).toBe(true);
    });

    test(`${name} - Test Case 2: Create a private child scenario`, async ({ scenarioPage, commonFunctions }) => {
      if (!(await scenarioPage.isScenarioVisible(privateScenarioName, getTimeout('SHORT')))) {
        const baseScenario = await scenarioPage.getBaseScenario();
        await scenarioPage.tableActionClick(baseScenario, 'Create Child Scenario');
        await scenarioPage.createChildScenario(privateScenarioName, `${privateScenarioName} Description`, 'Private', 'Uncheck');
      }

      await scenarioPage.clickResetButton();
      const isListed = await scenarioPage.isScenarioVisible(privateScenarioName, getTimeout('EXTREME'));
      const validation = await commonFunctions.compareTwoValues(isListed, true, `Child Scenario ${privateScenarioName} Created Assertion`);
      expect(validation).toBe(true);
    });

    test(`${name} - Test Case 3: Verify created child scenario is by correct user`, async ({ scenarioPage, commonFunctions }) => {
      const validation = await scenarioPage.verifyScenarioCreatedByUser(userAvatar, privateScenarioName, 'Created By');
      await commonFunctions.compareTwoValues(validation, true, `${privateScenarioName} scenario is created by ${userAvatar}`);
      expect(validation).toBe(true);
    });

    test(`${name} - Test Case 4: Verify users filter`, async ({ scenarioPage, commonFunctions }) => {
      await scenarioPage.clickResetButton();
      await scenarioPage.selectOrUnselectFilter('Created By', currentLoginUser);
      await scenarioPage.clickApplyFilters();
      // The table refreshes after Apply, so poll until every row is by the logged-in user.
      const validation = await expect.poll(() => scenarioPage.verifyUserFilterApplied([userAvatar]), { timeout: getTimeout('LONG') })
        .toBe(true).then(() => true, () => false);
      await commonFunctions.compareTwoValues(validation, true, `Fetched scenarios for the ${userAvatar}`);
      expect(validation).toBe(true);
      await scenarioPage.clickResetButton();
      await scenarioPage.clickApplyFilters();
    });
  });
});
