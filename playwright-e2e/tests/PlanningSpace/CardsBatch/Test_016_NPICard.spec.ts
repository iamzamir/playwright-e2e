import { test, expect } from '../../../configs/fixtures';

const cardTitle = 'Metadata Summary Card (NPI)';

test.describe.serial('Should edit & Configure NPI card', () => {
  test.beforeAll(async ({ testUtil, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);
  });

  test('Test Case 1: Should check if card exists', async ({ cardsPage, planningPage, commonFunctions, testData }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test Case 1: Should check if card exists');
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    const bValidation1: boolean = await cardsPage.verifyCardAfterSavingDashboard(cardTitle, testData.VIEW_NAME);
    await commonFunctions.compareTwoValues(bValidation1, true, `Does card with title ${cardTitle} available in ${testData.VIEW_NAME} Page`);
    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 2: Verify Data is Visible', async ({ cardsPage, commonFunctions, testData }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test Case 2: Verify Data is Visible');
    const bValidation1: boolean = await cardsPage.clickEditView();
    await commonFunctions.compareTwoValues(bValidation1, true, `Clicked on edit icon in ${testData.VIEW_NAME} view`);
    const bValidation2: boolean = await cardsPage.addAnotherCardOrContainer('Card');
    await commonFunctions.compareTwoValues(bValidation2, true, 'Opened card gallery in edit mode');
    const bValidation3: boolean = await cardsPage.editNpiCardEndpoint(cardTitle, testData.DATA_ENDPOINT_OPTION);
    await commonFunctions.compareTwoValues(bValidation3, true, `Is endpoint updated successfully for ${cardTitle} card`);
    await cardsPage.clickBackButtonInCardGallery();
    await cardsPage.saveCardInView();
    const bValidation4: boolean = await cardsPage.verifyDataInNPICard(cardTitle);
    await commonFunctions.compareTwoValues(bValidation4, true, `Data should be visible in the card titled '${cardTitle}'`);
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test('Test Case 3: Verify No data available', async ({ cardsPage, commonFunctions, testData }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test Case 3: Verify No data available');
    const bValidation1: boolean = await cardsPage.clickEditView();
    await commonFunctions.compareTwoValues(bValidation1, true, `Clicked on edit icon in ${testData.VIEW_NAME} view`);
    const bValidation2: boolean = await cardsPage.addAnotherCardOrContainer('Card');
    await commonFunctions.compareTwoValues(bValidation2, true, 'Opened card gallery in edit mode');
    const bValidation3: boolean = await cardsPage.editNpiCardEndpoint(cardTitle, testData.WRONG_ENDPOINT_OPTION);
    await commonFunctions.compareTwoValues(bValidation3, true, `Is endpoint updated successfully for ${cardTitle} card`);
    await cardsPage.clickBackButtonInCardGallery();
    await cardsPage.saveCardInView();
    const bValidation4: boolean = await cardsPage.verifyDataInNPICard(cardTitle);
    await commonFunctions.compareTwoValues(!bValidation4, true, `Is no data available for ${cardTitle} card`);
    expect(bValidation1 && bValidation2 && bValidation3 && !bValidation4).toBeTruthy();
  });
});
