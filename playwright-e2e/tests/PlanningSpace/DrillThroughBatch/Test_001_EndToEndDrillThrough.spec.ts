import { test, expect } from '../../../configs/fixtures';
import { DrillThroughPage, ScopeDimensions } from '../../../pageobjects/drillthrough.page';
import { PlanningPage } from '../../../pageobjects/planning.page';
import { ScenarioPage } from '../../../pageobjects/scenario.page';
import { ScopePage } from '../../../pageobjects/scope.page';
import { CommonFunctions } from '../../../util/common.util';
import { TestUtil } from '../../../util/test.util';
import { getTimeout } from '../../../constants/timeouts';

const extractContextId = (url: string): string => {
  const match = url.match(/[?&]contextId=([^&]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : '';
};

const syncPagesToActiveWindow = (
  testUtil: TestUtil,
  planningPage: PlanningPage,
  scenarioPage: ScenarioPage,
  drillThroughPage: DrillThroughPage,
  scopePage?: ScopePage
): void => {
  planningPage.page = testUtil.page;
  scenarioPage.page = testUtil.page;
  drillThroughPage.page = testUtil.page;
  if (scopePage) {
    scopePage.page = testUtil.page;
  }
};

test.describe.serial('Multilevel Drill Through(Source to Target and Target to Source) - Planning Space', () => {

  let scenarioName = '';
  // Members the card sent on the second-level drill-through; Test Case 4 checks they are cleared.
  let secondLevelScope: ScopeDimensions | null = null;

  const waitForViewName = async (planningPage: PlanningPage, expectedViewName: string): Promise<void> => {
    await expect
      .poll(async () => planningPage.getViewTitleName(), {
        message: `Expected view "${expectedViewName}" was not displayed`,
        timeout: 120000,
        intervals: [1000, 2000, 5000],
      })
      .toBe(expectedViewName);
  };

  const validateDrillThroughState = async (
    planningPage: PlanningPage,
    scenarioPage: ScenarioPage,
    drillThroughPage: DrillThroughPage,
    commonFunctions: CommonFunctions,
    testData: any,
    expectedViewName: string,
    breadcrumbSource: string,
    breadcrumbTarget: string,
    expectedScope: ScopeDimensions | null
  ): Promise<boolean> => {
    // 0. Ensure Planning Space loader and card data are completely settled
    await planningPage.waitForPlanningSpaceLoaderToDisappear().catch(() => { });
    await planningPage.waitForPivotCardToLoad().catch(() => { });

    // 1. View Title validation
    const actualViewName: string = await planningPage.getViewTitleName();
    const viewValidation: boolean = await commonFunctions.compareTwoValues(actualViewName, expectedViewName, `Process Name Assertion after Drill Through to ${expectedViewName}`);

    // 2. URL contextId validation
    const currentUrl = planningPage.page.url();
    const contextId = extractContextId(currentUrl);
    const urlHasContextId: boolean = await commonFunctions.compareTwoValues(currentUrl.includes('contextId='), true, 'URL includes Context ID Assertion');
    const contextIdValidation: boolean = await commonFunctions.compareTwoValues(contextId.length > 1, true, 'Context ID Assertion, it should have some ID and its length should be greater than 1');

    // 3. Scenario validation via PowerBar chip
    scenarioName = await planningPage.getScenarioChipText();
    const scenarioNameNonEmpty: boolean = await commonFunctions.compareTwoValues(scenarioName.length > 0, true, 'Scenario name on power bar should not be empty');
    const scenarioChipValidation: boolean = await commonFunctions.compareTwoValues(await planningPage.isScenarioChipCorrect(scenarioName), true, `Scenario Chip displays ${scenarioName}`);

    // 4. Target Card Validation 
    const cardTitle = testData.CARD_TITLE || 'Maas Pivot';
    const isCardVisible = await planningPage.cards.dashboard.isCardShown(cardTitle);
    const cardVisibleValidation: boolean = await commonFunctions.compareTwoValues(isCardVisible, true, `Card "${cardTitle}" should be displayed in view "${expectedViewName}"`);

    const hasLoadError = await planningPage.cards.dashboard.isLoadErrorShown(cardTitle).catch(() => false);
    const cardNoErrorValidation: boolean = await commonFunctions.compareTwoValues(hasLoadError, false, `Card "${cardTitle}" should not have "Unable to load data" error`);

    // 5. Scope drawer validation: Planning Space applies the members the source card sent (MFEActions -> setFilterContext)
    const scopeApplied = expectedScope ? await planningPage.isScopeAppliedInDrawer(expectedScope) : false;
    const scopeValidation: boolean = await commonFunctions.compareTwoValues(scopeApplied, true, `Is Scope applied for the drilled members: ${JSON.stringify(expectedScope)}`);

    // 6. Cell validation in target view: verify target card renders data cells dynamically
    const hasTargetData = await drillThroughPage.resolveDrillThroughCellValue([]).then((val: string) => val.length > 0).catch(() => false);
    const columnValidation: boolean = await commonFunctions.compareTwoValues(hasTargetData, true, 'Target card renders data cells');

    // 7. Context Override Popup & Breadcrumbs
    const contextOverridePopupDisplayed = await planningPage.clickOnContextOverrideIcon();
    const contextOverrideValidation: boolean = await commonFunctions.compareTwoValues(contextOverridePopupDisplayed, true, 'Clicked on Context Override Popup');

    const breadcrumbsValid = await planningPage.validateBreadCrumbs(breadcrumbSource, breadcrumbTarget);
    const breadcrumbValidation: boolean = await commonFunctions.compareTwoValues(breadcrumbsValid, true, `Breadcrumb Displayed: ${breadcrumbSource} -> ${breadcrumbTarget}`);

    const isClearAvailable = await planningPage.isClearDisplays(false);
    const clearValidation: boolean = await commonFunctions.compareTwoValues(isClearAvailable, true, 'Is clear context button available in Context Override popup');

    await planningPage.closeContextOverridePopup();

    await commonFunctions.logMessage('INFO', `Drill through validation results - View: ${viewValidation}, URL Context ID: ${urlHasContextId}, Context ID Valid: ${contextIdValidation}, Scenario Non-Empty: ${scenarioNameNonEmpty}, Scenario Chip: ${scenarioChipValidation}, Card Visible: ${cardVisibleValidation}, Card No Error: ${cardNoErrorValidation}, Scope: ${scopeValidation}, Columns: ${columnValidation}, Override Popup: ${contextOverrideValidation}, Breadcrumbs: ${breadcrumbValidation}, Clear: ${clearValidation}`);

    const allValidationsPassed = viewValidation && urlHasContextId && contextIdValidation && scenarioNameNonEmpty && scenarioChipValidation && cardVisibleValidation && cardNoErrorValidation && scopeValidation && columnValidation && contextOverrideValidation && breadcrumbValidation && clearValidation;
    expect(allValidationsPassed, `All drill-through validations for view "${expectedViewName}" should pass`).toBe(true);

    return allValidationsPassed;
  };

  test('Test Case 1: First Level Drill Through From Source to Target', async ({ planningPage, drillThroughPage, scenarioPage, commonFunctions, testUtil, testData }) => {
    const sViewFrom = testData.TC1_DRILL_THROUGH_VIEW_FROM;
    const sViewNameTo = testData.TC1_DRILL_THROUGH_VIEW_TO;

    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);

    await planningPage.selectViewInPlanning(sViewFrom);
    await waitForViewName(planningPage, sViewFrom);

    await planningPage.toggleMinimizeIcon();
    const drillScope = drillThroughPage.captureDrillThroughScope();
    const selectedCellValue = await drillThroughPage.resolveDrillThroughCellValue([]);
    await drillThroughPage.performDrillThroughOnCardField(selectedCellValue, sViewNameTo);
    const expectedScope = await drillScope.wait();

    await testUtil.switchToSpecificWindow(1);
    syncPagesToActiveWindow(testUtil, planningPage, scenarioPage, drillThroughPage);
    await waitForViewName(planningPage, sViewNameTo);

    const isValid = await validateDrillThroughState(planningPage, scenarioPage, drillThroughPage, commonFunctions, testData, sViewNameTo, sViewFrom, sViewNameTo, expectedScope);
    expect(isValid).toBe(true);
  });

  test('Test Case 2: Enable Draft Filter to Source View', async ({ planningPage, drillThroughPage, testUtil, scenarioPage, scopePage }) => {
    await testUtil.switchToSpecificWindow(0);
    syncPagesToActiveWindow(testUtil, planningPage, scenarioPage, drillThroughPage, scopePage);

    await planningPage.toggleMinimizeIcon();
    await planningPage.openComponent('Scope');
    await scopePage.addFiltersToDimensionHierarchyInScope('ITEM', 'Brand', ['PL-21']);
    await scopePage.clickOnApplyFiltersBtn();
  });

  test('Test Case 3: Second Level Drill Through From Target to Source', async ({ planningPage, drillThroughPage, testUtil, scenarioPage, commonFunctions, testData }) => {
    const sViewNameTo = testData.LV2_DRILL_THROUGH_VIEW_TO;

    await testUtil.switchToSpecificWindow(1);
    syncPagesToActiveWindow(testUtil, planningPage, scenarioPage, drillThroughPage);

    const drillScope = drillThroughPage.captureDrillThroughScope();
    const selectedCellValue = await drillThroughPage.resolveDrillThroughCellValue([]);
    await drillThroughPage.performDrillThroughOnCardField(selectedCellValue, sViewNameTo);
    secondLevelScope = await drillScope.wait();

    await testUtil.switchToSpecificWindow(2);
    syncPagesToActiveWindow(testUtil, planningPage, scenarioPage, drillThroughPage);
    await waitForViewName(planningPage, sViewNameTo);

    const isValid = await validateDrillThroughState(planningPage, scenarioPage, drillThroughPage, commonFunctions, testData, sViewNameTo, testData.TC1_DRILL_THROUGH_VIEW_TO, sViewNameTo, secondLevelScope);
    expect(isValid).toBe(true);
  });

  test('Test Case 4: Clear Context and verify Draft Filter', async ({ planningPage, drillThroughPage, testUtil, scenarioPage, scopePage, commonFunctions, testData }) => {
    await testUtil.switchToSpecificWindow(2);
    syncPagesToActiveWindow(testUtil, planningPage, scenarioPage, drillThroughPage, scopePage);

    await planningPage.clearContext();
    await planningPage.waitForPlanningSpaceLoaderToDisappear().catch(() => { });
    await planningPage.openComponent('Scope');
    await scopePage.waitForAppliedVFTitle(testData.FILTER_NAME);
    const scopeTitle: string = await scopePage.getAppliedVFTitle();
    const bValidation1: boolean = await commonFunctions.compareTwoValues(scopeTitle, testData.FILTER_NAME, `Scope Title Assertion after clearing context, it should be ${testData.FILTER_NAME}`);

    // Verify draft filter added in TC2 (Brand: PL-21) remains applied
    const isDraftFilterApplied = await scopePage.verifyAppliedFilterInScope('Brand', 'PL-21');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(isDraftFilterApplied, true, 'Is Brand filter that was added in 2nd testcase applied');

    // Verify that the drill-through context override (the Brand the card sent in Test Case 3) is cleared.
    // If the drilled Brand is the draft member itself, there is nothing separate to see removed.
    const drilledBrand = secondLevelScope?.ITEM?.BRAND ?? '';
    const isOverrideBrandApplied = drilledBrand && drilledBrand !== 'PL-21'
      ? await scopePage.verifyAppliedFilterInScope('Brand', drilledBrand, getTimeout('SHORT')).catch(() => false)
      : false;
    const bValidation3: boolean = await commonFunctions.compareTwoValues(isOverrideBrandApplied, false, `Is Brand filter ${drilledBrand || '(none drilled)'} from drill-through override removed after clearing context`);

    expect(bValidation1 && bValidation2 && bValidation3, 'All clear context assertions should pass').toBe(true);
  });

  test.afterAll(async ({ planningPage, scopePage, testUtil, testData }) => {
    try {
      const context = testUtil.page.context();
      const pages = context.pages();
      // Close child popup windows (indices >= 1) in reverse order to clean up tabs
      for (let i = pages.length - 1; i >= 1; i--) {
        await pages[i].close().catch(() => { });
      }
      await testUtil.switchToSpecificWindow(0);
      planningPage.page = testUtil.page;
      scopePage.page = testUtil.page;
      await planningPage.selectViewInPlanning(testData.TC1_DRILL_THROUGH_VIEW_FROM);
      await planningPage.openComponent('Scope');
      await scopePage.clickRevertVFChanges().catch(() => { });
    } catch (error) {
      console.warn('Error during afterAll cleanup:', error);
    }
  });

});
