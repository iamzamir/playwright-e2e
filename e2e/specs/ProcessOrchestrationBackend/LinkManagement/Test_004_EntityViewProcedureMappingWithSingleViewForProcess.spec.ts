import CommonFunctions from "../../../util/common.util";
import ApiUtil from "../../../util/api.util";
import testUtil from "../../../util/test.util";
import MappingUtil from "../../../util/mapping.util";
const Testdata = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestrationBackend/LinkManagement/Test_004_EntityViewProcedureMappingWithSingleViewForProcess.json");

describe("Entity View Procedure Mapping with Single View for Process", async() => {
    let url: string, accessToken: string, headers: Record<string, string>;
    let modifiedRequestBody: any;
    let randomViewId: string = '';
    before(async () => {
        url = process.env.API_BASE_URL as string + process.env.VIEW_ENTITY_PROCEDURE_MAP as string;
        accessToken = await ApiUtil.getBearerToken();
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessToken
        };
    });

    it("Test Case 1: Map 4 Procedures to a Single View, 1 Primary, 1 Secondary", async() => {
        const response = await ApiUtil.processAPIRequest("POST", url, Testdata.requestBody, headers, "Map Procedures to View", "full");
        const validations = await MappingUtil.performProcedureMappingValidations(response, Testdata.requestBody, 4);
        expect(validations.every(v => v)).toBeTruthy();
    });
       
    it("Test Case 2: Search and Verify Mapped Procedures are Available for the View", async() => {
        const validations = await MappingUtil.searchProcedures(url, Testdata.requestSearchBody, headers, Testdata.requestBody.procedures, 4);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 3: Map 4 Procedures to a Single View, 1 Primary, No Secondary", async() => {
        modifiedRequestBody = MappingUtil.createModifiedRequestBody(Testdata.requestBody, (data) => {
            MappingUtil.setProcedureValue(data.procedures, "ProcedureMapping_2", "secondary", false);
        });
        
        const response = await ApiUtil.processAPIRequest("POST", url, modifiedRequestBody, headers, "Map Procedures to View - No Secondary", "full");
        const validations = await MappingUtil.performProcedureMappingValidations(response, modifiedRequestBody, 4);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 4: Search and Verify Mapped Procedures are Available for the View (No Secondary)", async() => {
        const validations = await MappingUtil.searchProcedures(url, Testdata.requestSearchBody, headers, modifiedRequestBody.procedures, 4);
        expect(validations.every(v => v)).toBeTruthy();
    });
    
    it("Test Case 5: Map 4 Procedures to a Single View, No Primary, 1 Secondary", async() => {
        modifiedRequestBody = MappingUtil.createModifiedRequestBody(Testdata.requestBody, (data) => {
            MappingUtil.setProcedureValue(data.procedures, "ProcedureMapping_1", "primary", false);
        });
        
        const response = await ApiUtil.processAPIRequest("POST", url, modifiedRequestBody, headers, "Map Procedures to View - No Primary", "full");
        const validations = await MappingUtil.performProcedureMappingValidations(response, modifiedRequestBody, 4);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 6: Search and Verify Mapped Procedures are Available for the View (No Primary)", async() => {
        const validations = await MappingUtil.searchProcedures(url, Testdata.requestSearchBody, headers, modifiedRequestBody.procedures, 4);
        expect(validations.every(v => v)).toBeTruthy();
    });
    
    it("Test Case 7: Map 4 Procedures to a Single View, No Primary, No Secondary", async() => {
        modifiedRequestBody = MappingUtil.createModifiedRequestBody(Testdata.requestBody, (data) => {
            MappingUtil.setAllProceduresValue(data.procedures, "primary", false);
            MappingUtil.setAllProceduresValue(data.procedures, "secondary", false);
        });

        const response = await ApiUtil.processAPIRequest("POST", url, modifiedRequestBody, headers, "Map Procedures to View - No Primary No Secondary", "full");
        const validations = await MappingUtil.performProcedureMappingValidations(response, modifiedRequestBody, 4);
        expect(validations.every(v => v)).toBeTruthy();
    });
        
    it("Test Case 8: Search and Verify Mapped Procedures are Available for the View (No Primary No Secondary)", async() => {
        const validations = await MappingUtil.searchProcedures(url, Testdata.requestSearchBody, headers, modifiedRequestBody.procedures, 4);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 9: Map 3 Procedures to a Single View, No Primary, No Secondary", async() => {
        modifiedRequestBody = MappingUtil.createModifiedRequestBody(Testdata.requestBody, (data) => {
            data.procedures = MappingUtil.removeProcedure(data.procedures, "ProcedureMapping_4");
            MappingUtil.setAllProceduresValue(data.procedures, "primary", false);
            MappingUtil.setAllProceduresValue(data.procedures, "secondary", false);
        });

        const response = await ApiUtil.processAPIRequest("POST", url, modifiedRequestBody, headers, "Map 3 Procedures to View - No Primary No Secondary", "full");
        const validations = await MappingUtil.performProcedureMappingValidations(response, modifiedRequestBody, 3);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 10: Search and Verify 3 Mapped Procedures are Available for the View", async() => {
        const validations = await MappingUtil.searchProcedures(url, Testdata.requestSearchBody, headers, modifiedRequestBody.procedures, 3);
        expect(validations.every(v => v)).toBeTruthy();
    });
    
    it("Test Case 11: Map 5 Procedures to a Single View, No Primary, No Secondary", async() => {
        modifiedRequestBody = MappingUtil.createModifiedRequestBody(Testdata.requestBody, (data) => {
            const newProcedure = {
                "procedureName": "ProcedureMapping_5",
                "primary": false,
                "secondary": false
            };
            MappingUtil.addProcedure(data.procedures, newProcedure);
            MappingUtil.setAllProceduresValue(data.procedures, "primary", false);
            MappingUtil.setAllProceduresValue(data.procedures, "secondary", false);
        });

        const response = await ApiUtil.processAPIRequest("POST", url, modifiedRequestBody, headers, "Map 5 Procedures to View - No Primary No Secondary", "full");
        const validations = await MappingUtil.performProcedureMappingValidations(response, modifiedRequestBody, 5);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 12: Search and Verify 5 Mapped Procedures are Available for the View", async() => {
        const validations = await MappingUtil.searchProcedures(url, Testdata.requestSearchBody, headers, modifiedRequestBody.procedures, 5);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 13: Remove All Procedures Mapping to the View", async() => {
        modifiedRequestBody = MappingUtil.createModifiedRequestBody(Testdata.requestBody, (data) => {
            data.procedures = [];
        });

        const response = await ApiUtil.processAPIRequest("POST", url, modifiedRequestBody, headers, "Remove All Procedures from View", "full");
        const validations = await MappingUtil.removeAllProcedures(response, modifiedRequestBody);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 14: Search View Map and Verify No Mapped Procedures are Available", async() => {
        const validations = await MappingUtil.searchProcedures(url, Testdata.requestSearchBody, headers, [], 0);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 15: Create a new View with random number and Perform entity view procedure search", async() => {
        randomViewId = await testUtil.generateViewID();
        console.log("Generated Random View ID: ", randomViewId);
    });

    it("Test Case 16: Validate reason code PROCEDURES_NEVER_MAPPED_TO_VIEW and empty procedures array for new random view generated in test case 15", async() => {
        const searchRequestBody = {
            ...Testdata.requestSearchBody,
            "viewId": randomViewId
        };
        const response = await ApiUtil.processAPIRequest("POST", url + '/search', searchRequestBody, headers, "Search procedures and reason code for new random view", "full");
        const validation1 = await CommonFunctions.compareTwoValues(response.data.viewId, searchRequestBody.viewId, "View ID Assertion");
        const validation2 = await CommonFunctions.compareTwoValues(response.data.procedures.length, 0, "Empty Procedure Count Assertion");        
        const validation3 = await CommonFunctions.compareTwoValues(response.data.reason, "PROCEDURES_NEVER_MAPPED_TO_VIEW", "Reason Code Assertion");
        const allValidations = [validation1, validation2, validation3];
        expect(allValidations.every(v => v)).toBeTruthy();
    });

    it("Test Case 17: Map 4 Procedures to the same view created in Test Case 15", async() => {
        const newViewRequestBody = {
            ...Testdata.requestBody,
            "views": [randomViewId]
        };
        const response = await ApiUtil.processAPIRequest("POST", url, newViewRequestBody, headers, "Map 4 Procedures to New Random View", "full");
        const validations = await MappingUtil.performProcedureMappingValidations(response, newViewRequestBody, 4);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 18: Search and verify the response payload of same view created in Test Case 15", async() => {
        const searchRequestBody = {
            ...Testdata.requestSearchBody,
            "viewId": randomViewId
        };
        const validations = await MappingUtil.searchProcedures(url, searchRequestBody, headers, Testdata.requestBody.procedures, 4);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 19: Remove all mappings by passing procedures as empty array for the view created in Test Case 15", async() => {
        const removeAllMappingsBody = {
            ...Testdata.requestBody,
            "views": [randomViewId],
            "procedures": []
        };
        const response = await ApiUtil.processAPIRequest("POST", url, removeAllMappingsBody, headers, "Remove All Procedures from New Random View", "full");
        const validations = await MappingUtil.removeAllProcedures(response, removeAllMappingsBody);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 20: Search with the same view, now reason code should be PLANNER_WANTS_NO_PROCEDURES, and procedure list is empty which generated in test case 15", async() => {
        const searchRequestBody = {
            ...Testdata.requestSearchBody,
            "viewId": randomViewId
        };
        const response = await ApiUtil.processAPIRequest("POST", url + '/search', searchRequestBody, headers, "Search procedures and reason code after removal for view", "full");
        const validation1 = await CommonFunctions.compareTwoValues(response.data.viewId, searchRequestBody.viewId, "View ID Assertion");
        const validation2 = await CommonFunctions.compareTwoValues(response.data.procedures.length, 0, "Empty Procedure Count Assertion");
        const validation3 = await CommonFunctions.compareTwoValues(response.data.reason, "PLANNER_WANTS_NO_PROCEDURES", "Reason Code Assertion");
        const allValidations = [validation1, validation2, validation3];
        expect(allValidations.every(v => v)).toBeTruthy();
    });

});