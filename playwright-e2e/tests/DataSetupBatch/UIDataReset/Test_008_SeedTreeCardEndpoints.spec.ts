import { test, expect } from '../../../configs/fixtures';

/**
 * Saves the TreeTable endpoints into the shared Tree card view before the lanes start. The mocked Test_014 routes that
 * URL, so it needs this state no matter which order the lanes run in (plan T9.7). Saving the same values again is safe.
 */
test.describe.serial('Seed Tree card endpoints', () => {
  test.skip((process.env.ENVIRONMENT || process.env.PSENV || 'INTEROP').trim().toUpperCase() !== 'INTEROP', 'Only the INTEROP mocked lane uses this view state');
  test.skip((process.env.GATEWAY_TYPE || '').toUpperCase() === 'GRAVITEE', 'The mocked Tree card spec runs on the Azure gateway only');

  test('Test Case 1: Save the TreeTable endpoints in the Tree card', async ({ testUtil, planningPage, cardsPage, commonFunctions, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    const isEditMode = await commonFunctions.compareTwoValues(await cardsPage.clickEditView(), true, `${testData.VIEW_NAME} opened in edit mode`);
    const isGalleryOpen = await commonFunctions.compareTwoValues(await cardsPage.addAnotherCardOrContainer('Card'), true, 'Card gallery opened');
    const isSaved = await commonFunctions.compareTwoValues(await cardsPage.editTreeTableEndpoints(testData.CARD_TITLE, testData.DATA_ENDPOINT, testData.COLUMNS_ENDPOINT), true, `Endpoints set on ${testData.CARD_TITLE}`);
    await cardsPage.clickBackButtonInCardGallery();
    await cardsPage.saveCardInView();
    const hasRows = await commonFunctions.compareTwoValues(await cardsPage.verifyTreeTableDataInCard(testData.CARD_TITLE), true, `${testData.CARD_TITLE} shows rows after the save`);
    expect(isEditMode && isGalleryOpen && isSaved && hasRows).toBe(true);
  });
});
