import PlanningSpace from '../../../pageobjects/planning.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
import ProcessPage from '../../../pageobjects/process.page';
import CommonFunctions from '../../../util/common.util';
import TestUtil from '../../../util/test.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScenarioBatch/Test_013_SubprocessScenarioDefault.json");

const scenarioName = 'test_scenario_do_not_delete'

describe('User should be able to set as default and unset as default scenario in subprocess', async () => {
  before(async () => {
    await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await browser.pause(10000);
  });

  it('Test Case 1: Create a public child scenario', async () => {
    await PlanningSpace.launchContext("Sub-process", { process: TestData.PROCESS_NAME, subProcess: TestData.SUBPROCESS_NAME });
    // await scope.clickOnTab('Scenario')
    await PlanningSpace.goToManageScenarios();
    await browser.pause(5000);
    // await ScenarioPage.clickAllScenarios();
    const isScenarioExist = await ScenarioPage.ScenarioLinkVisible(scenarioName);
    if(!isScenarioExist) {
      const bValidation: boolean = await TestUtil.createPublicChildScenarioTC(scenarioName);
      await CommonFunctions.compareTwoValues(bValidation,true,`Is ${scenarioName} scenario created`);
      expect(bValidation).toBeTruthy();
    }
  })

  it('Test Case 2: verify set as default action in 3 dots menu of scenarios table in scenarios', async () => {
    await ScenarioPage.tableActionClick(scenarioName, 'Set as Default');
    await browser.pause(5000);
    // await ScenarioPage.clickAllScenarios();
    const isDefault: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.verifyIsDefaultScenario(scenarioName), true, 'Verify is default scenario - Test_013_02');
    // const isPinned: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.verifyIsScenarioUnderPinnedTab(scenarioName), true, `Verify is scenario-${scenarioName} under pinned tab - Test_013_02`); 
    expect(isDefault).toBeTruthy();
});

  it('Test Case 3: verify Unset as default action in 3 dots menu of scenarios table in scenarios', async () => {
    await ScenarioPage.tableActionClick(scenarioName, 'Unset as Default');
    await browser.pause(5000);
    // await ScenarioPage.clickAllScenarios();
    const dataIndex: number = await ScenarioPage.getDataIndexByColumnName('Information');
    const rightIcon: boolean = await ScenarioPage.verifyRightIconInScenarioTable(scenarioName, dataIndex);
    const bValidation = await CommonFunctions.compareTwoValues(rightIcon, false, `Verify there is no right icon for ${scenarioName} scenario - Test_013_03`);
    // await ScenarioPage.tableActionClick(scenarioName, 'Unpin Scenario');
    // await ScenarioPage.clickAllScenarios(); Now Default Scenario would not pin the scenario
    // const pinIcon: boolean = await ScenarioPage.verifyPinIconInScenarioTable(scenarioName, dataIndex);
    // const bValidation2 = await CommonFunctions.compareTwoValues(pinIcon, false, `Verify there is no pin icon for ${scenarioName} scenario - Test_013_03`);
    expect(bValidation).toBeTruthy();
  });
  /*
  it('Test Case 4: verify set as default from edit action', async () => {
    await ScenarioPage.tableActionClick(scenarioName, 'Edit');
    const bValidation1: boolean = await ScenarioPage.checkSetAsDefaultField();
    const bValidation2: boolean = await ScenarioPage.clickScenarioSaveButton();
    await CommonFunctions.compareTwoValues(bValidation1, true, `check set as default field for ${scenarioName} scenario - Test_013_04`);
    await CommonFunctions.compareTwoValues(bValidation2, true, `click save button for ${scenarioName} scenario - Test_013_04`);
    await browser.pause(4000);
    expect(bValidation1 && bValidation2).toBeTruthy();
    const dataIndex: number = await ScenarioPage.getDataIndexByColumnName('Information');
    await browser.pause(10000);
    const bValidation3: boolean = await ScenarioPage.verifyRightIconInScenarioTable(scenarioName, dataIndex);
    await CommonFunctions.compareTwoValues(bValidation3, true, `Is right icon exist for ${scenarioName} scenario - Test_013_04`);
    await browser.pause(10000);
    const bValidation4: boolean = await ScenarioPage.verifyIsScenarioUnderPinnedTab(scenarioName);
    await CommonFunctions.compareTwoValues(bValidation4, true, `Is ${scenarioName} scenario under pinned tab - Test_013_04`);
    expect(bValidation3 && bValidation4).toBeTruthy();
  });

  it('Test Case 5: Unset Set As Default from edit action', async () => {
    await ScenarioPage.tableActionClick(scenarioName, 'Edit');
    const bValidation1: boolean = await ScenarioPage.uncheckSetAsDefaultField();
    const bValidation2: boolean = await ScenarioPage.clickScenarioSaveButton();
    await CommonFunctions.compareTwoValues(bValidation1, true, `uncheck set as default field for ${scenarioName} scenario - Test_013_05`);
    await CommonFunctions.compareTwoValues(bValidation2, true, `click save button for ${scenarioName} scenario - Test_013_05`);
    expect(bValidation1 && bValidation2).toBeTruthy();
    await browser.pause(5000);
    await ScenarioPage.clickAllScenarios();
    const dataIndex: number = await ScenarioPage.getDataIndexByColumnName('Information');
    const bValidation3: boolean = await ScenarioPage.verifyRightIconInScenarioTable(scenarioName, dataIndex);
    await CommonFunctions.compareTwoValues(bValidation3, false, `Verify no right icon exist for ${scenarioName} scenario - Test_013_05`);
    await ScenarioPage.tableActionClick(scenarioName, 'Unpin Scenario');
    await ScenarioPage.clickAllScenarios();
    const bValidation4: boolean = await ScenarioPage.verifyPinIconInScenarioTable(scenarioName, dataIndex);
    await CommonFunctions.compareTwoValues(bValidation2, true, `Verify no pin icon exist for ${scenarioName} scenario - Test_013_05`);
    expect(!bValidation3 && !bValidation4).toBeTruthy();
  });*/
});
