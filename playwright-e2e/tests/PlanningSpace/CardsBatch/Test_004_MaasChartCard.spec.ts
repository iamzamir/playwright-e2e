import { test, expect } from '../../../configs/fixtures';

const TestData = require("../../../testdata/" + process.env.PSENV + "/PlanningSpace/CardsBatch/Test_004_MaasChartCard.json");

test.describe.serial('MaaS Chart should load with supplied scenario & scope', () => {

  let labelsBeforeFilter: string[];

  test.beforeAll(async ({ testUtil }) => {
    await testUtil.launchAppFromCatalog(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
  });

  test(`Test Case 1: Fetch initial X axis labels from ${TestData.CARD_NAME} card before filter applied`, async ({ cardsPage, planningPage }) => {
    await planningPage.selectViewInPlanning(TestData.VIEW_NAME);
    labelsBeforeFilter = await cardsPage.getXAxisLabelsFromMaasChart(TestData.CARD_NAME);
    expect(labelsBeforeFilter.length).toBeGreaterThanOrEqual(1);
  });

  test(`Test Case 2: Apply ${TestData.FILTER_TO_APPLY_IN_SCOPE} filter under scope`, async ({ planningPage, scopePage, commonFunctions }) => {
    const bValidation1: boolean = await planningPage.openComponent('Scope');
    await commonFunctions.compareTwoValues(bValidation1, true, 'Clicked on scope tab');
    const bValidation2: boolean = await scopePage.searchFilter(TestData.FILTER_TO_APPLY_IN_SCOPE);
    await commonFunctions.compareTwoValues(bValidation2, true, `Is ${TestData.FILTER_TO_APPLY_IN_SCOPE} filter selected under scope tab`);
    const filterCols = await scopePage.getAppliedVFTitle();
    await commonFunctions.logMessage('INFO', `Applied filters are ${filterCols}`);
    await scopePage.clickOnApplyFiltersBtn();
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test(`Test Case 3: Verify X axis labels from ${TestData.CARD_NAME} card after filter applied`, async ({ cardsPage, commonFunctions }) => {
    const labelsAfterFilter: string[] = await cardsPage.getXAxisLabelsAfterRefresh(TestData.CARD_NAME, labelsBeforeFilter);
    const bValidation1: boolean = await cardsPage.verifyMaasChartLabels(labelsAfterFilter, labelsBeforeFilter);
    await commonFunctions.compareTwoValues(bValidation1, true, `Is data reflected in ${TestData.CARD_NAME} card after filter`);
    expect(bValidation1).toBeTruthy();
  });

  test(`Test Case 4: Select ${TestData.SCENARIO_TO_APPLY} scenario from scenarios vertical filter`, async ({ planningPage, scenarioPage, commonFunctions }) => {
    const bValidation1: boolean = await planningPage.openComponent('Scenarios');
    await commonFunctions.compareTwoValues(bValidation1, true, 'Clicked on Scenarios tab');
    const bValidation2: boolean = await scenarioPage.scenarioSelect([TestData.SCENARIO_TO_APPLY], 'Check');
    await commonFunctions.compareTwoValues(bValidation2, true, `Is ${TestData.SCENARIO_TO_APPLY} checked`);
    await scenarioPage.clickApplyScenarioTab();
    expect(bValidation1 && bValidation2).toBeTruthy();
  });
  // Note: Test cases for Scenario Map and Scenario Live Icon in pivot popup
  // were removed as Scenario data filter is disabled by default on MaaS chart cards.
  test.afterAll('Cleanup: Reset scenario', async ({ scenarioPage, planningPage }) => {
    await planningPage.openComponent('Scenarios');
    await scenarioPage.scenarioSelect([TestData.SCENARIO_TO_APPLY], 'Uncheck');
    await scenarioPage.clickApplyScenarioTab();
  });

});
