import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Verify Last Accessed SubProcess in PS and PO', () => {
  const url = process.env.LUMINATE_PORTAL_URL as string + process.env.PSLINK as string;

  test.beforeAll(async ({ testUtil, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.PSLINK as string);
  });

  test('Test Case 1: Verify last accessed subprocess should be launched from the App catalog planning module', async ({ testUtil, planningListingPage, planningPage, commonFunctions, testData, page }) => {
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Subprocess', testData.PROCESS1, testData.SUBPROCESS);
    await testUtil.signOut();
    await page.goto(url);
    await testUtil.signInAgainAfterSignOut(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);

    await expect.poll(async () => await planningPage.getLaunchedSubProcessFromPowerbar(), {
      timeout: 60000,
      message: 'Expected last accessed subprocess to be launched for planning module'
    }).toBe(testData.SUBPROCESS);

    const validation = await commonFunctions.compareTwoValues(await planningPage.getLaunchedSubProcessFromPowerbar(), testData.SUBPROCESS, 'Launched previously accessed subprocess in planning module');
    expect(validation).toEqual(true);
  });

  test('Test Case 2: Verify subprocess from process2 should be launched in Planning Space after launching from power bar', async ({ powerBarPage, testUtil, planningPage, commonFunctions, testData, page }) => {
    await powerBarPage.selectEntityFromContext({ process: testData.PROCESS2, subProcess: testData.SUBPROCESS }, false, true);
    await testUtil.signOut();
    await page.goto(url);
    await testUtil.signInAgainAfterSignOut(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);

    await expect.poll(async () => await planningPage.getLaunchedProcessFromPowerbar(), {
      timeout: 60000,
      message: 'Expected process2 to be launched after relogin'
    }).toBe(testData.PROCESS2);

    await expect.poll(async () => await planningPage.getLaunchedSubProcessFromPowerbar(), {
      timeout: 60000,
      message: 'Expected subprocess to be launched after relogin'
    }).toBe(testData.SUBPROCESS);

    const validation1 = await commonFunctions.compareTwoValues(await planningPage.getLaunchedProcessFromPowerbar(), testData.PROCESS2, 'Process matched after relogin');
    const validation2 = await commonFunctions.compareTwoValues(await planningPage.getLaunchedSubProcessFromPowerbar(), testData.SUBPROCESS, 'Subprocess matched after relogin');
    expect(validation1 && validation2).toEqual(true);
  });
  
});
