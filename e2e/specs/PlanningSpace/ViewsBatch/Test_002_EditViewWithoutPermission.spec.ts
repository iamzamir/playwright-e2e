import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ViewsBatch/Test_002_EditViewWithoutPermission.json");
// import TestData from '../../../Testdata/PlanningSpace/ViewsBatch/Test_002_EditViewWithoutPermission.json';

describe('Edit Icon Without Edit Permission', () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME, false, false);
    });

    it('Test Case 1: Edit Should be Disabled', async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.selectAllViewsOrFavourites("All Views");
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        await CommonFunctions.logMessage("INFO", "Clicking Refresh Button");
        let refreshBtn: boolean = await PlanningSpace.clickRefreshBtn();
        await CommonFunctions.compareTwoValues(refreshBtn, true, "Refresh Button Clicked successfully");
        await browser.pause(5000);
        await CommonFunctions.logMessage("INFO", "Clicking Edit View Button");
        let editDashboarBtn = true;
        try {
            await PlanningSpace.clickEditBtn();
        }
        catch (e) {
            await CommonFunctions.logMessage("INFO", e);
            editDashboarBtn = false;
        }
        await CommonFunctions.compareTwoValues(editDashboarBtn, false, "Edit button disabled successfully");
        await browser.pause(5000);
        expect(refreshBtn && !editDashboarBtn).toEqual(true);
    });
});
