import PlanningSpace from "../../../pageobjects/planning.page";
import SupplyChainPage from "../../../pageobjects/sca.page";
import CommonFunctions from "../../../util/common.util";
import GlobalSettings from '../../../pageobjects/global-settings.page';
import TestUtil from "../../../util/test.util";
import ProcessPage from "../../../pageobjects/process.page";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/SupplyChainActionsBatch/Test_010_ConfigurePrimaryAndSecondarySCA.json");

const random_name = Math.floor(1000 + Math.random() * 9000);
const viewGroup = "View Group" + " " + random_name;
const viewName = "View" + " " + random_name;

describe('SCP Configuration when no procedures were mapped to view', () => {
    before(async () => {
        await TestUtil.launchAppFromCatalog(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string);
        await ProcessPage.pageTitle.waitForDisplayed({ timeout: 100000 });

    })

    it(`Test Case 1: Create a ${viewGroup} View Group` ,async () => {
        await GlobalSettings.clickGlobalSettings();
        await GlobalSettings.clickGlobalSettingsListMenu('View Groups');
        await GlobalSettings.createViewGroup(viewGroup);
        const bValidation1 = await CommonFunctions.compareTwoValues( await ProcessPage.alertMsg('Successfully created view group'), true, `Is ${viewGroup} view group created`);
        expect(bValidation1).toBeTruthy();
    });

    it(`Test Case 2: Create a ${viewName} planning view`, async () => {
        await GlobalSettings.clickGlobalSettingsListMenu('Planning Views');
        await browser.pause(4000);
        await GlobalSettings.createPlanningView(viewName, viewGroup);
        const bValidation1 = await CommonFunctions.compareTwoValues( await ProcessPage.alertMsg('saved'), true, `Is ${viewName} view created`);
        expect(bValidation1).toBeTruthy();
    });

    it(`Test Case 3: Map ${viewName} to process ${TestData.PROCESS_NAME}`, async () => {
        await GlobalSettings.clickGlobalSettingsListMenu('Process');
        await GlobalSettings.selectProcess(TestData.PROCESS_NAME);
        await browser.pause(5000);
        await CommonFunctions.logMessage('INFO', `Selected process ${TestData.PROCESS_NAME}`)
        let isViewMapSuccess: boolean = await GlobalSettings.addViewMappingToEntity(TestData.PROCESS_NAME, [viewName]);
        await CommonFunctions.compareTwoValues(isViewMapSuccess, true, 'View Mapping Save Assertion for Process');
        expect(isViewMapSuccess).toBeTruthy();
    });

    it('Test Case 4: Verify all procedures are enabled to view', async () => {
      await browser.pause(1000);
      await SupplyChainPage.selectSingleAction(TestData.PROCESS_NAME, 'Configure View specific Procedures & Filters');
      const verify = await SupplyChainPage.verifyAllSCAEnabled(viewName, [TestData.PRIMARY_SCA_ACTION.procedureDisplayName,TestData.SECONDARY_SCA_ACTION.procedureDisplayName,...TestData.OTHER_SCA_ACTIONS.map((ele)=> ele.procedureDisplayName)])
      const validation = await CommonFunctions.compareTwoValues(verify, true, 'All SCA procedures are enabled');
      expect(validation).toBeTruthy();
    });

    it(`Test Case 5: verify all SCAs are appeared in alphabetical order in procedures dropdown for ${viewName}`, async () => {
      await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
      await PlanningSpace.switchToMFEFrame();
      const headerTitle = await $(`//h3[contains(@class,'title')]`);
      await headerTitle.waitForDisplayed({ timeout: 100000 });
      await browser.pause(5000);
      await PlanningSpace.clickViewsDropDown();
      await PlanningSpace.clickDashBoard(viewName);
      await browser.pause(5000);
      let allProcedures = [TestData.PRIMARY_SCA_ACTION.procedureDisplayName,TestData.SECONDARY_SCA_ACTION.procedureDisplayName,...TestData.OTHER_SCA_ACTIONS.map((ele)=> ele.procedureDisplayName)];
      allProcedures.sort((strA,strB)=>strA.localeCompare(strB))
      allProcedures = allProcedures.map((procedure) => ({
        procedureDisplayName: procedure
      }));
      const bValidation: boolean = await SupplyChainPage.verifyOtherActionsInProceduresDropdown(allProcedures, true);
      await CommonFunctions.compareTwoValues(bValidation, true, 'Is procedures dropdown appeared with other actions');
      expect(bValidation).toBeTruthy();
    })

    it('Test Case 6: Should be able to configure primary and secondary actions', async () => {
      await PlanningSpace.navToProcessOrchestration();
      await ProcessPage.pageTitle.waitForDisplayed({ timeout: 100000 });
      await GlobalSettings.selectProcessDropdown(TestData.PROCESS_NAME);
      await SupplyChainPage.selectSingleAction(TestData.PROCESS_NAME, 'Configure View specific Procedures & Filters');
      const verify = await SupplyChainPage.configureSCP(
        viewName,
        [TestData.PRIMARY_SCA_ACTION.procedureDisplayName,TestData.SECONDARY_SCA_ACTION.procedureDisplayName, ...TestData.OTHER_SCA_ACTIONS.map((ele)=> ele.procedureDisplayName)],
        TestData.PRIMARY_SCA_ACTION.procedureDisplayName,
        TestData.SECONDARY_SCA_ACTION.procedureDisplayName
      );
      const validation = await CommonFunctions.compareTwoValues(verify, true, 'verify successful configuration');
      expect(validation).toBeTruthy();
    });

    it('Test Case 7: Configure Supply Chain Procedures should be disabled if the entity has no assigned views and procedures', async () => {
      browser.pause(5000);
      await SupplyChainPage.selectProcess(TestData.PROCESS_NAME);
      const isSCPActionEnabled = await SupplyChainPage.isActionEnabled(TestData.SUBPROCESS_NAME, 'Configure View specific Procedures & Filters');
      await browser.pause(1000);
      const bValidation = await CommonFunctions.compareTwoValues(false,isSCPActionEnabled,'verify option enabled or not');
      expect(bValidation).toBeTruthy();
   });

    it(`Test Case 8: verify primary SCA available or not in ${viewName}`, async () => {
      await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
      await PlanningSpace.switchToMFEFrame();
      const headerTitle = await $(`//h3[contains(@class,'title')]`);
      await headerTitle.waitForDisplayed({ timeout: 100000 });
      await PlanningSpace.clickViewsDropDown();
      await PlanningSpace.clickDashBoard(viewName);
      await browser.pause(2000);
      const bValidation: boolean = await SupplyChainPage.verifySCABtn(TestData.PRIMARY_SCA_ACTION.procedureDisplayName, 'MuiButton-contained');
      await CommonFunctions.compareTwoValues(bValidation, true, 'Is primary sca button exist');
      expect(bValidation).toBeTruthy();
   });

  it(`Test Case 9: verify secondary SCA available or not in ${viewName}`, async () => {
      await browser.pause(2000);
      const bValidation: boolean = await SupplyChainPage.verifySCABtn(TestData.SECONDARY_SCA_ACTION.procedureDisplayName, 'MuiButton-outlined')
      await CommonFunctions.compareTwoValues(bValidation, true, 'Is secondary sca button exist');
      expect(bValidation).toBeTruthy();
    });

  it(`Test Case 10: verify SCA procedures dropdown available or not with other SCA actions in ${viewName} in arranged order`, async () => {
      await browser.pause(2000);
      const bValidation: boolean = await SupplyChainPage.verifyOtherActionsInProceduresDropdown(TestData.OTHER_SCA_ACTIONS, true);
      await CommonFunctions.compareTwoValues(bValidation, true, 'Is procedures dropdown appeared with other actions');
      expect(bValidation).toBeTruthy();
    })

  it('Test Case 11: Should disable all SCA actions to view', async () => {
      await PlanningSpace.navToProcessOrchestration();
      await ProcessPage.pageTitle.waitForDisplayed({ timeout: 100000 });
      await GlobalSettings.selectProcessDropdown(TestData.PROCESS_NAME);
      await SupplyChainPage.selectSingleAction(TestData.PROCESS_NAME, 'Configure View specific Procedures & Filters');
      const verify = await SupplyChainPage.disableSCA(viewName, [TestData.PRIMARY_SCA_ACTION.procedureDisplayName,TestData.SECONDARY_SCA_ACTION.procedureDisplayName, ...TestData.OTHER_SCA_ACTIONS.map((ele)=> ele.procedureDisplayName)]);
      const validation = await CommonFunctions.compareTwoValues(verify, true, 'verify successful configuration');
      expect(validation).toBeTruthy();
    });

  it(`Test Case 12: verify SCA dropdown disabled in ${viewName} in Planning Space`, async () => {
      await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
      await PlanningSpace.switchToMFEFrame();
      const headerTitle = await $(`//h3[contains(@class,'title')]`);
      await headerTitle.waitForDisplayed({ timeout: 100000 });
      await PlanningSpace.clickViewsDropDown();
      await PlanningSpace.clickDashBoard(viewName);
      await browser.pause(5000);
      const bValidation = await PlanningSpace.actionsDropdownBtn.isExisting();
      await CommonFunctions.compareTwoValues(!bValidation, true, 'Procedures dropdown is disabled');
      expect(!bValidation).toBeTruthy();
    });

  it(`Test Case 13: Delete ${viewGroup} view group`, async () => {
      await PlanningSpace.navToProcessOrchestration();
      await ProcessPage.pageTitle.waitForDisplayed({ timeout: 100000 });
      await GlobalSettings.clickGlobalSettings();
      await GlobalSettings.clickGlobalSettingsListMenu('View Groups');
      await GlobalSettings.deleteViewGroup(viewGroup);
      const bValidation1 = await CommonFunctions.compareTwoValues( await ProcessPage.alertMsg('Successfully deleted view group'), true, `Is ${viewGroup} view  group deleted `);
      expect(bValidation1).toBeTruthy();
    });
  });
