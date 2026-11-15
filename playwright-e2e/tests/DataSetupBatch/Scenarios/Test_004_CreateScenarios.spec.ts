import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';

const TestData = require('../../../testdata/' + process.env.PSENV + '/DataSetupBatch/Scenarios/Test_004_CreateScenarios.json');

test.describe.serial('Create Scenarios', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let simulationBaseUrl: string;
  let headers: Record<string, string>;

  const delay = async (ms: number): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  };

  const createAndValidateScenarios = async (scenarioNames: string[], requestBodyTemplate: Record<string, any>): Promise<void> => {
    let overallValidation = true;

    for (let i = 0; i < scenarioNames.length; i++) {
      const scenarioName = scenarioNames[i];
      const requestBody = JSON.parse(JSON.stringify(requestBodyTemplate));
      requestBody.scenarioName = scenarioName;
      requestBody.scenarioDescription = scenarioName;
      requestBody.visibility = i % 2 === 0 ? 'PRIVATE' : 'PUBLIC';

      const createResponse = await apiUtil.processAPIRequest('POST', `${simulationBaseUrl}/simulations`, requestBody, headers, `Creating Scenario: ${scenarioName}`, 'full');
      await commonFunctions.logMessage('INFO', `Scenario Name: ${createResponse.data?.scenarioName}`);
      await commonFunctions.logMessage('INFO', `Scenario Id: ${createResponse.data?.scenarioId}`);

      const scenarioId = createResponse.data?.scenarioId;
      const createdResponseValidation = await commonFunctions.compareTwoValues(createResponse.status, 201, `Create Scenario ${scenarioName} success assertion`);
      overallValidation = createdResponseValidation && overallValidation;

      if (!scenarioId) {
        await commonFunctions.logMessage('ERROR', `No scenarioId returned for scenario ${scenarioName}`);
        overallValidation = false;
        continue;
      }

      await delay(3000);

      let statusCreatedValidation = false;
      for (let attempt = 0; attempt < 6; attempt++) {
        try {
          const scenarioResponse = await apiUtil.processAPIRequest('GET', `${simulationBaseUrl}/scenarios/${scenarioId}`, null, headers, `Fetching Scenario ${scenarioName}`, 'full');
          if (scenarioResponse.data?.status === 'CREATED') {
            statusCreatedValidation = await commonFunctions.compareTwoValues(scenarioResponse.data.status, 'CREATED', `Scenario ${scenarioName} created assertion`);
            break;
          }
          await delay(2000);
        } catch (error) {
          await commonFunctions.logMessage('WARNING', `Error fetching scenario ${scenarioName} at attempt ${attempt + 1}: ${String(error)}`);
          await delay(10000);
        }
      }

      overallValidation = statusCreatedValidation && overallValidation;
    }

    expect(overallValidation).toBeTruthy();
  };

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    simulationBaseUrl = (process.env.API_BASE_URL as string) + (process.env.SIMULATION as string);

    const accessToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: 'Bearer ' + accessToken
    };
  });

  test('Test Case 1: Create Scenarios', async () => {
    const scenarioNames: string[] = [
      'Scenario_For_MaasPivot',
      'scenario_mass_chart_test',
      'Sceanrio_Case_Automation',
      'Dont_Delete_VF_Scope_Dimension_data',
      'test_scenario_do_not_delete',
      'Dont_Delete_Public_Scenario',
      'Scenario_Selection',
      'SubprocessSelectSidenavchild1',
      'SubprocessSelectSidenavchild2',
      'ProcessSelectSidenavchild1',
      'ProcessSelectSidenavchild2'
    ];

    await createAndValidateScenarios(scenarioNames, TestData.requestBody2);
  });

  test('Test Case 2: Create Assumption Scenarios', async () => {
    const scenarioNames: string[] = ['AssumptionScn3', 'AssumptionScn4'];
    await createAndValidateScenarios(scenarioNames, TestData.requestBody3);
  });
});
