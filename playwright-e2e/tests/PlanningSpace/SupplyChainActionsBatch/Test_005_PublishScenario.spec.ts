import { test, expect } from '../../../configs/fixtures';
import { ApiUtil } from '../../../util/api.util';

type PolicyRecord = {
  id: number;
  displayName?: string;
  description?: string;
};

type PolicyCreatePayload = {
  displayName: string;
  description: string;
  expression: string;
};

test.describe.serial('Publish Scenario RBAC for publishing base and child scenario', () => {
  let apiUtil: ApiUtil;
  let accessToken = '';
  let headers: Record<string, string>;
  let roleId: number;
  const createdPolicies = new Map<string, number>();

  function getPoliciesUrl(): string {
    return `${process.env.API_BASE_URL as string}iam/realm/v1/roles/${roleId}/policies`;
  }

  async function getRoleIdByName(roleName: string): Promise<number> {
    const rolesUrl = `${process.env.API_BASE_URL as string}iam/realm/v1/roles`;
    const rolesResponse = await apiUtil.processAPIRequest('GET', rolesUrl, null, headers, `Fetch IAM roles for ${roleName}`, 'full');
    expect(rolesResponse.status).toBe(200);

    const expectedRealm = process.env.REALM_NAME || '';
    const matchingRole = rolesResponse.data.find((role: any) => role.name === roleName && role.realmName === expectedRealm)
      || rolesResponse.data.find((role: any) => role.name === roleName);

    expect(matchingRole?.id).toBeTruthy();
    return Number(matchingRole.id);
  }

  async function findPolicyByName(policyName: string): Promise<PolicyRecord | undefined> {
    const policiesResponse = await apiUtil.processAPIRequest('GET', getPoliciesUrl(), null, headers, `Fetch IAM policies for ${policyName}`, 'full');
    expect(policiesResponse.status).toBe(200);

    return (policiesResponse.data as PolicyRecord[]).find((policy) => policy.displayName === policyName || policy.description === policyName);
  }

  async function ensurePolicyPresent(policyName: string, payload: PolicyCreatePayload): Promise<boolean> {
    const existingPolicy = await findPolicyByName(policyName);
    if (existingPolicy?.id) {
      createdPolicies.set(policyName, Number(existingPolicy.id));
      return true;
    }

    const createResponse = await apiUtil.processAPIRequest(
      'POST',
      getPoliciesUrl(),
      payload,
      headers,
      `Create IAM policy ${policyName}`,
      'full'
    );

    expect(createResponse.status).toBe(201);
    createdPolicies.set(policyName, Number(createResponse.data.id));
    return Boolean(createResponse.data?.id);
  }

  async function deletePolicyByName(policyName: string): Promise<boolean> {
    let policyId = createdPolicies.get(policyName);

    if (!policyId) {
      const existingPolicy = await findPolicyByName(policyName);
      if (!existingPolicy?.id) {
        return false;
      }
      policyId = Number(existingPolicy.id);
    }

    const deleteResponse = await apiUtil.processAPIRequest(
      'DELETE',
      `${getPoliciesUrl()}/${policyId}`,
      null,
      headers,
      `Delete IAM policy ${policyName}`,
      'full'
    );

    expect(deleteResponse.status).toBe(204);
    createdPolicies.delete(policyName);

    const existingAfterDelete = await findPolicyByName(policyName);
    return Boolean(existingAfterDelete);
  }

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
  });

  test('Test Case 1: Add Publish Scenario procedure execute policy', async ({ testUtil, commonFunctions, scenarioPage, testData, page }) => {
    await testUtil.launchAppFromCatalog(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string
    );
    const accessTokenPromise = scenarioPage.waitForAccessTokenFromRequestHeader('lui/uiRegistration/v1/realmSettings');
    await page.reload();
    accessToken = await accessTokenPromise;
    expect(accessToken).toBeTruthy();
    headers = {
      accept: 'application/json',
      Authorization: accessToken
    };
    roleId = await getRoleIdByName(testData.ROLE_NAME);

    await commonFunctions.logMessage('INFO', 'Logged In to Identity Access to create policies');

    const executePolicy = await ensurePolicyPresent(testData.PUBLISH_POLICY_NAME, testData.PUBLISH_POLICY_PAYLOAD);

    const validation = await commonFunctions.compareTwoValues(executePolicy, true, 'Policy Creation Assertion');
    expect(validation).toEqual(true);
  });

  test('Test Case 2: Verify publish Scenario Procedure is Visible to Execute', async ({ testUtil, scaPage, planningPage, commonFunctions, testData }) => {
    await commonFunctions.logMessage('INFO', 'Navigate to Planning space Access');
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);
    await planningPage.selectViewInPlanning(testData.PLANNING_DASHBOARD_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.PLANNING_DASHBOARD_NAME);
    const procedureExisting = await scaPage.isProcedureAvailableInDropdown(testData.PROCEDURE_NAME);
    const validation = await commonFunctions.compareTwoValues(procedureExisting, true, `${testData.PROCEDURE_NAME} procedure is listed in the dropdown`);
    expect(validation).toEqual(true);
  });

  test('Test Case 3: Execute Publish Scenario Procedure and verify that Publish Base is not Authorized', async ({ scaPage, planningPage, commonFunctions, testData, page }) => {
    await page.keyboard.press('Tab').catch(() => undefined);
    await planningPage.selectSupplyChainProceduresAction(testData.PROCEDURE_NAME);
    const isAlertVisible = await scaPage.isAuthorizationAlertMessage();
    const validation = await commonFunctions.compareTwoValues(isAlertVisible, true, 'Authorization Alert Message Assertion');
    expect(validation).toEqual(true);
  });

  test('Test Case 4: Add Publish Base Scenario Policies', async ({ commonFunctions, testData }) => {
    const publishPolicy = await ensurePolicyPresent(testData.PUBLISH_BASE_POLICY_NAME, testData.PUBLISH_BASE_POLICY_PAYLOAD);
    const validation = await commonFunctions.compareTwoValues(publishPolicy, true, 'Policy Creation Assertion');
    expect(validation).toEqual(true);
  });

  test('Test Case 5: Verify publish base scenario', async ({ portalPage, scaPage, planningPage, commonFunctions, testData, page }) => {
    await page.reload();
    await portalPage.showApplicationIfBriefingOpen();
    await planningPage.selectViewInPlanning(testData.PLANNING_DASHBOARD_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.PLANNING_DASHBOARD_NAME);
    await planningPage.selectSupplyChainProceduresAction(testData.PROCEDURE_NAME);
    const isAuthorizationAlertVisible = await scaPage.isAuthorizationAlertMessage();
    const validation1 = await commonFunctions.compareTwoValues(isAuthorizationAlertVisible, false, 'Authorization Alert Message Absence Assertion');

    const baseScenarioPublish = await scaPage.selectBaseScenarioAndSave(testData.BASE_SCENARIO_NAME);
    const validation2 = await commonFunctions.compareTwoValues(baseScenarioPublish, true, 'Base Scenario Publish Assertion');

    const childScenarioPublish = await scaPage.selectChildScenarioAndSave(testData.BASE_SCENARIO_NAME, testData.CHILD_SCENARIO_NAME);
    const validation3 = await commonFunctions.compareTwoValues(childScenarioPublish, true, 'Child Scenario Publish Assertion');

    expect(validation1 && validation2 && validation3).toEqual(true);
  });

  test.afterAll('Test Case 1.3: Data Reset - Delete created Policies', async ({ commonFunctions, testData }) => {
    await commonFunctions.logMessage('INFO', 'Delete Publish Scenario Execute Policy through IAM API');
    const publishPolicyExists = await deletePolicyByName(testData.PUBLISH_POLICY_NAME);
    const validation1 = await commonFunctions.compareTwoValues(publishPolicyExists, false, 'Publish Execute Policy Deletion Assertion');

    await commonFunctions.logMessage('INFO', 'Delete Publish Base Scenario Policy through IAM API');
    const policyExists = await deletePolicyByName(testData.PUBLISH_BASE_POLICY_NAME);
    const validation2 = await commonFunctions.compareTwoValues(policyExists, false, 'Publish Base Policy Deletion Assertion');

    expect(validation1 && validation2).toEqual(true);
  });
});
