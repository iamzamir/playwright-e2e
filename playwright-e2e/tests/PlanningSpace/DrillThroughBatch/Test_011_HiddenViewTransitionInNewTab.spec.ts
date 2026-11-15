import { test, expect } from '../../../configs/fixtures';

/**
 * Drill-through cells come from testData.DRILL_THOROUGH_ON_CELLS as preferences only: `resolveDrillThroughCellValue`
 * falls back to any visible numeric pivot cell, so the spec checks navigation, not the measure values on the view.
 */
test.describe.serial('Transition of views in new tab on drill through', () => {
  test.describe.configure({ retries: 0 });
  test('Test Case 1: Transits from non hidden view to non hidden views on a new tab', async ({ planningPage, drillThroughPage, commonFunctions, testUtil, testData }) => {
    const preferredCell = testData.DRILL_THOROUGH_ON_CELLS[0];
    const sourceView = testData.NON_HIDDEN_VIEWS[0];
    const targetView = testData.NON_HIDDEN_VIEWS[1];

    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.selectViewByTypeAndName('All Views', sourceView);
    await drillThroughPage.waitForViewName(sourceView);

    // The preferred value is a hint; any visible numeric cell works when the shared view's data changes.
    const cellValue = await drillThroughPage.resolveDrillThroughCellValue([preferredCell]);
    await commonFunctions.logMessage('INFO', `Performing drill through on cell with value ${cellValue}`);
    const sourceUrl = await drillThroughPage.openDrillThroughInNewTab(cellValue, targetView);
    await drillThroughPage.waitForViewName(targetView);

    const isValid = await drillThroughPage.validateDrillThroughTransitionState(commonFunctions, {
      sourceUrl,
      expectedSelectedView: targetView,
      expectedBackButton: false,
      logPrefix: 'New-tab drill-through validation'
    });
    expect(isValid).toBe(true);
    await drillThroughPage.closeCurrentTabAndSwitchToWindow(0);
  });

  test('Test Case 2: Transits from non hidden views to hidden views on a new tab', async ({ planningPage, drillThroughPage, commonFunctions, testUtil, testData }) => {
    const preferredCell = testData.DRILL_THOROUGH_ON_CELLS[1];
    const sourceView = testData.NON_HIDDEN_VIEWS[1];
    const targetView = testData.HIDDEN_VIEWS[1];

    await testUtil.switchToSpecificWindow(0);
    planningPage.page = testUtil.page;
    drillThroughPage.page = testUtil.page;
    await planningPage.selectViewByTypeAndName('All Views', sourceView);
    await drillThroughPage.waitForViewName(sourceView);

    // The preferred value is a hint; any visible numeric cell works when the shared view's data changes.
    const cellValue = await drillThroughPage.resolveDrillThroughCellValue([preferredCell]);
    await commonFunctions.logMessage('INFO', `Performing drill through on cell with value ${cellValue}`);
    const sourceUrl = await drillThroughPage.openDrillThroughInNewTab(cellValue, targetView);
    planningPage.page = drillThroughPage.page;

    const isValid = await drillThroughPage.validateDrillThroughTransitionState(commonFunctions, {
      sourceUrl,
      expectedSelectedView: targetView,
      expectedBackButton: true,
      logPrefix: 'New-tab drill-through validation'
    });
    expect(isValid).toBe(true);
    await drillThroughPage.closeCurrentTabAndSwitchToWindow(0);
    planningPage.page = drillThroughPage.page;
  });

  test('Test Case 3: Transits from hidden view to non hidden view on a new tab', async ({ planningPage, drillThroughPage, commonFunctions, testUtil, testData }) => {
    const preferredCell = testData.DRILL_THOROUGH_ON_CELLS[2];
    const sourceView = testData.HIDDEN_VIEWS[0];
    const targetView = testData.NON_HIDDEN_VIEWS[1];

    await testUtil.switchToSpecificWindow(0);
    planningPage.page = testUtil.page;
    drillThroughPage.page = testUtil.page;
    await planningPage.selectViewByTypeAndName('Hidden Views', sourceView);
    await drillThroughPage.waitForViewName(sourceView);

    // The preferred value is a hint; any visible numeric cell works when the shared view's data changes.
    const cellValue = await drillThroughPage.resolveDrillThroughCellValue([preferredCell]);
    await commonFunctions.logMessage('INFO', `Performing drill through on cell with value ${cellValue}`);
    const sourceUrl = await drillThroughPage.openDrillThroughInNewTab(cellValue, targetView);
    planningPage.page = drillThroughPage.page;

    const isValid = await drillThroughPage.validateDrillThroughTransitionState(commonFunctions, {
      sourceUrl,
      expectedSelectedView: targetView,
      expectedBackButton: false,
      logPrefix: 'New-tab drill-through validation'
    });
    expect(isValid).toBe(true);
    await drillThroughPage.closeCurrentTabAndSwitchToWindow(0);
    planningPage.page = drillThroughPage.page;
  });

  test('Test Case 4: Transits from hidden view to hidden view on a new tab', async ({ planningPage, drillThroughPage, commonFunctions, testUtil, testData }) => {
    const preferredCell = testData.DRILL_THOROUGH_ON_CELLS[3];
    const sourceView = testData.HIDDEN_VIEWS[0];
    const targetView = testData.HIDDEN_VIEWS[1];

    await testUtil.switchToSpecificWindow(0);
    planningPage.page = testUtil.page;
    drillThroughPage.page = testUtil.page;
    await planningPage.selectViewByTypeAndName('Hidden Views', sourceView);
    await drillThroughPage.waitForViewName(sourceView);

    // The preferred value is a hint; any visible numeric cell works when the shared view's data changes.
    const cellValue = await drillThroughPage.resolveDrillThroughCellValue([preferredCell]);
    await commonFunctions.logMessage('INFO', `Performing drill through on cell with value ${cellValue}`);
    const sourceUrl = await drillThroughPage.openDrillThroughInNewTab(cellValue, targetView);
    planningPage.page = drillThroughPage.page;

    const isValid = await drillThroughPage.validateDrillThroughTransitionState(commonFunctions, {
      sourceUrl,
      expectedSelectedView: targetView,
      expectedBackButton: true,
      logPrefix: 'New-tab drill-through validation'
    });
    expect(isValid).toBe(true);
    await drillThroughPage.closeCurrentTabAndSwitchToWindow(0);
    planningPage.page = drillThroughPage.page;
  });

  test('Test Case 5: Pin SideNav and Transits from non hidden views to hidden views on a new tab and check back navigations', async ({ planningPage, drillThroughPage, commonFunctions, testUtil, testData }) => {
    const preferredCell = testData.DRILL_THOROUGH_ON_CELLS[1];
    const sourceView = testData.NON_HIDDEN_VIEWS[1];
    const targetView = testData.HIDDEN_VIEWS[1];

    await testUtil.switchToSpecificWindow(0);
    planningPage.page = testUtil.page;
    drillThroughPage.page = testUtil.page;

    await planningPage.selectViewByTypeAndName('All Views', sourceView);
    await drillThroughPage.waitForViewName(sourceView);
    await planningPage.waitForPlanningSpaceLoaderToDisappear().catch(() => {});

    // Pin the side nav drawer. The pin is one preference per user that leaks into every lane signed in as this user
    // (see ViewsBatch/Test_019_PinUnpinInPs), so this spec is numbered to run last in DrillThroughBatchA.
    await planningPage.openComponent('Scenarios');
    await planningPage.pinSideDrawer();
    const isScenariosDrawerOpened: boolean = await planningPage.isDrawerOpened('Scenarios');

    const isScenrioPanelPinned = await commonFunctions.compareTwoValues(
      isScenariosDrawerOpened,
      true,
      'Scenarios side panel should be open and pinned'
    );

    // The preferred value is a hint; any visible numeric cell works when the shared view's data changes.
    const cellValue = await drillThroughPage.resolveDrillThroughCellValue([preferredCell]);
    await commonFunctions.logMessage('INFO', `Performing drill through on cell with value ${cellValue}`);
    const sourceUrl = await drillThroughPage.openDrillThroughInNewTab(cellValue, targetView);
    planningPage.page = drillThroughPage.page;

    const isValid = await drillThroughPage.validateDrillThroughTransitionState(commonFunctions, {
      sourceUrl,
      expectedSelectedView: targetView,
      expectedBackButton: true,
      logPrefix: 'New-tab drill-through validation'
    });

    // Switch to a normal view
    await planningPage.selectViewByTypeAndName('All Views', testData.NON_HIDDEN_VIEWS[0]);
    // Switch to the hidden view again
    await planningPage.selectViewByTypeAndName('Hidden Views', testData.HIDDEN_VIEWS[0]);
    await planningPage.selectViewByTypeAndName('Hidden Views', testData.HIDDEN_VIEWS[1]);

    let currentView = await planningPage.getViewTitleName();
    const isCorrectViewRendered = await commonFunctions.compareTwoValues(
      currentView,
      testData.HIDDEN_VIEWS[1],
      'Should render 2nd hidden view'
    );

    // Click back button and validate the view is navigated to the previous view ie., HIDDEN_VIEWS[0]
    await planningPage.clickOnBackArrowOfHiddenView();
    currentView = await planningPage.getViewTitleName();
    const isBackNavigationToHiddenViewValid = await commonFunctions.compareTwoValues(
      currentView,
      testData.HIDDEN_VIEWS[0],
      'Should navigate to previous view ie., HIDDEN_VIEWS[0] on click of back button'
    );

    // Click back button and validate the view is navigated to the previous view ie., NON_HIDDEN_VIEWS[0]
    await planningPage.clickOnBackArrowOfHiddenView();
    currentView = await planningPage.getViewTitleName();
    const isBackNavigationToNonHiddenViewValid = await commonFunctions.compareTwoValues(
      currentView,
      testData.NON_HIDDEN_VIEWS[0],
      'Should navigate to previous view ie., NON_HIDDEN_VIEWS[0] on click of back button'
    );
    // Unpin the side nav drawer
    await planningPage.unpinSideDrawer();
    await planningPage.closeDrawer();
    await drillThroughPage.closeCurrentTabAndSwitchToWindow(0);
    planningPage.page = drillThroughPage.page;

    // Single assertion at the end so all steps and cleanup run first;
    // each compareTwoValues call already logs which specific check failed.
    expect(
      isScenrioPanelPinned &&
      isValid &&
      isCorrectViewRendered &&
      isBackNavigationToHiddenViewValid &&
      isBackNavigationToNonHiddenViewValid
    ).toBe(true);
  });

  test.afterAll(async ({ planningPage, drillThroughPage, testUtil, testData }) => {
    try {
      const context = testUtil.page.context();
      const pages = context.pages();
      for (let i = pages.length - 1; i >= 1; i--) {
        await pages[i].close().catch(() => {});
      }
      await testUtil.switchToSpecificWindow(0);
      planningPage.page = testUtil.page;
      drillThroughPage.page = testUtil.page;
      await planningPage.unpinSideDrawer().catch(() => {});
      await planningPage.closeDrawer().catch(() => {});
      await planningPage.selectViewByTypeAndName('All Views', testData.NON_HIDDEN_VIEWS[0]).catch(() => {});
    } catch (error) {
      console.warn('Error during afterAll cleanup:', error);
    }
  });
});
