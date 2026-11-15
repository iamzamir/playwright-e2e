import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
import ProcessPage from '../../../pageobjects/process.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
import Scope from "../../../pageobjects/scope.page";
import ApiUtil from '../../../util/api.util';
import TestUtil from '../../../util/test.util';

const testData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/DrillThroughBatch/Test_021_CreateMultipleChildScenariosAfterDrillThrough.json");

describe('Create Multiple Child Scenarios After Drill Through', () => {
    const random_name = Math.floor(1000 + Math.random() * 9000);
    const first_scenario_name = `DT_Created_Scenario_${random_name}`;
    const first_scenario_desc = `Scenario created after Drill Through ${random_name}`;
    const second_scenario_name = `Created_Scenario_From_DT${random_name}`;
    const second_scenario_desc = `Scenario creation child of Default Scenario ${random_name}`;
    const third_scenario_name = `Created_Scenario_Base${random_name}`;
    const third_scenario_desc = `Scenario created child of base ${random_name}`;

    let baseScenario: string;
    let accessToken: string = '';
    let newCreatedScenario: string = '';
    let searchSimulationURL: string = '';

    before(async () => {
        const apiBaseUrl = process.env.API_BASE_URL;
        const searchSimulation = process.env.SEARCH_SIMULATION;
        if (!apiBaseUrl || !searchSimulation) {
            throw new Error('API_BASE_URL or SEARCH_SIMULATION environment variable is not set');
        }
        searchSimulationURL = apiBaseUrl + searchSimulation;
        await PlanningSpace.loginToPlanningSpaceWithProcess(
            testData.REALM_NAME,
            process.env.FUNCTIONAL_TEST_USERNAME2 as string,
            process.env.FUNCTIONAL_TEST_PASSWORD as string,
            testData.PROCESS_NAME,
            false,
            false
        );
        await TestUtil.setBaseAsDefaultScenario();
        baseScenario = await ScenarioPage.getBaseScenario();
        // await PlanningSpace.closeManageScenarios();
    });

    it('Test Case 1: Perform Drill Through to Target View', async () => {
        await PlanningSpace.clickViewsDropDown();
        const result = await PlanningSpace.clickDashBoard(testData.VIEW_NAME);
        await CommonFunctions.compareTwoValues(result, true, `View ${testData.VIEW_NAME} Found`);
        await browser.pause(15000);
        await Scope.clickOnTab('Scenarios');
        const defaultScenario: string = await ScenarioPage.getDefaultScenarioUnderScenariosTabInVF();
        await CommonFunctions.logMessage("INFO", `Default Scenario: ${defaultScenario}`);
        await CommonFunctions.compareTwoValues(defaultScenario, baseScenario, `Is Base Scenario already set as default`);
        if(defaultScenario !== baseScenario) {
            await ScenarioPage.setDefaultScenarioInPlanning(baseScenario);
            await browser.pause(5000);
        }
        const availableScenarios = await ScenarioPage.getScenarioNamesFromNewUI();
        if((await ScenarioPage.getSelectedScenarioNamesFromNewUI()).length === 1 && availableScenarios.length > 1) {
            await ScenarioPage.selectScenarioFromNewUI(availableScenarios.filter(item => item!==baseScenario).slice(0,2));
        }
        await PlanningSpace.performDrillThroughOnBDECard(testData.CARD_NAME);
        await browser.pause(50000);
        await CommonFunctions.switchToSpecificWindow(1);
        const actualViewName = await PlanningSpace.getViewTitleName();
        await CommonFunctions.compareTwoValues(actualViewName, testData.VIEW_NAME1, `View switched to ${testData.VIEW_NAME1}`);
        expect(actualViewName).toEqual(testData.VIEW_NAME1);
    });

    it('Test Case 2: Create Default Child Scenario in Target View', async () => {
        await browser.pause(5000);
        await CommonFunctions.switchToSpecificWindow(1);
        await browser.pause(1000);
        await PlanningSpace.switchToMFEFrame();
        await PlanningSpace.selectSupplyChainProceduresAction(testData.PROCEDURE_NAME);
        await browser.pause(3000);
        await ScenarioPage.createScenarioFromSCA(first_scenario_name, first_scenario_desc, baseScenario, true, testData.isPublic, testData.isWizard);
        const running = await CommonFunctions.verifyAlertMsg("running");
        await CommonFunctions.compareTwoValues(running, true, 'verify alert')
        await browser.pause(20000)
        const success = await CommonFunctions.verifyAlertMsg('success');
        await CommonFunctions.compareTwoValues(success, true, 'success');
        accessToken = await ScenarioPage.getAccessToken(testData.PROCEDURE_EXECUTION_URL) || '';
        const requestValidation = await ScenarioPage.validateTheJsonRequest(
            testData.REQUEST_URL, testData.PROCEDURE_TYPE, first_scenario_name, baseScenario, testData.PARENT_SCENARIO_ID, baseScenario
        );
        expect(running && success && requestValidation).toEqual(true);
    });

    it('Test Case 3: Validate the scenario name in the API response Search Simulation', async () => {
        const headers = { "accept": "application/json", "Authorization": accessToken };
        let response = await ApiUtil.processAPIRequest(
            "POST",
            searchSimulationURL + "?filter=isDefault%3D" + `${testData.IS_DEFAULT_SEARCH}`,
            testData.REQUEST_BODY,
            headers,
            "Fetching Scenarios",
            "data"
        );
        newCreatedScenario = response.entities[0]?.scenarioId ?? '';
        const scenarioName = response.entities[0]?.scenarioName ?? '';
        expect(scenarioName).toEqual(first_scenario_name);
    });

    it('Test Case 4: Validate only newly created default scenario should be selected', async () => {
        const newDefaultScenario = first_scenario_name;
        await browser.pause(4000);
        const selectedScenarios = await ScenarioPage.getSelectedScenarioNamesFromNewUI();
        await CommonFunctions.compareTwoValues(selectedScenarios.length, 1, 'only one scenario should be selected');
        await CommonFunctions.compareTwoValues(selectedScenarios[0], newDefaultScenario, 'default scenario should be selected');
        expect(selectedScenarios.length === 1 && selectedScenarios[0] === newDefaultScenario).toEqual(true);
    })

    it('Test Case 5: Create a Child Scenario from created default child scenario', async () => {
        await browser.pause(5000);
        await PlanningSpace.selectSupplyChainProceduresAction(testData.PROCEDURE_NAME);
        await ScenarioPage.createScenarioFromSCA(second_scenario_name, second_scenario_desc, '', false, testData.isPublic, testData.isWizard);
        const running = await CommonFunctions.verifyAlertMsg("running");
        await browser.pause(4000)
        const success = await CommonFunctions.verifyAlertMsg('success');
        await browser.pause(4000)
        const requestValidation = await ScenarioPage.validateTheJsonRequest(
            testData.REQUEST_URL, testData.PROCEDURE_TYPE, second_scenario_name, first_scenario_name, newCreatedScenario, first_scenario_name
        );
        expect(running && success && requestValidation).toEqual(true);
    });

    it('Test Case 6: Create a Child Scenario from Base Scenario', async () => {
        await browser.pause(5000);
        await PlanningSpace.selectSupplyChainProceduresAction(testData.PROCEDURE_NAME);
        await browser.pause(4000)
        await ScenarioPage.createScenarioFromSCA(third_scenario_name, third_scenario_desc, baseScenario, false, testData.isPublic, testData.isWizard);
        const running = await CommonFunctions.verifyAlertMsg("running");
        await browser.pause(20000)
        const success = await CommonFunctions.verifyAlertMsg('success');
        const requestValidation = await ScenarioPage.validateTheJsonRequest(
            testData.REQUEST_URL, testData.PROCEDURE_TYPE, third_scenario_name, baseScenario, testData.PARENT_SCENARIO_ID, baseScenario
        );
        expect(running && success && requestValidation).toEqual(true);
    });

    it('Test Case 7: Delete the Created Scenario', async () => {
        await browser.pause(5000);
        await PlanningSpace.goToManageScenarios();
        const bValidation1: boolean = await ScenarioPage.deleteChildScenario(first_scenario_name);
        const bValidation3: boolean = await ScenarioPage.deleteChildScenario(third_scenario_name);
        await expect(bValidation1 && bValidation3).toEqual(true)
    });
});