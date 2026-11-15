import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { getTimeout } from '../../../constants/timeouts';
import { ActionItemApiHelper, itemsOf, processOrchestrationUrl, uniqueRunId } from '../../../util/action-item.util';

const psEnv = process.env.PSENV ?? 'INTEROP';
const TestData = require('../../../testdata/' + psEnv + '/ProcessOrchestrationBackend/Calendar/Test_003_CalendarAndCycleListing.json');

const calendarName = `${TestData.CALENDAR_NAME_PREFIX} ${uniqueRunId()}`;

test.describe.serial('Calendar and cycle listing (PO-13, PO-14)', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let helper: ActionItemApiHelper;
  let headers: Record<string, string>;
  let calendarCreated = false;

  const noToken = { accept: 'application/json' };
  const calendarsUrl = (query = ''): string => processOrchestrationUrl(`calendar${query}`);
  const calendarUrl = (name: string = calendarName): string => processOrchestrationUrl(`calendar/${encodeURIComponent(name)}`);
  const cyclesUrl = (query = '', name: string = calendarName): string => `${calendarUrl(name)}/cycle${query}`;
  const read = async (url: string, label: string): Promise<any> => helper.sendUntilStatus('GET', url, null, 200, label);
  const calendarNames = async (label: string): Promise<string[]> => itemsOf(await read(calendarsUrl(`?pageNumber=0&pageSize=${TestData.ALL_ROWS_PAGE_SIZE}`), label)).map((calendar) => calendar?.name);
  const sortedStartDates = (): string[] => (TestData.CYCLES as any[]).map((cycle) => cycle.startDate.slice(0, 10)).sort();

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    headers = { accept: 'application/json', Authorization: 'Bearer ' + await apiUtil.getBearerToken() };
    helper = new ActionItemApiHelper(apiUtil, headers);
    const body = { calendarName, description: TestData.DESCRIPTION, cycles: TestData.CYCLES };
    await helper.write('POST', calendarsUrl(), body, 201, `Create calendar ${calendarName}`, { findCommitted: async () => ((await calendarNames('Find created calendar')).includes(calendarName) ? { name: calendarName } : undefined) });
    calendarCreated = true;
  });

  test.afterAll(async () => {
    if (calendarCreated) {
      const response = await helper.send('DELETE', calendarUrl(), null, `Cleanup calendar ${calendarName}`);
      expect(response.status === 200 || response.status === '404').toBeTruthy();
    }
  });

  test('Test Case 1: PO-13-P01 PO-13-P03 the calendar list pages calendars newest first', async () => {
    let response: any;
    await expect.poll(async () => {
      response = await read(calendarsUrl('?pageNumber=0&pageSize=10'), 'PO-13-P01 list calendars');
      return itemsOf(response).some((calendar) => calendar?.name === calendarName);
    }, { message: 'The new calendar never appeared on page 0', timeout: getTimeout('XLARGE'), intervals: [getTimeout('POLL_INTERVAL')] }).toBe(true);
    const calendars = itemsOf(response);
    const bValidation1 = await commonFunctions.compareTwoValues(calendars.every((calendar) => typeof calendar?.name === 'string' && typeof calendar?.description === 'string'), true, 'PO-13-P01 - every calendar has name and description');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.pager?.pageSize, 10, 'PO-13-P01 - pager.pageSize');
    const bValidation3 = await commonFunctions.compareTwoValues(response.data?.pager?.numberOfElements, calendars.length, 'PO-13-P01 - pager.numberOfElements');
    const bValidation4 = await commonFunctions.compareTwoValues(calendars.find((calendar) => calendar?.name === calendarName)?.description, TestData.DESCRIPTION, 'PO-13-P03 - the new calendar is on page 0 with its description');
    // Other specs may create calendars concurrently, so order is checked against a seeded calendar rather than data[0].
    const allNames = await calendarNames('PO-13-P03 list every calendar');
    const bValidation5 = await commonFunctions.compareTwoValues(allNames.indexOf(calendarName) >= 0 && allNames.indexOf(calendarName) < allNames.indexOf(TestData.OLDER_CALENDAR_NAME), true, `PO-13-P03 - the new calendar is listed before '${TestData.OLDER_CALENDAR_NAME}' (createdOn DESC)`);

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5).toBeTruthy();
  });

  test('Test Case 2: PO-13-P02 omitted paging defaults to page 0 of 5 calendars', async () => {
    const response = await read(calendarsUrl(), 'PO-13-P02 list calendars with default paging');
    const bValidation1 = await commonFunctions.compareTwoValues(response.data?.pager?.pageNumber, 0, 'PO-13-P02 - pager.pageNumber');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.pager?.pageSize, TestData.DEFAULT_PAGE_SIZE, 'PO-13-P02 - pager.pageSize');
    const bValidation3 = await commonFunctions.compareTwoValues(itemsOf(response).length <= TestData.DEFAULT_PAGE_SIZE, true, 'PO-13-P02 - at most 5 calendars');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 3: PO-13-P04 walking every page finds the calendar once and matches totalElements', async () => {
    const first = await read(calendarsUrl(`?pageNumber=0&pageSize=${TestData.LIST_PAGE_SIZE}`), 'PO-13-P04 page 0');
    const totalPages = Number(first.data?.pager?.totalPages);
    const names = itemsOf(first).map((calendar) => calendar?.name);
    for (let pageNumber = 1; pageNumber < totalPages; pageNumber++) {
      names.push(...itemsOf(await read(calendarsUrl(`?pageNumber=${pageNumber}&pageSize=${TestData.LIST_PAGE_SIZE}`), `PO-13-P04 page ${pageNumber}`)).map((calendar) => calendar?.name));
    }
    const bValidation1 = await commonFunctions.compareTwoValues(names.filter((name) => name === calendarName).length, 1, 'PO-13-P04 - the calendar is listed exactly once');
    const bValidation2 = await commonFunctions.compareTwoValues(names.length, first.data?.pager?.totalElements, 'PO-13-P04 - pages hold totalElements calendars');
    const bValidation3 = await commonFunctions.compareTwoValues(totalPages, Math.ceil(names.length / TestData.LIST_PAGE_SIZE) || 0, 'PO-13-P04 - totalPages matches totalElements');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 4: PO-13-E03 a page size above the total returns every calendar on one page', async () => {
    const response = await read(calendarsUrl(`?pageNumber=0&pageSize=${TestData.ALL_ROWS_PAGE_SIZE}`), 'PO-13-E03 pageSize 500');
    const bValidation1 = await commonFunctions.compareTwoValues(response.data?.pager?.numberOfElements, response.data?.pager?.totalElements, 'PO-13-E03 - numberOfElements equals totalElements');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 5: PO-13-E01 PO-13-E02 a zero pageSize or negative pageNumber returns 400', async () => {
    const zeroSize = await helper.send('GET', calendarsUrl('?pageSize=0'), null, 'PO-13-E01 pageSize=0');
    const negativePage = await helper.send('GET', calendarsUrl('?pageNumber=-1'), null, 'PO-13-E02 pageNumber=-1');
    const validations: boolean[] = [];
    for (const [label, response] of [['PO-13-E01', zeroSize], ['PO-13-E02', negativePage]] as const) {
      validations.push(await commonFunctions.compareTwoValues(response.status, '400', `${label} - Status Code Validation`));
      validations.push(await commonFunctions.compareTwoValues(response.data?.errorCode, TestData.INVALID_ARGUMENT_ERROR_CODE, `${label} - errorCode`));
    }

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 6: PO-14-P01 PO-14-E02 the cycles of a calendar whose name has spaces are listed with their contract', async () => {
    const response = await read(cyclesUrl('?pageNumber=0&pageSize=10'), 'PO-14-P01 list cycles');
    const cycles = itemsOf(response);
    const bValidation1 = await commonFunctions.compareTwoValues(response.data?.pager?.totalElements, TestData.CYCLES.length, 'PO-14-P01 - pager.totalElements');
    const bValidation2 = await commonFunctions.compareTwoValues(cycles.every((cycle) => typeof cycle?.id === 'number' && typeof cycle?.name === 'string' && typeof cycle?.startDate === 'string' && typeof cycle?.endDate === 'string' && typeof cycle?.description === 'string'), true, 'PO-14-P01 - every cycle has id, name, startDate, endDate and description');
    const bValidation3 = await commonFunctions.compareTwoValues(JSON.stringify(cycles.map((cycle) => cycle?.name).sort()), JSON.stringify((TestData.CYCLES as any[]).map((cycle) => cycle.cycleName).sort()), 'PO-14-P01 - the created cycles are listed');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 7: PO-14-P02 PO-14-P03 cycles page by startDate ascending', async () => {
    const page0 = await read(cyclesUrl('?pageNumber=0&pageSize=2'), 'PO-14-P02 cycles page 0');
    const page1 = await read(cyclesUrl('?pageNumber=1&pageSize=2'), 'PO-14-P02 cycles page 1');
    const startDates = [...itemsOf(page0), ...itemsOf(page1)].map((cycle) => String(cycle?.startDate).slice(0, 10));
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify([itemsOf(page0).length, itemsOf(page1).length]), '[2,1]', 'PO-14-P02 - pages hold 2 and 1 cycles');
    const bValidation2 = await commonFunctions.compareTwoValues(page0.data?.pager?.totalPages, 2, 'PO-14-P02 - totalPages');
    const bValidation3 = await commonFunctions.compareTwoValues(JSON.stringify(startDates), JSON.stringify(sortedStartDates()), 'PO-14-P03 - startDate ascending across pages');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 8: PO-14-P04 omitted paging defaults to page 0 of 5 cycles', async () => {
    const response = await read(cyclesUrl(), 'PO-14-P04 list cycles with default paging');
    const bValidation1 = await commonFunctions.compareTwoValues(response.data?.pager?.pageNumber, 0, 'PO-14-P04 - pager.pageNumber');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.pager?.pageSize, TestData.DEFAULT_PAGE_SIZE, 'PO-14-P04 - pager.pageSize');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 9: PO-14-E01 the cycles of an unknown calendar are an empty page', async () => {
    const response = await read(cyclesUrl('', TestData.UNKNOWN_CALENDAR_NAME), 'PO-14-E01 cycles of an unknown calendar');
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(response.data?.data), '[]', 'PO-14-E01 - data is empty');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.pager?.totalElements, 0, 'PO-14-E01 - pager.totalElements is 0');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 10: PO-14-E03 deleting a cycle removes it from the listing', async () => {
    const removed = TestData.CYCLES[0].cycleName;
    await helper.write('DELETE', `${calendarUrl()}/cycle/${encodeURIComponent(removed)}`, null, 200, `PO-14-E03 delete cycle ${removed}`);
    const response = await read(cyclesUrl('?pageNumber=0&pageSize=10'), 'PO-14-E03 list cycles after delete');
    const bValidation1 = await commonFunctions.compareTwoValues(response.data?.pager?.totalElements, TestData.CYCLES.length - 1, 'PO-14-E03 - totalElements drops by 1');
    const bValidation2 = await commonFunctions.compareTwoValues(itemsOf(response).some((cycle) => cycle?.name === removed), false, 'PO-14-E03 - the deleted cycle is not listed');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 11: PO-13-N01 PO-14-N01 both listings return 401 without a token', async () => {
    const calendars = await helper.send('GET', calendarsUrl(), null, 'PO-13-N01 no token', noToken);
    const cycles = await helper.send('GET', cyclesUrl(), null, 'PO-14-N01 no token', noToken);
    const bValidation1 = await commonFunctions.compareTwoValues(calendars.status, '401', 'PO-13-N01 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(cycles.status, '401', 'PO-14-N01 - Status Code Validation');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 12: PO-13-E04 a deleted calendar is gone from every page', async () => {
    await helper.write('DELETE', calendarUrl(), null, 200, `PO-13-E04 delete calendar ${calendarName}`);
    calendarCreated = false;
    const bValidation1 = await commonFunctions.compareTwoValues((await calendarNames('PO-13-E04 list calendars after delete')).includes(calendarName), false, 'PO-13-E04 - the calendar is no longer listed');

    expect(bValidation1).toBeTruthy();
  });
});
