import { test, expect } from '../../../configs/fixtures';

test.describe.serial('PowerBar - context switcher - ProcessOrchestration', () => {

  test("Test Case 1: Verify context switching to a subprocess in the same tab", async ({ testUtil, processPage, powerBarPage, commonFunctions, testData }) => {
    await testUtil.launchAppFromCatalog(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME,
      process.env.FUNCTIONAL_TEST_PASSWORD,
      process.env.POLINK as string,
      false
    );
    await processPage.clickOnProcess(testData.PROCESS_NAME);
    const verifyContextSwitch = await powerBarPage.selectEntityFromContext({
      process: testData.PROCESS_NAME,
      subProcess: testData.SUBPROCESS_NAME,
    }, false, true);

    const validation: boolean = await commonFunctions.compareTwoValues(verifyContextSwitch, true, "verify context switch to subprocess in the same tab");
    expect(validation).toEqual(true);
    await commonFunctions.logMessage("INFO", "Test case 1: switching the context in the same tab for subprocess verified successfully");
  });

  test("Test Case 2: Verify context switching to a process in the same tab", async ({ processPage, powerBarPage, commonFunctions, testData }) => {
    await powerBarPage.clickOnListingIcon();
    await processPage.goToPOListingPageAndVerify();
    await processPage.clickOnProcess(testData.PROCESS_NAME);
    const verifyContextSwitch = await powerBarPage.selectEntityFromContext({
      process: testData.PROCESS_NAME,
    }, false, true);

    const validation: boolean = await commonFunctions.compareTwoValues(verifyContextSwitch, true, "verify context switch to process in the same tab");
    expect(validation).toEqual(true);
    await commonFunctions.logMessage("INFO", "Test case 2: switching the context in the same tab for process verified successfully");
  });

  test("Test Case 3: Verify context switching to a subprocess in a new tab", async ({ processPage, powerBarPage, commonFunctions, testData }) => {
    await powerBarPage.clickOnListingIcon();
    await processPage.goToPOListingPageAndVerify();
    await processPage.clickOnProcess(testData.PROCESS_NAME);
    const verifyContextSwitch = await powerBarPage.selectEntityFromContext({
      process: testData.PROCESS_NAME,
      subProcess: testData.SUBPROCESS_NAME,
    }, true, true);

    const validation: boolean = await commonFunctions.compareTwoValues(verifyContextSwitch, true, "verify context switch to subprocess in a new tab");
    expect(validation).toEqual(true);
    await commonFunctions.logMessage("INFO", "Test case 3: switching the context in the new tab for subprocess verified successfully");
  });

  test("Test Case 4: Verify context switching to a process in a new tab", async ({ processPage, powerBarPage, commonFunctions, testData }) => {
    await powerBarPage.clickOnListingIcon();
    await processPage.goToPOListingPageAndVerify();
    await processPage.clickOnProcess(testData.PROCESS_NAME);
    const verifyContextSwitch = await powerBarPage.selectEntityFromContext({
      process: testData.PROCESS_NAME,
    }, true, true);

    const validation: boolean = await commonFunctions.compareTwoValues(verifyContextSwitch, true, "verify context switch to process in a new tab");
    expect(validation).toEqual(true);
    await commonFunctions.logMessage("INFO", "Test case 4: switching the context in the new tab for process verified successfully");
  });
});


