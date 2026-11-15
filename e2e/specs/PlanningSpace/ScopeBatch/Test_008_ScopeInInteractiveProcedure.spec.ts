import PlanningSpace from "../../../pageobjects/planning.page";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScopeBatch/Test_008_ScopeInInteractiveProcedure.json");
import scope from "../../../pageobjects/scope.page"
import CommonFunctions from "../../../util/common.util";
import SupplyChainPage from "../../../pageobjects/sca.page";


describe('Verify scope filters in interactive procedure', () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await browser.pause(5000);
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
    });

    it('Test Case 1: Create Vertical Filter', async () => {
        await scope.clickOnTab('Scope')
        await CommonFunctions.logMessage("INFO", "Looking for three dots under scope tab")
        await scope.click3Dot();
        await scope.select3DotOption('Edit Configuration')
        await scope.selectFilterEntryFromDialogConfig('Select', 'ITEM')
        await scope.selectFilterEntryFromDialogConfig('Select', 'LOCATION')
        await scope.filterDialogSaveCancel('Next');
        await scope.selectDimensionHierarchyLevel('ITEM', ['ProductType'], 'check');
        await scope.selectDimensionHierarchyLevel('LOCATION', ['AllLocations'], 'check');
        await scope.filterDialogSaveCancel('Save');
        await scope.addFiltersToDimensionHierarchyInScope("ITEM", "ProductType", ['PF-00']);
        await scope.addFiltersToDimensionHierarchyInScope("LOCATION", "AllLocations", ['ALL']);
        await scope.clickOnApplyFiltersBtn();
        await browser.pause(10000);
        await scope.clickOnTab("Scope");
        const bValidation: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('ProductType', 'PF-00'), true, `Is Item filter applied`);
        expect(bValidation).toBeTruthy();
    });

    it(`Test Case 2: Verify applied filter in data scope while running ${TestData.PROCEDURE_NAME} PROCEDURE`, async () => {
        await SupplyChainPage.clickProcedureItemFromDropdown(TestData.PROCEDURE_NAME);
        await browser.pause(2000);
        await SupplyChainPage.clickOnNextStep();
        const bValidation: boolean = await scope.verifyAppliedFilterInDataScope({ dimesionName: 'ITEM', filterName: 'ProductType', filterValues: ['PF-00 | BEER'] });
        await CommonFunctions.compareTwoValues(bValidation, true, `applied filter doesn't exist in data scope`);
        expect(bValidation).toBeTruthy();
    });

    it(`Test Case 3: Update & verify scope through manage scope`, async () => {
        await scope.clickOnManageScope();
        await scope.click3DotInManageScope();
        await browser.pause(3000);
        await scope.select3DotOption('Edit Configuration');
        await browser.pause(5000);
        await scope.selectFilterEntryFromDialogConfig('Select', 'LOCATION');
        await scope.filterDialogSaveCancel('Next');
        await scope.selectDimensionHierarchyLevel('LOCATION', ['AllLocations'], 'check');
        await scope.filterDialogSaveCancel('Save');
        await browser.pause(5000);
        await scope.addFiltersToDimensionHierarchyInScope("LOCATION", "AllLocations", ['ALL']);
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('ProductType', 'PF-00'), true, `Is Item filter applied`);
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllLocations', 'ALL'), true, `Is Location filter applied`);
        await scope.clickOnApplyFiltersBtnInManageScope();
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInDataScope({ dimesionName: 'ITEM', filterName: 'ProductType', filterValues: ['PF-00 | BEER'] }), true, `Is Item filter applied outside Scope`);
        const bValidation4: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInDataScope({ dimesionName: 'LOCATION', filterName: 'AllLocations', filterValues: ['ALL'] }), true, `Is Location filter applied outside Scope`);
        expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
    })

});