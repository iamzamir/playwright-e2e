import PlanningSpace from "../../../pageobjects/planning.page";
import scope from "../../../pageobjects/scope.page"
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScopeBatch/Test_009_GlobalScopeForAllProcess.json");

describe(`Verify Default Scope filter - Process`, async () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME, false, false);
        await browser.pause(5000);
    });

    it(`Test Case 1: Set ${TestData.GLOBAL_SCOPE_FILTER_NAME} filter globally for all process`, async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        await browser.pause(5000);
        await scope.clickOnViewActions('Set Default Scope Filter');
        await browser.pause(3000);
        await scope.setDefaultScopeFilter(TestData.GLOBAL_SCOPE_FILTER_NAME);
        const isPresetSaved = await CommonFunctions.verifyAlertMsg('Preset is saved for the view', 5000);
        expect(isPresetSaved).toBeTruthy();
    });

    it(`Test Case 2: Is ${TestData.GLOBAL_SCOPE_FILTER_NAME} filter reflected in ${TestData.VIEW_NAME} of "${TestData.PROCESS_NAME}" `, async () => {
        await scope.clickOnTab('Scope');
        await browser.pause(25000);
        const appliedVFTitle: string = await scope.getAppliedVFTitle();
        const bValidation = await CommonFunctions.compareTwoValues(appliedVFTitle === TestData.GLOBAL_SCOPE_FILTER_NAME, true, `Is ${TestData.GLOBAL_SCOPE_FILTER_NAME} filter applied for ${TestData.PROCESS_NAME}`);
        const regionSectionValidation = await scope.checkFilterExists('Region', 'REGION-00');
        const brandSectionValidation = await scope.checkFilterExists('Brand', 'PF-10');
        const customerSectionValidation = await scope.checkFilterExists('Customer', 'CUST-01');

        expect(bValidation && regionSectionValidation && brandSectionValidation && customerSectionValidation).toBeTruthy();
    });

    it(`Test Case 3: Remove ${TestData.GLOBAL_SCOPE_FILTER_NAME} filter globally for all process and set to default filter "${TestData.DEFAULT_FILTER_OPTION_NAME}" `, async () => {
        await browser.pause(5000);
        await scope.clickOnViewActions('Set Default Scope Filter');
        await browser.pause(3000);
        await scope.setDefaultScopeFilter(TestData.DEFAULT_FILTER_OPTION_NAME);
        const isPresetSaved = await CommonFunctions.verifyAlertMsg('Preset is saved for the view', 5000);
        expect(isPresetSaved).toBeTruthy();
    });

    it(`Test Case 4: Is ${TestData.DEFAULT_FILTER_OPTION_NAME} filter reflected in ${TestData.VIEW_NAME} of "${TestData.OTHER_PROCESS_NAME}" `, async () => {
        await scope.clickOnTab('Scope');
        const appliedVFTitle: string = await scope.getAppliedVFTitle();
        const bValidation = await CommonFunctions.compareTwoValues(appliedVFTitle === TestData.DEFAULT_FILTER_NAME_IN_VF, true, `Is ${TestData.DEFAULT_FILTER_NAME_IN_VF} filter applied for ${TestData.OTHER_PROCESS_NAME}`);
        const regionSectionValidation = await scope.checkFilterExists('Region', 'REGION-00');
        const brandSectionValidation = await scope.checkFilterExists('Brand', 'PF-10');
        const customerSectionValidation = await scope.checkFilterExists('Customer', 'CUST-01');
        await CommonFunctions.logMessage('INFO',`Applied Value Filter Title: ${appliedVFTitle}`);
        await CommonFunctions.logMessage('INFO',`Region Section Validation: ${regionSectionValidation}`);
        await CommonFunctions.logMessage('INFO',`Brand Section Validation: ${brandSectionValidation}`);
        await CommonFunctions.logMessage('INFO',`Customer Section Validation: ${customerSectionValidation}`);
        expect(bValidation && !(regionSectionValidation || brandSectionValidation || customerSectionValidation)).toBeTruthy();
    });

    /* As part of new changes(removed checkbox), below test cases are not required
    it(`Test Case 3: Is ${TestData.GLOBAL_SCOPE_FILTER_NAME} filter reflected in ${TestData.VIEW_NAME} of other process "${TestData.OTHER_PROCESS_NAME}" `, async () => {
        await PlanningSpace.navigateToPlanningSpace();
        await browser.pause(3000);
        await PlanningSpace.launchContext("Process", { process: TestData.OTHER_PROCESS_NAME });
        await browser.pause(3000);
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.getProcessName() === TestData.OTHER_PROCESS_NAME,true, `Is other process updated in breadcrumb`);
        await PlanningSpace.selectAllViewsOrFavourites("All Views");
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        await scope.clickOnTab('Scope');
        const appliedVFTitle: string = await scope.getAppliedVFTitle();
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(appliedVFTitle === TestData.GLOBAL_SCOPE_FILTER_NAME, true, `Is ${TestData.GLOBAL_SCOPE_FILTER_NAME} filter applied for ${TestData.OTHER_PROCESS_NAME}`);
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

    it(`Test Case 6: Is ${TestData.DEFAULT_FILTER_OPTION_NAME} filter reflected in ${TestData.VIEW_NAME} of other process "${TestData.PROCESS_NAME}" `, async () => {
        await PlanningSpace.navigateToPlanningSpace();
        await browser.pause(3000);
        await PlanningSpace.launchContext("Process", { process: TestData.PROCESS_NAME });
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        await scope.clickOnTab('Scope');
        const appliedVFTitle: string = await scope.getAppliedVFTitle();
        const bValidation = await CommonFunctions.compareTwoValues(appliedVFTitle === TestData.DEFAULT_FILTER_NAME_IN_VF, true, `Is ${TestData.DEFAULT_FILTER_NAME_IN_VF} filter applied for ${TestData.PROCESS_NAME}`);
        expect(bValidation).toBeTruthy();
    });*/

});