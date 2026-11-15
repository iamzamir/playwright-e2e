import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/PowerBar/Test_003_PowerBarForAssumption.json");

describe("PowerBar details for Assumption - Planning Space", () => {

  before(async () => {
    await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await PlanningSpace.launchContext('Assumption', { origin: TestData.PROCESS_NAME, assumption: TestData.ASSUMPTION.ASSUMPTION_NAME });
    await browser.pause(5000);
  });

    it("Test Case 1 : verify context type for Assumption", async () => {
      await browser.pause(20000);
      const verifyContextType = await PlanningSpace.verifyContextEntity(TestData.PROCESS_NAME,TestData.ASSUMPTION.ASSUMPTION_NAME)
      let validation: boolean = await CommonFunctions.compareTwoValues(verifyContextType, true, "verify context type for Assumption Assertion");
      expect(validation).toEqual(true);
      await CommonFunctions.logMessage("INFO", "Test case 1: context type for Assumption in power bar verified successfully");
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

    it("Test Case 4: Verify Assumption details in power bar tooltip", async () => {
    const verifyPowerBarDetails = await PlanningSpace.verifyPowerBarToolTipDetails(TestData.PROCESS_NAME, "Assumption", undefined, TestData.ASSUMPTION.ASSUMPTION_NAME) 
    let validation: boolean = await CommonFunctions.compareTwoValues(verifyPowerBarDetails, true, "verify Assumption details in power bar tooltip");
    expect(validation).toEqual(true);
    await CommonFunctions.logMessage("INFO", "Test case 4: process details in Powerbar tool tip verified successfully");
    });
});
