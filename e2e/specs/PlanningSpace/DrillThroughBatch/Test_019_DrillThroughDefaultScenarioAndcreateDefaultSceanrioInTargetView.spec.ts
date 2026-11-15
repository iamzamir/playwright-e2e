import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
import ProcessPage from '../../../pageobjects/process.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
import scopePage from '../../../pageobjects/scope.page';
import TestUtil from '../../../util/test.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/DrillThroughBatch/Test_019_DrillThroughDefaultScenarioAndcreateDefaultSceanrioInTargetView.json");

describe('Drill Through from default scenario A to Target View and Create non default Scenario B and check Base default scenario A', () => {

    let defaultScenario;
    const random_name = Math.floor(1000 + Math.random() * 9000);
    const scenario_desc = 'Scenario created after Drill Through ' + random_name;
    const scenario_name = 'DT_Created_Scenario_' + random_name;

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME,false,false);
        await browser.pause(5000);
        await TestUtil.setBaseAsDefaultScenario();
        await PlanningSpace.closeManageScenarios();
    });

    it(`Test Case 1: Select ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS2} scenario from scenarios vertical filter and set it default`, async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME)
        const bValidation1: boolean = await scopePage.clickOnTab('Scenarios');
        await CommonFunctions.compareTwoValues(bValidation1, true, `Clicked on scenario tab`);
        await ScenarioPage.scenarioSelectandSetDetault([TestData.SCENARIO_TO_APPLY_IN_SCENARIOS2], 'Check');
        await scopePage.clickOnTab('Scenarios');
        const bValidation2: boolean = await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(TestData.SCENARIO_TO_APPLY_IN_SCENARIOS2);
        await CommonFunctions.compareTwoValues(bValidation1, true, `Is default scenario ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS2} available under exist in scenario filters`);
        expect(bValidation1 && bValidation2).toBeTruthy();
    });


    it('Test Case 2: Perform Drill Through to Target View from default scenario', async () => {
        await PlanningSpace.performDrillThroughOnCardField(TestData.DRILL_THROUGH_CELL, TestData.DRILL_THROUGH_VIEW_TO);
        await browser.pause(5000);
        await CommonFunctions.switchToSpecificWindow(1);
        const actualViewName = await PlanningSpace.getViewTitleName();
        await CommonFunctions.compareTwoValues(actualViewName, TestData.DRILL_THROUGH_VIEW_TO, `View switched to ${TestData.DRILL_THROUGH_VIEW_TO}`);
        expect(actualViewName).toEqual(TestData.DRILL_THROUGH_VIEW_TO);
    });


    it('Test Case 3: Create non default Scenario in Target View', async () => {
        await browser.pause(5000);
        await CommonFunctions.switchToSpecificWindow(1);
        await browser.pause(5000);
        await PlanningSpace.switchToMFEFrame()
        const url = await browser.getUrl();
        console.log(url, "URL current widow")
        await PlanningSpace.selectSupplyChainProceduresAction(TestData.PROCEDURE_NAME);
        await ScenarioPage.createScenario(scenario_name);
        await browser.pause(60000);
    });

    it(`Test Case 4: Select ${scenario_name} scenario from scenarios vertical filter`, async () => {
        await browser.pause(8000);
        const bValidation1: boolean = await scopePage.clickOnTab('Scenarios');
        await CommonFunctions.compareTwoValues(bValidation1, true, `Clicked on scenario tab`);
        await browser.pause(5000);
        const bValidation4: boolean = await ScenarioPage.scenarioSelect([scenario_name], 'Check');
        await browser.pause(5000);
        await CommonFunctions.compareTwoValues(bValidation1, true, `Is  scenario ${scenario_name} available under exist in scenario filters`);
        expect(bValidation4).toBeTruthy();
    });

    it('Test Case 5: Delete the Created Scenario', async () => {
        await browser.pause(10000);
        await scopePage.clickOnTab('Scenarios');
        await ScenarioPage.scenarioSelectandSetDetault([TestData.BASE_SCENARIO], 'Check');
        await browser.pause(5000);
        await scopePage.clickOnTab('Scenarios');
        await ScenarioPage.scenarioSelect([TestData.SCENARIO_TO_APPLY_IN_SCENARIOS2, scenario_name], 'Uncheck');
        await browser.pause(5000);
        await PlanningSpace.goToManageScenarios();
        await browser.pause(10000);
        const bValidation: boolean = await ScenarioPage.deleteChildScenario(scenario_name)
        await CommonFunctions.compareTwoValues(bValidation, true, `delete public scenario - ${scenario_name}`)
        await expect(bValidation).toEqual(true)
    });
});
