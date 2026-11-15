import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/DrillThroughBatch/Test_006_HiddenViewTransitionInSameTab.json");


describe('Transition of views in same tab on drill through', () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    });

    it('Test Case 1: Transits from non hidden view to non hidden views', async () => {
        const CELL_VALUE: string = TestData.DRILL_THOROUGH_ON_CELLS[0];
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.selectViewByTypeAndName('All Views', TestData.NON_HIDDEN_VIEWS[0]);
        const currentURL = await browser.getUrl();
        const viewId1 = await PlanningSpace.getViewId(currentURL);
        await CommonFunctions.logMessage("INFO", `View id is ${viewId1}`);
        await CommonFunctions.logMessage('INFO', `Performing drill through on cell with value "${CELL_VALUE}" `);
        await PlanningSpace.performDrillThroughOnCardField(CELL_VALUE, TestData.NON_HIDDEN_VIEWS[1]);
        await browser.pause(5000);
        const navigatedURL = await browser.getUrl();
        const viewId2 = await PlanningSpace.getViewId(navigatedURL);
        await CommonFunctions.logMessage("INFO", `View id is ${viewId2}`);
        const bValidation: boolean = await CommonFunctions.compareTwoValues(viewId1 != viewId2, true, 'Checking two view id that should not be same');
        const contextId = await PlanningSpace.getContextId(navigatedURL);
        await CommonFunctions.compareTwoValues(contextId != "", true, `Context id should exist while drillthrough`);
        const isBackBtnExist: boolean = await PlanningSpace.isBackBtnDisplayed();
        await CommonFunctions.compareTwoValues(isBackBtnExist, false, 'Is back button displayed');
        const isViewHighlighted: boolean = await PlanningSpace.isViewSelected(TestData.NON_HIDDEN_VIEWS[1], false);
        await CommonFunctions.compareTwoValues(isViewHighlighted, true, `Is ${TestData.NON_HIDDEN_VIEWS[1]} view selected after drill through`);
        const isClearDisplays: boolean = await PlanningSpace.isClearDisplays();
        await CommonFunctions.compareTwoValues(isClearDisplays, true, `Is clear context button available`);
        await PlanningSpace.clearContext();
        expect(bValidation && contextId && !isBackBtnExist && isViewHighlighted && isClearDisplays).toBeTruthy();
    });

    it('Test Case 2: Transits from non hidden views to hidden views', async () => {
        const CELL_VALUE: string = TestData.DRILL_THOROUGH_ON_CELLS[1];
        await PlanningSpace.switchToMFEFrame();
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.selectViewByTypeAndName('All Views', TestData.NON_HIDDEN_VIEWS[1]);
        const currentURL = await browser.getUrl();
        const viewId1 = await PlanningSpace.getViewId(currentURL);
        await CommonFunctions.logMessage("INFO", `View id is ${viewId1}`);
        await CommonFunctions.logMessage('INFO', `Performing drill through on cell with value "${CELL_VALUE}" `);
        await PlanningSpace.toggleMinimizeIcon();
        await PlanningSpace.performDrillThroughOnCardField(CELL_VALUE, TestData.HIDDEN_VIEWS[1]);
        await browser.pause(5000);
        const navigatedURL = await browser.getUrl();
        const viewId2 = await PlanningSpace.getViewId(navigatedURL);
        await CommonFunctions.logMessage("INFO", `View id is ${viewId2}`);
        const bValidation: boolean = await CommonFunctions.compareTwoValues(viewId2 != viewId1, true, 'Checking two view id that should not be same');
        const contextId = await PlanningSpace.getContextId(navigatedURL);
        await CommonFunctions.compareTwoValues(contextId != "", true, `Context id should exist while drillthrough`);
        const isBackBtnExist: boolean = await PlanningSpace.isBackBtnDisplayed();
        await CommonFunctions.compareTwoValues(isBackBtnExist, true, 'Is back button displayed');
        const isViewHighlighted: boolean = await PlanningSpace.isViewSelected(TestData.NON_HIDDEN_VIEWS[1], false);
        await CommonFunctions.compareTwoValues(isViewHighlighted, true, `Is ${TestData.NON_HIDDEN_VIEWS[1]} view selected after drill through`);
        const isClearDisplays: boolean = await PlanningSpace.isClearDisplays();
        await CommonFunctions.compareTwoValues(isClearDisplays, true, `Is clear context button available`);
        await PlanningSpace.clearContext();
        expect(bValidation && contextId && isBackBtnExist && isViewHighlighted && isClearDisplays).toBeTruthy();
    });

    it('Test Case 3: Transits from hidden view to hidden view', async () => {
        const CELL_VALUE: string = TestData.DRILL_THOROUGH_ON_CELLS[2];
        await PlanningSpace.switchToMFEFrame();
        await browser.pause(20000);
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.selectViewByTypeAndName('Hidden Views', TestData.HIDDEN_VIEWS[0]);
        const currentURL = await browser.getUrl();
        const viewId1 = await PlanningSpace.getViewId(currentURL);
        await browser.pause(5000);
        await CommonFunctions.logMessage("INFO", `View id is ${viewId1}`);
        await browser.pause(7000);
        await CommonFunctions.logMessage('INFO', `Performing drill through on cell with value "${CELL_VALUE}" `);
        await PlanningSpace.performDrillThroughOnCardField(CELL_VALUE, TestData.HIDDEN_VIEWS[1]);
        await browser.pause(5000);
        const navigatedURL = await browser.getUrl();
        await browser.pause(2000)
        const viewId2 = await PlanningSpace.getViewId(navigatedURL);
        await CommonFunctions.logMessage("INFO", `View id is ${viewId2}`);
        const bValidation: boolean = await CommonFunctions.compareTwoValues(viewId2 != viewId1, true, 'Checking two view id that should not be same');
        const contextId = await PlanningSpace.getContextId(navigatedURL);
        await CommonFunctions.compareTwoValues(contextId != "", true, `Context id should exist while drillthrough`);
        const isBackBtnExist: boolean = await PlanningSpace.isBackBtnDisplayed();
        await CommonFunctions.compareTwoValues(isBackBtnExist, true, 'Is back button displayed');
        const isViewHighlighted: boolean = await PlanningSpace.isViewSelected(TestData.HIDDEN_VIEWS[1], false);
        await CommonFunctions.compareTwoValues(isViewHighlighted, true, `Is ${TestData.HIDDEN_VIEWS[1]} view selected after drill through`);
        const isClearDisplays: boolean = await PlanningSpace.isClearDisplays();
        await CommonFunctions.compareTwoValues(isClearDisplays, true, `Is clear context button available`);
        await PlanningSpace.clearContext();
        expect(bValidation && contextId && isBackBtnExist && isViewHighlighted && isClearDisplays).toBeTruthy();
    });

    it('Test Case 4: Transits from hidden view to non hidden views', async () => {
        const CELL_VALUE: string = TestData.DRILL_THOROUGH_ON_CELLS[3];
        await PlanningSpace.switchToMFEFrame();
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.selectViewByTypeAndName('Hidden Views', TestData.HIDDEN_VIEWS[0]);
        const currentURL = await browser.getUrl();
        await browser.pause(5000);
        const viewId1 = await PlanningSpace.getViewId(currentURL);
        await CommonFunctions.logMessage("INFO", `View id is ${viewId1}`);
        await CommonFunctions.logMessage('INFO', `Performing drill through on cell with value "${CELL_VALUE}" `);
        await PlanningSpace.performDrillThroughOnCardField(CELL_VALUE, TestData.NON_HIDDEN_VIEWS[1]);
        await browser.pause(5000);
        const navigatedURL = await browser.getUrl();
        const viewId2 = await PlanningSpace.getViewId(navigatedURL);
        await CommonFunctions.logMessage("INFO", `View id is ${viewId2}`);
        const bValidation: boolean = await CommonFunctions.compareTwoValues(viewId2 != viewId1, true, 'Checking two view id that should not be same');
        await browser.pause(5000);
        const contextId = await PlanningSpace.getContextId(navigatedURL);
        await CommonFunctions.compareTwoValues(contextId != "", true, `Context id should exist while drillthrough`);
        await browser.pause(2000);
        const isBackBtnExist: boolean = await PlanningSpace.isBackBtnDisplayed();
        await CommonFunctions.compareTwoValues(isBackBtnExist, false, 'Is back button displayed');
        const isViewHighlighted: boolean = await PlanningSpace.isViewSelected(TestData.NON_HIDDEN_VIEWS[1], false);
        await CommonFunctions.compareTwoValues(isViewHighlighted, true, `Is ${TestData.NON_HIDDEN_VIEWS[1]} view selected after drill through`);
        const isClearDisplays: boolean = await PlanningSpace.isClearDisplays();
        await CommonFunctions.compareTwoValues(isClearDisplays, true, `Is clear context button available`);
        await PlanningSpace.clearContext();
        expect(bValidation && contextId && !isBackBtnExist && isViewHighlighted && isClearDisplays).toBeTruthy();
    });
})