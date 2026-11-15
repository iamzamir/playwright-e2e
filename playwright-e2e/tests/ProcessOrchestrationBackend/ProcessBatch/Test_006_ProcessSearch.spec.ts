import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { ActionItemApiHelper, itemsOf, processOrchestrationUrl, uniqueRunId } from '../../../util/action-item.util';

const psEnv = process.env.PSENV ?? 'INTEROP';
const TestData = require('../../../testdata/' + psEnv + '/ProcessOrchestrationBackend/ProcessBatch/Test_006_ProcessSearch.json');

const runId = uniqueRunId();
const attributeName = `PWSearchAttr_${runId}`;

test.describe.serial('Process search (PO-03)', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let helper: ActionItemApiHelper;
  let headers: Record<string, string>;
  let totalProcesses: number;
  let attributeAdded = false;

  const searchUrl = processOrchestrationUrl('process/search');
  const attributeUrl = (): string => `${process.env.API_BASE_URL}${(process.env.PROCESS_ATTRIBUTE as string).replace('{processName}', encodeURIComponent(TestData.ATTRIBUTE_PROCESS_NAME))}`;
  const search = async (body: Record<string, unknown>, label: string): Promise<any> => helper.sendUntilStatus('POST', searchUrl, body, 200, label);
  const ids = (response: any): string[] => itemsOf(response).map((row) => row?.id);

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    headers = { accept: 'application/json', Authorization: 'Bearer ' + await apiUtil.getBearerToken() };
    helper = new ActionItemApiHelper(apiUtil, headers);
    const all = await search({ pageNumber: 0, pageSize: TestData.ALL_ROWS_PAGE_SIZE, filters: {} }, 'Count every process');
    totalProcesses = Number(all.data?.pager?.totalElements);
  });

  test.afterAll(async () => {
    if (!attributeAdded) {
      return;
    }
    const url = `${process.env.API_BASE_URL}${(process.env.DELETE_PROCESS_ATTRIBUTE as string).replace('{processName}', encodeURIComponent(TestData.ATTRIBUTE_PROCESS_NAME)).replace('{attrName}', encodeURIComponent(attributeName)).replace('{attrValue}', encodeURIComponent(runId))}`;
    const response = await helper.send('DELETE', url, null, `Cleanup attribute ${attributeName}`);
    expect(response.status === 200 || response.status === '404').toBeTruthy();
  });

  test('Test Case 1: PO-03-P01 first page returns the rows, a consistent pager and the endpoint header', async () => {
    const response = await search({ pageNumber: 0, pageSize: 10, filters: {} }, 'PO-03-P01 search page 0');
    const rows = itemsOf(response);
    const pager = response.data?.pager;
    const bValidation1 = await commonFunctions.compareTwoValues(Array.isArray(response.data?.data) && rows.length <= 10, true, 'PO-03-P01 - data is an array of at most 10 rows');
    const bValidation2 = await commonFunctions.compareTwoValues(pager?.pageNumber, 0, 'PO-03-P01 - pager.pageNumber');
    const bValidation3 = await commonFunctions.compareTwoValues(pager?.pageSize, 10, 'PO-03-P01 - pager.pageSize');
    const bValidation4 = await commonFunctions.compareTwoValues(pager?.numberOfElements, rows.length, 'PO-03-P01 - pager.numberOfElements equals data.length');
    const bValidation5 = await commonFunctions.compareTwoValues(Number(pager?.totalElements) >= rows.length, true, 'PO-03-P01 - pager.totalElements is at least data.length');
    const bValidation6 = await commonFunctions.compareTwoValues(response.headers?.endpoint, '/process/search', 'PO-03-P01 - endpoint header');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6).toBeTruthy();
  });

  test('Test Case 2: PO-03-P02 every row carries the listing contract', async () => {
    const response = await search({ pageNumber: 0, pageSize: TestData.ALL_ROWS_PAGE_SIZE, filters: {} }, 'PO-03-P02 search every process');
    const offenders: string[] = [];
    for (const row of itemsOf(response)) {
      const missing = (TestData.ROW_STRING_KEYS as string[]).filter((key) => typeof row?.[key] !== 'string' || row[key].length === 0);
      if (missing.length || row?.isActive !== true || typeof row?.progress !== 'number' || typeof row?.sequence !== 'number' || !Array.isArray(row?.attributes)) {
        offenders.push(`${row?.name}: ${missing.join(',')}`);
      }
    }
    const bValidation1 = await commonFunctions.compareTwoValues(itemsOf(response).length > 0, true, 'PO-03-P02 - at least one process is listed');
    const bValidation2 = await commonFunctions.compareTwoValues(JSON.stringify(offenders), '[]', 'PO-03-P02 - every row has the string keys, isActive true, numeric progress and sequence, and an attributes array');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 3: PO-03-P03 PSR page sizes 5, 10 and 20 are honoured', async () => {
    const validations: boolean[] = [];
    for (const pageSize of TestData.PAGE_SIZES as number[]) {
      const response = await search({ pageNumber: 0, pageSize, filters: {} }, `PO-03-P03 page size ${pageSize}`);
      const rows = itemsOf(response);
      validations.push(await commonFunctions.compareTwoValues(rows.length, Math.min(pageSize, Number(response.data?.pager?.totalElements)), `PO-03-P03 - ${pageSize}: data.length`));
      validations.push(await commonFunctions.compareTwoValues(response.data?.pager?.pageSize, pageSize, `PO-03-P03 - ${pageSize}: pager.pageSize`));
      validations.push(await commonFunctions.compareTwoValues(response.data?.pager?.numberOfElements, rows.length, `PO-03-P03 - ${pageSize}: pager.numberOfElements`));
    }

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 4: PO-03-P04 consecutive pages are disjoint and follow the full list', async () => {
    const first = ids(await search({ pageNumber: 0, pageSize: 5, filters: {} }, 'PO-03-P04 page 0'));
    const second = ids(await search({ pageNumber: 1, pageSize: 5, filters: {} }, 'PO-03-P04 page 1'));
    const bValidation1 = await commonFunctions.compareTwoValues(first.filter((id) => second.includes(id)).length, 0, 'PO-03-P04 - page 0 and page 1 share no ids');
    const bValidation2 = await commonFunctions.compareTwoValues(first.length + second.length, Math.min(10, totalProcesses), 'PO-03-P04 - pages 0 and 1 together hold min(10, total) rows');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 5: PO-03-P05 PSR status filter only returns rows with that status', async () => {
    const response = await search({ pageNumber: 0, pageSize: TestData.ALL_ROWS_PAGE_SIZE, filters: { status: TestData.STATUS_FILTER } }, 'PO-03-P05 status filter');
    const rows = itemsOf(response);
    const expected = TestData.STATUS_DISPLAY[TestData.STATUS_FILTER];
    const bValidation1 = await commonFunctions.compareTwoValues(rows.every((row) => row?.status === expected), true, `PO-03-P05 - every row has status '${expected}'`);
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.pager?.totalElements <= totalProcesses, true, 'PO-03-P05 - filtered total is not above the unfiltered total');
    const bValidation3 = await commonFunctions.compareTwoValues(response.headers?.endpoint, '/process/search', 'PO-03-P05 - endpoint header');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 6: PO-03-P06 calendarName filter only returns rows on that calendar', async () => {
    const response = await search({ pageNumber: 0, pageSize: TestData.ALL_ROWS_PAGE_SIZE, filters: { calendarName: TestData.CALENDAR_NAME } }, 'PO-03-P06 calendarName filter');
    const rows = itemsOf(response);
    const bValidation1 = await commonFunctions.compareTwoValues(rows.length > 0, true, 'PO-03-P06 - at least one process uses the calendar');
    const bValidation2 = await commonFunctions.compareTwoValues(rows.every((row) => row?.calendarName === TestData.CALENDAR_NAME), true, 'PO-03-P06 - every row is on the calendar');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 7: PO-03-P07 an array and a comma string both apply IN semantics', async () => {
    const asArray = await search({ pageNumber: 0, pageSize: TestData.ALL_ROWS_PAGE_SIZE, filters: { status: TestData.STATUS_IN_FILTER } }, 'PO-03-P07 status array');
    const asString = await search({ pageNumber: 0, pageSize: TestData.ALL_ROWS_PAGE_SIZE, filters: { status: (TestData.STATUS_IN_FILTER as string[]).join(',') } }, 'PO-03-P07 status comma string');
    const allowed = (TestData.STATUS_IN_FILTER as string[]).map((status) => TestData.STATUS_DISPLAY[status]);
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(ids(asArray)), JSON.stringify(ids(asString)), 'PO-03-P07 - array and comma string return the same rows');
    const bValidation2 = await commonFunctions.compareTwoValues(itemsOf(asArray).every((row) => allowed.includes(row?.status)), true, `PO-03-P07 - every row status is one of ${allowed.join(', ')}`);

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 8: PO-03-P08 a custom attribute filter returns only the process that carries it', async () => {
    const added = await helper.write('POST', attributeUrl(), { name: attributeName, value: runId, isActive: true }, 201, `Add attribute ${attributeName}`);
    attributeAdded = added.status === 201;
    const response = await helper.searchUntil(searchUrl, { pageNumber: 0, pageSize: 10, filters: { [attributeName]: runId } }, (rows) => rows.length > 0, 'PO-03-P08 custom attribute filter');
    const rows = itemsOf(response);
    const bValidation1 = await commonFunctions.compareTwoValues(rows.map((row) => row?.name).join(','), TestData.ATTRIBUTE_PROCESS_NAME, 'PO-03-P08 - only the attributed process is returned');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.pager?.totalElements, 1, 'PO-03-P08 - pager.totalElements is 1');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 9: PO-03-P09 rows are ordered by createdOn descending', async () => {
    const response = await search({ pageNumber: 0, pageSize: TestData.ALL_ROWS_PAGE_SIZE, filters: {} }, 'PO-03-P09 every process');
    const createdOn = itemsOf(response).map((row) => String(row?.createdOn));
    const outOfOrder = createdOn.filter((value, index) => index > 0 && value > createdOn[index - 1]);
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(outOfOrder), '[]', 'PO-03-P09 - createdOn never increases down the list');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 10: PO-03-N01 missing filters returns 400 naming the field', async () => {
    const response = await helper.send('POST', searchUrl, { pageNumber: 0, pageSize: 5 }, 'PO-03-N01 missing filters');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'PO-03-N01 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.errorCode, TestData.VALIDATION_ERROR_CODE, 'PO-03-N01 - errorCode');
    const bValidation3 = await commonFunctions.compareTwoValues(response.data?.rootCause?.error?.violations?.[0]?.fieldName, 'filters', 'PO-03-N01 - violation names filters');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 11: PO-03-N02 a missing body and malformed JSON both return 400', async () => {
    const noBody = await helper.send('POST', searchUrl, null, 'PO-03-N02 no body');
    const malformed = await apiUtil.processRawRequest('POST', searchUrl, '{"filters":', headers, 'PO-03-N02 malformed JSON');
    const bValidation1 = await commonFunctions.compareTwoValues(noBody.status, '400', 'PO-03-N02 - no body Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(noBody.data?.errorCode, TestData.INVALID_JSON_ERROR_CODE, 'PO-03-N02 - no body errorCode');
    const bValidation3 = await commonFunctions.compareTwoValues(malformed.status, '400', 'PO-03-N02 - malformed Status Code Validation');
    const bValidation4 = await commonFunctions.compareTwoValues(malformed.data?.errorCode, TestData.INVALID_JSON_ERROR_CODE, 'PO-03-N02 - malformed errorCode');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test('Test Case 12: PO-03-N03 search without a token returns 401', async () => {
    const response = await helper.send('POST', searchUrl, { filters: {} }, 'PO-03-N03 no token', { accept: 'application/json' });
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '401', 'PO-03-N03 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 13: PO-03-E05 an unknown filter key is treated as a custom attribute and matches nothing', async () => {
    const response = await search({ pageNumber: 0, pageSize: 10, filters: { [`PWNoSuchAttr_${runId}`]: 'bar' } }, 'PO-03-E05 unknown filter key');
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(response.data?.data), '[]', 'PO-03-E05 - data is empty');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.pager?.totalElements, 0, 'PO-03-E05 - pager.totalElements is 0');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 14: PO-03-E06 omitted paging defaults to page 0 of 20 rows', async () => {
    const response = await search({ filters: {} }, 'PO-03-E06 default paging');
    const bValidation1 = await commonFunctions.compareTwoValues(response.data?.pager?.pageNumber, 0, 'PO-03-E06 - pager.pageNumber defaults to 0');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.pager?.pageSize, 20, 'PO-03-E06 - pager.pageSize defaults to 20');
    const bValidation3 = await commonFunctions.compareTwoValues(itemsOf(response).length, Math.min(20, Number(response.data?.pager?.totalElements)), 'PO-03-E06 - data.length');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 15: PO-03-E07 a page size above the total returns every row on one page', async () => {
    const response = await search({ pageNumber: 0, pageSize: TestData.ALL_ROWS_PAGE_SIZE, filters: {} }, 'PO-03-E07 every process');
    const bValidation1 = await commonFunctions.compareTwoValues(response.data?.pager?.numberOfElements, response.data?.pager?.totalElements, 'PO-03-E07 - numberOfElements equals totalElements');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.pager?.totalPages, 1, 'PO-03-E07 - totalPages is 1');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 16: PO-03-E08 filter keys are case-insensitive for the built-in columns', async () => {
    const lower = await search({ pageNumber: 0, pageSize: TestData.ALL_ROWS_PAGE_SIZE, filters: { status: TestData.STATUS_FILTER } }, 'PO-03-E08 status key');
    const upper = await search({ pageNumber: 0, pageSize: TestData.ALL_ROWS_PAGE_SIZE, filters: { STATUS: TestData.STATUS_FILTER } }, 'PO-03-E08 STATUS key');
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(ids(upper)), JSON.stringify(ids(lower)), 'PO-03-E08 - STATUS and status return the same rows');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 17: PO-03-E09 a page past the end returns an empty page', async () => {
    const response = await search({ pageNumber: TestData.PAGE_NUMBER_PAST_END, pageSize: 5, filters: {} }, 'PO-03-E09 page past the end');
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(response.data?.data), '[]', 'PO-03-E09 - data is empty');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.pager?.pageNumber, TestData.PAGE_NUMBER_PAST_END, 'PO-03-E09 - pager.pageNumber echoes the request');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });
});
