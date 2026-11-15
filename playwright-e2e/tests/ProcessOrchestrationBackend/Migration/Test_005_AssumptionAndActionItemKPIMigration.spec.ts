import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';

const TestData = require('../../../testdata/' + process.env.PSENV + '/ProcessOrchestrationBackend/Migration/Test_005_AssumptionAndActionItemKPIMigration.json');

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
const assumptionKpiName = uniqueName(TestData.PAYLOAD_FOR_ASSUMPTION_KPI_DEFINITION.name);
const actionItemKpiDisplayName = uniqueName(TestData.PAYLOAD_FOR_ACTION_ITEM_KPI_DEFINITION.displayName);

test.describe.serial('Assumption and Action Item KPI Migration', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
  let headersForTarget: Record<string, string>;
  let dataToImportInTarget: any;
  let kpiInSource: string;
  let kpiInTarget: string;
  let actionItemKpiInTarget: string;
  let actionItemKpiInSource: string;

  const exportUrl = sourceBaseUrl + (process.env.EXPORT_DATA as string);
  const importUrl = targetBaseUrl + (process.env.IMPORT_DATA as string);

  function getResponseStatus(response: any): unknown {
    return response && typeof response === 'object' && 'status' in response ? response.status : response;
  }

  async function validateCleanupStatus(response: any, allowedStatuses: number[], label: string): Promise<boolean> {
    const status = getResponseStatus(response);
    const valid = allowedStatuses.some((allowedStatus) => commonFunctions.isStatus(status, allowedStatus));
    return commonFunctions.compareTwoValues(valid, true, `${label} status assertion`);
  }

  async function findKpiId(listUrl: string, requestHeaders: Record<string, string>, expectedName: string, nameKeys: string[], label: string): Promise<string | undefined> {
    const response = await apiUtil.processAPIRequest('GET', listUrl, null, requestHeaders, label, 'full');
    const responseValid = await validateCleanupStatus(response, [200], label);
    if (!responseValid) {
      return undefined;
    }
    const items = Array.isArray(response.data) ? response.data : response.data?.data || [];
    return items.find((item: any) => nameKeys.some((key) => item?.[key] === expectedName))?.id;
  }

  async function deleteKpi(id: string | undefined, deleteUrlTemplate: string, requestHeaders: Record<string, string>, baseUrl: string, label: string): Promise<boolean> {
    if (!id) {
      await commonFunctions.logMessage('INFO', `${label} is already absent`);
      return true;
    }
    const deleteUrl = baseUrl + deleteUrlTemplate.replace('{id}', id);
    const response = await apiUtil.processAPIRequest('DELETE', deleteUrl, null, requestHeaders, label, 'status');
    return validateCleanupStatus(response, [200, 404], label);
  }

  async function cleanupRealm(requestHeaders: Record<string, string>, baseUrl: string, realmName: string, assumptionId: string | undefined, actionItemId: string | undefined): Promise<boolean> {
    const assumptionListUrl = baseUrl + (process.env.GET_ASSUMPTION_KPI_CONFIG as string);
    const actionItemListUrl = baseUrl + (process.env.CREATE_ACTIONITEM_KPI_CONFIG as string);
    const resolvedAssumptionId = assumptionId || await findKpiId(assumptionListUrl, requestHeaders, assumptionKpiName, ['name', 'displayName'], `Find assumption KPI in ${realmName}`);
    const resolvedActionItemId = actionItemId || await findKpiId(actionItemListUrl, requestHeaders, actionItemKpiDisplayName, ['displayName', 'name'], `Find action item KPI in ${realmName}`);
    const cleanupResults = await Promise.allSettled([
      deleteKpi(resolvedAssumptionId, process.env.DELETE_ASSUMPTION_KPI_CONFIG as string, requestHeaders, baseUrl, `Delete assumption KPI in ${realmName}`),
      deleteKpi(resolvedActionItemId, process.env.DELETE_ACTIONITEM_KPI as string, requestHeaders, baseUrl, `Delete action item KPI in ${realmName}`)
    ]);

    let cleanupSuccessful = true;
    for (const result of cleanupResults) {
      if (result.status === 'rejected') {
        const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
        await commonFunctions.logMessage('ERROR', `${realmName} KPI cleanup failed: ${message}`);
        cleanupSuccessful = false;
      } else {
        cleanupSuccessful = cleanupSuccessful && result.value;
      }
    }
    return cleanupSuccessful;
  }

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    headers = await apiUtil.buildAuthHeaders(sourceMachineClientId, sourceMachineClientSecret, sourceRealmId, sourceAuthUrl);
    headersForTarget = await apiUtil.buildAuthHeaders(targetMachineClientId, targetMachineClientSecret, targetRealmId, targetAuthUrl);

    if (isGraviteeGateway) {
      TestData.PAYLOAD_FOR_ACTION_ITEM_KPI_DEFINITION.entityId = '71e69535-11f1-4319-8ba4-386819a448ba';
      return;
    }

    // Resolve the action item entity from the live source-realm process context so Azure stays on the realm entity id.
    const processName = TestData.PROCESS_NAME || (Array.isArray(TestData.EXPORT_PAYLOAD_FOR_ASSUMPTION_KPI?.processes) ? TestData.EXPORT_PAYLOAD_FOR_ASSUMPTION_KPI.processes[0] : undefined);
    if (processName) {
      const processContextUrl = sourceBaseUrl + (process.env.GET_PROCESS_WITH_NAME as string) + '/' + processName + '/context?all=true';
      const processContextResponse = await apiUtil.processAPIRequest('GET', processContextUrl, null, headers, `Fetch process context for ${processName}`, 'full');
      const resolvedActionItemEntityId = processContextResponse?.data?.actionItemEntityId;
      if (resolvedActionItemEntityId) {
        TestData.PAYLOAD_FOR_ACTION_ITEM_KPI_DEFINITION.entityId = resolvedActionItemEntityId;
      }
    }
  });

  test.afterAll(async () => {
    if (!headers || !headersForTarget) {
      return;
    }
    await commonFunctions.logMessage('INFO', 'Running assumption and action item KPI migration cleanup');
    const cleanupResults = await Promise.allSettled([
      cleanupRealm(headers, sourceBaseUrl, sourceRealm, kpiInSource, actionItemKpiInSource),
      cleanupRealm(headersForTarget, targetBaseUrl, targetRealm, kpiInTarget, actionItemKpiInTarget)
    ]);

    let cleanupSuccessful = true;
    for (const result of cleanupResults) {
      if (result.status === 'rejected') {
        const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
        await commonFunctions.logMessage('ERROR', `KPI migration cleanup failed: ${message}`);
        cleanupSuccessful = false;
      } else {
        cleanupSuccessful = cleanupSuccessful && result.value;
      }
    }
    expect(cleanupSuccessful, 'KPI migration cleanup should succeed in source and target realms').toBeTruthy();
  });

  test(`Test Case 1: Create assumption KPI definition in source realm: ${sourceRealmTitle}`, async () => {
    const createKpiUrl = sourceBaseUrl + (process.env.CREATE_ASSUMPTION_KPI_CONFIG as string);
    const payload = { ...TestData.PAYLOAD_FOR_ASSUMPTION_KPI_DEFINITION, name: assumptionKpiName, displayName: assumptionKpiName };
    const kpiResponse = await apiUtil.processAPIRequest('POST', createKpiUrl, payload, headers, 'Create assumption KPI', 'full');

    const validation1 = await commonFunctions.compareTwoValues(kpiResponse.status, 201, 'Create assumption KPI status assertion');
    const validation2 = await commonFunctions.compareTwoValues(kpiResponse.data.name, payload.name, 'Create assumption KPI name assertion');

    kpiInSource = kpiResponse.data.id;
    expect(validation1 && validation2).toBeTruthy();
  });

  test(`Test Case 2: Export Assumption KPI definition from source realm: ${sourceRealmTitle}`, async () => {
    const exportDataPayload = {
      ...TestData.EXPORT_PAYLOAD_FOR_ASSUMPTION_KPI,
      assumptions: {
        ...TestData.EXPORT_PAYLOAD_FOR_ASSUMPTION_KPI.assumptions,
        kpi_configs: [kpiInSource]
      }
    };
    const exportAssumptionKPIResponse = await apiUtil.processAPIRequest('POST', exportUrl, exportDataPayload, headers, 'Export Assumption KPI with process', 'full');

    const validation = await commonFunctions.compareTwoValues(exportAssumptionKPIResponse.status, 200, 'Export assumption KPI status assertion');
    dataToImportInTarget = exportAssumptionKPIResponse.data;
    expect(validation).toBeTruthy();
  });

  test(`Test Case 3: Import Assumption KPI definition in target realm: ${targetRealmTitle}`, async () => {
    const importAssumptionKPIResponse = await apiUtil.processAPIRequest('POST', importUrl, dataToImportInTarget, headersForTarget, 'Import Assumption KPI with process', 'full');

    const validation = await commonFunctions.compareTwoValues(importAssumptionKPIResponse.status, 200, 'Import assumption KPI status assertion');
    kpiInTarget = importAssumptionKPIResponse.data.assumptions.kpi_configs[0];
    expect(validation).toBeTruthy();
  });

  test(`Test Case 4: Create action item KPI definition in source realm: ${sourceRealmTitle}`, async () => {
    const createKpiUrl = sourceBaseUrl + (process.env.CREATE_ACTIONITEM_KPI_CONFIG as string);
    const payload = { ...TestData.PAYLOAD_FOR_ACTION_ITEM_KPI_DEFINITION, displayName: actionItemKpiDisplayName };
    const kpiResponse = await apiUtil.processAPIRequest('POST', createKpiUrl, payload, headers, 'Create action item KPI', 'full');

    const validation1 = await commonFunctions.compareTwoValues(kpiResponse.status, 201, 'Create action item KPI status assertion');
    const validation2 = await commonFunctions.compareTwoValues(kpiResponse.data.displayName, payload.displayName, 'Create action item KPI displayName assertion');

    actionItemKpiInSource = kpiResponse.data.id;
    expect(validation1 && validation2).toBeTruthy();
  });

  test(`Test Case 5: Export Action Item KPI definition from source realm: ${sourceRealmTitle}`, async () => {
    const exportDataPayload = {
      ...TestData.EXPORT_PAYLOAD_FOR_ACTION_ITEM_KPI,
      actionItems: {
        ...TestData.EXPORT_PAYLOAD_FOR_ACTION_ITEM_KPI.actionItems,
        kpis: [actionItemKpiInSource]
      }
    };
    const exportActionItemKPIResponse = await apiUtil.processAPIRequest('POST', exportUrl, exportDataPayload, headers, 'Export Action Item KPI with process', 'full');

    const validation = await commonFunctions.compareTwoValues(exportActionItemKPIResponse.status, 200, 'Export action item KPI status assertion');
    dataToImportInTarget = exportActionItemKPIResponse.data;
    expect(validation).toBeTruthy();
  });

  test(`Test Case 6: Import Action Item KPI definition in target realm: ${targetRealmTitle}`, async () => {
    const importActionItemKPIResponse = await apiUtil.processAPIRequest('POST', importUrl, dataToImportInTarget, headersForTarget, 'Import Action Item KPI with process', 'full');

    const validation = await commonFunctions.compareTwoValues(importActionItemKPIResponse.status, 200, 'Import action item KPI status assertion');
    actionItemKpiInTarget = importActionItemKPIResponse.data.actionItems.kpis[0];
    expect(validation).toBeTruthy();
  });
});

