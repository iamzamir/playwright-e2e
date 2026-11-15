import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { ActionItemApiHelper, ActionItemNodeContext, actionItemServiceUrl, uniqueRunId } from '../../../util/action-item.util';

const psEnv = process.env.PSENV ?? 'INTEROP';
const TestData = require('../../../testdata/' + psEnv + '/ProcessOrchestrationBackend/ActionItem/Test_007_ActionItemTemplates.json');

const runId = uniqueRunId();
const templateName = `${TestData.TEMPLATE_NAME_PREFIX}${runId}`;
const sourceItemName = `PW Template Source ${runId}`;

test.describe.serial('Action Item templates (AI-03)', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let helper: ActionItemApiHelper;
  let headers: Record<string, string>;
  let ctx: ActionItemNodeContext;
  let sourceItemId: string | undefined;
  let templateId: string | undefined;
  let templateDeleted = false;

  const templatesUrl = (entityId?: string): string => actionItemServiceUrl(entityId === undefined ? 'actionitemTemplates' : `actionitemTemplates?entityId=${encodeURIComponent(entityId)}`);
  const findTemplate = (response: any): any => (Array.isArray(response?.data) ? response.data.find((template: any) => template?.id === templateId) : undefined);

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    headers = { accept: 'application/json', Authorization: 'Bearer ' + await apiUtil.getBearerToken() };
    helper = new ActionItemApiHelper(apiUtil, headers);
    ctx = await helper.resolveNodeContext(TestData.PROCESS_NAME, TestData.SUBPROCESS_NAME);
    // A subprocess item works in every environment, including QA Azure where the process has no action item entity.
    sourceItemId = (await helper.createSubprocessActionItem(ctx, TestData.SUBPROCESS_ACTION_ITEM, sourceItemName)).data.id;
  });

  test.afterAll(async () => {
    const results: boolean[] = [];
    if (templateId && !templateDeleted) {
      const response = await helper.send('DELETE', actionItemServiceUrl(`actionitemTemplates/${templateId}`), null, 'Cleanup action item template');
      results.push(response.status === 200 || response.status === '404');
    }
    results.push(await helper.deleteActionItem(sourceItemId));
    expect(results.every(Boolean)).toBeTruthy();
  });

  test('Test Case 1: AI-03-P01 a template created for the process is listed by entityId', async () => {
    const create = await helper.write('POST', templatesUrl(), { name: templateName, entityId: ctx.processId, description: TestData.TEMPLATE_DESCRIPTION, ids: [sourceItemId] }, 201, 'AI-03-P01 create template', { findCommitted: async () => {
      const existing = await helper.send('GET', templatesUrl(ctx.processId), null, 'AI-03-P01 find template');
      return Array.isArray(existing.data) ? existing.data.find((template: any) => template?.name === templateName) : undefined;
    } });
    templateId = create.data?.id;
    const response = await helper.sendUntilStatus('GET', templatesUrl(ctx.processId), null, 200, 'AI-03-P01 list templates for the process');
    const template = findTemplate(response);
    const bValidation1 = await commonFunctions.compareTwoValues(Array.isArray(response.data), true, 'AI-03-P01 - response is an array');
    const bValidation2 = await commonFunctions.compareTwoValues(template?.name, templateName, 'AI-03-P01 - created template is listed');
    const bValidation3 = await commonFunctions.compareTwoValues(template?.entityId, ctx.processId, 'AI-03-P01 - entityId is the process id', true);
    const bValidation4 = await commonFunctions.compareTwoValues(template?.isActive, true, 'AI-03-P01 - isActive');
    const bValidation5 = await commonFunctions.compareTwoValues(template?.isDeleted, false, 'AI-03-P01 - isDeleted');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5).toBeTruthy();
  });

  test('Test Case 2: AI-03-P02 the template snapshots the source action item', async () => {
    const response = await helper.sendUntilStatus('GET', templatesUrl(ctx.processId), null, 200, 'AI-03-P02 list templates');
    const snapshot = findTemplate(response)?.data;
    const bValidation1 = await commonFunctions.compareTwoValues(Array.isArray(snapshot) ? snapshot.length : -1, 1, 'AI-03-P02 - one action item in the snapshot');
    const bValidation2 = await commonFunctions.compareTwoValues(snapshot?.[0]?.name, sourceItemName, 'AI-03-P02 - snapshot name');
    const bValidation3 = await commonFunctions.compareTwoValues(snapshot?.[0]?.id, sourceItemId, 'AI-03-P02 - snapshot id');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 3: AI-03-N01 templates without entityId return 400', async () => {
    const response = await helper.send('GET', templatesUrl(), null, 'AI-03-N01 missing entityId');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'AI-03-N01 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(String(response.data?.detail).includes('entityId'), true, 'AI-03-N01 - detail names entityId');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 4: AI-03-N02 templates without a token return 401', async () => {
    const response = await helper.send('GET', templatesUrl(ctx.processId), null, 'AI-03-N02 no token', { accept: 'application/json' });
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '401', 'AI-03-N02 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 5: AI-03-E01 templates for an unknown entity return an empty array', async () => {
    const response = await helper.sendUntilStatus('GET', templatesUrl(TestData.UNKNOWN_ID), null, 200, 'AI-03-E01 unknown entityId');
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(response.data), '[]', 'AI-03-E01 - empty array');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 6: AI-03-E03 entityId matching is case-insensitive', async () => {
    const lower = await helper.sendUntilStatus('GET', templatesUrl(ctx.processId.toLowerCase()), null, 200, 'AI-03-E03 lower-case entityId');
    const upper = await helper.sendUntilStatus('GET', templatesUrl(ctx.processId.toUpperCase()), null, 200, 'AI-03-E03 upper-case entityId');
    const bValidation1 = await commonFunctions.compareTwoValues(findTemplate(lower)?.name, templateName, 'AI-03-E03 - lower-case GUID finds the template');
    const bValidation2 = await commonFunctions.compareTwoValues(findTemplate(upper)?.name, templateName, 'AI-03-E03 - upper-case GUID finds the template');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 7: AI-03-E04 a second template with the same name is rejected', async () => {
    const response = await helper.send('POST', templatesUrl(), { name: templateName, entityId: ctx.processId, description: TestData.TEMPLATE_DESCRIPTION, ids: [sourceItemId] }, 'AI-03-E04 duplicate template name');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'AI-03-E04 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.errorCode, TestData.DUPLICATE_TEMPLATE_ERROR_CODE, 'AI-03-E04 - errorCode');
    const bValidation3 = await commonFunctions.compareTwoValues(response.data?.message, TestData.DUPLICATE_TEMPLATE_MESSAGE, 'AI-03-E04 - message');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 8: AI-03-E02 a deleted template is no longer listed and cannot be deleted again', async () => {
    const remove = await helper.write('DELETE', actionItemServiceUrl(`actionitemTemplates/${templateId}`), null, 200, 'AI-03-E02 delete template');
    templateDeleted = true;
    const response = await helper.sendUntilStatus('GET', templatesUrl(ctx.processId), null, 200, 'AI-03-E02 list templates after delete');
    const again = await helper.send('DELETE', actionItemServiceUrl(`actionitemTemplates/${templateId}`), null, 'AI-03-E02 delete template again');
    const bValidation1 = await commonFunctions.compareTwoValues(remove.data, TestData.TEMPLATE_DELETED_MESSAGE, 'AI-03-E02 - delete message');
    const bValidation2 = await commonFunctions.compareTwoValues(findTemplate(response), undefined, 'AI-03-E02 - template no longer listed');
    const bValidation3 = await commonFunctions.compareTwoValues(again.status, '404', 'AI-03-E02 - second delete Status Code Validation');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });
});
