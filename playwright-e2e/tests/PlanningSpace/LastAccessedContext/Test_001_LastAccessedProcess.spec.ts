import { test, expect } from '../../../configs/fixtures';

// The unauthorized page after a role removal is covered by Mocked/Unauthorized/Test_001, so this spec never changes the user's IAM roles.
test.describe.serial('Verify Last Accessed Process in PS and PO', () => {
  const url = process.env.LUMINATE_PORTAL_URL as string + process.env.PSLINK as string;

  test.beforeAll(async ({ testUtil, testData, planningPage, planningListingPage }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext("Process", testData.PROCESS1);
    await expect.poll(async () => await planningPage.getLaunchedProcessFromPowerbar(), {
      timeout: 60000,
      message: 'Expected launched process chip to be visible in power bar after login'
    }).toBe(testData.PROCESS1);
  });

  test('Test Case 1: Verify process1 should be launched from the App catalog planning module', async ({ testUtil, planningPage, commonFunctions, testData, page }) => {
    await testUtil.signOut();
    await page.goto(url);
    await testUtil.signInAgainAfterSignOut(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);

    await expect.poll(async () => await planningPage.getLaunchedProcessFromPowerbar(), {
      timeout: 60000,
      message: 'Expected last accessed process to be launched for planning module'
    }).toBe(testData.PROCESS1);

    const validation = await commonFunctions.compareTwoValues(await planningPage.getLaunchedProcessFromPowerbar(), testData.PROCESS1, 'Launched previously accessed process in planning module');
    expect(validation).toEqual(true);
  });

  test('Test Case 2: Verify process2 should be launched after launching and logging out', async ({ powerBarPage, testUtil, planningPage, commonFunctions, testData, page }) => {
    await powerBarPage.selectEntityFromContext({ process: testData.PROCESS2 }, false, true);
    await testUtil.signOut();
    await page.goto(url);
    await testUtil.signInAgainAfterSignOut(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await expect.poll(async () => await planningPage.getLaunchedProcessFromPowerbar(), {
      timeout: 60000,
      message: 'Expected process2 to be launched after relogin'
    }).toBe(testData.PROCESS2);

    const validation = await commonFunctions.compareTwoValues(await planningPage.getLaunchedProcessFromPowerbar(), testData.PROCESS2, 'Launched previously accessed process after relogin');
    expect(validation).toEqual(true);
  });

});
