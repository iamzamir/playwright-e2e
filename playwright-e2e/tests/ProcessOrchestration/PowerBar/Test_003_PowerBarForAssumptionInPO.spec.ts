import { test, expect } from '../../../configs/fixtures';

test.describe.serial('PowerBar in ProcessOrchestration for Assumption - PO', () => {
  let USER_NAME: string;

  test.beforeAll(async () => {
    // Built at runtime: a literal FUNCTIONAL_TEST_USERNAME2 would make the auth fixture preload
    // user2 storage state for every environment, including INTEROP which runs as user1.
    USER_NAME = process.env.PSENV === 'QA'
      ? process.env['FUNCTIONAL_TEST_USERNAME' + '2'] as string
      : process.env.FUNCTIONAL_TEST_USERNAME as string;
  });

  test(`Test Case 1: Verify powerbar details in assumption details page`, async ({ testUtil, assumptionPage, powerBarPage, commonFunctions, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, USER_NAME, process.env.FUNCTIONAL_TEST_PASSWORD, process.env.POLINK as string);
    await assumptionPage.goToAssumptionDetailsPage(testData.PROCESS_NAME, testData.ASSUMPTION.ASSUMPTION_NAME);
    const validation = await powerBarPage.verifyPowerBarDetails('Assumption', testData.PROCESS_NAME, undefined, testData.ASSUMPTION.ASSUMPTION_NAME, true);
    expect(validation).toBeTruthy();
    await commonFunctions.logMessage("INFO", "Test case 1: Powerbar details verified successfully");
  });

  test("Test Case 2: Verify process details in powerbar tooltip", async ({ powerBarPage, commonFunctions, testData }) => {
    const validation1 = await powerBarPage.verifyPowerBarToolTipDetails(testData.PROCESS_NAME, 'Assumption', undefined, testData.ASSUMPTION.ASSUMPTION_NAME);
    await commonFunctions.compareTwoValues(validation1, true, "verify process details in power bar tooltip");
    expect(validation1).toEqual(true);
    await commonFunctions.logMessage("INFO", "Test case 2: Powerbar details verified successfully in assumption page");
  });

  test("Test Case 3: Verify powerbar details in all pages", async ({ powerBarPage, commonFunctions, testData }) => {
    const validation1 = await powerBarPage.verifyPowerBarDetailsInAllPages(testData.QUICK_LINKS, 'Assumption', testData.PROCESS_NAME, undefined, testData.ASSUMPTION.ASSUMPTION_NAME);
    await commonFunctions.compareTwoValues(validation1, true, "verify process details in power bar");
    expect(validation1).toEqual(true);
    await commonFunctions.logMessage("INFO", "Test case 3: Powerbar details verified successfully in all pages");
  });

  test('Test Case 4: Verify process tooltip details in assumption details page for powerbar', async ({ powerBarPage, commonFunctions, testData }) => {
    const bValidation2 = await powerBarPage.verifyPowerBarEntityToolTipDetails('ASSUMPTION', testData.PROCESS_NAME, undefined, testData.ASSUMPTION.ASSUMPTION_NAME);
    await commonFunctions.compareTwoValues(bValidation2, true, "verify process details in power bar tooltip");
    await commonFunctions.logMessage("INFO", "Test case 4: Powerbar details in process tooltip verified successfully for assumption");
  });

  test('Test Case 5: verify navigating to process summary page on click of process if context is assumption', async ({ powerBarPage, commonFunctions, testData }) => {
    const validation1 = await powerBarPage.verifyNavigationOnClickOfEntityChipInPo('PROCESS', testData.PROCESS_NAME, undefined, testData.ASSUMPTION.ASSUMPTION_NAME);
    await commonFunctions.compareTwoValues(validation1, true, "verify navigation to process summary page on click of process in power bar");
    expect(validation1).toEqual(true);
    await commonFunctions.logMessage("INFO", "Test case 5: Navigation to process summary page on click of process in power bar verified successfully for assumption");
  });
});


