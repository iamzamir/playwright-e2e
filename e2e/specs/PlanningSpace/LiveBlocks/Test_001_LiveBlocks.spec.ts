import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
import TestUtil from "../../../util/test.util";
const Testdata = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/LiveBlocks/Test_001_LiveBlocks.json");

describe('Live Blocks', () => {
    const randomNumber = Math.floor(Math.random() * 1000);
    const user = "@" + Testdata.SECOND_USER;
    const TEST_COMMENT_1 = "Test_comment_1_" + randomNumber;
    const TEST_COMMENT_1_EDITED = "Test_comment_1_edited_" + randomNumber;
    const TEST_COMMENT_2 = "Test_comment_2_" + randomNumber;
    
    const selectView = async (viewName: string) => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.selectAllViewsOrFavourites("All Views");
        await PlanningSpace.clickDashBoard(viewName);
        await browser.pause(5000);
    }

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(Testdata.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, Testdata.PROCESS_NAME, false, false);
        await browser.pause(5000);
        await selectView(Testdata.VIEW_NAME);
    });

    // Perform Add, edit, delete actions from user1 and verify for user2, finally Unsubscribe for user2

    it('Test case 1: Add comment and verify in Comment panel for user1 & user2', async () => {
        await PlanningSpace.clickOnAddCommentActionOnCardCell(Testdata.CARD_TYPE, Testdata.CELL_VALUE_1);
        await PlanningSpace.tagUserInComment(user);
        await PlanningSpace.clickOnAddCommentActionOnCardCell(Testdata.CARD_TYPE, Testdata.CELL_VALUE_1);
        await PlanningSpace.addCommentInCardCell(TEST_COMMENT_1);
        await PlanningSpace.clickOnAddCommentActionOnCardCell(Testdata.CARD_TYPE, Testdata.CELL_VALUE_2);
        await PlanningSpace.tagUserInComment(user);
        await PlanningSpace.clickOnAddCommentActionOnCardCell(Testdata.CARD_TYPE, Testdata.CELL_VALUE_2);
        await PlanningSpace.addCommentInCardCell(TEST_COMMENT_2);
        // Verify comments in panel for user1
        await PlanningSpace.openCommentsPanel();
        const commentExists = await PlanningSpace.checkCommentExist(TEST_COMMENT_1);
        const commentExists2 = await PlanningSpace.checkCommentExist(TEST_COMMENT_2);
        const bValidation1 = await CommonFunctions.compareTwoValues(commentExists, true, `Comment exists for first user: ${commentExists}`);
        const bValidation2 = await CommonFunctions.compareTwoValues(commentExists2, true, `Comment exists for first user: ${commentExists2}`);
        await PlanningSpace.closeCommentsPanel();
        // Verify comments for user2
        await TestUtil.signOutAndLoginToPlanningSpaceWithProcess(Testdata.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, Testdata.PROCESS_NAME);
        await selectView(Testdata.VIEW_NAME);
        await browser.pause(5000);
        await PlanningSpace.openCommentsPanel();
        const commentExists3 = await PlanningSpace.checkCommentExist(TEST_COMMENT_1);
        const commentExists4 = await PlanningSpace.checkCommentExist(TEST_COMMENT_2);
        const bValidation3 = await CommonFunctions.compareTwoValues(commentExists3, true, `Comment exists for second user: ${commentExists3}`);
        const bValidation4 = await CommonFunctions.compareTwoValues(commentExists4, true, `Comment exists for second user: ${commentExists4}`);
        await PlanningSpace.closeCommentsPanel();
        expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
    });

    it('Test case 2: Edit comment and verify in Comments panel for user1 & user2', async () => {
        await TestUtil.signOutAndLoginToPlanningSpaceWithProcess(Testdata.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, Testdata.PROCESS_NAME);
        await selectView(Testdata.VIEW_NAME);
        await PlanningSpace.clickOnAddCommentActionOnCardCell(Testdata.CARD_TYPE, Testdata.CELL_VALUE_1);
        await PlanningSpace.editCommentInCardCell(TEST_COMMENT_1, TEST_COMMENT_1_EDITED);
        // verify for user1
        await PlanningSpace.openCommentsPanel();
        const commentEditedExists = await PlanningSpace.checkCommentExist(TEST_COMMENT_1_EDITED);
        const bValidation1 = await CommonFunctions.compareTwoValues(commentEditedExists, true, `Edited comment exists for first user: ${commentEditedExists}`);
        await PlanningSpace.closeCommentsPanel();
        // verify for user2
        await TestUtil.signOutAndLoginToPlanningSpaceWithProcess(Testdata.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, Testdata.PROCESS_NAME);
        await selectView(Testdata.VIEW_NAME);
        await PlanningSpace.openCommentsPanel();
        const commentEditedExists2 = await PlanningSpace.checkCommentExist(TEST_COMMENT_1_EDITED);
        const bValidation2 = await CommonFunctions.compareTwoValues(commentEditedExists2, true, `Edited comment exists for second user: ${commentEditedExists2}`);
        await PlanningSpace.closeCommentsPanel();
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

    it('Test case 3: Delete comment and verify in Comments panel for user1 & user2', async () => {
        await TestUtil.signOutAndLoginToPlanningSpaceWithProcess(Testdata.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, Testdata.PROCESS_NAME);
        await selectView(Testdata.VIEW_NAME);
        await PlanningSpace.clickOnAddCommentActionOnCardCell(Testdata.CARD_TYPE, Testdata.CELL_VALUE_1);
        await PlanningSpace.performCellCommentAction(TEST_COMMENT_1_EDITED, "Delete comment");
        // verify for user1
        await PlanningSpace.openCommentsPanel();
        const commentDeletedExists = await PlanningSpace.checkCommentExist(TEST_COMMENT_1_EDITED);
        const bValidation1 = await CommonFunctions.compareTwoValues(commentDeletedExists, false, `Deleted comment exists for first user: ${commentDeletedExists}`);
        await PlanningSpace.closeCommentsPanel();
        // verify for user2
        await TestUtil.signOutAndLoginToPlanningSpaceWithProcess(Testdata.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, Testdata.PROCESS_NAME);
        await selectView(Testdata.VIEW_NAME);
        await PlanningSpace.openCommentsPanel();
        const commentDeletedExists2 = await PlanningSpace.checkCommentExist(TEST_COMMENT_1_EDITED);
        const bValidation2 = await CommonFunctions.compareTwoValues(commentDeletedExists2, false, `Deleted comment exists for second user: ${commentDeletedExists2}`);
        await PlanningSpace.closeCommentsPanel();
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

    it('Test case 4: Unsubscribe and verify for user1 & user2', async () => {
        await browser.refresh();
        // Unsubscribe thread for user2
        await browser.pause(10000);
        await PlanningSpace.switchToMFEFrame();
        await PlanningSpace.clickOnAddCommentActionOnCardCell(Testdata.CARD_TYPE, Testdata.CELL_VALUE_2);
        await PlanningSpace.performCellThreadAction("Unsubscribe from thread");
        // verify for user2
        await PlanningSpace.openCommentsPanel();
        const commentUnsubscribedExists = await PlanningSpace.checkCommentExist(TEST_COMMENT_2);
        const bValidation1 = await CommonFunctions.compareTwoValues(commentUnsubscribedExists, false, `Unsubscribed Thread comment exists for first user: ${commentUnsubscribedExists}`);
        await PlanningSpace.closeCommentsPanel();
        expect(bValidation1).toBeTruthy();
    });

})