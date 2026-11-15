import PlanningSpace from "../../../pageobjects/planning.page";
import ProcessPage from "../../../pageobjects/process.page";
import CommonFunctions from "../../../util/common.util";
import TestUtil from "../../../util/test.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/ViewSearch/Test_001_ViewSearchForProcessInPO.json");

describe("ViewSearch in ProcessOrchestration for process", () => {
  before(async () => {
    await TestUtil.launchAppFromCatalog(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string);
    await browser.pause(5000);
  })   

  it(`Test Case 1: Should able to search and navigate to View`, async () => {
    let finalResult = true;
    await ProcessPage.clickOnProcess(TestData.PROCESS_NAME);
    await browser.pause(5000);

    const isSearchResultFound = await PlanningSpace.triggerDockSearchInput(TestData.VIEW_NAME);
    await CommonFunctions.compareTwoValues(isSearchResultFound, true, `Search Result for ${TestData.VIEW_NAME} is found`);
    finalResult = finalResult && isSearchResultFound;

    const isNavigated = await PlanningSpace.navigateToView(TestData.VIEW_NAME);
    await CommonFunctions.compareTwoValues(isNavigated, true, `Successfully navigated to the filtered view: ${TestData.VIEW_NAME}`);
    finalResult = finalResult && isNavigated;
    await CommonFunctions.logMessage("INFO", "Test case 1: Successfully navigated to the filtered view"); 

    expect(finalResult).toBe(true);
  });

  it('Test Case 2: Should allow searching but prevent navigation to hidden views', async () => {
    let finalResult = true;
    await PlanningSpace.switchToMFEFrame();
    await browser.pause(3000);

    await ProcessPage.clickLeftpaneLinks('Process Summary');
    await browser.pause(5000);

    const isSearchResultFound = await PlanningSpace.triggerDockSearchInput(TestData.HIDDEN_VIEW_NAME, true);
    await CommonFunctions.compareTwoValues(!isSearchResultFound, true, `Search Result for ${TestData.HIDDEN_VIEW_NAME} is not found`);
    finalResult = finalResult && !isSearchResultFound;

    const isNavigated = await PlanningSpace.navigateToView(TestData.HIDDEN_VIEW_NAME, true);
    await CommonFunctions.compareTwoValues(!isNavigated, true, `View is hidden; navigation should not be possible: ${TestData.HIDDEN_VIEW_NAME}`);
    finalResult = finalResult && !isNavigated;
    await CommonFunctions.logMessage("INFO", "Test case 2: Successfully prevented navigation to hidden view"); 

    expect(finalResult).toBe(true);
  })
});
