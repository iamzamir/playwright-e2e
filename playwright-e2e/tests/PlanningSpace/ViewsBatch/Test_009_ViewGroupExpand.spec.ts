import { test, expect } from '../../../configs/fixtures';

test.describe.serial('verify aria-expanded attribute for all tree items', () => {
  test.beforeAll(async ({ testUtil, planningPage, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      testData.PROCESS_NAME
    );
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.clickViewDropdown();
  });

  test('Test Case 1: should check if all aria-expanded attributes are true on first render', async ({ planningPage, commonFunctions }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test Case 1: Should check all view group initially expanded');

    const allViewExpanded = await planningPage.areAllViewGroupsExpanded();

    expect(allViewExpanded).toBeTruthy();
  });

  test('Test Case 2: should check if all aria-expanded attributes are false after minimizing', async ({ planningPage, commonFunctions }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test Case 2: minimize All view Group and check if all minimized');
    await planningPage.minimizeAllViewGroup();

    const allViewMinimized = await planningPage.areAllViewGroupsCollapsed();
    const validation = await commonFunctions.compareTwoValues(allViewMinimized, true, 'All view group should be minimized');

    expect(validation).toBeTruthy();
  });

  test('Test Case 3: should check if all aria-expanded attributes are true after expanding', async ({ planningPage, commonFunctions }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test Case 3: Expand All view Group and check if all expanded');
    await planningPage.expandAllViewGroup();

    const allViewExpanded = await planningPage.areAllViewGroupsExpanded();
    const validation = await commonFunctions.compareTwoValues(allViewExpanded, true, 'All view group should be expanded');

    expect(validation).toBeTruthy();
  });
});