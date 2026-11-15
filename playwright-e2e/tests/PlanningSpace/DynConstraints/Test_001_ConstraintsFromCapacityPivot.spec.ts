import { test, expect } from '../../../configs/fixtures';
import { ConstraintPage, ConstraintResourceDetails, ConstraintAddAssociationDetails } from '../../../pageobjects/constraint.page';
import apiUtil from '../../../util/api.util';

const defaultLuminatePortalUrl = process.env.LUMINATE_PORTAL_URL;
const defaultRealmKey = process.env.REALM_KEY;
const defaultNavPlanning = process.env.NAVIGATE_TO_PLANNING_SPACE;
const defaultApiBaseUrl = process.env.API_BASE_URL;

let dynamicResourceName: string;
let copiedResourceName: string;
let childScenarioName: string;
let accessToken = '';

test.describe.serial('Create, Copy and Edit Resource Constraint from Capacity Constraints Pivot card', () => {

  test.beforeAll(async ({ testUtil, planningPage, testData, scenarioPage }) => {
    const constraintDetails = testData.constraintDetails;
    const resourceDetailsData = constraintDetails?.ResourceDetails;
    dynamicResourceName = `${resourceDetailsData.resource}_${Date.now()}`;
    copiedResourceName = `Copy of ${dynamicResourceName}`;
    process.env.REALM_KEY = 'augtwo-test1';
    process.env.LUMINATE_PORTAL_URL = `https://augtwo-test1.portal.interop.na.blueyonder.dev/`;
    process.env.NAVIGATE_TO_PLANNING_SPACE = `${process.env.LUMINATE_PORTAL_URL}${process.env.PSLINK}`;
    process.env.API_BASE_URL = 'https://augtwo-test1.api.interop.na.blueyonder.dev/';
    
    await testUtil.launchAppFromCatalog(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
    );
    const simulationUrlHint = process.env.SEARCH_SIMULATION || process.env.SIMULATION || 'foundation-simulation';
    const accessTokenPromise = scenarioPage.waitForAccessTokenFromRequestHeader(simulationUrlHint);
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);
    accessToken = await accessTokenPromise;
    await planningPage.selectViewInPlanning(testData.VIEW_NAME); 
  });

  test.afterAll('Cleanup: Delete the default child scenario using API', async ({ commonFunctions, testData }) => {
    try {
      const apiBaseUrl = process.env.API_BASE_URL as string;
      const searchSimulation = process.env.SEARCH_SIMULATION as string;
      const simulation = process.env.SIMULATION as string;
      const requestBody = testData.REQUEST_BODY || { sourceIds: [testData.PROCESS_NAME] };

      if (!apiBaseUrl || !searchSimulation || !simulation) {
        await commonFunctions.logMessage('WARN', 'Skipping cleanup: API_BASE_URL, SEARCH_SIMULATION, or SIMULATION env vars are missing.');
        return;
      }

      const searchUrl = `${apiBaseUrl}${searchSimulation}`;
      const deleteUrl = `${apiBaseUrl}${simulation}`;

      if (!accessToken) {
        await commonFunctions.logMessage('WARN', `Skipping cleanup: access token was not captured from network logs for ${childScenarioName}.`);
        return;
      }

      const headers = {
        accept: 'application/json',
        Authorization: accessToken
      };

      const searchResponse = await apiUtil.processAPIRequest(
        'POST',
        `${searchUrl}?limit=1000`,
        requestBody,
        headers,
        `Fetch scenarios for cleanup: ${childScenarioName}`,
        'full'
      );

      const scenario = searchResponse?.data?.entities?.find((entity: any) => entity.scenarioName === childScenarioName);
      if (!scenario) {
        await commonFunctions.logMessage('WARN', `Scenario not found for API cleanup: ${childScenarioName}`);
        return;
      }

      const deleteResponse = await apiUtil.processAPIRequest(
        'DELETE',
        `${deleteUrl}/simulations/${scenario.simulationId}`,
        '',
        headers,
        `Delete scenario ${childScenarioName} via API`,
        'full'
      );

      const deleted = await commonFunctions.compareTwoValues(deleteResponse.status, 204, `Delete scenario ${childScenarioName}`);
      expect(deleted).toBe(true);
    }
    finally {
      process.env.REALM_KEY = defaultRealmKey;
      process.env.LUMINATE_PORTAL_URL = defaultLuminatePortalUrl;
      process.env.NAVIGATE_TO_PLANNING_SPACE = defaultNavPlanning;
      process.env.API_BASE_URL = defaultApiBaseUrl;
    }
  });

  test('Test Case 1: Create a default child scenario', async ({ testUtil, planningPage, scenarioPage, page }) => {
    childScenarioName = `AT-DynamicConstraintChild_${Date.now()}`;
    await testUtil.setBaseAsDefaultScenario();
    await planningPage.openComponent('Scenarios');
    await scenarioPage.openScenarioCreationPopupUsingIcon();
    await scenarioPage.createChildScenario(
      childScenarioName,
      `Default child scenario for dynamic constraint coverage ${childScenarioName}`,
      'Private',
      'Check',
    );

    const isCreated = await scenarioPage.verifyAlertMsg('Scenario created successfully');
    const isDefault = await scenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(childScenarioName);
    expect(isCreated, `Default child scenario ${childScenarioName} should be created`).toBeTruthy();
    expect(isDefault, `Child scenario ${childScenarioName} should be default`).toBeTruthy();
    await planningPage.closeDrawer();
  });

  test('Test Case 2: Create a Dynamic constraint', async ({ planningPage, page, testData }) => {
    const { ResourceDetails: resourceDetailsData, AddAssociationDetails: addAssociationDetails } = testData.constraintDetails;
    const constraintPage = new ConstraintPage(page);
    
    await planningPage.selectPivotView(testData.PIVOT_VIEW);
    await planningPage.scrollPivotResourceRowIntoView(testData.CREATE_RESOURCE_CELL);
    const isMenuClicked = await planningPage.performCardCellMoreActions('PivotCard', testData.CREATE_RESOURCE_CELL, 'Create Resource');
    expect(isMenuClicked, `Create Resource menu action should open for ${testData.CREATE_RESOURCE_CELL}`).toBeTruthy();

    await constraintPage.waitForDialogOpen();

    const resourceDetails = buildResourceDetails(resourceDetailsData, { resourceName: dynamicResourceName });
    const isToastVisible = await constraintPage.completeConstraintForm(resourceDetails, addAssociationDetails, 'Create');
    expect(isToastVisible, `Success toast should be displayed after creating resource ${dynamicResourceName}`).toBeTruthy();
  });

  test('Test Case 3: Copy the Dynamic Constraint from pivot cell and verify prefilled details', async ({ planningPage, page, testData }) => {
    const { ResourceDetails: resourceDetailsData, AddAssociationDetails: addAssociationDetails } = testData.constraintDetails;
    await planningPage.clickOnDashboardRefreshBtn();
    await planningPage.waitForPivotCardToLoad();
    const constraintPage = new ConstraintPage(page);
    await planningPage.scrollPivotResourceRowIntoView(dynamicResourceName);
    const isMenuClicked = await planningPage.performCardCellMoreActions('PivotCard', dynamicResourceName, 'Copy Resource');
    expect(isMenuClicked, `Copy Resource menu action should open for ${dynamicResourceName}`).toBeTruthy();

    await constraintPage.waitForDialogOpen();
    const prefilled = await constraintPage.readResourceDetailsForm();
    const expectedResourceDetails = buildResourceDetails(resourceDetailsData, { resourceName: copiedResourceName });
    expect(prefilled, 'Copied resource fields should be prefilled correctly').toMatchObject({
      resourceName: expectedResourceDetails.resourceName,
      location: expectedResourceDetails.location,
      type: expectedResourceDetails.type,
      group: expectedResourceDetails.group,
      resourceType: expectedResourceDetails.resourceType,
    });

    await constraintPage.clickContinue();
    await constraintPage.fillAddAssociationsForm(addAssociationDetails);
    await constraintPage.submitConstraintForm('Copy');

    const isToastVisible = await constraintPage.isConstraintToastVisible(copiedResourceName, 'Copy');
    expect(isToastVisible, `Success toast should be displayed after copying resource ${copiedResourceName}`).toBeTruthy();
  });

  test('Test Case 4: Edit the dynamic constraint and verify details', async ({ planningPage, page, testData }) => {
    const { ResourceDetails: resourceDetailsData, AddAssociationDetails: addAssociationDetails, EditDetails: editDetails } = testData.constraintDetails;
    await planningPage.clickOnDashboardRefreshBtn();
    await planningPage.waitForPivotCardToLoad();
    const constraintPage = new ConstraintPage(page);
    await planningPage.scrollPivotResourceRowIntoView(copiedResourceName);
    const isMenuClicked = await planningPage.performCardCellMoreActions('PivotCard', copiedResourceName, 'Edit Resource');
    expect(isMenuClicked, `Edit Resource menu action should open for ${copiedResourceName}`).toBeTruthy();

    await constraintPage.waitForDialogOpen();
    const prefilled = await constraintPage.readResourceDetailsForm();
    const expectedResourceDetails = buildResourceDetails(resourceDetailsData, { resourceName: copiedResourceName });
    expect(prefilled, 'Dynamic resource fields should be prefilled correctly for editing').toMatchObject({
      resourceName: expectedResourceDetails.resourceName,
      location: expectedResourceDetails.location,
      type: expectedResourceDetails.type,
      group: expectedResourceDetails.group,
      granularity: expectedResourceDetails.granularity,
    });

    await constraintPage.fillResourceDetailsForm({ type: String(editDetails.constraintType) });
    await constraintPage.clickContinue();
    const prefilledAssociations = await constraintPage.readAddAssociationsForm();
    expect(prefilledAssociations.query.toLowerCase(), 'Add Associations query should be prefilled correctly for editing').toEqual(addAssociationDetails.query.toLowerCase());
    await constraintPage.fillAddAssociationsForm({ query: editDetails.query });
    await constraintPage.submitConstraintForm('Save');

    const isToastVisible = await constraintPage.isConstraintToastVisible(copiedResourceName, 'Save');
    expect(isToastVisible, `Success toast should be displayed after saving resource ${copiedResourceName}`).toBeTruthy();
  });

  test('Test Case 5: Edit the interfaced constraint and verify details', async ({ planningPage, page, testData }) => {
    const { ResourceDetails: resourceDetailsData, EditDetails: editDetails } = testData.constraintDetails;
    await planningPage.clickOnDashboardRefreshBtn();
    await planningPage.waitForPivotCardToLoad();
    const constraintPage = new ConstraintPage(page);
    await planningPage.scrollPivotResourceRowIntoView(testData.CREATE_RESOURCE_CELL);
    const isMenuClicked = await planningPage.performCardCellMoreActions('PivotCard', testData.CREATE_RESOURCE_CELL, 'Edit Resource');
    expect(isMenuClicked, `Edit Resource menu action should open for ${testData.CREATE_RESOURCE_CELL}`).toBeTruthy();

    await constraintPage.waitForDialogOpen();
    const prefilled = await constraintPage.readResourceDetailsForm();
    const expectedResourceDetails = buildResourceDetails(resourceDetailsData, { resourceName: testData.CREATE_RESOURCE_CELL });
    // Granularity is intentionally not verified here - interfaced/imported constraints don't render the Granularity field.
    expect(prefilled, 'Interfaced resource fields should be prefilled correctly for editing').toMatchObject({
      resourceName: expectedResourceDetails.resourceName,
      location: expectedResourceDetails.location,
      type: expectedResourceDetails.type,
      group: expectedResourceDetails.group,
    });

    await constraintPage.fillResourceDetailsForm({ type: String(editDetails.constraintType) });
    await constraintPage.clickContinue();

    const isNoRuleAvailableMessageVisible = await constraintPage.isNoRuleAvailableMessageVisible();
    expect(isNoRuleAvailableMessageVisible, 'No rule available message should be displayed for the interfaced constraint').toBeTruthy();

    await constraintPage.submitConstraintForm('Save');
    const isToastVisible = await constraintPage.isConstraintToastVisible(testData.CREATE_RESOURCE_CELL, 'Save');
    expect(isToastVisible, `Success toast should be displayed after saving resource ${testData.CREATE_RESOURCE_CELL}`).toBeTruthy();
  });

});

const buildResourceDetails = (resourceDetailsData: Record<string, any>, overrides: Partial<ConstraintResourceDetails> = {}): ConstraintResourceDetails => ({
  location: String(resourceDetailsData.resourceLocation),
  type: String(resourceDetailsData.constraintType),
  group: String(resourceDetailsData.group),
  granularity: String(resourceDetailsData.timeGranularity),
  resourceType: String(resourceDetailsData.RESOURCETYPE),
  quantityUom: String(resourceDetailsData.QTYUOM),
  capacityPlanningRows: resourceDetailsData.timeData.map((row: { timeLabel: string; regularCapacity: number; regularCost: number }) => ({
    period: row.timeLabel,
    capacity: String(row.regularCapacity),
    cost: String(row.regularCost),
  })),
  ...overrides,
});
