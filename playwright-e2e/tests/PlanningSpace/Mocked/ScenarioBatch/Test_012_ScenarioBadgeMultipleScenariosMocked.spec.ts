import { test, expect } from '../../../../configs/fixtures';
import { getTimeout } from '../../../../constants/timeouts';
import { MockHandle, mockJson, patchScenarioList, selectScenariosInPreferences } from '../../../../util/api-mock.util';

/**
 * Mocked UI contract for the scenario badge in the Planning Space power bar when several scenarios are selected (live
 * counterpart: ScenarioBatch Test_012 test cases 1 to 4). The badge shows the default scenario's name, counts the other
 * selected scenarios and says "Multiple scenarios selected" in its tooltip; which scenarios a user has selected is saved
 * per user, so the live spec depends on whatever was left behind. Here the scenario list is replaced by the base scenario
 * (default) plus two mock scenarios, and the user's saved selection is those two.
 *
 * The single-scenario and no-scenario states are separate specs (Test_012_ScenarioBadgeBaseOnlyMocked and
 * Test_012_ScenarioBadgeNoScenarioMocked): the list and the preferences are read once per page load, so each state needs
 * its own browser context.
 * Contract (planning-mfe `SideNavWithRightPanel.tsx` `getScenarioChipCount`, `getScenarioChipTooltip`, `getScenarioChipContent`).
 */
const SELECTED_SCENARIO_IDS = ['mock-badge-scenario-1', 'mock-badge-scenario-2'];
const MULTIPLE_SCENARIOS_TOOLTIP = 'Multiple scenarios selected';

const mockRow = (template: Record<string, unknown>, base: Record<string, unknown>, id: string): Record<string, unknown> => ({
  ...template,
  scenarioId: id,
  simulationId: id,
  scenarioName: id,
  scenarioDisplayName: id,
  parentScenarioId: base.scenarioId,
  sourceId: base.sourceId,
  visibility: 'PUBLIC',
  isDefault: false,
  isPinned: false,
  dataStatus: 'NORMAL',
  inMemoryScenario: true,
});

test.describe.serial('Scenario badge with several selected scenarios (Mocked UI Contract)', () => {
  const routes: MockHandle[] = [];
  let scenarioListMock: MockHandle;
  let preferencesMock: MockHandle;
  let baseName = '';

  test.skip((process.env.ENVIRONMENT || process.env.PSENV || 'INTEROP').trim().toUpperCase() !== 'INTEROP', 'Mocked test data configured on INTEROP only');
  test.skip((process.env.GATEWAY_TYPE || '').toUpperCase() === 'GRAVITEE', 'Test data configured for the Azure gateway');

  test.beforeAll(async ({ page, planningPage, testUtil, testData }) => {
    const context = page.context();
    scenarioListMock = await patchScenarioList(context, (entities) => {
      const base = entities.find((scenario) => scenario.scenarioType === 'BASE' && scenario.isCurrent);
      if (!base) {
        return entities;
      }
      baseName = String(base.scenarioDisplayName || base.scenarioName);
      const template = entities.find((scenario) => scenario.scenarioType !== 'BASE') ?? { ...base, scenarioType: 'SIMULATION' };
      return [{ ...base, isDefault: true }, ...SELECTED_SCENARIO_IDS.map((id) => mockRow(template, base, id))];
    });
    preferencesMock = await selectScenariosInPreferences(context, testData.PROCESS_NAME, SELECTED_SCENARIO_IDS);
    routes.push(scenarioListMock, preferencesMock, await mockJson(context, /\/scenarios\/mock-badge-[^/?]+/, { dataStatus: 'NORMAL' }));

    await testUtil.loginToPlanningSpaceProcessWithoutViewWait(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.scenarioBudgeExist();

    // A request is recorded before its answer is applied, so wait for the badge the two mocked selections produce.
    await expect.poll(() => planningPage.getBudgeCount(), { message: 'badge count of the two selected scenarios', timeout: getTimeout('XLARGE') }).toBe(SELECTED_SCENARIO_IDS.length);
    expect(preferencesMock.calls.length, 'the saved selection went through the mock').toBeGreaterThan(0);
  });

  test.afterAll(async () => {
    await Promise.all(routes.splice(0).map((unroute) => unroute()));
  });

  test('Test Case 1: Should display the badge with the default scenario name', async ({ planningPage, commonFunctions }) => {
    expect(baseName, 'the scenario list went through the mock').not.toBe('');
    const isBadgeDisplayed = await commonFunctions.compareTwoValues(await planningPage.scenarioBudgeExist(), true, 'Scenario badge is present');
    const isDefaultNameShown = await commonFunctions.compareTwoValues(await planningPage.verifyBudgeIsDefault(baseName), true, `Badge text matches the default scenario (${baseName})`);
    expect(isBadgeDisplayed && isDefaultNameShown).toBe(true);
  });

  test('Test Case 2: Should count the selected scenarios next to the default one', async ({ planningPage, commonFunctions }) => {
    expect(await planningPage.getBudgeCount()).toBe(SELECTED_SCENARIO_IDS.length);
    const isCountUiVisible = await commonFunctions.compareTwoValues(await planningPage.checkBudgeCountUI(), true, 'Count UI is visible and working as expected');
    expect(isCountUiVisible).toBe(true);
  });

  test('Test case 3: Should show the multiple scenarios tooltip', async ({ planningPage, commonFunctions }) => {
    const tooltip = await planningPage.getBudgeTooltip();
    const count = await planningPage.getBudgeCount();
    const isTooltipValid = await commonFunctions.compareTwoValues(await planningPage.validateToolTipText(count, tooltip), true, `Tooltip text validation (${tooltip})`);
    expect(tooltip).toContain(MULTIPLE_SCENARIOS_TOOLTIP);
    expect(isTooltipValid).toBe(true);
  });

  test('Test Case 4: Verify the badge is clickable and opens the scenario tab', async ({ planningPage, commonFunctions }) => {
    const isScenarioTabOpened = await commonFunctions.compareTwoValues(await planningPage.budgeClickedScenarioOpened(), true, 'On click, the scenario tab is auto-selected');
    expect(isScenarioTabOpened).toBe(true);
  });
});
