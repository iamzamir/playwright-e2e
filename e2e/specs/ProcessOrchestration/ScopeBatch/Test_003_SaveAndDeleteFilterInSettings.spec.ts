import PlanningSpace from "../../../pageobjects/planning.page";
import scope from "../../../pageobjects/scope.page"
import CommonFunctions from "../../../util/common.util";
import processPage from "../../../pageobjects/process.page";
import TestUtil from "../../../util/test.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/ScopeBatch/Test_003_SaveAndDeleteFilterInSettings.json");

const random_name = Math.floor(1000 + Math.random() * 9000);
const filterName = 'SaveAndDeleteInSettings' + random_name;

describe('PO - Create And Delete Vertical Filter in Settings module', () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await browser.pause(5000);
        await TestUtil.clickPowerBarLink('Process Settings');
        await CommonFunctions.switchToSpecificWindow(1);
        await PlanningSpace.switchToMFEFrame();
    });

    it('Test Case 1: Create Vertical Filter', async () => {
        await processPage.clickLeftpaneLinks("Scope");
        await scope.clickOnResetDimensions();
        await scope.clickOnEditDimensions();
        await scope.click3Dot();
        await scope.select3DotOption('Edit Configuration');
        await scope.selectFilterEntryFromDialogConfig('Select', 'ITEM');
        await scope.selectFilterEntryFromDialogConfig('Select', 'LOCATION');
        await scope.selectFilterEntryFromDialogConfig('Select', 'CUSTOMER');
        await scope.filterDialogSaveCancel('Next');
        await scope.selectDimensionHierarchyLevel('ITEM', ['ProductType'], 'check');
        await scope.selectDimensionHierarchyLevel('LOCATION', ['AllLocations'], 'check');
        await scope.selectDimensionHierarchyLevel('CUSTOMER', ['AllChannels'], 'check');
        await scope.filterDialogSaveCancel('Save');
        await scope.addFiltersToDimensionHierarchyInScope("ITEM", "ProductType", ['PF-00']);
        await scope.addFiltersToDimensionHierarchyInScope("LOCATION", "AllLocations", ['ALL']);
        await scope.addFiltersToDimensionHierarchyInScope("CUSTOMER", "AllChannels", ['ALL CUSTOMERS']);
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllChannels', 'ALL CUSTOMERS'), true, `Is Customer filter applied`);
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('ProductType', 'PF-00'), true, `Is Item filter applied`);
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllLocations', 'ALL'), true, `Is Location filter applied`);
        await scope.click3Dot();
        await scope.select3DotOption('Save Filter');
        await scope.setCreateInputFilterValue(filterName);
        const bValidation4: boolean = await scope.filterDialogSaveCancel('Save');
        await browser.pause(60000);
        const bValidation5: boolean = await CommonFunctions.compareTwoValues(await scope.getFilterName(), filterName, "Created Filter Name Assertion in the Filter Dropdown");
        const bValidation6: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllChannels', 'ALL CUSTOMERS'), true, `Is Customer filter applied`);
        const bValidation7: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('ProductType', 'PF-00'), true, `Is Item filter applied`);
        const bValidation8: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllLocations', 'ALL'), true, `Is Location filter applied`);
        expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8).toEqual(true);
    });

    it('Test Case 2: Verify Scope Restrictions Applied for Preselected Filter', async () => {
        await scope.clickOnApplyFiltersBtn();
        await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
        await PlanningSpace.switchToMFEFrame();
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.PRESELECT_VIEW_NAME);
        await scope.clickOnTab('Scope');
        const bValidation1: boolean = await scope.searchFilter(filterName);
        await browser.pause(45000);
        const availableHierarchyItems = await scope.getAvailableHierarchyValuesFromPopup('ITEM', 'ProductType');
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(availableHierarchyItems[0].includes('PF-00'), true, "Check if PF-00 is present in ProductType");
        const availableHierarchyLocation = await scope.getAvailableHierarchyValuesFromPopup('LOCATION', 'AllLocations');
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(availableHierarchyLocation[0].includes('ALL'), true, "Check if ALL is present in AllLocations");
        const availableHierarchyCustomer = await scope.getAvailableHierarchyValuesFromPopup('CUSTOMER', 'AllChannels');
        const bValidation4: boolean = await CommonFunctions.compareTwoValues(availableHierarchyCustomer[0].includes('ALL CUSTOMERS'), true, "Check if ALL CUSTOMERS is present in AllChannels");
        await scope.click3Dot();
        await scope.select3DotOption('Edit Configuration');
        const customerFilterElement = await scope.getFilterEntryFromDialogConfig('CUSTOMER');
        const bValidation5: boolean = await CommonFunctions.compareTwoValues(
            await scope.doesElementExist(customerFilterElement, 'Does Customer filter exist in dialog'), true, `Does Customer filter exists`);
        const itemFilterElement = await scope.getFilterEntryFromDialogConfig('ITEM');
        const bValidation6: boolean = await CommonFunctions.compareTwoValues(
            await scope.doesElementExist(itemFilterElement, 'Does Item filter exist in dialog'), true, `Does Item filter exists`);
        const locationFilterElement = await scope.getFilterEntryFromDialogConfig('LOCATION');
        const bValidation7: boolean = await CommonFunctions.compareTwoValues(
            await scope.doesElementExist(locationFilterElement, 'Does Location filter exist in dialog'), true, `Does Location filter exists`);
        const timeFilterElement = await scope.getFilterEntryFromDialogConfig('TIME');
        const bValidation8: boolean = await CommonFunctions.compareTwoValues(
            await scope.doesElementExist(timeFilterElement, 'Does Time filter exist in dialog'), false, `Does Time filter exists`);
        expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8).toEqual(true);
        await scope.filterDialogSaveCancel('Cancel');
    });

    it('Test Case 3: Verify Scope Restrictions Applied for Default Filter', async()=>{
        await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
        await PlanningSpace.switchToMFEFrame();
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.DEFAULT_VIEW_NAME);
        await scope.clickOnTab('Scope');
        const bValidation1: boolean = await scope.searchFilter(filterName);
        await browser.pause(30000);
        const availableHierarchyItems = await scope.getAvailableHierarchyValuesFromPopup('ITEM', 'ProductType');
        const bValidation2 = await CommonFunctions.compareTwoValues(availableHierarchyItems[0].includes('PF-00'), true, "Check if PF-00 is present in ProductType");
        const availableHierarchyLocation = await scope.getAvailableHierarchyValuesFromPopup('LOCATION', 'AllLocations');
        const bValidation3 = await CommonFunctions.compareTwoValues(availableHierarchyLocation[0].includes('ALL'), true, "Check if ALL is present in AllLocations");
        const availableHierarchyCustomer = await scope.getAvailableHierarchyValuesFromPopup('CUSTOMER', 'AllChannels');
        const bValidation4 = await CommonFunctions.compareTwoValues(availableHierarchyCustomer[0].includes('ALL CUSTOMERS'), true, "Check if CUSTOMERS item is present in AllChannels");
        await scope.click3Dot();
        await scope.select3DotOption('Edit Configuration');
        const customerFilterElement = await scope.getFilterEntryFromDialogConfig('CUSTOMER');
        const bValidation5: boolean = await CommonFunctions.compareTwoValues(
        await scope.doesElementExist(customerFilterElement, 'Does Customer filter exist in dialog'), true, `Does Customer filter exists`);
        const itemFilterElement = await scope.getFilterEntryFromDialogConfig('ITEM');
        const bValidation6: boolean = await CommonFunctions.compareTwoValues(
        await scope.doesElementExist(itemFilterElement, 'Does Item filter exist in dialog'), true, `Does Item filter exists`);
        const locationFilterElement = await scope.getFilterEntryFromDialogConfig('LOCATION');
        const bValidation7: boolean = await CommonFunctions.compareTwoValues(
        await scope.doesElementExist(locationFilterElement, 'Does Location filter exist in dialog'), true, `Does Location filter exists`);
        const timeFilterElement = await scope.getFilterEntryFromDialogConfig('TIME');
        const bValidation8: boolean = await CommonFunctions.compareTwoValues(
        await scope.doesElementExist(timeFilterElement, 'Does Time filter exist in dialog'), false, `Does Time filter exists`);
        expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8).toEqual(true);
        await scope.filterDialogSaveCancel('Cancel');
    });

    it('Test Case 4: Filters with a Different Dimension Hierarchy from Scope Restrictions Should Not Be Displayed', async () => {
        await scope.clickOnTab('Scope');
        const bValidation1 = await scope.searchFilter(TestData.DEFAULT_FILTER_NAME);
        const isFilterConfigured = !await scope.isFilterConfigured();
        await TestUtil.clickPowerBarLink('Process Settings');
        await CommonFunctions.switchToSpecificWindow(2);
        await PlanningSpace.switchToMFEFrame();
        await processPage.clickLeftpaneLinks("Scope");
        await scope.clickOnResetDimensions();
        await scope.clickOnEditDimensions();
        const bValidation2 = await scope.searchFilter(filterName);
        await browser.pause(30000);
        expect(bValidation1 && isFilterConfigured && bValidation2).toEqual(true);
    });

    it('Test Case 5: Overwrite Vertical Filter', async () => {
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllChannels', 'ALL CUSTOMERS'), true, `Is Customer filter applied`);
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('ProductType', 'PF-00'), true, `Is Item filter applied`);
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllLocations', 'ALL'), true, `Is Location filter applied`);
        await scope.click3Dot();
        await scope.select3DotOption('Save Filter')
        await scope.selectOverWriteFilter();
        const bValidation4: boolean = await scope.filterDialogSaveCancel('Update');
        await browser.pause(45000);
        const bValidation5: boolean = await CommonFunctions.compareTwoValues(await scope.getFilterName(), filterName, "Created Filter Name Assertion in the Filter Dropdown");
        const bValidation6: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllChannels', 'ALL CUSTOMERS'), true, `Is Customer filter applied`);
        const bValidation7: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('ProductType', 'PF-00'), true, `Is Item filter applied`);
        const bValidation8: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllLocations', 'ALL'), true, `Is Location filter applied`);
        expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8).toEqual(true)
    });

    it('Test Case 6: Disable Created Filter', async () => {
        await scope.click3Dot();
        await scope.select3DotOption('Manage All')
        await scope.disableFilter(filterName);
        await scope.filterDialogSaveCancel('Close');
        const bValidation: boolean = await CommonFunctions.compareTwoValues(!(await scope.getFilterName()).includes(filterName), true, "Created Filter Name should not appear as it was disabled assertion");
        expect(bValidation).toEqual(true);
    });

    it('Test Case 7: Delete Created Vertical Filter', async () => {
        let bValidation: boolean = await CommonFunctions.compareTwoValues(await scope.deleteFilter(filterName), true, 'Delete Filter Success? ');
        expect(bValidation).toEqual(true);
    });

});