import { test, expect } from '../../../configs/fixtures';

test.describe.serial('PowerBar in ProcessOrchestration for process - PO', () => {
  let USER_NAME: string;

  test.beforeAll(async () => {
    // Built at runtime: a literal FUNCTIONAL_TEST_USERNAME2 would make the auth fixture preload
    // user2 storage state for every environment, including INTEROP which runs as user1.
    USER_NAME = process.env.PSENV === 'QA'
      ? process.env['FUNCTIONAL_TEST_USERNAME' + '2'] as string
      : process.env.FUNCTIONAL_TEST_USERNAME as string;
  });

  test(`Test Case 1: Verify powerbar details in process details page`, async ({ testUtil, processPage, powerBarPage, commonFunctions, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, USER_NAME, process.env.FUNCTIONAL_TEST_PASSWORD, process.env.POLINK as string);
    await processPage.clickOnProcess(testData.PROCESS_NAME);
    const validation = await powerBarPage.verifyPowerBarDetails('Process', testData.PROCESS_NAME, undefined, undefined, true);
    expect(validation).toBeTruthy();
    await commonFunctions.logMessage("INFO", "Test case 1: Powerbar details verified successfully");
  });

  test("Test Case 2: Verify process details in powerbar tooltip", async ({ powerBarPage, commonFunctions, testData }) => {
    const validation1 = await powerBarPage.verifyPowerBarToolTipDetails(testData.PROCESS_NAME, 'Process');
    await commonFunctions.compareTwoValues(validation1, true, "verify process details in power bar tooltip");
    expect(validation1).toEqual(true);
    await commonFunctions.logMessage("INFO", "Test case 2: Powerbar tooltip details verified successfully");
  });

  test("Test Case 3: Verify powerbar details in all pages", async ({ powerBarPage, commonFunctions, testData }) => {
    const validation1 = await powerBarPage.verifyPowerBarDetailsInAllPages(testData.QUICK_LINKS, 'Process', testData.PROCESS_NAME);
    await commonFunctions.compareTwoValues(validation1, true, "verify process details in power bar");
    expect(validation1).toEqual(true);
    await commonFunctions.logMessage("INFO", "Test case 3: Powerbar details verified successfully in all pages");
  });
});

