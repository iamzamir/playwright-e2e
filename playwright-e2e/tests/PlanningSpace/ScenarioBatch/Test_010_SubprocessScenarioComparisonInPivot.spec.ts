import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';
import { launchEntityContext, PlanningEntity } from '../../../util/planning-entity.util';
import { PlanningListingPage } from '../../../pageobjects/planning-listing.page';
import { PlanningPage } from '../../../pageobjects/planning.page';
import { ScenarioPage } from '../../../pageobjects/scenario.page';
import { ScopePage } from '../../../pageobjects/scope.page';
import { TestUtil } from '../../../util/test.util';
import { CommonFunctions } from '../../../util/common.util';

// Test data is keyed by entity. The Assumption block was removed on 2026-11-09: Assumption scenarios are no longer supported.
type PivotData = Record<string, string>;

const openContext = async (testUtil: TestUtil, planningListingPage: PlanningListingPage, entity: PlanningEntity, data: PivotData): Promise<void> => {
  await testUtil.launchAppFromCatalog(data.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
  await testUtil.navigateToPlanningListingPage();
  await launchEntityContext(planningListingPage, entity, data);
};

/** Test Case 1: selects the scenario in the Scenarios drawer, applies it and applies the scope filter. */
const selectScenarioAndFilter = async (planningPage: PlanningPage, scopePage: ScopePage, scenarioPage: ScenarioPage, commonFunctions: CommonFunctions, data: PivotData): Promise<boolean> => {
  await planningPage.waitForViewToBeDisplayed();
  await planningPage.clickViewDropdown();
  await planningPage.selectView(data.VIEW_NAME);
  const isScenarioTab = await commonFunctions.compareTwoValues(await planningPage.openComponent('Scenarios'), true, 'Scenarios tab clicked');
  await scenarioPage.scenarioSelect([data.SCENARIO_NAME], 'Check');
  const isScenarioMapped = await commonFunctions.compareTwoValues(await scenarioPage.scenarioMap([data.SCENARIO_NAME]), true, `Scenario ${data.SCENARIO_NAME} mapped successfully`);
  await planningPage.clickApply();
  await planningPage.openComponent('Scope');
  const isFilterSelect = await commonFunctions.compareTwoValues(await scopePage.searchFilter(data.FILTER_NAME), true, ` ${data.FILTER_NAME} Filter selected`);
  const isFilterApplied = await commonFunctions.compareTwoValues(await scopePage.clickOnApplyFiltersBtn(), true, 'Filter Applied');
  return isScenarioTab && isScenarioMapped && isFilterSelect && isFilterApplied;
};

/** Test Case 2: opens the pivot card's scenario popup and checks the scenario is listed. */
const isScenarioInPivotPopup = async (scenarioPage: ScenarioPage, commonFunctions: CommonFunctions, data: PivotData): Promise<boolean> => {
  const isScenarioIconClicked = await scenarioPage.clickOnScenarioLiveIcon(data.CARD_NAME);
  const isListed = await scenarioPage.verifyScenarioInPivotPopup(data.SCENARIO_NAME);
  await commonFunctions.compareTwoValues(isListed, true, `Provided ${data.SCENARIO_NAME} scenario exist in pivot popup`);
  return isScenarioIconClicked && isListed;
};

/** Test Case 3: applies the scenario in the popup and checks it becomes a pivot column. */
const isScenarioColumnShown = async (scenarioPage: ScenarioPage, commonFunctions: CommonFunctions, data: PivotData): Promise<boolean> => {
  const isShown = await scenarioPage.applyScenarioPivotFilter([data.SCENARIO_NAME]);
  await commonFunctions.compareTwoValues(isShown, true, `Provided ${data.SCENARIO_NAME} column is reflected`);
  return isShown;
};

/** Test Case 4: unselects the scenario again and checks it is no longer selected. */
const resetScenario = async (planningPage: PlanningPage, scenarioPage: ScenarioPage, data: PivotData): Promise<void> => {
  await planningPage.openComponent('Scenarios');
  await scenarioPage.scenarioSelect([data.SCENARIO_NAME], 'Uncheck');
  await planningPage.clickApply();
  await planningPage.openComponent('Scenarios');
  await expect.poll(() => scenarioPage.verifySCselectedScenario(data.SCENARIO_NAME), { timeout: getTimeout('LONG') }).toBe(false);
  await planningPage.closeDrawer();
};

test.describe.serial('Sub-process Scenario comparison in pivot', () => {
  test.beforeAll(async ({ testUtil, planningListingPage, testData }) => {
    await openContext(testUtil, planningListingPage, 'Subprocess', testData['Sub-process']);
  });

  test('Test Case 1: Check Scenario in the scenario filter', async ({ planningPage, scopePage, scenarioPage, commonFunctions, testData }) => {
    expect(await selectScenarioAndFilter(planningPage, scopePage, scenarioPage, commonFunctions, testData['Sub-process'])).toBeTruthy();
  });

  test('Test Case 2: Verify selected scenario is appeared in popup of scenario pivot', async ({ scenarioPage, commonFunctions, testData }) => {
    expect(await isScenarioInPivotPopup(scenarioPage, commonFunctions, testData['Sub-process'])).toBeTruthy();
  });

  test('Test Case 3: Selected scenario column reflects in table', async ({ scenarioPage, commonFunctions, testData }) => {
    expect(await isScenarioColumnShown(scenarioPage, commonFunctions, testData['Sub-process'])).toBeTruthy();
  });

  test('Test Case 4: Reset', async ({ planningPage, scenarioPage, testData }) => {
    await resetScenario(planningPage, scenarioPage, testData['Sub-process']);
  });
});
