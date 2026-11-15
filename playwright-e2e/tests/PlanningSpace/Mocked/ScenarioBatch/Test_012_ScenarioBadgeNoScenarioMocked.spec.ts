import { test, expect } from '../../../../configs/fixtures';
import { getTimeout } from '../../../../constants/timeouts';
import { MockHandle, patchScenarioList } from '../../../../util/api-mock.util';

/**
 * Mocked UI contract for the scenario badge of a process that has no scenario (live counterpart: ScenarioBatch Test_012
 * test case 6, which needs a process that was deliberately left without one). The badge says "No Scenario" and its
 * tooltip tells the user the process is misconfigured. The scenario list is emptied, so any process can stand in.
 * Own spec because the list is read once per page load.
 * Contract (planning-mfe `SideNavWithRightPanel.tsx` `getScenarioChipTooltip`, `getScenarioChipContent`).
 */
const NO_SCENARIO_TEXT = 'No Scenario';
const MISCONFIGURED_TOOLTIP = 'This process is misconfigured. Please connect with your system administrator';

test.describe.serial('Scenario badge with no scenario (Mocked UI Contract)', () => {
  const routes: MockHandle[] = [];
  let scenarioListMock: MockHandle;

  test.skip((process.env.ENVIRONMENT || process.env.PSENV || 'INTEROP').trim().toUpperCase() !== 'INTEROP', 'Mocked test data configured on INTEROP only');
  test.skip((process.env.GATEWAY_TYPE || '').toUpperCase() === 'GRAVITEE', 'Test data configured for the Azure gateway');

  test.beforeAll(async ({ page, planningPage, testUtil, testData }) => {
    scenarioListMock = await patchScenarioList(page.context(), () => []);
    routes.push(scenarioListMock);

    // No scenario means no baseline, so no view renders: don't wait for one.
    await testUtil.loginToPlanningSpaceProcessWithoutViewWait(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.scenarioBudgeExist();

    // A request is recorded before its answer is applied, and the chip can show the live scenario until then.
    await expect
      .poll(() => planningPage.getBudgeText(), { message: 'badge text of the empty scenario list', timeout: getTimeout('XLARGE') })
      .toContain(NO_SCENARIO_TEXT);
    expect(scenarioListMock.calls.length, 'the scenario list went through the mock').toBeGreaterThan(0);
  });

  test.afterAll(async () => {
    await Promise.all(routes.splice(0).map((unroute) => unroute()));
  });

  test('Test Case 1: Should show No Scenario on the badge', async ({ planningPage, commonFunctions }) => {
    const text = await planningPage.getBudgeText();
    const isNoScenarioShown = await commonFunctions.compareTwoValues(text.includes(NO_SCENARIO_TEXT), true, `Badge text (${text})`);
    const isCountHidden = await commonFunctions.compareTwoValues(await planningPage.getBudgeCount(), 0, 'No count next to No Scenario');
    expect(isNoScenarioShown && isCountHidden).toBe(true);
  });

  test('Test Case 2: Should explain on the tooltip that the process is misconfigured', async ({ planningPage }) => {
    expect(await planningPage.getBudgeTooltip()).toContain(MISCONFIGURED_TOOLTIP);
  });
});
