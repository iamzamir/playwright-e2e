import { test, expect } from '../../../configs/fixtures';

test.describe(`Close Subprocess & Process Test Cases`, () => {

  test.describe.serial('Close Subprocess & Process Test Suite', () => {

    test('Test Case 1: Start the Process', async ({ testUtil, processPage, commonFunctions, testData }) => {
      await commonFunctions.logMessage('INFO', `Test will use process: ${testData.PROCESS_NAME}; sub-processes: ${testData.SUBPROCESS_NAME1}, ${testData.SUBPROCESS_NAME2}`);
      await testUtil.launchAppFromCatalog(testData.REALM_NAME);
      await testUtil.navigateToProcessListingPage();
      await processPage.clickOnProcess(testData.PROCESS_NAME);
      // TC4 starts the process again (next cycle) and TC5 runs in that cycle, so begin from the first calendar cycle;
      // otherwise the runs walk PSManual4 to the end of its calendar, where TC5's sub-process checks break.
      const processStarted = await processPage.restartProcess({ fromFirstCycle: true });
      expect(await commonFunctions.compareTwoValues(processStarted, true, 'Process started successfully for auto-completion test')).toBeTruthy();
    });

    test('Test Case 2: Close the First Subprocess', async ({ processPage, commonFunctions, testData }) => {
      await commonFunctions.logMessage('INFO', `Closing sub-process: ${testData.SUBPROCESS_NAME1}`);
      const subprocessClosed = await processPage.actionSubProcess(testData.SUBPROCESS_NAME1, 'Close Process');
      const validation = await commonFunctions.compareTwoValues(subprocessClosed, true, `Sub-process ${testData.SUBPROCESS_NAME1} closed successfully`);
      await processPage.backToProcessFromSupProcess();
      expect(validation).toBeTruthy();
    });

    test('Test Case 3: Close the Process, verify status', async ({ processPage, commonFunctions }) => {
      const { menuAvailable, statusMatched } = await processPage.runProcessAction('Close Process');
      const validation1 = await commonFunctions.compareTwoValues(menuAvailable, true, 'Close Process menu is available after sub-process closure');
      const validation2 = await commonFunctions.compareTwoValues(statusMatched, true, 'Main process closed successfully');
      expect(validation1 && validation2).toBeTruthy();
    });

    test('Test Case 4: Start the Process Again', async ({ processPage, commonFunctions }) => {
      const { menuAvailable, statusMatched } = await processPage.runProcessAction('Start Process');
      const validation1 = await commonFunctions.compareTwoValues(menuAvailable, true, 'Start Process menu is available');
      const validation2 = await commonFunctions.compareTwoValues(statusMatched, true, 'Process started successfully for complete auto-completion test');
      expect(validation1 && validation2).toBeTruthy();
    });

    test('Test Case 5: Close First, Second Subprocess', async ({ processPage, commonFunctions, testData }) => {
      const validations: boolean[] = [];
      for (const [index, subProcessName] of [testData.SUBPROCESS_NAME1, testData.SUBPROCESS_NAME2].entries()) {
        await commonFunctions.logMessage('INFO', `Closing sub-process ${index + 1}: ${subProcessName}`);
        const subprocessClosed = await processPage.actionSubProcess(subProcessName, 'Close Process');
        validations.push(await commonFunctions.compareTwoValues(subprocessClosed, true, `Sub-process ${index + 1} ${subProcessName} closed successfully`));
        await processPage.backToProcessFromSupProcess();
      }
      expect(validations.every(Boolean)).toBeTruthy();
    });

    test('Test Case 6: Verify Process Status', async ({ processPage, commonFunctions }) => {
      await processPage.backToProcessFromSupProcess();
      await commonFunctions.logMessage('INFO', 'Verifying process auto-completion');
      const processAutoCompleted = await processPage.refreshAndVerifyStatus('Close Process');
      expect(await commonFunctions.compareTwoValues(processAutoCompleted, true, 'Process auto-completed successfully after all sub-processes closed')).toBeTruthy();
    });

  });
});
