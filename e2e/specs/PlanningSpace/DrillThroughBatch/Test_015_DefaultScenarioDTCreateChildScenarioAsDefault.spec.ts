import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
import ProcessPage from '../../../pageobjects/process.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
import scope from '../../../pageobjects/scope.page';
import TestUtil from '../../../util/test.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/DrillThroughBatch/Test_015_DefaultScenarioDTCreateChildScenarioAsDefault.json");

describe('Performing Drill through on default scenario A and then create new child scenario B as default scenario', () => {

    const random_name = Math.floor(1000 + Math.random() * 9000);
    const scenario_name = 'DT_Created_Scenario_' + random_name;
    const scenario_desc = 'Scenario created after Drill Through ' + random_name;
    const scenario_name_2 = 'DT_Created_Scenario_2' + random_name;

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME,false,false);
        await browser.pause(5000);
        await TestUtil.setBaseAsDefaultScenario();
        await PlanningSpace.closeManageScenarios();
    });
    it(`Test Case 1: Select ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS} scenario from scenarios vertical filter`, async () => {
        await PlanningSpace.clickViewsDropDown();
        const result = await PlanningSpace.clickDashBoard(TestData.DRILL_THROUGH_VIEW_FROM);
        await CommonFunctions.compareTwoValues(result, true, `View ${TestData.DRILL_THROUGH_VIEW_FROM} Found`);
        await browser.pause(10000)
        const bValidation1: boolean = await scope.clickOnTab('Scenarios');
        await CommonFunctions.compareTwoValues(bValidation1, true, `Clicked on scenario tab`);
        const bValidation2: boolean = await ScenarioPage.scenarioSelectandSetDetault([TestData.SCENARIO_TO_APPLY_IN_SCENARIOS], 'Check');
        await CommonFunctions.compareTwoValues(bValidation2, true, `Is ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS} checked`)
        await scope.clickOnTab('Scenarios');
        const bValidation3: boolean = await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(TestData.SCENARIO_TO_APPLY_IN_SCENARIOS);
        await CommonFunctions.compareTwoValues(bValidation3, true, `Is default scenario ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS} available under exist in scenario filters`);
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });
    it('Test Case 2: Perform Drill Through to Target View', async () => {
        await PlanningSpace.performDrillThroughOnCardField(TestData.DRILL_THROUGH_CELL, TestData.DRILL_THROUGH_VIEW_TO);
        await browser.pause(5000);
        await CommonFunctions.switchToSpecificWindow(1);
        const actualViewName = await PlanningSpace.getViewTitleName();
        await CommonFunctions.compareTwoValues(actualViewName, TestData.DRILL_THROUGH_VIEW_TO, `View switched to ${TestData.DRILL_THROUGH_VIEW_TO}`);
        expect(actualViewName).toEqual(TestData.DRILL_THROUGH_VIEW_TO);
    });
    it('Test Case 3: Create Default Child Scenario in Target View', async () => {
        await browser.pause(5000);
        await CommonFunctions.switchToSpecificWindow(1);
        await browser.pause(5000);
        await PlanningSpace.switchToMFEFrame();
        const url = await browser.getUrl();
        console.log(url, "URL current widow")
        await PlanningSpace.selectSupplyChainProceduresAction(TestData.PROCEDURE_NAME);
        await ScenarioPage.createScenarioFromWizardLayout(scenario_name, scenario_desc);
        const running = await CommonFunctions.verifyAlertMsg("running");
        await CommonFunctions.compareTwoValues(running, true, 'verify alert')
        await browser.pause(4000)
        const success = await CommonFunctions.verifyAlertMsg('success');
        await CommonFunctions.compareTwoValues(success, true, 'success')
        expect(running && success).toEqual(true);
    });
    it('Test Case 4: Verify the Created Scenario as Default', async () => {
        await browser.pause(5000);
        let isScenarioMatched: boolean = await CommonFunctions.compareTwoValues(
            await PlanningSpace.verifyDefaultScenarioInTab(scenario_name),
            true,
            `Checking if ${scenario_name} Scenario Matched`
        );
        expect(isScenarioMatched).toEqual(true);
    });
    it('Test Case 5: Delete the Created Default Scenario', async () => {
        await browser.pause(5000);
        await PlanningSpace.goToManageScenarios();
        await browser.pause(5000);
        const bValidation: boolean = await ScenarioPage.deleteChildScenario(scenario_name)
        await CommonFunctions.compareTwoValues(bValidation, true, `delete public scenario - ${scenario_name}`)
        await expect(bValidation).toEqual(true)
    });
    it('Test Case 6: Create Non Default Child Scenario in Target View', async () => {
        await browser.pause(5000);
        await CommonFunctions.switchToSpecificWindow(1);
        await browser.pause(5000); 
        await PlanningSpace.switchToMFEFrame();
        const url = await browser.getUrl();
        await ProcessPage.clickLeftpaneLinks('Planning');
        await PlanningSpace.selectSupplyChainProceduresAction(TestData.PROCEDURE_NAME);
        await ScenarioPage.createScenario(scenario_name_2);
        const running = await CommonFunctions.verifyAlertMsg("running");
        await CommonFunctions.compareTwoValues(running, true, 'verify alert')
        await browser.pause(4000)
        const success = await CommonFunctions.verifyAlertMsg('success');
        await CommonFunctions.compareTwoValues(success, true, 'success')
        expect(running && success).toEqual(true);
    });
    it('Test Case 7: Delete the Created Scenario', async () => {
        await browser.pause(5000);
        await PlanningSpace.goToManageScenarios();
        await browser.pause(5000);
        const bValidation: boolean = await ScenarioPage.deleteChildScenario(scenario_name_2)
        await CommonFunctions.compareTwoValues(bValidation, true, `delete public scenario - ${scenario_name_2}`)
        await expect(bValidation).toEqual(true)
    });
});
