import { test, expect } from '../../../configs/fixtures';

const extractContextId = (url: string): string => {
  const urlParts = url.split('&');
  for (const part of urlParts) {
    if (part.includes('contextId=')) {
      return part.split('=')[1] || '';
    }
  }
  return '';
};

test.describe.serial('ODM - Drill Through from BDE to Maas Pivot', () => {
  
 test(`Test case 1: Verify the BDE Card is present in the view and interactive with the card.`, async ({ planningPage, scenarioPage, scopePage, odmPage, commonFunctions, testUtil, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.selectViewInPlanning(testData.VIEW_NAME1);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME1);

    const isCardNameValidated = await planningPage.verifyCardsInDashboard(testData.CARD_NAME1);
    const CardNameValidation = await commonFunctions.compareTwoValues(isCardNameValidated, true, `Card with name ${testData.CARD_NAME1} should be present in the dashboard`);

    const scenarioChipText = await planningPage.getScenarioChipText();
    const isScenarioChipMatched = scenarioChipText.includes(testData.DEFAULT_SCENARIO_NAME) || testData.DEFAULT_SCENARIO_NAME.includes(scenarioChipText);
    const scenarioChipValidation: boolean = await commonFunctions.compareTwoValues(isScenarioChipMatched, true, `Checking if ${testData.DEFAULT_SCENARIO_NAME} Scenario Matched`);
    await planningPage.openComponent('Scenarios');
    const defaultScenarioExists = await scenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(testData.DEFAULT_SCENARIO_NAME);
    const scenarioValidation: boolean = await commonFunctions.compareTwoValues(defaultScenarioExists, true, `Checking if ${testData.DEFAULT_SCENARIO_NAME} Scenario Matched`);
    await planningPage.closeDrawer();

    await planningPage.openComponent('Scope');
    let scopeInBothLocations = await planningPage.verifyScopeInBudgeAndVF(testData.FILTER_NAME);
    if (!scopeInBothLocations) {
      await commonFunctions.logMessage('INFO', `Scope did not match expected ${testData.FILTER_NAME}. Selecting the Scope from scope dropdown`);
      const isFilterSelected = await scopePage.searchFilter(testData.FILTER_NAME);
      await commonFunctions.compareTwoValues(isFilterSelected, true, `Selecting scope filter ${testData.FILTER_NAME} from dropdown`);
      await scopePage.clickOnApplyFiltersBtn();
      scopeInBothLocations = await planningPage.verifyScopeInBudgeAndVF(testData.FILTER_NAME);
    }
    const scopeValidation: boolean = await commonFunctions.compareTwoValues(scopeInBothLocations, true, `Scope name should be: ${testData.FILTER_NAME}`);
    await scopePage.waitForAppliedVFTitle(testData.FILTER_NAME);
    const scopeTitleAfterApply: string = await scopePage.getAppliedVFTitle();
    const scopeTitleValidation: boolean = await commonFunctions.compareTwoValues(scopeTitleAfterApply, testData.FILTER_NAME, `Scope Title Assertion, it should be ${testData.FILTER_NAME}`);
    const scopeFilterValues = await scopePage.validateScopeFilterValues(testData.SCOPE_FILTER_VALUES, 'in Scope');
    const scopeFilterValueValidation = await commonFunctions.compareTwoValues(scopeFilterValues, true, `Scope filter values should match after drill through`);
    await planningPage.closeDrawer();
   
    const isIconVisible = await odmPage.clickInteractiveDataStatusIcon();
    const interactiveIconValidation = await commonFunctions.compareTwoValues(isIconVisible, true, 'Interactive Data Status Icon should be visible on the interactive view');
    const isDataSyncDisplayed = await odmPage.verifyDataSyncStatusMessage(testData.DATA_SYNC_MESSAGE, 'Success');
    const dataSyncValidation = await commonFunctions.compareTwoValues(isDataSyncDisplayed, true, `"${testData.DATA_SYNC_MESSAGE}" text should be displayed`);
    const isCloseIconClicked = await odmPage.clickOnCloseDataSyncIcon();
    const CloseIconValidation = await commonFunctions.compareTwoValues(isCloseIconClicked, true, 'Click on Close Icon of Data Sync Message');
 
    expect(CardNameValidation && scenarioChipValidation && scenarioValidation && scopeValidation && scopeTitleValidation && scopeFilterValueValidation && interactiveIconValidation && dataSyncValidation && CloseIconValidation).toBeTruthy();
  });

  test(`Test case 2: Verify the drill through from BDE card to Maas Pivot and validate the Scope filter Name and Values after Drill Through.`, async ({ planningPage, drillThroughPage, scopePage, commonFunctions, testUtil, testData }) => {
    const isDrillThroughPerformed = await drillThroughPage.performDrillThroughOnBDECard(testData.CARD_NAME1);
    const drillThroughValidation = await commonFunctions.compareTwoValues(isDrillThroughPerformed, true, `BDE card drill through performed for: ${testData.CARD_NAME1}`);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME2);

    const currentUrl = planningPage.page.url();
    const contextId = extractContextId(currentUrl);
    const urlHasContextId: boolean = await commonFunctions.compareTwoValues(currentUrl.includes('contextId='), true, 'URL includes Context ID Assertion');
    const contextIdValidation: boolean = await commonFunctions.compareTwoValues(contextId.length > 1, true, 'Context ID Assertion, it should have some ID and its length should be greater than 1');

    const isCardNameValidated = await planningPage.verifyCardsInDashboard(testData.CARD_NAME2);
    const CardNameValidation = await commonFunctions.compareTwoValues(isCardNameValidated, true, `Card with name ${testData.CARD_NAME2} should be present in the dashboard`);

    await planningPage.openComponent('Scope');
    let scopeInBothLocations = await planningPage.verifyScopeInBudgeAndVF(testData.FILTER_NAME_AFTER_DT);
    const scopeValidation: boolean = await commonFunctions.compareTwoValues(scopeInBothLocations, true, `Scope name should be: ${testData.FILTER_NAME_AFTER_DT}`);
    await scopePage.waitForAppliedVFTitle(testData.FILTER_NAME_AFTER_DT);
    const scopeTitleAfterDrillThrough: string = await scopePage.getAppliedVFTitle();
    const scopeTitleValidation: boolean = await commonFunctions.compareTwoValues(scopeTitleAfterDrillThrough, testData.FILTER_NAME_AFTER_DT, `Scope Title Assertion after drill through, it should be ${testData.FILTER_NAME_AFTER_DT}`);
    const scopeFilterValuesAfterDT = await scopePage.validateScopeFilterValues(testData.SCOPE_FILTER_VALUES_AFTER_DT, 'after drill through');
    const scopeFilterValueValidationAfterDT = await commonFunctions.compareTwoValues(scopeFilterValuesAfterDT, true, `Scope filter values should match after drill through`);
    await planningPage.closeDrawer();

    expect(drillThroughValidation && urlHasContextId && contextIdValidation && CardNameValidation && scopeValidation && scopeTitleValidation && scopeFilterValueValidationAfterDT).toBeTruthy();
  });

  test(`Test case 3: Verify the context Overide icon, breadcrumb links and validate the Scope filter Name and Values after Clearing the context.`, async ({ planningPage, scopePage, commonFunctions, testData }) => {
    const contextOverridePopupDisplayed = await planningPage.clickOnContextOverrideIcon();
    const contextOverrideValidation: boolean = await commonFunctions.compareTwoValues(contextOverridePopupDisplayed, true, 'Clicked on Context Override Popup');
    const breadcrumbsValid = await planningPage.validateBreadCrumbs(testData.VIEW_NAME1, testData.VIEW_NAME2);
    const breadcrumbValidation: boolean = await commonFunctions.compareTwoValues(breadcrumbsValid, true, `Breadcrumb Displayed: ${testData.VIEW_NAME1} -> ${testData.VIEW_NAME2}`);
    await planningPage.closeContextOverridePopup();

    const isClearBtnDisplayed = await planningPage.isClearDisplays(true);
    const clearButtonValidation: boolean = await commonFunctions.compareTwoValues(isClearBtnDisplayed, true, 'Clear context button is available');
    const isClearClicked = await planningPage.clearContext();
    const clearButtonClickValidation: boolean = await commonFunctions.compareTwoValues(isClearClicked, true, 'Clicked on Clear context button');
    await planningPage.closeContextOverridePopup();

    await planningPage.openComponent('Scope');
    let filterNameAfterClearInBothLocations = await planningPage.verifyScopeInBudgeAndVF(testData.FILTER_NAME);
    const filterAfterClearValidation: boolean = await commonFunctions.compareTwoValues(filterNameAfterClearInBothLocations, true, `Scope name should be: ${testData.FILTER_NAME}`);
    await scopePage.waitForAppliedVFTitle(testData.FILTER_NAME);
    const scopeTitleAfterClear: string = await scopePage.getAppliedVFTitle();
    const scopeTitleValidationAfterClear: boolean = await commonFunctions.compareTwoValues(scopeTitleAfterClear, testData.FILTER_NAME, `Scope Title Assertion after clearing context, it should be ${testData.FILTER_NAME}`);
    const scopeFilterValuesAfterClear = await scopePage.validateScopeFilterValues(testData.SCOPE_FILTER_VALUES, 'after clearing context');
    const scopeFilterValueValidationAfterClear = await commonFunctions.compareTwoValues(scopeFilterValuesAfterClear, true, `Scope filter values should match after clearing context`);

    expect(contextOverrideValidation && breadcrumbValidation && clearButtonValidation && clearButtonClickValidation && filterAfterClearValidation && scopeTitleValidationAfterClear && scopeFilterValueValidationAfterClear).toBeTruthy();
  });

});