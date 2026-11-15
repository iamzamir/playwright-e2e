import { test, expect } from '../../../configs/fixtures';

test.describe.serial(`Verify Default Scope filter - Process`, () => {

  let initialFilterName: string;

  test.beforeAll(async ({ planningPage, testData, testUtil, scopePage, page }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);
    await planningPage.openComponent('Scope');
    await page.waitForTimeout(5000);
    const appliedVFTitle = (await scopePage.getAppliedVFTitle()).replace(/\*/g, '').trim();
    if (appliedVFTitle.toLowerCase() === (testData.GLOBAL_SCOPE_FILTER_NAME as string).toLowerCase()) {
      await scopePage.closeVFDrawer();
      await planningPage.setDefaultScopeFilter(testData.RESET_DEFAULT_FILTER);
      await planningPage.verifyAlertMsg('Preset is saved for the view', 15000);
      await page.waitForTimeout(5000);
    } else {
      await scopePage.closeVFDrawer();
    }
  });

  test(`Test Case 1: Fetch Existing Scope Filter`, async ({ planningPage, scopePage, page }) => {
    await planningPage.openComponent('Scope');
    await page.waitForTimeout(5000);
    initialFilterName = await scopePage.getAppliedVFTitle();
    expect(initialFilterName).toBeTruthy();
  });

  test(`Test Case 2: Set Default Scope Filter`, async ({ planningPage, testData, scopePage }) => {
    await scopePage.closeVFDrawer();
    await planningPage.setDefaultScopeFilter(testData.GLOBAL_SCOPE_FILTER_NAME);
    const isPresetSaved = await planningPage.verifyAlertMsg('Preset is saved for the view', 5000);
    expect(isPresetSaved).toBe(true);
  });

  test(`Test Case 3: Is Default Scope Filter reflected in GlobalScopeView of "PSAutomation"`, async ({ planningPage, scopePage, commonFunctions, testData }) => {
    const filterName = testData.GLOBAL_SCOPE_FILTER_NAME;
    const processName = testData.PROCESS_NAME;
    await planningPage.openComponent('Scope');
    const appliedVFTitle = await scopePage.waitForAppliedVFTitle(filterName, 30000);
    const bValidation = await commonFunctions.compareTwoValues(appliedVFTitle === filterName, true, `Is ${filterName} filter applied for ${processName}`);
    // The members saved in the global scope filter are realm data (GLOBAL_SCOPE_FILTER_VALUES).
    let sectionValidation = true;
    for (const { HIERARCHY, VALUE } of testData.GLOBAL_SCOPE_FILTER_VALUES as { HIERARCHY: string; VALUE: string }[]) {
      sectionValidation = (await scopePage.checkFilterExists(HIERARCHY, VALUE)) && sectionValidation;
    }
    expect(bValidation && sectionValidation).toBe(true);
  });

  test(`Test Case 4: Remove Default Scope Filter`, async ({ planningPage, scopePage, testData }) => {
    await scopePage.closeVFDrawer();
    await planningPage.setDefaultScopeFilter(testData.RESET_DEFAULT_FILTER);
    const isPresetSaved = await planningPage.verifyAlertMsg('Preset is saved for the view', 5000);
    expect(isPresetSaved).toBe(true);
  });

  test(`Test Case 5: Verify old filter should appear in VF`, async ({ planningPage, scopePage, commonFunctions, testData, page }) => {
    await page.waitForTimeout(5000);
    await planningPage.openComponent('Scope');
    await scopePage.waitForAppliedVFTitle(initialFilterName, 30000);
    const appliedVFTitle = await scopePage.getAppliedVFTitle();
    const bValidation = await commonFunctions.compareTwoValues(appliedVFTitle === initialFilterName, true, `Is ${initialFilterName} filter applied for ${testData.PROCESS_NAME}`);
    expect(bValidation).toBe(true);
  });

});
