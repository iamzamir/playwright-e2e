import SupplyChainAction from '../../../pageobjects/supply-chain-action.page';
import CommonFunctions from '../../../util/common.util';
import PlanningSpace from '../../../pageobjects/planning.page';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/SupplyChainActionsBatch/Test_003_SCPWizardLayout.json");
// import TestData from '../../../Testdata/PlanningSpace/SupplyChainActionsBatch/Test_003_SCPWizardLayout.json';
import ProcessPage from '../../../pageobjects/process.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
import SNAConfigurePage from "../../../pageobjects/actors-and-procedures.page";

describe('Supply Chain Procedures - Create Scenario', () => {

  let defaultScenario: string;

  const random_name = Math.floor(1000 + Math.random() * 9000);
  const scenario_desc = 'Description for wizard layout in SCA ' + random_name;
  const scenario_name = 'SCA_wizard_scenario_' + random_name;

  before(async () => {
    await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
  });

  
//   it(`Test Case 1: Is UI config set for ${TestData.PROCEDURE_NAME} procedure`, async () => {
//     await PlanningSpace.navToSNA();
//     const metaData = JSON.stringify(TestData.UICONFIG_METADATA);
//     const isMetaDataSetForProcedure = await SNAConfigurePage.setMetaDataForProcedure(TestData.PROCEDURE_NAME, metaData);
//     await browser.pause(5000);
//     await CommonFunctions.compareTwoValues(isMetaDataSetForProcedure, true, `Is UICONFIG set for ${TestData.PROCEDURE_NAME} procedure`);
//     expect(isMetaDataSetForProcedure).toBeTruthy();
// });

  it('Test Case 2: Validate default scenario name in create scenario', async () => {
    await browser.pause(10000);
    await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
    await PlanningSpace.switchToMFEFrame();
    await PlanningSpace.goToManageScenarios();
    await ScenarioPage.setBaseAsDefaultScenario();
    defaultScenario = await ScenarioPage.getDefaultScenario();
    await PlanningSpace.closeManageScenarios();
    await PlanningSpace.selectSupplyChainProceduresAction(TestData.PROCEDURE_NAME);
    const bValidation = await SupplyChainAction.verifyDefaultScenario(defaultScenario);
    await CommonFunctions.compareTwoValues(bValidation, true, `verify default scenario name - ${defaultScenario}`);
    expect(bValidation).toEqual(true);
    await browser.pause(4000)
  });

  it('Test Case 3: Create a public scenario through SCP and verify alert messages', async () => {
    await ScenarioPage.createChildScenario(scenario_name,scenario_desc,'Public','Uncheck', true, true);
    const running = await CommonFunctions.verifyAlertMsg("running");
    await CommonFunctions.compareTwoValues(running, true, 'verify alert')
    await browser.pause(4000)
    const success = await CommonFunctions.verifyAlertMsg('success');
    await CommonFunctions.compareTwoValues(success, true, 'success')
    expect(running && success).toEqual(true);
  })

  it('Test Case 4: Delete a public scenario', async () => {
    await browser.pause(10000);
    await PlanningSpace.goToManageScenarios();
    await browser.pause(4000);
    const bValidation: boolean = await ScenarioPage.deleteChildScenario(scenario_name)
    await CommonFunctions.compareTwoValues(bValidation, true, `delete public scenario - ${scenario_name}`)
    await expect(bValidation).toEqual(true)
  })

});
