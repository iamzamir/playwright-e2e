import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/fixtures';
import type { Page } from '@playwright/test';
import apiUtil from '../../../util/api.util';
import { deleteViewGroupById } from '../../../util/dashboard.util';
import { getTimeout } from '../../../constants/timeouts';

const VIEW_GROUP_CREATE_ENDPOINT = 'lui/uiRegistration/v1/containersRealm';
test.describe.serial('Map planning views to view group in PO', () => {
  let page: Page;

  let VIEW_GROUP_NAME: string = '';
  let VIEW_NAME: string = '';
  // Taken from the UI's own create request, so cleanup can delete the view group through the same API.
  let capturedAuthToken: string = '';
  let capturedViewGroupId: string = '';

  test.beforeAll(async ({ page: fixturePage }) => {
    // LUI ViewGroupsAddEditModal limits container names to CONTAINER_MAX_LENGTH = 50.
    VIEW_GROUP_NAME = uniqueName('ViewGroup', 50);
    VIEW_NAME = uniqueName('ViewName', 50);
    page = fixturePage;
  });

  test(`Test Case 1: Create a View Group`, async ({ testUtil, globalSettingsPage, processPage, commonFunctions, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2, process.env.FUNCTIONAL_TEST_PASSWORD, process.env.POLINK as string);

    const createViewGroupResponsePromise = page.waitForResponse(
      (response) => response.request().method() === 'POST' && response.url().includes(VIEW_GROUP_CREATE_ENDPOINT),
      { timeout: getTimeout('XLARGE') }
    ).catch(() => null);

    await globalSettingsPage.clickGlobalSettings();
    await globalSettingsPage.clickGlobalSettingsListMenu('View Groups');
    await globalSettingsPage.createViewGroup(VIEW_GROUP_NAME);

    const createViewGroupResponse = await createViewGroupResponsePromise;
    if (createViewGroupResponse) {
      capturedAuthToken = (await createViewGroupResponse.request().allHeaders())['authorization'] || '';
      const body = await createViewGroupResponse.json().catch(() => null);
      capturedViewGroupId = body?.id || body?.data?.id || '';
    }
    await commonFunctions.logMessage('INFO', `Captured auth token during view group creation: ${capturedAuthToken ? 'Yes' : 'No'}`);
    await commonFunctions.logMessage('INFO', `Captured view group id during view group creation: ${capturedViewGroupId || 'Not found'}`);

    const alertValidation = await processPage.alertMsg('Successfully created view group');
    const bValidation1 = await commonFunctions.compareTwoValues(alertValidation, true, `Is ${VIEW_GROUP_NAME} view group created`);
    const bValidation2 = await commonFunctions.compareTwoValues(Boolean(capturedAuthToken), true, 'Is auth token captured');
    const bValidation3 = await commonFunctions.compareTwoValues(Boolean(capturedViewGroupId), true, `Is ${VIEW_GROUP_NAME} view group id captured`);
    expect(bValidation1 && bValidation2 && bValidation3).toBe(true);
  });

  test(`Test Case 2: Create a planning view`, async ({ globalSettingsPage, processPage, commonFunctions }) => {
    await globalSettingsPage.clickGlobalSettingsListMenu('Planning Views');
    const isPlanningViewCreated = await globalSettingsPage.createPlanningView(VIEW_NAME, VIEW_GROUP_NAME);
    const alertValidation = await processPage.alertMsg('success');
    const bValidation1 = await commonFunctions.compareTwoValues(alertValidation, true, `Is ${VIEW_NAME} view created`);
    expect(isPlanningViewCreated && bValidation1).toBe(true);
  });

  test(`Test Case 3: Edit the planning view`, async ({ globalSettingsPage, processPage, commonFunctions }) => {
    await globalSettingsPage.editView(VIEW_NAME, VIEW_GROUP_NAME);
    const alertValidation = await processPage.alertMsg('success');
    const bValidation1 = await commonFunctions.compareTwoValues(alertValidation, true, `Is ${VIEW_GROUP_NAME} view edited`);
    expect(bValidation1).toBe(true);
  });

  test(`Test Case 4: Map view to process`, async ({ globalSettingsPage, commonFunctions, testData }) => {
    await globalSettingsPage.clickGlobalSettingsListMenu('Process');
    await globalSettingsPage.selectProcess(testData.PROCESS_NAME);
    await commonFunctions.logMessage('INFO', `Selected process ${testData.PROCESS_NAME}`);

    await globalSettingsPage.selectProcessAction(testData.PROCESS_NAME, 'Map With');
    await globalSettingsPage.toggleContainer(VIEW_GROUP_NAME, true);
    const isViewMapSuccess = await globalSettingsPage.clickSaveAndVerify();
    const validation = await commonFunctions.compareTwoValues(isViewMapSuccess, true, 'View Mapping Save Assertion for Process');
    expect(validation).toBe(true);
  });

  test(`Test Case 5: Verify view changes in Planning`, async ({ commonFunctions, testData, testUtil, planningListingPage, planningPage }) => {
    await commonFunctions.logMessage('INFO', `Navigating to Planning process ${testData.PROCESS_NAME} in same tab`);
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Process', testData.PROCESS_NAME);
    const isViewGroupModified = await planningPage.checkViewExistsWithViewGroup(VIEW_GROUP_NAME, VIEW_NAME);
    const validation = await commonFunctions.compareTwoValues(isViewGroupModified, true, `Is view ${VIEW_NAME} exist under viewgroup ${VIEW_GROUP_NAME}`);
    expect(validation).toBe(true);
  });

  test.afterAll(`Cleanup: Delete view group`, async ({ commonFunctions }) => {
    expect(capturedAuthToken && capturedViewGroupId, `View group ${VIEW_GROUP_NAME} was not captured during creation, so it cannot be deleted`).toBeTruthy();

    const headers = { Authorization: capturedAuthToken, accept: 'application/json' };
    const deleteResponse = await deleteViewGroupById(capturedViewGroupId, headers, `Delete View Group ${VIEW_GROUP_NAME}`);
    const statusValidation = await commonFunctions.compareTwoValues(deleteResponse.status, 204, `Is ${VIEW_GROUP_NAME} view group deleted via API`);
    expect(statusValidation).toBe(true);
  });
});
