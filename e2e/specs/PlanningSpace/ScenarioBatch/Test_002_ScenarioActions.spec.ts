import PlanningSpace from '../../../pageobjects/planning.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
import TestUtil from '../../../util/test.util';
import ProcessPage from '../../../pageobjects/process.page';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScenarioBatch/Test_002_ScenarioActions.json");
import CommonFunctions from '../../../util/common.util';
import { random } from 'lodash';
import ScopePage from '../../../pageobjects/scope.page';

describe('Scenario Actions', () => {

  const randomNumber1 = random(100, 1000);
  const randomNumber2 = random(100, 1000);
  const childScenario = "Scenario_Actions_" + randomNumber1;
  const childScenarioEdited1 = "Scenario_Actions_Edited_" + randomNumber1;
  const description1 = `Description Edit 1_${randomNumber1}`;
  const baseScenarioName = "Base_Scenario_" + randomNumber2;

  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
  });

  it('Test Case 1: Edit Base Scenario name', async () => {
    await PlanningSpace.goToManageScenarios();
    await browser.pause(5000);
    const baseScenario = await ScenarioPage.getBaseScenario();
    await ScenarioPage.tableActionClick(baseScenario, 'Edit');
    await ScenarioPage.setScenarioName(baseScenarioName);
    let bValidation1: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.clickScenarioSaveButton(), true, "Edit Base Scenario " + baseScenarioName + " Success Assertion");  
    expect(bValidation1).toEqual(true);
    await browser.pause(2000);
  });

  it('Test Case 2: Create Child Scenario 1', async () => {
    await PlanningSpace.closeManageScenarios();
    let validation: boolean = await TestUtil.createChildScenarioFromProcedure("Create Scenario", childScenario, childScenario + " Description", 'Public', 'Uncheck', true, true, false);
    expect(validation).toEqual(true);
  });

  it('Test Case 3: Edit Child Scenario', async () => {
    await ScenarioPage.tableActionClick(childScenario, "Edit");
    const bValidation1: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.isScenarioNameFieldEnabled(), true, 'Scenario name field should be Enabled');
    const bValidation2: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.isChildofInpFieldDisabled(), true, 'Child of field should be disabled');
    const bValidation3: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.isDefaultCheckBoxEnabled(), false, 'Set as Default checkbox should be disabled');
    const bValidation4: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.isPublicRadioBtnEnabled(), false, 'Public radio button should be disabled');
    const bValidation5: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.isPublicRadioBtnEnabled(), false, 'Private radio button should be disabled');
    const bValidation6: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.isScenarioDescFieldEnabled(), true, 'Scenario description field should be Enabled');
    await ScenarioPage.setScenarioName(childScenarioEdited1);
    await ScenarioPage.setScenarioDesciption(description1);
    let bValidation7: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.clickScenarioSaveButton(), true, "Edit Child Scenario " + childScenario + " Success Assertion");
    // check in scenario page that the base scenario name and child scenario name are changed
    await browser.pause(2000);
    const scenarioNames: string[] = await ScenarioPage.getScenarioNames();
    const bValidation8: boolean = await CommonFunctions.compareTwoValues(scenarioNames.includes(baseScenarioName), true, "Base Scenario name is changed to " + baseScenarioName);
    const bValidation9: boolean = await CommonFunctions.compareTwoValues(scenarioNames.includes(childScenarioEdited1), true, "Child Scenario name is changed to " + childScenarioEdited1);
    // open edit, check the base scenario name is updated, cancel the edit
    await ScenarioPage.tableActionClick(baseScenarioName, "Edit");
    const bValidation10: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.getScenarioName(), baseScenarioName, "Base Scenario name is changed to " + baseScenarioName);
    await ScenarioPage.clickScenarioCancelButton();
    await browser.keys('Escape');
    await browser.pause(3000);
    // open edit, check the child scenario name is updated, cancel the edit
    await ScenarioPage.tableActionClick(childScenarioEdited1, "Edit", false);
    const bValidation11: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.getScenarioName(), childScenarioEdited1, "Child Scenario name is changed to " + childScenarioEdited1);
    await ScenarioPage.clickScenarioCancelButton();
    await browser.keys('Escape');
    await expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation9 && bValidation10 && bValidation11).toEqual(true);
  });

  it('Test Case 4: Verify the scenario names are updated in Planning page', async () => {
    await PlanningSpace.closeManageScenarios();
    await browser.pause(5000);
    await ScopePage.clickOnTab("Scenarios");
    const bValidation1 = await ScenarioPage.verifyScenarioNameInPSFilter(baseScenarioName);
    const bValidation2 = await ScenarioPage.verifyScenarioNameInPSFilter(childScenarioEdited1);
    await ScenarioPage.clickScenarioFilterCloseButton();
    expect(bValidation1 && bValidation2).toEqual(true);
  });

  it('Test Case 5: Verify the scenario names are updated in childOf tree', async () => {
    await PlanningSpace.selectSupplyChainProceduresAction('CreateScenarioPopup');
    await browser.pause(5000);
    const bValidation1 = await ScenarioPage.verifyScenarioNameInChildOfTree(baseScenarioName, childScenarioEdited1);
    await browser.keys('Escape');
    await PlanningSpace.closePopupModal();
    expect(bValidation1).toEqual(true);
  });

  it('Test Case 6: Delete Child Scenarios', async () => {
    await PlanningSpace.goToManageScenarios();
    await browser.pause(5000);
    let isDelete: boolean = await ScenarioPage.deleteChildScenario(childScenarioEdited1);
    await CommonFunctions.compareTwoValues(isDelete, true, `Is ${childScenarioEdited1} scenario deleted`);
    await expect(isDelete).toEqual(true);
  });

});
