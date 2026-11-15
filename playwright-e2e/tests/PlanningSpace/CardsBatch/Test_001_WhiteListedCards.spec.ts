import { test, expect } from '../../../configs/fixtures';

test.describe.serial('White Listed Cards', () => {

  test('Test Case 1: Verify White Listed Cards Present', async ({ testUtil, cardsPage, planningPage, commonFunctions, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
        const bValidation: boolean = await cardsPage.clickEditView();
    await commonFunctions.compareTwoValues(bValidation, true, 'Edit button clicked successfully');
    await cardsPage.clickAddCardButton();
    await cardsPage.clickCreateCardButton();
    const arrCardName: string[] = await cardsPage.getAllCardNames();
    const expectedCards: string[] = (testData.CARD_NAMES as string).split(',');
    let isTestRes = true;
    for (const expectedCard of expectedCards) {
      const isStepRes = await commonFunctions.compareTwoValues(arrCardName.includes(expectedCard), true, `${expectedCard} Card Name Displays Assertion`);
      isTestRes = isStepRes && isTestRes;
    }
    expect(isTestRes && bValidation).toEqual(true);
  });
});
``finish the installer prompt