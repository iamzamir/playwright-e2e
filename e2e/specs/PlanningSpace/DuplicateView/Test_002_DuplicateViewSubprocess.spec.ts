import GlobalSettings from '../../../pageobjects/global-settings.page';
import PlanningSpace from '../../../pageobjects/planning.page';
import SupplyChainPage from "../../../pageobjects/sca.page";
import CommonFunctions from '../../../util/common.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/DuplicateView/Test_002_DuplicateViewSubprocess.json");

describe('Duplicate View - Subprocess', () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, false, false);
        await PlanningSpace.launchContext("Sub-process", { process: TestData.PROCESS_NAME, subProcess: TestData.SUBPROCESS_NAME });
        await browser.pause(5000);
    });

    it("Test case 01: Duplicate View", async () => {
        await PlanningSpace.openDuplicateView(TestData.VIEW_NAME);
        await browser.pause(5000);
        const bValidation1 = await PlanningSpace.saveDuplicateView();
        expect(bValidation1).toBeTruthy();
    });

    it(`Test case 02: Verify the duplicated view- ${TestData.DUPLICATED_VIEW_NAME} is created and mapped to the subprocess: ${TestData.SUBPROCESS_NAME}`, async () => {
        await PlanningSpace.clickViewsDropDown();
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.clickDashBoard(TestData.DUPLICATED_VIEW_NAME), true, "Duplicated View is mapped to the process Assertion");
        await browser.pause(5000);
        expect(bValidation1).toBeTruthy();
    });

    it(`Test case 03: Verify the duplicated view has copied quick filter configuration`, async () => {
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.verifyQuickFilterConfig(TestData.QUICK_FILTER), true, "Quick filter values Displays Assertion");
        expect(bValidation1).toBeTruthy();
    });

    it(`Test case 04: Verify the duplicated view has copied the cards in the dashboard`, async () => {
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.verifyCardsInDashboard(TestData.CARDS), true, "Cards in Dashboard Displays Assertion");
        expect(bValidation1).toBeTruthy();
    });

    it("Test case 05: Verify the duplicated view has copied workfilter configuration", async () => {
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isContextOverrideDisplays(false), true, "Context Override button Displays Assertion");
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.showFilterDetails(true, TestData.WORKFLOW_FILTER), true, "Backend workflow filter values Displays Assertion");
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.closeWorkflowFilterDetails(), true, "Backend workflow filters Details closed Assertion");
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it(`Test case 06: Verify the duplicated view has copied the procedure configuration`, async () => {
        const bValidation1: boolean = await SupplyChainPage.verifySCABtn(TestData.SCA_PROCEDURES.PRIMARY_ACTION, 'MuiButton-contained');
        await CommonFunctions.compareTwoValues(bValidation1, true, 'Is primary sca button exist');
        const bValidation2: boolean = await SupplyChainPage.verifySCABtn(TestData.SCA_PROCEDURES.SECONDARY_ACTION, 'MuiButton-outlined')
        await CommonFunctions.compareTwoValues(bValidation2, true, 'Is secondary sca button exist');
        const bValidation3: boolean = await SupplyChainPage.verifyOtherActionsInProceduresDropdown(TestData.SCA_PROCEDURES.OTHER_ACTIONS, true);
        await CommonFunctions.compareTwoValues(bValidation3, true, 'Is procedures dropdown appeared with other actions');
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it(`Test case 07: Verify the duplicated view has copied actors and default procedure configuration`, async () => {
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isDataSyncButtonExists(), true, 'Data sync icon exist');
        await PlanningSpace.navToProcessOrchestration(true);
        await GlobalSettings.clickGlobalSettings();
        await GlobalSettings.clickGlobalSettingsListMenu('Planning Views');
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(await GlobalSettings.validateViewDataSetup(TestData.DUPLICATED_VIEW_NAME, TestData.ACTORS_AND_DEFAULT_PROCEDURE), true, 'Actors and Default procedure configuration exist');
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

    it(`Test case 08: Delete Duplicated view: ${TestData.DUPLICATED_VIEW_NAME}`, async () => {
        await GlobalSettings.deleteView(TestData.DUPLICATED_VIEW_NAME);
        const bValidation1 = await CommonFunctions.compareTwoValues( await CommonFunctions.verifyAlertMsg('success'), true, `Is ${TestData.DUPLICATED_VIEW_NAME} view deleted `);
        expect(bValidation1).toBeTruthy();
    });

})
