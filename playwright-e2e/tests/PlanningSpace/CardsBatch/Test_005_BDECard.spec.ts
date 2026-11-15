import { test, expect } from '../../../configs/fixtures';

const TestData = require("../../../testdata/" + process.env.PSENV + "/PlanningSpace/CardsBatch/Test_005_BDECard.json");

test.describe.serial('BDE should load with supplied scenario & scope', () => {
  const toggleLabelMap: Record<string, string> = {
    'Download': 'download',
    'Status': 'Process status',
    'Filter': 'Filter',
    'Upload': 'updload',
  };

  test.beforeAll(async ({ testUtil }) => {
    await testUtil.launchAppFromCatalog(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
  });

  test(`Test Case 1: verify actions in ${TestData.CARD_NAME} card`, async ({ cardsPage, planningPage, commonFunctions }) => {
    await planningPage.selectViewInPlanning(TestData.VIEW_NAME);
    const bValidation1: boolean = await cardsPage.verifyRefreshIconInBDE(TestData.CARD_NAME);
    await commonFunctions.compareTwoValues(bValidation1, true, `Is Refresh icon exist in ${TestData.CARD_NAME} card`);
    const bValidation2: boolean = await cardsPage.verifyMinimizeIconInBDE(TestData.CARD_NAME);
    await commonFunctions.compareTwoValues(bValidation2, true, `Is minimize icon exist in ${TestData.CARD_NAME} card`);
    const bValidation3: boolean = await cardsPage.verifyToggleIconInBDE(TestData.CARD_NAME, toggleLabelMap['Download']);
    await commonFunctions.compareTwoValues(bValidation3, true, `Is download csv icon exist in ${TestData.CARD_NAME} card`);
    const bValidation4: boolean = await cardsPage.verifyToggleIconInBDE(TestData.CARD_NAME, toggleLabelMap['Status']);
    await commonFunctions.compareTwoValues(bValidation4, true, `Is process status icon exist in ${TestData.CARD_NAME} card`);
    const bValidation5: boolean = await cardsPage.verifySettingsIconInBDE(TestData.CARD_NAME);
    await commonFunctions.compareTwoValues(bValidation5, true, `Is settings icon exist in ${TestData.CARD_NAME} card`);
    const bValidation6: boolean = await cardsPage.verifyToggleIconInBDE(TestData.CARD_NAME, toggleLabelMap['Filter']);
    await commonFunctions.compareTwoValues(bValidation6, true, `Is filter options icon exist in ${TestData.CARD_NAME} card`);
    const bValidation7: boolean = await cardsPage.verifyToggleIconInBDE(TestData.CARD_NAME, toggleLabelMap['Upload']);
    await commonFunctions.compareTwoValues(bValidation7, true, `Is upload csv icon exist in ${TestData.CARD_NAME} card`);
    const bValidation8: boolean = await cardsPage.verifyPaginationInBDE(TestData.CARD_NAME);
    await commonFunctions.compareTwoValues(bValidation8, true, `Is pagination exist in ${TestData.CARD_NAME} card`);
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8).toBeTruthy();
  });

  test(`Test Case 2: Is filter input available for each column in ${TestData.CARD_NAME} table`, async ({ cardsPage, commonFunctions }) => {
    const bValidation: boolean = await cardsPage.verifyFilterInputInEachColumnAvailable(TestData.CARD_NAME);
    await commonFunctions.compareTwoValues(bValidation, true, `Is filter input available for each column in ${TestData.CARD_NAME} table`);
    expect(bValidation).toBeTruthy();
  });
});
