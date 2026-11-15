import PlanningSpace from "../../../pageobjects/planning.page"
import IdentityAccess from "../../../pageobjects/identity-and-access.page"
import CommonFunctions from "../../../util/common.util"
import TestData from '../../../Testdata/INTEROP/PlanningSpace/ViewsBatch/Test_005_ViewsAreRenderedBasedOnRBAC.json';

describe('View Are Rendered Based on RBAC', async () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, false, false);
        await browser.pause(10000);
    });

    it(`Test Case 1: Planning Views should Not be Visible`, async () => {
        const bValidation1: boolean = await PlanningSpace.launchContext("Process", { process: TestData.PROCESS_NAME });
        let bValidation2: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.getUnAuthorizedErrorMsg(), "Unauthorized access", "UnAuthorized Error Assertion")
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

    it(`Test Case 2: Planning Views should be Visible`, async () => {
        await IdentityAccess.navigateToIdentityaccessMfe();
        let successAlert: string = await IdentityAccess.assignRoleToUser(process.env.FUNCTIONAL_TEST_USERNAME2 as string, TestData.POLICY_NAME);
        let bValidation1: boolean = await CommonFunctions.compareTwoValues(successAlert, "1 role is assigned to " + process.env.FUNCTIONAL_TEST_USERNAME2 as string, TestData.POLICY_NAME + " role assigned to the User " + process.env.FUNCTIONAL_TEST_USERNAME2 as string + " Assertion")
        await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
        await browser.pause(15000);
        await PlanningSpace.switchToMFEFrame();
        await PlanningSpace.expandPlanningSpaceLeftSection()
        const viewsFromPS: string[] = await PlanningSpace.getAllViews();
        await CommonFunctions.logMessage("INFO", "All Views are:: " + viewsFromPS);
        let bValidation2: boolean = await CommonFunctions.compareTwoValues(viewsFromPS, "ViewOne", "View Display Assertion")
        await CommonFunctions.logMessage("INFO", "Clicking Refresh Button");
        let bValidation3 = await CommonFunctions.compareTwoValues(await PlanningSpace.clickRefreshBtn(), true, "Refresh button clicked successfully");
        await browser.pause(5000);
        await CommonFunctions.logMessage("INFO", "Clicking Edit View Button");
        let bValidation4 = await CommonFunctions.compareTwoValues(await PlanningSpace.clickEditBtn(), true, "Edit button clicked successfully");
        await browser.pause(5000);
        expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
    });

    it(`Test Case 3: Removing Policy`, async () => {
        await IdentityAccess.navigateToIdentityaccessMfe();
        let successAlert: string = await IdentityAccess.unAssignRoleToUser(process.env.FUNCTIONAL_TEST_USERNAME2 as string, TestData.POLICY_NAME);
        let bValidation: boolean = await CommonFunctions.compareTwoValues(successAlert, "1 role is deleted from " + process.env.FUNCTIONAL_TEST_USERNAME2 as string, TestData.POLICY_NAME + " role assigned to the User " + process.env.FUNCTIONAL_TEST_USERNAME2 as string + " Assertion")
        await browser.pause(5000);
        expect(bValidation).toBeTruthy();
    });

})