import { clearScreenDown } from 'readline';
import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/DrillThroughBatch/Test_008_OnRowDrillThrough.json");

const cardTitle = "Enhanced demo card"
describe('Selected target view should be visible whlile doing on row drill through', () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME, false, false);
        await browser.pause(5000);
    });
    it('Test Case 1 :Arrow should be displayed for the row with matching cell name ', async () => {
        await PlanningSpace.selectViewByType('Hidden Views');
        await PlanningSpace.clickDashBoard("enhanced table view")
        await browser.pause(3000);
        const bValidation1: boolean = await PlanningSpace.clickEditBtn();
        await CommonFunctions.compareTwoValues(bValidation1,true,`Clicked on edit icon in  view`);
        const bValidation2: boolean= await PlanningSpace.rowCondition(cardTitle,true);
        await CommonFunctions.compareTwoValues(bValidation2,true,`Clicked on edit icon in view`);
        const isRowArrowExists:boolean= await PlanningSpace.isRowArrowExists(TestData.DRILL_THOROUGH_ON_CELLS[0]);
        await CommonFunctions.compareTwoValues(isRowArrowExists, true , 'Is arrow button displayed');
        await expect(isRowArrowExists&&bValidation1&&bValidation2).toBeTruthy();
    });
    it('Test case2: Arrow should not be displayed for row when condition not equals', async () => {
        const isRowArrowExists:boolean= await PlanningSpace.isRowArrowExists(TestData.DRILL_THOROUGH_ON_CELLS[1]);
        await CommonFunctions.compareTwoValues(isRowArrowExists, false, 'Is arrow button displayed');
        await expect(isRowArrowExists).toBeFalsy();
    })
    it('Test case3: Clicking on Arrow button user should navigate to drill through target view', async () =>{
         await PlanningSpace.onRowDrillThrough(TestData.DRILL_THOROUGH_ON_CELLS[0]);
        const navigatedURL = await browser.getUrl();
        const contextId = await PlanningSpace.getContextId(navigatedURL);
        await CommonFunctions.compareTwoValues(contextId != "", true, `Context id should exist while drillthrough`);
        await browser.pause(20000)
        // let bValidation3: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isRedDotDisplaysOnPlanningSpace(), true, "Red Dot Display On Planning Space Assertion");
        let bValidation4: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isContextOverrideDisplays(), true, "Context Override button Displays Assertion");
        let bValidation5: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isClearDisplays(), true, "Clear Button/Link Displays Assertion");
        const viewName = await PlanningSpace.verifyTargetName();
        const bValidation: boolean = await CommonFunctions.compareTwoValues(viewName, 'DR Destination', 'Checking two view name should be same');
        await expect(bValidation&&bValidation4&&bValidation5).toBeTruthy();
    });
    it('Test case4: After disabling conditions toggle row not matching with condition data should displayed with arrow ', async () => {
        await CommonFunctions.switchToSpecificWindow(0);
        await browser.pause(2000);
        await PlanningSpace.switchToMfe();
        await browser.pause(2000);
        const bValidation6: boolean = await PlanningSpace.clickEditBtn();
        await CommonFunctions.compareTwoValues(bValidation6,true,`Clicked on edit icon in view`);
        const bValidation7:boolean=await PlanningSpace.rowCondition(cardTitle, false);
        await CommonFunctions.compareTwoValues(bValidation7,true,`Clicked on edit icon in view`);
        await browser.pause(6000);
        const isRowArrowExists:boolean= await PlanningSpace.isRowArrowExists(TestData.DRILL_THOROUGH_ON_CELLS[1]);
        await CommonFunctions.compareTwoValues(isRowArrowExists, true, 'Is arrow button displayed');
        await expect(isRowArrowExists&&bValidation6&&bValidation7).toBeTruthy();

    });

});