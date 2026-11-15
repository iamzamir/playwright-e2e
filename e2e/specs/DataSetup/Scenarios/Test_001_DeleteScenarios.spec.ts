import CommonFunctions from "../../../util/common.util";
import ApiUtil from "../../../util/api.util";
const Testdata = require("../../../Testdata/" + process.env.PSENV + "/DataSetup/Scenarios/Test_001_DeleteScenarios.json");


describe(`Get Unwanted Scenarios and Delete`, async () => {

    let url: string, accessToken: string, headers: Record<string, string>;
    let arrScenarioName: string[] = [];

    before(async () => {
        url = process.env.API_BASE_URL as string + process.env.SEARCH_SIMULATION as string;
        accessToken = await ApiUtil.getBearerToken();
        // accessToken = ""
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessToken
        };
    })

    it(`Test Case 1 : Get Unwanted Scenarios and Delete`, async () => {
        let response = await ApiUtil.processAPIRequest("POST", url + "?limit=1000", Testdata.requestBody, headers, "Fetching Scenarios", "full");
        await CommonFunctions.logMessage("INFO", `Total Scenarios: ${response.data.entities.length}`);
        for (let i = 0; i < response.data.entities.length; i++) {
            arrScenarioName.push(response.data.entities[i].scenarioName);
        }
        await CommonFunctions.logMessage("INFO", `Scenario Names: ${arrScenarioName}`);
        await CommonFunctions.compareTwoValues(response.status, "200", "Fetch Created Calendar Success Assertion");

        url = process.env.API_BASE_URL as string + process.env.SIMULATION as string;
        let c = 0;
        let validation: boolean = true;
        const scenarioDeleteKeywords: string[] = [
            "SCA_History",
            "ODM multi",
            "CopyOf",
            "Created_Scenario",
            "Created_Scenario_From",
            "Private_test",
            "DT_Created_Scenario",
            "Public_test",
            "Scenario_Action",
            "SCA_popup_layout",
            "Created_Scenario_Base",
            "Base_Of_SCA_popup_layout",
            "Subset_"
        ];
        // const scenarioDeleteKeywords: string[] = [
        //     "Scenario_For_MaasPivot", "scenario_mass_chart_test", "Sceanrio_Case_Automation", "Dont_Delete_VF_Scope_Dimension_data", "test_scenario_do_not_delete", "Dont_Delete_Public_Scenario", "Scenario_Selection", "SubprocessSelectSidenavchild1", "SubprocessSelectSidenavchild2", "ProcessSelectSidenavchild1", "ProcessSelectSidenavchild2", "AssumptionScn3", "AssumptionScn4"
        // ];
        for (let i = 0; i < response.data.entities.length; i++) {
            const scenarioName: string = response.data.entities[i].scenarioName;
            if (scenarioDeleteKeywords.some((keyword) => scenarioName.includes(keyword))) {
                let response1 = await ApiUtil.processAPIRequest("DELETE", url + "/simulations/" + response.data.entities[i].simulationId, "", headers, "Delete Scenario " + response.data.entities[i].scenarioName, "full");
                let validation1: boolean = await CommonFunctions.compareTwoValues(response1.status, "204", "Delete Scenario " + response.data.entities[i].scenarioName + " Success Assertion");
                c++;
                validation = validation1 && validation;
            }
        }
        await CommonFunctions.logMessage("INFO", `Deleted Scenarios count: ${c}`);
        expect(validation).toBeTruthy();
    });

})