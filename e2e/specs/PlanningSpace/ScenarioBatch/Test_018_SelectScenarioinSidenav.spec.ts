import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScenarioBatch/Test_018_SelectScenarioinSidenav.json");
import scope from "../../../pageobjects/scope.page";
import ScenarioPage from '../../../pageobjects/scenario.page';
import ProcessPage from '../../../pageobjects/process.page';

describe('Select Scenario in Sidenav (All Entities)', () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(
            TestData.REALM_NAME,
            process.env.FUNCTIONAL_TEST_USERNAME as string,
            process.env.FUNCTIONAL_TEST_PASSWORD as string,
            TestData.PROCESS_NAME
        );
    });

    const entities = [
        {
            name: "Process",
            launchContext: async () => {
                await PlanningSpace.launchContext("Process", { process: TestData.PROCESS_NAME });
            },
            scenarioNames: [TestData.SCENARIO_NAME1, TestData.SCENARIO_NAME2]
        },
        {
            name: "Sub-process",
            launchContext: async () => {
                await PlanningSpace.launchContext("Sub-process", { process: TestData.PROCESS_NAME, subProcess: TestData.SUBPROCESS_NAME });
            },
            scenarioNames: [TestData.SUBPROCESS_SCENARIO_NAME1, TestData.SUBPROCESS_SCENARIO_NAME2]
        },
        {
            name: "Assumption",
            launchContext: async () => {
                await PlanningSpace.launchContext("Assumption", { origin: TestData.PROCESS_NAME, assumption: TestData.ASSUMPTION_NAME });
            },
            scenarioNames: [TestData.ASSUMPTION_SCENARIO_NAME1, TestData.ASSUMPTION_SCENARIO_NAME2]
        }
    ];

    entities.forEach(entity => {
        it(`${entity.name} - Test Case 1: Check scenarios in the scenario filter`, async () => {
            await PlanningSpace.navigateToPlanningSpace();
            await entity.launchContext();
            await ProcessPage.clickLeftpaneLinks('Planning');
            await PlanningSpace.clickViewsDropDown();
            const bValidation1 = await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
            await CommonFunctions.compareTwoValues(bValidation1, true, `${TestData.VIEW_NAME} is exist under views tab in planning space`);
            const bValidation2 = await scope.clickOnTab('Scenarios');
            await CommonFunctions.compareTwoValues(bValidation2, true, `Scenarios tab clicked`);
            await ScenarioPage.scenarioSelect(entity.scenarioNames, "Check");
            await ScenarioPage.clickOnMoreInfoIconIfExists();
            let isScenarioMapped = await ScenarioPage.scenarioMap(entity.scenarioNames);
            await expect(bValidation1 && bValidation2 && isScenarioMapped).toBeTruthy();
        });

        it(`${entity.name} - Test Case 2: Verify selected scenario is appeared`, async () => {
            await ProcessPage.clickLeftpaneLinks('Planning');
            const bValidation = await scope.clickOnTab('Scenarios');
            await CommonFunctions.compareTwoValues(bValidation, true, `Scenarios tab clicked`);
            await ScenarioPage.clickOnMoreInfoIconIfExists();
            let isScenarioMapped = await ScenarioPage.scenarioMap(entity.scenarioNames);
            await expect(isScenarioMapped).toBeTruthy();
        });

        it(`${entity.name} - Test Case 3: Reset - UnCheck scenarios in the scenario filter`, async () => {
            await browser.pause(5000);
            await ScenarioPage.scenarioSelect(entity.scenarioNames, "Uncheck");
            let isScenarioMapped = await ScenarioPage.scenarioMap(entity.scenarioNames);
            await expect(!isScenarioMapped).toBeTruthy();
        });
    });
});