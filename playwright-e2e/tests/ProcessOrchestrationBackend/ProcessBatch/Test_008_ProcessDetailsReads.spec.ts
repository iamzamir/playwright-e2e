import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { ActionItemApiHelper, itemsOf, processOrchestrationUrl } from '../../../util/action-item.util';

const psEnv = process.env.PSENV ?? 'INTEROP';
const TestData = require('../../../testdata/' + psEnv + '/ProcessOrchestrationBackend/ProcessBatch/Test_008_ProcessDetailsReads.json');

test.describe.serial('Process details reads (PO-07 to PO-12)', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let helper: ActionItemApiHelper;
  let headers: Record<string, string>;
  let levelOneNames: string[];

  const noToken = { accept: 'application/json' };
  const processRoute = (route: string, processName: string = TestData.PROCESS_NAME): string => processOrchestrationUrl(`process/${encodeURIComponent(processName)}${route}`);
  const subprocessRoute = (route: string, subprocessName: string = TestData.SUBPROCESS_NAME): string => processRoute(`/subprocess/${encodeURIComponent(subprocessName)}${route}`);
  const read = async (url: string, label: string): Promise<any> => helper.sendUntilStatus('GET', url, null, 200, label);
  const isKpiItem = (item: any): boolean => typeof item?.name === 'string' && typeof item?.title === 'string' && typeof item?.value === 'string' && typeof item?.isActive === 'boolean' && typeof item?.isEnabled === 'boolean';
  const childNames = (node: any): string[] => (Array.isArray(node?.Children) ? node.Children : []).map((child: any) => child?.name).sort();

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    headers = { accept: 'application/json', Authorization: 'Bearer ' + await apiUtil.getBearerToken() };
    helper = new ActionItemApiHelper(apiUtil, headers);
    const children = await read(processRoute('/children?pageNumber=0&pageSize=100'), `Get level-1 subprocesses of ${TestData.PROCESS_NAME}`);
    levelOneNames = itemsOf(children).map((child) => child?.name);
  });

  test('Test Case 1: PO-07-P01 process users is a list of unique users with the endpoint header', async () => {
    const response = await read(processRoute('/users'), 'PO-07-P01 process users');
    const users = Array.isArray(response.data) ? response.data : [];
    const ids = users.map((user: any) => user?.id);
    const bValidation1 = await commonFunctions.compareTwoValues(Array.isArray(response.data) && users.length > 0, true, 'PO-07-P01 - body is a non-empty array');
    const bValidation2 = await commonFunctions.compareTwoValues(users.every((user: any) => typeof user?.id === 'string' && typeof user?.userId === 'string' && typeof user?.fullName === 'string'), true, 'PO-07-P01 - every user has id, userId and fullName');
    const bValidation3 = await commonFunctions.compareTwoValues(new Set(ids).size, ids.length, 'PO-07-E03 - no duplicate user ids');
    const bValidation4 = await commonFunctions.compareTwoValues(response.headers?.endpoint, '/process/{processName}/users', 'PO-07-P01 - endpoint header');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test('Test Case 2: PO-07-E01 users of an unknown process fails the LIAM resource lookup', async () => {
    const response = await helper.send('GET', processRoute('/users', TestData.UNKNOWN_PROCESS_NAME), null, 'PO-07-E01 unknown process users');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '401', 'PO-07-E01 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.errorCode, TestData.LIAM_RESOURCE_NOT_FOUND_ERROR_CODE, 'PO-07-E01 - errorCode');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 3: PO-08-P01 to P03 the process Gantt rows are complete and self-consistent', async () => {
    const response = await read(processRoute('/processGantt'), 'PO-08-P01 process Gantt');
    const rows = Array.isArray(response.data) ? response.data : [];
    const originalNames = rows.map((row: any) => row?.originalName);
    const danglingReferences = rows.flatMap((row: any) => (row?.dependency?.referenceNodeNames ?? []) as string[]).filter((name: string) => !originalNames.includes(name));
    const missingChildren = levelOneNames.filter((name) => !originalNames.includes(name));
    const bValidation1 = await commonFunctions.compareTwoValues(rows.length > 0, true, 'PO-08-P01 - Gantt is a non-empty array');
    const bValidation2 = await commonFunctions.compareTwoValues(rows.every((row: any) => typeof row?.id === 'string' && typeof row?.originalName === 'string'), true, 'PO-08-P01 - every row has id and originalName');
    const bValidation3 = await commonFunctions.compareTwoValues(originalNames.includes(TestData.PROCESS_NAME), true, 'PO-08-P01 - the process itself is a row');
    const bValidation4 = await commonFunctions.compareTwoValues(JSON.stringify(danglingReferences), '[]', 'PO-08-P02 - every dependency reference names another row');
    const bValidation5 = await commonFunctions.compareTwoValues(JSON.stringify(missingChildren), '[]', 'PO-08-P03 - every level-1 subprocess is a row');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5).toBeTruthy();
  });

  test('Test Case 4: PO-08-N01 the Gantt of an unknown process is rejected by the RBAC check', async () => {
    const response = await helper.send('GET', processRoute('/processGantt', TestData.UNKNOWN_PROCESS_NAME), null, 'PO-08-N01 unknown process Gantt');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '401', 'PO-08-N01 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.errorCode, TestData.RBAC_DENIED_ERROR_CODE, 'PO-08-N01 - errorCode');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 5: PO-09-P01 PO-09-P03 process KPIs are KPI items and objectType does not change the list', async () => {
    const response = await read(processRoute('/kpi'), 'PO-09-P01 process KPIs');
    const withObjectType = await read(processRoute('/kpi?objectType=0'), 'PO-09-P03 process KPIs with objectType');
    const titles = (body: any): string => JSON.stringify((Array.isArray(body) ? body : []).map((item: any) => item?.title));
    if (Array.isArray(response.data) && response.data.length === 0) {
      test.info().annotations.push({ type: 'data', description: `${TestData.PROCESS_NAME} has no KPI configured on ${psEnv}; only the array shape is checked` });
    }
    const bValidation1 = await commonFunctions.compareTwoValues(Array.isArray(response.data), true, 'PO-09-P01 - body is an array');
    const bValidation2 = await commonFunctions.compareTwoValues((response.data ?? []).every(isKpiItem), true, 'PO-09-P01 - every item has name, title, value, isActive and isEnabled');
    const bValidation3 = await commonFunctions.compareTwoValues(titles(withObjectType.data), titles(response.data), 'PO-09-P03 - objectType=0 returns the same KPIs');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 6: PO-10-P01 subprocess KPIs are KPI items', async () => {
    const response = await read(subprocessRoute('/kpi'), 'PO-10-P01 subprocess KPIs');
    const bValidation1 = await commonFunctions.compareTwoValues(Array.isArray(response.data), true, 'PO-10-P01 - body is an array');
    const bValidation2 = await commonFunctions.compareTwoValues((response.data ?? []).every(isKpiItem), true, 'PO-10-P01 - every item has name, title, value, isActive and isEnabled');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 7: PO-11-P01 subprocess children match the subprocess tree for every level-1 subprocess', async () => {
    const mismatches: string[] = [];
    for (const name of levelOneNames) {
      const tree = await read(subprocessRoute('/tree', name), `PO-11-P01 tree of ${name}`);
      const children = await read(subprocessRoute('/children?pageNumber=0&pageSize=100', name), `PO-11-P01 children of ${name}`);
      const listed = itemsOf(children).map((child) => child?.name).sort();
      if (JSON.stringify(listed) !== JSON.stringify(childNames(tree.data)) || children.data?.pager?.totalElements !== listed.length) {
        mismatches.push(`${name}: children=${JSON.stringify(listed)} tree=${JSON.stringify(childNames(tree.data))} total=${children.data?.pager?.totalElements}`);
      }
    }
    const bValidation1 = await commonFunctions.compareTwoValues(levelOneNames.length > 0, true, 'PO-11-P01 - the process has level-1 subprocesses');
    const bValidation2 = await commonFunctions.compareTwoValues(JSON.stringify(mismatches), '[]', 'PO-11-P01 - /children lists exactly the tree children, and totalElements matches');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 8: PO-11-P02 PSR page sizes 5, 10 and 20 are honoured', async () => {
    const validations: boolean[] = [];
    for (const pageSize of TestData.PAGE_SIZES as number[]) {
      const response = await read(subprocessRoute(`/children?pageNumber=0&pageSize=${pageSize}`), `PO-11-P02 page size ${pageSize}`);
      const rows = itemsOf(response);
      validations.push(await commonFunctions.compareTwoValues(rows.length, Math.min(pageSize, Number(response.data?.pager?.totalElements)), `PO-11-P02 - ${pageSize}: data.length`));
      validations.push(await commonFunctions.compareTwoValues(response.data?.pager?.pageSize, pageSize, `PO-11-P02 - ${pageSize}: pager.pageSize`));
      validations.push(await commonFunctions.compareTwoValues(response.data?.pager?.numberOfElements, rows.length, `PO-11-P02 - ${pageSize}: pager.numberOfElements`));
    }

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 9: PO-11-P03 paging through one row at a time returns every child once', async () => {
    const first = await read(subprocessRoute('/children?pageNumber=0&pageSize=1'), 'PO-11-P03 page 0');
    const total = Number(first.data?.pager?.totalElements);
    const ids = itemsOf(first).map((child) => child?.id);
    for (let pageNumber = 1; pageNumber < total; pageNumber++) {
      ids.push(...itemsOf(await read(subprocessRoute(`/children?pageNumber=${pageNumber}&pageSize=1`), `PO-11-P03 page ${pageNumber}`)).map((child) => child?.id));
    }
    const bValidation1 = await commonFunctions.compareTwoValues(ids.length, total, 'PO-11-P03 - pages hold totalElements rows');
    const bValidation2 = await commonFunctions.compareTwoValues(new Set(ids).size, ids.length, 'PO-11-P03 - no child is listed twice');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 10: PO-11-E01 PO-11-E02 non-positive paging values fall back to the defaults', async () => {
    const zeroSize = await read(subprocessRoute('/children?pageSize=0'), 'PO-11-E01 pageSize=0');
    const negativePage = await read(subprocessRoute('/children?pageNumber=-1'), 'PO-11-E02 pageNumber=-1');
    const bValidation1 = await commonFunctions.compareTwoValues(zeroSize.data?.pager?.pageSize, TestData.DEFAULT_PAGE_SIZE, 'PO-11-E01 - pageSize=0 becomes the default');
    const bValidation2 = await commonFunctions.compareTwoValues(negativePage.data?.pager?.pageNumber, 0, 'PO-11-E02 - pageNumber=-1 becomes 0');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 11: PO-11-E03 a non-numeric pageSize returns 400', async () => {
    const response = await helper.send('GET', subprocessRoute('/children?pageSize=abc'), null, 'PO-11-E03 pageSize=abc');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'PO-11-E03 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 12: PO-12-P01 PO-12-P02 entity limits are returned for every entity type', async () => {
    const validations: boolean[] = [];
    for (const entityType of TestData.ENTITY_TYPES as string[]) {
      const response = await read(processRoute(`/entity/${entityType}`), `PO-12-P01 ${entityType} limits`);
      const limits = response.data?.entityLimits;
      validations.push(await commonFunctions.compareTwoValues(Array.isArray(limits) && limits.length > 0, true, `PO-12-P01 - ${entityType}: entityLimits is a non-empty array`));
      validations.push(await commonFunctions.compareTwoValues((limits ?? []).every((limit: any) => typeof limit?.operationtype === 'string' && typeof limit?.limit === 'number' && typeof limit?.enforcementtype === 'string'), true, `PO-12-P01 - ${entityType}: every limit has operationtype, limit and enforcementtype`));
    }

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 13: PO-12-E02 the entity type is matched case-insensitively', async () => {
    const upper = await read(processRoute(`/entity/${TestData.ENTITY_TYPES[0]}`), 'PO-12-E02 upper-case entity type');
    const lower = await read(processRoute(`/entity/${String(TestData.ENTITY_TYPES[0]).toLowerCase()}`), 'PO-12-E02 lower-case entity type');
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(lower.data), JSON.stringify(upper.data), 'PO-12-E02 - lower-case returns the same limits');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 14: PO-12-N01 PO-12-E01 an unknown process or entity type returns 404', async () => {
    const unknownProcess = await helper.send('GET', processRoute(`/entity/${TestData.ENTITY_TYPES[0]}`, TestData.UNKNOWN_PROCESS_NAME), null, 'PO-12-N01 unknown process');
    const unknownEntity = await helper.send('GET', processRoute(`/entity/${TestData.UNKNOWN_ENTITY_TYPE}`), null, 'PO-12-E01 unknown entity type');
    const bValidation1 = await commonFunctions.compareTwoValues(unknownProcess.status, '404', 'PO-12-N01 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(unknownProcess.data?.errorCode, TestData.PROCESS_NOT_FOUND_ERROR_CODE, 'PO-12-N01 - errorCode');
    const bValidation3 = await commonFunctions.compareTwoValues(unknownEntity.status, '404', 'PO-12-E01 - Status Code Validation');
    const bValidation4 = await commonFunctions.compareTwoValues(unknownEntity.data?.errorCode, TestData.ENTITY_NOT_FOUND_ERROR_CODE, 'PO-12-E01 - errorCode');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test('Test Case 15: PO-07-N01 to PO-12-N02 every details route returns 401 without a token', async () => {
    const routes = [
      ['PO-07-N01', processRoute('/users')],
      ['PO-08-N02', processRoute('/processGantt')],
      ['PO-09-N01', processRoute('/kpi')],
      ['PO-10-N03', subprocessRoute('/kpi')],
      ['PO-11-N01', subprocessRoute('/children')],
      ['PO-12-N02', processRoute(`/entity/${TestData.ENTITY_TYPES[0]}`)]
    ];
    const validations: boolean[] = [];
    for (const [label, url] of routes) {
      const response = await helper.send('GET', url, null, `${label} no token`, noToken);
      validations.push(await commonFunctions.compareTwoValues(response.status, '401', `${label} - Status Code Validation`));
    }

    expect(validations.every(Boolean)).toBeTruthy();
  });
});
