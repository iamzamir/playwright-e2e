import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';
import type { IScopeDimensionFilter } from '../../../pageobjects/scope.page';
import { deleteSavedFiltersByLabel, listSavedFilterIds, listSavedFilters, SCOPE_FILTER_INSTANCE, waitForVerticalFilterAccess, type IVerticalFilterAccess } from '../../../util/vertical-filter.util';

test.describe.serial('Draft Filter for Process', () => {
  // The user's vertical-filter BFF access, captured from the app's own request, for the API checks and cleanup.
  let filterAccess: IVerticalFilterAccess | undefined;
  // Filters the user already had, so cleanup never deletes another run's filter with the same generated name.
  let preexistingFilterIds = new Set<string>();
  let newFilter: string = '';
  let filterValues: string[] = [];
  const newFilterName = uniqueName('New Filter');

  test('Test Case 1: New filter should be created for global scope', async ({ testUtil, planningPage, scopePage, commonFunctions, testData, createdEntities }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.clickViewDropdown();
    await planningPage.selectView(testData.VIEW_NAME);
    // A failed capture fails here, before any filter is created, so the delete check and cleanup never go without it.
    [filterAccess] = await Promise.all([
      waitForVerticalFilterAccess(planningPage.page.context(), SCOPE_FILTER_INSTANCE),
      planningPage.openComponent('Scope'),
    ]);
    preexistingFilterIds = await listSavedFilterIds(filterAccess);
    // The level and members are realm data (DRAFT_SCOPE_LEVEL, its GRAVITEE block on Gravitee).
    const level = testData.DRAFT_SCOPE_LEVEL as IScopeDimensionFilter;
    await scopePage.configureScopeDimensions([level]);
    await scopePage.addScopeFilterValues([level]);
    await scopePage.createaNewVFScopeToValidate(newFilterName, 'Save Filter');
    let savedFilterId: string | undefined;
    await expect.poll(async () => {
      const filters = await listSavedFilters(filterAccess!);
      savedFilterId = filters.find((f) => f.label === newFilterName && !preexistingFilterIds.has(f.id))?.id;
      return savedFilterId;
    }, { timeout: getTimeout('MEDIUM'), message: `Find saved filter id for ${newFilterName}` }).toBeTruthy();
    if (savedFilterId) {
      createdEntities.register('scopeFilter', newFilterName, {
        id: savedFilterId,
        authorization: filterAccess!.authorization,
        context: { baseUrl: filterAccess!.baseUrl, instance: filterAccess!.instance },
      });
    }
    await scopePage.clickOnApplyFiltersBtn();
    await planningPage.openComponent('Scope');
    newFilter = await scopePage.waitForAppliedVFTitle(newFilterName, 30000);

    await commonFunctions.logMessage('INFO', `New Filter Name: ${newFilter}`);
    const boolean1 = newFilter.includes(newFilterName);
    await commonFunctions.compareTwoValues(boolean1, true, `Draft filter titled "${newFilterName}" applied for global scope`);
    const filterNameStripped = newFilter.replace(/\*/g, '').trim();
    const boolean2 = await planningPage.verifyScopeInBudgeAndVF(filterNameStripped);
    await commonFunctions.compareTwoValues(boolean2, true, 'Scope name in powerbar budge matches VF title');
    await planningPage.closeDrawer();
    expect(boolean1 && boolean2).toBeTruthy();
  });

  test('Test Case 2: Check newly created scope is applied globally for other views', async ({ planningPage, scopePage, commonFunctions, testData }) => {
    await planningPage.clickViewDropdown();
    await planningPage.selectView(testData.VIEW_NAME_2);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME_2);
    await planningPage.openComponent('Scope');
    const appliedFilter = await scopePage.waitForAppliedVFTitle(newFilter, 30000);
    await commonFunctions.logMessage('INFO', `Applied filter in ${testData.VIEW_NAME_2}: ${appliedFilter}`);
    await commonFunctions.compareTwoValues(appliedFilter, newFilter, 'New filter is applied globally for the second view');
    await planningPage.closeDrawer();
    expect(appliedFilter).toBe(newFilter);
  });

  test('Test Case 3: Draft filter should be created for default scope', async ({ planningPage, scopePage, commonFunctions, testData, page }) => {
    await planningPage.clickViewDropdown();
    await planningPage.selectView(testData.DEFAULT_SCOPE_VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.DEFAULT_SCOPE_VIEW_NAME);
    const filterNameStripped = newFilter.replace(/\*/g, '').trim();
    await planningPage.setDefaultScopeFilter(filterNameStripped);
    const isPresetSaved = await planningPage.verifyAlertMsg('Preset is saved for the view', 10000);
    await commonFunctions.compareTwoValues(isPresetSaved, true, 'Default scope filter preset saved successfully');
    await planningPage.openComponent('Scope');
    filterValues = await scopePage.getAllVFSelectedValues();
    const level = testData.DRAFT_SCOPE_LEVEL as IScopeDimensionFilter;
    await scopePage.clickFilterValuesIconByDimensionAndHierarchy(level.dimension, level.hierarchy);
    await scopePage.checkOrUncheckFilters([testData.DRAFT_TOGGLE_VALUE as string], 'toggle', level.dimension);
    await scopePage.clickSaveInFilterValuesBox();
    await page.keyboard.press('Escape').catch(() => {});
    await scopePage.clickOnApplyFiltersBtn();
    await planningPage.openComponent('Scope');

    let scopeName = '';
    let isDraftObserved = false;
    await expect.poll(async () => {
      const isDraftLabelVisible = await scopePage.isDraftFilterCreated();
      scopeName = await planningPage.getScopeNameFromPowerBar();
      const hasDraftAsteriskInPowerbar = scopeName.includes('*');
      isDraftObserved = isDraftLabelVisible || hasDraftAsteriskInPowerbar;
      return isDraftObserved;
    }, {
      timeout: 15000,
      message: 'Waiting for draft filter state in Scope drawer or Powerbar'
    }).toBe(true);

    await commonFunctions.compareTwoValues(isDraftObserved, true, 'Draft filter indicator is present');
    const isNameMatching = scopeName.replace(/\*/g, '').trim() === filterNameStripped;
    await commonFunctions.compareTwoValues(isNameMatching, true, 'Powerbar shows draft filter name');
    expect(isDraftObserved && isNameMatching).toBeTruthy();
  });

  test('Test Case 4: Should get original values of default filter when revert is clicked', async ({ planningPage, scopePage, commonFunctions }) => {
    await planningPage.openComponent('Scope');
    await scopePage.clickRevertVFChanges();
    await planningPage.openComponent('Scope');

    await expect.poll(async () => {
      const scopeName = await planningPage.getScopeNameFromPowerBar();
      return !scopeName.includes('*');
    }, {
      timeout: 15000,
      message: 'Waiting for revert to remove draft indicator from powerbar'
    }).toBe(true);

    const revertedValues = await scopePage.getAllVFSelectedValues();
    await commonFunctions.logMessage('INFO', `Reverted VF values: ${JSON.stringify(revertedValues)}`);
    const bValidation1 = JSON.stringify(revertedValues) === JSON.stringify(filterValues);
    await commonFunctions.compareTwoValues(JSON.stringify(revertedValues), JSON.stringify(filterValues), 'Default filter values are reverted to original');
    const filterNameStripped = newFilter.replace(/\*/g, '').trim();
    const bValidation2 = await planningPage.verifyScopeInBudgeAndVF(filterNameStripped);
    await commonFunctions.compareTwoValues(bValidation2, true, 'Scope in powerbar budge matches VF after revert');
    await planningPage.closeDrawer();
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 5: Delete created vertical filter', async ({ planningPage, scopePage, commonFunctions }) => {
    const filterNameStripped = newFilter.replace(/\*/g, '').trim();
    await planningPage.openComponent('Scope');
    const bValidation = await scopePage.deleteFilter(filterNameStripped);
    await commonFunctions.compareTwoValues(bValidation, true, 'Delete filter succeeded');
    expect(bValidation).toBeTruthy();
    // deleteFilter only drives the dialog, so the saved-filter list is what proves the delete.
    await expect.poll(async () => (await listSavedFilters(filterAccess!)).map(({ label }) => label), {
      message: `${newFilterName} is gone from the saved filters`,
      timeout: getTimeout('XLARGE'),
    }).not.toContain(newFilterName);
  });

  test.afterAll('Cleanup: delete the created filter through the API if it is still there', async ({ createdEntities }) => {
    const { failed } = await createdEntities.cleanupFile();
    try {
      if (filterAccess) {
        await deleteSavedFiltersByLabel(filterAccess, newFilterName, preexistingFilterIds);
      }
    } finally {
      expect(failed, 'Created filter deleted through the API').toHaveLength(0);
    }
  });
});
