import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/CardsBatch/Test_001_WhiteListedCards.json");
// import TestData from '../../../Testdata/PlanningSpace/CardsBatch/Test_001_WhiteListedCards.json';


describe('White Listed Cards', () => {

  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
  });

  it('Test Case 1: Verify White Listed Cards Present', async () => {
    await CommonFunctions.logMessage("INFO", "Clicking Edit View Button");
    const bValidation: boolean = await PlanningSpace.clickEditBtn();
    await CommonFunctions.compareTwoValues(bValidation, true, "Edit button clicked successfully");
    await PlanningSpace.clickAddCardButton();
    await PlanningSpace.clickCreateCardButton();
    let arrCardName: string[] = await PlanningSpace.getAllCardNames();
    let isStepRes: boolean = false;
    let isTestRes: boolean = true;
    for (let i = 0; i < TestData.CARD_NAMES.split(",").length; i++) {
      isStepRes = await CommonFunctions.compareTwoValues(arrCardName.includes(TestData.CARD_NAMES.split(",")[i]), true, TestData.CARD_NAMES.split(",")[i] + " Card Name Displays Assertion");
      isTestRes = isStepRes && isTestRes;
    }
    expect(isTestRes && bValidation).toEqual(true);
  });


})