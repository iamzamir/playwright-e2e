const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScenarioBatch/Test_032_VFDimensiondatawithPrivateandPublicScenario.json");
import PlanningSpace from "../../../pageobjects/planning.page";
import ProcessPage from '../../../pageobjects/process.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
import TestUtil from "../../../util/test.util";
import CommonFunctions from "../../../util/common.util";
import scope from "../../../pageobjects/scope.page";

describe('Dimension filter data with Private and Public Scenarios', async () => {   

    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
        await PlanningSpace.launchContext("Process", {process: TestData.PROCESS_NAME});
    })

    it('Test Case 1: Set the Private Scenario as default', async () => {
        await PlanningSpace.goToManageScenarios();
        // await ScenarioPage.clickAllScenarios();
        const isScenarioExist = await ScenarioPage.ScenarioLinkVisible(TestData.PRIVATE_SCENARIONAME);
        if (!isScenarioExist) {
            await TestUtil.createPublicChildScenarioTC(TestData.PRIVATE_SCENARIONAME);
             }
        const dataIndex: number = await ScenarioPage.getDataIndexByColumnName('Information');
        let isDefault: boolean = await ScenarioPage.verifyRightIconInScenarioTable(TestData.PRIVATE_SCENARIONAME, dataIndex);
        if (!isDefault) {
            // If Scenario is not default, set it as default
            await ScenarioPage.editScenarioItemIsDefault(TestData.PRIVATE_SCENARIONAME);
            await ScenarioPage.clickResetButton();
            isDefault = await ScenarioPage.verifyRightIconInScenarioTable(TestData.PRIVATE_SCENARIONAME, dataIndex);
             }
        // await ScenarioPage.verifyPinIconInScenarioTable(TestData.PRIVATE_SCENARIONAME, dataIndex);
        await ProcessPage.clickLeftpaneLinks('Planning');
        await scope.clickOnTab('Scenarios');
        await ScenarioPage.scenarioSelectandSetDetault([TestData.PRIVATE_SCENARIONAME], 'Check');
        await scope.clickOnTab('Scenarios');
        const isDefaultScenarioExist = await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(TestData.PRIVATE_SCENARIONAME);
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(isScenarioExist, true, `Is ${TestData.PRIVATE_SCENARIONAME} scenario created`);
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(isDefault, true, `Is ${TestData.PRIVATE_SCENARIONAME} scenario set as Default`);
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(isDefaultScenarioExist, true, `Is default scenario ${TestData.PRIVATE_SCENARIONAME} available under scenario filters`);
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it('Test Case 2: Verify the Dimension Scope Filter data when Private Scenario is Default', async () => {
        await scope.clickOnTab('Scope');
        await scope.click3Dot();
        await scope.select3DotOption('Edit Configuration')
        await scope.selectFilterEntryFromDialogConfig('Select', 'ITEM')
        await scope.filterDialogSaveCancel('Next');
        await scope.selectDimensionHierarchyLevel('ITEM', ['ProductType'], 'check');
        await scope.filterDialogSaveCancel('Save');
        await scope.addFiltersToDimensionHierarchyInScope("ITEM", "ProductType", ['PF-00']);
        await scope.clickOnApplyFiltersBtn();
        const bValidation4: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('ProductType', 'PF-00'), true, `Is Item filter applied`);
        expect(bValidation4).toBeTruthy();
    });

    it('Test Case 3: set the Public Scenario as default.', async () => {
        await PlanningSpace.goToManageScenarios();
        // await ScenarioPage.clickAllScenarios();
        const isScenarioExist = await ScenarioPage.ScenarioLinkVisible(TestData.PUBLIC_SCENARIONAME);
        if (!isScenarioExist) {
            await TestUtil.createPublicChildScenarioTC(TestData.PUBLIC_SCENARIONAME);
            }
        const dataIndex: number = await ScenarioPage.getDataIndexByColumnName('Information');
        let isDefault: boolean = await ScenarioPage.verifyRightIconInScenarioTable(TestData.PUBLIC_SCENARIONAME, dataIndex);
        if (!isDefault) {
            // If Scenario is not default, set it as default
            await ScenarioPage.editScenarioItemIsDefault(TestData.PUBLIC_SCENARIONAME);
            await ScenarioPage.clickResetButton();
            isDefault = await ScenarioPage.verifyRightIconInScenarioTable(TestData.PUBLIC_SCENARIONAME, dataIndex);
            }
        // await ScenarioPage.verifyPinIconInScenarioTable(TestData.PUBLIC_SCENARIONAME, dataIndex);
        await ProcessPage.clickLeftpaneLinks('Planning');
        await scope.clickOnTab('Scenarios');
        await ScenarioPage.scenarioSelectandSetDetault([TestData.PUBLIC_SCENARIONAME], 'Check');
        await scope.clickOnTab('Scenarios');
        const isDefaultScenarioExist = await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(TestData.PUBLIC_SCENARIONAME);
        const bValidation4: boolean = await CommonFunctions.compareTwoValues(isScenarioExist, true, `Is ${TestData.PUBLIC_SCENARIONAME} scenario created`);
        const bValidation5: boolean = await CommonFunctions.compareTwoValues(isDefault, true, `Is ${TestData.PUBLIC_SCENARIONAME} scenario set as Default`);
        const bValidation6: boolean = await CommonFunctions.compareTwoValues(isDefaultScenarioExist, true, `Is default scenario ${TestData.PUBLIC_SCENARIONAME} available under scenario filters`);
        expect(bValidation4 && bValidation5 && bValidation6).toBeTruthy();
    });

    it('Test Case 4: Verify the Dimension Scope Filter data when Public Scenario is Default.', async () => {
        await scope.clickOnTab('Scope');
        await scope.click3Dot();
        await scope.select3DotOption('Edit Configuration')
        await scope.selectFilterEntryFromDialogConfig('Select', 'CUSTOMER')
        await scope.filterDialogSaveCancel('Next');
        await scope.selectDimensionHierarchyLevel('CUSTOMER', ['AllChannels'], 'check');
        await scope.filterDialogSaveCancel('Save');
        await scope.addFiltersToDimensionHierarchyInScope("CUSTOMER", "AllChannels", ['ALL CUSTOMERS']);
        await scope.clickOnApplyFiltersBtn();
        await scope.clickOnTab('Scope');
        const bValidation4: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllChannels', 'ALL CUSTOMERS'), true, `Is Customer filter applied`);
        expect(bValidation4).toBeTruthy();
        await scope.closeDrawer();
    });

    it('Test Case 5: Reset and set the Base Scenario as Default', async () => {
        await PlanningSpace.goToManageScenarios();
        let baseScenario = await ScenarioPage.getBaseScenario();
        await ScenarioPage.tableActionClick(baseScenario,'Set as Default');
        await ProcessPage.clickLeftpaneLinks('Planning');
        await scope.clickOnTab('Scenarios');
        await ScenarioPage.scenarioSelect([TestData.PRIVATE_SCENARIONAME, TestData.PUBLIC_SCENARIONAME],'Uncheck');
        await ScenarioPage.btnSaveFilter.click();
        await browser.pause(5000);
        await CommonFunctions.logMessage('INFO', 'Test Case 5 completed successfully.');
    });
});
