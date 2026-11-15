import PlanningSpace from '../../../pageobjects/planning.page';
import ScopePage from '../../../pageobjects/scope.page';
import ProcessPage from '../../../pageobjects/process.page';
import CommonFunctions from '../../../util/common.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/DataSetup/ODM/Test_004_VerifyTheUnifiedEmptyState.json");

describe('Unified Error Screen for Planning Instance and Empty State Screen when VF is not available', () => {

    let accessToken: string;
    let headers: Record<string, string>;
    let planningInstanceUrl: string;

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME_1);
    });
   
    it('Test case 1: Verify Unified Error Screen for Planning Instance in Error State when VF is applied,', async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.ERROR_VIEW_NAME);
        await browser.pause(6000);

        // Validate Scenario chip text 
        const scenarioChipText = await PlanningSpace.getScenarioChipText();
        const scenarioChipValidation = await CommonFunctions.compareTwoValues(scenarioChipText.includes(TestData.ERROR_STATE_SCENARIO), true, `Scenario chip text should contain '${TestData.ERROR_STATE_SCENARIO}'`);

        // Validate Interactive icon and the Data Sync error Status 
        const isIconVisible = await PlanningSpace.clickInteractiveDataStatus();
        const interactiveIconValidation = await CommonFunctions.compareTwoValues(isIconVisible, true, 'Interactive Data Status Icon should be visible on the interactive view');
        await browser.pause(3000);
        const isDataSyncErrorDisplayed = await PlanningSpace.verifyDataSyncStatusMessage(TestData.DATA_SYNC_ERROR_MESSAGE, 'error');
        const dataSyncValidation = await CommonFunctions.compareTwoValues(isDataSyncErrorDisplayed, true, `"${TestData.DATA_SYNC_ERROR_MESSAGE}" text should be displayed`);
        await browser.pause(3000);

        // Validate "Run a different scope" button is displayed
        const runDifferentScopeBtn = await PlanningSpace.verifyRunDifferentScopeBtn('Run a different scope');
        const scopeBtnValidation = await CommonFunctions.compareTwoValues(runDifferentScopeBtn, true, '"Run a different scope" button should be displayed on the unified error screen');

        // Click on "Run a different scope" and validate scope overlay with "Scope" as title
        await PlanningSpace.clickOnRunDifferentScopeOrScenarioBtn('Run a different scope');
        const isScopeOverlayDisplayed = await ScopePage.doesDrawerOpened('Scope');
        const scopeOverlayValidation = await CommonFunctions.compareTwoValues(isScopeOverlayDisplayed, true, 'Scope overlay with title "Scope" should be displayed after clicking "Run a different scope"');
        await ScopePage.closeDrawer();

        // Validate "Run a different scenario" button is displayed
        const runDifferentScenarioBtn = await PlanningSpace.verifyRunDifferentScenarioBtn('Run a different scenario');
        const scenarioBtnValidation = await CommonFunctions.compareTwoValues(runDifferentScenarioBtn, true, '"Run a different scenario" button should be displayed on the unified error screen');

        // Click "Run a different scenario" and validate scenario overlay with "Scenarios" as title
        await PlanningSpace.clickOnRunDifferentScopeOrScenarioBtn('Run a different scenario');
        const isScenarioOverlayDisplayed = await ScopePage.doesDrawerOpened('Scenarios');
        const scenarioOverlayValidation = await CommonFunctions.compareTwoValues(isScenarioOverlayDisplayed, true, 'Scenario overlay with title "Scenarios" should be displayed after clicking "Run a different scenario"');
        await ScopePage.closeDrawer();

        // Verify Supply Chain Actions (Procedures) dropdown is disabled on the empty state screen
        const isSCADisabled = await PlanningSpace.validateSCADropdownStatus();
        const scaDisabledValidation = await CommonFunctions.compareTwoValues(isSCADisabled, true, 'Supply Chain Actions should be disabled on the Error state screen');

        expect(scenarioChipValidation && interactiveIconValidation && dataSyncValidation && scopeBtnValidation && scenarioBtnValidation && scopeOverlayValidation && scenarioOverlayValidation && scaDisabledValidation).toBeTruthy();
    });

    it('Test case 2: Verify Unified Empty State Screen when VF is not available', async () => {
        // Switch context to PROCESS:Fault Tolerance Empty State
        await PlanningSpace.selectEntityFromContext({ process: TestData.PROCESS_NAME_2 });
        await browser.pause(10000);
        await ProcessPage.clickLeftpaneLinks('Planning');
        await browser.pause(6000);
        
        // Validate "Set filters to get started" text is displayed
        const isSetFiltersDisplayed = await PlanningSpace.verifySetFiltersText();
        const setFiltersValidation = await CommonFunctions.compareTwoValues(isSetFiltersDisplayed, true, '"Set filters to get started" text should be displayed on the empty state screen');

        // Validate "Configure" button is displayed
        const configureBtn = await PlanningSpace.verifyConfigureBtn();
        const configureBtnValidation = await CommonFunctions.compareTwoValues(configureBtn, true, '"Configure" button should be displayed on the empty state screen');

        // Click "Configure" button and validate scope overlay with "Scope" as title
        await PlanningSpace.clickOnConfigureBtn();
        await browser.pause(5000);
        const isScopeOverlayDisplayed = await ScopePage.doesDrawerOpened('Scope');
        const scopeOverlayValidation = await CommonFunctions.compareTwoValues(isScopeOverlayDisplayed, true, 'Scope overlay with title "Scope" should be displayed after clicking "Configure"');
        await ScopePage.closeDrawer();

        // Verify Supply Chain Actions (Procedures) dropdown is disabled on the empty state screen
        const isSCADisabled = await PlanningSpace.validateSCADropdownStatus();
        const scaDisabledValidation = await CommonFunctions.compareTwoValues(isSCADisabled, true, 'Supply Chain Actions should be disabled on the empty state screen');

        expect(setFiltersValidation && configureBtnValidation && scopeOverlayValidation && scaDisabledValidation).toBeTruthy();
    });


});