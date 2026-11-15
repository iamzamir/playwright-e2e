import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
import ScenarioPage from '../../../pageobjects/scenario.page';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/DrillThroughBatch/Test_010_MultiLevelDrillThroughMassBdeWithAssumption.json");

describe('End to End Drill Through Test with Assumption', () => {
    let scenarioName=""
    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
        await PlanningSpace.launchContext('Assumption', { origin: TestData.PROCESS_NAME, assumption: TestData.ASSUMPTION.ASSUMPTION_NAME });
        await browser.pause(5000);
    });

    it('Test Case 1: First Level Drill Through From Source to Target(Mass Pivot to BDE card)', async () => {
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
        let bValidation5: boolean = await CommonFunctions.compareTwoValues(sContextID.length > 1, true, "Context ID Assertion, it should have some ID and its length should be greated than 1");
        // let bValidation6: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isRedDotDisplaysOnPlanningSpace(), true, "Red Dot Display On Planning Space Assertion");
        scenarioName = await PlanningSpace.getScenarioChipText();
        let isScenarioMatched: boolean = await CommonFunctions.compareTwoValues(
            await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpaceInDrawer(scenarioName),
            true,
            `Checking if ${scenarioName} Scenario Matched`
        );
        let scopeValidation: boolean = await CommonFunctions.compareTwoValues(
            await PlanningSpace.isScopeAppliedInDrawer(TestData.DIMENSIONS1),
            true,
            `Is Scope applied for dimensions: ${TestData.DIMENSIONS1}`
        );

        let columnValidation: boolean = await CommonFunctions.compareTwoValues(
            await PlanningSpace.isBDEElementPresent(TestData.BDE_CARD_DATA),
            true,
            `Column validation for cell: ${TestData.BDE_CARD_DATA}`
        );
        let globalScopeChip: boolean = await CommonFunctions.compareTwoValues(
            await PlanningSpace.isGlobalScopeChipDisplays(),
            true,
            "Global Scope Chip is displayed"
        );
        let scenarioChipVdn: boolean = await CommonFunctions.compareTwoValues(
            await PlanningSpace.isScenarioChipCorrect(scenarioName),
            true,
            `Scenario Chip displays${scenarioName} `
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
            globalScopeChip &&
            scenarioChipVdn &&
            columnValidation
        ).toEqual(true);
    });

   

    it('Test Case :On BDE Card row click navigate to new window on Mass chart card', async () => {
        // Pause to allow the elements to load properly
        await browser.pause(9000);
         await CommonFunctions.switchToSpecificWindow(1);
         await browser.pause(5000);
         await PlanningSpace.switchToMFEFrame();
         await browser.pause(5000);
        // Locate and move to the BDE card element
        const bdeCardElement = await $('//div[@data-testid="lui-dashboard-card-cardHeader"]//span[@data-testid="lui-dashboard-card-title"]//span[text()="' + TestData.CARD_NAME + '"]');
        console.log('//div[@data-testid="lui-dashboard-card-cardHeader"]//span[@data-testid="lui-dashboard-card-title"]//span[text()="' + TestData.CARD_NAME + '"]')
        bdeCardElement.moveTo();
        if (await bdeCardElement.isExisting()) {
            console.log("BDE card (entire data) exists.");
        } else {
            console.warn("BDE card (entire data) not found.");
        }

        // Locate and click on the table cell chevron if it exists
        let tableCellChevron;
        if (process.env.PSENV == "QA")
            tableCellChevron = await $('//tbody//tr[2][@data-testid="tableRow"]//td[7][@data-testid="tableCellChevron"]');
        else
            tableCellChevron = await $('//tbody//tr[2][@data-testid="tableRow"]//td[6][@data-testid="tableCellChevron"]');
        if (await tableCellChevron.isExisting()) {
            await tableCellChevron.click();
            console.log("Clicked on the table cell chevron.");
        } else {
            console.warn("Table cell chevron not found.");
        }
        await browser.pause(10000);
        await CommonFunctions.switchToSpecificWindow(2);
        const actualViewName = await PlanningSpace.getViewTitleName();
        await browser.pause(30000);
        const isViewNameCorrect = await CommonFunctions.compareTwoValues(actualViewName, TestData.VIEW_NAME1, `Process Name Assertion after Drill Through to ${TestData.VIEW_NAME1}`);
        const isViewSelected = await CommonFunctions.compareTwoValues(await PlanningSpace.isViewSelected(TestData.VIEW_NAME1), true, `${TestData.VIEW_NAME1} View Selected Assertion`);
        const currentUrl = await browser.getUrl();
        await CommonFunctions.logMessage('INFO', `Current URL is ${currentUrl}`);
        let contextId = "";
        currentUrl.split("&").forEach(part => {
            if (part.includes("contextId=")) {
                contextId = part.split("=")[1];
            }
        });
        await CommonFunctions.logMessage('INFO', `Context ID is ${contextId}`);
        const isContextIdInUrl = await CommonFunctions.compareTwoValues(currentUrl.includes("contextId="), true, "URL includes Context ID Assertion");
        const isContextIdValid = await CommonFunctions.compareTwoValues(contextId.length > 1, true, "Context ID Assertion - It should have a valid ID");
        const isContextOverrideDisplayed = await CommonFunctions.compareTwoValues(await PlanningSpace.isContextOverrideDisplays(), true, "Context Override Button Displays Assertion");
        const isClearButtonDisplayed = await CommonFunctions.compareTwoValues(await PlanningSpace.isClearDisplays(), true, "Clear Button/Link Displays Assertion");
        let bValidation9: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.getDTDataInMaasChart(), TestData.MASS_CHART_DATA, "Drill Through Data Displays Assertion");
        scenarioName = await PlanningSpace.getScenarioChipText();
        let isScenarioMatched: boolean = await CommonFunctions.compareTwoValues(
            await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpaceInDrawer(scenarioName),
            true,
            `Checking if ${scenarioName} Scenario Matched`
        );
        let scopeValidation: boolean = await CommonFunctions.compareTwoValues(
            await PlanningSpace.isScopeAppliedInDrawer(TestData.DIMENSIONS2),
            true,
            `Is Scope applied for dimensions: ${TestData.DIMENSIONS2}`
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
            isViewNameCorrect && isViewSelected && isContextIdInUrl && isContextIdValid && isContextOverrideDisplayed && isClearButtonDisplayed &&
            bValidation6 &&
            bValidation7 &&
            isScenarioMatched &&
            scopeValidation &&
            globalScopeChip &&
            scenarioChipVdn &&
            bValidation9
        ).toEqual(true);
    });


});