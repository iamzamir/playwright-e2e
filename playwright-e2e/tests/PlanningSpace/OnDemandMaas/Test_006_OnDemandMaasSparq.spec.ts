import { test, expect } from '../../../configs/fixtures';

type FilterConfig = {
  type: string;
  category: string;
  value: string[];
};

type PlanningComponentActions = {
  openComponent(componentName: string): Promise<boolean>;
};

type ScopeFilterActions = {
  addFiltersToDimensionHierarchyInScope(dimension: string, hierarchy: string, filter: string[]): Promise<void>;
  clickOnApplyFiltersBtn(): Promise<boolean>;
};

const getExpectedScenarios = (value: string | string[]): string[] => {
  return Array.isArray(value) ? value : [value];
};

test.describe.serial('Data Sync Status Verification Tests - Maas & Sparq', () => {
  let planningInstanceId = '';

  const applyScopeFilters = async (planningPage: PlanningComponentActions, scopePage: ScopeFilterActions, filterConfigs: FilterConfig[]): Promise<boolean> => {
    await planningPage.openComponent('Scope');
    for (const config of filterConfigs) {
      await scopePage.addFiltersToDimensionHierarchyInScope(config.type, config.category, config.value);
    }
    return scopePage.clickOnApplyFiltersBtn();
  };

  test('Test Case 1: Verify Started Data Sync status for Maas & Sparq', async ({ planningPage, planningListingPage, odmPage, commonFunctions, testUtil, testData, scopePage }) => {
    const filterConfigs: FilterConfig[] = [{ type: 'LOCATION', category: 'Region', value: ['REGION-00'] }];

    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.PSLINK as string);
    await planningListingPage.launchContext('Process', testData.PROCESS_NAME);
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);

    const isFilterApplied = await applyScopeFilters(planningPage, scopePage, filterConfigs);
    const result = await odmPage.verifyDataSyncStatusTest('started', 'Data is Synced', true, 2, testData.LoGGEDIN_USER_NAME);
    const verifyAllScenariosInODM = await odmPage.verifyAllScenariosInODM();
    const expectedScenarios = getExpectedScenarios(testData.SCENARIOS);
    const bValidation = await commonFunctions.compareTwoValues((verifyAllScenariosInODM.toString()).includes(expectedScenarios.toString()), true, 'Scenarios in data sync status should match expected scenarios');

    await odmPage.openMoreDetailsODM();
    const verifyScenariosInODM = await odmPage.verifyDataFromMoreDetailsODM();
    const bValidation1 = await commonFunctions.compareTwoValues((verifyScenariosInODM.toString()).includes(expectedScenarios.toString()), true, 'Scenarios in more details should match expected scenarios');
    await odmPage.closeMoreDetailsODM();

    const verifyGlobalSave = await odmPage.clickGlobalSaveAndVerify();
    await commonFunctions.compareTwoValues(verifyGlobalSave, true, 'Global Save successful');
    expect(result && bValidation && bValidation1 && verifyGlobalSave && isFilterApplied).toBe(true);
  });

  test('Test Case 2: Verify Session handling Alert with new scope & existing Sparq', async ({ planningPage, odmPage, commonFunctions, testData, scopePage }) => {
    const filterConfigs: FilterConfig[] = [{ type: 'LOCATION', category: 'Region', value: ['REGION-00', 'REGION-10'] }];

    await planningPage.openComponent('Views');
    await planningPage.selectView(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);
    const isFilterApplied = await applyScopeFilters(planningPage, scopePage, filterConfigs);

    const validation = await odmPage.sessionSelectPopup('syncExistingSession');
    const alertValidation = await commonFunctions.compareTwoValues(await planningPage.verifyAlertMsg('Your scope selection contains members without supply plan.'), true, 'Scope selection alert should be displayed');
    expect(validation && alertValidation && isFilterApplied).toBe(true);
  });

  test('Test Case 3: Choose option1 and validate no alert', async ({ planningPage, odmPage, testData }) => {
    await planningPage.openComponent('Views');
    await planningPage.selectView(testData.VIEW_NAME2);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME2);

    await planningPage.openComponent('Scope');
    await planningPage.openComponent('Views');
    await planningPage.selectView(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);

    const validation = await odmPage.sessionSelectPopup('createNewSession');
    expect(validation).toBe(true);
  });

  test('Test Case 4: Verify Status for new Session', async ({ odmPage, scenarioPage, commonFunctions, testData }) => {
    const result = await odmPage.verifyDataSyncStatusTest('started', 'Data is Synced', true, 2, testData.LoGGEDIN_USER_NAME);
    const verifyAllScenariosInODM = await odmPage.verifyAllScenariosInODM();
    const expectedScenarios = getExpectedScenarios(testData.SCENARIOS);
    const bValidation = await commonFunctions.compareTwoValues((verifyAllScenariosInODM.toString()).includes(expectedScenarios.toString()), true, 'Scenarios in data sync status should match expected scenarios');

    await odmPage.openMoreDetailsODM();
    const verifyScenariosInODM = await odmPage.verifyDataFromMoreDetailsODM();
    const bValidation1 = await commonFunctions.compareTwoValues((verifyScenariosInODM.toString()).includes(expectedScenarios.toString()), true, 'Scenarios in more details should match expected scenarios');
    await odmPage.closeMoreDetailsODM();

    const bValidation2: boolean = await scenarioPage.verifyColumnExistsInPivotTable(['ITEM'], testData.CARD_NAME);
    const bValidation3: boolean = await odmPage.dataNotAvailableIsExist();
    await commonFunctions.compareTwoValues(bValidation1, true, 'Scenario values reflected in table');
    planningInstanceId = await odmPage.getPlanningInstaceIdFromODM();
    expect(result && (bValidation2 || bValidation3) && bValidation1 && bValidation && planningInstanceId.length > 0).toBe(true);
  });

  test('Test Case 5: Apply new filter and check planning instance id', async ({ planningPage, odmPage, testData, scopePage }) => {
    const filterConfigs: FilterConfig[] = [
      { type: 'LOCATION', category: 'Region', value: ['REGION-00'] },
      { type: 'LOCATION', category: 'Country', value: ['CNTRY-01', 'CNTRY-02'] }
    ];

    await planningPage.openComponent('Views');
    await planningPage.selectView(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);

    const isFilterApplied = await applyScopeFilters(planningPage, scopePage, filterConfigs);
    const result = await odmPage.verifyDataSyncStatusTest('started', 'Data is Synced', true, 2, testData.LoGGEDIN_USER_NAME);
    const planningInstanceId2 = await odmPage.getPlanningInstaceIdFromODM();

    expect(result && isFilterApplied && planningInstanceId === planningInstanceId2).toBe(true);
  });
});
