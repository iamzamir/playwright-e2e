const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/CardsBatch/Test_003_MaasPivotCard.json");
// import TestData from "../../../Testdata/PlanningSpace/CardsBatch/Test_003_MaasPivotCard.json";
import PlanningSpace from "../../../pageobjects/planning.page";
import scope from "../../../pageobjects/scope.page"
import CommonFunctions from "../../../util/common.util";
import ScenarioPage from '../../../pageobjects/scenario.page';

describe('Maas Pivot should load with supplied scenario & scope', async () => {

    let filterCols: string[];

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    });

    it(`Test Case 1: Select ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS} scenario from scenarios vertical filter`, async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME)
        const bValidation1: boolean = await scope.clickOnTab('Scenarios');
        await CommonFunctions.compareTwoValues(bValidation1, true, `Clicked on scope tab`);
        const bValidation2: boolean = await ScenarioPage.scenarioSelect([TestData.SCENARIO_TO_APPLY_IN_SCENARIOS], 'Check');
        await ScenarioPage.clickApplyScenarioTab();
        await browser.pause(5000);
        await CommonFunctions.compareTwoValues(bValidation2, true, `Is ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS} checked`)
        expect(bValidation1).toBeTruthy();
    });

    it(`Test Case 2: Apply  ${TestData.FILTER_TO_APPLY_IN_SCOPE} filter under scope`, async () => {
        const bValidation1: boolean = await scope.clickOnTab('Scope');
        await CommonFunctions.compareTwoValues(bValidation1, true, `Clicked on scope tab`);
        const bValidation2: boolean = await scope.searchFilter(TestData.FILTER_TO_APPLY_IN_SCOPE);
        await CommonFunctions.compareTwoValues(bValidation2, true, `Is ${TestData.FILTER_TO_APPLY_IN_SCOPE} filter selected under scope tab`);
        await browser.pause(5000);
        filterCols = await scope.getAppliedFilterNamesInScope();
        await CommonFunctions.logMessage('INFO',`Applied filters are ${filterCols}`);
        await scope.clickOnApplyFiltersBtn();
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

    it('Test Case 3: Verify selected scenario is appeared in popup of scenario pivot', async () => {
        // await PlanningSpace.toggleMinimizeIcon();
        await ScenarioPage.clickOnScenarioLiveIcon(TestData.CARD_NAME);
        const bValidation: boolean = await ScenarioPage.verifyScenarioInPivotPopup(TestData.SCENARIO_TO_APPLY_IN_SCENARIOS);
        await CommonFunctions.compareTwoValues(bValidation, true, `Provided ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS} scenario exist in pivot popup`);
        expect(bValidation).toBeTruthy();
    });

    it('Test Case 4: Selected scenario column relfects in table', async () => {
        const bValidation: boolean = await ScenarioPage.applyScenarioPivotFilter([TestData.SCENARIO_TO_APPLY_IN_SCENARIOS]);
        await CommonFunctions.compareTwoValues(bValidation, true, `Provided ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS} column is reflected`);
        expect(bValidation).toBeTruthy();
    });

    it(`Test Case 5: Verify selected filters reflects as columns in ${TestData.CARD_NAME}`, async () => {
        const bValidation: boolean = await ScenarioPage.verifyColumnExistsInPivotTable(filterCols,TestData.CARD_NAME);
        await CommonFunctions.compareTwoValues(bValidation,true,`Is ${filterCols} cols reflected in table`);
        expect(bValidation).toBeTruthy();
    })

    it(`Test Case 6: Reset`, async () => {
        await scope.clickOnTab('Scenarios');
        await ScenarioPage.scenarioSelect([TestData.SCENARIO_TO_APPLY_IN_SCENARIOS], 'Uncheck'); //unselect the scenario
    })

})