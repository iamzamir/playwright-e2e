import { test } from '../../../../configs/fixtures';
import { PO_PROCESS_MAPPING_DATA, PO_PROCESS_MAPPING_GUARD, useVisualApiHar } from '../../../../util/visual-har.util';

// Source: tests/PlanningSpace/ViewsBatch/Test_007_SettingsArrangeViews.spec.ts (Test case 1, 'Map With...' dialog only, nothing saved).
// That live spec keeps covering the real mapping; this one checks only how the screen renders, from a HAR (plan T9.11).
const testData = require('../../../../testdata/' + process.env.PSENV + '/PlanningSpace/ViewsBatch/Test_007_SettingsArrangeViews.json');

test.describe.serial('Arrange Views (Map With) Settings Visual Validation - PO', () => {
  useVisualApiHar({ name: 'PO-Settings-ArrangeViewsMapWith', url: PO_PROCESS_MAPPING_DATA, guard: PO_PROCESS_MAPPING_GUARD });

  test('Test Case 1: Validate full-page visual baseline for the arrange views map with screen', async ({ testUtil, globalSettingsPage, visual }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string);
    await globalSettingsPage.clickGlobalSettings();
    await globalSettingsPage.clickGlobalSettingsListMenu('Process');
    await globalSettingsPage.selectProcess(testData.PROCESS_CONTEXT.PROCESS_NAME);
    await globalSettingsPage.selectProcessAction(testData.PROCESS_CONTEXT.PROCESS_NAME, 'Map With...');

    await visual.validatePage('PO-Settings-ArrangeViewsMapWith-FullPage', { maxDiffPixelRatio: 0, stableCapture: true });
  });
});
