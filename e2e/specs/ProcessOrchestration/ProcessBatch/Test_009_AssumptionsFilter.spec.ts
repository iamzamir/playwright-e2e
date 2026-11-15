import assumptionPage from "../../../pageobjects/assumption.page";
import ProcessPage from "../../../pageobjects/process.page";
import apiUtil from "../../../util/api.util";
import CommonFunctions from "../../../util/common.util";
import TestUtil from "../../../util/test.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/ProcessBatch/Test_009_AssumptionsFilter.json");

describe('to test Assumptions data on applying filter', () => {
    let accessToken: string, headers: Record<string, string>;
    const assumptionLifeCycleFF : string = process.env.API_BASE_URL as string + (process.env.UPDATE_FEATURE_TOGGLE as string).replace("{featureFlagName}", TestData.FEATURE_FLAG_NAME[0]);
    before(async () => {
        accessToken = await apiUtil.getBearerToken();
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessToken
        };
      })

    it('Test case 1 : to test assumptions data on applying filter', async () => {
        const assumptionLifeCycleFFResponse = await apiUtil.processAPIRequest("PUT", assumptionLifeCycleFF, { name: TestData.FEATURE_FLAG_NAME[0], isEnabled: true }, headers, "Update feature toggle for assumption cycle", "status");
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(assumptionLifeCycleFFResponse, 200, "Feature toggle updated successfully");
        await TestUtil.launchAppFromCatalog(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string);
        await browser.pause(5000);
        await ProcessPage.clickOnProcess(TestData.PROCESS_NAME);
        await browser.pause(5000);
        await ProcessPage.clickLeftpaneLinks('Assumptions');
        await browser.pause(5000);
        const bValidation3 = await assumptionPage.verifyAssumptionsFilter();
        expect(bValidation2 && bValidation3).toEqual(true);
        await CommonFunctions.logMessage("INFO", "Test case 1: Assumptions data verified successfully on applying filter");
    });

    it(`Test Case 2: Disable the feature toggle for new views ui modal`, async () => {
        const assumptionLifeCycleFFResponse = {
            name: TestData.FEATURE_FLAG_NAME[0],
            isEnabled: false
        };
        const assumptionLifeCycleFfResponse = await apiUtil.processAPIRequest("PUT", assumptionLifeCycleFF, assumptionLifeCycleFFResponse, headers, "Disable feature toggle for assumtion cycle", "status");
        const bValidation2 = await CommonFunctions.compareTwoValues(assumptionLifeCycleFfResponse, 200, "Feature toggle disabled successfully");
        expect(bValidation2).toBeTruthy();
    });
})
