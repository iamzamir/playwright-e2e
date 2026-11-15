import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/CardsBatch/Test_012_NetworkCard.json");


const cardTitle = 'Adopting Network Card';


describe('Should verify Network Card', async () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME)
    });
   
    it('Test Case 1: Should check if card exists', async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 1: Should check if card exists');
        const bValidation1: boolean = await PlanningSpace.verifyCardafterSavingDashboard(cardTitle, TestData.VIEW_NAME);
        await CommonFunctions.compareTwoValues(bValidation1, true, `Does card with title ${cardTitle} available in ${TestData.VIEW_NAME} Page`);
        expect(bValidation1).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 1 completed successfully.');
    });
    it("Test Case 2: Verify Graph is Visible", async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 2: Verify Graph is Visible');
        const bValidation1: boolean = await PlanningSpace.clickEditBtn();
        await CommonFunctions.compareTwoValues(bValidation1, true, `Clicked on edit icon in ${TestData.VIEW_NAME} view`);
        await PlanningSpace.addAnotherCardOrContainer('Card');
        const bValidation2: boolean = await PlanningSpace.editDataEndpoint(cardTitle, TestData.DATA_ENDPOINT);
        await CommonFunctions.compareTwoValues(bValidation2, true, `Is Description field updated successfully for ${cardTitle} card`);
        await PlanningSpace.clickBackButtonInCardGallery();
        await PlanningSpace.saveCardInView();
        const isGraphVisible = await PlanningSpace.verifyNetworkGraph(cardTitle);
        await CommonFunctions.compareTwoValues(isGraphVisible, true, `Graph should be visible in the card titled '${cardTitle}'`);
        expect(isGraphVisible).toBeTruthy();
        await CommonFunctions.logMessage('PASS', `Test Case 2: Graph is successfully verified as visible in the card titled '${cardTitle}'`);
    });

    //Commenting the below cases as PS doesnt have control over the endpoint data.
    // it('Test case 3: Verify Something went wrong', async () => {
    //     await CommonFunctions.logMessage('INFO', 'Starting Test Case 3: Verify Something went wrong');
    //     const bValidation1: boolean = await PlanningSpace.clickEditBtn();
    //     await CommonFunctions.compareTwoValues(bValidation1, true, `Clicked on edit icon in ${TestData.VIEW_NAME} view`);
    //     await PlanningSpace.addAnotherCardOrContainer('Card');
    //     const bValidation2: boolean = await PlanningSpace.editDataEndpoint(cardTitle, TestData.WRONG_ENDPOINT);
    //     await CommonFunctions.compareTwoValues(bValidation2, true, `Is Description field updated successfully for ${cardTitle} card`);
    //     await PlanningSpace.clickBackButtonInCardGallery();
    //     await PlanningSpace.saveCardInView();    
    //     const bValidation3 = await PlanningSpace.verifySomethingWentWrongInCard(cardTitle);
    //     expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    //     await CommonFunctions.logMessage('INFO', 'Test Case 3: Verify Something went wrong Completed');
    // })
})