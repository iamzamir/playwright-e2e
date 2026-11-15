import { test, expect } from '../../../configs/fixtures';

/**
 * Cell values are preferences, not requirements: `resolveDrillThroughCellValue` falls back to any numeric pivot cell,
 * because the views' data, filter and pivot change between nights and this spec only checks the view transition.
 */
test.describe.serial('Transition of views in same tab on drill through', () => {
  test.describe.configure({ retries: 0 });
  test('Test Case 1: Transits from non hidden view to non hidden views', async ({ planningPage, drillThroughPage, commonFunctions, testUtil, testData }) => {
    const cellValue: string = testData.DRILL_THOROUGH_ON_CELLS[0];
    const sourceView = testData.NON_HIDDEN_VIEWS[0];
    const targetView = testData.NON_HIDDEN_VIEWS[1];

    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.selectViewByTypeAndName('All Views', sourceView);
    await drillThroughPage.waitForViewName(sourceView);

    const sourceUrl = planningPage.page.url();
    const selectedCellValue = await drillThroughPage.resolveDrillThroughCellValue([cellValue]);
    await commonFunctions.logMessage('INFO', `Performing drill through on cell with value ${selectedCellValue}`);
    await drillThroughPage.performDrillThroughOnCardField(selectedCellValue, targetView);

    await drillThroughPage.waitForViewName(targetView);
    const isValid = await drillThroughPage.validateDrillThroughTransitionState(commonFunctions, {
      sourceUrl,
      sourceViewName: sourceView,
      targetViewName: targetView,
      expectedSelectedView: targetView,
      expectedBackButton: false,
      compareViewNameWhenViewIdMissing: true,
      clearContextAfterValidation: true
    });
    expect(isValid).toBe(true);
  });

  test('Test Case 2: Transits from non hidden views to hidden views', async ({ planningPage, drillThroughPage, commonFunctions, testData }) => {
    const cellValue: string = testData.DRILL_THOROUGH_ON_CELLS[1];
    const fallbackCellValues: string[] = testData.DRILL_THOROUGH_ON_CELLS_FALLBACK ?? [];
    const sourceView = testData.NON_HIDDEN_VIEWS[1];
    const targetView = testData.HIDDEN_VIEWS[1];
    await planningPage.selectViewByTypeAndName('All Views', sourceView);
    await drillThroughPage.waitForViewName(sourceView);

    const sourceUrl = planningPage.page.url();
    // Toggle the card first: it re-renders the grid, so a cell found before the toggle may be gone after it.
    await planningPage.toggleMinimizeIcon();
    const selectedCellValue = await drillThroughPage.resolveDrillThroughCellValue([cellValue, ...fallbackCellValues]);
    await commonFunctions.logMessage('INFO', `Performing drill through on cell with value ${selectedCellValue}`);
    await drillThroughPage.performDrillThroughOnCardField(selectedCellValue, targetView);

    await drillThroughPage.waitForViewName(targetView);
    const isValid = await drillThroughPage.validateDrillThroughTransitionState(commonFunctions, {
      sourceUrl,
      sourceViewName: sourceView,
      targetViewName: targetView,
      expectedSelectedView: targetView,
      expectedBackButton: true,
      compareViewNameWhenViewIdMissing: true,
      clearContextAfterValidation: true
    });
    expect(isValid).toBe(true);
  });

  test('Test Case 3: Transits from hidden view to hidden view', async ({ planningPage, drillThroughPage, commonFunctions, testData }) => {
    const cellValue: string = testData.DRILL_THOROUGH_ON_CELLS[2];
    const sourceView = testData.HIDDEN_VIEWS[0];
    const targetView = testData.HIDDEN_VIEWS[1];

    await planningPage.selectViewByTypeAndName('Hidden Views', sourceView);
    await drillThroughPage.waitForViewName(sourceView);

    const sourceUrl = planningPage.page.url();
    const selectedCellValue = await drillThroughPage.resolveDrillThroughCellValue([cellValue]);
    await commonFunctions.logMessage('INFO', `Performing drill through on cell with value ${selectedCellValue}`);
    await drillThroughPage.performDrillThroughOnCardField(selectedCellValue, targetView);

    await drillThroughPage.waitForViewName(targetView);
    const isValid = await drillThroughPage.validateDrillThroughTransitionState(commonFunctions, {
      sourceUrl,
      sourceViewName: sourceView,
      targetViewName: targetView,
      expectedSelectedView: targetView,
      expectedBackButton: true,
      compareViewNameWhenViewIdMissing: true,
      clearContextAfterValidation: true
    });
    expect(isValid).toBe(true);
  });

  test('Test Case 4: Transits from hidden view to non hidden views', async ({ planningPage, drillThroughPage, commonFunctions, testData }) => {
    const cellValue: string = testData.DRILL_THOROUGH_ON_CELLS[3];
    const sourceView = testData.HIDDEN_VIEWS[0];
    const targetView = testData.NON_HIDDEN_VIEWS[1];

    await planningPage.selectViewByTypeAndName('Hidden Views', sourceView);
    await drillThroughPage.waitForViewName(sourceView);

    const sourceUrl = planningPage.page.url();
    const selectedCellValue = await drillThroughPage.resolveDrillThroughCellValue([cellValue]);
    await commonFunctions.logMessage('INFO', `Performing drill through on cell with value ${selectedCellValue}`);
    await drillThroughPage.performDrillThroughOnCardField(selectedCellValue, targetView);

    await drillThroughPage.waitForViewName(targetView);
    const isValid = await drillThroughPage.validateDrillThroughTransitionState(commonFunctions, {
      sourceUrl,
      sourceViewName: sourceView,
      targetViewName: targetView,
      expectedSelectedView: targetView,
      expectedBackButton: false,
      compareViewNameWhenViewIdMissing: true,
      clearContextAfterValidation: true
    });
    expect(isValid).toBe(true);
  });

  test.afterAll(async ({ planningPage, testData }) => {
    await planningPage.selectViewByTypeAndName('All Views', testData.NON_HIDDEN_VIEWS[0]);
  });

});
