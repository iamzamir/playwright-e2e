import PlanningSpace from '../../../pageobjects/planning.page';
import  ProcessPage  from '../../../pageobjects/process.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
import CommonFunctions from '../../../util/common.util';
import TestUtil from '../../../util/test.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/DrillThroughBatch/Test_016_NonDefaultScenarioDTCreateChildScenarioAsDefault.json");

describe('Performing Drill through on non default scenario A and then create new child scenario B as default scenario', () => {

    const random_name = Math.floor(1000 + Math.random() * 9000);
    const scenario_desc = 'Scenario created after Drill Through ' + random_name;
    const scenario_name = 'DT_Created_Scenario_' + random_name;

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await browser.pause(5000);
        await TestUtil.setBaseAsDefaultScenario();
        await PlanningSpace.closeManageScenarios();
    });
    it('Test Case 1: Perform Drill Through to Target View', async () => {
        await PlanningSpace.clickViewsDropDown();
        const result = await PlanningSpace.clickDashBoard(TestData.DRILL_THROUGH_VIEW_FROM);
        await CommonFunctions.compareTwoValues(result, true, `View ${TestData.DRILL_THROUGH_VIEW_FROM} Found`);
        await PlanningSpace.performDrillThroughOnCardField(TestData.DRILL_THROUGH_CELL, TestData.DRILL_THROUGH_VIEW_TO);
        await browser.pause(5000);
        await CommonFunctions.switchToSpecificWindow(1);
        const actualViewName = await PlanningSpace.getViewTitleName();
        await CommonFunctions.compareTwoValues(actualViewName, TestData.DRILL_THROUGH_VIEW_TO, `View switched to ${TestData.DRILL_THROUGH_VIEW_TO}`);
        expect(actualViewName).toEqual(TestData.DRILL_THROUGH_VIEW_TO);
    });
    it('Test Case 2: Create Scenario in Target View', async () => {
        await browser.pause(5000);
        await CommonFunctions.switchToSpecificWindow(1);
        await browser.pause(5000);
        await PlanningSpace.switchToMFEFrame()
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
    it('Test Case 3: Verify the Created Scenario as Default', async () => {
        await browser.pause(5000);
        let isScenarioMatched: boolean = await CommonFunctions.compareTwoValues(
            await PlanningSpace.verifyDefaultScenarioInTab(scenario_name),
            true,
            `Checking if ${scenario_name} Scenario Matched`
        );
        expect(isScenarioMatched).toEqual(true);
    });
    it('Test Case 4: Delete the Created Scenario', async () => {
        await browser.pause(5000);
        await PlanningSpace.goToManageScenarios();
        await browser.pause(5000);
        const bValidation: boolean = await ScenarioPage.deleteChildScenario(scenario_name)
        await CommonFunctions.compareTwoValues(bValidation, true, `delete public scenario - ${scenario_name}`)
        await expect(bValidation).toEqual(true)
    });
});
