import PlanningSpace from "../../../pageobjects/planning.page"
import CommonFunctions from "../../../util/common.util"
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/PowerBar/Test_002_PowerBarForSubProcess.json");

describe("PowerBar Details for Sub Process for new UI in PS - Planning Space", () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
        await PlanningSpace.launchContext("Sub-process", { process: TestData.PROCESS_NAME, subProcess: TestData.SUBPROCESS_NAME });
        await browser.pause(5000);
    });

    it('Test Case 1: Verify sub process tooltip details in sub process details page for power bar', async () => { 
        const isExists = await PlanningSpace.verifyBackButtonExsits();
        const bValidation2 = await CommonFunctions.compareTwoValues(isExists, false, "verify back button exists in side nav panel");
        const verifyDetails = await PlanningSpace.verifyPowerBarEntityToolTipDetails('SUBPROCESS',TestData.PROCESS_NAME, TestData.SUBPROCESS_DISPLAY_NAME)
        const bValidation3 = await CommonFunctions.compareTwoValues(verifyDetails, true, "verify process details in power bar tooltip");    
        expect(bValidation2 && bValidation3).toEqual(true);
        await CommonFunctions.logMessage("INFO", "Test case 1: Powerbar details in sub process tooltip verified successfully for sub process"); 
    })

    it('Test Case 2:verify navigating to process summary page on click of process if context is sub process', async () => {
        const verifyNavigation = await PlanningSpace.verifyNavigationOnClickOfEntityChip('PROCESS', TestData.PROCESS_NAME);
        const validation1 = await CommonFunctions.compareTwoValues(verifyNavigation, true, "verify navigation to process summary page on click of process in power bar");
        expect(validation1).toEqual(true);
        await CommonFunctions.logMessage("INFO", "Test case 2: Navigation to process summary page on click of process in power bar verified successfully for sub process");
    })
});