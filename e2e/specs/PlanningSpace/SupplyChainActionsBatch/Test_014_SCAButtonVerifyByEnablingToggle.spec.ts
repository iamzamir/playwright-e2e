import PlanningSpace from "../../../pageobjects/planning.page";
import SupplyChainPage from "../../../pageobjects/sca.page";
import CommonFunctions from "../../../util/common.util";
import GlobalSettings from '../../../pageobjects/global-settings.page';
import ProcessPage from "../../../pageobjects/process.page";
import planningPage from "../../../pageobjects/planning.page";
import testUtil from "../../../util/test.util"; 
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/SupplyChainActionsBatch/Test_014_SCAButtonVerifyByEnablingToggle.json");

describe('SCA to apply all views', () => {

  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME2);
  });

  it(`Test Case 1: Configure Procedure with SCP Reporting`, async () => {
    await PlanningSpace.navToProcessOrchestration();
    await browser.pause(5000);
    await GlobalSettings.clickGlobalSettings();
    await testUtil.leftPaneLinksOfPO('Process Orchestration');
    await GlobalSettings.clickOnProcessFromList(TestData.PROCESS_DISPLAY_NAME);
    await SupplyChainPage.selectProcess(TestData.PROCESS_DISPLAY_NAME);
    const mappedResult: { procedureName: string; alertSuccess: boolean; validation: boolean }[] = [];
    let creationResults: boolean = true;
    for (let i = 1; i <= 4; i++) {
      const procedureName = TestData.PROCEDURE[`PROCEDURENAME${i}`];
      const isProcedureMapped = await SupplyChainPage.isProcedureMapped(procedureName);
      if (isProcedureMapped) {
        await CommonFunctions.logMessage('INFO', `Procedure ${procedureName} is already mapped, skipping creation`);
        mappedResult.push({ procedureName, alertSuccess: true, validation: true });
      } else {
        await CommonFunctions.logMessage('INFO', `Procedure ${procedureName} is not mapped, creating the procedure`);
        await ProcessPage.clickOnAddProcedureBtn();
        await SupplyChainPage.selectProcessesAndAttributes(procedureName, TestData.ATTRIBUTE_VALUE);
        const successMsgAlert = await CommonFunctions.verifyAlertMsg('Process Model PUT Successful', 10000);
        const bValidation = await CommonFunctions.compareTwoValues(successMsgAlert, true, `Procedure ${procedureName} mapped successfully`);
        creationResults = creationResults && successMsgAlert && bValidation;
      }
    }
    expect(creationResults).toBeTruthy();
  });

  it(`Test Case 2: Map views to the same procedure`, async () => {
    await PlanningSpace.navToProcessOrchestration();
    await GlobalSettings.clickGlobalSettings();
    await GlobalSettings.clickGlobalSettingsListMenu('Process');
    await GlobalSettings.selectProcess(TestData.PROCESS_DISPLAY_NAME)
    let validation1: boolean = await CommonFunctions.compareTwoValues(await GlobalSettings.removeViewMappingToEntity(TestData.PROCESS_DISPLAY_NAME), true, 'Removed Mapping Assertion for Process');
    let isViewMapSuccess: boolean = await GlobalSettings.addViewMappingToEntity(TestData.PROCESS_DISPLAY_NAME, [TestData.MAP_VIEWS_TO_PROCESS]);
    let validation2: boolean = await CommonFunctions.compareTwoValues(isViewMapSuccess, true, 'View Mapping Save Assertion for Process');
    expect(validation1 && validation2).toBeTruthy();
  });

  it(`Test Case 3: Configure views by selecting Apply all toggle`, async () => {
    await SupplyChainPage.selectSingleAction(TestData.PROCESS_DISPLAY_NAME, 'Configure View specific Procedures & Filters');
    const verifyProcedureCheckboxes = await SupplyChainPage.selectAllProceduresCheckboxToMap(true);
    await SupplyChainPage.selectPrimaryAndSecondaryActions(TestData.PRIMARY_BUTTON, TestData.SECONDARY_BUTTON);
    const toggleApplied = await SupplyChainPage.toggleApplyAll(true);
    await SupplyChainPage.clickSaveButton();
    const bvalidation = await CommonFunctions.compareTwoValues(verifyProcedureCheckboxes, true, 'All SCA procedures are enabled');
    expect(toggleApplied && bvalidation).toBeTruthy();
  });

  it(`Test Case 4: Validate child view names and SCA buttons (primary and secondary) in the Planning Space`, async () => {
    await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME2);
    await planningPage.switchToMFEFrame();
    const childViews = [TestData.CHILD_VIEWS.VIEW1, TestData.CHILD_VIEWS.VIEW2, TestData.CHILD_VIEWS.VIEW3, TestData.CHILD_VIEWS.VIEW4];
    const procedureDropdownData = Object.values(TestData.PROCEDURE_DROPDOWN).map((proc: string) => ({ procedureDisplayName: proc }));
    let validationResult: boolean = true;
    for (let i = 0; i < childViews.length; i++) {
      const viewName = childViews[i];
      await CommonFunctions.logMessage('INFO', `Validating child view ${i + 1} of ${childViews.length}: ${viewName}`);
      await planningPage.clickViewsDropDown();
      await planningPage.clickDashBoard(viewName);
      let validation1: boolean = await CommonFunctions.compareTwoValues(await SupplyChainPage.isViewLoaded(viewName), true, `View ${viewName} is loaded`);
      let validation2: boolean = await CommonFunctions.compareTwoValues(await SupplyChainPage.isPrimaryButtonDisplayed(TestData.PRIMARY_BUTTON), true, `Primary button for ${TestData.PRIMARY_BUTTON} is displayed`);
      let validation3: boolean = await CommonFunctions.compareTwoValues(await SupplyChainPage.isSecondaryButtonDisplayed(TestData.SECONDARY_BUTTON), true, `Secondary button for ${TestData.SECONDARY_BUTTON} is displayed`);
      let validation4: boolean = await CommonFunctions.compareTwoValues(await SupplyChainPage.verifyOtherActionsInProceduresDropdown(procedureDropdownData), true, `Remaining Procedures are displayed in the procedure dropdown`);
      validationResult = validationResult && validation1 && validation2 && validation3 && validation4;
    }
    expect(validationResult).toBeTruthy();
  });

  it(`Test Case 5: Remove the created procedures`, async () => {
    await CommonFunctions.switchToSpecificWindow(1);
    await planningPage.switchToMFEFrame();
    await browser.pause(6000);
    let deletionResults: boolean = true;
    for (let i = 1; i <= 4; i++) {
      const procedureName = TestData.PROCEDURE[`PROCEDURENAME${i}`];
      await SupplyChainPage.deleteProcedure(procedureName);
      const successMsgAlert = await CommonFunctions.verifyAlertMsg('Process Model PUT Successful', 10000);
      const bValidation = await CommonFunctions.compareTwoValues(successMsgAlert, true, `Procedure ${procedureName} deleted successfully`);
      deletionResults = deletionResults && successMsgAlert && bValidation;
    }
    expect(deletionResults).toBeTruthy();
  });
})
