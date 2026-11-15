import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
import ProcessPage from '../../../pageobjects/process.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/DrillThroughBatch/Test_009_CreateScenarioAfterDrillThrough.json");

describe('Drill Through to Target View and Create Scenario', () => {

    let defaultScenario;
    const random_name = Math.floor(1000 + Math.random() * 9000);
    const scenario_desc = 'Scenario created after Drill Through ' + random_name;
    const scenario_name = 'DT_Created_Scenario_' + random_name;

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await browser.pause(5000);
    });

    it('Test Case 1: Perform Drill Through to Target View', async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.selectAllViewsOrFavourites("All Views");
        const result = await PlanningSpace.clickDashBoard(TestData.DRILL_THROUGH_VIEW_FROM);
        await CommonFunctions.compareTwoValues(result, true, `View ${TestData.DRILL_THROUGH_VIEW_FROM} Found`);
        await PlanningSpace.toggleMinimizeIcon();
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
        await ScenarioPage.createScenario(scenario_name);
        await browser.pause(60000);

        await PlanningSpace.goToManageScenarios();
        await browser.pause(5000);
        // await ScenarioPage.clickAllScenarios();
        // await browser.pause(5000);

        const bValidation: boolean = await ScenarioPage.isScenarioCreated(scenario_name);
        await CommonFunctions.compareTwoValues(bValidation, true, `Is ${scenario_name} scenario created`);
        await expect(bValidation).toEqual(true);
    });
    it('Test Case 3: Delete the Created Scenario', async () => {
        await browser.pause(5000);

        const bValidation: boolean = await ScenarioPage.deleteChildScenario(scenario_name)
        await CommonFunctions.compareTwoValues(bValidation, true, `delete public scenario - ${scenario_name}`)
        await expect(bValidation).toEqual(true)
    });
});
