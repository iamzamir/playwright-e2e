import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { ActionItemApiHelper, ActionItemNodeContext, itemsOf, itemsOutsideCodeFilter, processActionItemSearchUrl, uniqueRunId } from '../../../util/action-item.util';

const psEnv = process.env.PSENV ?? 'INTEROP';
const TestData = require('../../../testdata/' + psEnv + '/ProcessOrchestrationBackend/ActionItem/Test_004_ActionItemSearchForProcess.json');

const runId = uniqueRunId();

test.describe.serial('Action Item search through the PO process proxy (AI-08)', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let helper: ActionItemApiHelper;
  let headers: Record<string, string>;
  let ctx: ActionItemNodeContext;
  let anchorEntityId: string;
  let firstItemId: string | undefined;
  let secondItemId: string | undefined;
  let subprocessItemId: string | undefined;

  const searchUrl = (processName: string = TestData.PROCESS_NAME): string => processActionItemSearchUrl(processName);
  const anchorBody = (extraFilter: Record<string, string> = {}, extra: Record<string, unknown> = {}): any => ({ filter: { entityId: anchorEntityId, ...extraFilter }, pageNumber: 0, pageSize: 50, ...extra });
  const indexOfId = (items: any[], id: string | undefined): number => items.findIndex((item) => item?.id === id);

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    headers = { accept: 'application/json', Authorization: 'Bearer ' + await apiUtil.getBearerToken() };
    helper = new ActionItemApiHelper(apiUtil, headers);
    ctx = await helper.resolveNodeContext(TestData.PROCESS_NAME, TestData.SUBPROCESS_NAME);
    anchorEntityId = ctx.processEntityId ?? ctx.subprocessEntityId;

    // Items are created on the process when it has an action item entity, otherwise on the subprocess (QA Azure).
    const createAnchor = async (name: string): Promise<any> => ctx.processEntityId
      ? helper.createProcessActionItem(ctx, TestData.PROCESS_ACTION_ITEM, name)
      : helper.createSubprocessActionItem(ctx, TestData.SUBPROCESS_ACTION_ITEM, name);
    firstItemId = (await createAnchor(`PW Search A ${runId}`)).data.id;
    secondItemId = (await createAnchor(`PW Search B ${runId}`)).data.id;
    subprocessItemId = (await helper.createSubprocessActionItem(ctx, TestData.SUBPROCESS_ACTION_ITEM, `PW Search SP ${runId}`)).data.id;
  });

  test.afterAll(async () => {
    const results = [
      await helper.deleteActionItem(firstItemId),
      await helper.deleteActionItem(secondItemId),
      await helper.deleteActionItem(subprocessItemId)
    ];
    expect(results.every(Boolean)).toBeTruthy();
  });

  test('Test Case 1: AI-08-P01 PSR body returns a page of items, the grid fields and a pager', async () => {
    if (!ctx.processEntityId) {
      test.info().annotations.push({ type: 'data', description: `${TestData.PROCESS_NAME} has no actionItemEntityId on ${psEnv}; anchor items were created on ${TestData.SUBPROCESS_NAME}` });
    }
    const response = await helper.sendUntilStatus('POST', searchUrl(), { filter: {}, pageNumber: 0, pageSize: 10 }, 200, 'AI-08-P01 process search');
    const items = itemsOf(response);
    const fields = response.data?.fields;
    const bValidation1 = await commonFunctions.compareTwoValues(Array.isArray(response.data?.data) && items.length <= 10, true, 'AI-08-P01 - data is an array of at most 10 items');
    const bValidation2 = await commonFunctions.compareTwoValues(Array.isArray(fields) && fields.length > 0 && fields.every((field: any) => typeof field?.name === 'string' && field.name.length > 0), true, 'AI-08-P01 - fields is a non-empty array of named fields');
    const bValidation3 = await commonFunctions.compareTwoValues(response.data?.pager?.pageSize, 10, 'AI-08-P01 - pager.pageSize');
    const bValidation4 = await commonFunctions.compareTwoValues(Number(response.data?.pager?.totalElements) >= 1, true, 'AI-08-P01 - pager.totalElements >= 1');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test('Test Case 2: AI-08-P02 filter.entityId returns the created items newest first', async () => {
    const response = await helper.searchUntil(searchUrl(), anchorBody(), (items) => indexOfId(items, firstItemId) >= 0 && indexOfId(items, secondItemId) >= 0, 'AI-08-P02 search by entityId');
    const items = itemsOf(response);
    const bValidation1 = await commonFunctions.compareTwoValues(items.every((item) => item?.entityId === anchorEntityId), true, 'AI-08-P02 - every item belongs to the filtered entity');
    const bValidation2 = await commonFunctions.compareTwoValues(indexOfId(items, secondItemId) < indexOfId(items, firstItemId), true, 'AI-08-P02 - newer item is listed first (createdOn DESC)');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 3: AI-08-P03 search items carry the action item contract', async () => {
    const response = await helper.searchUntil(searchUrl(), anchorBody(), (items) => indexOfId(items, firstItemId) >= 0, 'AI-08-P03 search by entityId');
    const item = itemsOf(response).find((candidate) => candidate?.id === firstItemId);
    const missing = (TestData.ITEM_REQUIRED_KEYS as string[]).filter((key) => !(key in (item ?? {})));
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(missing), '[]', 'AI-08-P03 - every required key is present');
    const bValidation2 = await commonFunctions.compareTwoValues(Array.isArray(item?.attributes), true, 'AI-08-P03 - attributes is an array');
    const bValidation3 = await commonFunctions.compareTwoValues(item?.name, `PW Search A ${runId}`, 'AI-08-P03 - name');
    const bValidation4 = await commonFunctions.compareTwoValues(item?.status, TestData.STATUS_NOT_STARTED, 'AI-08-P03 - status display value');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test('Test Case 4: AI-08-P04 PSR page sizes 5, 10 and 20 are honoured', async () => {
    const validations: boolean[] = [];
    for (const pageSize of TestData.PAGE_SIZES as number[]) {
      const response = await helper.sendUntilStatus('POST', searchUrl(), { filter: {}, pageNumber: 0, pageSize }, 200, `AI-08-P04 page size ${pageSize}`);
      const items = itemsOf(response);
      validations.push(await commonFunctions.compareTwoValues(items.length <= pageSize, true, `AI-08-P04 - ${pageSize}: data.length <= pageSize`));
      validations.push(await commonFunctions.compareTwoValues(response.data?.pager?.pageSize, pageSize, `AI-08-P04 - ${pageSize}: pager.pageSize`));
      validations.push(await commonFunctions.compareTwoValues(response.data?.pager?.numberOfElements, items.length, `AI-08-P04 - ${pageSize}: pager.numberOfElements`));
    }

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 5: AI-08-P05 PSR attribute filter only returns items with the requested codes', async () => {
    const codeMaps = await helper.filterCodeMaps(anchorEntityId);
    const response = await helper.sendUntilStatus('POST', searchUrl(), { filter: TestData.ATTRIBUTE_FILTER, pageNumber: 0, pageSize: 20 }, 200, 'AI-08-P05 PSR attribute filter');
    const offenders = itemsOutsideCodeFilter(itemsOf(response), TestData.ATTRIBUTE_FILTER, codeMaps);
    const narrowed = await helper.sendUntilStatus('POST', searchUrl(), anchorBody(TestData.EXCLUDING_STATUS_FILTER), 200, 'AI-08-P05 status filter that excludes the created items');
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(offenders), '[]', 'AI-08-P05 - every item maps to a requested status, actionType and priority code');
    const bValidation2 = await commonFunctions.compareTwoValues(indexOfId(itemsOf(narrowed), firstItemId), -1, 'AI-08-P05 - a status filter that excludes Not Started drops the created item');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 6: AI-08-P07 an item raised on the subprocess also appears in the process search', async () => {
    const body = { filter: { entityId: ctx.subprocessEntityId }, pageNumber: 0, pageSize: 50 };
    const response = await helper.searchUntil(searchUrl(), body, (items) => indexOfId(items, subprocessItemId) >= 0, 'AI-08-P07 process search for the subprocess item');
    const bValidation1 = await commonFunctions.compareTwoValues(indexOfId(itemsOf(response), subprocessItemId) >= 0, true, 'AI-08-P07 - subprocess item is returned by the process search');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 7: AI-08-P08 filter.sort createdOn,asc reverses the default order', async () => {
    const response = await helper.searchUntil(searchUrl(), anchorBody({ sort: 'createdOn,asc' }), (items) => indexOfId(items, firstItemId) >= 0 && indexOfId(items, secondItemId) >= 0, 'AI-08-P08 search sorted createdOn asc');
    const items = itemsOf(response);
    const bValidation1 = await commonFunctions.compareTwoValues(indexOfId(items, firstItemId) < indexOfId(items, secondItemId), true, 'AI-08-P08 - older item is listed first (createdOn ASC)');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 8: AI-08-N01 unknown process returns 400 hierarchy retrieval error', async () => {
    const response = await helper.send('POST', searchUrl(TestData.UNKNOWN_PROCESS_NAME), { filter: {} }, 'AI-08-N01 unknown process');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'AI-08-N01 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.errorCode, TestData.PO_INVALID_REQUEST_ERROR_CODE, 'AI-08-N01 - errorCode');
    const bValidation3 = await commonFunctions.compareTwoValues(String(response.data?.message).includes('Process or hierarchy retrieval error'), true, 'AI-08-N01 - message');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 9: AI-08-N02 search without a token returns 401', async () => {
    const response = await helper.send('POST', searchUrl(), { filter: {} }, 'AI-08-N02 no token', { accept: 'application/json' });
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '401', 'AI-08-N02 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 10: AI-08-N03 malformed JSON returns 400', async () => {
    const response = await helper.send('POST', searchUrl(), '{"filter":', 'AI-08-N03 malformed JSON');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'AI-08-N03 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.errorCode, TestData.INVALID_JSON_ERROR_CODE, 'AI-08-N03 - errorCode');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 11: AI-08-E02 pageSize omitted defaults to 5', async () => {
    const response = await helper.sendUntilStatus('POST', searchUrl(), { filter: {} }, 200, 'AI-08-E02 default page size');
    const bValidation1 = await commonFunctions.compareTwoValues(response.data?.pager?.pageSize, 5, 'AI-08-E02 - pager.pageSize defaults to 5');
    const bValidation2 = await commonFunctions.compareTwoValues(itemsOf(response).length <= 5, true, 'AI-08-E02 - at most 5 items');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 12: AI-08-E04 unknown filter key is treated as an attribute filter and matches nothing', async () => {
    const response = await helper.sendUntilStatus('POST', searchUrl(), { filter: { foo: 'bar' }, pageNumber: 0, pageSize: 10 }, 200, 'AI-08-E04 unknown filter key');
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(response.data?.data), '[]', 'AI-08-E04 - data is empty');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 13: AI-08-E06 pageNumber past the last page returns an empty page', async () => {
    const response = await helper.sendUntilStatus('POST', searchUrl(), { filter: {}, pageNumber: TestData.PAGE_NUMBER_PAST_END, pageSize: 5 }, 200, 'AI-08-E06 page past the end');
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(response.data?.data), '[]', 'AI-08-E06 - data is empty');

    expect(bValidation1).toBeTruthy();
  });
});
