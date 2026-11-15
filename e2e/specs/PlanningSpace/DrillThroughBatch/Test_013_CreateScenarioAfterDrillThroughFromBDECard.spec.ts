import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
import ProcessPage from '../../../pageobjects/process.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
import TestUtil from '../../../util/test.util';

const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/DrillThroughBatch/Test_013_CreateScenarioAfterDrillThroughFromBDECard.json");

describe('Create Scenario after performing Drill Through On BDE Card', () => {

    let scenarioName = 'DT_Created_Scenario_' + Math.floor(1000 + Math.random() * 9000);

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await TestUtil.setBaseAsDefaultScenario();
        // await PlanningSpace.closeManageScenarios();
    });

    it('Test Case 1: Perform Drill Through to Target View', async () => {
        await browser.pause(2000);
        await PlanningSpace.clickViewsDropDown();
        const result = await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        await CommonFunctions.compareTwoValues(result, true, `View ${TestData.DRILL_THROUGH_VIEW_FROM} Found`);
        await PlanningSpace.performDrillThroughOnBDECard(TestData.CARD_NAME);
        await browser.pause(10000);
        await CommonFunctions.switchToSpecificWindow(1);
        const actualViewName = await PlanningSpace.getViewTitleName();
        await CommonFunctions.compareTwoValues(actualViewName, TestData.VIEW_NAME1, `View switched to ${TestData.VIEW_NAME1}`);
        expect(actualViewName).toEqual(TestData.VIEW_NAME1);
    });

    it('Test Case 2: Create Scenario in Target View', async () => {
        await browser.pause(5000);
        await CommonFunctions.switchToSpecificWindow(1);
        await browser.pause(5000);
        await PlanningSpace.switchToMFEFrame()
        const url = await browser.getUrl();
        console.log(url, "URL current widow")
        await PlanningSpace.selectSupplyChainProceduresAction(TestData.PROCEDURE_NAME);
        await ScenarioPage.createScenario(scenarioName);
        await browser.pause(60000);
        await PlanningSpace.goToManageScenarios();
        const bValidation: boolean = await ScenarioPage.isScenarioCreated(scenarioName);
        await CommonFunctions.compareTwoValues(bValidation, true, `Is ${scenarioName} scenario created`);
        await expect(bValidation).toEqual(true);
    });

    it('Test Case 3: Delete the Created Scenario', async () => {
        await browser.pause(5000);
        const bValidation: boolean = await ScenarioPage.deleteChildScenario(scenarioName)
        await CommonFunctions.compareTwoValues(bValidation, true, `delete public scenario - ${scenarioName}`)
        await expect(bValidation).toEqual(true)
    });
});