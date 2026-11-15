import ScenarioPage from '../../../pageobjects/scenario.page';
import TestUtil from "../../../util/test.util";
import ProcessPage from '../../../pageobjects/process.page';
import PlanningSpace from '../../../pageobjects/planning.page';
import scopePage from '../../../pageobjects/scope.page';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScenarioBatch/Test_005_ScenarioSelection.json");
// import TestData from '../../../Testdata/PlanningSpace/ScenarioBatch/Test_005_ScenarioSelection.json';
import CommonFunctions from '../../../util/common.util';


describe('Scenario Selection', () => {

  const scenarioName = "Scenario_Selection_1";

  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
  });

  it('Test Case 1: Create a public child scenario', async () => {
    await PlanningSpace.goToManageScenarios();
    // await ScenarioPage.clickAllScenarios();
    const isScenarioExist = await ScenarioPage.ScenarioLinkVisible(scenarioName);
    if (!isScenarioExist) {
      await TestUtil.createChildScenarioFromBase(scenarioName, scenarioName + " Description", 'Public', 'Uncheck', false, false, false);
      let Validation: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.isScenarioVisibleUnderALLTab(scenarioName), true, "Child Scenario " + scenarioName + " Created Assertion");
      expect(Validation).toBeTruthy();
    }
  });

  it('Test Case 2: Mapping Scenario in the Scenario Tab', async () => {
    await PlanningSpace.closeManageScenarios();
    await ProcessPage.clickLeftpaneLinks('Planning');
    await PlanningSpace.clickViewsDropDown();
    await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
    await scopePage.clickOnTab('Scenarios');
    await ScenarioPage.scenarioSelect([scenarioName], "Check");
  });

  it('Test Case 3: Validating Scenario Map', async () => {
    let isScenarioMapped: boolean = await ScenarioPage.scenarioMap([scenarioName]);
    await expect(isScenarioMapped).toEqual(true);
  });
  /*
    it('Test Case 4: Delete Scenario', async () => {
      await PlanningSpace.goToManageScenarios();
      let isDelete: boolean = await ScenarioPage.deleteChildScenario(scenarioName);
      await CommonFunctions.compareTwoValues(isDelete,true,`Is ${scenarioName} scenario deleted`);
      await browser.pause(10000);
      await expect(isDelete).toEqual(true);
    });*/

});
