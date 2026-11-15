import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Verify cards resize in planning space', () => {
  test.beforeAll(async ({ testUtil, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);
  });

  test('Test Case 1: Verify cards resize in planning space', async ({ planningPage, cardsPage, commonFunctions, testData }) => {
    await planningPage.selectViewByTypeAndName('All Views', testData.VIEW_NAME);
    const isCardResized = await cardsPage.verifyCardsResize();
    const validation = await commonFunctions.compareTwoValues(isCardResized, true, 'Cards are resized successfully in planning space');
    expect(validation).toBeTruthy();
  });
});