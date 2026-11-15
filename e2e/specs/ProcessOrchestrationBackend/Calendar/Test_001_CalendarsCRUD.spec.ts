import CommonFunctions from "../../../util/common.util";
import ApiUtil from "../../../util/api.util";
const Testdata = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestrationBackend/Calendar/Test_001_CalendarsCRUD.json");


describe(`Calendars CRUD operations`, async () => {

    let url: string, accessToken: string, headers: Record<string, string>;

    before(async () => {
        url = process.env.API_BASE_URL as string + process.env.CALENDAR as string;
        accessToken = await ApiUtil.getBearerToken();
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessToken
        };
        Testdata.requestBody.calendarName = "Calendar Name 1";
    })

    it(`Test Case 1: Create Calendar`, async () => {
        let response = await ApiUtil.processAPIRequest("POST", url, Testdata.requestBody, headers, "Creating Calendars", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "201", "Calendar Creation Success Assertion");
        expect(validation).toBeTruthy();
    });

    it(`Test Case 2: Get Created Calendar`, async () => {
        let response = await ApiUtil.processAPIRequest("GET", url + "/" + Testdata.requestBody.calendarName, "", headers, "Fetching Calendar", "full");
        let validation1: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "Fetch Created Calendar Success Assertion");
        let validation2: boolean = await CommonFunctions.compareTwoValues(response.data.name, Testdata.requestBody.calendarName, "Fetch Created Calendar Success Assertion");
        expect(validation1 && validation2).toBeTruthy();
    });

    it(`Test Case 3: Update Created Calendar`, async () => {
        Testdata.requestBody.description = Testdata.CycleDescriptionUpdate;
        let response = await ApiUtil.processAPIRequest("PUT", url + "/" + Testdata.requestBody.calendarName, Testdata.requestBody, headers, "Updating Calendar Description", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "Calendar Description Update Success Assertion");
        expect(validation).toBeTruthy();
    });

    it(`Test Case 4: Get Updated Created Calendar Details`, async () => {
        let response = await ApiUtil.processAPIRequest("GET", url + "/" + Testdata.requestBody.calendarName, "", headers, "Fetching Calendar", "full");
        let validation1: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "Fetch Created Calendar Success Assertion");
        let validation2: boolean = await CommonFunctions.compareTwoValues(response.data.description, Testdata.CycleDescriptionUpdate, "Fetch Created Calendar Description Update Success Assertion");
        expect(validation1 && validation2).toBeTruthy();
    });

    it(`Test Case 5: Delete Created Calendar`, async () => {
        let response = await ApiUtil.processAPIRequest("DELETE", url + "/" + Testdata.requestBody.calendarName, "", headers, "Delete Created Calendar", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "Delete Created Calendar Success Assertion");
        expect(validation).toBeTruthy();
    });

    it(`Test Case 6: Get Deleted Calendar`, async () => {
        let response = await ApiUtil.processAPIRequest("GET", url + "/" + Testdata.requestBody.calendarName, "", headers, "Fetching Deleted Calendar", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "404", "Fetch Deleted Calendar Not Found Assertion");
        expect(validation).toBeTruthy();
    });

    it(`Test Case 7: Create Calendar with Missing Required Fields`, async () => {
        let invalidRequest = { ...Testdata.requestBody };
        delete invalidRequest.calendarName;
        let response = await ApiUtil.processAPIRequest("POST", url, invalidRequest, headers, "Creating Calendar With Missing Fields", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "400", "Calendar Creation Missing Fields Bad Request Assertion");
        expect(validation).toBeTruthy();
    });

    it(`Test Case 8: Duplicate Calendar Creation`, async () => {
        // First, create the calendar again
        Testdata.requestBody.calendarName = "Duplicate Calendar Test";
        let response1 = await ApiUtil.processAPIRequest("POST", url, Testdata.requestBody, headers, "Creating Calendar For Duplicate Test", "full");
        let validation1: boolean = await CommonFunctions.compareTwoValues(response1.status, "201", "Duplicate Calendar Creation Success Assertion");

        // Try to create the same calendar again
        let response2 = await ApiUtil.processAPIRequest("POST", url, Testdata.requestBody, headers, "Creating Duplicate Calendar", "full");
        let validation2: boolean = await CommonFunctions.compareTwoValues(response2.status, "409", "Duplicate Calendar Conflict Assertion");

        // Clean up by deleting the duplicate
        let response3 = await ApiUtil.processAPIRequest("DELETE", url + "/" + Testdata.requestBody.calendarName + "", "", headers, "Cleanup Duplicate Calendar", "full");
        let validation3: boolean = await CommonFunctions.compareTwoValues(response3.status, "200", "Delete Created Calendar Success Assertion");
        expect(validation1 && validation2 && validation3).toBeTruthy();
    });

    it(`Test Case 9: Unauthorized Calendar Operation`, async () => {
        let invalidHeaders = {
            "accept": "application/json",
            "Authorization": "Bearer invalidtoken"
        };
        let response = await ApiUtil.processAPIRequest("POST", url, Testdata.requestBody, invalidHeaders, "Unauthorized Calendar Creation", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "401", "Unauthorized Calendar Creation Assertion");
        expect(validation).toBeTruthy();
    });

    it(`Test Case 10: Create Calendar With Invalid Date Range`, async () => {
        Testdata.requestBody.calendarName = "Calendar with Invalid Date Range";
        let invalidRequest = { ...Testdata.requestBody };
        invalidRequest.cycles = [{
            cycleName: "Invalid Cycle",
            description: "End date before start date",
            startDate: "2024-02-22T06:57:33.967Z",
            endDate: "2024-01-22T06:57:33.967Z"
        }];
        let response1 = await ApiUtil.processAPIRequest("POST", url, invalidRequest, headers, "Creating Calendar With Invalid Date Range", "full");
        let validation1: boolean = await CommonFunctions.compareTwoValues(response1.status, "500", "Calendar Creation Invalid Date Range Bad Request Assertion");

        let response2 = await ApiUtil.processAPIRequest("DELETE", url + "/" + Testdata.requestBody.calendarName + "", "", headers, "Cleanup Calendar with Invalid Date Range", "full");
        let validation2: boolean = await CommonFunctions.compareTwoValues(response2.status, "200", "Delete Created Calendar Success Assertion");
        expect(validation1 && validation2).toBeTruthy();
    });

    it(`Test Case 11: Update Non-Existent Calendar`, async () => {
        let nonExistentCalendar = { ...Testdata.requestBody, calendarName: "NonExistentCalendar" };
        let response = await ApiUtil.processAPIRequest("PUT", url + "/NonExistentCalendar", nonExistentCalendar, headers, "Updating Non-Existent Calendar", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "404", "Update Non-Existent Calendar Not Found Assertion");
        expect(validation).toBeTruthy();
    });

    it(`Test Case 12: Delete Non-Existent Calendar`, async () => {
        let response = await ApiUtil.processAPIRequest("DELETE", url + "/NonExistentCalendar", "", headers, "Delete Non-Existent Calendar", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "404", "Delete Non-Existent Calendar Not Found Assertion");
        expect(validation).toBeTruthy();
    });

    it(`Test Case 13: Get Calendar With Invalid Name Format`, async () => {
        let response = await ApiUtil.processAPIRequest("GET", url + "/!@#$%^&*", "", headers, "Fetching Calendar With Invalid Name", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "404", "Fetch Calendar With Invalid Name Bad Request Assertion");
        expect(validation).toBeTruthy();
    });

    it(`Test Case 14: Create Calendar With Duplicate Cycle Names`, async () => {
        Testdata.requestBody.calendarName = "Duplicate Cycle Names Calendar";
        let invalidRequest = { ...Testdata.requestBody };
        invalidRequest.cycles = [
            {
                cycleName: "DuplicateCycle",
                description: "Cycle 1",
                startDate: "2024-01-22T06:57:33.967Z",
                endDate: "2024-02-22T06:57:33.967Z"
            },
            {
                cycleName: "DuplicateCycle",
                description: "Cycle 2",
                startDate: "2024-03-22T06:57:33.967Z",
                endDate: "2024-04-22T06:57:33.967Z"
            }
        ];
        let response = await ApiUtil.processAPIRequest("POST", url, invalidRequest, headers, "Creating Calendar With Duplicate Cycle Names", "full");
        let validation1: boolean = await CommonFunctions.compareTwoValues(response.status, "500", "Calendar Creation Duplicate Cycle Names Bad Request Assertion");

        // Clean up by deleting the duplicate
        let response2 = await ApiUtil.processAPIRequest("DELETE", url + "/" + Testdata.requestBody.calendarName + "", "", headers, "Cleanup Duplicate Calendar", "full");
        let validation2: boolean = await CommonFunctions.compareTwoValues(response2.status, "200", "Delete Created Calendar Success Assertion");

        expect(validation1 && validation2).toBeTruthy();
    });

    it(`Test Case 15: Access Calendar API Without Authorization Header`, async () => {
        let response = await ApiUtil.processAPIRequest("POST", url, Testdata.requestBody, { "accept": "application/json" }, "Creating Calendar Without Auth", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "401", "Calendar Creation Without Auth Unauthorized Assertion");
        expect(validation).toBeTruthy();
    });

})