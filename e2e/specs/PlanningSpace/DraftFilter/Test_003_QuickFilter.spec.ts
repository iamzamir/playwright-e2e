import PlanningSpace from '../../../pageobjects/planning.page';
import SupplyChainPage from "../../../pageobjects/sca.page";
import CommonFunctions from '../../../util/common.util';
import scenarioPage from '../../../pageobjects/scenario.page';
import scope from '../../../pageobjects/scope.page';
import GlobalSettings from '../../../pageobjects/global-settings.page';
import planningPage from '../../../pageobjects/planning.page';
import scaPage from '../../../pageobjects/sca.page';
import scopePage from '../../../pageobjects/scope.page';
import ScopePage from '../../../pageobjects/scope.page';

const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/DraftFilter/Test_003_QuickFilter.json");

describe('Quick Filter Validations', () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
        await browser.pause(5000);
    });
       
    it('Test Case 1: PO: Enable Quick Filter checkbox in Workflow filters', async () => {
        await PlanningSpace.navToProcessOrchestration();
        await GlobalSettings.clickGlobalSettings();
        await GlobalSettings.clickGlobalSettingsListMenu('Process');
        await GlobalSettings.selectProcess(TestData.PROCESS_NAME);
        const enableQuickFilterVal = await GlobalSettings.enableQuickFilterCheckbox(TestData.PROCESS_NAME, [TestData.SOURCE_VIEW[0].SourceView1, TestData.TARGET_VIEW[0].TargetView1]);
        expect(enableQuickFilterVal).toBeTruthy();
    });

     it('Test Case 2: Navigate to duplicate view automation, configure Quick Filter, and drill through to Maas Pivot Card View and validate Location value', async () => {
        await PlanningSpace.navigateToPlanningSpace();
        await PlanningSpace.launchContext('Process', { process: TestData.PROCESS_NAME});
        await browser.pause(5000);
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.SOURCE_VIEW[0].SourceView1);
        await browser.pause(5000);
        const bValidation: boolean = await PlanningSpace.clickEditBtn();
        await CommonFunctions.compareTwoValues(bValidation, true, "Edit button clicked successfully");
        await scopePage.clickOnQuickFilterConfigIcon();
        const QFfilterConfig = await scopePage.configureQuickFilter(TestData.QUICK_FILTER_ATTRIBUTES);
        await CommonFunctions.compareTwoValues(QFfilterConfig, true, "Quick Filter configured successfully");
        await planningPage.saveCardInView();
        const QFvalueSelection = await scopePage.selectAndApplyQF(TestData.QUICK_FILTER_VALUES);
        await PlanningSpace.performDrillThroughOnCardField(TestData.DRILL_THROUGH_CELLS[0].SourceView1, TestData.TARGET_VIEW[0].TargetView1);
        await browser.pause(5000);
        const customerValidation: boolean = await scopePage.verifyExistingCustomerCellInTable(TestData.CUSTOMER_VALUE);
        await CommonFunctions.compareTwoValues(customerValidation, true, `Customer value ${TestData.CUSTOMER_VALUE} exists in ${TestData.TARGET_VIEW[0].TargetView1} after drill through`);
        await PlanningSpace.verifyPowerBarScopeChipClick();
        const verifyScopeAfterDrillThrough: boolean = await scopePage.verifyScopeFilterValueAfterDrillThrough(TestData.SCOPE_FILTER_VALUES_AFTER_DRILLTHROUGH);
        await CommonFunctions.compareTwoValues(verifyScopeAfterDrillThrough, true, 'Quick Filter values are retained in Scope after drill through');
        expect(QFfilterConfig && QFvalueSelection && customerValidation && verifyScopeAfterDrillThrough).toBeTruthy();
     });

     it('Test Case 3: Apply Quick filter only in target view and navigate back to source view and validate Quick Filter values are retained', async () => {
        await scopePage.closeDrawer();
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.TARGET_VIEW[1].TargetView2);
        await browser.pause(5000);
        const bValidation: boolean = await PlanningSpace.clickEditBtn();
        await CommonFunctions.compareTwoValues(bValidation, true, "Edit button clicked successfully");
        await scopePage.clickOnQuickFilterConfigIcon();
        const QFfilterConfig = await scopePage.configureQuickFilter(TestData.QUICK_FILTER_VALUE_VALIDATION);                
        await CommonFunctions.compareTwoValues(QFfilterConfig, true, "Quick Filter configured successfully");
        await planningPage.saveCardInView();
        const navigateBackToSourceViewValidation: boolean = await PlanningSpace.navigateToSourceView(TestData.SOURCE_VIEW[1].SourceView2);
        await CommonFunctions.compareTwoValues(navigateBackToSourceViewValidation, true, `Navigated to ${TestData.SOURCE_VIEW[1].SourceView2} successfully using Views Dropdown`);
        await PlanningSpace.performDrillThroughOnCardField(TestData.DRILL_THROUGH_CELLS[1].SourceView2, TestData.TARGET_VIEW[1].TargetView2);
        await browser.pause(5000);
        const bQFRetained: boolean = await scopePage.verifyAndApplyQFChipValuesAfterDrillThrough(TestData.QUICK_FILTER_VALUE_VALIDATION);
        await CommonFunctions.compareTwoValues(bQFRetained, true, `Quick Filter values are retained in ${TestData.TARGET_VIEW[1].TargetView2} after drill through`);
        expect(QFfilterConfig && navigateBackToSourceViewValidation && bQFRetained).toBeTruthy();
     });

    it('Test Case 4: Hydrate the cluster by configuring Scope filter and edit by removing Region-20 value', async () => {
        await PlanningSpace.navigateToPlanningSpace();
        await PlanningSpace.launchContext('Process', { process: TestData.PROCESS_NAME});
        await browser.pause(5000);
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.HYDRATE_VIEW_NAME);
        await browser.pause(5000);
        await PlanningSpace.verifyPowerBarScopeChipClick();
        const updateScopeFilter: boolean = await scope.searchFilter(TestData.FILTER_TO_APPLY_IN_SCOPE);
        await CommonFunctions.compareTwoValues(updateScopeFilter, true, `Is ${TestData.FILTER_TO_APPLY_IN_SCOPE} filter selected under scope tab`);
        await scopePage.clickOnApplyFiltersBtn();
        await browser.pause(8000);
        const result = await PlanningSpace.verifyDataSyncStatusTest("started", "Data is Synced", true, 10, TestData.LoGGEDIN_USER_NAME);
        await CommonFunctions.compareTwoValues(result, true, 'ODM Maas data synced successfully');
        
        // Edit the Scope filter by unchecking Region-20 value
        await PlanningSpace.verifyPowerBarScopeChipClick();
        await scopePage.clickFilterValuesIconByDimensionAndHierarchy(TestData.SCOPE_EDIT_DIMENSION, TestData.SCOPE_EDIT_HIERARCHY);
        await scopePage.checkOrUncheckFilters([TestData.SCOPE_UNCHECK_VALUE], 'uncheck');
        await scopePage.clickSaveInFilterValuesBox();
        await scopePage.clickOnApplyFiltersBtn();
        await browser.pause(8000);
        const scopeDataValidation: boolean = await scenarioPage.verifyColumnExistsInPivotTable(['LOCATION'], TestData.CARD_NAME);
        await CommonFunctions.compareTwoValues(scopeDataValidation, true, `Is ${['LOCATION']} reflected in table after removing ${TestData.SCOPE_UNCHECK_VALUE}`);
        expect(updateScopeFilter && result && scopeDataValidation).toBeTruthy();
    });

    it('Test Case 5: Set workflow filter on view, configure QF, configure ODM Maas by applying VF', async () => {
        await PlanningSpace.navToProcessOrchestration();
        await browser.pause(5000);
        await GlobalSettings.selectProcessDropdown(TestData.PROCESS_NAME);
        const bValidation: boolean = await GlobalSettings.configureWorkflowFilter(TestData.PROCESS_NAME, TestData.WORKFLOW_FILTER.VIEW_NAME, TestData.WORKFLOW_FILTER_SCOPE_TO_DEFINE, "Define filter", true);
        await CommonFunctions.compareTwoValues(bValidation, true, `Is workflow filter configured for ${TestData.WORKFLOW_FILTER.VIEW_NAME} view`);
        // Navigate to view, and configure Quick Filter
        await PlanningSpace.navigateToPlanningSpace();
        await PlanningSpace.launchContext('Process', { process: TestData.PROCESS_NAME });
        await browser.pause(3000);
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.WORKFLOW_FILTER.VIEW_NAME);
        await browser.pause(3000);
        const bEditBtn: boolean = await PlanningSpace.clickEditBtn();
        await CommonFunctions.compareTwoValues(bEditBtn, true, 'Edit button clicked successfully');
        await scopePage.clickOnQuickFilterConfigIcon();
        const bQFConfig: boolean = await scopePage.configureQuickFilter(TestData.QUICK_FILTER_VALUES);
        await CommonFunctions.compareTwoValues(bQFConfig, true, 'Quick Filter configured successfully on view');
        await planningPage.saveCardInView();

        // Applying scope filter to trigger ODM Maas cluster
        await PlanningSpace.verifyPowerBarScopeChipClick();
        const bScopeFilter: boolean = await ScopePage.searchFilter(TestData.FILTER_TO_APPLY_IN_SCOPE);
        await CommonFunctions.compareTwoValues(bScopeFilter, true, `Scope filter '${TestData.FILTER_TO_APPLY_IN_SCOPE}' selected`);
        await ScopePage.clickOnApplyFiltersBtn();
        await browser.pause(8000);
        const bODMSync = await PlanningSpace.verifyDataSyncStatusTest('started', 'Data is Synced', true, 10, TestData.LoGGEDIN_USER_NAME);
        await CommonFunctions.compareTwoValues(bODMSync, true, 'ODM Maas data synced successfully');
        expect(bEditBtn && bQFConfig && bScopeFilter && bODMSync).toBeTruthy();
    });

});