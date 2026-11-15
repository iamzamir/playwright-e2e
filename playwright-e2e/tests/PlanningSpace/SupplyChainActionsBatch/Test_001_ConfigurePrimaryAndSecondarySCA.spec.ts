import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/fixtures';
import { getTimeout, TIMEOUTS } from '../../../constants/timeouts';
import apiUtil from '../../../util/api.util';

const viewGroup = uniqueName('View Group');
const viewName = uniqueName('View');
const VIEW_GROUP_CREATE_ENDPOINT = 'lui/uiRegistration/v1/containersRealm';
const VIEW_CREATE_ENDPOINT = 'lui/dashboard/v2/dashboards';
const CONFIGURE_VIEW_PROCEDURES = 'Configure View specific Procedures & Filters';

type ProcedureRef = { procedureDisplayName: string };

/** Primary, secondary and other SCA procedure names from the test data, in that order. */
function allProcedureNames(testData: any): string[] {
  return [
    testData.PRIMARY_SCA_ACTION.procedureDisplayName,
    testData.SECONDARY_SCA_ACTION.procedureDisplayName,
    ...testData.OTHER_SCA_ACTIONS.map((action: ProcedureRef) => action.procedureDisplayName)
  ];
}

test.describe.serial('SCP Configuration when no procedures were mapped to view', () => {
  let capturedAuthToken = '';
  let capturedViewGroupId = '';
  let capturedViewId = '';

  const apiHeaders = () => ({ Authorization: capturedAuthToken, accept: 'application/json' });

  test('Test Case 1: Create view group', async ({ testUtil, processPage, globalSettingsPage, commonFunctions, testData, page, createdEntities }) => {
    await testUtil.launchAppFromCatalog(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      process.env.POLINK as string
    );
    await processPage.getPageTitle();

    const authRequestPromise = page.waitForRequest((request) => Boolean(request.headers()['authorization']), { timeout: getTimeout('XLARGE') }).catch(() => null);
    await globalSettingsPage.clickGlobalSettings();
    await globalSettingsPage.clickGlobalSettingsListMenu('View Groups');
    capturedAuthToken = (await authRequestPromise)?.headers()['authorization'] || '';
    expect(capturedAuthToken, 'Auth token captured from Global Settings network traffic').toBeTruthy();

    const createViewGroupPayload = structuredClone(testData.CREATE_VIEW_GROUP_REQUEST);
    createViewGroupPayload.displayName = viewGroup;
    createViewGroupPayload.realm = process.env.REALM_ID as string;

    const createViewGroupResponse = await apiUtil.processAPIRequest(
      'POST',
      `${process.env.API_BASE_URL as string}${VIEW_GROUP_CREATE_ENDPOINT}`,
      createViewGroupPayload,
      apiHeaders(),
      `Create view group ${viewGroup} via API`,
      'full'
    );
    capturedViewGroupId = createViewGroupResponse?.data?.id || '';
    if (capturedViewGroupId) {
      createdEntities.register('viewGroup', viewGroup, { id: capturedViewGroupId, authorization: capturedAuthToken });
    }
    await commonFunctions.logMessage('INFO', `Captured view group id during view group creation: ${capturedViewGroupId || 'Not found'}`);

    const bValidation1 = await commonFunctions.compareTwoValues(createViewGroupResponse.status, 200, `Is ${viewGroup} view group created via API`);
    const bValidation2 = await commonFunctions.compareTwoValues(Boolean(capturedViewGroupId), true, `Is ${viewGroup} view group id captured`);
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 2: Create planning view', async ({ commonFunctions, testData, createdEntities }) => {
    expect(capturedAuthToken && capturedViewGroupId, `Token and view group id from Test Case 1 are needed to create ${viewName}`).toBeTruthy();

    const createViewPayload = structuredClone(testData.CREATE_PLANNING_VIEW_REQUEST);
    createViewPayload[0].name = viewName;
    createViewPayload[0].containerId = capturedViewGroupId;
    createViewPayload[0].user = process.env.SUBJECT_ID as string;

    const createViewResponse = await apiUtil.processAPIRequest(
      'POST',
      `${process.env.API_BASE_URL as string}${VIEW_CREATE_ENDPOINT}`,
      createViewPayload,
      apiHeaders(),
      `Create planning view ${viewName} via API`,
      'full'
    );
    capturedViewId = createViewResponse?.data?.[0]?.viewId || createViewResponse?.data?.[0]?.id || '';
    if (capturedViewId) {
      createdEntities.register('view', viewName, { id: capturedViewId, authorization: capturedAuthToken });
    }
    await commonFunctions.logMessage('INFO', `Captured planning view id during view creation: ${capturedViewId || 'Not found'}`);

    const bValidation1 = await commonFunctions.compareTwoValues(createViewResponse.status, 200, `Is ${viewName} view created via API`);
    const bValidation2 = await commonFunctions.compareTwoValues(Boolean(capturedViewId), true, `Is ${viewName} view id captured`);
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 3: Map view to process', async ({ commonFunctions, testData }) => {
    expect(capturedAuthToken && capturedViewId, `Token and view id from Test Case 2 are needed to map ${viewName}`).toBeTruthy();

    const requestBody = structuredClone(testData.MAP_VIEW_TO_PROCESS_REQUEST);
    requestBody.entities[0].entityId = [testData.PROCESS_NAME];
    requestBody.views[0].id = capturedViewId;

    const mapViewResponse = await apiUtil.processAPIRequest(
      'POST',
      (process.env.API_BASE_URL as string) + (process.env.VIEW_ENTITY_MAP as string),
      requestBody,
      apiHeaders(),
      `Map ${viewName} to process ${testData.PROCESS_NAME}`,
      'full'
    );

    const statusValidation = await commonFunctions.compareTwoValues(mapViewResponse.status, 200, 'View Mapping Save Assertion for Process');
    expect(statusValidation).toBeTruthy();
  });

  test('Test Case 4: Verify all procedures are enabled to view', async ({ scaPage, commonFunctions, globalSettingsPage, testData, page }) => {
    await page.reload();
    await globalSettingsPage.clickGlobalSettingsListMenu('Process');
    await globalSettingsPage.selectProcess(testData.PROCESS_NAME);
    await globalSettingsPage.waitUntilViewMappingIsDisplayed(viewName, testData.PROCESS_NAME);
    await scaPage.selectSingleAction(testData.PROCESS_NAME, CONFIGURE_VIEW_PROCEDURES);
    const verify = await scaPage.verifyAllSCAEnabled(viewName, allProcedureNames(testData));
    const validation = await commonFunctions.compareTwoValues(verify, true, 'All SCA procedures are enabled');
    expect(validation).toBeTruthy();
  });

  test('Test Case 5: verify all SCAs appear in alphabetical order in procedures dropdown', async ({ testUtil, planningPage, scaPage, commonFunctions, testData }) => {
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);
    await planningPage.selectViewInPlanning(viewName);
    await planningPage.waitForSpecificDashboardToBeDisplayed(viewName);
    const sortedActions = allProcedureNames(testData)
      .sort((strA, strB) => strA.localeCompare(strB))
      .map((procedure) => ({ procedureDisplayName: procedure }));
    const bValidation = await scaPage.verifyOtherActionsInProceduresDropdown(sortedActions, true);
    const validation = await commonFunctions.compareTwoValues(bValidation, true, 'Is procedures dropdown appeared with other actions');
    expect(validation).toBeTruthy();
  });

  test('Test Case 6: Should be able to configure primary and secondary actions', async ({ testUtil, processPage, globalSettingsPage, scaPage, commonFunctions, testData }) => {
    await testUtil.navigateToProcessListingPage();
    await processPage.getPageTitle();
    await globalSettingsPage.selectProcessDropdown(testData.PROCESS_NAME);
    await globalSettingsPage.waitUntilViewMappingIsDisplayed(viewName, testData.PROCESS_NAME);
    await scaPage.selectSingleAction(testData.PROCESS_NAME, CONFIGURE_VIEW_PROCEDURES);
    const verify = await scaPage.configureSCP(
      viewName,
      allProcedureNames(testData),
      testData.PRIMARY_SCA_ACTION.procedureDisplayName,
      testData.SECONDARY_SCA_ACTION.procedureDisplayName
    );
    const validation = await commonFunctions.compareTwoValues(verify, true, 'verify successful configuration');
    expect(validation).toBeTruthy();
  });

  test('Test Case 7: Configure Supply Chain Procedures should be disabled if the entity has no assigned views and procedures', async ({ scaPage, commonFunctions, testData }) => {
    await scaPage.selectProcess(testData.PROCESS_NAME);
    const isSCPActionEnabled = await scaPage.isActionEnabled(testData.SUBPROCESS_NAME, CONFIGURE_VIEW_PROCEDURES);
    const bValidation = await commonFunctions.compareTwoValues(isSCPActionEnabled, false, 'verify option enabled or not');
    expect(bValidation).toBeTruthy();
  });

  test('Test Case 8: verify primary SCA available', async ({ testUtil, planningPage, scaPage, commonFunctions, testData }) => {
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);
    await planningPage.selectViewInPlanning(viewName);
    await planningPage.waitForSpecificDashboardToBeDisplayed(viewName);
    const bValidation = await scaPage.verifySCABtn(testData.PRIMARY_SCA_ACTION.procedureDisplayName, 'MuiButton-contained');
    const validation = await commonFunctions.compareTwoValues(bValidation, true, 'Is primary sca button exist');
    expect(validation).toBeTruthy();
  });

  test('Test Case 9: verify secondary SCA available', async ({ scaPage, commonFunctions, testData }) => {
    const bValidation = await scaPage.verifySCABtn(testData.SECONDARY_SCA_ACTION.procedureDisplayName, 'MuiButton-outlined');
    const validation = await commonFunctions.compareTwoValues(bValidation, true, 'Is secondary sca button exist');
    expect(validation).toBeTruthy();
  });

  test('Test Case 10: verify SCA procedures dropdown with other SCA actions in arranged order', async ({ scaPage, commonFunctions, testData }) => {
    const bValidation = await scaPage.verifyOtherActionsInProceduresDropdown(testData.OTHER_SCA_ACTIONS, true);
    const validation = await commonFunctions.compareTwoValues(bValidation, true, 'Is procedures dropdown appeared with other actions');
    expect(validation).toBeTruthy();
  });

  test('Test Case 11: Should disable all SCA actions to view', async ({ testUtil, processPage, globalSettingsPage, scaPage, commonFunctions, testData }) => {
    await testUtil.navigateToProcessListingPage();
    await processPage.getPageTitle();
    await globalSettingsPage.selectProcessDropdown(testData.PROCESS_NAME);
    await globalSettingsPage.waitUntilViewMappingIsDisplayed(viewName, testData.PROCESS_NAME);
    await scaPage.selectSingleAction(testData.PROCESS_NAME, CONFIGURE_VIEW_PROCEDURES);
    const verify = await scaPage.disableSCA(viewName, allProcedureNames(testData));
    const validation = await commonFunctions.compareTwoValues(verify, true, 'verify successful configuration');
    expect(validation).toBeTruthy();
  });

  test('Test Case 12: verify SCA dropdown disabled in Planning Space', async ({ testUtil, planningPage, planningListingPage, commonFunctions, testData, page }) => {
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Process', testData.PROCESS_NAME);
    await planningPage.selectViewInPlanning(viewName);
    await planningPage.waitForSpecificDashboardToBeDisplayed(viewName);
    let isDropdownUsable = await planningPage.isActionsDropdownVisible();
    if (isDropdownUsable) {
      // Planning can still hold the procedures it read before they were disabled; reload until it picks up the change.
      await expect.poll(async () => {
        await page.reload();
        await planningPage.waitForSpecificDashboardToBeDisplayed(viewName);
        isDropdownUsable = await planningPage.isActionsDropdownVisible();
        return isDropdownUsable;
      }, { timeout: getTimeout('EXTREME'), intervals: [TIMEOUTS.MEDIUM] }).toBe(false).catch(() => undefined);
    }
    const validationResult = await commonFunctions.compareTwoValues(isDropdownUsable, false, 'Procedures dropdown is disabled');
    expect(validationResult).toBeTruthy();
  });

  test.afterAll('Cleanup: delete created view and view group', async ({ createdEntities }) => {
    const { failed } = await createdEntities.cleanupFile();
    expect(failed, 'Created view and view group deleted through the API').toHaveLength(0);
  });
});
