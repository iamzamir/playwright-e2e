import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScenarioBatch/Test_033_ManageScenariosDialog.json");

describe("Scenario Manage - Planning Space", () => {

  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(
      TestData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      TestData.PROCESS_NAME
    );
  });

  it("Test Case 1: Open Manage Scenarios dialog and verify Description column", async () => {
    await PlanningSpace.openManageScenarios();

    const isVisible = await PlanningSpace.isManageScenariosDialogVisible();
    const visibilityValidation = await CommonFunctions.compareTwoValues(
      isVisible,
      true,
      "Manage Scenarios dialog should be visible"
    );
    expect(visibilityValidation).toEqual(true);

    // Verify Description column header is present in ScenarioTable
    const hasDescription = await PlanningSpace.isDescriptionColumnVisible();
    const descriptionValidation = await CommonFunctions.compareTwoValues(
      hasDescription,
      true,
      "Description column should be visible in Manage Scenarios"
    );
    expect(descriptionValidation).toEqual(true);

    await CommonFunctions.logMessage(
      "INFO",
      "Manage Scenarios dialog opened; Description column present"
    );
  });
});
