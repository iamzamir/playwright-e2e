import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
import TestUtil from "../../../util/test.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/PowerBar/Test_002_PowerBarForSubProcessInPO.json");

describe("PowerBar in ProcessOrchestration for subprocess - PO", () => {
  before(async () => {
    await TestUtil.launchAppFromCatalog(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string);
    await browser.pause(5000);
  })   

  it(`Test Case 1: Verify powerbar details in sub process details page`, async () => {
    await PlanningSpace.goToSubProcessDetailsPage(TestData.PROCESS_NAME,TestData.SUB_PROCESS_NAME)
    await browser.pause(3000);
    let validation = await PlanningSpace.verifyPowerBarDetails( 'Sub-process', TestData.PROCESS_NAME, TestData.SUB_PROCESS_NAME,undefined,true);
    expect(validation).toBeTruthy();
    await CommonFunctions.logMessage("INFO", "Test case 1: Powerbar details verified successfully");
  });

  it("Test Case 2: Verify sub process details in powerbar tooltip", async () => {
    const validation1 = await PlanningSpace.verifyPowerBarToolTipDetails(TestData.PROCESS_NAME, 'Process', TestData.SUB_PROCESS_NAME)
    await CommonFunctions.compareTwoValues(validation1, true, "verify process details in power bar tooltip");
    expect(validation1).toEqual(true);
    await CommonFunctions.logMessage("INFO", "Test case 2: Powerbar details verified successfully for sub process"); 
  })

  it("Test Case 3: Verify powerbar details in all pages for sub process", async () => {
    await browser.pause(5000);
    const validation1 = await PlanningSpace.verifyPowerBarDetailsInAllPages(TestData.QUICK_LINKS, 'Sub-process', TestData.PROCESS_NAME, TestData.SUB_PROCESS_NAME);
    await CommonFunctions.compareTwoValues(validation1, true, "verify process details in power bar");
    expect(validation1).toEqual(true); 
    await CommonFunctions.logMessage("INFO", "Test case 3: Powerbar details verified successfully for sub process in all pages"); 
  });

  it('Test Case 4: Verify process tooltip details in sub process details page for powerbar', async () => {
    const bValidation2 = await PlanningSpace.verifyPowerBarEntityToolTipDetails('SUBPROCESS',TestData.PROCESS_NAME, TestData.SUB_PROCESS_NAME)
    await CommonFunctions.compareTwoValues(bValidation2, true, "verify process details in power bar tooltip");
    await CommonFunctions.logMessage("INFO", "Test case 4: Powerbar details in process tooltip verified successfully for sub process"); 
  });

  it('Test Case 5: verify navigating to process summary page on click of process if context is sub process', async () => {
    const validation1 = await PlanningSpace.verifyNavigationOnClickOfEntityChipInPo('PROCESS', TestData.PROCESS_NAME, TestData.SUB_PROCESS_NAME);
    await CommonFunctions.compareTwoValues(validation1, true, "verify navigation to process summary page on click of process in power bar");
    expect(validation1).toEqual(true);
    await CommonFunctions.logMessage("INFO", "Test case 5: Navigation to process summary page on click of process in power bar verified successfully for sub process");
  });
});
