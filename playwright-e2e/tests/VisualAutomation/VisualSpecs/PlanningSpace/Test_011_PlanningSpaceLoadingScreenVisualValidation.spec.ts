import { test } from '../../../../configs/fixtures';

// Source: tests/PlanningSpace/QuickLinks/Test_001_EasyAccessQuickLinksFromPS.spec.ts (Test Case 1)
const testData = require('../../../../testdata/' + process.env.PSENV + '/PlanningSpace/QuickLinks/Test_001_EasyAccessQuickLinksFromPS.json');

test.describe.serial('Planning Space Loading Screen Visual Validation - PS', () => {
  test('Test Case 1: Validate visual baseline for the "Setting up your page" loading screen', async ({ testUtil, planningPage, page, visual }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    // Hold the planning-data calls so the transient loader stays on screen long enough to compare.
    const releaseApiRequests = await planningPage.holdPlanningDataRequests();
    try {
      await page.goto(`${process.env.NAVIGATE_TO_PLANNING_SPACE as string}process/${testData.PROCESS_NAME}/processplan/link`, { waitUntil: 'commit' });
      const loader = await planningPage.getVisibleLoadingIndicator();

      // Area-only: the animated progress bar would never match.
      await visual.validateArea(loader, 'PS-PlanningSpace-LoadingScreen');
    } finally {
      await releaseApiRequests();
    }
  });
});
