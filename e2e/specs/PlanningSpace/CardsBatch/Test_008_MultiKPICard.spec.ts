const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/CardsBatch/Test_008_MultiKPIData.json");
// import TestData from "../../../Testdata/PlanningSpace/CardsBatch/Test_002_CardActions.json";
import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";

const cardTitle = "multi-kpi test"
const valueName= 'onKPIClick'
describe("Should Create and Edit Multi KPI Card", async () => { 
    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await browser.pause(20000);
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME)
    });
    it('Test Case 1: View Should load with KPI card',async ()=> {  
        const bValidation7: boolean = await PlanningSpace.verifyCardafterSavingDashboard("multi-kpi test",TestData.VIEW_NAME);
        await CommonFunctions.compareTwoValues(bValidation7,true,`Does card with title ${cardTitle} available in ${TestData.VIEW_NAME} Page`);
        expect(bValidation7).toBeTruthy();
    });
    it('Test Case 2: Should edit card', async () => {
        const bValidation1: boolean = await PlanningSpace.clickEditBtn();
        await CommonFunctions.compareTwoValues(bValidation1,true,`Clicked on edit icon in ${TestData.VIEW_NAME} view`);
        const bValidation2: boolean = await PlanningSpace.addingSubscription(cardTitle,valueName);
        await CommonFunctions.compareTwoValues(bValidation2,true,`Is Description field updated successfully for ${cardTitle} card`);
        expect(bValidation1 && bValidation2).toBeTruthy();

    })
    it('Test Case 3: click on any graph it should refresh',async () =>{
        await browser.pause(3000);
        const bValidation7: boolean = await PlanningSpace.actionsType(cardTitle);
        await CommonFunctions.compareTwoValues(bValidation7,true,`graph get refreshed for ${cardTitle} card`);
        expect(bValidation7).toBeTruthy();
        // await PlanningSpace.addAnotherCardOrContainer('Card')
    })
    it ('Test Case 4: remove subscription for card', async () => {
        await browser.pause(3000);
        const bValidation1: boolean = await PlanningSpace.clickEditBtn();
        expect(bValidation1).toBeTruthy();
        const bValidation8: boolean = await PlanningSpace.deleteSubscription(cardTitle);
        expect(bValidation8).toBeTruthy();
    })
})