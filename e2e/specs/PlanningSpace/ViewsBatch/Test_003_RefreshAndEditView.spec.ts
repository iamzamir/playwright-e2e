import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';

describe('Dashboard Refresh and Edit Icon With Edit Permission', () => {

    let TestData: any;
    before(async () => {
        TestData = await CommonFunctions.testDataFile(__filename);
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    });

    it('Test Case 1: Edit & Refresh Button In View Manager exists', async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        await CommonFunctions.logMessage("INFO", "Clicking Refresh Button");
        const refreshBtn: boolean = await PlanningSpace.clickRefreshBtn()
        await browser.pause(10000);
        await CommonFunctions.logMessage("INFO", "Clicking Edit View Button");
        const editDashboarBtn: boolean = await PlanningSpace.clickEditBtn();
        await CommonFunctions.compareTwoValues(editDashboarBtn, true, "Edit button clicked successfully");
        await browser.pause(5000);
        expect(refreshBtn && editDashboarBtn).toEqual(true);
    });
});
