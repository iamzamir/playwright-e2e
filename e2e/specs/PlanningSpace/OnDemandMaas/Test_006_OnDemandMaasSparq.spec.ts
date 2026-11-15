import PlanningSpace from '../../../pageobjects/planning.page';
import ProcessPage from '../../../pageobjects/process.page';
import CommonFunctions from '../../../util/common.util';
import ScenarioPage from '../../../pageobjects/scenario.page';
const TestData = require('../../../Testdata/' +
  process.env.PSENV +
  '/PlanningSpace/OnDemandMaas/Test_006_OnDemandMaasSparq.json');

describe('Data Sync Status Verification Tests - Maas & Sparq', () => {
  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(
      TestData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME2 as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      TestData.PROCESS_NAME
    );
  });

  let planningInstanceId;

  it('Test Case 1: Verify Started Data Sync status for Maas & Sparq', async () => {
    const filterConfigs = [{ type: 'LOCATION', category: 'Region', value: ['REGION-00'] }];
    const isSideNavClosed = await PlanningSpace.isSideDrawerClosed();
    if (isSideNavClosed) {
      await PlanningSpace.openSideNav();
    }
    await PlanningSpace.clickViewsDropDown();
    await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
    // Pass the dynamic filter configuration to the function
    await PlanningSpace.configureFilters(filterConfigs);
    const result = await PlanningSpace.verifyDataSyncStatusTest(
      'started',
      'Data is Synced',
      true,
      10,
      TestData.LoGGEDIN_USER_NAME
    );
    const verifyAllScenariosInODM = await PlanningSpace.verifyAllScenariosInODM();
    const bvalidation = JSON.stringify(verifyAllScenariosInODM) === JSON.stringify([TestData.SCENARIOS]);
    await PlanningSpace.openMoreDetailsODM();
    await browser.pause(5000);
    const verifyScenariosInODM = await PlanningSpace.verifyDataFromMoreDetailsODM();
    const bValidation1 = JSON.stringify(verifyScenariosInODM) === JSON.stringify([TestData.SCENARIOS]);
    await PlanningSpace.closeMoreDetailsODM();
    const verifyGlobalSave = await PlanningSpace.clickGlobalSaveAndVerify();
    await CommonFunctions.compareTwoValues(verifyGlobalSave, true, 'Global Save successful')
    expect(result && bvalidation && bValidation1 && verifyGlobalSave).toEqual(true);
  });

  it('Test Case 2: Verify Session handling Alert with new scope & existing Sparq', async () => {
    const filterConfigs = [{ type: 'LOCATION', category: 'Region', value: ['REGION-00', 'REGION-10'] }];
    const isSideNavClosed = await PlanningSpace.isSideDrawerClosed();
    if (isSideNavClosed) {
      await PlanningSpace.openSideNav();
    }
    await ProcessPage.clickOnTab('Views');
    await PlanningSpace.clickViewsDropDown();
    await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
    // Pass the dynamic filter configuration to the function
    await PlanningSpace.configureFilters(filterConfigs);
    await browser.pause(5000);
    const validation = await PlanningSpace.sessionSelectPopup('syncExistingSession');
    await browser.pause(1000);
    const alertValidation = await CommonFunctions.compareTwoValues(
      await CommonFunctions.verifyAlertMsg('Your scope selection contains members without supply plan.'),
      true,
      'Your scope selection contains members without supply plan.'
    );
    expect(validation && alertValidation).toEqual(true);
  });

  it('Test Case 3: Choose option1 and validate no alert', async () => {
    const isSideNavClosed = await PlanningSpace.isSideDrawerClosed();
    if (isSideNavClosed) {
      await PlanningSpace.openSideNav();
    }
    await ProcessPage.clickOnTab('Views');
    await PlanningSpace.clickViewsDropDown();
    await PlanningSpace.clickDashBoard(TestData.VIEW_NAME2);
    await browser.pause(15000);
    const isSideNavClosed2 = await PlanningSpace.isSideDrawerClosed();

    if (isSideNavClosed2) {
      await PlanningSpace.openSideNav();
    }
    await ProcessPage.clickOnTab('Scope');
    await ProcessPage.clickOnTab('Views');
    await PlanningSpace.clickViewsDropDown();
    await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
    await browser.pause(10000);
    const validation = await PlanningSpace.sessionSelectPopup('createNewSession');
    await browser.pause(5000);
    expect(validation).toBe(true);
  });

  it('Test Case 4: Verify Status for new Session', async () => {
    await browser.pause(5000);
    const result = await PlanningSpace.verifyDataSyncStatusTest(
      'started',
      'Data is Synced',
      true,
      10,
      TestData.LoGGEDIN_USER_NAME
    );
    const verifyAllScenariosInODM = await PlanningSpace.verifyAllScenariosInODM();
    const bvalidation = JSON.stringify(verifyAllScenariosInODM) === JSON.stringify([TestData.SCENARIOS]);
    await PlanningSpace.openMoreDetailsODM();
    await browser.pause(5000);
    const verifyScenariosInODM = await PlanningSpace.verifyDataFromMoreDetailsODM();
    const bValidation1 = JSON.stringify(verifyScenariosInODM) === JSON.stringify([TestData.SCENARIOS]);
    await PlanningSpace.closeMoreDetailsODM();
    const bValidation2: boolean = await ScenarioPage.verifyColumnExistsInPivotTable(['ITEM'], TestData.CARD_NAME);
    const bValidation3: boolean = await PlanningSpace.dataNotAvailableIsExist();
    await CommonFunctions.compareTwoValues(bValidation1, true, `Is ${[]} cols reflected in table`);
    planningInstanceId = await PlanningSpace.getPlanningInstaceIdFromODM();
    expect(result && (bValidation2 || bValidation3) && bValidation1 && bvalidation).toEqual(true);
  });

  it('Test Case 5: Apply new filter and check planning instance id', async () => {
    const filterConfigs = [
      {type: 'LOCATION', category: 'Region', value: ['REGION-00']},
      {type: 'LOCATION', category: 'Country', value: ['CNTRY-01','CNTRY-02']}
    ];
    const isSideNavClosed = await PlanningSpace.isSideDrawerClosed();
    if (isSideNavClosed) {
      await PlanningSpace.openSideNav();
    }
    await ProcessPage.clickOnTab('Views');
    await PlanningSpace.clickViewsDropDown();
    await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
    const isSideNavClosed2 = await PlanningSpace.isSideDrawerClosed();
    if (isSideNavClosed2) {
      await PlanningSpace.openSideNav();
    }
    // await ProcessPage.clickOnTab('Scope');
    await PlanningSpace.configureFilters(filterConfigs, true);
    await browser.pause(10000);

    const result = await PlanningSpace.verifyDataSyncStatusTest(
      'started',
      'Data is Synced',
      true,
      10,
      TestData.LoGGEDIN_USER_NAME
    );

    const planningInstanceId2 = await PlanningSpace.getPlanningInstaceIdFromODM();
    expect(planningInstanceId === planningInstanceId2).toBeTruthy();
  })
});
