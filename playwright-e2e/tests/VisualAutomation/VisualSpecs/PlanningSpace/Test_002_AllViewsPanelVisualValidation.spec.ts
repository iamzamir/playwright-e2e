import { test } from '../../../../configs/fixtures';
import { PS_VIEWS_DATA, PS_VIEWS_GUARD, useVisualApiHar } from '../../../../util/visual-har.util';

// Source: tests/PlanningSpace/ViewsBatch/Test_001_ViewTypesAccessCheckAdmin.spec.ts (Test Case 2). That live spec keeps
// covering the real views; this one checks only how the panel renders, from a HAR (plan T9.11).
const testData = require('../../../../testdata/' + process.env.PSENV + '/PlanningSpace/ViewsBatch/Test_001_ViewTypesAccessCheckAdmin.json');

test.describe.serial('All Views Panel Visual Validation - PS', () => {
  useVisualApiHar({ name: 'PS-AllViewsPanel', url: PS_VIEWS_DATA, guard: PS_VIEWS_GUARD });

  test('Test Case 1: Validate visual baseline for the All Views panel', async ({ testUtil, planningPage, visual }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME, false);
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.clickViewDropdown();
    await planningPage.selectViewType('All Views');

    // Panel only: the dashboard behind it holds live card data.
    await visual.validateArea(planningPage.viewsPanel, 'PS-AllViewsPanel', { maxDiffPixelRatio: 0, stableCapture: true });
  });
});
