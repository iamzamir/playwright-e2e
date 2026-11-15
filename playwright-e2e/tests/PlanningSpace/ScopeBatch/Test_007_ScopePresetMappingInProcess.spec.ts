import { test, expect } from '../../../configs/fixtures';

let skipAllTests = false;
test.describe.serial('Dashboard - Filter scope Preset Mapping should work in process', () => {
  let isAnyFilterApplied = false;
  let isRequiredFilterApplied = false;

  test('Test Case 1: Verify Scope defined or not in Planning Space', async ({ testUtil, planningPage, scopePage, commonFunctions, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);

    await planningPage.clickViewDropdown();
    await planningPage.selectView(testData.VIEW_NAME);
    await planningPage.openComponent('Scope');
    isAnyFilterApplied = await scopePage.isFilterConfigured();
    const bValidation = await commonFunctions.compareTwoValues(isAnyFilterApplied, true, 'Verify if any filter is defined in the process');
    expect(bValidation).toBe(true);
  });

  test('Test Case 2: Verify if required Filter is applied or not', async ({ testUtil, planningPage, scopePage, commonFunctions, testData, page }) => {
    if (!isAnyFilterApplied) {
      await commonFunctions.logMessage('INFO', 'No filters are defined in the process.');
      test.skip();
    }

    const scopeInPowerbar = await planningPage.getScopeNameFromPowerBar();
    const scopeInVFTitle = await scopePage.getAppliedVFTitle();

    // Clean and normalize filter names for comparison (case-insensitive and trimmed)
    const cleanPowerbarName = scopeInPowerbar.replace(/\*/g, '').toLowerCase().trim();
    const cleanVFTitleName = scopeInVFTitle.replace(/\*/g, '').toLowerCase().trim();
    const expectedFilterName = testData.FILTER_NAME.toLowerCase().trim();

    // Probes: a mismatch only means the filter still has to be applied, and Test Case 3 asserts the result.
    const isPowerbarScopeRequired = await commonFunctions.valuesMatch(cleanPowerbarName, expectedFilterName, 'Is the required filter in Powerbar');
    const isVFTitleScopeRequired = await commonFunctions.valuesMatch(cleanVFTitleName, expectedFilterName, 'Is the required filter in VF Title');
    isRequiredFilterApplied = isPowerbarScopeRequired && isVFTitleScopeRequired;

    if (isRequiredFilterApplied) {
      await commonFunctions.logMessage('INFO', `Required filter: ${testData.FILTER_NAME} is already applied.`);
      skipAllTests = true;
    } else {
      await commonFunctions.logMessage('INFO', `Required filter: ${testData.FILTER_NAME} is NOT applied. Applying the filter...`);
      await scopePage.searchFilter(testData.FILTER_NAME);
      await scopePage.clickOnApplyFiltersBtn();
      await page.waitForTimeout(5000);
    }
  });
});

test.describe.serial('Verify global scope persists', () => {
  test('Test Case 3: Verify applied filters are available after revisit to process', async ({ testUtil, planningPage, scopePage, commonFunctions, testData, page }) => {
    if (skipAllTests) {
      await commonFunctions.logMessage('INFO', 'Skipping applying filter as required filter is already applied.');
      test.skip();
    }

    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);

    await planningPage.clickViewDropdown();
    await planningPage.selectView(testData.VIEW_NAME);
    await planningPage.openComponent('Scope');
    const scopeInPowerbar = await planningPage.getScopeNameFromPowerBar();
    const scopeInVFTitle = await scopePage.getAppliedVFTitle();

    // Clean and normalize filter names for comparison (case-insensitive and trimmed)
    const cleanPowerbarName = scopeInPowerbar.replace(/\*/g, '').toLowerCase().trim();
    const cleanVFTitleName = scopeInVFTitle.replace(/\*/g, '').toLowerCase().trim();
    const expectedFilterName = testData.FILTER_NAME.toLowerCase().trim();

    const bValidation1 = await commonFunctions.compareTwoValues(cleanPowerbarName, expectedFilterName, 'Verify scope in Powerbar');
    const bValidation2 = await commonFunctions.compareTwoValues(cleanVFTitleName, expectedFilterName, 'Verify scope in VF Title');
    expect(bValidation1 && bValidation2).toBeTruthy();
  });
});
