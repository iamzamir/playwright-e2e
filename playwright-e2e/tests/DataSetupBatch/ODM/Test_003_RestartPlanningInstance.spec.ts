import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { applyGatewayOverrides, applyRealmKeyOverride } from '../../../util/gateway.util';

const testDataPath = 'testdata/' + process.env.PSENV + '/DataSetupBatch/ODM/Test_003_RestartPlanningInstance.json';
const TestData = applyGatewayOverrides(require('../../../' + testDataPath), testDataPath);

test.describe.serial('Restart Planning Instance', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let planningInstanceUrl: string;
  let resourcePoolUrl: string;
  let headers: Record<string, string>;
  let startedClusters: string[] = [];
  let erroredClusters: string[] = [];
  let restoreRealmKey: () => void = () => {};

  test.beforeAll(async () => {
    // API fixtures have no realm-key override, so pin the Gravitee tenant here before reading the URLs and token.
    restoreRealmKey = applyRealmKeyOverride(TestData.REALM_KEY);
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    planningInstanceUrl = (process.env.API_BASE_URL as string) + (process.env.PLANNING_INSTANCE as string);
    resourcePoolUrl = (process.env.API_BASE_URL as string) + (process.env.RESOURCE_POOL_MANAGER as string);
    const accessToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: 'Bearer ' + accessToken
    };
  });

  test.afterAll(() => restoreRealmKey());

  test('Test Case 1: Fetch all STARTED clusters and extract calcEngineIds', async () => {
    await commonFunctions.logMessage('INFO', 'Fetching all STARTED clusters from Resource Pool Manager');

    const response = await apiUtil.processAPIRequest('GET', `${resourcePoolUrl}?status=STARTED`, null, headers, 'Fetching STARTED clusters', 'full');
    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Fetch STARTED clusters success assertion');

    if (validation1 && response.data && Array.isArray(response.data)) {
      startedClusters = response.data.filter((cluster: any) => cluster.status === 'STARTED' && cluster.calcEngineId).map((cluster: any) => cluster.calcEngineId);

      await commonFunctions.logMessage('INFO', `Found ${startedClusters.length} STARTED clusters`);
      await commonFunctions.logMessage('INFO', `CalcEngine IDs: ${JSON.stringify(startedClusters)}`);

      for (let index = 0; index < response.data.length; index++) {
        const cluster = response.data[index];
        if (cluster.status === 'STARTED') {
          await commonFunctions.logMessage('INFO', `Cluster ${index + 1}: Name=${cluster.calcEngineName}, ID=${cluster.calcEngineId}, Status=${cluster.status}`);
        }
      }
    } else {
      await commonFunctions.logMessage('ERROR', 'Failed to fetch clusters or no data returned');
    }

    await commonFunctions.logMessage('INFO', 'Fetching all ERRORED clusters from Resource Pool Manager');
    const erroredResponse = await apiUtil.processAPIRequest('GET', `${resourcePoolUrl}?status=ERROR`, null, headers, 'Fetching ERRORED clusters', 'full');
    const validationErrored = await commonFunctions.compareTwoValues(erroredResponse.status, 200, 'Fetch ERRORED clusters success assertion');
    let allErroredStopOperationsSuccessful = true;

    if (validationErrored && erroredResponse.data && Array.isArray(erroredResponse.data)) {
      erroredClusters = erroredResponse.data.filter((cluster: any) => cluster.status === 'ERROR' && cluster.calcEngineId).map((cluster: any) => cluster.calcEngineId);

      await commonFunctions.logMessage('INFO', `Found ${erroredClusters.length} ERRORED clusters`);
      await commonFunctions.logMessage('INFO', `ERRORED CalcEngine IDs: ${JSON.stringify(erroredClusters)}`);

      if (erroredClusters.length > 0) {
        for (const clusterIdToStop of erroredClusters) {
          await commonFunctions.logMessage('INFO', `Stopping ERRORED cluster: ${clusterIdToStop}`);
          try {
            const stopResponse = await apiUtil.processAPIRequest('POST', `${resourcePoolUrl}/${clusterIdToStop}/stopCluster`, null, headers, `Stopping ERRORED cluster ${clusterIdToStop}`, 'full');
            const stopValidation = await commonFunctions.compareTwoValues(stopResponse.status, 202, `Stop ERRORED cluster ${clusterIdToStop} success assertion`);

            if (stopValidation) {
              await commonFunctions.logMessage('INFO', `ERRORED cluster ${clusterIdToStop} stop request sent successfully`);
            } else {
              await commonFunctions.logMessage('ERROR', `Failed to stop ERRORED cluster ${clusterIdToStop}. Status: ${stopResponse.status}`);
              allErroredStopOperationsSuccessful = false;
            }
          } catch (error) {
            await commonFunctions.logMessage('ERROR', `Error stopping ERRORED cluster ${clusterIdToStop}: ${String(error)}`);
            allErroredStopOperationsSuccessful = false;
          }
        }
      } else {
        await commonFunctions.logMessage('INFO', 'No ERRORED clusters found to stop');
      }
    } else {
      await commonFunctions.logMessage('ERROR', 'Failed to fetch ERRORED clusters or no data returned');
      allErroredStopOperationsSuccessful = false;
    }

    await commonFunctions.logMessage('INFO', `Extracted CalcEngineIds: ${JSON.stringify(startedClusters)}`);
    await commonFunctions.logMessage('INFO', `Stopped ERRORED CalcEngineIds: ${JSON.stringify(erroredClusters)}`);
    expect(validation1).toBeTruthy();
    expect(validationErrored).toBeTruthy();
    expect(allErroredStopOperationsSuccessful).toBeTruthy();
  });

  test('Test Case 2: Stop clusters not in test data', async () => {
    await commonFunctions.logMessage('INFO', 'Checking for clusters to stop that are not in test data');

    const configuredClusterIds: string[] = Array.isArray(TestData.CalcEngineId) ? TestData.CalcEngineId : [];
    const clustersToStop = startedClusters.filter((clusterId: string) => !configuredClusterIds.includes(clusterId));

    await commonFunctions.logMessage('INFO', `Test Data CalcEngineIds: ${JSON.stringify(configuredClusterIds)}`);
    await commonFunctions.logMessage('INFO', `Started Clusters: ${JSON.stringify(startedClusters)}`);
    await commonFunctions.logMessage('INFO', `Clusters to Stop: ${JSON.stringify(clustersToStop)}`);

    if (clustersToStop.length === 0) {
      await commonFunctions.logMessage('INFO', 'No clusters need to be stopped - all started clusters are in test data');
      expect(true).toBeTruthy();
      return;
    }

    let allStopOperationsSuccessful = true;

    for (const clusterIdToStop of clustersToStop) {
      await commonFunctions.logMessage('INFO', `Stopping cluster: ${clusterIdToStop}`);
      try {
        const stopResponse = await apiUtil.processAPIRequest('POST', `${resourcePoolUrl}/${clusterIdToStop}/stopCluster`, null, headers, `Stopping cluster ${clusterIdToStop}`, 'full');
        const stopValidation = await commonFunctions.compareTwoValues(stopResponse.status, 202, `Stop cluster ${clusterIdToStop} success assertion`);

        if (stopValidation) {
          await commonFunctions.logMessage('INFO', `Cluster ${clusterIdToStop} stop request sent successfully`);
        } else {
          await commonFunctions.logMessage('ERROR', `Failed to stop cluster ${clusterIdToStop}. Status: ${stopResponse.status}`);
          allStopOperationsSuccessful = false;
        }
      } catch (error) {
        await commonFunctions.logMessage('ERROR', `Error stopping cluster ${clusterIdToStop}: ${String(error)}`);
        allStopOperationsSuccessful = false;
      }
    }

    await commonFunctions.logMessage('INFO', `Stop operations completed. Success: ${allStopOperationsSuccessful}`);
    expect(allStopOperationsSuccessful).toBeTruthy();
  });

  test('Test Case 3: Check and restart planning instance if not STARTED', async () => {
    await commonFunctions.logMessage('INFO', 'Checking planning instance status for test data planning instance ID');

    let allRestartOperationsSuccessful = true;
    const planningInstanceIds: string[] = Array.isArray(TestData.PlanningInstanceId)
      ? TestData.PlanningInstanceId
      : [TestData.PlanningInstanceId as string];

    for (const planningInstanceId of planningInstanceIds) {
      await commonFunctions.logMessage('INFO', `Checking planning instance status for Planning Instance ID: ${planningInstanceId}`);

      try {
        const statusResponse = await apiUtil.processAPIRequest('GET', `${planningInstanceUrl}/${planningInstanceId}`, null, headers, `Fetching planning instance status for ${planningInstanceId}`, 'full');
        const statusValidation = await commonFunctions.compareTwoValues(statusResponse.status, 200, `Fetch planning instance status for ${planningInstanceId} success assertion`);

        if (statusValidation && statusResponse.data) {
          const currentStatus = statusResponse.data.status;
          await commonFunctions.logMessage('INFO', `Planning Instance ${planningInstanceId} Status: ${currentStatus}`);

          if (currentStatus !== 'STARTED') {
            await commonFunctions.logMessage('INFO', `Planning instance ${planningInstanceId} is not STARTED. Attempting restart...`);

            const restartResponse = await apiUtil.processAPIRequest('POST', `${planningInstanceUrl}/${planningInstanceId}/restart`, null, headers, `Restarting planning instance ${planningInstanceId}`, 'full');
            const restartValidation = await commonFunctions.compareTwoValues(restartResponse.status, 202, `Restart planning instance ${planningInstanceId} success assertion`);

            if (restartValidation) {
              await commonFunctions.logMessage('INFO', `Restart request sent successfully for planning instance ${planningInstanceId}`);
              let restartSuccessful = false;
              for (let attempt = 0; attempt < 10; attempt++) {
                await commonFunctions.logMessage('INFO', `Waiting 30 seconds before checking status (attempt ${attempt + 1}/10)...`);
                await new Promise((resolve) => setTimeout(resolve, 30000));

                const pollResponse = await apiUtil.processAPIRequest('GET', `${planningInstanceUrl}/${planningInstanceId}`, null, headers, `Polling planning instance status for ${planningInstanceId}`, 'full');
                if (pollResponse.status === 200 && pollResponse.data) {
                  const newStatus = pollResponse.data.status;
                  await commonFunctions.logMessage('INFO', `Planning Instance ${planningInstanceId} Status Check ${attempt + 1}: ${newStatus}`);
                  if (newStatus === 'STARTED') {
                    await commonFunctions.logMessage('INFO', `Planning instance ${planningInstanceId} restarted successfully`);
                    restartSuccessful = true;
                    break;
                  }
                }
              }

              if (!restartSuccessful) {
                await commonFunctions.logMessage('ERROR', `Planning instance ${planningInstanceId} did not start within timeout period`);
                allRestartOperationsSuccessful = false;
              }
            } else {
              await commonFunctions.logMessage('ERROR', `Failed to restart planning instance ${planningInstanceId}. Status: ${restartResponse.status}`);
              allRestartOperationsSuccessful = false;
            }
          } else {
            await commonFunctions.logMessage('INFO', `Planning instance ${planningInstanceId} is already STARTED - no restart needed`);
          }
        } else {
          await commonFunctions.logMessage('ERROR', `Failed to fetch planning instance status for ${planningInstanceId}. Status: ${statusResponse.status}`);
          allRestartOperationsSuccessful = false;
        }
      } catch (error) {
        await commonFunctions.logMessage('ERROR', `Error processing planning instance ${planningInstanceId}: ${String(error)}`);
        allRestartOperationsSuccessful = false;
      }
    }

    await commonFunctions.logMessage('INFO', `Planning instance check/restart operations completed. Success: ${allRestartOperationsSuccessful}`);
    expect(allRestartOperationsSuccessful).toBeTruthy();
  });
});
