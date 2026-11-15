import ProcessPage from "../../../pageobjects/process.page";
import CommonFunctions from "../../../util/common.util";
import TestUtil from "../../../util/test.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/ProcessBatch/Test_004_ValidateSubProcessCreation.json");
const random_name = Math.floor(1000 + Math.random() * 9000);
const subProcessName = 'test sub process ' + random_name;

describe(`Validate Sub Process Creation with Event Restrictions on Process`, async () => {

    before(async () => {
        await TestUtil.launchAppFromCatalog(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string);
        await browser.pause(5000);
    });

    it(`Test Case 1: Validate Lookup Field for Sub Process Creation`, async () => {
        await ProcessPage.clickOnProcess(TestData.PROCESS_NAME);
        await browser.pause(5000);
        await ProcessPage.clickOnAddSubProcess();
        await ProcessPage.selectCalculateStartDateOn("End");
        const bValidation = await CommonFunctions.compareTwoValues(await ProcessPage.validateSubProcessFields(TestData.PROCESS_NAME), false, `PROCESS_NAME (${TestData.PROCESS_NAME}) should not be listed in the dropdown when Calculate start date on is END`);
        expect(bValidation).toBeTruthy();
    });
});
