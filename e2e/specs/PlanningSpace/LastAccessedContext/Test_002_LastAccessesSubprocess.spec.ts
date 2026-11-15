import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
const Testdata = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/LastAccessedContext/Test_002_LastAccessedSubprocess.json");

describe('Verify Last Accessed SubProcess in PS and PO', () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpace(Testdata.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, false, false);
    });

    it(`Test Case 1: Verify Last Accessed SubProcess ${Testdata.SUBPROCESS} should be launched from the App catalog's planning module`, async () => {
        await PlanningSpace.launchContext("Sub-process", { process: Testdata.PROCESS1, subProcess: Testdata.SUBPROCESS });
        await browser.pause(5000);
        await PlanningSpace.loginToPlanningSpace(Testdata.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
        await PlanningSpace.switchToMFEFrame();
        const launchedContext = await PlanningSpace.getLaunchedSubProcessFromPowerbar();
        expect(await CommonFunctions.compareTwoValues(launchedContext, Testdata.SUBPROCESS, "Launched previously accessed process")).toBeTruthy();
    });

    it(`Test Case 2: Verify subprocess- ${Testdata.SUBPROCESS} from process2- ${Testdata.PROCESS2} should be launched in PS after launching from powerbar`, async () => {
        await PlanningSpace.selectEntityFromContext({ process: Testdata.PROCESS2, subProcess: Testdata.SUBPROCESS },false);
        await PlanningSpace.loginToPlanningSpace(Testdata.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, true);
        await PlanningSpace.switchToMFEFrame();
        const launchedContext = await PlanningSpace.getLaunchedProcessFromPowerbar();
        const bValidation1 = await CommonFunctions.compareTwoValues(launchedContext, Testdata.PROCESS2, 'process matched')
        const launchedSubContext = await PlanningSpace.getLaunchedSubProcessFromPowerbar();
        const bValidation2 = await CommonFunctions.compareTwoValues(launchedSubContext, Testdata.SUBPROCESS, 'subprocess matched')
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

    it(`Test Case 3: Verify subprocess- ${Testdata.SUBPROCESS} from process2- ${Testdata.PROCESS2} should be launched after switching to the process orchestration`, async () => {
        await PlanningSpace.navToProcessOrchestration(false);
        await browser.pause(5000);
         const launchedContext = await PlanningSpace.getLaunchedProcessFromPowerbar();
        const bValidation1 = await CommonFunctions.compareTwoValues(launchedContext, Testdata.PROCESS2, 'process matched')
        const launchedSubContext = await PlanningSpace.getLaunchedSubProcessFromPowerbar();
        const bValidation2 = await CommonFunctions.compareTwoValues(launchedSubContext, Testdata.SUBPROCESS, 'subprocess matched')
        expect(bValidation1 && bValidation2).toBeTruthy();
    });
});