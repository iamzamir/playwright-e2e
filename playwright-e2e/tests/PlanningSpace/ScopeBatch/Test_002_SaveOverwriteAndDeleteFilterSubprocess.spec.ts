import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';
import { scopeValuesByHierarchy, type IScopeDimensionFilter } from '../../../pageobjects/scope.page';
import { deleteSavedFiltersByLabel, listSavedFilterIds, listSavedFilters, SCOPE_FILTER_INSTANCE, waitForVerticalFilterAccess, type IVerticalFilterAccess } from '../../../util/vertical-filter.util';

const filterName = uniqueName('SaveAndDelete');

// Scope members are realm data, so they come from the test data (its GRAVITEE block on Gravitee).
const scopeOf = (testData: Record<string, any>) => {
  const levels = testData.SCOPE_LEVELS as IScopeDimensionFilter[];
  const overwrite = testData.SCOPE_OVERWRITE as IScopeDimensionFilter;
  return { levels, overwrite, applied: scopeValuesByHierarchy(levels), overwritten: scopeValuesByHierarchy(levels, overwrite) };
};

test.describe.serial('Create, Overwrite, Disable And Delete Vertical Filter - Subprocess', () => {
  // The user's vertical-filter BFF access, captured from the app's own request, for the API checks and cleanup.
  let filterAccess: IVerticalFilterAccess | undefined;
  // Filters the user already had, so cleanup never deletes another run's filter with the same generated name.
  let preexistingFilterIds = new Set<string>();

  test('Test Case 1: Create Vertical Filter', async ({ testUtil, planningListingPage, planningPage, scopePage, commonFunctions, testData, createdEntities }) => {
    const { levels, applied } = scopeOf(testData);
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.PSLINK as string);
    await planningListingPage.launchContext('Subprocess', testData.PROCESS_NAME, testData.SUB_PROCESS_NAME);
    await planningListingPage.page.waitForTimeout(5000);
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    // A failed capture fails here, before any filter is created, so the delete check and cleanup never go without it.
    [filterAccess] = await Promise.all([
      waitForVerticalFilterAccess(planningPage.page.context(), SCOPE_FILTER_INSTANCE),
      planningPage.openComponent('Scope'),
    ]);
    preexistingFilterIds = await listSavedFilterIds(filterAccess);
    await commonFunctions.logMessage('INFO', 'Looking for three dots under scope tab');

    await scopePage.configureScopeDimensions(levels);
    await scopePage.addScopeFilterValues(levels);
    const bValidation1 = await scopePage.validateScopeFilterValues(applied, 'before save');

    const bValidation2: boolean = await scopePage.saveFilterAs(filterName);
    let savedFilterId: string | undefined;
    await expect.poll(async () => {
      const filters = await listSavedFilters(filterAccess!);
      savedFilterId = filters.find((f) => f.label === filterName && !preexistingFilterIds.has(f.id))?.id;
      return savedFilterId;
    }, { timeout: getTimeout('MEDIUM'), message: `Find saved filter id for ${filterName}` }).toBeTruthy();
    if (savedFilterId) {
      createdEntities.register('scopeFilter', filterName, {
        id: savedFilterId,
        authorization: filterAccess!.authorization,
        context: { baseUrl: filterAccess!.baseUrl, instance: filterAccess!.instance },
      });
    }
    await scopePage.waitForAppliedVFTitle(filterName);

    const bValidation3: boolean = await commonFunctions.compareTwoValues(await scopePage.getFilterName(), filterName, 'Created Filter Name Assertion in the Filter Dropdown');
    const bValidation4 = await scopePage.validateScopeFilterValues(applied, 'after save');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBe(true);
  });

  test('Test Case 2: Overwrite Vertical Filter', async ({ scopePage, commonFunctions, testData }) => {
    const { overwrite, overwritten } = scopeOf(testData);
    await scopePage.addFiltersToDimensionHierarchyInScope(overwrite.dimension, overwrite.hierarchy, overwrite.values ?? []);
    const bValidation1 = await scopePage.validateScopeFilterValues(overwritten, 'before overwrite');

    const bValidation2: boolean = await scopePage.overwriteCurrentFilter();
    await scopePage.waitForAppliedVFTitle(filterName);
    const bValidation3: boolean = await commonFunctions.compareTwoValues(await scopePage.getFilterName(), filterName, 'Created Filter Name Assertion in the Filter Dropdown');
    const bValidation4 = await scopePage.validateScopeFilterValues(overwritten, 'after overwrite');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBe(true);
  });

  test('Test Case 3: Disable Created Filter', async ({ planningPage, scopePage, commonFunctions }) => {
    await scopePage.disableFilterFromManageAll(filterName);
    await planningPage.page.waitForTimeout(2000);
    const bValidation: boolean = await commonFunctions.compareTwoValues(!(await scopePage.getFilterName()).includes(filterName), true, 'Created Filter Name should not appear as it was disabled assertion');
    expect(bValidation).toBe(true);
  });

  test('Test Case 4: Delete Created Vertical Filter', async ({ scopePage, commonFunctions }) => {
    const bValidation: boolean = await commonFunctions.compareTwoValues(await scopePage.deleteFilter(filterName), true, 'Delete Filter Success?');
    expect(bValidation).toBe(true);
    // deleteFilter only drives the dialog, so the saved-filter list is what proves the delete.
    await expect.poll(async () => (await listSavedFilters(filterAccess!)).map(({ label }) => label), {
      message: `${filterName} is gone from the saved filters`,
      timeout: getTimeout('XLARGE'),
    }).not.toContain(filterName);
  });

  test.afterAll('Cleanup: delete the created filter through the API if it is still there', async ({ createdEntities }) => {
    const { failed } = await createdEntities.cleanupFile();
    try {
      if (filterAccess) {
        await deleteSavedFiltersByLabel(filterAccess, filterName, preexistingFilterIds);
      }
    } finally {
      expect(failed, 'Created filter deleted through the API').toHaveLength(0);
    }
  });
});
