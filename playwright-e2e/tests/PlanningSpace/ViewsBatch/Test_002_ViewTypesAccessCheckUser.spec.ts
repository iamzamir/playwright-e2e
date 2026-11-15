import { test, expect } from '../../../configs/fixtures';


test.describe.serial('View Types Verification for Admin and User Role', () => {
  test('Test Case 1: Verify View Types for Process - User Role', async ({ testUtil, planningPage, commonFunctions, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME2 as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      testData.PROCESS_NAME
    );
    await planningPage.waitForViewToBeDisplayed();
    const arrViewTypes: string[] = await planningPage.getAllViewTypes();
    const validation: boolean = await commonFunctions.compareTwoValues(arrViewTypes.toString(), testData.USER_VIEW_TYPES, 'Only 2 view types should be available');
    expect(validation).toBeTruthy();
  });

  test('Test Case 2: Verify All Views - User Role', async ({ planningPage, commonFunctions, testData }) => {
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

  test('Test Case 3: Verify Favourites views - User Role', async ({ planningPage, commonFunctions, testData }) => {
    await planningPage.selectViewType('Favourites');
    const viewsFromPS: string[] = await planningPage.getAllViews();
    const validation: boolean = await commonFunctions.compareTwoValues(viewsFromPS.toString(), testData.FAVOURITES, 'Favourites Views Assertion');
    expect(validation).toBeTruthy();
  });

  test('Test Case 4: Verify View Types for Sub Process - User Role', async ({ testUtil, planningListingPage, planningPage, commonFunctions, testData }) => {
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Subprocess', testData.PROCESS_NAME, testData.SUB_PROCESS_NAME);
    await planningPage.waitForViewToBeDisplayed();
    const arrViewTypes: string[] = await planningPage.getAllViewTypes();
    const validation: boolean = await commonFunctions.compareTwoValues(arrViewTypes.toString(), testData.USER_VIEW_TYPES, 'Only 2 view types should be available');
    expect(validation).toBeTruthy();
  });

  test('Test Case 5: Verify View Types for Assumption - User Role', async ({ testUtil, planningListingPage, planningPage, commonFunctions, testData }) => {
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Assumption', testData.PROCESS_NAME, '', testData.ASSUMPTION);
    await planningPage.waitForViewToBeDisplayed();
    const arrViewTypes: string[] = await planningPage.getAllViewTypes();
    const validation: boolean = await commonFunctions.compareTwoValues(arrViewTypes.toString(), testData.USER_VIEW_TYPES, 'Only 2 view types should be available');
    expect(validation).toBeTruthy();
  });
});
