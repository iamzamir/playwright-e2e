import { test, expect } from '../../../configs/fixtures';
import { ApiUtil } from '../../../util/api.util';

test.describe.serial('Dirty state', () => {
  let accessToken: string;
  let headers: Record<string, string>;
  let expectedDirtyCount = 1;
  let featureFlagName: string;
  const apiUtil = new ApiUtil();

  test.beforeAll(async () => {
    accessToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };
  });

  test('Test Case 1: *Should be appended for view name when data is modified in the card', async ({ testUtil, planningPage, cardsPage, commonFunctions, testData, page }) => {
    featureFlagName = testData.FEATURE_FLAG_NAME;
    const url: string = (process.env.API_BASE_URL as string) + (process.env.UPDATE_FEATURE_TOGGLE as string).replace('{featureFlagName}', testData.FEATURE_FLAG_NAME);
    const response = await apiUtil.processAPIRequest('PUT', url, { name: testData.FEATURE_FLAG_NAME, isEnabled: true }, headers, 'Update feature toggle for dirty state', 'status');
    const bValidation = await commonFunctions.compareTwoValues(response, 200, 'Feature toggle updated successfully');
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.clickViewDropdown();
    await planningPage.selectView(testData.VIEW_NAME_1);
    await cardsPage.editTableCardAndVerifyButtons(testData.ENHANCED_TABLE_CARD_NAME);
    const tableEditStatus = await cardsPage.makeTableCellEditableAndSaveChanges();
    const pivotEditStatus = await cardsPage.editPivotCardCellValue( testData.MAAS_PIVOT_CARD_NAME, testData.MAAS_PIVOT_CARD_DIRTY_STATE_CELL, testData.MAAS_PIVOT_CARD_DIRTY_STATE_CELL_CHANGE_TO);
    expectedDirtyCount = pivotEditStatus ? 2 : 1;
    await commonFunctions.logMessage('INFO', `Pivot edit status: ${pivotEditStatus}. Expected dirty cards count: ${expectedDirtyCount}`);
    await page.waitForTimeout(4000);
    const isDirty = await planningPage.verifyViewIsDirty(testData.VIEW_NAME_1, expectedDirtyCount);
    await commonFunctions.compareTwoValues(isDirty, true, `View ${testData.VIEW_NAME_1} is dirty`);
    expect(bValidation && tableEditStatus && isDirty).toBeTruthy();
  });

  test('Test Case 2: Should get popup when we try to switch from one view to another view', async ({ planningPage, commonFunctions, testData }) => {
    await planningPage.clickViewDropdown();
    await planningPage.selectView(testData.VIEW_NAME_2);
    await planningPage.clickOnDirtyStatePopupButton('Stay on this page');
    await planningPage.clickViewDropdown();
    const isDirty = await planningPage.verifyViewIsDirty(testData.VIEW_NAME_1, expectedDirtyCount);
    await commonFunctions.compareTwoValues(isDirty, true, `View ${testData.VIEW_NAME_1} is still dirty after canceling the popup`);
    expect(isDirty).toBeTruthy();
  });

  //Commenting the below test case due to Stay on Screen popup is not supported to the Manage Scenario from Scenario power bar.
  // test('Test Case 3: Should get popup when we try to switch from one module to another module', async ({ planningPage, commonFunctions, testData }) => {
  //   await planningPage.goToManageScenarios();
  //   await planningPage.clickOnDirtyStatePopupButton('Stay on this page');
  //   const isDirty = await planningPage.verifyViewIsDirty(testData.VIEW_NAME_1, expectedDirtyCount);
  //   await commonFunctions.compareTwoValues(isDirty, true, `View ${testData.VIEW_NAME_1} is still dirty after canceling the popup`);
  //   expect(isDirty).toBeTruthy();
  // });

  test('Test Case 4: Should get popup when we try to logout', async ({ testUtil, page }) => {
    await page.waitForTimeout(2000);
    await testUtil.signOut();
    const hasDialog = await testUtil.handleBrowserPopup('cancel');
    expect(hasDialog).toBeTruthy();
  });

  test("Test Case 5: Should get popup when we click on refresh button and data should get lost when 'Continue Without Saving' is clicked", async ({ planningPage, commonFunctions, testData, page }) => {
    await page.waitForTimeout(4000);
    await planningPage.clickOnDashboardRefreshBtn();
    await planningPage.clickOnDirtyStatePopupButton('Continue without saving');
    const isDirty = await planningPage.verifyViewIsDirty(testData.VIEW_NAME_1, 0);
    await commonFunctions.compareTwoValues(isDirty, false, `View ${testData.VIEW_NAME_1} is not dirty after clicking on refresh yes`);
    expect(isDirty).toBeFalsy();
  });

  test('Test Case 6: Revert Maas pivot card to original state', async ({ planningPage, cardsPage, commonFunctions, testData }) => {
    if (expectedDirtyCount === 2) {
      const pivotEditStatus = await cardsPage.editPivotCardCellValue(testData.MAAS_PIVOT_CARD_NAME, testData.MAAS_PIVOT_CARD_DIRTY_STATE_CELL_CHANGE_TO, testData.MAAS_PIVOT_CARD_DIRTY_STATE_CELL);
      if (pivotEditStatus) {
        await cardsPage.revertMaasPivotCardChanges();
      }
    }
    const isDirty = await planningPage.verifyViewIsDirty(testData.VIEW_NAME_1, 0);
    await commonFunctions.compareTwoValues(isDirty, false, `View ${testData.VIEW_NAME_1} is not dirty after reverting the card`);
    expect(isDirty).toBeFalsy();
  });

  test('Test Case 8: Should not get popup when we try to logout from non dirty views', async ({ testUtil, page }) => {
    await page.waitForTimeout(2000);
    await testUtil.signOut();
    const hasDialog = await testUtil.handleBrowserPopup('cancel');
    expect(hasDialog).toBeFalsy();
  });

  test.afterAll(async ({ testData }) => {
    const dirtyStateFlagName = featureFlagName || testData.FEATURE_FLAG_NAME;
    if (!headers || !headers.Authorization) {
      accessToken = await apiUtil.getBearerToken();
      headers = {
        accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      };
    }

    const url: string = (process.env.API_BASE_URL as string) + (process.env.UPDATE_FEATURE_TOGGLE as string).replace('{featureFlagName}', dirtyStateFlagName);
    const response = await apiUtil.processAPIRequest('PUT', url, { name: dirtyStateFlagName, isEnabled: false }, headers, 'Disable feature toggle for dirty state (afterAll cleanup)', 'status');
    expect(response).toBe(200);
  });
});