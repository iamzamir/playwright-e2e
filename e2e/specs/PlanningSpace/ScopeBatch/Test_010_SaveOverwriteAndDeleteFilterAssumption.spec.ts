import PlanningSpace from "../../../pageobjects/planning.page";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScopeBatch/Test_010_SaveOverwriteAndDeleteFilterAssumption.json");
import scope from "../../../pageobjects/scope.page"
import CommonFunctions from "../../../util/common.util";

const random_name = Math.floor(1000 + Math.random() * 9000);
const filterName = 'SaveAndDelete' + random_name

describe('Create, Overwrite, Disable And Delete Vertical Filter - Assumption', () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
        await PlanningSpace.launchContext("Assumption", { origin: TestData.PROCESS_NAME, assumption: TestData.ASSUMPTION_NAME });
    });

    it('Test Case 1: Create Vertical Filter', async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        await scope.clickOnTab('Scope')
        await CommonFunctions.logMessage("INFO", "Looking for three dots under scope tab")
        await scope.click3Dot();
        await scope.select3DotOption('Edit Configuration')
        await scope.selectFilterEntryFromDialogConfig('Select', 'ITEM')
        await scope.selectFilterEntryFromDialogConfig('Select', 'LOCATION')
        await scope.selectFilterEntryFromDialogConfig('Select', 'CUSTOMER')
        await scope.filterDialogSaveCancel('Next');

        await scope.selectDimensionHierarchyLevel('ITEM', ['ProductType'], 'check');
        await scope.selectDimensionHierarchyLevel('LOCATION', ['AllLocations'], 'check');
        await scope.selectDimensionHierarchyLevel('CUSTOMER', ['AllChannels'], 'check');
        await scope.filterDialogSaveCancel('Save');

        await scope.addFiltersToDimensionHierarchyInScope("ITEM", "ProductType", ['PF-10']);
        await scope.expandDimensionInVF('AllLocations', 'property');
        await scope.addFiltersToDimensionHierarchyInScope("LOCATION", "AllLocations", ['ALL']);
        await scope.expandDimensionInVF('AllChannels', 'property');
        await scope.addFiltersToDimensionHierarchyInScope("CUSTOMER", "AllChannels", ['ALL CUSTOMERS']);

        await browser.pause(2000);
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllChannels', 'ALL CUSTOMERS'), true, `Is Customer filter applied`);
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('ProductType', 'PF-10'), true, `Is Item filter applied`);
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllLocations', 'ALL'), true, `Is Location filter applied`);

        await scope.click3Dot();
        await scope.select3DotOption('Save Filter')
        await scope.setCreateInputFilterValue(filterName);
        const bValidation4: boolean = await scope.clickCreateNewButton();
        await browser.pause(10000);

        const bValidation5: boolean = await CommonFunctions.compareTwoValues(await scope.getFilterName(), filterName, "Created Filter Name Assertion in the Filter Dropdown");
        const bValidation6: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllChannels', 'ALL CUSTOMERS'), true, `Is Customer filter applied`);
        const bValidation7: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('ProductType', 'PF-10'), true, `Is Item filter applied`);
        const bValidation8: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllLocations', 'ALL'), true, `Is Location filter applied`);
        expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8).toEqual(true)
    });

    it('Test Case 2: Overwrite Vertical Filter', async () => {
        await browser.pause(2000);
        await scope.addFiltersToDimensionHierarchyInScope("ITEM", "ProductType", ['PF-20']);
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllChannels', 'ALL CUSTOMERS'), true, `Is Customer filter applied`);
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('ProductType', 'PF-10'), true, `Is Item filter applied`);
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('ProductType', 'PF-20'), true, `Is Item filter applied`);
        const bValidation4: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllLocations', 'ALL'), true, `Is Location filter applied`);

        await scope.click3Dot();
        await scope.select3DotOption('Save Filter')
        await scope.selectOverWriteFilter();
        const bValidation5: boolean = await scope.clickCreateNewButton();
        await browser.pause(45000);

        const bValidation6: boolean = await CommonFunctions.compareTwoValues(await scope.getFilterName(), filterName, "Created Filter Name Assertion in the Filter Dropdown");
        const bValidation7: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllChannels', 'ALL CUSTOMERS'), true, `Is Customer filter applied`);
        const bValidation8: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('ProductType', 'PF-10'), true, `Is Item filter applied`);
        const bValidation9: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('ProductType', 'PF-20'), true, `Is Item filter applied`);
        const bValidation10: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllLocations', 'ALL'), true, `Is Location filter applied`);
        expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation9 && bValidation10).toEqual(true)
    });

    it('Test Case 3: Disable Created Filter', async () => {
        await scope.click3Dot();
        await scope.select3DotOption('Manage All')
        await scope.disableFilter(filterName);
        await scope.clickCloseButton();
        const bValidation: boolean = await CommonFunctions.compareTwoValues(!(await scope.getFilterName()).includes(filterName), true, "Created Filter Name should not appear as it was disabled assertion");
        expect(bValidation).toEqual(true);
    });

    it('Test Case 4: Delete Created Vertical Filter', async () => {
        let bValidation: boolean = await CommonFunctions.compareTwoValues(await scope.deleteFilter(filterName), true, 'Delete Filter Sucess? ');
        expect(bValidation).toEqual(true);
    });

});