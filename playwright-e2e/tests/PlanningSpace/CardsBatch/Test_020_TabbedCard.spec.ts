import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Tabbed Card Test', () => {
  test.beforeAll(async ({ testUtil, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);
  });

  test('Test Case 1: Selection of card should work from tabbed card', async ({ planningPage, cardsPage, commonFunctions, testData }) => {
    const sourceView = testData.TC1_DRILL_THROUGH_VIEW_FROM as string;
    await planningPage.selectViewByTypeAndName("All Views", sourceView);
    const selectedViewValidation = await commonFunctions.compareTwoValues(await planningPage.getViewTitleName(), sourceView, `View ${sourceView} selected assertion`);
    await cardsPage.selectCardInTabbedCard('Maas Chart');
    const iconCountForMaasChart = await cardsPage.getCountOfMaasChartIcons();
    const maasChartValidation = await commonFunctions.compareTwoValues(iconCountForMaasChart > 1, true, 'Icons found for maas chart card assertion');
    await cardsPage.selectCardInTabbedCard('Maas Pivot');
    const iconCountForMaasPivot = await cardsPage.getCountOfMaasPivotIcons();
    const maasPivotValidation = await commonFunctions.compareTwoValues(iconCountForMaasPivot >= 3, true, 'Icons found for maas pivot card assertion');
    expect(selectedViewValidation && maasChartValidation && maasPivotValidation).toBeTruthy();
  });

  test('Test Case 2: Card to view communication (drill through) should work for card inside tabbed card', async ({ planningPage, drillThroughPage, commonFunctions, testData }) => {
    const targetView = testData.TC2_DRILL_THROUGH_VIEW_TO as string;
    const cellValue = testData.TC2_DRILL_THROUGH_CELL as string;
    await drillThroughPage.openDrillThroughInNewTab(cellValue, targetView);
    planningPage.page = drillThroughPage.page;
    await drillThroughPage.waitForViewName(targetView);
    const actualViewName = await planningPage.getViewTitleName();
    const viewValidation = await commonFunctions.compareTwoValues(actualViewName, targetView, `Process name assertion after drill through to ${targetView}`);
    const selectedViewValidation = await commonFunctions.compareTwoValues(await planningPage.isNavigatedToView(targetView), true, `${targetView} view selected assertion`);
    const currentUrl = planningPage.page.url();
    await commonFunctions.logMessage('INFO', `Current URL is ${currentUrl}`);
    const urlIncludesContextId = await commonFunctions.compareTwoValues(currentUrl.includes('contextId='), true, 'URL includes context ID assertion');
    const contextOverrideValidation = await commonFunctions.compareTwoValues(await planningPage.isContextOverrideDisplays(), true, 'Context Override button displays assertion');
    const clearButtonValidation = await commonFunctions.compareTwoValues(await planningPage.isClearDisplays(), true, 'Clear button/link displays assertion');
    expect(viewValidation && selectedViewValidation && urlIncludesContextId && contextOverrideValidation && clearButtonValidation).toBeTruthy();
    await drillThroughPage.closeCurrentTabAndSwitchToWindow(0);
    planningPage.page = drillThroughPage.page;
  });
});
