import { test } from '../../../../configs/fixtures';

// Test data from the retired real OnDemandMaas Test_008 (case 1 now runs as Mocked/OnDemandMaas/Test_008_VerifyTheUnifiedErrorStateMocked.spec.ts); this spec still reads its JSON.
const testData = require('../../../../testdata/' + process.env.PSENV + '/PlanningSpace/OnDemandMaas/Test_008_VerifyTheUnifiedEmptyState.json');

test.describe.serial('Fault Tolerance Visual Validation - Unified Error State', () => {
  test('Test Case 1: Validate full-page visual baseline for the unified error state screen', async ({ testUtil, planningPage, visual }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME_1);
    await planningPage.selectViewInPlanning(testData.ERROR_VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.ERROR_VIEW_NAME);

    await visual.validatePage('PS-FaultTolerance-UnifiedErrorState-FullPage', { maxDiffPixelRatio: 0.02 });
  });
});
