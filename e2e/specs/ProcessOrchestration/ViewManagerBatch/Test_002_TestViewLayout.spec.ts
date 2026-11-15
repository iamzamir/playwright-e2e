import GlobalSettings from "../../../pageobjects/global-settings.page";
import ProcessPage from "../../../pageobjects/process.page";
import CommonFunctions from "../../../util/common.util";
import TestUtil from "../../../util/test.util";
import PlanningSpace from "../../../pageobjects/planning.page";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/ViewManagerBatch/Test_001_MapPlanningViewToViewGroup.json");

// const random_name = 1872;
const random_name = Math.floor(1000 + Math.random() * 9000);
const viewGroup = "View Group Test" + " " + random_name;
const viewName = "View Name Test" + " " + random_name;
describe(`Map planning views to view group in PO`, async () => {

    before(async () => {
        await TestUtil.launchAppFromCatalog(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string);
        await browser.pause(5000);
    })

    it(`Test Case 1: Create a ${viewGroup} View Group` ,async () => {
        await GlobalSettings.clickGlobalSettings();
        await browser.pause(3000);
        await GlobalSettings.clickGlobalSettingsListMenu('View Groups');
        await GlobalSettings.createViewGroup(viewGroup);
        const bValidation1 = await CommonFunctions.compareTwoValues( await ProcessPage.alertMsg('Successfully created view group'), true, `Is ${viewGroup} view group created`);
        expect(bValidation1).toBeTruthy();
    });

    it(`Test Case 2: Create a ${viewName} planning view`, async () => {
        await GlobalSettings.clickGlobalSettingsListMenu('Planning Views');
        await GlobalSettings.clickOnPlus("Create View");
        await GlobalSettings.setViewName(viewName);
        await GlobalSettings.selectViewGroup(viewGroup);
        await GlobalSettings.verifyLayout('row');
        await GlobalSettings.clickOnPrimaryAction();
        const bValidation1 = await CommonFunctions.compareTwoValues( await ProcessPage.alertMsg('success'), true, `Is ${viewName} view created`);
        expect(bValidation1).toBeTruthy();
    });

    it(`Test Case 3: Verfify if layout section is disabled and the correct layout is selected in ${viewName} planning view`, async () => {
        await browser.pause(5000);
        await GlobalSettings.verifySelectedLayout(viewName);
    });

    it(`Test Case 5: Delete ${viewName} planning view`, async () => {
        await GlobalSettings.deleteView(viewName);
        const bValidation1 = await CommonFunctions.compareTwoValues( await ProcessPage.alertMsg('success'), true, `Is ${viewGroup} view deleted `);
        expect(bValidation1).toBeTruthy();
    });

    it(`Test Case 6: Delete ${viewGroup} view group`, async () => {
        await GlobalSettings.clickGlobalSettingsListMenu('View Groups');
        await GlobalSettings.deleteViewGroup(viewGroup);
        const bValidation1 = await CommonFunctions.compareTwoValues( await ProcessPage.alertMsg('Successfully deleted view group'), true, `Is ${viewGroup} view  group deleted `);
        expect(bValidation1).toBeTruthy();
    });
})