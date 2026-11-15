import CommonFunctions from "../../../util/common.util";
import ScenarioPage from '../../../pageobjects/scenario.page';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScenarioBatch/Test_014_BasescenarioShouldBeDefaultIfNoDefaultScenario.json");
// import TestData from "../../../Testdata/PlanningSpace/ScenarioBatch/Test_014_BasescenarioShouldBeDefaultIfNoDefaultScenario.json";
import PlanningSpace from '../../../pageobjects/planning.page';
import TestUtil from "../../../util/test.util";

describe("Base scenario should be shown as default if the user doesnt have any default scenario", () => {
  let baseScenario: string;
  const random_name = Math.floor(1000 + Math.random() * 9000);
  const scenarioName = 'Public_test' + random_name;

  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
  })

  it('Test Case 1: Create Child Scenario', async () => {
    let validation: boolean = await TestUtil.createChildScenarioFromProcedure("Create Scenario", scenarioName, 'Public Scenario', 'Public', 'Uncheck');
    await expect(validation).toEqual(true);
  });

  it('Test Case 2: Set the child Scenario as default', async () => {
    const dataIndex: number = await ScenarioPage.getDataIndexByColumnName('Information');
    await ScenarioPage.editScenarioItemIsDefault(scenarioName);
    await browser.pause(10000);
    const bValidation1: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.verifyRightIconInScenarioTable(scenarioName, dataIndex), true, `Is right icon exist for ${scenarioName} scenario`);
    // const bValidation2: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.verifyPinIconInScenarioTable(scenarioName, dataIndex), false, `Is pin icon exist for ${scenarioName} scenario`);
    // const bValidation3: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.verifyIsScenarioUnderPinnedTab(scenarioName), false, `Is ${scenarioName} scenario under pinned tab`);
    expect(bValidation1).toBeTruthy();
  });

  it('Test Case 3: Delete the child scenario', async () => {
    baseScenario = await ScenarioPage.getBaseScenario();
    let isDelete: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.deleteChildScenario(scenarioName), true, `Is ${scenarioName} scenario deleted`);
    await browser.pause(10000);
    await expect(isDelete).toBeTruthy();
  });

  it('Test Case 4: Base Scenario Should be Default', async () => {
    const dataIndex: number = await ScenarioPage.getDataIndexByColumnName('Information');
    const bValidation1: boolean = await ScenarioPage.verifyRightIconInScenarioTable(baseScenario, dataIndex);
    await CommonFunctions.compareTwoValues(bValidation1, true, `Is right icon(default) exist for ${baseScenario} scenario`);
    // const bValidation2: boolean = await ScenarioPage.verifyPinIconInScenarioTable(baseScenario, dataIndex);
    // await CommonFunctions.compareTwoValues(bValidation2, true, `Is pin icon exist for ${baseScenario} scenario`);
    await expect(bValidation1).toBeTruthy();
  });

})