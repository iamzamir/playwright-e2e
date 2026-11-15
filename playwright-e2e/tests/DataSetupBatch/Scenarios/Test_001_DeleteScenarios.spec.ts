import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { deleteScenarioById } from '../../../util/scenario-cleanup.util';

const TestData = require('../../../testdata/' + process.env.PSENV + '/DataSetupBatch/Scenarios/Test_001_DeleteScenarios.json');

test.describe.serial('Get Unwanted Scenarios and Delete', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let searchSimulationUrl: string;
  let headers: Record<string, string>;
  let scenarioNames: string[] = [];

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    searchSimulationUrl = (process.env.API_BASE_URL as string) + (process.env.SEARCH_SIMULATION as string);

    const accessToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: 'Bearer ' + accessToken
    };
  });

  test('Test Case 1: Get unwanted scenarios and delete', async () => {
    const response = await apiUtil.processAPIRequest('POST', `${searchSimulationUrl}?limit=1000`, TestData.requestBody, headers, 'Fetching Scenarios', 'full');
    const entities = Array.isArray(response?.data?.entities) ? response.data.entities : [];

    await commonFunctions.logMessage('INFO', `Total Scenarios: ${entities.length}`);
    scenarioNames = entities.map((entity: any) => entity.scenarioName);
    await commonFunctions.logMessage('INFO', `Scenario Names: ${scenarioNames}`);

    const fetchValidation = await commonFunctions.compareTwoValues(response.status, 200, 'Fetch created scenarios success assertion');

    let deletedCount = 0;
    let validation = true;
    const scenarioDeleteKeywords: string[] = [
      'SCA_History',
      'ODM multi',
      'CopyOf',
      'Created_Scenario',
      'Created_Scenario_From',
      'Private_test',
      'DT_Created_Scenario',
      'Public_test',
      'Scenario_Action',
      'SCA_popup_layout',
      'Created_Scenario_Base',
      'Base_Of_SCA_popup_layout',
      'Subset_'
    ];

    for (const entity of entities) {
      const scenarioName = String(entity?.scenarioName || '');
      if (!scenarioDeleteKeywords.some((keyword) => scenarioName.includes(keyword))) {
        continue;
      }

      const deleteResponse = await deleteScenarioById(entity.simulationId, headers, `Delete Scenario ${scenarioName}`);
      const validation1 = await commonFunctions.compareTwoValues(deleteResponse.status, 204, `Delete Scenario ${scenarioName} success assertion`);
      deletedCount++;
      validation = validation1 && validation;
    }

    await commonFunctions.logMessage('INFO', `Deleted Scenarios count: ${deletedCount}`);
    expect(fetchValidation && validation).toBeTruthy();
  });
});
