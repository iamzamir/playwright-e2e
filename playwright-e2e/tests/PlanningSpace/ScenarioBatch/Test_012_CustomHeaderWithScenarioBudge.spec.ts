import { test, expect } from '../../../configs/fixtures';
import { PlanningListingPage } from '../../../pageobjects/planning-listing.page';
import { TestUtil } from '../../../util/test.util';
import { launchEntityContext } from '../../../util/planning-entity.util';

const openPlanningForProcess = async (testUtil: TestUtil, planningListingPage: PlanningListingPage, processName: string): Promise<void> => {
  await testUtil.navigateToPlanningListingPage();
  await launchEntityContext(planningListingPage, 'Process', { PROCESS_NAME: processName });
  await testUtil.clickLeftpaneLinks('Planning');
};

test.describe.serial('Extend view header with scenario budge', () => {
  test.beforeAll(async ({ testUtil, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
  });

  test('Test Case 1: Should display budge if scenario is present', async ({ testUtil, planningListingPage, planningPage, commonFunctions, testData }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test Case 1: Verify if budge is displayed when a scenario is present.');
    await openPlanningForProcess(testUtil, planningListingPage, testData.PROCESS_NAME);
    const isScenariosTabOpened = await commonFunctions.compareTwoValues(await planningPage.openComponent('Scenarios'), true, 'Scenarios tab clicked');
    const budge = await planningPage.scenarioBudgeExist();
    await commonFunctions.compareTwoValues(budge, true, 'Scenario and budge are present.');
    expect(isScenariosTabOpened && budge).toBeTruthy();
  });

  test('Test Case 2: Verify default name and count UI', async ({ planningPage, scenarioPage, commonFunctions }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test Case 2: Verify default name and count UI.');
    await planningPage.goToManageScenarios();
    const defaultScenario = await scenarioPage.getDefaultScenario();
    await scenarioPage.closeManageScenarios();
    const isBudgeNameDefault = await planningPage.verifyBudgeIsDefault(defaultScenario);
    await commonFunctions.compareTwoValues(isBudgeNameDefault, true, 'The budge text matches the default scenario name.');
    const countUI = await planningPage.checkBudgeCountUI();
    await commonFunctions.compareTwoValues(countUI, true, 'Count UI is visible and working as expected.');
    expect(isBudgeNameDefault && countUI).toBe(true);
  });

  test('Test Case 3: Verify Budge is clickable', async ({ testUtil, planningPage, commonFunctions }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test Case 3: Verify if budge is clickable and opens the scenario tab.');
    await testUtil.clickLeftpaneLinks('Planning');
    const isBudgeClickable = await planningPage.budgeClickedScenarioOpened();
    const validation = await commonFunctions.compareTwoValues(isBudgeClickable, true, 'On click, the scenario tab is auto-selected.');
    expect(validation).toBe(true);
  });

  test('Test case 4: Should show tooltip', async ({ testUtil, planningPage, commonFunctions }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test Case 4: Verify tooltip display.');
    await testUtil.clickLeftpaneLinks('Planning');
    const toolTipText = await planningPage.getBudgeTooltip();
    const budgeCount = await planningPage.getBudgeCount();
    const isValidTooltip = await planningPage.validateToolTipText(budgeCount, toolTipText);
    const validation = await commonFunctions.compareTwoValues(isValidTooltip, true, 'Tooltip text validation.');
    expect(validation).toBe(true);
  });

  test('Test Case 5: Count hidden for Only one Base Scenarios', async ({ testUtil, planningListingPage, planningPage, commonFunctions, testData }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test Case 5: Count hidden for Only one Base Scenarios.');
    await openPlanningForProcess(testUtil, planningListingPage, testData.PROCESS_NAME_BASE_SCENARIO);
    const budgeCount = await planningPage.getBudgeCount();
    const result = await commonFunctions.compareTwoValues(budgeCount, 0, `Badge count for process ${testData.PROCESS_NAME_BASE_SCENARIO} (count UI hidden)`);
    expect(result).toBe(true);
  });

  test('Test Case 6: Should check for No Scenario', async ({ testUtil, planningListingPage, planningPage, testData }) => {
    await openPlanningForProcess(testUtil, planningListingPage, testData.PROCESS_NAME_NO_SCENARIO);
    const budgeText = await planningPage.getBudgeText();
    const toolTipText = await planningPage.getBudgeTooltip();
    expect(budgeText).toContain('No Scenario');
    expect(toolTipText).toContain('This process is misconfigured. Please connect with your system administrator');
  });
});
