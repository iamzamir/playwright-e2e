import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { buildUiFieldsUrl, compareWithBaseline, groupedFieldNames, sortedFieldNames } from '../../../util/ui-fields.util';

const psEnv = process.env.PSENV ?? 'INTEROP';
const TestData = require('../../../testdata/' + psEnv + '/ProcessOrchestrationBackend/UIFields/Test_001_PageConfigContracts.json');

type PageRef = { pageId: string; entityName: string };

const pages = TestData.PAGES as Record<string, PageRef>;
const baselineKey = (page: PageRef): string => `${page.pageId}:${page.entityName}`;
const pageFromKey = (key: string): PageRef => {
  const [pageId, entityName] = key.split(':');
  return { pageId, entityName };
};

// Every case is an independent read-only GET, so one failure must not hide the others.
test.describe('UI Fields - list, filter and detail page config contracts', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
  let noTokenHeaders: Record<string, string>;

  const listUrl = (query: Record<string, string | undefined>): string => buildUiFieldsUrl('list-page-config', query);
  const listWithFilterUrl = (query: Record<string, string | undefined>): string => buildUiFieldsUrl('list-page-config-with-filter', query);
  const detailUrl = (query: Record<string, string | undefined>): string => buildUiFieldsUrl('detail-page-config', query);
  const processUrl = (): string => `${process.env.API_BASE_URL}${process.env.GET_PROCESS_WITH_NAME}/${encodeURIComponent(TestData.PROCESS_NAME)}`;
  const subprocessUrl = (): string => `${process.env.API_BASE_URL}${(process.env.GET_SUBPROCESS_WITH_NAME as string).replace('{processName}', encodeURIComponent(TestData.PROCESS_NAME)).replace('{subprocessName}', encodeURIComponent(TestData.SUBPROCESS_NAME))}`;

  async function getJson(url: string, label: string, requestHeaders: Record<string, string> = headers): Promise<any> {
    return apiUtil.processAPIRequest('GET', url, null, requestHeaders, label, 'full');
  }

  async function validateFieldArray(fields: unknown, label: string): Promise<boolean> {
    const isNonEmptyArray = await commonFunctions.compareTwoValues(Array.isArray(fields) && fields.length > 0, true, `${label} - non-empty array`);
    if (!isNonEmptyArray) {
      return false;
    }
    // cmp is null for plain text columns (for example displayName), so only its type is checked.
    const invalid = (fields as any[]).filter((field) =>
      typeof field?.name !== 'string' || field.name.length === 0 ||
      typeof field?.displayName !== 'string' || field.displayName.length === 0 ||
      typeof field?.type !== 'string' ||
      !(field?.cmp === null || typeof field?.cmp === 'string'));
    return commonFunctions.compareTwoValues(JSON.stringify(invalid.map((field) => field?.name)), '[]', `${label} - every field has name, displayName, type and cmp`);
  }

  async function validateGroupArray(groups: unknown, label: string): Promise<boolean> {
    const isNonEmptyArray = await commonFunctions.compareTwoValues(Array.isArray(groups) && groups.length > 0, true, `${label} - non-empty group array`);
    if (!isNonEmptyArray) {
      return false;
    }
    const groupList = groups as any[];
    const validations = [
      await commonFunctions.compareTwoValues(groupList.every((group) => group?.groupName === null || (typeof group?.groupName === 'string' && group.groupName.length > 0)), true, `${label} - groupName is a non-empty string or null (header group)`),
      await commonFunctions.compareTwoValues(groupList.some((group) => typeof group?.groupName === 'string'), true, `${label} - at least one named group`),
      await commonFunctions.compareTwoValues(groupList.every((group) => Array.isArray(group?.fields) && group.fields.every((field: any) => typeof field?.name === 'string' && field.name.length > 0)), true, `${label} - every group has a fields array whose items have a name`)
    ];
    return validations.every(Boolean);
  }

  async function resolveProcessId(): Promise<string | undefined> {
    const response = await getJson(processUrl(), `Get process ${TestData.PROCESS_NAME} id`);
    if (commonFunctions.isStatus(response.status, 200) && response.data?.id) {
      return response.data.id;
    }
    // The subprocess rootNodeId is the process id, which covers realms where GET process is not readable.
    const subprocess = await getJson(subprocessUrl(), `Get subprocess ${TestData.SUBPROCESS_NAME} rootNodeId`);
    return subprocess.data?.rootNodeId;
  }

  async function resolveSubprocessId(): Promise<string | undefined> {
    const response = await getJson(subprocessUrl(), `Get subprocess ${TestData.SUBPROCESS_NAME} id`);
    return response.data?.id;
  }

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    const accessToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      'Accept-Language': TestData.ACCEPT_LANGUAGE,
      Authorization: 'Bearer ' + accessToken
    };
    noTokenHeaders = {
      accept: 'application/json',
      'Accept-Language': TestData.ACCEPT_LANGUAGE
    };
  });

  // ---------- UF-01 GET /list-page-config ----------

  test('Test Case 1: UF-01-P01 list-page-config returns the process listing columns', async () => {
    const response = await getJson(listUrl(pages.PROCESS_LIST), 'UF-01-P01 list-page-config process listing');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, 200, 'UF-01-P01 - Status Code Validation');
    const bValidation2 = await validateFieldArray(response.data, 'UF-01-P01');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 2: UF-01-P02 list-page-config returns the subprocess listing columns', async () => {
    const response = await getJson(listUrl(pages.SUBPROCESS_LIST), 'UF-01-P02 list-page-config subprocess listing');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, 200, 'UF-01-P02 - Status Code Validation');
    const bValidation2 = await validateFieldArray(response.data, 'UF-01-P02');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 3: UF-01-P03 list-page-config with the literal entityId=null sent by lui matches the plain call', async () => {
    const plain = await getJson(listUrl(pages.PROCESS_LIST), 'UF-01-P03 list-page-config without entityId');
    const withNull = await getJson(listUrl({ ...pages.PROCESS_LIST, entityId: 'null' }), 'UF-01-P03 list-page-config with entityId=null');
    const bValidation1 = await commonFunctions.compareTwoValues(withNull.status, 200, 'UF-01-P03 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(JSON.stringify(withNull.data), JSON.stringify(plain.data), 'UF-01-P03 - entityId=null response deep-equals the plain response');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 4: UF-01-P04 list-page-config serves the calendar, cycle and transition pages used by lui', async () => {
    const validations: boolean[] = [];
    for (const page of [pages.CALENDAR_LIST, pages.CYCLE_LIST, pages.TRANSITIONS_LIST]) {
      const response = await getJson(listUrl(page), `UF-01-P04 list-page-config ${baselineKey(page)}`);
      validations.push(await commonFunctions.compareTwoValues(response.status, 200, `UF-01-P04 ${baselineKey(page)} - Status Code Validation`));
      validations.push(await validateFieldArray(response.data, `UF-01-P04 ${baselineKey(page)}`));
    }

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 5: UF-01-P05 list-page-config field names match the environment baseline', async () => {
    const validations: boolean[] = [];
    for (const [key, expectedNames] of Object.entries(TestData.LIST_BASELINE as Record<string, string[]>)) {
      const response = await getJson(listUrl(pageFromKey(key)), `UF-01-P05 list-page-config baseline ${key}`);
      validations.push(await commonFunctions.compareTwoValues(response.status, 200, `UF-01-P05 ${key} - Status Code Validation`));
      validations.push(await compareWithBaseline(commonFunctions, sortedFieldNames(response.data), expectedNames, `UF-01-P05 ${key} field names`));
    }

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 6: UF-01-P06 list-page-config returns the same fields in the same order on consecutive calls', async () => {
    const first = await getJson(listUrl(pages.PROCESS_LIST), 'UF-01-P06 list-page-config first call');
    const second = await getJson(listUrl(pages.PROCESS_LIST), 'UF-01-P06 list-page-config second call');
    const bValidation1 = await commonFunctions.compareTwoValues(first.status, 200, 'UF-01-P06 first call - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(second.status, 200, 'UF-01-P06 second call - Status Code Validation');
    const bValidation3 = await commonFunctions.compareTwoValues(JSON.stringify(second.data), JSON.stringify(first.data), 'UF-01-P06 - consecutive responses are identical including order');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 7: UF-01-N01 list-page-config without pageId returns 400', async () => {
    const response = await getJson(listUrl({ entityName: pages.PROCESS_LIST.entityName }), 'UF-01-N01 list-page-config missing pageId');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'UF-01-N01 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 8: UF-01-N02 list-page-config without entityName returns 400', async () => {
    const response = await getJson(listUrl({ pageId: pages.PROCESS_LIST.pageId }), 'UF-01-N02 list-page-config missing entityName');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'UF-01-N02 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 9: UF-01-N03 list-page-config without a token returns 401', async () => {
    const response = await getJson(listUrl(pages.PROCESS_LIST), 'UF-01-N03 list-page-config without token', noTokenHeaders);
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '401', 'UF-01-N03 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 10: UF-01-E01 list-page-config with a non-numeric pageId returns 400 illegal argument', async () => {
    const response = await getJson(listUrl({ ...pages.PROCESS_LIST, pageId: TestData.INVALID_PAGE_ID }), 'UF-01-E01 list-page-config non-numeric pageId');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'UF-01-E01 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.errorCode, TestData.ILLEGAL_ARGUMENT_ERROR_CODE, 'UF-01-E01 - errorCode Validation');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 11: UF-01-E02 list-page-config with an unknown pageId returns an empty array', async () => {
    const response = await getJson(listUrl({ ...pages.PROCESS_LIST, pageId: TestData.UNKNOWN_PAGE_ID }), 'UF-01-E02 list-page-config unknown pageId');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, 200, 'UF-01-E02 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(JSON.stringify(response.data), '[]', 'UF-01-E02 - Response is an empty array');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 12: UF-01-E03 list-page-config with a page and entity mismatch returns an empty array', async () => {
    const response = await getJson(listUrl({ pageId: pages.PROCESS_LIST.pageId, entityName: pages.SUBPROCESS_LIST.entityName }), 'UF-01-E03 list-page-config page/entity mismatch');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, 200, 'UF-01-E03 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(JSON.stringify(response.data), '[]', 'UF-01-E03 - Response is an empty array');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 13: UF-01-E04 list-page-config returns the same field names for another Accept-Language', async () => {
    const english = await getJson(listUrl(pages.PROCESS_LIST), 'UF-01-E04 list-page-config default locale');
    const altHeaders = { ...headers, 'Accept-Language': TestData.ALT_ACCEPT_LANGUAGE };
    const alternate = await getJson(listUrl(pages.PROCESS_LIST), `UF-01-E04 list-page-config ${TestData.ALT_ACCEPT_LANGUAGE}`, altHeaders);
    const bValidation1 = await commonFunctions.compareTwoValues(alternate.status, 200, 'UF-01-E04 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(JSON.stringify((alternate.data ?? []).map((field: any) => field?.name)), JSON.stringify((english.data ?? []).map((field: any) => field?.name)), 'UF-01-E04 - Field names and order are locale independent');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 14: UF-01-E05 list-page-config matches entityName case-insensitively', async () => {
    const upper = await getJson(listUrl(pages.PROCESS_LIST), 'UF-01-E05 list-page-config upper-case entityName');
    const lower = await getJson(listUrl({ ...pages.PROCESS_LIST, entityName: pages.PROCESS_LIST.entityName.toLowerCase() }), 'UF-01-E05 list-page-config lower-case entityName');
    const bValidation1 = await commonFunctions.compareTwoValues(lower.status, 200, 'UF-01-E05 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(JSON.stringify(sortedFieldNames(lower.data)), JSON.stringify(sortedFieldNames(upper.data)), 'UF-01-E05 - Lower-case entityName returns the same fields');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  // ---------- UF-02 GET /list-page-config-with-filter ----------

  test('Test Case 15: UF-02-P01 list-page-config-with-filter returns fields and filters for the process listing', async () => {
    const response = await getJson(listWithFilterUrl({ ...pages.PROCESS_LIST, filterPageId: pages.PROCESS_FILTERS.pageId }), 'UF-02-P01 list-page-config-with-filter');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, 200, 'UF-02-P01 - Status Code Validation');
    const bValidation2 = await validateFieldArray(response.data?.fields, 'UF-02-P01 fields');
    const bValidation3 = await commonFunctions.compareTwoValues(Array.isArray(response.data?.filters) && response.data.filters.length > 0, true, 'UF-02-P01 - filters is a non-empty array');
    const bValidation4 = await commonFunctions.compareTwoValues(response.data?.groups ?? null, null, 'UF-02-P01 - groups is absent or null');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test('Test Case 16: UF-02-P02 list-page-config-with-filter fields equal the list-page-config response', async () => {
    const listOnly = await getJson(listUrl(pages.PROCESS_LIST), 'UF-02-P02 list-page-config');
    const withFilter = await getJson(listWithFilterUrl({ ...pages.PROCESS_LIST, filterPageId: pages.PROCESS_FILTERS.pageId }), 'UF-02-P02 list-page-config-with-filter');
    const bValidation1 = await commonFunctions.compareTwoValues(withFilter.status, 200, 'UF-02-P02 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(JSON.stringify(withFilter.data?.fields), JSON.stringify(listOnly.data), 'UF-02-P02 - fields deep-equal list-page-config');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 17: UF-02-P03 list-page-config-with-filter filters match the filter contract and baseline', async () => {
    const response = await getJson(listWithFilterUrl({ ...pages.PROCESS_LIST, filterPageId: pages.PROCESS_FILTERS.pageId }), 'UF-02-P03 list-page-config-with-filter');
    const filters: any[] = Array.isArray(response.data?.filters) ? response.data.filters : [];
    const statusFilter = filters.find((filter) => filter?.name === 'status');
    const statusKeys = Array.isArray(statusFilter?.values) ? statusFilter.values.map((value: any) => value?.key).sort() : [];
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, 200, 'UF-02-P03 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(filters.length > 0 && filters.every((filter) => typeof filter?.name === 'string' && typeof filter?.displayName === 'string' && typeof filter?.cmp === 'string' && Array.isArray(filter?.values)), true, 'UF-02-P03 - every filter has name, displayName, cmp and a values array');
    const bValidation3 = await compareWithBaseline(commonFunctions, sortedFieldNames(filters), TestData.EXPECTED_FILTER_NAMES, 'UF-02-P03 filter names');
    const bValidation4 = await compareWithBaseline(commonFunctions, statusKeys, TestData.EXPECTED_STATUS_FILTER_KEYS, 'UF-02-P03 status filter value keys');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test('Test Case 18: UF-02-P04 list-page-config-with-filter filters ignore entityId', async () => {
    const withoutEntity = await getJson(listWithFilterUrl({ ...pages.PROCESS_LIST, filterPageId: pages.PROCESS_FILTERS.pageId }), 'UF-02-P04 without entityId');
    const withEntity = await getJson(listWithFilterUrl({ ...pages.PROCESS_LIST, filterPageId: pages.PROCESS_FILTERS.pageId, entityId: 'null' }), 'UF-02-P04 with entityId');
    const bValidation1 = await commonFunctions.compareTwoValues(withEntity.status, 200, 'UF-02-P04 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(JSON.stringify(withEntity.data?.filters), JSON.stringify(withoutEntity.data?.filters), 'UF-02-P04 - filters are equal with and without entityId');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 19: UF-02-N01 list-page-config-with-filter without filterPageId returns 400', async () => {
    const response = await getJson(listWithFilterUrl(pages.PROCESS_LIST), 'UF-02-N01 missing filterPageId');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'UF-02-N01 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 20: UF-02-N02 list-page-config-with-filter without pageId or entityName returns 400', async () => {
    const missingPage = await getJson(listWithFilterUrl({ filterPageId: pages.PROCESS_FILTERS.pageId, entityName: pages.PROCESS_LIST.entityName }), 'UF-02-N02 missing pageId');
    const missingEntity = await getJson(listWithFilterUrl({ pageId: pages.PROCESS_LIST.pageId, filterPageId: pages.PROCESS_FILTERS.pageId }), 'UF-02-N02 missing entityName');
    const bValidation1 = await commonFunctions.compareTwoValues(missingPage.status, '400', 'UF-02-N02 missing pageId - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(missingEntity.status, '400', 'UF-02-N02 missing entityName - Status Code Validation');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 21: UF-02-N03 list-page-config-with-filter without a token returns 401', async () => {
    const response = await getJson(listWithFilterUrl({ ...pages.PROCESS_LIST, filterPageId: pages.PROCESS_FILTERS.pageId }), 'UF-02-N03 without token', noTokenHeaders);
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '401', 'UF-02-N03 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 22: UF-02-E01 list-page-config-with-filter with a non-numeric filterPageId returns 400', async () => {
    const response = await getJson(listWithFilterUrl({ ...pages.PROCESS_LIST, filterPageId: TestData.INVALID_PAGE_ID }), 'UF-02-E01 non-numeric filterPageId');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'UF-02-E01 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.errorCode, TestData.ILLEGAL_ARGUMENT_ERROR_CODE, 'UF-02-E01 - errorCode Validation');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 23: UF-02-E02 list-page-config-with-filter with an unknown filterPageId returns no filters', async () => {
    const response = await getJson(listWithFilterUrl({ ...pages.PROCESS_LIST, filterPageId: TestData.UNKNOWN_PAGE_ID }), 'UF-02-E02 unknown filterPageId');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, 200, 'UF-02-E02 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(JSON.stringify(response.data?.filters), '[]', 'UF-02-E02 - filters is an empty array');
    const bValidation3 = await compareWithBaseline(commonFunctions, sortedFieldNames(response.data?.fields), TestData.LIST_BASELINE[baselineKey(pages.PROCESS_LIST)], 'UF-02-E02 fields unchanged');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  // ---------- UF-03 GET /detail-page-config ----------

  test('Test Case 24: UF-03-P01 detail-page-config returns the process details groups', async () => {
    const processId = await resolveProcessId();
    const bValidation1 = await commonFunctions.compareTwoValues(!!processId, true, `UF-03-P01 - Process ${TestData.PROCESS_NAME} id resolved`);
    const response = await getJson(detailUrl({ ...pages.PROCESS_SUMMARY, entityId: processId }), 'UF-03-P01 detail-page-config process');
    const bValidation2 = await commonFunctions.compareTwoValues(response.status, 200, 'UF-03-P01 - Status Code Validation');
    const bValidation3 = await validateGroupArray(response.data, 'UF-03-P01');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 25: UF-03-P02 detail-page-config returns the subprocess details groups', async () => {
    const subprocessId = await resolveSubprocessId();
    const bValidation1 = await commonFunctions.compareTwoValues(!!subprocessId, true, `UF-03-P02 - Subprocess ${TestData.SUBPROCESS_NAME} id resolved`);
    const response = await getJson(detailUrl({ ...pages.SUBPROCESS_SUMMARY, entityId: subprocessId }), 'UF-03-P02 detail-page-config subprocess');
    const bValidation2 = await commonFunctions.compareTwoValues(response.status, 200, 'UF-03-P02 - Status Code Validation');
    const bValidation3 = await validateGroupArray(response.data, 'UF-03-P02');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 26: UF-03-P03 detail-page-config without entityId matches the call with a process id', async () => {
    const processId = await resolveProcessId();
    const withId = await getJson(detailUrl({ ...pages.PROCESS_SUMMARY, entityId: processId }), 'UF-03-P03 detail-page-config with entityId');
    const withoutId = await getJson(detailUrl(pages.PROCESS_SUMMARY), 'UF-03-P03 detail-page-config without entityId');
    const bValidation1 = await commonFunctions.compareTwoValues(withoutId.status, 200, 'UF-03-P03 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(JSON.stringify(withoutId.data), JSON.stringify(withId.data), 'UF-03-P03 - Response without entityId deep-equals the response with entityId');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 27: UF-03-P04 detail-page-config group and field names match the environment baseline', async () => {
    const validations: boolean[] = [];
    for (const [key, expectedGroups] of Object.entries(TestData.DETAIL_BASELINE as Record<string, Record<string, string[]>>)) {
      const response = await getJson(detailUrl(pageFromKey(key)), `UF-03-P04 detail-page-config baseline ${key}`);
      validations.push(await commonFunctions.compareTwoValues(response.status, 200, `UF-03-P04 ${key} - Status Code Validation`));
      validations.push(await compareWithBaseline(commonFunctions, groupedFieldNames(response.data), expectedGroups, `UF-03-P04 ${key} groups`));
    }

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 28: UF-03-P05 detail-page-config serves the calendar details page used by lui', async () => {
    const response = await getJson(detailUrl(pages.CALENDAR_DETAILS), 'UF-03-P05 detail-page-config calendar');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, 200, 'UF-03-P05 - Status Code Validation');
    const bValidation2 = await validateGroupArray(response.data, 'UF-03-P05');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 29: UF-03-N01 detail-page-config without pageId or entityName returns 400', async () => {
    const missingPage = await getJson(detailUrl({ entityName: pages.PROCESS_SUMMARY.entityName }), 'UF-03-N01 missing pageId');
    const missingEntity = await getJson(detailUrl({ pageId: pages.PROCESS_SUMMARY.pageId }), 'UF-03-N01 missing entityName');
    const bValidation1 = await commonFunctions.compareTwoValues(missingPage.status, '400', 'UF-03-N01 missing pageId - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(missingEntity.status, '400', 'UF-03-N01 missing entityName - Status Code Validation');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 30: UF-03-N02 detail-page-config without a token returns 401', async () => {
    const response = await getJson(detailUrl(pages.PROCESS_SUMMARY), 'UF-03-N02 without token', noTokenHeaders);
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '401', 'UF-03-N02 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 31: UF-03-E01 detail-page-config with a non-numeric pageId returns 400 illegal argument', async () => {
    const response = await getJson(detailUrl({ ...pages.PROCESS_SUMMARY, pageId: TestData.INVALID_PAGE_ID }), 'UF-03-E01 non-numeric pageId');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'UF-03-E01 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.errorCode, TestData.ILLEGAL_ARGUMENT_ERROR_CODE, 'UF-03-E01 - errorCode Validation');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 32: UF-03-E02 detail-page-config with an unknown pageId returns an empty array', async () => {
    const response = await getJson(detailUrl({ ...pages.PROCESS_SUMMARY, pageId: TestData.UNKNOWN_PAGE_ID }), 'UF-03-E02 unknown pageId');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, 200, 'UF-03-E02 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(JSON.stringify(response.data), '[]', 'UF-03-E02 - Response is an empty array');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });
});
