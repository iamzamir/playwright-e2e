import TestData from "../../../Testdata/INTEROP/PlanningSpace/ScenarioBatch/Test_029_ScreensShouldRenderWithNoBaseScenarios.json";
import PlanningSpace from "../../../pageobjects/planning.page";
import ProcessPage from '../../../pageobjects/process.page';
import ScopePage from '../../../pageobjects/scope.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
import CommonFunctions from "../../../util/common.util";
import IdentityPage from '../../../pageobjects/identity-and-access.page';

const namespace = 'BY.CBP',
    roleName = 'procedure_execution',
    policyName = 'Publish Scenario SCA Test',
    procedureName = 'Publish Scenario',
    resourceName = 'PROCEDURE.PublishScenario';

describe('Screens Should Render Even Without Base Scenario', async () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    });

    it('Test Case 1: Add Publish Sceario Policy', async () => {
        await CommonFunctions.logMessage('INFO', 'Navigate to Identity Access to create a policy');
        await IdentityPage.navigateToIdentityaccessMfe();
        await browser.pause(10000);
        const policyCreated = await IdentityPage.addExecutePolicy(namespace, roleName, policyName, policyName, procedureName, resourceName);
        let bValidation: boolean = await CommonFunctions.compareTwoValues(policyCreated, true, `Policy Creation Assertion`);
        expect(bValidation).toEqual(true);
    });

    it('Test Case 2: Validate Scenario Tab and Popup', async () => {
        await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
        await PlanningSpace.switchToMFEFrame();
        // let bValidation1: boolean = await CommonFunctions.compareTwoValues(await ScopePage.clickOnTab("Views"), true, "Views Tab Displays Assertion");
        let bValidation1: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.clickViewsDropDown(), true, "Views Dropdown Clicked Assertion");
        let bValidation2: boolean = await CommonFunctions.compareTwoValues(await ScopePage.clickOnTab("Scenarios"), true, "Scenarios Tab Displays Assertion");
        let bValidation3: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.scenarioSelect([], "Check"), true, "Scenario Selection Popup Displays Assertion");
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it('Test Case 3: Validate Scenario Page', async () => {
        await PlanningSpace.goToManageScenarios();
        await browser.pause(5000);
        // await ScenarioPage.clickAllScenarios();
        await browser.pause(5000);
        await ScenarioPage.selectFilter('Public')
        await ScenarioPage.clickApplyFilters()
        await browser.pause(5000);
        // await ScenarioPage.clickAllScenarios();
        await browser.pause(5000);
        await ScenarioPage.selectOrUnselectFilter('Created By', "PS Automation1");
        await browser.pause(5000);
        await ScenarioPage.clickApplyFilters();
        let bValidation1: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.getHeaderTitle(), "All Scenarios", "Scenarios Header Title Assertion");
        let bValidation2: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.btnRefresh.isDisplayed(), true, "Pinned Button Displays in the Scenario Module Assertion");
        let bValidation3: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.btnReset.isDisplayed(), true, "Reset Button Displays in the Scenario Module Assertion");
        let bValidation4: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.btnApply.isDisplayed(), true, "Apply Button Displays in the Scenario Module Assertion");
        // let bValidation5: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.btnPinned.isDisplayed(), true, "Pinned Button Displays in the Scenario Module Assertion");
        // let bValidation6: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.btnAll.isDisplayed(), true, "All Button Displays in the Scenario Module Assertion");
        expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
    });

    it('Test Case 4: Validate Scenario Page', async () => {
        await ProcessPage.clickLeftpaneLinks('Planning');
        await browser.pause(30000);
        await PlanningSpace.searchPublishScenarioSCA(TestData.PROCEDURE);
        await PlanningSpace.goToPublishScenario(TestData.PROCEDURE);
        await PlanningSpace.clickEditButtonInProcedure();
        let bValidation1: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isSelectScenarioPopupVisible(), true, "Select Scenario Popup Visible Assertion")
        let bValidation2: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isSearchScenarioDialogVisible(), true, "Search Scenario Dialog Visible Assertion")
        await PlanningSpace.clickCancelButtonInProcedure();
        await PlanningSpace.selectScenarioSelectionDropdown();
        let bValidation3: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isSearchBarVisible(), true, "Search Bar Visible Assertion")
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it('Test Case 5: Delete Publish Scenario Policy', async () => {
        const roleName = 'procedure_execution';
        await CommonFunctions.logMessage('INFO', 'Navigate to Identity Access to delete the policy');
        await IdentityPage.navigateToIdentityaccessMfe();
        await IdentityPage.clickOnRolesTab(roleName);
        const policyExists = await IdentityPage.deletePolicy(policyName);
        let bValidation: boolean = await CommonFunctions.compareTwoValues(policyExists, false, `Policy Deletion Assertion`);
        expect(bValidation).toEqual(true);
    });

})