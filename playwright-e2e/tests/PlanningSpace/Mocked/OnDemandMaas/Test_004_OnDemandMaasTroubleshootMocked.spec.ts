import { test, expect } from '../../../../configs/fixtures';
import { getTimeout } from '../../../../constants/timeouts';
import { JsonMockHandle, MockHandle, mockActivePlanningInstance, mockJson, mockProcessUsers, pinDefaultScenario } from '../../../../util/api-mock.util';

/**
 * Mocked UI contract for the Troubleshoot action in the OnDemandMaas More details modal (live counterpart: the
 * commented-out Test Case 12 of OnDemandMaas Test_004, which stopped a real cluster and waited for the recovery). The
 * action is offered for a `STARTED` session and answers with one of three alerts depending on the troubleshoot response.
 * A mock can't show that the cluster really recovers, so the live flow stays a manual or API-level check.
 *
 * The alert checks run in this order on purpose: starting a recovery disables the Troubleshoot button until the next
 * matching session, so that case goes last.
 * Contract (planning-mfe `DataSyncModal.tsx` `handleTroubleshoot`, `constant.ts` `NO_ISSUES`).
 */
const INSTANCE_ID = 'mock-planning-instance-troubleshoot-001';
const RUN_ID = 'mock-proc-exec-troubleshoot-001';
const PROCEDURE_NAME = 'MockODMProcedure';
const RUN_BY_USER_ID = 'mock-user-001';
const NO_ISSUES_ALERT = 'Troubleshooting complete — everything looks good, nothing to fix';
const UNAVAILABLE_ALERT = 'Troubleshooting temporarily unavailable. Please try again shortly';
const IN_PROGRESS_ALERT = 'Troubleshooting now and preparing a fix';

test.describe.serial('Troubleshoot in Data Sync More details (Mocked UI Contract)', () => {
  const routes: MockHandle[] = [];
  let sessionMock: MockHandle;
  let troubleshootMock: JsonMockHandle;

  test.skip((process.env.ENVIRONMENT || process.env.PSENV || 'INTEROP').trim().toUpperCase() !== 'INTEROP', 'Mocked test data configured on INTEROP only');
  test.skip((process.env.GATEWAY_TYPE || '').toUpperCase() === 'GRAVITEE', 'Test data configured for the Azure gateway');

  test.beforeAll(async ({ page, planningPage, testUtil, testData }) => {
    const context = page.context();
    sessionMock = await mockActivePlanningInstance(context, 'started', { instanceId: INSTANCE_ID, procedureExecutionId: RUN_ID, procedureName: PROCEDURE_NAME, createdBy: RUN_BY_USER_ID });
    // Without this route a click would start a real troubleshoot; the mock id makes the live call a 404 at most.
    troubleshootMock = await mockJson(context, new RegExp(`/planningInstance/${INSTANCE_ID}/troubleshoot(?:\\?|$)`), { status: 'NO_ISSUES' });
    routes.push(
      sessionMock,
      troubleshootMock,
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

  const lastTroubleshootCall = () => troubleshootMock.calls[troubleshootMock.calls.length - 1];

  test('Test Case 1: Troubleshoot reports nothing to fix when the engines have no issues', async ({ odmPage, planningPage, commonFunctions }) => {
    expect(await odmPage.clickInteractiveDataStatusIcon(), 'Data Sync status card opens').toBe(true);
    await odmPage.openMoreDetailsODM();
    await odmPage.troubleShootClick();

    expect(await commonFunctions.compareTwoValues(await planningPage.verifyAlertMsg(NO_ISSUES_ALERT), true, 'No issues alert should be displayed')).toBe(true);
    expect(lastTroubleshootCall()?.method).toBe('POST');
    expect(lastTroubleshootCall()?.url).toContain(`planningInstance/${INSTANCE_ID}/troubleshoot`);
  });

  test('Test Case 2: Troubleshoot reports it is unavailable when the service fails', async ({ odmPage, planningPage, commonFunctions }) => {
    troubleshootMock.respondWith({ message: 'Troubleshoot service unavailable' }, 500);
    const callsBefore = troubleshootMock.calls.length;

    expect(await odmPage.clickInteractiveDataStatusIcon(), 'Data Sync status card opens').toBe(true);
    await odmPage.openMoreDetailsODM();
    await odmPage.troubleShootClick();

    expect(await commonFunctions.compareTwoValues(await planningPage.verifyAlertMsg(UNAVAILABLE_ALERT), true, 'Troubleshoot unavailable alert should be displayed')).toBe(true);
    expect(troubleshootMock.calls.length).toBe(callsBefore + 1);
  });

  test('Test Case 3: Troubleshoot starts a recovery and stays disabled while it runs', async ({ odmPage, planningPage, commonFunctions }) => {
    troubleshootMock.respondWith({ status: 'IN_PROGRESS' }, 200);

    expect(await odmPage.clickInteractiveDataStatusIcon(), 'Data Sync status card opens').toBe(true);
    await odmPage.openMoreDetailsODM();
    expect(await odmPage.isTroubleShootEnabled(), 'Troubleshoot is offered before a recovery starts').toBe(true);
    await odmPage.troubleShootClick();
    expect(await commonFunctions.compareTwoValues(await planningPage.verifyAlertMsg(IN_PROGRESS_ALERT), true, 'Recovery in progress alert should be displayed')).toBe(true);

    expect(await odmPage.clickInteractiveDataStatusIcon(), 'Data Sync status card opens again').toBe(true);
    await odmPage.openMoreDetailsODM();
    expect(await odmPage.isTroubleShootEnabled(), 'Troubleshoot is disabled while the recovery runs').toBe(false);
    await odmPage.closeMoreDetailsODM();
  });
});
