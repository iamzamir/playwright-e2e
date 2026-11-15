import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';

const TestData = require('../../../testdata/' + process.env.PSENV + '/DataSetupBatch/Scenarios/Test_003_AddChildScenariosToMaas.json');

const scenarioNames: string[] = Array.from(new Set(TestData.scenarioSets.default));

test.describe.serial('Data Setup: Add child scenarios to Maas cluster', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
  let scenarioIdMap: Record<string, string> = {};
  let baseScenarioName = '';
  let baseScenarioId = '';
  let envSegment = '';
  let maasBaseUrl = '';
  let addedScenarios: string[] = [];
  let existingMaasScenarios: string[] = [];
  let missingInSimulation: string[] = [];
  let scenariosToAdd: string[] = [];
  let alreadyInMaas: string[] = [];

  const getMaasScenarios = async (stepName: string): Promise<string[]> => {
    const maasResp = await apiUtil.processAPIRequest('GET', maasBaseUrl, null, headers, stepName, 'full');
    const validation = await commonFunctions.compareTwoValues(maasResp.status, 200, `${stepName} success`);
    expect(validation).toBeTruthy();
    return (maasResp.data?.data || []).map((s: any) => s.name);
  };

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();

    await commonFunctions.logMessage('INFO', 'Starting Data Setup: Add child scenarios to Maas cluster');

    const bearerToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: 'Bearer ' + bearerToken,
      'Content-Type': 'application/json'
    };

    const baseUrl = process.env.API_BASE_URL;
    const searchSimulation = process.env.SEARCH_SIMULATION;
    if (!baseUrl || !searchSimulation) {
      throw new Error('Required environment variables API_BASE_URL or SEARCH_SIMULATION are not set.');
    }

    envSegment = TestData.API_ENV_SEGMENT || process.env.API_ENV_SEGMENT || 'interop';
    maasBaseUrl = `${baseUrl}cbp/${envSegment}/maas/controller/v1/calcEngines/${TestData.CALC_ENGINE_ID}/scenarios`;

    await commonFunctions.logMessage('INFO', `Using environment segment: ${envSegment}`);
    await commonFunctions.logMessage('INFO', `Maas Base URL: ${maasBaseUrl}`);
    await commonFunctions.logMessage('INFO', `Process Name: ${TestData.PROCESS_NAME}`);
    await commonFunctions.logMessage('INFO', `Calc Engine ID: ${TestData.CALC_ENGINE_ID}`);

    const simUrl = `${baseUrl}${searchSimulation}?offset=0&limit=1000`;
    const simPayload = { sourceIds: [TestData.PROCESS_NAME, TestData.ASSUMPTION] };

    await commonFunctions.logMessage('INFO', 'Fetching scenarios from simulation service...');
    const simResp = await apiUtil.processAPIRequest('POST', simUrl, simPayload, headers, 'Get Scenarios from Simulation Service', 'full');

    const validation1 = await commonFunctions.compareTwoValues(simResp.status, 200, 'Simulation Service response success');
    expect(validation1).toBeTruthy();

    const allScenarios = simResp.data?.entities || [];
    await commonFunctions.logMessage('INFO', `Found ${allScenarios.length} scenarios in simulation service`);

    if (allScenarios.length === 0) {
      throw new Error('No scenarios found in simulation service');
    }

    const baseScenario = allScenarios.find((s: any) => s.scenarioType === 'BASE');
    if (baseScenario) {
      baseScenarioName = baseScenario.scenarioName;
      baseScenarioId = baseScenario.scenarioId;
      await commonFunctions.logMessage('INFO', `Base scenario found: ${baseScenarioName} (ID: ${baseScenarioId})`);
    } else {
      await commonFunctions.logMessage('WARNING', 'No BASE scenario found in simulation service');
    }

    let foundScenariosCount = 0;
    for (const name of scenarioNames) {
      const found = allScenarios.find((s: any) => s.scenarioName === name);
      if (found) {
        scenarioIdMap[name] = found.scenarioId;
        foundScenariosCount++;
        await commonFunctions.logMessage('INFO', `Mapped scenario: ${name} -> ${found.scenarioId}`);
      } else {
        missingInSimulation.push(name);
        await commonFunctions.logMessage('WARNING', `Scenario "${name}" not found in simulation service, will be skipped.`);
      }
    }

    await commonFunctions.logMessage('INFO', `Successfully mapped ${foundScenariosCount}/${scenarioNames.length} scenarios`);

    if (foundScenariosCount === 0) {
      throw new Error('No configured scenarios found in simulation service');
    }

    existingMaasScenarios = await getMaasScenarios('Get Existing Maas Scenarios');
    await commonFunctions.logMessage('INFO', `Existing scenarios in Maas: [${existingMaasScenarios.join(', ')}]`);

    for (const name of Object.keys(scenarioIdMap)) {
      if (existingMaasScenarios.includes(name)) {
        alreadyInMaas.push(name);
      } else {
        scenariosToAdd.push(name);
      }
    }
  });

  test('Test Case 1: Validate mapping and sync plan', async () => {
    await commonFunctions.logMessage('INFO', `Configured scenarios (unique): ${scenarioNames.length}`);
    await commonFunctions.logMessage('INFO', `Mapped in simulation: ${Object.keys(scenarioIdMap).length}`);
    await commonFunctions.logMessage('INFO', `Missing in simulation: ${missingInSimulation.length}`);
    await commonFunctions.logMessage('INFO', `Already in Maas: ${alreadyInMaas.length}`);
    await commonFunctions.logMessage('INFO', `Missing in Maas (to add): ${scenariosToAdd.length}`);

    const hasWorkOrAlreadySynced = Object.keys(scenarioIdMap).length > 0;
    const validation = await commonFunctions.compareTwoValues(hasWorkOrAlreadySynced, true, 'At least one configured scenario is available in simulation');
    expect(validation).toBeTruthy();
  });

  test('Test Case 2: Add missing child scenarios to Maas calc engine', async () => {
    await commonFunctions.logMessage('INFO', 'Starting to add missing child scenarios to Maas calc engine...');

    let successCount = 0;
    const skippedCount = alreadyInMaas.length + missingInSimulation.length;

    for (const name of scenariosToAdd) {
      const scenarioId = scenarioIdMap[name];
      try {
        const payload: any = {
          scenarioId,
          scenarioIds: [scenarioId],
          scenarioName: name
        };

        if (name !== baseScenarioName && baseScenarioName && baseScenarioId) {
          payload.parentScenarioName = baseScenarioName;
          payload.parentScenarioId = baseScenarioId;
          await commonFunctions.logMessage('INFO', `Adding child scenario "${name}" with parent "${baseScenarioName}"`);
        } else {
          await commonFunctions.logMessage('INFO', `Adding scenario "${name}" without parent`);
        }

        const addResp = await apiUtil.processAPIRequest('POST', maasBaseUrl, payload, headers, `Add scenario "${name}" to Maas`, 'full');
        const isSuccess = addResp.status === 200 || addResp.status === 201;
        const validation = await commonFunctions.compareTwoValues(isSuccess, true, `Scenario "${name}" added to Maas successfully`);

        if (validation) {
          successCount++;
          addedScenarios.push(name);
          await commonFunctions.logMessage('INFO', `Successfully added scenario "${name}" to Maas`);
        }

        expect(validation).toBeTruthy();
      } catch (error: any) {
        await commonFunctions.logMessage('ERROR', `Exception while adding scenario "${name}": ${error?.message || error}`);
        throw error;
      }
    }

    await commonFunctions.logMessage('INFO', '=== Add Scenarios Summary ===');
    await commonFunctions.logMessage('INFO', `Successfully added: ${successCount} scenarios`);
    await commonFunctions.logMessage('INFO', `Skipped (already exist/not found): ${skippedCount} scenarios`);
    await commonFunctions.logMessage('INFO', `Added scenarios: [${addedScenarios.join(', ')}]`);

    const totalProcessed = successCount + skippedCount;
    const validation = await commonFunctions.compareTwoValues(totalProcessed > 0, true, 'At least one scenario was processed successfully');
    expect(validation).toBeTruthy();
  });

  test('Test Case 3: Verify mapped scenarios are present in Maas', async () => {
    await commonFunctions.logMessage('INFO', 'Verifying that mapped scenarios are present in Maas...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const currentScenarios = await getMaasScenarios('Verify Scenarios In Maas');
    let verificationSuccessCount = 0;

    for (const scenarioName of Object.keys(scenarioIdMap)) {
      const isPresent = currentScenarios.includes(scenarioName);
      const validation = await commonFunctions.compareTwoValues(isPresent, true, `Scenario "${scenarioName}" verified in Maas`);

      if (validation) {
        verificationSuccessCount++;
        await commonFunctions.logMessage('INFO', `Verified scenario "${scenarioName}" is present in Maas`);
      } else {
        await commonFunctions.logMessage('ERROR', `Scenario "${scenarioName}" not found in Maas after addition`);
      }

      expect(validation).toBeTruthy();
    }

    await commonFunctions.logMessage('INFO', `Verification complete: ${verificationSuccessCount}/${Object.keys(scenarioIdMap).length} mapped scenarios verified`);
  });

  test.afterAll(async () => {
    await commonFunctions.logMessage('INFO', '=== Final Test Summary ===');
    await commonFunctions.logMessage('INFO', `Total scenarios configured (unique): ${scenarioNames.length}`);
    await commonFunctions.logMessage('INFO', `Scenarios found in simulation: ${Object.keys(scenarioIdMap).length}`);
    await commonFunctions.logMessage('INFO', `Scenarios missing in simulation: ${missingInSimulation.length}`);
    await commonFunctions.logMessage('INFO', `Scenarios already in Maas: ${alreadyInMaas.length}`);
    await commonFunctions.logMessage('INFO', `Scenarios added to Maas: ${addedScenarios.length}`);
    await commonFunctions.logMessage('INFO', `Base scenario: ${baseScenarioName || 'Not found'}`);
    await commonFunctions.logMessage('INFO', `Environment segment: ${envSegment}`);
    await commonFunctions.logMessage('INFO', `Calc engine ID: ${TestData.CALC_ENGINE_ID}`);

    if (addedScenarios.length > 0) {
      await commonFunctions.logMessage('INFO', `Successfully added scenarios: [${addedScenarios.join(', ')}]`);
    }

    await commonFunctions.logMessage('INFO', 'Data Setup: Add child scenarios to Maas cluster - Completed');
  });
});
