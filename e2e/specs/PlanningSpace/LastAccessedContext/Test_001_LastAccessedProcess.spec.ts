import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
import IdentityAccess from "../../../pageobjects/identity-and-access.page"
const Testdata = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/LastAccessedContext/Test_001_LastAccessedProcess.json");

describe('Verify Last Accessed Process in PS and PO', () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(Testdata.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, Testdata.PROCESS1, false, false);
        await browser.pause(10000);
    });

    it(`Test Case 1: Verify process1 ${Testdata.PROCESS1} should be launched from the App catalog's planning module`, async () => {
        await PlanningSpace.loginToPlanningSpace(Testdata.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
        await PlanningSpace.switchToMFEFrame();
        const launchedProcess = await PlanningSpace.getLaunchedProcessFromPowerbar();
        expect(await CommonFunctions.compareTwoValues(launchedProcess, Testdata.PROCESS1, "Launched previously accessed process")).toBeTruthy();
    });

    it(`Test Case 2: Verify process2 ${Testdata.PROCESS2} should be launched after launching and logging out`, async () => {
        await PlanningSpace.selectEntityFromContext({ process: Testdata.PROCESS2 },false);
        await PlanningSpace.signOut();
        await PlanningSpace.loginToPlanningSpace(Testdata.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, true, false, true);
        const launchedProcess = await PlanningSpace.getLaunchedProcessFromPowerbar();
        expect(await CommonFunctions.compareTwoValues(launchedProcess, Testdata.PROCESS2, "Launched previously accessed process")).toBeTruthy();
    });

    it(`Test Case 3: Verify process2 ${Testdata.PROCESS2} should be launched after switching to the process orchestration`, async () => {
        await PlanningSpace.navToProcessOrchestration(false);
        await browser.pause(5000);
        const launchedProcess = await PlanningSpace.getLaunchedProcessFromPowerbar();
        expect(await CommonFunctions.compareTwoValues(launchedProcess, Testdata.PROCESS2, "Launched previously accessed process")).toBeTruthy();
    });

    it(`Test Case 4: Verify unauthorized page is shown after removing Policy ${Testdata.POLICY_NAME}`, async () => {
        await IdentityAccess.navigateToIdentityaccessMfe();
        let successAlert: string = await IdentityAccess.unAssignRoleToUser(process.env.FUNCTIONAL_TEST_USERNAME2 as string, Testdata.POLICY_NAME);
        let bValidation1: boolean = await CommonFunctions.compareTwoValues(successAlert, "1 role is deleted from " + process.env.FUNCTIONAL_TEST_USERNAME2, Testdata.POLICY_NAME + " role assigned to the User " + process.env.FUNCTIONAL_TEST_USERNAME2 + " Assertion")
        await browser.pause(2000);
        await PlanningSpace.loginToPlanningSpace(Testdata.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, true);
        await PlanningSpace.switchToMFEFrame();
        await browser.pause(5000);
        let bValidation2: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.getUnAuthorizedErrorMsg(), "Unauthorized access", "UnAuthorized Error Assertion");
        await PlanningSpace.navToProcessOrchestration(false);
        let bValidation3: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.getUnAuthorizedErrorMsg(), "Unauthorized access", "UnAuthorized Error Assertion in PO");
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it(`Test Case 5: Reassign policy ${Testdata.POLICY_NAME} back to the user`, async () => {
        await IdentityAccess.navigateToIdentityaccessMfe();
        let successAlert: string = await IdentityAccess.assignRoleToUser(process.env.FUNCTIONAL_TEST_USERNAME2 as string, Testdata.POLICY_NAME);
        let bValidation1: boolean = await CommonFunctions.compareTwoValues(successAlert, "1 role is assigned to " + process.env.FUNCTIONAL_TEST_USERNAME2, Testdata.POLICY_NAME + " role assigned to the User " + process.env.FUNCTIONAL_TEST_USERNAME2 + " Assertion")
        await browser.pause(2000);
        expect(bValidation1).toBeTruthy();
    });
});