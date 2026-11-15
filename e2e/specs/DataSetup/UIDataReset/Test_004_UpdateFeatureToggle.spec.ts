import ApiUtil from "../../../util/api.util";
import CommonFunctions from '../../../util/common.util';

describe('Map Views to Context', () => {

    let accessToken: string, headers: Record<string, string>;

    before(async () => {
        accessToken = await ApiUtil.getBearerToken();
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessToken
        };
    })
    it(`Enable feature toggle for new views UI`, async () => {
        const enableFeatureFlagPayload = {
            name: "WITH_NEW_SCENARIO_FILTER",
            isEnabled: true
        };
        const enablePayload = {
            name: "WITH_NEW_VIEW_FILTER_UI",
            isEnabled: true
        };
        const url: string = process.env.API_BASE_URL as string + (process.env.UPDATE_FEATURE_TOGGLE as string).replace("{featureFlagName}", "WITH_NEW_VIEW_FILTER_UI");
        const featureFlagUrl: string = process.env.API_BASE_URL as string + (process.env.UPDATE_FEATURE_TOGGLE as string).replace("{featureFlagName}", "WITH_NEW_SCENARIO_FILTER");
        const response = await ApiUtil.processAPIRequest("PUT", url, enablePayload, headers, "Enable feature toggle for new views ui", "status");
        const featureFlagResponse = await ApiUtil.processAPIRequest("PUT", featureFlagUrl, enableFeatureFlagPayload, headers, "Enable feature toggle for scenario filtering", "status");
        const bValidation1 = await CommonFunctions.compareTwoValues(response, 200, "Feature toggle enabled successfully");
        const bValidation2 = await CommonFunctions.compareTwoValues(featureFlagResponse, 200, "Feature toggle enabled successfully");
        expect(bValidation1 && bValidation2).toBeTruthy();
    });
});