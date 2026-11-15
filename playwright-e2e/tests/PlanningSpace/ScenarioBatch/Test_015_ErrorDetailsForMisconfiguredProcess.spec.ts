import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';

test.describe.serial('Error details in the Fault Tolerance with NO Scenario', () => {
  test('Test Case 1: Verify error details as Admin when no base scenario is available', async ({ testUtil, planningPage, commonFunctions, testData, page }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);
    const baselineLinkTexts = [
      testData.ADMIN_USER_ACTION_LINKS.OPTION_NAME_1,
      testData.ADMIN_USER_ACTION_LINKS.OPTION_NAME_2,
      testData.ADMIN_USER_ACTION_LINKS.OPTION_NAME_3,
    ];
    const baselineScenarioTextValidation = await planningPage.verifyNoBaselineAdminState(testData.ADMIN_USER_TITLE_TEXT, baselineLinkTexts);
    await commonFunctions.compareTwoValues(baselineScenarioTextValidation, true, 'Baseline scenario title and action link should be displayed');
    for (const optionName of baselineLinkTexts) {
      const sourceUrl = page.url();
      const newTab = await planningPage.openNoBaselineAdminActionLinkInNewTab(optionName);
      await expect(newTab).not.toHaveURL('about:blank');
      const isRedirectedToDifferentUrl = newTab.url() !== 'about:blank' && newTab.url() !== sourceUrl;
      await commonFunctions.compareTwoValues(isRedirectedToDifferentUrl, true, `Baseline action '${optionName}' should open a different URL in a new tab`);
      await newTab.close();
      expect(isRedirectedToDifferentUrl).toBeTruthy();
    }
    expect(baselineScenarioTextValidation).toBeTruthy();
  });

  test('Test Case 2: Verify error details as Admin when no views are mapped to process', async ({ testUtil, planningPage, powerBarPage, commonFunctions, testData, page }) => {
    await powerBarPage.selectEntityFromContext({ process: testData.PROCESS_NAME_NO_VIEWS_MAPPED, subProcess: testData.SUB_PROCESS_NAME_NO_VIEWS_MAPPED });
    await testUtil.clickLeftpaneLinks('Planning');
    const isNoViewsTitleVisible = await planningPage.verifyNoViewsAdminTitle('No views created yet');
    await commonFunctions.compareTwoValues(isNoViewsTitleVisible, true, 'No views created yet title should be displayed');
    const sourceUrl = page.url();
    const newTab = await planningPage.openNoBaselineAdminActionLinkInNewTab('Planning View Settings');
    await expect(newTab).not.toHaveURL('about:blank');
    const isRedirectedToDifferentUrl = newTab.url() !== 'about:blank' && newTab.url() !== sourceUrl;
    await commonFunctions.compareTwoValues(isRedirectedToDifferentUrl, true, 'Planning View Settings opened a different URL in a new tab');
    expect(isRedirectedToDifferentUrl).toBeTruthy();
    await newTab.close();
    expect(isNoViewsTitleVisible).toBeTruthy();
  });

  test('Test Case 3: Verify error details as Planner when no base scenario is available', async ({ testUtil, planningPage, commonFunctions, testData, page }) => {
    await testUtil.signOutAndLoginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    const noBaselineUserTitleValidation = await planningPage.verifyNoBaselineUserTitle(testData.PLANNER_USER_TITLE_TEXT);
    await commonFunctions.compareTwoValues(noBaselineUserTitleValidation, true, `No baseline user title should be '${testData.PLANNER_USER_TITLE_TEXT}'`);
    const expectedRedirectBaseUrl = (process.env.NAVIGATE_TO_PROCESS_ORCHESTRATION as string).replace(/\/$/, '').toLowerCase();
    await planningPage.clickNoBaselineUserActionButton(testData.PLANNER_USER_ACTION_BUTTON);
    await page.waitForURL((url: URL) => url.toString().toLowerCase().includes(expectedRedirectBaseUrl), { timeout: getTimeout('EXTREME'), waitUntil: 'commit' });
    const redirectedUrl = page.url();
    const isRedirectUrlValid = redirectedUrl !== 'about:blank' && redirectedUrl.toLowerCase().includes(expectedRedirectBaseUrl);
    await commonFunctions.compareTwoValues(isRedirectUrlValid, true, 'Go to Process List should redirect to Planning listing URL');
    expect(noBaselineUserTitleValidation && isRedirectUrlValid).toBeTruthy();
  });

  test('Test Case 4: Verify error details as Planner when no views are mapped to process', async ({ testUtil, planningPage, powerBarPage, commonFunctions, testData, page }) => {
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME_NO_VIEWS_MAPPED);
    await powerBarPage.selectEntityFromContext({ process: testData.PROCESS_NAME_NO_VIEWS_MAPPED, subProcess: testData.SUB_PROCESS_NAME_NO_VIEWS_MAPPED });
    await testUtil.clickLeftpaneLinks('Planning');
    const isNoViewsTitleVisible = await planningPage.verifyNoViewsUserTitle('No views to show yet');
    await commonFunctions.compareTwoValues(isNoViewsTitleVisible, true, 'No views to show yet title should be displayed for planner');
    const expectedRedirectBaseUrl = (process.env.NAVIGATE_TO_PROCESS_ORCHESTRATION as string).replace(/\/$/, '').toLowerCase();
    await planningPage.clickNoBaselineUserActionButton('Go to Process List');
    await page.waitForURL((url: URL) => url.toString().toLowerCase().includes(expectedRedirectBaseUrl), { timeout: getTimeout('EXTREME'), waitUntil: 'commit' });
    const redirectedUrl = page.url();
    const isRedirectUrlValid = redirectedUrl !== 'about:blank' && redirectedUrl.toLowerCase().includes(expectedRedirectBaseUrl);
    await commonFunctions.compareTwoValues(isRedirectUrlValid, true, 'Go to Process List should redirect to Planning listing URL');
    expect(isNoViewsTitleVisible && isRedirectUrlValid).toBeTruthy();
  });
});
