import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { ActionItemApiHelper, ActionItemNodeContext, itemsOf, itemsOutsideCodeFilter, processOrchestrationUrl, subprocessActionItemSearchUrl, uniqueRunId } from '../../../util/action-item.util';

const psEnv = process.env.PSENV ?? 'INTEROP';
const TestData = require('../../../testdata/' + psEnv + '/ProcessOrchestrationBackend/ActionItem/Test_005_ActionItemSearchForSubprocess.json');

const runId = uniqueRunId();
const childSubprocessName = `PWChild${runId}`;

test.describe.serial('Action Item search through the PO subprocess proxy (AI-09)', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let helper: ActionItemApiHelper;
  let headers: Record<string, string>;
  let ctx: ActionItemNodeContext;
  let subprocessItemId: string | undefined;
  let outsideItemId: string | undefined;
  let childCreated = false;
  let childItemId: string | undefined;

  const searchUrl = (subprocessName: string = TestData.SUBPROCESS_NAME, processName: string = TestData.PROCESS_NAME): string => subprocessActionItemSearchUrl(processName, subprocessName);
  const subprocessUrl = (subprocessName: string): string => processOrchestrationUrl(`process/${encodeURIComponent(TestData.PROCESS_NAME)}/subprocess/${encodeURIComponent(subprocessName)}`);
  const pageBody = (filter: Record<string, string> = {}, pageSize: number = 50): any => ({ filter, pageNumber: 0, pageSize });
  const hasId = (items: any[], id: string | undefined): boolean => items.some((item) => item?.id === id);

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    headers = { accept: 'application/json', Authorization: 'Bearer ' + await apiUtil.getBearerToken() };
    helper = new ActionItemApiHelper(apiUtil, headers);
    ctx = await helper.resolveNodeContext(TestData.PROCESS_NAME, TestData.SUBPROCESS_NAME);

    subprocessItemId = (await helper.createSubprocessActionItem(ctx, TestData.SUBPROCESS_ACTION_ITEM, `PW SP Search ${runId}`)).data.id;
    // Outside the SupplyReview subtree: the process itself, or a sibling subprocess when the process has no action item entity (QA Azure).
    if (ctx.processEntityId) {
      outsideItemId = (await helper.createProcessActionItem(ctx, TestData.PROCESS_ACTION_ITEM, `PW SP Outside ${runId}`)).data.id;
    } else {
      const sibling = await helper.resolveNodeContext(TestData.PROCESS_NAME, TestData.SIBLING_SUBPROCESS_NAME);
      outsideItemId = (await helper.createSubprocessActionItem(ctx, TestData.SUBPROCESS_ACTION_ITEM, `PW SP Outside ${runId}`, sibling.subprocessName, sibling.subprocessEntityId)).data.id;
    }
  });

  test.afterAll(async () => {
    const results = [
      await helper.deleteActionItem(childItemId),
      await helper.deleteActionItem(subprocessItemId),
      await helper.deleteActionItem(outsideItemId)
    ];
    if (childCreated) {
      const response = await helper.send('DELETE', subprocessUrl(childSubprocessName), null, 'Cleanup child subprocess');
      results.push(response.status === 200 || response.status === '404');
    }
    expect(results.every(Boolean)).toBeTruthy();
  });

  test('Test Case 1: AI-09-P01 an item raised on the subprocess is returned by its search', async () => {
    const response = await helper.searchUntil(searchUrl(), pageBody(), (items) => hasId(items, subprocessItemId), 'AI-09-P01 subprocess search');
    const bValidation1 = await commonFunctions.compareTwoValues(hasId(itemsOf(response), subprocessItemId), true, 'AI-09-P01 - subprocess item is returned');
    const bValidation2 = await commonFunctions.compareTwoValues(Array.isArray(response.data?.fields) && response.data.fields.length > 0, true, 'AI-09-P01 - fields is a non-empty array');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 2: AI-09-P02 items outside the subprocess subtree are not returned', async () => {
    const response = await helper.searchUntil(searchUrl(), pageBody({}, 100), (items) => hasId(items, subprocessItemId), 'AI-09-P02 subprocess search');
    const items = itemsOf(response);
    const bValidation1 = await commonFunctions.compareTwoValues(hasId(items, outsideItemId), false, 'AI-09-P02 - item outside the subtree is not returned');
    const bValidation2 = await commonFunctions.compareTwoValues(items.every((item) => item?.entityId === ctx.subprocessEntityId), true, 'AI-09-P02 - every item belongs to the subprocess entity');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 3: AI-09-P03 an item raised on a child subprocess is returned by the parent search', async () => {
    const gatewayType = (process.env.GATEWAY_TYPE || 'AZURE').toUpperCase();
    test.skip(!TestData.CHILD_SUBPROCESS_DELETE_ALLOWED[gatewayType], `The ${psEnv} ${gatewayType} machine client cannot delete subprocesses, so a child subprocess would be left behind`);
    childCreated = true;
    const createChild = await helper.write('POST', processOrchestrationUrl(`process/${encodeURIComponent(TestData.PROCESS_NAME)}/subprocess`), {
      ...TestData.CHILD_SUBPROCESS,
      displayName: childSubprocessName,
      referenceNodeName: TestData.SUBPROCESS_NAME,
      transition: { reference: TestData.CHILD_SUBPROCESS.startOffsetReference, referenceNodeNames: [TestData.SUBPROCESS_NAME] },
      parentNodeName: TestData.SUBPROCESS_NAME
    }, 201, 'AI-09-P03 create child subprocess', { findCommitted: async () => {
      const existing = await helper.send('GET', subprocessUrl(childSubprocessName), null, 'AI-09-P03 find child subprocess');
      return existing.status === 200 ? existing.data : undefined;
    } });
    const child = await helper.resolveNodeContext(TestData.PROCESS_NAME, childSubprocessName);
    childItemId = (await helper.createSubprocessActionItem(ctx, TestData.SUBPROCESS_ACTION_ITEM, `PW SP Child ${runId}`, childSubprocessName, child.subprocessEntityId)).data.id;
    const response = await helper.searchUntil(searchUrl(), pageBody(), (items) => hasId(items, childItemId), 'AI-09-P03 parent subprocess search');
    const bValidation1 = await commonFunctions.compareTwoValues(createChild.data?.name, childSubprocessName, 'AI-09-P03 - child subprocess created');
    const bValidation2 = await commonFunctions.compareTwoValues(hasId(itemsOf(response), childItemId), true, 'AI-09-P03 - child item is returned by the parent subprocess search');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 4: AI-09-P05 PSR page sizes 5, 10 and 20 are honoured', async () => {
    const validations: boolean[] = [];
    for (const pageSize of TestData.PAGE_SIZES as number[]) {
      const response = await helper.sendUntilStatus('POST', searchUrl(), pageBody({}, pageSize), 200, `AI-09-P05 page size ${pageSize}`);
      validations.push(await commonFunctions.compareTwoValues(itemsOf(response).length <= pageSize, true, `AI-09-P05 - ${pageSize}: data.length <= pageSize`));
      validations.push(await commonFunctions.compareTwoValues(response.data?.pager?.pageSize, pageSize, `AI-09-P05 - ${pageSize}: pager.pageSize`));
    }

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 5: AI-09-P06 PSR subprocess attribute filter only returns items with the requested codes', async () => {
    const codeMaps = await helper.filterCodeMaps(ctx.subprocessEntityId);
    const response = await helper.searchUntil(searchUrl(), pageBody(TestData.ATTRIBUTE_FILTER, 20), (items) => hasId(items, subprocessItemId), 'AI-09-P06 subprocess attribute filter');
    const offenders = itemsOutsideCodeFilter(itemsOf(response), TestData.ATTRIBUTE_FILTER, codeMaps);
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(offenders), '[]', 'AI-09-P06 - every item maps to a requested status, actionType and priority code');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 6: AI-09-N01 unknown subprocess returns 400 hierarchy retrieval error', async () => {
    const response = await helper.send('POST', searchUrl(TestData.UNKNOWN_SUBPROCESS_NAME), { filter: {} }, 'AI-09-N01 unknown subprocess');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'AI-09-N01 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.errorCode, TestData.PO_INVALID_REQUEST_ERROR_CODE, 'AI-09-N01 - errorCode');
    const bValidation3 = await commonFunctions.compareTwoValues(String(response.data?.message).includes('Node or hierarchy retrieval error'), true, 'AI-09-N01 - message');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 7: AI-09-N02 unknown process returns 400', async () => {
    const response = await helper.send('POST', searchUrl(TestData.SUBPROCESS_NAME, TestData.UNKNOWN_PROCESS_NAME), { filter: {} }, 'AI-09-N02 unknown process');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'AI-09-N02 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.errorCode, TestData.PO_INVALID_REQUEST_ERROR_CODE, 'AI-09-N02 - errorCode');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 8: AI-09-N03 search without a token returns 401', async () => {
    const response = await helper.send('POST', searchUrl(), { filter: {} }, 'AI-09-N03 no token', { accept: 'application/json' });
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '401', 'AI-09-N03 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 9: AI-09-E02 subprocess name in a different letter case resolves to the same subprocess', async () => {
    const canonical = await helper.searchUntil(searchUrl(), pageBody(), (items) => hasId(items, subprocessItemId), 'AI-09-E02 canonical case');
    const lowerCase = await helper.sendUntilStatus('POST', searchUrl(TestData.SUBPROCESS_NAME.toLowerCase()), pageBody(), 200, 'AI-09-E02 lower case');
    const bValidation1 = await commonFunctions.compareTwoValues(lowerCase.data?.pager?.totalElements, canonical.data?.pager?.totalElements, 'AI-09-E02 - same totalElements as the canonical name');
    const bValidation2 = await commonFunctions.compareTwoValues(hasId(itemsOf(lowerCase), subprocessItemId), true, 'AI-09-E02 - subprocess item is returned');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });
});
