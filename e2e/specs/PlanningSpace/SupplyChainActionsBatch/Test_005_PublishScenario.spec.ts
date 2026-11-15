import PlanningSpace from '../../../pageobjects/planning.page';
import TestData from '../../../Testdata/INTEROP/PlanningSpace/SupplyChainActionsBatch/Test_005_PublishScenario.json';
import IdentityPage from '../../../pageobjects/identity-and-access.page';
import CommonFunctions from '../../../util/common.util';
import TestUtil from '../../../util/test.util';

const publishPolicyName = TestData.PUBLISH_POLICY_NAME, publishResourceName = TestData.PUBLISH_RESOURCE_NAME, namespace = TestData.NAMESPACE, roleName = TestData.ROLE_NAME, policyName = TestData.PUBLISH_BASE_POLICY_NAME, procedureName = TestData.PROCEDURE_NAME, resourceName = TestData.PUBLISH_BASE_RESOURCE;
describe('Publish Scenario RBAC for publishing base and child scenario ', () => {

  before(async () => {
    await TestUtil.launchAppFromCatalog(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.IDENTITY_AND_ACCESS as string);
  });

  it('Test Case 1.1: Add Publish Scenario, Publish Base Scenario Policies', async () => {
    await CommonFunctions.logMessage('INFO', 'Logged In to Identity Access to create a policy');
    const executePolicy = await IdentityPage.addExecutePolicy(namespace, roleName, publishPolicyName, publishPolicyName, procedureName, publishResourceName);
    let validation1: boolean = await CommonFunctions.compareTwoValues(executePolicy, true, `Policy Creation Assertion`);
    await browser.refresh();
    await browser.pause(10000);
    await IdentityPage.switchToMfe();
    const publishPolicy = await IdentityPage.addExecutePolicy(namespace, roleName, policyName, policyName, procedureName, resourceName);
    let validation2: boolean = await CommonFunctions.compareTwoValues(publishPolicy, true, `Policy Creation Assertion`);
    expect(validation1 && validation2).toEqual(true);
  });

  it('Test Case 1.2: Verify publish base scenario', async () => {
    await CommonFunctions.logMessage('INFO', 'Navigate to Planning space Access');
    await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
    await browser.pause(30000);
    await PlanningSpace.switchToMFEFrame();
    let procedureExisting = await PlanningSpace.searchPublishScenarioSCA(procedureName);
    if (procedureExisting) {
      await PlanningSpace.goToPublishScenario(procedureName);
    }
    let baseScenarioPublish = await PlanningSpace.selectBaseScenario(TestData.BASE_SCENARIO_NAME);
    let validation1: boolean = await CommonFunctions.compareTwoValues(baseScenarioPublish, true, `Base Scenario Publish Assertion`);
    let childScenarioPublish = await PlanningSpace.selectChildScenario(TestData.BASE_SCENARIO_NAME, TestData.CHILD_SCENARIO_NAME);//Notification displays when publish child scenario policy is not added, if added it fails
    let validation2: boolean = await CommonFunctions.compareTwoValues(childScenarioPublish, true, `Child Scenario Publish Assertion`);
    expect(validation1 && !validation2).toEqual(true);
  });

  it('Test Case 1.3: Data Reset - Delete created Policies', async () => {
    await CommonFunctions.logMessage('INFO', 'Navigate to Identity Access to delete the policies');
    await IdentityPage.navigateToIdentityaccessMfe();
    await CommonFunctions.logMessage('INFO', 'Delete Publish Scenario Execute Policy');
    await IdentityPage.clickOnRolesTab(roleName);
    const publishPolicyExists = await IdentityPage.deletePolicy(publishPolicyName);
    let validation1: boolean = await CommonFunctions.compareTwoValues(publishPolicyExists, false, `Publish Exexute Policy Deletion Assertion`);
    await CommonFunctions.logMessage('INFO', 'Delete Publish Base Scenario Policy');
    const policyExists = await IdentityPage.deletePolicy(policyName);
    let validation2: boolean = await CommonFunctions.compareTwoValues(policyExists, false, `Publish Base Policy Deletion Assertion`);
    expect(validation1 && validation2).toEqual(true);
  });

});
