import { test } from '../../../../configs/fixtures';

// Test data from the retired real OnDemandMaas Test_008 (case 2 now runs as Mocked/OnDemandMaas/Test_008_VerifyTheUnifiedEmptyStateMocked.spec.ts); this spec still reads its JSON.
const testData = require('../../../../testdata/' + process.env.PSENV + '/PlanningSpace/OnDemandMaas/Test_008_VerifyTheUnifiedEmptyState.json');

test.describe.serial('Fault Tolerance Visual Validation - Unified Empty State', () => {
  test('Test Case 1: Validate full-page visual baseline for the unified empty state screen', async ({ testUtil, planningPage, powerBarPage, visual }) => {
    // Switch context like the source spec; the space-stripped process URL lands on a different view set.
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME_1);
    await powerBarPage.selectEntityFromContext({ process: testData.PROCESS_NAME_2 });
    await testUtil.clickLeftpaneLinks('Planning');
    await planningPage.selectViewInPlanning(testData.EMPTY_VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.EMPTY_VIEW_NAME);
    await planningPage.verifySetFiltersText(testData.SET_FILTER_TITLE);

    await visual.validatePage('PS-FaultTolerance-UnifiedEmptyState-FullPage', { maxDiffPixelRatio: 0.02 });
  });
});
