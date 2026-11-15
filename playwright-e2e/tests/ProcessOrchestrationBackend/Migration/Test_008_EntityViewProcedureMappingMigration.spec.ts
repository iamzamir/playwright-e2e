import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';

const TestData = require('../../../testdata/' + process.env.PSENV + '/ProcessOrchestrationBackend/Migration/Test_008_EntityViewProcedureMappingMigration.json');

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

type EntityViewProcedure = {
  entityType: string;
  entityId: string;
  views: Array<{
    id: string;
    scopeId?: string | null;
    reason?: string | null;
    procedures?: Array<{ procedureName: string; primary?: boolean; secondary?: boolean; sequence?: number | null }>;
  }>;
};

const NO_PROCEDURES_REASON = 'PLANNER_WANTS_NO_PROCEDURES';

test.describe.serial('Entity View Procedure Mapping Migration', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
  let headersForTarget: Record<string, string>;
  let exportedData: any;

  const sourceExportUrl = sourceBaseUrl + (process.env.EXPORT_DATA as string);
  const targetExportUrl = targetBaseUrl + (process.env.EXPORT_DATA as string);
  const sourceImportUrl = sourceBaseUrl + (process.env.IMPORT_DATA as string);
  const targetImportUrl = targetBaseUrl + (process.env.IMPORT_DATA as string);
  const sourceProcedureMapUrl = sourceBaseUrl + (process.env.VIEW_ENTITY_PROCEDURE_MAP as string);
  const targetProcedureMapUrl = targetBaseUrl + (process.env.VIEW_ENTITY_PROCEDURE_MAP as string);

  function getEntityViewProcedures(payload: any): EntityViewProcedure[] {
    return payload?.links?.entityViewsProcedure || [];
  }

  function collectViewIds(entityViewsProcedure: EntityViewProcedure[]): string {
    const ids: string[] = [];
    for (const entity of entityViewsProcedure || []) {
      for (const view of entity.views || []) {
        ids.push(view.id);
      }
    }
    return [...new Set(ids)].sort().toString();
  }

  function collectProcedureNames(entityViewsProcedure: EntityViewProcedure[]): string {
    const names: string[] = [];
    for (const entity of entityViewsProcedure || []) {
      for (const view of entity.views || []) {
        for (const procedure of view.procedures || []) {
          names.push(procedure.procedureName);
        }
      }
    }
    return [...new Set(names)].sort().toString();
  }

  function getEntityViewPairs(entityViewsProcedure: EntityViewProcedure[]) {
    const pairs: Array<{ entityType: string; entityId: string; viewId: string }> = [];
    for (const entity of entityViewsProcedure || []) {
      for (const view of entity.views || []) {
        pairs.push({ entityType: entity.entityType, entityId: entity.entityId, viewId: view.id });
      }
    }
    return pairs;
  }

  function findEntityView(entityViewsProcedure: EntityViewProcedure[], entityType: string, entityId: string, viewId: string) {
    const entity = (entityViewsProcedure || []).find((item) => item.entityType === entityType && item.entityId === entityId);
    return entity?.views?.find((view) => view.id === viewId);
  }

  function countProcedureMappings(entityViewsProcedure: EntityViewProcedure[]): number {
    let count = 0;
    for (const entity of entityViewsProcedure || []) {
      for (const view of entity.views || []) {
        count += (view.procedures || []).length;
      }
    }
    return count;
  }

  function totalProcessedMappings(response: any): number {
    const summary = response.data?.links?.entityViewsProcedure;
    return (summary?.insertedRecords || 0) + (summary?.updatedRecords || 0) + (summary?.mappingThatRequireNoChange || 0);
  }

  function buildViewProcedureSignature(entityViewsProcedure: EntityViewProcedure[]): string {
    const signatures: string[] = [];
    for (const entity of entityViewsProcedure || []) {
      for (const view of entity.views || []) {
        const procedures = (view.procedures || [])
          .map((p) => `${p.procedureName}:${!!p.primary}:${!!p.secondary}:${p.sequence ?? 'null'}`)
          .sort();
        signatures.push(`${entity.entityType}|${entity.entityId}|${view.id}=>${procedures.join(',')}`);
      }
    }
    return signatures.sort().join(' || ');
  }

  function selectExpectedMappings(actualMappings: EntityViewProcedure[], expectedMappings: EntityViewProcedure[]): EntityViewProcedure[] {
    return expectedMappings.flatMap((expectedEntity) => {
      const actualEntity = actualMappings.find((entity) => entity.entityType === expectedEntity.entityType && entity.entityId === expectedEntity.entityId);
      if (!actualEntity) {
        return [];
      }
      const views = expectedEntity.views.flatMap((expectedView) => {
        const actualView = actualEntity.views.find((view) => view.id === expectedView.id);
        if (!actualView) {
          return [];
        }
        const expectedProcedureNames = new Set((expectedView.procedures || []).map((procedure) => procedure.procedureName));
        return [{ ...actualView, procedures: (actualView.procedures || []).filter((procedure) => expectedProcedureNames.has(procedure.procedureName)) }];
      });
      return [{ ...actualEntity, views }];
    });
  }

  async function clearProcedureMappings(requestHeaders: Record<string, string>, mapUrl: string, realmName: string): Promise<boolean> {
    const pairs = getEntityViewPairs(getEntityViewProcedures(TestData.IMPORT_PROCEDURE_MAPPING_PAYLOAD));
    const cleanupResults = await Promise.allSettled(
      pairs.map(async (pair) => {
        const deleteUrl = mapUrl + '/type/' + pair.entityType + '/entity/' + pair.entityId + '/views/' + pair.viewId;
        const response = await apiUtil.processAPIRequest('DELETE', deleteUrl, null, requestHeaders, `Teardown clearing View Procedure Mapping for ${pair.entityId}/${pair.viewId} in ${realmName}`, 'full');
        const valid = commonFunctions.isStatus(response.status, 200) && /^Deleted \d+ viewProcedureMappings successfully$/.test(String(response.data));
        return commonFunctions.compareTwoValues(valid, true, `Teardown clear procedure mapping ${pair.entityId}/${pair.viewId} in ${realmName} assertion`);
      })
    );

    let cleanupSuccessful = true;
    for (const result of cleanupResults) {
      if (result.status === 'rejected') {
        const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
        await commonFunctions.logMessage('ERROR', `${realmName} procedure mapping cleanup failed: ${message}`);
        cleanupSuccessful = false;
      } else {
        cleanupSuccessful = cleanupSuccessful && result.value;
      }
    }
    return cleanupSuccessful;
  }

  const expectedViewIds = collectViewIds(getEntityViewProcedures(TestData.IMPORT_PROCEDURE_MAPPING_PAYLOAD));
  const expectedProcedureNames = collectProcedureNames(getEntityViewProcedures(TestData.IMPORT_PROCEDURE_MAPPING_PAYLOAD));
  const expectedProcedureMappingCount = countProcedureMappings(getEntityViewProcedures(TestData.IMPORT_PROCEDURE_MAPPING_PAYLOAD));

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    headers = await apiUtil.buildAuthHeaders(sourceMachineClientId, sourceMachineClientSecret, sourceRealmId, sourceAuthUrl);
    headersForTarget = await apiUtil.buildAuthHeaders(targetMachineClientId, targetMachineClientSecret, targetRealmId, targetAuthUrl);
  });

  test(`Test Case 1: Setup - Map Views to Procedures in the Source Realm ${sourceRealmTitle}`, async () => {
    const response = await apiUtil.processAPIRequest('POST', sourceImportUrl, TestData.IMPORT_PROCEDURE_MAPPING_PAYLOAD, headers, 'Mapping Views to Procedures in the Source Realm', 'full');

    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Setup procedure mapping status assertion in source realm');
    const validation2 = await commonFunctions.compareTwoValues(totalProcessedMappings(response), expectedProcedureMappingCount, 'Setup procedure mapping processed count assertion in source realm');
    expect(validation1 && validation2).toBeTruthy();
  });

  test(`Test Case 2: Export View Procedure Mapping from Source Realm ${sourceRealmTitle}`, async () => {
    const response = await apiUtil.processAPIRequest('POST', sourceExportUrl, TestData.EXPORT_PROCEDURE_REQUEST_PAYLOAD, headers, 'Exporting View Procedure Mapping from Source Realm', 'full');

    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Export procedure mapping status assertion in source realm');
    const expectedMappings = getEntityViewProcedures(TestData.IMPORT_PROCEDURE_MAPPING_PAYLOAD);
    const exportedProcedures = selectExpectedMappings(getEntityViewProcedures(response.data), expectedMappings);
    exportedData = {
      ...response.data,
      links: {
        ...response.data.links,
        entityViewsProcedure: exportedProcedures
      }
    };
    const validation2 = await commonFunctions.compareTwoValues(Array.isArray(exportedProcedures) && exportedProcedures.length > 0, true, 'Export procedure mapping array assertion in source realm');
    const validation3 = await commonFunctions.compareTwoValues(collectViewIds(exportedProcedures), expectedViewIds, 'Export procedure mapping view ids assertion in source realm');
    const validation4 = await commonFunctions.compareTwoValues(collectProcedureNames(exportedProcedures), expectedProcedureNames, 'Export procedure mapping procedure names assertion in source realm');
    const validation5 = await commonFunctions.compareTwoValues(buildViewProcedureSignature(exportedProcedures), buildViewProcedureSignature(expectedMappings), 'Export procedure mapping fidelity assertion in source realm');
    expect(validation1 && validation2 && validation3 && validation4 && validation5).toBeTruthy();
  });

  test(`Test Case 3: Import View Procedure Mapping to Target Realm ${targetRealmTitle}`, async () => {
    expect(exportedData, 'Export step must populate data before import').toBeDefined();
    const response = await apiUtil.processAPIRequest('POST', targetImportUrl, exportedData, headersForTarget, 'Importing View Procedure Mapping to Target Realm', 'full');

    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Import procedure mapping status assertion in target realm');
    const validation2 = await commonFunctions.compareTwoValues(totalProcessedMappings(response), expectedProcedureMappingCount, 'Import procedure mapping processed count assertion in target realm');
    expect(validation1 && validation2).toBeTruthy();
  });

  test(`Test Case 4: Verify Imported View Procedure Mapping in Target Realm ${targetRealmTitle}`, async () => {
    const response = await apiUtil.processAPIRequest('POST', targetExportUrl, TestData.EXPORT_PROCEDURE_REQUEST_PAYLOAD, headersForTarget, 'Exporting View Procedure Mapping from Target Realm', 'full');

    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Verify import export status assertion in target realm');
    const expectedMappings = getEntityViewProcedures(TestData.IMPORT_PROCEDURE_MAPPING_PAYLOAD);
    const exportedProcedures = selectExpectedMappings(getEntityViewProcedures(response.data), expectedMappings);
    const validation2 = await commonFunctions.compareTwoValues(collectViewIds(exportedProcedures), expectedViewIds, 'Verify imported view ids assertion in target realm');
    const validation3 = await commonFunctions.compareTwoValues(collectProcedureNames(exportedProcedures), expectedProcedureNames, 'Verify imported procedure names assertion in target realm');

    const sourceSignature = buildViewProcedureSignature(getEntityViewProcedures(exportedData));
    const targetSignature = buildViewProcedureSignature(exportedProcedures);
    const validation4 = await commonFunctions.compareTwoValues(targetSignature, sourceSignature, 'Verify per-view procedure fidelity (name/primary/secondary/sequence) source vs target realm');
    expect(validation1 && validation2 && validation3 && validation4).toBeTruthy();
  });

  test(`Test Case 5: Re-import is Idempotent in Target Realm ${targetRealmTitle}`, async () => {
    const response = await apiUtil.processAPIRequest('POST', targetImportUrl, exportedData, headersForTarget, 'Re-importing View Procedure Mapping to Target Realm', 'full');

    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Idempotent re-import status assertion in target realm');
    const summary = response.data?.links?.entityViewsProcedure;
    const validation2 = await commonFunctions.compareTwoValues(summary?.insertedRecords, 0, 'Idempotent re-import inserted records assertion in target realm');
    const validation3 = await commonFunctions.compareTwoValues(totalProcessedMappings(response), expectedProcedureMappingCount, 'Idempotent re-import processed count assertion in target realm');
    expect(validation1 && validation2 && validation3).toBeTruthy();
  });

  test(`Test Case 6: Partial Cleanup - Cleared View Has No Procedures Reason and Retains Others in Target Realm ${targetRealmTitle}`, async () => {
    const pairs = getEntityViewPairs(getEntityViewProcedures(TestData.IMPORT_PROCEDURE_MAPPING_PAYLOAD));
    const [targetPair, ...remainingPairs] = pairs;
    const deleteUrl = targetProcedureMapUrl + '/type/' + targetPair.entityType + '/entity/' + targetPair.entityId + '/views/' + targetPair.viewId;
    const deleteResponse = await apiUtil.processAPIRequest('DELETE', deleteUrl, null, headersForTarget, `Partially clearing View Procedure Mapping for ${targetPair.entityId}/${targetPair.viewId} in Target Realm`, 'full');

    const validation1 = await commonFunctions.compareTwoValues(deleteResponse.status, 200, 'Partial cleanup delete status assertion in target realm');
    const validation2 = await commonFunctions.compareTwoValues(/^Deleted \d+ viewProcedureMappings successfully$/.test(String(deleteResponse.data)), true, 'Partial cleanup delete message assertion in target realm');

    const exportResponse = await apiUtil.processAPIRequest('POST', targetExportUrl, TestData.EXPORT_PROCEDURE_REQUEST_PAYLOAD, headersForTarget, 'Exporting View Procedure Mapping after Partial Cleanup from Target Realm', 'full');
    const validation3 = await commonFunctions.compareTwoValues(exportResponse.status, 200, 'Partial cleanup export status assertion in target realm');

    const exportedProcedures = getEntityViewProcedures(exportResponse.data);
    const clearedView = findEntityView(exportedProcedures, targetPair.entityType, targetPair.entityId, targetPair.viewId);
    const validation4 = await commonFunctions.compareTwoValues(clearedView?.reason, NO_PROCEDURES_REASON, 'Partial cleanup cleared view reason assertion in target realm');
    const validation5 = await commonFunctions.compareTwoValues((clearedView?.procedures || []).length, 0, 'Partial cleanup cleared view has no procedures assertion in target realm');
    const remainingViewIds = collectViewIds(exportedProcedures).split(',');
    const otherViewsRetained = remainingPairs.every((pair) => remainingViewIds.includes(pair.viewId));
    const validation6 = await commonFunctions.compareTwoValues(otherViewsRetained, true, 'Partial cleanup retained other views assertion in target realm');
    expect(validation1 && validation2 && validation3 && validation4 && validation5 && validation6).toBeTruthy();
  });

  test(`Test Case 7: Clear View Procedure Mapping in Target Realm ${targetRealmTitle}`, async () => {
    const pairs = getEntityViewPairs(getEntityViewProcedures(TestData.IMPORT_PROCEDURE_MAPPING_PAYLOAD));
    let allValid = true;
    for (const pair of pairs) {
      const deleteUrl = targetProcedureMapUrl + '/type/' + pair.entityType + '/entity/' + pair.entityId + '/views/' + pair.viewId;
      const response = await apiUtil.processAPIRequest('DELETE', deleteUrl, null, headersForTarget, `Clearing View Procedure Mapping for ${pair.entityId}/${pair.viewId} in Target Realm`, 'full');

      const statusValid = await commonFunctions.compareTwoValues(response.status, 200, `Clear procedure mapping status assertion for view ${pair.viewId} in target realm`);
      const messageValid = await commonFunctions.compareTwoValues(/^Deleted \d+ viewProcedureMappings successfully$/.test(String(response.data)), true, `Clear procedure mapping message assertion for view ${pair.viewId} in target realm`);
      allValid = allValid && statusValid && messageValid;
    }
    expect(allValid).toBeTruthy();
  });

  test(`Test Case 8: Verify Cleared Views Have No Procedures Reason in Target Realm ${targetRealmTitle}`, async () => {
    const response = await apiUtil.processAPIRequest('POST', targetExportUrl, TestData.EXPORT_PROCEDURE_REQUEST_PAYLOAD, headersForTarget, 'Exporting View Procedure Mapping after Cleanup from Target Realm', 'full');

    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Verify cleanup export status assertion in target realm');
    const exportedProcedures = getEntityViewProcedures(response.data);
    const pairs = getEntityViewPairs(getEntityViewProcedures(TestData.IMPORT_PROCEDURE_MAPPING_PAYLOAD));
    let clearedViewsValid = true;
    for (const pair of pairs) {
      const clearedView = findEntityView(exportedProcedures, pair.entityType, pair.entityId, pair.viewId);
      const reasonValid = await commonFunctions.compareTwoValues(clearedView?.reason, NO_PROCEDURES_REASON, `Verify cleared view ${pair.viewId} reason assertion in target realm`);
      const emptyProcedures = await commonFunctions.compareTwoValues((clearedView?.procedures || []).length, 0, `Verify cleared view ${pair.viewId} has no procedures assertion in target realm`);
      clearedViewsValid = clearedViewsValid && reasonValid && emptyProcedures;
    }
    expect(validation1 && clearedViewsValid).toBeTruthy();
  });

  test(`Test Case 9: Negative - Export with Invalid Token is Unauthorized`, async () => {
    const invalidHeaders = { accept: 'application/json', Authorization: 'Bearer invalid-token' };
    const response = await apiUtil.processAPIRequest('POST', targetExportUrl, TestData.EXPORT_PROCEDURE_REQUEST_PAYLOAD, invalidHeaders, 'Exporting View Procedure Mapping with Invalid Token', 'full');

    expect(commonFunctions.isStatus(response.status, 401)).toBeTruthy();
  });

  test(`Test Case 10: Negative - Import with Invalid Token is Unauthorized`, async () => {
    const invalidHeaders = { accept: 'application/json', Authorization: 'Bearer invalid-token' };
    const response = await apiUtil.processAPIRequest('POST', targetImportUrl, TestData.IMPORT_PROCEDURE_MAPPING_PAYLOAD, invalidHeaders, 'Importing View Procedure Mapping with Invalid Token', 'full');

    expect(commonFunctions.isStatus(response.status, 401)).toBeTruthy();
  });

  test(`Test Case 11: Negative - Delete Procedure Mapping with Invalid Token is Unauthorized`, async () => {
    const invalidHeaders = { accept: 'application/json', Authorization: 'Bearer invalid-token' };
    const [firstPair] = getEntityViewPairs(getEntityViewProcedures(TestData.IMPORT_PROCEDURE_MAPPING_PAYLOAD));
    const deleteUrl = targetProcedureMapUrl + '/type/' + firstPair.entityType + '/entity/' + firstPair.entityId + '/views/' + firstPair.viewId;
    const response = await apiUtil.processAPIRequest('DELETE', deleteUrl, null, invalidHeaders, 'Deleting View Procedure Mapping with Invalid Token', 'full');

    expect(commonFunctions.isStatus(response.status, 401)).toBeTruthy();
  });

  test(`Test Case 12: Boundary - Import with Empty Mappings is Rejected`, async () => {
    const emptyPayload = { links: { entityViewsProcedure: [] } };
    const response = await apiUtil.processAPIRequest('POST', targetImportUrl, emptyPayload, headersForTarget, 'Importing View Procedure Mapping with Empty Mappings', 'full');

    expect(commonFunctions.isStatus(response.status, 500)).toBeTruthy();
    expect(response.data?.errorCode).toBe('IBP_PO_50_2059');
    expect(response.data?.message).toBe('Error while importing links');
  });

  test(`Test Case 13: Boundary - Delete Non-existent View Mapping is Graceful`, async () => {
    const [firstPair] = getEntityViewPairs(getEntityViewProcedures(TestData.IMPORT_PROCEDURE_MAPPING_PAYLOAD));
    const nonExistentViewId = '000000000000000000000000';
    const deleteUrl = targetProcedureMapUrl + '/type/' + firstPair.entityType + '/entity/' + firstPair.entityId + '/views/' + nonExistentViewId;
    const response = await apiUtil.processAPIRequest('DELETE', deleteUrl, null, headersForTarget, 'Deleting Non-existent View Procedure Mapping in Target Realm', 'full');

    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Delete non-existent view status assertion in target realm');
    const validation2 = await commonFunctions.compareTwoValues(/^Deleted 0 viewProcedureMappings successfully$/.test(String(response.data)), true, 'Delete non-existent view no-op message assertion in target realm');
    expect(validation1 && validation2).toBeTruthy();
  });

  test.afterAll(async () => {
    if (!headers || !headersForTarget) {
      return;
    }
    await commonFunctions.logMessage('INFO', 'Running entity view procedure mapping cleanup in source and target realms');
    const cleanupResults = await Promise.allSettled([
      clearProcedureMappings(headers, sourceProcedureMapUrl, sourceRealm),
      clearProcedureMappings(headersForTarget, targetProcedureMapUrl, targetRealm)
    ]);

    let cleanupSuccessful = true;
    for (const result of cleanupResults) {
      if (result.status === 'rejected') {
        const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
        await commonFunctions.logMessage('ERROR', `Entity view procedure mapping cleanup failed: ${message}`);
        cleanupSuccessful = false;
      } else {
        cleanupSuccessful = cleanupSuccessful && result.value;
      }
    }
    expect(cleanupSuccessful, 'Entity view procedure mapping cleanup should succeed in source and target realms').toBeTruthy();
  });
});
