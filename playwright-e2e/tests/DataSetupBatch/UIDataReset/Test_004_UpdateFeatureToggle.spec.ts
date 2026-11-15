import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { applyGatewayOverrides, applyRealmKeyOverride } from '../../../util/gateway.util';

const testDataPath = 'testdata/' + process.env.PSENV + '/DataSetupBatch/UIDataReset/Test_004_UpdateFeatureToggle.json';
const TestData = applyGatewayOverrides(require('../../../' + testDataPath), testDataPath);

test.describe.serial('Update Feature Toggle', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
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
  });

  test.afterAll(() => restoreRealmKey());

  test('Enable feature toggle for new views UI', async () => {
    const enableScenarioFilterPayload = {
      name: 'WITH_NEW_SCENARIO_FILTER',
      isEnabled: true
    };

    const enableViewFilterPayload = {
      name: 'WITH_NEW_VIEW_FILTER_UI',
      isEnabled: true
    };

    const updateFeatureToggleTemplate = process.env.UPDATE_FEATURE_TOGGLE as string;
    const apiBaseUrl = process.env.API_BASE_URL as string;

    const viewFilterUrl = apiBaseUrl + updateFeatureToggleTemplate.replace('{featureFlagName}', 'WITH_NEW_VIEW_FILTER_UI');
    const scenarioFilterUrl = apiBaseUrl + updateFeatureToggleTemplate.replace('{featureFlagName}', 'WITH_NEW_SCENARIO_FILTER');

    const viewFilterStatus = await apiUtil.processAPIRequest('PUT', viewFilterUrl, enableViewFilterPayload, headers, 'Enable feature toggle for new views UI', 'status');
    const scenarioFilterStatus = await apiUtil.processAPIRequest('PUT', scenarioFilterUrl, enableScenarioFilterPayload, headers, 'Enable feature toggle for scenario filtering', 'status');

    const validation1 = await commonFunctions.compareTwoValues(viewFilterStatus, 200, 'View filter feature toggle enabled successfully');
    const validation2 = await commonFunctions.compareTwoValues(scenarioFilterStatus, 200, 'Scenario filter feature toggle enabled successfully');

    expect(validation1 && validation2).toBeTruthy();
  });
});
