import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Live Blocks - Extended', () => {
  test.beforeAll(async ({ testUtil, planningPage, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.clickViewDropdown();
    await planningPage.selectViewType('All Views');
    await planningPage.selectView(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);
  });

  test('Test case 1: Validate avatar presence when user is active in planning space view', async ({ planningPage, commonFunctions }) => {
    const avatarGroupDisplayed = await planningPage.isLiveblocksAvatarGroupDisplayed();
    const validation1 = await commonFunctions.compareTwoValues(avatarGroupDisplayed, true, `Avatar group displayed for user1: ${avatarGroupDisplayed}`);
    const avatarCount = await planningPage.getLiveblocksAvatarCount();
    const validation2 = await commonFunctions.compareTwoValues(avatarCount > 0, true, `Avatar count should be > 0 for user1, actual: ${avatarCount}`);
    expect(validation1 && validation2).toEqual(true);
  });

  test('Test case 2: Validate display of users currently viewing the same planning space view', async ({ testUtil, planningPage, commonFunctions, testData }) => {
    await testUtil.signOutAndLoginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.clickViewDropdown();
    await planningPage.selectViewType('All Views');
    await planningPage.selectView(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);
    const avatarGroupDisplayed = await planningPage.isLiveblocksAvatarGroupDisplayed();
    const avatarCount = await planningPage.getLiveblocksAvatarCount();
    const labels = await planningPage.getLiveblocksAvatarLabels();
    const validation1 = await commonFunctions.compareTwoValues(avatarGroupDisplayed, true, `Avatar group displayed for user2: ${avatarGroupDisplayed}`);
    const validation2 = await commonFunctions.compareTwoValues(avatarCount > 0, true, `Avatar count should be > 0 for user2, actual: ${avatarCount}`);
    const validation3 = await commonFunctions.compareTwoValues(labels.some((label) => (label || '').trim().length > 0), true, `At least one avatar should have aria-label for user2, labels: ${JSON.stringify(labels)}`);
    expect(validation1 && validation2 && validation3).toEqual(true);
  });
});
