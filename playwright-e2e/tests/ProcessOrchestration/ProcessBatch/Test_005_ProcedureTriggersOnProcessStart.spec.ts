import { test, expect } from '../../../configs/fixtures';
import type { ProcessPage } from '../../../pageobjects/process.page';
import type { CommonFunctions } from '../../../util/common.util';

type ProcessAction = 'Start Process' | 'Close Process';

// Runs the first of `preferredOrder` that the three-dot menu offers, so the test works whatever state the shared process is in.
async function runFirstAvailableAction(processPage: ProcessPage, commonFunctions: CommonFunctions, preferredOrder: [ProcessAction, ProcessAction]): Promise<boolean> {
  await processPage.clickOnThreeDotMenu();
  const menu = await processPage.waitForProcessActionMenu();
  const available = { 'Start Process': menu.start, 'Close Process': menu.close };
  const action = preferredOrder.find((candidate) => available[candidate]);
  if (!action) {
    throw new Error('Test failed: Neither "Start Process" nor "Close Process" was found.');
  }

  await commonFunctions.logMessage('INFO', `${action} found, executing ${action} flow.`);
  if (action === 'Start Process') {
    await processPage.startFromOpenMenu();
  } else {
    await processPage.handleProcessMenuClick(action);
  }
  return await processPage.refreshAndVerifyStatus(action);
}

test.describe('Procedure Trigger OnProcess Start', () => {

  test.describe.serial('Process Start/Close Tests', () => {

    test('Test Case 1: Handle Process Based on Availability', async ({ testUtil, processPage, commonFunctions, testData }) => {
      await testUtil.launchAppFromCatalog(testData.REALM_NAME);
      await testUtil.navigateToProcessListingPage();
      await processPage.clickOnProcess(testData.PROCESS_NAME);
      await commonFunctions.logMessage('INFO', 'Starting Test Case 1: start the process if disabled then close the process');
      expect(await runFirstAvailableAction(processPage, commonFunctions, ['Start Process', 'Close Process'])).toBeTruthy();
    });

    test('Test Case 2: Handle Process Based on Availability', async ({ processPage, commonFunctions }) => {
      await commonFunctions.logMessage('INFO', 'Starting Test Case 2: close the process if disabled then start the process');
      expect(await runFirstAvailableAction(processPage, commonFunctions, ['Close Process', 'Start Process'])).toBeTruthy();
    });

  });
});
