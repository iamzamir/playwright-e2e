import { test, expect } from '../../../configs/fixtures';
import { PlanningPage } from '../../../pageobjects/planning.page';
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

const resolveDrillThroughCellValue = async (
  planningPage: PlanningPage,
  commonFunctions: CommonFunctions,
  primaryCellValue: string,
  fallbackCellValues: string[]
): Promise<string> => {
  const candidateValues = [primaryCellValue, ...fallbackCellValues].filter((value, index, arr) => value && arr.indexOf(value) === index);

  for (const candidateValue of candidateValues) {
    const isAvailable = await planningPage.isColumnsValidated(candidateValue, 5000).catch(() => false);
    await commonFunctions.logMessage('INFO', `Drill-through candidate ${candidateValue} available: ${isAvailable}`);
    if (isAvailable) {
      return candidateValue;
    }
  }

  throw new Error(`No drill-through candidate cell values are available: ${candidateValues.join(', ')}`);
};

test.describe.serial('Context Override popup and breadcrumb navigation', () => {
  test('Case 1: Validate Context Override popup and their Breadcrumbs labels in same Tab after First level Drill through.', async ({ planningPage, drillThroughPage, commonFunctions, testUtil, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.selectViewByTypeAndName('All Views', testData.SAME_TAB.NORMAL_VIEW_1);

    await commonFunctions.logMessage('INFO', `Performing drill through on cell ${testData.DRILL_THROUGH_CELL_VALUE} to ${testData.SAME_TAB.HIDDEN_VIEW_1}`);
    await drillThroughPage.performDrillThroughOnCardField(testData.DRILL_THROUGH_CELL_VALUE, testData.SAME_TAB.HIDDEN_VIEW_1);
    await drillThroughPage.waitForViewName(testData.SAME_TAB.HIDDEN_VIEW_1);
    let sCurrentUrl: string = planningPage.page.url();
    await commonFunctions.logMessage('INFO', `current url is ${sCurrentUrl}`);
    const sContextID: string = extractContextId(sCurrentUrl);
    await commonFunctions.logMessage('INFO', `context id is  ${sContextID}`);

    const ContextIdVal: boolean = await commonFunctions.compareTwoValues(sCurrentUrl.includes('contextId='), true, 'URL includes Context ID Assertion');
    const ContextIdLength: boolean = await commonFunctions.compareTwoValues(sContextID.length > 1, true, 'Context ID Assertion, it should have some ID and its length should be greater than 1');
    const isContextOverridePopupDisplayed = await planningPage.clickOnContextOverrideIcon();
    const isvalidationOfBreadCrumb = await planningPage.validateBreadCrumbs(testData.SAME_TAB.NORMAL_VIEW_1, testData.SAME_TAB.HIDDEN_VIEW_1);
    const validateContextOverridePopup = await commonFunctions.compareTwoValues(isContextOverridePopupDisplayed, true, 'Clicked on Context Override Popup');
    const validationOfBreadCrumb = await commonFunctions.compareTwoValues(isvalidationOfBreadCrumb, true, `Breadcrumb Displayed: ${testData.SAME_TAB.NORMAL_VIEW_1} -> ${testData.SAME_TAB.HIDDEN_VIEW_1}`);
    await planningPage.closeContextOverridePopup();
    expect(ContextIdVal && ContextIdLength && validateContextOverridePopup && validationOfBreadCrumb).toBeTruthy();
  });

  test('Case 2: Validate the Context Override popup and their Breadcrumbs labels in same Tab after Second Level Drill Through', async ({ planningPage, drillThroughPage, commonFunctions, testUtil, testData }) => {
    const selectedCellValue = await resolveDrillThroughCellValue(planningPage, commonFunctions, '100', ['110', '90', '102']);
    await commonFunctions.logMessage('INFO', `Performing drill through on cell ${selectedCellValue} to ${testData.SAME_TAB.NORMAL_VIEW_2}`);
    await drillThroughPage.performDrillThroughOnCardField(selectedCellValue, testData.SAME_TAB.NORMAL_VIEW_2);

    let sCurrentUrl: string = planningPage.page.url();
    await commonFunctions.logMessage('INFO', `current url is ${sCurrentUrl}`);
    const sContextID: string = extractContextId(sCurrentUrl);
    await commonFunctions.logMessage('INFO', `context id is  ${sContextID}`);

    const ContextIdVal: boolean = await commonFunctions.compareTwoValues(sCurrentUrl.includes('contextId='), true, 'URL includes Context ID Assertion');
    const ContextIdLength: boolean = await commonFunctions.compareTwoValues(sContextID.length > 1, true, 'Context ID Assertion, it should have some ID and its length should be greater than 1');
    const isContextOverridePopupDisplayed = await planningPage.clickOnContextOverrideIcon();
    const isvalidationOfBreadCrumb = await planningPage.validateBreadCrumbs(testData.SAME_TAB.HIDDEN_VIEW_1, testData.SAME_TAB.NORMAL_VIEW_2);
    const isvalidationOfEllipses = await planningPage.validateEllipsesInOverridePopup();
    const validateContextOverridePopup = await commonFunctions.compareTwoValues(isContextOverridePopupDisplayed, true, 'Clicked on Context Override Popup');
    const validationOfBreadCrumb = await commonFunctions.compareTwoValues(isvalidationOfBreadCrumb, true, `Breadcrumb Displayed: ${testData.SAME_TAB.HIDDEN_VIEW_1} -> ${testData.SAME_TAB.NORMAL_VIEW_2}`);
    const validationOfEllipses = await commonFunctions.compareTwoValues(isvalidationOfEllipses, true, 'Ellipses is displayed in Context Override Popup');
    expect(ContextIdVal && ContextIdLength && validateContextOverridePopup && validationOfBreadCrumb && validationOfEllipses).toBeTruthy();
  });

  test('Case 3: Validate the breadcrumb navigation link to Hidden View and Back Arrow Icon to Normal View', async ({ planningPage, commonFunctions, testData, testUtil }) => {
    await commonFunctions.logMessage('INFO', 'Clicking on Breadcrumb link and Back Arrow Icon');
    await planningPage.clickOnBreadCrumbLink(testData.SAME_TAB.HIDDEN_VIEW_1);
    await planningPage.closeContextOverridePopup();
    await planningPage.clickOnBackArrowOfHiddenView();
    let validationOfNavigation = await commonFunctions.compareTwoValues(await planningPage.isNavigatedToView(testData.SAME_TAB.NORMAL_VIEW_1), true, `Navigated back to ${testData.SAME_TAB.NORMAL_VIEW_1} using breadcrumb link and back arrow`);
    expect(validationOfNavigation).toBeTruthy();
  });

  test('Case 4: Validate Context Override popup and their Breadcrumbs labels in New Tab after First level Drill through.', async ({ planningPage, drillThroughPage, commonFunctions, testUtil, testData }) => {
    await planningPage.selectViewByTypeAndName('All Views', testData.NEW_TAB.NORMAL_VIEW_1);
    const selectedCellValue = await resolveDrillThroughCellValue(planningPage, commonFunctions, '51', ['62', '43', '47']);
    await commonFunctions.logMessage('INFO', `Performing drill through on cell ${selectedCellValue} to ${testData.NEW_TAB.HIDDEN_VIEW_1}`);
    await drillThroughPage.performDrillThroughOnCardField(selectedCellValue, testData.NEW_TAB.HIDDEN_VIEW_1);
    await testUtil.switchToSpecificWindow(1);
    planningPage.page = testUtil.page;
    drillThroughPage.page = testUtil.page;

    let sCurrentUrl: string = planningPage.page.url();
    await commonFunctions.logMessage('INFO', `current url is ${sCurrentUrl}`);
    const sContextID: string = extractContextId(sCurrentUrl);
    await commonFunctions.logMessage('INFO', `context id is  ${sContextID}`);

    const ContextIdVal: boolean = await commonFunctions.compareTwoValues(sCurrentUrl.includes('contextId='), true, 'URL includes Context ID Assertion');
    const ContextIdLength: boolean = await commonFunctions.compareTwoValues(sContextID.length > 1, true, 'Context ID Assertion, it should have some ID and its length should be greater than 1');
    const isContextOverridePopupDisplayed = await planningPage.clickOnContextOverrideIcon();
    const isvalidationOfBreadCrumb = await planningPage.validateBreadCrumbs(testData.NEW_TAB.NORMAL_VIEW_1, testData.NEW_TAB.HIDDEN_VIEW_1);
    const validateContextOverridePopup = await commonFunctions.compareTwoValues(isContextOverridePopupDisplayed, true, 'Clicked on Context Override Popup');
    const validationOfBreadCrumb = await commonFunctions.compareTwoValues(isvalidationOfBreadCrumb, true, `Breadcrumb Displayed: ${testData.NEW_TAB.NORMAL_VIEW_1} -> ${testData.NEW_TAB.HIDDEN_VIEW_1}`);
    await planningPage.closeContextOverridePopup();
    expect(ContextIdVal && ContextIdLength && validateContextOverridePopup && validationOfBreadCrumb).toBeTruthy();
  });

  test('Case 5: Validate the Context Override popup and their Breadcrumbs labels in New Tab after Second Level Drill Through', async ({ planningPage, drillThroughPage, commonFunctions, testUtil, testData }) => {
    await testUtil.switchToSpecificWindow(1);
    planningPage.page = testUtil.page;
    drillThroughPage.page = testUtil.page;
    const selectedCellValue = await resolveDrillThroughCellValue(planningPage, commonFunctions, '90', ['100', '110', '102']);
    await commonFunctions.logMessage('INFO', `Performing drill through on cell ${selectedCellValue} to ${testData.NEW_TAB.NORMAL_VIEW_2}`);
    await drillThroughPage.performDrillThroughOnCardField(selectedCellValue, testData.NEW_TAB.NORMAL_VIEW_2);
    await testUtil.switchToSpecificWindow(2);
    planningPage.page = testUtil.page;
    drillThroughPage.page = testUtil.page;

    let sCurrentUrl: string = planningPage.page.url();
    await commonFunctions.logMessage('INFO', `current url is ${sCurrentUrl}`);
    const sContextID: string = extractContextId(sCurrentUrl);
    await commonFunctions.logMessage('INFO', `context id is  ${sContextID}`);

    const ContextIdVal: boolean = await commonFunctions.compareTwoValues(sCurrentUrl.includes('contextId='), true, 'URL includes Context ID Assertion');
    const ContextIdLength: boolean = await commonFunctions.compareTwoValues(sContextID.length > 1, true, 'Context ID Assertion, it should have some ID and its length should be greater than 1');
    const isContextOverridePopupDisplayed = await planningPage.clickOnContextOverrideIcon();
    const isvalidationOfBreadCrumb = await planningPage.validateBreadCrumbs(testData.NEW_TAB.HIDDEN_VIEW_1, testData.NEW_TAB.NORMAL_VIEW_2);
    const isvalidationOfEllipses = await planningPage.validateEllipsesInOverridePopup();
    const validateContextOverridePopup = await commonFunctions.compareTwoValues(isContextOverridePopupDisplayed, true, 'Clicked on Context Override Popup');
    const validationOfBreadCrumb = await commonFunctions.compareTwoValues(isvalidationOfBreadCrumb, true, `Breadcrumb Displayed: ${testData.NEW_TAB.HIDDEN_VIEW_1} -> ${testData.NEW_TAB.NORMAL_VIEW_2}`);
    const validationOfEllipses = await commonFunctions.compareTwoValues(isvalidationOfEllipses, true, 'Ellipses is displayed in Context Override Popup');
    expect(ContextIdVal && ContextIdLength && validateContextOverridePopup && validationOfBreadCrumb && validationOfEllipses).toBeTruthy();
  });

  test('Case 6: Validate the breadcrumb navigation link to Hidden View and Back Arrow Icon to Normal View', async ({ planningPage, commonFunctions, testData, testUtil, drillThroughPage }) => {
    await commonFunctions.logMessage('INFO', 'Clicking on Breadcrumb link and Back Arrow Icon');
    await testUtil.switchToSpecificWindow(2);
    planningPage.page = testUtil.page;
    drillThroughPage.page = testUtil.page;
    await planningPage.clickOnContextOverrideIcon();
    await planningPage.clickOnBreadCrumbLink(testData.NEW_TAB.HIDDEN_VIEW_1);
    await planningPage.closeContextOverridePopup();
    let validationOfNavigation = await commonFunctions.compareTwoValues(await planningPage.isNavigatedToView(testData.NEW_TAB.HIDDEN_VIEW_1), true, `Navigated back to ${testData.NEW_TAB.HIDDEN_VIEW_1} using breadcrumb link`);
    await planningPage.clickOnBackArrowOfHiddenView();
    validationOfNavigation = validationOfNavigation && await commonFunctions.compareTwoValues(await planningPage.isNavigatedToView(testData.NEW_TAB.NORMAL_VIEW_1), true, `Navigated back to ${testData.NEW_TAB.NORMAL_VIEW_1} using back arrow`);
    expect(validationOfNavigation).toBeTruthy();
  });
});
