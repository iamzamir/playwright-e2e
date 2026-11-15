import { test, expect } from '../../../configs/fixtures';
import { PlanningPage } from '../../../pageobjects/planning.page';
import { ScenarioPage } from '../../../pageobjects/scenario.page';
import { CommonFunctions } from '../../../util/common.util';

const extractContextId = (url: string): string => {
  const urlParts = url.split('&');
  for (const part of urlParts) {
    if (part.includes('contextId=')) {
      return part.split('=')[1] || '';
    }
  }
  return '';
};

test.describe.serial('ODM - drill through', () => {
  let scenarioName = '';

  const waitForViewName = async (planningPage: PlanningPage, expectedViewName: string): Promise<void> => {
    await expect
      .poll(async () => {
        return await planningPage.getViewTitleName();
      }, { timeout: 120000, intervals: [1000, 2000, 5000] })
      .toBe(expectedViewName);
  };

  const validateDrillThroughState = async (
    planningPage: PlanningPage,
    scenarioPage: ScenarioPage,
    commonFunctions: CommonFunctions,
    testData: any,
    expectedViewName: string,
    breadcrumbSource: string,
    breadcrumbTarget: string,
    validateEllipses: boolean,
    validateHiddenViewControls: boolean
  ): Promise<boolean> => {
    const actualViewName: string = await planningPage.getViewTitleName();
    const viewValidation: boolean = await commonFunctions.compareTwoValues(actualViewName, expectedViewName, `Process Name Assertion after Drill Through to ${expectedViewName}`);

    const currentUrl = planningPage.page.url();
    const contextId = extractContextId(currentUrl);
    const urlHasContextId: boolean = await commonFunctions.compareTwoValues(currentUrl.includes('contextId='), true, 'URL includes Context ID Assertion');
    const contextIdValidation: boolean = await commonFunctions.compareTwoValues(contextId.length > 1, true, 'Context ID Assertion, it should have some ID and its length should be greater than 1');

    scenarioName = await planningPage.getScenarioChipText();
    await planningPage.openComponent('Scenarios');
    const defaultScenarioExists = await scenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(scenarioName);
    await planningPage.closeDrawer();
    const scenarioValidation: boolean = await commonFunctions.compareTwoValues(defaultScenarioExists, true, `Checking if ${scenarioName} Scenario Matched`);

    const scopeValidation: boolean = await commonFunctions.compareTwoValues(await planningPage.isScopeAppliedInDrawer(testData.DIMENSIONS), true, `Is Scope applied for dimensions: ${JSON.stringify(testData.DIMENSIONS)}`);
    const columnValidation: boolean = await commonFunctions.compareTwoValues(await planningPage.isColumnsValidated(testData.CELL_VALUE), true, `Column validation for cell: ${testData.CELL_VALUE}`);
    const globalScopeChipValidation: boolean = await commonFunctions.compareTwoValues(await planningPage.isGlobalScopeChipDisplays("Preselected*"), true, 'Global Scope Chip is displayed');
    const scenarioChipValidation: boolean = await commonFunctions.compareTwoValues(await planningPage.isScenarioChipCorrect(scenarioName), true, `Scenario Chip displays ${scenarioName}`);

    const contextOverridePopupDisplayed = await planningPage.clickOnContextOverrideIcon();
    const breadcrumbsValid = await planningPage.validateBreadCrumbs(breadcrumbSource, breadcrumbTarget);
    const contextOverrideValidation: boolean = await commonFunctions.compareTwoValues(contextOverridePopupDisplayed, true, 'Clicked on Context Override Popup');
    const breadcrumbValidation: boolean = await commonFunctions.compareTwoValues(breadcrumbsValid, true, `Breadcrumb Displayed: ${breadcrumbSource} -> ${breadcrumbTarget}`);

    let ellipsesValidation = true;
    if (validateEllipses) {
      const ellipsesVisible = await planningPage.validateEllipsesInOverridePopup();
      ellipsesValidation = await commonFunctions.compareTwoValues(ellipsesVisible, true, 'Ellipses Displayed in Context Override Popup');
    }

    let clearValidation = true;
    let backButtonValidation = true;
    if (validateHiddenViewControls) {
      clearValidation = await commonFunctions.compareTwoValues(await planningPage.isClearDisplays(false), true, 'Is clear context button available');
      const isBackBtnExist = await planningPage.isBackBtnDisplayed();
      backButtonValidation = await commonFunctions.compareTwoValues(isBackBtnExist || clearValidation, true, 'Is back button or clear context displayed for hidden view');
    }

    await planningPage.closeContextOverridePopup();
    await commonFunctions.logMessage('INFO', `Drill through validation results - View: ${viewValidation}, URL Context ID: ${urlHasContextId}, Context ID Valid: ${contextIdValidation}, Scenario Validation: ${scenarioValidation}, Scope Validation: ${scopeValidation}, Column Validation: ${columnValidation}, Global Scope Chip Validation: ${globalScopeChipValidation}, Scenario Chip Validation: ${scenarioChipValidation}, Context Override Popup Validation: ${contextOverrideValidation}, Breadcrumb Validation: ${breadcrumbValidation}, Ellipses Validation: ${ellipsesValidation}, Clear Button Validation: ${clearValidation}, Back Button Validation: ${backButtonValidation}`);
    return viewValidation && urlHasContextId && contextIdValidation && scenarioValidation && scopeValidation && columnValidation && globalScopeChipValidation && scenarioChipValidation && contextOverrideValidation && breadcrumbValidation && ellipsesValidation && clearValidation && backButtonValidation;
  };

  test('Test case1 : verify data after one level drill through from ODM view', async ({ planningListingPage, planningPage, drillThroughPage, scenarioPage, commonFunctions, testUtil, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.PSLINK as string);
    await planningListingPage.launchContext("Process", testData.PROCESS_NAME);
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    await waitForViewName(planningPage, testData.VIEW_NAME);

    await drillThroughPage.performDrillThroughOnCardField(testData.CELL_VALUE, testData.ANOTHER_VIEW_NAME);
    await waitForViewName(planningPage, testData.ANOTHER_VIEW_NAME);

    const isValid = await validateDrillThroughState(planningPage, scenarioPage, commonFunctions, testData, testData.ANOTHER_VIEW_NAME, testData.VIEW_NAME, testData.ANOTHER_VIEW_NAME, false, false);
    expect(isValid).toBe(true);
  });

  test('Test Case2: Verify data after two level drill through from ODM view', async ({ planningPage, drillThroughPage, scenarioPage, commonFunctions, testData }) => {
    await drillThroughPage.performDrillThroughOnCardField(testData.CELL_VALUE, testData.TC1_DRILL_THROUGH_VIEW_TO);
    await waitForViewName(planningPage, testData.TC1_DRILL_THROUGH_VIEW_TO);

    const isValid = await validateDrillThroughState(planningPage, scenarioPage, commonFunctions, testData, testData.TC1_DRILL_THROUGH_VIEW_TO, testData.ANOTHER_VIEW_NAME, testData.TC1_DRILL_THROUGH_VIEW_TO, true, false);
    expect(isValid).toBe(true);
  });

  test('Case 3: Validate the breadcrumb navigation link to first level drill through view and source view', async ({ planningPage, commonFunctions, testData }) => {
    await commonFunctions.logMessage('INFO', 'Clicking on Breadcrumb link of first level drill through view');
    await planningPage.clickOnBreadCrumbLink(testData.ANOTHER_VIEW_NAME);
    await waitForViewName(planningPage, testData.ANOTHER_VIEW_NAME);

    const firstLevelViewName: string = await planningPage.getViewTitleName();
    const firstBreadcrumbValidation: boolean = await commonFunctions.compareTwoValues(firstLevelViewName, testData.ANOTHER_VIEW_NAME, `Process Name Assertion after clicking breadcrumb link to ${testData.ANOTHER_VIEW_NAME}`);

    const isContextOverridePopupDisplayed = await planningPage.clickOnContextOverrideIcon();
    await planningPage.clickOnBreadCrumbLink(testData.VIEW_NAME);
    await waitForViewName(planningPage, testData.VIEW_NAME);

    const sourceViewName: string = await planningPage.getViewTitleName();
    const sourceViewValidation: boolean = await commonFunctions.compareTwoValues(sourceViewName, testData.VIEW_NAME, `Process Name Assertion after clicking breadcrumb link to source view ${testData.VIEW_NAME}`);

    expect(firstBreadcrumbValidation && sourceViewValidation && isContextOverridePopupDisplayed).toBe(true);
  });

  test('Test Case4 : Validate drill through from ODM view to ODM hidden view', async ({ planningPage, drillThroughPage, scenarioPage, commonFunctions, testData }) => {
    await drillThroughPage.performDrillThroughOnCardField(testData.CELL_VALUE, testData.HIDDEN_VIEW1);
    await waitForViewName(planningPage, testData.HIDDEN_VIEW1);

    const isValid = await validateDrillThroughState(planningPage, scenarioPage, commonFunctions, testData, testData.HIDDEN_VIEW1, testData.VIEW_NAME, testData.HIDDEN_VIEW1, false, true);
    expect(isValid).toBe(true);
  });

  test('Test case 5: Validate 2nd level drill through from hidden view to hidden view', async ({ planningPage, drillThroughPage, scenarioPage, commonFunctions, testData }) => {
    await drillThroughPage.performDrillThroughOnCardField(testData.CELL_VALUE, testData.HIDDEN_VIEW2);
    await waitForViewName(planningPage, testData.HIDDEN_VIEW2);

    const isValid = await validateDrillThroughState(planningPage, scenarioPage, commonFunctions, testData, testData.HIDDEN_VIEW2, testData.HIDDEN_VIEW1, testData.HIDDEN_VIEW2, true, true);
    expect(isValid).toBe(true);
  });

  test('Test Case 6: Validate the breadcrumb navigation link to first level drill through view and source view', async ({ planningPage, commonFunctions, testData }) => {
    await planningPage.clickOnContextOverrideIcon();
    await commonFunctions.logMessage('INFO', 'Clicking on Breadcrumb link of first level drill through view');
    await planningPage.clickOnBreadCrumbLink(testData.HIDDEN_VIEW1);
    await waitForViewName(planningPage, testData.HIDDEN_VIEW1);

    const firstLevelViewName: string = await planningPage.getViewTitleName();
    const hiddenViewValidation: boolean = await commonFunctions.compareTwoValues(firstLevelViewName, testData.HIDDEN_VIEW1, `Process Name Assertion after clicking breadcrumb link to ${testData.HIDDEN_VIEW1}`);

    await planningPage.clickOnBreadCrumbLink(testData.VIEW_NAME);
    await waitForViewName(planningPage, testData.VIEW_NAME);

    const sourceViewName: string = await planningPage.getViewTitleName();
    const sourceViewValidation: boolean = await commonFunctions.compareTwoValues(sourceViewName, testData.VIEW_NAME, `Process Name Assertion after clicking breadcrumb link to source view ${testData.VIEW_NAME}`);

    expect(hiddenViewValidation && sourceViewValidation).toBe(true);
  });
});
