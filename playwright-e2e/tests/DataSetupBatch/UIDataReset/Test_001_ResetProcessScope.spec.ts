import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { applyGatewayOverrides, applyRealmKeyOverride } from '../../../util/gateway.util';

const testDataPath = 'testdata/' + process.env.PSENV + '/DataSetupBatch/UIDataReset/Test_001_ResetProcessScope.json';
const TestData = applyGatewayOverrides(require('../../../' + testDataPath), testDataPath);

test.describe.serial('Reset Process Scope', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
  let url: string;
  let restoreRealmKey: () => void = () => {};

  test.beforeAll(async () => {
    // API fixtures have no realm-key override, so pin the Gravitee tenant here before reading the URLs and token.
    restoreRealmKey = applyRealmKeyOverride(TestData.REALM_KEY);
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();

    const accessToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: 'Bearer ' + accessToken
    };

    const baseUrl = (process.env.API_BASE_URL as string).replace(/\/+$/, '');
    const processPath = (process.env.GET_PROCESS_WITH_NAME as string).replace(/^\/+|\/+$/g, '');
    url = `${baseUrl}/${processPath}/${encodeURIComponent(TestData.PROCESS_NAME)}/scope`;
  });

  test.afterAll(() => restoreRealmKey());

  test('Test Case 1: Reset Process Scope', async () => {
    const response = await apiUtil.processAPIRequest('PUT', url, TestData.RESET_SCOPE_PAYLOAD, headers, 'Reset process scope', 'full');
    const statusValidation = await commonFunctions.compareTwoValues(response.status, 200, 'Reset process scope status assertion');
    const messageValidation = await commonFunctions.compareTwoValues(response.data, TestData.RESET_SCOPE_SUCCESS_MESSAGE, 'Reset process scope success message assertion');
    expect(statusValidation && messageValidation).toBeTruthy();
  });
});

