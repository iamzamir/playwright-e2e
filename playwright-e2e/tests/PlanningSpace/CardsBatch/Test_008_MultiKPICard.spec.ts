import { test, expect } from '../../../configs/fixtures';

const cardTitle = 'multi-kpi test';

test.describe.serial('Should Create and Edit Multi KPI Card', () => {
  test.beforeAll(async ({ testUtil, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);
  });

  test('Test Case 1: View Should load with KPI card', async ({ cardsPage, planningPage, commonFunctions, testData }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test Case 1: View Should load with KPI card');
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    const bValidation1: boolean = await cardsPage.verifyCardAfterSavingDashboard(cardTitle, testData.VIEW_NAME);
    await commonFunctions.compareTwoValues(bValidation1, true, `Does card with title ${cardTitle} available in ${testData.VIEW_NAME} Page`);
    expect(bValidation1).toBeTruthy();
    await commonFunctions.logMessage('PASS', 'Test Case 1 completed successfully.');
  });

  test('Test Case 2: Should edit card', async ({ cardsPage, commonFunctions }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test Case 2: Should edit card');
    const bValidation1: boolean = await cardsPage.clickEditView();
    await commonFunctions.compareTwoValues(bValidation1, true, 'Clicked on edit icon in view');
    const bValidation2: boolean = await cardsPage.addSubscriptionEvent(cardTitle);
    await commonFunctions.compareTwoValues(bValidation2, true, `Is subscription added successfully for ${cardTitle} card`);
    expect(bValidation1 && bValidation2).toBeTruthy();
    await commonFunctions.logMessage('PASS', 'Test Case 2 completed successfully.');
  });

  test('Test Case 3: Click on any graph it should refresh', async ({ cardsPage, commonFunctions }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test Case 3: Click on any graph it should refresh');
    const bValidation1: boolean = await cardsPage.verifyMultiKPICardRefresh(cardTitle);
    await commonFunctions.compareTwoValues(bValidation1, true, `Graph refreshed for ${cardTitle} card`);
    expect(bValidation1).toBeTruthy();
    await commonFunctions.logMessage('PASS', 'Test Case 3 completed successfully.');
  });

  test('Test Case 4: Remove subscription for card', async ({ cardsPage, commonFunctions }) => {
    await commonFunctions.logMessage('INFO', 'Starting Test Case 4: Remove subscription for card');
    const bValidation1: boolean = await cardsPage.clickEditView();
    await commonFunctions.compareTwoValues(bValidation1, true, 'Clicked on edit icon');
    expect(bValidation1).toBeTruthy();
    const bValidation2: boolean = await cardsPage.deleteSubscription(cardTitle);
    await commonFunctions.compareTwoValues(bValidation2, true, `Subscription deleted for ${cardTitle} card`);
    expect(bValidation2).toBeTruthy();
    await commonFunctions.logMessage('PASS', 'Test Case 4 completed successfully.');
  });
});
