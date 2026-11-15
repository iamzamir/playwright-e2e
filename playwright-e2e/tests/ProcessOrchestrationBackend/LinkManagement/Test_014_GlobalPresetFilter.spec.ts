import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { buildLinksUrl } from '../../../util/mapping.util';

const psEnv = process.env.PSENV ?? 'INTEROP';
const TestData = require('../../../testdata/' + psEnv + '/ProcessOrchestrationBackend/LinkManagement/Test_014_GlobalPresetFilter.json');

type PresetContext = { entityId: string; entityType: string; entityName: string };

const GLOBAL = '*';
const VIEW_ID: string = TestData.VIEW_ID;
const SUBPROCESS: PresetContext = TestData.SUBPROCESS;
const PROCESS: PresetContext = TestData.PROCESS;

test.describe.serial('Link Management - global preset filter', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;

  const globalCreateRequest = { viewId: VIEW_ID, entityId: GLOBAL, entityType: GLOBAL, filterId: TestData.GLOBAL_FILTER_ID, entityName: GLOBAL, applyToAllUsers: false };
  const globalClearRequest = { viewIds: [VIEW_ID], entityId: GLOBAL, entityType: GLOBAL };
  const subprocessClearRequest = { viewIds: [VIEW_ID], entityId: SUBPROCESS.entityId, entityType: SUBPROCESS.entityType };

  const createPreset = (body: Record<string, unknown>, label: string): Promise<any> => apiUtil.processAPIRequest('POST', buildLinksUrl('preset'), body, headers, label, 'full');
  const clearPreset = (body: Record<string, unknown>, label: string): Promise<any> => apiUtil.processAPIRequest('POST', buildLinksUrl('preset/clear'), body, headers, label, 'full');
  const searchPreset = (context: PresetContext, label: string): Promise<any> =>
    apiUtil.processAPIRequest('POST', buildLinksUrl('search-preset'), { viewIds: [VIEW_ID], entityId: context.entityId, entityType: context.entityType, entityName: context.entityName }, headers, label, 'full');

  const presetsOf = (response: any): any[] => (Array.isArray(response?.data?.presets) ? response.data.presets : []);
  // LM may return filter ids in a different case, so they are compared case-insensitively.
  const findPreset = (response: any, filterId: string): any => presetsOf(response).find((preset: any) => String(preset?.viewId) === VIEW_ID && String(preset?.filterId).toLowerCase() === filterId.toLowerCase());

  async function assertGlobalFallback(context: PresetContext, label: string): Promise<boolean[]> {
    const response = await searchPreset(context, label);
    const globalPreset = findPreset(response, TestData.GLOBAL_FILTER_ID);
    return [
      await commonFunctions.compareTwoValues(response.status, 200, `${label} - Status Code Validation`),
      await commonFunctions.compareTwoValues(!!globalPreset, true, `${label} - global preset is returned as the fallback`),
      await commonFunctions.compareTwoValues(globalPreset?.isGlobal, true, `${label} - fallback preset is flagged isGlobal`)
    ];
  }

  async function clearAll(): Promise<void> {
    for (const [body, label] of [[globalClearRequest, 'global'], [subprocessClearRequest, 'subprocess']] as const) {
      const response = await clearPreset(body, `Cleanup: clear ${label} preset`);
      await commonFunctions.logMessage('INFO', `Clear ${label} preset completed with status: ${response.status}`);
    }
  }

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    const accessToken = await apiUtil.getBearerToken();
    headers = { accept: 'application/json', Authorization: 'Bearer ' + accessToken };
    await clearAll();
  });

  test.afterAll(async () => {
    await clearAll();
  });

  test('Test Case 1: LM-V1-N01 clearing a global preset that does not exist is a 200 no-op', async () => {
    const response = await clearPreset(globalClearRequest, 'LM-V1-N01 clear missing global preset');
    const validations = [
      await commonFunctions.compareTwoValues(response.status, 200, 'LM-V1-N01 - Status Code Validation'),
      await commonFunctions.compareTwoValues(response.data, TestData.CLEAR_MESSAGE, 'LM-V1-N01 - clear message')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 2: LM-V1-P01 create a global preset with entityId and entityType "*"', async () => {
    const response = await createPreset(globalCreateRequest, 'LM-V1-P01 create global preset');
    const validations = [
      await commonFunctions.compareTwoValues(response.status, 201, 'LM-V1-P01 - Status Code Validation'),
      await commonFunctions.compareTwoValues(response.data?.viewId, VIEW_ID, 'LM-V1-P01 - viewId echoes the request'),
      await commonFunctions.compareTwoValues(response.data?.filterId, TestData.GLOBAL_FILTER_ID, 'LM-V1-P01 - filterId echoes the request', true),
      await commonFunctions.compareTwoValues(response.data?.entityId, GLOBAL, 'LM-V1-P01 - stored with the global entity id'),
      await commonFunctions.compareTwoValues(response.data?.entityType, GLOBAL, 'LM-V1-P01 - stored with the global entity type')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 3: LM-V1-P02 a subprocess with no preset of its own falls back to the global preset', async () => {
    const validations = await assertGlobalFallback(SUBPROCESS, 'LM-V1-P02 subprocess search');

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 4: LM-V1-P03 a process with no preset of its own falls back to the global preset', async () => {
    const validations = await assertGlobalFallback(PROCESS, 'LM-V1-P03 process search');

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 5: LM-V1-P05 an entity-specific preset replaces the global preset on the same view', async () => {
    const createResponse = await createPreset({ viewId: VIEW_ID, entityId: SUBPROCESS.entityId, entityType: SUBPROCESS.entityType, entityName: SUBPROCESS.entityName, filterId: TestData.ENTITY_FILTER_ID, applyToAllUsers: false }, 'LM-V1-P05 create subprocess preset');
    const searchResponse = await searchPreset(SUBPROCESS, 'LM-V1-P05 search with both presets');
    const presets = presetsOf(searchResponse);
    const entityPreset = findPreset(searchResponse, TestData.ENTITY_FILTER_ID);
    const globalPreset = findPreset(searchResponse, TestData.GLOBAL_FILTER_ID);
    test.info().annotations.push({ type: 'preset precedence', description: `global preset returned: ${!!globalPreset}; presets[0].filterId: ${presets[0]?.filterId}` });
    const validations = [
      await commonFunctions.compareTwoValues(createResponse.status, 201, 'LM-V1-P05 create - Status Code Validation'),
      await commonFunctions.compareTwoValues(searchResponse.status, 200, 'LM-V1-P05 search - Status Code Validation'),
      await commonFunctions.compareTwoValues(!!entityPreset, true, 'LM-V1-P05 - the entity-specific preset is returned'),
      await commonFunctions.compareTwoValues(entityPreset?.isGlobal, false, 'LM-V1-P05 - the entity-specific preset is not flagged isGlobal'),
      // FilterPresetService.searchPresetFilters keeps one preset per view and drops the one that does not match the requested entity.
      await commonFunctions.compareTwoValues(!!globalPreset, false, 'LM-V1-P05 - the global preset is dropped for that view')
    ];
    const clearResponse = await clearPreset(subprocessClearRequest, 'LM-V1-P05 clear subprocess preset');
    validations.push(await commonFunctions.compareTwoValues(clearResponse.status, 200, 'LM-V1-P05 clear subprocess preset - Status Code Validation'));
    validations.push(...(await assertGlobalFallback(SUBPROCESS, 'LM-V1-P05 search after entity preset cleared')));

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 6: LM-V1-P04 clearing the global preset removes the fallback', async () => {
    const clearResponse = await clearPreset(globalClearRequest, 'LM-V1-P04 clear global preset');
    const searchResponse = await searchPreset(SUBPROCESS, 'LM-V1-P04 subprocess search after clear');
    const validations = [
      await commonFunctions.compareTwoValues(clearResponse.status, 200, 'LM-V1-P04 clear - Status Code Validation'),
      await commonFunctions.compareTwoValues(clearResponse.data, TestData.CLEAR_MESSAGE, 'LM-V1-P04 - clear message'),
      await commonFunctions.compareTwoValues(searchResponse.status, 200, 'LM-V1-P04 search - Status Code Validation'),
      await commonFunctions.compareTwoValues(!!findPreset(searchResponse, TestData.GLOBAL_FILTER_ID), false, 'LM-V1-P04 - global preset is no longer returned')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 7: LM-V1-E01 a blank entityId is stored as a global preset', async () => {
    const response = await createPreset({ viewId: VIEW_ID, entityId: '', entityType: SUBPROCESS.entityType, filterId: TestData.GLOBAL_FILTER_ID, applyToAllUsers: false }, 'LM-V1-E01 create preset with blank entityId');
    const validations = [
      await commonFunctions.compareTwoValues(response.status, 201, 'LM-V1-E01 - Status Code Validation'),
      await commonFunctions.compareTwoValues(response.data?.entityId, GLOBAL, 'LM-V1-E01 - blank entityId is stored as "*"'),
      await commonFunctions.compareTwoValues(response.data?.entityType, GLOBAL, 'LM-V1-E01 - entityType is stored as "*"'),
      ...(await assertGlobalFallback(SUBPROCESS, 'LM-V1-E01 subprocess search'))
    ];
    await clearPreset(globalClearRequest, 'LM-V1-E01 cleanup: clear global preset');

    expect(validations.every(Boolean)).toBeTruthy();
  });
});
