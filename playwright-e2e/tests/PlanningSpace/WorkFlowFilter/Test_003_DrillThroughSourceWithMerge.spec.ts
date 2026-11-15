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

const syncPages = <T>(testUtil: { page: T }, ...pageObjects: Array<{ page: T }>) => {
  pageObjects.forEach(po => { po.page = testUtil.page; });
};

test.describe.serial('WorkFlow backend filter 3', () => {
  let scenarioName = '';

  test.beforeAll(async ({ testUtil, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME, true);
  });

  test('Test Case 1: First Level Drill Through From Source with merge context to Target view without backend filter', async ({ planningPage, drillThroughPage, scopePage, scenarioPage, commonFunctions, testUtil, testData }) => {
    await testUtil.setBaseAsDefaultScenario();
    await planningPage.selectViewInPlanning(testData.TC1_DRILL_THROUGH_VIEW_FROM);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.TC1_DRILL_THROUGH_VIEW_FROM);
    const bValidation0 = await commonFunctions.compareTwoValues(await planningPage.isViewSelected(testData.TC1_DRILL_THROUGH_VIEW_FROM), true, `View ${testData.TC1_DRILL_THROUGH_VIEW_FROM} Found Assertion`);
    await drillThroughPage.performDrillThroughOnCardField(testData.TC1_DRILL_THROUGH_CELL, testData.TC1_DRILL_THROUGH_VIEW_TO);
    await testUtil.switchToSpecificWindow(1);
    syncPages(testUtil, planningPage, drillThroughPage, scopePage, scenarioPage);
    await drillThroughPage.waitForViewName(testData.TC1_DRILL_THROUGH_VIEW_TO);
    const actualViewName = await planningPage.getViewTitleName();
    const bValidation1 = await commonFunctions.compareTwoValues(actualViewName, testData.TC1_DRILL_THROUGH_VIEW_TO, `View name assertion after Drill Through to ${testData.TC1_DRILL_THROUGH_VIEW_TO}`);
    const bValidation2 = await commonFunctions.compareTwoValues(await planningPage.isViewSelected(testData.TC1_DRILL_THROUGH_VIEW_TO), true, `${testData.TC1_DRILL_THROUGH_VIEW_TO} View Selected Assertion`);
    const currentUrl = planningPage.page.url();
    await commonFunctions.logMessage('INFO', `current url is ${currentUrl}`);
    const contextId = extractContextId(currentUrl);
    await commonFunctions.logMessage('INFO', `context id is ${contextId}`);
    const bValidation3 = await commonFunctions.compareTwoValues(currentUrl.includes('contextId='), true, 'URL includes Context ID Assertion');
    const bValidation4 = await commonFunctions.compareTwoValues(contextId.length > 1, true, 'Context ID Assertion, it should have some ID and its length should be greater than 1');
    scenarioName = await planningPage.getScenarioChipText();
    await planningPage.openComponent('Scenarios');
    const isDefaultScenarioExist = await scenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(scenarioName);
    await planningPage.closeDrawer();
    const isScenarioMatched = await commonFunctions.compareTwoValues(isDefaultScenarioExist, true, `Checking if ${scenarioName} Scenario Matched`);
    await planningPage.openComponent('Scope');
    let scopeValidation = true;
    for (const item of testData.DRILL_THROUGH_SCOPE) {
      const isExists = await scopePage.verifyAppliedFilterInScope(item.ATTRIBUTE_NAME, item.VALUES[0]);
      if (!isExists) {
        await commonFunctions.logMessage('INFO', `${item.ATTRIBUTE_NAME} with value ${item.VALUES[0]} is not applied in scope`);
        scopeValidation = false;
      }
    }
    await planningPage.closeDrawer();
    const bValidation5 = await commonFunctions.compareTwoValues(await planningPage.isContextOverrideDisplays(), true, 'Context Override button Displays Assertion');
    const bValidation6 = await commonFunctions.compareTwoValues(await planningPage.isFilterDetailsDisplays(), false, 'Filter Details button Displays Assertion');
    const bValidation7 = await commonFunctions.compareTwoValues(await planningPage.isClearDisplays(), true, 'Clear Button/Link Displays Assertion');
    expect(bValidation0 && bValidation1 && bValidation2 && bValidation3 && bValidation4 && isScenarioMatched && scopeValidation && bValidation5 && bValidation6 && bValidation7).toBe(true);
  });

  test('Test Case 2: Drill Through From Source with merge context to Target view with always AND backend filter', async ({ planningPage, drillThroughPage, scopePage, scenarioPage, commonFunctions, testUtil, testData }) => {
    await testUtil.switchToSpecificWindow(0);
    syncPages(testUtil, planningPage, drillThroughPage, scopePage, scenarioPage);
    await drillThroughPage.performDrillThroughOnCardField(testData.TC1_DRILL_THROUGH_CELL, testData.TC2_DRILL_THROUGH_VIEW_TO);
    await testUtil.switchToSpecificWindow(2);
    syncPages(testUtil, planningPage, drillThroughPage, scopePage, scenarioPage);
    await drillThroughPage.waitForViewName(testData.TC2_DRILL_THROUGH_VIEW_TO);
    const actualViewName = await planningPage.getViewTitleName();
    const bValidation1 = await commonFunctions.compareTwoValues(actualViewName, testData.TC2_DRILL_THROUGH_VIEW_TO, `View name assertion after Drill Through to ${testData.TC2_DRILL_THROUGH_VIEW_TO}`);
    const bValidation2 = await commonFunctions.compareTwoValues(await planningPage.isViewSelected(testData.TC2_DRILL_THROUGH_VIEW_TO), true, `${testData.TC2_DRILL_THROUGH_VIEW_TO} View Selected Assertion`);
    const currentUrl = planningPage.page.url();
    await commonFunctions.logMessage('INFO', `current url is ${currentUrl}`);
    const contextId = extractContextId(currentUrl);
    await commonFunctions.logMessage('INFO', `context id is ${contextId}`);
    const bValidation3 = await commonFunctions.compareTwoValues(currentUrl.includes('contextId='), true, 'URL includes Context ID Assertion');
    const bValidation4 = await commonFunctions.compareTwoValues(contextId.length > 1, true, 'Context ID Assertion, it should have some ID and its length should be greater than 1');
    const scenarioName2 = await planningPage.getScenarioChipText();
    await planningPage.openComponent('Scenarios');
    const isDefaultScenarioExist = await scenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(scenarioName2);
    await planningPage.closeDrawer();
    const isScenarioMatched = await commonFunctions.compareTwoValues(isDefaultScenarioExist, true, `Checking if ${scenarioName2} Scenario Matched`);
    await planningPage.openComponent('Scope');
    let scopeValidation = true;
    for (const item of testData.DRILL_THROUGH_SCOPE) {
      const isExists = await scopePage.verifyAppliedFilterInScope(item.ATTRIBUTE_NAME, item.VALUES[0]);
      if (!isExists) {
        await commonFunctions.logMessage('INFO', `${item.ATTRIBUTE_NAME} with value ${item.VALUES[0]} is not applied in scope`);
        scopeValidation = false;
      }
    }
    await planningPage.closeDrawer();
    const bValidation5 = await commonFunctions.compareTwoValues(await planningPage.isContextOverrideDisplays(), true, 'Context Override button Displays Assertion');
    const bValidation6 = await commonFunctions.compareTwoValues(await planningPage.isFilterDetailsDisplays(), true, 'Filter Details button Displays Assertion');
    const bValidation7 = await commonFunctions.compareTwoValues(await planningPage.isClearDisplays(), true, 'Clear Button/Link Displays Assertion');
    const bValidation8 = await commonFunctions.compareTwoValues(await planningPage.showFilterDetails(testData.BACKEND_FILTERS), true, 'Backend workflow filters Displays Assertion');
    const bValidation9 = await commonFunctions.compareTwoValues(await planningPage.closeWorkflowFilterDetails(), true, 'Backend workflow filters Details closed Assertion');
    const bValidation10 = await commonFunctions.compareTwoValues(await planningPage.checkMergeScopeLogic(testData.DRILL_THROUGH_SCOPE[1], testData.BACKEND_FILTERS), true, 'always AND BE merge logic Assertion');
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && isScenarioMatched && scopeValidation && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation9 && bValidation10).toBe(true);
  });

});
