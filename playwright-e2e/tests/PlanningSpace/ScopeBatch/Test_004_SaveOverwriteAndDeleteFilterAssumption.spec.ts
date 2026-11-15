import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';
import { deleteSavedFiltersByLabel, listSavedFilterIds, listSavedFilters, SCOPE_FILTER_INSTANCE, waitForVerticalFilterAccess, type IVerticalFilterAccess } from '../../../util/vertical-filter.util';

const filterName = uniqueName('SaveAndDelete');

test.describe.serial('Create, Overwrite, Disable And Delete Vertical Filter - Assumption', () => {
  // The user's vertical-filter BFF access, captured from the app's own request, for the API checks and cleanup.
  let filterAccess: IVerticalFilterAccess | undefined;
  // Filters the user already had, so cleanup never deletes another run's filter with the same generated name.
  let preexistingFilterIds = new Set<string>();
  test('Test Case 1: Create Vertical Filter', async ({ testUtil, planningListingPage, planningPage, scopePage, commonFunctions, testData, createdEntities }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.PSLINK as string);
    await planningListingPage.launchContext('Assumption', testData.PROCESS_NAME, '', testData.ASSUMPTION_NAME);
    await planningListingPage.page.waitForTimeout(5000);
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);
    // A failed capture fails here, before any filter is created, so the delete check and cleanup never go without it.
    [filterAccess] = await Promise.all([
      waitForVerticalFilterAccess(planningPage.page.context(), SCOPE_FILTER_INSTANCE),
      planningPage.openComponent('Scope'),
    ]);
    preexistingFilterIds = await listSavedFilterIds(filterAccess);
    await commonFunctions.logMessage('INFO', 'Looking for three dots under scope tab');

    await scopePage.click3Dot();
    await scopePage.select3DotOption('Edit Configuration');
    await scopePage.selectFilterEntryFromDialogConfig('Select', 'ITEM');
    await scopePage.selectFilterEntryFromDialogConfig('Select', 'LOCATION');
    await scopePage.selectFilterEntryFromDialogConfig('Select', 'CUSTOMER');
    await scopePage.filterDialogSaveCancel('Next');

    await scopePage.selectDimensionHierarchyLevel('ITEM', ['ProductType'], 'check');
    await scopePage.selectDimensionHierarchyLevel('LOCATION', ['AllLocations'], 'check');
    await scopePage.selectDimensionHierarchyLevel('CUSTOMER', ['AllChannels'], 'check');
    await scopePage.filterDialogSaveCancel('Save');

    await scopePage.addFiltersToDimensionHierarchyInScope('ITEM', 'ProductType', ['PF-10']);
    await scopePage.expandDimensionInVF('AllLocations', 'property');
    await scopePage.addFiltersToDimensionHierarchyInScope('LOCATION', 'AllLocations', ['ALL']);
    await scopePage.expandDimensionInVF('AllChannels', 'property');
    await scopePage.addFiltersToDimensionHierarchyInScope('CUSTOMER', 'AllChannels', ['ALL CUSTOMERS']);

    const bValidation1: boolean = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope('AllChannels', 'ALL CUSTOMERS'), true, 'Is Customer filter applied');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope('ProductType', 'PF-10'), true, 'Is Item filter applied');
    const bValidation3: boolean = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope('AllLocations', 'ALL'), true, 'Is Location filter applied');

    await scopePage.click3Dot();
    await scopePage.select3DotOption('Save Filter');
    await scopePage.setCreateInputFilterValue(filterName);
    const bValidation4: boolean = await scopePage.filterDialogSaveCancel('Save');
    await planningPage.page.waitForTimeout(10000);

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

    const bValidation5: boolean = await commonFunctions.compareTwoValues(await scopePage.getFilterName(), filterName, 'Created Filter Name Assertion in the Filter Dropdown');
    const bValidation6: boolean = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope('AllChannels', 'ALL CUSTOMERS'), true, 'Is Customer filter applied');
    const bValidation7: boolean = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope('ProductType', 'PF-10'), true, 'Is Item filter applied');
    const bValidation8: boolean = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope('AllLocations', 'ALL'), true, 'Is Location filter applied');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8).toBe(true);
  });

  test('Test Case 2: Overwrite Vertical Filter', async ({ scopePage, commonFunctions }) => {
    await scopePage.addFiltersToDimensionHierarchyInScope('ITEM', 'ProductType', ['PF-20']);

    const bValidation1: boolean = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope('AllChannels', 'ALL CUSTOMERS'), true, 'Is Customer filter applied');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope('ProductType', 'PF-10'), true, 'Is Item filter applied (old)');
    const bValidation3: boolean = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope('ProductType', 'PF-20'), true, 'Is Item filter applied (new)');
    const bValidation4: boolean = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope('AllLocations', 'ALL'), true, 'Is Location filter applied');

    await scopePage.click3Dot();
    await scopePage.select3DotOption('Save Filter');
    await scopePage.selectOverWriteFilter();
    const bValidation5: boolean = await scopePage.filterDialogSaveCancel('Update');

    const bValidation6: boolean = await commonFunctions.compareTwoValues(await scopePage.getFilterName(), filterName, 'Created Filter Name Assertion in the Filter Dropdown');
    const bValidation7: boolean = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope('AllChannels', 'ALL CUSTOMERS'), true, 'Is Customer filter applied');
    const bValidation8: boolean = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope('ProductType', 'PF-10'), true, 'Is Item filter applied (old)');
    const bValidation9: boolean = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope('ProductType', 'PF-20'), true, 'Is Item filter applied (new)');
    const bValidation10: boolean = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope('AllLocations', 'ALL'), true, 'Is Location filter applied');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation9 && bValidation10).toBe(true);
  });

  test('Test Case 3: Disable Created Filter', async ({ scopePage, commonFunctions }) => {
    await scopePage.click3Dot();
    await scopePage.select3DotOption('Manage All');
    await scopePage.disableFilter(filterName);
    await scopePage.filterDialogSaveCancel('Close');

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
