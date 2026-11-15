import PlanningSpace from '../../../pageobjects/planning.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
import ScopePage from '../../../pageobjects/scope.page';
import ProcessPage from '../../../pageobjects/process.page';
import CommonFunctions from '../../../util/common.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/OnDemandMaas/Test_001_VerifyODMDefaultScenarioInPivot.json");

describe('ODM - Create default scenario and verify in pivot', () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    });

    // it('Test Case 1: Non Interactive View - Interactive Data Status Icon should not be Visible', async () => {
    //     await PlanningSpace.selectAllViewsOrFavourites("All Views")
    //     let validation: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.clickInteractiveDataStatus(), false, "Interactive Data Status Icon should not visible Assertion");
    //     expect(validation).toEqual(true);
    // });

    // it('Test Case 2: Interactive View - Interactive Data Status Icon should be Visible', async () => {
    //     await browser.pause(5000);
    //     await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
    //     let validation: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.clickInteractiveDataStatus(), true, "Interactive Data Status Icon should be visible Assertion");
    //     expect(validation).toEqual(true);
    // });
    it('Test case 1: Create a default scenario and verify scenario in the pivot card', async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        await PlanningSpace.selectSupplyChainProceduresAction(TestData.PROCEDURE_NAME);
        await ScenarioPage.createScenarioFromSCA(TestData.SCENARIO_NAME, TestData.SCENARIO_DESC, TestData.BASE_SCENARIO, true, true, true);
        const running = await CommonFunctions.verifyAlertMsg("running");
        await CommonFunctions.compareTwoValues(running, true, 'verify alert')
        await browser.pause(20000)
        const success = await CommonFunctions.verifyAlertMsg('success');
        await CommonFunctions.compareTwoValues(success, true, 'scenario created successfully');
        await ScopePage.clickOnTab("Scenarios");
        await browser.pause(5000)
        const bValidation1: boolean = await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(TestData.SCENARIO_NAME);
        await CommonFunctions.compareTwoValues(bValidation1, true, `${TestData.SCENARIO_NAME} exist in scenarios pop up`);
        await CommonFunctions.logMessage('INFO','Clicking scenario live button in pivot');
        await browser.pause(10000);
        await ScenarioPage.clickOnScenarioLiveIcon(TestData.CARD_NAME);
        const bValidation: boolean = await ScenarioPage.verifyScenarioInPivotPopup(TestData.SCENARIO_NAME, true);
        await CommonFunctions.compareTwoValues(bValidation, true, `Provided ${TestData.SCENARIO_NAME} scenario exist in pivot popup with checked`);
        const bValidation2: boolean = await ScenarioPage.verifyScenarioInPivotPopup(TestData.BASE_SCENARIO, false);
        await CommonFunctions.compareTwoValues(bValidation2, true, `Provided ${TestData.BASE_SCENARIO} scenario exist in pivot popup with out checked`);
        expect( bValidation && bValidation1 && bValidation2).toEqual(true);
    });

    it('Test case 2: Clean up - Delete created scenario', async () => {
        await browser.pause(5000);
        await PlanningSpace.goToManageScenarios();
        const bValidation1: boolean = await ScenarioPage.deleteChildScenario(TestData.SCENARIO_NAME);
        await expect(bValidation1).toEqual(true);
    });
});
