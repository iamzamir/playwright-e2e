import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/CardsBatch/Test_015_TableCard.json");

const cardTitle = 'Automation Table Card';


describe("Tabular Card Automation Testing", async () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await browser.pause(5000);
    });

    it('Test Case 1: Should check if card exists', async () => {
        await PlanningSpace.clickViewsDropDown();
        // await PlanningSpace.selectAllViewsOrFavourites("All Views")
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        // await PlanningSpace.waitUntilCardLoaded(cardTitle);
        await browser.pause(1000);
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 1: Should check if card exists');        
        const bValidation1: boolean = await PlanningSpace.verifyCardafterSavingDashboard(cardTitle, TestData.VIEW_NAME);
        await CommonFunctions.compareTwoValues(bValidation1, true, `Does card with title ${cardTitle} available in ${TestData.VIEW_NAME} Page`);
        expect(bValidation1).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 1 completed successfully.');

    });

    it ('Test Case 2: Edit Functionality to Save Changes for Tabular Card', async () => {
        await browser.pause(1000);
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 2: Edit functionality - Save Changes'); 
        const bValidation1: boolean = await PlanningSpace.clickEditBtn();
        await CommonFunctions.compareTwoValues(bValidation1,true,'Edit button clicked');
        await browser.pause(2000); 
        const bValidation2 = await PlanningSpace.editCardAndVerifyButtons(cardTitle);
        await CommonFunctions.compareTwoValues(bValidation1, true, `Does ${cardTitle} available in ${TestData.VIEW_NAME} view has Save and Cancel buttons`);
        const bValidation3: boolean =  await PlanningSpace.makeCellEditableAndSaveChanges();
        await CommonFunctions.compareTwoValues(bValidation2, true, `Does row with ${cardTitle} available in ${TestData.VIEW_NAME} view edited and saved successfully`);
        expect(bValidation2 && bValidation3).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 2 completed successfully.');
    })

    it ('Test Case 3: Edit Functionality to Cancel Changes for Tabular Card', async () => {
        await browser.pause(1000);
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 3: Edit functionality - Cancel Changes');  
        const bValidation1 = await PlanningSpace.editCardAndVerifyButtons(cardTitle);
        await CommonFunctions.compareTwoValues(bValidation1, true, `Does ${cardTitle} available in ${TestData.VIEW_NAME} view has Save and Cancel buttons`);
        const bValidation2: boolean = await PlanningSpace.makeCellEditableAndCancelChanges();
        await CommonFunctions.compareTwoValues(bValidation2, true, `Does row with ${cardTitle} avaialble in ${TestData.VIEW_NAME} view discarded the changes successfully`);
        expect(bValidation1 && bValidation2).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 3 completed successfully.');
    })

    // NOTE: UI GOT CHANGED - DROPDOWN NOT INTERACTABLE
    // it ('Test Case 4: Dropdown functionality with filtering', async () => {
    //     await browser.pause(1000);
    //     await CommonFunctions.logMessage('INFO', 'Starting Test Case 4: Dropdown with filtering functionality');
    //     const bValidation1: boolean = await PlanningSpace.dropdownWithFiltering(cardTitle);
    //     await CommonFunctions.compareTwoValues(bValidation1, true, `Is the cell in ${cardTitle} available within the ${TestData.VIEW_NAME} view equipped with a dropdown that includes filtering functionality?`);
    //     expect(bValidation1).toBeTruthy();
    //     await CommonFunctions.logMessage('PASS', 'Test Case 4 completed successfully.');
    // })

    it ('Test Case 5: Multiple chips with filtering functionality', async () => {
        await browser.pause(1000);
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 5: Multiple chips with filtering functionality');
        const bValidation1 = await PlanningSpace.multipleChipsFiltering();
        await CommonFunctions.compareTwoValues(bValidation1, true, `Is the cell in ${cardTitle} available within the ${TestData.VIEW_NAME} view equipped with a chips that includes filtering functionality?`)
        expect(bValidation1).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 5 completed successfully.');
    })
})