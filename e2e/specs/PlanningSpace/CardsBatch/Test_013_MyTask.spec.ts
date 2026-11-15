import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/CardsBatch/Test_013_MyTask.json");

const cardTitle = 'my task filter';

describe('Should edit & Configure My Task', async () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.selectAllViewsOrFavourites("All Views")
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME)
    });

    it('Test Case 1: Should check if card exists', async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 1: Should check if card exists');        
        const bValidation1: boolean = await PlanningSpace.verifyCardafterSavingDashboard(cardTitle, TestData.VIEW_NAME);
        await CommonFunctions.compareTwoValues(bValidation1, true, `Does card with title ${cardTitle} available in ${TestData.VIEW_NAME} Page`);
        expect(bValidation1).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 1 completed successfully.');
    });

    it("Test case 2: Verify Data is Shown", async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 2: Verify Data is Shown');
        const bValidation1: boolean = await PlanningSpace.clickEditBtn();
        await CommonFunctions.compareTwoValues(bValidation1, true, `Clicked on edit icon in ${TestData.VIEW_NAME} view`);
        await PlanningSpace.addAnotherCardOrContainer('Card');
        const bValidation2: boolean = await PlanningSpace.editMyTaskcard(cardTitle);
        await CommonFunctions.compareTwoValues(bValidation2, true, `Is Description field updated successfully for ${cardTitle} card`);
        await PlanningSpace.clickBackButtonInCardGallery();
        await PlanningSpace.saveCardInView();
        const isGraphVisible = await PlanningSpace.verifyDataInMyTaskCardAfterSave(cardTitle);
        await CommonFunctions.compareTwoValues(isGraphVisible, true, `Data should be visible in the card titled '${cardTitle}'`);
        expect(isGraphVisible).toBeTruthy();
        await CommonFunctions.logMessage('PASS', `Test Case 2 completed successfully.`);
    })

   
    it("Test case 3: Verify Action item should display with filter data ",async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 3: Verify if action items page is displayed ');        
        await PlanningSpace.clickOnMyTaskTitle(cardTitle, 'New Insights');
        await CommonFunctions.switchToSpecificWindow(1);
        const url = await browser.getUrl();
        const pathValidation : boolean = await PlanningSpace.getUrlId(url,"lui-dashboard-scaffolding-integration");
        // const taskValidation: boolean= await PlanningSpace.assigneeFieldCheck("PS Automation1","Task test");
        expect(pathValidation).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 3 completed successfully.');
    })

    it('Test case 4: Verify No data available', async () => {
        await CommonFunctions.switchToSpecificWindow(0);
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 4: Verify No data available');
        await PlanningSpace.switchToMfe();
        const bValidation1: boolean = await PlanningSpace.clickEditBtn();
        await CommonFunctions.compareTwoValues(bValidation1, true, `Clicked on edit icon in ${TestData.VIEW_NAME} view`);
        await PlanningSpace.addAnotherCardOrContainer('Card');
        const bValidation2: boolean = await PlanningSpace.editCardDataEndpoints(cardTitle, TestData.NO_DATA_ENDPOINT, TestData.NO_DATA_META_ENDPOINT);
        await CommonFunctions.compareTwoValues(bValidation2, true, `Is endpoints updated successfully for ${cardTitle} card`);
        await PlanningSpace.clickBackButtonInCardGallery();
        await PlanningSpace.saveCardInView();
        const bValidation3 = await PlanningSpace.verifyNoColumnsStateInCard(cardTitle);
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
        await CommonFunctions.logMessage('INFO', 'Test Case 4 completed successfully.');
    })

    it('Test case 5: Verify Something went wrong', async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 5: Verify Something went wrong');
        const bValidation1: boolean = await PlanningSpace.clickEditBtn();
        await CommonFunctions.compareTwoValues(bValidation1, true, `Clicked on edit icon in ${TestData.VIEW_NAME} view`);
        await PlanningSpace.addAnotherCardOrContainer('Card');
        const bValidation2: boolean = await PlanningSpace.editCardDataEndpoints(cardTitle, TestData.WRONG_ENDPOINT, TestData.WRONG_ENDPOINT);
        await CommonFunctions.compareTwoValues(bValidation2, true, `Is Description field updated successfully for ${cardTitle} card`);
        await PlanningSpace.clickBackButtonInCardGallery();
        await PlanningSpace.saveCardInView();
        await browser.pause(15000);
        const bValidation3 = await PlanningSpace.verifySomethingWentWrongInCard(cardTitle);
        expect(bValidation3).toBeTruthy();
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
        await CommonFunctions.logMessage('INFO', 'Test Case 5 completed successfully.');
    })
})