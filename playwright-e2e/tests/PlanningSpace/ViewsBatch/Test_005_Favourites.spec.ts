import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Favourites Test', () => {
  test.beforeAll(async ({ testUtil, planningPage, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      testData.PROCESS_NAME
    );
    await planningPage.waitForViewToBeDisplayed();
  });

  test('Test Case 1: Add Favorites', async ({ planningPage, commonFunctions, testData }) => {
    await planningPage.clickViewDropdown();
    await planningPage.selectViewType('All Views');
    await planningPage.addViewToFavourites(testData.VIEW_NAME);
    await planningPage.clickViewDropdown();
    await planningPage.selectViewType('Favourites');

    const sProcessTitle: string = await planningPage.getViewTitleName();
    const bValidation1: boolean = await commonFunctions.compareTwoValues(
      sProcessTitle,
      testData.VIEW_NAME,
      `${testData.VIEW_NAME} View Successfully appeared under Favourites Assertion!`
    );
    const isViewSelected: boolean = await planningPage.isViewSelected(testData.VIEW_NAME);
    const bValidation2: boolean = await commonFunctions.compareTwoValues(
      isViewSelected,
      true,
      'View Selected Assertion, View Should be Selected on the Rightside under Favourites'
    );
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 2: Remove From Favorites', async ({ planningPage, commonFunctions, testData }) => {
    await planningPage.selectViewType('All Views');
    await planningPage.removeViewToFavourites(testData.VIEW_NAME);
    await planningPage.clickViewDropdown();
    await planningPage.selectViewType('Favourites');

    const isViewSelectedAfterRemoveFav: boolean = await planningPage.isViewSelected(testData.VIEW_NAME);
    const bValidation: boolean = await commonFunctions.compareTwoValues(
      isViewSelectedAfterRemoveFav,
      false,
      'View Selected Assertion, should not be present under favourites as removed from Favrouites'
    );
    expect(bValidation).toBeTruthy();
    await planningPage.selectViewType('All Views');
  });
});
