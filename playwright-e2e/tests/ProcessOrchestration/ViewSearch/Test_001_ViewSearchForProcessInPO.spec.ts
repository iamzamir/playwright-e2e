import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';

test.describe.serial('ViewSearch in ProcessOrchestration for process', () => {

  test('Test Case 1: Should able to search and navigate to View', async ({ testUtil, processPage, portalPage, planningPage, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string);
    await processPage.clickOnProcess(testData.PROCESS_NAME);
    await portalPage.openViewFromCommandBar(testData.VIEW_NAME);
    expect(await planningPage.isNavigatedToView(testData.VIEW_NAME), `Navigated to the searched view: ${testData.VIEW_NAME}`).toBe(true);
  });

  test('Test Case 2: Should allow searching but prevent navigation to hidden views', async ({ page, testUtil, portalPage, testData }) => {
    await testUtil.clickLeftpaneLinks('Process Summary');
    await page.waitForURL(url => url.toString().includes('summary'), { timeout: getTimeout('EXTREME') });
    // A visible view proves the process views reached the command bar before asserting the hidden one is absent.
    expect(await portalPage.isViewOfferedInCommandBar(testData.VIEW_NAME), `Visible view is offered: ${testData.VIEW_NAME}`).toBe(true);
    expect(await portalPage.isViewOfferedInCommandBar(testData.HIDDEN_VIEW_NAME, 'SHORT'), `Hidden view is not offered: ${testData.HIDDEN_VIEW_NAME}`).toBe(false);
    await portalPage.closeCommandBar();
  });
});
