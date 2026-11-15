import PlanningSpace from "../../../pageobjects/planning.page";
import scope from "../../../pageobjects/scope.page"
import CommonFunctions from "../../../util/common.util";
import processPage from "../../../pageobjects/process.page";
import testUtil from "../../../util/test.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/ScopeBatch/Test_003_SaveAndDeleteFilterInSettings.json");

describe('Reset Process Scope', () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await testUtil.clickPowerBarLink('Process Settings');
        await CommonFunctions.switchToSpecificWindow(1);
        await PlanningSpace.switchToMFEFrame();
    });

    it('Test Case 1: Reset Process Scope', async () => {
        await processPage.clickLeftpaneLinks("Scope");
        const bValidation: boolean = await CommonFunctions.compareTwoValues(await scope.clickOnResetDimensions(), true, `Reset Dimensions Assertion`);
        expect(bValidation).toEqual(true)
    });

});