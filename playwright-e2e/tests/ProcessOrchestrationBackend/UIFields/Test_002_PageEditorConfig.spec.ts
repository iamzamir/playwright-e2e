import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { buildUiFieldsUrl, compareWithBaseline, groupedFieldNames } from '../../../util/ui-fields.util';

const psEnv = process.env.PSENV ?? 'INTEROP';
const TestData = require('../../../testdata/' + psEnv + '/ProcessOrchestrationBackend/UIFields/Test_002_PageEditorConfig.json');

type EditorRef = { pageName: string; entityType: string };

const editorKey = (editor: EditorRef): string => `${editor.pageName}:${editor.entityType}`;

// Every case is an independent read-only GET, so one failure must not hide the others.
test.describe('UI Fields - page editor config', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;

  const editorUrl = (pageName: string, entityType?: string): string => buildUiFieldsUrl(`page/${encodeURIComponent(pageName)}/editor`, { entityType });

  async function getEditor(editor: EditorRef, label: string, requestHeaders: Record<string, string> = headers): Promise<any> {
    return apiUtil.processAPIRequest('GET', editorUrl(editor.pageName, editor.entityType), null, requestHeaders, label, 'full');
  }

  async function validateEditorGroups(groups: unknown, label: string): Promise<boolean> {
    const isNonEmptyArray = await commonFunctions.compareTwoValues(Array.isArray(groups) && groups.length > 0, true, `${label} - non-empty FieldGroupDto array`);
    if (!isNonEmptyArray) {
      return false;
    }
    const groupList = groups as any[];
    return commonFunctions.compareTwoValues(
      groupList.every((group) => (group?.groupName === null || typeof group?.groupName === 'string') && Array.isArray(group?.fields) && group.fields.length > 0 && group.fields.every((field: any) => typeof field?.name === 'string' && field.name.length > 0)),
      true,
      `${label} - every group has a groupName (or null header) and named fields`
    );
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
  });

  test('Test Case 1: UF-R1-P01 page editor returns the process editor layout', async () => {
    const processEditor = (TestData.EDITORS as EditorRef[]).find((editor) => editor.pageName === 'PROCESS_EDITOR_PAGE') as EditorRef;
    const response = await getEditor(processEditor, 'UF-R1-P01 process editor');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, 200, 'UF-R1-P01 - Status Code Validation');
    const bValidation2 = await validateEditorGroups(response.data, 'UF-R1-P01');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 2: UF-R1-P02 page editor serves the subprocess, calendar and cycle editors used by lui', async () => {
    const validations: boolean[] = [];
    for (const editor of (TestData.EDITORS as EditorRef[]).filter((candidate) => candidate.pageName !== 'PROCESS_EDITOR_PAGE')) {
      const response = await getEditor(editor, `UF-R1-P02 ${editorKey(editor)}`);
      validations.push(await commonFunctions.compareTwoValues(response.status, 200, `UF-R1-P02 ${editorKey(editor)} - Status Code Validation`));
      validations.push(await validateEditorGroups(response.data, `UF-R1-P02 ${editorKey(editor)}`));
    }

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 3: UF-R1-P03 page editor returns the process template editor and records the variant field', async () => {
    const response = await getEditor(TestData.TEMPLATE_EDITOR, 'UF-R1-P03 process template editor');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, 200, 'UF-R1-P03 - Status Code Validation');
    const bValidation2 = await validateEditorGroups(response.data, 'UF-R1-P03');
    const fieldNames = Object.values(groupedFieldNames(response.data)).flat();
    const variantPresent = fieldNames.includes(TestData.TEMPLATE_VARIANT_FIELD);
    // lui feature-flags the variant field, so it is recorded here and pinned per environment by P04.
    test.info().annotations.push({ type: 'variant field', description: `${TestData.TEMPLATE_VARIANT_FIELD} present: ${variantPresent}` });
    await commonFunctions.logMessage('INFO', `UF-R1-P03 - ${TestData.TEMPLATE_VARIANT_FIELD} field present on template editor: ${variantPresent}`);

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 4: UF-R1-P04 page editor group and field names match the environment baseline', async () => {
    const validations: boolean[] = [];
    for (const [key, expectedGroups] of Object.entries(TestData.EDITOR_BASELINE as Record<string, Record<string, string[]>>)) {
      const [pageName, entityType] = key.split(':');
      const response = await getEditor({ pageName, entityType }, `UF-R1-P04 editor baseline ${key}`);
      validations.push(await commonFunctions.compareTwoValues(response.status, 200, `UF-R1-P04 ${key} - Status Code Validation`));
      validations.push(await compareWithBaseline(commonFunctions, groupedFieldNames(response.data), expectedGroups, `UF-R1-P04 ${key} groups`));
    }

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 5: UF-R1-N01 page editor without entityType returns 400', async () => {
    const response = await apiUtil.processAPIRequest('GET', editorUrl('PROCESS_EDITOR_PAGE'), null, headers, 'UF-R1-N01 missing entityType', 'full');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'UF-R1-N01 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 6: UF-R1-N02 page editor without a token returns 401', async () => {
    const noTokenHeaders = { accept: 'application/json', 'Accept-Language': TestData.ACCEPT_LANGUAGE };
    const response = await getEditor({ pageName: 'PROCESS_EDITOR_PAGE', entityType: 'PROCESS' }, 'UF-R1-N02 without token', noTokenHeaders);
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '401', 'UF-R1-N02 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 7: UF-R1-E01 page editor with an unknown page name or entity mismatch returns 404', async () => {
    const unknownPage = await getEditor({ pageName: TestData.UNKNOWN_PAGE_NAME, entityType: 'PROCESS' }, 'UF-R1-E01 unknown page name');
    const mismatch = await getEditor({ pageName: 'PROCESS_EDITOR_PAGE', entityType: 'SUBPROCESS' }, 'UF-R1-E01 page/entity mismatch');
    const bValidation1 = await commonFunctions.compareTwoValues(unknownPage.status, '404', 'UF-R1-E01 unknown page - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(unknownPage.data?.errorCode, TestData.PAGE_NOT_FOUND_ERROR_CODE, 'UF-R1-E01 unknown page - errorCode Validation');
    const bValidation3 = await commonFunctions.compareTwoValues(mismatch.status, '404', 'UF-R1-E01 page/entity mismatch - Status Code Validation');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });
});
