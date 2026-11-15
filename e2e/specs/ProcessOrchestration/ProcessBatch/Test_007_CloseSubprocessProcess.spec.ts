import PlanningSpace from "../../../pageobjects/planning.page";
import ProcessPage from "../../../pageobjects/process.page";
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/ProcessBatch/Test_007_CloseSubprocessProcess.json");

describe(`Close Subprocess & Process Test Cases`, async () => {

    before(async () => {
        await CommonFunctions.logMessage("INFO", "Starting Process and Sub-Process Start/Close Test Suite");
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, "", "", TestData.PROCESS_NAME);
        await browser.pause(5000);
        await CommonFunctions.logMessage("INFO", `Test will use process: ${TestData.PROCESS_NAME}`);
        await CommonFunctions.logMessage("INFO", `Sub-processes: ${TestData.SUBPROCESS_NAME1}, ${TestData.SUBPROCESS_NAME2}`);
    });

    it('Test Case 1: Start the Process', async () => {
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

        await CommonFunctions.logMessage('INFO', 'Starting the process for auto-completion test');
        await ProcessPage.handleProcessMenuClick('Start Process');
        const processStarted = await ProcessPage.refreshAndVerifyStatus('Start Process');
        const validation = await CommonFunctions.compareTwoValues(processStarted, true, 'Process started successfully for auto-completion test');
        expect(validation).toBeTruthy();
    });

    it('Test Case 2: Close the First Subprocess', async () => {
        await CommonFunctions.logMessage('INFO', `Closing sub-process: ${TestData.SUBPROCESS_NAME1}`);
        const subprocessClosed = await ProcessPage.actionSubProcess(TestData.SUBPROCESS_NAME1, 'Close Process');
        const validation = await CommonFunctions.compareTwoValues(subprocessClosed, true, `Sub-process ${TestData.SUBPROCESS_NAME1} closed successfully`);
        await ProcessPage.backToProcessFromSupProcess();
        expect(validation).toBeTruthy();
    });

    it('Test Case 3: Close the Process, verify status', async () => {
        await ProcessPage.clickOnThreeDotMenu();
        const closeMenuExists = await ProcessPage.processMenuExists('Close Process');
        const validation1 = await CommonFunctions.compareTwoValues(closeMenuExists, true, 'Close Process menu is available after sub-process closure');

        await CommonFunctions.logMessage('INFO', 'Closing the main process');
        await ProcessPage.handleProcessMenuClick('Close Process');
        const processClosed = await ProcessPage.refreshAndVerifyStatus('Close Process');
        const validation2 = await CommonFunctions.compareTwoValues(processClosed, true, 'Main process closed successfully');
        expect(validation1 && validation2).toBeTruthy();
    });

    it('Test Case 4: Start the Process Again', async () => {
        await ProcessPage.clickLeftpaneLinks('Process Summary');
        await browser.pause(3000);
        await ProcessPage.clickOnThreeDotMenu();
        const startMenuExists = await ProcessPage.processMenuExists('Start Process');
        const validation1 = await CommonFunctions.compareTwoValues(startMenuExists, true, 'Start Process menu is available');

        await CommonFunctions.logMessage('INFO', 'Starting the process for complete auto-completion test');
        await ProcessPage.handleProcessMenuClick('Start Process');
        const processStarted = await ProcessPage.refreshAndVerifyStatus('Start Process');
        const validation2 = await CommonFunctions.compareTwoValues(processStarted, true, 'Process started successfully for complete auto-completion test');
        expect(validation1 && validation2).toBeTruthy();
    });

    it('Test Case 5: Close First, Second Subprocess', async () => {
        await CommonFunctions.logMessage('INFO', `Closing first sub-process: ${TestData.SUBPROCESS_NAME1}`);
        const subprocessClosed1 = await ProcessPage.actionSubProcess(TestData.SUBPROCESS_NAME1, 'Close Process');
        const validation1 = await CommonFunctions.compareTwoValues(subprocessClosed1, true, `First sub-process ${TestData.SUBPROCESS_NAME1} closed successfully`);
        await ProcessPage.backToProcessFromSupProcess();

        await CommonFunctions.logMessage('INFO', `Closing second sub-process: ${TestData.SUBPROCESS_NAME2}`);
        const subprocessClosed2 = await ProcessPage.actionSubProcess(TestData.SUBPROCESS_NAME2, 'Close Process');
        const validation2 = await CommonFunctions.compareTwoValues(subprocessClosed2, true, `Second sub-process ${TestData.SUBPROCESS_NAME2} closed successfully`);
        expect(validation1 && validation2).toBeTruthy();
    });

    it('Test Case 6: Verify Process Status', async () => {
        await ProcessPage.backToProcessFromSupProcess();
        await CommonFunctions.logMessage('INFO', 'Verifying process auto-completion');
        const processAutoCompleted = await ProcessPage.refreshAndVerifyStatus('Close Process');
        const validation = await CommonFunctions.compareTwoValues(processAutoCompleted, true, 'Process auto-completed successfully after all sub-processes closed');
        expect(validation).toBeTruthy();
    });


});