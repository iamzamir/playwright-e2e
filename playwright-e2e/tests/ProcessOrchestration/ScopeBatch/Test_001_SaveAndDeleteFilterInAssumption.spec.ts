import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from "../../../configs/fixtures";
import { getTimeout } from "../../../constants/timeouts";
import { scopeValuesByHierarchy, type IScopeDimensionFilter } from "../../../pageobjects/scope.page";
import { deleteSavedFiltersByLabel, listSavedFilterIds, listSavedFilters, SCOPE_FILTER_INSTANCE, waitForVerticalFilterAccess, type IVerticalFilterAccess } from "../../../util/vertical-filter.util";

test.describe("PO - Create And Delete Vertical Filter in Assumption module", () => {
  const filterName = uniqueName('SaveAndDeleteInAssumption');
  // The user's vertical-filter BFF access, captured from the app's own request, for the API checks and cleanup.
  let filterAccess: IVerticalFilterAccess | undefined;
  // Filters the user already had, so cleanup never deletes another run's filter with the same generated name.
  let preexistingFilterIds = new Set<string>();
  test.describe.serial("Vertical Filter Actions on Assumptions Test Suite", () => {
    // Scope members are realm data, so they come from the test data (its GRAVITEE block on Gravitee).
    const scopeOf = (testData: Record<string, any>) => {
      const levels = testData.SCOPE_LEVELS as IScopeDimensionFilter[];
      const overwrite = testData.SCOPE_OVERWRITE as IScopeDimensionFilter;
      return { levels, overwrite, applied: scopeValuesByHierarchy(levels), overwritten: scopeValuesByHierarchy(levels, overwrite) };
    };

    test("Test Case 1: Create Vertical Filter", async ({ testUtil, planningListingPage, scopePage, testData }) => {
      const { levels, applied } = scopeOf(testData);
      await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
      await testUtil.navigateToPlanningListingPage();
      await planningListingPage.launchContext("Assumption", testData.PROCESS_NAME, "", testData.ASSUMPTION);
      // A failed capture fails here, before any filter is created, so the delete check and cleanup never go without it.
      [filterAccess] = await Promise.all([
        waitForVerticalFilterAccess(testUtil.page.context(), SCOPE_FILTER_INSTANCE),
        (async () => {
          await testUtil.clickLeftpaneLinks("Assumption");
          await scopePage.clickOnEditDimensions();
        })(),
      ]);
      preexistingFilterIds = await listSavedFilterIds(filterAccess);
      await scopePage.configureScopeDimensions(levels);
      await scopePage.addScopeFilterValues(levels);
      expect(await scopePage.validateScopeFilterValues(applied, "before save"), "Selected values are applied before save").toBe(true);

      expect(await scopePage.saveFilterAs(filterName), "Save Filter dialog saved").toBe(true);
      await expect.poll(() => scopePage.getFilterName(), { timeout: getTimeout('MEDIUM') }).toBe(filterName);
      expect(await scopePage.validateScopeFilterValues(applied, "after save"), "Saved filter keeps the selected values").toBe(true);
    });

    test("Test Case 2: Overwrite Vertical Filter", async ({ scopePage, testData }) => {
      const { overwrite, overwritten } = scopeOf(testData);
      await scopePage.addFiltersToDimensionHierarchyInScope(overwrite.dimension, overwrite.hierarchy, overwrite.values ?? []);
      expect(await scopePage.validateScopeFilterValues(overwritten, "before overwrite"), `${overwrite.values?.join(", ")} is added to the applied values`).toBe(true);

      expect(await scopePage.overwriteCurrentFilter(), "Overwrite dialog updated").toBe(true);
      expect(await scopePage.getFilterName(), "Overwritten filter stays selected").toBe(filterName);
      expect(await scopePage.validateScopeFilterValues(overwritten, "after overwrite"), "Overwritten filter keeps the selected values").toBe(true);
    });

    test("Test Case 3: Disable Created Filter", async ({ scopePage }) => {
      await scopePage.disableFilterFromManageAll(filterName);
      expect(await scopePage.getFilterName(), "Disabled filter is no longer selected").not.toContain(filterName);
    });

    test("Test Case 4: Delete Created Vertical Filter", async ({ scopePage }) => {
      expect(await scopePage.deleteFilter(filterName), "Filter deleted").toBe(true);
      // deleteFilter only drives the dialog, so the saved-filter list is what proves the delete.
      await expect.poll(async () => (await listSavedFilters(filterAccess!)).map(({ label }) => label), {
        message: `${filterName} is gone from the saved filters`,
        timeout: getTimeout('XLARGE'),
      }).not.toContain(filterName);
    });

    test.afterAll("Cleanup: delete the created filter through the API if it is still there", async ({ commonFunctions }) => {
      if (!filterAccess) {
        await commonFunctions.logMessage("WARN", `Skipping API cleanup of ${filterName}: vertical filter API access was not captured.`);
        return;
      }
      const deleted = await deleteSavedFiltersByLabel(filterAccess, filterName, preexistingFilterIds);
      await commonFunctions.logMessage("INFO", `API cleanup deleted ${deleted} leftover filter(s) named ${filterName}`);
    });
  });
});
