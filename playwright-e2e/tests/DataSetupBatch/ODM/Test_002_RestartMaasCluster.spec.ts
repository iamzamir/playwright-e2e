import { test, expect } from '../../../configs/api-fixtures';
import { TIMEOUTS } from '../../../constants/timeouts';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { applyGatewayOverrides, applyRealmKeyOverride } from '../../../util/gateway.util';

const testDataPath = 'testdata/' + process.env.PSENV + '/DataSetupBatch/ODM/Test_002_RestartMaasCluster.json';
const TestData = applyGatewayOverrides(require('../../../' + testDataPath), testDataPath);

test.describe.serial('Restart Ondemand Maas Cluster', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let url: string;
  let headers: Record<string, string>;
  let restoreRealmKey: () => void = () => {};

  test.beforeAll(async () => {
    // API fixtures have no realm-key override, so pin the Gravitee tenant here before reading the URLs and token.
    restoreRealmKey = applyRealmKeyOverride(TestData.REALM_KEY);
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    url = (process.env.API_BASE_URL as string) + (process.env.RESOURCE_POOL_MANAGER as string);
    const accessToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: 'Bearer ' + accessToken
    };
  });

  test.afterAll(() => restoreRealmKey());

  for (const clusterId of TestData.CalcEngineId as string[]) {
    test(`Restart Maas Cluster ${clusterId} if cluster is down`, async () => {
      const statusResponse = await apiUtil.processAPIRequest('GET', `${url}/${clusterId}/status`, null, headers, 'Fetching On Demand Maas Cluster Status', 'full');
      const validation1 = await commonFunctions.compareTwoValues(statusResponse.status, 200, 'Fetch On Demand Maas Cluster Status success assertion');
      await commonFunctions.logMessage('INFO', `Overall Status: ${statusResponse.data?.overallStatus}`);

      let validation2 = true;
      let validation3 = true;

      if (statusResponse.data?.overallStatus !== 'STARTED') {
        await commonFunctions.logMessage('INFO', 'Restarting Maas Cluster');
        const restartResponse = await apiUtil.processAPIRequest('POST', `${url}/${clusterId}/restart`, TestData.requestBody, headers, 'Restarting On Demand Maas Cluster', 'full');
        validation2 = await commonFunctions.compareTwoValues(restartResponse.status, 202, 'Restart On Demand Maas Cluster success assertion');
        validation3 = false;

        for (let attempt = 0; attempt < 30; attempt++) {
          await commonFunctions.logMessage('INFO', 'Waiting for 10 seconds to check the status');
          await new Promise((resolve) => setTimeout(resolve, TIMEOUTS.MEDIUM));
          const pollResponse = await apiUtil.processAPIRequest('GET', `${url}/${clusterId}/status`, null, headers, 'Polling On Demand Maas Cluster Status', 'full');
          await commonFunctions.logMessage('INFO', `Overall Status: ${pollResponse.data?.overallStatus}`);
          if (pollResponse.data?.overallStatus === 'STARTED') {
            await commonFunctions.logMessage('INFO', 'Maas Cluster restarted successfully');
            validation3 = true;
            break;
          }
        }
      }

      expect(validation1 && validation2 && validation3).toBeTruthy();
    });
  }
});
