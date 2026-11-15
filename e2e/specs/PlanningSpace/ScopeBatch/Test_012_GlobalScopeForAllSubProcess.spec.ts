import PlanningSpace from "../../../pageobjects/planning.page";
import scope from "../../../pageobjects/scope.page"
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScopeBatch/Test_012_GlobalScopeForAllSubProcess.json");

describe(`Verify Default Scope filter - Subprocess`, async () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, false, false);
        await browser.pause(5000);
        await PlanningSpace.launchContext('Sub-process', { process: TestData.PROCESS_NAME, subProcess: TestData.SUB_PROCESS.SUB_PROCESS_NAME });
        await browser.pause(5000);
    });

    it(`Test Case 1: Set ${TestData.GLOBAL_SCOPE_FILTER_NAME} filter globally for all Sub-process`, async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.SUB_PROCESS_VIEW_NAME);
        await browser.pause(5000);
        await scope.clickOnViewActions('Set Default Scope Filter');
        await browser.pause(3000);
        await scope.setDefaultScopeFilter(TestData.GLOBAL_SCOPE_FILTER_NAME);
        const isPresetSaved = await CommonFunctions.verifyAlertMsg('Preset is saved for the view', 5000);
        expect(isPresetSaved).toBeTruthy();
    });

    it(`Test Case 2: Is ${TestData.GLOBAL_SCOPE_FILTER_NAME} filter reflected in ${TestData.SUB_PROCESS_VIEW_NAME} of "${TestData.SUB_PROCESS.SUB_PROCESS_NAME}" `, async () => {
        await scope.clickOnTab('Scope');
        await browser.pause(20000);
        const appliedVFTitle: string = await scope.getAppliedVFTitle();
        const bValidation = await CommonFunctions.compareTwoValues(appliedVFTitle === TestData.GLOBAL_SCOPE_FILTER_NAME, true, `Is ${TestData.GLOBAL_SCOPE_FILTER_NAME} filter applied for ${TestData.PROCESS_NAME}`);
        const regionSectionValidation = await scope.checkFilterExists('Region', 'REGION-00');
        const brandSectionValidation = await scope.checkFilterExists('Brand', 'PF-10');
        const customerSectionValidation = await scope.checkFilterExists('Customer', 'CUST-01'); 
        expect(bValidation && regionSectionValidation && brandSectionValidation && customerSectionValidation).toBeTruthy();
    });

});