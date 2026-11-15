import { test, expect } from '../../../configs/fixtures';

const normalizeFilterName = (value: string): string => value.replace(/\*/g, '').trim();

test.describe.serial('Workflow filter tests', () => {
  test.beforeAll(async ({ testUtil, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string);
  });

  test(`Test Case 1: Should configure workflow filter for view which has default scope for view`, async ({ globalSettingsPage, commonFunctions, testData }) => {
    await globalSettingsPage.selectProcessDropdown(testData.PROCESS_NAME);
    const bValidation = await globalSettingsPage.configureWorkflowFilter(testData.PROCESS_NAME, testData.DEFAULT_SCOPE.VIEW_NAME, testData.DEFAULT_SCOPE.SCOPE_TO_DEFINE, 'Define filter', false);
    await commonFunctions.compareTwoValues(bValidation, true, `Is workflow filter configured for ${testData.DEFAULT_SCOPE.VIEW_NAME} view`);
    expect(bValidation).toBeTruthy();
  });

  test(`Test Case 2: Should configure workflow filter for view which has no default scope for view`, async ({ globalSettingsPage, commonFunctions, testData }) => {
    const bValidation = await globalSettingsPage.configureWorkflowFilter(testData.PROCESS_NAME, testData.NON_DEFAULT_SCOPE.VIEW_NAME, testData.NON_DEFAULT_SCOPE.SCOPE_TO_DEFINE, 'Define filter', false);
    await commonFunctions.compareTwoValues(bValidation, true, `Is workflow filter configured for ${testData.NON_DEFAULT_SCOPE.VIEW_NAME} view`);
    expect(bValidation).toBeTruthy();
  });

  test(`Test Case 3: Should show default scope in scope tab and workflow filter in context override popup`, async ({ testUtil, planningPage, scopePage, commonFunctions, testData, }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.selectViewByTypeAndName('All Views', testData.DEFAULT_SCOPE.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.DEFAULT_SCOPE.VIEW_NAME);
    await planningPage.openComponent('Scope');
    const bValidation1 = await commonFunctions.compareTwoValues(normalizeFilterName(await planningPage.getScopeNameFromPowerBar()), normalizeFilterName(testData.DEFAULT_SCOPE.FILTER_NAME as string), 'Filter Name Assertion in powerbar');
    const bValidation2 = await commonFunctions.compareTwoValues(normalizeFilterName((await scopePage.getFilterName()).toLowerCase()), normalizeFilterName((testData.DEFAULT_SCOPE.FILTER_NAME as string).toLowerCase()), 'Filter Name Assertion in VF');
    const bValidation3 = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope(testData.DEFAULT_SCOPE.DEFAULT_SCOPE_FILTER.ATTRIBUTE_NAME, testData.DEFAULT_SCOPE.DEFAULT_SCOPE_FILTER.VALUES[0]), true, `Is ${testData.DEFAULT_SCOPE.DEFAULT_SCOPE_FILTER.DIMENSION_NAME} filter applied`);
    await planningPage.closeDrawer();
    const bValidation4 = await commonFunctions.compareTwoValues(await planningPage.isViewActionVisible('Set Default Scope Filter'), true, `Set Default Scope Filter action shouldn't display`);
    await planningPage.page.keyboard.press('Escape');
    const bValidation5 = await commonFunctions.compareTwoValues(await planningPage.isContextOverrideDisplays(), true, 'Context Override button Displays Assertion');
    const bValidation6 = await commonFunctions.compareTwoValues(await planningPage.isFilterDetailsDisplays(), true, 'Filter Details button Displays Assertion');
    const bValidation7 = await commonFunctions.compareTwoValues(await planningPage.showFilterDetails(testData.DEFAULT_SCOPE.SCOPE_TO_DEFINE), true, 'Backend workflow filters Displays Assertion');
    const bValidation8 = await commonFunctions.compareTwoValues(await planningPage.closeWorkflowFilterDetails(), true, 'Backend workflow filters Details closed Assertion');
    const bValidation9 = await commonFunctions.compareTwoValues(await planningPage.checkMergeScopeLogic(testData.DEFAULT_SCOPE.DEFAULT_SCOPE_FILTER, testData.DEFAULT_SCOPE.SCOPE_TO_DEFINE), true, 'always AND BE merge logic Assertion');
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation9).toBeTruthy();
  });

  test(`Test Case 4: Should show empty scope in scope tab and workflow filter in context override popup`, async ({ planningPage, commonFunctions, testData }) => {
    await planningPage.selectViewByTypeAndName('All Views', testData.NON_DEFAULT_SCOPE.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.NON_DEFAULT_SCOPE.VIEW_NAME);
    const bValidation4 = await commonFunctions.compareTwoValues(await planningPage.isViewActionVisible('Set Default Scope Filter'), true, `Set Default Scope Filter action should display`);
    await planningPage.page.keyboard.press('Escape');
    const bValidation5 = await commonFunctions.compareTwoValues(await planningPage.isContextOverrideDisplays(), true, 'Context Override button Displays Assertion');
    const bValidation6 = await commonFunctions.compareTwoValues(await planningPage.isFilterDetailsDisplays(), true, 'Filter Details button Displays Assertion');
    const bValidation7 = await commonFunctions.compareTwoValues(await planningPage.showFilterDetails(testData.NON_DEFAULT_SCOPE.SCOPE_TO_DEFINE), true, 'Backend workflow filters Displays Assertion');
    const bValidation8 = await commonFunctions.compareTwoValues(await planningPage.closeWorkflowFilterDetails(), true, 'Backend workflow filters Details closed Assertion');
    const bValidation9 = await commonFunctions.compareTwoValues(await planningPage.checkMergeScopeLogic({}, testData.NON_DEFAULT_SCOPE.SCOPE_TO_DEFINE), true, 'always AND BE merge logic Assertion');
    expect(bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation9).toBeTruthy();
  });

  test(`Test Case 5: Should edit workflow filter reflecting for default scope view`, async ({ testUtil, globalSettingsPage, commonFunctions, testData }) => {
    await testUtil.navigateToProcessListingPage();
    await globalSettingsPage.selectProcessDropdown(testData.PROCESS_NAME);
    const bValidation = await globalSettingsPage.configureWorkflowFilter(testData.PROCESS_NAME, testData.DEFAULT_SCOPE.VIEW_NAME, testData.DEFAULT_SCOPE.SCOPE_TO_EDIT, 'Edit filter', true);
    await commonFunctions.compareTwoValues(bValidation, true, `Is workflow filter edited for ${testData.DEFAULT_SCOPE.VIEW_NAME} view`);
    expect(bValidation).toBeTruthy();
  });

  test(`Test Case 6: Should edit workflow filter reflecting for non default scope view`, async ({ globalSettingsPage, commonFunctions, testData }) => {
    const bValidation = await globalSettingsPage.configureWorkflowFilter(testData.PROCESS_NAME, testData.NON_DEFAULT_SCOPE.VIEW_NAME, testData.NON_DEFAULT_SCOPE.SCOPE_TO_EDIT, 'Edit filter', true);
    await commonFunctions.compareTwoValues(bValidation, true, `Is workflow filter edited for ${testData.NON_DEFAULT_SCOPE.VIEW_NAME} view`);
    expect(bValidation).toBeTruthy();
  });

  test(`Test Case 7: Does edited workflow filter reflected for default scope view`, async ({ testUtil, planningListingPage, planningPage, portalPage, scopePage, commonFunctions, testData }) => {
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Process', testData.PROCESS_NAME);
    await planningPage.selectViewByTypeAndName('All Views', testData.DEFAULT_SCOPE.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.DEFAULT_SCOPE.VIEW_NAME);
    await planningPage.openComponent('Scope');
    const bValidation1 = await commonFunctions.compareTwoValues(normalizeFilterName(await planningPage.getScopeNameFromPowerBar()), normalizeFilterName(testData.DEFAULT_SCOPE.FILTER_NAME as string), 'Filter Name Assertion in powerbar');
    const bValidation2 = await commonFunctions.compareTwoValues(normalizeFilterName((await scopePage.getFilterName()).toLowerCase()), normalizeFilterName((testData.DEFAULT_SCOPE.FILTER_NAME as string).toLowerCase()), 'Filter Name Assertion in VF');
    const bValidation3 = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope(testData.DEFAULT_SCOPE.DEFAULT_SCOPE_FILTER.ATTRIBUTE_NAME, testData.DEFAULT_SCOPE.DEFAULT_SCOPE_FILTER.VALUES[0]), true, `Is ${testData.DEFAULT_SCOPE.DEFAULT_SCOPE_FILTER.DIMENSION_NAME} filter applied`);
    await planningPage.closeDrawer();
    const bValidation4 = await commonFunctions.compareTwoValues(await planningPage.isViewActionVisible('Set Default Scope Filter'), true, `Set Default Scope Filter action should be displayed`);
    await planningPage.page.keyboard.press('Escape');
    const bValidation5 = await commonFunctions.compareTwoValues(await planningPage.isContextOverrideDisplays(), true, 'Context Override button Displays Assertion');
    const bValidation6 = await commonFunctions.compareTwoValues(await planningPage.isFilterDetailsDisplays(), true, 'Filter Details button Displays Assertion');
    const bValidation7 = await commonFunctions.compareTwoValues(await planningPage.showFilterDetails(testData.DEFAULT_SCOPE.SCOPE_TO_EDIT), true, 'Backend workflow filters Displays Assertion edit');
    const bValidation8 = await commonFunctions.compareTwoValues(await planningPage.closeWorkflowFilterDetails(), true, 'Backend workflow filters Details closed Assertion');
    const bValidation9 = await commonFunctions.compareTwoValues(await planningPage.checkMergeScopeLogic(testData.DEFAULT_SCOPE.DEFAULT_SCOPE_FILTER, testData.DEFAULT_SCOPE.SCOPE_TO_EDIT), true, 'always AND BE merge logic Assertion');
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation9).toBeTruthy();
  });

  test(`Test Case 8: user changed the scope for default scope view`, async ({ planningPage, scopePage, commonFunctions, testData }) => {
    await planningPage.openComponent('Scope');
    const bValidation1 = await commonFunctions.compareTwoValues(normalizeFilterName(await planningPage.getScopeNameFromPowerBar()), normalizeFilterName(testData.DEFAULT_SCOPE.FILTER_NAME as string), 'Filter Name Assertion in powerbar');
    const bValidation2 = await commonFunctions.compareTwoValues(normalizeFilterName((await scopePage.getFilterName()).toLowerCase()), normalizeFilterName((testData.DEFAULT_SCOPE.FILTER_NAME as string).toLowerCase()), 'Filter Name Assertion in VF');
    const bValidation3 = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope(testData.DEFAULT_SCOPE.DEFAULT_SCOPE_FILTER.ATTRIBUTE_NAME, testData.DEFAULT_SCOPE.DEFAULT_SCOPE_FILTER.VALUES[0]), true, `Is ${testData.DEFAULT_SCOPE.DEFAULT_SCOPE_FILTER.DIMENSION_NAME} filter applied`);
    await planningPage.page.waitForTimeout(1000);
    const filterConfigs = [{ type: testData.DEFAULT_SCOPE.SCOPE_CHANGE.DIMENSION_NAME, category: testData.DEFAULT_SCOPE.SCOPE_CHANGE.ATTRIBUTE_NAME, value: testData.DEFAULT_SCOPE.SCOPE_CHANGE.VALUES, }];
    const bValidation4 = await scopePage.configureFiltersinVFScope(filterConfigs);
    await commonFunctions.compareTwoValues(bValidation4, true, `Is workflow filter edited for ${testData.DEFAULT_SCOPE.VIEW_NAME} view`);
    // Applying a scope re-renders the pivot behind "Setting up your page", and configureFiltersinVFScope returns
    // before that starts. Give the overlay a bounded window to appear, then wait for it to hide.
    const bLoaderHidden = await commonFunctions.compareTwoValues(await planningPage.waitForPlanningSpaceToSettle(), true, 'Planning Space settled after scope change');
    await planningPage.closeDrawer();
    const bValidation5 = await commonFunctions.compareTwoValues(await planningPage.isViewActionVisible('Set Default Scope Filter'), true, `Set Default Scope Filter action should be displayed`);
    await planningPage.page.keyboard.press('Escape');
    const bValidation6 = await commonFunctions.compareTwoValues(await planningPage.isContextOverrideDisplays(), true, 'Context Override button Displays Assertion');
    const bValidation7 = await commonFunctions.compareTwoValues(await planningPage.isFilterDetailsDisplays(), true, 'Filter Details button Displays Assertion');
    const bValidation8 = await commonFunctions.compareTwoValues(await planningPage.showFilterDetails(testData.DEFAULT_SCOPE.SCOPE_TO_EDIT), true, 'Backend workflow filters Displays Assertion edit');
    const bValidation9 = await commonFunctions.compareTwoValues(await planningPage.closeWorkflowFilterDetails(), true, 'Backend workflow filters Details closed Assertion');
    const bValidation10 = await commonFunctions.compareTwoValues(await planningPage.checkMergeScopeLogic(testData.DEFAULT_SCOPE.SCOPE_CHANGE, testData.DEFAULT_SCOPE.SCOPE_TO_EDIT), true, 'always AND BE merge logic Assertion');
    await planningPage.openComponent('Scope');
    await scopePage.clickRevertVFChanges();
    await planningPage.closeDrawer();
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bLoaderHidden && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation9 && bValidation10).toBeTruthy();
  });

  test(`Test Case 9: Does edited workflow filter reflected for non-default scope view`, async ({ planningPage, commonFunctions, testData }) => {
    await planningPage.selectViewByTypeAndName('All Views', testData.NON_DEFAULT_SCOPE.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.NON_DEFAULT_SCOPE.VIEW_NAME);
    const bValidation4 = await commonFunctions.compareTwoValues(await planningPage.isViewActionVisible('Set Default Scope Filter'), true, `Set Default Scope Filter action shouldn't display`);
    await planningPage.page.keyboard.press('Escape');
    const bValidation5 = await commonFunctions.compareTwoValues(await planningPage.isContextOverrideDisplays(), true, 'Context Override button Displays Assertion');
    const bValidation6 = await commonFunctions.compareTwoValues(await planningPage.isFilterDetailsDisplays(), true, 'Filter Details button Displays Assertion');
    const bValidation7 = await commonFunctions.compareTwoValues(await planningPage.showFilterDetails(testData.NON_DEFAULT_SCOPE.SCOPE_TO_EDIT), true, 'Backend workflow filters Displays Assertion');
    const bValidation8 = await commonFunctions.compareTwoValues(await planningPage.closeWorkflowFilterDetails(), true, 'Backend workflow filters Details closed Assertion');
    const bValidation9 = await commonFunctions.compareTwoValues(await planningPage.checkMergeScopeLogic(testData.NON_DEFAULT_SCOPE.GLOBAL_FILTER, testData.NON_DEFAULT_SCOPE.SCOPE_TO_EDIT), true, 'always AND BE merge logic Assertion');
    expect(bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation9).toBeTruthy();
  });

  test(`Test Case 10: Should delete workflow filter for default scope view`, async ({ testUtil, globalSettingsPage, commonFunctions, testData }) => {
    await testUtil.navigateToProcessListingPage();
    await globalSettingsPage.selectProcessDropdown(testData.PROCESS_NAME);
    const bValidation = await globalSettingsPage.configureWorkflowFilter(testData.PROCESS_NAME, testData.DEFAULT_SCOPE.VIEW_NAME, null, 'Delete filter', true);
    await commonFunctions.compareTwoValues(bValidation, true, `Is workflow filter deleted for ${testData.DEFAULT_SCOPE.VIEW_NAME} view`);
    expect(bValidation).toBeTruthy();
  });

  test(`Test Case 11: Should delete workflow filter for non-default scope view`, async ({ globalSettingsPage, commonFunctions, testData }) => {
    const bValidation = await globalSettingsPage.configureWorkflowFilter(testData.PROCESS_NAME, testData.NON_DEFAULT_SCOPE.VIEW_NAME, null, 'Delete filter', true);
    await commonFunctions.compareTwoValues(bValidation, true, `Is workflow filter deleted for ${testData.NON_DEFAULT_SCOPE.VIEW_NAME} view`);
    expect(bValidation).toBeTruthy();
  });

  test(`Test Case 12: Does scope reset to initial after workflow filter deleted for default scope view`, async ({ testUtil, planningListingPage, planningPage, portalPage, scopePage, commonFunctions, testData }) => {
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Process', testData.PROCESS_NAME);
    await planningPage.selectViewByTypeAndName('All Views', testData.DEFAULT_SCOPE.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.DEFAULT_SCOPE.VIEW_NAME);
    await planningPage.openComponent('Scope');
    const bValidation1 = await commonFunctions.compareTwoValues(normalizeFilterName(await planningPage.getScopeNameFromPowerBar()), normalizeFilterName(testData.DEFAULT_SCOPE.FILTER_NAME as string), 'Filter Name Assertion in powerbar');
    const bValidation2 = await commonFunctions.compareTwoValues(normalizeFilterName((await scopePage.getFilterName()).toLowerCase()), normalizeFilterName((testData.DEFAULT_SCOPE.FILTER_NAME as string).toLowerCase()), 'Filter Name Assertion in VF');
    await planningPage.closeDrawer();
    const bValidation4 = await commonFunctions.compareTwoValues(await planningPage.isViewActionVisible('Set Default Scope Filter'), true, `Set Default Scope Filter action should display`);
    await planningPage.page.keyboard.press('Escape');
    const bValidation3 = await commonFunctions.compareTwoValues(await planningPage.isContextOverrideHidden(), true, 'Context Override button should not display Assertion');
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test(`Test Case 13: Does scope reset to initial after workflow filter deleted for non-default scope view`, async ({ planningPage, commonFunctions, testData }) => {
    await planningPage.selectViewByTypeAndName('All Views', testData.NON_DEFAULT_SCOPE.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.NON_DEFAULT_SCOPE.VIEW_NAME);
    const bValidation4 = await commonFunctions.compareTwoValues(await planningPage.isViewActionVisible('Set Default Scope Filter'), true, `Set Default Scope Filter action should display`);
    await planningPage.page.keyboard.press('Escape');
    const bValidation5 = await commonFunctions.compareTwoValues(await planningPage.isContextOverrideHidden(), true, 'Context Override button should not display Assertion');
    expect(bValidation4 && bValidation5).toBeTruthy();
  });
});
