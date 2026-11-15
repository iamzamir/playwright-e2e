import { test, expect } from '../../../configs/fixtures';

test.describe.serial("View Search for Assumption - Planning Space", () => {
  test("Test Case 1: Should navigate to the filtered view in ASSUMPTION context", async ({ testUtil, planningListingPage, portalPage, planningPage, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext("Assumption", testData.PROCESS_NAME, "", testData.ASSUMPTION.ASSUMPTION_NAME);
    await portalPage.openViewFromCommandBar(testData.ASSUMPTION_VIEW_NAME);
    expect(await planningPage.isNavigatedToView(testData.ASSUMPTION_VIEW_NAME), `Navigated to the searched view: ${testData.ASSUMPTION_VIEW_NAME}`).toBe(true);
  });

  test("Test Case 2: Should not offer the hidden view in search in ASSUMPTION context", async ({ portalPage, testData }) => {
    // A visible view proves the assumption views reached the command bar before asserting the hidden one is absent.
    expect(await portalPage.isViewOfferedInCommandBar(testData.ASSUMPTION_VIEW_NAME), `Visible view is offered: ${testData.ASSUMPTION_VIEW_NAME}`).toBe(true);
    expect(await portalPage.isViewOfferedInCommandBar(testData.ASSUMPTION_HIDDEN_VIEW_NAME, 'SHORT'), `Hidden view is not offered: ${testData.ASSUMPTION_HIDDEN_VIEW_NAME}`).toBe(false);
    await portalPage.closeCommandBar();
  });
});
