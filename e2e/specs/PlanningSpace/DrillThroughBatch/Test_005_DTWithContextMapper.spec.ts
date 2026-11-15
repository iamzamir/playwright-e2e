import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/DrillThroughBatch/Test_005_DTWithContextMapper.json");

describe('Target views should be visible as options whlile doing drill through', () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await browser.pause(5000);
    });

    it('Test Case : Target views should be visible as options', async () => {
        await PlanningSpace.clickViewsDropDown();
        const result: boolean = await PlanningSpace.clickDashBoard(TestData.DRILL_THROUGH_VIEW_FROM);
        let bValidation1: boolean = await CommonFunctions.compareTwoValues(result, true, "View " + TestData.DRILL_THROUGH_VIEW_FROM + " Found Assertion");
        await browser.pause(30000);
        let options: string[] = await PlanningSpace.getTargetDrillThroughOptionsOnField(TestData.DRILL_THROUGH_CELL);
        let bValidation2: boolean = await CommonFunctions.compareTwoValues(options.toString(), TestData.TARGET_VIEW, "Target View Options Displayed Assertion")
        expect(bValidation1 && bValidation2).toEqual(true);
    });

});