import PlanningSpace from "../../../pageobjects/planning.page";
import ProcessPage from '../../../pageobjects/process.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
import scope from "../../../pageobjects/scope.page"
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScenarioBatch/Test_007_ScenarioDefault.json");
const random_name = Math.floor(1000 + Math.random() * 9000);
const scenarioName = 'Default_scenario_test_' + random_name;
// const scenarioName: string = 'ScenarioforLBP1'

describe('Setting default scenario from selector', async () => {

  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    await PlanningSpace.goToManageScenarios();
    await browser.pause(5000);
  })

  it('Test Case 1: Create a public child scenario', async () => {
    const baseScenario: string = await ScenarioPage.getBaseScenario()
    await ScenarioPage.tableActionClick(baseScenario, 'Create Child Scenario');
    await ScenarioPage.createPublicScenario(scenarioName);
    await browser.pause(30000);
    await ScenarioPage.clickResetButton();
    await browser.pause(15000);
    const bValidation: boolean = await ScenarioPage.isScenarioCreated(scenarioName)
    await CommonFunctions.compareTwoValues(bValidation, true, `Is ${scenarioName} scenario created`);
    await expect(bValidation).toEqual(true)
  })

  it('Test Case 2: verify set as default action in 3 dots menu of scenarios table in scenarios', async () => {
    await ScenarioPage.tableActionClick(scenarioName, 'Set as Default');
    // await ScenarioPage.clickAllScenarios();
    await browser.pause(10000);
    const bValidation1: boolean = await ScenarioPage.verifyIsDefaultScenario(scenarioName);
    await CommonFunctions.compareTwoValues(bValidation1, true, `Is scenario ${scenarioName} default`);
    await browser.pause(10000);
    await ProcessPage.clickLeftpaneLinks('Planning');
    await browser.pause(10000);
    await scope.clickOnTab('Scenarios');
    const bValidation3: boolean = await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(scenarioName);
    await CommonFunctions.compareTwoValues(bValidation3, true, `Is default scenario ${scenarioName} available under exist in scenario filters`);
    await PlanningSpace.goToManageScenarios();
    await ScenarioPage.tableActionClick(scenarioName, 'Unset as Default');
    // await ScenarioPage.clickAllScenarios();
    const dataIndex: number = await ScenarioPage.getDataIndexByColumnName('Information');
    const isRightIconExist: boolean = await ScenarioPage.verifyRightIconInScenarioTable(scenarioName, dataIndex);
    const bValidation4: boolean = await CommonFunctions.compareTwoValues(isRightIconExist, false, `Is right icon exist for scenario ${scenarioName} `);
    expect(bValidation1 && bValidation3 && bValidation4).toBeTruthy();
  })

  it('Test Case 3: Check Scenario in the  scenario filter', async () => {
    await ProcessPage.clickLeftpaneLinks('Planning');
    await browser.pause(10000);
    await scope.clickOnTab('Scenarios');
    await ScenarioPage.scenarioSelect([scenarioName], "Check");
    await browser.pause(15000);
  });

  it('Test Case 4: Validating Scenario Map', async () => {
    let isScenarioMapped: boolean = await ScenarioPage.scenarioMap([scenarioName]);
    await CommonFunctions.compareTwoValues(isScenarioMapped, true, `Is scenario ${scenarioName} mapped`);
    await expect(isScenarioMapped).toEqual(true);
  });

  it('Test Case 5: set default scenario from scenarios filters', async () => {
    await ScenarioPage.setDefaultScenarioInPlanning(scenarioName);
    await browser.pause(10000);
    await scope.clickOnTab('Scenarios');
    const isDefaultScenarioExists: boolean = await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(scenarioName);
    const bValidation1: boolean = await CommonFunctions.compareTwoValues(isDefaultScenarioExists, true, `Is default scenario ${scenarioName} available under exist in scenario filters`);
    // await ScenarioPage.clickOnScenarioFilters();
    // await ScenarioPage.clickAllScenarios();
    await browser.pause(2000);
    const isDefaultScenarioSelected: boolean = await ScenarioPage.verifyCheckBoxStateForDefaultScenario(scenarioName);
    const bValidation2: boolean = await CommonFunctions.compareTwoValues(isDefaultScenarioSelected, true, `Is default scenario ${scenarioName} checkbox disabled`);
    await PlanningSpace.goToManageScenarios();
    await ScenarioPage.tableActionClick(scenarioName, 'Unset as Default');
    // await ScenarioPage.clickAllScenarios();
    const dataIndex: number = await ScenarioPage.getDataIndexByColumnName('Information');
    const isRightIconExists: boolean = await ScenarioPage.verifyRightIconInScenarioTable(scenarioName, dataIndex);
    const bValidation3: boolean = await CommonFunctions.compareTwoValues(isRightIconExists, false, 'Is right icon exist');
    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  })

  it('Test Case 6: Uncheck the Scenario in the scenario filter', async () => {
    await ProcessPage.clickLeftpaneLinks('Planning');
    await browser.pause(10000);
    await scope.clickOnTab('Scenarios');
    await ScenarioPage.scenarioSelect([scenarioName], "Uncheck");
    await browser.pause(15000);
  });

  // it('Test Case 7: Make base scenario default', async () => {
  //   await PlanningSpace.goToManageScenarios();
  //   browser.pause(5000);
  //   const baseScenario: string = await ScenarioPage.getBaseScenario();
  //   await browser.pause(5000);
  //   // await ScenarioPage.tableActionClick(scenarioName, 'Set as Default', true);
  //   // await ScenarioPage.clickPinnedScenarios();
  //   // await browser.pause(5000);
  //   await ScenarioPage.tableActionClick(baseScenario, 'Set as Default', false);
  //   const isBaseDefault: boolean = await ScenarioPage.verifyIsDefaultScenario(baseScenario);
  //   await CommonFunctions.compareTwoValues(isBaseDefault, true, `Is base scenario ${baseScenario} set as default in Pinned tab`);
  //   await expect(isBaseDefault).toEqual(true);
  // });

  it('Test Case 8: Delete the Created Scenario', async () => {
    await PlanningSpace.goToManageScenarios();
    await browser.pause(5000);
    const bValidation: boolean = await ScenarioPage.deleteChildScenario(scenarioName)
    await CommonFunctions.compareTwoValues(bValidation, true, `delete public scenario - ${scenarioName}`)
    await expect(bValidation).toEqual(true)
  });
  // it('Test Case 7: verify set as default action in edit of scenario', async () => {
  //   await PlanningSpace.goToManageScenarios();
  //   await ScenarioPage.checkDefaultScenarioOnEdit(scenarioName);
  //   await ProcessPage.clickLeftpaneLinks('Planning');
  //   await browser.pause(10000);
  //   await scope.clickOnTab('Scenarios');
  //   const bValidation1: boolean = await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(scenarioName);
  //   await CommonFunctions.compareTwoValues(bValidation1, true, `Is default scenario ${scenarioName} available under exist in scenario filters`);
  //   await PlanningSpace.goToManageScenarios();
  //   const dataIndex: number = await ScenarioPage.getDataIndexByColumnName('Information');
  //   await ScenarioPage.tableActionClick(scenarioName, 'Unset as Default');
  //   await ScenarioPage.clickAllScenarios();
  //   const bValidation2: boolean = await ScenarioPage.verifyRightIconInScenarioTable(scenarioName, dataIndex);
  //   await CommonFunctions.compareTwoValues(bValidation2, false, 'Is right icon exist');
  //   expect(bValidation1 && !bValidation2).toBeTruthy();
  // })
})