import CommonFunctions from "../../../util/common.util";
import PlanningSpace from "../../../pageobjects/planning.page";
import ProcessPage from "../../../pageobjects/process.page";
import ScenarioPage from "../../../pageobjects/scenario.page";
import TestUtil from '../../../util/test.util';
const TestData = require("../../../Testdata/" +
  process.env.PSENV +
  "/PlanningSpace/SupplyChainActionsBatch/Test_001_SupplyChainActions.json");

describe("Supply Chain Procedures - History New design", () => {
  // Constants
  const RANDOM_NUMBER = Math.floor(Math.random() * 1000);
  const SCENARIO_NAME = `${TestData.SCENARIO_NAME}${RANDOM_NUMBER}`;
  const SCP_HISTORY_LINK = "Supply Chain Procedures - History";
  const SCENARIO_DESCRIPTION = "description";
  const COMPLETED_STATUS_TEST_ID = "completed";
  
  // Test data
  let baseScenarioName: string = '';
  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess( TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
  });

  it("TestCase 1: Run SCP and verify last async run in power bar and list", async () => {
    // Setup: Navigate to scenario and get base scenario
    try {
      await ProcessPage.clickLeftpaneLinks("Scenario");
      baseScenarioName = await ScenarioPage.getBaseScenario();
    } catch (error) {
      await PlanningSpace.goToManageScenarios();
      baseScenarioName = await ScenarioPage.getBaseScenario();
      PlanningSpace.closeManageScenarios();
    }
    // verify SCP History icon exists in PowerBar
    const isHistoryIconExists = await PlanningSpace.isHistoryIconExistsInPowerbar();
    const bValidation1 = await CommonFunctions.compareTwoValues(isHistoryIconExists, true, "History icon exists in PowerBar");
    // verify if SCP History side panel link exists
    const isLinkExists = await ProcessPage.isLeftPanelLinkExists(SCP_HISTORY_LINK);
    const bValidation2 = await CommonFunctions.compareTwoValues(isLinkExists, false, "verify SCP History link exists in left panel");
    // Create a new child scenario from Base scenario
    // await ScenarioPage.clickAllScenarios();
    await TestUtil.createChildScenarioFromBase(SCENARIO_NAME, SCENARIO_DESCRIPTION,'Public','Uncheck', true, true);
    // verify in power bar that the latest running SCP is displayed
    const isLatestRunningSCPShown = await PlanningSpace.isLatestRunningSCPDisplayed();
    const bValidation3 = await CommonFunctions.compareTwoValues(isLatestRunningSCPShown, true, "Latest running SCP is shown in PowerBar");
    expect(bValidation1 && bValidation2 && bValidation3).toEqual(true);
    await CommonFunctions.logMessage("PASS", "TestCase 1: Run SCP and verify last async run completed successfully.");
  });

  it('TestCase 2: Verify latest running SCP in SCP list', async () => {
    await PlanningSpace.openSCPListFromPowerBar();
    const procedureName = await PlanningSpace.getProcedureNameOfLatestSCP();
    const scenarioName = await PlanningSpace.getScenarioNameOfLatestSCP();
    const bValidation1 = await CommonFunctions.compareTwoValues(procedureName, TestData.PROCEDURE_NAME, "Procedure Name in SCP List matches");
    const bValidation2 = await CommonFunctions.compareTwoValues(scenarioName, baseScenarioName, "Scenario Name in SCP List matches");
    expect(bValidation1 && bValidation2).toEqual(true);
    await CommonFunctions.logMessage("PASS", "TestCase 2: Verify latest running SCP in SCP list completed successfully.");
  });

  it('TestCase 3: Verify latest running procedure from Procedure details page', async () => {
    await PlanningSpace.clickOnLatestSCPFromList();
    const procedureName = await PlanningSpace.getProcedureNameInDetailsPage();
    const scenarioName = await PlanningSpace.getScenarioNameInDetailsPage();
    const bValidation1 = await CommonFunctions.compareTwoValues(procedureName, TestData.PROCEDURE_NAME, "Procedure Name in Details Page matches");
    const bValidation2 = await CommonFunctions.compareTwoValues(scenarioName, baseScenarioName, "Scenario Name in Details Page matches");
    expect(bValidation1 && bValidation2).toEqual(true);
    await CommonFunctions.logMessage("PASS", "TestCase 3: Verify latest running procedure from Procedure details page completed successfully.");
  });

  it('TestCase 4: Verify status filter & procedure filters', async () => {
    await PlanningSpace.goBackToSCPList();
    await PlanningSpace.setStatusFilterInSCPList(TestData.SELECT_STATUS);
    await PlanningSpace.setProcedureFilterInSCPList(TestData.SELECT_PROCEDURE_NAME);
    const procedureStatuses = await PlanningSpace.getProcedureStatusesFromSCPList();
    const procedureNames = await PlanningSpace.getProcedureNamesFromSCPList();
    const bValidation1 = procedureStatuses.every(status => status === COMPLETED_STATUS_TEST_ID);
    const bValidation2 = procedureNames.every(name => name === TestData.SELECT_PROCEDURE_NAME);
    await PlanningSpace.closeSCPList();
    expect(bValidation1 && bValidation2).toEqual(true);
    await CommonFunctions.logMessage("PASS", "TestCase 4: Verify status filter & procedure filters completed successfully.");
  });

  it('TestCase 5: Delete new child scenario', async () => {
    const isScenarioCreated: boolean = await ScenarioPage.isScenarioCreated(SCENARIO_NAME);
    if(isScenarioCreated) {
      let isDelete: boolean = await ScenarioPage.deleteChildScenario(SCENARIO_NAME);
      await CommonFunctions.compareTwoValues(isDelete, true, `Is ${SCENARIO_NAME} scenario deleted`);
      await expect(isDelete).toEqual(true);
    }
    else {
      await CommonFunctions.logMessage("INFO", `Scenario ${SCENARIO_NAME} is not created, skipping delete test case.`);
    }
    await CommonFunctions.logMessage("PASS", "Test Case 5: Delete new child scenario completed successfully.");
  });

  it('TestCase 6: Verify history exists for Process Orchestration', async () => {
    await ProcessPage.clickLeftpaneLinks('Assumptions');
    await browser.pause(5000);
    const isHistoryIconExists = await PlanningSpace.isHistoryIconExistsInPowerbar();
    const bValidation1 = await CommonFunctions.compareTwoValues(isHistoryIconExists, true, "History icon exists in PowerBar");
    // verify if SCP History side panel link exists
    const isLinkExists = await ProcessPage.isLeftPanelLinkExists(SCP_HISTORY_LINK);
    const bValidation2 = await CommonFunctions.compareTwoValues(isLinkExists, false, "verify SCP History link exists in left panel");
    expect(bValidation1 && bValidation2).toEqual(true);
    await CommonFunctions.logMessage("PASS", "Test case 6: verify history exists for PO completed successfully.");
  });
});
