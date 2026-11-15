import scope from "../../../pageobjects/scope.page"
import PlanningSpace from "../../../pageobjects/planning.page";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScopeBatch/Test_001_ScopeAsAttribute.json");
import CommonFunctions from "../../../util/common.util";

describe('Scope Tab', () => {

  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
  });

  it('Test Case 1: Verify Scope in Process page', async () => {
    await scope.clickOnTab("Scope");
    const eleExist: boolean = await scope.doesDrawerOpened('Scope')
    let bValidation: boolean = await CommonFunctions.compareTwoValues(eleExist, true, "Scope chip is enabled Assertion")
    await expect(bValidation).toEqual(true);
  });

});
