import PlanningSpace from "../../../pageobjects/planning.page";
import ScenarioPage from '../../../pageobjects/scenario.page';
import ProcessPage from '../../../pageobjects/process.page';
import CommonFunctions from "../../../util/common.util";

const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScenarioBatch/Test_003_ScenarioVisibilityFilter.json");

describe('Scenario Visibility Filter (All Entities)', () => {
  const entities = [
    {
      name: 'Subprocess',
      launchContext: async () => {
        await PlanningSpace.navigateToPlanningSpace();
        await PlanningSpace.launchContext("Sub-process", {
          process: TestData.PROCESS_NAME,
          subProcess: TestData.SUBPROCESS_NAME
        });
        await PlanningSpace.goToManageScenarios();
      },
      privateScenarioName: 'test_private_scenario_do_not_delete',
      publicScenarioName: 'test_scenario_do_not_delete'
    },
    {
      name: 'Assumption',
      launchContext: async () => {
        await PlanningSpace.navigateToPlanningSpace();
        await PlanningSpace.launchContext("Assumption", {
          origin: TestData.PROCESS_NAME,
          assumption: TestData.ASSUMPTION_NAME
        });
        await PlanningSpace.goToManageScenarios();
      },
      privateScenarioName: 'Private_test_assumption_do_not_delete',
      publicScenarioName: 'Public_test_assumption_do_not_delete'
    }
  ];

  before(async () => {
    await PlanningSpace.loginToPlanningSpace(
      TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string
    );
  });

  entities.forEach(({ name, launchContext, privateScenarioName, publicScenarioName }) => {
    let baseScenario: string;

    it(`${name} - Test Case 1: Create a private child scenario`, async () => {
      await launchContext();
      await browser.pause(5000);
      // await ScenarioPage.clickAllScenarios();
      const isScenarioExist = await ScenarioPage.ScenarioLinkVisible(privateScenarioName);
      if (!isScenarioExist) {
        baseScenario = await ScenarioPage.getBaseScenario();
        await ScenarioPage.tableActionClick(baseScenario, 'Create Child Scenario');
        await ScenarioPage.createScenario(privateScenarioName);
        await ScenarioPage.clickResetButton();
        const bValidation: boolean = await ScenarioPage.isScenarioCreated(privateScenarioName);
        await CommonFunctions.compareTwoValues(bValidation, true, `Private scenario - ${privateScenarioName} creation`);
        await expect(bValidation).toEqual(true);
        await browser.pause(60000);
      }
    });

    it(`${name} - Test Case 2: Create a public child scenario`, async () => {
      // await ScenarioPage.clickAllScenarios();
      const isScenarioExist = await ScenarioPage.ScenarioLinkVisible(publicScenarioName);
      if (!isScenarioExist) {
        await ScenarioPage.tableActionClick(baseScenario, 'Create Child Scenario');
        await ScenarioPage.createPublicScenario(publicScenarioName);
        await ScenarioPage.clickResetButton();
        const bValidation: boolean = await ScenarioPage.isScenarioCreated(publicScenarioName);
        await CommonFunctions.compareTwoValues(bValidation, true, `Public scenario - ${publicScenarioName} creation`);
        await expect(bValidation).toEqual(true);
        await browser.pause(60000);
      }
    });

    it(`${name} - Test Case 3: Filter With Private Visibility`, async () => {
      const filterToApply = 'Private';
      // await ScenarioPage.clickAllScenarios();
      await ScenarioPage.selectFilter(filterToApply);
      await ScenarioPage.clickApplyFilters();
      await browser.pause(5000);
      const columnValues: string[] = await ScenarioPage.getScenariosTableDataByColumnName('Visibility');
      const bValidation = await ScenarioPage.verifyFilterApplied(filterToApply, columnValues);
      await CommonFunctions.compareTwoValues(bValidation, true, `Private filter validation`);
      await expect(bValidation).toEqual(true);
    });

    it(`${name} - Test Case 4: Filter With Public Visibility`, async () => {
      const filterToApply = 'Public';
      // await ScenarioPage.clickAllScenarios();
      await ScenarioPage.selectFilter(filterToApply);
      await ScenarioPage.clickApplyFilters();
      await browser.pause(5000);
      const columnValues: string[] = await ScenarioPage.getScenariosTableDataByColumnName('Visibility');
      const bValidation = await ScenarioPage.verifyFilterApplied(filterToApply, columnValues);
      await CommonFunctions.compareTwoValues(bValidation, true, `Public filter validation`);
      await expect(bValidation).toEqual(true);
    });

    it(`${name} - Test Case 5: Filter With All Visibility`, async () => {
      const filterToApply = 'All';
      // await ScenarioPage.clickAllScenarios();
      await ScenarioPage.selectFilter(filterToApply);
      await ScenarioPage.clickApplyFilters();
      await browser.pause(5000);
      const columnValues: string[] = await ScenarioPage.getScenariosTableDataByColumnName('Visibility');
      const bValidation = await ScenarioPage.verifyFilterApplied(filterToApply, columnValues);
      await CommonFunctions.compareTwoValues(bValidation, true, `All filter validation`);
      await expect(bValidation).toEqual(true);
    });
  });
});
