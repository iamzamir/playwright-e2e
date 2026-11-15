import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';

test.describe.serial('Dimension filter data with Private and Public Scenarios', () => {
  test.beforeAll(async ({ testUtil, planningListingPage, testData }) => {
    await testUtil.launchAppFromCatalog(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      process.env.PSLINK as string,
    );
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Process', testData.PROCESS_NAME);
  });

  test('Test Case 1: Set the Private Scenario as default', async ({ planningPage, scenarioPage, testUtil, commonFunctions, testData }) => {
    await planningPage.goToManageScenarios();

    let isScenarioExist = await scenarioPage.isScenarioVisible(testData.PRIVATE_SCENARIONAME, getTimeout('SHORT'));
    if (!isScenarioExist) {
      await testUtil.createChildScenarioFromBase(testData.PRIVATE_SCENARIONAME, `${testData.PRIVATE_SCENARIONAME} Description`, 'Private', 'Uncheck');
      isScenarioExist = await scenarioPage.isScenarioVisible(testData.PRIVATE_SCENARIONAME, getTimeout('XLARGE'));
    }

    const dataIndex = await scenarioPage.getDataIndexByColumnName('Information');
    let isDefault = await scenarioPage.verifyDefaultInScenarioTable(testData.PRIVATE_SCENARIONAME, dataIndex);
    if (!isDefault) {
      await scenarioPage.editScenarioItemIsDefault(testData.PRIVATE_SCENARIONAME);
      await scenarioPage.clickResetButton();
      isDefault = await scenarioPage.verifyDefaultInScenarioTable(testData.PRIVATE_SCENARIONAME, dataIndex);
    }

    await scenarioPage.closeManageScenarios();
    await planningPage.openComponent('Scenarios');
    await planningPage.clickApply();
    await planningPage.openComponent('Scenarios');

    const isDefaultScenarioExist = await scenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(testData.PRIVATE_SCENARIONAME);
    const validation1 = await commonFunctions.compareTwoValues(isScenarioExist, true, `Scenario ${testData.PRIVATE_SCENARIONAME} available`);
    const validation2 = await commonFunctions.compareTwoValues(isDefault, true, `Scenario ${testData.PRIVATE_SCENARIONAME} set as default`);
    const validation3 = await commonFunctions.compareTwoValues(isDefaultScenarioExist, true, `Default scenario ${testData.PRIVATE_SCENARIONAME} available in scenario filters`);

    expect(validation1 && validation2 && validation3).toBe(true);
  });

  test('Test Case 2: Verify the Dimension Scope Filter data when Private Scenario is Default', async ({ planningPage, scopePage, commonFunctions, testData }) => {
    await planningPage.openComponent('Scope');
    await commonFunctions.compareTwoValues(await scopePage.searchFilter(testData.FILTER_NAME), true, `${testData.FILTER_NAME} Filter selected`);
    await scopePage.click3Dot();
    await scopePage.select3DotOption('Edit Configuration');
    await scopePage.selectFilterEntryFromDialogConfig('Select', 'ITEM');
    await scopePage.filterDialogSaveCancel('Next');
    await scopePage.selectDimensionHierarchyLevel('ITEM', ['ProductType'], "check");
    await scopePage.filterDialogSaveCancel('Save');
    await scopePage.addFiltersToDimensionHierarchyInScope('ITEM', 'ProductType', ['PF-00']);
    await scopePage.clickOnApplyFiltersBtn();
    await planningPage.openComponent('Scope');
    const validation = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope('ProductType', 'PF-00'), true, 'Item filter applied');
    expect(validation).toBe(true);
    await planningPage.closeDrawer();
  });

  test('Test Case 3: Set the Public Scenario as default', async ({ planningPage, scenarioPage, testUtil, commonFunctions, testData }) => {
    await planningPage.goToManageScenarios();

    let isScenarioExist = await scenarioPage.isScenarioVisible(testData.PUBLIC_SCENARIONAME, getTimeout('SHORT'));
    if (!isScenarioExist) {
      await testUtil.createChildScenarioFromBase(testData.PUBLIC_SCENARIONAME, `${testData.PUBLIC_SCENARIONAME} Description`, 'Public', 'Uncheck');
      await planningPage.goToManageScenarios();
      isScenarioExist = await scenarioPage.isScenarioVisible(testData.PUBLIC_SCENARIONAME, getTimeout('XLARGE'));
    }

    const dataIndex = await scenarioPage.getDataIndexByColumnName('Information');
    let isDefault = await scenarioPage.verifyDefaultInScenarioTable(testData.PUBLIC_SCENARIONAME, dataIndex);
    if (!isDefault) {
      await scenarioPage.editScenarioItemIsDefault(testData.PUBLIC_SCENARIONAME);
      await scenarioPage.clickResetButton();
      isDefault = await scenarioPage.verifyDefaultInScenarioTable(testData.PUBLIC_SCENARIONAME, dataIndex);
    }

    await scenarioPage.closeManageScenarios();
    await planningPage.openComponent('Scenarios');
    await planningPage.clickApply();
    await planningPage.openComponent('Scenarios');

    const isDefaultScenarioExist = await scenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(testData.PUBLIC_SCENARIONAME);
    const validation1 = await commonFunctions.compareTwoValues(isScenarioExist, true, `Scenario ${testData.PUBLIC_SCENARIONAME} available`);
    const validation2 = await commonFunctions.compareTwoValues(isDefault, true, `Scenario ${testData.PUBLIC_SCENARIONAME} set as default`);
    const validation3 = await commonFunctions.compareTwoValues(isDefaultScenarioExist, true, `Default scenario ${testData.PUBLIC_SCENARIONAME} available in scenario filters`);

    expect(validation1 && validation2 && validation3).toBe(true);
  });

  test('Test Case 4: Verify the Dimension Scope Filter data when Public Scenario is Default', async ({ planningPage, scopePage, commonFunctions }) => {
    await planningPage.openComponent('Scope');
    await scopePage.click3Dot();
    await scopePage.select3DotOption('Edit Configuration');
    await scopePage.selectFilterEntryFromDialogConfig('Select', 'CUSTOMER');
    await scopePage.filterDialogSaveCancel('Next');
    await scopePage.selectDimensionHierarchyLevel('CUSTOMER', ['AllChannels'], "check");
    await scopePage.filterDialogSaveCancel('Save');
    await scopePage.addFiltersToDimensionHierarchyInScope('CUSTOMER', 'AllChannels', ['ALL CUSTOMERS']);
    await scopePage.clickOnApplyFiltersBtn();
    await planningPage.openComponent('Scope');
    const validation = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope('AllChannels', 'ALL CUSTOMERS'), true, 'Customer filter applied');
    expect(validation).toBe(true);
    await planningPage.closeDrawer();
  });

  test.afterAll('Test Case 5: Reset and set the Base Scenario as default', async ({ planningPage, scenarioPage, testData, commonFunctions }) => {
    await planningPage.goToManageScenarios();
    const baseScenario = await scenarioPage.getBaseScenarioFromTable();
    const dataIndex = await scenarioPage.getDataIndexByColumnName('Information');
    let isDefault = await scenarioPage.verifyDefaultInScenarioTable(baseScenario, dataIndex);
    if (!isDefault) {
      await scenarioPage.editScenarioItemIsDefault(baseScenario);
      await scenarioPage.clickResetButton();
      isDefault = await scenarioPage.verifyDefaultInScenarioTable(baseScenario, dataIndex);
    }
    await scenarioPage.closeManageScenarios();
    await planningPage.openComponent('Scenarios');
    await scenarioPage.scenarioSelect([testData.PRIVATE_SCENARIONAME, testData.PUBLIC_SCENARIONAME], 'Uncheck');
    await planningPage.clickApply();
    await planningPage.openComponent('Scenarios');

    await expect.poll(async () => await scenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(baseScenario), {
      timeout: getTimeout('XLARGE'),
      message: 'Expected base scenario to be default after reset',
    }).toBe(true);

    await expect.poll(async () => await scenarioPage.scenarioMap([testData.PRIVATE_SCENARIONAME, testData.PUBLIC_SCENARIONAME], true), {
      timeout: getTimeout('XLARGE'),
      message: 'Expected private/public scenarios to be unmapped after reset',
    }).toBe(false);

    await commonFunctions.logMessage('INFO', 'Test Case 5 completed successfully.');
  });
});
