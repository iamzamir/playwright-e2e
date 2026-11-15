import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/CardsBatch/Test_021_VerifyCardsResize.json");

describe('verify cards resize in planning space', () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await browser.pause(5000);
    });

    it(`Test Case 1: Verify cards resize in planning space`, async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        await browser.pause(10000);
        const isCardResized: boolean = await PlanningSpace.verifyCardsResize();
        const bValidation = await CommonFunctions.compareTwoValues(isCardResized, true, `Cards are resized successfully in planning space`);
        expect(bValidation).toBeTruthy();
    });
});