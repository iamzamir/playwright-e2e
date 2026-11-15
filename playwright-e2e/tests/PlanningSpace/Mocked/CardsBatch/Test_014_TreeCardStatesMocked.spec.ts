import { test, expect } from '../../../../configs/fixtures';
import { JsonMockHandle, mockJson } from '../../../../util/api-mock.util';

/**
 * Mocked UI contract for CardsBatch Test_014 (plan T9.7 slice 1): the Tree card's no-data and error states, without
 * editing or saving the shared view. The real Test_014 keeps the card load and the endpoint configuration.
 * DataSetup `UIDataReset/Test_008_SeedTreeCardEndpoints` saves the routed endpoint into the view before the lanes start.
 * Run it first for a standalone run; if the view holds another endpoint, the route is never called and the test fails.
 */
const TREE_DATA = '**/lui/mockcards/v2/cards/mui5/TreeTable';
/** Same shape as the recorded TreeTable response, with no rows. */
const EMPTY_TREE_RESPONSE = { meta: { page: { totalCount: 0, offset: 0, limit: 25 } }, entities: [] };

test.describe.serial('Tree card states, mocked card data', () => {
  let mock: JsonMockHandle;

  test.skip((process.env.ENVIRONMENT || process.env.PSENV || 'INTEROP').trim().toUpperCase() !== 'INTEROP', 'Test data configured on INTEROP only');
  test.skip((process.env.GATEWAY_TYPE || '').toUpperCase() === 'GRAVITEE', 'Test data configured for the Azure gateway');

  const sentDataRequest = (): boolean => mock.calls.some((call) => call.method === 'POST');

  test.beforeAll(async ({ page, testUtil, testData }) => {
    // Before the first navigation: context.route on a loaded MFE page can hang.
    mock = await mockJson(page.context(), TREE_DATA, EMPTY_TREE_RESPONSE);
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);
  });

  test.afterAll(async () => {
    await mock?.();
  });

  test('Test Case 1: Empty response shows the no-data state', async ({ cardsPage, planningPage, commonFunctions, testData }) => {
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    const isCardShown = await commonFunctions.compareTwoValues(await cardsPage.verifyCardAfterSavingDashboard(testData.CARD_TITLE, testData.VIEW_NAME), true, `${testData.CARD_TITLE} shown in ${testData.VIEW_NAME}`);
    const hasNoRows = await commonFunctions.compareTwoValues(await cardsPage.verifyTreeTableDataInCard(testData.CARD_TITLE), false, 'Tree card has no rows');
    const isEmptyShown = await commonFunctions.compareTwoValues(await cardsPage.verifyNoColumnsStateInCard(testData.CARD_TITLE), true, 'No-data state shown');
    const isErrorHidden = await commonFunctions.compareTwoValues(await cardsPage.verifySomethingWentWrongInCard(testData.CARD_TITLE), false, 'Error state not shown for an empty response');
    const wasSent = await commonFunctions.compareTwoValues(sentDataRequest(), true, 'Card sent its data request to the mocked endpoint');
    expect(isCardShown && hasNoRows && isEmptyShown && isErrorHidden && wasSent).toBe(true);
  });

  test('Test Case 2: Failed response shows the error state', async ({ page, cardsPage, commonFunctions, testData }) => {
    mock.calls.length = 0;
    mock.respondWith({ status: 500, message: 'Synthetic mock response for status 500' }, 500);
    await page.reload();
    const isCardShown = await commonFunctions.compareTwoValues(await cardsPage.verifyCardAfterSavingDashboard(testData.CARD_TITLE, testData.VIEW_NAME), true, `${testData.CARD_TITLE} shown in ${testData.VIEW_NAME}`);
    const isErrorShown = await commonFunctions.compareTwoValues(await cardsPage.verifySomethingWentWrongInCard(testData.CARD_TITLE), true, 'Unable to load data state shown');
    const wasSent = await commonFunctions.compareTwoValues(sentDataRequest(), true, 'Card sent its data request to the mocked endpoint');
    expect(isCardShown && isErrorShown && wasSent).toBe(true);
  });
});
