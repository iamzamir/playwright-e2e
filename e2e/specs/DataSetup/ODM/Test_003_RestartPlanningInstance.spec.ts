import CommonFunctions from "../../../util/common.util";
import ApiUtil from "../../../util/api.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/DataSetup/ODM/Test_003_RestartPlanningInstance.json");


describe(`Restart Planning Instance`, async () => {

    let url: string, accessToken: string, headers: Record<string, string>;
    let arrClusterIds: string[] = TestData.CalcEngineId;
    let resourcePoolUrl: string;
    let startedClusters: string[] = [];

    before(async () => {
        url = process.env.API_BASE_URL as string + process.env.PLANNING_INSTANCE as string;
        resourcePoolUrl = process.env.API_BASE_URL as string + process.env.RESOURCE_POOL_MANAGER as string;
        accessToken = await ApiUtil.getBearerToken();
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessToken
        };
    })

    it("Test Case 1: Fetch All Started Clusters and Extract CalcEngineIds", async () => {
        await CommonFunctions.logMessage("INFO", "Fetching all STARTED clusters from Resource Pool Manager");

        let response = await ApiUtil.processAPIRequest("GET", resourcePoolUrl + "?status=STARTED", "", headers, "Fetching STARTED clusters", "full");
        let validation1: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "Fetch STARTED clusters Success Assertion");

        if (validation1 && response.data && Array.isArray(response.data)) {
            // Extract calcEngineId from each STARTED cluster
            startedClusters = response.data
                .filter((cluster: any) => cluster.status === "STARTED" && cluster.calcEngineId)
                .map((cluster: any) => cluster.calcEngineId);

            await CommonFunctions.logMessage("INFO", `Found ${startedClusters.length} STARTED clusters`);
            await CommonFunctions.logMessage("INFO", `CalcEngine IDs: ${JSON.stringify(startedClusters)}`);

            // Log individual cluster details
            for (let index = 0; index < response.data.length; index++) {
                const cluster = response.data[index];
                if (cluster.status === "STARTED") {
                    await CommonFunctions.logMessage("INFO",
                        `Cluster ${index + 1}: Name=${cluster.calcEngineName}, ID=${cluster.calcEngineId}, Status=${cluster.status}`
                    );
                }
            }
        } else {
            await CommonFunctions.logMessage("ERROR", "Failed to fetch clusters or no data returned");
        }
        await CommonFunctions.logMessage("INFO", "Extracted CalcEngineIds: " + startedClusters);
        expect(validation1).toBeTruthy();
    });

    it("Test Case 2: Stop Clusters Not in Test Data", async () => {
        await CommonFunctions.logMessage("INFO", "Checking for clusters to stop that are not in test data");

        // Find clusters that are STARTED but not in the test data
        const clustersToStop = startedClusters.filter((clusterId: string) =>
            !arrClusterIds.includes(clusterId)
        );

        await CommonFunctions.logMessage("INFO", `Test Data CalcEngineIds: ${JSON.stringify(arrClusterIds)}`);
        await CommonFunctions.logMessage("INFO", `Started Clusters: ${JSON.stringify(startedClusters)}`);
        await CommonFunctions.logMessage("INFO", `Clusters to Stop: ${JSON.stringify(clustersToStop)}`);

        if (clustersToStop.length === 0) {
            await CommonFunctions.logMessage("INFO", "No clusters need to be stopped - all started clusters are in test data");
            expect(true).toBeTruthy();
            return;
        }

        let allStopOperationsSuccessful = true;

        // Stop each cluster that's not in test data
        for (let i = 0; i < clustersToStop.length; i++) {
            const clusterIdToStop = clustersToStop[i];

            await CommonFunctions.logMessage("INFO", `Stopping cluster: ${clusterIdToStop}`);

            try {
                // Make stop cluster API call
                let stopResponse = await ApiUtil.processAPIRequest("POST", resourcePoolUrl + "/" + clusterIdToStop + "/stopCluster", "", headers, `Stopping cluster ${clusterIdToStop}`, "full");
                let stopValidation = await CommonFunctions.compareTwoValues(stopResponse.status, "202", `Stop cluster ${clusterIdToStop} Success Assertion`);

                if (stopValidation) {
                    await CommonFunctions.logMessage("INFO", `Cluster ${clusterIdToStop} stop request sent successfully`);
                } else {
                    await CommonFunctions.logMessage("ERROR", `Failed to stop cluster ${clusterIdToStop}. Status: ${stopResponse.status}`);
                    allStopOperationsSuccessful = false;
                }

            } catch (error) {
                await CommonFunctions.logMessage("ERROR", `Error stopping cluster ${clusterIdToStop}: ${error}`);
                allStopOperationsSuccessful = false;
            }
        }

        await CommonFunctions.logMessage("INFO", `Stop operations completed. Success: ${allStopOperationsSuccessful}`);
        expect(allStopOperationsSuccessful).toBeTruthy();
    });

    it("Test Case 3: Check and Restart Planning Instances if Not Started", async () => {
        await CommonFunctions.logMessage("INFO", "Checking planning instance status for all CalcEngine IDs from test data");

        let allRestartOperationsSuccessful = true;
        // Check each Planning Instance ID from test data
        const planningInstanceId = TestData.PlanningInstanceId;
        await CommonFunctions.logMessage("INFO", `Checking planning instance status for Planning Instance ID: ${planningInstanceId}`);
        try {
            // Get planning instance status
            let statusResponse = await ApiUtil.processAPIRequest("GET", url + "/" + planningInstanceId, "", headers, `Fetching planning instance status for ${planningInstanceId}`, "full");
            let statusValidation = await CommonFunctions.compareTwoValues(statusResponse.status, "200", `Fetch planning instance status for ${planningInstanceId} Success Assertion`);

            if (statusValidation && statusResponse.data) {
                const currentStatus = statusResponse.data.status;
                await CommonFunctions.logMessage("INFO", `Planning Instance ${planningInstanceId} Status: ${currentStatus}`);

                // If not STARTED, restart the planning instance
                if (currentStatus !== "STARTED") {
                    await CommonFunctions.logMessage("INFO", `Planning instance ${planningInstanceId} is not STARTED. Attempting restart...`);

                    // Restart planning instance
                    let restartResponse = await ApiUtil.processAPIRequest("POST", url + "/" + planningInstanceId + "/restart", "", headers, `Restarting planning instance ${planningInstanceId}`, "full");
                    let restartValidation = await CommonFunctions.compareTwoValues(restartResponse.status, "202", `Restart planning instance ${planningInstanceId} Success Assertion`);

                    if (restartValidation) {
                        await CommonFunctions.logMessage("INFO", `Restart request sent successfully for planning instance ${planningInstanceId}`);
                        // Poll for status change (up to 10 attempts, 30 seconds each)
                        let restartSuccessful = false;
                        for (let j = 0; j < 10; j++) {
                            await CommonFunctions.logMessage("INFO", `Waiting 30 seconds before checking status (attempt ${j + 1}/10)...`);
                            await browser.pause(30000);
                            let pollResponse = await ApiUtil.processAPIRequest("GET", url + "/" + planningInstanceId, "", headers, `Polling planning instance status for ${planningInstanceId}`, "full");

                            if (pollResponse.status === 200 && pollResponse.data) {
                                const newStatus = pollResponse.data.status;
                                await CommonFunctions.logMessage("INFO", `Planning Instance ${planningInstanceId} Status Check ${j + 1}: ${newStatus}`);
                                if (newStatus === "STARTED") {
                                    await CommonFunctions.logMessage("INFO", `Planning instance ${planningInstanceId} restarted successfully!`);
                                    restartSuccessful = true;
                                    break;
                                }
                            }
                        }

                        if (!restartSuccessful) {
                            await CommonFunctions.logMessage("ERROR", `Planning instance ${planningInstanceId} did not start within timeout period`);
                            allRestartOperationsSuccessful = false;
                        }

                    } else {
                        await CommonFunctions.logMessage("ERROR", `Failed to restart planning instance ${planningInstanceId}. Status: ${restartResponse.status}`);
                        allRestartOperationsSuccessful = false;
                    }

                } else {
                    await CommonFunctions.logMessage("INFO", `Planning instance ${planningInstanceId} is already STARTED - no restart needed`);
                }

            } else {
                await CommonFunctions.logMessage("ERROR", `Failed to fetch planning instance status for ${planningInstanceId}. Status: ${statusResponse.status}`);
                allRestartOperationsSuccessful = false;
            }

        } catch (error) {
            await CommonFunctions.logMessage("ERROR", `Error processing planning instance ${planningInstanceId}: ${error}`);
            allRestartOperationsSuccessful = false;
        }

        await CommonFunctions.logMessage("INFO", `Planning instance check/restart operations completed. Success: ${allRestartOperationsSuccessful}`);
        expect(allRestartOperationsSuccessful).toBeTruthy();
    });

})