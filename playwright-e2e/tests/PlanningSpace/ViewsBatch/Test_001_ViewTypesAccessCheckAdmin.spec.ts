import { test, expect } from '../../../configs/fixtures';

test.describe.serial('View Types Verification for Admin roles', () => {

  test('Test Case 1: Verify View Types for Process - Admin Role', async ({ testUtil, planningPage, commonFunctions, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      testData.PROCESS_NAME,
      false
    );
    await planningPage.waitForViewToBeDisplayed();
    const arrViewTypes: string[] = await planningPage.getAllViewTypes();
    const validation: boolean = await commonFunctions.compareTwoValues(arrViewTypes.toString(), testData.ADMIN_VIEW_TYPES, 'All 3 view types should be available');
    expect(validation).toBeTruthy();
  });

  test('Test Case 2: Verify All Views - Admin Role', async ({ planningPage, commonFunctions, testData }) => {
    await planningPage.selectViewTypeOptions('All Views');
    const viewsFromPS: string[] = await planningPage.getAllViews();
    const expectedAllViews: string[] = testData.ALL_VIEWS.split(',');
    const validation: boolean = await commonFunctions.compareTwoValues(
      viewsFromPS.includes(expectedAllViews[0]) && viewsFromPS.includes(expectedAllViews[1]),
      true,
      'All Views Assertion'
    );
    expect(validation).toBeTruthy();
  });

  test('Test Case 3: Verify Hidden views - Admin Role', async ({ planningPage, commonFunctions, testData }) => {
    await planningPage.selectViewType('Hidden Views');
    const viewsFromPS: string[] = await planningPage.getAllViews();
    const validation: boolean = await commonFunctions.compareTwoValues(viewsFromPS.toString(), testData.HIDDEN_VIEWS, 'Hidden Views Assertion');
    expect(validation).toBeTruthy();
  });

  test('Test Case 4: Verify Favourites views - Admin Role', async ({ planningPage, commonFunctions, testData }) => {
    await planningPage.selectViewType('Favourites');
    const viewsFromPS: string[] = await planningPage.getAllViews();
    const validation: boolean = await commonFunctions.compareTwoValues(viewsFromPS.toString(), testData.FAVOURITES, 'Favourites Views Assertion');
    expect(validation).toBeTruthy();
  });

  test('Test Case 5: Verify View Types for Sub Process - Admin Role', async ({ testUtil, planningListingPage, planningPage, commonFunctions, testData }) => {
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Subprocess', testData.PROCESS_NAME, testData.SUB_PROCESS_NAME);
    await planningPage.waitForViewToBeDisplayed();
    const arrViewTypes: string[] = await planningPage.getAllViewTypes();
    const validation: boolean = await commonFunctions.compareTwoValues(arrViewTypes.toString(), testData.ADMIN_VIEW_TYPES, 'All 3 view types should be available');
    expect(validation).toBeTruthy();
  });

  test('Test Case 6: Verify View Types for Assumption - Admin Role', async ({ testUtil, planningListingPage, planningPage, commonFunctions, testData }) => {
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Assumption', testData.PROCESS_NAME, '', testData.ASSUMPTION);
    await planningPage.waitForViewToBeDisplayed();
    const arrViewTypes: string[] = await planningPage.getAllViewTypes();
    const validation: boolean = await commonFunctions.compareTwoValues(arrViewTypes.toString(), testData.ADMIN_VIEW_TYPES, 'All 3 view types should be available');
    expect(validation).toBeTruthy();
  });
});

