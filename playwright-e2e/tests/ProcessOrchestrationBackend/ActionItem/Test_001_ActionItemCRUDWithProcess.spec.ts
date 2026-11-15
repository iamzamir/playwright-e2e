import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { getTimeout } from '../../../constants/timeouts';

const TestData = require('../../../testdata/' + process.env.PSENV + '/ProcessOrchestrationBackend/ActionItem/Test_001_ActionItemCRUDWithProcess.json');

test.describe.serial('Process CRUD operations on Action Item', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let url: string;
  let deleteUrl: string;
  let headers: Record<string, string>;
  let actionitemId: string;
  let entityId: string;
  let sourceId: string;
  let processEntityId: string;
  let attributes: any;
  // QA uses "Not started", all other envs use "Not Started"
  const status: string = process.env.PSENV === 'QA' ? 'Not started' : 'Not Started';

  // The Azure gateway is eventually consistent right after write operations and intermittently
  // returns 400 (IBP_40_1027) for a valid request; poll the request until it reaches the expected status.
  const requestUntilStatus = async (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', requestUrl: string, data: any, expectedStatus: number, logLabel: string): Promise<any> => {
    let response: any;
    await expect.poll(async () => {
      response = await apiUtil.processAPIRequest(method, requestUrl, data, headers, logLabel, 'full');
      return response.status;
    }, { timeout: getTimeout('LONG'), intervals: [1000, 1000, 2000, 2000, 3000] }).toBe(expectedStatus);
    return response;
  };

  const getActionItemById = async (logLabel: string): Promise<any> => requestUntilStatus('GET', url + 'actionitem/' + actionitemId, '', 200, logLabel);

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    url = (process.env.API_BASE_URL as string) + (process.env.ACTIONITEM as string);
    deleteUrl = (process.env.API_BASE_URL as string) + (process.env.DELETE_ACTIONITEM as string);
    const accessToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: 'Bearer ' + accessToken,
    };
    const processResponse = await apiUtil.processAPIRequest(
      'GET',
      (process.env.API_BASE_URL as string) + (process.env.GET_PROCESS_WITH_NAME as string) + '/' + TestData.requestBody.processName + '/context?all=true',
      null,
      headers,
      'Fetching Process context for Action Item',
      'full'
    );
    processEntityId = processResponse.data?.actionItemEntityId;
    // Resolve entityId from the live process context so the request is not tied to a specific realm/machine
    TestData.requestBody.entityId = processEntityId;
    TestData.requestBody.name = 'Automation Action 3';
  });

  // Guarantees cleanup even if a test fails midway
  test.afterAll(async () => {
    if (!actionitemId) return;
    const response = await apiUtil.processAPIRequest(
      'DELETE',
      deleteUrl + actionitemId,
      '',
      headers,
      'Delete Created Action Item',
      'full'
    );
    const validation = await commonFunctions.compareTwoValues(response.status, 200, 'Delete Created Action Item Success Assertion');
    expect(validation).toBeTruthy();
  });

  test('Test Case 1: Create Action Item', async () => {
    const response = await requestUntilStatus(
      'POST',
      url + 'process/' + TestData.requestBody.processName + '/actionitem',
      TestData.requestBody,
      201,
      'Creating Action Item'
    );
    const validation1 = await commonFunctions.compareTwoValues(response.status, 201, 'Action Item Creation Success Assertion');
    const validation2 = await commonFunctions.compareTwoValues(response.data.sourceName, TestData.requestBody.sourceName, 'Action Item Source Name Assertion');
    actionitemId = response.data.id;
    entityId = response.data.entityId;
    // Capture the server-resolved sourceId; the static test-data value is stale and corrupts the item on update
    sourceId = response.data.sourceId;
    const validation3 = await commonFunctions.compareTwoValues(response.data.name, TestData.requestBody.name, 'Action Item Name Assertion');
    const validation4 = await commonFunctions.compareTwoValues(response.data.description, TestData.requestBody.description, 'Action Item Description Assertion');
    const validation6 = await commonFunctions.compareTwoValues(response.data.remarks, TestData.requestBody.remarks, 'Action Item Remarks Assertion');
    const validation7 = await commonFunctions.compareTwoValues(response.data.sourceType, TestData.requestBody.sourceType, 'Action Item Source Type Assertion');
    const validation8 = await commonFunctions.compareTwoValues(response.data.status, status, 'Action Item Status Assertion', true);
    const validation9 = await commonFunctions.compareTwoValues(response.data.actionType, 'Task', 'Action Item Action Type Assertion');
    const validation10 = await commonFunctions.compareTwoValues(response.data.priority, 'Low', 'Action Item Priority Assertion');
    expect(validation1 && validation2 && validation3 && validation4 && validation6 && validation7 && validation8 && validation9 && validation10).toBeTruthy();
  });

  test('Test Case 2: Get Action Item created', async () => {
    const response = await getActionItemById('Fetching Action Item');
    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Fetch Action Item Success Assertion');
    const validation2 = await commonFunctions.compareTwoValues(response.data.data[0].name, TestData.requestBody.name, 'Fetch Action Item name Success Assertion');
    const validation3 = await commonFunctions.compareTwoValues(response.data.data[0].id, actionitemId, 'Fetch Action Item id Success Assertion');
    const validation4 = await commonFunctions.compareTwoValues(response.data.data[0].description, TestData.requestBody.description, 'Fetch Action Item Description Assertion');
    const validation5 = await commonFunctions.compareTwoValues(response.data.data[0].remarks, TestData.requestBody.remarks, 'Fetch Action Item Remarks Assertion');
    const validation6 = await commonFunctions.compareTwoValues(response.data.data[0].sourceType, TestData.requestBody.sourceType, 'Fetch Action Item Source Type Assertion');
    const validation7 = await commonFunctions.compareTwoValues(response.data.data[0].status, status, 'Fetch Action Item Status Assertion', true);
    const validation8 = await commonFunctions.compareTwoValues(response.data.data[0].actionType, 'Task', 'Fetch Action Item Action Type Assertion');
    const validation9 = await commonFunctions.compareTwoValues(response.data.data[0].priority, 'Low', 'Fetch Action Item Priority Assertion');
    attributes = response.data.data[0].attributes;
    expect(
      validation1 && validation2 && validation3 && validation4 && validation5 &&
      validation6 && validation7 && validation8 && validation9
    ).toBeTruthy();
  });

  test('Test Case 3: Update Created Action Item', async () => {
    TestData.updateReqest['id'] = actionitemId;
    TestData.updateReqest.entityId = entityId;
    // Use the server-resolved sourceId from creation; the static test-data value is stale and corrupts the item on update
    TestData.updateReqest.sourceId = sourceId;
    TestData.updateReqest.attributes = attributes;
    TestData.updateReqest.name = 'Automation Action updated';
    const response = await requestUntilStatus(
      'PUT',
      url + 'process/' + TestData.requestBody.processName + '/actionitem/' + actionitemId,
      TestData.updateReqest,
      200,
      'Updating Action Item details'
    );
    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Action Item detail Update Success Assertion');
    const validation2 = await commonFunctions.compareTwoValues(response.data.name, TestData.updateReqest.name, 'Updated Action Item Name Assertion');
    const validation3 = await commonFunctions.compareTwoValues(response.data.description, TestData.updateReqest.description, 'Updated Action Item Description Assertion');
    const validation4 = await commonFunctions.compareTwoValues(response.data.remarks, TestData.updateReqest.remarks, 'Updated Action Item Remarks Assertion');
    const validation5 = await commonFunctions.compareTwoValues(response.data.priority, 'High', 'Updated Action Item Priority Assertion');
    expect(validation1 && validation2 && validation3 && validation4 && validation5).toBeTruthy();
  });

  test('Test Case 4: Get Updated Action Item Details', async () => {
    const response = await getActionItemById('Fetching Updated Action Item');
    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Fetch Action Item Success Assertion');
    const validation2 = await commonFunctions.compareTwoValues(response.data.data[0].name, TestData.updateReqest.name, 'Fetch Action Item name Success Assertion');
    const validation3 = await commonFunctions.compareTwoValues(response.data.data[0].id, actionitemId, 'Fetch Action Item id Success Assertion');
    const validation4 = await commonFunctions.compareTwoValues(response.data.data[0].description, TestData.updateReqest.description, 'Fetch Action Item Description Assertion');
    const validation5 = await commonFunctions.compareTwoValues(response.data.data[0].remarks, TestData.updateReqest.remarks, 'Fetch Action Item Remarks Assertion');
    const validation6 = await commonFunctions.compareTwoValues(response.data.data[0].sourceType, TestData.requestBody.sourceType, 'Fetch Action Item Source Type Assertion');
    const validation7 = await commonFunctions.compareTwoValues(response.data.data[0].status, status, 'Fetch Action Item Status Assertion', true);
    const validation8 = await commonFunctions.compareTwoValues(response.data.data[0].actionType, 'Task', 'Fetch Action Item Action Type Assertion');
    const validation9 = await commonFunctions.compareTwoValues(response.data.data[0].priority, 'High', 'Fetch Action Item Priority Assertion');
    expect(
      validation1 && validation2 && validation3 && validation4 && validation5 &&
      validation6 && validation7 && validation8 && validation9
    ).toBeTruthy();
  });

  test('Test Case 5: Update Process Action Item with status as null value and expect Invalid argument cases', async () => {
    TestData.updateReqest.attributes = attributes;
    TestData.updateReqest.status = null;
    // ApiUtil catches the error internally and returns a response-like object with status as string
    const response = await apiUtil.processAPIRequest(
      'PUT',
      deleteUrl + actionitemId,
      TestData.updateReqest,
      headers,
      'Updating Action Item with null status',
      'full'
    );
    expect(response).toBeDefined();
    expect(response.status).toBe('400');
    expect(response.data).toHaveProperty('message');
    expect(response.data.message).toBe('Invalid input provided.');
    const validation1 = await commonFunctions.compareTwoValues(response.status, '400', 'Action Item detail Update failed Assertion');
    const validation2 = await commonFunctions.compareTwoValues(response.data.message, 'Invalid input provided.', 'Action Item Invalid Status Assertion');
    expect(validation1 && validation2).toBeTruthy();
  });

  test('Test Case 6: Update Process Action Item with priority as null value and expect Invalid argument cases', async () => {
    TestData.updateReqest.attributes = attributes;
    TestData.updateReqest.priority = null;
    const response = await apiUtil.processAPIRequest(
      'PUT',
      deleteUrl + actionitemId,
      TestData.updateReqest,
      headers,
      'Updating Action Item with null priority',
      'full'
    );
    expect(response).toBeDefined();
    expect(response.status).toBe('400');
    expect(response.data).toHaveProperty('message');
    expect(response.data.message).toBe('Invalid input provided.');
    const validation1 = await commonFunctions.compareTwoValues(response.status, '400', 'Action Item detail Update failed Assertion');
    const validation2 = await commonFunctions.compareTwoValues(response.data.message, 'Invalid input provided.', 'Action Item Invalid Priority Assertion');
    expect(validation1 && validation2).toBeTruthy();
  });

  test('Test Case 7: Update Process Action Item with Action Type as null value and expect Invalid argument cases', async () => {
    TestData.updateReqest.attributes = attributes;
    TestData.updateReqest.actionType = null;
    const response = await apiUtil.processAPIRequest(
      'PUT',
      deleteUrl + actionitemId,
      TestData.updateReqest,
      headers,
      'Updating Action Item with null actionType',
      'full'
    );
    expect(response).toBeDefined();
    expect(response.status).toBe('400');
    expect(response.data).toHaveProperty('message');
    expect(response.data.message).toBe('Invalid input provided.');
    const validation1 = await commonFunctions.compareTwoValues(response.status, '400', 'Action Item detail Update failed Assertion');
    const validation2 = await commonFunctions.compareTwoValues(response.data.message, 'Invalid input provided.', 'Action Item Invalid Action Type Assertion');
    expect(validation1 && validation2).toBeTruthy();
  });
});

