import { test, expect } from '../../../configs/fixtures';

const cardTitle = 'my task filter';

test.describe.serial('Should edit & Configure My Task', () => {
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
    await commonFunctions.logMessage('PASS', 'Test Case 1 completed successfully.');
  });

  test('Test Case 2: Verify Data is Shown', async ({ cardsPage, commonFunctions, testData }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test Case 2: Verify Data is Shown');
    const bValidation1: boolean = await cardsPage.clickEditView();
    await commonFunctions.compareTwoValues(bValidation1, true, `Clicked on edit icon in ${testData.VIEW_NAME} view`);
    const bValidation2: boolean = await cardsPage.addAnotherCardOrContainer('Card');
    await commonFunctions.compareTwoValues(bValidation2, true, 'Opened card gallery in edit mode');
    const bValidation3: boolean = await cardsPage.editMyTaskCard(cardTitle);
    await commonFunctions.compareTwoValues(bValidation3, true, `Is Description field updated successfully for ${cardTitle} card`);
    await cardsPage.clickBackButtonInCardGallery();
    await cardsPage.saveCardInView();
    const bValidation4: boolean = await cardsPage.verifyDataInMyTaskCardAfterSave(cardTitle);
    await commonFunctions.compareTwoValues(bValidation4, true, `Data should be visible in the card titled '${cardTitle}'`);
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
    await commonFunctions.logMessage('PASS', 'Test Case 2 completed successfully.');
  });

  test('Test Case 3: Verify Action item should display with filter data', async ({ page, cardsPage, commonFunctions }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test Case 3: Verify if action items page is displayed');
    const popupPromise = page.context().waitForEvent('page');
    await cardsPage.clickOnMyTaskTitle(cardTitle, 'New Insights');
    const actionItemsPage = await popupPromise;
    await actionItemsPage.waitForURL(/lui-dashboard-scaffolding-integration/, { timeout: 90000 });
    const pathValidation: boolean = actionItemsPage.url().includes('lui-dashboard-scaffolding-integration');
    await commonFunctions.compareTwoValues(pathValidation, true, 'Action item page url contains lui-dashboard-scaffolding-integration');
    expect(pathValidation).toBeTruthy();
    await actionItemsPage.close();
    await commonFunctions.logMessage('PASS', 'Test Case 3 completed successfully.');
  });

  test('Test Case 4: Verify No data available', async ({ page, cardsPage, commonFunctions, testData }) => {
    await page.bringToFront();
    await commonFunctions.logMessage('INFO', 'Starting Test Case 4: Verify No data available');
    const bValidation1: boolean = await cardsPage.clickEditView();
    await commonFunctions.compareTwoValues(bValidation1, true, `Clicked on edit icon in ${testData.VIEW_NAME} view`);
    const bValidation2: boolean = await cardsPage.addAnotherCardOrContainer('Card');
    await commonFunctions.compareTwoValues(bValidation2, true, 'Opened card gallery in edit mode');
    const bValidation3: boolean = await cardsPage.editDataAndMetadataEndpoints(cardTitle, testData.NO_DATA_ENDPOINT, testData.NO_DATA_META_ENDPOINT);
    await commonFunctions.compareTwoValues(bValidation3, true, `Is endpoints updated successfully for ${cardTitle} card`);
    await cardsPage.clickBackButtonInCardGallery();
    await cardsPage.saveCardInView();
    const bValidation4: boolean = await cardsPage.verifyNoColumnsStateInCard(cardTitle);
    await commonFunctions.compareTwoValues(bValidation4, true, `No columns state should be visible in the card titled '${cardTitle}'`);
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
    await commonFunctions.logMessage('PASS', 'Test Case 4 completed successfully.');
  });

  test('Test Case 5: Verify Something went wrong', async ({ cardsPage, commonFunctions, testData }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test Case 5: Verify Something went wrong');
    const bValidation1: boolean = await cardsPage.clickEditView();
    await commonFunctions.compareTwoValues(bValidation1, true, `Clicked on edit icon in ${testData.VIEW_NAME} view`);
    const bValidation2: boolean = await cardsPage.addAnotherCardOrContainer('Card');
    await commonFunctions.compareTwoValues(bValidation2, true, 'Opened card gallery in edit mode');
    const bValidation3: boolean = await cardsPage.editDataAndMetadataEndpoints(cardTitle, testData.WRONG_ENDPOINT, testData.WRONG_ENDPOINT);
    await commonFunctions.compareTwoValues(bValidation3, true, `Is Description field updated successfully for ${cardTitle} card`);
    await cardsPage.clickBackButtonInCardGallery();
    await cardsPage.saveCardInView();
    const bValidation4: boolean = await cardsPage.verifySomethingWentWrongInCard(cardTitle);
    await commonFunctions.compareTwoValues(bValidation4, true, `Unable to load data state should be visible in the card titled '${cardTitle}'`);
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
    await commonFunctions.logMessage('PASS', 'Test Case 5 completed successfully.');
  });
});