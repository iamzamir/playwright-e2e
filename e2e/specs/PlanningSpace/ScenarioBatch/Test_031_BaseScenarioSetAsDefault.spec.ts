import PlanningSpace from "../../../pageobjects/planning.page";
import ProcessPage from "../../../pageobjects/process.page";
import ScenarioPage from '../../../pageobjects/scenario.page';
import scope from "../../../pageobjects/scope.page";
import CommonFunctions from "../../../util/common.util";
import TestUtil from "../../../util/test.util";

const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScenarioBatch/Test_031_BaseScenarioSetAsDefault.json");

describe('Set as Default case for Base Scenario', async () => {

    const scenarioName = 'Child_Scen1';
    // let isPinnedBefore;
    // let isPinnedAfter;
    let baseScenario;

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(
            TestData.REALM_NAME,
            process.env.FUNCTIONAL_TEST_USERNAME2 as string,
            process.env.FUNCTIONAL_TEST_PASSWORD as string,
            TestData.PROCESS_NAME
        );
    });

    it('Test Case 1: Set the child Scenario as default', async () => {
        await browser.pause(5000);
        await PlanningSpace.goToManageScenarios();
        await browser.pause(5000);
        // await ScenarioPage.clickAllScenarios();

        const isScenarioExist = await ScenarioPage.ScenarioLinkVisible(scenarioName);

        if (!isScenarioExist) {
            await TestUtil.createChildScenarioFromBase(scenarioName, 'Public Scenario', 'Public', 'Uncheck');
            let validation: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.isScenarioVisibleUnderALLTab(scenarioName), true, "Child Scenario " + scenarioName + " Created Assertion")
            await expect(validation).toEqual(true);
        }

        await browser.pause(10000);
        await ScenarioPage.editScenarioItemIsDefault(scenarioName);
        await browser.pause(10000);

        const dataIndex: number = await ScenarioPage.getDataIndexByColumnName('Information');
        const bValidation1: boolean = await ScenarioPage.verifyRightIconInScenarioTable(scenarioName, dataIndex);
        browser.keys('Escape'); // To close the menu if it is still open after setting default scenario
        await PlanningSpace.closeManageScenarios();

        await CommonFunctions.compareTwoValues(bValidation1, true, `Is right icon exist for ${scenarioName} scenario`);
        // isPinnedBefore = await ScenarioPage.verifyPinIconInScenarioTable(scenarioName, dataIndex);
        expect(bValidation1).toBeTruthy();
    });

    it('Test Case 2: Set the Base Scenario as default', async () => {
        await PlanningSpace.goToManageScenarios();
        await browser.pause(5000);

        baseScenario = await ScenarioPage.getBaseScenario();
        await browser.pause(10000);

        const dataIndex: number = await ScenarioPage.getDataIndexByColumnName('Information');
        console.log("dataIndex", dataIndex);

        await ScenarioPage.editScenarioItemIsDefault(baseScenario);
        await browser.pause(10000);

        const bValidation1: boolean = await ScenarioPage.verifyRightIconInScenarioTable(baseScenario, dataIndex);
        await CommonFunctions.compareTwoValues(bValidation1, true, `Is right icon exist for ${baseScenario} scenario`);
        await PlanningSpace.closeManageScenarios();

        // isPinnedAfter = await ScenarioPage.verifyPinIconInScenarioTable(scenarioName, dataIndex);
        // const bValidation2 = await CommonFunctions.compareTwoValues(
        //     isPinnedAfter,
        //     isPinnedBefore,
        //     `Pin state consistency for ${scenarioName} before and after setting Base Scenario as default`
        // );

        expect(bValidation1).toBeTruthy();
    });

    it('Test Case 3: Select scenario from scenarios vertical filter and set default', async () => {
        await ProcessPage.clickLeftpaneLinks('Planning');
        await browser.pause(10000);

        const bValidation1: boolean = await scope.clickOnTab('Scenarios');
        await CommonFunctions.compareTwoValues(bValidation1, true, `Clicked on scenario tab`);

        await ScenarioPage.scenarioSelectandSetDetault([scenarioName], 'Check');
        await scope.clickOnTab('Scenarios');

        const bValidation: boolean = await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(scenarioName);
        await CommonFunctions.compareTwoValues(bValidation, true, `Is default scenario ${scenarioName} available under exist in scenario filters`);

        expect(bValidation).toBeTruthy();
    });

    it('Test Case 4: Reset Scenario configurations', async () => {
        await browser.pause(10000);
        await scope.clickOnTab('Scenarios');
        await ScenarioPage.scenarioSelectandSetDetault([baseScenario], 'Check', false);
        await browser.pause(5000);
        await scope.clickOnTab('Scenarios');
        await ScenarioPage.scenarioSelect([scenarioName], 'Uncheck');
        await CommonFunctions.logMessage('INFO', 'Test Case 4 completed successfully.');
    });

});
