import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { getJobIdFromUrl, startProcess, ensureProcessesStopped, waitForJobCompleted } from '../../../util/process-start.util';

const Testdata = require('../../../testdata/' + process.env.PSENV + '/ProcessOrchestrationBackend/ProcessBatch/Test_004_ProcessApiStartStopTwice.json');

test.describe.serial('Process Api Start Stop Twice', () => {

  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let url: string;
  let headers: Record<string, string>;

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    url = process.env.API_BASE_URL as string + process.env.ACTIONITEM as string;
    const accessToken = await apiUtil.getBearerToken();
    headers = {
      "accept": "application/json",
      "Authorization": "Bearer " + accessToken
    };
    await ensureProcessesStopped(apiUtil, commonFunctions, url, headers, Testdata.requestBody.processNames);
  });

  test.afterAll(async () => {
    if (!apiUtil || !headers || !url) {
      return;
    }
    await ensureProcessesStopped(apiUtil, commonFunctions, url, headers, Testdata.requestBody.processNames);
  });

  Testdata.requestBody.processNames.forEach((processName: string) => {

    test.describe.serial(`Process: ${processName}`, () => {

      let jobId1: string | null = null;
      let jobId2: string | null = null;

      test('Test Case 1: Start Process 2 Times', async () => {
        const response1 = await startProcess(apiUtil, commonFunctions, url, headers, processName);
        const response2 = await startProcess(apiUtil, commonFunctions, url, headers, processName);

        const validation1 = await commonFunctions.compareTwoValues(response1.status, 200, "process start Success Assertion");
        const validation2 = await commonFunctions.compareTwoValues(response1.data.entityName, processName, "process start name Success Assertion");
        jobId1 = response1.data.statusUrl ? getJobIdFromUrl(response1.data.statusUrl) : null;

        const validation3 = await commonFunctions.compareTwoValues(response2.status, 200, "process start Success Assertion");
        const validation4 = await commonFunctions.compareTwoValues(response2.data.entityName, processName, "process start name Success Assertion");
        jobId2 = response2.data.statusUrl ? getJobIdFromUrl(response2.data.statusUrl) : null;
        expect(validation1 && validation2 && jobId1 && validation3 && validation4 && jobId2).toBeTruthy();
      });

      test('Test Case 2: Get both job status', async () => {
        const response1 = await waitForJobCompleted(apiUtil, commonFunctions, url, headers, jobId1);
        const response2 = await waitForJobCompleted(apiUtil, commonFunctions, url, headers, jobId2);
        expect(response1.data.status).toBe('COMPLETED');
        expect(response2.data.status).toBe('COMPLETED');
      });

      test('Test Case 3: Get Process status - After 2 times start', async () => {
        const response = await apiUtil.processAPIRequest("GET", url + "process/" + processName, "", headers, "Fetching process status", "full");
        const validation1 = await commonFunctions.compareTwoValues(response.status, 200, "Fetch Process Details Success Assertion");
        const validation2 = await commonFunctions.compareTwoValues(response.data.status, 'In Progress', "verify the status In Progress");
        expect(validation1 && validation2).toBeTruthy();
      });

      test('Test Case 4: Stop Process 2 Times', async () => {
        const response1 = await apiUtil.processAPIRequest("POST", url + 'process/' + processName + '/stop', {}, headers, "Stop Process", "full");
        const response2 = await apiUtil.processAPIRequest("POST", url + 'process/' + processName + '/stop', {}, headers, "Stop Process", "full");

        const validation1 = await commonFunctions.compareTwoValues(response1.status, 200, "process stop Success Assertion");
        const validation2 = await commonFunctions.compareTwoValues(response1.data.entityName, processName, "process stop name Success Assertion");
        jobId1 = response1.data.statusUrl ? getJobIdFromUrl(response1.data.statusUrl) : null;

        const validation3 = await commonFunctions.compareTwoValues(response2.status, 200, "process stop Success Assertion");
        const validation4 = await commonFunctions.compareTwoValues(response2.data.entityName, processName, "process stop name Success Assertion");
        jobId2 = response2.data.statusUrl ? getJobIdFromUrl(response2.data.statusUrl) : null;
        expect(validation1 && validation2 && jobId1 && validation3 && validation4 && jobId2).toBeTruthy();
      });

      test('Test Case 5: Get both job status', async () => {
        const response1 = await waitForJobCompleted(apiUtil, commonFunctions, url, headers, jobId1);
        const response2 = await waitForJobCompleted(apiUtil, commonFunctions, url, headers, jobId2);
        expect(response1.data.status).toBe('COMPLETED');
        expect(response2.data.status).toBe('COMPLETED');
      });

      test('Test Case 6: Get Process status Again - After 2 times Stop', async () => {
        const response = await apiUtil.processAPIRequest("GET", url + "process/" + processName, "", headers, "Fetching process status", "full");
        const validation1 = await commonFunctions.compareTwoValues(response.status, 200, "Fetch Process Details Success Assertion");
        const validation2 = await commonFunctions.compareTwoValues(response.data.status, 'Completed', "verify the status Completed");
        expect(validation1 && validation2).toBeTruthy();
      });

    });

  });

});