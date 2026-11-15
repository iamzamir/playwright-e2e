import { test, expect } from '../../../configs/fixtures';
import apiUtil from '../../../util/api.util';
import { deleteProcessWithReferences } from '../../../util/process-fixture.util';

test.describe('Actions on process in PO', () => {
  let processName: string, subProcessName: string;
  // Deleting a missing sub process and a delete this client may not perform both answer 401 IBP_40_1032, so the API
  // cleanup only runs for a sub process the UI confirmed created but not deleted, and it never accepts that 401.
  let subProcessCreated = false, subProcessDeleted = false;

  test.beforeAll(async ({ testData }) => {
    const uniqueSuffix = Date.now().toString().slice(-7);
    processName = `${testData.CREATE_PROCESS_FORM_DATA.DISPLAY_NAME} ${uniqueSuffix}`;
    subProcessName = `Test Subprocess ${uniqueSuffix}`;
  });

  // Safety net for a run that failed before the UI delete: removes the sub process, then the process with its
  // model, procedure, actor and IAM roles (each step tolerates 404). API names are the display names without spaces.
  test.afterAll(async ({ commonFunctions, testData }) => {
    if (!processName) {
      await commonFunctions.logMessage('WARN', 'Skipping process cleanup; process name was not initialized');
      return;
    }

    const headers = await apiUtil.buildAuthHeaders();
    const apiProcessName = processName.replace(/\s/g, '');
    let subProcessCleaned = true;
    if (subProcessCreated && !subProcessDeleted) {
      const subProcessEndpoint = (process.env.GET_SUBPROCESS_WITH_NAME as string || 'cbp/interop/ibp/process-orchestration/v1/process/{processName}/subprocess/{subprocessName}')
        .replace('{processName}', encodeURIComponent(apiProcessName))
        .replace('{subprocessName}', encodeURIComponent(subProcessName.replace(/\s/g, '')));
      const subProcessUrl = `${(process.env.API_BASE_URL as string).replace(/\/+$/, '')}/${subProcessEndpoint.replace(/^\/+/, '')}`;
      const subProcessResponse = await apiUtil.processAPIRequest('DELETE', subProcessUrl, null, headers, `Delete leftover sub process ${subProcessName}`, 'full');
      subProcessCleaned = [200, 204, 404].some((code) => commonFunctions.isStatus(subProcessResponse?.status, code));
    } else {
      await commonFunctions.logMessage('INFO', `No leftover sub process to delete (created: ${subProcessCreated}, deleted in UI: ${subProcessDeleted})`);
    }

    const processDeleted = await deleteProcessWithReferences(apiUtil, commonFunctions, headers, apiProcessName, [testData.SUBJECT_ID]);
    expect(subProcessCleaned && processDeleted, 'Process actions leftover cleanup should succeed').toBeTruthy();
  });

  test.describe.serial('Process Actions Test Suite', () => {

    test('Test Case 1: Create a process', async ({ testUtil, processPage, commonFunctions, testData }) => {
      await testUtil.launchAppFromCatalog(testData.REALM_NAME);
      await testUtil.navigateToProcessListingPage();
      await processPage.clickOnAddProcess();
      await processPage.fillCreateProcessForm(processName, testData.CREATE_PROCESS_FORM_DATA.CALENDAR, testData.CREATE_PROCESS_FORM_DATA.CYCLE_NAME, testData.CREATE_PROCESS_FORM_DATA.DESCRIPTION, testData.CREATE_PROCESS_FORM_DATA.TEMPLATE_NAME);
      await processPage.processActions('Create');
      const bValidation1 = await commonFunctions.compareTwoValues(await processPage.alertMsg(`Process ${processName.replace(/\s/g, "")} has been created successfully`), true, `Is success toast displayed for process: ${processName}`);
      const bValidation2 = await commonFunctions.compareTwoValues(await processPage.isProcessExist(processName), true, `Is ${processName} process available in the list`);
      expect(bValidation1 && bValidation2).toBeTruthy();
    });

    test('Test Case 2: Create a sub process', async ({ processPage, commonFunctions }) => {
      await processPage.clickOnProcess(processName);
      await processPage.setPageSize("10");
      await processPage.clickOnAddSubProcess();
      await processPage.fillSubProcessForm(subProcessName, `testing creation of sub process using AT`, true);
      await processPage.processActions('Create');
      const bValidation1 = await commonFunctions.compareTwoValues(await processPage.alertMsg(`Process ${subProcessName.replace(/\s/g, "")} has been created`), true, `Is creation of ${subProcessName} sub process successful`);
      await processPage.setPageSize("10");
      const bValidation2 = await commonFunctions.compareTwoValues(await processPage.isProcessExist(subProcessName), true, `Is ${subProcessName} sub process available in the table`);
      // Either signal means it exists, so afterAll still cleans it up when only the toast was missed.
      subProcessCreated = bValidation1 || bValidation2;
      expect(bValidation1 && bValidation2).toBeTruthy();
    });

    test('Test Case 3: Edit sub process', async ({ processPage, commonFunctions }) => {
      await processPage.refreshProcess(); // Remove this later
      await processPage.setPageSize("10");
      await processPage.clickOnThreeDotMenuOfSubProcess(subProcessName);
      await processPage.clickOnItem('Edit');
      await processPage.fillSubProcessForm('', `edit description`, false);
      await processPage.processActions('Save');
      const bValidation1 = await commonFunctions.compareTwoValues(await processPage.alertMsg(`Process ${subProcessName.replace(/\s/g, "")} has been updated`), true, `Is sub process details updated for: ${subProcessName}`);
      expect(bValidation1).toBeTruthy();
    });

    test('Test Case 4: Delete the created sub process', async ({ processPage, commonFunctions }) => {
      await processPage.clickOnThreeDotMenuOfSubProcess(subProcessName);
      await processPage.clickOnItem('Delete');
      await processPage.processActions('Delete');
      const bValidation1 = await commonFunctions.compareTwoValues(await processPage.alertMsg(`Process ${subProcessName} has been deleted`), true, `Is sub process deleted: ${subProcessName}`);
      subProcessDeleted = bValidation1;
      expect(bValidation1).toBeTruthy();
    });

    test('Test Case 6: Delete the created process', async ({ processPage, commonFunctions }) => {
      await processPage.clickOnThreeDotMenu();
      await processPage.clickOnMenuItem("Delete");
      await processPage.processActions('Delete');
      const bValidation1 = await commonFunctions.compareTwoValues(await processPage.alertMsg(`deleted`), true, `Is process deleted: ${processName}`);
      expect(bValidation1).toBeTruthy();
    });

  });
});

