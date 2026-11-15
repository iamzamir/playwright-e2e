import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/PowerBar/Test_001_PowerBarForProcess.json");

describe("PowerBar Details for Process - Planning Space", () => {
  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
  });

  it("Test Case 1: Verify powerbar details", async () => {
    const validation1 = await PlanningSpace.verifyPowerBarDetails('Process', TestData.PROCESS_NAME);
    await CommonFunctions.compareTwoValues(validation1, true, "verify process details in power bar tooltip");
    expect(validation1).toEqual(true);
    await CommonFunctions.logMessage("INFO", "Test case 1: Powerbar details verified successfully"); 
  });

  it("Test Case 2: Verify scope chip click opens scope tab", async () => {
    await browser.pause(5000);
    const validation1 = await PlanningSpace.verifyPowerBarScopeChipClick();
    await CommonFunctions.compareTwoValues(validation1, true, "scope chip click opens scope tab");
    expect(validation1).toEqual(true); 
    await CommonFunctions.logMessage("INFO", "Test case 2: scope chip in Powerbar verified successfully");
  })

  it("Test Case 3: Verify scenario chip click opens scope tab", async () => {
    const validation1 = await PlanningSpace.verifyPowerBarScenarioChipClick();
    await CommonFunctions.compareTwoValues(validation1, true, "scope chip click opens scope tab");
    expect(validation1).toEqual(true); 
    await CommonFunctions.logMessage("INFO", "Test case 3: scenario chip in Powerbar verified successfully");
  })

  it("Test Case 4: Verify process details in power tooltip", async () => {
    const validation1 = await PlanningSpace.verifyPowerBarToolTipDetails(TestData.PROCESS_NAME,'Process');
    await CommonFunctions.compareTwoValues(validation1, true, "verify process details in power bar tooltip");
    expect(validation1).toEqual(true); 
    await CommonFunctions.logMessage("INFO", "Test case 4: Powerbar tool tip details verified successfully");
  })
});
