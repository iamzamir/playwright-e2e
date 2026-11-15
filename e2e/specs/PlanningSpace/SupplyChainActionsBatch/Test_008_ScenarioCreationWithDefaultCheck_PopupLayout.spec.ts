import PlanningSpace from '../../../pageobjects/planning.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
import SNAConfigurePage from "../../../pageobjects/actors-and-procedures.page";
import ProcessPage from '../../../pageobjects/process.page';
import CommonFunctions from "../../../util/common.util";
import TestData from "../../../Testdata/INTEROP/PlanningSpace/SupplyChainActionsBatch/Test_008_ScenarioCreationWithDefaultCheck_PopupLayout.json";


const random_name = Math.floor(1000 + Math.random() * 9000);
const scenario_desc = 'Description for popup layout in SCA ' + random_name;
const scenario_name = 'SCA_popup_layout_scenario_' + random_name;
describe("Verify CheckBox State For Create Scenario", async () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    });

    // Checkbox Hidden Default Always
    it(`Test Case 1.1: Set Procedure Config Metadata Default Always`, async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 1.1: Set Procedure Config Metadata Default Always.');
        await PlanningSpace.navToSNA();
        const metaData = JSON.stringify(TestData.UICONFIG_WITHOUT_CHECKBOX);
        const isMetaDataSetForProcedure = await SNAConfigurePage.setMetaDataForProcedure(TestData.PROCEDURE_NAME, metaData);
        await CommonFunctions.compareTwoValues(isMetaDataSetForProcedure, true, `Is UICONFIG set for ${TestData.PROCEDURE_NAME} procedure`);
        expect(isMetaDataSetForProcedure).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 1.1 completed successfully.');
    });
    
    it(`Test Case 1.2: Select ${TestData.PROCEDURE_NAME} from dropdown`, async () => {
        await CommonFunctions.logMessage('INFO', `Starting Test Case 1.2: Select ${TestData.PROCEDURE_NAME} from dropdown.`);
        await browser.pause(10000);
        await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
        await PlanningSpace.switchToMFEFrame();
        const isProcedureClicked: boolean = await PlanningSpace.selectSupplyChainProceduresAction(TestData.PROCEDURE_NAME);
        await CommonFunctions.compareTwoValues(isProcedureClicked, true, `Should display ${TestData.PROCEDURE_NAME} in SCP dropdown.`);
        expect(isProcedureClicked).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 1.2 completed successfully.');
    });
    
    it("Test Case 1.3: Is checkbox visible", async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 1.3: Check for checkbox visibility.');
        const isCheckboxVisible: boolean = await CommonFunctions.isCheckboxPresent(TestData.CHECKBOX_LABEL);
        await CommonFunctions.compareTwoValues(isCheckboxVisible, false, `Is Checkbox Visible for ${TestData.PROCEDURE_NAME} procedure`);
        expect(isCheckboxVisible).toBeFalsy();
        await CommonFunctions.logMessage('PASS', 'Test Case 1.3 completed successfully.');
    });
    
    it("Test Case 1.4: Create Scenario", async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 1.4: Create a scenario.');
        const isScenarioNameEnabled: boolean = await ScenarioPage.isScenarioNameFieldEnabled();
        await CommonFunctions.compareTwoValues(isScenarioNameEnabled, true, `Is scenario name field enabled`);
        await ScenarioPage.setScenarioName(scenario_name);
        const isScenarioDescEnabled: boolean = await ScenarioPage.isScenarioDescFieldEnabled();
        await CommonFunctions.compareTwoValues(isScenarioDescEnabled, true, `Is scenario description field enabled`);
        await ScenarioPage.setScenarioDesciption(scenario_desc);
        await ScenarioPage.clickOnCreate();
        expect(isScenarioNameEnabled && isScenarioDescEnabled).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Scenario created successfully.');
    });
    
    it('Test Case 1.5: Validate default scenario', async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 1.5: Validate default scenario.');
        await browser.pause(90000);
        await PlanningSpace.goToManageScenarios();
        await ScenarioPage.refreshScenarioPage();
        const isDefaultScenario: boolean = await ScenarioPage.verifyIsDefaultScenario(scenario_name);
        await CommonFunctions.compareTwoValues(isDefaultScenario, true, `Verify default scenario name - ${scenario_name}`);
        expect(isDefaultScenario).toEqual(true);
        await browser.pause(4000);
        await CommonFunctions.logMessage('PASS', 'Default scenario validation completed successfully.');
    });
    
    // it('Test Case 1.6: Delete Scenario', async () => {
    //     await CommonFunctions.logMessage('INFO', 'Starting Test Case 1.6: Delete scenario.');
    //     await browser.pause(2000);
    //     await ScenarioPage.deleteChildScenario(scenario_name);
    //     await CommonFunctions.logMessage('PASS', `Scenario ${scenario_name} deleted successfully.`);
    // });
    

    // Checkbox Visible Without DefaulT 'Default Checked'
    it(`Test Case 2.1: Set Procedure Config Metadata Without Default`, async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 2.1: Set Procedure Config Metadata Without Default.');
        await PlanningSpace.navToSNA();
        const metaData = JSON.stringify(TestData.UICONFIG_WITH_CHECKBOX);
        const isMetaDataSetForProcedure = await SNAConfigurePage.setMetaDataForProcedure(TestData.PROCEDURE_NAME, metaData);
        await CommonFunctions.compareTwoValues(isMetaDataSetForProcedure, true, `Is UICONFIG set for ${TestData.PROCEDURE_NAME} procedure`);
        expect(isMetaDataSetForProcedure).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 2.1 completed successfully.');
    });
    
    it(`Test Case 2.2: Select ${TestData.PROCEDURE_NAME} from dropdown`, async () => {
        await CommonFunctions.logMessage('INFO', `Starting Test Case 2.2: Select ${TestData.PROCEDURE_NAME} from dropdown.`);
        await browser.pause(10000);
        await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
        await PlanningSpace.switchToMFEFrame();
        const isProcedureClicked: boolean = await PlanningSpace.selectSupplyChainProceduresAction(TestData.PROCEDURE_NAME);
        await CommonFunctions.compareTwoValues(isProcedureClicked, true, `Should display ${TestData.PROCEDURE_NAME} in SCP dropdown.`);
        expect(isProcedureClicked).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 2.2 completed successfully.');
    });
    
    it("Test Case 2.3: Is checkbox visible", async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 2.3: Check if the checkbox is visible.');
        const isCheckboxVisible: boolean = await CommonFunctions.isCheckboxPresent(TestData.CHECKBOX_LABEL);
        await CommonFunctions.compareTwoValues(isCheckboxVisible, true, `Is Checkbox Visible for ${TestData.PROCEDURE_NAME} procedure`);
        expect(isCheckboxVisible).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 2.3 completed successfully.');
    });
    
    it("Test Case 2.4: Create Scenario", async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 2.4: Create a scenario.');
        const isScenarioNameEnabled: boolean = await ScenarioPage.isScenarioNameFieldEnabled();
        await CommonFunctions.compareTwoValues(isScenarioNameEnabled, true, `Is scenario name field enabled`);
        await ScenarioPage.setScenarioName(scenario_name);
        const isScenarioDescEnabled: boolean = await ScenarioPage.isScenarioDescFieldEnabled();
        await CommonFunctions.compareTwoValues(isScenarioDescEnabled, true, `Is scenario description field enabled`);
        await ScenarioPage.setScenarioDesciption(scenario_desc);
        await ScenarioPage.clickOnCreate();
        expect(isScenarioNameEnabled && isScenarioDescEnabled).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Scenario created successfully.');
    });
    
    it('Test Case 2.5: Validate default scenario', async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 2.5: Validate default scenario.');
        await browser.pause(10000);
        await PlanningSpace.goToManageScenarios();
        await ScenarioPage.refreshScenarioPage();
        const isDefaultScenario: boolean = await ScenarioPage.verifyIsDefaultScenario(scenario_name);
        await CommonFunctions.compareTwoValues(isDefaultScenario, true, `Verify default scenario name - ${scenario_name}`);
        expect(isDefaultScenario).toEqual(true);
        await browser.pause(4000);
        await CommonFunctions.logMessage('PASS', 'Default scenario validation completed successfully.');
    });
    
    it('Test Case 2.6: Delete Scenario', async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 2.6: Delete scenario.');
        await browser.pause(2000);
        await ScenarioPage.deleteChildScenario(scenario_name);
        await CommonFunctions.logMessage('PASS', `Scenario ${scenario_name} deleted successfully.`);
    });
    

    // Checkbox Visible Without DefaulT 'Default UnChecked'
    it(`Test Case 3.1: Set Procedure Config Metadata Without Default`, async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 3.1: Set Procedure Config Metadata Without Default.');
        await PlanningSpace.navToSNA();
        const metaData = JSON.stringify(TestData.UICONFIG_WITH_CHECKBOX);
        const isMetaDataSetForProcedure = await SNAConfigurePage.setMetaDataForProcedure(TestData.PROCEDURE_NAME, metaData);
        await CommonFunctions.compareTwoValues(isMetaDataSetForProcedure, true, `Is UICONFIG set for ${TestData.PROCEDURE_NAME} procedure`);
        expect(isMetaDataSetForProcedure).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 3.1 completed successfully.');
    });
    
    it(`Test Case 3.2: Select ${TestData.PROCEDURE_NAME} from dropdown`, async () => {
        await CommonFunctions.logMessage('INFO', `Starting Test Case 3.2: Select ${TestData.PROCEDURE_NAME} from dropdown.`);
        await browser.pause(10000);
        await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
        await PlanningSpace.switchToMFEFrame();
        const isProcedureClicked = await PlanningSpace.selectSupplyChainProceduresAction(TestData.PROCEDURE_NAME);
        await CommonFunctions.compareTwoValues(isProcedureClicked, true, `Should display ${TestData.PROCEDURE_NAME} in SCP dropdown.`);
        expect(isProcedureClicked).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 3.2 completed successfully.');
    });
    
    it("Test Case 3.3: Is checkbox visible", async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 3.3: Check if the checkbox is visible.');
        const isCheckboxVisible = await CommonFunctions.isCheckboxPresent(TestData.CHECKBOX_LABEL);
        await CommonFunctions.compareTwoValues(isCheckboxVisible, true, `Is Checkbox Visible for ${TestData.PROCEDURE_NAME} procedure`);
        expect(isCheckboxVisible).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 3.3 completed successfully.');
    });
    
    it("Test Case 3.4: Create Scenario", async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 3.4: Create a scenario.');
        const isScenarioNameEnabled = await ScenarioPage.isScenarioNameFieldEnabled();
        await CommonFunctions.compareTwoValues(isScenarioNameEnabled, true, `Is scenario name field enabled`);
        await ScenarioPage.setScenarioName(scenario_name);
        await ScenarioPage.uncheckSetAsDefaultField();
        const isScenarioDescEnabled = await ScenarioPage.isScenarioDescFieldEnabled();
        await CommonFunctions.compareTwoValues(isScenarioDescEnabled, true, `Is scenario description field enabled`);
        await ScenarioPage.setScenarioDesciption(scenario_desc);
        await ScenarioPage.clickOnCreate();
        expect(isScenarioNameEnabled && isScenarioDescEnabled).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Scenario created successfully.');
    });
    
    it('Test Case 3.5: Validate default scenario', async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 3.5: Validate default scenario.');
        await browser.pause(10000);
        await PlanningSpace.goToManageScenarios();
        await ScenarioPage.refreshScenarioPage();
        const isDefaultScenario = await ScenarioPage.verifyIsDefaultScenario(scenario_name);
        await CommonFunctions.compareTwoValues(isDefaultScenario, false, `Verify default scenario name - ${scenario_name}`);
        expect(isDefaultScenario).toEqual(false);
        await browser.pause(4000);
        await CommonFunctions.logMessage('PASS', 'Default scenario validation completed successfully.');
    });
    
    it('Test Case 3.6: Delete Scenario', async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 3.6: Delete scenario.');
        await browser.pause(2000);
        await ScenarioPage.deleteChildScenario(scenario_name);
        await CommonFunctions.logMessage('PASS', `Scenario ${scenario_name} deleted successfully.`);
    });
    
})