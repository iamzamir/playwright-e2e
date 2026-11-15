import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Create Placeholder with NPI Flyout', () => {

  test.beforeAll(async ({ testUtil, planningPage, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.clickViewDropdown();
    await planningPage.selectViewType('All Views');
    await planningPage.selectView(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);
  });

  test('Test Case 1: Validate dimensions in UI with API response', async ({ planningPage, commonFunctions, testData, page }) => {
    const capturedResponses: Array<{ url: string; data: any }> = [];
    const responseHandler = async (response: any) => {
      const url = response.url();
      const isRelevantUrl = url.includes(testData.PROCEDURE_URL) || url.includes(testData.ACTOR_CONFIG_BASE_URL) || url.includes(testData.NODE_CONFIG_BASE_URL);
      if (!isRelevantUrl || response.request().method() !== 'GET' || response.status() >= 400) {
        return;
      }
      try {
        capturedResponses.push({ url, data: await response.json() });
      } catch {
        // ignore non-json responses
      }
    };

    page.on('response', responseHandler);
    await planningPage.performCardCellMoreActions('PivotCard', testData.ITEM_TO_CLONE, testData.CARD_ACTION_NAME);
    const validation1 = await commonFunctions.compareTwoValues(await planningPage.isFlyoutOpen(), true, 'Flyout is opened');

    await expect.poll(async () => capturedResponses.some((r) => r.url.includes(testData.PROCEDURE_URL + testData.PROCEDURE_NAME)), {
      timeout: 60000,
      message: 'Expected procedure config response to be captured'
    }).toBe(true);

    const npiProcedureResponse = capturedResponses.find((r) => r.url.includes(testData.PROCEDURE_URL + testData.PROCEDURE_NAME))?.data;
    const actorConfigName = npiProcedureResponse?.actorsConfig?.[0];
    expect(actorConfigName).toBeTruthy();

    await expect.poll(async () => capturedResponses.some((r) => r.url.includes(testData.ACTOR_CONFIG_BASE_URL + actorConfigName)), {
      timeout: 60000,
      message: 'Expected actor config response to be captured'
    }).toBe(true);

    const actorConfigResponse = capturedResponses.find((r) => r.url.includes(testData.ACTOR_CONFIG_BASE_URL + actorConfigName))?.data;
    const planningNode = actorConfigResponse?.params?.planningNode;
    expect(planningNode).toBeTruthy();

    await expect.poll(async () => capturedResponses.some((r) => r.url.includes(testData.NODE_CONFIG_BASE_URL + planningNode)), {
      timeout: 60000,
      message: 'Expected node config response to be captured'
    }).toBe(true);

    const planningNodeResponse = capturedResponses.find((r) => r.url.includes(testData.NODE_CONFIG_BASE_URL + planningNode))?.data;
    const expectedDimensions = (planningNodeResponse?.dimensions || []).map((dimension: any) => dimension.name);
    const validation2 = await commonFunctions.compareTwoValues(await planningPage.validateDimesionsInUI(expectedDimensions), true, 'Dimensions in UI match with API response');

    page.off('response', responseHandler);
    await planningPage.clickOnCancelIcon();
    expect(validation1 && validation2).toEqual(true);
  });

  test('Test Case 2: Create Member in reference assortment mode', async ({ planningPage, commonFunctions, testData }) => {
    const formData = [{ DIMENSION_NAME: 'ITEM', newItemName: uniqueName('New Item') }];
    await planningPage.performCardCellMoreActions('PivotCard', testData.ITEM_TO_CLONE, testData.CARD_ACTION_NAME);
    const validation1 = await commonFunctions.compareTwoValues(await planningPage.isFlyoutOpen(), true, 'Flyout is opened');
    await planningPage.createMemberForm(formData, 'ref-assortment', 'Member');
    const validation2 = await commonFunctions.compareTwoValues(await planningPage.verifyAlertMsg('running'), true, 'Alert message is displayed as running');
    const validation3 = await commonFunctions.compareTwoValues(await planningPage.verifyAlertMsg('success'), true, 'Alert message is displayed as success');
    expect(validation1 && validation2 && validation3).toEqual(true);
  });

  test('Test Case 3: Create Member with custom values in choose mode', async ({ planningPage, commonFunctions, testData }) => {
    const formData = [
      { DIMENSION_NAME: 'ITEM', VALUE: 'NPI>NPI-5>NPI5', newItemName: uniqueName('New Item 1'), noOfVariants: '2' },
      { DIMENSION_NAME: 'CUSTOMER', VALUE: ['ALL CUSTOMERS>RETAIL1>RETAIL KEY ACCOUNTS2>HEMA', 'ALL CUSTOMERS>WHOLESALE>WHOLESALE OTHER ACCOUNTS>WHOLESALE OTHERS'] },
      { DIMENSION_NAME: 'LOCATION', VALUE: ['ALL DEMAND LOCATIONS>APAC>CN>SHANGHAI', 'ALL DEMAND LOCATIONS>EMEA>SE>STOCKHOLM'] }
    ];

    await planningPage.performCardCellMoreActions('PivotCard', testData.ITEM_TO_CLONE, testData.CARD_ACTION_NAME);
    const validation1 = await commonFunctions.compareTwoValues(await planningPage.isFlyoutOpen(), true, 'Flyout is opened');
    await planningPage.createMemberForm(formData, 'choose', 'Member');
    const validation2 = await commonFunctions.compareTwoValues(await planningPage.verifyAlertMsg('running'), true, 'Alert message is displayed as running');
    const validation3 = await commonFunctions.compareTwoValues(await planningPage.verifyAlertMsg('success'), true, 'Alert message is displayed as success');
    expect(validation1 && validation2 && validation3).toEqual(true);
  });

  test('Test Case 4: Create Intersection with custom values', async ({ planningPage, commonFunctions, testData }) => {
    const formData = [
      { DIMENSION_NAME: 'ITEM', VALUE: 'PF-52>PL-027>CNSUM_FCST_Item93', newItemName: uniqueName('New Item 11') },
      { DIMENSION_NAME: 'CUSTOMER', VALUE: ['ALL CUSTOMERS>WHOLESALE>WHOLESALE OTHER ACCOUNTS>KEY ACCOUNT 3'] },
      { DIMENSION_NAME: 'LOCATION', VALUE: ['ALL DEMAND LOCATIONS>EUROPE>WEST_DC>AmsterdamStore2'] }
    ];

    await planningPage.performCardCellMoreActions('PivotCard', testData.ITEM_TO_CLONE, testData.CARD_ACTION_NAME);
    const validation1 = await commonFunctions.compareTwoValues(await planningPage.isFlyoutOpen(), true, 'Flyout is opened');
    await planningPage.createMemberForm(formData, 'choose', 'Intersection');
    const validation2 = await commonFunctions.compareTwoValues(await planningPage.verifyAlertMsg('running'), true, 'Alert message is displayed as running');
    const validation3 = await commonFunctions.compareTwoValues(await planningPage.verifyAlertMsg('success'), true, 'Alert message is displayed as success');
    expect(validation1 && validation2 && validation3).toEqual(true);
  });
});
