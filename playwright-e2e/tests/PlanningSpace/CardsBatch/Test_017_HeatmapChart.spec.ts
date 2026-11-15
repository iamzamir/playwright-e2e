import { test, expect } from '../../../configs/fixtures';

const cardTitle = 'Heatmap Chart';

test.describe.serial('Should Create, Edit, Configure & Heatmap Chart', () => {

  test.beforeAll(async ({ testUtil, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);
  });

  test('Test Case 1: Should check if card exists', async ({ cardsPage, planningPage, commonFunctions, testData }) => {
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    const bValidation1: boolean = await cardsPage.verifyCardAfterSavingDashboard(cardTitle, testData.VIEW_NAME);
    await commonFunctions.compareTwoValues(bValidation1, true, `Does card with title ${cardTitle} available in ${testData.VIEW_NAME} Page`);
    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 2: Verify Graph is Visible', async ({ cardsPage, commonFunctions, testData }) => {
    const bValidation1: boolean = await cardsPage.clickEditView();
    await commonFunctions.compareTwoValues(bValidation1, true, `Clicked on edit icon in ${testData.VIEW_NAME} view`);
    await cardsPage.addAnotherCardOrContainer('Card');
    const bValidation2: boolean = await cardsPage.editPredefinedEndpoint(cardTitle, testData.DATA_ENDPOINT_OPTION);
    await commonFunctions.compareTwoValues(bValidation2, true, `Is predefined endpoint field updated successfully for ${cardTitle} card`);
    await cardsPage.clickBackButtonInCardGallery();
    await cardsPage.saveCardInView();
    const isGraphVisible: boolean = await cardsPage.verifyGraphInCard(cardTitle);
    await commonFunctions.compareTwoValues(isGraphVisible, true, `Graph should be visible in the card titled '${cardTitle}'`);
    expect(bValidation1 && bValidation2 && isGraphVisible).toBeTruthy();
  });
});