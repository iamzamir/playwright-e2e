import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/fixtures';

const TestData = require("../../../testdata/" + process.env.PSENV + "/PlanningSpace/CardsBatch/Test_002_CardActions.json");

const cardTitle = uniqueName('Card_Actions_test');
const cardDesc = `${cardTitle}_short_description`;

test.describe.serial('Should Create, Edit, Configure & Delete Card', () => {

  test.beforeAll(async ({ testUtil }) => {
    await testUtil.launchAppFromCatalog(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
  });

  test('Test Case 1: Should create card', async ({ cardsPage, planningPage, commonFunctions }) => {
    const card = 'MaaS Pivot Card Type';

    await planningPage.selectViewInPlanning(TestData.VIEW_NAME);
    const bValidation1 = await cardsPage.clickEditView();
    await commonFunctions.compareTwoValues(bValidation1, true, 'Edit button clicked');

    const isCardsExist = await cardsPage.verifyAtleastOneCardExistInView();
    let bValidation2: boolean;
    if (isCardsExist) {
      bValidation2 = await cardsPage.addAnotherCardOrContainer('Card');
    } else {
      bValidation2 = await cardsPage.addCardOrContainer('Card');
    }
    await commonFunctions.compareTwoValues(bValidation2, true, 'Clicked on add card button');
    const bValidation3 = await cardsPage.clickCreateCardBtn();
    await commonFunctions.compareTwoValues(bValidation3, true, 'Clicked on create card button');
    const bValidation4 = await cardsPage.clickOnCreateCardInItemGallery(card);
    await commonFunctions.compareTwoValues(bValidation4, true, `Clicked on create card button in ${card} card`);
    await cardsPage.setCardSettingsTitleInput(cardTitle);
    await cardsPage.clickPublishBtn();
    const bValidation5 = await cardsPage.verifyCardAvailableInCardGallery(cardTitle);
    await commonFunctions.compareTwoValues(bValidation5, true, `Does card with title ${cardTitle} available in card gallery`);
    await cardsPage.addCardToViewFromGallery(cardTitle);
    const bValidation6 = await cardsPage.verifyCardInView(cardTitle, TestData.VIEW_NAME, true);
    await commonFunctions.compareTwoValues(bValidation6, true, `Does card with title ${cardTitle} available in Edit ${TestData.VIEW_NAME} Page`);
    await cardsPage.saveCardInView();
    const bValidation7 = await cardsPage.verifyCardAfterSavingDashboard(cardTitle, TestData.VIEW_NAME);
    await commonFunctions.compareTwoValues(bValidation7, true, `Does card with title ${cardTitle} available in ${TestData.VIEW_NAME} Page`);

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7).toBeTruthy();
  });

  test('Test Case 2: Should edit card', async ({ cardsPage, commonFunctions }) => {
    const bValidation1 = await cardsPage.clickEditView();
    await commonFunctions.compareTwoValues(bValidation1, true, `Clicked on edit icon in ${TestData.VIEW_NAME} view`);
    await cardsPage.addAnotherCardOrContainer('Card');
    await cardsPage.editCardInGallery(cardTitle, cardDesc);
    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 3: Should config card', async ({ cardsPage, commonFunctions }) => {
    await cardsPage.configCardInGallery(cardTitle, TestData.CONFIG_SERVICE_API, TestData.CONTROLLER_SERVICE_API);
    await cardsPage.clickBackButtonInCardGallery();
    const bValidation1 = await cardsPage.enablePageContext(cardTitle, TestData.VIEW_NAME);
    await commonFunctions.compareTwoValues(bValidation1, true, `Does apply page context enabled in ${cardTitle} card settings`);
    await cardsPage.saveCardInView();
    const bValidation2 = await cardsPage.verifyCardAfterSavingDashboard(cardTitle, TestData.VIEW_NAME);
    await commonFunctions.compareTwoValues(bValidation2, true, `Does card with title ${cardTitle} available in ${TestData.VIEW_NAME} Page`);
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test.afterAll('Test Case 4:Delete created card', async ({ cardsPage, commonFunctions }) => {
    const bValidation1 = await cardsPage.clickEditView();
    await commonFunctions.compareTwoValues(bValidation1, true, `Clicked on edit icon in ${TestData.VIEW_NAME} view`);
    await cardsPage.addAnotherCardOrContainer('Card');
    const bValidation2 = await cardsPage.removeCardFromGallery(cardTitle);
    await commonFunctions.compareTwoValues(bValidation2, true, `${cardTitle} card is deleted from gallery`);
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

});
