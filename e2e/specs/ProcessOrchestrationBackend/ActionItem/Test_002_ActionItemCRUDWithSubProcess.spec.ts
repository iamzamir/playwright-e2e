import CommonFunctions from "../../../util/common.util";
import ApiUtil from "../../../util/api.util";
const Testdata = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestrationBackend/ActionItem/Test_002_ActionItemCRUDWithSubProcess.json");

describe(`Sub Process CRUD operations on Action Item`, async () => {

    let url: string, accessToken: string, headers: Record<string, string>;
    let actionitemId: string;
    let deleteurl: string;
    let attributes: any
    let status: string = process.env.PSENV == "QA" ? "Not started" : "Not Started";

    before(async () => {
        url = process.env.API_BASE_URL as string + process.env.ACTIONITEM as string;
        deleteurl = process.env.API_BASE_URL as string + process.env.DELETE_ACTIONITEM as string;
        accessToken = await ApiUtil.getBearerToken();
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessToken
        };
        Testdata.requestBody.name = "SubProcess Automation Action 3";
    })

    it(`Test Case 1: Create Sub process Action Item`, async () => {
        let response = await ApiUtil.processAPIRequest("POST", url + 'process/'+Testdata.requestBody.processName+'/subprocess/SupplyReview/actionitem', Testdata.requestBody, headers, "Creating Action Item", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "201", "Action Item Creation Success Assertion");
        let validation2: boolean = await CommonFunctions.compareTwoValues(response.data.sourceName, Testdata.requestBody.sourceName, "Action Item Source Name Assertion");
        actionitemId = response.data.id;
        let validation3: boolean = await CommonFunctions.compareTwoValues(response.data.name, Testdata.requestBody.name, "Action Item Name Assertion");
        let validation4: boolean = await CommonFunctions.compareTwoValues(response.data.description, Testdata.requestBody.description, "Action Item Description Assertion");
        let validation6: boolean = await CommonFunctions.compareTwoValues(response.data.remarks, Testdata.requestBody.remarks, "Action Item Remarks Assertion");
        let validation7: boolean = await CommonFunctions.compareTwoValues(response.data.entityId, Testdata.requestBody.entityId, "Action Item Entity ID Assertion");
        let validation8: boolean = await CommonFunctions.compareTwoValues(response.data.sourceType, Testdata.requestBody.sourceType, "Action Item Source Type Assertion");
        let validation9: boolean = await CommonFunctions.compareTwoValues(response.data.status, status, "Action Item Status Assertion");
        let validation10: boolean = await CommonFunctions.compareTwoValues(response.data.actionType, "Task", "Action Item Action Type Assertion");
        let validation11: boolean = await CommonFunctions.compareTwoValues(response.data.priority, "Critical", "Action Item Priority Assertion");
        expect(validation && validation2 && validation3 && validation4 && validation6 && validation7 && validation8 && validation9 && validation10 && validation11).toBeTruthy();
    });

    it(`Test Case 2: Get subprocess Action Item created`, async () => {
        let response = await ApiUtil.processAPIRequest("GET", url + "actionitem/" + actionitemId, "", headers, "Fetching Calendar", "full");
        let validation1: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "Fetch Action Item Success Assertion");
        let validation2: boolean = await CommonFunctions.compareTwoValues(response.data.data[0].name, Testdata.requestBody.name, "Fetch Action Item  name Success Assertion");
        let validation3: boolean = await CommonFunctions.compareTwoValues(response.data.data[0].id, actionitemId, "Fetch Action Item  id Success Assertion");
        let validation4: boolean = await CommonFunctions.compareTwoValues(response.data.data[0].description, Testdata.requestBody.description, "Fetch Action Item Description Assertion");
        let validation5: boolean = await CommonFunctions.compareTwoValues(response.data.data[0].remarks, Testdata.requestBody.remarks, "Fetch Action Item Remarks Assertion");
        let validation6: boolean = await CommonFunctions.compareTwoValues(response.data.data[0].entityId, Testdata.requestBody.entityId, "Fetch Action Item Entity ID Assertion");
        let validation7: boolean = await CommonFunctions.compareTwoValues(response.data.data[0].sourceType, Testdata.requestBody.sourceType, "Fetch Action Item Source Type Assertion");
        let validation8: boolean = await CommonFunctions.compareTwoValues(response.data.data[0].status, status, "Fetch Action Item Status Assertion");
        let validation9: boolean = await CommonFunctions.compareTwoValues(response.data.data[0].actionType, "Task", "Fetch Action Item Action Type Assertion");
        let validation10: boolean = await CommonFunctions.compareTwoValues(response.data.data[0].priority, "Critical", "Fetch Action Item Priority Assertion");
        attributes = response.data.data[0].attributes;
        expect(
            validation1 &&
            validation2 &&
            validation3 &&
            validation4 &&
            validation5 &&
            validation6 &&
            validation7 &&
            validation8 &&
            validation9 &&
            validation10
        ).toBeTruthy();
    });

    it(`Test Case 3: Update  sub process Created Action Item`, async () => {
        Testdata.updateReqest['id'] = actionitemId;
        Testdata.updateReqest.attributes = attributes;
        Testdata.updateReqest.name = "SubProcessAction Updated";
        let response = await ApiUtil.processAPIRequest("PUT", url + 'process/'+Testdata.requestBody.processName+'/subprocess/SupplyReview/actionitem/' + actionitemId, Testdata.updateReqest, headers, "Updating Action Item details", "full");
        let validation1: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "Action Item detail  Update Success Assertion");
        let validation2: boolean = await CommonFunctions.compareTwoValues(response.data.name, Testdata.updateReqest.name, "Updated Action Item Name Assertion");
        let validation3: boolean = await CommonFunctions.compareTwoValues(response.data.description, Testdata.updateReqest.description, "Updated Action Item Description Assertion");
        let validation4: boolean = await CommonFunctions.compareTwoValues(response.data.remarks, Testdata.updateReqest.remarks, "Updated Action Item Remarks Assertion");
        let validation5: boolean = await CommonFunctions.compareTwoValues(response.data.priority, "Medium", "Updated Action Item Priority Assertion")
        expect(validation1 && validation2 && validation3 && validation4 && validation5).toBeTruthy();
    });

    it(`Test Case 4: Get Sub Process Updated action item Details`, async () => {
        let response = await ApiUtil.processAPIRequest("GET", url + "actionitem/" + actionitemId, "", headers, "Fetching Calendar", "full");
        let validation1: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "Fetch Action Item Success Assertion");
        let validation2: boolean = await CommonFunctions.compareTwoValues(response.data.data[0].name, Testdata.updateReqest.name, "Fetch Action Item  name Success Assertion");
        let validation3: boolean = await CommonFunctions.compareTwoValues(response.data.data[0].id, actionitemId, "Fetch Action Item  id Success Assertion");
        let validation4: boolean = await CommonFunctions.compareTwoValues(response.data.data[0].description, Testdata.updateReqest.description, "Fetch Action Item Description Assertion");
        let validation5: boolean = await CommonFunctions.compareTwoValues(response.data.data[0].remarks, Testdata.updateReqest.remarks, "Fetch Action Item Remarks Assertion");
        let validation6: boolean = await CommonFunctions.compareTwoValues(response.data.data[0].entityId, Testdata.requestBody.entityId, "Fetch Action Item Entity ID Assertion");
        let validation7: boolean = await CommonFunctions.compareTwoValues(response.data.data[0].sourceType, Testdata.requestBody.sourceType, "Fetch Action Item Source Type Assertion");
        let validation8: boolean = await CommonFunctions.compareTwoValues(response.data.data[0].status, status, "Fetch Action Item Status Assertion");
        let validation9: boolean = await CommonFunctions.compareTwoValues(response.data.data[0].actionType, "Task", "Fetch Action Item Action Type Assertion");
        let validation10: boolean = await CommonFunctions.compareTwoValues(response.data.data[0].priority, "Medium", "Fetch Action Item Priority Assertion");
        expect(
            validation1 &&
            validation2 &&
            validation3 &&
            validation4 &&
            validation5 &&
            validation6 &&
            validation7 &&
            validation8 &&
            validation9 &&
            validation10
        ).toBeTruthy();

    });


    it(`Test Case 5: Update  Sub Process  Action Item  with  status as null value and expect Inavlid argument cases`, async () => {
        Testdata.updateReqest.attributes = attributes;
        Testdata.updateReqest.status = null;
        try {
            // This API call is expected to fail with a 400 error
            let response = await ApiUtil.processAPIRequest(
                "PUT",
                deleteurl + actionitemId,
                Testdata.updateReqest,
                headers,
                "Updating Action Item details",
                "full"
            );

        } catch (error: any) {
            // ✅ Ensure error has a response object
            expect(error.response).toBeDefined();

            // ✅ Validate status code is 400
            expect(error.response.status).toBe(400);

            // ✅ Validate error message
            expect(error.response.data).toHaveProperty("message");
            expect(error.response.data.message).toBe("Invalid input provided.");

            // ✅ Additional Assertions (if needed)
            let validation1: boolean = await CommonFunctions.compareTwoValues(
                error.response.status,
                400,
                "Action Item detail Update failed Assertion"
            );

            let validation2: boolean = await CommonFunctions.compareTwoValues(
                error.response.data.message,
                "Invalid input provided.",
                "Updated Action Item Name Assertion"
            );
            expect(validation1 && validation2).toBeTruthy();
        }
    });

    it(`Test Case 6: Update  Sub Process  Action Item  with priority as null value and expect Inavlid argument cases`, async () => {
        Testdata.updateReqest.attributes = attributes;
        Testdata.updateReqest.priority = null;
        try {
            // This API call is expected to fail with a 400 error
            let response = await ApiUtil.processAPIRequest(
                "PUT",
                deleteurl + actionitemId,
                Testdata.updateReqest,
                headers,
                "Updating Action Item details",
                "full"
            );

        } catch (error: any) {
            // ✅ Ensure error has a response object
            expect(error.response).toBeDefined();

            // ✅ Validate status code is 400
            expect(error.response.status).toBe(400);

            // ✅ Validate error message
            expect(error.response.data).toHaveProperty("message");
            expect(error.response.data.message).toBe("Invalid input provided.");

            // ✅ Additional Assertions (if needed)
            let validation1: boolean = await CommonFunctions.compareTwoValues(
                error.response.status,
                400,
                "Action Item detail Update failed Assertion"
            );

            let validation2: boolean = await CommonFunctions.compareTwoValues(
                error.response.data.message,
                "Invalid input provided.",
                "Updated Action Item Name Assertion"
            );
            expect(validation1 && validation2).toBeTruthy();
        }
    });

    it(`Test Case 7: Update  Sub Process  Action Item  with Action Type as null value and expect Inavlid argument cases`, async () => {
        Testdata.updateReqest.attributes = attributes;
        Testdata.updateReqest.actionType = null;
        try {
            // This API call is expected to fail with a 400 error
            let response = await ApiUtil.processAPIRequest(
                "PUT",
                deleteurl + actionitemId,
                Testdata.updateReqest,
                headers,
                "Updating Action Item details",
                "full"
            );

        } catch (error: any) {
            // ✅ Ensure error has a response object
            expect(error.response).toBeDefined();

            // ✅ Validate status code is 400
            expect(error.response.status).toBe(400);

            // ✅ Validate error message
            expect(error.response.data).toHaveProperty("message");
            expect(error.response.data.message).toBe("Invalid input provided.");

            // ✅ Additional Assertions (if needed)
            let validation1: boolean = await CommonFunctions.compareTwoValues(
                error.response.status,
                400,
                "Action Item detail Update failed Assertion"
            );

            let validation2: boolean = await CommonFunctions.compareTwoValues(
                error.response.data.message,
                "Invalid input provided.",
                "Updated Action Item Name Assertion"
            );
            expect(validation1 && validation2).toBeTruthy();
        }
    });

    it(`Test Case 8: Delete  Sub Process Created Action Item`, async () => {
        let response = await ApiUtil.processAPIRequest("DELETE", deleteurl + actionitemId, "", headers, "Delete Created Action Item", "full");
        let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "200", "Delete Created Action Item Success Assertion");
        expect(validation).toBeTruthy();
    });

})

