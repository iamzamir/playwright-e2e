import ScenarioPage from '../../../pageobjects/scenario.page';
import PlanningSpace from '../../../pageobjects/planning.page';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScenarioBatch/Test_001_ScenarioSubsetIncremental.json");
import CommonFunctions from '../../../util/common.util';
import TestUtil from '../../../util/test.util';
import { random } from 'lodash';


describe('Scenario Creation Incremental', () => {

  const randomNumber = random(100, 1000);
  const childScenario = "Subset_Child_" + randomNumber;
  const incrementalchildScenario = "Incremental_Child_" + randomNumber;
  const subProcessChildScenario = "Subprocess_Subset_Child_" + randomNumber;
  const subProcessIncrementalchildScenario = "Subprocess_Incremental_Child_" + randomNumber;
  const assumptionChildScenario = "Assumption_Subset_Child_" + randomNumber;
  const assumptionIncrementalchildScenario = "Assumption_Incremental_Child_" + randomNumber;

  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
  });

  it('Test Case 1: Create Child Scenario, subset Scenario & Delete Scenarios - Process', async () => {
    await TestUtil.createChildScenarioFromBase(childScenario, childScenario + " Description");
    let validation1: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.isScenarioVisibleUnderALLTab(childScenario), true, "Child Scenario " + childScenario + " Created Assertion");
    await TestUtil.createChildScenarioFromChild(childScenario, incrementalchildScenario, incrementalchildScenario + " Description");
    let validation2: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.isScenarioVisibleUnderALLTab(incrementalchildScenario), true, "Incremental Child Scenario " + incrementalchildScenario + " Created Assertion")
    let isDelete: boolean = await ScenarioPage.deleteChildScenario(childScenario);
    await CommonFunctions.compareTwoValues(isDelete, true, `Is ${childScenario} scenario deleted`);
    await expect(validation1 && validation2 && isDelete).toEqual(true);
  });

  it('Test Case 2: Create Child Scenario, subset Scenario & Delete Scenarios - SubProcess', async () => {
    await PlanningSpace.navigateToPlanningSpace();
    await PlanningSpace.launchContext("Sub-process", { process: TestData.PROCESS_NAME, subProcess: TestData.SUBPROCESS_NAME });
    await TestUtil.createChildScenarioFromBase(subProcessChildScenario, subProcessChildScenario + " Description");
    let validation1: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.isScenarioVisibleUnderALLTab(subProcessChildScenario), true, "Child Scenario " + subProcessChildScenario + " Created Assertion");
    await TestUtil.createChildScenarioFromChild(subProcessChildScenario, subProcessIncrementalchildScenario, subProcessIncrementalchildScenario + " Description");
    let validation2: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.isScenarioVisibleUnderALLTab(subProcessIncrementalchildScenario), true, "Incremental Child Scenario " + subProcessIncrementalchildScenario + " Created Assertion")
    let isDelete: boolean = await ScenarioPage.deleteChildScenario(subProcessChildScenario);
    await CommonFunctions.compareTwoValues(isDelete, true, `Is ${subProcessChildScenario} scenario deleted`);
    await expect(validation1 && validation2 && isDelete).toEqual(true);
  });

  it('Test Case 3: Create Child Scenario, subset Scenario & Delete Scenarios - Assumption', async () => {
    await PlanningSpace.navigateToPlanningSpace();
    await PlanningSpace.launchContext("Assumption", { origin: TestData.PROCESS_NAME, assumption: TestData.ASSUMPTION_NAME });
    await TestUtil.createChildScenarioFromBase(assumptionChildScenario, assumptionChildScenario + " Description");
    let validation1: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.isScenarioVisibleUnderALLTab(assumptionChildScenario), true, "Child Scenario " + assumptionChildScenario + " Created Assertion");
    await TestUtil.createChildScenarioFromChild(assumptionChildScenario, assumptionIncrementalchildScenario, assumptionIncrementalchildScenario + " Description");
    let validation2: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.isScenarioVisibleUnderALLTab(assumptionIncrementalchildScenario), true, "Incremental Child Scenario " + assumptionIncrementalchildScenario + " Created Assertion")
    let isDelete: boolean = await ScenarioPage.deleteChildScenario(assumptionChildScenario);
    await CommonFunctions.compareTwoValues(isDelete, true, `Is ${assumptionChildScenario} scenario deleted`);
    await expect(validation1 && validation2 && isDelete).toEqual(true);
  });


});