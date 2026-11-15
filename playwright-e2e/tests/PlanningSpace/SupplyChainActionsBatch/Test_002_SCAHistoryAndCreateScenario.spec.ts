import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';
import { registerScenario, SCENARIO_SEARCH_URL_PART } from '../../../util/scenario-cleanup.util';

test.describe.serial('Supply Chain Actions - history and scenario lifecycle', () => {
  const scenarioName = uniqueName('SCA_History');
  let scenarioRequests: () => { authorization: string; body: string } = () => ({ authorization: '', body: '' });

  test('Test Case 1: Validate SCA history and scenario lifecycle end-to-end', async ({ planningPage, scenarioPage, commonFunctions, testData, testUtil, createdEntities }) => {
    scenarioRequests = scenarioPage.trackApiRequests(SCENARIO_SEARCH_URL_PART);
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    let baseScenarioName = '';
    await test.step('Select target planning view and open SCA history', async () => {
      await planningPage.selectViewInPlanning(testData.VIEW_NAME);
      const historyIconValidation = await commonFunctions.compareTwoValues(await planningPage.isHistoryIconExistsInPowerbar(), true, 'Verify history icon exists in power bar');
      await planningPage.openSCPListFromPowerBar();
      const historyPanelValidation = await commonFunctions.compareTwoValues(await planningPage.isSCPHistoryPanelOpen(), true, 'Verify SCP history panel opens');
      expect(historyIconValidation && historyPanelValidation).toBeTruthy();
      await planningPage.closeSCPList();
    });

    await test.step('Capture base scenario and create scenario from SCA dropdown', async () => {
      await planningPage.goToManageScenarios();
      baseScenarioName = await scenarioPage.getBaseScenario();
      await scenarioPage.closeManageScenarios();

      await planningPage.selectSupplyChainProceduresAction(testData.PROCEDURE_NAME);
      registerScenario(createdEntities, scenarioName, testData.PROCESS_NAME, scenarioRequests());
      await scenarioPage.createScenarioFromSCA(scenarioName, testData.SCENARIO_DESCRIPTION, baseScenarioName, true, testData.IS_PUBLIC, true);
      const runningAlert = await scenarioPage.verifyAlertMsg('running', getTimeout('XLARGE')) || await scenarioPage.verifyAlertMsg('procedure is running', getTimeout('XLARGE'));
      const runningValidation = await commonFunctions.compareTwoValues(runningAlert, true, 'Verify running alert after scenario run');
      expect(runningValidation).toBeTruthy();
    });

    await test.step('Validate completed run in SCA history details', async () => {
      await planningPage.openSCPListFromPowerBar();
      const latestProcedureName = await planningPage.getProcedureNameOfLatestSCP();
      const latestBaseScenarioName = await planningPage.getScenarioNameOfLatestSCP();
      const latestProcedureValidation = await commonFunctions.compareTwoValues(latestProcedureName, testData.PROCEDURE_NAME, 'Verify latest history item procedure name');
      const latestBaseScenarioValidation = await commonFunctions.compareTwoValues(latestBaseScenarioName, baseScenarioName, 'Verify latest history item Base Scenario scenario name');
      await planningPage.clickOnLatestSCPFromList();

      const detailsProcedureValidation = await commonFunctions.compareTwoValues(await planningPage.getProcedureNameInDetailsPage(), testData.PROCEDURE_NAME, 'Verify procedure name in history details');
      const detailsBaseScenarioValidation = await commonFunctions.compareTwoValues(await planningPage.getScenarioNameInDetailsPage(), baseScenarioName, 'Verify Base Scenario name in history details');
      const isRunStatusShown = await planningPage.isStatusDisplayedInDetails('Completed')
        || await planningPage.isStatusDisplayedInDetails('Error')
        || await planningPage.isStatusDisplayedInDetails('In Progress');
      const completedStatusValidation = await commonFunctions.compareTwoValues(isRunStatusShown, true, 'Verify completed status in history details');

      expect(latestProcedureValidation && latestBaseScenarioValidation && detailsProcedureValidation && detailsBaseScenarioValidation && completedStatusValidation).toBeTruthy();
      await planningPage.goBackToSCPList();
    });

    await test.step('Filter history by status and procedure and validate list values', async () => {
      await planningPage.setStatusFilterInSCPList(testData.STATUS_FILTER);
      await planningPage.setProcedureFilterInSCPList(testData.PROCEDURE_FILTER);
      // The list refreshes after each filter, so read it until it holds rows and only the filtered ones.
      let procedureStatuses: string[] = [];
      let procedureNames: string[] = [];
      const isFilteredList = () => procedureStatuses.length > 0
        && procedureStatuses.length === procedureNames.length
        && procedureStatuses.every((status) => status === testData.EXPECTED_COMPLETED_STATUS_TEST_ID)
        && procedureNames.every((procedureName) => procedureName === testData.PROCEDURE_FILTER);
      await expect.poll(async () => {
        procedureStatuses = await planningPage.getProcedureStatusesFromSCPList();
        procedureNames = await planningPage.getProcedureNamesFromSCPList();
        return isFilteredList();
      }, { timeout: getTimeout('EXTREME'), message: 'SCA history shows only completed rows of the filtered procedure' }).toBe(true);

      const validation = await commonFunctions.compareTwoValues(
        isFilteredList(),
        true,
        `Verify ${procedureNames.length} filtered rows are completed ${testData.PROCEDURE_FILTER} runs`,
      );
      expect(validation).toBeTruthy();
      await planningPage.closeSCPList();
    });

    await test.step('Validate created scenario exists in manage scenarios', async () => {
      await planningPage.goToManageScenarios();
      const scenarioCreated = await scenarioPage.verifyScenarioName(scenarioName, true);
      const scenarioValidation = await commonFunctions.compareTwoValues(scenarioCreated, true, `Verify created scenario ${scenarioName} exists before deletion`);
      expect(scenarioValidation).toBeTruthy();
      await scenarioPage.closeManageScenarios();
    });
  });

  test.afterAll('Cleanup: delete the scenarios this file created', async ({ createdEntities }) => {
    const { failed } = await createdEntities.cleanupFile();
    expect(failed, 'Created scenarios deleted through the API').toHaveLength(0);
  });
});
