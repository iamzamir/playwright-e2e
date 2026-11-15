import ApiUtil from "../../../util/api.util";
import CommonFunctions from "../../../util/common.util";
const Testdata = require(`../../../Testdata/${process.env.PSENV}/ProcessOrchestrationBackend/Migration/Test_001_CalendarMigration.json`);

let accessToken: string, accessTokenForTarget: string, headers: Record<string, string>, headersForTarget: Record<string, string>, dataToImportInTarget: any;
const expectedCycles: string[] = Testdata.PAYLOAD.cycles.map((cycle: any) => cycle.cycleName);

const sourceRealm = process.env.REALM_NAME_SOURCE || '';
const targetRealm = process.env.REALM_NAME_TARGET || '';
const sourceRealmId = process.env.REALM_ID_SOURCE || '';
const targetRealmId = process.env.REALM_ID_TARGET || '';
const sourceMachineClientId = process.env.REALM_CLIENT_ID_SOURCE || '';
const targetMachineClientId = process.env.REALM_CLIENT_ID_TARGET || '';
const sourceMachineClientSecret = process.env.REALM_CLIENT_SECRET_SOURCE || '';
const targetMachineClientSecret = process.env.REALM_CLIENT_SECRET_TARGET || '';

// Helper function to extract and validate cycles from API response
const validateCyclesFromResponse = async (cyclesGetResponse: any, expectedCycles: string[], calendarName: string, realm: string): Promise<boolean> => {
    // Extract cycles from response
    const actualCycles = (cyclesGetResponse.data?.data && Array.isArray(cyclesGetResponse.data.data)) 
        ? cyclesGetResponse.data.data.map((cycle: any) => cycle.name || cycle.cycleName) 
        : [];
    
    // Validate cycle count
    const bValidation1: boolean = await CommonFunctions.compareTwoValues(actualCycles.length, expectedCycles.length, `Verify calendar ${calendarName} cycles count in ${realm}`);

    // Validate each expected cycle exists
    let allCyclesValid = true;
    for (const expectedCycle of expectedCycles) {
        const cycleExists = actualCycles.includes(expectedCycle);
        if (!cycleExists) {
            console.log(`Expected cycle ${expectedCycle} not found in ${realm}`);
            allCyclesValid = false;
        }
    }
    const bValidation2: boolean = await CommonFunctions.compareTwoValues(allCyclesValid, true, `Verify all expected cycles exist in calendar ${calendarName} in ${realm}`);

    return bValidation1 && bValidation2;
};

describe("calendar migration", () => {
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
    })
    it(`Test Case 1: Create calendar data from source realm ${sourceRealm}`, async () => {
        const url: string = process.env.API_BASE_URL as string + process.env.CALENDAR as string;
        const createCalendarStatus = await ApiUtil.processAPIRequest("POST", url, Testdata.PAYLOAD, headers, "Create calendar API", "status");
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(createCalendarStatus, 201, "Create calendar success assertion");
        expect(bValidation1).toBeTruthy();
    });

    it(`Test Case 2: verify calendar data via API in source realm ${sourceRealm}`, async () => {
        // Get calendar data via API
        const url: string = process.env.API_BASE_URL as string + process.env.CALENDAR as string;
        const createCalendarStatusGet = await ApiUtil.processAPIRequest("GET", url+"/"+Testdata.PAYLOAD.calendarName, null, headers, "Get calendar API", "status");
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(createCalendarStatusGet, 200, `Get calendar success assertion in ${sourceRealm}`);
        
        // Get calendar cycles
        const cycleUrl: string = process.env.API_BASE_URL as string + (process.env.ADD_CALENDAR_CYCLE as string).replace("{calendarName}", Testdata.PAYLOAD.calendarName);
        const cyclesGetResponse = await ApiUtil.processAPIRequest("GET", cycleUrl+"?pageNumber=0&pageSize=100", null, headers, "Get calendar cycles", "full");
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(cyclesGetResponse.status, 200, `Get calendar cycles success assertion in ${sourceRealm}`);
        
        // Validate cycles using helper function
        const bValidation3: boolean = await validateCyclesFromResponse(cyclesGetResponse, expectedCycles, Testdata.PAYLOAD.calendarName, sourceRealm);

        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it(`Test Case 3: Export calendar data from source realm ${sourceRealm}`, async () => {
        const url: string = process.env.API_BASE_URL as string + (process.env.EXPORT_DATA as string);
        const exportDataPayload = { "calendars": [Testdata.PAYLOAD.calendarName] }
        const exportCalendarResponse = await ApiUtil.processAPIRequest("POST", url, exportDataPayload, headers, "Export calendar", "full");
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(exportCalendarResponse.status, 200, "Export calendar success assertion");
        dataToImportInTarget = exportCalendarResponse.data;
        expect(bValidation1).toBeTruthy();
    });

    it(`Test Case 4: Import calendar data to target realm ${targetRealm}`, async () => {
        const url: string = process.env.API_BASE_URL as string + (process.env.IMPORT_DATA as string);
        const importCalendarResponse = await ApiUtil.processAPIRequest("POST", url, dataToImportInTarget, headersForTarget, "Import calendar", "full");
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(importCalendarResponse.status, 200, `Import calendar success assertion in target realm:  ${targetRealm}`);
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(importCalendarResponse.data.calendars[0], Testdata.PAYLOAD.calendarName, `Import calendar response assertion in target realm:  ${targetRealm}`);
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

    it(`Test Case 5: verify calendar data via API in target realm ${targetRealm}`, async () => {
        // Get calendar data via API
        const url: string = process.env.API_BASE_URL as string + process.env.CALENDAR as string;
        const createCalendarStatusGet = await ApiUtil.processAPIRequest("GET", url+"/"+Testdata.PAYLOAD.calendarName, null, headersForTarget, "Get calendar API", "status");
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(createCalendarStatusGet, 200, `Get calendar success assertion in ${targetRealm}`);
        
        // Get calendar cycles
        const cycleUrl: string = process.env.API_BASE_URL as string + (process.env.ADD_CALENDAR_CYCLE as string).replace("{calendarName}", Testdata.PAYLOAD.calendarName);
        const cyclesGetResponse = await ApiUtil.processAPIRequest("GET", cycleUrl+"?pageNumber=0&pageSize=100", null, headersForTarget, "Get calendar cycles", "full");
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(cyclesGetResponse.status, 200, `Get calendar cycles success assertion in ${targetRealm}`);
        
        // Validate cycles using helper function
        const bValidation3: boolean = await validateCyclesFromResponse(cyclesGetResponse, expectedCycles, Testdata.PAYLOAD.calendarName, targetRealm);

        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    const cycleToAdd = {
        "cycleName": "Sample Cycle 11",
        "description": "Sample Cycle 11",
        "startDate": "2024-11-22T06:57:33.967Z",
        "endDate": "2024-12-22T06:57:33.967Z"
    }
    it(`Test Case 6: update calendar cycle data from source realm ${sourceRealm}`, async () => {
        const url: string = process.env.API_BASE_URL as string + (process.env.ADD_CALENDAR_CYCLE as string).replace("{calendarName}", Testdata.PAYLOAD.calendarName);
        const createCalendarStatus = await ApiUtil.processAPIRequest("POST", url, cycleToAdd, headers, "add calendar cycle", "status");
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(createCalendarStatus, 201, "Create calendar success assertion");
        expect(bValidation1).toBeTruthy();
    });

    it(`Test Case 7: verify updated calendar data via API in source realm ${sourceRealm}`, async () => {
        // Get calendar data via API
        const url: string = process.env.API_BASE_URL as string + process.env.CALENDAR as string;
        const createCalendarStatusGet = await ApiUtil.processAPIRequest("GET", url+"/"+Testdata.PAYLOAD.calendarName, null, headers, "Get calendar API", "status");
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(createCalendarStatusGet, 200, `Get calendar success assertion in ${sourceRealm}`);
        
        // Get calendar cycles
        const cycleUrl: string = process.env.API_BASE_URL as string + (process.env.ADD_CALENDAR_CYCLE as string).replace("{calendarName}", Testdata.PAYLOAD.calendarName);
        const cyclesGetResponse = await ApiUtil.processAPIRequest("GET", cycleUrl+"?pageNumber=0&pageSize=100", null, headers, "Get calendar cycles", "full");
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(cyclesGetResponse.status, 200, `Get calendar cycles success assertion in ${sourceRealm}`);
        
        // Validate cycles using helper function (with added cycle)
        const expectedCyclesWithNew = [...expectedCycles, cycleToAdd.cycleName];
        const bValidation3: boolean = await validateCyclesFromResponse(cyclesGetResponse, expectedCyclesWithNew, Testdata.PAYLOAD.calendarName, sourceRealm);

        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it(`Test Case 8: Export calendar data from source realm ${sourceRealm}`, async () => {
        const url: string = process.env.API_BASE_URL as string + (process.env.EXPORT_DATA as string);
        const exportDataPayload = { "calendars": [Testdata.PAYLOAD.calendarName] }
        const exportCalendarResponse = await ApiUtil.processAPIRequest("POST", url, exportDataPayload, headers, "Export calendar", "full");
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(exportCalendarResponse.status, 200, "Export calendar success assertion");
        dataToImportInTarget = exportCalendarResponse.data;
        expect(bValidation1).toBeTruthy();
    });

    it(`Test Case 9: Import calendar data to target realm ${targetRealm}`, async () => {
        const url: string = process.env.API_BASE_URL as string + (process.env.IMPORT_DATA as string);
        const importCalendarResponse = await ApiUtil.processAPIRequest("POST", url, dataToImportInTarget, headersForTarget, "Import calendar", "full");
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(importCalendarResponse.status, 200, `Import calendar success assertion in target realm:  ${targetRealm}`);
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(importCalendarResponse.data.calendars[0], Testdata.PAYLOAD.calendarName, `Import calendar response assertion in target realm:  ${targetRealm}`);
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

    it(`Test Case 10: verify updated calendar data via API in target realm ${targetRealm}`, async () => {
        // Get calendar data via API
        const url: string = process.env.API_BASE_URL as string + process.env.CALENDAR as string;
        const createCalendarStatusGet = await ApiUtil.processAPIRequest("GET", url+"/"+Testdata.PAYLOAD.calendarName, null, headersForTarget, "Get calendar API", "status");
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(createCalendarStatusGet, 200, `Get calendar success assertion in ${targetRealm}`);
        
        // Get calendar cycles
        const cycleUrl: string = process.env.API_BASE_URL as string + (process.env.ADD_CALENDAR_CYCLE as string).replace("{calendarName}", Testdata.PAYLOAD.calendarName);
        const cyclesGetResponse = await ApiUtil.processAPIRequest("GET", cycleUrl+"?pageNumber=0&pageSize=100", null, headersForTarget, "Get calendar cycles", "full");
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(cyclesGetResponse.status, 200, `Get calendar cycles success assertion in ${targetRealm}`);
        
        // Validate cycles using helper function (with added cycle)
        const expectedCyclesWithNew = [...expectedCycles, cycleToAdd.cycleName];
        const bValidation3: boolean = await validateCyclesFromResponse(cyclesGetResponse, expectedCyclesWithNew, Testdata.PAYLOAD.calendarName, targetRealm);

        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it(`Test Case 11: Delete calendar data from source realm: ${sourceRealm} & target realm: ${targetRealm}`, async () => {
        const url: string = process.env.API_BASE_URL as string + (process.env.DELETE_CALENDAR as string).replace("{calendarName}", Testdata.PAYLOAD.calendarName);
        const deleteCalendarStatusInSource = await ApiUtil.processAPIRequest("DELETE", url, null, headers, "Delete calendar API", "status");
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(deleteCalendarStatusInSource, 200, "Delete calendar success assertion in source realm " + sourceRealm);
        const deleteCalendarStatusInTarget = await ApiUtil.processAPIRequest("DELETE", url, null, headersForTarget, "Delete calendar API", "status");
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(deleteCalendarStatusInTarget, 200, "Delete calendar success assertion in target realm " + targetRealm);
        expect(bValidation1 && bValidation2).toBeTruthy();
    });
});