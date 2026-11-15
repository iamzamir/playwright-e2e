import { test, expect } from '../../../configs/fixtures';

const runId = Date.now().toString(36);
const isSuccess = (message: string): boolean => /success/i.test(message);

type ActionItemContext = 'Process' | 'Subprocess';

test.describe.serial('Create Edit and Delete Actions Item with Authorized User', () => {
  let actionItemName: string;
  // Context of an action item that is created but not yet deleted, so afterAll can remove one a failed test left behind.
  let pendingContext: ActionItemContext | undefined;

  test.beforeAll(async ({ testData }) => {
    actionItemName = `${testData.ACTION_ITEM_NAME}_${runId}`;
  });

  test.afterAll(async ({ actionItemsPage, testUtil, planningListingPage, commonFunctions, testData }) => {
    if (!pendingContext) return;
    try {
      await testUtil.navigateToPlanningListingPage();
      await planningListingPage.launchContext(pendingContext, testData.PROCESS_NAME, pendingContext === 'Subprocess' ? testData.SUB_PROCESS_NAME : "");
      await testUtil.clickLeftpaneLinks("Action Items");
      if (await actionItemsPage.isActionItemDisplayed(actionItemName)) {
        await actionItemsPage.selectDelete(actionItemName);
      }
    } catch (error) {
      await commonFunctions.logMessage("WARN", `Cleanup of ${actionItemName} in ${pendingContext} failed: ${(error as Error).message}`);
    }
  });

  test('Test Case 1: Create/Edit/Delete Action Item - Process', async ({ actionItemsPage, testUtil, planningListingPage, commonFunctions, testData }) => {
    await test.step('Step 1: Launch Process context and open Action Items', async () => {
      await testUtil.launchAppFromCatalog(testData.REALM_NAME);
      await testUtil.navigateToPlanningListingPage();
      await planningListingPage.launchContext("Process", testData.PROCESS_NAME);
      await testUtil.clickLeftpaneLinks("Action Items");
    });

    await test.step('Step 2: Create Action Item - Process', async () => {
      pendingContext = 'Process';
      const msgCreateAI = await actionItemsPage.createActionItem(actionItemName, testData.STATUS, testData.ACTION_TYPE, testData.PRIORITY, testData.USER2, undefined, actionItemName, actionItemName);
      expect(await commonFunctions.compareTwoValues(isSuccess(msgCreateAI), true, "Create Action Item Assertion")).toBeTruthy();
    });

    await test.step('Step 3: Edit Action Item - Process', async () => {
      await actionItemsPage.selectEdit(actionItemName);
      await actionItemsPage.selectPriority(testData.PRIORITY_UPDATED);
      await actionItemsPage.clickSave();
      const msgEditAI = await actionItemsPage.getSuccessMsg();
      expect(await commonFunctions.compareTwoValues(isSuccess(msgEditAI), true, "Edit Action Item Assertion")).toBeTruthy();
    });

    await test.step('Step 4: Delete Action Item - Process', async () => {
      const msgDeleteAI = await actionItemsPage.selectDelete(actionItemName);
      pendingContext = undefined;
      expect(await commonFunctions.compareTwoValues(isSuccess(msgDeleteAI), true, "Delete Action Item Assertion")).toBeTruthy();
    });
  });

  test('Test Case 2: Create/Edit/Delete Action Item - Sub Process', async ({ actionItemsPage, testUtil, planningListingPage, commonFunctions, testData }) => {
    await test.step('Step 1: Open Sub Process context and its Action Items', async () => {
      await testUtil.navigateToPlanningListingPage();
      await planningListingPage.launchContext("Subprocess", testData.PROCESS_NAME, testData.SUB_PROCESS_NAME);
      await testUtil.clickLeftpaneLinks("Action Items");
    });

    await test.step('Step 2: Create Action Item - Sub Process', async () => {
      pendingContext = 'Subprocess';
      const msgCreateAI = await actionItemsPage.createActionItem(actionItemName, testData.STATUS, testData.ACTION_TYPE, testData.PRIORITY);
      expect(await commonFunctions.compareTwoValues(isSuccess(msgCreateAI), true, "Create Action Item Assertion")).toBeTruthy();
    });

    await test.step('Step 3: Edit Action Item - Sub Process', async () => {
      await actionItemsPage.selectEdit(actionItemName);
      await actionItemsPage.selectPriority(testData.PRIORITY_UPDATED);
      await actionItemsPage.clickSave();
      const msgEditAI = await actionItemsPage.getSuccessMsg();
      expect(await commonFunctions.compareTwoValues(isSuccess(msgEditAI), true, "Edit Action Item Assertion")).toBeTruthy();
    });

    await test.step('Step 4: Delete Action Item - Sub Process', async () => {
      const msgDeleteAI = await actionItemsPage.selectDelete(actionItemName);
      pendingContext = undefined;
      expect(await commonFunctions.compareTwoValues(isSuccess(msgDeleteAI), true, "Delete Action Item Assertion")).toBeTruthy();
    });
  });
});
