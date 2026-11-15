import { test, expect } from '../../../../configs/fixtures';
import { getTimeout } from '../../../../constants/timeouts';
import { MockHandle, mockActivePlanningInstance, mockProcessUsers, pinDefaultScenario } from '../../../../util/api-mock.util';

/**
 * Mocked UI contract for the OnDemandMaas Data Sync status while the planning instance is still syncing (live
 * counterpart: OnDemandMaas Test_004 Test Case 1, which only applies a filter and never asserts the in-progress state).
 * A real cluster is in progress for a few minutes after a restart, so it can't be caught on demand.
 * Own spec because the session mock is installed before the first navigation of a new browser context.
 * Contract (planning-mfe `useUpdateMfeInfo.ts`, `DataSyncWidget.tsx`, `DataSyncStatusCard.tsx`).
 */
const INSTANCE_ID = 'mock-planning-instance-inprogress-001';
const RUN_ID = 'mock-proc-exec-inprogress-001';
const PROCEDURE_NAME = 'MockODMProcedure';
const RUN_BY_USER_ID = 'mock-user-001';
const IN_PROGRESS_MESSAGE = 'Data is currently syncing';

test.describe.serial('Data Sync status, in-progress planning instance (Mocked UI Contract)', () => {
  const routes: MockHandle[] = [];
  let sessionMock: MockHandle;

  test.skip((process.env.ENVIRONMENT || process.env.PSENV || 'INTEROP').trim().toUpperCase() !== 'INTEROP', 'Mocked test data configured on INTEROP only');
  test.skip((process.env.GATEWAY_TYPE || '').toUpperCase() === 'GRAVITEE', 'Test data configured for the Azure gateway');

  test.beforeAll(async ({ page, planningPage, testUtil, testData }) => {
    const context = page.context();
    sessionMock = await mockActivePlanningInstance(context, 'inprogress', { instanceId: INSTANCE_ID, procedureExecutionId: RUN_ID, procedureName: PROCEDURE_NAME, createdBy: RUN_BY_USER_ID });
    routes.push(
      sessionMock,
      await mockProcessUsers(context, testData.PROCESS_NAME, [{ userId: RUN_BY_USER_ID, fullName: testData.LOGGED_IN_USER_NAME }]),
      await pinDefaultScenario(context, testData.SCENARIO_NAME)
    );

    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);

    // The view title renders before the MFE asks for the session, so poll for the request.
    await expect
      .poll(() => sessionMock.calls.some((call) => call.url.includes('getMatchingSession') && call.method === 'POST'), { timeout: getTimeout('XLARGE') })
      .toBe(true);
  });

  test.afterAll(async () => {
    await Promise.all(routes.splice(0).map((unroute) => unroute()));
  });

  test('Test Case 1: Verify In-progress Data Sync status card', async ({ odmPage, commonFunctions, testData }) => {
    const isStatusVerified = await odmPage.verifyDataSyncStatusTest('inprogress', IN_PROGRESS_MESSAGE, false, 0, testData.LOGGED_IN_USER_NAME);
    await commonFunctions.compareTwoValues(isStatusVerified, true, 'In-progress Data Sync status card shows the icon, message and run by user');

    const scenarios = await odmPage.getDataFromScenariosInODM();
    await commonFunctions.compareTwoValues(scenarios.includes(testData.SCENARIO_NAME), true, 'Data Sync card lists the default scenario');
    expect(isStatusVerified).toBe(true);
    expect(scenarios).toContain(testData.SCENARIO_NAME);
  });

  test('Test Case 2: Verify show more details while the data is syncing', async ({ odmPage, commonFunctions, testData }) => {
    await odmPage.openMoreDetailsODM();
    const checks = [
      await commonFunctions.compareTwoValues(await odmPage.getRunByFromMoreDetailsODM(), testData.LOGGED_IN_USER_NAME, 'Run By is the user of the matched session'),
      await commonFunctions.compareTwoValues(await odmPage.getPlanningInstanceIdFromMoreDetailsODM(), INSTANCE_ID, 'Planning Instance ID is the matched instance'),
      await commonFunctions.compareTwoValues(await odmPage.getRunIdFromMoreDetailsODM(), RUN_ID, 'Run ID is the procedure execution of the matched instance'),
    ];
    const wasOpen = await odmPage.closeMoreDetailsODM();
    expect(checks.every(Boolean) && wasOpen).toBe(true);
  });
});
