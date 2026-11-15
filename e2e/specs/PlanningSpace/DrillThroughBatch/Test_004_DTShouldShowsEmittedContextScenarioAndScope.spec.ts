import PlanningSpace from '../../../pageobjects/planning.page';
import scopePage from '../../../pageobjects/scope.page';
import CommonFunctions from '../../../util/common.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/DrillThroughBatch/Test_004_DTShouldShowsEmittedContextScenarioAndScope.json");

describe('Drill Through Should Emit Context Scenarios And Scope ', () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await browser.pause(5000);
    });

    it('Test Case 1: Drill Through From Reporting to Reporting', async () => {
        await PlanningSpace.clickViewsDropDown();
        const result: boolean = await PlanningSpace.clickDashBoard(TestData.DRILL_THROUGH_VIEW_FROM);
        let bValidation1: boolean = await CommonFunctions.compareTwoValues(result, true, "View " + TestData.DRILL_THROUGH_VIEW_FROM + " Found Assertion");
        await PlanningSpace.performDrillThroughOnCardField(TestData.DRILL_THROUGH_CELL, TestData.DRILL_THROUGH_VIEW_TO);
        await browser.pause(5000);
        await CommonFunctions.switchToSpecificWindow(1);
        let sActualViewName: string = await PlanningSpace.getViewTitleName();
        await browser.pause(30000);
        let bValidation2: boolean = await CommonFunctions.compareTwoValues(sActualViewName, TestData.DRILL_THROUGH_VIEW_TO, `View Name Assertion after Drill Through to ${TestData.DRILL_THROUGH_VIEW_TO}`);
        let bValidation3: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isViewSelected(TestData.DRILL_THROUGH_VIEW_TO), true, TestData.DRILL_THROUGH_VIEW_TO + " View Selected Assertion");
        let sCurrentUrl: string = await browser.getUrl();
        await CommonFunctions.logMessage('INFO', `current url is ${sCurrentUrl}`)
        let sSplitUrl = sCurrentUrl.split("&");
        let sContextID: string = "";
        for (let i = 0; i < sSplitUrl.length; i++) {
            if (sSplitUrl[i].includes("contextId=")) {
                sContextID = sSplitUrl[i].split("=")[1];
            }
        }
        await CommonFunctions.logMessage('INFO', `context id is  ${sContextID}`)
        let bValidation4: boolean = await CommonFunctions.compareTwoValues(sCurrentUrl.includes("contextId="), true, "URL includes Context ID Assertion");
        let bValidation5: boolean = await CommonFunctions.compareTwoValues(sContextID.length > 1, true, "Context ID Assertion, it should have some ID and its length should be greated than 1");
        // let bValidation6: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isRedDotDisplaysOnPlanningSpace(), true, "Red Dot Display On Planning Space Assertion");
        let bValidation7: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isContextOverrideDisplays(), true, "Context Override button Displays Assertion");
        let bValidation8: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isClearDisplays(), true, "Clear Button/Link Displays Assertion");
        let bValidation9: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.getDTDataInMaasChart(), "CG-01 PF-00 REGION-00", "Drill Through Data Displays Assertion");

        expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation7 && bValidation8 && bValidation9).toEqual(true);
    });
    it('Test Case 2: Drill through from Maas Pivot Card View to Maas Chart Card View to check scope after applying draft filter', async () => {
        await PlanningSpace.switchToMfe();
        await scopePage.clickOnTab(TestData.SCOPE_TAB);
        await browser.pause(5000);
        const filterConfigs = [
            { type: 'ITEM', category: 'Brand', value: ['PF-00'] },
        ];
        await PlanningSpace.configureFilters(filterConfigs);
        await scopePage.clickOnTab(TestData.SCOPE_TAB);
        const scopeTitle : string = await scopePage.getAppliedVFTitle();
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(scopeTitle, "Preselected", "Scope Title Assertion after Drill Through to " + TestData.DRILL_THROUGH_VIEW_TO);
        await scopePage.closeDrawer();
        expect (bValidation3).toBeTruthy();
    });

    it(`Test Case 3: Existing scope should be persisted for target view after clearing the context on drill through`, async () => {
        await PlanningSpace.clearContext(false);
        await browser.pause(5000);
        const sScope: string = await PlanningSpace.getDTDataInMaasChart();
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(sScope, "CG-01 PF-00 REGION-00", "Scope Assertion after clearing the context on drill through");
        await PlanningSpace.switchToMfe();
        await scopePage.clickOnTab(TestData.SCOPE_TAB);
        await browser.pause(5000);
        const scopeTitle : string = await scopePage.getAppliedVFTitle();
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(scopeTitle, TestData.FILTER_NAME, "Scope Title Assertion after Drill Through to " + TestData.DRILL_THROUGH_VIEW_TO);
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope('CHANNEL', 'CG-21'), true, `Is Customer filter applied`);
        const bValidation4: boolean = await CommonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope('PRODUCTTYPE', 'PF-10'), true, `Is Item filter applied`);
        const bValidation5: boolean = await CommonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope('CALENDARYEAR', 'CY-2023'), true, `Is Time filter applied`);
        const bValidation6: boolean = await CommonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope('REGION', 'REGION-10'), true, `Is Location filter applied`);
        await scopePage.closeDrawer();
        expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6).toBeTruthy();
    });
});