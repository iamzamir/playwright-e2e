import { test, expect } from '../../../configs/fixtures';

test.describe.serial("View Search for Sub Process - Planning Space", () => {
  test("Test Case 1: Should navigate to the filtered view", async ({ testUtil, planningListingPage, portalPage, planningPage, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext("Subprocess", testData.PROCESS_NAME, testData.SUBPROCESS_NAME);
    await portalPage.openViewFromCommandBar(testData.SUBPROCESS_VIEW_NAME);
    expect(await planningPage.isNavigatedToView(testData.SUBPROCESS_VIEW_NAME), `Navigated to the searched view: ${testData.SUBPROCESS_VIEW_NAME}`).toBe(true);
  });

  test("Test Case 2: Should not offer the hidden view in search", async ({ portalPage, testData }) => {
    // A visible view proves the sub-process views reached the command bar before asserting the hidden one is absent.
    expect(await portalPage.isViewOfferedInCommandBar(testData.SUBPROCESS_VIEW_NAME), `Visible view is offered: ${testData.SUBPROCESS_VIEW_NAME}`).toBe(true);
    expect(await portalPage.isViewOfferedInCommandBar(testData.SUBPROCESS_HIDDEN_VIEW_NAME, 'SHORT'), `Hidden view is not offered: ${testData.SUBPROCESS_HIDDEN_VIEW_NAME}`).toBe(false);
    await portalPage.closeCommandBar();
  });
});
