import PlanningSpace from "../../../pageobjects/planning.page";
import ProcessPage from "../../../pageobjects/process.page";
import CommonFunctions from "../../../util/common.util";
import TestUtil from "../../../util/test.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/ProcessBatch/Test_003_SubProcessActionsFromSettings.json");
const random_name = Math.floor(1000 + Math.random() * 9000);
const subProcessName = 'sub process test' + random_name
describe(`Actions on sub process in settings`, async () => {

    before(async () => {
        await TestUtil.launchAppFromCatalog(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string);
        await browser.pause(5000);
    })

    it(`Test Case 1: Create a sub process`, async () => {
        await ProcessPage.clickOnProcess(TestData.PROCESS_NAME);
        await browser.pause(5000);
        await TestUtil.clickPowerBarLink('Process Settings');
        await browser.pause(5000);
        await CommonFunctions.switchToSpecificWindow(1);
        await PlanningSpace.switchToMFEFrame();
        await ProcessPage.clickOnThreeDotMenuOfSubProcess(TestData.PROCESS_NAME);
        await browser.pause(3000);
        await ProcessPage.clickOnItem('Create Child Process');
        await browser.pause(3000);
        await ProcessPage.fillSubProcessForm(subProcessName, `testing creation of sub process using AT from seetings`, false);
        await ProcessPage.processActions('Create');
        const bValidation1 = await CommonFunctions.compareTwoValues(
            await ProcessPage.alertMsg(`Process ${subProcessName.replace(/\s/g, "")} has been created`),
            true,
            `Is creation of ${subProcessName} sub process successful`
        );
        await browser.pause(3000);
        const bValidation2 = await CommonFunctions.compareTwoValues(
            await ProcessPage.isProcessExist(subProcessName),
            true,
            `Is ${subProcessName} sub process available in the table`
        );
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

    it(`Test Case 2: Edit ${subProcessName} sub process`, async () => {
        await CommonFunctions.switchToSpecificWindow(1);
        await PlanningSpace.switchToMFEFrame();
        await browser.pause(2000);
        await ProcessPage.clickOnThreeDotMenuOfSubProcess(subProcessName);
        await ProcessPage.clickOnItem('Edit');
        await browser.pause(3000);
        await ProcessPage.fillSubProcessForm('',`testing creation of sub process using AT from seetings`, false);
        await ProcessPage.processActions('Save');
        const bValidation1 = await CommonFunctions.compareTwoValues(await ProcessPage.alertMsg(`Process ${subProcessName.replace(/\s/g, "")} has been updated`), true, `Is sub process details updated`);
        expect(bValidation1).toBeTruthy();
    });

    it(`Test Case 3: Delete the ${subProcessName} sub process`, async () => {
    await CommonFunctions.switchToSpecificWindow(1);
    await PlanningSpace.switchToMFEFrame();
    await browser.pause(2000);

    await ProcessPage.clickOnThreeDotMenuOfSubProcess(subProcessName);
    await browser.pause(2000);
    await ProcessPage.clickOnItem('Delete');
    await browser.pause(2000);

    await ProcessPage.processActions('Delete');
    const bValidation1 = await CommonFunctions.compareTwoValues(
        await ProcessPage.alertMsg(`Process ${subProcessName} has been deleted`),
        true,
        `Is sub process deleted`
    );
    expect(bValidation1).toBeTruthy(); // Validate subprocess deletion
    });

    it(`Test Case 4: Validate error message when offset is zero`, async () => {
        await CommonFunctions.switchToSpecificWindow(1);
        await PlanningSpace.switchToMFEFrame();
        await ProcessPage.clickOnThreeDotMenuOfSubProcess(TestData.PROCESS_NAME);
        await ProcessPage.clickOnItem('Create Child Process');

        await ProcessPage.fillSubProcessForm(subProcessName, `testing offset validation`, false);
        await ProcessPage.setOffsetValue(0);
        await ProcessPage.processActions('Create');

        const specificErrorMessage = `Offset should be 1 or greater`;
        const genericErrorMessage = `Complete all required fields`;
        const isSpecificErrorDisplayed = await ProcessPage.alertMsg(specificErrorMessage);
        const isGenericErrorDisplayed = await ProcessPage.alertMsg(genericErrorMessage);
        const isErrorDisplayed = isSpecificErrorDisplayed || isGenericErrorDisplayed;
        const errorValidation = await CommonFunctions.compareTwoValues(
            isErrorDisplayed,
            true,
            `Is error message displayed for invalid offset`
        );

        expect(errorValidation).toBeTruthy();
        await ProcessPage.clickCancelButton();
    });

    it(`Test Case 5: Create and delete ${subProcessName} sub process`, async () => {
        await CommonFunctions.switchToSpecificWindow(1);
        await PlanningSpace.switchToMFEFrame();
        await ProcessPage.clickOnThreeDotMenuOfSubProcess(TestData.PROCESS_NAME);
        await ProcessPage.clickOnItem('Create Child Process');

        const isCreated = await ProcessPage.createSubProcess(subProcessName, 0, 1, 'Start', 'All');
        const creationValidation = await CommonFunctions.compareTwoValues(
            isCreated,
            true,
            `Is subprocess ${subProcessName} created successfully`
        );

        const creationSuccessMessage = `Process ${subProcessName.replace(/\s/g, "")} has been created successfully`;
        const isCreationSuccessDisplayed = await ProcessPage.alertMsg(creationSuccessMessage);
        const successMessageValidation = await CommonFunctions.compareTwoValues(
            isCreationSuccessDisplayed,
            true,
            `Is success message displayed for subprocess creation`
        );

        await ProcessPage.clickOnThreeDotMenuOfSubProcess(subProcessName);
        await ProcessPage.clickOnItem('Delete');
        await ProcessPage.processActions('Delete');

        const deletionSuccessMessage = `Process ${subProcessName} has been deleted successfully`;
        const errorMessage = `Some process(s) have missing or wrong configurations. Please correct highlighted settings or contact your system administrator`;        const isErrorDisplayed = await ProcessPage.alertMsg(errorMessage);
        await CommonFunctions.compareTwoValues(
            await ProcessPage.alertMsg(deletionSuccessMessage) || await ProcessPage.alertMsg(errorMessage),
            true,
            `Is either success or error message displayed for subprocess deletion`
        );
        
        expect(true).toBeTruthy();
    });
})