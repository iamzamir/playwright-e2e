import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ViewSearch/Test_001_ViewSearchForProcess.json");

describe("View Search for Process", () => {
  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    await PlanningSpace.selectViewByType('All Views');
  });

  it("Test Case 1: Should navigate to the filtered view", async () => {
    let finalResult = true;
    const isSearchResultFound = await PlanningSpace.triggerDockSearchInput(TestData.VIEW_NAME);
    await CommonFunctions.compareTwoValues(isSearchResultFound, true, `Search Result for ${TestData.VIEW_NAME} is found`);
    await $('body').moveTo(); // Dock is popping up continuously, so added this
    finalResult = finalResult && isSearchResultFound;

    const isNavigated = await PlanningSpace.navigateToView(TestData.VIEW_NAME);
    await CommonFunctions.compareTwoValues(isNavigated, true, `Successfully navigated to the filtered view: ${TestData.VIEW_NAME}`);
    finalResult = finalResult && isNavigated;
    await CommonFunctions.logMessage("INFO", "Test case 1: Successfully navigated to the filtered view"); 

    expect(finalResult).toBe(true);
  });

  it("Test Case 2: Should not Navigate for hidden View", async () => {
    let finalResult = true;

    await PlanningSpace.switchToMFEFrame();
    await PlanningSpace.selectViewByType('Hidden Views');
    const isSearchResultFound = await PlanningSpace.triggerDockSearchInput(TestData.HIDDEN_VIEW_NAME, true);
    await CommonFunctions.compareTwoValues(!isSearchResultFound, true, `Search Result for ${TestData.HIDDEN_VIEW_NAME} is not found`);
    finalResult = finalResult && !isSearchResultFound;

    const isNavigated = await PlanningSpace.navigateToView(TestData.HIDDEN_VIEW_NAME, true);
    await CommonFunctions.compareTwoValues(!isNavigated, true, `View is hidden; navigation should not be possible: ${TestData.HIDDEN_VIEW_NAME}`);
    finalResult = finalResult && !isNavigated;
    await CommonFunctions.logMessage("INFO", "Test case 2: Successfully prevented navigation to hidden view"); 

    expect(finalResult).toBe(true);
  });
});
