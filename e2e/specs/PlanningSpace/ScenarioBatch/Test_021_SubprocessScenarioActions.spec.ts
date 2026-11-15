const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScenarioBatch/Test_021_SubprocessScenarioActions.json");
import PlanningSpace from "../../../pageobjects/planning.page";
import TestUtil from '../../../util/test.util';
import ScenarioPage from '../../../pageobjects/scenario.page';
import CommonFunctions from "../../../util/common.util";

describe("User Should be able to create, edit, and delete child scenarios for the Subprocess", async () => {
    const random_name = Math.floor(1000 + Math.random() * 9000);
    const publicScenarioName1 = 'Subprocess_Scenario_Actions_' + random_name;

    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
        await PlanningSpace.launchContext("Sub-process", { process: TestData.PROCESS_NAME, subProcess: TestData.SUBPROCESS_NAME });
    });

    it('Test Case 1: Create Child Scenario', async () => {
        let validation1: boolean = await TestUtil.createChildScenarioFromProcedure("Create Scenario", publicScenarioName1, publicScenarioName1 + " Description", 'Public', 'Uncheck');
        await expect(validation1).toEqual(true);
    });

    it('Test Case 2: Edit Child Scenario description', async () => {
        const scenarioDesc = 'Test Description field';
        await ScenarioPage.editScenarioItem(publicScenarioName1, scenarioDesc);
        await ScenarioPage.clickScenarioSaveButton();
        await ScenarioPage.clickResetButton();
        await browser.pause(5000);
        const bValidation1 = await CommonFunctions.compareTwoValues(
            await ScenarioPage.verifyDescription(scenarioDesc),
            true,
            'Is Description exist'
        );
        expect(bValidation1).toBeTruthy();
    });

    it('Test Case 3: Delete Child Scenario from scenario data table', async () => {
        let isDelete = await ScenarioPage.deleteChildScenario(publicScenarioName1);
        await CommonFunctions.compareTwoValues(isDelete, true, `Is ${publicScenarioName1} scenario deleted?`);
        await expect(isDelete).toBeTruthy();
    });

});