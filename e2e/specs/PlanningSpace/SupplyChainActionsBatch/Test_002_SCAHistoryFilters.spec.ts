import SupplyChainAction from '../../../pageobjects/supply-chain-action.page';
import PlanningSpace from '../../../pageobjects/planning.page';
import ProcessPage from '../../../pageobjects/process.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
import CommonFunctions from '../../../util/common.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/SupplyChainActionsBatch/Test_002_SCAHistoryFilters.json");
// import TestData from '../../../Testdata/PlanningSpace/SupplyChainActionsBatch/Test_002_SCAHistoryFilters.json';


describe('Supply Chain Procedures - History Filters', () => {

  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
  });

  it('Test case 1 - Verify Base scenario name in Supply Chain Procedures - History page', async () => {
    await PlanningSpace.goToManageScenarios();
    await browser.pause(5000);
    const baseScenario = await ScenarioPage.getBaseScenario();
    await ProcessPage.clickLeftpaneLinks("Supply Chain Procedures - History");
    await browser.pause(5000);
    const scenarioNames: string[] = await SupplyChainAction.getAllValuesInaColumnValue('Related Scenario');
    const validation = await CommonFunctions.compareTwoValues(scenarioNames.includes(baseScenario), true, "Base Scenario name is displayed in Supply Chain Procedures - History page");
    await expect(validation).toEqual(true);
  });

  it('Test case 1 - Filter With Status', async () => {  
    await SupplyChainAction.selectFilter('Status', TestData.SELECT_STATUS);
    await SupplyChainAction.clickApplyButton()
    let arrStatus: string[] = await SupplyChainAction.getAllValuesInaColumnValue("Status");
    let bStatus: boolean = true;
    for (let i = 0; i < arrStatus.length; i++) {
      if (arrStatus[i] != TestData.EXPECTED_STATUS) {
        bStatus = false;
        break;
      }
    }

    let bValidation: boolean = await CommonFunctions.compareTwoValues(bStatus, true, "Filter With Status Complete records display Assertion")
    await expect(bValidation).toEqual(true);
  });

  it('Test case 2 - Filter With Procedure Type', async () => {
    await SupplyChainAction.selectFilter('Procedure Type', TestData.SELECT_PROCEDURE_NAME);
    await SupplyChainAction.clickApplyButton();
    let arrProcedureName: string[] = await SupplyChainAction.getAllValuesInaColumnValue("Procedure Name");
    let bProcedureName: boolean = true;
    for (let i = 0; i < arrProcedureName.length; i++) {
      if (arrProcedureName[i] != TestData.EXPECTED_PROCEDURE_NAME) {
        bProcedureName = false;
        break;
      }
    }
    let bValidation: boolean = await CommonFunctions.compareTwoValues(bProcedureName, true, "Filter With Procedure Type - Create Scenario Snowflake records display Assertion")
    await expect(bValidation).toEqual(true);
  });


});
