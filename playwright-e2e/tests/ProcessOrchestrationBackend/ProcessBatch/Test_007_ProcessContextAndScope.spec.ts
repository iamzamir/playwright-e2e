import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { ActionItemApiHelper, processOrchestrationUrl, uniqueRunId } from '../../../util/action-item.util';
import { getFirstCalendarCycle } from '../../../util/calendar-cycle.util';
import { createProcessFromTemplate, deleteProcessWithReferences } from '../../../util/process-fixture.util';

const psEnv = process.env.PSENV ?? 'INTEROP';
const TestData = require('../../../testdata/' + psEnv + '/ProcessOrchestrationBackend/ProcessBatch/Test_007_ProcessContextAndScope.json');

const dedicatedProcess = `${TestData.PROCESS_NAME_PREFIX}${uniqueRunId()}`;

// Mirrors DateUtil.computeHorizon: the window is anchored on the cycle start date.
function horizonWindow(cycleStartDate: string, pastDays: number, futureDays: number): { start: string; end: string } {
  const anchor = Date.parse(`${String(cycleStartDate).slice(0, 10)}T00:00:00Z`);
  const day = 24 * 60 * 60 * 1000;
  return { start: new Date(anchor - pastDays * day).toISOString().slice(0, 10), end: new Date(anchor + futureDays * day).toISOString().slice(0, 10) };
}

test.describe.serial('Process context and scope (PO-04, PO-05, PO-06)', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let helper: ActionItemApiHelper;
  let headers: Record<string, string>;
  let processCreated = false;

  const processUrl = (name: string): string => processOrchestrationUrl(`process/${encodeURIComponent(name)}`);
  const contextUrl = (name: string, query = ''): string => `${processUrl(name)}/context${query}`;
  const scopeUrl = (name: string): string => `${processUrl(name)}/scope`;
  const getScope = async (name: string, label: string): Promise<any> => helper.sendUntilStatus('GET', scopeUrl(name), null, 200, label);
  const putScope = async (body: any, label: string): Promise<any> => helper.write('PUT', scopeUrl(dedicatedProcess), body, 200, label, { idempotent: true });

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    headers = { accept: 'application/json', Authorization: 'Bearer ' + await apiUtil.getBearerToken() };
    helper = new ActionItemApiHelper(apiUtil, headers);
    const cycleName = await getFirstCalendarCycle(apiUtil, process.env.API_BASE_URL as string, headers, TestData.CALENDAR_NAME);
    const created = await createProcessFromTemplate(apiUtil, headers, { processName: dedicatedProcess, templateName: TestData.TEMPLATE_NAME, calendarName: TestData.CALENDAR_NAME, cycleName, description: TestData.DESCRIPTION });
    processCreated = created.status === 201;
    expect(created.status, `Create dedicated process ${dedicatedProcess}: ${JSON.stringify(created.data)}`).toBe(201);
  });

  test.afterAll(async () => {
    if (processCreated) {
      expect(await deleteProcessWithReferences(apiUtil, commonFunctions, headers, dedicatedProcess)).toBeTruthy();
    }
  });

  test('Test Case 1: PO-04-P01 context with all=true returns the full process plus its scope', async () => {
    const started = Date.now();
    const response = await helper.sendUntilStatus('GET', contextUrl(TestData.SEEDED_PROCESS_NAME, '?all=true'), null, 200, 'PO-04-P01 context all=true');
    test.info().annotations.push({ type: 'timing', description: `PO-04-E02 context all=true answered in ${Date.now() - started} ms` });
    const body = response.data ?? {};
    const missing = ['id', 'displayName', 'calendarName', 'cycleName', ...TestData.ALL_ONLY_KEYS].filter((key) => body[key] === undefined || body[key] === null);
    const bValidation1 = await commonFunctions.compareTwoValues(body.name, TestData.SEEDED_PROCESS_NAME, 'PO-04-P01 - name');
    const bValidation2 = await commonFunctions.compareTwoValues(typeof body.scope === 'object' && body.scope !== null && !Array.isArray(body.scope), true, 'PO-04-P01 - scope is an object');
    const bValidation3 = await commonFunctions.compareTwoValues(JSON.stringify(missing), '[]', 'PO-04-P01 - full process keys are present');
    const bValidation4 = await commonFunctions.compareTwoValues(/^\d{4}-\d{2}-\d{2}$/.test(body.processStartDate) && /^\d{4}-\d{2}-\d{2}$/.test(body.processEndDate), true, 'PO-04-P01 - processStartDate and processEndDate are dates');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test('Test Case 2: PO-04-P02 context without all returns only the summary keys plus scope and horizon dates', async () => {
    const response = await helper.sendUntilStatus('GET', contextUrl(TestData.SEEDED_PROCESS_NAME), null, 200, 'PO-04-P02 context summary');
    const expectedKeys = [...TestData.SUMMARY_KEYS, 'scope', 'processStartDate', 'processEndDate'].sort();
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(Object.keys(response.data ?? {}).sort()), JSON.stringify(expectedKeys), 'PO-04-P02 - summary key set');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.name, TestData.SEEDED_PROCESS_NAME, 'PO-04-P02 - name');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 3: PO-04-P03 all=false is identical to the summary', async () => {
    const summary = await helper.sendUntilStatus('GET', contextUrl(TestData.SEEDED_PROCESS_NAME), null, 200, 'PO-04-P03 context summary');
    const allFalse = await helper.sendUntilStatus('GET', contextUrl(TestData.SEEDED_PROCESS_NAME, '?all=false'), null, 200, 'PO-04-P03 context all=false');
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(allFalse.data, Object.keys(allFalse.data ?? {}).sort()), JSON.stringify(summary.data, Object.keys(summary.data ?? {}).sort()), 'PO-04-P03 - all=false equals the summary');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 4: PO-04-P04 all=true agrees with GET /process and GET /scope', async () => {
    const context = await helper.sendUntilStatus('GET', contextUrl(TestData.SEEDED_PROCESS_NAME, '?all=true'), null, 200, 'PO-04-P04 context all=true');
    const processDetails = await helper.sendUntilStatus('GET', processUrl(TestData.SEEDED_PROCESS_NAME), null, 200, 'PO-04-P04 get process');
    const scope = await getScope(TestData.SEEDED_PROCESS_NAME, 'PO-04-P05 get scope');
    // The context drops attributes UI Fields has no value names for, GET /process does not (PO-D07 in the defect report).
    const mismatched = Object.keys(processDetails.data ?? {}).filter((key) => key !== 'attributes' && JSON.stringify(processDetails.data[key]) !== JSON.stringify(context.data?.[key]));
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(mismatched), '[]', 'PO-04-P04 - every GET /process key except attributes has the same value in the context');
    const bValidation2 = await commonFunctions.compareTwoValues(JSON.stringify(context.data?.scope), JSON.stringify(scope.data), 'PO-04-P05 - context scope equals GET /scope');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 5: PO-05-P01 the seeded scope is a JSON object with optionally typed dimensions and horizon', async () => {
    const response = await getScope(TestData.SEEDED_PROCESS_NAME, 'PO-05-P01 get scope');
    const scope = response.data;
    const bValidation1 = await commonFunctions.compareTwoValues(typeof scope === 'object' && scope !== null && !Array.isArray(scope), true, 'PO-05-P01 - scope is a JSON object');
    const bValidation2 = await commonFunctions.compareTwoValues(scope?.dimensions === undefined || Array.isArray(scope.dimensions), true, 'PO-05-P02 - dimensions is an array when present');
    const bValidation3 = await commonFunctions.compareTwoValues(scope?.horizon === undefined || (typeof scope.horizon === 'object' && !Array.isArray(scope.horizon)), true, 'PO-05-P03 - horizon is an object when present');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 6: PO-05-E01 a process created from a template starts with an empty scope', async () => {
    const response = await getScope(dedicatedProcess, 'PO-05-E01 get new process scope');
    const context = await helper.sendUntilStatus('GET', contextUrl(dedicatedProcess), null, 200, 'PO-05-E01 new process context');
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(response.data), '{}', 'PO-05-E01 - scope is {}');
    const bValidation2 = await commonFunctions.compareTwoValues(JSON.stringify(context.data?.scope), '{}', 'PO-05-E01 - context scope is {}');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 7: PO-06-P01 PUT stores the full scope and GET returns it unchanged', async () => {
    const response = await putScope(TestData.SCOPE_FULL, 'PO-06-P01 put full scope');
    const stored = await getScope(dedicatedProcess, 'PO-06-P01 get scope');
    const bValidation1 = await commonFunctions.compareTwoValues(response.data, TestData.SCOPE_UPDATED_MESSAGE, 'PO-06-P01 - success message');
    const bValidation2 = await commonFunctions.compareTwoValues(JSON.stringify(stored.data), JSON.stringify(TestData.SCOPE_FULL), 'PO-06-P01 - GET returns the stored scope');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 8: PO-04-P06 the context reflects the new scope and its horizon window', async () => {
    const context = await helper.sendUntilStatus('GET', contextUrl(dedicatedProcess, '?all=true'), null, 200, 'PO-04-P06 context all=true');
    const window = horizonWindow(context.data?.cycleStartDate, Number(TestData.SCOPE_FULL.horizon.pastDays), Number(TestData.SCOPE_FULL.horizon.futureDays));
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(context.data?.scope), JSON.stringify(TestData.SCOPE_FULL), 'PO-06-P04 - context scope equals the stored scope');
    const bValidation2 = await commonFunctions.compareTwoValues(context.data?.processStartDate, window.start, 'PO-04-P06 - processStartDate is cycleStartDate minus pastDays');
    const bValidation3 = await commonFunctions.compareTwoValues(context.data?.processEndDate, window.end, 'PO-04-P06 - processEndDate is cycleStartDate plus futureDays');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 9: PO-06-E01 a partial body replaces the whole scope', async () => {
    await putScope(TestData.SCOPE_PARTIAL, 'PO-06-E01 put partial scope');
    const stored = await getScope(dedicatedProcess, 'PO-06-E01 get scope');
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(stored.data), JSON.stringify(TestData.SCOPE_PARTIAL), 'PO-06-E01 - GET returns only the partial body');
    const bValidation2 = await commonFunctions.compareTwoValues(stored.data?.dimensions, undefined, 'PO-06-E01 - dimensions are gone');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 10: PO-06-P03 an empty scope falls back to the default horizon', async () => {
    await putScope({}, 'PO-06-P03 put empty scope');
    const stored = await getScope(dedicatedProcess, 'PO-06-P03 get scope');
    const context = await helper.sendUntilStatus('GET', contextUrl(dedicatedProcess, '?all=true'), null, 200, 'PO-04-P07 context all=true');
    const window = horizonWindow(context.data?.cycleStartDate, TestData.DEFAULT_HORIZON_DAYS, TestData.DEFAULT_HORIZON_DAYS);
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(stored.data), '{}', 'PO-06-P03 - GET returns {}');
    const bValidation2 = await commonFunctions.compareTwoValues(context.data?.processStartDate, window.start, 'PO-04-P07 - processStartDate uses the default pastDays');
    const bValidation3 = await commonFunctions.compareTwoValues(context.data?.processEndDate, window.end, 'PO-04-P07 - processEndDate uses the default futureDays');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 11: PO-06-P02 sending back exactly what GET returned changes nothing (PSR round trip)', async () => {
    await putScope(TestData.SCOPE_FULL, 'PO-06-P02 seed scope');
    const before = await getScope(dedicatedProcess, 'PO-06-P02 get scope before');
    await putScope(before.data, 'PO-06-P02 put scope back');
    const after = await getScope(dedicatedProcess, 'PO-06-P02 get scope after');
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(after.data), JSON.stringify(before.data), 'PO-06-P02 - scope is unchanged');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 12: PO-06-E02 a large scope round-trips intact', async () => {
    const values = Array.from({ length: TestData.LARGE_SCOPE_VALUE_COUNT }, (_, index) => `PWValue${String(index).padStart(3, '0')}`);
    const largeScope = { dimensions: [{ name: 'Product', values }], horizon: TestData.SCOPE_FULL.horizon };
    await putScope(largeScope, 'PO-06-E02 put large scope');
    const stored = await getScope(dedicatedProcess, 'PO-06-E02 get scope');
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(stored.data) === JSON.stringify(largeScope), true, `PO-06-E02 - ${values.length} values round-trip`);

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 13: PO-06-E03 unicode and JSON special characters round-trip unchanged', async () => {
    await putScope(TestData.SCOPE_SPECIAL_CHARACTERS, 'PO-06-E03 put special characters');
    const stored = await getScope(dedicatedProcess, 'PO-06-E03 get scope');
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(stored.data), JSON.stringify(TestData.SCOPE_SPECIAL_CHARACTERS), 'PO-06-E03 - special characters round-trip');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 14: PO-06-E04 parallel PUTs leave one of the bodies (last write wins)', async () => {
    const first = { horizon: { pastDays: '1', futureDays: '1' } };
    const second = { horizon: { pastDays: '2', futureDays: '2' } };
    const responses = await Promise.all([helper.send('PUT', scopeUrl(dedicatedProcess), first, 'PO-06-E04 put first'), helper.send('PUT', scopeUrl(dedicatedProcess), second, 'PO-06-E04 put second')]);
    const stored = await getScope(dedicatedProcess, 'PO-06-E04 get scope');
    const bValidation1 = await commonFunctions.compareTwoValues(responses.every((response) => response.status === 200), true, 'PO-06-E04 - both PUTs return 200');
    const bValidation2 = await commonFunctions.compareTwoValues([JSON.stringify(first), JSON.stringify(second)].includes(JSON.stringify(stored.data)), true, 'PO-06-E04 - stored scope is one of the two bodies');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 15: PO-06-N01 PO-06-N02 an array or an empty body is rejected with 400', async () => {
    const arrayBody = await helper.send('PUT', scopeUrl(dedicatedProcess), [], 'PO-06-N01 array body');
    const emptyBody = await helper.send('PUT', scopeUrl(dedicatedProcess), null, 'PO-06-N02 empty body');
    const bValidation1 = await commonFunctions.compareTwoValues(arrayBody.status, '400', 'PO-06-N01 - array body Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(emptyBody.status, '400', 'PO-06-N02 - empty body Status Code Validation');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 16: PO-06-N04 PUT on an unknown process is rejected by the RBAC check', async () => {
    const response = await helper.send('PUT', scopeUrl(TestData.UNKNOWN_PROCESS_NAME), {}, 'PO-06-N04 unknown process');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '401', 'PO-06-N04 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.errorCode, TestData.RBAC_DENIED_ERROR_CODE, 'PO-06-N04 - errorCode');
    const bValidation3 = await commonFunctions.compareTwoValues(String(response.data?.message).includes('edit permission'), true, 'PO-06-N04 - message names the edit permission');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 17: PO-04-N01 PO-05-N01 context and scope of an unknown process are rejected by the RBAC check', async () => {
    const context = await helper.send('GET', contextUrl(TestData.UNKNOWN_PROCESS_NAME, '?all=true'), null, 'PO-04-N01 unknown process context');
    const scope = await helper.send('GET', scopeUrl(TestData.UNKNOWN_PROCESS_NAME), null, 'PO-05-N01 unknown process scope');
    const validations: boolean[] = [];
    for (const [label, response] of [['PO-04-N01', context], ['PO-05-N01', scope]] as const) {
      validations.push(await commonFunctions.compareTwoValues(response.status, '401', `${label} - Status Code Validation`));
      validations.push(await commonFunctions.compareTwoValues(response.data?.errorCode, TestData.RBAC_DENIED_ERROR_CODE, `${label} - errorCode`));
      validations.push(await commonFunctions.compareTwoValues(String(response.data?.message).includes('view permission'), true, `${label} - message names the view permission`));
    }

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 18: PO-04-N03 a non-boolean all parameter returns 400', async () => {
    const response = await helper.send('GET', contextUrl(TestData.SEEDED_PROCESS_NAME, '?all=notABoolean'), null, 'PO-04-N03 all=notABoolean');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'PO-04-N03 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 19: PO-04-N02 PO-05-N02 PO-06-N03 context, scope and scope update without a token return 401', async () => {
    const noToken = { accept: 'application/json' };
    const context = await helper.send('GET', contextUrl(TestData.SEEDED_PROCESS_NAME), null, 'PO-04-N02 no token', noToken);
    const scope = await helper.send('GET', scopeUrl(TestData.SEEDED_PROCESS_NAME), null, 'PO-05-N02 no token', noToken);
    const update = await helper.send('PUT', scopeUrl(dedicatedProcess), {}, 'PO-06-N03 no token', noToken);
    const bValidation1 = await commonFunctions.compareTwoValues(context.status, '401', 'PO-04-N02 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(scope.status, '401', 'PO-05-N02 - Status Code Validation');
    const bValidation3 = await commonFunctions.compareTwoValues(update.status, '401', 'PO-06-N03 - Status Code Validation');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });
});
