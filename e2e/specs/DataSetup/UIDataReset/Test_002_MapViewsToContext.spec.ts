import ApiUtil from "../../../util/api.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/DataSetup/UIDataReset/Test_002_MapViewsToContext.json");
describe('Map Views to Context', () => {

    let url: string, accessToken: string, headers: Record<string, string>;

    before(async () => {
        url = process.env.API_BASE_URL as string + process.env.VIEW_ENTITY_MAP as string;
        accessToken = await ApiUtil.getBearerToken();
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessToken
        };
    })
    it(`Test Case 1 : Map views to process,subprocess,assumption via API call`, async () => {
        await ApiUtil.processAPIRequest("POST", url, TestData.PAYLOAD, headers, "Mapping views to context", "full");
    });
});