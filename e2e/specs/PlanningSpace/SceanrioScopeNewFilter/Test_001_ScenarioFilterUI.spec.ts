import PlanningSpace from "../../../pageobjects/planning.page";
import ProcessPage  from "../../../pageobjects/process.page";
import scenarioPage from "../../../pageobjects/scenario.page";
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/SceanrioScopeNewFilter/Test_001_ScenarioFilterUI.json");


describe("Scenario filter improvements UI", () => {
  let baseScenario: string;
  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME, false, false);
  });

  it("Test Case 1: Verify that clicking on the scope chip opens the scope tab", async () => {
    await browser.pause(8000);
    await PlanningSpace.goToManageScenarios();
    baseScenario = await scenarioPage.getBaseScenario();
    await ProcessPage.clickLeftpaneLinks('Planning');
    const validation1 = await CommonFunctions.compareTwoValues(await PlanningSpace.verifyNewScopeFilter('Scope'), true, "Scope chip click should open the scope filter");
    await PlanningSpace.closeScenarioFilter();
    expect(validation1).toBeTruthy();
  });

  it("Test Case 2: Verify that clicking on the scenario chip opens the scenario filter and sets the default scenario", async () => {
    await browser.pause(5000);
    const validation1 = await PlanningSpace.verifyNewScenarioFilter('Scenarios');
    await CommonFunctions.compareTwoValues(validation1, true, "Scenario chip click should open the scenarios filter");
    const bValidation2: boolean = await scenarioPage.selectDefaultScenarioFromNewUI(TestData.SCENARIO_TO_APPLY_IN_SCENARIOS);
    await browser.pause(5000);
    await CommonFunctions.logMessage("INFO", "Checking if the default scenario is selected in the scenario filter");
    const validation2 = await scenarioPage.validateScenarioSelectionNewUI(TestData.SCENARIO_TO_APPLY_IN_SCENARIOS);
    await CommonFunctions.logMessage("INFO", "Default scenario verified successfully");
    await browser.pause(10000);
    await PlanningSpace.verifyNewScenarioFilter('Scenarios');
    await CommonFunctions.compareTwoValues(true, true, "Setting Base filter back as default");
    await scenarioPage.selectDefaultScenarioFromNewUI(baseScenario);
    await CommonFunctions.logMessage("INFO", "Test Case 2: Scenario filter verified successfully");
    expect(bValidation2 && validation2).toEqual(true);
  });

  it("Test Case 3: Verify that clicking on the scenario chip opens the scenario filter and unselects scenarios", async () => {
    await browser.pause(5000);
    const validation1 = await PlanningSpace.verifyNewScenarioFilter('Scenarios');
    await CommonFunctions.compareTwoValues(validation1, true, "Scenario chip click should open the scenarios filter");
    const bValidation2: boolean = await scenarioPage.unselectScenariosNewUI([TestData.SCENARIO_TO_APPLY_IN_SCENARIOS]);
    await CommonFunctions.logMessage("INFO", "Test Case 3: Scenario filter unselect scenarios verified successfully");
    expect(bValidation2).toEqual(true);
  });

  it("Test Case 4: Verify that clicking on the scenario chip opens the scenario filter and selects scenarios", async () => {
    await browser.pause(5000);
    const validation1 = await PlanningSpace.verifyNewScenarioFilter('Scenarios');
    await CommonFunctions.compareTwoValues(validation1, true, "Scenario chip click should open the scenarios filter");
    const bValidation2: boolean = await scenarioPage.selectScenarioFromNewUI([TestData.SCENARIO_TO_APPLY_IN_SCENARIOS], 'Check');
    await CommonFunctions.logMessage("INFO", "Test Case 4: Scenario filter select scenarios verified successfully");
    expect(bValidation2).toEqual(true);
  });

  it("Test Case 5: Verify that an external link opens from the scenario filter", async () => {
    await browser.pause(5000);
    const validation1 = await PlanningSpace.verifyNewScenarioFilter('Scenarios');
    await CommonFunctions.compareTwoValues(validation1, true, "Scenario chip click should open the scenarios filter");
    await browser.pause(2000);
    await CommonFunctions.logMessage("INFO", "Verifying if the external link opened successfully from the scenario filter");
    const externalLinkOpened = await PlanningSpace.externalLinkOpenFromScenarioFilter();
    await CommonFunctions.logMessage("INFO", "Test Case 5: External link from scenario filter verified successfully");
    expect(externalLinkOpened).toEqual(true);
  });

});

