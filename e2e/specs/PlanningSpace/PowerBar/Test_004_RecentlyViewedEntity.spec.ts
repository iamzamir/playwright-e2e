import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/PowerBar/Test_004_RecentlyViewedEntity.json");

describe("PowerBar - recently viewed entities - Planning Space", () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    });

    it('Test Case 1: To test the recently viewed tabs for power bar', async () => {
        const verifyRecentlyViewedProcess = await PlanningSpace.verifyRecentlyViewedProcess(TestData.PROCESS_NAME, 'Process', TestData.RECENTLY_OPENED_PROCESS, TestData.IS_PLANNING_SPACE)
        let validation: boolean = await CommonFunctions.compareTwoValues(verifyRecentlyViewedProcess, true, "verify recently opened project in power bar tooltip");
        expect(validation).toEqual(true);
        await CommonFunctions.logMessage("INFO", "Test case 1: recently viewed tabs for power bar verified successfully");
    })

})