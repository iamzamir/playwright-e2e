import TestUtil from "../../../util/test.util";
import GlobalSettings from "../../../pageobjects/global-settings.page";
import CommonFunctions from "../../../util/common.util";
import PlanningSpace from "../../../pageobjects/planning.page";
import ScopePage from "../../../pageobjects/scope.page";
import scopePage from "../../../pageobjects/scope.page";
import planningPage from "../../../pageobjects/planning.page";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/WorkFlowFilter/Test_001_WorkFlowFilter.json");

describe(`Workflow filter tests`, async () => {

      before(async () => {
            await TestUtil.launchAppFromCatalog(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string);
            await browser.pause(5000);
      });

      it(`Test Case 1: Should configure workflow filter for view which has default scope for ${TestData.DEFAULT_SCOPE.VIEW_NAME} view`, async () => {
            await GlobalSettings.selectProcessDropdown(TestData.PROCESS_NAME);
            const bValidation: boolean = await GlobalSettings.configureWorkflowFilter(TestData.PROCESS_NAME, TestData.DEFAULT_SCOPE.VIEW_NAME, TestData.DEFAULT_SCOPE.SCOPE_TO_DEFINE, "Define filter", true);
            await CommonFunctions.compareTwoValues(bValidation, true, `Is workflow filter configured for ${TestData.DEFAULT_SCOPE.VIEW_NAME} view`);
            expect(bValidation).toBeTruthy();
      });

      it(`Test Case 2: Should configure workflow filter for view which has no default scope for ${TestData.NON_DEFAULT_SCOPE.VIEW_NAME} view`, async () => {
            const bValidation: boolean = await GlobalSettings.configureWorkflowFilter(TestData.PROCESS_NAME, TestData.NON_DEFAULT_SCOPE.VIEW_NAME, TestData.NON_DEFAULT_SCOPE.SCOPE_TO_DEFINE, "Define filter", true);
            await CommonFunctions.compareTwoValues(bValidation, true, `Is workflow filter configured for ${TestData.NON_DEFAULT_SCOPE.VIEW_NAME} view`);
            expect(bValidation).toBeTruthy();
      });

      it(`Test Case 3: Should show default scope in scope tab and workflow filter in context override popup for ${TestData.DEFAULT_SCOPE.VIEW_NAME} view `, async () => {
           await browser.pause(5000);
            await PlanningSpace.launchPSFromDockSearchWithContext(TestData.PS, "Process", TestData.PROCESS_NAME);
            await PlanningSpace.clickViewsDropDown();
            await PlanningSpace.selectAllViewsOrFavourites("All Views");
            await PlanningSpace.clickDashBoard(TestData.DEFAULT_SCOPE.VIEW_NAME);
            await ScopePage.clickOnTab('Scope');
            await browser.pause(5000);
            const bValidation1: boolean = await CommonFunctions.compareTwoValues((await PlanningSpace.getScopeNameFromPowerBar()).replace(/\*/g, ''), (TestData.DEFAULT_SCOPE.FILTER_NAME as string).replace(/\*/g, ''), "Filter Name Assertion in powerbar")
            const bValidation2: boolean = await CommonFunctions.compareTwoValues((await ScopePage.getFilterName()).replace(/\*/g, '').toLowerCase(), (TestData.DEFAULT_SCOPE.FILTER_NAME as string).replace(/\*/g, '').toLowerCase(), "Filter Name Assertion in VF");
            await browser.pause(5000);
            const bValidation3: boolean = await CommonFunctions.compareTwoValues(await ScopePage.verifyAppliedFilterInScope(TestData.DEFAULT_SCOPE.DEFAULT_SCOPE_FILTER.ATTRIBUTE_NAME, TestData.DEFAULT_SCOPE.DEFAULT_SCOPE_FILTER.VALUES[0]), true, `Is ${TestData.DEFAULT_SCOPE.DEFAULT_SCOPE_FILTER.DIMENSION_NAME} filter applied`);
            await ScopePage.closeDrawer();
            const bValidation4: boolean = await CommonFunctions.compareTwoValues(await ScopePage.doesActionExist('Set Default Scope Filter'), true, `Set Default Scope Filter action shouldn't display`);
            const bValidation5: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isContextOverrideDisplays(false), true, "Context Override button Displays Assertion");
            const bValidation6: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isFilterDetailsDisplays(), true, "Filter Details button Displays Assertion");
            const bValidation7: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.showFilterDetails(true, TestData.DEFAULT_SCOPE.SCOPE_TO_DEFINE), true, "Backend workflow filters Displays Assertion");
            const bValidation8: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.closeWorkflowFilterDetails(), true, "Backend workflow filters Details closed Assertion");
            const bValidation9: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.checkMergeScopeLogic(TestData.DEFAULT_SCOPE.DEFAULT_SCOPE_FILTER,TestData.DEFAULT_SCOPE.SCOPE_TO_DEFINE), true, "always AND BE merge logic Assertion");
   
            expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation9).toBeTruthy();
      });

      it(`Test Case 4: Should show empty scope in scope tab and workflow filter in context override popup for ${TestData.NON_DEFAULT_SCOPE.VIEW_NAME} view `, async () => {
            // await ScopePage.clickOnTab('Views');
            await PlanningSpace.clickViewsDropDown();
            await PlanningSpace.clickDashBoard(TestData.NON_DEFAULT_SCOPE.VIEW_NAME);
            // await ScopePage.clickOnTab('Scope');
            await browser.pause(5000);
            // await browser.pause(2000);
            const bValidation4: boolean = await CommonFunctions.compareTwoValues(await ScopePage.doesActionExist('Set Default Scope Filter'), true, `Set Default Scope Filter action should display`);
            const bValidation5: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isContextOverrideDisplays(false), true, "Context Override button Displays Assertion");
            const bValidation6: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isFilterDetailsDisplays(), true, "Filter Details button Displays Assertion");
            const bValidation7: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.showFilterDetails(true, TestData.NON_DEFAULT_SCOPE.SCOPE_TO_DEFINE), true, "Backend workflow filters Displays Assertion");
            const bValidation8: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.closeWorkflowFilterDetails(), true, "Backend workflow filters Details closed Assertion");
            const bValidation9: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.checkMergeScopeLogic({},TestData.NON_DEFAULT_SCOPE.SCOPE_TO_DEFINE), true, "always AND BE merge logic Assertion");
   
            expect(bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation9).toBeTruthy();
      });

      it(`Test Case 5: Should edit workflow filter reflecting for ${TestData.DEFAULT_SCOPE.VIEW_NAME} view`, async () => {
            await planningPage.clickRefreshBtn();
            await PlanningSpace.launchPOFromDockSearch(TestData.PO);
            await GlobalSettings.selectProcessDropdown(TestData.PROCESS_NAME);
            const bValidation: boolean = await GlobalSettings.configureWorkflowFilter(TestData.PROCESS_NAME, TestData.DEFAULT_SCOPE.VIEW_NAME, TestData.DEFAULT_SCOPE.SCOPE_TO_EDIT, "Edit filter", true);
            await CommonFunctions.compareTwoValues(bValidation, true, `Is workflow filter edited for ${TestData.DEFAULT_SCOPE.VIEW_NAME} view`);
            expect(bValidation).toBeTruthy();
      });
      it(`Test Case 6: Should edit workflow filter reflecting for ${TestData.NON_DEFAULT_SCOPE.VIEW_NAME} view`, async () => {
            const bValidation: boolean = await GlobalSettings.configureWorkflowFilter(TestData.PROCESS_NAME, TestData.NON_DEFAULT_SCOPE.VIEW_NAME, TestData.NON_DEFAULT_SCOPE.SCOPE_TO_EDIT, "Edit filter", true);
            await CommonFunctions.compareTwoValues(bValidation, true, `Is workflow filter edited for ${TestData.NON_DEFAULT_SCOPE.VIEW_NAME} view`);
            expect(bValidation).toBeTruthy();
      });

      it(`Test Case 7: Does edited workflow filter reflected for ${TestData.DEFAULT_SCOPE.VIEW_NAME} view `, async () => {
            await PlanningSpace.launchPSFromDockSearchWithContext(TestData.PS, "Process", TestData.PROCESS_NAME);
            await PlanningSpace.clickViewsDropDown();
            await PlanningSpace.clickDashBoard(TestData.DEFAULT_SCOPE.VIEW_NAME);
            await ScopePage.clickOnTab('Scope');
            await browser.pause(15000);
            const bValidation1: boolean = await CommonFunctions.compareTwoValues((await PlanningSpace.getScopeNameFromPowerBar()).replace(/\*/g, ''), (TestData.DEFAULT_SCOPE.FILTER_NAME as string).replace(/\*/g, ''), "Filter Name Assertion in powerbar")
            const bValidation2: boolean = await CommonFunctions.compareTwoValues((await ScopePage.getFilterName()).replace(/\*/g, '').toLowerCase(), (TestData.DEFAULT_SCOPE.FILTER_NAME as string).replace(/\*/g, '').toLowerCase(), "Filter Name Assertion in VF");
            await browser.pause(2000);
            const bValidation3: boolean = await CommonFunctions.compareTwoValues(await ScopePage.verifyAppliedFilterInScope(TestData.DEFAULT_SCOPE.DEFAULT_SCOPE_FILTER.ATTRIBUTE_NAME, TestData.DEFAULT_SCOPE.DEFAULT_SCOPE_FILTER.VALUES[0]), true, `Is ${TestData.DEFAULT_SCOPE.DEFAULT_SCOPE_FILTER.DIMENSION_NAME} filter applied`);
            await browser.pause(1000);
            await ScopePage.closeDrawer();
            const bValidation4: boolean = await CommonFunctions.compareTwoValues(await ScopePage.doesActionExist('Set Default Scope Filter'), true, `Set Default Scope Filter action should be displayed`);
            const bValidation5: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isContextOverrideDisplays(false), true, "Context Override button Displays Assertion");
            const bValidation6: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isFilterDetailsDisplays(), true, "Filter Details button Displays Assertion");
            const bValidation7: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.showFilterDetails(true, TestData.DEFAULT_SCOPE.SCOPE_TO_EDIT), true, "Backend workflow filters Displays Assertion edit");
            const bValidation8: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.closeWorkflowFilterDetails(), true, "Backend workflow filters Details closed Assertion");
            const bValidation9: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.checkMergeScopeLogic(TestData.DEFAULT_SCOPE.DEFAULT_SCOPE_FILTER,TestData.DEFAULT_SCOPE.SCOPE_TO_EDIT), true, "always AND BE merge logic Assertion");
            expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation9).toBeTruthy();
      });

      it(`Test Case 8: user changed the scope for ${TestData.DEFAULT_SCOPE.VIEW_NAME} view `, async () => {
            await ScopePage.clickOnTab('Scope');
            await browser.pause(15000);
            const bValidation1: boolean = await CommonFunctions.compareTwoValues((await PlanningSpace.getScopeNameFromPowerBar()).replace(/\*/g, ''), (TestData.DEFAULT_SCOPE.FILTER_NAME as string).replace(/\*/g, ''), "Filter Name Assertion in powerbar")
            const bValidation2: boolean = await CommonFunctions.compareTwoValues((await ScopePage.getFilterName()).replace(/\*/g, '').toLowerCase(), (TestData.DEFAULT_SCOPE.FILTER_NAME as string).replace(/\*/g, '').toLowerCase(), "Filter Name Assertion in VF");
            await browser.pause(2000);
            const bValidation3: boolean = await CommonFunctions.compareTwoValues(await ScopePage.verifyAppliedFilterInScope(TestData.DEFAULT_SCOPE.DEFAULT_SCOPE_FILTER.ATTRIBUTE_NAME, TestData.DEFAULT_SCOPE.DEFAULT_SCOPE_FILTER.VALUES[0]), true, `Is ${TestData.DEFAULT_SCOPE.DEFAULT_SCOPE_FILTER.DIMENSION_NAME} filter applied`);
            await browser.pause(1000);
            const filterConfigs = [ { type: TestData.DEFAULT_SCOPE.SCOPE_CHANGE.DIMENSION_NAME, category: TestData.DEFAULT_SCOPE.SCOPE_CHANGE.ATTRIBUTE_NAME, value: TestData.DEFAULT_SCOPE.SCOPE_CHANGE.VALUES } ];

            const bValidation: boolean = await PlanningSpace.configureFilters(filterConfigs);
            await CommonFunctions.compareTwoValues(bValidation, true, `Is workflow filter edited for ${TestData.DEFAULT_SCOPE.VIEW_NAME} view`);
            expect(bValidation).toBeTruthy();
            const bValidation4: boolean = await CommonFunctions.compareTwoValues(await ScopePage.doesActionExist('Set Default Scope Filter'), true, `Set Default Scope Filter action should be displayed`);
            const bValidation5: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isContextOverrideDisplays(false), true, "Context Override button Displays Assertion");
            const bValidation6: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isFilterDetailsDisplays(), true, "Filter Details button Displays Assertion");
            const bValidation7: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.showFilterDetails(true, TestData.DEFAULT_SCOPE.SCOPE_TO_EDIT), true, "Backend workflow filters Displays Assertion edit");
            const bValidation8: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.closeWorkflowFilterDetails(), true, "Backend workflow filters Details closed Assertion");
            const bValidation9: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.checkMergeScopeLogic(TestData.DEFAULT_SCOPE.SCOPE_CHANGE, TestData.DEFAULT_SCOPE.SCOPE_TO_EDIT), true, "always AND BE merge logic Assertion");
            await ScopePage.clickRevertVFChanges();
            expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation9).toBeTruthy();
      });

      it(`Test Case 9: Does edited workflow filter reflected for ${TestData.NON_DEFAULT_SCOPE.VIEW_NAME} view `, async () => {
            // await ScopePage.clickOnTab('Views');
            await PlanningSpace.clickViewsDropDown();
            await PlanningSpace.clickDashBoard(TestData.NON_DEFAULT_SCOPE.VIEW_NAME);
            // await ScopePage.clickOnTab('Scope');
            await browser.pause(5000);
            const bValidation4: boolean = await CommonFunctions.compareTwoValues(await ScopePage.doesActionExist('Set Default Scope Filter'), true, `Set Default Scope Filter action shouldn't display`);
            const bValidation5: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isContextOverrideDisplays(false), true, "Context Override button Displays Assertion");
            const bValidation6: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isFilterDetailsDisplays(), true, "Filter Details button Displays Assertion");
            const bValidation7: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.showFilterDetails(true, TestData.NON_DEFAULT_SCOPE.SCOPE_TO_EDIT), true, "Backend workflow filters Displays Assertion");
            const bValidation8: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.closeWorkflowFilterDetails(), true, "Backend workflow filters Details closed Assertion");
            const bValidation9: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.checkMergeScopeLogic(TestData.NON_DEFAULT_SCOPE.GLOBAL_FILTER,TestData.NON_DEFAULT_SCOPE.SCOPE_TO_EDIT), true, "always AND BE merge logic Assertion");
   
            expect(bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation9).toBeTruthy();
      });

      it(`Test Case 10: Should delete workflow filter for ${TestData.DEFAULT_SCOPE.VIEW_NAME} view`, async () => {
            await planningPage.clickRefreshBtn();
            await PlanningSpace.launchPOFromDockSearch(TestData.PO);
            await GlobalSettings.selectProcessDropdown(TestData.PROCESS_NAME);
            const bValidation: boolean = await GlobalSettings.configureWorkflowFilter(TestData.PROCESS_NAME, TestData.DEFAULT_SCOPE.VIEW_NAME, null, "Delete filter");
            await CommonFunctions.compareTwoValues(bValidation, true, `Is workflow filter edited for ${TestData.DEFAULT_SCOPE.VIEW_NAME} view`);
            expect(bValidation).toBeTruthy();
      });
      it(`Test Case 11: Should delete workflow filter for ${TestData.NON_DEFAULT_SCOPE.VIEW_NAME} view`, async () => {
            const bValidation: boolean = await GlobalSettings.configureWorkflowFilter(TestData.PROCESS_NAME, TestData.NON_DEFAULT_SCOPE.VIEW_NAME, null, "Delete filter");
            await CommonFunctions.compareTwoValues(bValidation, true, `Is workflow filter edited for ${TestData.NON_DEFAULT_SCOPE.VIEW_NAME} view`);
            expect(bValidation).toBeTruthy();
      });
      
      it(`Test Case 12: Does scope reset to initial after workflow filter deleted for ${TestData.DEFAULT_SCOPE.VIEW_NAME} view `, async () => {
            await PlanningSpace.launchPSFromDockSearchWithContext(TestData.PS, "Process", TestData.PROCESS_NAME);
            await PlanningSpace.clickViewsDropDown();
            await PlanningSpace.clickDashBoard(TestData.DEFAULT_SCOPE.VIEW_NAME);
            await ScopePage.clickOnTab('Scope');
            await browser.pause(5000);
            const bValidation1: boolean = await CommonFunctions.compareTwoValues((await PlanningSpace.getScopeNameFromPowerBar()).replace(/\*/g, ''), (TestData.DEFAULT_SCOPE.FILTER_NAME as string).replace(/\*/g, ''), "Filter Name Assertion in powerbar");
            const bValidation2: boolean = await CommonFunctions.compareTwoValues((await ScopePage.getFilterName()).replace(/\*/g, '').toLowerCase(), (TestData.DEFAULT_SCOPE.FILTER_NAME as string).replace(/\*/g, '').toLowerCase(), "Filter Name Assertion in VF");
            const bValidation4: boolean = await CommonFunctions.compareTwoValues(await ScopePage.doesActionExist('Set Default Scope Filter'), true, `Set Default Scope Filter action should display`);
            await scopePage.closeDrawer();
            const bValidation3: boolean = await CommonFunctions.compareTwoValues(!await PlanningSpace.isContextOverrideDisplays(false), true, "Context Override button should not display Assertion");
            expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
      });

      it(`Test Case 13: Does scope reset to initial after workflow filter deleted for ${TestData.NON_DEFAULT_SCOPE.VIEW_NAME} view `, async () => {
            // await ScopePage.clickOnTab('Views');
            await PlanningSpace.clickViewsDropDown();
            await PlanningSpace.clickDashBoard(TestData.NON_DEFAULT_SCOPE.VIEW_NAME);
            // await ScopePage.clickOnTab('Scope');
            await browser.pause(5000);
            const bValidation4: boolean = await CommonFunctions.compareTwoValues(await ScopePage.doesActionExist('Set Default Scope Filter'), true, `Set Default Scope Filter action should display`);
            const bValidation5: boolean = await CommonFunctions.compareTwoValues(!await PlanningSpace.isContextOverrideDisplays(false), true, "Context Override button should not display Assertion");
            expect(bValidation4 && bValidation5).toBeTruthy();
      });

})