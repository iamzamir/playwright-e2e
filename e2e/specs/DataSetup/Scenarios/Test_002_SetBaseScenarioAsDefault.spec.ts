import PlanningSpace  from "../../../pageobjects/planning.page";
import TestUtil from "../../../util/test.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/DataSetup/Scenarios/Test_002_SetBaseScenarioAsDefault.json");
describe(`Set Base Scenario as Default Before Test Suite runs`, async () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await browser.pause(2000);
    })

    it(`Test Case 1: Set Base Scenario as Default`, async () => {
        await TestUtil.setBaseAsDefaultScenario();
    })
 });