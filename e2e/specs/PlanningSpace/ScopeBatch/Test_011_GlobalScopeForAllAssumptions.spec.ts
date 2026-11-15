import planningPage from "../../../pageobjects/planning.page";
import PlanningSpace from "../../../pageobjects/planning.page";
import scope from "../../../pageobjects/scope.page"
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScopeBatch/Test_011_GlobalScopeForAllAssumptions.json");

describe(`Verify Default Scope filter - Assumption`, async () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, false, false);
        await browser.pause(5000);
        await PlanningSpace.launchContext('Assumption', { origin: TestData.PROCESS_NAME, assumption: TestData.ASSUMPTION.ASSUMPTION_NAME });
        await browser.pause(5000);
    });

    it(`Test Case 1: Set ${TestData.GLOBAL_SCOPE_FILTER_NAME} filter globally for all assumptions`, async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.ASSUMPTION_VIEW_NAME);
        await browser.pause(5000);
        await scope.clickOnViewActions('Set Default Scope Filter');
        await browser.pause(3000);
        await scope.setDefaultScopeFilter(TestData.GLOBAL_SCOPE_FILTER_NAME);
        const isPresetSaved = await CommonFunctions.verifyAlertMsg('Preset is saved for the view', 5000);
        expect(isPresetSaved).toBeTruthy();
    });

    it(`Test Case 2: Is ${TestData.GLOBAL_SCOPE_FILTER_NAME} filter reflected in ${TestData.ASSUMPTION_VIEW_NAME} of "${TestData.ASSUMPTION.ASSUMPTION_NAME}" `, async () => {
        await scope.clickOnTab('Scope');
        await scope.clickRevertVFChanges();
        await browser.pause(15000);
        await scope.clickOnTab("Scope");
        const appliedVFTitle: string = await scope.getAppliedVFTitle();
        const bValidation = await CommonFunctions.compareTwoValues(appliedVFTitle === TestData.GLOBAL_SCOPE_FILTER_NAME, true, `Is ${TestData.GLOBAL_SCOPE_FILTER_NAME} filter applied for ${TestData.PROCESS_NAME}`);
        const regionSectionValidation = await scope.checkFilterExists('Region', 'REGION-00');
        const brandSectionValidation = await scope.checkFilterExists('Brand', 'PF-10');
        const customerSectionValidation = await scope.checkFilterExists('Customer', 'CUST-01');
        await scope.addFiltersToDimensionHierarchyInScope("LOCATION", "Region", ['REGION-10']);
        await browser.keys('Escape');
        await scope.clickOnApplyFiltersBtn();
        await browser.pause(2000);
        await scope.clickOnTab("Scope");
        // verify if applied filter is the default filter after making changes
        let title: string = "";
        for(let i=0; i<15;i++){
            title = await scope.getAppliedVFTitle();
            if(title !== "Filter"){
                 break;
            }
            await browser.pause(2000);
        }
        const bValidation2 = await CommonFunctions.compareTwoValues(title, TestData.GLOBAL_SCOPE_FILTER_NAME, `Is ${TestData.DEFAULT_FILTER_NAME_IN_VF} filter applied for ${TestData.ASSUMPTION.ASSUMPTION_NAME}`);
        expect(bValidation && bValidation2 && regionSectionValidation && brandSectionValidation && customerSectionValidation).toBeTruthy();
    });

    it(`Test Case 3: Remove ${TestData.GLOBAL_SCOPE_FILTER_NAME} filter globally for all assumption and set to default filter "${TestData.DEFAULT_FILTER_OPTION_NAME}" `, async () => {
        await browser.pause(5000);
        await scope.clickRevertVFChanges();
        await browser.pause(3000);
        await scope.clickOnViewActions('Set Default Scope Filter');
        await browser.pause(3000);
        await scope.setDefaultScopeFilter(TestData.DEFAULT_FILTER_OPTION_NAME);
        const isPresetSaved = await CommonFunctions.verifyAlertMsg('Preset is saved for the view', 5000);
        expect(isPresetSaved).toBeTruthy();
    });

    it(`Test Case 4: Is ${TestData.DEFAULT_FILTER_OPTION_NAME} filter reflected in ${TestData.ASSUMPTION_VIEW_NAME} of "${TestData.ASSUMPTION.ASSUMPTION_NAME}" `, async () => {
        await scope.clickOnTab('Scope');
        const appliedVFTitle: string = await scope.getAppliedVFTitle();
        const bValidation = await CommonFunctions.compareTwoValues(appliedVFTitle.replace(/\*/g, '') === TestData.DEFAULT_FILTER_NAME_IN_VF, true, `Is ${TestData.DEFAULT_FILTER_NAME_IN_VF} filter applied for ${TestData.ASSUMPTION_VIEW_NAME}`);
        const regionSectionValidation = await scope.checkFilterExists('Region', 'REGION-00');
        const brandSectionValidation = await scope.checkFilterExists('Brand', 'PF-10');
        const customerSectionValidation = await scope.checkFilterExists('Customer', 'CUST-01');
        expect(bValidation && !(regionSectionValidation || brandSectionValidation || customerSectionValidation)).toBeTruthy();
    });

    it(`Test Case 5: New filter should not be created when scope is changed `, async () => {
        await scope.addFiltersToDimensionHierarchyInScope("LOCATION", "Region", ['REGION-10']);
        await browser.keys('Escape');
        await scope.clickOnApplyFiltersBtn();
        await browser.pause(5000);
        await scope.clickOnTab("Scope");
        const filterName = (await scope.getAppliedVFTitle()).toString();
        CommonFunctions.logMessage("INFO", "Filter Name: " + filterName);
        const boolean1 = await filterName.includes("Default Filter For Assumption");
        await CommonFunctions.compareTwoValues(boolean1, true, "New filter is not created when scope is changed");
        expect(boolean1).toEqual(true);
        await scope.clickRevertVFChanges();
        await browser.pause(3000);
    });

     // it(`Test Case 3: Is ${TestData.GLOBAL_SCOPE_FILTER_NAME} filter reflected in ${TestData.ASSUMPTION_VIEW_NAME} of other assumption "${TestData.ASSUMPTION.OTHER_ASSUMPTION_NAME}" `, async () => {
    //     await PlanningSpace.navigateToPlanningSpace();
    //     await browser.pause(3000);
    //     await PlanningSpace.launchContext("Assumption", { origin: TestData.PROCESS_NAME, assumption: TestData.ASSUMPTION.OTHER_ASSUMPTION_NAME });
    //     await browser.pause(3000);
    //     const bValidation1: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.getProcessName() === TestData.ASSUMPTION.OTHER_ASSUMPTION_NAME, true, `Is other assumption updated in breadcrumb`);
    //     await PlanningSpace.selectAllViewsOrFavourites("All Views");
    //     await PlanningSpace.clickDashBoard(TestData.ASSUMPTION_VIEW_NAME);
    //     await scope.clickOnTab('Scope');
    //     const appliedVFTitle: string = await scope.getAppliedVFTitle();
    //     const bValidation2: boolean = await CommonFunctions.compareTwoValues(appliedVFTitle === TestData.GLOBAL_SCOPE_FILTER_NAME, true, `Is ${TestData.GLOBAL_SCOPE_FILTER_NAME} filter applied for ${TestData.ASSUMPTION.OTHER_ASSUMPTION_NAME}`);
    //     expect(bValidation1 && bValidation2).toBeTruthy();
    // });

    // it(`Test Case 6: Is ${TestData.DEFAULT_FILTER_OPTION_NAME} filter reflected in ${TestData.ASSUMPTION_VIEW_NAME} of other assumption "${TestData.ASSUMPTION.OTHER_ASSUMPTION_NAME}" `, async () => {
    //     await PlanningSpace.navigateToPlanningSpace();
    //     await browser.pause(3000);
    //     await PlanningSpace.launchContext("Assumption", { origin: TestData.PROCESS_NAME, assumption: TestData.ASSUMPTION.ASSUMPTION_NAME });
    //     await PlanningSpace.clickDashBoard(TestData.ASSUMPTION_VIEW_NAME);
    //     await scope.clickOnTab('Scope');
    //     await browser.pause(5000)
    //     const appliedVFTitle: string = await scope.getAppliedVFTitle();
    //     console.log('applied VF-----------', appliedVFTitle);
    //     const bValidation = await CommonFunctions.compareTwoValues(appliedVFTitle === TestData.DEFAULT_FILTER_NAME_IN_VF, true, `Is ${TestData.DEFAULT_FILTER_NAME_IN_VF} filter applied for ${TestData.PROCESS_NAME}`);
    //     expect(bValidation).toBeTruthy();
    // });

});