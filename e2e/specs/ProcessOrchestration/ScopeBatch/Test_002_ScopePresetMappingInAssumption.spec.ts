import PlanningSpace from "../../../pageobjects/planning.page";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/ScopeBatch/Test_002_ScopePresetMappingInAssumption.json");
import processPage from "../../../pageobjects/process.page";
import scope from "../../../pageobjects/scope.page"
import CommonFunctions from "../../../util/common.util";

describe('PO - Filter scope Preset Mapping should work in Assumption', () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
        await browser.pause(5000);
        await PlanningSpace.launchContext("Assumption", { origin: TestData.PROCESS_NAME, assumption: TestData.ASSUMPTION });
    });

    it('Test Case 1: Verify Scope tab in Assumption and filter verification', async () => {
        await processPage.clickLeftpaneLinks("Assumption");
    });

    it('Test Case 2: Config Filter', async () => {
        await scope.clickOnEditDimensions();
        await CommonFunctions.logMessage("INFO", "Looking for three dots under scope tab")
        await scope.click3Dot();
        await scope.select3DotOption('Edit Configuration');
        await scope.selectFilterEntryFromDialogConfig('Select', 'ITEM');
        await scope.selectFilterEntryFromDialogConfig('Select', 'LOCATION');
        await scope.selectFilterEntryFromDialogConfig('Select', 'CUSTOMER');
        await browser.pause(1000)
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
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it(`Test Case 4: Verifying applied filters are available after revist to ${TestData.ASSUMPTION} assumption`, async () => {
        await processPage.clickLeftpaneLinks("Planning");
        await browser.pause(5000);
        await processPage.clickLeftpaneLinks("Assumption");
        await browser.pause(5000);
        await scope.clickOnEditDimensions();
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllChannels', 'ALL CUSTOMERS'), true, `Is Customer filter applied`);
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllProducts', 'ALL'), true, `Is Item filter applied`);
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllLocations', 'ALL'), true, `Is Location filter applied`);
        await scope.clickOnApplyFiltersBtn();
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    })

});