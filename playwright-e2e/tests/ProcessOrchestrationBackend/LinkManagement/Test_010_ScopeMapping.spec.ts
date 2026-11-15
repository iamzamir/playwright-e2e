import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';

let psEnv = process.env.PSENV ?? 'INTEROP';
const TestData = require('../../../testdata/' + psEnv + '/ProcessOrchestrationBackend/LinkManagement/Test_010_ScopeMapping.json');

test.describe.serial('Scope Mapping - Workflow/Backend Filter', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
  let scopeBaseUrl: string;
  let scopeUrl: string;

  const buildScopeUrl = (baseUrl: string, query: Record<string, string>): string => {
    const params = new URLSearchParams(query);
    return `${baseUrl}?${params.toString()}`;
  };

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    const accessToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: 'Bearer ' + accessToken
    };
    const linksBasePath = (process.env.VIEW_ENTITY_MAP as string).replace(/\/view-entity-map$/, '');
    scopeBaseUrl = (process.env.API_BASE_URL as string) + linksBasePath + '/scope';
    scopeUrl = buildScopeUrl(scopeBaseUrl, TestData.scopeQuery);
  });

  test.afterAll(async () => {
    // Reset the scope mapping to a clean state (null scope, quick filter disabled).
    const response = await apiUtil.processAPIRequest('PUT', scopeUrl, TestData.putNullScopeDisabledRequest, headers, 'Cleanup: Reset Scope Mapping', 'full');
    await commonFunctions.logMessage('INFO', `Scope cleanup completed with status: ${response.status}`);
  });

  test('Test Case 1: PUT saves a full scope mapping and returns the persisted entity', async () => {
    const response = await apiUtil.processAPIRequest('PUT', scopeUrl, TestData.putScopeRequest, headers, 'PUT Save Scope Mapping', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(response.status, 200, 'PUT Save Scope - Status Code Validation');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(response.data?.entityType, TestData.scopeQuery.entityType, 'PUT Save Scope - entityType matches request');
    const bValidation3: boolean = await commonFunctions.compareTwoValues(response.data?.entityId, TestData.scopeQuery.entityId, 'PUT Save Scope - entityId matches request');
    const bValidation4: boolean = await commonFunctions.compareTwoValues(response.data?.viewId, TestData.scopeQuery.viewId, 'PUT Save Scope - viewId matches request');
    const bValidation5: boolean = await commonFunctions.compareTwoValues(response.data?.quickFilterEnabled, true, 'PUT Save Scope - quickFilterEnabled matches request');
    const bValidation6: boolean = await commonFunctions.compareTwoValues(Array.isArray(response.data?.scope?.dimensions), true, 'PUT Save Scope - scope.dimensions is an array');
    const bValidation7: boolean = await commonFunctions.compareTwoValues(response.data?.scope?.dimensions?.length, TestData.putScopeRequest.scope.dimensions.length, 'PUT Save Scope - dimensions count matches request');

    const dimensionNames = Array.isArray(response.data?.scope?.dimensions) ? response.data.scope.dimensions.map((d: any) => d.name) : [];
    const bValidation8: boolean = await commonFunctions.compareTwoValues(dimensionNames.includes('CUSTOMER') && dimensionNames.includes('ITEM') && dimensionNames.includes('LOCATION'), true, 'PUT Save Scope - CUSTOMER, ITEM and LOCATION dimensions are present');

    const customerDimension = Array.isArray(response.data?.scope?.dimensions) ? response.data.scope.dimensions.find((d: any) => d.name === 'CUSTOMER') : undefined;
    const bValidation9: boolean = await commonFunctions.compareTwoValues(customerDimension?.hierarchy?.name, 'DEMANDCHANNELHIERARCHY', 'PUT Save Scope - CUSTOMER hierarchy name matches request');
    const bValidation10: boolean = await commonFunctions.compareTwoValues(customerDimension?.isCrossAttributeFilter, true, 'PUT Save Scope - CUSTOMER isCrossAttributeFilter matches request');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation9 && bValidation10).toBeTruthy();
  });

  test('Test Case 2: GET retrieves the previously saved scope mapping', async () => {
    const response = await apiUtil.processAPIRequest('GET', scopeUrl, null, headers, 'GET Retrieve Scope Mapping', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(response.status, 200, 'GET Scope - Status Code Validation');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(response.data?.entityType, TestData.scopeQuery.entityType, 'GET Scope - entityType matches query');
    const bValidation3: boolean = await commonFunctions.compareTwoValues(response.data?.entityId, TestData.scopeQuery.entityId, 'GET Scope - entityId matches query');
    const bValidation4: boolean = await commonFunctions.compareTwoValues(response.data?.viewId, TestData.scopeQuery.viewId, 'GET Scope - viewId matches query');
    const bValidation5: boolean = await commonFunctions.compareTwoValues(response.data?.quickFilterEnabled, true, 'GET Scope - quickFilterEnabled reflects last PUT');
    const bValidation6: boolean = await commonFunctions.compareTwoValues(Array.isArray(response.data?.scope?.dimensions), true, 'GET Scope - scope.dimensions is an array');
    const bValidation7: boolean = await commonFunctions.compareTwoValues(response.data?.scope?.dimensions?.length, TestData.putScopeRequest.scope.dimensions.length, 'GET Scope - dimensions count matches saved scope');

    const itemDimension = Array.isArray(response.data?.scope?.dimensions) ? response.data.scope.dimensions.find((d: any) => d.name === 'ITEM') : undefined;
    const bValidation8: boolean = await commonFunctions.compareTwoValues(itemDimension?.hierarchy?.name, 'ITEMHIERARCHY', 'GET Scope - ITEM hierarchy name matches saved scope');
    const brandLevelsFilter = Array.isArray(itemDimension?.levelsFilter) ? itemDimension.levelsFilter.find((l: any) => l.name === 'BRAND') : undefined;
    const bValidation9: boolean = await commonFunctions.compareTwoValues(JSON.stringify(brandLevelsFilter?.values), JSON.stringify(['PF-00', 'PF-10']), 'GET Scope - ITEM BRAND levelsFilter values match saved scope');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation9).toBeTruthy();
  });

  test('Test Case 3: PUT with null scope and quickFilterEnabled true clears the scope', async () => {
    const response = await apiUtil.processAPIRequest('PUT', scopeUrl, TestData.putNullScopeEnabledRequest, headers, 'PUT Null Scope - Quick Filter Enabled', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(response.status, 200, 'PUT Null Scope Enabled - Status Code Validation');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(response.data?.entityType, TestData.scopeQuery.entityType, 'PUT Null Scope Enabled - entityType matches query');
    const bValidation3: boolean = await commonFunctions.compareTwoValues(response.data?.entityId, TestData.scopeQuery.entityId, 'PUT Null Scope Enabled - entityId matches query');
    const bValidation4: boolean = await commonFunctions.compareTwoValues(response.data?.viewId, TestData.scopeQuery.viewId, 'PUT Null Scope Enabled - viewId matches query');
    const bValidation5: boolean = await commonFunctions.compareTwoValues(response.data?.scope, null, 'PUT Null Scope Enabled - scope is null');
    const bValidation6: boolean = await commonFunctions.compareTwoValues(response.data?.quickFilterEnabled, true, 'PUT Null Scope Enabled - quickFilterEnabled is true');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6).toBeTruthy();
  });

  test('Test Case 4: GET reflects the cleared scope with quick filter still enabled', async () => {
    const response = await apiUtil.processAPIRequest('GET', scopeUrl, null, headers, 'GET Scope After Null Save', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(response.status, 200, 'GET Scope After Null - Status Code Validation');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(response.data?.scope, null, 'GET Scope After Null - scope is null');
    const bValidation3: boolean = await commonFunctions.compareTwoValues(response.data?.quickFilterEnabled, true, 'GET Scope After Null - quickFilterEnabled is true');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 5: PUT with null scope and quickFilterEnabled false disables the quick filter', async () => {
    const response = await apiUtil.processAPIRequest('PUT', scopeUrl, TestData.putNullScopeDisabledRequest, headers, 'PUT Null Scope - Quick Filter Disabled', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(response.status, 200, 'PUT Null Scope Disabled - Status Code Validation');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(response.data?.scope, null, 'PUT Null Scope Disabled - scope is null');
    const bValidation3: boolean = await commonFunctions.compareTwoValues(response.data?.quickFilterEnabled, false, 'PUT Null Scope Disabled - quickFilterEnabled is false');

    // Verify persistence via GET
    const getResponse = await apiUtil.processAPIRequest('GET', scopeUrl, null, headers, 'GET Scope After Disable', 'full');
    const bValidation4: boolean = await commonFunctions.compareTwoValues(getResponse.status, 200, 'GET Scope After Disable - Status Code Validation');
    const bValidation5: boolean = await commonFunctions.compareTwoValues(getResponse.data?.quickFilterEnabled, false, 'GET Scope After Disable - quickFilterEnabled persisted as false');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5).toBeTruthy();
  });

  test('Test Case 6: PATCH partially updates the scope mapping quickFilterConfigId', async () => {
    const response = await apiUtil.processAPIRequest('PATCH', scopeUrl, TestData.patchRequest, headers, 'PATCH Partial Update Scope', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(response.status, 200, 'PATCH Partial Update - Status Code Validation');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(response.data?.entityType, TestData.scopeQuery.entityType, 'PATCH Partial Update - entityType matches query');
    const bValidation3: boolean = await commonFunctions.compareTwoValues(response.data?.entityId, TestData.scopeQuery.entityId, 'PATCH Partial Update - entityId matches query');
    const bValidation4: boolean = await commonFunctions.compareTwoValues(response.data?.viewId, TestData.scopeQuery.viewId, 'PATCH Partial Update - viewId matches query');
    const bValidation5: boolean = await commonFunctions.compareTwoValues(response.data?.quickFilterConfigId, TestData.patchRequest.quickFilterConfigId, 'PATCH Partial Update - quickFilterConfigId reflects request');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5).toBeTruthy();
  });

  test('Test Case 7: GET without authorization returns 401', async () => {
    const unauthorizedHeaders = { accept: 'application/json', Authorization: 'Bearer invalid-token' };
    const response = await apiUtil.processAPIRequest('GET', scopeUrl, null, unauthorizedHeaders, 'GET Scope Without Auth', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(response.status, '401', 'GET Scope Without Auth - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 8: PUT without authorization returns 401', async () => {
    const unauthorizedHeaders = { accept: 'application/json', Authorization: 'Bearer invalid-token' };
    const response = await apiUtil.processAPIRequest('PUT', scopeUrl, TestData.putNullScopeDisabledRequest, unauthorizedHeaders, 'PUT Scope Without Auth', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(response.status, '401', 'PUT Scope Without Auth - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 9: PATCH without authorization returns 401', async () => {
    const unauthorizedHeaders = { accept: 'application/json', Authorization: 'Bearer invalid-token' };
    const response = await apiUtil.processAPIRequest('PATCH', scopeUrl, TestData.patchRequest, unauthorizedHeaders, 'PATCH Scope Without Auth', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(response.status, '401', 'PATCH Scope Without Auth - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 10: GET with a missing required query parameter returns 400', async () => {
    // Omit the required viewId query parameter.
    const invalidUrl = buildScopeUrl(scopeBaseUrl, { entityType: TestData.scopeQuery.entityType, entityId: TestData.scopeQuery.entityId });
    const response = await apiUtil.processAPIRequest('GET', invalidUrl, null, headers, 'GET Scope - Missing viewId', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(response.status, '400', 'GET Scope Missing viewId - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 11: PUT with a missing required query parameter returns 400', async () => {
    // Omit the required entityId query parameter.
    const invalidUrl = buildScopeUrl(scopeBaseUrl, { entityType: TestData.scopeQuery.entityType, viewId: TestData.scopeQuery.viewId });
    const response = await apiUtil.processAPIRequest('PUT', invalidUrl, TestData.putNullScopeDisabledRequest, headers, 'PUT Scope - Missing entityId', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(response.status, '400', 'PUT Scope Missing entityId - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });
});
