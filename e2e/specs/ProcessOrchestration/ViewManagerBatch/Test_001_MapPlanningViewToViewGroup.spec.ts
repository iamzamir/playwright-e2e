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
        await GlobalSettings.createPlanningView(viewName,viewGroup);
        const bValidation1 = await CommonFunctions.compareTwoValues( await ProcessPage.alertMsg('success'), true, `Is ${viewName} view created`);
        expect(bValidation1).toBeTruthy();
    });

    it(`Test Case 3: Edit a ${viewName} planning view`, async () => {
        await browser.pause(5000);
        await GlobalSettings.editView(viewName, viewGroup);
        const bValidation1 = await CommonFunctions.compareTwoValues( await ProcessPage.alertMsg('success'), true, `Is ${viewGroup} view edited `);
        expect(bValidation1).toBeTruthy();
    });

    it(`Test Case 4: Map ${viewName} to process ${TestData.PROCESS_NAME}`, async () => {
        await GlobalSettings.clickGlobalSettingsListMenu('Process');
        await browser.pause(2000);
        await GlobalSettings.selectProcess(TestData.PROCESS_NAME);
        await browser.pause(5000);
        await CommonFunctions.logMessage('INFO', `Selected process ${TestData.PROCESS_NAME}`)
        let isViewMapSuccess: boolean = await GlobalSettings.addViewMappingToEntity(TestData.PROCESS_NAME, [viewName]);
        await CommonFunctions.compareTwoValues(isViewMapSuccess, true, 'View Mapping Save Assertion for Process');
        expect(isViewMapSuccess).toBeTruthy();
    });

    it(`Verify ${viewName} changes in Planning`, async () => {
        await browser.pause(2000);
        await browser.newWindow(process.env.NAVIGATE_TO_PLANNING_SPACE as string);
        await CommonFunctions.logMessage('INFO', `Navigated to Planning process ${TestData.PROCESS_NAME} in a new tab`)
        await PlanningSpace.switchToMFEFrame();
        await browser.pause(5000);
        await PlanningSpace.launchContext('Process', { process: TestData.PROCESS_NAME });
        await browser.pause(5000);
        const isViewGroupModified = await PlanningSpace.checkViewExistsWithViewGroup(viewGroup, viewName);
        await CommonFunctions.compareTwoValues(isViewGroupModified, true, `Is view ${viewName} exist under viewgroup ${viewGroup}`)
        expect(isViewGroupModified).toBeTruthy();
    })

    it(`Test Case 5: Delete ${viewName} planning view`, async () => {
        await browser.pause(2000);
        await CommonFunctions.switchToSpecificWindow(0);
        await browser.pause(5000);
        await PlanningSpace.switchToMFEFrame();
        await browser.pause(5000);
        await GlobalSettings.clickGlobalSettingsListMenu('Planning Views');
        await browser.pause(5000);
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