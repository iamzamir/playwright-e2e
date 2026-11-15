import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ViewSearch/Test_003_ViewSearchForAssumption.json");

describe("View Search for Assumption", () => {

    before(async () => {
      await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
      await PlanningSpace.launchContext('Assumption', { origin: TestData.PROCESS_NAME, assumption: TestData.ASSUMPTION.ASSUMPTION_NAME });
      await browser.pause(5000);
      await PlanningSpace.selectViewByType('All Views');
    });

  it("Should navigate to the filtered view in ASSUMPTION context", async () => {
    let finalResult = true;
    const isSearchResultFound = await PlanningSpace.triggerDockSearchInput(TestData.ASSUMPTION_VIEW_NAME);
         await $('body').moveTo(); // Dock is popping up continuously, so added this
    await CommonFunctions.compareTwoValues(isSearchResultFound, true, `Search Result for ${TestData.ASSUMPTION_VIEW_NAME} is found`);
    finalResult = finalResult && isSearchResultFound;

    const isNavigated = await PlanningSpace.navigateToView(TestData.ASSUMPTION_VIEW_NAME);
    await CommonFunctions.compareTwoValues(isNavigated, true, `Successfully navigated to the filtered view: ${TestData.ASSUMPTION_VIEW_NAME}`);
    finalResult = finalResult && isNavigated;
    await CommonFunctions.logMessage("INFO", "Test case 1: Successfully navigated to the filtered view"); 

    expect(finalResult).toBe(true);
  });

  it("Should not Navigate for hidden View in ASSUMPTION context", async () => {
    let finalResult = true;
    await PlanningSpace.switchToMFEFrame();
    await PlanningSpace.clickRefreshBtn(); 
    await PlanningSpace.selectViewByType('Hidden Views');
         await $('body').moveTo(); // Dock is popping up continuously, so added this
    const isSearchResultFound = await PlanningSpace.triggerDockSearchInput(TestData.ASSUMPTION_HIDDEN_VIEW_NAME, true);
    await CommonFunctions.compareTwoValues(!isSearchResultFound, true, `Search Result for ${TestData.ASSUMPTION_HIDDEN_VIEW_NAME} is not found`);
    finalResult = finalResult && !isSearchResultFound;

    const isNavigated = await PlanningSpace.navigateToView(TestData.ASSUMPTION_HIDDEN_VIEW_NAME, true);
    await CommonFunctions.compareTwoValues(!isNavigated, true, `View is hidden; navigation should not be possible: ${TestData.ASSUMPTION_HIDDEN_VIEW_NAME}`);
    finalResult = finalResult && !isNavigated;
    await CommonFunctions.logMessage("INFO", "Test case 2: Successfully prevented navigation to hidden view"); 

    expect(finalResult).toBe(true);
  });

});