import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { ActionItemApiHelper, processOrchestrationUrl, uniqueRunId } from '../../../util/action-item.util';

const psEnv = process.env.PSENV ?? 'INTEROP';
const TestData = require('../../../testdata/' + psEnv + '/ProcessOrchestrationBackend/ProcessBatch/Test_009_SupplyChainActionCrud.json');

const runPrefix = `${TestData.SCA_NAME_PREFIX}${uniqueRunId()}`;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

test.describe.serial('Supply chain action CRUD (PO-15 to PO-19)', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let helper: ActionItemApiHelper;
  let headers: Record<string, string>;
  let created: any;
  let tenantId: string;

  const listUrl = processOrchestrationUrl('supplyChainAction');
  const itemUrl = (id: string): string => processOrchestrationUrl(`supplyChainAction/${encodeURIComponent(id)}`);
  const body = (suffix: string, overrides: Record<string, unknown> = {}): Record<string, unknown> => ({ name: `${runPrefix}${suffix}`, type: TestData.TYPE, description: TestData.DESCRIPTION, procedureName: TestData.PROCEDURE_NAME, uiConfig: TestData.UI_CONFIG, ...overrides });
  const listAll = async (label: string): Promise<any[]> => {
    const response = await helper.sendUntilStatus('GET', listUrl, null, 200, label);
    return Array.isArray(response.data) ? response.data : [];
  };
  const findByName = async (name: unknown): Promise<any | undefined> => (await listAll(`Find supply chain action ${String(name)}`)).find((item) => item?.name === name);
  const create = async (payload: Record<string, unknown>, label: string): Promise<any> => helper.write('POST', listUrl, payload, 201, label, { findCommitted: () => findByName(payload.name) });

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    headers = { accept: 'application/json', Authorization: 'Bearer ' + await apiUtil.getBearerToken() };
    helper = new ActionItemApiHelper(apiUtil, headers);
  });

  test.afterAll(async () => {
    const leftovers = (await listAll('Find supply chain actions to clean up')).filter((item) => String(item?.name).startsWith(runPrefix));
    const results: boolean[] = [];
    for (const item of leftovers) {
      const response = await helper.send('DELETE', itemUrl(item.id), null, `Cleanup supply chain action ${item.name}`);
      results.push(response.status === 200 || response.status === '404');
    }
    expect(results.every(Boolean)).toBeTruthy();
  });

  test('Test Case 1: PO-16-P01 POST creates the supply chain action with server-owned fields', async () => {
    const payload = body('');
    const response = await create(payload, 'PO-16-P01 create supply chain action');
    created = response.data;
    tenantId = created?.tenantId;
    const bValidation1 = await commonFunctions.compareTwoValues(UUID_PATTERN.test(String(created?.id)), true, 'PO-16-P01 - id is a UUID');
    const bValidation2 = await commonFunctions.compareTwoValues(JSON.stringify([created?.name, created?.type, created?.description, created?.procedureName, created?.uiConfig]), JSON.stringify([payload.name, payload.type, payload.description, payload.procedureName, payload.uiConfig]), 'PO-16-P01 - submitted fields are echoed');
    const bValidation3 = await commonFunctions.compareTwoValues(created?.isActive === true && created?.isEnabled === true, true, 'PO-16-P01 - isActive and isEnabled are true');
    const bValidation4 = await commonFunctions.compareTwoValues(typeof tenantId === 'string' && tenantId.length > 0, true, 'PO-16-P01 - tenantId is set from the token');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test('Test Case 2: PO-16-P02 client values for id, tenantId, isActive and isEnabled are overridden', async () => {
    const response = await create(body('_override', { id: TestData.CLIENT_SUPPLIED_ID, tenantId: 'PWNotMyTenant', isActive: false, isEnabled: false }), 'PO-16-P02 create with client-owned fields');
    const bValidation1 = await commonFunctions.compareTwoValues(UUID_PATTERN.test(String(response.data?.id)) && response.data?.id !== TestData.CLIENT_SUPPLIED_ID, true, 'PO-16-P02 - server generates a new id');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.tenantId, tenantId, 'PO-16-P02 - tenantId comes from the token');
    const bValidation3 = await commonFunctions.compareTwoValues(response.data?.isActive === true && response.data?.isEnabled === true, true, 'PO-16-P02 - isActive and isEnabled are forced to true');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 3: PO-16-E03 description is optional', async () => {
    const payload = body('_nodescription');
    delete payload.description;
    const response = await create(payload, 'PO-16-E03 create without description');
    const bValidation1 = await commonFunctions.compareTwoValues(response.data?.name, payload.name, 'PO-16-E03 - name');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.description ?? null, null, 'PO-16-E03 - description is null');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 4: PO-15-P01 PO-15-P03 the list holds the created actions with the endpoint header', async () => {
    const response = await helper.sendUntilStatus('GET', listUrl, null, 200, 'PO-15-P01 list supply chain actions');
    const items = Array.isArray(response.data) ? response.data : [];
    const listed = items.find((item: any) => item?.id === created?.id);
    const malformed = items.filter((item: any) => !(typeof item?.id === 'string' && typeof item?.name === 'string' && typeof item?.procedureName === 'string' && typeof item?.isActive === 'boolean' && typeof item?.isEnabled === 'boolean'));
    const bValidation1 = await commonFunctions.compareTwoValues(Array.isArray(response.data), true, 'PO-15-P01 - body is an array');
    const bValidation2 = await commonFunctions.compareTwoValues(malformed.map((item: any) => item?.id).join(','), '', 'PO-15-P01 - every item has id, name, procedureName, isActive and isEnabled');
    const bValidation3 = await commonFunctions.compareTwoValues(JSON.stringify([listed?.name, listed?.type, listed?.procedureName]), JSON.stringify([created?.name, created?.type, created?.procedureName]), 'PO-15-P03 - the created action is listed');
    const bValidation4 = await commonFunctions.compareTwoValues(response.headers?.endpoint, '/supplyChainAction', 'PO-15-P01 - endpoint header');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test('Test Case 5: PO-17-P01 GET by id returns the action and a parseable uiConfig', async () => {
    const response = await helper.sendUntilStatus('GET', itemUrl(created.id), null, 200, 'PO-17-P01 get supply chain action');
    let uiConfigParses = true;
    try {
      JSON.parse(response.data?.uiConfig);
    } catch {
      uiConfigParses = false;
    }
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify([response.data?.id, response.data?.name, response.data?.type, response.data?.description, response.data?.procedureName]), JSON.stringify([created.id, created.name, created.type, created.description, created.procedureName]), 'PO-17-P01 - fields equal the created action');
    const bValidation2 = await commonFunctions.compareTwoValues(uiConfigParses, true, 'PO-17-P01 - uiConfig is valid JSON (planning-mfe JSON.parses it)');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 6: PO-16-N01 a duplicate name violates the unique constraint', async () => {
    const response = await helper.send('POST', listUrl, body(''), 'PO-16-N01 duplicate name');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'PO-16-N01 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.errorCode, TestData.CONSTRAINT_ERROR_CODE, 'PO-16-N01 - errorCode');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 7: PO-16-N02 a missing name or procedureName is rejected', async () => {
    const noName = body('_noname');
    delete noName.name;
    const noProcedure = body('_noprocedure');
    delete noProcedure.procedureName;
    const validations: boolean[] = [];
    for (const [label, payload] of [['name', noName], ['procedureName', noProcedure]] as const) {
      const response = await helper.send('POST', listUrl, payload, `PO-16-N02 missing ${label}`);
      validations.push(await commonFunctions.compareTwoValues(response.status, '400', `PO-16-N02 - missing ${label} Status Code Validation`));
      validations.push(await commonFunctions.compareTwoValues(response.data?.errorCode, TestData.CONSTRAINT_ERROR_CODE, `PO-16-N02 - missing ${label} errorCode`));
    }

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 8: PO-16-N03 PO-16-N04 malformed JSON returns 400 and a missing token returns 401', async () => {
    const malformed = await apiUtil.processRawRequest('POST', listUrl, '{"name":', headers, 'PO-16-N03 malformed JSON');
    const noToken = await helper.send('POST', listUrl, body('_notoken'), 'PO-16-N04 no token', { accept: 'application/json' });
    const bValidation1 = await commonFunctions.compareTwoValues(malformed.status, '400', 'PO-16-N03 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(malformed.data?.errorCode, TestData.INVALID_JSON_ERROR_CODE, 'PO-16-N03 - errorCode');
    const bValidation3 = await commonFunctions.compareTwoValues(noToken.status, '401', 'PO-16-N04 - Status Code Validation');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 9: PO-17-N01 PO-17-N02 an unknown or non-UUID id returns 404 with no body', async () => {
    const unknown = await helper.send('GET', itemUrl(TestData.UNKNOWN_ID), null, 'PO-17-N01 unknown id');
    const notUuid = await helper.send('GET', itemUrl('abc'), null, 'PO-17-N02 non-UUID id');
    const bValidation1 = await commonFunctions.compareTwoValues(unknown.status, '404', 'PO-17-N01 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(unknown.data ?? '', '', 'PO-17-N01 - body is empty');
    const bValidation3 = await commonFunctions.compareTwoValues(notUuid.status, '404', 'PO-17-N02 - Status Code Validation');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 10: PO-18-P01 PUT replaces the action and GET reflects it', async () => {
    const payload = body('', { description: TestData.UPDATED_DESCRIPTION });
    const response = await helper.write('PUT', itemUrl(created.id), payload, 200, 'PO-18-P01 update supply chain action', { idempotent: true });
    const stored = await helper.sendUntilStatus('GET', itemUrl(created.id), null, 200, 'PO-18-P01 get after update');
    const bValidation1 = await commonFunctions.compareTwoValues(response.data?.id, created.id, 'PO-18-P01 - id is unchanged');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.description, TestData.UPDATED_DESCRIPTION, 'PO-18-P01 - response has the new description');
    const bValidation3 = await commonFunctions.compareTwoValues(stored.data?.description, TestData.UPDATED_DESCRIPTION, 'PO-18-P01 - GET has the new description');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 11: PO-18-P02 PUT ignores isActive and isEnabled', async () => {
    const response = await helper.write('PUT', itemUrl(created.id), body('', { description: TestData.UPDATED_DESCRIPTION, isActive: false, isEnabled: false }), 200, 'PO-18-P02 update with isActive false', { idempotent: true });
    const stored = await helper.sendUntilStatus('GET', itemUrl(created.id), null, 200, 'PO-18-P02 get after update');
    const bValidation1 = await commonFunctions.compareTwoValues(response.data?.isActive === true && response.data?.isEnabled === true, true, 'PO-18-P02 - response keeps isActive and isEnabled true');
    const bValidation2 = await commonFunctions.compareTwoValues(stored.data?.isActive === true && stored.data?.isEnabled === true, true, 'PO-18-P02 - GET keeps isActive and isEnabled true');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 12: PO-18-N01 to N03 PUT on an unknown id, with a partial body or onto an existing name fails', async () => {
    const unknown = await helper.send('PUT', itemUrl(TestData.UNKNOWN_ID), body('_unknown'), 'PO-18-N01 unknown id');
    const partial = await helper.send('PUT', itemUrl(created.id), { description: TestData.UPDATED_DESCRIPTION }, 'PO-18-N02 partial body');
    const rename = await helper.send('PUT', itemUrl(created.id), body('_override'), 'PO-18-N03 rename onto an existing name');
    const stored = await helper.sendUntilStatus('GET', itemUrl(created.id), null, 200, 'PO-18-N03 get after the failed updates');
    const bValidation1 = await commonFunctions.compareTwoValues(unknown.status, '404', 'PO-18-N01 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(unknown.data?.errorCode, TestData.NOT_FOUND_ERROR_CODE, 'PO-18-N01 - errorCode');
    const bValidation3 = await commonFunctions.compareTwoValues(partial.status, '400', 'PO-18-N02 - partial body Status Code Validation');
    const bValidation4 = await commonFunctions.compareTwoValues(rename.status, '400', 'PO-18-N03 - rename Status Code Validation');
    const bValidation5 = await commonFunctions.compareTwoValues(rename.data?.errorCode, TestData.CONSTRAINT_ERROR_CODE, 'PO-18-N03 - errorCode');
    const bValidation6 = await commonFunctions.compareTwoValues(stored.data?.name, created.name, 'PO-18-N03 - the stored name is unchanged');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6).toBeTruthy();
  });

  test('Test Case 13: PO-19-P01 DELETE removes the action from GET and from the list', async () => {
    const response = await helper.write('DELETE', itemUrl(created.id), null, 200, 'PO-19-P01 delete supply chain action', { findCommitted: async () => (await findByName(created.name)) ? undefined : TestData.DELETE_MESSAGE.replace('{id}', created.id) });
    const afterDelete = await helper.send('GET', itemUrl(created.id), null, 'PO-19-P01 get after delete');
    const listed = await findByName(created.name);
    const bValidation1 = await commonFunctions.compareTwoValues(response.data, TestData.DELETE_MESSAGE.replace('{id}', created.id), 'PO-19-P01 - success message');
    const bValidation2 = await commonFunctions.compareTwoValues(afterDelete.status, '404', 'PO-19-P01 - GET returns 404');
    const bValidation3 = await commonFunctions.compareTwoValues(listed, undefined, 'PO-19-P01 - the action is no longer listed');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 14: PO-19-N01 PO-19-N02 deleting again returns 404 and a missing token returns 401', async () => {
    const again = await helper.send('DELETE', itemUrl(created.id), null, 'PO-19-N01 delete again');
    const noToken = await helper.send('DELETE', itemUrl(created.id), null, 'PO-19-N02 no token', { accept: 'application/json' });
    const bValidation1 = await commonFunctions.compareTwoValues(again.status, '404', 'PO-19-N01 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(again.data?.errorCode, TestData.NOT_FOUND_ERROR_CODE, 'PO-19-N01 - errorCode');
    const bValidation3 = await commonFunctions.compareTwoValues(noToken.status, '401', 'PO-19-N02 - Status Code Validation');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 15: PO-15-N01 PO-17-N03 list and read without a token return 401', async () => {
    const list = await helper.send('GET', listUrl, null, 'PO-15-N01 no token', { accept: 'application/json' });
    const read = await helper.send('GET', itemUrl(TestData.UNKNOWN_ID), null, 'PO-17-N03 no token', { accept: 'application/json' });
    const bValidation1 = await commonFunctions.compareTwoValues(list.status, '401', 'PO-15-N01 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(read.status, '401', 'PO-17-N03 - Status Code Validation');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });
});
