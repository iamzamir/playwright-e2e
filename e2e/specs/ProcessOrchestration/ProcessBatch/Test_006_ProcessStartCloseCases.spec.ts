import PlanningSpace from "../../../pageobjects/planning.page";
import ProcessPage from "../../../pageobjects/process.page";
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/ProcessBatch/Test_006_ProcessStartCloseCases.json");

describe(`Process Start/Close Test Cases`, async () => {

    before(async () => {
        await CommonFunctions.logMessage("INFO", "Starting Process Start/Close Test Suite");
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, "", "", TestData.PROCESS_NAME);
        await browser.pause(5000);
        await CommonFunctions.logMessage("INFO", `Test will use process: ${TestData.PROCESS_NAME}`);
        await CommonFunctions.logMessage("INFO", `Sub-processes: ${TestData.SUBPROCESS_NAME1}, ${TestData.SUBPROCESS_NAME2}`);
    });

    it('Test Case 1: Start process, verify sub-processes', async () => {
        await CommonFunctions.logMessage('INFO', 'Test Case 1: Start process, verify sub-processes');

        // Step 1: Ensure process is in startable state
        await ProcessPage.clickLeftpaneLinks('Process Summary');
        await browser.pause(3000);
        await ProcessPage.clickOnThreeDotMenu();
        const startMenuExists = await ProcessPage.processMenuExists('Start Process');

        if (!startMenuExists) {
            await CommonFunctions.logMessage('INFO', 'Process not in startable state, closing first');
            await ProcessPage.handleProcessMenuClick('Close Process');
            await browser.pause(3000);
            await ProcessPage.refreshAndVerifyStatus('Close Process');
            await ProcessPage.clickOnThreeDotMenu();
        }

        // Step 2: Start the process
        await CommonFunctions.logMessage('INFO', 'Starting the process');
        await ProcessPage.handleProcessMenuClick('Start Process');
        const processStarted = await ProcessPage.refreshAndVerifyStatus('Start Process');
        const validation1 = await CommonFunctions.compareTwoValues(processStarted, true, 'Process started successfully');

        // Step 3: Verify first sub-process status
        await CommonFunctions.logMessage('INFO', `Checking status of sub-process: ${TestData.SUBPROCESS_NAME1}`);
        await ProcessPage.clickSubProcess(TestData.SUBPROCESS_NAME1);
        const subProcessStartStatus1 = await ProcessPage.checkSubProcessStatus(TestData.SUBPROCESS_NAME1, 'Start Process');
        const validation2 = await CommonFunctions.compareTwoValues(subProcessStartStatus1, true, `Sub-process ${TestData.SUBPROCESS_NAME1} started successfully`);

        // Step 4: Verify second sub-process status
        await ProcessPage.backToProcessFromSupProcess();
        await CommonFunctions.logMessage('INFO', `Checking status of sub-process: ${TestData.SUBPROCESS_NAME2}`);
        await ProcessPage.clickSubProcess(TestData.SUBPROCESS_NAME2);
        const subProcessStartStatus2 = await ProcessPage.checkSubProcessStatus(TestData.SUBPROCESS_NAME2, 'Start Process');
        const validation3 = await CommonFunctions.compareTwoValues(subProcessStartStatus2, true, `Sub-process ${TestData.SUBPROCESS_NAME2} started successfully`);

        expect(validation1 && validation2 && validation3).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 1: Start process, verify sub-processes completed successfully');
    });

    it('Test Case 2: - Close process, verify sub-processes', async () => {
        await CommonFunctions.logMessage('INFO', 'Test Case 2: Close process, verify sub-processes');

        // Step 1: Close the process
        await ProcessPage.backToProcessFromSupProcess();
        await ProcessPage.clickOnThreeDotMenu();
        const closeMenuExists = await ProcessPage.processMenuExists('Close Process');
        const validation1 = await CommonFunctions.compareTwoValues(closeMenuExists, true, 'Close Process menu is available');

        await CommonFunctions.logMessage('INFO', 'Closing the process');
        await ProcessPage.handleProcessMenuClick('Close Process');
        const processClosed = await ProcessPage.refreshAndVerifyStatus('Close Process');
        const validation2 = await CommonFunctions.compareTwoValues(processClosed, true, 'Process closed successfully');

        // Step 2: Verify sub-processes are closed
        await CommonFunctions.logMessage('INFO', `Verifying ${TestData.SUBPROCESS_NAME1} is closed`);
        await ProcessPage.clickSubProcess(TestData.SUBPROCESS_NAME1);
        const subProcessCloseStatus1 = await ProcessPage.checkSubProcessStatus(TestData.SUBPROCESS_NAME1, 'Close Process');
        const validation3 = await CommonFunctions.compareTwoValues(subProcessCloseStatus1, true, `Sub-process ${TestData.SUBPROCESS_NAME1} closed successfully`);

        await ProcessPage.backToProcessFromSupProcess();
        await CommonFunctions.logMessage('INFO', `Verifying ${TestData.SUBPROCESS_NAME2} is closed`);
        await ProcessPage.clickSubProcess(TestData.SUBPROCESS_NAME2);
        const subProcessCloseStatus2 = await ProcessPage.checkSubProcessStatus(TestData.SUBPROCESS_NAME2, 'Close Process');
        const validation4 = await CommonFunctions.compareTwoValues(subProcessCloseStatus2, true, `Sub-process ${TestData.SUBPROCESS_NAME2} closed successfully`);

        await ProcessPage.backToProcessFromSupProcess();
        expect(validation1 && validation2 && validation3 && validation4).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 2: Close process, verify sub-processes completed successfully');
    });

    it('Test Case 3: Repeat process lifecycle - Start process again', async () => {
        await CommonFunctions.logMessage('INFO', 'Test Case 3: Repeating process lifecycle');

        // Step 1: Start the process
        await ProcessPage.clickOnThreeDotMenu();
        const startMenuExists = await ProcessPage.processMenuExists('Start Process');
        const validation1 = await CommonFunctions.compareTwoValues(startMenuExists, true, 'Start Process menu is available');

        await CommonFunctions.logMessage('INFO', 'Starting the process (second time)');
        await ProcessPage.handleProcessMenuClick('Start Process');
        const processStarted = await ProcessPage.refreshAndVerifyStatus('Start Process');
        const validation2 = await CommonFunctions.compareTwoValues(processStarted, true, 'Process started successfully (second time)');

        // Step 2: Quick verification of sub-processes
        await ProcessPage.clickSubProcess(TestData.SUBPROCESS_NAME1);
        let subProcessStartStatus1 = await ProcessPage.checkSubProcessStatus(TestData.SUBPROCESS_NAME1, 'Start Process');
        let validation3 = await CommonFunctions.compareTwoValues(subProcessStartStatus1, true, `Sub-process ${TestData.SUBPROCESS_NAME1} started successfully`);
        await ProcessPage.backToProcessFromSupProcess();

        await ProcessPage.clickSubProcess(TestData.SUBPROCESS_NAME2);
        let subProcessStartStatus2 = await ProcessPage.checkSubProcessStatus(TestData.SUBPROCESS_NAME2, 'Start Process');
        let validation4 = await CommonFunctions.compareTwoValues(subProcessStartStatus2, true, `Sub-process ${TestData.SUBPROCESS_NAME2} started successfully`);
        await ProcessPage.backToProcessFromSupProcess();

        expect(validation1 && validation2 && validation3 && validation4).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 3: Repeat process lifecycle completed successfully');
    });

    it('Test Case 4: Repeat process lifecycle - close process again', async () => {
        await CommonFunctions.logMessage('INFO', 'Test Case 4: Repeating process lifecycle');

        // Step 1: Close the process
        await ProcessPage.clickOnThreeDotMenu();
        const closeMenuExists = await ProcessPage.processMenuExists('Close Process');
        const validation1 = await CommonFunctions.compareTwoValues(closeMenuExists, true, 'Close Process menu is available');

        await CommonFunctions.logMessage('INFO', 'Closing the process (second time)');
        await ProcessPage.handleProcessMenuClick('Close Process');
        const processClosed = await ProcessPage.refreshAndVerifyStatus('Close Process');
        const validation2 = await CommonFunctions.compareTwoValues(processClosed, true, 'Process closed successfully (second time)');

        // Step 2: Quick verification of sub-processes closure
        await ProcessPage.clickSubProcess(TestData.SUBPROCESS_NAME1);
        let subProcessCloseStatus1 = await ProcessPage.checkSubProcessStatus(TestData.SUBPROCESS_NAME1, 'Close Process');
        let validation3 = await CommonFunctions.compareTwoValues(subProcessCloseStatus1, true, `Sub-process ${TestData.SUBPROCESS_NAME1} closed successfully`);
        await ProcessPage.backToProcessFromSupProcess();

        await ProcessPage.clickSubProcess(TestData.SUBPROCESS_NAME2);
        let subProcessCloseStatus2 = await ProcessPage.checkSubProcessStatus(TestData.SUBPROCESS_NAME2, 'Close Process');
        let validation4 = await CommonFunctions.compareTwoValues(subProcessCloseStatus2, true, `Sub-process ${TestData.SUBPROCESS_NAME2} closed successfully`);
        await ProcessPage.backToProcessFromSupProcess();

        expect(validation1 && validation2 && validation3 && validation4).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 4: Repeat process lifecycle completed successfully');
    });

});