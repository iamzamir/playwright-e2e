import { test, expect } from '../../../configs/fixtures';
import type { ProcessPage } from '../../../pageobjects/process.page';
import type { CommonFunctions } from '../../../util/common.util';

type ProcessAction = 'Start Process' | 'Close Process';

const EXPECTED_AFTER: Record<ProcessAction, { subProcess: string; grandchildren: string[] }> = {
  'Start Process': { subProcess: 'In Progress', grandchildren: ['In Progress', 'Not Started', 'Not Started'] },
  'Close Process': { subProcess: 'Auto Completed', grandchildren: ['Auto Completed', 'Auto Completed', 'Auto Completed'] }
};

// Opens each sub-process, checks it and its three children against what `action` should produce, and returns to the process.
async function verifySubProcessTrees(processPage: ProcessPage, commonFunctions: CommonFunctions, subProcessNames: string[], action: ProcessAction): Promise<boolean> {
  const expected = EXPECTED_AFTER[action];
  const validations: boolean[] = [];

  for (const subProcessName of subProcessNames) {
    await commonFunctions.logMessage('INFO', `Checking status of sub-process: ${subProcessName}`);
    const isSubProcessOpen = await processPage.clickSubProcess(subProcessName);
    validations.push(await commonFunctions.compareTwoValues(isSubProcessOpen, true, `Sub-process ${subProcessName} opened`));
    if (!isSubProcessOpen) {
      await processPage.backToProcessFromSupProcess();
      continue;
    }
    const subProcessStatus = await processPage.waitForStatus(expected.subProcess);
    validations.push(await commonFunctions.compareTwoValues(subProcessStatus.toLowerCase(), expected.subProcess.toLowerCase(), `Sub-process ${subProcessName} is ${expected.subProcess}`));

    for (const [index, expectedGrandchildStatus] of expected.grandchildren.entries()) {
      const isGrandchildStatusMatching = await processPage.verifyGrandchildStatusText(index, expectedGrandchildStatus);
      validations.push(await commonFunctions.compareTwoValues(isGrandchildStatusMatching, true, `${subProcessName} grandchild ${index + 1} is ${expectedGrandchildStatus}`));
    }
    await processPage.backToProcessFromSupProcess();
  }
  return validations.every(Boolean);
}

// Runs `action` on the process, then verifies the process, both sub-processes and their children.
async function runActionAndVerifyTree(processPage: ProcessPage, commonFunctions: CommonFunctions, subProcessNames: string[], action: ProcessAction, label: string): Promise<boolean> {
  await commonFunctions.logMessage('INFO', `${label}: ${action}`);
  const { menuAvailable, statusMatched } = await processPage.runProcessAction(action);
  const validation1 = await commonFunctions.compareTwoValues(menuAvailable, true, `${action} menu is available (${label})`);
  const validation2 = await commonFunctions.compareTwoValues(statusMatched, true, `${action} succeeded (${label})`);
  const validation3 = await verifySubProcessTrees(processPage, commonFunctions, subProcessNames, action);
  return validation1 && validation2 && validation3;
}

test.describe(`Process Start/Close Test Cases`, () => {

  test.describe.serial('Process Start/Close Test Suite', () => {

    test('Test Case 1: Start process, verify sub-processes', async ({ testUtil, processPage, commonFunctions, testData }) => {
      const subProcessNames = [testData.SUBPROCESS_NAME1, testData.SUBPROCESS_NAME2];
      await commonFunctions.logMessage('INFO', `Test will use process: ${testData.PROCESS_NAME}; sub-processes: ${subProcessNames.join(', ')}`);
      await testUtil.launchAppFromCatalog(testData.REALM_NAME);
      await testUtil.navigateToProcessListingPage();
      await processPage.clickOnProcess(testData.PROCESS_NAME);
      await testUtil.clickLeftpaneLinks('Process Summary');

      // TC3 starts the process again in the next cycle; starting from the first calendar cycle keeps both rounds away from the
      // calendar's last cycles, where starts are rejected or sub-processes behave differently.
      const processStarted = await processPage.restartProcess({ fromFirstCycle: true });
      const validation1 = await commonFunctions.compareTwoValues(processStarted, true, 'Process started successfully');
      const validation2 = await verifySubProcessTrees(processPage, commonFunctions, subProcessNames, 'Start Process');
      expect(validation1 && validation2).toBeTruthy();
    });

    test('Test Case 2: Close process, verify sub-processes', async ({ processPage, commonFunctions, testData }) => {
      await processPage.backToProcessFromSupProcess();
      expect(await runActionAndVerifyTree(processPage, commonFunctions, [testData.SUBPROCESS_NAME1, testData.SUBPROCESS_NAME2], 'Close Process', 'Test Case 2')).toBeTruthy();
    });

    test('Test Case 3: Repeat process lifecycle - Start process again', async ({ processPage, commonFunctions, testData }) => {
      await processPage.backToProcessFromSupProcess();
      expect(await runActionAndVerifyTree(processPage, commonFunctions, [testData.SUBPROCESS_NAME1, testData.SUBPROCESS_NAME2], 'Start Process', 'Test Case 3')).toBeTruthy();
    });

    test('Test Case 4: Repeat process lifecycle - close process again', async ({ processPage, commonFunctions, testData }) => {
      await processPage.backToProcessFromSupProcess();
      expect(await runActionAndVerifyTree(processPage, commonFunctions, [testData.SUBPROCESS_NAME1, testData.SUBPROCESS_NAME2], 'Close Process', 'Test Case 4')).toBeTruthy();
    });

  });
});
