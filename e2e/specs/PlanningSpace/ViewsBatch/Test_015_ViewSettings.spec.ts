import GlobalSettings from '../../../pageobjects/global-settings.page';
import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ViewsBatch/Test_015_ViewSettings.json");

describe('View Settings to change view group - Process', () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    });

    it("Test case 01: Change view group of the view", async () => {
        await CommonFunctions.logMessage("INFO", "Starting Test case 01: Change view group of the view");
        await PlanningSpace.changeViewGroupOfView(TestData.VIEW_NAME, TestData.TARGET_VIEW_GROUP);
        await PlanningSpace.clickViewsDropDown();
        const isViewGroupUpdated = await PlanningSpace.checkViewExistsWithViewGroup(TestData.TARGET_VIEW_GROUP, TestData.VIEW_NAME);
        const bValidation1 = await CommonFunctions.compareTwoValues(isViewGroupUpdated, true, "Verify view group is updated for the view");
        await PlanningSpace.closeViewsDropdown();
        const selectedView = await PlanningSpace.getSelectedViewName();
        const bValidation2 = await CommonFunctions.compareTwoValues(selectedView, TestData.VIEW_NAME, "Verify the selected view in dashboard");
        expect(bValidation1 && bValidation2).toBeTruthy();
        await CommonFunctions.logMessage("INFO", "Completed Test case 01: Change view group of the view");
    });

    it("Test case 02: Verify the view group is updated in PO", async () => {
        await CommonFunctions.logMessage("INFO", "Starting Test case 02: Verify the view group is updated in PO");
        await PlanningSpace.navToProcessOrchestration();
        await browser.pause(5000);
        await GlobalSettings.clickGlobalSettings();
        await browser.pause(5000);
        await GlobalSettings.clickGlobalSettingsListMenu('Planning Views');
        const viewExists = await PlanningSpace.verifyViewGroupInPO(TestData.TARGET_VIEW_GROUP, TestData.VIEW_NAME);
        const bValidation = await CommonFunctions.compareTwoValues(viewExists, true, `Verify view: ${TestData.TARGET_VIEW_GROUP} exists under view group: ${TestData.VIEW_NAME}`);
        expect(bValidation).toBeTruthy();
        await CommonFunctions.logMessage("INFO", "Completed Test case 02: Verify the view group is updated in PO");
    });

    it("Test case 03: Change the view to source view group", async () => {
        await CommonFunctions.logMessage("INFO", "Starting Test case 03: Change the view to source view group");
        await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
        await browser.pause(10000);
        await PlanningSpace.switchToMfe();
        await PlanningSpace.changeViewGroupOfView(TestData.VIEW_NAME, TestData.INITIAL_VIEW_GROUP);
        await CommonFunctions.logMessage("INFO", "Completed Test case 03: Change the view to source view group");
    })
})