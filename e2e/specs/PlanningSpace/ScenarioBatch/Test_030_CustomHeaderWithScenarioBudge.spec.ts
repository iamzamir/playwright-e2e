import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
import TestData from "../../../Testdata/INTEROP/PlanningSpace/ScenarioBatch/Test_030_CustomHeaderWithScenarioBudge.json";
import Scope from "../../../pageobjects/scope.page";
import ScenarioPage from '../../../pageobjects/scenario.page';
import ProcessPage from '../../../pageobjects/process.page';

describe('Extend view header with scenario budge', () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
        await browser.pause(10000);
    });

    it('Test Case 1: Should display budge if scenario is present', async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 1: Verify if budge is displayed when a scenario is present.');
        await PlanningSpace.launchContext("Process", { process: TestData.PROCESS_NAME });
        await ProcessPage.clickLeftpaneLinks('Planning');
        await CommonFunctions.logMessage('INFO', 'Navigated to Planning Space.');
        await Scope.clickOnTab('Scenarios');
        await CommonFunctions.logMessage('INFO', 'Switched to the "Scenarios" tab.');
        const budge: boolean = await Scope.scenarioBudgeExist();
        await CommonFunctions.logMessage('INFO', `Budge existence status: ${budge}`);
        await CommonFunctions.compareTwoValues(budge, true, 'Scenario and budge are present.');
        expect(budge).toBeTruthy();
        await CommonFunctions.logMessage('INFO', 'Test Case 1 completed successfully.');
    });

    it('Test Case 2: Verify default name and count UI', async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 2: Verify default name and count UI.');
        await PlanningSpace.goToManageScenarios();
        await CommonFunctions.logMessage('INFO', 'Navigated to Scenario page.');
        const defaultScenario = await ScenarioPage.getDefaultScenario();
        await CommonFunctions.logMessage('INFO', `Retrieved default scenario name: ${defaultScenario}`);
        await PlanningSpace.closeManageScenarios();
        await CommonFunctions.logMessage('INFO', `Closed Manage Scenarios and returned to Planning Space.`);
        const isBudgeNameDefault = await Scope.verifyBudgeIsDefault(defaultScenario);
        await CommonFunctions.compareTwoValues(isBudgeNameDefault, true, `The budge text matches the default scenario name.`);
        const countUI = await Scope.checkBudgeCountUI();
        await CommonFunctions.compareTwoValues(countUI, true, `Count UI is visible and working as expected.`);
        const finalResult = isBudgeNameDefault && countUI;
        await CommonFunctions.logMessage('INFO', `Final result for Test Case 2: ${finalResult ? 'PASS' : 'FAIL'}.`);
        expect(finalResult).toBe(true);
    });

    it('Test Case 3: Verify Budge is clickable', async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 3: Verify if budge is clickable and opens the scenario tab.');
        await ProcessPage.clickLeftpaneLinks('Planning');
        await CommonFunctions.logMessage('INFO', 'Navigated to Planning Space.');
        const isBudgeClickable: boolean = await Scope.budgeClickedScenarioOpened();
        await CommonFunctions.logMessage('INFO', `Budge clickable status: ${isBudgeClickable}`);
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(isBudgeClickable, true, 'On click, the scenario tab is auto-selected.');
        await CommonFunctions.logMessage('INFO', `Validation result: ${bValidation1 ? 'PASS' : 'FAIL'}`);
        expect(bValidation1).toBe(true);
        await CommonFunctions.logMessage('INFO', 'Test Case 3 completed successfully.');
    });

    it("Test case 4: Should show tooltip", async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 4: Verify tooltip display.');
        await ProcessPage.clickLeftpaneLinks('Planning');
        await CommonFunctions.logMessage('INFO', 'Navigated to Planning Space.');
        const toolTipText = await Scope.getBudgeTooltip();
        await CommonFunctions.logMessage('INFO', `Retrieved tooltip text: ${toolTipText}`);
        const budgeCount = await Scope.getBudgeCount();
        await CommonFunctions.logMessage('INFO', `Retrieved budge count: ${budgeCount}`);
        const isValidTooltip = await Scope.validateToolTipText(budgeCount, toolTipText);
        let bValidation: boolean = await CommonFunctions.compareTwoValues(isValidTooltip, true, 'Tooltip text validation.');
        expect(bValidation).toBe(true);
        await CommonFunctions.logMessage('INFO', 'Test Case 4 completed successfully.');
    });

    it("Test Case 5: Count hidden for Only one Base Scenarios", async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 5: Count hidden for Only one Base Scenarios.');
        await PlanningSpace.navigateToPlanningSpace();
        await PlanningSpace.launchContext("Process", { process: TestData.PROCESS_NAME_BASE_SCENARIO });
        await CommonFunctions.logMessage('INFO', `Process changed to ${TestData.PROCESS_NAME_BASE_SCENARIO}`);
        await browser.pause(5000);
        const budgeCount = await Scope.getBudgeCount();
        await CommonFunctions.logMessage('INFO', `Retrieved budge count: ${budgeCount}`);
        const result: boolean = budgeCount === 0;
        if (result) {
            await CommonFunctions.logMessage('PASS', 'Count UI is correctly not visible (badge count is 0).');
        } else {
            await CommonFunctions.logMessage('FAIL', `Count UI is not working as expected. Badge count: ${budgeCount} for process ${TestData.PROCESS_NAME_BASE_SCENARIO}`);
        }
        expect(result).toBe(true);
        await CommonFunctions.logMessage('INFO', 'Test Case 5 completed successfully.');
    });

    it("Test Case 6: Should check for No Scenario", async () => {
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 6: Should check for No Scenario.');
        await PlanningSpace.navigateToPlanningSpace();
        await CommonFunctions.logMessage('INFO', 'Navigated to Planning Space.');
        await PlanningSpace.launchContext("Process", { process: TestData.PROCESS_NAME_NO_SCENARIO });
        await CommonFunctions.logMessage('INFO', `Launched process: ${TestData.PROCESS_NAME_NO_SCENARIO}.`);
        await ProcessPage.clickLeftpaneLinks('Planning');
        await CommonFunctions.logMessage('INFO', 'Clicked on "Planning Space" link from the left pane.');
        const budgeText = await Scope.getScenarioBudgeText().getText();
        await CommonFunctions.logMessage('INFO', `Retrieved budge text: ${budgeText}`);
        const toolTipText = await Scope.getBudgeTooltip();
        await CommonFunctions.logMessage('INFO', `Retrieved tooltip text: ${toolTipText}`);
        const bValidation1 = budgeText.includes('No Scenario');
        const bValidation2 = toolTipText.includes('This process is misconfigured. Please connect with your system administrator');
        expect(bValidation1 && bValidation2).toBe(true);
        await CommonFunctions.logMessage('PASS', 'Test Case 6 completed successfully.');
    });
})