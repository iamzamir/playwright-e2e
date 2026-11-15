import PlanningSpace from '../../../pageobjects/planning.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
import TestUtil from '../../../util/test.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScenarioBatch/Test_011_AssumptionScenarioAction.json");
// import TestData from "../../../Testdata/PlanningSpace/ScenarioBatch/Test_011_AssumptionScenarioAction.json"
import CommonFunctions from '../../../util/common.util';

describe('Scenario Actions - Assumptions', () => {

  const random_name = Math.floor(1000 + Math.random() * 9000);
  const publicScenarioName = 'Private_test_' + random_name;

  before(async () => {
    await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await PlanningSpace.launchContext("Assumption", { origin: TestData.PROCESS_NAME, assumption: TestData.AASSUMPTION_NAME });
  })

  it('Test Case 1: Create Child Scenario', async () => {
    let Validation1: boolean = await TestUtil.createChildScenarioFromBase(publicScenarioName, publicScenarioName + " Description");
    let Validation2: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.isScenarioVisibleUnderALLTab(publicScenarioName), true, "Child Scenario " + publicScenarioName + " Created Assertion");
    await expect(Validation1 && Validation2).toEqual(true);
  });

  it('Test Case 2: Edit Child Scenario', async () => {
    const dataIndex: number = await ScenarioPage.getDataIndexByColumnName('Information');
    await ScenarioPage.editScenarioItemIsDefault(publicScenarioName);
    const bValidation: boolean = await ScenarioPage.verifyRightIconInScenarioTable(publicScenarioName, dataIndex);
    await CommonFunctions.compareTwoValues(bValidation, true, `Is right icon exist for ${publicScenarioName} scenario`);
    expect(bValidation).toBeTruthy();
  });
  
  it('Test Case 3: Delete Child Scenario', async () => {
    let isDelete: boolean = await ScenarioPage.deleteChildScenario(publicScenarioName);
    await CommonFunctions.compareTwoValues(isDelete, true, `Is ${publicScenarioName} scenario deleted`);
    await expect(isDelete).toBeTruthy();
  });
});
