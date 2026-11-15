import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/CardsBatch/Test_020_TabbedCard.json");
// import TestData from "../../../Testdata/PlanningSpace/TabbedCard/Test_001_TabbedCard.json"

describe('Tabbed Card Test', () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await browser.pause(5000);
    });
    it('Test Case 1: Selection of card should work from tabbed card', async () => {
        const sViewFrom: string = TestData.TC1_DRILL_THROUGH_VIEW_FROM;
        await PlanningSpace.clickViewsDropDown();
        const result: boolean = await PlanningSpace.clickDashBoard(sViewFrom);
        let bValidation1: boolean = await CommonFunctions.compareTwoValues(result, true, "View " + sViewFrom + " Found Assertion");
        await PlanningSpace.selectCardInTabbedCard('Maas Chart');
        const iconCountForMaasChart = await PlanningSpace.getCountOfMaasChartIcons();
        let bValidation2: boolean = await CommonFunctions.compareTwoValues(iconCountForMaasChart > 1, true, "icons found for maas Chart card " + " Found Assertion");
        await PlanningSpace.selectCardInTabbedCard('Maas Pivot');
        const iconCountForMaasPivot = await PlanningSpace.getCountOfMaasPivotIcons();
        let bValidation3: boolean = await CommonFunctions.compareTwoValues(iconCountForMaasPivot > 3, true, "icons found for maas pivot card " + " Found Assertion");
        expect(bValidation1 && bValidation2 && bValidation3).toEqual(true);
    });
    it('Test Case 2: Card to view communication (drill through) should work for card inside tabbed card )', async () => {
        const sViewNameTo: string = TestData.TC1_DRILL_THROUGH_VIEW_TO;
        const cellValue: string = TestData.TC1_DRILL_THROUGH_CELL
        await PlanningSpace.performDrillThroughOnCardField(cellValue, sViewNameTo);
        await browser.pause(5000);
        await CommonFunctions.switchToSpecificWindow(1);
        let sActualViewName: string = await PlanningSpace.getViewTitleName();
        await browser.pause(45000);
        let bValidation2: boolean = await CommonFunctions.compareTwoValues(sActualViewName, sViewNameTo, `Process Name Assertion after Drill Through to ${sViewNameTo}`);
        let bValidation3: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isViewSelected(sViewNameTo), true, sViewNameTo + " View Selected Assertion");
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
        let bValidation5: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isContextOverrideDisplays(), true, "Context Override button Displays Assertion");
        let bValidation6: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isClearDisplays(), true, "Clear Button/Link Displays Assertion");
        expect(bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6).toEqual(true);
    });
});