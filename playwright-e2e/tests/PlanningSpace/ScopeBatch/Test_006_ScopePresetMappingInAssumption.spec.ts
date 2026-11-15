import { test, expect } from '../../../configs/fixtures';
import { TestUtil } from '../../../util/test.util';
import { PlanningPage } from '../../../pageobjects/planning.page';
import { PlanningListingPage } from '../../../pageobjects/planning-listing.page';
import { ScopePage } from '../../../pageobjects/scope.page';

test.describe.serial('Dashboard - Filter scope Preset Mapping should work in assumption', () => {
  test('Test Case 1: Verify scope applied for assumption is reflected as preselected in PS', async ({ testUtil, planningListingPage, planningPage, scopePage, commonFunctions, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.PSLINK as string);
    await planningListingPage.launchContext('Assumption', testData.PROCESS_NAME, '', testData.ASSUMPTION_NAME);
    await planningPage.openComponent('Scope');

    const isAnyFilterConfigured = await scopePage.isFilterConfigured();
    const bValidation1: boolean = await commonFunctions.compareTwoValues((await planningPage.getScopeNameFromPowerBar()).replace(/[\s\u00A0]+/g, ''), 'Preselected', 'Filter Name Assertion in powerbar');

    if (isAnyFilterConfigured) {
      const bValidation2: boolean = await commonFunctions.compareTwoValues(
        await scopePage.verifyAppliedFilterInScope(testData.PRESELECTED_SCOPE_FOR_ASSUMPTION.ATTRIBUTE_NAME, testData.PRESELECTED_SCOPE_FOR_ASSUMPTION.VALUE),
        true,
        `Is ${testData.PRESELECTED_SCOPE_FOR_ASSUMPTION.DIMENSION_NAME} filter applied`
      );
      expect(bValidation1 && bValidation2).toBeTruthy();
      return;
    }

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 2: Does preselected scope from assumption override with new scope in Planning', async ({ planningPage, scopePage, commonFunctions, testData }) => {
    await commonFunctions.logMessage('INFO', 'Looking for three dots under scope tab');
    await scopePage.click3Dot();
    await scopePage.select3DotOption('Edit Configuration');
    await scopePage.selectFilterEntryFromDialogConfig('UnSelect', testData.PRESELECTED_SCOPE_FOR_ASSUMPTION.DIMENSION_NAME);
    await scopePage.selectFilterEntryFromDialogConfig('Select', testData.SCOPE_TO_APPLY_IN_PLANNING_FOR_ASSUMPTION.DIMENSION_NAME);
    await scopePage.filterDialogSaveCancel('Next');
    await scopePage.selectDimensionHierarchyLevel(testData.SCOPE_TO_APPLY_IN_PLANNING_FOR_ASSUMPTION.DIMENSION_NAME, [testData.SCOPE_TO_APPLY_IN_PLANNING_FOR_ASSUMPTION.ATTRIBUTE_NAME], 'check');
    await scopePage.filterDialogSaveCancel('Save');
    await scopePage.addFiltersToDimensionHierarchyInScope(testData.SCOPE_TO_APPLY_IN_PLANNING_FOR_ASSUMPTION.DIMENSION_NAME, testData.SCOPE_TO_APPLY_IN_PLANNING_FOR_ASSUMPTION.ATTRIBUTE_NAME, [testData.SCOPE_TO_APPLY_IN_PLANNING_FOR_ASSUMPTION.VALUE]);
    await scopePage.clickOnApplyFiltersBtn();
    await planningPage.openComponent('Scope');

    const bValidation1: boolean = await commonFunctions.compareTwoValues((await planningPage.getScopeNameFromPowerBar()).replace(/[\s\u00A0]+/g, ''), 'Preselected', 'Filter Name Assertion in powerbar');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(
      await scopePage.verifyAppliedFilterInScope(testData.SCOPE_TO_APPLY_IN_PLANNING_FOR_ASSUMPTION.ATTRIBUTE_NAME, testData.SCOPE_TO_APPLY_IN_PLANNING_FOR_ASSUMPTION.VALUE),
      true,
      `Is ${testData.SCOPE_TO_APPLY_IN_PLANNING_FOR_ASSUMPTION.DIMENSION_NAME} filter applied`
    );

    expect(bValidation1 && bValidation2).toBeTruthy();
    await planningPage.closeDrawer();
  });

  test('Test Case 3: Should reset to preselected scope of assumption after revisit', async ({ testUtil, commonFunctions, testData, browser }) => {
    await testUtil.page.context().close();
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();

    const reopenedTestUtil = new TestUtil(newPage);
    const reopenedPlanningPage = new PlanningPage(newPage);
    const reopenedPlanningListingPage = new PlanningListingPage(newPage);
    const reopenedScopePage = new ScopePage(newPage);

    await reopenedTestUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.PSLINK as string);
    await reopenedTestUtil.navigateToPlanningListingPage();
    await reopenedPlanningListingPage.launchContext('Assumption', testData.PROCESS_NAME, '', testData.ASSUMPTION_NAME);
    await reopenedPlanningPage.openComponent('Scope');

    const isAnyFilterConfigured = await reopenedScopePage.isFilterConfigured();
    const bValidation1: boolean = await commonFunctions.compareTwoValues((await reopenedPlanningPage.getScopeNameFromPowerBar()).replace(/[\s\u00A0]+/g, ''), 'Preselected', 'Filter Name Assertion in powerbar');

    if (isAnyFilterConfigured) {
      const bValidation2: boolean = await commonFunctions.compareTwoValues(
        await reopenedScopePage.verifyAppliedFilterInScope(testData.PRESELECTED_SCOPE_FOR_ASSUMPTION.ATTRIBUTE_NAME, testData.PRESELECTED_SCOPE_FOR_ASSUMPTION.VALUE),
        true,
        `Is ${testData.PRESELECTED_SCOPE_FOR_ASSUMPTION.DIMENSION_NAME} filter applied`
      );
      await reopenedScopePage.clickOnApplyFiltersBtn();
      expect(bValidation1 && bValidation2).toBeTruthy();
      await newContext.close();
      return;
    }

    expect(bValidation1).toBeTruthy();
    await newContext.close();
  });
});
