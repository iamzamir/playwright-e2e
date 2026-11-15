import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Verify Scope Component', () => {
  test('Test Case 1: Verify Scope in Process page', async ({ planningPage, commonFunctions, testUtil, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);

    const isScopeTabOpened = await planningPage.openComponent('Scope');
    const isScopeDrawerOpened = await planningPage.doesDrawerOpened('Scope');

    const isScopeTabOpenedValidation = await commonFunctions.compareTwoValues(isScopeTabOpened, true, 'Scope chip is enabled Assertion');
    const isScopeDrawerOpenedValidation = await commonFunctions.compareTwoValues(isScopeDrawerOpened, true, 'Scope drawer is opened Assertion');

    expect(isScopeTabOpenedValidation && isScopeDrawerOpenedValidation).toBe(true);
  });
});
