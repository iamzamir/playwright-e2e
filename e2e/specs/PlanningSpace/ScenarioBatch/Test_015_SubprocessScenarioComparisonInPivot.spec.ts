import PlanningSpace from "../../../pageobjects/planning.page";
const TestData = require("../../../Testdata/INTEROP/PlanningSpace/ScenarioBatch/Test_015_SubprocessScenarioComparisonInPivot.json");
import ProcessPage from '../../../pageobjects/process.page';
import CommonFunctions from "../../../util/common.util";
import scope from "../../../pageobjects/scope.page";
import ScenarioPage from '../../../pageobjects/scenario.page';

const contexts = [
    {
        name: "Sub-process",
        launch: async (data) => {
            await PlanningSpace.loginToPlanningSpace(data["REALM_NAME"], process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
            await PlanningSpace.launchContext("Sub-process", {
                process: data["PROCESS_NAME"],
                subProcess: data["SUBPROCESS_NAME"]
            });
            await ProcessPage.clickLeftpaneLinks('Planning');
        },
        data: TestData["Sub-process"]
    },
    {
        name: "Assumption",
        launch: async (data) => {
            await PlanningSpace.loginToPlanningSpace(data["REALM_NAME"], process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
            await PlanningSpace.navigateToPlanningSpace();
            await PlanningSpace.launchContext("Assumption", {
                origin: data["ORIGIN_NAME"],
                assumption: data["ASSUMPTION_NAME"]
            });
            await ProcessPage.clickLeftpaneLinks('Planning');
        },
        data: TestData["Assumption"]
    }
];

contexts.forEach(context => {
    describe(`${context.name} Scenario comparison in pivot`, () => {
        const data = context.data;

        before(async () => {
            await context.launch(data);
        });

        it('Test Case 1: Check Scenario in the scenario filter', async () => {
            await PlanningSpace.clickViewsDropDown();
            await PlanningSpace.clickDashBoard(data["VIEW_NAME"]);
            const isScenarioTab: boolean = await CommonFunctions.compareTwoValues(await scope.clickOnTab('Scenarios'), true, `Scenarios tab clicked`);
            await ScenarioPage.scenarioSelect([data["SCENARIO_NAME"]], "Check");
            const isScenarioMapped: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.scenarioMap([data["SCENARIO_NAME"]]), true, `Scenario ${data["SCENARIO_NAME"]} mapped successfully`);
            await ScenarioPage.clickApplyScenarioTab();
            await browser.pause(5000);
            await scope.clickOnTab('Scope');
            const isFilterSelect: boolean = await CommonFunctions.compareTwoValues(await scope.searchFilter(data["FILTER_NAME"]), true, ` ${data["FILTER_NAME"]} Filter selected`);
            await CommonFunctions.logMessage('INFO', 'Clicked on  Apply filter button');
            const isFilterApplied: boolean = await CommonFunctions.compareTwoValues(await scope.clickOnApplyFiltersBtn(), true, `Filter Applied`);
            expect(isScenarioTab && isScenarioMapped && isFilterSelect && isFilterApplied).toBeTruthy();
        });

        it('Test Case 2: Verify selected scenario is appeared in popup of scenario pivot', async () => {
            await browser.pause(5000)
            await CommonFunctions.logMessage('INFO','Clicking scenario live button in pivot');
            await browser.pause(10000);
            await ScenarioPage.clickOnScenarioLiveIcon(data["CARD_NAME"]);
            const bValidation: boolean = await ScenarioPage.verifyScenarioInPivotPopup(data["SCENARIO_NAME"]);
            await CommonFunctions.compareTwoValues(bValidation, true, `Provided ${data["SCENARIO_NAME"]} scenario exist in pivot popup`);
            expect(bValidation).toBeTruthy();
        });

        it('Test Case 3: Selected scenario column reflects in table', async () => {
            const bValidation: boolean = await ScenarioPage.applyScenarioPivotFilter([data["SCENARIO_NAME"]]);
            await CommonFunctions.compareTwoValues(bValidation, true, `Provided ${data["SCENARIO_NAME"]} column is reflected`);
            expect(bValidation).toBeTruthy();
        });

        it('Test Case 4: Reset', async () => {
            await scope.clickOnTab('Scenarios');
            await ScenarioPage.scenarioSelect([data["SCENARIO_NAME"]],'Uncheck'); // Unselect the scenario
        });
    });
});