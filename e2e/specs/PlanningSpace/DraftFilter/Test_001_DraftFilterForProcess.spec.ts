import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
import scope from "../../../pageobjects/scope.page";

const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/DraftFilter/Test_001_DraftFilterForProcess.json");
let newFilter;
let filterValues;
describe('Draft Filter for Process', () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME, false, false);
    });

    it('Test Case 1: New filter should be created for global scope', async () => {
        const filterConfigs = [ { type: 'ITEM', category: 'Brand', value: ['PF-00'] } ];

        // await PlanningSpace.selectAllViewsOrFavourites("All Views");
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        await browser.pause(2000);
        await PlanningSpace.configureFilters(filterConfigs);
        await browser.pause(10000);
        await scope.clickOnTab('Scope');
        newFilter = (await scope.getAppliedVFTitle()).toString();
        await CommonFunctions.logMessage("INFO", "New Filter Name: " + newFilter);
        const boolean1 = await newFilter.includes("New Filter");
        await CommonFunctions.compareTwoValues(boolean1, true, "Draft filter applied for global scope");
        await browser.pause(5000);
        const boolean2 = await PlanningSpace.verifyScopeInBudgeAndVF();
        await CommonFunctions.compareTwoValues(boolean2, true, "Scope is same in scope budge in Powerbar and VF");
        await scope.closeDrawer();
        expect(boolean1 && boolean2).toEqual(true);
    });

    it('Test Case 2: Check newly Created Scope is applied globally for other views', async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME_2);
        await browser.pause(3000);
        await scope.clickOnTab('Scope');
        await browser.pause(6000);
        const appliedFilter = await scope.getAppliedVFTitle();
        await CommonFunctions.compareTwoValues(appliedFilter, newFilter, "new filter applied for globally");
        await scope.closeDrawer();
        expect(appliedFilter).toEqual(newFilter);
    });

    it('Test Case 3: Draft filter should be created for default scope', async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.DEFAULT_SCOPE_VIEW_NAME);
        await browser.pause(4000);
        await scope.clickOnViewActions('Set Default Scope Filter');
        await browser.pause(3000);
        await scope.setDefaultScopeFilter(newFilter.replace(/\*/g, ''));
        const isPresetSaved = await CommonFunctions.verifyAlertMsg('Preset is saved for the view', 5000);
        await CommonFunctions.compareTwoValues(isPresetSaved, true, "Default scope filter is set successfully");
        await scope.clickOnTab('Scope');
        await browser.pause(3000);
        filterValues = await scope.getAllVFSelectedValues(); 

        //modify filter configuration for default scope
        await scope.addFiltersToDimensionHierarchyInScope("ITEM", "Brand", ['PF-10']);
        await browser.keys(['Escape']);
        await scope.clickOnApplyFiltersBtn();
        await browser.pause(5000);
        await scope.clickOnTab('Scope');
        const boolean1 = await scope.isDraftFilterCreated();
        await CommonFunctions.compareTwoValues(boolean1, true, "Draft filter applied for global scope");
        await browser.pause(10000);
        const scopeName = await PlanningSpace.getScopeNameFromPowerBar();
        console.log("Scope Name from Powerbar: ", scopeName);
        await CommonFunctions.compareTwoValues(scopeName, newFilter+'*', "Scope is same in scope budge in Powerbar and VF");
        expect(boolean1).toEqual(true);
    });

    it('Test Case 4: should get original values of default filter when revert is clicked', async () => {
        await browser.pause(5000);
        await scope.clickRevertVFChanges();
        await browser.pause(5000);
        await scope.clickOnTab('Scope');
        const VFValues = await scope.getAllVFSelectedValues();
        const bValidation1 = JSON.stringify(VFValues) == JSON.stringify(filterValues);
        await browser.pause(7000);
        await CommonFunctions.compareTwoValues(VFValues, filterValues, "Default filter values are reverted successfully");
        const bValidation2 : boolean = await PlanningSpace.verifyScopeInBudgeAndVF();
        expect(bValidation1 && bValidation2).toEqual(true);
    });

    it('Test Case 5: Delete Created Vertical Filter', async () => {
        let bValidation: boolean = await CommonFunctions.compareTwoValues(await scope.deleteFilter(newFilter.replace(/\*/g, '')), true, 'Delete Filter Sucess? ');
        expect(bValidation).toEqual(true);
    });
});
