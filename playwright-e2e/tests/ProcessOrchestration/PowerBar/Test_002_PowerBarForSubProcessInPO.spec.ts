import { test, expect } from '../../../configs/fixtures';

test.describe.serial('PowerBar in ProcessOrchestration for subprocess - PO', () => {

  test(`Test Case 1: Verify powerbar details in sub process details page`, async ({ testUtil, processPage, powerBarPage, commonFunctions, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2, process.env.FUNCTIONAL_TEST_PASSWORD, process.env.POLINK as string);
    await processPage.goToSubProcessDetailsPage(testData.PROCESS_NAME, testData.SUB_PROCESS_NAME);
    const validation = await powerBarPage.verifyPowerBarDetails('Sub-process', testData.PROCESS_NAME, testData.SUB_PROCESS_NAME, undefined, true);
    expect(validation).toBeTruthy();
    await commonFunctions.logMessage("INFO", "Test case 1: Powerbar details verified successfully");
  });

  test("Test Case 2: Verify sub process details in powerbar tooltip", async ({ powerBarPage, commonFunctions, testData }) => {
    const validation1 = await powerBarPage.verifyPowerBarToolTipDetails(testData.PROCESS_NAME, 'Process', testData.SUB_PROCESS_NAME);
    await commonFunctions.compareTwoValues(validation1, true, "verify process details in power bar tooltip");
    expect(validation1).toEqual(true);
    await commonFunctions.logMessage("INFO", "Test case 2: Powerbar details verified successfully for sub process");
  });

  test("Test Case 3: Verify powerbar details in all pages for sub process", async ({ powerBarPage, commonFunctions, testData }) => {
    const validation1 = await powerBarPage.verifyPowerBarDetailsInAllPages(testData.QUICK_LINKS, 'Sub-process', testData.PROCESS_NAME, testData.SUB_PROCESS_NAME);
    await commonFunctions.compareTwoValues(validation1, true, "verify process details in power bar");
    expect(validation1).toEqual(true);
    await commonFunctions.logMessage("INFO", "Test case 3: Powerbar details verified successfully for sub process in all pages");
  });

  test('Test Case 4: Verify process tooltip details in sub process details page for powerbar', async ({ powerBarPage, commonFunctions, testData }) => {
    const bValidation2 = await powerBarPage.verifyPowerBarEntityToolTipDetails('SUBPROCESS', testData.PROCESS_NAME, testData.SUB_PROCESS_NAME);
    await commonFunctions.compareTwoValues(bValidation2, true, "verify process details in power bar tooltip");
    await commonFunctions.logMessage("INFO", "Test case 4: Powerbar details in process tooltip verified successfully for sub process");
  });

  test('Test Case 5: verify navigating to process summary page on click of process if context is sub process', async ({ powerBarPage, commonFunctions, testData }) => {
    const validation1 = await powerBarPage.verifyNavigationOnClickOfEntityChipInPo('PROCESS', testData.PROCESS_NAME, testData.SUB_PROCESS_NAME);
    await commonFunctions.compareTwoValues(validation1, true, "verify navigation to process summary page on click of process in power bar");
    expect(validation1).toEqual(true);
    await commonFunctions.logMessage("INFO", "Test case 5: Navigation to process summary page on click of process in power bar verified successfully for sub process");
  });
});


