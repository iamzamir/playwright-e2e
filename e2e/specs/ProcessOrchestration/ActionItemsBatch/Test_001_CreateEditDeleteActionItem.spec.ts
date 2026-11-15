import PlanningSpace from "../../../pageobjects/planning.page";
import ActionItems from "../../../pageobjects/action-items.page";
import CommonFunctions from "../../../util/common.util";
import ProcessPage from "../../../pageobjects/process.page";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/ActionItemsBatch/Test_001_CreateEditDeleteActionItem.json");

const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
TestData.ACTION_ITEM_NAME = `${TestData.ACTION_ITEM_NAME}_${timestamp}`;

describe(`Create Edit and Delete Actions Item with Authorized User`, async () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    });

    it(`Test Case 1: Create Action Item - Process`, async () => {
        await ProcessPage.clickLeftpaneLinks("Action Items");
        let msg: string = await ActionItems.createActionItem(TestData.ACTION_ITEM_NAME, TestData.STATUS, TestData.ACTION_TYPE, TestData.PRIORITY, "PS Automation2", undefined, "TestData.ACTION_ITEM_NAME", "TestData.ACTION_ITEM_NAME");
        let validation: boolean = await CommonFunctions.compareTwoValues(msg.includes("success") || msg.includes("Success"), true, "Create Action Item Assertion");
        expect(validation).toBeTruthy();
    });

    it(`Test Case 2: Edit Action Item - Process`, async () => {
        await ActionItems.selectEdit(TestData.ACTION_ITEM_NAME);
        await ActionItems.selectPriority(TestData.PRIORITY_UPDATED);
        await ActionItems.clickSave();
        let msg: string = await ActionItems.getSuccessMsg();
        let validation: boolean = await CommonFunctions.compareTwoValues(msg.includes("success") || msg.includes("Success"), true, "Edit Action Item Assertion");
        expect(validation).toBeTruthy();
    });

    it(`Test Case 3: Delete Action Item - Process`, async () => {
        let msg: string = await ActionItems.selectDelete(TestData.ACTION_ITEM_NAME);
        let validation: boolean = await CommonFunctions.compareTwoValues(msg.includes("success") || msg.includes("Success"), true, "Delete Action Item Assertion");
        expect(validation).toBeTruthy();
    });

    it(`Test Case 4: Create Action Item - Sub Process`, async () => {
        await PlanningSpace.navigateToPlanningSpace()
        await PlanningSpace.launchContext("Sub-process", { process: TestData.PROCESS_NAME, subProcess: TestData.SUB_PROCESS_NAME });
        await browser.pause(5000);
        await ProcessPage.clickLeftpaneLinks("Action Items");
        let msg: string = await ActionItems.createActionItem(TestData.ACTION_ITEM_NAME, TestData.STATUS, TestData.ACTION_TYPE, TestData.PRIORITY);
        let validation: boolean = await CommonFunctions.compareTwoValues(msg.includes("success") || msg.includes("Success"), true, "Create Action Item Assertion");
        expect(validation).toBeTruthy();
    });

    it(`Test Case 5: Edit Action Item - Sub Process`, async () => {
        await ActionItems.selectEdit(TestData.ACTION_ITEM_NAME);
        await ActionItems.selectPriority(TestData.PRIORITY_UPDATED);
        await ActionItems.clickSave();
        let msg: string = await ActionItems.getSuccessMsg();
        let validation: boolean = await CommonFunctions.compareTwoValues(msg.includes("success") || msg.includes("Success"), true, "Edit Action Item Assertion");
        expect(validation).toBeTruthy();
    });

    it(`Test Case 6: Delete Action Item - Sub Process`, async () => {
        let msg: string = await ActionItems.selectDelete(TestData.ACTION_ITEM_NAME);
        let validation: boolean = await CommonFunctions.compareTwoValues(msg.includes("success") || msg.includes("Success"), true, "Delete Action Item Assertion");
        expect(validation).toBeTruthy();
    });

    it(`Test Case 7: Create Action Item - Assumption`, async () => {
        await PlanningSpace.navigateToPlanningSpace()
        await PlanningSpace.launchContext("Assumption", { origin: TestData.PROCESS_NAME, assumption: TestData.ASSUMPTION });
        await browser.pause(5000);
        await ProcessPage.clickLeftpaneLinks("Action Items");
        let msg: string = await ActionItems.createActionItem(TestData.ACTION_ITEM_NAME, TestData.STATUS, TestData.ACTION_TYPE, TestData.PRIORITY);
        let validation: boolean = await CommonFunctions.compareTwoValues(msg.includes("success") || msg.includes("Success"), true, "Create Action Item Assertion");
        expect(validation).toBeTruthy();
    });

    it(`Test Case 8: Edit Action Item - Assumption`, async () => {
        await ActionItems.selectEdit(TestData.ACTION_ITEM_NAME);
        await ActionItems.selectPriority(TestData.PRIORITY_UPDATED);
        await ActionItems.clickSave();
        let msg: string = await ActionItems.getSuccessMsg();
        let validation: boolean = await CommonFunctions.compareTwoValues(msg.includes("success") || msg.includes("Success"), true, "Edit Action Item Assertion");
        expect(validation).toBeTruthy();
    });

    it(`Test Case 9: Delete Action Item - Assumption`, async () => {
        let msg: string = await ActionItems.selectDelete(TestData.ACTION_ITEM_NAME);
        let validation: boolean = await CommonFunctions.compareTwoValues(msg.includes("success") || msg.includes("Success"), true, "Delete Action Item Assertion");
        expect(validation).toBeTruthy();
    });

})