import GlobalSettings from "../../../pageobjects/global-settings.page"
import PlanningSpace from "../../../pageobjects/planning.page"
import CommonFunctions from "../../../util/common.util"
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ViewsBatch/Test_006_ConfigureViewToEntity.json");
// import TestData from '../../../Testdata/PlanningSpace/ViewsBatch/Test_006_ConfigureViewToEntity.json'

describe('Configure Views To Entities and Verify in Planning Space', async () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, false, false);
        await browser.pause(10000);
    })

    it('Test Case 1: Map Views To Process', async () => {
        await PlanningSpace.navToProcessOrchestration();
        await GlobalSettings.clickGlobalSettings();
        await GlobalSettings.clickGlobalSettingsListMenu('Process');
        await GlobalSettings.selectProcess(TestData.PROCESS_CONTEXT.PROCESS_NAME)
        await browser.pause(5000);
        let validation1: boolean = await CommonFunctions.compareTwoValues(await GlobalSettings.removeViewMappingToEntity(TestData.PROCESS_CONTEXT.PROCESS_NAME), true, 'Reset Step - Remove Mapping Assertion for Process');
        let isViewMapSuccess: boolean = await GlobalSettings.addViewMappingToEntity(TestData.PROCESS_CONTEXT.PROCESS_NAME, TestData.MAP_VIEWS_TO_PROCESS);
        let validation2: boolean = await CommonFunctions.compareTwoValues(isViewMapSuccess, true, 'View Mapping Save Assertion for Process');
        expect(validation1 && validation2).toBeTruthy();
    });

    it('Test Case 2: Map Views To Sub Process', async () => {
        await browser.pause(5000);
        let validation1: boolean = await CommonFunctions.compareTwoValues(await GlobalSettings.removeViewMappingToEntity(TestData.SUB_PROCESS_CONTEXT.SUB_PROCESS_NAME), true, 'Reset Step - Remove Mapping Assertion for Subprocess');
        let isViewMapSuccess: boolean = await GlobalSettings.addViewMappingToEntity(TestData.SUB_PROCESS_CONTEXT.SUB_PROCESS_NAME, TestData.MAP_VIEWS_TO_SUBPROCESS);
        let validation2: boolean = await CommonFunctions.compareTwoValues(isViewMapSuccess, true, 'View Mapping Save Assertion for Subprocess');
        expect(validation1 && validation2).toBeTruthy();
    });

    it('Test Case 3: Map Views To Assumption', async () => {
        await browser.pause(5000);
        await GlobalSettings.clickGlobalSettingsListMenu('Assumption Type');
        await browser.pause(5000);
        let validation1: boolean = await CommonFunctions.compareTwoValues(await GlobalSettings.removeViewMappingToEntity(TestData.ASSUMPTION_RISK_CONTEXT.ASSUMPTION_TYPE), true, 'Reset Step - Remove Mapping Assertion for Assumption');
        let isViewMapSuccess: boolean = await GlobalSettings.addViewMappingToEntity(TestData.ASSUMPTION_RISK_CONTEXT.ASSUMPTION_TYPE, TestData.MAP_VIEWS_TO_ASSUMPTION);
        let validation2: boolean = await CommonFunctions.compareTwoValues(isViewMapSuccess, true, 'View Mapping Save Assertion for Assumption');
        expect(validation1 && validation2).toBeTruthy();
    });

    it(`Test Case 4: verify views mapped to ${TestData.PROCESS_CONTEXT.PROCESS_NAME} process`, async () => {
        await CommonFunctions.logMessage('INFO', 'moving to plannig space')
        await CommonFunctions.switchToSpecificWindow(0);
        await PlanningSpace.switchToMFEFrame();
        await browser.pause(10000);
        await PlanningSpace.launchContext("Process", { process: TestData.PROCESS_CONTEXT.PROCESS_NAME });
        await browser.pause(5000);
        await PlanningSpace.clickViewsDropDown();
        const viewsFromPS: string[] = await PlanningSpace.getAllViews();
        const validation: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.verifyViewsMappedToContext(viewsFromPS, TestData.EXPECTED_VIEWS_IN_PS), true, 'Views Mapped to Process in Planning Space Assertion');
        expect(validation).toBeTruthy();
    });

    it(`Test Case 5: verify views mapped to ${TestData.SUB_PROCESS_CONTEXT.SUB_PROCESS_NAME} sub process`, async () => {
        await PlanningSpace.navigateToPlanningSpace()
        await PlanningSpace.launchContext("Sub-process", { process: TestData.SUB_PROCESS_CONTEXT.PROCESS_NAME, subProcess: TestData.SUB_PROCESS_CONTEXT.SUB_PROCESS_NAME });
        await browser.pause(5000);
        await PlanningSpace.clickViewsDropDown();
        const viewsFromPS: string[] = await PlanningSpace.getAllViews();
        const validation: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.verifyViewsMappedToContext(viewsFromPS, TestData.EXPECTED_VIEWS_IN_PS), true, 'Views mapped to Subprocess in Planning Space Assertion');
        expect(validation).toBeTruthy();
    });

    it(`Test Case 6: verify views mapped to ${TestData.ASSUMPTION_RISK_CONTEXT.ASSUMPTION} type ${TestData.ASSUMPTION_RISK_CONTEXT.ASSUMPTION_TYPE} assumption`, async () => {
        await PlanningSpace.navigateToPlanningSpace()
        await PlanningSpace.launchContext("Assumption", { origin: TestData.ASSUMPTION_RISK_CONTEXT.ORIGIN, assumption: TestData.ASSUMPTION_RISK_CONTEXT.ASSUMPTION });;
        await browser.pause(5000);
        await PlanningSpace.clickViewsDropDown();
        const viewsFromPS: string[] = await PlanningSpace.getAllViews();
        const validation: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.verifyViewsMappedToContext(viewsFromPS, TestData.EXPECTED_VIEWS_IN_PS), true, 'Views mapped to Assumption in Planning Space Assertion');
        expect(validation).toBeTruthy();
    });

    it('Test Case 7: Remove Mapped Views to the Entities', async () => {
        await CommonFunctions.switchToSpecificWindow(1);
        await PlanningSpace.switchToMFEFrame();
        await GlobalSettings.clickGlobalSettingsListMenu('Process');
        await GlobalSettings.selectProcess(TestData.PROCESS_CONTEXT.PROCESS_NAME)
        await browser.pause(5000);
        let validation1: boolean = await CommonFunctions.compareTwoValues(await GlobalSettings.removeViewMappingToEntity(TestData.PROCESS_CONTEXT.PROCESS_NAME), true, 'Remove Mapping Assertion for Process');
        let validation2: boolean = await CommonFunctions.compareTwoValues(await GlobalSettings.removeViewMappingToEntity(TestData.SUB_PROCESS_CONTEXT.SUB_PROCESS_NAME), true, 'Remove Mapping Assertion for Subprocess');
        await browser.refresh();
        await browser.pause(10000);
        await PlanningSpace.switchToMFEFrame();
        await GlobalSettings.clickGlobalSettingsListMenu('Assumption Type');
        let validation3: boolean = await CommonFunctions.compareTwoValues(await GlobalSettings.removeViewMappingToEntity(TestData.ASSUMPTION_RISK_CONTEXT.ASSUMPTION_TYPE), true, 'Remove Mapping Assertion for Assumption');
        expect(validation1 && validation2 && validation3).toBeTruthy();
    });

    it(`Test Case 8: verify views removed to ${TestData.PROCESS_CONTEXT.PROCESS_NAME} process`, async () => {
        await CommonFunctions.logMessage('INFO', 'moving to plannig space')
        await CommonFunctions.switchToSpecificWindow(0);
        await browser.refresh();
        await PlanningSpace.switchToMFEFrame();
        await browser.pause(2000);
        await PlanningSpace.navigateToPlanningSpace()
        await browser.pause(10000);
        await PlanningSpace.launchContext("Process", { process: TestData.PROCESS_CONTEXT.PROCESS_NAME });
        await browser.pause(5000);
        await PlanningSpace.clickViewsDropDown();
        const viewsFromPS: string[] = await PlanningSpace.getAllViews();
        const validation: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.verifyViewsMappedToContext(viewsFromPS, TestData.EXPECTED_VIEWS_IN_PS), false, 'Views Removed to Process in Planning Space Assertion');
        expect(validation).toBeTruthy();
    });

    it(`Test Case 9: verify views removed to ${TestData.SUB_PROCESS_CONTEXT.SUB_PROCESS_NAME} sub process`, async () => {
        await PlanningSpace.navigateToPlanningSpace()
        await PlanningSpace.launchContext("Sub-process", { process: TestData.SUB_PROCESS_CONTEXT.PROCESS_NAME, subProcess: TestData.SUB_PROCESS_CONTEXT.SUB_PROCESS_NAME });
        await browser.pause(5000);
        const validation = await PlanningSpace.verifyNoColumnsStateInCard();
        expect(validation).toBeTruthy();
    });

    it(`Test Case 10: verify views removed to ${TestData.ASSUMPTION_RISK_CONTEXT.ASSUMPTION} type ${TestData.ASSUMPTION_RISK_CONTEXT.ASSUMPTION_TYPE} assumption`, async () => {
        await PlanningSpace.navigateToPlanningSpace()
        await PlanningSpace.launchContext("Assumption", { origin: TestData.ASSUMPTION_RISK_CONTEXT.ORIGIN, assumption: TestData.ASSUMPTION_RISK_CONTEXT.ASSUMPTION });;
        await browser.pause(5000);
        const validation = await PlanningSpace.verifyNoColumnsStateInCard();
        expect(validation).toBeTruthy();
    });

})