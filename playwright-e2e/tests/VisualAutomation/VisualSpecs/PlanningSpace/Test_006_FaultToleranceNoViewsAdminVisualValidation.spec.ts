import { test } from '../../../../configs/fixtures';
import { getTimeout } from '../../../../constants/timeouts';

// Source: tests/PlanningSpace/ScenarioBatch/Test_015_ErrorDetailsForMisconfiguredProcess.spec.ts (Test Case 2)
const testData = require('../../../../testdata/' + process.env.PSENV + '/PlanningSpace/ScenarioBatch/Test_015_ErrorDetailsForMisconfiguredProcess.json');

test.describe.serial('Fault Tolerance Visual Validation - No Views Mapped (Admin)', () => {
  test('Test Case 1: Validate full-page visual baseline for the no views mapped admin screen', async ({ testUtil, planningPage, powerBarPage, page, visual }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME_NO_VIEWS_MAPPED);
    await powerBarPage.selectEntityFromContext({ process: testData.PROCESS_NAME_NO_VIEWS_MAPPED, subProcess: testData.SUB_PROCESS_NAME_NO_VIEWS_MAPPED });
    await testUtil.clickLeftpaneLinks('Planning');
    // The in-app sub-process switch leaves "Setting up your page" stuck; a fresh load renders the no-views state.
    await page.reload();
    await planningPage.waitForCaseValidationTitle(getTimeout('EXTREME'));
    await planningPage.verifyNoViewsAdminTitle('No views created yet');

    await visual.validatePage('PS-FaultTolerance-NoViewsAdmin-FullPage', { maxDiffPixelRatio: 0.02 });
  });
});
