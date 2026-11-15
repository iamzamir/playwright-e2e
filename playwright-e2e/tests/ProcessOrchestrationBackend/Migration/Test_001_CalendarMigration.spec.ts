import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';

const TestData = require('../../../testdata/' + process.env.PSENV + '/ProcessOrchestrationBackend/Migration/Test_001_CalendarMigration.json');

const expectedCycles: string[] = TestData.PAYLOAD.cycles.map((cycle: any) => cycle.cycleName);
const calendarName = `${TestData.PAYLOAD.calendarName} ${Date.now()}`;
const calendarPayload = { ...TestData.PAYLOAD, calendarName };
const cycleToAdd = TestData.UPDATE_CYCLE_PAYLOAD;

const sourceRealm = process.env.REALM_NAME_SOURCE || '';
const targetRealm = process.env.REALM_NAME_TARGET || '';
const isGraviteeGateway = (process.env.GATEWAY_TYPE || 'AZURE').toUpperCase() === 'GRAVITEE';
const sourceRealmTitle = isGraviteeGateway
  ? (process.env.REALM_KEY_SOURCE || process.env.REALM_KEY || sourceRealm)
  : sourceRealm;
const targetRealmTitle = isGraviteeGateway
  ? (process.env.REALM_KEY_TARGET || process.env.REALM_KEY || targetRealm)
  : targetRealm;
const sourceRealmId = process.env.REALM_ID_SOURCE || '';
const targetRealmId = process.env.REALM_ID_TARGET || '';
const sourceMachineClientId = process.env.REALM_CLIENT_ID_SOURCE || '';
const targetMachineClientId = process.env.REALM_CLIENT_ID_TARGET || '';
const sourceMachineClientSecret = process.env.REALM_CLIENT_SECRET_SOURCE || '';
const targetMachineClientSecret = process.env.REALM_CLIENT_SECRET_TARGET || '';
const sourceAuthUrl = process.env.AUTH_URL_SOURCE || '';
const targetAuthUrl = process.env.AUTH_URL_TARGET || '';

test.describe.serial('calendar migration', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
  let headersForTarget: Record<string, string>;
  let dataToImportInTarget: any;
  let expectedCyclesAfterUpdate: string[];

  const sourceBaseUrl = process.env.API_BASE_URL_SOURCE as string;
  const targetBaseUrl = process.env.API_BASE_URL_TARGET as string;
  const calendarPath = process.env.CALENDAR as string;
  const sourceExportUrl = sourceBaseUrl + (process.env.EXPORT_DATA as string);
  const targetImportUrl = targetBaseUrl + (process.env.IMPORT_DATA as string);

  function getCalendarUrl(baseUrl: string): string {
    return baseUrl + calendarPath;
  }

  function getCycleUrl(baseUrl: string, calendarName: string): string {
    return baseUrl + (process.env.ADD_CALENDAR_CYCLE as string).replace('{calendarName}', calendarName);
  }

  function getDeleteCalendarUrl(baseUrl: string, calendarName: string): string {
    return baseUrl + (process.env.DELETE_CALENDAR as string).replace('{calendarName}', calendarName);
  }

  async function validateCyclesFromResponse(cyclesGetResponse: any, cyclesToValidate: string[], validationPrefix: string) {
    const statusValidation = await commonFunctions.compareTwoValues(cyclesGetResponse.status, 200, `${validationPrefix} - Get calendar cycles status assertion`);

    const actualCycles = Array.isArray(cyclesGetResponse.data?.data)
      ? cyclesGetResponse.data.data.map((cycle: any) => cycle.name || cycle.cycleName)
      : [];

    const lengthValidation = await commonFunctions.compareTwoValues(actualCycles.length >= cyclesToValidate.length, true, `${validationPrefix} - Calendar cycles minimum count assertion`);

    let cycleNameValidation = true;
    for (const cycleName of cyclesToValidate) {
      const containsCycle = actualCycles.includes(cycleName);
      if (!containsCycle) {
        await commonFunctions.logMessage('FAIL', `${validationPrefix} - Calendar cycle name assertion failed. Missing cycle: ${cycleName}`);
      }
      expect.soft(containsCycle, `${validationPrefix} - Calendar cycle name assertion for ${cycleName}`).toBeTruthy();
      cycleNameValidation = cycleNameValidation && containsCycle;
    }

    expect(statusValidation && lengthValidation && cycleNameValidation).toBeTruthy();
  }

  async function getCalendarStatus(baseUrl: string, calendarName: string, requestHeaders: Record<string, string>) {
    return apiUtil.processAPIRequest('GET', getCalendarUrl(baseUrl) + '/' + calendarName, null, requestHeaders, 'Get calendar API', 'status');
  }

  async function getCalendarCycles(baseUrl: string, calendarName: string, requestHeaders: Record<string, string>) {
    const cycleUrl = getCycleUrl(baseUrl, calendarName);
    return apiUtil.processAPIRequest('GET', cycleUrl + '?pageNumber=0&pageSize=100', null, requestHeaders, 'Get calendar cycles', 'full');
  }

  async function cleanupCalendar(baseUrl: string, requestHeaders: Record<string, string>, realmLabel: string): Promise<boolean> {
    const calendarStatus = await getCalendarStatus(baseUrl, calendarName, requestHeaders);
    if (commonFunctions.isStatus(calendarStatus, 404)) {
      await commonFunctions.logMessage('INFO', `${realmLabel} calendar '${calendarName}' is already absent`);
      return true;
    }
    if (!commonFunctions.isStatus(calendarStatus, 200)) {
      await commonFunctions.logMessage('WARN', `${realmLabel} calendar lookup returned unexpected status ${calendarStatus}`);
      return false;
    }

    const deleteStatus = await apiUtil.processAPIRequest('DELETE', getDeleteCalendarUrl(baseUrl, calendarName), null, requestHeaders, `Delete calendar in ${realmLabel}`, 'status');
    const deleted = commonFunctions.isStatus(deleteStatus, 200);
    if (!deleted) {
      await commonFunctions.logMessage('WARN', `${realmLabel} calendar cleanup returned status ${deleteStatus}`);
    }
    return deleted;
  }

  async function verifyCalendar(baseUrl: string, calendarName: string, requestHeaders: Record<string, string>, cyclesToValidate: string[], validationPrefix: string) {
    const calendarStatus = await getCalendarStatus(baseUrl, calendarName, requestHeaders);
    const calendarStatusValidation = await commonFunctions.compareTwoValues(calendarStatus, 200, `${validationPrefix} - Get calendar status assertion`);

    const cyclesGetResponse = await getCalendarCycles(baseUrl, calendarName, requestHeaders);
    await validateCyclesFromResponse(cyclesGetResponse, cyclesToValidate, validationPrefix);
    expect(calendarStatusValidation).toBeTruthy();
  }

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    headers = await apiUtil.buildAuthHeaders(sourceMachineClientId, sourceMachineClientSecret, sourceRealmId, sourceAuthUrl);
    headersForTarget = await apiUtil.buildAuthHeaders(targetMachineClientId, targetMachineClientSecret, targetRealmId, targetAuthUrl);
    expectedCyclesAfterUpdate = [...expectedCycles, cycleToAdd.cycleName];
  });

  test.afterAll(async () => {
    if (!headers || !headersForTarget) {
      return;
    }
    await commonFunctions.logMessage('INFO', 'Running calendar cleanup in source and target realms');
    const cleanupResults = await Promise.allSettled([
      cleanupCalendar(sourceBaseUrl, headers, 'source realm'),
      cleanupCalendar(targetBaseUrl, headersForTarget, 'target realm')
    ]);

    let cleanupSuccessful = true;
    for (const [index, result] of cleanupResults.entries()) {
      const realmLabel = index === 0 ? 'source realm' : 'target realm';
      if (result.status === 'rejected') {
        const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
        await commonFunctions.logMessage('ERROR', `${realmLabel} calendar cleanup failed: ${message}`);
        cleanupSuccessful = false;
      } else {
        cleanupSuccessful = cleanupSuccessful && result.value;
      }
    }
    expect(cleanupSuccessful, 'Calendar cleanup should succeed in source and target realms').toBeTruthy();
  });

  test(`Test Case 1: Create calendar data from source realm ${sourceRealmTitle}`, async () => {
    const createCalendarStatus = await apiUtil.processAPIRequest('POST', getCalendarUrl(sourceBaseUrl), calendarPayload, headers, 'Create calendar API', 'status');
    const validation = await commonFunctions.compareTwoValues(createCalendarStatus, 201, 'Create calendar status assertion');
    expect(validation).toBeTruthy();
  });

  test(`Test Case 2: verify calendar data via API in source realm ${sourceRealmTitle}`, async () => {
    await verifyCalendar(sourceBaseUrl, calendarName, headers, expectedCycles, 'Verify source calendar data');
  });

  test(`Test Case 3: Export calendar data from source realm ${sourceRealmTitle}`, async () => {
    const exportDataPayload = { calendars: [calendarName] };
    const exportCalendarResponse = await apiUtil.processAPIRequest('POST', sourceExportUrl, exportDataPayload, headers, 'Export calendar', 'full');
    const validation = await commonFunctions.compareTwoValues(exportCalendarResponse.status, 200, 'Export calendar status assertion in source realm');
    dataToImportInTarget = exportCalendarResponse.data;
    expect(validation).toBeTruthy();
  });

  test(`Test Case 4: Import calendar data to target realm ${targetRealmTitle}`, async () => {
    const importCalendarResponse = await apiUtil.processAPIRequest('POST', targetImportUrl, dataToImportInTarget, headersForTarget, 'Import calendar', 'full');
    const validation1 = await commonFunctions.compareTwoValues(importCalendarResponse.status, 200, 'Import calendar status assertion in target realm');
    const validation2 = await commonFunctions.compareTwoValues(importCalendarResponse.data.calendars[0], calendarName, 'Import calendar name assertion in target realm');
    expect(validation1 && validation2).toBeTruthy();
  });

  test(`Test Case 5: verify calendar data via API in target realm ${targetRealmTitle}`, async () => {
    await verifyCalendar(targetBaseUrl, calendarName, headersForTarget, expectedCycles, 'Verify target calendar data');
  });

  test(`Test Case 6: update calendar cycle data from source realm ${sourceRealmTitle}`, async () => {
    const createCalendarStatus = await apiUtil.processAPIRequest('POST', getCycleUrl(sourceBaseUrl, calendarName), cycleToAdd, headers, 'add calendar cycle', 'status');
    const validation = await commonFunctions.compareTwoValues(createCalendarStatus, 201, 'Add calendar cycle status assertion in source realm');
    expect(validation).toBeTruthy();
  });

  test(`Test Case 7: verify updated calendar data via API in source realm ${sourceRealmTitle}`, async () => {
    await verifyCalendar(sourceBaseUrl, calendarName, headers, expectedCyclesAfterUpdate, 'Verify updated source calendar data');
  });

  test(`Test Case 8: Export calendar data from source realm ${sourceRealmTitle}`, async () => {
    const exportDataPayload = { calendars: [calendarName] };
    const exportCalendarResponse = await apiUtil.processAPIRequest('POST', sourceExportUrl, exportDataPayload, headers, 'Export calendar', 'full');
    const validation = await commonFunctions.compareTwoValues(exportCalendarResponse.status, 200, 'Export updated calendar status assertion in source realm');
    dataToImportInTarget = exportCalendarResponse.data;
    expect(validation).toBeTruthy();
  });

  test(`Test Case 9: Import calendar data to target realm ${targetRealmTitle}`, async () => {
    const importCalendarResponse = await apiUtil.processAPIRequest('POST', targetImportUrl, dataToImportInTarget, headersForTarget, 'Import calendar', 'full');
    const validation1 = await commonFunctions.compareTwoValues(importCalendarResponse.status, 200, 'Import updated calendar status assertion in target realm');
    const validation2 = await commonFunctions.compareTwoValues(importCalendarResponse.data.calendars[0], calendarName, 'Import updated calendar name assertion in target realm');
    expect(validation1 && validation2).toBeTruthy();
  });

  test(`Test Case 10: verify updated calendar data via API in target realm ${targetRealmTitle}`, async () => {
    await verifyCalendar(targetBaseUrl, calendarName, headersForTarget, expectedCyclesAfterUpdate, 'Verify updated target calendar data');
  });

});

