import PlanningSpace from '../../../pageobjects/planning.page';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/SupplyChainActionsBatch/Test_004_SCAProcedures.json");
// import TestData from '../../../Testdata/PlanningSpace/SupplyChainActionsBatch/Test_004_SCAProcedures.json';
import IdentityPage from '../../../pageobjects/identity-and-access.page';
import CommonFunctions from '../../../util/common.util';
import TestUtil from '../../../util/test.util';

describe('SCA Dropdown display based on execute permission', () => {

  const namespace = 'BY.CBP',
    roleName = 'procedure_execution',
    policyName = 'Publish Scenario',
    procedureName = 'Publish Scenario',
    resourceName = 'PROCEDURE.PublishScenario';

  before(async () => {
    await TestUtil.launchAppFromCatalog(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.IDENTITY_AND_ACCESS as string);
  });

  it('Test Case 1: Add Procedure Publish Scenario Execute Policy', async () => {
    await CommonFunctions.logMessage('INFO', 'Logged In to Identity Access to create a policy');
    CommonFunctions.zoomOut(4); // Create button is not visible in 100% zoom, so zooming out to make it visible. Will restore zoom after creation.
    await browser.pause(2000); // Adding a short pause to allow zoom to take effect before interacting with the page  
    const policyCreated = await IdentityPage.addExecutePolicy(namespace, roleName, policyName, policyName, procedureName, resourceName);
    let validation: boolean = await CommonFunctions.compareTwoValues(policyCreated, true, `Policy Creation Assertion`);
    expect(validation).toEqual(true);
    await CommonFunctions.resetZoom();  // restore zoom after policy creation
  });

  it('Test Case 2: Should Display Publish Scenario Procedure in the Supply Chain Procedure Dropdown', async () => {
    await CommonFunctions.logMessage('INFO', 'Navigate to Planning space Access');
    await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
    await PlanningSpace.switchToMFEFrame();
    const procedureExisting = await PlanningSpace.searchPublishScenarioSCA(procedureName);
    let validation: boolean = await CommonFunctions.compareTwoValues(procedureExisting, true, `Should display ${procedureName} in SCP dropdown Assertion`);
    expect(validation).toEqual(true);
  });

  it('Test Case 3: Delete Procedure Publish Scenario Policy', async () => {
    await CommonFunctions.logMessage('INFO', 'Navigate to Identity Access to delete the policy');
    await IdentityPage.navigateToIdentityaccessMfe();
    await IdentityPage.clickOnRolesTab(roleName);
    const policyExists = await IdentityPage.deletePolicy(policyName);
    let validation: boolean = await CommonFunctions.compareTwoValues(policyExists, false, `Policy Deletion Assertion`);
    expect(validation).toEqual(true);
  });

  it('Test Case 4: Should Not Display Publish Scenario Procedure in the Supply Chain Procedure Dropdown', async () => {
    await CommonFunctions.logMessage('INFO', 'Navigate to Planning space Access');
    await browser.pause(6000);
    await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
    await PlanningSpace.switchToMFEFrame();
    await browser.pause(6000);
    const procedureExists = await PlanningSpace.searchPublishScenarioSCA(procedureName);
    let validation: boolean = await CommonFunctions.compareTwoValues(procedureExists, false, `Should not display ${procedureName} in SCP dropdown Assertion`);
    expect(validation).toEqual(true);
  });

});