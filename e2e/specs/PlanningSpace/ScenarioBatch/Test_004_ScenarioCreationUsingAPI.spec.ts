import CommonFunctions from '../../../util/common.util';
import planningPage from '../../../pageobjects/planning.page';
import scenarioPage from '../../../pageobjects/scenario.page';
import PlanningSpace from '../../../pageobjects/planning.page';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScenarioBatch/Test_004_ScenarioCreationUsingAPI.json");

describe('Scenario Creation Via New Scenario API', () => {

    const random_name = Math.floor(1000 + Math.random() * 9000);
    const scenario_desc = 'Scenario Creation using API' + random_name;
    const scenario_name = 'Created_Scenario_' + random_name;

  before(async () => {
    await planningPage.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
  });

  it('Test Case 1: Create a child scenario Using "+" icon from the Scenario layout.', async () => {
        await planningPage.verifyNewScenarioFilter('Scenarios');
        await scenarioPage.openScenarioCreationPopupUsingIcon();
        await scenarioPage.createChildScenario(scenario_name, scenario_desc, 'Private');
        const successAlertMsg = await CommonFunctions.verifyAlertMsg('Scenario created successfully', 60000);
        await CommonFunctions.compareTwoValues(successAlertMsg, true, `Scenario created successfully`);
        await browser.pause(5000);
        const bValidation1: boolean = await scenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(scenario_name);
        await CommonFunctions.compareTwoValues(bValidation1, true, `Is default scenario ${scenario_name} available under exist in scenario filters`);
        expect(successAlertMsg && bValidation1).toBeTruthy();
    });

    it('Test Case 2: Verify Scenario Selection from Scenario Layout.', async () => {
        await CommonFunctions.logMessage('INFO', 'Navigating to Scenarios via Side Nav');
        await PlanningSpace.goToManageScenarios();
        await browser.pause(3000);
        const createdScenarioExists: boolean = await scenarioPage.verifyScenarioName(scenario_name, true);
        await CommonFunctions.compareTwoValues(createdScenarioExists, true, `Created scenario ${scenario_name} exists in scenarios list`);
        const defaultIconExists: boolean = await scenarioPage.verifyIsDefaultScenario(scenario_name);
        await CommonFunctions.compareTwoValues(defaultIconExists, true, `Created scenario ${scenario_name} has default icon in scenarios list`);
        expect(createdScenarioExists && defaultIconExists).toBeTruthy();
    });

    it('Test Case 3: Delete Created Scenario and Validate Base Scenario is Set as Default', async () => {
        const baseScenarioName: string = await scenarioPage.getBaseScenario();
        await CommonFunctions.logMessage('INFO', `Base scenario name: ${baseScenarioName}`);        
        const deletionVal: boolean = await scenarioPage.deleteChildScenario(scenario_name);
        await CommonFunctions.compareTwoValues(deletionVal, true, `Successfully deleted scenario ${scenario_name}`);
        const currentDefaultScenario: string = await scenarioPage.getDefaultScenario();
        await CommonFunctions.logMessage('INFO', `Current default scenario after deletion: ${currentDefaultScenario}`);
        const isBaseScenarioSameAsDefault: boolean = baseScenarioName === currentDefaultScenario;
        await CommonFunctions.compareTwoValues(isBaseScenarioSameAsDefault, true, `Base scenario ${baseScenarioName} is same as current default scenario ${currentDefaultScenario}`);
        expect(deletionVal && isBaseScenarioSameAsDefault).toBeTruthy();
    });

    it('Test Case 4: Navigate back to Planning Space and validate the Base Scenario is Set as Default in the Scenarios panel', async () => {
        await CommonFunctions.logMessage('INFO', 'Navigating to PS via Side Nav');
        await PlanningSpace.closeManageScenarios();
        await CommonFunctions.logMessage('INFO', 'Clicked on Scenario Chip from Power Bar');
        await planningPage.verifyNewScenarioFilter('Scenarios');
        await browser.pause(5000);
        const baseScenarioName: string = await scenarioPage.getBaseScenarioFromScenariosPanel();
        await CommonFunctions.logMessage('INFO', `Base scenario name: ${baseScenarioName}`);
        const bValidation1: boolean = await scenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(baseScenarioName);
        await CommonFunctions.compareTwoValues(bValidation1, true, `Base scenario ${baseScenarioName} is displayed with default icon in scenarios panel`);
        expect(bValidation1).toBeTruthy();
    });

});