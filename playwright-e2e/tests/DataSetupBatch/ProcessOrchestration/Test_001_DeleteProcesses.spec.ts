/**
 * ==============================================================================================
 * Data Setup Batch: Process Cleanup Utility
 * ==============================================================================================
 *
 * HOW TO RUN BASED ON NEED:
 *
 * 1. Dry Run Mode (Preview processes that would be deleted without making changes):
 *    $env:PROCESS_CLEANUP_DRY_RUN="true"; $env:USE_SPECIFIC_TESTS="false"; $env:PW_ENABLE_GLOBAL_SETUP="false"; npx playwright test tests/DataSetupBatch/ProcessOrchestration/Test_001_DeleteProcesses.spec.ts --config=configs/playwright.config.ts
 *
 * 2. Delete Mode (Delete all processes except the 35 protected processes):
 *    $env:PROCESS_CLEANUP_DRY_RUN="false"; $env:USE_SPECIFIC_TESTS="false"; $env:PW_ENABLE_GLOBAL_SETUP="false"; npx playwright test tests/DataSetupBatch/ProcessOrchestration/Test_001_DeleteProcesses.spec.ts --config=configs/playwright.config.ts
 *
 * 3. Delete by Specific Keyword Filter (e.g., only delete processes containing "test" or "temp"):
 *    $env:PROCESS_FILTER="temp"; $env:PROCESS_CLEANUP_DRY_RUN="false"; $env:USE_SPECIFIC_TESTS="false"; $env:PW_ENABLE_GLOBAL_SETUP="false"; npx playwright test tests/DataSetupBatch/ProcessOrchestration/Test_001_DeleteProcesses.spec.ts --config=configs/playwright.config.ts
 *
 * 4. Add Extra Protected Processes on the Fly (comma-separated list):
 *    $env:ADDITIONAL_EXCLUDED_PROCESSES="MySpecialProcess,AnotherProcess"; $env:PROCESS_CLEANUP_DRY_RUN="false"; $env:USE_SPECIFIC_TESTS="false"; $env:PW_ENABLE_GLOBAL_SETUP="false"; npx playwright test tests/DataSetupBatch/ProcessOrchestration/Test_001_DeleteProcesses.spec.ts --config=configs/playwright.config.ts
 *
 * ==============================================================================================
 */

import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';

const EXCLUDED_PROCESS_NAMES = [
  'PSProcess',
  'Fault Tolerance with Scenario and No Views',
  'PSManual3',
  'PSManual4',
  'PSManual2',
  'PSAutomation',
  'SCAtoapplyallviews',
  'ProcessStartStop',
  'ProcessWithCustomAttribute',
  'PrimarySecondarySCA',
  'IntegratedSlottingScheduling',
  'FT Empty State',
  'ProcedureMappingCheck',
  'ArrangeViewGroups',
  'FT of Empty State',
  'StartProcess',
  'PSManual',
  'Demand Supply Planning',
  'ArrangeViewsTesting',
  'Quick Filter Validation',
  'APILinkManagementTest',
  'ODMProcess',
  'IDSPAutomationProcess',
  'IDSPProcessWithNoScenario',
  'ProcessInteractive',
  'Allocation and Replenishment',
  'AllocAndReplen', // alias used in backend and testdata for Allocation and Replenishment
  'Anton',
  'ViewPermissionTest',
  'Fault Tolerance',
  'HiddenViewsProcess',
  'IBP India',
  'PSAutomationProcess',
  'Fault Tolerance without Scenario and Views',
  'VerticalFilterTest',
  'Fault Tolerance with No Base Scenario',
  'testervalue',
  'ProcessVerifyViewMapping',
  'IntegratedBusinessPlanning'
];

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

test.describe.serial('Data Setup Batch - Process cleanup', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
  let getProcessListUrl: string;
  let deleteProcessUrlTemplate: string;
  let targetProcesses: any[] = [];

  const isDryRun = (process.env.PROCESS_CLEANUP_DRY_RUN || process.env.DRY_RUN || 'true').toLowerCase() !== 'false';
  const processFilter = (process.env.PROCESS_FILTER || '').trim().toLowerCase();
  const extraExcluded = (process.env.ADDITIONAL_EXCLUDED_PROCESSES || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const allExcludedProcesses = [...EXCLUDED_PROCESS_NAMES, ...extraExcluded];
  const normalizedExcluded = new Set(allExcludedProcesses.map(p => normalize(p)));

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    headers = await apiUtil.buildAuthHeaders();

    const baseUrl = (process.env.API_BASE_URL || 'https://api-tst.jdadelivers.com/').replace(/\/+$/, '');
    const getPath = (process.env.GET_PROCESS_WITH_NAME || 'cbp/interop/ibp/process-orchestration/v1/process').replace(/^\/+/, '');
    const deletePath = (process.env.DELETE_PROCESS || 'cbp/interop/ibp/process-orchestration/v1/process/{processName}').replace(/^\/+/, '');
    getProcessListUrl = `${baseUrl}/${getPath}?pageNumber=0&pageSize=500`;
    deleteProcessUrlTemplate = `${baseUrl}/${deletePath}`;
  });


  test('Test Case 1: Identify and report processes for cleanup', async () => {
    const listResponse = await apiUtil.processAPIRequest('GET', getProcessListUrl, null, headers, 'Get process list for cleanup', 'full');
    const listStatusValidation = await commonFunctions.compareTwoValues(listResponse.status, 200, 'Get process list success assertion');
    expect(listStatusValidation).toBeTruthy();

    const entities = Array.isArray(listResponse.data)
      ? listResponse.data
      : listResponse.data?.data?.entities || [];

    const protectedProcesses: any[] = [];
    targetProcesses = [];

    for (const process of entities) {
      const processName = String(process?.name || '');
      if (!processName) continue;

      const norm = normalize(processName);
      if (normalizedExcluded.has(norm)) {
        protectedProcesses.push(process);
      } else {
        if (!processFilter || processName.toLowerCase().includes(processFilter)) {
          targetProcesses.push(process);
        }
      }
    }

    await commonFunctions.logMessage(
      'INFO',
      `\n================ PROCESS CLEANUP CONFIGURATION ================\n` +
      `Dry Run Mode:                   ${isDryRun ? 'ENABLED (preview only, no deletion)' : 'DISABLED (deletions will execute)'}\n` +
      `Filter Keyword:                 ${processFilter ? `"${processFilter}"` : 'None (all non-excluded processes targeted)'}\n` +
      `Protected Processes Configured: ${allExcludedProcesses.length}\n` +
      `===============================================================\n` +
      `Total Processes in Realm:       ${entities.length}\n` +
      `Protected Processes Found:      ${protectedProcesses.length}\n` +
      `Target Processes to Delete:     ${targetProcesses.length}\n` +
      `===============================================================`
    );

    if (protectedProcesses.length > 0) {
      await commonFunctions.logMessage(
        'INFO',
        `\n--- PROTECTED PROCESSES PRESERVED (${protectedProcesses.length}) ---\n` +
        protectedProcesses.map((p, idx) => `  ${idx + 1}. ${p.name}`).join('\n')
      );
    }

    if (targetProcesses.length > 0) {
      await commonFunctions.logMessage(
        'INFO',
        `\n--- TARGET PROCESSES IDENTIFIED FOR CLEANUP (${targetProcesses.length}) ---\n` +
        targetProcesses.map((r, idx) => `  ${idx + 1}. ${r.name}`).join('\n')
      );
    } else {
      await commonFunctions.logMessage('INFO', 'No target processes identified for cleanup. Environment is clean.');
    }
  });

  test('Test Case 2: Delete target processes', async () => {
    test.setTimeout(900000); // 15 minutes timeout

    if (targetProcesses.length === 0) {
      await commonFunctions.logMessage('INFO', 'No target processes to delete. Skipping cleanup.');
      return;
    }

    if (isDryRun) {
      await commonFunctions.logMessage('INFO', `[DRY RUN] Would delete ${targetProcesses.length} process(es):`);
      for (const process of targetProcesses) {
        await commonFunctions.logMessage('INFO', `  [DRY RUN] Would delete process: "${process.name}"`);
      }
      return;
    }

    await commonFunctions.logMessage('INFO', `Starting deletion of ${targetProcesses.length} target process(es)...`);

    let totalDeleted = 0;
    let hardDeleteFailures = 0;

    for (let i = 0; i < targetProcesses.length; i++) {
      const process = targetProcesses[i];
      const processName = process?.name;
      if (!processName) continue;

      await commonFunctions.logMessage('INFO', `\n[${i + 1}/${targetProcesses.length}] Deleting process: "${processName}"`);

      const encodedName = encodeURIComponent(processName);
      const deleteUrl = deleteProcessUrlTemplate.includes('{processName}')
        ? deleteProcessUrlTemplate.replace('{processName}', encodedName)
        : `${deleteProcessUrlTemplate}/${encodedName}`;

      const deleteResponse = await apiUtil.processAPIRequest('DELETE', deleteUrl, null, headers, `Delete process ${processName}`, 'full');
      const numericStatus = Number(deleteResponse && typeof deleteResponse === 'object' && 'status' in deleteResponse ? deleteResponse.status : deleteResponse);

      if (numericStatus === 500) {
        await commonFunctions.logMessage('WARN', `Ignoring delete failure with status 500 for process: "${processName}"`);
        continue;
      }

      if (numericStatus === 200 || numericStatus === 204 || numericStatus === 404) {
        totalDeleted++;
        await commonFunctions.logMessage('PASS', `[DELETED] Process "${processName}" (status: ${numericStatus})`);
      } else {
        hardDeleteFailures++;
        await commonFunctions.logMessage('FAIL', `Unexpected delete status ${numericStatus} for process: "${processName}"`);
      }
    }

    await commonFunctions.logMessage(
      'INFO',
      `\n================ PROCESS CLEANUP SUMMARY ================\n` +
      `Target Processes Processed: ${targetProcesses.length}\n` +
      `Total Processes Deleted:    ${totalDeleted}\n` +
      `Failed Deletions:           ${hardDeleteFailures}\n` +
      `=========================================================`
    );

    expect(hardDeleteFailures, 'Unexpected process deletion failures').toBe(0);
  });
});
