import { test, expect } from '../../../../configs/fixtures';
import { getTimeout } from '../../../../constants/timeouts';
import { MockHandle, patchScenarioList } from '../../../../util/api-mock.util';

/**
 * Mocked UI contract for the scenario badge when a process has only its base scenario (live counterpart: ScenarioBatch
 * Test_012 test case 5, which needs a process with nothing but a base scenario, and the single-scenario side of test
 * cases 2 and 4). The badge shows the default scenario's name, hides the count and says "Default scenario <name>" in its
 * tooltip. The scenario list is replaced by the live base scenario alone, so the user's saved selection can't add to it.
 * Own spec because the list is read once per page load.
 * Contract (planning-mfe `SideNavWithRightPanel.tsx` `getScenarioChipCount`, `getScenarioChipTooltip`, `getScenarioChipContent`).
 */
const DEFAULT_SCENARIO_TOOLTIP = 'Default scenario';

test.describe.serial('Scenario badge with only the base scenario (Mocked UI Contract)', () => {
  const routes: MockHandle[] = [];
  let scenarioListMock: MockHandle;
  let baseName = '';

  test.skip((process.env.ENVIRONMENT || process.env.PSENV || 'INTEROP').trim().toUpperCase() !== 'INTEROP', 'Mocked test data configured on INTEROP only');
  test.skip((process.env.GATEWAY_TYPE || '').toUpperCase() === 'GRAVITEE', 'Test data configured for the Azure gateway');

  test.beforeAll(async ({ page, planningPage, testUtil, testData }) => {
    scenarioListMock = await patchScenarioList(page.context(), (entities) => {
      const base = entities.find((scenario) => scenario.scenarioType === 'BASE' && scenario.isCurrent);
      if (!base) {
        return entities;
      }
      baseName = String(base.scenarioDisplayName || base.scenarioName);
      return [{ ...base, isDefault: true }];
    });
    routes.push(scenarioListMock);

    await testUtil.loginToPlanningSpaceProcessWithoutViewWait(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.scenarioBudgeExist();

    // A request is recorded before its answer is applied, so wait for the tooltip of the mocked list. `baseName` is only
    // set when the list went through the mock, which keeps a badge rendered from earlier live data from passing.
    await expect
      .poll(async () => baseName !== '' && (await planningPage.getBudgeTooltip()) === `${DEFAULT_SCENARIO_TOOLTIP} ${baseName}`, { message: 'badge tooltip of the base-only list', timeout: getTimeout('XLARGE') })
      .toBe(true);
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

  test('Test Case 2: Count hidden for only one base scenario', async ({ planningPage, commonFunctions }) => {
    const count = await commonFunctions.compareTwoValues(await planningPage.getBudgeCount(), 0, 'Badge count with only the base scenario');
    const isCountUiHidden = await commonFunctions.compareTwoValues(await planningPage.checkBudgeCountUI(), true, 'Count UI is hidden');
    expect(count && isCountUiHidden).toBe(true);
  });

  test('Test case 3: Should show the default scenario tooltip', async ({ planningPage, commonFunctions }) => {
    const tooltip = await planningPage.getBudgeTooltip();
    const isTooltipValid = await commonFunctions.compareTwoValues(await planningPage.validateToolTipText(0, tooltip), true, `Tooltip text validation (${tooltip})`);
    expect(tooltip).toContain(DEFAULT_SCENARIO_TOOLTIP);
    expect(tooltip).toContain(baseName);
    expect(isTooltipValid).toBe(true);
  });
});
