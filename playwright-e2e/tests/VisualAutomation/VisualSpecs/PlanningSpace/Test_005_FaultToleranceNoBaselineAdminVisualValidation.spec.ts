import { test } from '../../../../configs/fixtures';

// Source: tests/PlanningSpace/ScenarioBatch/Test_015_ErrorDetailsForMisconfiguredProcess.spec.ts (Test Case 1)
const testData = require('../../../../testdata/' + process.env.PSENV + '/PlanningSpace/ScenarioBatch/Test_015_ErrorDetailsForMisconfiguredProcess.json');

test.describe.serial('Fault Tolerance Visual Validation - No Baseline Scenario (Admin)', () => {
  test('Test Case 1: Validate full-page visual baseline for the no baseline scenario admin screen', async ({ testUtil, planningPage, visual }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);
    // Title only: link labels (e.g. SNA -> Semantic Network Architect) are asserted by the pixel compare.
    await planningPage.verifyNoBaselineAdminTitle(testData.ADMIN_USER_TITLE_TEXT);

    await visual.validatePage('PS-FaultTolerance-NoBaselineAdmin-FullPage', { maxDiffPixelRatio: 0.02 });
  });
});
