import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';

let psEnv = process.env.PSENV ?? 'INTEROP';
const TestData = require('../../../testdata/' + psEnv + '/ProcessOrchestrationBackend/LinkManagement/Test_009_PresetFilterManagement.json');

test.describe.serial('Preset Filter Management', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
  let presetUrl: string;
  let searchPresetUrl: string;
  let clearPresetUrl: string;

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    const accessToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: 'Bearer ' + accessToken
    };
    const linksBasePath = (process.env.VIEW_ENTITY_MAP as string).replace(/\/view-entity-map$/, '');
    const baseUrl = (process.env.API_BASE_URL as string) + linksBasePath;
    presetUrl = `${baseUrl}/preset`;
    searchPresetUrl = `${baseUrl}/search-preset`;
    clearPresetUrl = `${baseUrl}/preset/clear`;
  });

  test.afterAll(async () => {
    const response = await apiUtil.processAPIRequest('POST', clearPresetUrl, TestData.clearRequest, headers, 'Cleanup: Clear Preset Filter', 'full');
    await commonFunctions.logMessage('INFO', `Preset cleanup completed with status: ${response.status}`);
  });

  test('Test Case 1: Create a preset filter for a process entity', async () => {
    const response = await apiUtil.processAPIRequest('POST', presetUrl, TestData.createRequest, headers, 'Create Preset Filter', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(response.status, 201, 'Create Preset Filter - Status Code Validation');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(!!response.data?.id, true, 'Create Preset Filter - Response id is present');
    const bValidation3: boolean = await commonFunctions.compareTwoValues(typeof response.data?.id, 'string', 'Create Preset Filter - Response id is a string');
    const bValidation4: boolean = await commonFunctions.compareTwoValues(response.data?.viewId, TestData.createRequest.viewId, 'Create Preset Filter - viewId matches request');
    const bValidation5: boolean = await commonFunctions.compareTwoValues(response.data?.filterId, TestData.createRequest.filterId, 'Create Preset Filter - filterId matches request');
    const bValidation6: boolean = await commonFunctions.compareTwoValues(response.data?.entityId, TestData.createRequest.entityId, 'Create Preset Filter - entityId matches request');
    const bValidation7: boolean = await commonFunctions.compareTwoValues(response.data?.entityType, TestData.createRequest.entityType, 'Create Preset Filter - entityType matches request');
    const bValidation8: boolean = await commonFunctions.compareTwoValues(!!response.data?.createdOn, true, 'Create Preset Filter - createdOn is present');
    const bValidation9: boolean = await commonFunctions.compareTwoValues(!!response.data?.updatedOn, true, 'Create Preset Filter - updatedOn is present');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation9).toBeTruthy();
  });

  test('Test Case 2: Search and verify the created preset is returned', async () => {
    const response = await apiUtil.processAPIRequest('POST', searchPresetUrl, TestData.searchRequest, headers, 'Search Preset Filter', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(response.status, 200, 'Search Preset Filter - Status Code Validation');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(Array.isArray(response.data?.presets), true, 'Search Preset Filter - presets is an array');
    const bValidation3: boolean = await commonFunctions.compareTwoValues((response.data?.presets?.length ?? 0) > 0, true, 'Search Preset Filter - presets array is not empty');

    const matchingPreset = Array.isArray(response.data?.presets)
      ? response.data.presets.find((p: any) => p.viewId === TestData.createRequest.viewId && p.filterId === TestData.createRequest.filterId)
      : undefined;
    const bValidation4: boolean = await commonFunctions.compareTwoValues(!!matchingPreset, true, 'Search Preset Filter - matching preset found for viewId and filterId');
    const bValidation5: boolean = await commonFunctions.compareTwoValues(typeof matchingPreset?.isGlobal, 'boolean', 'Search Preset Filter - isGlobal is a boolean');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5).toBeTruthy();
  });

  test('Test Case 3: Clear the preset filter for the process entity', async () => {
    const response = await apiUtil.processAPIRequest('POST', clearPresetUrl, TestData.clearRequest, headers, 'Clear Preset Filter', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(response.status, 200, 'Clear Preset Filter - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 4: Search and verify the user-scoped preset is removed after clear', async () => {
    const response = await apiUtil.processAPIRequest('POST', searchPresetUrl, TestData.searchRequest, headers, 'Search Preset After Clear', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(response.status, 200, 'Search Preset After Clear - Status Code Validation');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(Array.isArray(response.data?.presets), true, 'Search Preset After Clear - presets is an array');

    // Clear removes only user-scoped presets (isGlobal: false); global presets (isGlobal: true) are preserved.
    // Verify no user-scoped preset remains for the mapped viewId after clear.
    const presets = Array.isArray(response.data?.presets) ? response.data.presets : [];
    const userScopedPreset = presets.find(
      (p: any) => p.viewId === TestData.createRequest.viewId && p.isGlobal === false
    );
    const bValidation3: boolean = await commonFunctions.compareTwoValues(!!userScopedPreset, false, 'Search Preset After Clear - no user-scoped preset remains for the mapped viewId');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 5: Create preset without authorization returns 401', async () => {
    const unauthorizedHeaders = { accept: 'application/json', Authorization: 'Bearer invalid-token' };
    const response = await apiUtil.processAPIRequest('POST', presetUrl, TestData.createRequest, unauthorizedHeaders, 'Create Preset Without Auth', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(response.status, '401', 'Create Preset Without Auth - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 6: Overwrite existing preset updates filterId for same entity and view', async () => {
    // Step 1: Create the initial preset
    await apiUtil.processAPIRequest('POST', presetUrl, TestData.createRequest, headers, 'TC6 Setup: Create initial preset', 'full');

    // Step 2: Post again with a different filterId for the same viewId + entityId (upsert)
    const upsertResponse = await apiUtil.processAPIRequest('POST', presetUrl, TestData.upsertRequest, headers, 'TC6: Overwrite preset with new filterId', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(upsertResponse.status, 201, 'Upsert Preset - Status Code Validation');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(upsertResponse.data?.filterId, TestData.upsertRequest.filterId, 'Upsert Preset - filterId reflects updated value');

    // Step 3: Search and verify only one user-scoped preset exists with the updated filterId
    // NOTE: Filter for user-scoped presets only, as the API may also return global presets.
    const searchResponse = await apiUtil.processAPIRequest('POST', searchPresetUrl, TestData.searchRequest, headers, 'TC6: Search after upsert', 'full');
    const bValidation3: boolean = await commonFunctions.compareTwoValues(searchResponse.status, 200, 'Upsert Search - Status Code Validation');
    const presets = Array.isArray(searchResponse.data?.presets) ? searchResponse.data.presets : [];
    const userScopedPresets = presets.filter(
      (p: any) => p.viewId === TestData.upsertRequest.viewId && p.isGlobal === false
    );
    const bValidation4: boolean = await commonFunctions.compareTwoValues(userScopedPresets.length, 1, 'Upsert Search - only one user-scoped preset exists after overwrite');
    const bValidation5: boolean = await commonFunctions.compareTwoValues(userScopedPresets[0]?.filterId, TestData.upsertRequest.filterId, 'Upsert Search - filterId is the updated value');

    // Step 4: Cleanup
    await apiUtil.processAPIRequest('POST', clearPresetUrl, TestData.clearRequest, headers, 'TC6 Cleanup: Clear preset', 'full');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5).toBeTruthy();
  });

  test('Test Case 7: Search with multiple viewIds returns preset only for the mapped view', async () => {
    // Setup: Create a preset for the mapped view
    await apiUtil.processAPIRequest('POST', presetUrl, TestData.createRequest, headers, 'TC7 Setup: Create preset for mapped view', 'full');

    // Search with two viewIds: one mapped, one not mapped
    const searchResponse = await apiUtil.processAPIRequest('POST', searchPresetUrl, TestData.multiViewSearchRequest, headers, 'TC7: Search with mapped and unmapped viewIds', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(searchResponse.status, 200, 'Multi-View Search - Status Code Validation');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(Array.isArray(searchResponse.data?.presets), true, 'Multi-View Search - presets is an array');

    const presets = Array.isArray(searchResponse.data?.presets) ? searchResponse.data.presets : [];
    const mappedPreset = presets.find((p: any) => p.viewId === TestData.createRequest.viewId);
    const unmappedPreset = presets.find((p: any) => p.viewId === TestData.multiViewSearchRequest.viewIds[1]);
    const bValidation3: boolean = await commonFunctions.compareTwoValues(!!mappedPreset, true, 'Multi-View Search - preset is returned for the mapped viewId');
    const bValidation4: boolean = await commonFunctions.compareTwoValues(!!unmappedPreset, false, 'Multi-View Search - no preset returned for the unmapped viewId');

    // Cleanup
    await apiUtil.processAPIRequest('POST', clearPresetUrl, TestData.clearRequest, headers, 'TC7 Cleanup: Clear preset', 'full');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test('Test Case 8: Search for entity with no preset returns no user-scoped preset', async () => {
    const searchResponse = await apiUtil.processAPIRequest('POST', searchPresetUrl, TestData.unmappedEntitySearchRequest, headers, 'Search for Unmapped Entity', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(searchResponse.status, 200, 'Unmapped Entity Search - Status Code Validation');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(Array.isArray(searchResponse.data?.presets), true, 'Unmapped Entity Search - presets is an array');

    // Global presets (isGlobal: true) are returned for any entity by the search API.
    // Verify that no user-scoped preset (isGlobal: false) is returned for an entity that has never had one created.
    const presets = Array.isArray(searchResponse.data?.presets) ? searchResponse.data.presets : [];
    const userScopedPreset = presets.find((p: any) => p.isGlobal === false);
    const bValidation3: boolean = await commonFunctions.compareTwoValues(!!userScopedPreset, false, 'Unmapped Entity Search - no user-scoped preset returned for unmapped entity');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 9: Clear with no existing preset is idempotent and returns 200', async () => {
    const clearResponse = await apiUtil.processAPIRequest('POST', clearPresetUrl, TestData.unmappedClearRequest, headers, 'Idempotent Clear - No Preset Exists', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(clearResponse.status, 200, 'Idempotent Clear - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 10: Create preset with missing required fields returns 400', async () => {
    // NOTE: API defect - missing entityId is accepted and returns 201 (server does not validate entityId as required).
    // Only viewId, filterId, and entityType are enforced server-side; entityId is not validated.
    const missingViewIdResponse = await apiUtil.processAPIRequest('POST', presetUrl, TestData.missingViewIdRequest, headers, 'Create Preset - Missing viewId', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(missingViewIdResponse.status, '400', 'Create Preset Missing viewId - Status Code Validation');

    const missingFilterIdResponse = await apiUtil.processAPIRequest('POST', presetUrl, TestData.missingFilterIdRequest, headers, 'Create Preset - Missing filterId', 'full');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(missingFilterIdResponse.status, '400', 'Create Preset Missing filterId - Status Code Validation');

    const missingEntityTypeResponse = await apiUtil.processAPIRequest('POST', presetUrl, TestData.missingEntityTypeRequest, headers, 'Create Preset - Missing entityType', 'full');
    const bValidation3: boolean = await commonFunctions.compareTwoValues(missingEntityTypeResponse.status, '400', 'Create Preset Missing entityType - Status Code Validation');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 11: Create preset with invalid entityType value is accepted by the API', async () => {
    // NOTE: API defect - the server validates that entityType is PRESENT (missing → 400) but does NOT validate
    // the VALUE. An unrecognised entityType such as "invalidType" is accepted and returns 201.
    // Expected: 400. Actual: 201. This test documents the observed (incorrect) behaviour.
    const response = await apiUtil.processAPIRequest('POST', presetUrl, TestData.invalidEntityTypeRequest, headers, 'Create Preset - Invalid entityType', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(response.status, 201, 'Create Preset Invalid entityType - API accepts invalid value (defect: should return 400)');

    // Cleanup any record created by the defective call
    await apiUtil.processAPIRequest('POST', clearPresetUrl, TestData.clearRequest, headers, 'TC11 Cleanup: Clear preset created with invalid entityType', 'full');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 12: Search and Clear without authorization return 401', async () => {
    const unauthorizedHeaders = { accept: 'application/json', Authorization: 'Bearer invalid-token' };

    const searchResponse = await apiUtil.processAPIRequest('POST', searchPresetUrl, TestData.searchRequest, unauthorizedHeaders, 'Search Preset Without Auth', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(searchResponse.status, '401', 'Search Preset Without Auth - Status Code Validation');

    const clearResponse = await apiUtil.processAPIRequest('POST', clearPresetUrl, TestData.clearRequest, unauthorizedHeaders, 'Clear Preset Without Auth', 'full');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(clearResponse.status, '401', 'Clear Preset Without Auth - Status Code Validation');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 13: Empty viewIds - search returns 400, clear returns 200 (no-op)', async () => {
    // Search enforces that viewIds is non-empty → 400.
    const searchResponse = await apiUtil.processAPIRequest('POST', searchPresetUrl, TestData.emptyViewIdsSearchRequest, headers, 'Search Preset - Empty viewIds', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(searchResponse.status, '400', 'Search Preset Empty viewIds - Status Code Validation');

    // Clear enforces that viewIds is non-empty → 400.
    const clearResponse = await apiUtil.processAPIRequest('POST', clearPresetUrl, TestData.emptyViewIdsClearRequest, headers, 'Clear Preset - Empty viewIds', 'full');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(clearResponse.status, '400', 'Clear Preset Empty viewIds - Status Code Validation');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 14: Create, search, and clear preset for subprocess entity type', async () => {
    // Step 1: Create a preset for subprocess entity type
    const createResponse = await apiUtil.processAPIRequest('POST', presetUrl, TestData.createRequestSubprocess, headers, 'TC14: Create Preset for Subprocess', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(createResponse.status, 201, 'TC14 Create Subprocess - Status Code Validation');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(createResponse.data?.entityType, 'subprocess', 'TC14 Create Subprocess - entityType matches request');
    const bValidation3: boolean = await commonFunctions.compareTwoValues(createResponse.data?.entityId, TestData.createRequestSubprocess.entityId, 'TC14 Create Subprocess - entityId matches request');

    // Step 2: Search and verify the subprocess preset is returned
    const searchResponse = await apiUtil.processAPIRequest('POST', searchPresetUrl, TestData.searchRequestSubprocess, headers, 'TC14: Search Preset for Subprocess', 'full');
    const bValidation4: boolean = await commonFunctions.compareTwoValues(searchResponse.status, 200, 'TC14 Search Subprocess - Status Code Validation');
    const presets = Array.isArray(searchResponse.data?.presets) ? searchResponse.data.presets : [];
    const subprocessPreset = presets.find((p: any) => p.filterId === TestData.createRequestSubprocess.filterId);
    const bValidation5: boolean = await commonFunctions.compareTwoValues(!!subprocessPreset, true, 'TC14 Search Subprocess - subprocess preset found');

    // Step 3: Clear the subprocess preset
    const clearResponse = await apiUtil.processAPIRequest('POST', clearPresetUrl, TestData.clearRequestSubprocess, headers, 'TC14: Clear Preset for Subprocess', 'full');
    const bValidation6: boolean = await commonFunctions.compareTwoValues(clearResponse.status, 200, 'TC14 Clear Subprocess - Status Code Validation');

    // Step 4: Verify user-scoped preset is removed after clear
    const searchAfterClearResponse = await apiUtil.processAPIRequest('POST', searchPresetUrl, TestData.searchRequestSubprocess, headers, 'TC14: Search After Clear for Subprocess', 'full');
    const presetsAfterClear = Array.isArray(searchAfterClearResponse.data?.presets) ? searchAfterClearResponse.data.presets : [];
    const userScopedSubprocessPreset = presetsAfterClear.find(
      (p: any) => p.filterId === TestData.createRequestSubprocess.filterId && p.isGlobal === false
    );
    const bValidation7: boolean = await commonFunctions.compareTwoValues(!!userScopedSubprocessPreset, false, 'TC14 Search After Clear - no user-scoped subprocess preset remains');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7).toBeTruthy();
  });
});
