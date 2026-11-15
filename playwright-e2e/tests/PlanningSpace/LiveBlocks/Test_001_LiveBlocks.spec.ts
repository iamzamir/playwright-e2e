import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Live Blocks', () => {
  const testComment1 = uniqueName('Test_comment_1');
  const testComment1Edited = uniqueName('Test_comment_1_edited');
  const testComment2 = uniqueName('Test_comment_2');


  test('Test case 1: Add comment and verify in Comment panel for user1 and user2', async ({ planningPage, commonFunctions, testUtil, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.clickViewDropdown();
    await planningPage.selectViewType('All Views');
    await planningPage.selectView(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);
    
    const user = `@${testData.SECOND_USER}`;

    await planningPage.clickOnAddCommentActionOnCardCell(testData.CARD_TYPE, testData.CELL_VALUE_1);
    await planningPage.tagUserInComment(user);
    await planningPage.clickOnAddCommentActionOnCardCell(testData.CARD_TYPE, testData.CELL_VALUE_1);
    await planningPage.addCommentInCardCell(testComment1);
    await planningPage.clickOnAddCommentActionOnCardCell(testData.CARD_TYPE, testData.CELL_VALUE_2);
    await planningPage.tagUserInComment(user);
    await planningPage.clickOnAddCommentActionOnCardCell(testData.CARD_TYPE, testData.CELL_VALUE_2);
    await planningPage.addCommentInCardCell(testComment2);

    await planningPage.openCommentsPanel();
    await expect.poll(async () => await planningPage.checkCommentExist(testComment1), { timeout: 30000, message: 'Expected first comment in user1 panel' }).toBe(true);
    await expect.poll(async () => await planningPage.checkCommentExist(testComment2), { timeout: 30000, message: 'Expected second comment in user1 panel' }).toBe(true);
    const commentExistsUser1 = await planningPage.checkCommentExist(testComment1);
    const commentExists2User1 = await planningPage.checkCommentExist(testComment2);
    const validation1 = await commonFunctions.compareTwoValues(commentExistsUser1, true, `Comment exists for first user: ${commentExistsUser1}`);
    const validation2 = await commonFunctions.compareTwoValues(commentExists2User1, true, `Comment exists for first user: ${commentExists2User1}`);
    await planningPage.closeCommentsPanel();

    await testUtil.signOutAndLoginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.clickViewDropdown();
    await planningPage.selectViewType('All Views');
    await planningPage.selectView(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);

    await planningPage.openCommentsPanel();
    await expect.poll(async () => await planningPage.checkCommentExist(testComment1), { timeout: 30000, message: 'Expected first comment in user2 panel' }).toBe(true);
    await expect.poll(async () => await planningPage.checkCommentExist(testComment2), { timeout: 30000, message: 'Expected second comment in user2 panel' }).toBe(true);
    const commentExistsUser2 = await planningPage.checkCommentExist(testComment1);
    const commentExists2User2 = await planningPage.checkCommentExist(testComment2);
    const validation3 = await commonFunctions.compareTwoValues(commentExistsUser2, true, `Comment exists for second user: ${commentExistsUser2}`);
    const validation4 = await commonFunctions.compareTwoValues(commentExists2User2, true, `Comment exists for second user: ${commentExists2User2}`);
    await planningPage.closeCommentsPanel();

    expect(validation1 && validation2 && validation3 && validation4).toEqual(true);
  });

  test('Test case 2: Edit comment and verify in Comments panel for user1 and user2', async ({ planningPage, commonFunctions, testUtil, testData }) => {
    await testUtil.signOutAndLoginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.clickViewDropdown();
    await planningPage.selectViewType('All Views');
    await planningPage.selectView(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);

    await planningPage.clickOnAddCommentActionOnCardCell(testData.CARD_TYPE, testData.CELL_VALUE_1);
    await planningPage.editCommentInCardCell(testComment1, testComment1Edited);

    await planningPage.openCommentsPanel();
    await expect.poll(async () => await planningPage.checkCommentExist(testComment1Edited), { timeout: 30000, message: 'Expected edited comment in user1 panel' }).toBe(true);
    const commentEditedExistsUser1 = await planningPage.checkCommentExist(testComment1Edited);
    const validation1 = await commonFunctions.compareTwoValues(commentEditedExistsUser1, true, `Edited comment exists for first user: ${commentEditedExistsUser1}`);
    await planningPage.closeCommentsPanel();

    await testUtil.signOutAndLoginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.clickViewDropdown();
    await planningPage.selectViewType('All Views');
    await planningPage.selectView(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);

    await planningPage.openCommentsPanel();
    await expect.poll(async () => await planningPage.checkCommentExist(testComment1Edited), { timeout: 30000, message: 'Expected edited comment in user2 panel' }).toBe(true);
    const commentEditedExistsUser2 = await planningPage.checkCommentExist(testComment1Edited);
    const validation2 = await commonFunctions.compareTwoValues(commentEditedExistsUser2, true, `Edited comment exists for second user: ${commentEditedExistsUser2}`);
    await planningPage.closeCommentsPanel();

    expect(validation1 && validation2).toEqual(true);
  });

  test('Test case 3: Delete comment and verify in Comments panel for user1 and user2', async ({ planningPage, commonFunctions, testUtil, testData }) => {
    await testUtil.signOutAndLoginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.clickViewDropdown();
    await planningPage.selectViewType('All Views');
    await planningPage.selectView(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);

    await planningPage.clickOnAddCommentActionOnCardCell(testData.CARD_TYPE, testData.CELL_VALUE_1);
    await planningPage.performCellCommentAction(testComment1Edited, 'Delete comment');

    await planningPage.openCommentsPanel();
    await expect.poll(async () => await planningPage.checkCommentExist(testComment1Edited), { timeout: 30000, message: 'Expected edited comment deleted for user1' }).toBe(false);
    const commentDeletedExistsUser1 = await planningPage.checkCommentExist(testComment1Edited);
    const validation1 = await commonFunctions.compareTwoValues(commentDeletedExistsUser1, false, `Deleted comment exists for first user: ${commentDeletedExistsUser1}`);
    await planningPage.closeCommentsPanel();

    await testUtil.signOutAndLoginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.clickViewDropdown();
    await planningPage.selectViewType('All Views');
    await planningPage.selectView(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);

    await planningPage.openCommentsPanel();
    await expect.poll(async () => await planningPage.checkCommentExist(testComment1Edited), { timeout: 30000, message: 'Expected edited comment deleted for user2' }).toBe(false);
    const commentDeletedExistsUser2 = await planningPage.checkCommentExist(testComment1Edited);
    const validation2 = await commonFunctions.compareTwoValues(commentDeletedExistsUser2, false, `Deleted comment exists for second user: ${commentDeletedExistsUser2}`);
    await planningPage.closeCommentsPanel();

    expect(validation1 && validation2).toEqual(true);
  });

  test('Test case 4: Unsubscribe and verify for user2', async ({ planningPage, commonFunctions, testData, page }) => {
    await page.reload();
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);
    await planningPage.clickOnAddCommentActionOnCardCell(testData.CARD_TYPE, testData.CELL_VALUE_2);
    await planningPage.performCellThreadAction('Unsubscribe from thread');

    await planningPage.openCommentsPanel();
    await expect.poll(async () => await planningPage.checkCommentExist(testComment2), { timeout: 30000, message: 'Expected unsubscribed thread comment hidden for user2' }).toBe(false);
    const commentUnsubscribedExists = await planningPage.checkCommentExist(testComment2);
    const validation1 = await commonFunctions.compareTwoValues(commentUnsubscribedExists, false, `Unsubscribed thread comment exists for user2: ${commentUnsubscribedExists}`);
    await planningPage.closeCommentsPanel();

    expect(validation1).toEqual(true);
  });
});
