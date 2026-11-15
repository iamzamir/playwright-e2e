// import PlanningSpace from "../../../pageobjects/planning.page";
// import apiUtil from "../../../util/api.util";
// import CommonFunctions from "../../../util/common.util";
// import TestUtil from "../../../util/test.util";
// const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/PowerBar/Test_003_PowerBarForAssumptionInPO.json");

// describe("PowerBar in ProcessOrchestration for subprocess - PO", () => {
//     let accessToken: string, headers: Record<string, string>;
//     const url: string = process.env.API_BASE_URL as string + (process.env.UPDATE_FEATURE_TOGGLE as string).replace("{featureFlagName}", TestData.FEATURE_FLAG_NAME[1]);
//     const featureFlagUrl: string = process.env.API_BASE_URL as string + (process.env.UPDATE_FEATURE_TOGGLE as string).replace("{featureFlagName}", TestData.FEATURE_FLAG_NAME[0]);
//     before(async () => {
//         accessToken = await apiUtil.getBearerToken();
//             headers = {
//                 "accept": "application/json",
//                 "Authorization": "Bearer " + accessToken
//         };     
//     })
    
//     it('Test Case 1: Verify process tooltip details in assumption details page for powerbar', async () => {
//         const response = await apiUtil.processAPIRequest("PUT", url, { name: TestData.FEATURE_FLAG_NAME[1], isEnabled: true }, headers, "Update feature toggle for dirty state", "status");
//         const featureFlagResponse = await apiUtil.processAPIRequest("PUT", featureFlagUrl, { name: TestData.FEATURE_FLAG_NAME[0], isEnabled: true }, headers, "Update feature toggle for dirty state", "status");
//         const bValidation: boolean = await CommonFunctions.compareTwoValues(response, 200, "Feature toggle updated successfully");
//         const bValidation1: boolean = await CommonFunctions.compareTwoValues(featureFlagResponse, 200, "Feature toggle updated successfully");
//         await TestUtil.launchAppFromCatalog(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string);
//         await browser.pause(5000);
//         await PlanningSpace.goToAssumptionDetailsPage(TestData.PROCESS_NAME,TestData.ASSUMPTION.ASSUMPTION_NAME)
//         await browser.pause(5000);
//         const bValidation2 = await PlanningSpace.verifyPowerBarEntityToolTipDetails('ASSUMPTION',TestData.PROCESS_NAME,undefined, TestData.ASSUMPTION.ASSUMPTION_NAME)
//         await CommonFunctions.compareTwoValues(bValidation2, true, "verify process details in power bar tooltip");
//         expect(bValidation && bValidation1).toEqual(true);
//         await CommonFunctions.logMessage("INFO", "Test case 1: Powerbar details in process tooltip verified successfully for assumption"); 
//     });
    
//     it('Test Case 2:verify navigating to process summary page on click of process if context is assumption', async () => {
//         const validation1 = await PlanningSpace.verifyNavigationOnClickOfEntityChip('PROCESS', TestData.PROCESS_NAME,undefined, TestData.ASSUMPTION.ASSUMPTION_NAME);
//         console.log('validation1', validation1);
//         await CommonFunctions.compareTwoValues(validation1, true, "verify navigation to process summary page on click of process in power bar");
//         expect(validation1).toEqual(true);
//         await CommonFunctions.logMessage("INFO", "Test case 2: Navigation to process summary page on click of process in power bar verified successfully for assumption");
//     })

//     it(`Test Case 3: Disable the feature toggle for new views ui modal`, async () => {
//         const disableFeatureFlagPayload = {
//             name: TestData.FEATURE_FLAG_NAME[0],
//             isEnabled: false
//         };
//         const disablePayload = {
//             name: TestData.FEATURE_FLAG_NAME[1],
//             isEnabled: false
//         };
//         const response = await apiUtil.processAPIRequest("PUT", url, disablePayload, headers, "Disable feature toggle for new views ui", "status");
//         const featureFlagResponse = await apiUtil.processAPIRequest("PUT", featureFlagUrl, disableFeatureFlagPayload, headers, "Disable feature toggle for new views ui", "status");
//         const bValidation = await CommonFunctions.compareTwoValues(response, 200, "Feature toggle disabled successfully");
//         const bValidation1 = await CommonFunctions.compareTwoValues(featureFlagResponse, 200, "Feature toggle disabled successfully");
//         expect(bValidation && bValidation1).toBeTruthy();
//     });
// })