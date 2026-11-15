import { test } from '../../../../configs/fixtures';
import { PS_VIEWS_DATA, PS_VIEWS_GUARD, useVisualApiHar } from '../../../../util/visual-har.util';

// Source: tests/PlanningSpace/ViewsBatch/Test_015_ViewSettings.spec.ts (stops before any change is saved). That live spec
// keeps covering the real settings; this one checks only how the dialog renders, from a HAR (plan T9.11). Functional
// specs move this view between groups, which changed its View Group field in run 78.
// The one live value in the dialog is "Owned By": the owner's name comes from the IAM directory (`iam/realm/v1/users`,
// kept out of HARs), and the owner is the test account itself, so it only changes if that account is renamed. Mocking
// `process/<name>/users` didn't change it (probe, 2026-11-12).
const testData = require('../../../../testdata/' + process.env.PSENV + '/PlanningSpace/ViewsBatch/Test_015_ViewSettings.json');

test.describe.serial('View Settings Visual Validation - PS', () => {
  useVisualApiHar({ name: 'PS-ViewSettings', url: PS_VIEWS_DATA, guard: PS_VIEWS_GUARD });

  test('Test Case 1: Validate visual baseline for the View Settings dialog', async ({ testUtil, planningPage, visual }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.clickViewDropdown();
    await planningPage.selectView(testData.VIEW_NAME);
    await planningPage.clickOnViewActions('View Settings');
    await planningPage.viewActions.waitForViewSettingsLoaded();

    // Dialog only: the page behind it shows the live scenario, filter and card data.
    await visual.validateArea(planningPage.viewActions.viewSettingsDialog, 'PS-ViewSettings-Dialog', { maxDiffPixelRatio: 0, stableCapture: true });
  });
});
