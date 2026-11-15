import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';

const TestData = require('../../../testdata/' + process.env.PSENV + '/DataSetupBatch/ODM/Test_001_DeletePIanningInstances.json');

type PlanningInstance = {
  id: string;
  status: string;
  engines?: string[] | string;
};

test.describe.serial('Delete Planning Instance for a Scenario ID', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let url: string;
  let headers: Record<string, string>;

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    url = (process.env.API_BASE_URL as string) + (process.env.PLANNING_INSTANCE as string);
    const accessToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: 'Bearer ' + accessToken
    };
  });

  test('Test Case 1: Fetch and Delete STOPPED and ERROR planning instances by scenario ID', async () => {
    const response = await apiUtil.processAPIRequest('GET', `${url}?scenarioId=${TestData.ScenarioId}`, null, headers, 'Fetching Planning Instance', 'full');
    await commonFunctions.compareTwoValues(response.status, 200, `Fetch Planning Instance by Scenario ID ${TestData.ScenarioId} success assertion`);

    const planningInstances: PlanningInstance[] = Array.isArray(response.data) ? response.data : [];
    await commonFunctions.logMessage('INFO', `Total records: ${planningInstances.length}`);

    const deleteIds = planningInstances.filter((instance) => instance.status === 'STOPPED' || instance.status === 'ERROR').map((instance) => instance.id);
    await commonFunctions.logMessage('INFO', `STOPPED and ERROR PI IDs: ${deleteIds.join(', ')}`);
    await commonFunctions.logMessage('INFO', `Total STOPPED and ERROR PIs: ${deleteIds.length}`);

    let validation = true;
    for (const planningInstanceId of deleteIds) {
      const deleteResponse = await apiUtil.processAPIRequest('DELETE', `${url}/${planningInstanceId}`, null, headers, `Deleting Planning Instance: ${planningInstanceId}`, 'full');
      const isDeleted = await commonFunctions.compareTwoValues(deleteResponse.status, 202, 'Delete Planning Instance success assertion');
      validation = isDeleted && validation;
    }

    expect(validation).toBeTruthy();
  });

  test('Test Case 2: Patch and Delete INPROGRESS planning instances', async () => {
    const response = await apiUtil.processAPIRequest('GET', `${url}?scenarioId=${TestData.ScenarioId}`, null, headers, 'Fetching Planning Instances', 'full');
    await commonFunctions.compareTwoValues(response.status, 200, `Fetch Planning Instance by Scenario ID ${TestData.ScenarioId} success assertion`);

    const planningInstances: PlanningInstance[] = Array.isArray(response.data) ? response.data : [];
    await commonFunctions.logMessage('INFO', `Total records: ${planningInstances.length}`);

    const inprogressInstances = planningInstances
      .filter((instance) => instance.status === 'INPROGRESS')
      .map((instance) => ({
        id: instance.id,
        engines: Array.isArray(instance.engines) ? instance.engines : String(instance.engines || '').split(',').filter(Boolean)
      }));

    await commonFunctions.logMessage('INFO', `INPROGRESS PI IDs: ${inprogressInstances.map((instance) => instance.id).join(', ')}`);
    await commonFunctions.logMessage('INFO', `Total INPROGRESS PIs: ${inprogressInstances.length}`);

    let patchValidation = true;
    for (const instance of inprogressInstances) {
      if (instance.engines.length === 1) {
        const patchResponse = await apiUtil.processAPIRequest('PATCH', `${url}/${instance.id}`, TestData.requestBody[0], headers, `Patching Planning Instance: ${instance.id}`, 'full');
        const isPatched = await commonFunctions.compareTwoValues(patchResponse.status, 204, 'Patch Planning Instance for only maas success assertion');
        patchValidation = isPatched && patchValidation;
      } else if (instance.engines.length > 1) {
        const patchResponse1 = await apiUtil.processAPIRequest('PATCH', `${url}/${instance.id}`, TestData.requestBody[0], headers, `Patching Planning Instance for maas: ${instance.id}`, 'full');
        const isPatched1 = await commonFunctions.compareTwoValues(patchResponse1.status, 204, 'Patch Planning Instance for maas success assertion');
        patchValidation = isPatched1 && patchValidation;

        const patchResponse2 = await apiUtil.processAPIRequest('PATCH', `${url}/${instance.id}`, TestData.requestBody[1], headers, `Patching Planning Instance for sparq: ${instance.id}`, 'full');
        const isPatched2 = await commonFunctions.compareTwoValues(patchResponse2.status, 204, 'Patch Planning Instance for sparq success assertion');
        patchValidation = isPatched2 && patchValidation;
      }
    }

    let deleteValidation = true;
    for (const instance of inprogressInstances) {
      const deleteResponse = await apiUtil.processAPIRequest('DELETE', `${url}/${instance.id}`, null, headers, `Deleting Planning Instance: ${instance.id}`, 'full');
      const isDeleted = await commonFunctions.compareTwoValues(deleteResponse.status, 202, 'Delete patched Planning Instance success assertion');
      deleteValidation = isDeleted && deleteValidation;
    }

    expect(patchValidation && deleteValidation).toBeTruthy();
  });
});
