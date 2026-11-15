import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
import ProcessPage from '../../../pageobjects/process.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
import Scope from "../../../pageobjects/scope.page";
import ApiUtil from '../../../util/api.util';
import TestUtil from '../../../util/test.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/DrillThroughBatch/Test_022_CreateMultipleChildScenariosAfterDrillThroughPopup.json");

describe('Create Multiple Child Scenarios After Drill Through Popup', () => {
    const random_name = Math.floor(1000 + Math.random() * 9000);
    const first_scenario_name = 'DT_Created_Scenario_' + random_name;
    const first_scenario_desc = 'Scenario created after Drill Through ' + random_name;
    const second_scenario_name = 'Created_Scenario_From_DT' + random_name;
    const second_scenario_desc = 'Scenario creation child of Default Scenario ' + random_name;
    const third_scenario_name = 'Created_Scenario_Base' + random_name;
    const third_scenario_desc = 'Scenario created child of base ' + random_name;

    let baseScenario;
    let accessToken;
    let searchSimulationURL: string, headers: Record<string, string>;
    let newCreatedScenario;


    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await browser.pause(5000);
        await TestUtil.setBaseAsDefaultScenario();
        baseScenario = await ScenarioPage.getBaseScenario();
        await PlanningSpace.closeManageScenarios();
        searchSimulationURL = process.env.API_BASE_URL as string + process.env.SEARCH_SIMULATION as string;
    });

    it('Test Case 1: Perform Drill Through to Target View', async () => {
        await PlanningSpace.clickViewsDropDown();
        const result = await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        await CommonFunctions.compareTwoValues(result, true, `View ${TestData.VIEW_NAME} Found`);
        await browser.pause(15000);
        await Scope.clickOnTab('Scenarios');
        const defaultScenario: string = await ScenarioPage.getDefaultScenarioUnderScenariosTabInVF();
        await CommonFunctions.logMessage("INFO", `Default Scenario: ${defaultScenario}`);
        await CommonFunctions.compareTwoValues(defaultScenario, TestData.PARENT_SCENARIO_NAME, `Is Base Scenario already set as default`);
        if(defaultScenario !== baseScenario) {
            await ScenarioPage.setDefaultScenarioInPlanning(baseScenario);
            await browser.pause(5000);
        }
        await PlanningSpace.performDrillThroughOnBDECard(TestData.CARD_NAME);
        await browser.pause(10000);
        await CommonFunctions.switchToSpecificWindow(1);
        const actualViewName = await PlanningSpace.getViewTitleName();
        await CommonFunctions.compareTwoValues(actualViewName, TestData.VIEW_NAME1, `View switched to ${TestData.VIEW_NAME1}`);
        expect(actualViewName).toEqual(TestData.VIEW_NAME1);
    });

    it('Test Case 2: Create Default Child Scenario in Target View', async () => {
        await browser.pause(5000);

        await CommonFunctions.switchToSpecificWindow(1);
        await browser.pause(5000);
        await PlanningSpace.switchToMFEFrame();
        const url = await browser.getUrl();
        await PlanningSpace.selectSupplyChainProceduresAction(TestData.PROCEDURE_NAME);
        await ScenarioPage.createScenarioFromSCA(first_scenario_name, first_scenario_desc, baseScenario, true, true, false);

        const running = await CommonFunctions.verifyAlertMsg("running");
        await CommonFunctions.logMessage("INFO", `Result of running: ${running}`);
        await CommonFunctions.compareTwoValues(running, true, 'verify alert')
        await browser.pause(4000)
        const success = await CommonFunctions.verifyAlertMsg('success');
        await CommonFunctions.logMessage("INFO", `Result of success: ${success}`);
        await CommonFunctions.compareTwoValues(success, true, 'success');
        accessToken = await ScenarioPage.getAccessToken(TestData.PROCEDURE_EXECUTION_URL);
        const requestValidation = await ScenarioPage.validateTheJsonRequest(TestData.REQUEST_URL, TestData.PROCEDURE_TYPE, first_scenario_name, baseScenario, TestData.PARENT_SCENARIO_ID);
        await CommonFunctions.logMessage("INFO", `Result of requestValidation: ${requestValidation}`);
        expect(running && success && requestValidation).toEqual(true);
    });

     it('Test Case 3: Validate the scenario name in the API response Search Simulation', async () => {
            const  headers = {
                "accept": "application/json",
                "Authorization": accessToken
            };
            let response = await ApiUtil.processAPIRequest("POST", searchSimulationURL + "?filter=isDefault%3D" + `${TestData.IS_DEFAULT_SEARCH}`, TestData.REQUEST_BODY, headers, "Fetching Scenarios", "data");
            newCreatedScenario = response.entities[0].scenarioId;
            const scenarioName = response.entities[0].scenarioName;
            expect(scenarioName).toEqual(first_scenario_name);
        })
    
        it('Test Case 4: Create a Child Scenario from created default child scenario', async () => {
            await browser.pause(5000);
            await PlanningSpace.selectSupplyChainProceduresAction(TestData.PROCEDURE_NAME);
            await ScenarioPage.createScenarioFromSCA(second_scenario_name, second_scenario_desc, '', false, true, false);
            const running = await CommonFunctions.verifyAlertMsg("running");
            await CommonFunctions.logMessage("INFO", `Result of running: ${running}`);
            await CommonFunctions.compareTwoValues(running, true, 'verify alert')
            await browser.pause(4000)
            const success = await CommonFunctions.verifyAlertMsg('success');
            await CommonFunctions.logMessage("INFO", `Result of success: ${success}`);
            await CommonFunctions.compareTwoValues(success, true, 'success')
            const requestValidation = await ScenarioPage.validateTheJsonRequest(TestData.REQUEST_URL, TestData.PROCEDURE_TYPE, second_scenario_name, first_scenario_name, newCreatedScenario);
            await CommonFunctions.logMessage("INFO", `Result of requestValidation: ${requestValidation}`);
            expect(running && success && requestValidation).toEqual(true);
        });
        it('Test Case 5: Create a Child Scenario from Base Scenario', async () => {
            await browser.pause(5000);
            await PlanningSpace.selectSupplyChainProceduresAction(TestData.PROCEDURE_NAME);
            await ScenarioPage.createScenarioFromSCA(third_scenario_name, third_scenario_desc, baseScenario, false, true, false);
            const running = await CommonFunctions.verifyAlertMsg("running");
            await CommonFunctions.logMessage("INFO", `Result of running: ${running}`);
            await CommonFunctions.compareTwoValues(running, true, 'verify alert')
            await browser.pause(4000)
            const success = await CommonFunctions.verifyAlertMsg('success');
            await CommonFunctions.logMessage("INFO", `Result of success: ${success}`);
            await CommonFunctions.compareTwoValues(success, true, 'success');
            const requestValidation = await ScenarioPage.validateTheJsonRequest(TestData.REQUEST_URL, TestData.PROCEDURE_TYPE, third_scenario_name, baseScenario, TestData.PARENT_SCENARIO_ID);
            await CommonFunctions.logMessage("INFO", `Result of requestValidation: ${requestValidation}`);
            expect(running && success && requestValidation).toEqual(true);
        });
        it('Test Case 6: Delete the Created Scenario', async () => {
            await browser.pause(5000);
            await PlanningSpace.goToManageScenarios();
            const bValidation1: boolean = await ScenarioPage.deleteChildScenario(first_scenario_name);
            await CommonFunctions.compareTwoValues(bValidation1, true, `delete public scenario - ${first_scenario_name}`)
            // const bValidation2: boolean = await ScenarioPage.deleteChildScenario('Created_Scenario_From_DT3549');
            // await CommonFunctions.compareTwoValues(bValidation2, true, `delete public scenario - ${scenario_name_child}`)
            const bValidation3: boolean = await ScenarioPage.deleteChildScenario(third_scenario_name);
            await CommonFunctions.compareTwoValues(bValidation3, true, `delete public scenario - ${third_scenario_name}`)
            await expect(bValidation1 && bValidation3).toEqual(true)
        });
});