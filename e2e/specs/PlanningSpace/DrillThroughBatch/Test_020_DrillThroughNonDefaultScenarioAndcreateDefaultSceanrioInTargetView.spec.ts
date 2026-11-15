import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
import ProcessPage from '../../../pageobjects/process.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
import scopePage from '../../../pageobjects/scope.page';
import TestUtil from '../../../util/test.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/DrillThroughBatch/Test_020_DrillThroughNonDefaultScenarioAndcreateDefaultSceanrioInTargetView.json");

describe('Drill Through to Target View non default scenario A  and Create default Scenario B in target view and check default scenario B', () => {

    let defaultScenario;
    const random_name = Math.floor(1000 + Math.random() * 9000);
    const scenario_desc = 'Scenario created after Drill Through ' + random_name;
    const scenario_name = 'DT_Created_Scenario_' + random_name;

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await browser.pause(5000);
        await TestUtil.setBaseAsDefaultScenario();
        await PlanningSpace.closeManageScenarios();
    });

    it(`Test Case 1: Select Non default ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS} scenario from scenarios vertical filter`, async () => {
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

    it('Test Case 4: Perform Drill Through to Target View from non default scenario', async () => {
        await PlanningSpace.performDrillThroughOnCardField(TestData.DRILL_THROUGH_CELL, TestData.DRILL_THROUGH_VIEW_TO);
        await browser.pause(5000);
        await CommonFunctions.switchToSpecificWindow(1);
        const actualViewName = await PlanningSpace.getViewTitleName();
        await CommonFunctions.compareTwoValues(actualViewName, TestData.DRILL_THROUGH_VIEW_TO, `View switched to ${TestData.DRILL_THROUGH_VIEW_TO}`);
        expect(actualViewName).toEqual(TestData.DRILL_THROUGH_VIEW_TO);
    });

    it('Test Case 5: Create Default Scenario in Target View', async () => {
        await browser.pause(5000);
        await CommonFunctions.switchToSpecificWindow(1);
        await browser.pause(5000);
        await PlanningSpace.switchToMFEFrame()
        const url = await browser.getUrl();
        console.log(url, "URL current widow")
        await PlanningSpace.selectSupplyChainProceduresAction(TestData.PROCEDURE_NAME);
        await ScenarioPage.createScenarioFromWizardLayout(scenario_name, scenario_desc);
        await browser.pause(60000);
    });

    it(`Test Case 6: Select ${scenario_name} scenario from scenarios vertical filter`, async () => {
        await scopePage.clickOnTab('Scenarios');
        const bValidation2: boolean = await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(scenario_name);
        await CommonFunctions.compareTwoValues(bValidation2, true, `Is default scenario ${scenario_name} available under exist in scenario filters`);
        await browser.pause(8000);
        expect(bValidation2).toBeTruthy();
    });

    it('Test Case 7: Delete the Created Scenario', async () => {
        await browser.pause(5000);
        await scopePage.clickOnTab('Scenarios');
        await ScenarioPage.scenarioSelectandSetDetault([TestData.BASE_SCENARIO], 'Check');
        await browser.pause(5000);
        await scopePage.clickOnTab('Scenarios');
        await browser.pause(5000);
        const bValidation4: boolean = await ScenarioPage.scenarioSelect([scenario_name,TestData.SCENARIO_TO_APPLY_IN_SCENARIOS], 'Uncheck');
        await browser.pause(5000);
        await PlanningSpace.goToManageScenarios();
        await browser.pause(10000);
        const bValidation: boolean = await ScenarioPage.deleteChildScenario(scenario_name)
        await CommonFunctions.compareTwoValues(bValidation, true, `delete public scenario - ${scenario_name}`)
        await expect(bValidation && bValidation4).toEqual(true)
    });


});
