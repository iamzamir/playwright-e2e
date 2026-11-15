import ApiUtil from "../../../util/api.util";
import CommonFunctions from "../../../util/common.util";
const TestData = require(`../../../Testdata/${process.env.PSENV}/ProcessOrchestrationBackend/Migration/Test_004_SupplyChainActionsMigration.json`);

const sourceRealm = process.env.PSENV === "QA" ? TestData.REALM_NAME_SOURCE || '' : process.env.REALM_NAME_SOURCE || '';
const targetRealm = process.env.PSENV === "QA" ? TestData.REALM_NAME_TARGET || '' : process.env.REALM_NAME_TARGET || '';
const sourceRealmId = process.env.PSENV === "QA" ? TestData.REALM_ID_SOURCE || '' : process.env.REALM_ID_SOURCE || '';
const targetRealmId = process.env.PSENV === "QA" ? TestData.REALM_ID_TARGET || '' : process.env.REALM_ID_TARGET || '';
const sourceMachineClientId = process.env.PSENV === "QA" ? TestData.REALM_CLIENT_ID_SOURCE || '' : process.env.REALM_CLIENT_ID_SOURCE || '';
const targetMachineClientId = process.env.PSENV === "QA" ? TestData.REALM_CLIENT_ID_TARGET || '' : process.env.REALM_CLIENT_ID_TARGET || '';
const sourceMachineClientSecret = process.env.PSENV === "QA" ? process.env.REALM_CLIENT_SECRET_PO_QA_MIG_3 || '' : process.env.REALM_CLIENT_SECRET_SOURCE || '';
const targetMachineClientSecret = process.env.PSENV === "QA" ? process.env.REALM_CLIENT_SECRET_PO_QA_MIG_4 || '' : process.env.REALM_CLIENT_SECRET_TARGET || '';
let accessToken: string, accessTokenForTarget: string, headers: Record<string, string>, headersForTarget: Record<string, string>, dataToImportInTarget: any, getSCAResponse: any;

describe(`Supply Chain Actions Migration from ${sourceRealm} to ${targetRealm}`, () => {

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
    it(`Test Case 1: Export and import SCA partially to target realm : ${targetRealm}`, async () => {
        const exportUrl: string = process.env.API_BASE_URL as string + process.env.EXPORT_DATA as string;
        const importUrl: string = process.env.API_BASE_URL as string + process.env.IMPORT_DATA as string;
        const exportDataPayload = TestData.PARTIAL_EXPORT_PAYLOAD;
        const exportSCAResponse = await ApiUtil.processAPIRequest("POST", exportUrl, exportDataPayload, headers, "Export supply chain actions", "full");
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(exportSCAResponse.status, 200, "Export supply chain actions success assertion");
        dataToImportInTarget = exportSCAResponse.data;
        const importSCAResponse = await ApiUtil.processAPIRequest("POST", importUrl, dataToImportInTarget, headersForTarget, "Import supply chain actions", "full");
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(importSCAResponse.status, 200, "Import supply chain actions success assertion");
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(JSON.stringify(importSCAResponse.data.supplyChainActions.sort()), JSON.stringify(exportDataPayload.supplyChainActions.sort()), "Import supply chain actions data assertion");
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it(`Test Case 2: Verify SCA reflected in target realm : ${targetRealm}`, async () => {
        const getSupplyChainActionsUrl: string = process.env.API_BASE_URL as string + process.env.GET_SUPPLY_CHAIN_ACTIONS as string;
        getSCAResponse = await ApiUtil.processAPIRequest("GET", getSupplyChainActionsUrl, undefined, headersForTarget, "Get supply chain actions", "full");
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(getSCAResponse.status, 200, "Get supply chain actions success assertion");
        const isAllSCAExist = TestData.PARTIAL_EXPORT_PAYLOAD.supplyChainActions.every((sca: any) => getSCAResponse.data.find((item: any) => item.name === sca));
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(isAllSCAExist, true, "All partial imported supply chain actions reflect in SCA api response");
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

    it(`Test Case 3: Export and import SCA fully to target realm: ${targetRealm}`, async () => {
        const exportUrl: string = process.env.API_BASE_URL as string + process.env.EXPORT_DATA as string;
        const importUrl: string = process.env.API_BASE_URL as string + process.env.IMPORT_DATA as string;
        const exportDataPayload = TestData.FULL_EXPORT_PAYLOAD;
        const exportSCAResponse = await ApiUtil.processAPIRequest("POST", exportUrl, exportDataPayload, headers, "Export supply chain actions", "full");
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(exportSCAResponse.status, 200, "Export supply chain actions success assertion");
        dataToImportInTarget = exportSCAResponse.data;
        const importSCAResponse = await ApiUtil.processAPIRequest("POST", importUrl, dataToImportInTarget, headersForTarget, "Import supply chain actions", "full");
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(importSCAResponse.status, 200, "Import supply chain actions success assertion");
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(JSON.stringify(importSCAResponse.data.supplyChainActions), JSON.stringify(dataToImportInTarget.supplyChainActions.map((item: any) => item.name)), "Import supply chain actions data assertion");
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it(`Test Case 4: Verify all SCA reflected in target realm: ${targetRealm}`, async () => {
        const getSupplyChainActionsUrl: string = process.env.API_BASE_URL as string + process.env.GET_SUPPLY_CHAIN_ACTIONS as string;
        getSCAResponse = await ApiUtil.processAPIRequest("GET", getSupplyChainActionsUrl, undefined, headersForTarget, "Get supply chain actions", "full");
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(getSCAResponse.status, 200, "Get supply chain actions success assertion");
        const isAllSCAExist = dataToImportInTarget.supplyChainActions.every((sca: any) => getSCAResponse.data.find((item: any) => item.name === sca.name));
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(isAllSCAExist, true, "All full imported supply chain actions reflect in SCA api response");
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

    it(`Test Case 5: Delete all migrated SCA from target realm: ${targetRealm}`, async () => {
        await Promise.all(getSCAResponse.data.map(async (sca: any) => {
            if (sca.name.startsWith("MigrationSCA")) {
                const deleteSCAUrl: string = process.env.API_BASE_URL as string + process.env.DELETE_SUPPLY_CHAIN_ACTION?.replace("{id}", sca.id);
                const deleteSCAResponseStatus = await ApiUtil.processAPIRequest("DELETE", deleteSCAUrl, undefined, headersForTarget, "Delete supply chain action", "status");
                const bValidation: boolean = await CommonFunctions.compareTwoValues(deleteSCAResponseStatus, 200, `Delete supply chain action ${sca.name} success assertion`);
                expect(bValidation).toBeTruthy();
            }
        }));
    });


});