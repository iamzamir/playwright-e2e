import ScenarioPage from '../../../pageobjects/scenario.page';
import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
import scopePage from '../../../pageobjects/scope.page';
import TestUtil from '../../../util/test.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/DrillThroughBatch/Test_018_DrillThroughSceanrioDefaultCheck.json");


describe('Scenario Selection Drill Through from default scenario A and select scenario B in target view as default and expect default scenario B', () => {

  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    await browser.pause(5000);
    await TestUtil.setBaseAsDefaultScenario();
  });

  it(`Test Case 1: Select ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS2} scenario from scenarios vertical filter and set it default`, async () => {
    await PlanningSpace.clickViewsDropDown();
    await PlanningSpace.selectViewByTypeAndName('All Views', TestData.VIEW_NAME);
    await scopePage.clickOnTab('Scenarios');
    await ScenarioPage.scenarioSelectandSetDetault([TestData.SCENARIO_TO_APPLY_IN_SCENARIOS2], 'Check');
    await scopePage.clickOnTab('Scenarios');
    const bValidation2: boolean = await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(TestData.SCENARIO_TO_APPLY_IN_SCENARIOS2);
    await CommonFunctions.compareTwoValues(bValidation2, true, `Is default scenario ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS2} available under exist in scenario filters`);
    expect(bValidation2).toBeTruthy();
    await scopePage.closeDrawer();
  });

  it('Test Case 2: First Level Drill Through From Source to Target(Mass Pivot to Chart card card) using default scenario', async () => {
    const sViewNameTo: string = TestData.TC1_DRILL_THROUGH_VIEW_TO;
    const cellValue: string = TestData.TC1_DRILL_THROUGH_CELL
    await PlanningSpace.performDrillThroughOnCardField(cellValue, sViewNameTo);
    await browser.pause(10000);
    await CommonFunctions.switchToSpecificWindow(1);
    let sActualViewName: string = await PlanningSpace.getViewTitleName();

    let bValidation2: boolean = await CommonFunctions.compareTwoValues(sActualViewName, sViewNameTo, `Process Name Assertion after Drill Through to ${sViewNameTo}`);
    let bValidation3: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isViewSelected(sViewNameTo), true, sViewNameTo + " View Selected Assertion");
    let sCurrentUrl: string = await browser.getUrl();
    await CommonFunctions.logMessage('INFO', `current url is ${sCurrentUrl}`)
    let sSplitUrl = sCurrentUrl.split("&");
    let sContextID: string = "";
    for (let i = 0; i < sSplitUrl.length; i++) {
      if (sSplitUrl[i].includes("contextId=")) {
        sContextID = sSplitUrl[i].split("=")[1];
      }
    }
    await CommonFunctions.logMessage('INFO', `context id is  ${sContextID}`)
    let bValidation4: boolean = await CommonFunctions.compareTwoValues(sCurrentUrl.includes("contextId="), true, "URL includes Context ID Assertion");
    let bValidation5: boolean = await CommonFunctions.compareTwoValues(sContextID.length > 1, true, "Context ID Assertion, it should have some ID and its length should be greated than 1")
    expect(
      bValidation2 &&
      bValidation3 &&
      bValidation4 &&
      bValidation5
    ).toEqual(true);
  });

  it(`Test Case 3: Select ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS3} scenario from scenarios vertical filter in target view andd set default `, async () => {
    await browser.pause(8000);
    await PlanningSpace.switchToMFEFrame();
    await scopePage.clickOnTab('Scenarios');
    await ScenarioPage.scenarioSelectandSetDetault([TestData.SCENARIO_TO_APPLY_IN_SCENARIOS3], 'Check');
    await scopePage.clickOnTab('Scenarios');
    const bValidation2: boolean = await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(TestData.SCENARIO_TO_APPLY_IN_SCENARIOS3);
    await CommonFunctions.compareTwoValues(bValidation2, true, `Is default scenario ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS3} available under exist in scenario filters`);
    expect(bValidation2).toBeTruthy();
  });

  it(`Test Case 4: Reset Sceanrio configurations`, async () => {
    await browser.pause(10000);
    await scopePage.clickOnTab('Scenarios');
    await ScenarioPage.scenarioSelectandSetDetault([TestData.BASE_SCENARIO], 'Check');
    await browser.pause(5000);
    await scopePage.clickOnTab('Scenarios');
    await ScenarioPage.scenarioSelect([TestData.SCENARIO_TO_APPLY_IN_SCENARIOS3, TestData.SCENARIO_TO_APPLY_IN_SCENARIOS2], 'Uncheck');
  })


});
