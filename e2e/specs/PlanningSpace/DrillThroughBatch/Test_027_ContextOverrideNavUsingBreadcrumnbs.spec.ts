import PlanningSpace from '../../../pageobjects/planning.page';
import GlobalSettings from '../../../pageobjects/global-settings.page';
import SettingsArrangeViews from '../../../pageobjects/view-mapping.page';
import CommonFunctions from '../../../util/common.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/DrillThroughBatch/Test_027_ContextOverrideNavUsingBreadcrumnbs.json");

describe('Context Override popup and breadcrumb navigation', () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    });
    // commenting below test case as view mappings are done in data setup now
    // it('Case 1: Map the views (Normal & Hidden) to the process', async () => {
    //     await PlanningSpace.navToProcessOrchestration();
    //     await browser.pause(10000);
    //     await GlobalSettings.clickGlobalSettings();
    //     await GlobalSettings.clickGlobalSettingsListMenu('Process');
    //     await SettingsArrangeViews.selectProcess(TestData.SELECT_PROCESS);
    //     let validation1: boolean = await CommonFunctions.compareTwoValues(await GlobalSettings.removeViewMappingToEntity(TestData.SELECT_PROCESS), true, 'Remove Mapping for Process');
    //     const allViewsToMap: string[] = [TestData.SAME_TAB.NORMAL_VIEW_1, TestData.SAME_TAB.NORMAL_VIEW_2, TestData.SAME_TAB.HIDDEN_VIEW_1, TestData.NEW_TAB.NORMAL_VIEW_1, TestData.NEW_TAB.NORMAL_VIEW_2, TestData.NEW_TAB.HIDDEN_VIEW_1];
    //     let isViewMapSuccess: boolean = await GlobalSettings.addViewMappingToEntity(TestData.SELECT_PROCESS, allViewsToMap);
    //     let validation2: boolean = await CommonFunctions.compareTwoValues(isViewMapSuccess, true, 'Selected Mappings for Process');
    //     await SettingsArrangeViews.selectProcessAction(TestData.SELECT_PROCESS, 'Map With...');
    //     await SettingsArrangeViews.hideOrUnhideView(TestData.SAME_TAB.HIDDEN_VIEW_1, "HIDE_VIEW");
    //     await SettingsArrangeViews.hideOrUnhideView(TestData.NEW_TAB.HIDDEN_VIEW_1, "HIDE_VIEW");
    //     const isSaved = await SettingsArrangeViews.clickSave();
    //     await CommonFunctions.compareTwoValues(isSaved, true, 'Saved the configuration');
    //     expect(validation1 && validation2 && isSaved).toBeTruthy();
    // });

    it('Case 2: Validate Context Override popup and their Breadcrumbs labels in same Tab after First level Drill through.', async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.selectViewByTypeAndName('All Views', TestData.SAME_TAB.NORMAL_VIEW_1);         // Navigate to Pivot Source view
        // Perform drill through on cell 41 from Pivot-Source view (Normal View) to Pivot-Target view (Hidden View)
        await CommonFunctions.logMessage('INFO', `Performing drill through on cell ${TestData.DRILL_THROUGH_CELL_VALUE} to ${TestData.SAME_TAB.HIDDEN_VIEW_1}`);
        await PlanningSpace.performDrillThroughOnCardField(TestData.DRILL_THROUGH_CELL_VALUE, TestData.SAME_TAB.HIDDEN_VIEW_1);
        await browser.pause(5000); // Wait for url to fetch context id
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
        let ContextIdVal: boolean = await CommonFunctions.compareTwoValues(sCurrentUrl.includes("contextId="), true, "URL includes Context ID Assertion")
        let ContextIdLength: boolean = await CommonFunctions.compareTwoValues(sContextID.length > 1, true, "Context ID Assertion, it should have some ID and its length should be greated than 1")
        const isContextOverridePopupDisplayed = await PlanningSpace.clickOnContextOverrideIcon();
        const isvalidationOfBreadCrumb = await PlanningSpace.validateBreadCrumbs(TestData.SAME_TAB.NORMAL_VIEW_1, TestData.SAME_TAB.HIDDEN_VIEW_1);
        let validateContextOverridePopup = await CommonFunctions.compareTwoValues(isContextOverridePopupDisplayed, true, 'Clicked on Context Override Popup');
        let validationOfBreadCrumb = await CommonFunctions.compareTwoValues(isvalidationOfBreadCrumb, true, 'Breadcrumb Displayed: ' + TestData.SAME_TAB.NORMAL_VIEW_1 + ' -> ' + TestData.SAME_TAB.HIDDEN_VIEW_1);
        await PlanningSpace.closeContextOverridePopup();
        expect(ContextIdVal && ContextIdLength && validateContextOverridePopup && validationOfBreadCrumb).toBeTruthy();
    });

    it('Case 3: Validate the Context Override popup and their Breadcrumbs labels in same Tab after Second Level Drill Through', async () => {
        await CommonFunctions.logMessage('INFO', `Performing drill through on cell ${TestData.DRILL_THROUGH_CELL_VALUE} to ${TestData.SAME_TAB.NORMAL_VIEW_2}`);
        // Perform drill through on cell 41 from Pivot-Target view (Hidden View) to Maas Pivot Card View (Normal View)
        await PlanningSpace.performDrillThroughOnCardField(TestData.DRILL_THROUGH_CELL_VALUE, TestData.SAME_TAB.NORMAL_VIEW_2);
       await CommonFunctions.switchToSpecificWindow(1);
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
        let ContextIdVal: boolean = await CommonFunctions.compareTwoValues(sCurrentUrl.includes("contextId="), true, "URL includes Context ID Assertion")
        let ContextIdLength: boolean = await CommonFunctions.compareTwoValues(sContextID.length > 1, true, "Context ID Assertion, it should have some ID and its length should be greated than 1")
        await PlanningSpace.switchToMFEFrame();
        const isContextOverridePopupDisplayed = await PlanningSpace.clickOnContextOverrideIcon();
        const isvalidationOfBreadCrumb = await PlanningSpace.validateBreadCrumbs(TestData.SAME_TAB.HIDDEN_VIEW_1, TestData.SAME_TAB.NORMAL_VIEW_2);
        const isvalidationOfEllipses = await PlanningSpace.validateEllipsesInOverridePopup();
        let validateContextOverridePopup = await CommonFunctions.compareTwoValues(isContextOverridePopupDisplayed, true, 'Clicked on Context Override Popup');
        let validationOfBreadCrumb = await CommonFunctions.compareTwoValues(isvalidationOfBreadCrumb, true, 'Breadcrumb Displayed: ' + TestData.SAME_TAB.HIDDEN_VIEW_1 + ' -> ' + TestData.SAME_TAB.NORMAL_VIEW_2);
        let validationOfEllipses = await CommonFunctions.compareTwoValues(isvalidationOfEllipses, true, 'Ellipses is displayed in Context Override Popup');
        expect(ContextIdVal && ContextIdLength && validateContextOverridePopup && validationOfBreadCrumb && validationOfEllipses).toBeTruthy();
    });

    it('Case 4: Validate the breadcrumb navigation link to Hidden View and Back Arrow Icon to Normal View', async () => {
        await CommonFunctions.logMessage('INFO', 'Clicking on Breadcrumb link and Back Arrow Icon');
        await PlanningSpace.clickOnBreadCrumbLink(TestData.SAME_TAB.HIDDEN_VIEW_1);
        await browser.pause(3000);
        await PlanningSpace.closeContextOverridePopup();
        await PlanningSpace.clickOnBackArrowOfHiddenView();
    });

    it('Case 5: Validate Context Override popup and their Breadcrumbs labels in New Tab after First level Drill through.', async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.selectViewByTypeAndName('All Views', TestData.NEW_TAB.NORMAL_VIEW_1);         // Navigate to DR Source (Normal View)
        // Perform drill through on cell 41 from DRSource view (Normal View) to DR Destination view (Hidden View)
        await CommonFunctions.logMessage('INFO', `Performing drill through on cell ${TestData.DRILL_THROUGH_CELL_VALUE} to ${TestData.NEW_TAB.HIDDEN_VIEW_1}`);
        await PlanningSpace.refreshPivotCard();
        await PlanningSpace.performDrillThroughOnCardField(TestData.DRILL_THROUGH_CELL_VALUE, TestData.NEW_TAB.HIDDEN_VIEW_1);
        await browser.pause(5000); //// Wait for new tab to fetch context id
        await CommonFunctions.switchToSpecificWindow(2);
        await PlanningSpace.switchToMFEFrame();
        await browser.pause(5000);
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
        let ContextIdVal: boolean = await CommonFunctions.compareTwoValues(sCurrentUrl.includes("contextId="), true, "URL includes Context ID Assertion")
        let ContextIdLength: boolean = await CommonFunctions.compareTwoValues(sContextID.length > 1, true, "Context ID Assertion, it should have some ID and its length should be greated than 1")
        const isContextOverridePopupDisplayed = await PlanningSpace.clickOnContextOverrideIcon();
        const isvalidationOfBreadCrumb = await PlanningSpace.validateBreadCrumbs(TestData.NEW_TAB.NORMAL_VIEW_1, TestData.NEW_TAB.HIDDEN_VIEW_1);
        let validateContextOverridePopup = await CommonFunctions.compareTwoValues(isContextOverridePopupDisplayed, true, 'Clicked on Context Override Popup');
        let validationOfBreadCrumb = await CommonFunctions.compareTwoValues(isvalidationOfBreadCrumb, true, 'Breadcrumb Displayed: ' + TestData.NEW_TAB.NORMAL_VIEW_1 + ' -> ' + TestData.NEW_TAB.HIDDEN_VIEW_1);
        await PlanningSpace.closeContextOverridePopup();
        expect(ContextIdVal && ContextIdLength && validateContextOverridePopup && validationOfBreadCrumb).toBeTruthy();
    });

    it('Case 6: Validate the Context Override popup and their Breadcrumbs labels in New Tab after Second Level Drill Through', async () => {
        await CommonFunctions.logMessage('INFO', `Performing drill through on cell ${TestData.DRILL_THROUGH_CELL_VALUE1} to ${TestData.NEW_TAB.NORMAL_VIEW_2}`);
        // Perform drill through on cell 41 from DR Destination view (Hidden View) to Bullet Chart Automation View (Normal View)
        await PlanningSpace.performDrillThroughOnCardField(TestData.DRILL_THROUGH_CELL_VALUE1, TestData.NEW_TAB.NORMAL_VIEW_2);
        await browser.pause(8000); // Wait for new tab to open
        await CommonFunctions.switchToSpecificWindow(3);
        await PlanningSpace.switchToMFEFrame();
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
        let ContextIdVal: boolean = await CommonFunctions.compareTwoValues(sCurrentUrl.includes("contextId="), true, "URL includes Context ID Assertion")
        let ContextIdLength: boolean = await CommonFunctions.compareTwoValues(sContextID.length > 1, true, "Context ID Assertion, it should have some ID and its length should be greated than 1")
        const isContextOverridePopupDisplayed = await PlanningSpace.clickOnContextOverrideIcon();
        const isvalidationOfBreadCrumb = await PlanningSpace.validateBreadCrumbs(TestData.NEW_TAB.HIDDEN_VIEW_1, TestData.NEW_TAB.NORMAL_VIEW_2);
        const isvalidationOfEllipses = await PlanningSpace.validateEllipsesInOverridePopup();
        let validateContextOverridePopup = await CommonFunctions.compareTwoValues(isContextOverridePopupDisplayed, true, 'Clicked on Context Override Popup');
        let validationOfBreadCrumb = await CommonFunctions.compareTwoValues(isvalidationOfBreadCrumb, true, 'Breadcrumb Displayed: ' + TestData.NEW_TAB.HIDDEN_VIEW_1 + ' -> ' + TestData.NEW_TAB.NORMAL_VIEW_2);
        let validationOfEllipses = await CommonFunctions.compareTwoValues(isvalidationOfEllipses, true, 'Ellipses is displayed in Context Override Popup');
        expect(ContextIdVal && ContextIdLength && validateContextOverridePopup && validationOfBreadCrumb && validationOfEllipses).toBeTruthy();
    });

    it('Case 7: Validate the breadcrumb navigation link to Hidden View and Back Arrow Icon to Normal View', async () => {
        await CommonFunctions.logMessage('INFO', 'Clicking on Breadcrumb link and Back Arrow Icon');
        await PlanningSpace.clickOnBreadCrumbLink(TestData.NEW_TAB.HIDDEN_VIEW_1);
        await PlanningSpace.closeContextOverridePopup();
        await PlanningSpace.clickOnBackArrowOfHiddenView();
    });

});
