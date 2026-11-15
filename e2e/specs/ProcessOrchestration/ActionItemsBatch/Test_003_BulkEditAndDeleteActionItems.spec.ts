import PlanningSpace from "../../../pageobjects/planning.page";
import ActionItems from "../../../pageobjects/action-items.page";
import CommonFunctions from "../../../util/common.util";
import ProcessPage from "../../../pageobjects/process.page";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/ActionItemsBatch/Test_003_BulkEditAndDeleteActionItems.json");

const AI_PROCESS = TestData.ACTION_ITEM_NAME + "_PROCESS_BULK_1"
const AI_SUBPROCESS = TestData.ACTION_ITEM_NAME + "_SUBPROCESS_BULK_1"
const AI_ASSUMPTION = TestData.ACTION_ITEM_NAME + "_ASSUMPTION_BULK_1"
const AI_PROCESS2 = TestData.ACTION_ITEM_NAME + "_PROCESS_BULK_2"
const AI_SUBPROCESS2 = TestData.ACTION_ITEM_NAME + "_SUBPROCESS_BULK_2"
const AI_ASSUMPTION2 = TestData.ACTION_ITEM_NAME + "_ASSUMPTION_BULK_2"

describe(`Bulk Edit and Delete Actions Item with Authorized and UnAuthorized Users`, async () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    });

    it(`Test Case 1: Create Action Item - Process`, async () => {
        await browser.pause(5000);
        await ProcessPage.clickLeftpaneLinks("Action Items");
        if (!await ActionItems.isActionItemDisplayed(AI_PROCESS)) {
            let msg: string = await ActionItems.createActionItem(AI_PROCESS, TestData.STATUS, TestData.ACTION_TYPE, TestData.PRIORITY);
            let validation: boolean = await CommonFunctions.compareTwoValues(msg.includes("success"), true, "Create Action Item Assertion");
            expect(validation).toBeTruthy();
        } else {
            await CommonFunctions.logMessage("INFO", AI_PROCESS + " is already available");
        }
    });

    it(`Test Case 2: Create Action Item - Sub Process`, async () => {
        await PlanningSpace.navigateToPlanningSpace();
        await PlanningSpace.launchContext("Sub-process", { process: TestData.PROCESS_NAME, subProcess: TestData.SUB_PROCESS_NAME });
        await browser.pause(5000);
        await ProcessPage.clickLeftpaneLinks("Action Items");
        if (!await ActionItems.isActionItemDisplayed(AI_SUBPROCESS)) {
            let msg: string = await ActionItems.createActionItem(AI_SUBPROCESS, TestData.STATUS, TestData.ACTION_TYPE, TestData.PRIORITY);
            let validation: boolean = await CommonFunctions.compareTwoValues(msg.includes("success"), true, "Create Action Item Assertion");
            expect(validation).toBeTruthy();
        } else {
            await CommonFunctions.logMessage("INFO", AI_SUBPROCESS + " is already available");
        }
    });

    it(`Test Case 3: Create Action Item - Assumption`, async () => {
        await PlanningSpace.navigateToPlanningSpace();
        await PlanningSpace.launchContext("Assumption", { origin: TestData.PROCESS_NAME, assumption: TestData.ASSUMPTION });
        await browser.pause(5000);
        await ProcessPage.clickLeftpaneLinks("Action Items");
        if (!await ActionItems.isActionItemDisplayed(AI_ASSUMPTION)) {
            let msg: string = await ActionItems.createActionItem(AI_ASSUMPTION, TestData.STATUS, TestData.ACTION_TYPE, TestData.PRIORITY);
            let validation: boolean = await CommonFunctions.compareTwoValues(msg.includes("success"), true, "Create Action Item Assertion");
            expect(validation).toBeTruthy();
        } else {
            await CommonFunctions.logMessage("INFO", AI_ASSUMPTION + " is already available");
        }
    });

    it(`Test Case 4: Signout and Login With Second User`, async () => {
        await PlanningSpace.signOut();
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME, true, false);
        await browser.pause(5000);
    });

    it(`Test Case 5: Create Action Item - Process - User 2`, async () => {
        await browser.pause(5000);
        await ProcessPage.clickLeftpaneLinks("Action Items");
        await browser.pause(3000);
        await ActionItems.setPageSize("20");
        if (!await ActionItems.isActionItemDisplayed(AI_PROCESS2)) {
            let msg: string = await ActionItems.createActionItem(AI_PROCESS2, TestData.STATUS, TestData.ACTION_TYPE, TestData.PRIORITY);
            let validation: boolean = await CommonFunctions.compareTwoValues(msg.includes("success"), true, "Create Action Item for Process under User 2 Assertion");
            expect(validation).toBeTruthy();
        } else {
            await CommonFunctions.logMessage("INFO", AI_PROCESS2 + " is already available");
        }
    });

    it(`Test Case 6: Verify Bulk Edit - Process`, async () => {
        await browser.pause(8000);
        const { alertMsg: editAlertMsg, successMsg: editSuccessMsg } = await ActionItems.changeBulkStatus(TestData.CHANGE_STATUS, true);
        let validation1: boolean = await CommonFunctions.compareTwoValues(editAlertMsg, TestData.PARTIAL_ALERT_MSG, "Partial Alert Message for Bulk Edit - Process");
        let validation2: boolean = await CommonFunctions.compareTwoValues(editSuccessMsg, TestData.BULK_EDIT_SUCCESS, "Bulk Edit Action Item Assertion");
        await browser.pause(5000);
        let statusOfNewAI: string = await ActionItems.getColumnValueByActionItem(AI_PROCESS2, "Status");
        let statusOfOldAI1: string = await ActionItems.getColumnValueByActionItem(AI_PROCESS, "Status");
        let statusOfOldAI2: string = await ActionItems.getColumnValueByActionItem(AI_SUBPROCESS, "Status");
        let statusOfOldAI3: string = await ActionItems.getColumnValueByActionItem(AI_ASSUMPTION, "Status");

        let validation3: boolean = await CommonFunctions.compareTwoValues(statusOfNewAI.toLowerCase(), TestData.CHANGE_STATUS.toLowerCase(), "Status of New Action Item after Bulk Edit");
        let validation4: boolean = await CommonFunctions.compareTwoValues(statusOfOldAI1.toLowerCase(), TestData.STATUS.toLowerCase(), "Status of Old Action Item 1 after Bulk Edit");
        let validation5: boolean = await CommonFunctions.compareTwoValues(statusOfOldAI2.toLowerCase(), TestData.STATUS.toLowerCase(), "Status of Old Action Item 2 after Bulk Edit");
        let validation6: boolean = await CommonFunctions.compareTwoValues(statusOfOldAI3.toLowerCase(), TestData.STATUS.toLowerCase(), "Status of Old Action Item 3 after Bulk Edit");

        expect(validation1 && validation2 && validation3 && validation4 && validation5 && validation6).toBeTruthy();
    });

    it(`Test Case 7: Verify Bulk Delete - Process`, async () => {
        const { alertMsg: deleteAlertMsg, successMsg: deleteSuccessMsg } = await ActionItems.deleteBulkActionItems(true);
        let validation1: boolean = await CommonFunctions.compareTwoValues(deleteAlertMsg, TestData.PARTIAL_ALERT_MSG, "Partial Alert Message for Bulk Delete - Process");
        let validation2: boolean = await CommonFunctions.compareTwoValues(deleteSuccessMsg, TestData.BULK_DELETE_SUCCESS, "Bulk Delete Action Item Assertion");
        await browser.pause(5000);
        let arrActionItems: string[] = await ActionItems.getAllValuesOfColumn("Name");
        await CommonFunctions.logMessage("INFO", "Action Items: " + arrActionItems);
        let validation3: boolean = await CommonFunctions.compareTwoValues(!arrActionItems.includes(AI_PROCESS2), true, "New Action Item is deleted with user 2");
        let validation4: boolean = await CommonFunctions.compareTwoValues(arrActionItems.includes(AI_PROCESS) && arrActionItems.includes(AI_SUBPROCESS) && arrActionItems.includes(AI_ASSUMPTION), true, "Old Action Items should not deleted with user 2");
        expect(validation1 && validation2 && validation3 && validation4).toBeTruthy();
    });

    it(`Test Case 8: Create Action Item - Sub Process - User 2`, async () => {
        await PlanningSpace.navigateToPlanningSpace();
        await PlanningSpace.launchContext("Sub-process", { process: TestData.PROCESS_NAME, subProcess: TestData.SUB_PROCESS_NAME });
        await browser.pause(5000);
        await ProcessPage.clickLeftpaneLinks("Action Items");
        await ActionItems.setPageSize("20");
        if (!await ActionItems.isActionItemDisplayed(AI_SUBPROCESS2)) {
            let msg: string = await ActionItems.createActionItem(AI_SUBPROCESS2, TestData.STATUS, TestData.ACTION_TYPE, TestData.PRIORITY);
            let validation: boolean = await CommonFunctions.compareTwoValues(msg.includes("success"), true, "Create Action Item for Subprocess under User 2 Assertion");
            expect(validation).toBeTruthy();
        } else {
            await CommonFunctions.logMessage("INFO", AI_SUBPROCESS2 + " is already available");
        }
    });

    it(`Test Case 9: Verify Bulk Edit - Subprocess`, async () => {
        await browser.pause(5000);
        const { alertMsg: editAlertMsg, successMsg: editSuccessMsg } = await ActionItems.changeBulkStatus(TestData.CHANGE_STATUS, true);
        let validation1: boolean = await CommonFunctions.compareTwoValues(editAlertMsg, TestData.PARTIAL_ALERT_MSG, "Partial Alert Message for Bulk Edit - Subprocess");
        let validation2: boolean = await CommonFunctions.compareTwoValues(editSuccessMsg, TestData.BULK_EDIT_SUCCESS, "Bulk Edit Action Item Assertion");
        await browser.pause(5000);
        let statusOfNewAI: string = await ActionItems.getColumnValueByActionItem(AI_SUBPROCESS2, "Status");
        let statusOfOldAI2: string = await ActionItems.getColumnValueByActionItem(AI_SUBPROCESS, "Status");

        let validation3: boolean = await CommonFunctions.compareTwoValues(statusOfNewAI.toLowerCase(), TestData.CHANGE_STATUS.toLowerCase(), "Status of New Action Item after Bulk Edit");
        let validation4: boolean = await CommonFunctions.compareTwoValues(statusOfOldAI2.toLowerCase(), TestData.STATUS.toLowerCase(), "Status of Old Action Item 2 after Bulk Edit");

        expect(validation1 && validation2 && validation3 && validation4).toBeTruthy();
    });

    it(`Test Case 10: Verify Bulk Delete - Subprocess`, async () => {
        const { alertMsg: deleteAlertMsg, successMsg: deleteSuccessMsg } = await ActionItems.deleteBulkActionItems(true);
        let validation1: boolean = await CommonFunctions.compareTwoValues(deleteAlertMsg, TestData.PARTIAL_ALERT_MSG, "Partial Alert Message for Bulk Delete - Subrocess");
        let validation2: boolean = await CommonFunctions.compareTwoValues(deleteSuccessMsg, TestData.BULK_DELETE_SUCCESS, "Bulk Delete Action Item Assertion");
        await browser.pause(5000);
        let arrActionItems: string[] = await ActionItems.getAllValuesOfColumn("Name");
        await CommonFunctions.logMessage("INFO", "Action Items: " + arrActionItems);
        let validation3: boolean = await CommonFunctions.compareTwoValues(!arrActionItems.includes(AI_SUBPROCESS2), true, "New Action Item is deleted with user 2");
        let validation4: boolean = await CommonFunctions.compareTwoValues(arrActionItems.includes(AI_SUBPROCESS), true, "Old Action Items should not deleted with user 2");
        expect(validation1 && validation2 && validation3 && validation4).toBeTruthy();
    });

    it(`Test Case 11: Create Action Item - Assumption - User 2`, async () => {
        await PlanningSpace.navigateToPlanningSpace();
        await PlanningSpace.launchContext("Assumption", { origin: TestData.PROCESS_NAME, assumption: TestData.ASSUMPTION });
        await browser.pause(5000);
        await ProcessPage.clickLeftpaneLinks("Action Items");
        await ActionItems.setPageSize("20");
        if (!await ActionItems.isActionItemDisplayed(AI_ASSUMPTION2)) {
            let msg: string = await ActionItems.createActionItem(AI_ASSUMPTION2, TestData.STATUS, TestData.ACTION_TYPE, TestData.PRIORITY);
            let validation: boolean = await CommonFunctions.compareTwoValues(msg.includes("success"), true, "Create Action Item for Assumption under User 2 Assertion");
            expect(validation).toBeTruthy();
        } else {
            await CommonFunctions.logMessage("INFO", AI_ASSUMPTION2 + " is already available");
        }
    });

    it(`Test Case 12: Verify Bulk Edit - Assumption`, async () => {
        await browser.pause(5000);
        const { alertMsg: editAlertMsg, successMsg: editSuccessMsg } = await ActionItems.changeBulkStatus(TestData.CHANGE_STATUS, true);
        let validation1: boolean = await CommonFunctions.compareTwoValues(editAlertMsg, TestData.PARTIAL_ALERT_MSG, "Partial Alert Message for Bulk Edit - Assumption");
        let validation2: boolean = await CommonFunctions.compareTwoValues(editSuccessMsg, TestData.BULK_EDIT_SUCCESS, "Bulk Edit Action Item Assertion");
        await browser.pause(5000);
        let statusOfNewAI: string = await ActionItems.getColumnValueByActionItem(AI_ASSUMPTION2, "Status");
        let statusOfOldAI: string = await ActionItems.getColumnValueByActionItem(AI_ASSUMPTION, "Status");

        let validation3: boolean = await CommonFunctions.compareTwoValues(statusOfNewAI.toLowerCase(), TestData.CHANGE_STATUS.toLowerCase(), "Status of New Action Item after Bulk Edit");
        let validation4: boolean = await CommonFunctions.compareTwoValues(statusOfOldAI.toLowerCase(), TestData.STATUS.toLowerCase(), "Status of Old Action Item 3 after Bulk Edit");

        expect(validation1 && validation2 && validation3 && validation4).toBeTruthy();
    });

    it(`Test Case 13: Verify Bulk Delete - Assumption`, async () => {
        const { alertMsg: deleteAlertMsg, successMsg: deleteSuccessMsg } = await ActionItems.deleteBulkActionItems(true);
        let validation1: boolean = await CommonFunctions.compareTwoValues(deleteAlertMsg, TestData.PARTIAL_ALERT_MSG, "Partial Alert Message for Bulk Delete - Assumption");
        let validation2: boolean = await CommonFunctions.compareTwoValues(deleteSuccessMsg, TestData.BULK_DELETE_SUCCESS, "Bulk Delete Action Item Assertion");
        await browser.pause(5000);
        let arrActionItems: string[] = await ActionItems.getAllValuesOfColumn("Name");
        await CommonFunctions.logMessage("INFO", "Action Items: " + arrActionItems);
        let validation3: boolean = await CommonFunctions.compareTwoValues(!arrActionItems.includes(AI_ASSUMPTION2), true, "New Action Item is deleted with user 2");
        let validation4: boolean = await CommonFunctions.compareTwoValues(arrActionItems.includes(AI_ASSUMPTION), true, "Old Action Items should not deleted with user 2");
        expect(validation1 && validation2 && validation3 && validation4).toBeTruthy();
    });

})