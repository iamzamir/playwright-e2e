import PlanningSpace from "../../../pageobjects/planning.page";
import ActionItems from "../../../pageobjects/action-items.page";
import CommonFunctions from "../../../util/common.util";
import ProcessPage from "../../../pageobjects/process.page";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/ActionItemsBatch/Test_002_EditAndDeleteActionItemsWithUnAuthorizedUsers.json");

const AI_PROCESS = TestData.ACTION_ITEM_NAME + "_PROCESS"
const AI_SUBPROCESS = TestData.ACTION_ITEM_NAME + "_SUBPROCESS"
const AI_ASSUMPTION = TestData.ACTION_ITEM_NAME + "_ASSUMPTION"

describe(`Edit and Delete Actions Item with UnAuthorized Users`, async () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    });

    it(`Test Case 1: Create Action Item - Process`, async () => {
        await browser.pause(5000);
        await ProcessPage.clickLeftpaneLinks("Action Items");
        if (!await ActionItems.isActionItemDisplayed(AI_PROCESS)) {
            let msg: string = await ActionItems.createActionItem(AI_PROCESS, TestData.STATUS, TestData.ACTION_TYPE, TestData.PRIORITY);
            let validation: boolean = await CommonFunctions.compareTwoValues(msg, TestData.CREATE_SUCCESS, "Create Action Item Assertion");
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
            let validation: boolean = await CommonFunctions.compareTwoValues(msg, TestData.CREATE_SUCCESS, "Create Action Item Assertion");
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
            let validation: boolean = await CommonFunctions.compareTwoValues(msg, TestData.CREATE_SUCCESS, "Create Action Item Assertion");
            expect(validation).toBeTruthy();
        } else {
            await CommonFunctions.logMessage("INFO", AI_ASSUMPTION + " is already available");
        }
    });

    it(`Test Case 4: Signout and Login With UnAuthorized User`, async () => {
        await PlanningSpace.signOut();
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME, true, false);
        await browser.pause(5000);
    });

    it(`Test Case 5: Verify Edit & Delete Permission for UnAuthorized User - Process`, async () => {
        await ProcessPage.clickLeftpaneLinks("Action Items");
        let validation1: boolean = await CommonFunctions.compareTwoValues(await ActionItems.isEditClickable(AI_PROCESS), true, "Edit Should be Disabled Assertion");
        let validation2: boolean = await CommonFunctions.compareTwoValues(await ActionItems.toolTipOfEdit(), TestData.TOOL_TIP, "Tool Tip Assertio for Edit");
        let validation3: boolean = await CommonFunctions.compareTwoValues(await ActionItems.isDeleteClickable(AI_PROCESS, false), true, "Delete Should be Disabled Assertion");
        let validation4: boolean = await CommonFunctions.compareTwoValues(await ActionItems.toolTipOfDelete(), TestData.TOOL_TIP, "Tool Tip Assertion for Delete");
        expect(validation1 && validation2 && validation3 && validation4).toBeTruthy();
    });

    it(`Test Case 6: Verify Edit & Delete Permission for UnAuthorized User - Process`, async () => {
        await PlanningSpace.navigateToPlanningSpace()
        await PlanningSpace.launchContext("Sub-process", { process: TestData.PROCESS_NAME, subProcess: TestData.SUB_PROCESS_NAME });
        await browser.pause(5000);
        await ProcessPage.clickLeftpaneLinks("Action Items");
        let validation1: boolean = await CommonFunctions.compareTwoValues(await ActionItems.isEditClickable(AI_SUBPROCESS), true, "Edit Should be Disabled Assertion");
        let validation2: boolean = await CommonFunctions.compareTwoValues(await ActionItems.toolTipOfEdit(), TestData.TOOL_TIP, "Tool Tip Assertion for Edit");
        let validation3: boolean = await CommonFunctions.compareTwoValues(await ActionItems.isDeleteClickable(AI_SUBPROCESS, false), true, "Delete Should be Disabled Assertion");
        let validation4: boolean = await CommonFunctions.compareTwoValues(await ActionItems.toolTipOfDelete(), TestData.TOOL_TIP, "Tool Tip Assertion for Delete");
        expect(validation1 && validation2 && validation3 && validation4).toBeTruthy();
    });

    it(`Test Case 7: Verify Edit & Delete Permission for UnAuthorized User - Process`, async () => {
        await PlanningSpace.navigateToPlanningSpace()
        await PlanningSpace.launchContext("Assumption", { origin: TestData.PROCESS_NAME, assumption: TestData.ASSUMPTION });
        await browser.pause(5000);
        await ProcessPage.clickLeftpaneLinks("Action Items");
        let validation1: boolean = await CommonFunctions.compareTwoValues(await ActionItems.isEditClickable(AI_ASSUMPTION), true, "Edit Should be Disabled Assertion");
        let validation2: boolean = await CommonFunctions.compareTwoValues(await ActionItems.toolTipOfEdit(), TestData.TOOL_TIP, "Tool Tip Assertion for Edit");
        let validation3: boolean = await CommonFunctions.compareTwoValues(await ActionItems.isDeleteClickable(AI_ASSUMPTION, false), true, "Delete Should be Disabled Assertion");
        let validation4: boolean = await CommonFunctions.compareTwoValues(await ActionItems.toolTipOfDelete(), TestData.TOOL_TIP, "Tool Tip Assertion for Delete");
        expect(validation1 && validation2 && validation3 && validation4).toBeTruthy();
    });


})