import CommonFunctions from "../../../util/common.util";
import ApiUtil from "../../../util/api.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/DataSetup/ODM/Test_002_RestartMaasCluster.json");


describe(`Restart Ondemand Maas Cluster`, async () => {

    let url: string, accessToken: string, headers: Record<string, string>;
    let arrClusterIds: string[] = TestData.CalcEngineId;

    before(async () => {
        url = process.env.API_BASE_URL as string + process.env.RESOURCE_POOL_MANAGER as string;
        accessToken = await ApiUtil.getBearerToken();
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessToken
        };
    })

    for (let i = 0; i < arrClusterIds.length; i++) {
        it("Restart Maas Cluster " + arrClusterIds[i] + " If Cluster is down", async () => {
            let response = await ApiUtil.processAPIRequest("GET", url + "/" + arrClusterIds[i] + "/status", "", headers, "Fetching On Demand Maas Cluster Status", "full");
            let validation1: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "Fetch On Demand Maas Cluster Status Success Assertion");
            await CommonFunctions.logMessage("INFO", "Overall Status: " + response.data.overallStatus);

            let validation2: boolean = true;
            let validation3: boolean = true;
            if (response.data.overallStatus != "STARTED") {
                await CommonFunctions.logMessage("INFO", "Restarting Maas Cluster");
                let restartResponse = await ApiUtil.processAPIRequest("POST", url + "/" + arrClusterIds[i] + "/restart", TestData.requestBody, headers, "Restarting On Demand Maas Cluster", "full");
                validation2 = await CommonFunctions.compareTwoValues(restartResponse.status, "202", "Restart On Demand Maas Cluster Success Assertion");
                validation3 = false;

                for (let j = 0; j < 10; j++) {
                    let response = await ApiUtil.processAPIRequest("GET", url + "/" + arrClusterIds[i] + "/status", "", headers, "Fetching On Demand Maas Cluster Status", "full");
                    await CommonFunctions.logMessage("INFO", "Overall Status: " + response.data.overallStatus);
                    if (response.data.overallStatus == "STARTED") {
                        await CommonFunctions.logMessage("INFO", "Maas Cluster Restarted Successfully");
                        validation3 = true;
                        break;
                    }
                    await CommonFunctions.logMessage("INFO", "Waiting for 30 seconds to check the status");
                    await browser.pause(30000);
                }
            }
            expect(validation1 && validation2 && validation3).toBeTruthy();
        });
    }

})