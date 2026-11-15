import PlanningSpace from "../../../pageobjects/planning.page";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScopeBatch/Test_005_ScopePresetMappingInSubProcess.json");
// import TestData from "../../../Testdata/PlanningSpace/ScopeBatch/Test_005_ScopePresetMappingInSubProcess.json"
import scope from "../../../pageobjects/scope.page"
import CommonFunctions from "../../../util/common.util";

describe('Dashboard - Filter scope Preset Mapping should work in sub process', () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
        await PlanningSpace.launchContext("Sub-process", { process: TestData.PROCESS_NAME, subProcess: TestData.SUB_PROCESS_NAME });
    });

    it('Test Case 1: Verify Scope tab in Planning Space and filter verification', async () => {
        const eleExist: boolean = await scope.clickOnTab('Scope');
        let bValidation: boolean = await CommonFunctions.compareTwoValues(eleExist, true, "Scope Tab is enabled");
        expect(bValidation).toEqual(true);
    });


    it('Test Case 2: Config Filter', async () => {
        await CommonFunctions.logMessage("INFO", "Looking for three dots under scope tab");
        await scope.click3Dot();
        await browser.pause(1000);
        await scope.select3DotOption('Edit Configuration');
        await browser.pause(1000);
        await scope.selectFilterEntryFromDialogConfig('Select', 'ITEM');
        await scope.selectFilterEntryFromDialogConfig('Select', 'LOCATION');
        await scope.selectFilterEntryFromDialogConfig('Select', 'CUSTOMER');
        await browser.pause(1000);
        await scope.filterDialogSaveCancel('Next');
        await scope.selectDimensionHierarchyLevel('ITEM', ['AllProducts'], 'check');
        await scope.selectDimensionHierarchyLevel('LOCATION', ['AllLocations'], 'check');
        await scope.selectDimensionHierarchyLevel('CUSTOMER', ['AllChannels'], 'check');
        await scope.filterDialogSaveCancel('Save');
    })

    it('Test Case 3: Selecting Filter', async () => {
        await scope.addFiltersToDimensionHierarchyInScope("ITEM", "AllProducts", ['ALL']);
        await scope.addFiltersToDimensionHierarchyInScope("LOCATION", "AllLocations", ['ALL']);
        await scope.addFiltersToDimensionHierarchyInScope("CUSTOMER", "AllChannels", ['ALL CUSTOMERS']);
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllChannels', 'ALL CUSTOMERS'), true, `Is Customer filter applied`);
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllProducts', 'ALL'), true, `Is Item filter applied`);
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllLocations', 'ALL'), true, `Is Location filter applied`);
        await scope.clickOnApplyFiltersBtn();
        await browser.pause(10000);
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it(`Test Case 4: Verifying applied filters are available after revist to ${TestData.SUB_PROCESS_NAME} sub process`, async () => {
        await PlanningSpace.navigateToPlanningSpace();
        await PlanningSpace.launchContext("Sub-process", { process: TestData.PROCESS_NAME, subProcess: TestData.SUB_PROCESS_NAME });
        await scope.clickOnTab('Scope');
        await browser.pause(5000);
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllChannels', 'ALL CUSTOMERS'), true, `Is Customer filter applied`);
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllProducts', 'ALL'), true, `Is Item filter applied`);
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllLocations', 'ALL'), true, `Is Location filter applied`);
        await scope.clickOnApplyFiltersBtn();
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    })

});