import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
import TestUtil from "../../../util/test.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/PowerBar/Test_003_PowerBarForAssumptionInPO.json");

describe("PowerBar in ProcessOrchestration for Assumption - PO", () => {
  before(async () => {
    await TestUtil.launchAppFromCatalog(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string);
    await browser.pause(5000);
  })   

  it(`Test Case 1: Verify powerbar details in assumption details page`, async () => {
    await PlanningSpace.goToAssumptionDetailsPage(TestData.PROCESS_NAME,TestData.ASSUMPTION.ASSUMPTION_NAME)
    await browser.pause(5000);
    let validation = await PlanningSpace.verifyPowerBarDetails( 'Assumption', TestData.PROCESS_NAME, undefined, TestData.ASSUMPTION.ASSUMPTION_NAME,true);
    expect(validation).toBeTruthy();
    await CommonFunctions.logMessage("INFO", "Test case 1: Powerbar details verified successfully");
  });

  it("Test Case 2: Verify process details in powerbar tooltip", async () => {
    const validation1 = await PlanningSpace.verifyPowerBarToolTipDetails(TestData.PROCESS_NAME,'Assumption', undefined, TestData.ASSUMPTION.ASSUMPTION_NAME);
    await CommonFunctions.compareTwoValues(validation1, true, "verify process details in power bar tooltip");
    expect(validation1).toEqual(true); 
    await CommonFunctions.logMessage("INFO", "Test case 2: Powerbar details verified successfully in assumption page");
  })

  it("Test Case 3: Verify powerbar details in all pages", async () => {
    await browser.pause(5000);
    const validation1 = await PlanningSpace.verifyPowerBarDetailsInAllPages(TestData.QUICK_LINKS, 'Assumption', TestData.PROCESS_NAME, undefined, TestData.ASSUMPTION.ASSUMPTION_NAME);
    await CommonFunctions.compareTwoValues(validation1, true, "verify process details in power bar");
    expect(validation1).toEqual(true);
    await CommonFunctions.logMessage("INFO", "Test case 3: Powerbar details verified successfully in all pages");
  });

  it('Test Case 4: Verify process tooltip details in assumption details page for powerbar', async () => {
    const bValidation2 = await PlanningSpace.verifyPowerBarEntityToolTipDetails('ASSUMPTION',TestData.PROCESS_NAME,undefined, TestData.ASSUMPTION.ASSUMPTION_NAME)
    await CommonFunctions.compareTwoValues(bValidation2, true, "verify process details in power bar tooltip");
    await CommonFunctions.logMessage("INFO", "Test case 4: Powerbar details in process tooltip verified successfully for assumption"); 
  });
  
  it('Test Case 5: verify navigating to process summary page on click of process if context is assumption', async () => {
    const validation1 = await PlanningSpace.verifyNavigationOnClickOfEntityChipInPo('PROCESS', TestData.PROCESS_NAME,undefined, TestData.ASSUMPTION.ASSUMPTION_NAME);
    console.log('validation1', validation1);
    await CommonFunctions.compareTwoValues(validation1, true, "verify navigation to process summary page on click of process in power bar");
    expect(validation1).toEqual(true);
    await CommonFunctions.logMessage("INFO", "Test case 5: Navigation to process summary page on click of process in power bar verified successfully for assumption");
  });
});
