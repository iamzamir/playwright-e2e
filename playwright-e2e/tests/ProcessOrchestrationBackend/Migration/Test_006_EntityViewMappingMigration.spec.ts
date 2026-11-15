import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';

const TestData = require('../../../testdata/' + process.env.PSENV + '/ProcessOrchestrationBackend/Migration/Test_006_EntityViewMappingMigration.json');

const sourceRealm = process.env.REALM_NAME_SOURCE || '';
const targetRealm = process.env.REALM_NAME_TARGET || '';
const isGraviteeGateway = (process.env.GATEWAY_TYPE || 'AZURE').toUpperCase() === 'GRAVITEE';
const sourceRealmTitle = isGraviteeGateway
  ? (process.env.REALM_KEY_SOURCE || process.env.REALM_KEY || sourceRealm)
  : sourceRealm;
const targetRealmTitle = isGraviteeGateway
  ? (process.env.REALM_KEY_TARGET || process.env.REALM_KEY || targetRealm)
  : targetRealm;
const sourceRealmId = process.env.REALM_ID_SOURCE || '';
const targetRealmId = process.env.REALM_ID_TARGET || '';
const sourceMachineClientId = process.env.REALM_CLIENT_ID_SOURCE || '';
const targetMachineClientId = process.env.REALM_CLIENT_ID_TARGET || '';
const sourceMachineClientSecret = process.env.REALM_CLIENT_SECRET_SOURCE || '';
const targetMachineClientSecret = process.env.REALM_CLIENT_SECRET_TARGET || '';
const sourceBaseUrl = process.env.API_BASE_URL_SOURCE as string;
const targetBaseUrl = process.env.API_BASE_URL_TARGET as string;
const sourceAuthUrl = process.env.AUTH_URL_SOURCE || '';
const targetAuthUrl = process.env.AUTH_URL_TARGET || '';

test.describe.serial('Entity View Mapping Migration', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
  let headersForTarget: Record<string, string>;
  let exportedData: any;

  const sourceViewEntityMapUrl = sourceBaseUrl + (process.env.VIEW_ENTITY_MAP as string);
  const targetViewEntityMapUrl = targetBaseUrl + (process.env.VIEW_ENTITY_MAP as string);
  const exportUrl = sourceBaseUrl + (process.env.EXPORT_DATA as string);
  const importUrl = targetBaseUrl + (process.env.IMPORT_DATA as string);

  function getEntityIds(payload: any): string[] {
    return (payload.entities || []).flatMap((entity: any) => entity.entityId || []);
  }

  function getExpectedMappingCount(payload: any): number {
    return getEntityIds(payload).length * (payload.views || []).length;
  }

  function validateMappedViews(responseViews: any[], expectedViews: any[]): boolean {
    return (responseViews || []).every((entityMapping: any) => expectedViews.every((expectedView: any) => {
      const mappedView = (entityMapping.views || []).find((view: any) => view.id === expectedView.id);
      return mappedView?.sequence === expectedView.sequence && mappedView?.hidden === expectedView.hidden;
    }));
  }

  async function validateSearchResponse(response: any, expectedViews: any[], label: string): Promise<boolean> {
    const statusValid = await commonFunctions.compareTwoValues(response.status, 200, `${label} status assertion`);
    const actualEntityIds = (response.data?.views || []).map((view: any) => view.entityId).sort();
    const expectedEntityIds = [...TestData.SEARCH_MAPPINGS_REQUEST_PAYLOAD.entityId].sort();
    const entityIdsValid = await commonFunctions.compareTwoValues(JSON.stringify(actualEntityIds), JSON.stringify(expectedEntityIds), `${label} entity ids assertion`);
    const mappedViewsValid = await commonFunctions.compareTwoValues(validateMappedViews(response.data?.views, expectedViews), true, `${label} view details assertion`);
    return statusValid && entityIdsValid && mappedViewsValid;
  }

  async function searchMappings(requestHeaders: Record<string, string>, mapUrl: string) {
    return apiUtil.processAPIRequest('POST', mapUrl + '/search', TestData.SEARCH_MAPPINGS_REQUEST_PAYLOAD, requestHeaders, 'Search Entity View Mappings', 'full');
  }

  async function clearMappings(requestHeaders: Record<string, string>, mapUrl: string, realmName: string): Promise<boolean> {
    const response = await apiUtil.processAPIRequest('POST', mapUrl + '/clear', TestData.CLEAR_MAPPINGS_REQUEST_PAYLOAD, requestHeaders, `Clear Entity View Mappings in ${realmName}`, 'full');
    const statusValid = commonFunctions.isStatus(response.status, 200);
    const messageValid = /^Deleted \d+ views successfully$/.test(String(response.data));
    return commonFunctions.compareTwoValues(statusValid && messageValid, true, `Clear entity view mappings in ${realmName} assertion`);
  }

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    headers = await apiUtil.buildAuthHeaders(sourceMachineClientId, sourceMachineClientSecret, sourceRealmId, sourceAuthUrl);
    headersForTarget = await apiUtil.buildAuthHeaders(targetMachineClientId, targetMachineClientSecret, targetRealmId, targetAuthUrl);
  });

  test.afterAll(async () => {
    if (!headers || !headersForTarget) {
      return;
    }
    await commonFunctions.logMessage('INFO', 'Running entity view mapping cleanup in source and target realms');
    const cleanupResults = await Promise.allSettled([
      clearMappings(headers, sourceViewEntityMapUrl, sourceRealm),
      clearMappings(headersForTarget, targetViewEntityMapUrl, targetRealm)
    ]);

    let cleanupSuccessful = true;
    for (const result of cleanupResults) {
      if (result.status === 'rejected') {
        const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
        await commonFunctions.logMessage('ERROR', `Entity view mapping cleanup failed: ${message}`);
        cleanupSuccessful = false;
      } else {
        cleanupSuccessful = cleanupSuccessful && result.value;
      }
    }
    expect(cleanupSuccessful, 'Entity view mapping cleanup should succeed in source and target realms').toBeTruthy();
  });

  test(`Test Case 1: Map 5 Views to Process & Subprocesses in the Source Realm ${sourceRealmTitle}`, async () => {
    const response = await apiUtil.processAPIRequest('POST', sourceViewEntityMapUrl, TestData.MAP_5_VIEWS_REQUEST_PAYLOAD, headers, 'Mapping 5 Views to Entities', 'full');

    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Map first 5 views status assertion');
    const expectedMappingCount = getExpectedMappingCount(TestData.MAP_5_VIEWS_REQUEST_PAYLOAD);
    const validation2 = await commonFunctions.compareTwoValues(response.data?.responseSummary.mappingsInserted, expectedMappingCount, 'Map first 5 views inserted count assertion');

    const requestMappedViewIds = TestData.MAP_5_VIEWS_REQUEST_PAYLOAD.views.map((view: any) => view.id).sort().toString();
    const responseMappedViewIds = (response.data?.requestedMappingDetails.views || []).map((view: any) => view.id).sort().toString();
    const validation3 = await commonFunctions.compareTwoValues(responseMappedViewIds, requestMappedViewIds, 'Map first 5 views mapped view ids assertion');
    expect(validation1 && validation2 && validation3).toBeTruthy();
  });

  test(`Test Case 2: Verify Mapped Views in the Source Realm ${sourceRealmTitle}`, async () => {
    const response = await searchMappings(headers, sourceViewEntityMapUrl);
    const validation = await validateSearchResponse(response, TestData.MAP_5_VIEWS_REQUEST_PAYLOAD.views, 'Search first mapped views in source realm');
    expect(validation).toBeTruthy();
  });

  test(`Test Case 3: Export Entity View Mapping from Source Realm ${sourceRealmTitle}`, async () => {
    const response = await apiUtil.processAPIRequest('POST', exportUrl, TestData.FULL_ENTITY_VIEW_EXPORT_REQUEST_PAYLOAD, headers, 'Performing Full Export', 'full');

    const validation = await commonFunctions.compareTwoValues(response.status, 200, 'Export entity view mapping status assertion in source realm');
    exportedData = response.data;
    expect(validation).toBeTruthy();
  });

  test(`Test Case 4: Import Entity View Mapping to Target Realm ${targetRealmTitle}`, async () => {
    const response = await apiUtil.processAPIRequest('POST', importUrl, exportedData, headersForTarget, 'Performing Import in the Target Realm', 'full');

    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Import entity view mapping status assertion in target realm');
    const expectedMappingCount = getExpectedMappingCount(TestData.MAP_5_VIEWS_REQUEST_PAYLOAD);
    const validation2 = await commonFunctions.compareTwoValues(response.data?.links.entityViews.insertedRecords >= expectedMappingCount, true, 'Import entity view mapping inserted records assertion in target realm');
    expect(validation1 && validation2).toBeTruthy();
  });

  test(`Test Case 5: Verify Mapped Views in the Target Realm ${targetRealmTitle}`, async () => {
    const response = await searchMappings(headersForTarget, targetViewEntityMapUrl);
    const validation = await validateSearchResponse(response, TestData.MAP_5_VIEWS_REQUEST_PAYLOAD.views, 'Search first mapped views in target realm');
    expect(validation).toBeTruthy();
  });

  test(`Test Case 6: Map another 5 Views to Process & Subprocesses in the Source Realm ${sourceRealmTitle}`, async () => {
    const response = await apiUtil.processAPIRequest('POST', sourceViewEntityMapUrl, TestData.MAP_ANOTHER_5_VIEWS_REQUEST_PAYLOAD, headers, 'Mapping 5 Views to Entities', 'full');

    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Map second 5 views status assertion');
    const expectedMappingCount = getExpectedMappingCount(TestData.MAP_ANOTHER_5_VIEWS_REQUEST_PAYLOAD);
    const validation2 = await commonFunctions.compareTwoValues(response.data?.responseSummary.mappingsInserted, expectedMappingCount, 'Map second 5 views inserted count assertion');

    const requestMappedViewIds = TestData.MAP_ANOTHER_5_VIEWS_REQUEST_PAYLOAD.views.map((view: any) => view.id).sort().toString();
    const responseMappedViewIds = (response.data?.requestedMappingDetails.views || []).map((view: any) => view.id).sort().toString();
    const validation3 = await commonFunctions.compareTwoValues(responseMappedViewIds, requestMappedViewIds, 'Map second 5 views mapped view ids assertion');
    expect(validation1 && validation2 && validation3).toBeTruthy();
  });

  test(`Test Case 7: Verify Mapped Views in the Source Realm ${sourceRealmTitle}`, async () => {
    const response = await searchMappings(headers, sourceViewEntityMapUrl);
    const validation = await validateSearchResponse(response, TestData.MAP_ANOTHER_5_VIEWS_REQUEST_PAYLOAD.views, 'Search second mapped views in source realm');
    expect(validation).toBeTruthy();
  });

  test(`Test Case 8: Export Entity View Mapping from Source Realm ${sourceRealmTitle}`, async () => {
    const response = await apiUtil.processAPIRequest('POST', exportUrl, TestData.FULL_ENTITY_VIEW_EXPORT_REQUEST_PAYLOAD, headers, 'Performing Full Export', 'full');

    const validation = await commonFunctions.compareTwoValues(response.status, 200, 'Second export entity view mapping status assertion in source realm');
    exportedData = response.data;
    expect(validation).toBeTruthy();
  });

  test(`Test Case 9: Import Entity View Mapping to Target Realm ${targetRealmTitle}`, async () => {
    const response = await apiUtil.processAPIRequest('POST', importUrl, exportedData, headersForTarget, 'Performing Import in the Target Realm', 'full');

    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Second import entity view mapping status assertion in target realm');
    const expectedMappingCount = getExpectedMappingCount(TestData.MAP_ANOTHER_5_VIEWS_REQUEST_PAYLOAD);
    const validation2 = await commonFunctions.compareTwoValues(response.data?.links.entityViews.insertedRecords >= expectedMappingCount, true, 'Second import entity view mapping inserted records assertion in target realm');
    expect(validation1 && validation2).toBeTruthy();
  });

  test(`Test Case 10: Verify Newly Mapped 5 Views in the Target Realm ${targetRealmTitle}`, async () => {
    const response = await searchMappings(headersForTarget, targetViewEntityMapUrl);
    const validation = await validateSearchResponse(response, TestData.MAP_ANOTHER_5_VIEWS_REQUEST_PAYLOAD.views, 'Search newly mapped views in target realm');
    expect(validation).toBeTruthy();
  });

  test(`Test Case 11: Verify old Mapped 5 Views in the Target Realm ${targetRealmTitle}`, async () => {
    const response = await searchMappings(headersForTarget, targetViewEntityMapUrl);
    const validation = await validateSearchResponse(response, TestData.MAP_5_VIEWS_REQUEST_PAYLOAD.views, 'Search old mapped views in target realm');
    expect(validation).toBeTruthy();
  });
});

