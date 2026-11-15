import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';

const TestData = require('../../../testdata/' + process.env.PSENV + '/ProcessOrchestrationBackend/Migration/Test_004_SupplyChainActionsMigration.json');

function getRealmConfig() {
  const isQa = process.env.PSENV === 'QA';
  return {
    source: {
      name: (isQa ? TestData.REALM_NAME_SOURCE : process.env.REALM_NAME_SOURCE) || '',
      id: (isQa ? TestData.REALM_ID_SOURCE : process.env.REALM_ID_SOURCE) || '',
      clientId: (isQa ? TestData.REALM_CLIENT_ID_SOURCE : process.env.REALM_CLIENT_ID_SOURCE) || '',
      clientSecret: (isQa ? process.env.REALM_CLIENT_SECRET_PO_QA_MIG_3 : process.env.REALM_CLIENT_SECRET_SOURCE) || ''
    },
    target: {
      name: (isQa ? TestData.REALM_NAME_TARGET : process.env.REALM_NAME_TARGET) || '',
      id: (isQa ? TestData.REALM_ID_TARGET : process.env.REALM_ID_TARGET) || '',
      clientId: (isQa ? TestData.REALM_CLIENT_ID_TARGET : process.env.REALM_CLIENT_ID_TARGET) || '',
      clientSecret: (isQa ? process.env.REALM_CLIENT_SECRET_PO_QA_MIG_4 : process.env.REALM_CLIENT_SECRET_TARGET) || ''
    }
  };
}

const realmConfig = getRealmConfig();
const sourceRealm = realmConfig.source.name;
const targetRealm = realmConfig.target.name;
const isGraviteeGateway = (process.env.GATEWAY_TYPE || 'AZURE').toUpperCase() === 'GRAVITEE';
const sourceRealmTitle = isGraviteeGateway
  ? (process.env.REALM_KEY_SOURCE || process.env.REALM_KEY || sourceRealm)
  : sourceRealm;
const targetRealmTitle = isGraviteeGateway
  ? (process.env.REALM_KEY_TARGET || process.env.REALM_KEY || targetRealm)
  : targetRealm;
const sourceBaseUrl = process.env.API_BASE_URL_SOURCE as string;
const targetBaseUrl = process.env.API_BASE_URL_TARGET as string;
const sourceAuthUrl = process.env.AUTH_URL_SOURCE || '';
const targetAuthUrl = process.env.AUTH_URL_TARGET || '';

test.describe(`Supply Chain Actions Migration from ${sourceRealmTitle} to ${targetRealmTitle}`, () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
  let headersForTarget: Record<string, string>;
  let fullExportData: any;
  let allScaNames: string[] = [];
  let partialScaNames: string[] = [];
  const importedScaNames = new Set<string>();
  let preExistingTargetScaNames = new Set<string>();

  function getResponseStatus(response: any): unknown {
    return response && typeof response === 'object' && 'status' in response ? response.status : response;
  }

  async function validateCleanupStatus(response: any, allowedStatuses: number[], label: string): Promise<boolean> {
    const status = getResponseStatus(response);
    const valid = allowedStatuses.some((allowedStatus) => commonFunctions.isStatus(status, allowedStatus));
    return commonFunctions.compareTwoValues(valid, true, `${label} status assertion`);
  }

  async function exportSupplyChainActions(exportPayload: any) {
    const exportUrl = sourceBaseUrl + process.env.EXPORT_DATA as string;
    return apiUtil.processAPIRequest('POST', exportUrl, exportPayload, headers, 'Export supply chain actions', 'full');
  }

  async function importSupplyChainActions(importPayload: any) {
    const importUrl = targetBaseUrl + process.env.IMPORT_DATA as string;
    return apiUtil.processAPIRequest('POST', importUrl, importPayload, headersForTarget, 'Import supply chain actions', 'full');
  }

  async function getSupplyChainActions() {
    const getSupplyChainActionsUrl = targetBaseUrl + process.env.GET_SUPPLY_CHAIN_ACTIONS as string;
    return apiUtil.processAPIRequest('GET', getSupplyChainActionsUrl, undefined, headersForTarget, 'Get supply chain actions', 'full');
  }

  async function cleanupMigratedSupplyChainActions(): Promise<boolean> {
    const getSCAResponse = await getSupplyChainActions();
    const getSCAValid = await validateCleanupStatus(getSCAResponse, [200], 'Get SCA for cleanup');
    if (!getSCAValid) {
      return false;
    }

    const supplyChainActions = Array.isArray(getSCAResponse.data) ? getSCAResponse.data : [];
    // Delete only SCAs this run imported that were not already present in the target realm.
    const migratedSupplyChainActions = supplyChainActions.filter((sca: any) => importedScaNames.has(sca?.name) && !preExistingTargetScaNames.has(sca?.name));
    const cleanupResults = await Promise.allSettled(
      migratedSupplyChainActions.map(async (sca: any) => {
        const deleteSCAUrl = targetBaseUrl + (process.env.DELETE_SUPPLY_CHAIN_ACTION as string).replace('{id}', sca.id);
        const response = await apiUtil.processAPIRequest('DELETE', deleteSCAUrl, undefined, headersForTarget, `Delete supply chain action ${sca.name}`, 'status');
        return validateCleanupStatus(response, [200, 404], `Delete SCA ${sca.name}`);
      })
    );

    let cleanupSuccessful = true;
    for (const result of cleanupResults) {
      if (result.status === 'rejected') {
        const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
        await commonFunctions.logMessage('ERROR', `SCA cleanup failed: ${message}`);
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
    headers = await apiUtil.buildAuthHeaders(realmConfig.source.clientId, realmConfig.source.clientSecret, realmConfig.source.id, sourceAuthUrl);
    headersForTarget = await apiUtil.buildAuthHeaders(realmConfig.target.clientId, realmConfig.target.clientSecret, realmConfig.target.id, targetAuthUrl);

    // Capture SCAs already present in the target realm so cleanup never deletes pre-existing data.
    const targetScaResponse = await getSupplyChainActions();
    if (Array.isArray(targetScaResponse.data)) {
      preExistingTargetScaNames = new Set(targetScaResponse.data.map((sca: any) => sca.name));
    }
  });

  test.afterAll(async () => {
    if (!headersForTarget) {
      return;
    }
    await commonFunctions.logMessage('INFO', `Running SCA migration cleanup in ${targetRealm}`);
    const cleanupSuccessful = await cleanupMigratedSupplyChainActions();
    expect(cleanupSuccessful, `SCA migration cleanup should succeed in ${targetRealm}`).toBeTruthy();
  });

  test(`Test Case 1: Full export SCA from source realm ${sourceRealmTitle} and import a subset (partial) to target realm ${targetRealmTitle}`, async () => {
    // Full export discovers realm-specific SCA, so no hardcoded names are needed.
    const fullExportResponse = await exportSupplyChainActions(TestData.FULL_EXPORT_PAYLOAD);
    const validation1 = await commonFunctions.compareTwoValues(fullExportResponse.status, 200, 'Full SCA export status assertion');
    fullExportData = fullExportResponse.data;
    allScaNames = Array.isArray(fullExportData?.supplyChainActions) ? fullExportData.supplyChainActions.map((sca: any) => sca.name) : [];
    const validation2 = await commonFunctions.compareTwoValues(allScaNames.length >= 1, true, 'Full export returned at least one SCA assertion');

    // Pick a subset from the full export response to drive a realm-independent partial export.
    const subsetSize = Math.min(TestData.PARTIAL_EXPORT_COUNT ?? 2, allScaNames.length);
    partialScaNames = allScaNames.slice(0, subsetSize);

    const partialExportResponse = await exportSupplyChainActions({ supplyChainActions: partialScaNames });
    const validation3 = await commonFunctions.compareTwoValues(partialExportResponse.status, 200, 'Partial SCA export status assertion');

    // Register attempted names for cleanup before issuing mutating import request
    partialScaNames.forEach((name) => importedScaNames.add(name));

    const partialImportResponse = await importSupplyChainActions(partialExportResponse.data);
    const validation4 = await commonFunctions.compareTwoValues(partialImportResponse.status, 200, 'Partial SCA import status assertion');

    const importedScaNamesFromResponse = Array.isArray(partialImportResponse.data?.supplyChainActions)
      ? [...partialImportResponse.data.supplyChainActions].sort()
      : [];
    const expectedScaNames = [...partialScaNames].sort();
    const validation5 = await commonFunctions.compareTwoValues(JSON.stringify(importedScaNamesFromResponse), JSON.stringify(expectedScaNames), 'Partial SCA imported names assertion');

    expect(validation1 && validation2 && validation3 && validation4 && validation5).toBeTruthy();
  });

  test(`Test Case 2: Verify partially migrated SCA reflected in target realm : ${targetRealmTitle}`, async () => {
    const getSCAResponse = await getSupplyChainActions();
    const validation1 = await commonFunctions.compareTwoValues(getSCAResponse.status, 200, 'Get SCA status assertion after partial migration');

    const isAllSCAExist = partialScaNames.every((name) => getSCAResponse.data.find((item: any) => item.name === name));
    const validation2 = await commonFunctions.compareTwoValues(isAllSCAExist, true, 'Verify all partially migrated SCA exist assertion');
    expect(validation1 && validation2).toBeTruthy();
  });

  test(`Test Case 3: Import full SCA export to target realm: ${targetRealmTitle}`, async () => {
    // Register attempted names for cleanup before issuing mutating import request
    allScaNames.forEach((name) => importedScaNames.add(name));

    const importSCAResponse = await importSupplyChainActions(fullExportData);
    const validation1 = await commonFunctions.compareTwoValues(importSCAResponse.status, 200, 'Full SCA import status assertion');

    const importedScaNamesFromResponse = Array.isArray(importSCAResponse.data?.supplyChainActions)
      ? [...importSCAResponse.data.supplyChainActions].sort()
      : [];
    const expectedScaNames = [...allScaNames].sort();
    const validation2 = await commonFunctions.compareTwoValues(JSON.stringify(importedScaNamesFromResponse), JSON.stringify(expectedScaNames), 'Full SCA imported names assertion');

    expect(validation1 && validation2).toBeTruthy();
  });

  test(`Test Case 4: Verify all migrated SCA reflected in target realm: ${targetRealmTitle}`, async () => {
    const getSCAResponse = await getSupplyChainActions();
    const validation1 = await commonFunctions.compareTwoValues(getSCAResponse.status, 200, 'Get SCA status assertion after full migration');

    const isAllSCAExist = allScaNames.every((name) => getSCAResponse.data.find((item: any) => item.name === name));
    const validation2 = await commonFunctions.compareTwoValues(isAllSCAExist, true, 'Verify all fully migrated SCA exist assertion');
    expect(validation1 && validation2).toBeTruthy();
  });
});

