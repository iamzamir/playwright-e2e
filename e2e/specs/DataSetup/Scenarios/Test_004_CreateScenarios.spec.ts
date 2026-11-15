import CommonFunctions from "../../../util/common.util";
import ApiUtil from "../../../util/api.util";

const Testdata = require("../../../Testdata/" + process.env.PSENV + "/DataSetup/Scenarios/Test_004_CreateScenarios.json");

describe(`Create Scenarios`, () => {

    let url: string, accessToken: string, headers: Record<string, string>;

    const createAndValidateScenarios = async (scenarioNames: string[], requestBody: Record<string, any>) => {
        let validation: boolean = false;

        for (let i = 0; i < scenarioNames.length; i++) {
            requestBody.scenarioName = scenarioNames[i];
            requestBody.scenarioDescription = scenarioNames[i];
            if (i % 2 == 0)
                requestBody.visibility = "PRIVATE";
            else
                requestBody.visibility = "PUBLIC";

            url = process.env.API_BASE_URL as string + process.env.SIMULATION as string;
            const simResponse = await ApiUtil.processAPIRequest("POST", url + "/simulations", requestBody, headers, "Creating Scenario: " + scenarioNames[i], "full");
            await CommonFunctions.logMessage("INFO", `Scenario Name: ${simResponse.data.scenarioName}`);
            await CommonFunctions.logMessage("INFO", `Scenario Id: ${simResponse.data.scenarioId}`);
            const scenarioId = simResponse.data.scenarioId;

            await browser.pause(3000); // Pause to allow backend processing

            for (let attempt = 0; attempt < 6; attempt++) {
                try {
                    const scnResponse = await ApiUtil.processAPIRequest("GET", url + "/scenarios/" + scenarioId, "", headers, "Fetching Scenarios", "full");
                    if (scnResponse.data.status == "CREATED") {
                        validation = await CommonFunctions.compareTwoValues(scnResponse.data.status, "CREATED", "Scenario " + scenarioNames[i] + " Created Assertion");
                    }
                    await browser.pause(2000); // Pause before next attempt
                    break;
                }
                catch (error) {
                    console.log("Error in fetching scenario: " + error);
                    await browser.pause(10000);
                }
            }
        }

        expect(validation).toBeTruthy();
    };

    before(async () => {
        url = process.env.API_BASE_URL as string + process.env.SEARCH_SIMULATION as string;
        accessToken = await ApiUtil.getBearerToken();
        // accessToken = ""
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessToken
        };
    })

    it(`Test Case 1 : Create Scenarios`, async () => {
        const arrScenarioName: string[] = ["Scenario_For_MaasPivot", "scenario_mass_chart_test", "Sceanrio_Case_Automation", "Dont_Delete_VF_Scope_Dimension_data", "test_scenario_do_not_delete", "Dont_Delete_Public_Scenario", "Scenario_Selection", "SubprocessSelectSidenavchild1", "SubprocessSelectSidenavchild2", "ProcessSelectSidenavchild1", "ProcessSelectSidenavchild2"];

        await createAndValidateScenarios(arrScenarioName, Testdata.requestBody2);
    });

    it(`Test Case 2 : Create Assumption Scenarios`, async () => {
        const arrScenarioName: string[] = ["AssumptionScn3", "AssumptionScn4"];

        await createAndValidateScenarios(arrScenarioName, Testdata.requestBody3);
    });
})