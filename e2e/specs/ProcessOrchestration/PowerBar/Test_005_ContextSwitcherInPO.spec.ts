import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
import TestUtil from "../../../util/test.util";
import ProcessPage from "../../../pageobjects/process.page";
const TestData = require("../../../Testdata/" +
  process.env.PSENV +
  "/ProcessOrchestration/PowerBar/Test_005_ContextSwitcher.json");

describe("PowerBar - context switcher - ProcessOrchestration ", () => {
  before(async () => {
    await TestUtil.launchAppFromCatalog(
      TestData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      process.env.POLINK as string,false,false
    );
    await browser.pause(5000);
  });

  it("Test Case 1: Verify context switching to a subprocess in the same tab", async () => {
    await ProcessPage.clickOnProcess(TestData.PROCESS_NAME);
    const verifyContextSwitch = await PlanningSpace.selectEntityFromContext({
      process: TestData.PROCESS_NAME,
      subProcess: TestData.SUBPROCESS_NAME,
    },false,true);

    let validation: boolean = await CommonFunctions.compareTwoValues(
      verifyContextSwitch,
      true,
      "verify recently opened project in power bar tooltip"
    );
    expect(validation).toEqual(true);
    await CommonFunctions.logMessage(
      "INFO",
      "Test case 1: switching the context in the same tab for subprocess verified successfully"
    );
  });

  it("Test Case 2: Verify context switching to an assumption in the same tab", async () => {
    await PlanningSpace.clickOnListingIcon();
    await PlanningSpace.goToPOListingPageAndVerify()
    await ProcessPage.clickOnProcess(TestData.PROCESS_NAME);
    const verifyContextSwitch = await PlanningSpace.selectEntityFromContext({
      process: TestData.PROCESS_NAME,
      assumption: TestData.ASSUMPTION_NAME,
    }, false, true);

    let validation: boolean = await CommonFunctions.compareTwoValues(
      verifyContextSwitch,
      true,
      "verify recently opened project in power bar tooltip"
    );
    expect(validation).toEqual(true);
    await CommonFunctions.logMessage(
      "INFO",
      "Test case 2: switching the context in the same tab for assumption verified successfully"
    );
  });

  it("Test Case 3: Verify context switching to a process in the same tab", async () => {
    await PlanningSpace.clickOnListingIcon();
    await PlanningSpace.goToPOListingPageAndVerify()
    await ProcessPage.clickOnProcess(TestData.PROCESS_NAME);
    const verifyContextSwitch = await PlanningSpace.selectEntityFromContext({
      process: TestData.PROCESS_NAME,
    }, false, true);

    let validation: boolean = await CommonFunctions.compareTwoValues(
      verifyContextSwitch,
      true,
      "verify recently opened project in power bar tooltip"
    );
    expect(validation).toEqual(true);
    await CommonFunctions.logMessage(
      "INFO",
      "Test case 3: switching the context in the same tab for process verified successfully"
    );
  });

  it("Test Case 4: Verify context switching to a subprocess in a new tab", async () => {
    await PlanningSpace.clickOnListingIcon();
    await PlanningSpace.goToPOListingPageAndVerify()
    await ProcessPage.clickOnProcess(TestData.PROCESS_NAME);
    const newTab = true;
    const verifyContextSwitch = await PlanningSpace.selectEntityFromContext(
      {
        process: TestData.PROCESS_NAME,
        subProcess: TestData.SUBPROCESS_NAME,
      },
      newTab,true
    );

    let validation: boolean = await CommonFunctions.compareTwoValues(
      verifyContextSwitch,
      true,
      "verify recently opened project in power bar tooltip"
    );
    expect(validation).toEqual(true);
    await CommonFunctions.logMessage(
      "INFO",
      "Test case 4: switching the context in the new tab for subprocess verified successfully"
    );
  });

  it("Test Case 5: Verify context switching to an assumption in a new tab", async () => {
    await PlanningSpace.clickOnListingIcon();
    await PlanningSpace.goToPOListingPageAndVerify()
    await ProcessPage.clickOnProcess(TestData.PROCESS_NAME);
    const newTab = true;
    const verifyContextSwitch = await PlanningSpace.selectEntityFromContext(
      {
        process: TestData.PROCESS_NAME,
        assumption: TestData.ASSUMPTION_NAME,
      },
      newTab,true
    );

    let validation: boolean = await CommonFunctions.compareTwoValues(
      verifyContextSwitch,
      true,
      "verify recently opened project in power bar tooltip"
    );
    expect(validation).toEqual(true);
    await CommonFunctions.logMessage(
      "INFO",
      "Test case 5: switching the context in the new tab for assumption verified successfully"
    );
  });

  it("Test Case 6: Verify context switching to a process in a new tab", async () => {
    await PlanningSpace.clickOnListingIcon();
    await PlanningSpace.goToPOListingPageAndVerify()
    await ProcessPage.clickOnProcess(TestData.PROCESS_NAME);
    const newTab = true;
    const verifyContextSwitch = await PlanningSpace.selectEntityFromContext(
      {
        process: TestData.PROCESS_NAME,
      },
      newTab,true
    );

    let validation: boolean = await CommonFunctions.compareTwoValues(
      verifyContextSwitch,
      true,
      "verify recently opened project in power bar tooltip"
    );
    expect(validation).toEqual(true);
    await CommonFunctions.logMessage(
      "INFO",
      "Test case 6: switching the context in the new tab for process verified successfully"
    );
  });
});
