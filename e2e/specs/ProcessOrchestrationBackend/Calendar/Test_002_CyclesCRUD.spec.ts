import CommonFunctions from "../../../util/common.util";
import ApiUtil from "../../../util/api.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestrationBackend/Calendar/Test_002_CyclesCRUD.json");


describe(`Calendar Cycles CRUD operations`, async () => {

    let url: string, accessToken: string, headers: Record<string, string>;

    before(async () => {
        url = process.env.API_BASE_URL as string + process.env.CALENDAR as string;
        accessToken = await ApiUtil.getBearerToken();
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessToken
        };
        TestData.requestBody.calendarName = "Monthly Calendar Sample 1";
    })

    it(`Test Case 1: Create Calendar to create a calendar cycle`, async () => {
        let response = await ApiUtil.processAPIRequest("POST", url, TestData.requestBody, headers, "Creating Calendars", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "201", "Calendar Creation Success Assertion");
        expect(validation).toBeTruthy();
    });

    it(`Test Case 2: Get Created Calendar to validate whether the calendar is created`, async () => {
        let response = await ApiUtil.processAPIRequest("GET", url + "/" + TestData.requestBody.calendarName, "", headers, "Fetching Calendar", "full");
        let validation1: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "Fetch Created Calendar Success Assertion");
        let validation2: boolean = await CommonFunctions.compareTwoValues(response.data.name, TestData.requestBody.calendarName, "Fetch Created Calendar Success Assertion");
        expect(validation1 && validation2).toBeTruthy();
    });

    it(`Test Case 3: Create a cycle in calendar`, async () => {
        let response = await ApiUtil.processAPIRequest("POST", url + `/${TestData.requestBody.calendarName}/cycle`, TestData.requestBody.Cycle, headers, "Creating Cylce in Calendar", "full");
        let validation1: boolean = await CommonFunctions.compareTwoValues(response.status, "201", "Fetch Created Calendar Cycle Success Assertion");
        expect(validation1).toBeTruthy();
    })

    it("Test Case 4:  Get create calendar cycle", async () => {
        let response = await ApiUtil.processAPIRequest("GET", url + `/${TestData.requestBody.calendarName}/cycle/${TestData.requestBody.Cycle.cycleName}`, "", headers, "Feetching Cylce in Calendar", "full");
        let validation1: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "Fetch Created Calendar Cycle Success Assertion");
        let validation2: boolean = await CommonFunctions.compareTwoValues(response.data.name, TestData.requestBody.Cycle.cycleName, "Fetch Created Calendar Cycle Success Assertion");
        expect(validation1 && validation2).toBeTruthy();
    })

    it("Test Case 5: Update existing Calendar Cycle", async () => {
        let response = await ApiUtil.processAPIRequest("PUT", url + `/${TestData.requestBody.calendarName}/cycle/${TestData.requestBody.Cycle.cycleName}`, TestData.requestBody.UpdateCycle, headers, "Updating Calendar Description", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "Calendar Description Update Success Assertion");
        expect(validation).toBeTruthy();
    })

    it("Test Case 6: Get updated Calendar Cycle and validate", async () => {
        let response = await ApiUtil.processAPIRequest("GET", url + `/${TestData.requestBody.calendarName}/cycle/${TestData.requestBody.Cycle.cycleName}`, "", headers, "Feetching Cylce in Calendar", "full");
        let validation1: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "Fetch Created Calendar Cycle Success Assertion");
        let validation2: boolean = await CommonFunctions.compareTwoValues(response.data.name, TestData.requestBody.UpdateCycle.cycleName, "Fetch Created Calendar Cycle Success Assertion");
        expect(validation1 && validation2).toBeTruthy();
    })

    it(`Test Case 7: Delete Created Calendar Cycle`, async () => {
        let response = await ApiUtil.processAPIRequest("DELETE", url + `/${TestData.requestBody.calendarName}/cycle/${TestData.requestBody.Cycle.cycleName}`, "", headers, "Delete Created Calendar", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "Delete Created Calendar Success Assertion");
        expect(validation).toBeTruthy();
    });

    it("Test Case 8: Create Cycle With End Date Before Start Date", async () => {
        let invalidCycle = {
            ...TestData.requestBody.Cycle,
            cycleName: "Invalid Date Cycle",
            startDate: "2024-05-01T00:00:00.000Z",
            endDate: "2024-04-01T00:00:00.000Z"
        };
        let response = await ApiUtil.processAPIRequest("POST", url + `/${TestData.requestBody.calendarName}/cycle`, invalidCycle, headers, "Creating Cycle With Invalid Date Range", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "400", "Create Cycle Invalid Date Range Bad Request Assertion");
        expect(validation).toBeTruthy();
    });

    it("Test Case 9: Create Duplicate Cycle Name", async () => {
        // First, create a cycle
        let cycle = {
            ...TestData.requestBody.Cycle,
            cycleName: "DuplicateCycle"
        };
        let response1 = await ApiUtil.processAPIRequest("POST", url + `/${TestData.requestBody.calendarName}/cycle`, cycle, headers, "Creating Cycle For Duplicate Test", "full");
        let validation1: boolean = await CommonFunctions.compareTwoValues(response1.status, "201", "Duplicate Cycle Creation Assertion");

        // Try to create the same cycle again
        let response2 = await ApiUtil.processAPIRequest("POST", url + `/${TestData.requestBody.calendarName}/cycle`, cycle, headers, "Creating Duplicate Cycle", "full");
        let validation2: boolean = await CommonFunctions.compareTwoValues(response2.status, "400", "Duplicate Cycle Conflict Assertion");

        // Clean up
        let response3 = await ApiUtil.processAPIRequest("DELETE", url + `/${TestData.requestBody.calendarName}/cycle/${cycle.cycleName}`, "", headers, "Cleanup Duplicate Cycle", "full");
        let validation3: boolean = await CommonFunctions.compareTwoValues(response3.status, "200", "Cleanup Duplicate Cycle Assertion");
        expect(validation1 && validation2 && validation3).toBeTruthy();
    });

    it("Test Case 10: Update Non-Existent Cycle", async () => {
        let response = await ApiUtil.processAPIRequest("PUT", url + `/${TestData.requestBody.calendarName}/cycle/NonExistentCycle`, TestData.requestBody.UpdateCycle, headers, "Updating Non-Existent Cycle", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "404", "Update Non-Existent Cycle Not Found Assertion");
        expect(validation).toBeTruthy();
    });

    it("Test Case 11: Delete Non-Existent Cycle", async () => {
        let response = await ApiUtil.processAPIRequest("DELETE", url + `/${TestData.requestBody.calendarName}/cycle/NonExistentCycle`, "", headers, "Delete Non-Existent Cycle", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "404", "Delete Non-Existent Cycle Not Found Assertion");
        expect(validation).toBeTruthy();
    });

    it("Test Case 12: Create Cycle With Missing Required Fields", async () => {
        let invalidCycle = { ...TestData.requestBody.Cycle };
        delete invalidCycle.cycleName;
        let response = await ApiUtil.processAPIRequest("POST", url + `/${TestData.requestBody.calendarName}/cycle`, invalidCycle, headers, "Creating Cycle With Missing Fields", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "400", "Create Cycle Missing Fields Bad Request Assertion");
        expect(validation).toBeTruthy();
    });

    it("Test Case 13: Unauthorized Cycle Operation", async () => {
        let invalidHeaders = {
            "accept": "application/json",
            "Authorization": "Bearer invalidtoken"
        };
        let response = await ApiUtil.processAPIRequest("POST", url + `/${TestData.requestBody.calendarName}/cycle`, TestData.requestBody.Cycle, invalidHeaders, "Unauthorized Cycle Creation", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "401", "Unauthorized Cycle Creation Assertion");
        expect(validation).toBeTruthy();
    });

    it(`Test Case 14: Delete Created Calendar`, async () => {
        let response = await ApiUtil.processAPIRequest("DELETE", url + "/" + TestData.requestBody.calendarName, "", headers, "Delete Created Calendar", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "Delete Created Calendar Success Assertion");
        expect(validation).toBeTruthy();
    });

    it("Test Case 15: Get Deleted Calendar Cycle", async () => {
        let response = await ApiUtil.processAPIRequest("GET", url + `/${TestData.requestBody.calendarName}/cycle/${TestData.requestBody.Cycle.cycleName}`, "", headers, "Fetching Deleted Calendar Cycle", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "404", "Fetch Deleted Calendar Cycle Not Found Assertion");
        expect(validation).toBeTruthy();
    });
})