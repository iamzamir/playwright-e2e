import { test } from '../../../../configs/fixtures';
import { getTimeout } from '../../../../constants/timeouts';

// Source: tests/PlanningSpace/ScenarioBatch/Test_015_ErrorDetailsForMisconfiguredProcess.spec.ts (Test Case 3)
const testData = require('../../../../testdata/' + process.env.PSENV + '/PlanningSpace/ScenarioBatch/Test_015_ErrorDetailsForMisconfiguredProcess.json');

test.describe.serial('Fault Tolerance Visual Validation - No Baseline Scenario (Planner)', () => {
  test('Test Case 1: Validate full-page visual baseline for the no baseline scenario planner screen', async ({ testUtil, planningPage, page, visual }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.signOutAndLoginFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.PSLINK as string);
    // Direct URL: this state never renders a view title, so navigateToPlanningSpaceWithProcess would time out.
    await page.goto(`${process.env.NAVIGATE_TO_PLANNING_SPACE as string}process/${testData.PROCESS_NAME.replace(/\s/g, '')}/processplan/link`);
    await planningPage.waitForCaseValidationTitle(getTimeout('EXTREME'));
    await planningPage.verifyNoBaselineUserTitle(testData.PLANNER_USER_TITLE_TEXT);

    await visual.validatePage('PS-FaultTolerance-NoBaselinePlanner-FullPage', { maxDiffPixelRatio: 0.02 });
  });
});
