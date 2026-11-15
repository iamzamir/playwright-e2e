import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from "../../../configs/fixtures";
import { Page } from "@playwright/test";
import { PlanningPage } from "../../../pageobjects/planning.page";
import { ScopePage, scopeValuesByHierarchy, type IScopeDimensionFilter } from "../../../pageobjects/scope.page";
import { getTimeout } from "../../../constants/timeouts";
import type { TestUtil } from "../../../util/test.util";
import { clearProcessScopeRestriction, deleteSavedFiltersByLabel, listSavedFilterIds, listSavedFilters, SCOPE_FILTER_INSTANCE, waitForVerticalFilterAccess, type IVerticalFilterAccess } from "../../../util/vertical-filter.util";

/** Scope members and dimensions are realm data, so they come from the test data (its GRAVITEE block on Gravitee). */
const scopeOf = (testData: Record<string, any>) => {
  const levels = testData.SCOPE_LEVELS as IScopeDimensionFilter[];
  return {
    levels,
    applied: scopeValuesByHierarchy(levels),
    scopedDimensions: levels.map(({ dimension }) => dimension),
    unscopedDimension: testData.UNSCOPED_DIMENSION as string,
  };
};

test.describe.serial("PO - Create And Delete Vertical Filter in Settings module, Scope Restrictions", () => {
  // Process Settings opens in a second window, so the page objects are rebound whenever the active window changes.
  let scopePage: ScopePage;
  let planningPage: PlanningPage;
  const filterName = uniqueName('SaveAndDeleteInSettings');
  // The user's vertical-filter BFF access, captured from the app's own request, for the API checks and cleanup.
  let filterAccess: IVerticalFilterAccess | undefined;
  // Filters the user already had, so cleanup never deletes another run's filter with the same generated name.
  let preexistingFilterIds = new Set<string>();
  let processName = "";

  const bindPages = (page: Page) => {
    scopePage = new ScopePage(page);
    planningPage = new PlanningPage(page);
  };

  /** Process Summary > Process Settings (new window) > Scope, with the scope reset and the filter panel open. */
  const openProcessSettingsScope = async (testUtil: TestUtil) => {
    // Each open adds a window, so window 1 would be the stale one from an earlier case. Two Process Settings windows on
    // one scope also overwrite each other's filter state (the panel fell back to "Preselected" and Overwrite missed the filter).
    for (const stalePage of testUtil.page.context().pages().slice(1)) {
      await stalePage.close();
    }
    await testUtil.clickLeftpaneLinks("Process Summary");
    await testUtil.clickPowerBarLink("Process Settings");
    await testUtil.switchToSpecificWindow(1);
    await testUtil.clickLeftpaneLinks("Scope");
    bindPages(testUtil.page);
    await scopePage.resetScope();
    await scopePage.clickOnEditDimensions();
  };

  /**
   * Back in the planning window: opens Planning and its Scope drawer. Planning reads the process scope restriction
   * when it loads, so `reload` is needed to see a restriction change made in Process Settings.
   */
  const openPlanningScope = async (testUtil: TestUtil, reload: boolean = false) => {
    await testUtil.switchToSpecificWindow(0);
    if (reload) {
      await testUtil.page.reload({ waitUntil: "domcontentloaded" });
    }
    await testUtil.clickLeftpaneLinks("Planning");
    bindPages(testUtil.page);
    await planningPage.waitForViewToBeDisplayed();
    // A Scope drawer opened while the view is still loading gets closed by the view's re-render, so reopen until it stays open.
    const filterDropdown = planningPage.getMfeFrameLocator().getByTestId("vf-filter-card-dropdown-button");
    await expect(async () => {
      await planningPage.openScopeFilterByChip();
      let visibleStreak = 0;
      await expect.poll(async () => (visibleStreak = (await filterDropdown.isVisible()) ? visibleStreak + 1 : 0), {
        message: "Scope drawer stays open",
        intervals: [500],
        timeout: getTimeout('SHORT'),
      }).toBeGreaterThanOrEqual(4);
    }).toPass({ timeout: getTimeout('EXTREME') });
  };

  /** With `filterName` applied in Planning, only the restricted values and dimensions are offered. */
  const verifyScopeRestrictionsApplied = async (testData: Record<string, any>) => {
    const { levels, scopedDimensions, unscopedDimension } = scopeOf(testData);
    expect(await scopePage.searchFilter(filterName), `${filterName} is listed in the Scope dropdown`).toBe(true);
    for (const { dimension, hierarchy, values } of levels) {
      const available = await scopePage.getAvailableHierarchyValuesFromPopup(dimension, hierarchy);
      expect(available[0] ?? "", `${hierarchy} offers the restricted value first`).toContain(values?.[0] ?? "");
    }
    await scopePage.click3Dot();
    await scopePage.select3DotOption("Edit Configuration");
    for (const dimension of scopedDimensions) {
      await expect.poll(() => scopePage.isDimensionExist(dimension), { message: `${dimension} is configurable`, timeout: getTimeout('SHORT') }).toBe(true);
    }
    expect(await scopePage.isDimensionExist(unscopedDimension), `${unscopedDimension} is outside the scope restriction`).toBe(false);
    await scopePage.filterDialogSaveCancel("Cancel");
  };

  test("Test Case 1: Create Vertical Filter", async ({ testUtil, planningListingPage, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext("Process", testData.PROCESS_NAME);
    const { levels, applied } = scopeOf(testData);
    processName = testData.PROCESS_NAME;
    // Context-wide, since Process Settings opens in a second window.
    // A failed capture fails here, before any filter is created, so the delete check and cleanup never go without it.
    [filterAccess] = await Promise.all([
      waitForVerticalFilterAccess(testUtil.page.context(), SCOPE_FILTER_INSTANCE),
      openProcessSettingsScope(testUtil),
    ]);
    preexistingFilterIds = await listSavedFilterIds(filterAccess);
    await scopePage.configureScopeDimensions(levels);
    await scopePage.addScopeFilterValues(levels);
    expect(await scopePage.validateScopeFilterValues(applied, "before save"), "Selected values are applied before save").toBe(true);

    expect(await scopePage.saveFilterAs(filterName), "Save Filter dialog saved").toBe(true);
    await expect.poll(() => scopePage.getFilterName(), { timeout: getTimeout('MEDIUM') }).toBe(filterName);
    expect(await scopePage.validateScopeFilterValues(applied, "after save"), "Saved filter keeps the selected values").toBe(true);
  });

  test("Test Case 2: Verify Scope Restrictions Applied for Preselected Filter", async ({ testUtil, testData }) => {
    await scopePage.clickOnApplyFiltersBtn();
    await openPlanningScope(testUtil);
    await verifyScopeRestrictionsApplied(testData);
  });

  test("Test Case 3: Verify Scope Restrictions Applied for Default Filter", async ({ testData }) => {
    await planningPage.closeDrawer();
    await planningPage.selectViewInPlanning(testData.DEFAULT_VIEW_NAME);
    await planningPage.openScopeFilterByChip();
    await verifyScopeRestrictionsApplied(testData);
  });

  test("Test Case 4: Filters with a Different Dimension Hierarchy from Scope Restrictions Should Not Be Displayed", async ({ testUtil, testData }) => {
    await planningPage.openScopeFilterByChip();
    expect(await scopePage.searchFilter(testData.DEFAULT_FILTER_NAME), `${testData.DEFAULT_FILTER_NAME} is listed`).toBe(true);
    expect(await scopePage.isFilterConfigured(), `${testData.DEFAULT_FILTER_NAME} has no dimensions inside the restriction`).toBe(false);

    await openProcessSettingsScope(testUtil);
    expect(await scopePage.searchFilter(filterName), `${filterName} is listed in Process Settings`).toBe(true);
    // Test Case 5 overwrites the current filter, so it must be this one and not another saved filter.
    await expect.poll(() => scopePage.getFilterName(), { timeout: getTimeout('MEDIUM') }).toBe(filterName);
  });

  test("Test Case 5: Overwrite Vertical Filter", async ({ testData }) => {
    const { applied } = scopeOf(testData);
    expect(await scopePage.validateScopeFilterValues(applied, "before overwrite"), "Saved filter values are applied").toBe(true);
    expect(await scopePage.overwriteCurrentFilter(), "Overwrite dialog updated").toBe(true);
    await expect.poll(() => scopePage.getFilterName(), { timeout: getTimeout('MEDIUM') }).toBe(filterName);
    expect(await scopePage.validateScopeFilterValues(applied, "after overwrite"), "Overwritten filter keeps the selected values").toBe(true);
  });

  test("Test Case 6: Disable Created Filter", async () => {
    await scopePage.disableFilterFromManageAll(filterName);
    expect(await scopePage.getFilterName(), "Disabled filter is no longer selected").not.toContain(filterName);
  });

  test("Test Case 7: Delete Created Vertical Filter", async () => {
    expect(await scopePage.deleteFilter(filterName), "Filter deleted").toBe(true);
    // deleteFilter only drives the dialog, so the saved-filter list is what proves the delete.
    await expect.poll(async () => (await listSavedFilters(filterAccess!)).map(({ label }) => label), {
      message: `${filterName} is gone from the saved filters`,
      timeout: getTimeout('XLARGE'),
    }).not.toContain(filterName);
  });

  test("Test Case 8: Verify Scope Restrictions Removed", async ({ testUtil, testData }) => {
    await openPlanningScope(testUtil, true);
    expect(await scopePage.searchFilter(testData.DEFAULT_FILTER_NAME), `${testData.DEFAULT_FILTER_NAME} is listed`).toBe(true);
    await scopePage.click3Dot();
    await scopePage.select3DotOption("Edit Configuration");
    const { scopedDimensions, unscopedDimension } = scopeOf(testData);
    for (const dimension of [...scopedDimensions, unscopedDimension]) {
      await expect.poll(() => scopePage.isDimensionExist(dimension), { message: `${dimension} is configurable again`, timeout: getTimeout('SHORT') }).toBe(true);
    }
    await scopePage.filterDialogSaveCancel("Cancel");
  });

  // A run that stops early leaves the filter and, from Test Case 2 to 4, the process scope restriction (which keeps the
  // member values, not a link to the filter) in place for other specs on the process.
  test.afterAll("Cleanup: delete the created filter and clear the process scope through the API", async ({ commonFunctions }) => {
    if (!filterAccess) {
      await commonFunctions.logMessage("WARN", `Skipping API cleanup of ${filterName}: vertical filter API access was not captured.`);
      return;
    }
    // Independent steps: a failed filter delete must not leave the restriction in place for later specs.
    try {
      const deleted = await deleteSavedFiltersByLabel(filterAccess, filterName, preexistingFilterIds);
      await commonFunctions.logMessage("INFO", `API cleanup deleted ${deleted} leftover filter(s) named ${filterName}`);
    } finally {
      const cleared = await clearProcessScopeRestriction(filterAccess, processName);
      await commonFunctions.logMessage("INFO", `API cleanup: ${processName} scope restriction ${cleared ? "cleared" : "was already clear"}`);
    }
  });
});
