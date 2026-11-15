import { test } from '../../../../configs/fixtures';
import { useVisualApiHar } from '../../../../util/visual-har.util';

// Source: tests/PlanningSpace/ViewsBatch/Test_015_ViewSettings.spec.ts (Test case 02). That live spec keeps covering the
// real view data; this one checks only how the screen renders, so its data comes from a HAR (plan T9.11).
const testData = require('../../../../testdata/' + process.env.PSENV + '/PlanningSpace/ViewsBatch/Test_015_ViewSettings.json');

/**
 * What the Planning Views grid shows (mapped 2026-11-12): the views list (`uiRegistration/v1/views`), view groups
 * (`dashboard/v3/.../containers`), and the Data Configuration chips (`foundation/model/v1/actorsConfig` and
 * `links/v1/view-entity-map/search`). Functional specs create and delete views on the same tenant, which shifted every
 * row in run 78.
 */
const PLANNING_VIEWS_DATA = /\/lui\/uiRegistration\/v1\/views\?|\/lui\/dashboard\/v3\/solutionAreas\/planningsolutionarea\/containers|\/foundation\/model\/v1\/actorsConfig|\/ibp\/links\/v1\/view-entity-map\/search/;
const PLANNING_VIEWS_GUARD = /\/lui\/uiRegistration\/v1\/views|\/lui\/dashboard\/v3\/|\/foundation\/model\/v1\/actorsConfig|\/ibp\/links\/v1\//;

test.describe.serial('Planning Views Settings Visual Validation - PO', () => {
  useVisualApiHar({ name: 'PO-Settings-PlanningViews', url: PLANNING_VIEWS_DATA, guard: PLANNING_VIEWS_GUARD });

  test('Test Case 1: Validate full-page visual baseline for the planning views settings screen', async ({ testUtil, globalSettingsPage, visual }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string);
    await globalSettingsPage.clickGlobalSettings();
    await globalSettingsPage.clickGlobalSettingsListMenu('Planning Views');

    // Zero tolerance: with mocked data and stableCapture, replays matched pixel for pixel (3 of 3, 2026-11-12), and the
    // 2% default let the ~1,000 px VISUAL_FORCE_DIFF marker through.
    await visual.validatePage('PO-Settings-PlanningViews-FullPage', { maxDiffPixelRatio: 0, stableCapture: true });
  });
});
