import SupplyChainAction from "../../../pageobjects/sca.page";
import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from "../../../util/common.util";
import ScenarioPage from "../../../pageobjects/scenario.page";
import Scope from "../../../pageobjects/scope.page"
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/SupplyChainActionsBatch/Test_006_SCPPopupLayout.json");
import ProcessPage from '../../../pageobjects/process.page';
import ApiUtil from "../../../util/api.util";

const random_name = Math.floor(1000 + Math.random() * 9000);
const scenario_desc = 'Description for popup layout in SCA ' + random_name;
const scenario_name = 'SCA_popup_layout_scenario_' + random_name;

let accessToken: any = "", searchSimulationURL: string, newlyCreatedScenarioId: string = "";

describe("Verify SCP popup Layout", async () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
        await browser.pause(5000)
    });

    it(`Test Case 1: Is ${TestData.PROCEDURE_NAME} procedure exists in SCA`, async () => {
        await browser.pause(10000);
        await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
        await browser.pause(20000);
        await PlanningSpace.switchToMFEFrame();
        await Scope.clickOnTab('Scenarios');
        const defaultScenario: string = await ScenarioPage.getDefaultScenarioUnderScenariosTabInVF();
        await CommonFunctions.logMessage("INFO", `Default Scenario: ${defaultScenario}`);
        await CommonFunctions.compareTwoValues(defaultScenario, TestData.PARENT_SCENARIO_NAME, `Is Base Scenario already set as default`);
        if(defaultScenario !== TestData.PARENT_SCENARIO_NAME) {
            await ScenarioPage.setDefaultScenarioInPlanning(TestData.PARENT_SCENARIO_NAME)
        }
        const isProcedureClicked: boolean = await PlanningSpace.selectSupplyChainProceduresAction(TestData.PROCEDURE_NAME);
        await CommonFunctions.compareTwoValues(isProcedureClicked, true, `Should display ${TestData.PROCEDURE_NAME} in SCP dropdown Assertion`);
        expect(isProcedureClicked).toBeTruthy();
    });

    it("Test Case 2: Is popup layout opened", async () => {
        const isPopupOpened: boolean = await SupplyChainAction.isPopupOpened(TestData.PROCEDURE_NAME);
        await CommonFunctions.compareTwoValues(isPopupOpened, true, `Is popup opened for ${TestData.PROCEDURE_NAME} procedure`);
        expect(isPopupOpened).toBeTruthy();
    });

    it("Test Case 3: Does input fields enabled in popup", async () => {
        const bValidation1: boolean = await ScenarioPage.isScenarioNameFieldEnabled();
        await CommonFunctions.compareTwoValues(bValidation1, true, `Is scenario name field enabled`);
        await ScenarioPage.setScenarioName(scenario_name);
        const bValidation2: boolean = await ScenarioPage.isDefaultCheckBoxEnabled();
        await CommonFunctions.compareTwoValues(bValidation2, true, `Is default checkbox enabled`);
        await ScenarioPage.checkSetAsDefaultField();
        const bValidation3: boolean = await ScenarioPage.isPublicRadioBtnEnabled();
        await CommonFunctions.compareTwoValues(bValidation3, true, `Is public radio button enabled`);
        const bValidation4: boolean = await ScenarioPage.isPrivateRadioBtnEnabled();
        await CommonFunctions.compareTwoValues(bValidation4, true, `Is private radio button enabled`);
        const bValidation5: boolean = await ScenarioPage.isScenarioDescFieldEnabled()
        await CommonFunctions.compareTwoValues(bValidation5, true, `Is scenario description field enabled`);
        await ScenarioPage.setScenarioDesciption(scenario_desc);
        expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5).toBeTruthy();
    });

    it("Test Case 4: Create Scenario and Validate proc inputs", async () => {
        await browser.setupInterceptor();
        await ScenarioPage.clickOnCreate();
        const running = await CommonFunctions.verifyAlertMsg(`procedure is running`);
        await CommonFunctions.compareTwoValues(running, true, 'Verify Procedure is Running Alert');
        accessToken = await ScenarioPage.getAccessToken(TestData.PROCEDURE_EXECUTION_URL);
        const requestValidation = await ScenarioPage.validateTheJsonRequest(TestData.REQUEST_URL, TestData.PROCEDURE_NAME, scenario_name, TestData.PARENT_SCENARIO_NAME, TestData.PARENT_SCENARIO_ID);
        const success = await CommonFunctions.verifyAlertMsg('success', 100000);
        await CommonFunctions.compareTwoValues(success, true, 'success alert validation');
        expect(requestValidation).toBeTruthy();
    });

    it('Test Case 5: Validate the scenario name in the API response Search Simulation', async () => {
        const headers = {
            "accept": "application/json",
            "Authorization": accessToken
        };
        searchSimulationURL = process.env.API_BASE_URL as string + process.env.SEARCH_SIMULATION as string;
        let response = await ApiUtil.processAPIRequest("POST", searchSimulationURL + "?filter=isDefault%3D" + `${TestData.IS_DEFAULT_SEARCH}`, TestData.REQUEST_BODY, headers, "Fetching Scenarios", "data");
        newlyCreatedScenarioId = response.entities[0].scenarioId;
        const scenarioName = response.entities[0].scenarioName;
        let validation = await CommonFunctions.compareTwoValues(scenarioName, scenario_name, 'Scenario Name Validation');
        expect(validation).toEqual(true);
    })


    it("Test Case 6: Create Child Scenario from the above created Default Scenario", async () => {
        await browser.pause(2000);
        await browser.setupInterceptor();
        await PlanningSpace.selectSupplyChainProceduresAction(TestData.PROCEDURE_NAME);
        await ScenarioPage.createChildScenarioPopupLayout("Child_" + scenario_name, scenario_desc, "Public", "Uncheck", "");
        const running = await CommonFunctions.verifyAlertMsg(`procedure is running`);
        await CommonFunctions.compareTwoValues(running, true, 'Verify Procedure is Running Alert');
        const requestValidation = await ScenarioPage.validateTheJsonRequest(TestData.REQUEST_URL, TestData.PROCEDURE_NAME, "Child_" + scenario_name, scenario_name, newlyCreatedScenarioId);
        await CommonFunctions.logMessage("INFO", `Result of requestValidation: ${requestValidation}`);
        const success = await CommonFunctions.verifyAlertMsg('success', 100000);
        await CommonFunctions.compareTwoValues(success, true, 'success alert validation');
        expect(requestValidation).toBeTruthy();
    });

    it('Test Case 7: Create a Child Scenario from Base Scenario while a child scenario is default', async () => {
        await browser.pause(5000);
        await browser.setupInterceptor();
        await PlanningSpace.selectSupplyChainProceduresAction(TestData.PROCEDURE_NAME);
        await ScenarioPage.createChildScenarioPopupLayout("Base_Of_" + scenario_name, scenario_desc + " Base", "Public", "Uncheck", TestData.PARENT_SCENARIO_NAME);
        const running = await CommonFunctions.verifyAlertMsg("running");
        await CommonFunctions.logMessage("INFO", `Result of running: ${running}`);
        await CommonFunctions.compareTwoValues(running, true, 'verify alert')
        const requestValidation = await ScenarioPage.validateTheJsonRequest(TestData.REQUEST_URL, TestData.PROCEDURE_NAME, "Base_Of_" + scenario_name, TestData.PARENT_SCENARIO_NAME, TestData.PARENT_SCENARIO_ID);
        await CommonFunctions.logMessage("INFO", `Result of requestValidation: ${requestValidation}`);
        const success = await CommonFunctions.verifyAlertMsg('success');
        await CommonFunctions.compareTwoValues(success, true, 'success');
        expect(requestValidation).toEqual(true);
    });

    it("Test Case 8: Delete Created Scenario", async () => {
        await browser.pause(2000);
        await PlanningSpace.goToManageScenarios();
        // await ScenarioPage.clickAllScenarios();
        let validation1: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.ScenarioLinkVisible(scenario_name), true, "Child Scenario " + scenario_name + " Created Assertion")
        let validation2: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.ScenarioLinkVisible("Child_" + scenario_name), true, "Child Scenario " + "Child_" + scenario_name + " Created Assertion");
        let validation3: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.ScenarioLinkVisible("Base_Of_" + scenario_name), true, "Child Scenario " + "Base_Of_" + scenario_name + " Created Assertion");
        let validation4: boolean = await ScenarioPage.deleteChildScenario(scenario_name);
        let validation5: boolean = await ScenarioPage.deleteChildScenario("Base_Of_" + scenario_name);
        expect(validation1 && validation2 && validation3 && validation4 && validation5).toBeTruthy();
    })
});