import CommonFunctions from "../../../util/common.util";
import ApiUtil from "../../../util/api.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/DataSetup/ODM/Test_001_DeletePIanningInstances.json");


describe(`Delete Planning Instance for a Scenario ID`, async () => {

    let url: string, accessToken: string, headers: Record<string, string>;

    before(async () => {
        url = process.env.API_BASE_URL as string + process.env.PLANNING_INSTANCE as string;
        accessToken = await ApiUtil.getBearerToken();
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessToken
        };
    })

    it(`Test Case 1: Fetch and Delete STOPPED & ERROR Planning InstanceS By Scenario ID`, async () => {
        let response = await ApiUtil.processAPIRequest("GET", url + "?scenarioId=" + TestData.ScenarioId, "", headers, "Fetching Planning Instace", "full");
        await CommonFunctions.compareTwoValues(response.status, "200", "Fetch Planning Instance by Scenario ID " + TestData.ScenarioId + " Success Assertion");
        await CommonFunctions.logMessage("INFO", "Total records: " + response.data.length);
        let arrDelete: string[] = [];
        for (let i = 0; i < response.data.length; i++) {
            if (response.data[i].status == "STOPPED" || response.data[i].status == "ERROR")
                arrDelete.push(response.data[i].id);
        }
        await CommonFunctions.logMessage("INFO", "STOPPED & ERROR PI's are: " + arrDelete);
        await CommonFunctions.logMessage("INFO", "Total STOPPED & ERROR PI's: " + arrDelete.length);
        let isDeleted: boolean = false, validation: boolean = true;
        for (let i = 0; i < arrDelete.length; i++) {
            let response = await ApiUtil.processAPIRequest("DELETE", url + "/" + arrDelete[i], "", headers, "Deleting Planning Instance: " + arrDelete[i] + "", "full");
            isDeleted = await CommonFunctions.compareTwoValues(response.status, "202", "Delete Planning Instance Success Assertion");
            validation = isDeleted && validation;
        }
        expect(validation).toBeTruthy();
    });

    it(`Test Case 2: Delete INPROGRESS PI's`, async () => {
        let response = await ApiUtil.processAPIRequest("GET", url + "?scenarioId=" + TestData.ScenarioId, "", headers, "Fetching Calendar", "full");
        await CommonFunctions.compareTwoValues(response.status, "200", "Fetch Planning Instance by Scenario ID " + TestData.ScenarioId + " Success Assertion");
        await CommonFunctions.logMessage("INFO", "Total records: " + response.data.length);
        let arrDelete: string[][] = [];
        for (let i = 0; i < response.data.length; i++) {
            if (response.data[i].status == "INPROGRESS")
                arrDelete.push([response.data[i].id, response.data[i].engines]);
        }
        console.log(arrDelete);
        await CommonFunctions.logMessage("INFO", "Inprogress PI's are: " + arrDelete);
        await CommonFunctions.logMessage("INFO", "Total Inprogress PI's: " + arrDelete.length);

        let isPatched: boolean = false, validation1: boolean = true;
        for (let i = 0; i < arrDelete.length; i++) {
            if (arrDelete[i][1].length == 1) {
                let response = await ApiUtil.processAPIRequest("PATCH", url + "/" + arrDelete[i][0], TestData.requestBody[0], headers, "Patching Planning Instance: " + arrDelete[i][0] + "", "full");
                isPatched = await CommonFunctions.compareTwoValues(response.status, "204", "Patching Planning Instance for only maas Success Assertion");
                validation1 = isPatched && validation1;
            }
            else if (arrDelete[i][1].length > 1) {
                let response1 = await ApiUtil.processAPIRequest("PATCH", url + "/" + arrDelete[i][0], TestData.requestBody[0], headers, "Patching Planning Instance: " + arrDelete[i][0] + "", "full");
                isPatched = await CommonFunctions.compareTwoValues(response1.status, "204", "Patching Planning Instance for maas Success Assertion");
                validation1 = isPatched && validation1;
                let response2 = await ApiUtil.processAPIRequest("PATCH", url + "/" + arrDelete[i][0], TestData.requestBody[1], headers, "Patching Planning Instance: " + arrDelete[i][0] + "", "full");
                isPatched = await CommonFunctions.compareTwoValues(response2.status, "204", "Patching Planning Instance for sparq Success Assertion");
                validation1 = isPatched && validation1;
            }
        }
        let isDeleted: boolean = false, validation2: boolean = true;
        for (let i = 0; i < arrDelete.length; i++) {
            let response = await ApiUtil.processAPIRequest("DELETE", url + "/" + arrDelete[i][0], "", headers, "Deleting Planning Instance: " + arrDelete[i] + "", "full");
            isDeleted = await CommonFunctions.compareTwoValues(response.status, "202", "Deleting Patching Planning Instance Success Assertion");
            validation2 = isDeleted && validation2;
        }
        expect(validation1 && validation2).toBeTruthy();
    });

})