import ScenarioPage from '../../../pageobjects/scenario.page';
import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
import scopePage from '../../../pageobjects/scope.page';
import TestUtil from '../../../util/test.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/DrillThroughBatch/Test_017_DrillThroughNonDefaultSceanrioToCheckDefaultScenario.json");


describe('Scenario Selection Drill Through from Non Default scenario A and select default scenario in target view B and expect default scenario B', () => {

  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME,false,false);
    await TestUtil.setBaseAsDefaultScenario();
    await PlanningSpace.closeManageScenarios();
  });

  it(`Test Case 1: Select non default ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS} scenario from scenarios vertical filter `, async () => {
    await PlanningSpace.clickViewsDropDown();
    await PlanningSpace.clickDashBoard(TestData.VIEW_NAME)
    const bValidation1: boolean = await scopePage.clickOnTab('Scenarios');
    await CommonFunctions.compareTwoValues(bValidation1, true, `Clicked on scenario tab`);
    const bValidation2: boolean = await ScenarioPage.scenarioSelect([TestData.SCENARIO_TO_APPLY_IN_SCENARIOS], 'Check');
    await CommonFunctions.compareTwoValues(bValidation2, true, `Is ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS} checked`)
    expect(bValidation1).toBeTruthy();
  });

  it('Test Case 2: Verify selected scenario is appeared in popup of scenario pivot', async () => {
    await ScenarioPage.clickOnScenarioLiveIcon(TestData.CARD_NAME);
    await browser.pause(10000)
    const bValidation: boolean = await ScenarioPage.verifyScenarioInPivotPopup(TestData.SCENARIO_TO_APPLY_IN_SCENARIOS);
    await CommonFunctions.compareTwoValues(bValidation, true, `Provided ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS} scenario exist in pivot popup`);
    expect(bValidation).toBeTruthy();
  });

  it('Test Case 3: Selected scenario column relfects in table', async () => {
    await browser.pause(10000)
    const bValidation: boolean = await ScenarioPage.applyScenarioPivotFilter([TestData.SCENARIO_TO_APPLY_IN_SCENARIOS]);
    await CommonFunctions.compareTwoValues(bValidation, true, `Provided ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS} column is reflected`);
    expect(bValidation).toBeTruthy();
  });



  it('Test Case 4: First Level Drill Through From Source to Target(Mass Pivot to Chart card card) from non default scenario', async () => {
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

  it(`Test Case 5: Select ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS2} scenario from scenarios vertical filter in target view  and expect ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS2} as default`, async () => {
    await browser.pause(8000);
    await PlanningSpace.switchToMFEFrame();
    const bValidation1: boolean = await scopePage.clickOnTab('Scenarios');
    await CommonFunctions.compareTwoValues(bValidation1, true, `Clicked on scenario tab`);
    const bValidation3: boolean = await ScenarioPage.scenarioSelectandSetDetault([TestData.SCENARIO_TO_APPLY_IN_SCENARIOS2], 'Check');
    await scopePage.clickOnTab('Scenarios');
    const bValidation2: boolean = await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(TestData.SCENARIO_TO_APPLY_IN_SCENARIOS2);
    await CommonFunctions.compareTwoValues(bValidation1, true, `Is default scenario ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS2} available under exist in scenario filters`);
    expect(bValidation2).toBeTruthy();
  });

  it(`Test Case 6: reset scenario configurations`, async () => {
     await browser.pause(10000);
     await scopePage.clickOnTab('Scenarios');
     await ScenarioPage.scenarioSelectandSetDetault([TestData.BASE_SCENARIO], 'Check');
     await browser.pause(5000);
     await scopePage.clickOnTab('Scenarios');
     await ScenarioPage.scenarioSelect([TestData.SCENARIO_TO_APPLY_IN_SCENARIOS], 'Uncheck');
  })


});
