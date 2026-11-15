import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
import TestUtil from "../../../util/test.util";
const Testdata = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/LiveBlocks/Test_002_LiveBlocks.json");

describe('Live Blocks - New Extension', () => {
    // Generate unique identifiers for test isolation
    const timestamp = Date.now();
    const testId = `${timestamp}`;
    
    // Test data constants
    const user = "@" + Testdata.SECOND_USER;
    const TEST_COMMENT_1 = `COMMENT_1`;
    const TEST_COMMENT_1_EDITED = `COMMENT_1_EDITED_${testId}`;
    const TEST_COMMENT_2 = `COMMENT_2_${testId}`;
    
    const selectView = async (viewName: string) => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(viewName);
        await browser.pause(5000);
    }

    let commentDetails: any = {};
    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(Testdata.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, Testdata.PROCESS_NAME, false, false);
        await browser.pause(5000);
        await selectView(Testdata.VIEW_NAME);
    });

    it(`Test case 1: Add, edit, fetch details of comment1 - ${TEST_COMMENT_1} and delete comment2 - ${TEST_COMMENT_2} from user1 - ${Testdata.FIRST_USER_NAME}`, async () => {
        //add comment only if doesn't exist in the pannel
        await PlanningSpace.openCommentsPanel();
        await browser.pause(2000);
        const commentExists1 = await PlanningSpace.checkCommentExist(TEST_COMMENT_1);
        if(!commentExists1) {
            await PlanningSpace.clickOnAddCommentActionOnCardCell(Testdata.CARD_TYPE, Testdata.CELL_VALUE_1);
            await PlanningSpace.addCommentInCardCell(TEST_COMMENT_1, user, false);
        }

        await PlanningSpace.clickOnAddCommentActionOnCardCell(Testdata.CARD_TYPE, Testdata.CELL_VALUE_2);
        await PlanningSpace.addCommentInCardCell(TEST_COMMENT_2, user, false);
        await browser.pause(4000);

        //get comment details
        await PlanningSpace.searchCommentInThepannel(TEST_COMMENT_1);
        await PlanningSpace.selectActionOnComment(TEST_COMMENT_1, 'Details')
        commentDetails = await PlanningSpace.getCommentDetails()
        
        //edit comment1
        const boolean1 = await PlanningSpace.editComment(TEST_COMMENT_1, TEST_COMMENT_1_EDITED)

        //delete comment2
        await PlanningSpace.searchCommentInThepannel(TEST_COMMENT_2);
        const boolean2 = await PlanningSpace.deleteComment(TEST_COMMENT_2);
        expect(boolean1 && boolean2).toBeTruthy();
        
    });

    it(`Test case 2: Verify edited comment1 - ${TEST_COMMENT_1_EDITED} details for user2`, async () => {
        await TestUtil.signOutAndLoginToPlanningSpaceWithProcess(Testdata.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, Testdata.PROCESS_NAME);
        await selectView(Testdata.VIEW_NAME);
        await browser.pause(5000);

        await PlanningSpace.openCommentsPanel();
        await browser.pause(4000);

        const commentExists1 = await PlanningSpace.checkCommentExist(TEST_COMMENT_1_EDITED);
        const bValidation1 = await CommonFunctions.compareTwoValues(commentExists1, true, `Comment1 - ${TEST_COMMENT_1_EDITED} exists for second user: ${commentExists1}`);
        
        const commentExists2 = await PlanningSpace.checkCommentExist(TEST_COMMENT_2);
        const bValidation2 = await CommonFunctions.compareTwoValues(commentExists2, false, `Comment2- ${TEST_COMMENT_2} exists for second user: ${commentExists2}`);

        const checkActionExists = await PlanningSpace.selectActionOnComment(TEST_COMMENT_1_EDITED, 'Delete')
        const bValidation3 = await CommonFunctions.compareTwoValues(checkActionExists, false, `Delete action should not be available on the comment ${TEST_COMMENT_1_EDITED} for the user ${Testdata.SECOND_USER_NAME}`);
        
        await PlanningSpace.performActionOnCommentIfExists('Details')
        const details = await PlanningSpace.getCommentDetails()
        const bValidation4 = await CommonFunctions.compareTwoValues(JSON.stringify(details), JSON.stringify(commentDetails), 'details should be same for the both users')
        await PlanningSpace.closeCommentsPanel();

        expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
    });


})