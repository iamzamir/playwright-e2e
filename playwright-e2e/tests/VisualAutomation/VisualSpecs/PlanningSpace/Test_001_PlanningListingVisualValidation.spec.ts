import { test } from '../../../../configs/fixtures';
import { PS_LISTING_DATA, PS_LISTING_GUARD, useVisualApiHar } from '../../../../util/visual-har.util';

// Source: tests/PlanningSpace/ViewsBatch/Test_006_ConfigureViewToEntityPartA.spec.ts. That live spec keeps covering the
// real listing; this one checks only how it renders, from a HAR (plan T9.11).
const testData = require('../../../../testdata/' + process.env.PSENV + '/PlanningSpace/ViewsBatch/Test_007_SettingsArrangeViews.json');

test.describe.serial('Planning Listing Visual Validation - PS', () => {
  useVisualApiHar({ name: 'PS-PlanningListing', url: PS_LISTING_DATA, guard: PS_LISTING_GUARD });

  test('Test Case 1: Validate full-page visual baseline for the planning listing screen', async ({ testUtil, planningListingPage, visual }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.waitForContextDropdown();

    await visual.validatePage('PS-PlanningListing-FullPage', { maxDiffPixelRatio: 0, stableCapture: true });
  });
});
