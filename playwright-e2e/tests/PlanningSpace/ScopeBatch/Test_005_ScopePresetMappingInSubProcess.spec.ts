import { test, expect } from '../../../configs/fixtures';
import { TestUtil } from '../../../util/test.util';
import { PlanningPage } from '../../../pageobjects/planning.page';
import { PlanningListingPage } from '../../../pageobjects/planning-listing.page';
import { ScopePage, scopeValuesByHierarchy, type IScopeDimensionFilter } from '../../../pageobjects/scope.page';

test.describe.serial('Dashboard - Filter scope Preset Mapping should work in sub process', () => {
  test('Test Case 1: Verify Scope tab in Planning Space and filter verification', async ({ testUtil, planningPage, planningListingPage, commonFunctions, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.PSLINK as string);
    await planningListingPage.launchContext('Subprocess', testData.PROCESS_NAME, testData.SUB_PROCESS_NAME);
    const eleExist = await planningPage.openComponent('Scope');
    const bValidation = await commonFunctions.compareTwoValues(eleExist, true, 'Scope Tab is enabled');
    expect(bValidation).toBe(true);
  });

  test('Test Case 2: Config Filter', async ({ scopePage, commonFunctions, testData }) => {
    await commonFunctions.logMessage('INFO', 'Looking for three dots under scope tab');
    await scopePage.configureScopeDimensions(testData.SCOPE_LEVELS as IScopeDimensionFilter[]);
  });

  test('Test Case 3: Selecting Filter', async ({ scopePage, testData }) => {
    const levels = testData.SCOPE_LEVELS as IScopeDimensionFilter[];
    await scopePage.addScopeFilterValues(levels);
    const bValidation = await scopePage.validateScopeFilterValues(scopeValuesByHierarchy(levels), 'before apply');
    await scopePage.clickOnApplyFiltersBtn();
    expect(bValidation).toBeTruthy();
  });

  test('Test Case 4: Verifying applied filters are available after revisit to sub process', async ({ testUtil, testData, browser }) => {
    await testUtil.page.context().close();
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();

    const reopenedTestUtil = new TestUtil(newPage);
    const reopenedPlanningPage = new PlanningPage(newPage);
    const reopenedPlanningListingPage = new PlanningListingPage(newPage);
    const reopenedScopePage = new ScopePage(newPage);

    await reopenedTestUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.PSLINK as string);
    await reopenedTestUtil.navigateToPlanningListingPage();
    await reopenedPlanningListingPage.launchContext('Subprocess', testData.PROCESS_NAME, testData.SUB_PROCESS_NAME);
    await reopenedPlanningPage.openComponent('Scope');
    const bValidation = await reopenedScopePage.validateScopeFilterValues(scopeValuesByHierarchy(testData.SCOPE_LEVELS as IScopeDimensionFilter[]), 'after revisit');
    await reopenedScopePage.clickOnApplyFiltersBtn();
    expect(bValidation).toBeTruthy();
    await newContext.close();
  });
});
