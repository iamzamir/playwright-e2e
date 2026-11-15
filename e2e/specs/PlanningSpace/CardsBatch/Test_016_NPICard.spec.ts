import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/CardsBatch/Test_016_NPICard.json");

const cardTitle = 'Metadata Summary Card (NPI)';

describe('Should edit & Configure NPI card', async () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await PlanningSpace.clickViewsDropDown();
        // await PlanningSpace.selectAllViewsOrFavourites("All Views");
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
    });

    it('Test Case 1: Should check if card exists', async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 1: Should check if card exists');        
        const bValidation1: boolean = await PlanningSpace.verifyCardafterSavingDashboard(cardTitle, TestData.VIEW_NAME);
        await CommonFunctions.compareTwoValues(bValidation1, true, `Does card with title ${cardTitle} available in ${TestData.VIEW_NAME} Page`);
        expect(bValidation1).toBeTruthy();
        await CommonFunctions.logMessage('PASS', `Test Case 1 completed successfully for ${cardTitle} card`);
    });

    it("Test Case 2: Verify Data is Visible", async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 2: Verify Graph is Visible');
        const bValidation1: boolean = await PlanningSpace.clickEditBtn();
        await CommonFunctions.compareTwoValues(bValidation1, true, `Clicked on edit icon in ${TestData.VIEW_NAME} view`);
        await PlanningSpace.addAnotherCardOrContainer('Card');
        const bValidation2: boolean = await PlanningSpace.editDataEndpoint(cardTitle, TestData.DATA_ENDPOINT_OPTION, 'NPI Card');
        await CommonFunctions.compareTwoValues(bValidation2, true, `Is Description field updated successfully for ${cardTitle} card`);
        await PlanningSpace.clickBackButtonInCardGallery();
        await PlanningSpace.saveCardInView();
        const isCardVisible = await PlanningSpace.verifyDataInNPICard(cardTitle);
        await CommonFunctions.compareTwoValues(isCardVisible, true, `Card should be visible in the card titled '${cardTitle}'`);
        expect(bValidation1 && bValidation2 && isCardVisible).toBeTruthy();
        await CommonFunctions.logMessage('PASS', `Test Case 2: Card is successfully verified as visible in the card titled '${cardTitle}'`);
    });

    it('Test case 3: Verify No data available', async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 3: Verify No data available');
        const bValidation1: boolean = await PlanningSpace.clickEditBtn();
        await CommonFunctions.compareTwoValues(bValidation1, true, `Clicked on edit icon in ${TestData.VIEW_NAME} view`);
        await PlanningSpace.addAnotherCardOrContainer('Card');
        const bValidation2: boolean = await PlanningSpace.editDataEndpoint(cardTitle, TestData.WRONG_ENDPOINT_OPTION, 'NPI Card');
        await CommonFunctions.compareTwoValues(bValidation2, true, `Is Description field updated successfully for ${cardTitle} card`);
        await PlanningSpace.clickBackButtonInCardGallery();
        await PlanningSpace.saveCardInView();
        const bValidation3 = await PlanningSpace.verifyDataInNPICard(cardTitle);
        await CommonFunctions.compareTwoValues(!bValidation3, true, `Is no data available for ${cardTitle} card`);
        expect(bValidation1 && bValidation2 && !bValidation3).toBeTruthy();
        await CommonFunctions.logMessage('INFO', `Test Case 3: Verify No data available Completed for ${cardTitle} card`);
    })
})