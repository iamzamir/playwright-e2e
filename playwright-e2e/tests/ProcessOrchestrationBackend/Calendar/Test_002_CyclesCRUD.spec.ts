import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';

const TestData = require('../../../testdata/' + process.env.PSENV + '/ProcessOrchestrationBackend/Calendar/Test_002_CyclesCRUD.json');

test.describe.serial('Calendar Cycles CRUD operations', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let url: string;
  let headers: Record<string, string>;
  let calendarName: string;

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    url = (process.env.API_BASE_URL as string) + (process.env.CALENDAR as string);
    const accessToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: 'Bearer ' + accessToken,
    };

    const baseCalendarName = TestData.requestBody.calendarName || 'Monthly Calendar Sample';
    calendarName = uniqueName(baseCalendarName, 100);
    TestData.requestBody.calendarName = calendarName;
    TestData.requestBody.description = calendarName;
  });

  test.afterAll(async () => {
    if (!apiUtil || !headers || !calendarName) {
      return;
    }

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
      await commonFunctions.logMessage('WARNING', `afterAll cleanup could not delete calendar ${calendarName}. Status: ${response.status}`);
    }
  });

  test('Test Case 1: Create Calendar to create a calendar cycle', async () => {
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

  test('Test Case 2: Get Created Calendar to validate whether the calendar is created', async () => {
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

  test('Test Case 3: Create a cycle in calendar', async () => {
    const response = await apiUtil.processAPIRequest(
      'POST',
      url + `/${TestData.requestBody.calendarName}/cycle`,
      TestData.requestBody.Cycle,
      headers,
      'Creating Cycle in Calendar',
      'full'
    );
    const validation1 = await commonFunctions.compareTwoValues(response.status, 201, 'Create Calendar Cycle Success Assertion');
    expect(validation1).toBeTruthy();
  });

  test('Test Case 4: Get created calendar cycle', async () => {
    const response = await apiUtil.processAPIRequest(
      'GET',
      url + `/${TestData.requestBody.calendarName}/cycle/${TestData.requestBody.Cycle.cycleName}`,
      '',
      headers,
      'Fetching Cycle in Calendar',
      'full'
    );
    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Fetch Created Calendar Cycle Success Assertion');
    const validation2 = await commonFunctions.compareTwoValues(response.data.name, TestData.requestBody.Cycle.cycleName, 'Fetch Created Calendar Cycle Name Assertion');
    expect(validation1 && validation2).toBeTruthy();
  });

  test('Test Case 5: Update existing Calendar Cycle', async () => {
    const response = await apiUtil.processAPIRequest(
      'PUT',
      url + `/${TestData.requestBody.calendarName}/cycle/${TestData.requestBody.Cycle.cycleName}`,
      TestData.requestBody.UpdateCycle,
      headers,
      'Updating Calendar Description',
      'full'
    );
    const validation = await commonFunctions.compareTwoValues(response.status, 200, 'Calendar Cycle Update Success Assertion');
    expect(validation).toBeTruthy();
  });

  test('Test Case 6: Get updated Calendar Cycle and validate', async () => {
    const response = await apiUtil.processAPIRequest(
      'GET',
      url + `/${TestData.requestBody.calendarName}/cycle/${TestData.requestBody.Cycle.cycleName}`,
      '',
      headers,
      'Fetching Updated Cycle in Calendar',
      'full'
    );
    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Fetch Updated Calendar Cycle Success Assertion');
    const validation2 = await commonFunctions.compareTwoValues(response.data.name, TestData.requestBody.UpdateCycle.cycleName, 'Fetch Updated Calendar Cycle Name Assertion');
    expect(validation1 && validation2).toBeTruthy();
  });

  test('Test Case 7: Delete Created Calendar Cycle', async () => {
    const response = await apiUtil.processAPIRequest(
      'DELETE',
      url + `/${TestData.requestBody.calendarName}/cycle/${TestData.requestBody.Cycle.cycleName}`,
      '',
      headers,
      'Delete Created Calendar Cycle',
      'full'
    );
    const validation = await commonFunctions.compareTwoValues(response.status, 200, 'Delete Created Calendar Cycle Success Assertion');
    expect(validation).toBeTruthy();
  });

  test('Test Case 8: Create Cycle With End Date Before Start Date', async () => {
    const invalidCycle = {
      ...TestData.requestBody.Cycle,
      cycleName: 'Invalid Date Cycle',
      startDate: '2024-05-01T00:00:00.000Z',
      endDate: '2024-04-01T00:00:00.000Z',
    };
    const response = await apiUtil.processAPIRequest(
      'POST',
      url + `/${TestData.requestBody.calendarName}/cycle`,
      invalidCycle,
      headers,
      'Creating Cycle With Invalid Date Range',
      'full'
    );
    const validation = await commonFunctions.compareTwoValues(response.status, '400', 'Create Cycle Invalid Date Range Bad Request Assertion');
    expect(validation).toBeTruthy();
  });

  test('Test Case 9: Create Duplicate Cycle Name', async () => {
    const cycle = {
      ...TestData.requestBody.Cycle,
      cycleName: 'DuplicateCycle',
    };
    const response1 = await apiUtil.processAPIRequest(
      'POST',
      url + `/${TestData.requestBody.calendarName}/cycle`,
      cycle,
      headers,
      'Creating Cycle For Duplicate Test',
      'full'
    );
    const validation1 = await commonFunctions.compareTwoValues(response1.status, 201, 'Duplicate Cycle Creation Assertion');

    const response2 = await apiUtil.processAPIRequest(
      'POST',
      url + `/${TestData.requestBody.calendarName}/cycle`,
      cycle,
      headers,
      'Creating Duplicate Cycle',
      'full'
    );
    const validation2 = await commonFunctions.compareTwoValues(response2.status, '400', 'Duplicate Cycle Conflict Assertion');

    const response3 = await apiUtil.processAPIRequest(
      'DELETE',
      url + `/${TestData.requestBody.calendarName}/cycle/${cycle.cycleName}`,
      '',
      headers,
      'Cleanup Duplicate Cycle',
      'full'
    );
    const validation3 = await commonFunctions.compareTwoValues(response3.status, 200, 'Cleanup Duplicate Cycle Assertion');
    expect(validation1 && validation2 && validation3).toBeTruthy();
  });

  test('Test Case 10: Update Non-Existent Cycle', async () => {
    const response = await apiUtil.processAPIRequest(
      'PUT',
      url + `/${TestData.requestBody.calendarName}/cycle/NonExistentCycle`,
      TestData.requestBody.UpdateCycle,
      headers,
      'Updating Non-Existent Cycle',
      'full'
    );
    const validation = await commonFunctions.compareTwoValues(response.status, '404', 'Update Non-Existent Cycle Not Found Assertion');
    expect(validation).toBeTruthy();
  });

  test('Test Case 11: Delete Non-Existent Cycle', async () => {
    const response = await apiUtil.processAPIRequest(
      'DELETE',
      url + `/${TestData.requestBody.calendarName}/cycle/NonExistentCycle`,
      '',
      headers,
      'Delete Non-Existent Cycle',
      'full'
    );
    const validation = await commonFunctions.compareTwoValues(response.status, '404', 'Delete Non-Existent Cycle Not Found Assertion');
    expect(validation).toBeTruthy();
  });

  test('Test Case 12: Create Cycle With Missing Required Fields', async () => {
    const invalidCycle = { ...TestData.requestBody.Cycle };
    delete invalidCycle.cycleName;
    const response = await apiUtil.processAPIRequest(
      'POST',
      url + `/${TestData.requestBody.calendarName}/cycle`,
      invalidCycle,
      headers,
      'Creating Cycle With Missing Fields',
      'full'
    );
    const validation = await commonFunctions.compareTwoValues(response.status, '400', 'Create Cycle Missing Fields Bad Request Assertion');
    expect(validation).toBeTruthy();
  });

  test('Test Case 13: Unauthorized Cycle Operation', async () => {
    const invalidHeaders = {
      accept: 'application/json',
      Authorization: 'Bearer invalidtoken',
    };
    const response = await apiUtil.processAPIRequest(
      'POST',
      url + `/${TestData.requestBody.calendarName}/cycle`,
      TestData.requestBody.Cycle,
      invalidHeaders,
      'Unauthorized Cycle Creation',
      'full'
    );
    const validation = await commonFunctions.compareTwoValues(response.status, '401', 'Unauthorized Cycle Creation Assertion');
    expect(validation).toBeTruthy();
  });

  test('Test Case 14: Delete Created Calendar', async () => {
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

  test('Test Case 15: Get Deleted Calendar Cycle', async () => {
    const response = await apiUtil.processAPIRequest(
      'GET',
      url + `/${TestData.requestBody.calendarName}/cycle/${TestData.requestBody.Cycle.cycleName}`,
      '',
      headers,
      'Fetching Deleted Calendar Cycle',
      'full'
    );
    const validation = await commonFunctions.compareTwoValues(response.status, '404', 'Fetch Deleted Calendar Cycle Not Found Assertion');
    expect(validation).toBeTruthy();
  });
});

