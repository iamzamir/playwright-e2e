import CommonFunctions from "../../../util/common.util";
import ApiUtil from "../../../util/api.util";
const Testdata = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestrationBackend/ProcessBatch/Test_001_ProcessApiStartStop.json");

describe("Process Api Start Stop", async () => {

  let url: string, accessToken: string, headers: Record<string, string>;
  let jobId: string | null;
  let jobId1: string | null;
  let jobId2: string | null;

  before(async () => {
    url = process.env.API_BASE_URL as string + process.env.ACTIONITEM as string;
    accessToken = await ApiUtil.getBearerToken();
    headers = {
      "accept": "application/json",
      "Authorization": "Bearer " + accessToken
    };
  })

  // Execute tests for each process in the array
  Testdata.requestBody.processNames.forEach((processName: string) => {

    describe(`Process: ${processName}`, async () => {

      it("Test Case 1: Start Process", async () => {
        let response = await ApiUtil.processAPIRequest("POST", url + 'process/' + processName + '/start', {}, headers, "Start Process", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "process start Success Assertion");
        let validation1: boolean = await CommonFunctions.compareTwoValues(response.data.entityName, processName, "process start name Success Assertion");
        jobId = response.data.statusUrl ? await CommonFunctions.getJobIdFromUrl(response.data.statusUrl) : null;
        expect(validation && validation1 && jobId).toBeTruthy();
      });

      it("Test Case 2: Get job status", async () => {
        let validation1 = false;
        let validation2 = false;
        for (let i = 0; i < 5; i++) {
          let response = await ApiUtil.processAPIRequest("GET", url + "transitionJob/" + jobId + "/status", "", headers, "Fetching job status", "full");
          validation1 = await CommonFunctions.compareTwoValues(response.status, "200", "Fetch Job status Success Assertion");
          validation2 = await CommonFunctions.compareTwoValues(response.data.status, 'COMPLETED', " verify the status completed");
          if (response.data.status === 'COMPLETED') {
            expect(validation1 && validation2).toBeTruthy();
            break;
          }
          await browser.pause(1000);
        }
        expect(validation1 && validation2).toBeTruthy();
      });

      it("Test Case 3: Get Process status", async () => {
        let response = await ApiUtil.processAPIRequest("GET", url + "process/" + processName, "", headers, "Fetching job status", "full");
        let validation1: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "Fetch Process Details Success Assertion");
        let validation2: boolean = await CommonFunctions.compareTwoValues(response.data.status, 'In Progress', " verify the status In Progress");
        expect(validation1 && validation2).toBeTruthy();
      });

      it("Test Case 4: Stop Process", async () => {
        let response = await ApiUtil.processAPIRequest("POST", url + 'process/' + processName + '/stop', {}, headers, "Stop Process", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "process stop Success Assertion");
        let validation1: boolean = await CommonFunctions.compareTwoValues(response.data.entityName, processName, "process stop name Success Assertion");
        jobId = response.data.statusUrl ? await CommonFunctions.getJobIdFromUrl(response.data.statusUrl) : null;
        expect(validation && validation1 && jobId).toBeTruthy();
      });

      it("Test Case 5: Get job status", async () => {
        let validation1 = false;
        let validation2 = false;
        for (let i = 0; i < 5; i++) {
          let response = await ApiUtil.processAPIRequest("GET", url + "transitionJob/" + jobId + "/status", "", headers, "Fetching job status", "full");
          validation1 = await CommonFunctions.compareTwoValues(response.status, "200", "Fetch Job status Success Assertion");
          validation2 = await CommonFunctions.compareTwoValues(response.data.status, 'COMPLETED', " verify the status completed");
          if (response.data.status === 'COMPLETED') {
            expect(validation1 && validation2).toBeTruthy();
            break;
          }
          await browser.pause(1000);
        }
        expect(validation1 && validation2).toBeTruthy();
      });

      it("Test Case 6: Get Process status", async () => {
        let response = await ApiUtil.processAPIRequest("GET", url + "process/" + processName, "", headers, "Fetching job status", "full");
        let validation1: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "Fetch Process Details Success Assertion");
        let validation2: boolean = await CommonFunctions.compareTwoValues(response.data.status, 'Completed', " verify the status Completed");
        expect(validation1 && validation2).toBeTruthy();
      });

      it("Test Case 7: Start Process 2 Times", async () => {
        let response1 = await ApiUtil.processAPIRequest("POST", url + 'process/' + processName + '/start', {}, headers, "Start Process", "full");
        let response2 = await ApiUtil.processAPIRequest("POST", url + 'process/' + processName + '/start', {}, headers, "Start Process", "full");

        let validation1: boolean = await CommonFunctions.compareTwoValues(response1.status, "200", "process start Success Assertion");
        let validation2: boolean = await CommonFunctions.compareTwoValues(response1.data.entityName, processName, "process start name Success Assertion");
        jobId1 = response1.data.statusUrl ? await CommonFunctions.getJobIdFromUrl(response1.data.statusUrl) : null;

        let validation3: boolean = await CommonFunctions.compareTwoValues(response2.status, "200", "process start Success Assertion");
        let validation4: boolean = await CommonFunctions.compareTwoValues(response2.data.entityName, processName, "process start name Success Assertion");
        jobId2 = response2.data.statusUrl ? await CommonFunctions.getJobIdFromUrl(response2.data.statusUrl) : null;
        expect(validation1 && validation2 && jobId1 && validation3 && validation4 && jobId2).toBeTruthy();
      });

      it("Test Case 8: Get both job status", async () => {
        let validation1 = false;
        let validation2 = false;
        let validation3 = false;
        let validation4 = false;
        for (let i = 0; i < 5; i++) {
          let response = await ApiUtil.processAPIRequest("GET", url + "transitionJob/" + jobId1 + "/status", "", headers, "Fetching job status", "full");
          validation1 = await CommonFunctions.compareTwoValues(response.status, "200", "Fetch Job status Success Assertion");
          validation2 = await CommonFunctions.compareTwoValues(response.data.status, 'COMPLETED', " verify the status completed");
          if (response.data.status === 'COMPLETED') {
            expect(validation1 && validation2).toBeTruthy();
            break;
          }
          await browser.pause(1000);
        }
        for (let i = 0; i < 5; i++) {
          let response = await ApiUtil.processAPIRequest("GET", url + "transitionJob/" + jobId2 + "/status", "", headers, "Fetching job status", "full");
          validation3 = await CommonFunctions.compareTwoValues(response.status, "200", "Fetch Job status Success Assertion");
          validation4 = await CommonFunctions.compareTwoValues(response.data.status, 'COMPLETED', " verify the status completed");
          if (response.data.status === 'COMPLETED') {
            expect(validation3 && validation4).toBeTruthy();
            break;
          }
          await browser.pause(1000);
        }
        expect(validation1 && validation2 && validation3 && validation4).toBeTruthy();
      });

      it("Test Case 9: Get Process status - After 2 times start", async () => {
        let response = await ApiUtil.processAPIRequest("GET", url + "process/" + processName, "", headers, "Fetching job status", "full");
        let validation1: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "Fetch Process Details Success Assertion");
        let validation2: boolean = await CommonFunctions.compareTwoValues(response.data.status, 'In Progress', " verify the status In Progress");
        expect(validation1 && validation2).toBeTruthy();
      });

      it("Test Case 10: Stop Process 2 Times", async () => {
        let response1 = await ApiUtil.processAPIRequest("POST", url + 'process/' + processName + '/stop', {}, headers, "Stop Process", "full");
        let response2 = await ApiUtil.processAPIRequest("POST", url + 'process/' + processName + '/stop', {}, headers, "Stop Process", "full");

        let validation1: boolean = await CommonFunctions.compareTwoValues(response1.status, "200", "process stop Success Assertion");
        let validation2: boolean = await CommonFunctions.compareTwoValues(response1.data.entityName, processName, "process stop name Success Assertion");
        jobId1 = response1.data.statusUrl ? await CommonFunctions.getJobIdFromUrl(response1.data.statusUrl) : null;

        let validation3: boolean = await CommonFunctions.compareTwoValues(response2.status, "200", "process stop Success Assertion");
        let validation4: boolean = await CommonFunctions.compareTwoValues(response2.data.entityName, processName, "process stop name Success Assertion");
        jobId2 = response2.data.statusUrl ? await CommonFunctions.getJobIdFromUrl(response2.data.statusUrl) : null;
        expect(validation1 && validation2 && jobId1 && validation3 && validation4 && jobId2).toBeTruthy();
      });

      it("Test Case 11: Get both job status", async () => {
        let validation1 = false;
        let validation2 = false;
        let validation3 = false;
        let validation4 = false;
        for (let i = 0; i < 5; i++) {
          let response = await ApiUtil.processAPIRequest("GET", url + "transitionJob/" + jobId1 + "/status", "", headers, "Fetching job status", "full");
          validation1 = await CommonFunctions.compareTwoValues(response.status, "200", "Fetch Job status Success Assertion");
          validation2 = await CommonFunctions.compareTwoValues(response.data.status, 'COMPLETED', " verify the status completed");
          if (response.data.status === 'COMPLETED') {
            expect(validation1 && validation2).toBeTruthy();
            break;
          }
          await browser.pause(1000);
        }
        for (let i = 0; i < 5; i++) {
          let response = await ApiUtil.processAPIRequest("GET", url + "transitionJob/" + jobId2 + "/status", "", headers, "Fetching job status", "full");
          validation3 = await CommonFunctions.compareTwoValues(response.status, "200", "Fetch Job status Success Assertion");
          validation4 = await CommonFunctions.compareTwoValues(response.data.status, 'COMPLETED', " verify the status completed");
          if (response.data.status === 'COMPLETED') {
            expect(validation3 && validation4).toBeTruthy();
            break;
          }
          await browser.pause(1000);
        }
        expect(validation1 && validation2 && validation3 && validation4).toBeTruthy();
      });

      it("Test Case 12: Get Process status Again - After 2 times Stop", async () => {
        let response = await ApiUtil.processAPIRequest("GET", url + "process/" + processName, "", headers, "Fetching job status", "full");
        let validation1: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "Fetch Process Details Success Assertion");
        let validation2: boolean = await CommonFunctions.compareTwoValues(response.data.status, 'Completed', " verify the status Completed");
        expect(validation1 && validation2).toBeTruthy();
      });

    }); // End of describe block for each process

  }); // End of forEach

  // ========== NEGATIVE TEST CASES ==========

  it("Test Case 13: Start Process with Invalid Name (Negative)", async () => {
    let invalidProcessName = "INVALID_PROCESS_NAME_12345";
    let response = await ApiUtil.processAPIRequest("POST", url + 'process/' + invalidProcessName + '/start', {}, headers, "Start Invalid Process", "full");
    let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "401", "Unauthorized Invalid Process Name returns 401");
    expect(validation).toBeTruthy();
  });

  it("Test Case 14: Stop Process with Invalid Name (Negative)", async () => {
    let invalidProcessName = "INVALID_PROCESS_NAME_12345";
    let response = await ApiUtil.processAPIRequest("POST", url + 'process/' + invalidProcessName + '/stop', {}, headers, "Stop Invalid Process", "full");
    let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "401", "Unauthorized Invalid Process Name returns 401");
    expect(validation).toBeTruthy();
  });

  it("Test Case 15: Get Job Status with Invalid Job ID (Negative)", async () => {
    let invalidJobId = "00000000-0000-0000-0000-000000000000";
    let response = await ApiUtil.processAPIRequest("GET", url + "transitionJob/" + invalidJobId + "/status", "", headers, "Fetching Invalid Job Status", "full");
    let validation1: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "Invalid Job ID returns 200");
    // Check if response data is null, undefined, or has no status property
    let validation2: boolean = !response.data || response.data.status === undefined || response.data.status === null;
    expect(validation1 && validation2).toBeTruthy();
  });

  it("Test Case 16: Get Process Status with Invalid Name (Negative)", async () => {
    let invalidProcessName = "INVALID_PROCESS_NAME_12345";
    let response = await ApiUtil.processAPIRequest("GET", url + "process/" + invalidProcessName, "", headers, "Get Invalid Process Status", "full");
    let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "401", "Unauthorized Invalid Process Name returns 401");
    expect(validation).toBeTruthy();
  });

  it("Test Case 17: Start Process without Authorization (Negative)", async () => {
    let unauthorizedHeaders = {
      "accept": "application/json"
    };
    let response = await ApiUtil.processAPIRequest("POST", url + 'process/' + Testdata.requestBody.processNames[0] + '/start', {}, unauthorizedHeaders, "Start Process Without Auth", "full");
    await CommonFunctions.logMessage("INFO", `Response status when starting process without authorization: ${response.status}`);
    let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "401", "Unauthorized request returns 401");
    expect(validation).toBeTruthy();
  });

  it("Test Case 18: Stop Process without Authorization (Negative)", async () => {
    let unauthorizedHeaders = {
      "accept": "application/json"
    };
    let response = await ApiUtil.processAPIRequest("POST", url + 'process/' + Testdata.requestBody.processNames[0] + '/stop', {}, unauthorizedHeaders, "Stop Process Without Auth", "full");
    await CommonFunctions.logMessage("INFO", `Response status when stopping process without authorization: ${response.status}`);
    let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "401", "Unauthorized request returns 401");
    expect(validation).toBeTruthy();
  });

  it("Test Case 19: Get Job Status without Authorization (Negative)", async () => {
    // First create a valid job
    let startResponse = await ApiUtil.processAPIRequest("POST", url + 'process/' + Testdata.requestBody.processNames[0] + '/start', {}, headers, "Start Process", "full");
    let testJobId = startResponse.data.statusUrl ? await CommonFunctions.getJobIdFromUrl(startResponse.data.statusUrl) : null;

    let unauthorizedHeaders = {
      "accept": "application/json"
    };
    let response = await ApiUtil.processAPIRequest("GET", url + "transitionJob/" + testJobId + "/status", "", unauthorizedHeaders, "Get Job Status Without Auth", "full");
    // Should return 401 Unauthorized
    await CommonFunctions.logMessage("INFO", `Response status when getting job status without authorization: ${response.status}`);
    let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "401", "Unauthorized request returns 401");
    expect(validation).toBeTruthy();

    // Cleanup
    await ApiUtil.processAPIRequest("POST", url + 'process/' + Testdata.requestBody.processNames[0] + '/stop', {}, headers, "Stop Process Cleanup", "full");
  });

  it("Test Case 20: Start and Stop Process Multiple Times (Positive)", async () => {
    for (let iteration = 0; iteration < 3; iteration++) {
      // Start
      let startResponse = await ApiUtil.processAPIRequest("POST", url + 'process/' + Testdata.requestBody.processNames[0] + '/start', {}, headers, `Start Process - Iteration ${iteration + 1}`, "full");
      expect(startResponse.status).toBe(200);
      await browser.pause(2000);

      // Stop
      let stopResponse = await ApiUtil.processAPIRequest("POST", url + 'process/' + Testdata.requestBody.processNames[0] + '/stop', {}, headers, `Stop Process - Iteration ${iteration + 1}`, "full");
      expect(stopResponse.status).toBe(200);
      await browser.pause(2000);
    }

    // Final verification - process should be stopped
    let response = await ApiUtil.processAPIRequest("GET", url + "process/" + Testdata.requestBody.processNames[0], "", headers, "Final Process Status Check", "full");
    let validation: boolean = await CommonFunctions.compareTwoValues(response.data.status, 'Completed', "Process is in Completed state");
    expect(validation).toBeTruthy();
  });

});