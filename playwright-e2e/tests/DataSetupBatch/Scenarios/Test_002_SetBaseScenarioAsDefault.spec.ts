import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Set Base Scenario as Default Before Test Suite runs', () => {
  test('Test Case 1: Set Base Scenario as Default', async ({ testUtil, testData, page, commonFunctions }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await page.waitForTimeout(2000);
    const baseScenario = await testUtil.setBaseAsDefaultScenario();
    const validation = await commonFunctions.compareTwoValues(baseScenario !== '', true, 'Base scenario should be available and set as default');
    expect(validation).toBeTruthy();
  });
});
