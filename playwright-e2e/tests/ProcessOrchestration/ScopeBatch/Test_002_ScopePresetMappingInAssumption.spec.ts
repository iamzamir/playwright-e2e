import { test, expect } from "../../../configs/fixtures";
import { scopeValuesByHierarchy, type IScopeDimensionFilter } from "../../../pageobjects/scope.page";

test.describe.serial("PO - Filter scope Preset Mapping should work in Assumption", () => {
  // Scope members are realm data, so they come from the test data (its GRAVITEE block on Gravitee).
  const scopeLevelsOf = (testData: Record<string, any>) => testData.SCOPE_LEVELS as IScopeDimensionFilter[];

  test("Test Case 1: Verify Scope tab in Assumption and filter verification", async ({ testUtil, planningListingPage, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext("Assumption", testData.PROCESS_NAME, "", testData.ASSUMPTION);
    await testUtil.clickLeftpaneLinks("Assumption");
  });

  test("Test Case 2: Config Filter", async ({ scopePage, testData }) => {
    await scopePage.clickOnEditDimensions();
    await scopePage.configureScopeDimensions(scopeLevelsOf(testData));
  });

  test("Test Case 3: Selecting Filter", async ({ scopePage, testData }) => {
    const levels = scopeLevelsOf(testData);
    await scopePage.addScopeFilterValues(levels);
    expect(await scopePage.validateScopeFilterValues(scopeValuesByHierarchy(levels), "before apply"), "Selected values are applied").toBe(true);
    await scopePage.clickOnApplyFiltersBtn();
  });

  test("Test Case 4: Verifying applied filters are available after revisiting the assumption", async ({ testUtil, scopePage, testData }) => {
    await testUtil.clickLeftpaneLinks("Planning");
    await testUtil.clickLeftpaneLinks("Assumption");
    await scopePage.clickOnEditDimensions();
    expect(await scopePage.validateScopeFilterValues(scopeValuesByHierarchy(scopeLevelsOf(testData)), "after revisiting the assumption"), "Applied values persist").toBe(true);
  });
});
