import PlanningSpace from "../../../pageobjects/planning.page";
import ActionItems from "../../../pageobjects/action-items.page";
import CommonFunctions from "../../../util/common.util";
import ProcessPage from "../../../pageobjects/process.page";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/ActionItemsBatch/Test_004_BulkEditAndDeleteActionItemsWithAssignedUser.json");

const AI_PROCESS = TestData.ACTION_ITEM_NAME + "_PROCESS_BULK_ASSIGN_1"

describe(`Bulk Edit and Delete Actions Item with Assigned Users`, async () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    });

    it(`Test Case 1: Create Action Item`, async () => {
        await browser.pause(5000);
        await ProcessPage.clickLeftpaneLinks("Action Items");
        if (!await ActionItems.isActionItemDisplayed(AI_PROCESS)) {
            let msg: string = await ActionItems.createActionItem(AI_PROCESS, TestData.STATUS, TestData.ACTION_TYPE, TestData.PRIORITY, TestData.ASSIGNED_USER);
            let validation: boolean = await CommonFunctions.compareTwoValues(msg.includes("success"), true, "Create Action Item Assertion");
            expect(validation).toBeTruthy();
        } else {
            await CommonFunctions.logMessage("INFO", AI_PROCESS + " is already available");
        }
    });

    it(`Test Case 2: Signout and Login With Second User`, async () => {
        await PlanningSpace.signOut();
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME, true, false);
        await browser.pause(5000);
    });

    it(`Test Case 3: Verify Bulk Edit - With Assigned User`, async () => {
        await browser.pause(5000);
        await ProcessPage.clickLeftpaneLinks("Action Items");
        const { alertMsg: editAlertMsg, successMsg: editSuccessMsg } = await ActionItems.changeBulkStatus(TestData.CHANGE_STATUS, true);
        let validation1: boolean = await CommonFunctions.compareTwoValues(editSuccessMsg, TestData.BULK_EDIT_SUCCESS, "Bulk Edit Action Item Assertion");
        await browser.pause(5000);
        let statusOfAI: string = await ActionItems.getColumnValueByActionItem(AI_PROCESS, "Status");
        let validation2: boolean = await CommonFunctions.compareTwoValues(statusOfAI.toLowerCase(), TestData.CHANGE_STATUS.toLowerCase(), "Status of Assigned Action Item after Bulk Edit");
        expect(validation1 && validation2).toBeTruthy();
    });

    it(`Test Case 4: Verify Bulk Delete - With Assigned User`, async () => {
        const { alertMsg: deleteAlertMsg, successMsg: deleteSuccessMsg } = await ActionItems.deleteBulkActionItems(true);
        let validation1: boolean = await CommonFunctions.compareTwoValues(deleteSuccessMsg, TestData.BULK_DELETE_SUCCESS, "Bulk Delete Action Item Assertion");
        await browser.pause(5000);
        let arrActionItems: string[] = await ActionItems.getAllValuesOfColumn("Name");
        await CommonFunctions.logMessage("INFO", "Action Items: " + arrActionItems);
        let validation2: boolean = await CommonFunctions.compareTwoValues(!arrActionItems.includes(AI_PROCESS), true, "Assigned Action Item is deleted with user 2");
        expect(validation1 && validation2).toBeTruthy();
    });

    it(`Test Case 5: Verify Bulk Actions enabled and edit, delete disabled post bulk action`, async () => {
        let validation1: boolean = false;
        let validation2: boolean = false;
        browser.setTimeout({ implicit: 10000 });
        try {
            await ActionItems.selectBulkAction("Change Status");
        } catch (e) {
            await CommonFunctions.logMessage("INFO", "Edit is Disabled for unauthorized and unassigned Action Items");
            validation1 = true;
        }
        try {
            await ActionItems.deleteBulkActionItems(true);
        } catch (e) {
            await CommonFunctions.logMessage("INFO", "Delete is Disabled for unauthorized and unassigned Action Items");
            validation2 = true;
        }
        browser.setTimeout({ implicit: 60000 });
        expect(validation1 && validation2).toBeTruthy();
    });


})