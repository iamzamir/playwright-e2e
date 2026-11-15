import { test, expect } from '../../../configs/fixtures';
import { PlanningPage } from '../../../pageobjects/planning.page';
import { ScopePage } from '../../../pageobjects/scope.page';

/**
 * Applies the saved filter the comment cells come from. The user's global scope can still point at a filter another
 * spec deleted (ScopeBatch Test_013/014 "New Filter NNN"), which leaves the view on the "Set Filter" empty state.
 */
const applyCommentCellsFilter = async (planningPage: PlanningPage, scopePage: ScopePage, filterName: string): Promise<void> => {
  await planningPage.openComponent('Scope');
  expect(await scopePage.searchFilter(filterName), `Saved filter ${filterName} is available`).toBeTruthy();
  await scopePage.clickOnApplyFiltersBtn();
};

test.describe.serial('Live Blocks - New Extension', () => {
  const timestamp = Date.now();
  const testId = `${timestamp}`;
  const testComment1 = `COMMENT_1_${testId}`;
  const testComment1Edited = `COMMENT_1_EDITED_${testId}`;
  const testComment2 = `COMMENT_2_${testId}`;
  let commentDetails: Record<string, Record<string, string>> = {};

  test.beforeAll(async ({ testUtil, planningPage, scopePage, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.clickViewDropdown();
    await planningPage.selectView(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);
    await applyCommentCellsFilter(planningPage, scopePage, testData.FILTER_NAME);
  });

  test('Test case 1: Add, edit, fetch details of comment1 and delete comment2 from user1', async ({ planningPage, commonFunctions, testData }) => {
    const user = `@${testData.SECOND_USER}`;

    await planningPage.openCommentsPanel();
    const commentExists1 = await planningPage.checkCommentExist(testComment1);
    if (!commentExists1) {
      await planningPage.closeCommentsPanel();
      await planningPage.clickOnAddCommentActionOnCardCell(testData.CARD_TYPE, testData.CELL_VALUE_1);
      await planningPage.addCommentInCardCell(testComment1, user);
      await planningPage.openCommentsPanel();
    }

    await planningPage.closeCommentsPanel();
    await planningPage.clickOnAddCommentActionOnCardCell(testData.CARD_TYPE, testData.CELL_VALUE_2);
    await planningPage.addCommentInCardCell(testComment2, user);
    await planningPage.openCommentsPanel();
    await planningPage.searchCommentInThepannel(testComment1);
    await planningPage.selectActionOnComment(testComment1, 'Details');
    commentDetails = await planningPage.getCommentDetails();
    const edited = await planningPage.editComment(testComment1, testComment1Edited);
    await planningPage.searchCommentInThepannel(testComment2);
    const deleted = await planningPage.deleteComment(testComment2);
    await planningPage.closeCommentsPanel();
    expect(edited && deleted).toEqual(true);
  });

  test('Test case 2: Verify edited comment details for user2', async ({ testUtil, planningPage, scopePage, commonFunctions, testData }) => {
    await testUtil.signOutAndLoginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.clickViewDropdown();
    await planningPage.selectView(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);
    await applyCommentCellsFilter(planningPage, scopePage, testData.FILTER_NAME);
    await planningPage.openCommentsPanel();
    const commentExists1 = await planningPage.checkCommentExist(testComment1Edited);
    const validation1 = await commonFunctions.compareTwoValues(commentExists1, true, `Comment1 - ${testComment1Edited} exists for second user: ${commentExists1}`);
    const commentExists2 = await planningPage.checkCommentExist(testComment2);
    const validation2 = await commonFunctions.compareTwoValues(commentExists2, false, `Comment2 - ${testComment2} exists for second user: ${commentExists2}`);
    const checkDeleteActionExists = await planningPage.selectActionOnComment(testComment1Edited, 'Delete');
    const validation3 = await commonFunctions.compareTwoValues(checkDeleteActionExists, false, `Delete action should not be available on comment ${testComment1Edited} for user ${testData.SECOND_USER}`);
    await planningPage.performActionOnCommentIfExists('Details');
    const details = await planningPage.getCommentDetails();
    const validation4 = await commonFunctions.compareTwoValues(JSON.stringify(details), JSON.stringify(commentDetails), 'Details should be same for both users');
    await planningPage.closeCommentsPanel();
    expect(validation1 && validation2 && validation3 && validation4).toEqual(true);
  });
});
