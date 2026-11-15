import { test, expect } from '../../../configs/fixtures';

const CARD_TITLE = 'Enhanced demo card';
const SOURCE_VIEW = 'enhanced table view';
const TARGET_VIEW = 'DR Destination';

test.describe.serial('Selected target view should be visible while doing on row drill through - Enhanced Card', () => {
  test.beforeAll(async ({ planningPage, drillThroughPage, commonFunctions, testUtil, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.selectViewByTypeAndName('Hidden Views', SOURCE_VIEW);
    await drillThroughPage.waitForViewName(SOURCE_VIEW);
    await commonFunctions.logMessage('INFO', `Opened source view ${SOURCE_VIEW}`);
  });

  test('Test Case 1: Arrow should be displayed for the row with matching cell name', async ({ planningPage, drillThroughPage, commonFunctions, testData }) => {
    await planningPage.openEditView();
    const editValidation = await commonFunctions.compareTwoValues(true, true, 'Clicked on edit icon in view');
    const conditionValidation = await commonFunctions.compareTwoValues(await drillThroughPage.setDrillThroughConditions(CARD_TITLE, true), true, 'Enabled drill-through condition in card settings');
    await planningPage.clickSaveView();
    const isRowArrowExists = await drillThroughPage.isRowArrowExists(testData.DRILL_THOROUGH_ON_CELLS[0]);
    const arrowValidation = await commonFunctions.compareTwoValues(isRowArrowExists, true, 'Is arrow button displayed');
    expect(editValidation && conditionValidation && arrowValidation).toBe(true);
  });

  test('Test Case 2: Arrow should not be displayed for row when condition not equals', async ({ drillThroughPage, commonFunctions, testData }) => {
    const isRowArrowExists = await drillThroughPage.isRowArrowExists(testData.DRILL_THOROUGH_ON_CELLS[1]);
    const arrowValidation = await commonFunctions.compareTwoValues(isRowArrowExists, false, 'Is arrow button displayed');
    expect(arrowValidation).toBe(true);
  });

  test('Test Case 3: Clicking on arrow button should navigate to drill through target view', async ({ planningPage, testUtil, drillThroughPage, commonFunctions, testData }) => {
    await drillThroughPage.onRowDrillThrough(testData.DRILL_THOROUGH_ON_CELLS[0]);
    await drillThroughPage.waitForViewName(TARGET_VIEW);
    const contextId = await drillThroughPage.waitForContextId();
    const contextValidation = await commonFunctions.compareTwoValues(contextId !== '', true, 'Context id should exist while drillthrough');
    const contextOverrideValidation = await commonFunctions.compareTwoValues(await planningPage.isContextOverrideDisplays(), true, 'Context Override button displays');
    const clearValidation = await commonFunctions.compareTwoValues(await planningPage.isClearDisplays(), true, 'Clear Button/Link displays');
    const viewName = await planningPage.getViewTitleName();
    const viewValidation = await commonFunctions.compareTwoValues(viewName, TARGET_VIEW, 'Checking two view names should be same');
    expect(contextValidation && contextOverrideValidation && clearValidation && viewValidation).toBe(true);
  });

  test('Test Case 4: After disabling condition toggle row not matching condition should display arrow', async ({ planningPage, testUtil, drillThroughPage, commonFunctions, testData }) => {
    await planningPage.clearContext();
    await planningPage.selectViewByTypeAndName('Hidden Views', SOURCE_VIEW);
    await drillThroughPage.waitForViewName(SOURCE_VIEW);
    await planningPage.openEditView();
    const editValidation = await commonFunctions.compareTwoValues(true, true, 'Clicked on edit icon in view');
    const conditionValidation = await commonFunctions.compareTwoValues(await drillThroughPage.setDrillThroughConditions(CARD_TITLE, false), true, 'Disabled drill-through condition in card settings');
    await planningPage.clickSaveView();
    const isRowArrowExists = await drillThroughPage.isRowArrowExists(testData.DRILL_THOROUGH_ON_CELLS[1]);
    const arrowValidation = await commonFunctions.compareTwoValues(isRowArrowExists, true, 'Is arrow button displayed');
    expect(editValidation && conditionValidation && arrowValidation).toBe(true);
  });

  test.afterAll(async ({ planningPage, testUtil }) => {
    await planningPage.saveViewIfEditing();
    await planningPage.selectViewByTypeAndName('All Views', "BDE");
  }); 

});