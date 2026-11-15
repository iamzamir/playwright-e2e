import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Tabular Card Automation Testing', () => {
  test.beforeAll(async ({ testUtil, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);
  });

  test('Test Case 1: Should check if card exists', async ({ cardsPage, planningPage, commonFunctions, testData }) => {
    const cardTitle = testData.CARD_TITLE as string;
    await commonFunctions.logMessage('INFO', 'Starting Test Case 1: Should check if card exists');
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    const bValidation1: boolean = await cardsPage.verifyCardAfterSavingDashboard(cardTitle, testData.VIEW_NAME);
    await commonFunctions.compareTwoValues(bValidation1, true, `Does card with title ${cardTitle} available in ${testData.VIEW_NAME} Page`);
    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 2: Edit Functionality to Save Changes for Tabular Card', async ({ cardsPage, commonFunctions, testData }) => {
    const editableCardTitle = testData.CARD_TITLE as string;
    await commonFunctions.logMessage('INFO', 'Starting Test Case 2: Edit functionality - Save Changes');
    const bValidation1: boolean = await cardsPage.clickEditView();
    await commonFunctions.compareTwoValues(bValidation1, true, 'Edit button clicked');
    const bValidation2: boolean = await cardsPage.editTableCardAndVerifyButtons(editableCardTitle);
    await commonFunctions.compareTwoValues(bValidation2, true, `Does ${editableCardTitle} available in ${testData.VIEW_NAME} view have Save and Cancel buttons`);
    const bValidation3: boolean = await cardsPage.makeTableCellEditableAndSaveChanges();
    await commonFunctions.compareTwoValues(bValidation3, true, `Does row with ${editableCardTitle} available in ${testData.VIEW_NAME} view edit and save successfully`);
    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 3: Edit Functionality to Cancel Changes for Tabular Card', async ({ cardsPage, commonFunctions, testData }) => {
    const editableCardTitle = testData.CARD_TITLE as string;
    await commonFunctions.logMessage('INFO', 'Starting Test Case 3: Edit functionality - Cancel Changes');
    const bValidation1: boolean = await cardsPage.editTableCardAndVerifyButtons(editableCardTitle);
    await commonFunctions.compareTwoValues(bValidation1, true, `Does ${editableCardTitle} available in ${testData.VIEW_NAME} view have Save and Cancel buttons`);
    const bValidation2: boolean = await cardsPage.makeTableCellEditableAndCancelChanges();
    await commonFunctions.compareTwoValues(bValidation2, true, `Does row with ${editableCardTitle} available in ${testData.VIEW_NAME} view discard changes successfully`);
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 4: Multiple chips with filtering functionality', async ({ cardsPage, commonFunctions, testData }) => {
    const cardTitle = testData.CARD_TITLE as string;
    await commonFunctions.logMessage('INFO', 'Starting Test Case 4: Multiple chips with filtering functionality');
    const bValidation1: boolean = await cardsPage.multipleChipsFiltering();
    await commonFunctions.compareTwoValues(bValidation1, true, `Is the cell in ${cardTitle} available within the ${testData.VIEW_NAME} view equipped with chips that include filtering functionality?`);
    expect(bValidation1).toBeTruthy();
  });
});
