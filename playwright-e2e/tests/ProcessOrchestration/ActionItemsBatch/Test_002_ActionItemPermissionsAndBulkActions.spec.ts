import { test, expect } from '../../../configs/fixtures';

// Run-unique names keep each run independent of action items left by earlier or concurrent runs.
const runId = Date.now().toString(36);
const isSuccess = (message: string): boolean => /success/i.test(message);

test.describe.serial('Action Item permissions and bulk actions with an authorized and an unauthorized user', () => {
  let AI_PROCESS: string, AI_SUBPROCESS: string, AI_ASSIGNED: string;
  let AI_PROCESS2: string, AI_SUBPROCESS2: string;
  // User 1 owns these; user 2 cannot delete them, so afterAll logs back in as user 1 to remove them.
  const user1Items: string[] = [];

  test.beforeAll(async ({ testData }) => {
    AI_PROCESS = `${testData.ACTION_ITEM_NAME}_PROCESS_${runId}`;
    AI_SUBPROCESS = `${testData.ACTION_ITEM_NAME}_SUBPROCESS_${runId}`;
    AI_ASSIGNED = `${testData.ACTION_ITEM_NAME}_PROCESS_ASSIGNED_${runId}`;
    AI_PROCESS2 = `${testData.ACTION_ITEM_NAME}_PROCESS_USER2_${runId}`;
    AI_SUBPROCESS2 = `${testData.ACTION_ITEM_NAME}_SUBPROCESS_USER2_${runId}`;
  });

  test.afterAll(async ({ actionItemsPage, testUtil, planningListingPage, commonFunctions, testData }) => {
    if (user1Items.length === 0) return;
    try {
      await testUtil.signOutAndLoginFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
      await testUtil.navigateToPlanningListingPage();
      await planningListingPage.launchContext("Process", testData.PROCESS_NAME);
      await testUtil.clickLeftpaneLinks("Action Items");
      await actionItemsPage.setPageSize("20");
      // The process grid also lists the subprocess and assumption items, so all of them are deleted from here.
      for (const actionItem of user1Items) {
        if (await actionItemsPage.isActionItemDisplayed(actionItem)) {
          await actionItemsPage.selectDelete(actionItem);
        }
      }
    } catch (error) {
      await commonFunctions.logMessage("WARN", `Cleanup of user 1 action items ${user1Items.join(', ')} failed: ${(error as Error).message}`);
    }
  });

  test('Test Case 1: User 1 creates Action Items in Process and Subprocess', async ({ actionItemsPage, testUtil, planningListingPage, commonFunctions, testData }) => {
    await test.step('Step 1: Create Action Items - Process (one assigned to user 2)', async () => {
      await testUtil.launchAppFromCatalog(testData.REALM_NAME);
      await testUtil.navigateToPlanningListingPage();
      await planningListingPage.launchContext("Process", testData.PROCESS_NAME);
      await testUtil.clickLeftpaneLinks("Action Items");
      user1Items.push(AI_PROCESS);
      const msgProcess = await actionItemsPage.createActionItem(AI_PROCESS, testData.STATUS, testData.ACTION_TYPE, testData.PRIORITY);
      user1Items.push(AI_ASSIGNED);
      const msgAssigned = await actionItemsPage.createActionItem(AI_ASSIGNED, testData.STATUS, testData.ACTION_TYPE, testData.PRIORITY, testData.ASSIGNED_USER);
      const validation1 = await commonFunctions.compareTwoValues(isSuccess(msgProcess), true, "Create Action Item Assertion - Process");
      const validation2 = await commonFunctions.compareTwoValues(isSuccess(msgAssigned), true, "Create Action Item Assigned to User 2 Assertion - Process");
      expect(validation1 && validation2).toBeTruthy();
    });

    await test.step('Step 2: Create Action Item - Subprocess', async () => {
      await testUtil.navigateToPlanningListingPage();
      await planningListingPage.launchContext("Subprocess", testData.PROCESS_NAME, testData.SUB_PROCESS_NAME);
      await testUtil.clickLeftpaneLinks("Action Items");
      user1Items.push(AI_SUBPROCESS);
      const msg = await actionItemsPage.createActionItem(AI_SUBPROCESS, testData.STATUS, testData.ACTION_TYPE, testData.PRIORITY);
      expect(await commonFunctions.compareTwoValues(isSuccess(msg), true, "Create Action Item Assertion - Subprocess")).toBeTruthy();
    });
  });

  test('Test Case 2: User 2 cannot edit or delete user 1 Action Item - Process', async ({ actionItemsPage, testUtil, planningListingPage, commonFunctions, testData }) => {
    await test.step('Step 1: Sign out and log in as user 2', async () => {
      // Built at runtime: the literal user 2 variable name would make the auth fixture
      // preload user 2 storage state for the whole file, skipping the user 1 steps above.
      const secondUserName = process.env['FUNCTIONAL_TEST_USERNAME' + '2'] as string;
      await testUtil.signOutAndLoginFromCatalog(testData.REALM_NAME, secondUserName, process.env.FUNCTIONAL_TEST_PASSWORD as string);
      await testUtil.navigateToPlanningListingPage();
      await planningListingPage.launchContext("Process", testData.PROCESS_NAME, "", "", false);
      await testUtil.clickLeftpaneLinks("Action Items");
      await actionItemsPage.setPageSize("20");
    });

    await test.step('Step 2: Edit and Delete are disabled with the no-access tooltip', async () => {
      const access = await actionItemsPage.getDisabledRowActions(AI_PROCESS);
      const validation1 = await commonFunctions.compareTwoValues(access.isEditDisabled, true, "Edit Should be Disabled Assertion - Process");
      const validation2 = await commonFunctions.compareTwoValues(access.editToolTip, testData.TOOL_TIP, "Tool Tip Assertion for Edit - Process");
      const validation3 = await commonFunctions.compareTwoValues(access.isDeleteDisabled, true, "Delete Should be Disabled Assertion - Process");
      const validation4 = await commonFunctions.compareTwoValues(access.deleteToolTip, testData.TOOL_TIP, "Tool Tip Assertion for Delete - Process");
      expect(validation1 && validation2 && validation3 && validation4).toBeTruthy();
    });
  });

  test('Test Case 3: Bulk edit by user 2 changes only its own and assigned Action Items - Process', async ({ actionItemsPage, commonFunctions, testData }) => {
    const msgCreate = await actionItemsPage.createActionItem(AI_PROCESS2, testData.STATUS, testData.ACTION_TYPE, testData.PRIORITY);
    const validation1 = await commonFunctions.compareTwoValues(isSuccess(msgCreate), true, "Create Action Item for Process under User 2 Assertion");

    const { alertMsg, successMsg } = await actionItemsPage.changeBulkStatus(testData.CHANGE_STATUS, true);
    const validation2 = await commonFunctions.compareTwoValues(alertMsg, testData.PARTIAL_ALERT_MSG, "Partial Alert Message for Bulk Edit - Process");
    const validation3 = await commonFunctions.compareTwoValues(successMsg, testData.BULK_EDIT_SUCCESS, "Bulk Edit Action Item Assertion - Process");

    // The changed items are read first: once they show the new status the grid has refreshed.
    const validation4 = await commonFunctions.compareTwoValues(await actionItemsPage.waitForColumnValue(AI_PROCESS2, "Status", testData.CHANGE_STATUS), testData.CHANGE_STATUS, "Status of User 2 Action Item after Bulk Edit", true);
    const validation5 = await commonFunctions.compareTwoValues(await actionItemsPage.waitForColumnValue(AI_ASSIGNED, "Status", testData.CHANGE_STATUS), testData.CHANGE_STATUS, "Status of Action Item Assigned to User 2 after Bulk Edit", true);
    const validation6 = await commonFunctions.compareTwoValues(await actionItemsPage.getColumnValueByActionItem(AI_PROCESS, "Status"), testData.STATUS, "Status of User 1 Process Action Item after Bulk Edit", true);
    const validation7 = await commonFunctions.compareTwoValues(await actionItemsPage.getColumnValueByActionItem(AI_SUBPROCESS, "Status"), testData.STATUS, "Status of User 1 Subprocess Action Item after Bulk Edit", true);
    expect(validation1 && validation2 && validation3 && validation4 && validation5 && validation6 && validation7).toBeTruthy();
  });

  test('Test Case 4: Bulk delete by user 2 removes only its own and assigned Action Items - Process', async ({ actionItemsPage, commonFunctions, testData }) => {
    const { alertMsg, successMsg } = await actionItemsPage.deleteBulkActionItems(true);
    const validation1 = await commonFunctions.compareTwoValues(alertMsg, testData.PARTIAL_ALERT_MSG, "Partial Alert Message for Bulk Delete - Process");
    const validation2 = await commonFunctions.compareTwoValues(successMsg, testData.BULK_DELETE_SUCCESS, "Bulk Delete Action Item Assertion - Process");
    const validation3 = await commonFunctions.compareTwoValues(await actionItemsPage.waitForActionItemRemoved(AI_PROCESS2), true, "User 2 Action Item is deleted by user 2");
    const validation4 = await commonFunctions.compareTwoValues(await actionItemsPage.waitForActionItemRemoved(AI_ASSIGNED), true, "Action Item Assigned to User 2 is deleted by user 2");
    if (validation4) user1Items.splice(user1Items.indexOf(AI_ASSIGNED), 1);

    const names = await actionItemsPage.getAllValuesOfColumn("Name");
    const validation5 = await commonFunctions.compareTwoValues([AI_PROCESS, AI_SUBPROCESS].every((name) => names.includes(name)), true, "User 1 Action Items are not deleted by user 2");
    expect(validation1 && validation2 && validation3 && validation4 && validation5).toBeTruthy();
  });

  test('Test Case 5: Bulk actions are disabled when only unauthorized Action Items are selected - Process', async ({ actionItemsPage, commonFunctions, testData }) => {
    await actionItemsPage.selectAllCheckbox();
    await actionItemsPage.clickBulkAction();
    const validation1 = await commonFunctions.compareTwoValues(await actionItemsPage.toolTipOfBulkChange(), testData.BULK_CHANGE_TOOLTIP, "Bulk Change Tooltip Assertion");
    const validation2 = await commonFunctions.compareTwoValues(await actionItemsPage.toolTipOfBulkDelete(), testData.BULK_DELETE_TOOLTIP, "Bulk Delete Tooltip Assertion");
    await actionItemsPage.closeOpenMenu();
    expect(validation1 && validation2).toBeTruthy();
  });

  test('Test Case 6: User 2 cannot edit or delete user 1 Action Item - Subprocess', async ({ actionItemsPage, testUtil, planningListingPage, commonFunctions, testData }) => {
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext("Subprocess", testData.PROCESS_NAME, testData.SUB_PROCESS_NAME, "", false);
    await testUtil.clickLeftpaneLinks("Action Items");
    await actionItemsPage.setPageSize("20");

    const access = await actionItemsPage.getDisabledRowActions(AI_SUBPROCESS);
    const validation1 = await commonFunctions.compareTwoValues(access.isEditDisabled, true, "Edit Should be Disabled Assertion - Subprocess");
    const validation2 = await commonFunctions.compareTwoValues(access.editToolTip, testData.TOOL_TIP, "Tool Tip Assertion for Edit - Subprocess");
    const validation3 = await commonFunctions.compareTwoValues(access.isDeleteDisabled, true, "Delete Should be Disabled Assertion - Subprocess");
    const validation4 = await commonFunctions.compareTwoValues(access.deleteToolTip, testData.TOOL_TIP, "Tool Tip Assertion for Delete - Subprocess");
    expect(validation1 && validation2 && validation3 && validation4).toBeTruthy();
  });

  test('Test Case 7: Bulk edit by user 2 changes only its own Action Items - Subprocess', async ({ actionItemsPage, commonFunctions, testData }) => {
    const msgCreate = await actionItemsPage.createActionItem(AI_SUBPROCESS2, testData.STATUS, testData.ACTION_TYPE, testData.PRIORITY);
    const validation1 = await commonFunctions.compareTwoValues(isSuccess(msgCreate), true, "Create Action Item for Subprocess under User 2 Assertion");

    const { alertMsg, successMsg } = await actionItemsPage.changeBulkStatus(testData.CHANGE_STATUS, true);
    const validation2 = await commonFunctions.compareTwoValues(alertMsg, testData.PARTIAL_ALERT_MSG, "Partial Alert Message for Bulk Edit - Subprocess");
    const validation3 = await commonFunctions.compareTwoValues(successMsg, testData.BULK_EDIT_SUCCESS, "Bulk Edit Action Item Assertion - Subprocess");
    const validation4 = await commonFunctions.compareTwoValues(await actionItemsPage.waitForColumnValue(AI_SUBPROCESS2, "Status", testData.CHANGE_STATUS), testData.CHANGE_STATUS, "Status of User 2 Subprocess Action Item after Bulk Edit", true);
    const validation5 = await commonFunctions.compareTwoValues(await actionItemsPage.getColumnValueByActionItem(AI_SUBPROCESS, "Status"), testData.STATUS, "Status of User 1 Subprocess Action Item after Bulk Edit", true);
    expect(validation1 && validation2 && validation3 && validation4 && validation5).toBeTruthy();
  });

  test('Test Case 8: Bulk delete by user 2 removes only its own Action Items - Subprocess', async ({ actionItemsPage, commonFunctions, testData }) => {
    const { alertMsg, successMsg } = await actionItemsPage.deleteBulkActionItems(true);
    const validation1 = await commonFunctions.compareTwoValues(alertMsg, testData.PARTIAL_ALERT_MSG, "Partial Alert Message for Bulk Delete - Subprocess");
    const validation2 = await commonFunctions.compareTwoValues(successMsg, testData.BULK_DELETE_SUCCESS, "Bulk Delete Action Item Assertion - Subprocess");
    const validation3 = await commonFunctions.compareTwoValues(await actionItemsPage.waitForActionItemRemoved(AI_SUBPROCESS2), true, "User 2 Subprocess Action Item is deleted by user 2");
    const names = await actionItemsPage.getAllValuesOfColumn("Name");
    const validation4 = await commonFunctions.compareTwoValues(names.includes(AI_SUBPROCESS), true, "User 1 Subprocess Action Item is not deleted by user 2");
    expect(validation1 && validation2 && validation3 && validation4).toBeTruthy();
  });
});
