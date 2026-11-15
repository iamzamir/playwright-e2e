import PlanningSpace from '../../../pageobjects/planning.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
import scopePage from '../../../pageobjects/scope.page';
import apiUtil from '../../../util/api.util';
import CommonFunctions from '../../../util/common.util';
import TestUtil from '../../../util/test.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/DrillThroughBatch/Test_023_DrillThroughSourceWithoutMerge.json");

describe('WorkFlow backend filter 1', () => {
    //  let accessToken: string, headers: Record<string, string>;
    //     const featureFlagUrl: string = process.env.API_BASE_URL as string + (process.env.UPDATE_FEATURE_TOGGLE as string).replace("{featureFlagName}", TestData.FEATURE_FLAG_NAME[0]);
    //     before(async () => {
    //         accessToken = await apiUtil.getBearerToken();
    //         headers = {
    //             "accept": "application/json",
    //             "Authorization": "Bearer " + accessToken
    //         };
    //     });

    let scenarioName=""
    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string,false,false);
        await PlanningSpace.launchContext('Process', { process: TestData.PROCESS_NAME});
        await browser.pause(5000);
    });

    // it('Verify feature toggles are ON', async () => {
    //     const featureFlagResponse = await apiUtil.processAPIRequest("PUT", featureFlagUrl, { name: TestData.FEATURE_FLAG_NAME[0], isEnabled: false }, headers, "Update feature toggle for Scenario all Tab " + TestData.FEATURE_FLAG_NAME[0], "status");
    //     const bValidation1: boolean = await CommonFunctions.compareTwoValues(featureFlagResponse, 200, "Feature toggle updated successfully");
    //     expect(bValidation1).toBeTruthy();
    // });

    it('Test Case 1: Drill Through From Source without merge context to Target view without backend filter)', async () => {
        await TestUtil.setBaseAsDefaultScenario();
        // await PlanningSpace.closeManageScenarios();
        const sViewFrom: string = TestData.TC1_DRILL_THROUGH_VIEW_FROM;
        const sViewNameTo: string = TestData.TC1_DRILL_THROUGH_VIEW_TO;
        const cellValue: string = TestData.TC1_DRILL_THROUGH_CELL
        await PlanningSpace.clickViewsDropDown();
        const result: boolean = await PlanningSpace.clickDashBoard(sViewFrom);
        let bValidation1: boolean = await CommonFunctions.compareTwoValues(result, true, "View " + sViewFrom + " Found Assertion");
        await PlanningSpace.performDrillThroughOnCardField(cellValue, sViewNameTo);
        await browser.pause(5000);
        await CommonFunctions.switchToSpecificWindow(1);
        let sActualViewName: string = await PlanningSpace.getViewTitleName();
        await browser.pause(30000);
        let bValidation2: boolean = await CommonFunctions.compareTwoValues(sActualViewName, sViewNameTo, `Process Name Assertion after Drill Through to ${sViewNameTo}`);
        let bValidation3: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isViewSelected(sViewNameTo), true, sViewNameTo + " View Selected Assertion");
        let sCurrentUrl: string = await browser.getUrl();
        await CommonFunctions.logMessage('INFO', `current url is ${sCurrentUrl}`)
        let sSplitUrl = sCurrentUrl.split("&");
        let sContextID: string = "";
        for (let i = 0; i < sSplitUrl.length; i++) {
            if (sSplitUrl[i].includes("contextId=")) {
                sContextID = sSplitUrl[i].split("=")[1];
            }
        }
        await CommonFunctions.logMessage('INFO', `context id is  ${sContextID}`)
        let bValidation4: boolean = await CommonFunctions.compareTwoValues(sCurrentUrl.includes("contextId="), true, "URL includes Context ID Assertion");
        let bValidation5: boolean = await CommonFunctions.compareTwoValues(sContextID.length > 1, true, "Context ID Assertion, it should have some ID and its length should be greater than 1");
        // let bValidation6: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isRedDotDisplaysOnPlanningSpace(), true, "Red Dot Display On Planning Space Assertion");
        scenarioName = await PlanningSpace.getScenarioChipText();
        let isScenarioMatched: boolean = await CommonFunctions.compareTwoValues(
            await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpaceInDrawer(scenarioName),
            true,
            `Checking if ${scenarioName} Scenario Matched`
        );
        await scopePage.clickOnTab('Scope');
        await browser.pause(8000);
        let scopeValidation: boolean =true;
        for (const item of TestData.DRILL_THROUGH_SCOPE) {
            const isExists = await scopePage.verifyAppliedFilterInScope(item.ATTRIBUTE_NAME, item.VALUES[0]);
            if (!isExists) {
                await CommonFunctions.logMessage('INFO', `${item.ATTRIBUTE_NAME} with value ${item.VALUES[0]} is not applied in scope`);
                scopeValidation = false;
            }
        }
    
        let bValidation6: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isContextOverrideDisplays(false), true, "Context Override button Displays Assertion");
        let bValidation7: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isClearDisplays(), true, "Clear Button/Link Displays Assertion");
        expect(
            bValidation1 &&
            bValidation2 &&
            bValidation3 &&
            bValidation4 &&
            bValidation5 &&
            bValidation6 &&
            bValidation7 &&
            isScenarioMatched &&
            scopeValidation
        ).toEqual(true);
    });

   

    it('Test Case2 : Drill Through From Source without merge context to Target view with backend filter', async () => {
        // Pause to allow the elements to load properly
        await browser.pause(9000);
        await CommonFunctions.switchToSpecificWindow(0);
        await browser.pause(5000);
        await PlanningSpace.switchToMFEFrame();
        await browser.pause(5000);
        const sViewFrom: string = TestData.TC1_DRILL_THROUGH_VIEW_FROM;
        const sViewNameTo: string = TestData.TC2_DRILL_THROUGH_VIEW_TO;
        const cellValue: string = TestData.TC1_DRILL_THROUGH_CELL
        await PlanningSpace.performDrillThroughOnCardField(cellValue, sViewNameTo);
        await browser.pause(5000);
        await CommonFunctions.switchToSpecificWindow(2);
        let sActualViewName: string = await PlanningSpace.getViewTitleName();
        await browser.pause(30000);
        let bValidation2: boolean = await CommonFunctions.compareTwoValues(sActualViewName, sViewNameTo, `Process Name Assertion after Drill Through to ${sViewNameTo}`);
        let bValidation3: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isViewSelected(sViewNameTo), true, sViewNameTo + " View Selected Assertion");
        let sCurrentUrl: string = await browser.getUrl();
        await CommonFunctions.logMessage('INFO', `current url is ${sCurrentUrl}`)
        let sSplitUrl = sCurrentUrl.split("&");
        let sContextID: string = "";
        for (let i = 0; i < sSplitUrl.length; i++) {
            if (sSplitUrl[i].includes("contextId=")) {
                sContextID = sSplitUrl[i].split("=")[1];
            }
        }
        await CommonFunctions.logMessage('INFO', `context id is  ${sContextID}`)
        let bValidation4: boolean = await CommonFunctions.compareTwoValues(sCurrentUrl.includes("contextId="), true, "URL includes Context ID Assertion");
        let bValidation5: boolean = await CommonFunctions.compareTwoValues(sContextID.length > 1, true, "Context ID Assertion, it should have some ID and its length should be greater than 1");
        // let bValidation6: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isRedDotDisplaysOnPlanningSpace(), true, "Red Dot Display On Planning Space Assertion");
        scenarioName = await PlanningSpace.getScenarioChipText();
        let isScenarioMatched: boolean = await CommonFunctions.compareTwoValues(
            await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpaceInDrawer(scenarioName),
            true,
            `Checking if ${scenarioName} Scenario Matched`
        );
        await scopePage.clickOnTab('Scope');
        await browser.pause(5000);
        let scopeValidation: boolean =true;
        for (const item of TestData.DRILL_THROUGH_SCOPE) {
            const isExists = await scopePage.verifyAppliedFilterInScope(item.ATTRIBUTE_NAME, item.VALUES[0]);
            if (!isExists) {
                await CommonFunctions.logMessage('INFO', `${item.ATTRIBUTE_NAME} with value ${item.VALUES[0]} is not applied in scope`);
                scopeValidation = false;
            }
        }

        let bValidation6: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isContextOverrideDisplays(false), true, "Context Override button Displays Assertion");
        let bValidation7: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isClearDisplays(), true, "Clear Button/Link Displays Assertion");
        expect(
            bValidation2 &&
            bValidation3 &&
            bValidation4 &&
            bValidation5 &&
            bValidation6 &&
            bValidation7 &&
            isScenarioMatched &&
            scopeValidation
        ).toEqual(true);
    });

    it('Test Case 3: Drill through from Maas Pivot Card View to Maas Chart Card View to check scope after applying draft filter', async () => {
            await PlanningSpace.switchToMfe();
            await scopePage.clickOnTab(TestData.SCOPE_TAB);
            await browser.pause(5000);
            await PlanningSpace.configureFilters(TestData.FILTERCONFIGS);
            await browser.pause(5000);
            await scopePage.clickOnTab('Scope');
            await browser.pause(3000);
            const scopeTitle : string = await scopePage.getAppliedVFTitle();
            let bValidation3: boolean = await CommonFunctions.compareTwoValues(scopeTitle, "Preselected", "Scope Title Assertion after Drill Through to " + TestData.DRILL_THROUGH_VIEW_TO_1);
            expect (bValidation3).toEqual(true);
        })

});

describe('WorkFlow backend filter 2', () => {
    let scenarioName=""
    before(async () => {
        await browser.closeWindow();
        await CommonFunctions.switchToSpecificWindow(1);
        await browser.closeWindow();
        await CommonFunctions.switchToSpecificWindow(0);
        await PlanningSpace.switchToMFEFrame();
    });

    it('Test Case 1: First Level Drill Through From Source without merge context to Target view without backend filter)', async () => {
        const sViewFrom: string = TestData.TC1_DRILL_THROUGH_VIEW_FROM;
        const sViewNameTo: string = TestData.TC1_DRILL_THROUGH_VIEW_TO;
        const cellValue: string = TestData.TC1_DRILL_THROUGH_CELL;
        await PlanningSpace.performDrillThroughOnCardField(cellValue, sViewNameTo);
        await browser.pause(5000);
        await CommonFunctions.switchToSpecificWindow(1);
        let sActualViewName: string = await PlanningSpace.getViewTitleName();
        await browser.pause(30000);
        let bValidation2: boolean = await CommonFunctions.compareTwoValues(sActualViewName, sViewNameTo, `Process Name Assertion after Drill Through to ${sViewNameTo}`);
        let bValidation3: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isViewSelected(sViewNameTo), true, sViewNameTo + " View Selected Assertion");
        let sCurrentUrl: string = await browser.getUrl();
        await CommonFunctions.logMessage('INFO', `current url is ${sCurrentUrl}`)
        let sSplitUrl = sCurrentUrl.split("&");
        let sContextID: string = "";
        for (let i = 0; i < sSplitUrl.length; i++) {
            if (sSplitUrl[i].includes("contextId=")) {
                sContextID = sSplitUrl[i].split("=")[1];
            }
        }
        await CommonFunctions.logMessage('INFO', `context id is  ${sContextID}`)
        let bValidation4: boolean = await CommonFunctions.compareTwoValues(sCurrentUrl.includes("contextId="), true, "URL includes Context ID Assertion");
        let bValidation5: boolean = await CommonFunctions.compareTwoValues(sContextID.length > 1, true, "Context ID Assertion, it should have some ID and its length should be greater than 1");
        // let bValidation6: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isRedDotDisplaysOnPlanningSpace(), true, "Red Dot Display On Planning Space Assertion");
        scenarioName = await PlanningSpace.getScenarioChipText();
        let isScenarioMatched: boolean = await CommonFunctions.compareTwoValues(
            await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpaceInDrawer(scenarioName),
            true,
            `Checking if ${scenarioName} Scenario Matched`
        );
        await scopePage.clickOnTab('Scope');
        await browser.pause(10000);
        let scopeValidation: boolean =true;
        for (const item of TestData.DRILL_THROUGH_SCOPE) {
            const isExists = await scopePage.verifyAppliedFilterInScope(item.ATTRIBUTE_NAME, item.VALUES[0]);
            if (!isExists) {
                await CommonFunctions.logMessage('INFO', `${item.ATTRIBUTE_NAME} with value ${item.VALUES[0]} is not applied in scope`);
                scopeValidation = false;
            }
        }

        let bValidation6: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isContextOverrideDisplays(false), true, "Context Override button Displays Assertion");
        let bValidation7: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isFilterDetailsDisplays(), false, "Filter Details button Displays Assertion");
        let bValidation8: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isClearDisplays(), true, "Clear Button/Link Displays Assertion");
        expect(
            bValidation2 &&
            bValidation3 &&
            bValidation4 &&
            bValidation5 &&
            bValidation6 &&
            bValidation7 &&
            bValidation8 &&
            isScenarioMatched &&
            scopeValidation
        ).toEqual(true);
    });

    

    it('Test Case2 : Drill Through From Source without merge context to Target view with always AND backend filter', async () => {
        // Pause to allow the elements to load properly
        await browser.pause(9000);
        await CommonFunctions.switchToSpecificWindow(0);
        await browser.pause(5000);
        await PlanningSpace.switchToMFEFrame();
        await browser.pause(5000);
        const sViewFrom: string = TestData.TC1_DRILL_THROUGH_VIEW_FROM;
        const sViewNameTo: string = TestData.TC2_DRILL_THROUGH_VIEW_TO;
        const cellValue: string = TestData.TC1_DRILL_THROUGH_CELL;
        await PlanningSpace.performDrillThroughOnCardField(cellValue, sViewNameTo);
        await browser.pause(3000);
        await CommonFunctions.switchToSpecificWindow(2);
        let sActualViewName: string = await PlanningSpace.getViewTitleName();
        await browser.pause(30000);
        let bValidation2: boolean = await CommonFunctions.compareTwoValues(sActualViewName, sViewNameTo, `Process Name Assertion after Drill Through to ${sViewNameTo}`);
        let bValidation3: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isViewSelected(sViewNameTo), true, sViewNameTo + " View Selected Assertion");
        let sCurrentUrl: string = await browser.getUrl();
        await CommonFunctions.logMessage('INFO', `current url is ${sCurrentUrl}`)
        let sSplitUrl = sCurrentUrl.split("&");
        let sContextID: string = "";
        for (let i = 0; i < sSplitUrl.length; i++) {
            if (sSplitUrl[i].includes("contextId=")) {
                sContextID = sSplitUrl[i].split("=")[1];
            }
        }
        await CommonFunctions.logMessage('INFO', `context id is  ${sContextID}`)
        let bValidation4: boolean = await CommonFunctions.compareTwoValues(sCurrentUrl.includes("contextId="), true, "URL includes Context ID Assertion");
        let bValidation5: boolean = await CommonFunctions.compareTwoValues(sContextID.length > 1, true, "Context ID Assertion, it should have some ID and its length should be greater than 1");
        const scenarioName = await PlanningSpace.getScenarioChipText();
        let isScenarioMatched: boolean = await CommonFunctions.compareTwoValues(
            await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpaceInDrawer(scenarioName),
            true,
            `Checking if ${scenarioName} Scenario Matched`
        );
         await scopePage.clickOnTab('Scope');
        await browser.pause(8000);

        let scopeValidation: boolean =true;
        for (const item of TestData.DRILL_THROUGH_SCOPE) {
            const isExists = await scopePage.verifyAppliedFilterInScope(item.ATTRIBUTE_NAME, item.VALUES[0]);
            if (!isExists) {
                await CommonFunctions.logMessage('INFO', `${item.ATTRIBUTE_NAME} with value ${item.VALUES[0]} is not applied in scope`);
                scopeValidation = false;
            }
        }
        let bValidation6: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isContextOverrideDisplays(false), true, "Context Override button Displays Assertion");
        let bValidation7: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isFilterDetailsDisplays(), true, "Filter Details button Displays Assertion");
        let bValidation8: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isClearDisplays(), true, "Clear Button/Link Displays Assertion");
        let bValidation9: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.showFilterDetails(true, TestData.BACKEND_FILTERS), true, "Backend workflow filters Displays Assertion");
        let bValidation10: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.closeWorkflowFilterDetails(), true, "Backend workflow filters Details closed Assertion");
        let bValidation11: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.checkMergeScopeLogic(TestData.DRILL_THROUGH_SCOPE[1],TestData.BACKEND_FILTERS), true, "always AND BE merge logic Assertion");

        expect(
            bValidation2 &&
            bValidation3 &&
            bValidation4 &&
            bValidation5 &&
            bValidation6 &&
            bValidation7 &&
            bValidation8 &&
            bValidation9 &&
            bValidation10 &&
            bValidation11 &&
            isScenarioMatched &&
            scopeValidation
        ).toEqual(true);
    });


});