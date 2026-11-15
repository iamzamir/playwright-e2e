import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';
import { ensureSavedFilter, SCOPE_FILTER_INSTANCE, waitForVerticalFilterAccess, type IVerticalFilterAccess, type ISeedFilter } from '../../../util/vertical-filter.util';

// Saved filters are owned per user and per realm, so a new realm (Gravitee pspoat-test1) lacks the ones PS ScopeBatch
// specs select by name, and other specs can overwrite them (PO ScopeBatch Test_003 once overwrote "Default filter 2").
// This puts back each SAVED_FILTERS entry with its exact members and each VIEW_DEFAULT_FILTERS preset for user1.
// Both lists are empty on the Azure realm, whose filters were made by hand.
test.describe.serial('Seed PS ScopeBatch saved filters and view default filters', () => {
  let filterAccess: IVerticalFilterAccess | undefined;

  test('Test Case 1: Saved filters exist with their members', async ({ testUtil, planningPage, commonFunctions, testData }) => {
    const filters = (testData.SAVED_FILTERS ?? []) as ISeedFilter[];
    test.skip(filters.length === 0 && (testData.VIEW_DEFAULT_FILTERS ?? []).length === 0, 'Nothing to seed on this realm');
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    [filterAccess] = await Promise.all([
      waitForVerticalFilterAccess(planningPage.page.context(), SCOPE_FILTER_INSTANCE),
      planningPage.openComponent('Scope'),
    ]);
    for (const filter of filters) {
      const outcome = await ensureSavedFilter(filterAccess, filter);
      await commonFunctions.logMessage('INFO', `Saved filter "${filter.label}": ${outcome}`);
    }
  });

  test('Test Case 2: Views open on their default filter', async ({ page, planningPage, commonFunctions, testData }) => {
    const presets = (testData.VIEW_DEFAULT_FILTERS ?? []) as { VIEW_NAME: string; FILTER_NAME: string }[];
    test.skip(presets.length === 0, 'No view default filters to seed on this realm');
    // Filters created through the API show up in the default filter list only after a reload.
    await page.reload();
    await planningPage.waitForViewToBeDisplayed();
    for (const { VIEW_NAME, FILTER_NAME } of presets) {
      await planningPage.selectViewInPlanning(VIEW_NAME);
      await planningPage.waitForSpecificDashboardToBeDisplayed(VIEW_NAME);
      // Re-selecting the preset the view already has shows no "Preset is saved" alert, so only set it when it differs.
      // The power bar chip names the applied filter while the Scope drawer can still be loading (ODM data sync). Right after a
      // view switch it can still show the previous view's filter, so give it a moment to settle on FILTER_NAME.
      const applied = (await planningPage.waitForScopeNameInPowerBar(FILTER_NAME, getTimeout('MEDIUM'))).replace(/\*/g, '').trim();
      if (applied === FILTER_NAME) {
        await commonFunctions.logMessage('INFO', `View "${VIEW_NAME}" already opens on "${FILTER_NAME}"`);
        continue;
      }
      await planningPage.setDefaultScopeFilter(FILTER_NAME);
      expect(await planningPage.verifyAlertMsg('Preset is saved for the view', getTimeout('MEDIUM')), `Default filter of "${VIEW_NAME}" is saved`).toBe(true);
      const scopeName = await planningPage.waitForScopeNameInPowerBar(FILTER_NAME, getTimeout('XLARGE'));
      expect(scopeName.replace(/\*/g, '').trim(), `"${VIEW_NAME}" opens on "${FILTER_NAME}"`).toBe(FILTER_NAME);
    }
  });
});
