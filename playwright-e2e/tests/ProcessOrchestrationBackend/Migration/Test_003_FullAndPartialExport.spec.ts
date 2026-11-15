import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { MappingUtil } from '../../../util/mapping.util';

const TestData = require('../../../testdata/' + process.env.PSENV + '/ProcessOrchestrationBackend/Migration/Test_003_FullAndPartialExport.json');

const sourceRealm = process.env.REALM_NAME_SOURCE || '';
const isGraviteeGateway = (process.env.GATEWAY_TYPE || 'AZURE').toUpperCase() === 'GRAVITEE';
const sourceRealmTitle = isGraviteeGateway
  ? (process.env.REALM_KEY_SOURCE || process.env.REALM_KEY || sourceRealm)
  : sourceRealm;
const realmId = process.env.REALM_ID_SOURCE || '';
const machineClientId = process.env.REALM_CLIENT_ID_SOURCE || '';
const machineClientSecret = process.env.REALM_CLIENT_SECRET_SOURCE || '';
const authUrl = process.env.AUTH_URL_SOURCE || '';
const exportUrl = (process.env.API_BASE_URL_SOURCE as string) + (process.env.EXPORT_DATA as string);

test.describe(`full and partial export from source realm ${sourceRealmTitle}`, () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let mappingUtil: MappingUtil;
  let headers: Record<string, string> = {};

  function sorted(values: string[]): string[] {
    return [...values].sort();
  }

  function matchesRequestedNames(returnedItems: any[], requestedNames: string[], nameKey: string): boolean {
    const returnedNames = (returnedItems || []).map((item: any) => item?.[nameKey]).filter(Boolean);
    return JSON.stringify(sorted(returnedNames)) === JSON.stringify(sorted(requestedNames || []));
  }

  function matchesRequestedEntityIds(returnedItems: any[], requestedItems: any[]): boolean {
    const returnedEntityIds = (returnedItems || []).map((item: any) => item?.entityId).filter(Boolean);
    const requestedEntityIds = (requestedItems || []).flatMap((item: any) => item?.entityId || []);
    return JSON.stringify(sorted(returnedEntityIds)) === JSON.stringify(sorted(requestedEntityIds));
  }

  function getReturnedActionItemKpiIds(returnedKpis: any[]): string[] {
    const ids = (returnedKpis || []).flatMap((item: any) => item?.kpi?.kpiConfigAttributes?.map((attribute: any) => attribute?.kpiId) || []).filter(Boolean);
    return [...new Set(ids)];
  }

  async function validateKeys(payload: any, responseData: any, validationPrefix: string): Promise<boolean> {
    const payloadKeys = mappingUtil.extractAllKeys(payload).map((key: string) => key.toLowerCase()).sort();
    const responseKeys = mappingUtil.extractAllKeys(responseData).map((key: string) => key.toLowerCase()).filter((key: string) => key !== 'links.tenantid').sort();
    const missingKeys = payloadKeys.filter((key: string) => !responseKeys.includes(key));

    const validation1 = await commonFunctions.compareTwoValues(responseKeys.length, payloadKeys.length, `${validationPrefix} - Key count assertion`);
    const validation2 = await commonFunctions.compareTwoValues(missingKeys.length, 0, `${validationPrefix} - Missing keys assertion`);
    const validation3 = await commonFunctions.compareTwoValues(JSON.stringify(responseKeys), JSON.stringify(payloadKeys), `${validationPrefix} - Keys equality assertion`);

    return validation1 && validation2 && validation3;
  }

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    mappingUtil = new MappingUtil(apiUtil, commonFunctions);
    headers = await apiUtil.buildAuthHeaders(machineClientId, machineClientSecret, realmId, authUrl);
  });

  test(`Test Case 1: should export full data from source realm ${sourceRealmTitle}`, async () => {
    const exportDataPayload = TestData.FULL_EXPORT_PAYLOAD;
    const exportProcessResponse = await apiUtil.processAPIRequest('POST', exportUrl, exportDataPayload, headers, 'Export full data', 'full');

    const validation1 = await commonFunctions.compareTwoValues(exportProcessResponse.status, 200, 'Full export status assertion');
    const validation2 = await validateKeys(exportDataPayload, exportProcessResponse.data, 'Full export');
    const validation3 = await commonFunctions.compareTwoValues((exportProcessResponse.data?.processes?.length ?? 0) >= 1, true, 'Full export processes length assertion');
    const validation4 = await commonFunctions.compareTwoValues((exportProcessResponse.data?.calendars?.length ?? 0) >= 1, true, 'Full export calendars length assertion');
    const validation5 = await commonFunctions.compareTwoValues((exportProcessResponse.data?.actionItems?.kpis?.length ?? 0) >= 1, true, 'Full export actionItems kpis length assertion');
    const validation6 = await commonFunctions.compareTwoValues((exportProcessResponse.data?.featureToggle?.TenantLevel?.length ?? 0) >= 1, true, 'Full export featureToggle TenantLevel length assertion');
    const validation7 = await commonFunctions.compareTwoValues((exportProcessResponse.data?.featureToggle?.Processes?.length ?? 0) >= 1, true, 'Full export featureToggle Processes length assertion');
    const validation8 = await commonFunctions.compareTwoValues((exportProcessResponse.data?.links?.entityViewsProcedure?.length ?? 0) >= 1, true, 'Full export links entityViewsProcedure length assertion');
    const validation9 = await commonFunctions.compareTwoValues((exportProcessResponse.data?.links?.entityViews?.length ?? 0) >= 1, true, 'Full export links entityViews length assertion');
    const validation10 = await commonFunctions.compareTwoValues((exportProcessResponse.data?.supplyChainActions?.length ?? 0) >= 1, true, 'Full export supplyChainActions length assertion');
    const validation11 = await commonFunctions.compareTwoValues((exportProcessResponse.data?.assumptions?.kpi_configs?.length ?? 0) >= 1, true, 'Full export assumptions kpi_configs length assertion');
    const validation12 = await commonFunctions.compareTwoValues((exportProcessResponse.data?.assumptions?.assumption_types?.length ?? 0) >= 1, true, 'Full export assumptions assumption_types length assertion');

    expect(validation1 && validation2 && validation3 && validation4 && validation5 && validation6 && validation7 && validation8 && validation9 && validation10 && validation11 && validation12).toBeTruthy();
  });

  test(`Test Case 2: should export partial data from source realm ${sourceRealmTitle}`, async () => {
    const exportDataPayload = {
      ...TestData.PARTIAL_EXPORT_PAYLOAD,
      actionItems: {
        ...TestData.PARTIAL_EXPORT_PAYLOAD.actionItems,
        kpis: isGraviteeGateway
          ? ['ef3246fb-9a67-49e2-8a97-1b66c1672bf9']
          : TestData.PARTIAL_EXPORT_PAYLOAD.actionItems.kpis
      }
    };
    const expectedCounts = TestData.PARTIAL_EXPORT_EXPECTED_COUNTS;
    const exportProcessResponse = await apiUtil.processAPIRequest('POST', exportUrl, exportDataPayload, headers, 'Export partial data', 'full');

    const validation1 = await commonFunctions.compareTwoValues(exportProcessResponse.status, 200, 'Partial export status assertion');
    const validation2 = await validateKeys(exportDataPayload, exportProcessResponse.data, 'Partial export');

    const isProcessDataValid = (exportProcessResponse.data?.processes?.length ?? 0) === expectedCounts.processes && matchesRequestedNames(exportProcessResponse.data?.processes, exportDataPayload.processes, 'name');
    const validation3 = await commonFunctions.compareTwoValues(isProcessDataValid, true, 'Partial export process data assertion');

    const isCalendarDataValid = (exportProcessResponse.data?.calendars?.length ?? 0) === expectedCounts.calendars && matchesRequestedNames(exportProcessResponse.data?.calendars, exportDataPayload.calendars, 'calendarName');
    const validation4 = await commonFunctions.compareTwoValues(isCalendarDataValid, true, 'Partial export calendar data assertion');

    const actionItemKpis = exportProcessResponse.data?.actionItems?.kpis ?? [];
    const returnedActionItemKpiIds = getReturnedActionItemKpiIds(actionItemKpis);
    const isActionItemDataValid = actionItemKpis.length === expectedCounts.actionItemKpis && JSON.stringify(sorted(returnedActionItemKpiIds)) === JSON.stringify(sorted(exportDataPayload.actionItems.kpis));
    const validation5 = await commonFunctions.compareTwoValues(isActionItemDataValid, true, 'Partial export action item kpi data assertion');

    const entityViews = exportProcessResponse.data?.links?.entityViews ?? [];
    const isEntityViewDataValid = entityViews.length === expectedCounts.entityViews && matchesRequestedEntityIds(entityViews, exportDataPayload.links.entityViews);
    const validation6 = await commonFunctions.compareTwoValues(isEntityViewDataValid, true, 'Partial export entity views data assertion');

    const entityViewsProcedure = exportProcessResponse.data?.links?.entityViewsProcedure ?? [];
    const isEntityViewProcedureDataValid = entityViewsProcedure.length === expectedCounts.entityViewsProcedure && matchesRequestedEntityIds(entityViewsProcedure, exportDataPayload.links.entityViewsProcedure);
    const validation7 = await commonFunctions.compareTwoValues(isEntityViewProcedureDataValid, true, 'Partial export entity views procedure data assertion');

    const requestedScaNames = exportDataPayload.supplyChainActions ?? [];
    const returnedSca = exportProcessResponse.data?.supplyChainActions ?? [];
    const isScaDataValid = returnedSca.length === expectedCounts.supplyChainActions && matchesRequestedNames(returnedSca, requestedScaNames, 'name');
    const validation8 = await commonFunctions.compareTwoValues(isScaDataValid, true, 'Partial export supply chain actions assertion');

    expect(validation1 && validation2 && validation3 && validation4 && validation5 && validation6 && validation7 && validation8).toBeTruthy();
  });

  test(`Test Case 3: should reject export without authorization from source realm ${sourceRealmTitle}`, async () => {
    const response = await apiUtil.processAPIRequest('POST', exportUrl, TestData.PARTIAL_EXPORT_PAYLOAD, { accept: 'application/json' }, 'Export without authorization', 'full');
    expect(commonFunctions.isStatus(response.status, 401)).toBeTruthy();
  });

  test(`Test Case 4: should return no process data for an unknown process name from source realm ${sourceRealmTitle}`, async () => {
    const payload = { processes: [`UnknownProcess-${Date.now()}`] };
    const response = await apiUtil.processAPIRequest('POST', exportUrl, payload, headers, 'Export unknown process', 'full');
    const statusValid = await commonFunctions.compareTwoValues(response.status, 200, 'Unknown process export status assertion');
    const noProcessesReturned = Array.isArray(response.data?.processes) && response.data.processes.length === 0;
    const dataValid = await commonFunctions.compareTwoValues(noProcessesReturned, true, 'Unknown process export returns no process data assertion');
    expect(statusValid && dataValid).toBeTruthy();
  });

  test(`Test Case 5: should reject malformed export payload from source realm ${sourceRealmTitle}`, async () => {
    const response = await apiUtil.processAPIRequest('POST', exportUrl, TestData.MALFORMED_EXPORT_PAYLOAD, headers, 'Export malformed payload', 'full');
    expect(commonFunctions.isStatus(response.status, 500)).toBeTruthy();
    expect(response.data?.processes?.isDataExportSuccessful).toBeFalsy();
    expect(response.data?.processes?.errorReason).toEqual(expect.any(String));
    expect(response.data.processes.errorReason.length).toBeGreaterThan(0);
  });
});

