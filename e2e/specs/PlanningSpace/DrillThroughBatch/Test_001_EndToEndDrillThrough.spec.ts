import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
import ScenarioPage from '../../../pageobjects/scenario.page';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/DrillThroughBatch/Test_001_EndToEndDrillThrough.json");


describe('Multilevel Drill Through(Source to Target and Target to Source) - Process', () => {

    let scenarioName;
    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await browser.pause(5000);
    });

    it('Test Case 1: First Level Drill Through From Source to Target', async () => {
        const sViewFrom: string = TestData.TC1_DRILL_THROUGH_VIEW_FROM;
        const sViewNameTo: string = TestData.TC1_DRILL_THROUGH_VIEW_TO;
        const cellValue: string = TestData.TC1_DRILL_THROUGH_CELL
        await PlanningSpace.clickViewsDropDown();
        const result: boolean = await PlanningSpace.clickDashBoard(sViewFrom);
        let bValidation1: boolean = await CommonFunctions.compareTwoValues(result, true, "View " + sViewFrom + " Found Assertion");
        await PlanningSpace.toggleMinimizeIcon();
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
        let bValidation5: boolean = await CommonFunctions.compareTwoValues(sContextID.length > 1, true, "Context ID Assertion, it should have some ID and its length should be greated than 1");
        // let bValidation6: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isRedDotDisplaysOnPlanningSpace(), true, "Red Dot Display On Planning Space Assertion");
        scenarioName = await PlanningSpace.getScenarioChipText();
        let isScenarioMatched: boolean = await CommonFunctions.compareTwoValues(
         await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpaceInDrawer(scenarioName),
            true,
            `Checking if ${scenarioName} Scenario Matched`
        );
        let scopeValidation: boolean = await CommonFunctions.compareTwoValues(
            await PlanningSpace.isScopeAppliedInDrawer(TestData.DIMENSIONS),
            true,
            `Is Scope applied for dimensions: ${TestData.DIMENSIONS}`
        );
        let columnValidation: boolean = await CommonFunctions.compareTwoValues(
            await PlanningSpace.isColumnsValidated(TestData.TC1_DRILL_THROUGH_CELL),
            true,
            `Column validation for cell: ${TestData.TC1_DRILL_THROUGH_CELL}`
        );
        let globalScopeChip: boolean = await CommonFunctions.compareTwoValues(
            await PlanningSpace.isGlobalScopeChipDisplays(),
            true,
            "Global Scope Chip is displayed"
        );
        let scenarioChipVdn: boolean = await CommonFunctions.compareTwoValues(
            await PlanningSpace.isScenarioChipCorrect(scenarioName),
            true,
            `Scenario Chip displays ${scenarioName}`
        );
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
            scopeValidation &&
            columnValidation &&
            globalScopeChip &&
            scenarioChipVdn
        ).toEqual(true);
    });


    it('Test Case 2: Second Level Drill Through From Target to Source', async () => {
        await browser.pause(5000);
        const sViewNameTo: string = TestData.LV2_DRILL_THROUGH_VIEW_TO;
        const cellValue: string = TestData.LV2_DRILL_THROUGH_CELL;
        await CommonFunctions.switchToSpecificWindow(1);
        await browser.pause(5000);
        await PlanningSpace.switchToMFEFrame();
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
        let bValidation5: boolean = await CommonFunctions.compareTwoValues(sContextID.length > 1, true, "Context ID Assertion, it should have some ID and its length should be greated than 1");
        // let bValidation6: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isRedDotDisplaysOnPlanningSpace(), true, "Red Dot Display On Planning Space Assertion");
        scenarioName = await PlanningSpace.getScenarioChipText();
        let isScenarioMatched: boolean = await CommonFunctions.compareTwoValues(
            await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpaceInDrawer(scenarioName),
            true,
            `Checking if ${scenarioName} Scenario Matched`
        );
        let scopeValidation: boolean = await CommonFunctions.compareTwoValues(
            await PlanningSpace.isScopeAppliedInDrawer(TestData.DIMENSIONS),
            true,
            `Is Scope applied for dimensions: ${TestData.DIMENSIONS}`
        );
        let columnValidation: boolean = await CommonFunctions.compareTwoValues(
            await PlanningSpace.isColumnsValidated(TestData.TC1_DRILL_THROUGH_CELL),
            true,
            `Column validation for cell: ${TestData.TC1_DRILL_THROUGH_CELL}`
        );
        let globalScopeChip: boolean = await CommonFunctions.compareTwoValues(
            await PlanningSpace.isGlobalScopeChipDisplays(),
            true,
            "Global Scope Chip is displayed"
        );
        let scenarioChipVdn: boolean = await CommonFunctions.compareTwoValues(
            await PlanningSpace.isScenarioChipCorrect(scenarioName),
            true,
            `Scenario Chip displays ${scenarioName}`
        );
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
            scopeValidation &&
            columnValidation &&
            globalScopeChip &&
            scenarioChipVdn
        ).toEqual(true);
    });

});