import { test, expect } from '../../../configs/fixtures';

test.describe.serial('PowerBar - Recently viewed tabs - PO', () => {
  let USER_NAME: string;

  test.beforeAll(async () => {
    // Built at runtime: a literal FUNCTIONAL_TEST_USERNAME2 would make the auth fixture preload
    // user2 storage state for every environment, including INTEROP which runs as user1.
    USER_NAME = process.env.PSENV === 'QA'
      ? process.env['FUNCTIONAL_TEST_USERNAME' + '2'] as string
      : process.env.FUNCTIONAL_TEST_USERNAME as string;
  });

  test('Test Case 1: To test the recently viewed tabs for power bar', async ({ testUtil, processPage, powerBarPage, commonFunctions, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, USER_NAME, process.env.FUNCTIONAL_TEST_PASSWORD, process.env.POLINK as string);
    await processPage.clickOnProcess(testData.PROCESS_NAME);
    const verifyRecentlyViewedProcess = await powerBarPage.verifyRecentlyViewedProcess(testData.PROCESS_NAME, 'Process', testData.RECENTLY_OPENED_PROCESS, testData.IS_PLANNING_SPACE);
    const validation: boolean = await commonFunctions.compareTwoValues(verifyRecentlyViewedProcess, true, "verify recently opened project in power bar tooltip");
    expect(validation).toEqual(true);
    await commonFunctions.logMessage("INFO", "Test case 1: recently viewed tabs for power bar verified successfully");
  });
});


