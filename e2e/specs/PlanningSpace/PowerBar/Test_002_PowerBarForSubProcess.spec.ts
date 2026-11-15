import PlanningSpace from "../../../pageobjects/planning.page"
import CommonFunctions from "../../../util/common.util"
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/PowerBar/Test_002_PowerBarForSubProcess.json");

describe("PowerBar Details for sub process - Planning Space", () => {

  before(async () => {
    await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await PlanningSpace.launchContext("Sub-process", { process: TestData.PROCESS_NAME, subProcess: TestData.SUBPROCESS_NAME });
    await browser.pause(5000);
  });

  it('Test Case 1 : verify context type for sub process', async () => {
    await browser.pause(20000);
    const verifyContextType = await PlanningSpace.verifyContextEntity(TestData.PROCESS_NAME,TestData.SUBPROCESS_DISPLAY_NAME) 
    let validation: boolean = await CommonFunctions.compareTwoValues(verifyContextType, true, "verify context type for sub process Assertion");
    expect(validation).toEqual(true);
    await CommonFunctions.logMessage("INFO", "Test case 1: context type for sub process in power bar verified successfully");
  });

  it("Test Case 2: Verify scope chip click opens scope tab", async () => {
      await browser.pause(5000);
      const validation1 = await PlanningSpace.verifyPowerBarScopeChipClick();
      await CommonFunctions.compareTwoValues(validation1, true, "scope chip click opens scope tab");
      expect(validation1).toEqual(true); 
      await CommonFunctions.logMessage("INFO", "Test case 2: scope chip in Powerbar verified successfully");
  })
  
  it("Test Case 3: Verify scenario chip click opens scenario tab", async () => {
      const validation1 = await PlanningSpace.verifyPowerBarScenarioChipClick();
      await CommonFunctions.compareTwoValues(validation1, true, "scope chip click opens scope tab");
      expect(validation1).toEqual(true); 
      await CommonFunctions.logMessage("INFO", "Test case 3: scenario chip in Powerbar verified successfully");
  })

  it("Test Case 4: Verify process details in power tooltip", async () => {
      const verifyPowerBarDetails = await PlanningSpace.verifyPowerBarToolTipDetails(TestData.PROCESS_NAME,'Process',TestData.SUBPROCESS_DISPLAY_NAME)
      let validation: boolean = await CommonFunctions.compareTwoValues(verifyPowerBarDetails, true, "verify process details in power bar tooltip");
      expect(validation).toEqual(true);
      await CommonFunctions.logMessage("INFO", "Test case 4: process details in Powerbar tool tip verified successfully"); 
  });

});