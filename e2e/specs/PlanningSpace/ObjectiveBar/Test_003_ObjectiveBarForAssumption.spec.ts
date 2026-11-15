import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ObjectiveBar/Test_003_ObjectiveBarForAssumption.json");

describe('objective bar for Assumption', () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
        await PlanningSpace.launchContext('Assumption', { origin: TestData.PROCESS_NAME, assumption: TestData.ASSUMPTION.ASSUMPTION_NAME });
        await browser.pause(5000);
      });

    it('Test Case 1: Verify objective bar details', async () => {
        await browser.pause(10000);
        const validation1 = await PlanningSpace.verifyObjectiveBarDetails();
        await CommonFunctions.compareTwoValues(validation1, true, "verify details in objective bar");
        expect(validation1).toEqual(true);
        await CommonFunctions.logMessage("INFO", "Test case 1: Objective bar details verified successfully");
    });

    it('Test Case 2: Verify objective bar if there is no data for assumption', async () => {
        await PlanningSpace.navigateToPlanningSpace();
        await PlanningSpace.launchContext('Assumption', { origin: TestData.PROCESS, assumption: TestData.ASSUMPTION.ASSUMPTION_NAME });
        await browser.pause(10000);
        const validation1 = await PlanningSpace.verifyObjectiveBarDetails();
        await CommonFunctions.compareTwoValues(validation1, false, "verify objective bar details when no data is configured");
        expect(validation1).toEqual(true);
        await CommonFunctions.logMessage("INFO", "Test case 2: Objective bar is not displayed when no data is configured successfully");
    });
})