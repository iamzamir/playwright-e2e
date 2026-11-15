import { test, expect } from '../../../configs/fixtures';

const TestData = require("../../../testdata/" + process.env.PSENV + "/PlanningSpace/CardsBatch/Test_003_MaasPivotCard.json");

test.describe.serial('Maas Pivot should load with supplied scenario & scope', () => {

  let filterCols: string[] = [];

  test.beforeAll(async ({ testUtil }) => {
    await testUtil.launchAppFromCatalog(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
  });

  test(`Test Case 1: Select ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS} scenario from scenarios vertical filter`, async ({ planningPage, scenarioPage, commonFunctions }) => {
    await planningPage.selectViewInPlanning(TestData.VIEW_NAME);
    const bValidation1: boolean = await planningPage.openComponent('Scenarios');
    await commonFunctions.compareTwoValues(bValidation1, true, 'Clicked on Scenarios tab');
    const bValidation2: boolean = await scenarioPage.scenarioSelect([TestData.SCENARIO_TO_APPLY_IN_SCENARIOS], 'Check');
    await scenarioPage.clickApplyScenarioTab();
    await commonFunctions.compareTwoValues(bValidation2, true, `Is ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS} checked`);
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test(`Test Case 2: Apply ${TestData.FILTER_TO_APPLY_IN_SCOPE} filter under scope`, async ({ planningPage, scopePage, commonFunctions }) => {
    const bValidation1: boolean = await planningPage.openComponent('Scope');
    await commonFunctions.compareTwoValues(bValidation1, true, 'Clicked on Scope tab');
    const bValidation2: boolean = await scopePage.searchFilter(TestData.FILTER_TO_APPLY_IN_SCOPE);
    await commonFunctions.compareTwoValues(bValidation2, true, `Is ${TestData.FILTER_TO_APPLY_IN_SCOPE} filter selected under scope tab`);
    const appliedVFTitle: string = await scopePage.getAppliedVFTitle();
    filterCols = appliedVFTitle.replace(/\*/g, '').split(',').map((value) => value.trim()).filter((value) => value.length > 0);
    await commonFunctions.logMessage('INFO', `Applied filters are ${filterCols}`);
    await scopePage.clickOnApplyFiltersBtn();
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  //commenting below code as the Scenario data filter is defaultly disable from MaaS
  // test('Test Case 3: Verify selected scenario is appeared in popup of scenario pivot', async ({ page, scenarioPage, commonFunctions }) => {
  //   await scenarioPage.clickOnScenarioLiveIcon(TestData.CARD_NAME);
  //   const bValidation: boolean = await scenarioPage.verifyScenarioInPivotPopup(TestData.SCENARIO_TO_APPLY_IN_SCENARIOS);
  //   await commonFunctions.compareTwoValues(bValidation, true, `Provided ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS} scenario exist in pivot popup`);
  //   expect(bValidation).toBeTruthy();
  // });

  // test('Test Case 4: Selected scenario column reflects in table', async ({ scenarioPage, commonFunctions }) => {
  //   const bValidation: boolean = await scenarioPage.applyScenarioPivotFilter([TestData.SCENARIO_TO_APPLY_IN_SCENARIOS]);
  //   await commonFunctions.compareTwoValues(bValidation, true, `Provided ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS} column is reflected`);
  //   expect(bValidation).toBeTruthy();
  // });

  // test(`Test Case 5: Verify selected filters reflects as columns in ${TestData.CARD_NAME}`, async ({ scenarioPage, commonFunctions }) => {
  //   const bValidation: boolean = await scenarioPage.verifyColumnExistsInPivotTable(TestData.COLUMNS_TO_VALIDATE_IN_CARD, TestData.CARD_NAME);
  //   await commonFunctions.compareTwoValues(bValidation, true, `Is ${TestData.COLUMNS_TO_VALIDATE_IN_CARD.join(', ')} cols reflected in table`);
  //   expect(bValidation).toBeTruthy();
  // });

  test.afterAll('Test Case 6: Reset', async ({ planningPage, scenarioPage }) => {
    await planningPage.openComponent('Scenarios');
    await scenarioPage.scenarioSelect([TestData.SCENARIO_TO_APPLY_IN_SCENARIOS], 'Uncheck');
    await scenarioPage.clickApplyScenarioTab();
  });
});
