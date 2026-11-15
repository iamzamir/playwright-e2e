import PlanningSpace from "../../../pageobjects/planning.page";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScopeBatch/Test_004_ScopePresetMappingInProcess.json");
import scope from "../../../pageobjects/scope.page"
import CommonFunctions from "../../../util/common.util";

let skipAllTests = false;
describe('Dashboard - Filter scope Preset Mapping should work in process', () => {
    let isAnyFilterApplied = false;
    let isRequiredFilterApplied = false;

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME, false, false);
    });

    it('Test Case 1: Verify Scope defined or not in Planning Space', async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.selectAllViewsOrFavourites("All Views");
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        await browser.pause(2000);
        await scope.clickOnTab('Scope');
        await browser.pause(5000);
        isAnyFilterApplied = await scope.isFilterConfigured();
        const bValidation = await CommonFunctions.compareTwoValues(isAnyFilterApplied, true, "Verify if any filter is defined in the process");
        expect(bValidation).toEqual(true);
    });

    it('Test Case 2: Verify if required Filter is applied or not', async function() {
        if(!isAnyFilterApplied) {
            await CommonFunctions.logMessage("INFO", "No filters are defined in the process.");
            this.skip();
        }
        const scopeInPowerbar = await PlanningSpace.getScopeNameFromPowerBar();
        const scopeInVFTitle = await scope.getAppliedVFTitle();
        
        // Clean and normalize filter names for comparison (case-insensitive and trimmed)
        const cleanPowerbarName = scopeInPowerbar.replace(/\*/g, '').toLowerCase().trim();
        const cleanVFTitleName = scopeInVFTitle.replace(/\*/g, '').toLowerCase().trim();
        const expectedFilterName = TestData.FILTER_NAME.toLowerCase().trim();
        
        const bValidation1 = await CommonFunctions.compareTwoValues(cleanPowerbarName, expectedFilterName, "Verify scope in Powerbar");
        const bValidation2 = await CommonFunctions.compareTwoValues(cleanVFTitleName, expectedFilterName, "Verify scope in VF Title");
        isRequiredFilterApplied = bValidation1 && bValidation2;
        if(isRequiredFilterApplied) {
            await CommonFunctions.logMessage("INFO", `Required filter: ${TestData.FILTER_NAME} is already applied.`);
            skipAllTests = true;
        } else {
            await CommonFunctions.logMessage("INFO", `Required filter: ${TestData.FILTER_NAME} is NOT applied. Applying the filter...`);
            await scope.searchFilter(TestData.FILTER_NAME);
            await scope.clickOnApplyFiltersBtn();
            await browser.pause(5000);  // Let the filter get applied
        }
    });
});

describe('Verify global scope persists', () => { 
    before(async function () {
        if(skipAllTests) {
            await CommonFunctions.logMessage("INFO", "Skipping applying filter as required filter is already applied.");
            this.skip();
        }
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME, false, false);

    });

    it('Test Case 3: Verify applied filters are available after revisit to process', async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.selectAllViewsOrFavourites("All Views");
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        await browser.pause(2000);
        await scope.clickOnTab('Scope');
        await browser.pause(5000);
        const scopeInPowerbar = await PlanningSpace.getScopeNameFromPowerBar();
        const scopeInVFTitle = await scope.getAppliedVFTitle();
        
        // Clean and normalize filter names for comparison (case-insensitive and trimmed)
        const cleanPowerbarName = scopeInPowerbar.replace(/\*/g, '').toLowerCase().trim();
        const cleanVFTitleName = scopeInVFTitle.replace(/\*/g, '').toLowerCase().trim();
        const expectedFilterName = TestData.FILTER_NAME.toLowerCase().trim();
        
        const bValidation1 = await CommonFunctions.compareTwoValues(cleanPowerbarName, expectedFilterName, "Verify scope in Powerbar");
        const bValidation2 = await CommonFunctions.compareTwoValues(cleanVFTitleName, expectedFilterName, "Verify scope in VF Title");
        expect(bValidation1 && bValidation2).toBeTruthy();
    });
 });