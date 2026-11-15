import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/PortalBYO/Test_001_PortalBYO.json");

describe('Portal BYO', () => {

  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
  });

  it('Test Case 1: Verify Portal BYO icon exists', async () => {
    await browser.pause(5000);
    const portalBYOIcon = await PlanningSpace.verifyPortalBYOICon();
    await CommonFunctions.compareTwoValues(portalBYOIcon, true, 'Is Portal BYO icon displayed');
    expect(portalBYOIcon).toBeTruthy();
  });

  it(`Test Case 2: Verify selected event ${TestData.EVENT_NAME} from the agent ${TestData.AGENT_NAME} is executed`, async () => {
    await PlanningSpace.clickPortalBYOIcon();
    await PlanningSpace.initiateBYOAgentEvent(TestData.AGENT_NAME, TestData.EVENT_NAME);
    await browser.pause(5000);
    await PlanningSpace.switchToMFEFrame();
    const bValidation = await CommonFunctions.verifyAlertMsg(`Applying your changes...`);
    expect(bValidation).toBeTruthy();
  });
})