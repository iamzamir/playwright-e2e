import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/fixtures';
import { registerScenario, SCENARIO_SEARCH_URL_PART } from '../../../util/scenario-cleanup.util';

// Create only since 2026-11-09: edit and delete share the Process code path (Test_002, Test_004). Title kept for Allure history.
test.describe.serial('User Should be able to create, edit, and delete child scenarios for the Subprocess', () => {
  const publicScenarioName1 = uniqueName('Subprocess_Scenario_Actions');
  let scenarioRequests: () => { authorization: string; body: string } = () => ({ authorization: '', body: '' });

  test.beforeAll(async ({ testUtil, planningListingPage, testData, scenarioPage }) => {
    scenarioRequests = scenarioPage.trackApiRequests(SCENARIO_SEARCH_URL_PART);
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Subprocess', testData.PROCESS_NAME, testData.SUBPROCESS_NAME);
  });

  test('Test Case 1: Create Child Scenario', async ({ testUtil, testData, createdEntities }) => {
    // Registered before the create: a failure after submit can still leave the scenario ("not found" is a clean delete).
    registerScenario(createdEntities, publicScenarioName1, testData.PROCESS_NAME, scenarioRequests());
    const validation1 = await testUtil.createChildScenarioFromProcedure('Create Scenario', publicScenarioName1, `${publicScenarioName1} Description`, 'Public', 'Uncheck');
    expect(validation1).toEqual(true);
  });

  test.afterAll('Cleanup: delete the scenario this file created', async ({ createdEntities }) => {
    const { failed } = await createdEntities.cleanupFile();
    expect(failed.map((entity) => entity.name), 'Scenario API cleanup must succeed').toEqual([]);
  });
});
