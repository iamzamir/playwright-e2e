import { test, expect } from '../../../configs/fixtures';
import { ProcessSettingsPage } from '../../../pageobjects/process-settings.page';
import { getTimeout, TIMEOUTS } from '../../../constants/timeouts';

test.describe('Map procedures to process and validate in planning space', () => {
  // Process settings opens in a second window, so this POM is rebound to that page.
  let processSettingsPage: ProcessSettingsPage;
  const getProcedureNames = (testData: any): string[] => [testData.PROCEDURE.PROCEDURENAME1, testData.PROCEDURE.PROCEDURENAME2, testData.PROCEDURE.PROCEDURENAME3];

  test.describe.serial('Procedure Mapping Tests', () => {

    test('Case 1: Configure procedures in process settings and validate the creation', async ({ testUtil, processPage, commonFunctions, testData }) => {
      await testUtil.launchAppFromCatalog(testData.REALM_NAME);
      await testUtil.navigateToProcessListingPage();
      await processPage.clickOnProcess(testData.PROCESS_NAME);
      await testUtil.clickPowerBarLink('Process Settings');
      await testUtil.switchToSpecificWindow(1);

      processSettingsPage = new ProcessSettingsPage(testUtil.page);
      await processSettingsPage.clickOnThreeDotMenuOnEntity(testData.PROCESS_NAME);
      await processSettingsPage.clickOnItem('Configure Process');

      const procedureNames = getProcedureNames(testData);

      for (const [index, procedureName] of procedureNames.entries()) {
        if (await processSettingsPage.isProcedureMapped(procedureName)) {
          continue;
        }
        await processSettingsPage.clickOnAddProcedureBtn();
        await processSettingsPage.selectProcessesAndAttributes(procedureName, testData.ATTRIBUTE_VALUE);
        const isMapped = await processSettingsPage.verifyAlertMsg('Process Model PUT Successful', getTimeout('MEDIUM'));
        await commonFunctions.compareTwoValues(isMapped, true, `Procedure ${index + 1} mapped successfully`);
      }

      const mappedResults: boolean[] = [];
      for (const procedureName of procedureNames) {
        mappedResults.push(await processSettingsPage.isProcedureMapped(procedureName));
      }

      expect(mappedResults.every(Boolean)).toBeTruthy();
    });

    test('Case 2: Validate procedures sequence in planning space', async ({ testUtil, scaPage, commonFunctions, testData }) => {
      await testUtil.switchToSpecificWindow(0);
      await testUtil.clickLeftpaneLinks('Planning');

      const expectedSequence = [
        { procedureDisplayName: testData.PROCEDURE.PROCEDURENAME1 },
        { procedureDisplayName: testData.PROCEDURE.PROCEDURENAME2 },
        { procedureDisplayName: testData.PROCEDURE.PROCEDURENAME3 }
      ];

      await commonFunctions.logMessage('INFO', 'Expected Sequence: ' + JSON.stringify(expectedSequence));
      const sequenceValidation = await scaPage.verifyOtherActionsInProceduresDropdown(expectedSequence, false, 2);
      await commonFunctions.logMessage('INFO', 'Sequence Validation Result: ' + sequenceValidation);
      expect(sequenceValidation).toBeTruthy();
    });

    test('Case 3: Remove the created procedures in process settings', async ({ testUtil, commonFunctions, testData }) => {
      await testUtil.switchToSpecificWindow(1);
      processSettingsPage = new ProcessSettingsPage(testUtil.page);

      const procedureNames = getProcedureNames(testData);

      const deleteResults: boolean[] = [];
      const deleteAndVerify = async (procedureName: string, label: string): Promise<void> => {
        await processSettingsPage.deleteProcedure(procedureName);
        deleteResults.push(await commonFunctions.compareTwoValues(await processSettingsPage.verifyAlertMsg('Process Model PUT Successful', getTimeout('MEDIUM')), true, `${label} deleted successfully`));
        await expect.poll(async () => await processSettingsPage.isProcedureMapped(procedureName), { timeout: getTimeout('MEDIUM'), intervals: [TIMEOUTS.POLL_INTERVAL] }).toBe(false);
      };

      for (const [index, procedureName] of procedureNames.entries()) {
        await deleteAndVerify(procedureName, `Procedure ${index + 1}`);
      }
      // Earlier failed runs can leave other procedures mapped; they would break Case 4's "SCA button removed" check.
      const leftoverNames = (await processSettingsPage.getMappedProcedureNames()).filter((name) => !procedureNames.includes(name));
      for (const leftoverName of leftoverNames) {
        await deleteAndVerify(leftoverName, `Leftover procedure ${leftoverName}`);
      }

      expect(deleteResults.every(Boolean)).toBeTruthy();
    });

    test('Case 4: Validate SCA procedures button is removed from planning space after deletion', async ({ page, testUtil, scaPage }) => {
      await testUtil.switchToSpecificWindow(0);
      await page.reload();
      await scaPage.waitForPlanningGrid();
      await expect.poll(async () => await scaPage.isSCAProceduresDropdownVisible(), { timeout: getTimeout('XLARGE'), intervals: [TIMEOUTS.POLL_INTERVAL] }).toBe(false);
    });
  });
});

