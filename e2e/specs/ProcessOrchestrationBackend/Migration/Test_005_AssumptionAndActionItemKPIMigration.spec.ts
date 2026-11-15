import ApiUtil from "../../../util/api.util";
import CommonFunctions from "../../../util/common.util";
const TestData = require(`../../../Testdata/${process.env.PSENV}/ProcessOrchestrationBackend/Migration/Test_005_AssumptionAndActionItemKPIMigration.json`);

const sourceRealm = process.env.REALM_NAME_SOURCE || '';
const targetRealm = process.env.REALM_NAME_TARGET || '';
const sourceRealmId = process.env.REALM_ID_SOURCE || '';
const targetRealmId = process.env.REALM_ID_TARGET || '';
const sourceMachineClientId = process.env.REALM_CLIENT_ID_SOURCE || '';
const targetMachineClientId = process.env.REALM_CLIENT_ID_TARGET || '';
const sourceMachineClientSecret = process.env.REALM_CLIENT_SECRET_SOURCE || '';
const targetMachineClientSecret = process.env.REALM_CLIENT_SECRET_TARGET || '';

let accessToken: string, accessTokenForTarget: string, headers: Record<string, string>, headersForTarget: Record<string, string>, 
dataToImportInTarget: any, kpiInSource: string,kpiInTarget: string, actionItemkpiInTarget: string, actionItemkpiInSource: string;

describe('Assumption and Action Item KPI Migration', () => {

  before(async () => {
    accessToken = await ApiUtil.getBearerToken(undefined, sourceMachineClientId, sourceMachineClientSecret, undefined, sourceRealmId);
    headers = {
      "accept": "application/json",
      "Authorization": "Bearer " + accessToken
    };
    accessTokenForTarget = await ApiUtil.getBearerToken(undefined, targetMachineClientId, targetMachineClientSecret, undefined, targetRealmId);
    headersForTarget = {
      "accept": "application/json",
      "Authorization": "Bearer " + accessTokenForTarget
    };
  });

  it(`Test Case 1: Create assumption KPI definition in source realm: ${sourceRealm}`, async () => {
    const createKpiUrl = process.env.API_BASE_URL as string + process.env.CREATE_ASSUMPTION_KPI_CONFIG as string;
    const payload = TestData.PAYLOAD_FOR_ASSUMPTION_KPI_DEFINITION;
    const kpiResponse = await ApiUtil.processAPIRequest("POST", createKpiUrl, payload, headers, "Create assumption KPI", "full");
    const bValidation1 = await CommonFunctions.compareTwoValues(kpiResponse.status, 201, "Status code for Assumption KPI definition creation in source realm");
    const bValidation2 = await CommonFunctions.compareTwoValues(kpiResponse.data.name, payload.name, "Name of Assumption KPI definition in source realm");
    kpiInSource = kpiResponse.data.id;
    TestData.EXPORT_PAYLOAD_FOR_ASSUMPTION_KPI.assumptions.kpi_configs.push(kpiInSource);
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  it(`Test Case 2: Export Assumption KPI definition from source realm: ${sourceRealm}`, async () => {
    const exportUrl = process.env.API_BASE_URL as string + process.env.EXPORT_DATA as string;
    const exportDataPayload = TestData.EXPORT_PAYLOAD_FOR_ASSUMPTION_KPI;
    const exportAssumptionKPIResponse = await ApiUtil.processAPIRequest("POST", exportUrl, exportDataPayload, headers,"Export Assumption KPI with process", "full");
    const bValidation1 = await CommonFunctions.compareTwoValues(exportAssumptionKPIResponse.status, 200, "Status code for Assumption KPI definition export from source realm");
    dataToImportInTarget = exportAssumptionKPIResponse.data;
    expect(bValidation1).toBeTruthy();
  });

  it(`Test Case 3: Import Assumption KPI definition in target realm: ${targetRealm}`, async () => {
    const importUrl = process.env.API_BASE_URL as string + process.env.IMPORT_DATA as string;
    const importAssumptionKPIResponse = await ApiUtil.processAPIRequest("POST", importUrl, dataToImportInTarget, headersForTarget, "Import Assumption KPI with process", "full");
    const bValidation1 = await CommonFunctions.compareTwoValues(importAssumptionKPIResponse.status, 200, "Status code for Assumption KPI definition import in target realm");
    kpiInTarget = importAssumptionKPIResponse.data.assumptions.kpi_configs[0];
    expect(bValidation1).toBeTruthy();
  });

  it(`Test Case 4: Remove Assumption KPI definition from target realm: ${targetRealm}`, async () => {
    const deleteKpiUrl = process.env.API_BASE_URL as string + (process.env.DELETE_ASSUMPTION_KPI_CONFIG as string).replace("{id}", kpiInTarget);
    const deleteKpiResponse = await ApiUtil.processAPIRequest("DELETE", deleteKpiUrl, {}, headersForTarget, "Delete Assumption KPI definition in target realm", "full");
    const bValidation1 = await CommonFunctions.compareTwoValues(deleteKpiResponse.status, 200, "Status code for Assumption KPI definition deletion in target realm assertion");
    const bValidation2 = await CommonFunctions.compareTwoValues(deleteKpiResponse.data, "Kpi Configuration deleted successfully.", "Assumption KPI definition deletion in target realm assertion");
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  it(`Test Case 5: Remove Assumption KPI definition from source realm: ${sourceRealm}`, async () => {
    const deleteKpiUrl = process.env.API_BASE_URL as string + (process.env.DELETE_ASSUMPTION_KPI_CONFIG as string).replace("{id}", kpiInSource);
    const deleteKpiResponse = await ApiUtil.processAPIRequest("DELETE", deleteKpiUrl, {}, headers, "Delete Assumption KPI definition in source realm", "full");
    const bValidation1 = await CommonFunctions.compareTwoValues(deleteKpiResponse.status, 200, "Status code for Assumption KPI definition deletion in source realm assertion");
    const bValidation2 = await CommonFunctions.compareTwoValues(deleteKpiResponse.data, "Kpi Configuration deleted successfully.", "Assumption KPI definition deletion in source realm assertion");
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  it(`Test Case 6: Create action item KPI definition in source realm: ${sourceRealm}`, async () => {
    const createKpiUrl = process.env.API_BASE_URL as string + process.env.CREATE_ACTIONITEM_KPI_CONFIG as string;
    const payload = TestData.PAYLOAD_FOR_ACTION_ITEM_KPI_DEFINITION;
    const kpiResponse = await ApiUtil.processAPIRequest("POST", createKpiUrl, payload, headers, "Create action item KPI", "full");
    const bValidation1 = await CommonFunctions.compareTwoValues(kpiResponse.status, 201, "Status code for Action Item KPI definition creation in source realm");
    const bValidation2 = await CommonFunctions.compareTwoValues(kpiResponse.data.displayName, payload.displayName, "Name of Action Item KPI definition in source realm");
    actionItemkpiInSource = kpiResponse.data.id;
    TestData.EXPORT_PAYLOAD_FOR_ACTION_ITEM_KPI.actionItems.kpis.push(actionItemkpiInSource);
    expect(bValidation1 && bValidation2).toBeTruthy();

  });

  it(`Test Case 7: Export Action Item KPI definition from source realm: ${sourceRealm}`, async () => {
    const exportUrl = process.env.API_BASE_URL as string + process.env.EXPORT_DATA as string;
    const exportDataPayload = TestData.EXPORT_PAYLOAD_FOR_ACTION_ITEM_KPI;
    const exportActionItemKPIResponse = await ApiUtil.processAPIRequest("POST", exportUrl, exportDataPayload, headers,"Export Action Item KPI with process", "full");
    const bValidation1 = await CommonFunctions.compareTwoValues(exportActionItemKPIResponse.status, 200, "Status code for Action Item KPI definition export from source realm");
    dataToImportInTarget = exportActionItemKPIResponse.data;
    expect(bValidation1).toBeTruthy();
  });

  it(`Test Case 8: Import Action Item KPI definition in target realm: ${targetRealm}`, async () => {
    const importUrl = process.env.API_BASE_URL as string + process.env.IMPORT_DATA as string;
    const importActionItemKPIResponse = await ApiUtil.processAPIRequest("POST", importUrl, dataToImportInTarget, headersForTarget, "Import Action Item KPI with process", "full");
    const bValidation1 = await CommonFunctions.compareTwoValues(importActionItemKPIResponse.status, 200, "Status code for Action Item KPI definition import in target realm");
    actionItemkpiInTarget = importActionItemKPIResponse.data.actionItems.kpis[0];
    expect(bValidation1).toBeTruthy();
  });

  it(`Test Case 9: Remove Action Item KPI definition from target realm: ${targetRealm}`, async () => {
    const deleteKpiUrl = process.env.API_BASE_URL as string + (process.env.DELETE_ACTIONITEM_KPI as string).replace("{id}", actionItemkpiInTarget);
    const deleteKpiResponse = await ApiUtil.processAPIRequest("DELETE", deleteKpiUrl, null, headersForTarget, "Delete Action Item KPI definition in target realm", "full");
    const bValidation1 = await CommonFunctions.compareTwoValues(deleteKpiResponse.status, 200, "Status code for Action Item KPI definition deletion in target realm assertion");
    expect(bValidation1).toBeTruthy();
  });

    it(`Test Case 10: Remove Action Item KPI definition from source realm: ${sourceRealm}`, async () => {
    const deleteKpiUrl = process.env.API_BASE_URL as string + (process.env.DELETE_ACTIONITEM_KPI as string).replace("{id}", actionItemkpiInSource);
    const deleteKpiResponse = await ApiUtil.processAPIRequest("DELETE", deleteKpiUrl, null, headers, "Delete Action Item KPI definition in source realm", "full");
    const bValidation1 = await CommonFunctions.compareTwoValues(deleteKpiResponse.status, 200, "Status code for Action Item KPI definition deletion in source realm assertion");
    expect(bValidation1).toBeTruthy();
  });

});