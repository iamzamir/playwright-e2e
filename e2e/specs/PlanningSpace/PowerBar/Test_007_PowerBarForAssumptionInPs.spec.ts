import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/PowerBar/Test_003_PowerBarForAssumption.json");

describe("PowerBar Details for Assumption in PS - Planning Space", () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
        await PlanningSpace.launchContext('Assumption', { origin: TestData.PROCESS_NAME, assumption: TestData.ASSUMPTION.ASSUMPTION_NAME });
        await browser.pause(5000);
    });

    it('Test Case 1: Verify assumption tooltip details in assumption details page for power bar', async () => {
        const bValidation2 = await PlanningSpace.verifyBackButtonExsits();
        await CommonFunctions.compareTwoValues(bValidation2, false, "verify back button exists in side nav panel");
        const bValidation3 = await PlanningSpace.verifyPowerBarEntityToolTipDetails('ASSUMPTION', TestData.PROCESS_NAME, undefined, TestData.ASSUMPTION.ASSUMPTION_NAME)
        await CommonFunctions.compareTwoValues(bValidation3, true, "verify assumption details in assumption chip tooltip");
        expect(bValidation3).toEqual(true);
        await CommonFunctions.logMessage("INFO", "Test case 1: Powerbar details in assumption tooltip verified successfully for assumption");
    });

    it('Test Case 2:verify navigating to process summary page on click of process if context is assumption', async () => {
        await browser.pause(5000);
        const validation1 = await PlanningSpace.verifyNavigationOnClickOfEntityChip('PROCESS', TestData.PROCESS_NAME);
        await CommonFunctions.compareTwoValues(validation1, true, "verify navigation to process summary page on click of process in power bar");
        expect(validation1).toEqual(true);
        await CommonFunctions.logMessage("INFO", "Test case 2: Navigation to process summary page on click of process in power bar verified successfully for assumption");
    })

});