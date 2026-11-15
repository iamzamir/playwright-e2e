const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/CardsBatch/Test_004_MaasChartCard.json");
// import TestData from "../../../Testdata/PlanningSpace/CardsBatch/Test_004_MaasChartCard.json"
import PlanningSpace from "../../../pageobjects/planning.page";
import scope from "../../../pageobjects/scope.page"
import CommonFunctions from "../../../util/common.util";
import ScenarioPage from '../../../pageobjects/scenario.page';
import scenarioPage from "../../../pageobjects/scenario.page";

describe("MaaS Chart should load with supplied scenario & scope", async () => {

    let labelsBeforeFilter: string[];
    let filterCols: string[];
    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await browser.pause(5000);
    });

    it(`Test Case 1: Fetch initial X axis labels from ${TestData.CARD_NAME} card before filter applied`, async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        await browser.pause(30000);
        labelsBeforeFilter = await PlanningSpace.getXAxisLabelsFromMaasChart(TestData.CARD_NAME);
        expect(labelsBeforeFilter.length).toBeGreaterThanOrEqual(1);
    });
    
    it(`Test Case 2: Apply  ${TestData.FILTER_TO_APPLY_IN_SCOPE} filter under scope`, async () => {
        const filterToSelect: string = TestData.FILTER_TO_APPLY_IN_SCOPE;
        const bValidation1: boolean = await scope.clickOnTab('Scope');
        await CommonFunctions.compareTwoValues(bValidation1, true, `Clicked on scope tab`);
        const bValidation2: boolean = await scope.searchFilter(filterToSelect);
        await CommonFunctions.compareTwoValues(bValidation2, true, `Is ${filterToSelect} filter selected under scope tab`);
        await browser.pause(5000);
        filterCols = await scope.getAppliedFilterNamesInScope();
        await CommonFunctions.logMessage('INFO',`Applied filters are ${filterCols}`);
        await scope.clickOnApplyFiltersBtn();
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

    it(`Test Case 3: Verify X axis labels from ${TestData.CARD_NAME} card after filter applied`, async () => {
        await browser.pause(10000);
        const labelsAfterFilter: string[] = await PlanningSpace.getXAxisLabelsFromMaasChart(TestData.CARD_NAME);
        const bValidation1: boolean = await PlanningSpace.verifyMaasChartLabels(labelsAfterFilter,labelsBeforeFilter);
        await CommonFunctions.compareTwoValues(bValidation1,true,`Is data relflected in ${TestData.CARD_NAME} card after filter`)
        expect(bValidation1).toBeTruthy();
    });

    it(`Test Case 4: Select ${TestData.SCENARIO_TO_APPLY} scenario from scenarios vertical filter`, async () => {
        const bValidation1: boolean = await scope.clickOnTab('Scenarios');
        await CommonFunctions.compareTwoValues(bValidation1, true, `Clicked on scope tab`);
        const bValidation2: boolean = await ScenarioPage.scenarioSelect([TestData.SCENARIO_TO_APPLY], 'Check');
        await CommonFunctions.compareTwoValues(bValidation2, true, `Is ${TestData.SCENARIO_TO_APPLY} checked`);
        expect(bValidation1).toBeTruthy();
    });

    it('Test Case 5: Validating Scenario Map', async () => {
        let isScenarioMapped: boolean = await ScenarioPage.scenarioMap([TestData.SCENARIO_TO_APPLY]);
        await expect(isScenarioMapped).toBeTruthy();
    });

    it(`Test Case 6: Verify selected scenario is appeared in popup of scenario live icon`, async ()=> {
        await scenarioPage.clickOnScenarioLiveIcon(TestData.CARD_NAME);
        await browser.pause(10000)
        const bValidation: boolean = await ScenarioPage.verifyScenarioInPivotPopup(TestData.SCENARIO_TO_APPLY);
        await CommonFunctions.compareTwoValues(bValidation, true, `Provided ${TestData.SCENARIO_TO_APPLY} scenario exist in pivot popup`);
        expect(bValidation).toBeTruthy();
    });

    it(`Test Case 7: Reset`, async ()=> {
        await browser.pause(10000);
        await ScenarioPage.scenarioSelect([TestData.SCENARIO_TO_APPLY], 'Uncheck'); //unselect the scenario
    });

})