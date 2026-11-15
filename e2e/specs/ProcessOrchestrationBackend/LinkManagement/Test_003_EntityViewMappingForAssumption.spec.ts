import CommonFunctions from "../../../util/common.util";
import ApiUtil from "../../../util/api.util";
import MappingUtil from "../../../util/mapping.util";
const Testdata = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestrationBackend/LinkManagement/Test_003_EntityViewMappingForAssumption.json");

describe("Entity View Mapping for Assumption", async() => {
    let url: string, accessToken: string, headers: Record<string, string>;
    
    before(async () => {
        url = process.env.API_BASE_URL as string + process.env.VIEW_ENTITY_MAP as string;
        accessToken = await ApiUtil.getBearerToken();
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessToken
        };
    });

    it("Test Case 1: Map Views to Assumption", async() => {
        const response = await ApiUtil.processAPIRequest("POST", url, Testdata.requestBody, headers, "Map Views to Assumption", "full");
        const validations = await MappingUtil.performEntityViewMappingValidations(response, Testdata.requestBody, 0);
        expect(validations.every(v => v)).toBeTruthy();
    });
   
    it("Test Case 2: Search and Verify Mapped Views are Available for the Assumption", async() => {
        const validations = await MappingUtil.searchEntityViewMappingByAssumptionType(url, Testdata.requestSearchBody, headers, Testdata.requestBody.views, "Risk");
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 3: Remove 2 Mapped Views from Assumption", async() => {
        const response = await ApiUtil.processAPIRequest("POST", url, Testdata.requestBody2, headers, "Map after Removing 2 Views", "full");
        const validations = await MappingUtil.performEntityViewMappingValidations(response, Testdata.requestBody2, 0); // Changed from 1 to 0
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test case 4: Search and Verify Mapped Views are Available for the Assumption after removing 2 views", async() => {
        const validations = await MappingUtil.searchEntityViewMappingByAssumptionType(url, Testdata.requestSearchBody, headers, Testdata.requestBody2.views, "Risk");
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 5: Add 2 New and 2 Restored Views to Mapping", async() => {
        const response = await ApiUtil.processAPIRequest("POST", url, Testdata.requestBody3, headers, "Map after Adding 2 New and 2 Restored Views", "full");
        const validations = await MappingUtil.performEntityViewMappingValidations(response, Testdata.requestBody3, 0); // Changed from 1 to 0
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test case 6: Search and Verify Mapped Views after adding new views", async() => {
        const validations = await MappingUtil.searchEntityViewMappingByAssumptionType(url, Testdata.requestSearchBody, headers, Testdata.requestBody3.views, "Risk");
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test Case 7: Remove All Mapped Views from Assumption", async() => {
        const expectedDeleteCount = Testdata.requestBody3.views.length * Testdata.requestBody3.entities[0].entityId.length;
        const validations = await MappingUtil.clearAllEntityViews(url, Testdata.requestBody4, headers, expectedDeleteCount);
        expect(validations.every(v => v)).toBeTruthy();
    });

    it("Test case 8: Search and Verify all the mappings are removed from the Assumption", async() => {
        const validations = await MappingUtil.searchEmptyEntityViewsByAssumptionType(url, Testdata.requestSearchBody, headers, "Risk");
        expect(validations.every(v => v)).toBeTruthy();
    });
});