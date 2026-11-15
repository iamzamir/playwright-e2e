import PlanningSpace from "../../../pageobjects/planning.page";
import ProcessPage from "../../../pageobjects/process.page";
import CommonFunctions from "../../../util/common.util";
import TestUtil from "../../../util/test.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/PowerBar/Test_001_PowerBarForProcessInPO.json");

describe("PowerBar in ProcessOrchestration for process - PO", () => {
  before(async () => {
    await TestUtil.launchAppFromCatalog(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string);
    await browser.pause(5000);
  })   

  it(`Test Case 1: Verify powerbar details in process details page`, async () => {
    await ProcessPage.clickOnProcess(TestData.PROCESS_NAME);
    await browser.pause(5000);
    let validation = await PlanningSpace.verifyPowerBarDetails( 'Process', TestData.PROCESS_NAME, undefined, undefined, true);
    expect(validation).toBeTruthy();
    await CommonFunctions.logMessage("INFO", "Test case 1: Powerbar details verified successfully");
  });

  it("Test Case 2: Verify process details in powerbar tooltip", async () => {
    const validation1 = await PlanningSpace.verifyPowerBarToolTipDetails(TestData.PROCESS_NAME,'Process');
    await CommonFunctions.compareTwoValues(validation1, true, "verify process details in power bar tooltip");
    expect(validation1).toEqual(true); 
    await CommonFunctions.logMessage("INFO", "Test case 2: Powerbar tooltip details verified successfully");
  })

  it("Test Case 3: Verify powerbar details in all pages", async () => {
    await browser.pause(5000);
    const validation1 = await PlanningSpace.verifyPowerBarDetailsInAllPages(TestData.QUICK_LINKS, 'Process', TestData.PROCESS_NAME);
    await CommonFunctions.compareTwoValues(validation1, true, "verify process details in power bar");
    expect(validation1).toEqual(true);
    await CommonFunctions.logMessage("INFO", "Test case 3: Powerbar details verified successfully in all pages");
  });
});
