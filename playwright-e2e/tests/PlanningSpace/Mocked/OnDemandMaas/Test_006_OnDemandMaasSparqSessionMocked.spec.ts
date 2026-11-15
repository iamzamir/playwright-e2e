import { test, expect } from '../../../../configs/fixtures';
import { getTimeout } from '../../../../constants/timeouts';
import { MockHandle, mockActivePlanningInstance, mockProcessUsers, pinDefaultScenario } from '../../../../util/api-mock.util';

/**
 * Mocked UI contract for the OnDemandMaas session handling popup (live counterpart: OnDemandMaas Test_006 test cases 2
 * and 3). When a Sparq session exists but doesn't match the applied scope (`sparqAssociated`, no `sessionMatched`), the
 * MFE asks whether to sync the scope into a new session or keep using the existing supply plan. Producing that state for
 * real needs a Sparq-backed realm and an applied scope wider than the generated supply plan.
 *
 * Only "use the existing supply plan" is chosen here. "Sync & Generate New Supply Plan" shuts the session down (or deletes
 * the default scenario) and executes the view's procedure, which a mock can't make safe on shared data, so the popup is
 * checked to offer it and the live spec keeps the real run.
 * Contract (planning-mfe `useUpdateMfeInfo.ts` case 3, `ScopeSelectionPopup.tsx`, `handleScopeSelectSync`).
 */
const INSTANCE_ID = 'mock-planning-instance-sparq-001';
const RUN_ID = 'mock-proc-exec-sparq-001';
const PROCEDURE_NAME = 'MockODMProcedure';
const RUN_BY_USER_ID = 'mock-user-001';
const POPUP_HEADING = 'Sync Interactive Data';
const SCOPE_BEYOND_SUPPLY_PLAN_ALERT = 'Your scope selection contains members without supply plan.';

test.describe.serial('Session handling popup, Sparq session that does not match the scope (Mocked UI Contract)', () => {
  const routes: MockHandle[] = [];
  let sessionMock: MockHandle;

  test.skip((process.env.ENVIRONMENT || process.env.PSENV || 'INTEROP').trim().toUpperCase() !== 'INTEROP', 'Mocked test data configured on INTEROP only');
  test.skip((process.env.GATEWAY_TYPE || '').toUpperCase() === 'GRAVITEE', 'Test data configured for the Azure gateway');

  test.beforeAll(async ({ page, planningPage, testUtil, testData }) => {
    const context = page.context();
    sessionMock = await mockActivePlanningInstance(context, 'started', {
      instanceId: INSTANCE_ID,
      procedureExecutionId: RUN_ID,
      procedureName: PROCEDURE_NAME,
      createdBy: RUN_BY_USER_ID,
      sessionMatched: false,
      sparqAssociated: true,
    });
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

  test('Test Case 1: Verify the session handling popup for a scope the Sparq session does not cover', async ({ odmPage, commonFunctions, testData }) => {
    const description = await odmPage.getSessionPopupDescription();
    const checks = [
      await commonFunctions.compareTwoValues(description.includes(testData.SCENARIO_NAME), true, `Popup description names the default scenario (${description})`),
      await commonFunctions.compareTwoValues(await odmPage.isSessionPopupSyncOptionVisible(), true, `${POPUP_HEADING} popup offers to sync the scope into a new session`),
    ];
    expect(checks.every(Boolean)).toBe(true);
  });

  test('Test Case 2: Verify Session handling Alert with new scope & existing Sparq', async ({ planningPage, odmPage, commonFunctions, testData }) => {
    const isOptionChosen = await odmPage.sessionSelectPopup('syncExistingSession');
    const isAlertShown = await commonFunctions.compareTwoValues(await planningPage.verifyAlertMsg(SCOPE_BEYOND_SUPPLY_PLAN_ALERT), true, 'Scope selection alert should be displayed');
    expect(isOptionChosen && isAlertShown).toBe(true);

    // Keeping the existing session makes the MFE read it by id, so the status comes from the cluster poll.
    const readsInstanceById = new RegExp(`/planningInstance/(?:clusters/)?${INSTANCE_ID}(?:\\?|$)`);
    await expect
      .poll(() => sessionMock.calls.some((call) => call.method === 'GET' && readsInstanceById.test(call.url)), { message: 'existing session read by its id', timeout: getTimeout('LONG') })
      .toBe(true);
    const isStatusVerified = await odmPage.verifyDataSyncStatusTest('started', 'Data is Synced', false, 1, testData.LOGGED_IN_USER_NAME);
    expect(await commonFunctions.compareTwoValues(isStatusVerified, true, 'Existing session is shown as synced')).toBe(true);
  });
});
