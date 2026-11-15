import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { getTimeout } from '../../../constants/timeouts';
import { getJobIdFromUrl, startProcess, ensureProcessesStopped, waitForJobCompleted } from '../../../util/process-start.util';
import { getFirstCalendarCycle } from '../../../util/calendar-cycle.util';

const Testdata = require('../../../testdata/' + process.env.PSENV + '/ProcessOrchestrationBackend/ProcessBatch/Test_001_ProcessApiStartStop.json');

function newestImConfig(names: string[]): string | undefined {
  const ranked = names
    .map((name) => {
      const match = name.match(/_(\d+)_IM$/i);
      return { name, timestamp: match ? Number(match[1]) : -1 };
    })
    .sort((left, right) => left.timestamp - right.timestamp);
  return ranked.length ? ranked[ranked.length - 1].name : undefined;
}

test.describe.serial('Process Api Start Stop', () => {

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

    const apiBaseUrl = process.env.API_BASE_URL as string;
    const processNames: string[] = Testdata.requestBody.processNames;
    let cycleName: string | undefined;

    for (const processName of processNames) {
      const getProcessUrl: string = apiBaseUrl + process.env.GET_PROCESS_WITH_NAME as string + '/' + processName;
      const getProcessResponse = await apiUtil.processAPIRequest('GET', getProcessUrl, null, headers, `Get process '${processName}' to check existence`, 'full');

      const processExists = commonFunctions.isStatus(getProcessResponse?.status, 200) &&
        (getProcessResponse.data?.name === processName || !!getProcessResponse.data?.id);

      if (processExists) {
        await commonFunctions.logMessage('INFO', `Process '${processName}' already exists (ID: ${getProcessResponse.data?.id}), skipping process creation`);
        continue;
      }

      await commonFunctions.logMessage('INFO', `Process '${processName}' does not exist. Creating process via template API...`);
      if (!cycleName) {
        cycleName = await getFirstCalendarCycle(apiUtil, apiBaseUrl, headers, Testdata.PROCESS_PAYLOAD.calendarName);
      }
      const createProcessUrl: string = apiBaseUrl + process.env.CREATE_PROCESS_WITH_TEMPLATE as string;
      const processPayload = {
        ...Testdata.PROCESS_PAYLOAD,
        displayName: processName,
        cycleName
      };
      const createProcessResponse = await apiUtil.processAPIRequest('POST', createProcessUrl, processPayload, headers, `Create process '${processName}' for start/stop test`, 'full');
      if (commonFunctions.isSuccessStatus(createProcessResponse?.status)) {
        await commonFunctions.logMessage('INFO', `Process '${createProcessResponse.data?.name || processName}' created successfully with ID '${createProcessResponse.data?.id}'`);
      } else {
        await commonFunctions.logMessage('FAIL', `Failed to create prerequisite process '${processName}'. Status: ${createProcessResponse?.status}`);
        throw new Error(`[beforeAll] Prerequisite process '${processName}' could not be created. Status: ${createProcessResponse?.status}`);
      }

      let procedureConfigName: string | undefined;
      await expect.poll(async () => {
        const configResponse = await apiUtil.processAPIRequest('GET', `${apiBaseUrl}${process.env.ALL_PROCEDURES_CONFIG_NAME_LIST as string}`, null, headers, `Get procedures config names for '${processName}'`, 'full');
        const configNames = Array.isArray(configResponse.data?.data) ? configResponse.data.data.filter((name: unknown): name is string => typeof name === 'string') : [];
        const matches = configNames.filter((name: string) => name.startsWith(processName));
        const imMatches = matches.filter((name: string) => /_IM$/i.test(name));
        const fallbackImMatches = configNames.filter((name: string) => /_IM$/i.test(name));
        const candidates = imMatches.length > 0 ? imMatches : matches.length > 0 ? matches : fallbackImMatches;
        procedureConfigName = newestImConfig(candidates) || candidates[0];
        return !!procedureConfigName;
      }, { timeout: getTimeout('XLARGE'), intervals: [getTimeout('POLL_INTERVAL')] }).toBe(true);

      if (!procedureConfigName) {
        throw new Error(`[beforeAll] No procedure config found for process '${processName}'`);
      }

      await commonFunctions.logMessage('INFO', `Resolved procedure config '${procedureConfigName}' for process '${processName}'`);
      const mappingPayload = {
        name: processName,
        displayName: processName,
        proceduresConfig: [{ name: procedureConfigName, displayName: `${processName} InsightsManager` }],
        subProcesses: Testdata.TEMPLATE_CHILDREN.map((child: any) => ({
          name: child.name,
          displayName: child.displayName,
          proceduresConfig: [],
          subProcesses: []
        }))
      };
      const mappingResponse = await apiUtil.processAPIRequest('POST', `${apiBaseUrl}${process.env.PROCESS_MODELS as string}`, mappingPayload, headers, `Create process model mapping for '${processName}'`, 'full');
      if (commonFunctions.isStatus(mappingResponse?.status, 201) || commonFunctions.isStatus(mappingResponse?.status, 200) || commonFunctions.isStatus(mappingResponse?.status, 409)) {
        await commonFunctions.logMessage('INFO', `Process model mapping for '${processName}' completed. Status: ${mappingResponse?.status}`);
      } else {
        await commonFunctions.logMessage('FAIL', `Failed to map process model for '${processName}'. Status: ${mappingResponse?.status}`);
        throw new Error(`[beforeAll] Process model mapping for '${processName}' failed. Status: ${mappingResponse?.status}`);
      }
    }

    await ensureProcessesStopped(apiUtil, commonFunctions, url, headers, processNames);
  });

  test.afterAll(async () => {
    if (!apiUtil || !headers || !url) {
      return;
    }
    await ensureProcessesStopped(apiUtil, commonFunctions, url, headers, Testdata.requestBody.processNames);
  });

  // Execute tests for each process in the array
  Testdata.requestBody.processNames.forEach((processName: string) => {

    test.describe(`Process: ${processName}`, () => {

      let jobId: string | null = null;

      test('Test Case 1: Start Process', async () => {
        const response = await startProcess(apiUtil, commonFunctions, url, headers, processName);
        const validation = await commonFunctions.compareTwoValues(response.status, 200, "process start Success Assertion");
        const validation1 = await commonFunctions.compareTwoValues(response.data.entityName, processName, "process start name Success Assertion");
        jobId = response.data.statusUrl ? getJobIdFromUrl(response.data.statusUrl) : null;
        expect(validation && validation1 && jobId).toBeTruthy();
      });

      test('Test Case 2: Get job status', async () => {
        const response = await waitForJobCompleted(apiUtil, commonFunctions, url, headers, jobId);
        expect(response.data.status).toBe('COMPLETED');
      });

      test('Test Case 3: Get Process status', async () => {
        const response = await apiUtil.processAPIRequest("GET", url + "process/" + processName, "", headers, "Fetching process status", "full");
        const validation1 = await commonFunctions.compareTwoValues(response.status, 200, "Fetch Process Details Success Assertion");
        const validation2 = await commonFunctions.compareTwoValues(response.data.status, 'In Progress', "verify the status In Progress");
        expect(validation1 && validation2).toBeTruthy();
      });

      test('Test Case 4: Stop Process', async () => {
        const response = await apiUtil.processAPIRequest("POST", url + 'process/' + processName + '/stop', {}, headers, "Stop Process", "full");
        const validation = await commonFunctions.compareTwoValues(response.status, 200, "process stop Success Assertion");
        const validation1 = await commonFunctions.compareTwoValues(response.data.entityName, processName, "process stop name Success Assertion");
        jobId = response.data.statusUrl ? getJobIdFromUrl(response.data.statusUrl) : null;
        expect(validation && validation1 && jobId).toBeTruthy();
      });

      test('Test Case 5: Get job status', async () => {
        const response = await waitForJobCompleted(apiUtil, commonFunctions, url, headers, jobId);
        expect(response.data.status).toBe('COMPLETED');
      });

      test('Test Case 6: Get Process status', async () => {
        const response = await apiUtil.processAPIRequest("GET", url + "process/" + processName, "", headers, "Fetching process status", "full");
        const validation1 = await commonFunctions.compareTwoValues(response.status, 200, "Fetch Process Details Success Assertion");
        const validation2 = await commonFunctions.compareTwoValues(response.data.status, 'Completed', "verify the status Completed");
        expect(validation1 && validation2).toBeTruthy();
      });

    });

  });

  // ========== NEGATIVE TEST CASES ==========

  test('Test Case 7: Start Process with Invalid Name (Negative)', async () => {
    const invalidProcessName = "INVALID_PROCESS_NAME_12345";
    const response = await apiUtil.processAPIRequest("POST", url + 'process/' + invalidProcessName + '/start', {}, headers, "Start Invalid Process", "full");
    const validation = await commonFunctions.compareTwoValues(response.status, '401', "Unauthorized Invalid Process Name returns 401");
    expect(validation).toBeTruthy();
  });

  test('Test Case 8: Stop Process with Invalid Name (Negative)', async () => {
    const invalidProcessName = "INVALID_PROCESS_NAME_12345";
    const response = await apiUtil.processAPIRequest("POST", url + 'process/' + invalidProcessName + '/stop', {}, headers, "Stop Invalid Process", "full");
    const validation = await commonFunctions.compareTwoValues(response.status, '401', "Unauthorized Invalid Process Name returns 401");
    expect(validation).toBeTruthy();
  });

  test('Test Case 9: Get Job Status with Invalid Job ID (Negative)', async () => {
    const invalidJobId = "00000000-0000-0000-0000-000000000000";
    const response = await apiUtil.processAPIRequest("GET", url + "transitionJob/" + invalidJobId + "/status", "", headers, "Fetching Invalid Job Status", "full");
    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, "Invalid Job ID returns 200");
    const validation2 = !response.data || response.data.status === undefined || response.data.status === null;
    expect(validation1 && validation2).toBeTruthy();
  });

  test('Test Case 10: Get Process Status with Invalid Name (Negative)', async () => {
    const invalidProcessName = "INVALID_PROCESS_NAME_12345";
    const response = await apiUtil.processAPIRequest("GET", url + "process/" + invalidProcessName, "", headers, "Get Invalid Process Status", "full");
    const validation = await commonFunctions.compareTwoValues(response.status, '401', "Unauthorized Invalid Process Name returns 401");
    expect(validation).toBeTruthy();
  });

  test('Test Case 11: Start Process without Authorization (Negative)', async () => {
    const unauthorizedHeaders = { "accept": "application/json" };
    const response = await apiUtil.processAPIRequest("POST", url + 'process/' + Testdata.requestBody.processNames[0] + '/start', {}, unauthorizedHeaders, "Start Process Without Auth", "full");
    await commonFunctions.logMessage("INFO", `Response status when starting process without authorization: ${response.status}`);
    const validation = await commonFunctions.compareTwoValues(response.status, '401', "Unauthorized request returns 401");
    expect(validation).toBeTruthy();
  });

  test('Test Case 12: Stop Process without Authorization (Negative)', async () => {
    const unauthorizedHeaders = { "accept": "application/json" };
    const response = await apiUtil.processAPIRequest("POST", url + 'process/' + Testdata.requestBody.processNames[0] + '/stop', {}, unauthorizedHeaders, "Stop Process Without Auth", "full");
    await commonFunctions.logMessage("INFO", `Response status when stopping process without authorization: ${response.status}`);
    const validation = await commonFunctions.compareTwoValues(response.status, '401', "Unauthorized request returns 401");
    expect(validation).toBeTruthy();
  });

  test('Test Case 13: Get Job Status without Authorization (Negative)', async () => {
    const unauthorizedHeaders = { "accept": "application/json" };
    const dummyJobId = "00000000-0000-0000-0000-000000000000";
    const response = await apiUtil.processAPIRequest("GET", url + "transitionJob/" + dummyJobId + "/status", "", unauthorizedHeaders, "Get Job Status Without Auth", "full");
    await commonFunctions.logMessage("INFO", `Response status when getting job status without authorization: ${response.status}`);
    const validation = await commonFunctions.compareTwoValues(response.status, '401', "Unauthorized request returns 401");
    expect(validation).toBeTruthy();
  });


});



