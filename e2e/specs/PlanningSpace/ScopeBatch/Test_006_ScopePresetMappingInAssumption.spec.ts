import PlanningSpace from "../../../pageobjects/planning.page";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScopeBatch/Test_006_ScopePresetMappingInAssumption.json");
// import TestData from "../../../Testdata/PlanningSpace/ScopeBatch/Test_006_ScopePresetMappingInAssumption.json"
import scope from "../../../pageobjects/scope.page"
import CommonFunctions from "../../../util/common.util";

describe('Dashboard - Filter scope Preset Mapping should work in assumption', () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
        await PlanningSpace.launchContext("Assumption", { origin: TestData.PROCESS_NAME, assumption: TestData.ASSUMPTION_NAME });
    });

    it(`Test Case 1: Verify scope applied for assumption ${TestData.ASSUMPTION_NAME} is reflected as preselected in PS`, async () => {
        await browser.pause(5000);
        await scope.clickOnTab('Scope');
        await browser.pause(6000);
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.getScopeNameFromPowerBar(), "Preselected", "Filter Name Assertion in powerbar")
        // Check if scope has any filters configured. If No scope configured - just verify powerbar status
        const hasFilterPanels = await $$("//div[contains(@data-testid, 'vf-filterPanel-property-')]");
        if (hasFilterPanels.length > 0) {
            const bValidation2: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope(TestData.PRESELECTED_SCOPE_FOR_ASSUMPTION.ATTRIBUTE_NAME, TestData.PRESELECTED_SCOPE_FOR_ASSUMPTION.VALUE), true, `Is ${TestData.PRESELECTED_SCOPE_FOR_ASSUMPTION.DIMENSION_NAME} filter applied`);
            expect(bValidation1 && bValidation2).toBeTruthy();
        } else {
            expect(bValidation1).toBeTruthy();
        }
    });

    it('Test Case 2: Does preselected scope from assumption is override with new scope in Planning', async () => {
        await CommonFunctions.logMessage("INFO", "Looking for three dots under scope tab");
        await scope.click3Dot();
        await browser.pause(1000);
        await scope.select3DotOption('Edit Configuration');
        await browser.pause(1000);
        await scope.selectFilterEntryFromDialogConfig('UnSelect', TestData.PRESELECTED_SCOPE_FOR_ASSUMPTION.DIMENSION_NAME);
        await scope.selectFilterEntryFromDialogConfig('Select', TestData.SCOPE_TO_APPLY_IN_PLANNING_FOR_ASSUMPTION.DIMENSION_NAME);
        await browser.pause(1000);
        await scope.filterDialogSaveCancel('Next');
        await scope.selectDimensionHierarchyLevel(TestData.SCOPE_TO_APPLY_IN_PLANNING_FOR_ASSUMPTION.DIMENSION_NAME, [TestData.SCOPE_TO_APPLY_IN_PLANNING_FOR_ASSUMPTION.ATTRIBUTE_NAME], 'check');
        await scope.filterDialogSaveCancel('Save');
        await scope.addFiltersToDimensionHierarchyInScope(TestData.SCOPE_TO_APPLY_IN_PLANNING_FOR_ASSUMPTION.DIMENSION_NAME, TestData.SCOPE_TO_APPLY_IN_PLANNING_FOR_ASSUMPTION.ATTRIBUTE_NAME, [TestData.SCOPE_TO_APPLY_IN_PLANNING_FOR_ASSUMPTION.VALUE]);
        await scope.clickOnApplyFiltersBtn();
        await browser.pause(10000);
        await scope.clickOnTab('Scope');
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.getScopeNameFromPowerBar(), "Preselected", "Filter Name Assertion in powerbar")
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope(TestData.SCOPE_TO_APPLY_IN_PLANNING_FOR_ASSUMPTION.ATTRIBUTE_NAME, TestData.SCOPE_TO_APPLY_IN_PLANNING_FOR_ASSUMPTION.VALUE), true, `Is ${TestData.SCOPE_TO_APPLY_IN_PLANNING_FOR_ASSUMPTION.DIMENSION_NAME} filter applied`);
        expect(bValidation1 && bValidation2).toBeTruthy();
        await scope.closeDrawer();
    })

    it(`Test Case 3: Should reset to preselected scope of ${TestData.ASSUMPTION_NAME} assumption after revisit`, async () => {
        await PlanningSpace.navigateToPlanningSpace();
        await PlanningSpace.launchContext("Assumption", { origin: TestData.PROCESS_NAME, assumption: TestData.ASSUMPTION_NAME });
        await scope.clickOnTab('Scope');
        await browser.pause(6000);
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.getScopeNameFromPowerBar(), "Preselected", "Filter Name Assertion in powerbar")  
        // Check if scope has any filters configured. If No scope configured - just verify powerbar status
        const hasFilterPanels = await $$("//div[contains(@data-testid, 'vf-filterPanel-property-')]");
        if (hasFilterPanels.length > 0) {
            const bValidation2: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope(TestData.PRESELECTED_SCOPE_FOR_ASSUMPTION.ATTRIBUTE_NAME, TestData.PRESELECTED_SCOPE_FOR_ASSUMPTION.VALUE), true, `Is ${TestData.PRESELECTED_SCOPE_FOR_ASSUMPTION.DIMENSION_NAME} filter applied`);
            await scope.clickOnApplyFiltersBtn();
            expect(bValidation1 && bValidation2).toBeTruthy();
        } else {
            expect(bValidation1).toBeTruthy();
        }
    })

});