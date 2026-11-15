import { test, expect } from '../../../configs/fixtures';

test.describe.serial('ViewSearch in ProcessOrchestration for Assumption', () => {
  // PO replaced the "Assumptions" side-nav page with the power-bar flyout (`assumptions-btn`, plan-sop-lui
  // isAssumptionListFlyoutEnabled), which opens details in place, so there is no PO assumption context to search from.
  // The assumption view search is covered by PlanningSpace/ViewSearch/Test_003. CI also lists this file in TEST_IGNORE.
  test.fixme(true, 'PO assumption side-nav page was replaced by the Assumptions flyout (no assumption context in PO)');

  test(`Test Case 1: Should able to search and navigate to Assumption View`, async ({ testUtil, assumptionPage, portalPage, planningPage, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string);
    await assumptionPage.goToAssumptionDetailsPage(testData.PROCESS_NAME, testData.ASSUMPTION.ASSUMPTION_NAME);
    await portalPage.openViewFromCommandBar(testData.ASSUMPTION_VIEW_NAME);
    expect(await planningPage.isNavigatedToView(testData.ASSUMPTION_VIEW_NAME), `Navigated to the searched view: ${testData.ASSUMPTION_VIEW_NAME}`).toBe(true);
  });

  test("Test Case 2: Should allow searching but prevent navigation to hidden views", async ({ testUtil, portalPage, testData }) => {
    await testUtil.clickLeftpaneLinks('Assumption');
    expect(await portalPage.isViewOfferedInCommandBar(testData.ASSUMPTION_VIEW_NAME), `Visible view is offered: ${testData.ASSUMPTION_VIEW_NAME}`).toBe(true);
    expect(await portalPage.isViewOfferedInCommandBar(testData.ASSUMPTION_HIDDEN_VIEW_NAME, 'SHORT'), `Hidden view is not offered: ${testData.ASSUMPTION_HIDDEN_VIEW_NAME}`).toBe(false);
    await portalPage.closeCommandBar();
  });
});
