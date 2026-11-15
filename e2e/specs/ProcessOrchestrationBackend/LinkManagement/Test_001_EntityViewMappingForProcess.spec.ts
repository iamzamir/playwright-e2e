import ApiUtil from "../../../util/api.util";
import MappingUtil from "../../../util/mapping.util";
import CommonFunctions from "../../../util/common.util";
const Testdata = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestrationBackend/LinkManagement/Test_001_EntityViewMappingForProcess.json");

describe("Entity View Mapping for Process", async () => {
    let url: string, accessToken: string, headers: Record<string, string>;

    before(async () => {
        url = process.env.API_BASE_URL as string + process.env.VIEW_ENTITY_MAP as string;
        accessToken = await ApiUtil.getBearerToken();
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessToken
        };
    });

    it("Test Case 1: Map Views to Process", async () => {
        const response = await ApiUtil.processAPIRequest("POST", url, Testdata.requestBody, headers, "Map Views to Process", "full");
        const validations = await MappingUtil.performEntityViewMappingValidations(response, Testdata.requestBody);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 2: Search and Verify Mapped Views are Available for the process", async () => {
        const validations = await MappingUtil.searchEntityViewMapping(url, Testdata.requestSearchBody, headers, Testdata.requestBody.views);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 3: Remove 2 Mapped Views from Process", async () => {
        const response = await ApiUtil.processAPIRequest("POST", url, Testdata.requestBody2, headers, "Map after Removing 2 Views", "full");
        const validations = await MappingUtil.performEntityViewMappingValidations(response, Testdata.requestBody2);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test case 4: Search and Verify Mapped Views are Available for the process after removing 2 views", async () => {
        const validations = await MappingUtil.searchEntityViewMapping(url, Testdata.requestSearchBody, headers, Testdata.requestBody2.views);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 5: Add 2 New and 2 Restored Views to Mapping", async () => {
        const response = await ApiUtil.processAPIRequest("POST", url, Testdata.requestBody3, headers, "Map after Adding 2 New and 2 Restored Views", "full");
        const validations = await MappingUtil.performEntityViewMappingValidations(response, Testdata.requestBody3);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test case 6: Search and Verify Mapped Views after adding new views", async () => {
        const validations = await MappingUtil.searchEntityViewMapping(url, Testdata.requestSearchBody, headers, Testdata.requestBody3.views);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 7: Remove All Mapped Views from Process", async () => {
        const expectedDeleteCount = Testdata.requestBody3.views.length * Testdata.requestBody3.entities[0].entityId.length;
        const validations = await MappingUtil.clearAllEntityViews(url, Testdata.requestBody4, headers, expectedDeleteCount);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test case 8: Search and Verify all the mappings are removed from the Process", async () => {
        const validations = await MappingUtil.searchEmptyEntityViews(url, Testdata.requestSearchBody, headers);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 9: Map Views with Different Sequence Orders", async () => {
        const modifiedRequestBody = MappingUtil.createModifiedRequestBody(Testdata.requestBody, (data) => {
            data.views.forEach((view, index) => {
                view.sequence = index + 10; // Set custom sequence numbers
            });
        });

        const response = await ApiUtil.processAPIRequest("POST", url, modifiedRequestBody, headers, "Map Views with Custom Sequence", "full");
        const validations = await MappingUtil.performEntityViewMappingValidations(response, modifiedRequestBody);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 10: Map Views with Hidden Flag Variations", async () => {
        const modifiedRequestBody = MappingUtil.createModifiedRequestBody(Testdata.requestBody, (data) => {
            data.views.forEach((view: any, index: number) => {
                view.hidden = index % 2 === 0; // Alternate hidden flags
            });
        });

        const response = await ApiUtil.processAPIRequest("POST", url, modifiedRequestBody, headers, "Map Views with Hidden Variations", "full");
        const validations = await MappingUtil.performEntityViewMappingValidations(response, modifiedRequestBody);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 11: Attempt to Map Non-Existent Views", async () => {
        const invalidRequestBody = MappingUtil.createModifiedRequestBody(Testdata.requestBody, (data) => {
            data.views = [
                { id: "non-existent-view-1", sequence: 1, hidden: false },
                { id: "non-existent-view-2", sequence: 2, hidden: false }
            ];
        });

        const response = await ApiUtil.processAPIRequest("POST", url, invalidRequestBody, headers, "Map Non-Existent Views", "full");
        const validation1 = await CommonFunctions.compareTwoValues(response.status, 200, "Non-Existent Views Mapping Assertion");
        expect(validation1).toBeTruthy();
    });

    it("Test Case 12: Map Views with Empty Views Array", async () => {
        const emptyViewsRequestBody = MappingUtil.createModifiedRequestBody(Testdata.requestBody, (data) => {
            data.views = [];
        });
        const response = await ApiUtil.processAPIRequest("POST", url, emptyViewsRequestBody, headers, "Map with Empty Views Array", "full");
        const validation1 = await CommonFunctions.compareTwoValues(response.status, 400, "Empty Views Error Assertion - Bad Request");
        expect(validation1).toBeTruthy();
    });

    it("Test Case 13: Map Views with Duplicate View IDs", async () => {
        const duplicateViewsRequestBody = MappingUtil.createModifiedRequestBody(Testdata.requestBody, (data) => {
            data.views = [
                { id: data.views[0].id, sequence: 1, hidden: false },
                { id: data.views[0].id, sequence: 2, hidden: true } // Duplicate view ID
            ];
        });

        const response = await ApiUtil.processAPIRequest("POST", url, duplicateViewsRequestBody, headers, "Map Duplicate View IDs", "full");
        const validation1 = await CommonFunctions.compareTwoValues(response.status, 500, "Duplicate Views Error Assertion");
        expect(validation1).toBeTruthy();
    });

    it("Test Case 14: Search Views with Different Filter Criteria", async () => {
        // First, create some mappings
        const response = await ApiUtil.processAPIRequest("POST", url, Testdata.requestBody, headers, "Setup for Filter Search", "full");

        // Test search by specific entity type
        const entityTypeSearchBody = MappingUtil.createModifiedRequestBody(Testdata.requestSearchBody, (data) => {
            data.entityType = "subprocess";
        });

        const searchResponse = await ApiUtil.processAPIRequest("POST", url + '/search', entityTypeSearchBody, headers, "Search by Entity Type", "full");
        const validation1 = await CommonFunctions.compareTwoValues(searchResponse.status, "200", "Entity Type Search Success");

        expect(validation1).toBeTruthy();
    });

    it("Test Case 15: Map Views with Maximum Sequence Numbers", async () => {
        const maxSequenceRequestBody = MappingUtil.createModifiedRequestBody(Testdata.requestBody, (data) => {
            data.views.forEach((view, index) => {
                view.sequence = 999 + index; // High sequence numbers
            });
        });

        const response = await ApiUtil.processAPIRequest("POST", url, maxSequenceRequestBody, headers, "Map Views with Max Sequence", "full");
        const validations = await MappingUtil.performEntityViewMappingValidations(response, maxSequenceRequestBody);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 16: Map Views with Negative Sequence Numbers", async () => {
        const negativeSequenceRequestBody = MappingUtil.createModifiedRequestBody(Testdata.requestBody, (data) => {
            data.views.forEach((view, index) => {
                view.sequence = -(index + 1); // Negative sequence numbers
            });
        });

        const response = await ApiUtil.processAPIRequest("POST", url, negativeSequenceRequestBody, headers, "Map Views with Negative Sequence", "full");
        const validations = await MappingUtil.performEntityViewMappingValidations(response, negativeSequenceRequestBody);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 17: Bulk Map Views to Multiple Processes", async () => {
        const bulkRequestBody = MappingUtil.createModifiedRequestBody(Testdata.requestBody, (data) => {
            data.entities[0].entityId = ["Process1", "Process2", "Process3", "Process4", "Process5"];
        });

        const response = await ApiUtil.processAPIRequest("POST", url, bulkRequestBody, headers, "Bulk Map Views to Multiple Processes", "full");
        const validation1 = await CommonFunctions.compareTwoValues(response.status, "200", "Bulk Mapping Success");
        const validation2 = await CommonFunctions.compareTwoValues(response.data.requestedMappingDetails.viewsCount, bulkRequestBody.views.length, "Bulk Views Count");

        expect(validation1 && validation2).toBeTruthy();
    });

    it("Test Case 18: Performance Test - Map Large Number of Views", async () => {
        const largeViewsRequestBody = MappingUtil.createModifiedRequestBody(Testdata.requestBody, (data) => {
            data.views = [];
            for (let i = 1; i <= 50; i++) {
                data.views.push({
                    id: `PerformanceView${i}`,
                    sequence: i,
                    hidden: i % 2 === 0
                });
            }
        });

        const startTime = Date.now();
        const response = await ApiUtil.processAPIRequest("POST", url, largeViewsRequestBody, headers, "Performance Test - Large Views", "full");
        const endTime = Date.now();
        const duration = endTime - startTime;

        await CommonFunctions.logMessage("INFO", `Large views mapping completed in ${duration}ms`);
        const validation1 = await CommonFunctions.compareTwoValues(response.status, "200", "Large Views Mapping Success");
        const validation2 = await CommonFunctions.compareTwoValues(duration < 30000, true, "Performance Test - Under 30 seconds");
        expect(validation1 && validation2).toBeTruthy();

    });

    it("Test Case 19: Verify Response Schema and Data Types", async () => {
        const response = await ApiUtil.processAPIRequest("POST", url, Testdata.requestBody, headers, "Schema Validation Test", "full");

        // Verify response structure
        expect(response.data).toBeDefined();
        expect(response.data.requestedMappingDetails).toBeDefined();
        expect(response.data.requestedMappingDetails.views).toBeDefined();
        expect(response.data.requestedMappingDetails.entities).toBeDefined();
        expect(Array.isArray(response.data.requestedMappingDetails.views)).toBeTruthy();
        expect(Array.isArray(response.data.requestedMappingDetails.entities)).toBeTruthy();

        // Verify data types
        expect(typeof response.data.requestedMappingDetails.viewsCount).toBe('number');

        response.data.requestedMappingDetails.views.forEach(view => {
            expect(typeof view.id).toBe('string');
            expect(typeof view.sequence).toBe('number');
            expect(typeof view.hidden).toBe('boolean');
        });

        const validation1 = await CommonFunctions.compareTwoValues(response.status, "200", "Schema Validation Success");
        expect(validation1).toBeTruthy();
    });

    it("Test Case 20: Remove All Mapped Views from Process", async () => {
        const expectedDeleteCount = Testdata.requestBody3.views.length * Testdata.requestBody3.entities[0].entityId.length;
        const validation1 = await MappingUtil.clearAllEntityViews(url, Testdata.requestBody4, headers, expectedDeleteCount);
        const validation2 = await MappingUtil.searchEmptyEntityViews(url, Testdata.requestSearchBody, headers);
        expect(validation1 && validation2).toBeTruthy();
    });

});