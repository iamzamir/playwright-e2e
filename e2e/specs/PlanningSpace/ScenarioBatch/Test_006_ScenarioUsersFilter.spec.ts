const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScenarioBatch/Test_006_ScenarioUsersFilter.json");
import PlanningSpace from "../../../pageobjects/planning.page";
import ScenarioPage from '../../../pageobjects/scenario.page';
import CommonFunctions from "../../../util/common.util";
import TestUtil from '../../../util/test.util';

describe('Scenario Users Filter (All Entities)', () => {
  const entities = [
    {
      name: "Process",
      launchContext: async () => {
        // Already logged in with process context
      },
      privateScenarioName: 'test_private_scenario_do_not_delete'
    },
    {
      name: "Sub-process",
      launchContext: async () => {
        await PlanningSpace.navigateToPlanningSpace();
        await PlanningSpace.launchContext("Sub-process", {
          process: TestData.PROCESS_NAME,
          subProcess: TestData.SUBPROCESS_NAME
        });
      },
      privateScenarioName: 'test_private_scenario_do_not_delete'
    },
    {
      name: "Assumption",
      launchContext: async () => {
        await PlanningSpace.navigateToPlanningSpace();
        await PlanningSpace.launchContext("Assumption", {
          origin: TestData.PROCESS_NAME,
          assumption: TestData.ASSUMPTION_NAME
        });
      },
      privateScenarioName: 'Private_test_assumption_do_not_delete'
    }
  ];

  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(
      TestData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      TestData.PROCESS_NAME
    );
  });

  entities.forEach(({ name, launchContext, privateScenarioName }) => {
    let currentLoginUser: string = TestData.LOGGEDIN_USER;
    const userAvthar = TestData.USER_AVATAR;

    it(`${name} - Test Case 1: Verify user login`, async () => {
      await launchContext();
      await PlanningSpace.goToManageScenarios();
      await browser.pause(5000);
      const user = await ScenarioPage.getCurrentLoginUserName();
      const bValidation: boolean = await CommonFunctions.compareTwoValues(user, "PA", `Is user exist`);
      expect(bValidation).toBeTruthy();
    });

    it(`${name} - Test Case 2: Create a private child scenario`, async () => {
      await PlanningSpace.switchToMFEFrame();
      const isScenarioExist = await ScenarioPage.ScenarioLinkVisible(privateScenarioName);
      if (!isScenarioExist) {
        let Validation1: boolean = await TestUtil.createChildScenarioFromBase(privateScenarioName, privateScenarioName + " Description", 'Private', 'Uncheck', false, false, false);
        let Validation2: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.isScenarioVisibleUnderALLTab(privateScenarioName), true, "Child Scenario " + privateScenarioName + " Created Assertion");
        await expect(Validation1 && Validation2).toEqual(true);
      }
    });

    it(`${name} - Test Case 3: Verify created child scenario is by correct user`, async () => {
      const columnName: string = 'Created By';
      const bValidation: boolean = await ScenarioPage.verifyScenarioCreatedByUser(userAvthar, privateScenarioName, columnName);
      await CommonFunctions.compareTwoValues(bValidation, true, `${privateScenarioName} scenario is created by ${userAvthar}`);
      await expect(bValidation).toEqual(true);
    });

    it(`${name} - Test Case 4: Verify users filter`, async () => {
      await ScenarioPage.clickResetButton();
      await ScenarioPage.selectOrUnselectFilter('Created By', currentLoginUser);
      await ScenarioPage.clickApplyFilters();
      await browser.pause(5000);
      const bValidation: boolean = await ScenarioPage.verifyUserFilterApplied([userAvthar]);
      await CommonFunctions.compareTwoValues(bValidation, true, `Fetched scenarios for the ${userAvthar}`);
      await expect(bValidation).toEqual(true);
    });

  });
});