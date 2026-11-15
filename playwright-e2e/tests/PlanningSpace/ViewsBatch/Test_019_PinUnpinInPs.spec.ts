import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Pin and Unpin Side Drawer', () => {
  test.beforeAll(async ({ testUtil, planningPage, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME2 as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      testData.PROCESS_NAME
    );
    await planningPage.waitForViewToBeDisplayed();
  });

  // The pin state is one preference per user for every process (planning-mfe `scenarioScopePanelPinStatus`), and any tab
  // that loaded while pinned re-saves it on its next drawer open, so a pin leaks into every lane signed in as this user.
  // The spec signs in as user2 (most lanes run as user1) and is numbered to run last in ViewsBatchB.
  test.afterAll(async ({ planningPage, commonFunctions }) => {
    try {
      await planningPage.openComponent('Scenarios');
      await planningPage.unpinSideDrawer();
    } catch (error) {
      await commonFunctions.logMessage('ERROR', `Could not unpin the side drawer after the spec: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });

  test('Test Case 1: Should verify the scenarios panel is closed initially and behaves as unpinned on dashboard refresh by default', async ({ planningPage, commonFunctions }) => {
    await planningPage.openComponent('Scenarios');
    await planningPage.unpinSideDrawer();
    await planningPage.clickOnDashboardRefreshBtn();
    await planningPage.waitForDrawerToClose('Scenarios');

    const isScenariosDrawerOpenedInitially: boolean = await planningPage.isDrawerOpened('Scenarios');
    const isScenariosDrawerOpenedInitiallyValidation = await commonFunctions.compareTwoValues(
      isScenariosDrawerOpenedInitially,
      false,
      'Scenarios side panel should be closed initially'
    );

    const isScenariosDrawerOpened: boolean = await planningPage.openComponent('Scenarios');
    const isScenariosDrawerOpenedValidation = await commonFunctions.compareTwoValues(
      isScenariosDrawerOpened,
      true,
      'Scenarios side panel should open when the scenario chip is clicked'
    );

    await planningPage.clickOnDashboardRefreshBtn();
    await planningPage.waitForDrawerToClose('Scenarios');

    const isScenariosDrawerOpenedAfterRefresh: boolean = await planningPage.isDrawerOpened('Scenarios');
    const isScenariosDrawerClosedAfterRefreshValidation = await commonFunctions.compareTwoValues(
      isScenariosDrawerOpenedAfterRefresh,
      false,
      'Scenarios side panel should close on dashboard refresh when it is unpinned by default'
    );

    expect(
      isScenariosDrawerOpenedInitiallyValidation
      && isScenariosDrawerOpenedValidation
      && isScenariosDrawerClosedAfterRefreshValidation
    ).toBeTruthy();
  });

  test('Test Case 2: Should pin the scenarios panel and verify it persists on dashboard refresh', async ({ planningPage, commonFunctions }) => {
    await planningPage.openComponent('Scenarios');
    await planningPage.unpinSideDrawer();

    let isScenariosDrawerOpened: boolean = await planningPage.isDrawerOpened('Scenarios');
    if (!isScenariosDrawerOpened) {
      isScenariosDrawerOpened = await planningPage.openComponent('Scenarios');
    }
    const isScenariosDrawerOpenedValidation = await commonFunctions.compareTwoValues(
      isScenariosDrawerOpened,
      true,
      'Scenarios side panel should open before pinning'
    );

    await planningPage.pinSideDrawer();
    await planningPage.clickOnDashboardRefreshBtn();

    const isScenariosDrawerOpenedAfterRefresh: boolean = await planningPage.isDrawerOpened('Scenarios');
    const isScenariosDrawerOpenedAfterRefreshValidation = await commonFunctions.compareTwoValues(
      isScenariosDrawerOpenedAfterRefresh,
      true,
      'Scenarios side panel should persist in open state after dashboard refresh when pinned'
    );

    expect(isScenariosDrawerOpenedValidation && isScenariosDrawerOpenedAfterRefreshValidation).toBeTruthy();
  });

  test('Test Case 3: Should keep the pinned scenarios panel open after an actual view switch', async ({ planningPage, commonFunctions, testData }) => {
    await planningPage.openComponent('Scenarios');
    await planningPage.unpinSideDrawer();
    await planningPage.pinSideDrawer();

    const isScenariosDrawerOpenedBeforeSwitch: boolean = await planningPage.isDrawerOpened('Scenarios');
    const isScenariosDrawerOpenedBeforeSwitchValidation = await commonFunctions.compareTwoValues(
      isScenariosDrawerOpenedBeforeSwitch,
      true,
      'Scenarios side panel should be open before switching views when pinned'
    );

    const currentViewName = (await planningPage.getViewTitleName()).replace(/\*$/, '').trim();
    await planningPage.clickViewDropdown();
    await planningPage.selectViewType('All Views');

    const allViews = await planningPage.getAllViews();
    const normalizedViews = Array.from(new Set(allViews.map((viewName) => viewName.trim()).filter((viewName) => viewName.length > 0)));
    const preferredCandidate = normalizedViews.find((viewName) => viewName === testData.VIEW_NAME && viewName !== currentViewName);
    const fallbackCandidate = normalizedViews.find((viewName) => viewName !== currentViewName);
    const switchedViewName = preferredCandidate || fallbackCandidate || '';

    const isViewSwitchSuccessfulValidation = await commonFunctions.compareTwoValues(
      Boolean(switchedViewName),
      true,
      'A different view should be selectable for pinned drawer persistence validation'
    );

    if (switchedViewName) {
      await planningPage.selectView(switchedViewName);
      await planningPage.waitForSpecificDashboardToBeDisplayed(switchedViewName);
    }

    const isScenariosDrawerOpenedAfterSwitch: boolean = await planningPage.isDrawerOpened('Scenarios');
    const isScenariosDrawerOpenedAfterSwitchValidation = await commonFunctions.compareTwoValues(
      isScenariosDrawerOpenedAfterSwitch,
      true,
      'Scenarios side panel should persist in open state after view switch when pinned'
    );

    expect(
      isScenariosDrawerOpenedBeforeSwitchValidation
      && isViewSwitchSuccessfulValidation
      && isScenariosDrawerOpenedAfterSwitchValidation
    ).toBeTruthy();
  });

  test('Test Case 4: Should verify the pinned scenarios panel remains open on dashboard refresh', async ({ planningPage, commonFunctions }) => {
    await planningPage.openComponent('Scenarios');
    await planningPage.pinSideDrawer();
    await planningPage.clickOnDashboardRefreshBtn();

    const isScenariosDrawerOpened: boolean = await planningPage.isDrawerOpened('Scenarios');
    const isScenariosDrawerOpenedValidation = await commonFunctions.compareTwoValues(
      isScenariosDrawerOpened,
      true,
      'Pinned scenarios side panel should remain open on dashboard refresh'
    );

    expect(isScenariosDrawerOpenedValidation).toBeTruthy();
  });

  test('Test Case 5: Should unpin the scenarios panel and verify it closes on dashboard refresh', async ({ planningPage, commonFunctions }) => {
    await planningPage.openComponent('Scenarios');
    await planningPage.pinSideDrawer();
    await planningPage.unpinSideDrawer();

    let isScenariosDrawerOpened: boolean = await planningPage.isDrawerOpened('Scenarios');
    if (!isScenariosDrawerOpened) {
      isScenariosDrawerOpened = await planningPage.openComponent('Scenarios');
    }
    const isScenariosDrawerOpenedValidation = await commonFunctions.compareTwoValues(
      isScenariosDrawerOpened,
      true,
      'Scenarios side panel should open when the scenario chip is clicked'
    );

    await planningPage.clickOnDashboardRefreshBtn();
    await planningPage.waitForDrawerToClose('Scenarios');

    const isScenariosDrawerOpenedAfterRefresh: boolean = await planningPage.isDrawerOpened('Scenarios');
    const isScenariosDrawerClosedAfterRefreshValidation = await commonFunctions.compareTwoValues(
      isScenariosDrawerOpenedAfterRefresh,
      false,
      'Scenarios side panel should close after dashboard refresh once it is unpinned'
    );

    expect(isScenariosDrawerOpenedValidation && isScenariosDrawerClosedAfterRefreshValidation).toBeTruthy();
  });
});
