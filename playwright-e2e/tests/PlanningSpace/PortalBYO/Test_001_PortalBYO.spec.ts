import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Portal BYO', () => {
  test.beforeAll(async ({ testUtil, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
  });

  test('Test Case 1: Verify Portal BYO icon exists', async ({ planningPage, commonFunctions, page }) => {
    await page.waitForTimeout(5000);
    const portalBYOIcon = await planningPage.verifyPortalBYOICon();
    await commonFunctions.compareTwoValues(portalBYOIcon, true, 'Is Portal BYO icon displayed');
    expect(portalBYOIcon).toBeTruthy();
  });

  test('Test Case 2: Verify selected event is executed from selected agent', async ({ planningPage, testData, page }) => {
    await planningPage.clickPortalBYOIcon();
    await planningPage.initiateBYOAgentEvent(testData.AGENT_NAME, testData.EVENT_NAME);
    await page.waitForTimeout(5000);
    const validation = await planningPage.verifyAlertMsg('Applying your changes...');
    expect(validation).toBeTruthy();
  });
});
