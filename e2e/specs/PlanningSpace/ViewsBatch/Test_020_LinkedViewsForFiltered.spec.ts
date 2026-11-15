import PlanningSpace from '../../../pageobjects/planning.page';
import GlobalSettings from "../../../pageobjects/global-settings.page"
import CommonFunctions from '../../../util/common.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ViewsBatch/Test_018_LinkedViewsForFiltered.json");


describe('Linked views filtered out while mapping to a process', () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
        await browser.pause(10000);
    })

    it("Test case 01: Should map new view to the process from filter", async () => {
        await PlanningSpace.navToProcessOrchestration();
        await GlobalSettings.clickGlobalSettings();
        await GlobalSettings.clickGlobalSettingsListMenu('Process');
        await GlobalSettings.selectProcess(TestData.PROCESS_NAME);
        await GlobalSettings.openViewsMappingMenu(TestData.PROCESS_NAME, 'Map With...');
        const bValidation1 = await GlobalSettings.addNewViewGroupToProcess(TestData.VIEW_GROUP_NAME);
        await GlobalSettings.clickSave();
        browser.pause(4000);
        let bValidation2: boolean = await CommonFunctions.compareTwoValues(await CommonFunctions.verifyAlertMsg('Success'), true, 'Success! Your changes have been saved');
        await expect(bValidation1 && bValidation2).toBeTruthy();
        await browser.pause(10000);
    });

    it("Test case 02: Should open the PS check ", async () => {
        await PlanningSpace.navigateToPlanningSpace();
        await PlanningSpace.launchContext("Process", { process: TestData.PROCESS_NAME });
        await browser.pause(3000);
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        await browser.pause(3000);
        const validation1 = await GlobalSettings.checkPrimaryAndSecondaryButtons(3);
        await expect(validation1).toBeTruthy();
        await browser.pause(5000);
    });

    it('Test case 03: Should open process orchestartion', async () => {
        await PlanningSpace.navToProcessOrchestration();
        await GlobalSettings.clickGlobalSettings();
        await GlobalSettings.clickGlobalSettingsListMenu('Process');
        await GlobalSettings.selectProcess(TestData.PROCESS_NAME);
        await GlobalSettings.openViewsMappingMenu(TestData.PROCESS_NAME, 'Map With...');
        const bValidation1 = await GlobalSettings.addNewViewGroupToProcess(TestData.VIEW_GROUP_NAME);
        await GlobalSettings.clickSave();
        await browser.pause(4000);
        let bValidation2: boolean = await CommonFunctions.compareTwoValues(await CommonFunctions.verifyAlertMsg('Success'), true, 'Success! Your changes have been saved');
        await expect(!bValidation1 && bValidation2).toBeTruthy();
    });
})