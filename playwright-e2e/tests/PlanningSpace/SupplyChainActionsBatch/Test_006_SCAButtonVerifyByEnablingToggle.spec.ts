import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';

const CONFIGURE_PROCESS = 'Configure Process';
const CONFIGURE_VIEW_PROCEDURES = 'Configure View specific Procedures & Filters';
const PROCESS_MODEL_SAVED = 'Process Model PUT Successful';

/** PROCEDURE.PROCEDURENAME1..4 from the test data. */
function procedureNames(testData: any): string[] {
  return [1, 2, 3, 4].map((i) => testData.PROCEDURE[`PROCEDURENAME${i}`] as string);
}

test.describe.serial('SCA button verification by enabling apply-all toggle', () => {
  test('Test Case 1: Configure Procedure with SCP Reporting', async ({ testUtil, processPage, globalSettingsPage, scaPage, commonFunctions, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      testData.PROCESS_NAME2
    );
    await testUtil.navigateToProcessListingPage();
    await processPage.getPageTitle();
    await globalSettingsPage.clickGlobalSettings();
    await testUtil.clickLeftpaneLinks('Process Orchestration');
    await processPage.clickOnProcess(testData.PROCESS_DISPLAY_NAME, false);
    await scaPage.click3DotIconOfProcess(testData.PROCESS_DISPLAY_NAME);
    await scaPage.selectActionFrom3DotMenu(CONFIGURE_PROCESS);
    let creationResults = true;

    for (const procedureName of procedureNames(testData)) {
      const isProcedureMapped = await scaPage.isProcedureMapped(procedureName);

      if (isProcedureMapped) {
        await commonFunctions.logMessage('INFO', `Procedure ${procedureName} is already mapped, skipping creation`);
        continue;
      }

      await commonFunctions.logMessage('INFO', `Procedure ${procedureName} is not mapped, creating the procedure`);
      await processPage.clickOnAddProcedureBtn();
      await scaPage.mapProcessToProcedureWithContext(procedureName, testData.ATTRIBUTE_VALUE);
      const successMsgAlert = await scaPage.verifyAlertMsg(PROCESS_MODEL_SAVED, getTimeout('MEDIUM'));
      const isMapped = await scaPage.isProcedureMapped(procedureName);
      const validation = await commonFunctions.compareTwoValues(successMsgAlert || isMapped, true, `Procedure ${procedureName} mapped successfully`);
      creationResults = creationResults && (successMsgAlert || isMapped) && validation;
    }

    expect(creationResults).toBeTruthy();
  });

  test('Test Case 2: Map views to the same procedure', async ({ testUtil, processPage, globalSettingsPage, commonFunctions, testData }) => {
    await testUtil.navigateToProcessListingPage();
    await processPage.getPageTitle();
    await globalSettingsPage.clickGlobalSettings();
    await globalSettingsPage.clickGlobalSettingsListMenu('Process');
    await globalSettingsPage.selectProcess(testData.PROCESS_DISPLAY_NAME);

    const validation1 = await commonFunctions.compareTwoValues(
      await globalSettingsPage.removeViewMappingToEntity(testData.PROCESS_DISPLAY_NAME),
      true,
      'Removed Mapping Assertion for Process'
    );
    const viewsToMap = Array.isArray(testData.MAP_VIEWS_TO_PROCESS)
      ? testData.MAP_VIEWS_TO_PROCESS
      : Object.values(testData.CHILD_VIEWS) as string[];
    const isViewMapSuccess = await globalSettingsPage.addViewMappingToEntity(testData.PROCESS_DISPLAY_NAME, viewsToMap);
    const validation2 = await commonFunctions.compareTwoValues(isViewMapSuccess, true, 'View Mapping Save Assertion for Process');

    expect(validation1 && validation2).toBeTruthy();
  });

  test('Test Case 3: Configure views by selecting Apply all toggle', async ({ globalSettingsPage, scaPage, commonFunctions, testData }) => {
    await globalSettingsPage.waitUntilViewMappingIsDisplayed(testData.MAP_VIEWS_TO_PROCESS[0], testData.PROCESS_DISPLAY_NAME);
    await scaPage.selectSingleAction(testData.PROCESS_DISPLAY_NAME, CONFIGURE_VIEW_PROCEDURES);

    const verifyProcedureCheckboxes = await scaPage.selectAllProceduresCheckboxToMap(true);
    const checkboxValidation = await commonFunctions.compareTwoValues(verifyProcedureCheckboxes, true, 'All SCA procedures are enabled');
    await scaPage.selectPrimaryAndSecondaryActions(testData.PRIMARY_BUTTON, testData.SECONDARY_BUTTON);
    const toggleApplied = await scaPage.toggleApplyAll(true);
    const isSaveSuccess = await scaPage.clickSaveButton();

    const saveValidation = await commonFunctions.compareTwoValues(isSaveSuccess, true, 'View specific procedures saved successfully');
    expect(toggleApplied && checkboxValidation && saveValidation).toBeTruthy();
  });

  test('Test Case 4: Validate child view names and SCA buttons (primary and secondary) in the Planning Space', async ({ testUtil, planningPage, scaPage, commonFunctions, testData }) => {
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_DISPLAY_NAME);
    await planningPage.waitForViewToBeDisplayed();

    const childViews = [
      testData.CHILD_VIEWS.VIEW1,
      testData.CHILD_VIEWS.VIEW2,
      testData.CHILD_VIEWS.VIEW3,
      testData.CHILD_VIEWS.VIEW4
    ];
    const procedureDropdownData = Object.values(testData.PROCEDURE_DROPDOWN).map((proc) => ({ procedureDisplayName: proc as string }));

    let validationResult = true;

    for (let i = 0; i < childViews.length; i++) {
      const viewName = childViews[i];
      await commonFunctions.logMessage('INFO', `Validating child view ${i + 1} of ${childViews.length}: ${viewName}`);

      await planningPage.selectViewInPlanning(viewName);
      const validation1 = await commonFunctions.compareTwoValues(await scaPage.isViewLoaded(viewName), true, `View ${viewName} is loaded`);
      const validation2 = await commonFunctions.compareTwoValues(await scaPage.isPrimaryButtonDisplayed(testData.PRIMARY_BUTTON), true, `Primary button for ${testData.PRIMARY_BUTTON} is displayed`);
      const validation3 = await commonFunctions.compareTwoValues(await scaPage.isSecondaryButtonDisplayed(testData.SECONDARY_BUTTON), true, `Secondary button for ${testData.SECONDARY_BUTTON} is displayed`);
      const validation4 = await commonFunctions.compareTwoValues(
        await scaPage.verifyOtherActionsInProceduresDropdown(procedureDropdownData),
        true,
        'Remaining procedures are displayed in the procedure dropdown'
      );

      validationResult = validationResult && validation1 && validation2 && validation3 && validation4;
    }

    expect(validationResult).toBeTruthy();
  });

  test('Test Case 5: Remove the created procedures', async ({ testUtil, processPage, globalSettingsPage, scaPage, commonFunctions, testData }) => {
    await testUtil.navigateToProcessListingPage();
    await processPage.getPageTitle();
    await globalSettingsPage.clickGlobalSettings();
    await testUtil.clickLeftpaneLinks('Process Orchestration');
    await processPage.clickOnProcess(testData.PROCESS_DISPLAY_NAME, false);
    await scaPage.click3DotIconOfProcess(testData.PROCESS_DISPLAY_NAME);
    await scaPage.selectActionFrom3DotMenu(CONFIGURE_PROCESS);
    let deletionResults = true;

    for (const procedureName of procedureNames(testData)) {
      const isMapped = await scaPage.isProcedureMapped(procedureName);
      if (!isMapped) {
        await commonFunctions.logMessage('INFO', `Procedure ${procedureName} is not mapped, skipping deletion`);
        continue;
      }
      await scaPage.deleteProcedure(procedureName);
      const successMsgAlert = await scaPage.verifyAlertMsg(PROCESS_MODEL_SAVED, getTimeout('MEDIUM'));
      const isUnmapped = !(await scaPage.isProcedureMapped(procedureName));
      const validation = await commonFunctions.compareTwoValues(successMsgAlert || isUnmapped, true, `Procedure ${procedureName} deleted successfully`);
      deletionResults = deletionResults && (successMsgAlert || isUnmapped) && validation;
    }

    expect(deletionResults).toBeTruthy();
  });
});
