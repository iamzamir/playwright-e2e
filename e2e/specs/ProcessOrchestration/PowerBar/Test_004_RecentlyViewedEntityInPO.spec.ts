import PlanningSpace from "../../../pageobjects/planning.page";
import ProcessPage from "../../../pageobjects/process.page";
import CommonFunctions from "../../../util/common.util";
import TestUtil from "../../../util/test.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/PowerBar/Test_004_RecentlyViewedEntityInPO.json");

describe("PowerBar - Recently viewed tabs - PO", () => {
     before(async () => {
        await TestUtil.launchAppFromCatalog(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string);
        await browser.pause(5000);
      })  
    it('Test Case 1 : To test the recently viewed tabs for power bar', async () => {
        await ProcessPage.clickOnProcess(TestData.PROCESS_NAME);
        const verifyRecentlyViewedProcess = await PlanningSpace.verifyRecentlyViewedProcess(TestData.PROCESS_NAME,'Process',TestData.RECENTLY_OPENED_PROCESS, TestData.IS_PLANNING_SPACE);
        let validation: boolean = await CommonFunctions.compareTwoValues(verifyRecentlyViewedProcess, true, "verify recently opened project in power bar tooltip");
        expect(validation).toEqual(true);
        await CommonFunctions.logMessage("INFO", "Test case 2: recently viewed tabs for power bar verified successfully");
    })

})