import CommonFunctions from "../../../util/common.util";
import ApiUtil from "../../../util/api.util";
import MappingUtil from "../../../util/mapping.util";
const Testdata = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestrationBackend/LinkManagement/Test_005_EntityViewProcedureMappingWithMultipleViewsForProcess.json");

describe("Entity View Procedure Mapping with Multiple Views for Process", async() => {
    let url: string, accessToken: string, headers: Record<string, string>;
    let modifiedRequestBody: any;
        
    before(async () => {
        url = process.env.API_BASE_URL as string + process.env.VIEW_ENTITY_PROCEDURE_MAP as string;
        accessToken = await ApiUtil.getBearerToken();
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessToken
        };
    });

    // Helper function to get search configurations
    function getSearchConfigurations() {
        return [
            { body: Testdata.requestSearchBody, name: "View 1" },
            { body: Testdata.requestSearchBodyView2, name: "View 2" },
            { body: Testdata.requestSearchBodyView3, name: "View 3" },
            { body: Testdata.requestSearchBodyView4, name: "View 4" },
            { body: Testdata.requestSearchBodyView5, name: "View 5" }
        ];
    }

    it("Test Case 1: Map 4 Procedures to All Views, 1 Primary, 1 Secondary", async() => {
        const response = await ApiUtil.processAPIRequest("POST", url, Testdata.requestBody, headers, "Map Procedures to Multiple Views", "full");
        const validations = await MappingUtil.performProcedureMappingValidations(response, Testdata.requestBody, 4);
        expect(validations.every(v => v)).toBeTruthy();
    });
    
    it("Test Case 2: Search and Verify Mapped Procedures are Available for All Views", async() => {
        const validations = await MappingUtil.searchProcedures(url, getSearchConfigurations(), headers, Testdata.requestBody.procedures, 4);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 3: Map 4 Procedures to All Views, 1 Primary, No Secondary", async() => {
        modifiedRequestBody = MappingUtil.createModifiedRequestBody(Testdata.requestBody, (data) => {
            MappingUtil.setProcedureValue(data.procedures, "ProcedureMapping_2", "secondary", false);
        });
        
        const response = await ApiUtil.processAPIRequest("POST", url, modifiedRequestBody, headers, "Map Procedures to Multiple Views - No Secondary", "full");
        const validations = await MappingUtil.performProcedureMappingValidations(response, modifiedRequestBody, 4);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 4: Search and Verify Mapped Procedures are Available for All Views (No Secondary)", async() => {
        const validations = await MappingUtil.searchProcedures(url, getSearchConfigurations(), headers, modifiedRequestBody.procedures, 4);
        expect(validations.every(v => v)).toBeTruthy();
    });
    
    it("Test Case 5: Map 4 Procedures to All Views, No Primary, 1 Secondary", async() => {
        modifiedRequestBody = MappingUtil.createModifiedRequestBody(Testdata.requestBody, (data) => {
            MappingUtil.setProcedureValue(data.procedures, "ProcedureMapping_1", "primary", false);
        });
        
        const response = await ApiUtil.processAPIRequest("POST", url, modifiedRequestBody, headers, "Map Procedures to Multiple Views - No Primary", "full");
        const validations = await MappingUtil.performProcedureMappingValidations(response, modifiedRequestBody, 4);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 6: Search and Verify Mapped Procedures are Available for All Views (No Primary)", async() => {
        const validations = await MappingUtil.searchProcedures(url, getSearchConfigurations(), headers, modifiedRequestBody.procedures, 4);
        expect(validations.every(v => v)).toBeTruthy();
    });
    
    it("Test Case 7: Map 4 Procedures to All Views, No Primary, No Secondary", async() => {
        modifiedRequestBody = MappingUtil.createModifiedRequestBody(Testdata.requestBody, (data) => {
            MappingUtil.setAllProceduresValue(data.procedures, "primary", false);
            MappingUtil.setAllProceduresValue(data.procedures, "secondary", false);
        });

        const response = await ApiUtil.processAPIRequest("POST", url, modifiedRequestBody, headers, "Map Procedures to Multiple Views - No Primary No Secondary", "full");
        const validations = await MappingUtil.performProcedureMappingValidations(response, modifiedRequestBody, 4);
        expect(validations.every(v => v)).toBeTruthy();
    });
        
    it("Test Case 8: Search and Verify Mapped Procedures are Available for All Views (No Primary No Secondary)", async() => {
        const validations = await MappingUtil.searchProcedures(url, getSearchConfigurations(), headers, modifiedRequestBody.procedures, 4);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 9: Map 3 Procedures to All Views, No Primary, No Secondary", async() => {
        modifiedRequestBody = MappingUtil.createModifiedRequestBody(Testdata.requestBody, (data) => {
            data.procedures = MappingUtil.removeProcedure(data.procedures, "ProcedureMapping_4");
            MappingUtil.setAllProceduresValue(data.procedures, "primary", false);
            MappingUtil.setAllProceduresValue(data.procedures, "secondary", false);
        });

        const response = await ApiUtil.processAPIRequest("POST", url, modifiedRequestBody, headers, "Map 3 Procedures to Multiple Views - No Primary No Secondary", "full");
        const validations = await MappingUtil.performProcedureMappingValidations(response, modifiedRequestBody, 3);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 10: Search and Verify 3 Mapped Procedures are Available for All Views", async() => {
        const validations = await MappingUtil.searchProcedures(url, getSearchConfigurations(), headers, modifiedRequestBody.procedures, 3);
        expect(validations.every(v => v)).toBeTruthy();
    });
    
    it("Test Case 11: Map 5 Procedures to All Views, No Primary, No Secondary", async() => {
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

        const response = await ApiUtil.processAPIRequest("POST", url, modifiedRequestBody, headers, "Map 5 Procedures to Multiple Views - No Primary No Secondary", "full");
        const validations = await MappingUtil.performProcedureMappingValidations(response, modifiedRequestBody, 5);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 12: Search and Verify 5 Mapped Procedures are Available for All Views", async() => {
        const validations = await MappingUtil.searchProcedures(url, getSearchConfigurations(), headers, modifiedRequestBody.procedures, 5);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 13: Remove All Procedures Mapping to All Views", async() => {
        modifiedRequestBody = MappingUtil.createModifiedRequestBody(Testdata.requestBody, (data) => {
            data.procedures = [];
        });

        const response = await ApiUtil.processAPIRequest("POST", url, modifiedRequestBody, headers, "Remove All Procedures from Multiple Views", "full");
        const validations = await MappingUtil.removeAllProcedures(response, modifiedRequestBody);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 14: Search All Views and Verify No Mapped Procedures are Available", async() => {
        const validations = await MappingUtil.searchProcedures(url, getSearchConfigurations(), headers, [], 0);
        expect(validations.every(v => v)).toBeTruthy();
    });
});