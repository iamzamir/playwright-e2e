import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
const TestData = require('../../../Testdata/'+ process.env.PSENV + '/PlanningSpace/ViewsBatch/Test_014_viewProcedureMapping.json');
import GlobalSettings from '../../../pageobjects/global-settings.page';

describe('Data Configuration from Data Setup', async () => {
  before(async () => {
    await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await browser.pause(10000);
  });

  it('Test Case 1: Configure Data Setup with Actors and Procedure', async () => {
    await PlanningSpace.navToProcessOrchestration();
    await GlobalSettings.clickGlobalSettings();
    await GlobalSettings.clickGlobalSettingsListMenu('Planning Views');
    await GlobalSettings.planningViewSearch(TestData.VIEW_NAME);
    await browser.pause(10000);
    await GlobalSettings.AddDataSetupConfig(TestData.VIEW_NAME, TestData.ACTORS_PROCEDURE1);
    await GlobalSettings.ValidateSelectedValues(TestData.ACTORS_PROCEDURE1);
    await browser.pause(30000);
    const isConfiguredAfterAdd = await GlobalSettings.dataSetupConfiguredValidate();
    await CommonFunctions.compareTwoValues(isConfiguredAfterAdd, true, 'Data Setup should be configured after Submit');
    expect(isConfiguredAfterAdd).toBeTruthy();
  });

  it('Test Case 2: Edit the configured Data with different actors & Procedures', async () => {
    await GlobalSettings.AddDataSetupConfig(TestData.VIEW_NAME, TestData.ACTORS_PROCEDURE2);
    await browser.pause(30000);
    await GlobalSettings.ValidateSelectedValues(TestData.ACTORS_PROCEDURE2);
    const isConfiguredAfterEdit = await GlobalSettings.dataSetupConfiguredValidate();
    await CommonFunctions.compareTwoValues(isConfiguredAfterEdit, true, 'Data Setup should be configured after Edit');
    expect(isConfiguredAfterEdit).toBeTruthy();
  });

  it('Test Case 3: Remove the configured Data', async () => {
    await GlobalSettings.removeDataSetupConfiguration();
    const isConfiguredAfterRemoval = await GlobalSettings.isInteractivePlanningConfigured();
    const isremovalsuccesful = await CommonFunctions.compareTwoValues(isConfiguredAfterRemoval, false, 'Data configuration Removed');
    expect(isremovalsuccesful).toBeTruthy();
});

});
