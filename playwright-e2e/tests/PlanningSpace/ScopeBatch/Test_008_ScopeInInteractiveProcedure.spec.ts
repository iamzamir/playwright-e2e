import { test, expect } from '../../../configs/fixtures';
import SCAPage from '../../../pageobjects/sca.page';
import type { IScopeDimensionFilter } from '../../../pageobjects/scope.page';

// Scope members are realm data, so they come from the test data (its GRAVITEE block on Gravitee).
// SCOPE_LEVELS is [item level, location level]; DATA_SCOPE holds what the procedure's data scope shows for each.
const scopeOf = (testData: Record<string, any>) => {
  const [item, location] = testData.SCOPE_LEVELS as IScopeDimensionFilter[];
  const dataScope = testData.DATA_SCOPE as Record<'ITEM' | 'LOCATION', { dimesionName: string; filterName: string; filterValues: string[] }>;
  return { item, location, dataScope };
};

test.describe.serial('Verify scope filters in interactive procedure', () => {
  test('Test Case 1: Create Vertical Filter', async ({ testUtil, planningPage, scopePage, commonFunctions, testData }) => {
    const { item, location } = scopeOf(testData);
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.openComponent('Scope');
    await commonFunctions.logMessage('INFO', 'Looking for three dots under scope tab');
    await scopePage.configureScopeDimensions([item, location]);
    await scopePage.addScopeFilterValues([item, location]);
    await scopePage.clickOnApplyFiltersBtn();
    await planningPage.openComponent('Scope');
    const bValidation = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope(item.hierarchy, item.values![0]), true, 'Is Item filter applied');
    expect(bValidation).toBeTruthy();
  });

  test('Test Case 2: Verify applied filter in data scope while running procedure', async ({ page, scopePage, commonFunctions, testData }) => {
    const { dataScope } = scopeOf(testData);
    const scaPage = new SCAPage(page);
    await scaPage.clickProcedureItemFromDropdown(testData.PROCEDURE_NAME);
    await scaPage.clickOnNextStep();
    const isItemFilterApplied = await scopePage.verifyAppliedFilterInDataScope(dataScope.ITEM);
    const bValidation = await commonFunctions.compareTwoValues(isItemFilterApplied, true, "applied filter doesn't exist in data scope");
    expect(isItemFilterApplied && bValidation).toBeTruthy();
  });

  test('Test Case 3: Update and verify scope through manage scope', async ({ scopePage, commonFunctions, testData }) => {
    const { item, location, dataScope } = scopeOf(testData);
    const locationValue = location.values![0];
    await scopePage.clickOnManageScope();
    await scopePage.click3DotInManageScope();
    await scopePage.select3DotOption('Edit Configuration');
    await scopePage.selectFilterEntryFromDialogConfig('Select', location.dimension);
    await scopePage.filterDialogSaveCancel('Next');
    await scopePage.selectDimensionHierarchyLevel(location.dimension, [location.hierarchyLabel ?? location.hierarchy], 'check');
    await scopePage.filterDialogSaveCancel('Save');
    let isLocationFilterAppliedInScope = await scopePage.verifyAppliedFilterInScope(location.hierarchy, locationValue).catch(() => false);
    if (!isLocationFilterAppliedInScope) {
      await scopePage.addFiltersToDimensionHierarchyInScope(location.dimension, location.hierarchy, [locationValue]);
      isLocationFilterAppliedInScope = await scopePage.verifyAppliedFilterInScope(location.hierarchy, locationValue);
    }
    const bValidation1 = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope(item.hierarchy, item.values![0]), true, 'Is Item filter applied');
    const bValidation2 = await commonFunctions.compareTwoValues(isLocationFilterAppliedInScope, true, 'Is Location filter applied');
    await scopePage.clickOnApplyFiltersBtnInManageScope();
    const bValidation3 = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInDataScope(dataScope.ITEM), true, 'Is Item filter applied outside Scope');
    const bValidation4 = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInDataScope(dataScope.LOCATION), true, 'Is Location filter applied outside Scope');
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });
});
