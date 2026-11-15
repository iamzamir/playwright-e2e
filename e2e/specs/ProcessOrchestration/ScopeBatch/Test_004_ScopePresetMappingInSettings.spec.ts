import PlanningSpace from "../../../pageobjects/planning.page";
import processPage from "../../../pageobjects/process.page";
import scope from "../../../pageobjects/scope.page"
import CommonFunctions from "../../../util/common.util";
import TestUtil from "../../../util/test.util";

const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/ScopeBatch/Test_004_ScopePresetMappingInSettings.json");
describe('PO - Filter scope Preset Mapping should work in Settings', () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await browser.pause(5000);
        await TestUtil.clickPowerBarLink('Process Settings');
        await CommonFunctions.switchToSpecificWindow(1);
        await browser.pause(5000);
        await PlanningSpace.switchToMFEFrame();
    });

    it('Test Case 1: Verify Scope tab in Assumption and filter verification', async () => {
        const eleExist: boolean = await processPage.clickLeftpaneLinks("Scope");
        let bValidation: boolean = await CommonFunctions.compareTwoValues(eleExist, true, "Scope link should be exist in left nav bar");
        expect(bValidation).toEqual(true);
    });

    it('Test Case 2: Config Filter', async () => {
        await scope.clickOnEditDimensions();
        await CommonFunctions.logMessage("INFO", "Looking for three dots under scope tab")
        await scope.click3Dot();
        await browser.pause(1000)
        await scope.select3DotOption('Edit Configuration')
        await browser.pause(1000)
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

    it(`Test Case 4: Verifying applied filters are available after revist to Scope in settings`, async () => {
        await processPage.clickLeftpaneLinks("Process Details");
        await browser.pause(5000);
        await processPage.clickLeftpaneLinks("Scope");
        await browser.pause(5000);
        await scope.clickOnEditDimensions();
        await browser.pause(2000);
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllChannels', 'ALL CUSTOMERS'), true, `Is Customer filter applied`);
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllProducts', 'ALL'), true, `Is Item filter applied`);
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllLocations', 'ALL'), true, `Is Location filter applied`);
        await scope.clickOnApplyFiltersBtn();
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    })

    it("Test case 5: Navigate to planning space and validate the scope", async () => {
        await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
        await browser.pause(5000);
        await PlanningSpace.switchToMFEFrame();
        await browser.pause(5000);
        await scope.clickOnTab('Scope');
        await browser.pause(30000);
        const filterConfigs1 = [
            { type: 'ITEM', category: 'AllProducts', value: ['ALL'] },
            { type: 'LOCATION', category: 'AllLocations', value: ['ALL'] },
            { type: 'CUSTOMER', category: 'AllChannels', value: ['ALL CUSTOMERS'] }
        ];
        const configuredFilter1 = await PlanningSpace.configureFilters(filterConfigs1);
        await browser.pause(20000);
        const bValidation1 = await CommonFunctions.compareTwoValues(configuredFilter1, true, "Filter should be configured");
        const filterConfigs2 = [
            { type: 'TIME', category: 'DAY', value: ['2018-05-01'] },
        ];
        const configuredFilter2 = await PlanningSpace.configureFilters(filterConfigs2);
        await browser.pause(5000);
        await scope.filterDialogSaveCancel('Save');
        const bValidation2 = await CommonFunctions.compareTwoValues(configuredFilter2, false, "The filter should not contain TIME dimension as it is restricted in process settings");

        expect(bValidation1 && bValidation2).toBeTruthy();
    })
    it("Test Case 6: Remove the Process level scope", async () => {
        await TestUtil.clickPowerBarLink('Process Settings');
        await CommonFunctions.switchToSpecificWindow(2);
        await browser.pause(5000);
        await PlanningSpace.switchToMFEFrame();
        await browser.pause(5000);
        await processPage.clickLeftpaneLinks("Scope");
        await browser.pause(5000);
        await scope.clickOnResetDimensions();   
    })

    it("Test Case 7: Validate in Planning Space", async () => {
        await browser.refresh();
        await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
        await browser.pause(5000);
        await PlanningSpace.switchToMFEFrame();
        await browser.pause(5000);
        await scope.clickOnTab('Scope');
        await browser.pause(30000);
        const filterConfigs1 = [
            { type: 'ITEM', category: 'AllProducts', value: ['ALL'] },
            { type: 'LOCATION', category: 'AllLocations', value: ['ALL'] },
            { type: 'CUSTOMER', category: 'AllChannels', value: ['ALL CUSTOMERS'] }
        ];
        const configuredFilter1 = await PlanningSpace.configureFilters(filterConfigs1);
        await browser.pause(20000);
        const bValidation1 = await CommonFunctions.compareTwoValues(configuredFilter1, true, "Filter should be configured");
        const filterConfigs2 = [
            { type: 'TIME', category: 'DAY', value: ['2018-05-01'] },
        ];
        const configuredFilter2 = await PlanningSpace.configureFilters(filterConfigs2);
        await browser.pause(5000);
        const bValidation2 = await CommonFunctions.compareTwoValues(configuredFilter2, true, "The filter should contain TIME dimension as scope is removed in process settings");

        expect(bValidation1 && bValidation2).toBeTruthy();
    })

});