import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { ActionItemApiHelper, ActionItemNodeContext, actionItemServiceUrl } from '../../../util/action-item.util';
import { compareWithBaseline, groupedFieldNames, sortedFieldNames } from '../../../util/ui-fields.util';

const psEnv = process.env.PSENV ?? 'INTEROP';
const gatewayType = (process.env.GATEWAY_TYPE || 'AZURE').toUpperCase();
const TestData = require('../../../testdata/' + psEnv + '/ProcessOrchestrationBackend/ActionItem/Test_006_ActionItemEditorAndFilterConfig.json');

const isUserPicker = (field: any): boolean => typeof field?.cmp === 'string' && field.cmp.endsWith('-user');
const allEditorFields = (groups: unknown): any[] => (Array.isArray(groups) ? groups.flatMap((group: any) => (Array.isArray(group?.fields) ? group.fields : [])) : []);
const sortedKeys = (values: unknown): string[] => (Array.isArray(values) ? values.map((value: any) => String(value?.key)).sort() : []);
// An entity without participants serialises the picker with no values property at all.
const pickerValues = (field: any): unknown => field?.values ?? [];

// Every case is an independent read-only GET, so one failure must not hide the others.
test.describe('Action Item editor and filter configuration (AI-01, AI-02)', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let helper: ActionItemApiHelper;
  let headers: Record<string, string>;
  let ctx: ActionItemNodeContext;
  let contextId: string;

  const configUrl = (route: 'editor' | 'filters', query: Record<string, string | undefined>): string => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        params.append(key, value);
      }
    }
    return actionItemServiceUrl(`actionitems/${route}?${params.toString()}`);
  };
  const getConfig = async (route: 'editor' | 'filters', query: Record<string, string | undefined>, label: string, requestHeaders: Record<string, string> = headers): Promise<any> => helper.send('GET', configUrl(route, query), null, label, requestHeaders);
  const getConfigOk = async (route: 'editor' | 'filters', query: Record<string, string | undefined>, label: string): Promise<any> => helper.sendUntilStatus('GET', configUrl(route, query), null, 200, label);

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    headers = { accept: 'application/json', Authorization: 'Bearer ' + await apiUtil.getBearerToken() };
    helper = new ActionItemApiHelper(apiUtil, headers);
    ctx = await helper.resolveNodeContext(TestData.PROCESS_NAME, TestData.SUBPROCESS_NAME);
    // QA Azure IntegratedBusinessPlanning has no actionItemEntityId, so the subprocess entity stands in.
    contextId = ctx.processEntityId ?? ctx.subprocessEntityId;
  });

  // ---------- AI-01 GET /actionitems/editor ----------

  test('Test Case 1: AI-01-P01 editor returns named field groups for a process context', async () => {
    const response = await getConfigOk('editor', { contextType: 'ENTITY', contextId }, 'AI-01-P01 editor process context');
    const groups = response.data?.groups;
    const bValidation1 = await commonFunctions.compareTwoValues(Array.isArray(groups) && groups.length > 0, true, 'AI-01-P01 - groups is a non-empty array');
    const bValidation2 = await commonFunctions.compareTwoValues(Array.isArray(groups) && groups.every((group: any) => Array.isArray(group?.fields)), true, 'AI-01-P01 - every group has a fields array');
    const bValidation3 = await commonFunctions.compareTwoValues(allEditorFields(groups).every((field) => typeof field?.name === 'string' && field.name.length > 0), true, 'AI-01-P01 - every field has a name');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 2: AI-01-P02 editor field names match the environment baseline', async () => {
    const response = await getConfigOk('editor', { contextType: 'ENTITY', contextId }, 'AI-01-P02 editor baseline');
    const bValidation1 = await compareWithBaseline(commonFunctions, groupedFieldNames(response.data?.groups), TestData.EXPECTED_EDITOR_FIELDS, 'AI-01-P02 editor field names');
    const names = allEditorFields(response.data?.groups).map((field) => field.name);
    const bValidation2 = await commonFunctions.compareTwoValues(['name', 'status', 'priority', 'actionType', 'dueDate'].every((name) => names.includes(name)), true, 'AI-01-P02 - required editor fields are present');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 3: AI-01-P03 editor default values match the baseline and commentsActive is normalised', async () => {
    const response = await getConfigOk('editor', { contextType: 'ENTITY', contextId }, 'AI-01-P03 editor default values');
    const fields = allEditorFields(response.data?.groups);
    const defaults: Record<string, string[]> = {};
    for (const field of fields.filter((candidate) => Array.isArray(candidate?.defaultValue) && candidate.defaultValue.length > 0)) {
      defaults[field.name] = sortedKeys(field.defaultValue);
    }
    const bValidation1 = await compareWithBaseline(commonFunctions, defaults, TestData.EXPECTED_EDITOR_DEFAULTS, 'AI-01-P03 editor default value keys');
    const commentsActive = fields.find((field) => field.name === 'commentsActive');
    test.info().annotations.push({ type: 'commentsActive', description: commentsActive ? 'configured' : `not configured in ${psEnv} ${gatewayType}` });
    const commentsKeys = sortedKeys(commentsActive?.defaultValue);
    const bValidation2 = await commonFunctions.compareTwoValues(commentsKeys.every((key) => key === 'true' || key === 'false'), true, 'AI-01-P03 - commentsActive default keys are "true" or "false"');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 4: AI-01-P04 editor for a subprocess context returns the same fields', async () => {
    const response = await getConfigOk('editor', { contextType: 'ENTITY', contextId: ctx.subprocessEntityId }, 'AI-01-P04 editor subprocess context');
    const bValidation1 = await compareWithBaseline(commonFunctions, groupedFieldNames(response.data?.groups), TestData.EXPECTED_EDITOR_FIELDS, 'AI-01-P04 subprocess editor field names');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 5: AI-01-P05 user-picker fields expose a participant value list', async () => {
    const response = await getConfigOk('editor', { contextType: 'ENTITY', contextId }, 'AI-01-P05 editor user pickers');
    const pickers = allEditorFields(response.data?.groups).filter(isUserPicker);
    const bValidation1 = await commonFunctions.compareTwoValues(JSON.stringify(pickers.map((field) => field.name).sort()), JSON.stringify(TestData.EXPECTED_USER_PICKERS), 'AI-01-P05 - user-picker fields');
    test.info().annotations.push({ type: 'participants', description: pickers.map((field) => `${field.name}: ${(pickerValues(field) as any[]).length ?? 0}`).join(', ') });
    const bValidation2 = await commonFunctions.compareTwoValues(pickers.every((field) => {
      const values = pickerValues(field);
      return Array.isArray(values) && values.every((value: any) => typeof value?.id === 'string' && value.id.length > 0);
    }), true, 'AI-01-P05 - every picker value list is an array of participants with an id');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 6: AI-01-N01 editor without contextType returns 400', async () => {
    const response = await getConfig('editor', { contextId }, 'AI-01-N01 editor missing contextType');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'AI-01-N01 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(String(response.data?.detail).includes('contextType'), true, 'AI-01-N01 - detail names contextType');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 7: AI-01-N02 editor without contextId returns 400', async () => {
    const response = await getConfig('editor', { contextType: 'ENTITY' }, 'AI-01-N02 editor missing contextId');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'AI-01-N02 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(String(response.data?.detail).includes('contextId'), true, 'AI-01-N02 - detail names contextId');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 8: AI-01-N03 editor without a token returns 401', async () => {
    const response = await getConfig('editor', { contextType: 'ENTITY', contextId }, 'AI-01-N03 editor no token', { accept: 'application/json' });
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '401', 'AI-01-N03 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 9: AI-01-E01 editor with an unknown contextType returns 400 illegal argument', async () => {
    const response = await getConfig('editor', { contextType: TestData.INVALID_CONTEXT_TYPE, contextId }, 'AI-01-E01 editor contextType FOO');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'AI-01-E01 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.errorCode, TestData.ILLEGAL_ARGUMENT_ERROR_CODE, 'AI-01-E01 - errorCode');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 10: AI-01-E02 editor contextType is case-sensitive', async () => {
    const response = await getConfig('editor', { contextType: 'entity', contextId }, 'AI-01-E02 editor lower-case contextType');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'AI-01-E02 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.errorCode, TestData.ILLEGAL_ARGUMENT_ERROR_CODE, 'AI-01-E02 - errorCode');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 11: AI-01-E03 editor with an unknown contextId returns the fields with empty user pickers', async () => {
    const response = await getConfigOk('editor', { contextType: 'ENTITY', contextId: TestData.UNKNOWN_ID }, 'AI-01-E03 editor unknown contextId');
    const pickers = allEditorFields(response.data?.groups).filter(isUserPicker);
    const bValidation1 = await compareWithBaseline(commonFunctions, groupedFieldNames(response.data?.groups), TestData.EXPECTED_EDITOR_FIELDS, 'AI-01-E03 editor field names');
    const bValidation2 = await commonFunctions.compareTwoValues(pickers.length > 0 && pickers.every((field) => JSON.stringify(pickerValues(field)) === '[]'), true, 'AI-01-E03 - user-picker values are empty');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 12: AI-01-E04 editor returns the same field names for another Accept-Language', async () => {
    const response = await helper.send('GET', configUrl('editor', { contextType: 'ENTITY', contextId }), null, 'AI-01-E04 editor alternate locale', { ...headers, 'Accept-Language': TestData.ALT_ACCEPT_LANGUAGE });
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, 200, 'AI-01-E04 - Status Code Validation');
    const bValidation2 = await compareWithBaseline(commonFunctions, groupedFieldNames(response.data?.groups), TestData.EXPECTED_EDITOR_FIELDS, `AI-01-E04 editor field names (${TestData.ALT_ACCEPT_LANGUAGE})`);

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  // ---------- AI-02 GET /actionitems/filters ----------

  test('Test Case 13: AI-02-P01 filters returns named filters with value lists', async () => {
    const response = await getConfigOk('filters', { contextType: 'ENTITY', contextId }, 'AI-02-P01 filters process context');
    const filters = response.data?.filters;
    const bValidation1 = await commonFunctions.compareTwoValues(Array.isArray(filters) && filters.length > 0, true, 'AI-02-P01 - filters is a non-empty array');
    const invalid = (Array.isArray(filters) ? filters : []).filter((filter: any) =>
      typeof filter?.name !== 'string' || typeof filter?.displayName !== 'string' || typeof filter?.cmp !== 'string' || !Array.isArray(filter?.values));
    const bValidation2 = await commonFunctions.compareTwoValues(JSON.stringify(invalid.map((filter: any) => filter?.name)), '[]', 'AI-02-P01 - every filter has name, displayName, cmp and values');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 14: AI-02-P02 filter names match the environment baseline and code filters carry keyed values', async () => {
    const response = await getConfigOk('filters', { contextType: 'ENTITY', contextId }, 'AI-02-P02 filters baseline');
    const filters: any[] = response.data?.filters ?? [];
    const bValidation1 = await compareWithBaseline(commonFunctions, sortedFieldNames(filters), TestData.EXPECTED_FILTERS[gatewayType], `AI-02-P02 filter names (${gatewayType})`);
    const codeFilters = filters.filter((filter) => ['status', 'priority', 'actionType'].includes(filter.name));
    const bValidation2 = await commonFunctions.compareTwoValues(codeFilters.length, 3, 'AI-02-P02 - status, priority and actionType filters are present');
    const bValidation3 = await commonFunctions.compareTwoValues(codeFilters.every((filter) => filter.values.length > 0 && filter.values.every((value: any) => typeof value?.key === 'string' && typeof value?.displayName === 'string')), true, 'AI-02-P02 - code filter values have key and displayName');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 15: AI-02-P03 status, priority and actionType codes match the environment baseline', async () => {
    const response = await getConfigOk('filters', { contextType: 'ENTITY', contextId }, 'AI-02-P03 filter codes');
    const codes: Record<string, string[]> = {};
    for (const filter of (response.data?.filters ?? []).filter((candidate: any) => ['status', 'priority', 'actionType'].includes(candidate.name))) {
      codes[filter.name] = sortedKeys(filter.values);
    }
    const bValidation1 = await compareWithBaseline(commonFunctions, codes, TestData.EXPECTED_FILTER_CODES, 'AI-02-P03 filter codes');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 16: AI-02-P04 filters for a subprocess context return the same filters', async () => {
    const response = await getConfigOk('filters', { contextType: 'ENTITY', contextId: ctx.subprocessEntityId }, 'AI-02-P04 filters subprocess context');
    const bValidation1 = await compareWithBaseline(commonFunctions, sortedFieldNames(response.data?.filters), TestData.EXPECTED_FILTERS[gatewayType], `AI-02-P04 subprocess filter names (${gatewayType})`);

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 17: AI-02-N01 filters without contextType or contextId return 400', async () => {
    const missingType = await getConfig('filters', { contextId }, 'AI-02-N01 filters missing contextType');
    const missingId = await getConfig('filters', { contextType: 'ENTITY' }, 'AI-02-N01 filters missing contextId');
    const bValidation1 = await commonFunctions.compareTwoValues(missingType.status, '400', 'AI-02-N01 missing contextType - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(missingId.status, '400', 'AI-02-N01 missing contextId - Status Code Validation');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 18: AI-02-N02 filters without a token return 401', async () => {
    const response = await getConfig('filters', { contextType: 'ENTITY', contextId }, 'AI-02-N02 filters no token', { accept: 'application/json' });
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '401', 'AI-02-N02 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 19: AI-02-E02 filters with an unknown contextId return 200', async () => {
    const response = await getConfigOk('filters', { contextType: 'ENTITY', contextId: TestData.UNKNOWN_ID }, 'AI-02-E02 filters unknown contextId');
    const bValidation1 = await compareWithBaseline(commonFunctions, sortedFieldNames(response.data?.filters), TestData.EXPECTED_FILTERS[gatewayType], `AI-02-E02 filter names (${gatewayType})`);

    expect(bValidation1).toBeTruthy();
  });
});
