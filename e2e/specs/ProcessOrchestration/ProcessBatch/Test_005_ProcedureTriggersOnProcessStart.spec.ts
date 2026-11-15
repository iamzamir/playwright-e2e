import PlanningSpace from "../../../pageobjects/planning.page";
import ProcessPage from "../../../pageobjects/process.page";
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/ProcessBatch/Test_005_ProcedureTriggersOnProcessStart.json");
describe(`Procedure Trigger OnProcess Start`, async () => {

    before(async () => {
           await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    });


    it('Test Case1: Handle Process Based on Availability', async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 1: start the process if disabled then close the process');
        await browser.pause(3000);
        await ProcessPage.clickLeftpaneLinks('Process Summary');
        await browser.pause(5000);
        await ProcessPage.clickOnThreeDotMenu();
        await browser.pause(5000);
       let start= await ProcessPage.processMenuExists('Start Process')
       let close= await ProcessPage.processMenuExists('Close Process')
        if (start) {
            await CommonFunctions.logMessage('INFO', 'Start Process found, executing Start Process flow.');
            await ProcessPage.handleProcessMenuClick('Start Process');
            let processStarted = await ProcessPage.refreshAndVerifyStatus('Start Process'); // Modify this based on your logic
            expect(processStarted).toBeTruthy();
           
        } else if (close) {
            await CommonFunctions.logMessage('INFO', 'Close Process found, executing Close Process flow.');
            await ProcessPage.handleProcessMenuClick('Close Process');
            let processClosed = await ProcessPage.refreshAndVerifyStatus('Close Process'); // Modify this based on your logic
            expect(processClosed).toBeTruthy();
        } else {
            await CommonFunctions.logMessage('INFO', 'Neither Start Process nor Close Process is available in menu.');
            throw new Error('Test failed: Neither "Start Process" nor "Close Process" was found.');
        }
    });

    
    it('Test Case2: Handle Process Based on Availability', async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 1: close the process if disabled then start the process');
        await ProcessPage.clickOnThreeDotMenu();
        await browser.pause(5000);
       let start= await ProcessPage.processMenuExists('Start Process')
       let close= await ProcessPage.processMenuExists('Close Process')
        if (close) {
            await CommonFunctions.logMessage('INFO', 'Close Process found, executing Close Process flow.');
            await ProcessPage.handleProcessMenuClick('Close Process');
            let processClosed = await ProcessPage.refreshAndVerifyStatus('Close Process'); // Modify this based on your logic
            expect(processClosed).toBeTruthy();
        } else if (start) {
            await CommonFunctions.logMessage('INFO', 'Start Process found, executing Start Process flow.');
            await ProcessPage.handleProcessMenuClick('Start Process');
            let processStarted = await ProcessPage.refreshAndVerifyStatus('Start Process'); // Modify this based on your logic
            expect(processStarted).toBeTruthy();
        } else {
            await CommonFunctions.logMessage('INFO', 'Neither Start Process nor Close Process is available in menu.');
            throw new Error('Test failed: Neither "Start Process" nor "Close Process" was found.');
        }
    });


})