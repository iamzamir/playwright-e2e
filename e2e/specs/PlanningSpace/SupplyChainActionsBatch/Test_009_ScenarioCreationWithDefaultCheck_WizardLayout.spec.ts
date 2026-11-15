import PlanningSpace from '../../../pageobjects/planning.page';
import SNAConfigurePage from "../../../pageobjects/actors-and-procedures.page";
import CommonFunctions from "../../../util/common.util";
import TestData from "../../../Testdata/INTEROP/PlanningSpace/SupplyChainActionsBatch/Test_009_ScenarioCreationWithDefaultCheck_WizardLayout.json";
import ScenarioPage from '../../../pageobjects/scenario.page';
import ProcessPage from '../../../pageobjects/process.page';
import SupplyChainAction from '../../../pageobjects/supply-chain-action.page';
const random_num1 = Math.floor(1000 + Math.random() * 9000);
const random_num2 = Math.floor(2000 + Math.random() * 9000);
const random_num3 = Math.floor(3000 + Math.random() * 9000);
const scenario_desc = 'Description for popup layout in SCA ' + random_num1;
const scenario_name = 'SCA_popup_layout_scenario_' + random_num1;
const scenario_desc2 = 'Description for popup layout in SCA ' + random_num2;
const scenario_name2 = 'SCA_popup_layout_scenario_' + random_num2;
const scenario_desc3 = 'Description for popup layout in SCA ' + random_num3;
const scenario_name3 = 'SCA_popup_layout_scenario_' + random_num3;
describe("Verify CheckBox State For Create Scenario", async () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    });

    // Checkbox Hidden Default Always
    it(`Test Case 1.1: Set Procedure Config Metadata Default Always`, async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 1.1: Set Procedure Config Metadata Default Always.');
        await PlanningSpace.navToSNA();
        const metaData = JSON.stringify(TestData.UICONFIG_WITHOUT_CHECKBOX);
        await CommonFunctions.logMessage('INFO', `Setting UICONFIG metadata for procedure: ${TestData.PROCEDURE_NAME}`);
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
        await CommonFunctions.compareTwoValues(isProcedureClicked, true, `Should display ${TestData.PROCEDURE_NAME} in SCP dropdown Assertion`);
        expect(isProcedureClicked).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 1.2 completed successfully.');
    });
    
    it("Test Case 1.3: Is checkbox visible", async () => {
        await CommonFunctions.logMessage('INFO', `Starting Test Case 1.3: Is checkbox visible for ${TestData.PROCEDURE_NAME}.`);
        await PlanningSpace.clickEditButtonInProcedure();
        const isCheckboxVisible: boolean = await CommonFunctions.isCheckboxPresent(TestData.CHECKBOX_LABEL);
        await CommonFunctions.compareTwoValues(isCheckboxVisible, false, `Is Checkbox Visible for ${TestData.PROCEDURE_NAME} procedure`);
        expect(isCheckboxVisible).toBeFalsy();
        await CommonFunctions.logMessage('PASS', 'Test Case 1.3 completed successfully.');
    });
    
    it("Test Case 1.4: Create Scenario", async () => {
        await CommonFunctions.logMessage('INFO', `Starting Test Case 1.4: Create Scenario with name ${scenario_name}.`);
        await ScenarioPage.setScenarioName(scenario_name);
        const bValidation1: boolean = await ScenarioPage.isScenarioDescFieldEnabled();
        await CommonFunctions.compareTwoValues(bValidation1, true, `Is scenario description field enabled`);
        await ScenarioPage.setScenarioDesciption(scenario_desc);
        await ScenarioPage.ScenarioSaveAndCreate();
        expect(bValidation1).toBeTruthy();
        await CommonFunctions.logMessage('PASS', `Scenario ${scenario_name} created successfully.`);
    });
    
    it('Test Case 1.5: Validate default scenario', async () => {
        await CommonFunctions.logMessage('INFO', `Starting Test Case 1.5: Validate default scenario name ${scenario_name}.`);
        await browser.pause(60000);
        await PlanningSpace.goToManageScenarios();
        await ScenarioPage.refreshScenarioPage();
        const bValidation = await ScenarioPage.verifyDefaultScenario(scenario_name);
        await CommonFunctions.compareTwoValues(bValidation, true, `Verify default scenario name - ${scenario_name}`);
        expect(bValidation).toEqual(true);
        await CommonFunctions.logMessage('PASS', `Default scenario ${scenario_name} validated successfully.`);
    });
    
    it('Test Case 1.6: Delete Scenario', async () => {
        await CommonFunctions.logMessage('INFO', `Starting Test Case 1.6: Delete scenario ${scenario_name}.`);
        await browser.pause(2000);
        await ScenarioPage.deleteChildScenario(scenario_name);
        await CommonFunctions.logMessage('PASS', `Scenario ${scenario_name} deleted successfully.`);
    });
    

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
        await CommonFunctions.logMessage('INFO', `Starting Test Case 2.3: Is checkbox visible for ${TestData.PROCEDURE_NAME}.`);
        await PlanningSpace.clickEditButtonInProcedure();
        const isCheckboxVisible: boolean = await CommonFunctions.isCheckboxPresent(TestData.CHECKBOX_LABEL);
        await CommonFunctions.compareTwoValues(isCheckboxVisible, true, `Is Checkbox Visible for ${TestData.PROCEDURE_NAME} procedure`);
        expect(isCheckboxVisible).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 2.3 completed successfully.');
    });
    
    it("Test Case 2.4: Create Scenario", async () => {
        await CommonFunctions.logMessage('INFO', `Starting Test Case 2.4: Create Scenario with name ${scenario_name2}.`);
        await ScenarioPage.setScenarioName(scenario_name2);
        const bValidation1: boolean = await ScenarioPage.isScenarioDescFieldEnabled();
        await CommonFunctions.compareTwoValues(bValidation1, true, `Is scenario description field enabled`);
        await ScenarioPage.setScenarioDesciption(scenario_desc2);
        await ScenarioPage.ScenarioSaveAndCreate();
        expect(bValidation1).toBeTruthy();
        await CommonFunctions.logMessage('PASS', `Scenario ${scenario_name2} created successfully.`);
    });
    
    it('Test Case 2.5: Validate default scenario', async () => {
        await CommonFunctions.logMessage('INFO', `Starting Test Case 2.5: Validate default scenario name ${scenario_name2}.`);
        await browser.pause(60000);
        await PlanningSpace.goToManageScenarios();
        await ScenarioPage.refreshScenarioPage();
        await browser.pause(5000);
        const bValidation = await ScenarioPage.verifyDefaultScenario(scenario_name2);
        await CommonFunctions.compareTwoValues(bValidation, true, `Verify default scenario name - ${scenario_name2}`);
        expect(bValidation).toEqual(true);
        await CommonFunctions.logMessage('PASS', `Default scenario ${scenario_name2} validated successfully.`);
    });
    
    it('Test Case 2.6: Delete Scenario', async () => {
        await CommonFunctions.logMessage('INFO', `Starting Test Case 2.6: Delete scenario ${scenario_name2}.`);
        await browser.pause(2000);
        await ScenarioPage.deleteChildScenario(scenario_name2);
        await CommonFunctions.logMessage('PASS', `Scenario ${scenario_name2} deleted successfully.`);
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
        const isProcedureClicked: boolean = await PlanningSpace.selectSupplyChainProceduresAction(TestData.PROCEDURE_NAME);
        await CommonFunctions.compareTwoValues(isProcedureClicked, true, `Should display ${TestData.PROCEDURE_NAME} in SCP dropdown.`);
        expect(isProcedureClicked).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 3.2 completed successfully.');
    });
    
    it("Test Case 3.3: Is checkbox visible", async () => {
        await CommonFunctions.logMessage('INFO', `Starting Test Case 3.3: Is checkbox visible for ${TestData.PROCEDURE_NAME}.`);
        await PlanningSpace.clickEditButtonInProcedure();
        const isCheckboxVisible: boolean = await CommonFunctions.isCheckboxPresent(TestData.CHECKBOX_LABEL);
        await CommonFunctions.compareTwoValues(isCheckboxVisible, true, `Is Checkbox Visible for ${TestData.PROCEDURE_NAME} procedure`);
        expect(isCheckboxVisible).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 3.3 completed successfully.');
    });
    
    it("Test Case 3.4: Create Scenario", async () => {
        await CommonFunctions.logMessage('INFO', `Starting Test Case 3.4: Create Scenario with name ${scenario_name3}.`);
        await ScenarioPage.setScenarioName(scenario_name3);
        await ScenarioPage.uncheckSetAsDefaultField(); // Uncheck "Set as Default" checkbox
        const bValidation1: boolean = await ScenarioPage.isScenarioDescFieldEnabled();
        await CommonFunctions.compareTwoValues(bValidation1, true, `Is scenario description field enabled`);
        await ScenarioPage.setScenarioDesciption(scenario_desc3);
        await ScenarioPage.ScenarioSaveAndCreate();
        expect(bValidation1).toBeTruthy();
        await CommonFunctions.logMessage('PASS', `Scenario ${scenario_name3} created successfully.`);
    });
    
    it('Test Case 3.5: Validate default scenario', async () => {
        await CommonFunctions.logMessage('INFO', `Starting Test Case 3.5: Validate default scenario name ${scenario_name3}.`);
        await browser.pause(60000);
        await PlanningSpace.goToManageScenarios();
        await ScenarioPage.refreshScenarioPage();
        await browser.pause(5000);
        const bValidation = await ScenarioPage.verifyIsDefaultScenario(scenario_name3);
        await CommonFunctions.compareTwoValues(bValidation, false, `Verify default scenario name - ${scenario_name3}`);
        expect(bValidation).toEqual(false);
        await CommonFunctions.logMessage('PASS', `Scenario ${scenario_name3} is not set as default, validation successful.`);
    });
    
    it('Test Case 3.6: Delete Scenario', async () => {
        await CommonFunctions.logMessage('INFO', `Starting Test Case 3.6: Delete scenario ${scenario_name3}.`);
        await browser.pause(2000);
        await ScenarioPage.deleteChildScenario(scenario_name3);
        await CommonFunctions.logMessage('PASS', `Scenario ${scenario_name3} deleted successfully.`);
    });
    
})