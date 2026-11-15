import ApiUtil from "../../../util/api.util";
import CommonFunctions from "../../../util/common.util";
import MappingUtil from "../../../util/mapping.util";
const Testdata = require(`../../../Testdata/${process.env.PSENV}/ProcessOrchestrationBackend/Migration/Test_003_FullAndPartialExport.json`);

let accessToken: string;
let headers: Record<string, string> = {};
const realmId = process.env.REALM_ID_SOURCE || '';
const machineClientId = process.env.REALM_CLIENT_ID_SOURCE || '';
const machineClientSecret = process.env.REALM_CLIENT_SECRET_SOURCE || '';
describe('full and partial export', () => {

    before(async () => {
        accessToken = await ApiUtil.getBearerToken(undefined, machineClientId, machineClientSecret, undefined, realmId);
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessToken
        };
    });

    it('Test Case 1: should export full data', async () => {
        const url: string = process.env.API_BASE_URL as string + process.env.EXPORT_DATA as string;
        const exportDataPayload = Testdata.FULL_EXPORT_PAYLOAD
        const exportProcessResponse = await ApiUtil.processAPIRequest("POST", url, exportDataPayload, headers, "Export full data", "full");
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(exportProcessResponse.status, 200, "Export full data success assertion");
        const payloadKeys = MappingUtil.extractAllKeys(exportDataPayload).map(key => key.toLowerCase()).sort();
        const responseKeys = MappingUtil.extractAllKeys(exportProcessResponse.data).map(key => key.toLowerCase()).filter(key => key !== 'links.tenantid').sort();
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(responseKeys.length, payloadKeys.length, "Exported data length assertion");
        const missingKeys = payloadKeys.filter(key => !responseKeys.includes(key));
        await CommonFunctions.logMessage("INFO", `Missing keys in exported data: ${missingKeys.join(', ')}`);
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(missingKeys.length, 0, "Exported data missing keys assertion");
        const bValidation4: boolean = await CommonFunctions.compareTwoValues(JSON.stringify(responseKeys), JSON.stringify(payloadKeys), "Exported data keys assertion");
        const bValidation5: boolean = await CommonFunctions.compareTwoValues(exportProcessResponse.data.processes.length >= 1, true, "Atleast one process exported assertion");
        const bValidation6: boolean = await CommonFunctions.compareTwoValues(exportProcessResponse.data.calendars.length >= 1, true, "Atleast one calendar exported assertion");
        const bValidation7: boolean = await CommonFunctions.compareTwoValues(exportProcessResponse.data.actionItems.kpis.length >= 1, true, "Atleast one action item KPI exported assertion");
        const bValidation8: boolean = await CommonFunctions.compareTwoValues(exportProcessResponse.data.featureToggle.TenantLevel.length >= 1, true, "Atleast one tenant level feature flag exported assertion");
        const bValidation9: boolean = await CommonFunctions.compareTwoValues(exportProcessResponse.data.featureToggle.Processes.length >= 1, true, "Atleast one process level feature flag exported assertion");
        const bValidation10: boolean = await CommonFunctions.compareTwoValues(exportProcessResponse.data.links.entityViewsProcedure.length >= 1, true, "Atleast one entity view procedure mapping exported assertion");
        const bValidation11: boolean = await CommonFunctions.compareTwoValues(exportProcessResponse.data.links.entityViews.length >= 1, true, "Atleast one entity view mapping exported assertion");
        const bValidation12: boolean = await CommonFunctions.compareTwoValues(exportProcessResponse.data.supplyChainActions.length >= 1, true, "Atleast one supply chain action exported assertion");
        const bValidation13: boolean = await CommonFunctions.compareTwoValues(exportProcessResponse.data.assumptions.kpi_configs.length >= 1, true, "Atleast one KPI config of assumption exported assertion");
        const bValidation14: boolean = await CommonFunctions.compareTwoValues(exportProcessResponse.data.assumptions.assumption_types.length >= 1, true, "Atleast one assumption type exported assertion");
        expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation9 && bValidation10 && bValidation11 && bValidation12 && bValidation13 && bValidation14).toBeTruthy();
    });

    it(`Test Case 2: should export partial data`, async () => {
        const url: string = process.env.API_BASE_URL as string + process.env.EXPORT_DATA as string;
        const exportDataPayload = Testdata.PARTIAL_EXPORT_PAYLOAD
        const exportProcessResponse = await ApiUtil.processAPIRequest("POST", url, exportDataPayload, headers, "Export partial data", "full");
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(exportProcessResponse.status, 200, "Export partial data success assertion");
        const payloadKeys = MappingUtil.extractAllKeys(exportDataPayload).map(key => key.toLowerCase()).sort();
        const responseKeys = MappingUtil.extractAllKeys(exportProcessResponse.data).map(key => key.toLowerCase()).filter(key => key !== 'links.tenantid').sort();
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(responseKeys.length, payloadKeys.length, "Exported data length assertion");
        const missingKeys = payloadKeys.filter(key => !responseKeys.includes(key));
        await CommonFunctions.logMessage("INFO", `Missing keys in exported data: ${missingKeys.join(', ')}`);
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(missingKeys.length, 0, "Exported data missing keys assertion");
        const bValidation4: boolean = await CommonFunctions.compareTwoValues(JSON.stringify(responseKeys), JSON.stringify(payloadKeys), "Exported data keys assertion");
        const bValidation5: boolean = await CommonFunctions.compareTwoValues(exportProcessResponse.data.processes.length === exportDataPayload.processes.length && exportProcessResponse.data.processes[0]?.name === exportDataPayload.processes[0], true, "Should export the given process name partially assertion");
        const bValidation6: boolean = await CommonFunctions.compareTwoValues(exportProcessResponse.data.calendars.length === exportDataPayload.calendars.length && exportProcessResponse.data.calendars[0]?.calendarName === exportDataPayload.calendars[0], true, "Should export the given calendar name partially assertion");
        const bValidation7: boolean = await CommonFunctions.compareTwoValues(exportProcessResponse.data.actionItems.kpis.length === exportDataPayload.actionItems.kpis.length && exportProcessResponse.data.actionItems.kpis[0]?.kpi.kpiConfigAttributes.every((item) => item.kpiId === exportDataPayload.actionItems.kpis[0]), true, "Should export the given action item KPI config attributes partially assertion");
        const bValidation8: boolean = await CommonFunctions.compareTwoValues(exportProcessResponse.data.links.entityViews.length === exportDataPayload.links.entityViews[0]?.entityId?.length && exportProcessResponse.data.links.entityViews[0]?.entityId === exportDataPayload.links.entityViews[0]?.entityId?.[0], true, "Should export the given entity view ID partially assertion");
        const bValidation9: boolean = await CommonFunctions.compareTwoValues(exportProcessResponse.data.links.entityViewsProcedure?.length === (exportDataPayload.links.entityViewsProcedure?.[0]?.entityId?.length ?? 0) && exportProcessResponse.data.links.entityViewsProcedure?.[0]?.entityId == exportDataPayload.links.entityViewsProcedure?.[0]?.entityId?.[0], true, "Should export the given entity view procedure ID partially assertion");
        const bValidation10: boolean = await CommonFunctions.compareTwoValues(exportProcessResponse.data.supplyChainActions.length === exportDataPayload.supplyChainActions.length && exportProcessResponse.data.supplyChainActions?.[0]?.name == exportDataPayload.supplyChainActions?.[0], true, "Should export the given supply chain action partially assertion");
        expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation9 && bValidation10).toBeTruthy();
    });

});