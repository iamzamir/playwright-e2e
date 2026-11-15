import { uniqueAlphanumericName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/fixtures';
import type { Page } from '@playwright/test';
import { ProcessSettingsPage } from '../../../pageobjects/process-settings.page';
import { CommonFunctions } from '../../../util/common.util';
import apiUtil from '../../../util/api.util';

test.describe('Actions on sub process in settings', () => {
  let processSettingsPage: ProcessSettingsPage;
  let subProcessName: string;
  // The machine client is not authorised against the PO process API for this realm,
  // so teardown reuses the bearer token the signed-in app session already sends.
  let capturedAuthToken = '';

  function captureAuthToken(page: Page): void {
    const processApiPath = process.env.GET_PROCESS_WITH_NAME as string;
    page.context().on('request', (request) => {
      if (capturedAuthToken || !request.url().includes(processApiPath)) {
        return;
      }
      const authorization = request.headers()['authorization'];
      if (authorization?.toLowerCase().startsWith('bearer ')) {
        capturedAuthToken = authorization;
      }
    });
  }

  // Deletes only this run's sub process, so concurrent runs against the shared process cannot
  // remove each other's entities. The UI display name loses its spaces in the API name.
  async function deleteSubProcessCreatedByThisRun(commonFunctions: CommonFunctions, processName: string): Promise<void> {
    if (!capturedAuthToken || !subProcessName) {
      await commonFunctions.logMessage('WARN', 'Skipping sub process teardown; no session token was captured');
      return;
    }

    const apiSubProcessName = subProcessName.replace(/\s/g, '');
    const subProcessUrl = `${process.env.API_BASE_URL as string}${(process.env.GET_SUBPROCESS_WITH_NAME as string)
      .replace('{processName}', encodeURIComponent(processName))
      .replace('{subprocessName}', encodeURIComponent(apiSubProcessName))}`;
    const headers = { accept: 'application/json', Authorization: capturedAuthToken };

    const existing = await apiUtil.processAPIRequest('GET', subProcessUrl, null, headers, `Check leftover sub process ${apiSubProcessName}`, 'full');
    if (existing?.status !== 200) {
      await commonFunctions.logMessage('INFO', `No leftover sub process ${apiSubProcessName} to clean up`);
      return;
    }

    const deleteStatus = await apiUtil.processAPIRequest('DELETE', subProcessUrl, null, headers, `Delete leftover sub process ${apiSubProcessName}`, 'status');
    await commonFunctions.logMessage(deleteStatus === 200 ? 'INFO' : 'WARN', `Delete leftover sub process ${apiSubProcessName} returned ${deleteStatus}`);
  }

  test.beforeAll(async () => {
    // Sub-process display names only allow alphanumeric characters and spaces (IBP_40_1003).
    subProcessName = uniqueAlphanumericName('subprocesstest');
  });

  test.afterAll(async ({ commonFunctions, testData }) => {
    await deleteSubProcessCreatedByThisRun(commonFunctions, testData.PROCESS_NAME);
  });

  test.describe.serial('Sub Process Actions from Settings', () => {

    test('Test Case 1: Create a sub process', async ({ page, testUtil, processPage, commonFunctions, testData }) => {
      captureAuthToken(page);
      await testUtil.launchAppFromCatalog(testData.REALM_NAME);
      await testUtil.navigateToProcessListingPage();
      await processPage.clickOnProcess(testData.PROCESS_NAME);
      await testUtil.clickPowerBarLink('Process Settings');
      await testUtil.switchToSpecificWindow(1);
      processSettingsPage = new ProcessSettingsPage(testUtil.page);
      await processSettingsPage.clickOnThreeDotMenuOnEntity(testData.PROCESS_NAME);
      await processSettingsPage.clickOnItem('Create Child Process');
      await processSettingsPage.fillSubProcessForm(subProcessName, `testing creation of sub process using AT from settings`, false);
      await processSettingsPage.processActions('Create');
      const bValidation1 = await commonFunctions.compareTwoValues(await processSettingsPage.alertMsg(`Process ${subProcessName.replace(/\s/g, "")} has been created`), true, `Is creation of ${subProcessName} sub process successful`);
      const bValidation2 = await commonFunctions.compareTwoValues(await processSettingsPage.isEntityExist(subProcessName), true, `Is ${subProcessName} sub process available in the table`);
      expect(bValidation1 && bValidation2).toBeTruthy();
    });

    test('Test Case 2: Edit the sub process', async ({ commonFunctions }) => {
      await processSettingsPage.clickOnThreeDotMenuOnEntity(subProcessName);
      await processSettingsPage.clickOnItem('Edit');
      await processSettingsPage.fillSubProcessForm(undefined, `testing creation of sub process using AT from settings`, false);
      await processSettingsPage.processActions('Save');
      const bValidation1 = await commonFunctions.compareTwoValues(await processSettingsPage.alertMsg(`Process ${subProcessName.replace(/\s/g, "")} has been updated`), true, `Is sub process details updated`);
      expect(bValidation1).toBeTruthy();
    });

    test('Test Case 3: Delete the sub process', async ({ commonFunctions }) => {
      await processSettingsPage.clickOnThreeDotMenuOnEntity(subProcessName);
      await processSettingsPage.clickOnItem('Delete');
      await processSettingsPage.processActions('Delete');
      const bValidation1 = await commonFunctions.compareTwoValues(await processSettingsPage.alertMsg(`Process ${subProcessName} has been deleted`), true, `Is sub process deleted`);
      expect(bValidation1).toBeTruthy();
    });

    test('Test Case 4: Validate error message when offset is zero', async ({ commonFunctions, testData }) => {
      await processSettingsPage.clickOnThreeDotMenuOnEntity(testData.PROCESS_NAME);
      await processSettingsPage.clickOnItem('Create Child Process');
      await processSettingsPage.fillSubProcessForm(subProcessName, `testing offset validation`, false);
      // Fill every other required field so a zero offset is the only reason the save can be rejected.
      await processSettingsPage.setCalculateStartDateOn('Start');
      await processSettingsPage.setOfProcessToFirstOption();
      await processSettingsPage.setDurationValue(1);
      await processSettingsPage.setOffsetValue(0);
      await processSettingsPage.processActions('Create');
      // Every other required field is populated above, so only the offset-specific message is acceptable.
      const isSpecificErrorDisplayed = await processSettingsPage.alertMsg('Offset should be 1 or greater');
      const errorValidation = await commonFunctions.compareTwoValues(isSpecificErrorDisplayed, true, `Is offset validation message displayed for zero offset`);
      expect(errorValidation).toBeTruthy();
      await processSettingsPage.clickCancelButton();
    });

    test('Test Case 5: Create and delete a sub process', async ({ commonFunctions, testData }) => {
      await processSettingsPage.clickOnThreeDotMenuOnEntity(testData.PROCESS_NAME);
      await processSettingsPage.clickOnItem('Create Child Process');
      const isCreated = await processSettingsPage.createSubProcess(subProcessName, 0, 1, 'Start', 'All');
      const creationValidation = await commonFunctions.compareTwoValues(isCreated, true, `Is subprocess ${subProcessName} created successfully`);
      const creationSuccessMessage = `Process ${subProcessName.replace(/\s/g, "")} has been created successfully`;
      const isCreationSuccessDisplayed = await processSettingsPage.alertMsg(creationSuccessMessage);
      const successMessageValidation = await commonFunctions.compareTwoValues(isCreationSuccessDisplayed, true, `Is success message displayed for subprocess creation`);
      await processSettingsPage.clickOnThreeDotMenuOnEntity(subProcessName);
      await processSettingsPage.clickOnItem('Delete');
      await processSettingsPage.processActions('Delete');
      const deletionSuccessMessage = `Process ${subProcessName} has been deleted successfully`;
      const deleteMsg = await commonFunctions.compareTwoValues(await processSettingsPage.alertMsg(deletionSuccessMessage), true, `Is either success or error message displayed for subprocess deletion`);
      expect(creationValidation && successMessageValidation && deleteMsg).toBeTruthy();
    });
  });
});

