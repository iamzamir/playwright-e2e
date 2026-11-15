import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';

const TestData = require('../../../testdata/' + process.env.PSENV + '/ProcessOrchestrationBackend/Calendar/Test_001_CalendarsCRUD.json');

test.describe.serial('Calendars CRUD operations', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let url: string;
  let headers: Record<string, string>;

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    url = (process.env.API_BASE_URL as string) + (process.env.CALENDAR as string);
    const accessToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: 'Bearer ' + accessToken,
    };
    TestData.requestBody.calendarName = 'Calendar Name ' + Date.now();
  });

  test.afterAll(async () => {
    if (!apiUtil || !headers || !TestData?.requestBody?.calendarName) {
      return;
    }
    const calendarName = TestData.requestBody.calendarName;
    const response = await apiUtil.processAPIRequest(
      'DELETE',
      `${url}/${calendarName}`,
      '',
      headers,
      'afterAll cleanup - delete calendar',
      'full'
    );
    const cleaned = commonFunctions.isStatus(response.status, 200) || commonFunctions.isStatus(response.status, 404);
    if (!cleaned) {
      await commonFunctions.logMessage(
        'WARN',
        `afterAll cleanup for calendar ${calendarName} returned status: ${response.status}`
      );
    }
  });

  test('Test Case 1: Create Calendar', async () => {
    const response = await apiUtil.processAPIRequest(
      'POST',
      url,
      TestData.requestBody,
      headers,
      'Creating Calendars',
      'full'
    );
    const validation = await commonFunctions.compareTwoValues(response.status, 201, 'Calendar Creation Success Assertion');
    expect(validation).toBeTruthy();
  });

  test('Test Case 2: Get Created Calendar', async () => {
    const response = await apiUtil.processAPIRequest(
      'GET',
      url + '/' + TestData.requestBody.calendarName,
      '',
      headers,
      'Fetching Calendar',
      'full'
    );
    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Fetch Created Calendar Success Assertion');
    const validation2 = await commonFunctions.compareTwoValues(response.data.name, TestData.requestBody.calendarName, 'Fetch Created Calendar Name Assertion');
    expect(validation1 && validation2).toBeTruthy();
  });

  test('Test Case 3: Update Created Calendar', async () => {
    TestData.requestBody.description = TestData.CycleDescriptionUpdate;
    const response = await apiUtil.processAPIRequest(
      'PUT',
      url + '/' + TestData.requestBody.calendarName,
      TestData.requestBody,
      headers,
      'Updating Calendar Description',
      'full'
    );
    const validation = await commonFunctions.compareTwoValues(response.status, 200, 'Calendar Description Update Success Assertion');
    expect(validation).toBeTruthy();
  });

  test('Test Case 4: Get Updated Created Calendar Details', async () => {
    const response = await apiUtil.processAPIRequest(
      'GET',
      url + '/' + TestData.requestBody.calendarName,
      '',
      headers,
      'Fetching Calendar',
      'full'
    );
    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Fetch Created Calendar Success Assertion');
    const validation2 = await commonFunctions.compareTwoValues(response.data.description, TestData.CycleDescriptionUpdate, 'Fetch Created Calendar Description Update Success Assertion');
    expect(validation1 && validation2).toBeTruthy();
  });

  test('Test Case 5: Delete Created Calendar', async () => {
    const response = await apiUtil.processAPIRequest(
      'DELETE',
      url + '/' + TestData.requestBody.calendarName,
      '',
      headers,
      'Delete Created Calendar',
      'full'
    );
    const validation = await commonFunctions.compareTwoValues(response.status, 200, 'Delete Created Calendar Success Assertion');
    expect(validation).toBeTruthy();
  });

  test('Test Case 6: Get Deleted Calendar', async () => {
    const response = await apiUtil.processAPIRequest(
      'GET',
      url + '/' + TestData.requestBody.calendarName,
      '',
      headers,
      'Fetching Deleted Calendar',
      'full'
    );
    const validation = await commonFunctions.compareTwoValues(response.status, '404', 'Fetch Deleted Calendar Not Found Assertion');
    expect(validation).toBeTruthy();
  });

  test('Test Case 7: Create Calendar with Missing Required Fields', async () => {
    const invalidRequest = { ...TestData.requestBody };
    delete invalidRequest.calendarName;
    const response = await apiUtil.processAPIRequest(
      'POST',
      url,
      invalidRequest,
      headers,
      'Creating Calendar With Missing Fields',
      'full'
    );
    const validation = await commonFunctions.compareTwoValues(response.status, '400', 'Calendar Creation Missing Fields Bad Request Assertion');
    expect(validation).toBeTruthy();
  });

  test('Test Case 8: Duplicate Calendar Creation', async () => {
    TestData.requestBody.calendarName = 'Duplicate Calendar Test';
    const response1 = await apiUtil.processAPIRequest(
      'POST',
      url,
      TestData.requestBody,
      headers,
      'Creating Calendar For Duplicate Test',
      'full'
    );
    const validation1 = await commonFunctions.compareTwoValues(response1.status, 201, 'Duplicate Calendar Creation Success Assertion');

    const response2 = await apiUtil.processAPIRequest(
      'POST',
      url,
      TestData.requestBody,
      headers,
      'Creating Duplicate Calendar',
      'full'
    );
    const validation2 = await commonFunctions.compareTwoValues(response2.status, '409', 'Duplicate Calendar Conflict Assertion');

    const response3 = await apiUtil.processAPIRequest(
      'DELETE',
      url + '/' + TestData.requestBody.calendarName,
      '',
      headers,
      'Cleanup Duplicate Calendar',
      'full'
    );
    const validation3 = await commonFunctions.compareTwoValues(response3.status, 200, 'Delete Created Calendar Success Assertion');
    expect(validation1 && validation2 && validation3).toBeTruthy();
  });

  test('Test Case 9: Unauthorized Calendar Operation', async () => {
    const invalidHeaders = {
      accept: 'application/json',
      Authorization: 'Bearer invalidtoken',
    };
    const response = await apiUtil.processAPIRequest(
      'POST',
      url,
      TestData.requestBody,
      invalidHeaders,
      'Unauthorized Calendar Creation',
      'full'
    );
    const validation = await commonFunctions.compareTwoValues(response.status, '401', 'Unauthorized Calendar Creation Assertion');
    expect(validation).toBeTruthy();
  });

  test('Test Case 10: Create Calendar With Invalid Date Range', async () => {
    TestData.requestBody.calendarName = 'Calendar with Invalid Date Range';
    const invalidRequest = { ...TestData.requestBody };
    invalidRequest.cycles = [
      {
        cycleName: 'Invalid Cycle',
        description: 'End date before start date',
        startDate: '2024-02-22T06:57:33.967Z',
        endDate: '2024-01-22T06:57:33.967Z',
      },
    ];
    const response1 = await apiUtil.processAPIRequest(
      'POST',
      url,
      invalidRequest,
      headers,
      'Creating Calendar With Invalid Date Range',
      'full'
    );
    const validation1 = await commonFunctions.compareTwoValues(response1.status, '500', 'Calendar Creation Invalid Date Range Bad Request Assertion');

    const response2 = await apiUtil.processAPIRequest(
      'DELETE',
      url + '/' + TestData.requestBody.calendarName,
      '',
      headers,
      'Cleanup Calendar with Invalid Date Range',
      'full'
    );
    const validation2 = await commonFunctions.compareTwoValues(response2.status, 200, 'Delete Created Calendar Success Assertion');
    expect(validation1 && validation2).toBeTruthy();
  });

  test('Test Case 11: Update Non-Existent Calendar', async () => {
    const nonExistentCalendar = { ...TestData.requestBody, calendarName: 'NonExistentCalendar' };
    const response = await apiUtil.processAPIRequest(
      'PUT',
      url + '/NonExistentCalendar',
      nonExistentCalendar,
      headers,
      'Updating Non-Existent Calendar',
      'full'
    );
    const validation = await commonFunctions.compareTwoValues(response.status, '404', 'Update Non-Existent Calendar Not Found Assertion');
    expect(validation).toBeTruthy();
  });

  test('Test Case 12: Delete Non-Existent Calendar', async () => {
    const response = await apiUtil.processAPIRequest(
      'DELETE',
      url + '/NonExistentCalendar',
      '',
      headers,
      'Delete Non-Existent Calendar',
      'full'
    );
    const validation = await commonFunctions.compareTwoValues(response.status, '404', 'Delete Non-Existent Calendar Not Found Assertion');
    expect(validation).toBeTruthy();
  });

  test('Test Case 13: Get Calendar With Invalid Name Format', async () => {
    const response = await apiUtil.processAPIRequest(
      'GET',
      url + '/!@#$%^&*',
      '',
      headers,
      'Fetching Calendar With Invalid Name',
      'full'
    );
    const validation = await commonFunctions.compareTwoValues(response.status, '404', 'Fetch Calendar With Invalid Name Bad Request Assertion');
    expect(validation).toBeTruthy();
  });

  test('Test Case 14: Create Calendar With Duplicate Cycle Names', async () => {
    TestData.requestBody.calendarName = 'Duplicate Cycle Names Calendar';
    const invalidRequest = { ...TestData.requestBody };
    invalidRequest.cycles = [
      {
        cycleName: 'DuplicateCycle',
        description: 'Cycle 1',
        startDate: '2024-01-22T06:57:33.967Z',
        endDate: '2024-02-22T06:57:33.967Z',
      },
      {
        cycleName: 'DuplicateCycle',
        description: 'Cycle 2',
        startDate: '2024-03-22T06:57:33.967Z',
        endDate: '2024-04-22T06:57:33.967Z',
      },
    ];
    const response1 = await apiUtil.processAPIRequest(
      'POST',
      url,
      invalidRequest,
      headers,
      'Creating Calendar With Duplicate Cycle Names',
      'full'
    );
    const validation1 = await commonFunctions.compareTwoValues(response1.status, '500', 'Calendar Creation Duplicate Cycle Names Bad Request Assertion');

    const response2 = await apiUtil.processAPIRequest(
      'DELETE',
      url + '/' + TestData.requestBody.calendarName,
      '',
      headers,
      'Cleanup Duplicate Calendar',
      'full'
    );
    const validation2 = await commonFunctions.compareTwoValues(response2.status, 200, 'Delete Created Calendar Success Assertion');
    expect(validation1 && validation2).toBeTruthy();
  });

  test('Test Case 15: Access Calendar API Without Authorization Header', async () => {
    const response = await apiUtil.processAPIRequest(
      'POST',
      url,
      TestData.requestBody,
      { accept: 'application/json' },
      'Creating Calendar Without Auth',
      'full'
    );
    const validation = await commonFunctions.compareTwoValues(response.status, '401', 'Calendar Creation Without Auth Unauthorized Assertion');
    expect(validation).toBeTruthy();
  });
});

