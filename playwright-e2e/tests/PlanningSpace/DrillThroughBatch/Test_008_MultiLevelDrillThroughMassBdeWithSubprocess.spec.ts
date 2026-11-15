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

test.describe.serial('Multilevel Drill Through Maas Pivot To BDE and BDE To Maas Chart - Subprocess', () => {
  let scenarioName = '';

  test.beforeAll(async ({ testUtil, testData, planningListingPage, page }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.PSLINK as string);
    await planningListingPage.launchContext('Subprocess', testData.PROCESS_NAME, testData.SUBPROCESS_NAME);
    await page.waitForTimeout(5000); // Wait for the subprocess to load
  });

  test('Test Case 1: First Level Drill Through From Source to Target(Mass Pivot to BDE card)', async ({ planningPage, drillThroughPage, scenarioPage, commonFunctions, testUtil, testData }) => {
    const sourceView = testData.TC1_DRILL_THROUGH_VIEW_FROM;
    const targetView = testData.TC1_DRILL_THROUGH_VIEW_TO;

    await planningPage.selectViewInPlanning(sourceView);
    await drillThroughPage.waitForViewName(sourceView);
    const viewFound = await commonFunctions.compareTwoValues(true, true, `View ${sourceView} Found Assertion`);

    // Planning Space logs the drill-through context it saves; the target's Scope drawer must show its members.
    const drillScope = drillThroughPage.captureDrillThroughScope();

    await planningPage.toggleMinimizeIcon();
    const selectedCellValue = await drillThroughPage.resolveDrillThroughCellValue([]);
    await drillThroughPage.performDrillThroughOnCardField(selectedCellValue, targetView);
    const expectedScope = await drillScope.wait();
    await testUtil.switchToSpecificWindow(1);
    planningPage.page = testUtil.page;
    scenarioPage.page = testUtil.page;
    drillThroughPage.page = testUtil.page;

    // await drillThroughPage.waitForViewName(targetView);
    const actualViewName = await planningPage.getViewTitleName();
    const viewNameValidation = await commonFunctions.compareTwoValues(actualViewName, targetView, `Process Name Assertion after Drill Through to ${targetView}`);
    
    const currentUrl = planningPage.page.url();
    await commonFunctions.logMessage('INFO', `current url is ${currentUrl}`);
    const contextId = extractContextId(currentUrl);
    await commonFunctions.logMessage('INFO', `context id is ${contextId}`);
    const urlHasContext = await commonFunctions.compareTwoValues(currentUrl.includes('contextId='), true, 'URL includes Context ID Assertion');
    const contextIdValid = await commonFunctions.compareTwoValues(contextId.length > 1, true, 'Context ID Assertion, it should have some ID and its length should be greated than 1');

    scenarioName = await planningPage.getScenarioChipText();
    await planningPage.openComponent('Scenarios');
    const isScenarioMatched = await commonFunctions.compareTwoValues(
      await scenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(scenarioName),
      true,
      `Checking if ${scenarioName} Scenario Matched`
    );
    await planningPage.closeDrawer();

    const scopeValidation = await commonFunctions.compareTwoValues(
      expectedScope ? await planningPage.isScopeAppliedInDrawer(expectedScope) : false,
      true,
      `Is Scope applied for the drilled members: ${JSON.stringify(expectedScope)}`
    );

    const globalScopeChip = await commonFunctions.compareTwoValues(
      await planningPage.isGlobalScopeChipDisplays(),
      true,
      'Global Scope Chip is displayed'
    );

    const scenarioChipValidation = await commonFunctions.compareTwoValues(
      await planningPage.isScenarioChipCorrect(scenarioName),
      true,
      `Scenario Chip displays ${scenarioName}`
    );

    const contextOverrideValidation = await commonFunctions.compareTwoValues(await planningPage.isContextOverrideDisplays(), true, 'Context Override button Displays Assertion');
    const clearValidation = await commonFunctions.compareTwoValues(await planningPage.isClearDisplays(), true, 'Clear Button/Link Displays Assertion');

    // Verify BDE table or element is present in target view
    const columnValidation = await commonFunctions.compareTwoValues(
      await planningPage.isBDEElementPresent(testData.BDE_CARD_DATA),
      true,
      `Column validation for cell: ${testData.BDE_CARD_DATA}`
    );

    expect(
      viewFound &&
      viewNameValidation &&
      urlHasContext &&
      contextIdValid &&
      contextOverrideValidation &&
      clearValidation &&
      isScenarioMatched &&
      scopeValidation &&
      globalScopeChip &&
      scenarioChipValidation &&
      columnValidation
    ).toBe(true);
  });

  test('Test Case2 :On BDE Card row click navigate to new window on Mass chart card', async ({ planningPage, drillThroughPage, scenarioPage, commonFunctions, testUtil, testData }) => {
    await testUtil.switchToSpecificWindow(1);
    planningPage.page = testUtil.page;
    scenarioPage.page = testUtil.page;
    drillThroughPage.page = testUtil.page;

    const dimensions = await planningPage.getRowDimensionsForBDECard(1);
    await commonFunctions.logMessage('INFO', `Row dimensions to be clicked: ${JSON.stringify(dimensions)}`);

    const drillThroughClicked = await drillThroughPage.performDrillThroughOnBDECard(testData.CARD_NAME);
    await commonFunctions.compareTwoValues(drillThroughClicked, true, 'Clicked on BDE table row chevron');

    await testUtil.switchToSpecificWindow(2);
    planningPage.page = testUtil.page;
    scenarioPage.page = testUtil.page;
    drillThroughPage.page = testUtil.page;

    const actualViewName = await planningPage.getViewTitleName();
    const isViewNameCorrect = await commonFunctions.compareTwoValues(actualViewName, testData.VIEW_NAME1, `Process Name Assertion after Drill Through to ${testData.VIEW_NAME1}`);

    const currentUrl = planningPage.page.url();
    await commonFunctions.logMessage('INFO', `Current URL is ${currentUrl}`);
    const contextId = extractContextId(currentUrl);
    await commonFunctions.logMessage('INFO', `Context ID is ${contextId}`);
    const isContextIdInUrl = await commonFunctions.compareTwoValues(currentUrl.includes('contextId='), true, 'URL includes Context ID Assertion');
    const isContextIdValid = await commonFunctions.compareTwoValues(contextId.length > 1, true, 'Context ID Assertion - It should have a valid ID');

    const isContextOverrideDisplayed = await commonFunctions.compareTwoValues(await planningPage.isContextOverrideDisplays(), true, 'Context Override Button Displays Assertion');
    const isClearButtonDisplayed = await commonFunctions.compareTwoValues(await planningPage.isClearDisplays(), true, 'Clear Button/Link Displays Assertion');
    scenarioName = await planningPage.getScenarioChipText();
    await planningPage.openComponent('Scenarios');
    const isScenarioMatched = await commonFunctions.compareTwoValues(
      await scenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(scenarioName),
      true,
      `Checking if ${scenarioName} Scenario Matched`
    );
    await planningPage.closeDrawer();

    const scopeValidation = await commonFunctions.compareTwoValues(
      await planningPage.isScopeAppliedInDrawer(dimensions),
      true,
      `Is Scope applied for dimensions: ${JSON.stringify(dimensions)}`
    );

    const globalScopeChip = await commonFunctions.compareTwoValues(
      await planningPage.isGlobalScopeChipDisplays(),
      true,
      'Global Scope Chip is displayed'
    );

    const scenarioChipValidation = await commonFunctions.compareTwoValues(
      await planningPage.isScenarioChipCorrect(scenarioName),
      true,
      `Scenario Chip displays ${scenarioName}`
    );

    expect(
      isViewNameCorrect &&
      isContextIdInUrl &&
      isContextIdValid &&
      isContextOverrideDisplayed &&
      isClearButtonDisplayed &&
      isScenarioMatched &&
      scopeValidation &&
      globalScopeChip &&
      scenarioChipValidation
    ).toBe(true);
  });

  test.afterAll(async ({ testUtil }) => {
    try {
      const allPages = testUtil.page.context().pages();
      for (let i = allPages.length - 1; i > 0; i--) {
        await allPages[i].close().catch(() => {});
      }
      await testUtil.switchToSpecificWindow(0).catch(() => {});
    } catch {
      // ignore cleanup errors
    }
  });
});
