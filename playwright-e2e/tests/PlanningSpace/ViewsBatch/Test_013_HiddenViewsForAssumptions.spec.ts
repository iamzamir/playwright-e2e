import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Testing hidden views feature for assumptions', () => {
  test.beforeAll(async ({ testUtil, planningPage, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      testData.PROCESS_NAME
    );
    await planningPage.waitForViewToBeDisplayed();
  });

  test('Test Case 1: Hide view for assumption in PO', async ({ testUtil, globalSettingsPage, commonFunctions, testData }) => {
    await testUtil.navigateToProcessListingPage();
    await globalSettingsPage.clickGlobalSettings();
    await globalSettingsPage.clickGlobalSettingsListMenu('Assumption Type');
    await globalSettingsPage.waitUntilViewMappingIsDisplayed(testData.VIEW_NAME, testData.ASSUMPTION_TYPE);
    await globalSettingsPage.selectProcessAction(testData.ASSUMPTION_TYPE, 'Map With...');
    await globalSettingsPage.hideOrUnhideView(testData.VIEW_NAME, 'HIDE_VIEW');

    const isSaved = await globalSettingsPage.clickSaveAndVerify();
    await commonFunctions.compareTwoValues(isSaved, true, 'Should save the configuration');
    expect(isSaved).toBeTruthy();
  });

  test('Test Case 2: Add to favourite icon should not be displayed for hidden view in assumption', async ({
    testUtil,
    planningPage,
    planningListingPage,
    commonFunctions,
    testData,
  }) => {
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Assumption', testData.PROCESS_NAME, '', testData.ASSUMPTION_NAME);
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.switchToMfe();

    await planningPage.clickViewDropdown();
    await planningPage.selectViewType('Hidden Views');
    await planningPage.expandAllViewGroup();
    await planningPage.selectView(testData.VIEW_NAME);

    const favouriteIcon = await planningPage.isFavouriteIconDisplayed();
    await commonFunctions.compareTwoValues(
      favouriteIcon,
      false,
      `Favourite icon should not be present in ${testData.VIEW_NAME} hidden view`
    );
    expect(favouriteIcon).toBeFalsy();
  });

  test('Test Case 3: Clicking back from selected hidden view should navigate to previous view', async ({
    planningPage,
    commonFunctions,
    testData,
  }) => {
    await planningPage.clickViewDropdown();
    await planningPage.selectViewType('All Views');

    const allViews = await planningPage.getAllViews();
    expect(allViews.length).toBeGreaterThan(0);

    await planningPage.selectView(allViews[0]);
    const previousView = await planningPage.getViewTitleName();

    await planningPage.clickViewDropdown();
    await planningPage.selectViewType('Hidden Views');
    await planningPage.expandAllViewGroup();
    await planningPage.selectView(testData.VIEW_NAME);

    const isBackBtnVisible = await planningPage.isBackBtnDisplayed();
    await commonFunctions.compareTwoValues(isBackBtnVisible, true, 'Should be able to see back button in hidden view');
    expect(isBackBtnVisible).toBeTruthy();

    await planningPage.clickOnBackArrowOfHiddenView();

    const currentView = await planningPage.getViewTitleName();
    const isBackNavigationValid = await commonFunctions.compareTwoValues(
      previousView,
      currentView,
      'Should navigate to previous view on click of back button'
    );
    expect(isBackNavigationValid).toBeTruthy();
  });

  test('Test Case 4: Unhide view for assumption in PO', async ({ testUtil, globalSettingsPage, commonFunctions, testData }) => {
    await testUtil.navigateToProcessListingPage();
    await globalSettingsPage.clickGlobalSettings();
    await globalSettingsPage.clickGlobalSettingsListMenu('Assumption Type');
    await globalSettingsPage.waitUntilViewMappingIsDisplayed(testData.VIEW_NAME, testData.ASSUMPTION_TYPE);
    await globalSettingsPage.selectProcessAction(testData.ASSUMPTION_TYPE, 'Map With...');
    await globalSettingsPage.hideOrUnhideView(testData.VIEW_NAME, 'SHOW_VIEW');

    const isSaved = await globalSettingsPage.clickSaveAndVerify();
    await commonFunctions.compareTwoValues(isSaved, true, 'Should save the configuration');
    expect(isSaved).toBeTruthy();
  });
});
