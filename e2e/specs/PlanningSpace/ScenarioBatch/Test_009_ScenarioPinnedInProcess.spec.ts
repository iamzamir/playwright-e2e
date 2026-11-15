import PlanningSpace from "../../../pageobjects/planning.page";
import scenarioPage from "../../../pageobjects/scenario.page";
import ProcessPage from "../../../pageobjects/process.page";
import CommonFunctions from "../../../util/common.util";
import TestUtil from "../../../util/test.util";

const env = process.env.ENVIRONMENT || process.env.PSENV || "INTEROP";
const TestData = require("../../../Testdata/" + env + "/PlanningSpace/ScenarioBatch/Test_009_ScenarioPinnedInProcess.json");

const testConfigs = [
  {
    contextName: "Process",
    scenarioName: "Scenario_pin_test",
    login: async () => {
      await PlanningSpace.navigateToPlanningSpace();
      await PlanningSpace.loginToPlanningSpaceWithProcess(
        TestData.REALM_NAME,
        process.env.FUNCTIONAL_TEST_USERNAME as string,
        process.env.FUNCTIONAL_TEST_PASSWORD as string,
        TestData.PROCESS_NAME
      );
    }
  },
  {
    contextName: "Subprocess",
    scenarioName: "test_scenario_do_not_delete",
    login: async () => {
      await PlanningSpace.navigateToPlanningSpace();
      await PlanningSpace.loginToPlanningSpace(
        TestData.REALM_NAME,
        process.env.FUNCTIONAL_TEST_USERNAME as string,
        process.env.FUNCTIONAL_TEST_PASSWORD as string
      );
      await PlanningSpace.launchContext("Sub-process", {
        process: TestData.PROCESS_NAME,
        subProcess: TestData.SUBPROCESS_NAME
      });
    }
  }
];

testConfigs.forEach(({ contextName, scenarioName, login }) => {
  describe(`${contextName}: User should be able to pin and unpin scenario`, () => {
    let dataIndex: number;
    let isPinnedInitially: boolean = false;

    before(async () => {
      await browser.reloadSession();
      await login();
      await PlanningSpace.goToManageScenarios();
    });

    it('Test Case 1: Create a public child scenario and determine initial state', async () => {
      await scenarioPage.clickAllScenarios();
      const isScenarioExist = await scenarioPage.ScenarioLinkVisible(scenarioName);
      if (!isScenarioExist) {
        const bValidation = await TestUtil.createPublicChildScenarioTC(scenarioName);
        await CommonFunctions.compareTwoValues(bValidation, true, `Is ${scenarioName} scenario created`);
        expect(bValidation).toBeTruthy();
      }
      dataIndex = await scenarioPage.getDataIndexByColumnName('Information');
      isPinnedInitially = await scenarioPage.verifyPinIconInScenarioTable(scenarioName, dataIndex);
    });

    it('Test Case 2: Pin Scenario', async () => {
      await scenarioPage.clickAllScenarios();
      if (!isPinnedInitially) {
        await pinScenario(scenarioName, dataIndex);
      } else {
        // If already pinned, unpin first to ensure test is robust
        await unpinScenario(scenarioName, dataIndex);
        await pinScenario(scenarioName, dataIndex);
      }
    });

    it('Test Case 3: Unpin Scenario', async () => {
      await scenarioPage.clickAllScenarios();
      await unpinScenario(scenarioName, dataIndex);
    });

    it('Test Case 4: Make scenario default, then pin it and verify in ALL and PINNED tabs', async () => {
      await scenarioPage.clickAllScenarios();
      await browser.pause(2000);
      const isDefault = await scenarioPage.verifyIsDefaultScenario(scenarioName);
      if (isDefault) {
          await scenarioPage.tableActionClick(scenarioName, 'Unset as Default');
          await scenarioPage.clickAllScenarios();
          await browser.pause(2000);
      }
      await scenarioPage.tableActionClick(scenarioName, 'Set as Default');
      await scenarioPage.tableActionClick(scenarioName, 'Pin Scenario');
      await browser.pause(2000);
      const isStillDefaultInAllTab = await scenarioPage.verifyIsDefaultScenario(scenarioName);
      const isPinnedInAllTab = await scenarioPage.verifyPinIconInScenarioTable(scenarioName, dataIndex);
      await CommonFunctions.compareTwoValues(isStillDefaultInAllTab, true, `Is ${scenarioName} scenario still default in the ALL tab`);
      await CommonFunctions.compareTwoValues(isPinnedInAllTab, true, `Is ${scenarioName} scenario pinned in the ALL tab`);
      await scenarioPage.clickPinnedScenarios();
      const isDefaultInPinnedTab = await scenarioPage.verifyIsDefaultScenario(scenarioName);
      const isPinnedInPinnedTab = await scenarioPage.verifyPinIconInScenarioTable(scenarioName, dataIndex);
      await CommonFunctions.compareTwoValues(isDefaultInPinnedTab, true, `Is ${scenarioName} scenario default in the PINNED tab`);
      await CommonFunctions.compareTwoValues(isPinnedInPinnedTab, true, `Is ${scenarioName} scenario pinned in the PINNED tab`);
      await scenarioPage.tableActionClick(scenarioName, 'Unset as Default');
      await scenarioPage.tableActionClick(scenarioName, 'Unpin Scenario');
      expect(
        isStillDefaultInAllTab &&
        isPinnedInAllTab &&
        isDefaultInPinnedTab &&
        isPinnedInPinnedTab
      ).toBeTruthy();
    });

    async function pinScenario(scenarioName: string, dataIndex: number) {
      await CommonFunctions.logMessage("INFO", "Pin Scenario");
      await scenarioPage.tableActionClick(scenarioName, 'Pin Scenario');
      await browser.pause(5000);
      const bValidation1 = await scenarioPage.verifyPinIconInScenarioTable(scenarioName, dataIndex);
      await CommonFunctions.compareTwoValues(bValidation1, true, `Is pin icon exist for ${scenarioName} scenario`);
      const bValidation2 = await scenarioPage.verifyIsScenarioUnderPinnedTab(scenarioName);
      await CommonFunctions.compareTwoValues(bValidation2, true, `Is ${scenarioName} scenario under pinned tab`);
      expect(bValidation1 && bValidation2).toBeTruthy();
    }

    async function unpinScenario(scenarioName: string, dataIndex: number) {
      await CommonFunctions.logMessage("INFO", "Unpin Scenario");
      await scenarioPage.tableActionClick(scenarioName, 'Unpin Scenario');
      await browser.pause(5000);
      const bValidation1 = await scenarioPage.verifyPinIconInScenarioTable(scenarioName, dataIndex);
      await CommonFunctions.compareTwoValues(bValidation1, false, `Is pin icon exist for ${scenarioName} scenario`);
      const bValidation2 = await scenarioPage.verifyIsScenarioUnderPinnedTab(scenarioName);
      await CommonFunctions.compareTwoValues(bValidation2, false, `Is ${scenarioName} scenario under pinned tab`);
      expect(!bValidation1 && !bValidation2).toBeTruthy();
    }
  });
});