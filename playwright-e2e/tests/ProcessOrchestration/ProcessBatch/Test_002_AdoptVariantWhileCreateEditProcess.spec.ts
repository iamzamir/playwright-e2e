import { uniqueAlphanumericName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/fixtures';
import apiUtil from '../../../util/api.util';
import { isGraviteeGateway } from '../../../util/gateway.util';
import { deleteProcessWithReferences } from '../../../util/process-fixture.util';

test.describe('Data Version Dropdown validation for Process Creation in PO', () => {
  let processName: string;

  test.beforeAll(async ({ testData }) => {
    // Process display names only allow alphanumeric characters and spaces (IBP_40_1003).
    processName = uniqueAlphanumericName(testData.CREATE_PROCESS_FORM_DATA.DISPLAY_NAME || 'DataVersionTest');
  });

  test.describe.serial('Data Version Test Suite', () => {

    test('Test Case 1: Create a process with a non-default data version', async ({ testUtil, processPage, commonFunctions, testData }) => {
      await testUtil.launchAppFromCatalog(testData.REALM_NAME);
      await testUtil.navigateToProcessListingPage();
      await processPage.clickOnAddProcess();
      await processPage.fillCreateProcessForm(processName, testData.CREATE_PROCESS_FORM_DATA.CALENDAR, testData.CREATE_PROCESS_FORM_DATA.CYCLE_NAME, testData.CREATE_PROCESS_FORM_DATA.DESCRIPTION, testData.CREATE_PROCESS_FORM_DATA.TEMPLATE_NAME, testData.CREATE_PROCESS_FORM_DATA.DATA_VERSION_VALUE);
      await processPage.processActions('Create');
      const bValidation1 = await commonFunctions.compareTwoValues(await processPage.alertMsg(`Process ${processName.replace(/\s/g, "")} has been created successfully`), true, `Is success toast displayed`);
      const bValidation2 = await commonFunctions.compareTwoValues(await processPage.isProcessExist(processName), true, `Is ${processName} process available in the list`);
      expect(bValidation1 && bValidation2).toBeTruthy();
    });

    test('Test Case 2: Validate the data version chip when a data version is selected', async ({ testUtil, globalSettingsPage, processPage, commonFunctions, testData }) => {
      await globalSettingsPage.clickGlobalSettings();
      await testUtil.clickLeftpaneLinks("Process Orchestration");
      await processPage.clickOnProcess(processName, false);
      const dataVersionChipExists = await processPage.dataVersionChipValidation(testData.CREATE_PROCESS_FORM_DATA.DATA_VERSION_VALUE);
      const bValidation = await commonFunctions.compareTwoValues(dataVersionChipExists, true, `Is data version chip with value ${testData.CREATE_PROCESS_FORM_DATA.DATA_VERSION_VALUE} displayed correctly`);
      expect(bValidation).toBeTruthy();
    });

    test(`Test Case 3: Edit a data version in the process`, async ({ processPage, commonFunctions, testData }) => {
      await processPage.clickOnThreeDotMenu();
      await processPage.clickOnMenuItem("Edit Details");
      await processPage.selectDataVersionItem(testData.EDIT_PROCESS_FORM_DATA.DATA_VERSION_DEFAULT)
      await processPage.processActions('Save');
      const bValidation = await commonFunctions.compareTwoValues(await processPage.alertMsg(`Process ${processName.replace(/\s/g, "")} has been updated successfully`), true, `Is success toast displayed for process edit`);
      expect(bValidation).toBeTruthy();
    });

    test(`Test Case 4: Validate the data Version Chip when default is selected`, async ({ processPage, commonFunctions, testData }) => {
      const dataVersionChipNotDisplayed = await processPage.dataVersionChipValidation(testData.EDIT_PROCESS_FORM_DATA.DATA_VERSION_DEFAULT);
      const bValidation = await commonFunctions.compareTwoValues(dataVersionChipNotDisplayed, true, `Is data version chip correctly hidden for default value`);
      expect(bValidation).toBeTruthy();
    });

    test(`Test Case 5: Delete the created process`, async ({ processPage, commonFunctions }) => {
      await processPage.clickOnThreeDotMenu();
      await processPage.clickOnMenuItem("Delete");
      await processPage.processActions('Delete');
      const bValidation = await commonFunctions.compareTwoValues(await processPage.alertMsg(`deleted`), true, `Is process deleted: ${processName}`);
      expect(bValidation).toBeTruthy();
    });

  });

  test.describe.serial('Data Cleanup', () => {

    // Removes what the template created for the process (process model, procedure, actor, IAM roles); each step tolerates 404.
    // Azure runs in the cbp-interop-po-ps-1 realm, which needs its own machine client; on Gravitee the realm key
    // override already points the default machine client at the spec's tenant.
    test(`Test Case 6: Delete procedure, actor, roles associated with process`, async ({ commonFunctions, testData }) => {
      const headers = isGraviteeGateway()
        ? await apiUtil.buildAuthHeaders()
        : await apiUtil.buildAuthHeaders(process.env.REALM_CLIENT_ID_SOURCE_PO_PS_1 || '', process.env.CLIENT_SECRET_PO_PS_1 || '', process.env.REALM_ID_PO_PS_1 || '');
      const extraSubjectIds = isGraviteeGateway() ? [] : [testData.SUBJECT_ID, testData.PSAUTOMATION_SUBJECT_ID];
      const isCleanedUp = await deleteProcessWithReferences(apiUtil, commonFunctions, headers, processName.replace(/\s/g, ''), extraSubjectIds);
      expect(isCleanedUp, `Cleanup of ${processName} references should succeed`).toBeTruthy();
    });

  });
});
