import ApiUtil from "../../../util/api.util";
import CommonFunctions from "../../../util/common.util";
const Testdata = require(`../../../Testdata/${process.env.PSENV}/ProcessOrchestrationBackend/Migration/Test_006_EntitViewMappingMigration.json`);

let accessToken: string, accessTokenForTarget: string;
let headers: Record<string, string>, headersForTarget: Record<string, string>;

const sourceRealm = process.env.REALM_NAME_SOURCE || '';
const targetRealm = process.env.REALM_NAME_TARGET || '';
const sourceRealmId = process.env.REALM_ID_SOURCE || '';
const targetRealmId = process.env.REALM_ID_TARGET || '';
const sourceMachineClientId = process.env.REALM_CLIENT_ID_SOURCE || '';
const targetMachineClientId = process.env.REALM_CLIENT_ID_TARGET || '';
const sourceMachineClientSecret = process.env.REALM_CLIENT_SECRET_SOURCE || '';
const targetMachineClientSecret = process.env.REALM_CLIENT_SECRET_TARGET || '';
let exportedData: any;


describe("Entity View Mapping Migration", () => {
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

    it(`Test Case 1: Map 5 Views to Process & Subprocesses in the Source Realm ${sourceRealm}`, async () => {
        const url: string = process.env.API_BASE_URL as string + process.env.VIEW_ENTITY_MAP as string;
        const response = await ApiUtil.processAPIRequest("POST", url, Testdata.MAP_5_VIEWS_REQUEST_PAYLOAD, headers, "Mapping 5 Views to Entities", "full");
        const bValidation1 = await CommonFunctions.compareTwoValues(response.status, 200, "Mapping 5 Views to Entities Assertion");
        const bValidation2 = await CommonFunctions.compareTwoValues(response.data?.responseSummary.mappingsInserted, 55, "Mapping Insertions Assertion");

        const requestMappedViewIds = Testdata.MAP_5_VIEWS_REQUEST_PAYLOAD.views.map((view: any) => view.id).sort().toString();
        const responseMappedViewIds = (response.data?.requestedMappingDetails.views || []).map((view: any) => view.id).sort().toString();
        const bValidation3 = await CommonFunctions.compareTwoValues(requestMappedViewIds, responseMappedViewIds, "View Id's Assertion");

        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it(`Test Case 2: Verify Mapped Views in the Source Realm ${sourceRealm}`, async () => {
        const url: string = process.env.API_BASE_URL as string + process.env.VIEW_ENTITY_MAP as string;
        const response = await ApiUtil.processAPIRequest("POST", url + "/search", Testdata.SEARCH_MAPPINGS_REQUEST_PAYLOAD, headers, "Search Entity View Mappings in the Source Realm", "full");
        const bValidation1 = await CommonFunctions.compareTwoValues(response.status, 200, "Search Mappings Assertion");

        const arrActualEntityIds = response.data?.views.map((view: any) => view.entityId).sort().toString();
        const arrExpectedEntityIds = Testdata.MAP_5_VIEWS_REQUEST_PAYLOAD.entities[0].entityId.sort().toString();
        const bValidation2 = await CommonFunctions.compareTwoValues(arrActualEntityIds, arrExpectedEntityIds, "Entity Id's Assertion");

        const bValidation3 = await validateMappedViews(response.data?.views, Testdata.MAP_5_VIEWS_REQUEST_PAYLOAD.views);

        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it(`Test Case 3: Export Entity View Mapping from Source Realm ${sourceRealm}`, async () => {
        const url: string = process.env.API_BASE_URL as string + process.env.EXPORT_DATA as string;
        const response = await ApiUtil.processAPIRequest("POST", url, Testdata.FULL_ENTITY_VIEW_EXPORT_REQUEST_PAYLOAD, headers, "Performing Full Export", "full");
        const bValidation: boolean = await CommonFunctions.compareTwoValues(response.status, 200, "Full Export Assertion");
        exportedData = response.data;
        expect(bValidation).toBeTruthy();
    });

    it(`Test Case 4: Import Entity View Mapping to Target Realm ${targetRealm}`, async () => {
        const url: string = process.env.API_BASE_URL as string + process.env.IMPORT_DATA as string;
        const response = await ApiUtil.processAPIRequest("POST", url, exportedData, headersForTarget, "Performing Import in the Target Realm", "full");
        const bValidation1 = await CommonFunctions.compareTwoValues(response.status, 200, "Import Assertion");
        const bValidation2 = await CommonFunctions.compareTwoValues(response.data?.links.entityViews.insertedRecords >= 30, true, "Mapping Insertions Assertion - should be greater than or equal to 30");
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

    it(`Test Case 5: Verify Mapped Views in the Target Realm ${targetRealm}`, async () => {
        const url: string = process.env.API_BASE_URL as string + process.env.VIEW_ENTITY_MAP as string;
        const response = await ApiUtil.processAPIRequest("POST", url + "/search", Testdata.SEARCH_MAPPINGS_REQUEST_PAYLOAD, headersForTarget, "Search Entity View Mappings in the Target Realm", "full");
        const bValidation1 = await CommonFunctions.compareTwoValues(response.status, 200, "Search Mappings Assertion");

        const arrActualEntityIds = response.data?.views.map((view: any) => view.entityId).sort().toString();
        const arrExpectedEntityIds = Testdata.MAP_5_VIEWS_REQUEST_PAYLOAD.entities[0].entityId.sort().toString();
        const bValidation2 = await CommonFunctions.compareTwoValues(arrActualEntityIds, arrExpectedEntityIds, "Entity Id's Assertion");

        const bValidation3 = await validateMappedViews(response.data?.views, Testdata.MAP_5_VIEWS_REQUEST_PAYLOAD.views);

        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it(`Test Case 6: Map another 5 Views to Process & Subprocesses in the Source Realm ${sourceRealm}`, async () => {
        const url: string = process.env.API_BASE_URL as string + process.env.VIEW_ENTITY_MAP as string;
        const response = await ApiUtil.processAPIRequest("POST", url, Testdata.MAP_ANOTHER_5_VIEWS_REQUEST_PAYLOAD, headers, "Mapping 5 Views to Entities", "full");
        const bValidation1 = await CommonFunctions.compareTwoValues(response.status, 200, "Mapping 5 Views to Entities Assertion");
        const bValidation2 = await CommonFunctions.compareTwoValues(response.data?.responseSummary.mappingsInserted, 55, "Mapping Insertions Assertion");

        const requestMappedViewIds = Testdata.MAP_ANOTHER_5_VIEWS_REQUEST_PAYLOAD.views.map((view: any) => view.id).sort().toString();
        const responseMappedViewIds = (response.data?.requestedMappingDetails.views || []).map((view: any) => view.id).sort().toString();
        const bValidation3 = await CommonFunctions.compareTwoValues(requestMappedViewIds, responseMappedViewIds, "View Id's Assertion");

        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it(`Test Case 7: Verify Mapped Views in the Source Realm ${sourceRealm}`, async () => {
        const url: string = process.env.API_BASE_URL as string + process.env.VIEW_ENTITY_MAP as string;
        const response = await ApiUtil.processAPIRequest("POST", url + "/search", Testdata.SEARCH_MAPPINGS_REQUEST_PAYLOAD, headers, "Search Entity View Mappings in the Source Realm", "full");
        const bValidation1 = await CommonFunctions.compareTwoValues(response.status, 200, "Search Mappings Assertion");

        const arrActualEntityIds = response.data?.views.map((view: any) => view.entityId).sort().toString();
        const arrExpectedEntityIds = Testdata.MAP_ANOTHER_5_VIEWS_REQUEST_PAYLOAD.entities[0].entityId.sort().toString();
        const bValidation2 = await CommonFunctions.compareTwoValues(arrActualEntityIds, arrExpectedEntityIds, "Entity Id's Assertion");

        const bValidation3 = await validateMappedViews(response.data?.views, Testdata.MAP_ANOTHER_5_VIEWS_REQUEST_PAYLOAD.views);

        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it(`Test Case 8: Export Entity View Mapping from Source Realm ${sourceRealm}`, async () => {
        const url: string = process.env.API_BASE_URL as string + process.env.EXPORT_DATA as string;
        const response = await ApiUtil.processAPIRequest("POST", url, Testdata.FULL_ENTITY_VIEW_EXPORT_REQUEST_PAYLOAD, headers, "Performing Full Export", "full");
        const bValidation: boolean = await CommonFunctions.compareTwoValues(response.status, 200, "Full Export Assertion");
        exportedData = response.data;
        expect(bValidation).toBeTruthy();
    });

    it(`Test Case 9: Import Entity View Mapping to Target Realm ${targetRealm}`, async () => {
        const url: string = process.env.API_BASE_URL as string + process.env.IMPORT_DATA as string;
        const response = await ApiUtil.processAPIRequest("POST", url, exportedData, headersForTarget, "Performing Import in the Target Realm", "full");
        const bValidation1 = await CommonFunctions.compareTwoValues(response.status, 200, "Import Assertion");
        const bValidation2 = await CommonFunctions.compareTwoValues(response.data?.links.entityViews.insertedRecords >= 30, true, "Mapping Insertions Assertion - should be greater than or equal to 30");
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

    it(`Test Case 10: Verify Newly Mapped 5 Views in the Target Realm ${targetRealm}`, async () => {
        const url: string = process.env.API_BASE_URL as string + process.env.VIEW_ENTITY_MAP as string;
        const response = await ApiUtil.processAPIRequest("POST", url + "/search", Testdata.SEARCH_MAPPINGS_REQUEST_PAYLOAD, headersForTarget, "Search Entity View Mappings in the Target Realm", "full");
        const bValidation1 = await CommonFunctions.compareTwoValues(response.status, 200, "Search Mappings Assertion");

        const arrActualEntityIds = response.data?.views.map((view: any) => view.entityId).sort().toString();
        const arrExpectedEntityIds = Testdata.MAP_ANOTHER_5_VIEWS_REQUEST_PAYLOAD.entities[0].entityId.sort().toString();
        const bValidation2 = await CommonFunctions.compareTwoValues(arrActualEntityIds, arrExpectedEntityIds, "Entity Id's Assertion");

        const bValidation3 = await validateMappedViews(response.data?.views, Testdata.MAP_ANOTHER_5_VIEWS_REQUEST_PAYLOAD.views);

        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it(`Test Case 11: Verify old Mapped 5 Views in the Target Realm ${targetRealm}`, async () => {
        const url: string = process.env.API_BASE_URL as string + process.env.VIEW_ENTITY_MAP as string;
        const response = await ApiUtil.processAPIRequest("POST", url + "/search", Testdata.SEARCH_MAPPINGS_REQUEST_PAYLOAD, headersForTarget, "Search Entity View Mappings in the Target Realm", "full");
        const bValidation1 = await CommonFunctions.compareTwoValues(response.status, 200, "Search Mappings Assertion");

        const arrActualEntityIds = response.data?.views.map((view: any) => view.entityId).sort().toString();
        const arrExpectedEntityIds = Testdata.MAP_5_VIEWS_REQUEST_PAYLOAD.entities[0].entityId.sort().toString();
        const bValidation2 = await CommonFunctions.compareTwoValues(arrActualEntityIds, arrExpectedEntityIds, "Entity Id's Assertion");

        const bValidation3 = await validateMappedViews(response.data?.views, Testdata.MAP_5_VIEWS_REQUEST_PAYLOAD.views);

        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it(`Test Case 12: Clear Entity View Mapping in Source Realm ${sourceRealm}`, async () => {
        const url: string = process.env.API_BASE_URL as string + process.env.VIEW_ENTITY_MAP as string;
        const response = await ApiUtil.processAPIRequest("POST", url + "/clear", Testdata.CLEAR_MAPPINGS_REQUEST_PAYLOAD, headers, "Clearing Entity View Mappings in the Source Realm", "full");
        const bValidation1 = await CommonFunctions.compareTwoValues(response.status, 200, "Clear Mappings Assertion");
        const bValidation2 = await CommonFunctions.compareTwoValues(response.data, "Deleted 55 views successfully", "Clearing Mappings Assertion");
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

    it(`Test Case 13: Clear Entity View Mapping in Target Realm ${targetRealm}`, async () => {
        const url: string = process.env.API_BASE_URL as string + process.env.VIEW_ENTITY_MAP as string;
        const response = await ApiUtil.processAPIRequest("POST", url + "/clear", Testdata.CLEAR_MAPPINGS_REQUEST_PAYLOAD, headersForTarget, "Clearing Entity View Mappings in the Target Realm", "full");
        const bValidation1 = await CommonFunctions.compareTwoValues(response.status, 200, "Clear Mappings Assertion");
        const bValidation2 = await CommonFunctions.compareTwoValues(response.data, "Deleted 110 views successfully", "Clearing Mappings Assertion");
        expect(bValidation1 && bValidation2).toBeTruthy();
    });
});

// Helper function for mapped view validation
async function validateMappedViews(responseViews: any[], expectedViews: any[]): Promise<boolean> {
    let allValid = true;
    for (const [i, view] of (responseViews || []).entries()) {
        await CommonFunctions.logMessage("INFO", `i: ${i}, entityId: ${view.entityId}`);
        for (const [j, mappedView] of (view.views || []).entries()) {
            await CommonFunctions.logMessage(
                "INFO",
                `j: ${j}, id: ${mappedView.id}, sequence: ${mappedView.sequence}, hidden: ${mappedView.hidden}`
            );
            const expectedView = expectedViews.find((v: any) => v.id === mappedView.id);
            if (expectedView) {
                const seqValid = await CommonFunctions.compareTwoValues(mappedView.sequence, expectedView.sequence, "View Sequence Assertion");
                const hiddenValid = await CommonFunctions.compareTwoValues(mappedView.hidden, expectedView.hidden, "View Hidden Assertion");
                allValid = allValid && seqValid && hiddenValid;
            }
        }
    }
    return allValid;
}

/*
// Helper function for mapped view validation - Legacy Version
async function validateMappedViewsLegacy(responseViews: any[], expectedViews: any[]): Promise<boolean> {
    let allValid: boolean = true;
    for (let i = 0; i < (responseViews.length); i++) {
        const view = responseViews[i];
        await CommonFunctions.logMessage("INFO", "i: " + i + ", entityId: " + view.entityId);
        for (let j = 0; j < (view.views.length); j++) {
            await CommonFunctions.logMessage("INFO", `j: ${j}, id: ${view.views[j].id}, sequence: ${view.views[j].sequence}, hidden: ${view.views[j].hidden}`);
            for (let k = 0; k < (expectedViews.length); k++) {
                if (view.views[j].id === expectedViews[k].id) {
                    const bValidation4 = await CommonFunctions.compareTwoValues(view.views[j].sequence, expectedViews[k].sequence, "View Sequence Assertion");
                    const bValidation5 = await CommonFunctions.compareTwoValues(view.views[j].hidden, expectedViews[k].hidden, "View Hidden Assertion");
                    allValid = allValid && bValidation4 && bValidation5;
                }
            }
        }
    }
    return allValid;
}*/