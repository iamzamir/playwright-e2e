import { test, expect } from '../../../../configs/fixtures';
import { getTimeout } from '../../../../constants/timeouts';
import { MockHandle, mockActivePlanningInstance, mockProcessUsers, pinDefaultScenario } from '../../../../util/api-mock.util';

/**
 * Mocked UI contract for the OnDemandMaas Data Sync status (live counterpart: OnDemandMaas Test_004):
 * the status card and the More details modal for a `started` planning instance. The live spec waits up to 10 minutes for
 * a real cluster and compares against whatever session the shared environment holds; here the matching session, its
 * user list and the default scenario are fixed, so the same checks run in seconds.
 *
 * Not covered here (kept in the live spec): applying filters, pivot data, Global Save and session reuse across views.
 * The view relies on the user's saved scope filter, like Mocked/OnDemandMaas Test_008 (error state).
 * Contract (planning-mfe `useUpdateMfeInfo.ts`, `DataSyncStatusCard.tsx`, `DataSyncModal.tsx`).
 */
const INSTANCE_ID = 'mock-planning-instance-started-001';
const RUN_ID = 'mock-proc-exec-started-001';
const PROCEDURE_NAME = 'MockODMProcedure';
const RUN_BY_USER_ID = 'mock-user-001';

test.describe.serial('Data Sync status, started planning instance (Mocked UI Contract)', () => {
  const routes: MockHandle[] = [];
  let sessionMock: MockHandle;

  test.skip((process.env.ENVIRONMENT || process.env.PSENV || 'INTEROP').trim().toUpperCase() !== 'INTEROP', 'Mocked test data configured on INTEROP only');
  test.skip((process.env.GATEWAY_TYPE || '').toUpperCase() === 'GRAVITEE', 'Test data configured for the Azure gateway');

  test.beforeAll(async ({ page, planningPage, testUtil, testData }) => {
    const context = page.context();
    sessionMock = await mockActivePlanningInstance(context, 'started', { instanceId: INSTANCE_ID, procedureExecutionId: RUN_ID, procedureName: PROCEDURE_NAME, createdBy: RUN_BY_USER_ID });
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

  test('Test Case 1: The MFE asks for a matching session with its default scenario and procedure', async () => {
    const request = sessionMock.calls.find((call) => call.url.includes('getMatchingSession') && call.method === 'POST');
    const payload = JSON.parse(request?.body ?? '{}');
    expect(payload.scenarioId, 'default scenario id sent to getMatchingSession').toBeTruthy();
    expect(payload.procedureName, 'procedure of the view sent to getMatchingSession').toBeTruthy();
  });

  test('Test Case 2: Verify Started Data Sync status card', async ({ odmPage, commonFunctions, testData }) => {
    const isStatusVerified = await odmPage.verifyDataSyncStatusTest('started', 'Data is Synced', false, 0, testData.LOGGED_IN_USER_NAME);
    await commonFunctions.compareTwoValues(isStatusVerified, true, 'Started Data Sync status card shows the status, message and run by user');

    const scenarios = await odmPage.verifyAllScenariosInODM();
    await commonFunctions.compareTwoValues(scenarios.toString().includes(testData.SCENARIO_NAME), true, 'Data Sync card lists the default scenario');
    expect(isStatusVerified).toBe(true);
    expect(scenarios).toContain(testData.SCENARIO_NAME);
  });

  test('Test Case 3: Verify show more details in Data Sync status', async ({ odmPage, commonFunctions, testData }) => {
    await odmPage.openMoreDetailsODM();

    const dataFrom = await odmPage.verifyDataFromMoreDetailsODM();
    const checks = [
      await commonFunctions.compareTwoValues(dataFrom.toString().includes(testData.SCENARIO_NAME), true, 'More details lists the default scenario'),
      await commonFunctions.compareTwoValues(await odmPage.getRunByFromMoreDetailsODM(), testData.LOGGED_IN_USER_NAME, 'Run By is the user of the matched session'),
      await commonFunctions.compareTwoValues(await odmPage.getPlanningInstanceIdFromMoreDetailsODM(), INSTANCE_ID, 'Planning Instance ID is the matched instance'),
      await commonFunctions.compareTwoValues(await odmPage.getRunIdFromMoreDetailsODM(), RUN_ID, 'Run ID is the procedure execution of the matched instance'),
      await commonFunctions.compareTwoValues(await odmPage.verifyProcedureTimeFromMoreDetailsODM(), true, 'Procedure Time should be there in more details'),
      await commonFunctions.compareTwoValues(await odmPage.verifyScenarioIdFromMoreDetailsODM(), true, 'Scenario ID should be there in more details'),
      await commonFunctions.compareTwoValues(await odmPage.verifyRealmIdDataSyncStatus(testData.REALM_ID), true, 'Realm ID is the signed-in realm'),
    ];
    expect(checks.every(Boolean)).toBe(true);
  });

  test('Test Case 4: Close Data Sync status more details popup', async ({ odmPage, commonFunctions }) => {
    const wasOpen = await odmPage.closeMoreDetailsODM();
    expect(await commonFunctions.compareTwoValues(wasOpen, true, 'More details popup was open and is now closed')).toBe(true);
  });

  test('Test Case 5: Verify Procedure details navigation', async ({ odmPage, commonFunctions, page }) => {
    const initialTabCount = page.context().pages().length;
    const [detailsPage] = await Promise.all([
      page.context().waitForEvent('page', { timeout: getTimeout('LONG') }),
      odmPage.navigateToProcedureDetailsODM(),
    ]);

    try {
      await detailsPage.waitForLoadState('domcontentloaded');
      const isTabOpened = await commonFunctions.compareTwoValues(page.context().pages().length, initialTabCount + 1, 'New tab should be opened for Observability');
      const isRunLinked = await commonFunctions.compareTwoValues(detailsPage.url().includes(`procedureExecutions/${RUN_ID}`), true, 'New tab URL should point to the procedure execution of the session');
      expect(isTabOpened && isRunLinked).toBe(true);
    } finally {
      await detailsPage.close().catch(() => undefined);
    }
  });
});
