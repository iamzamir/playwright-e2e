/**
 * ==============================================================================================
 * Data Setup Batch: IAM Process Roles Cleanup Utility
 * ==============================================================================================
 *
 * HOW TO RUN BASED ON NEED:
 *
 * 1. Default Mode (Clean all orphaned _admin & _user roles, excluding protected processes & system roles):
 *    $env:USE_SPECIFIC_TESTS="false"; $env:PW_ENABLE_GLOBAL_SETUP="false"; npx playwright test tests/DataSetupBatch/ProcessOrchestration/Test_008_DeleteUnusedProcessRoles.spec.ts --config=configs/playwright.config.ts
 *
 * 2. Dry Run Mode (Preview roles & assigned users without deleting anything):
 *    $env:ROLE_CLEANUP_DRY_RUN="true"; $env:USE_SPECIFIC_TESTS="false"; $env:PW_ENABLE_GLOBAL_SETUP="false"; npx playwright test tests/DataSetupBatch/ProcessOrchestration/Test_008_DeleteUnusedProcessRoles.spec.ts --config=configs/playwright.config.ts
 *
 * 3. Delete by Specific Prefix (e.g., "processcreate*"):
 *    $env:ROLE_NAME_PREFIX="processcreate"; $env:USE_SPECIFIC_TESTS="false"; $env:PW_ENABLE_GLOBAL_SETUP="false"; npx playwright test tests/DataSetupBatch/ProcessOrchestration/Test_008_DeleteUnusedProcessRoles.spec.ts --config=configs/playwright.config.ts
 *
 * 4. Delete Specific Role Names (comma-separated list):
 *    $env:TARGET_ROLE_NAMES="testprocnew_admin,testprocnew_user"; $env:USE_SPECIFIC_TESTS="false"; $env:PW_ENABLE_GLOBAL_SETUP="false"; npx playwright test tests/DataSetupBatch/ProcessOrchestration/Test_008_DeleteUnusedProcessRoles.spec.ts --config=configs/playwright.config.ts
 *
 * 5. Add Extra Excluded Processes on the Fly (comma-separated list of protected processes):
 *    $env:ADDITIONAL_EXCLUDED_PROCESSES="MySpecialProcess,AnotherProcess"; $env:USE_SPECIFIC_TESTS="false"; $env:PW_ENABLE_GLOBAL_SETUP="false"; npx playwright test tests/DataSetupBatch/ProcessOrchestration/Test_008_DeleteUnusedProcessRoles.spec.ts --config=configs/playwright.config.ts
 *
 * ==============================================================================================
 */

import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';

const PAGE_SIZE = 50;

interface RoleItem {
  id: string | number;
  name: string;
  realmName?: string;
}

const DEFAULT_EXCLUDED_PROCESSES = [
  'Fault Tolerance with Scenario and No Views',
  'PSManual3',
  'PSManual4',
  'PSAutomation',
  'ProcessStartStop',
  'SCAtoapplyallviews',
  'ProcessWithCustomAttribute',
  'PrimarySecondarySCA',
  'IntegratedSlottingScheduling',
  'FT Empty State',
  'ProcedureMappingCheck',
  'ArrangeViewGroups',
  'FT of Empty State',
  'StartProcess',
  'PSManual',
  'PSManual2',
  'Demand Supply Planning',
  'Process20250209',
  'ArrangeViewsTesting',
  'IDSPAutomationProcess',
  'Quick Filter Validation',
  'APILinkManagementTest',
  'ODMProcess',
  'Allocation and Replenishment',
  'AllocAndReplen',
  'Anton',
  'ViewPermissionTest',
  'Fault Tolerance',
  'FaultTolerance',
  'HiddenViewsProcess',
  'IBP India',
  'IBPIndia',
  'IBPNA',
  'PSAutomationProcess',
  'Fault Tolerance without Scenario and Views',
  'VerticalFilterTest',
  'Fault Tolerance with No Base Scenario',
  'FaultTolerancewithNoBaseScenario',
  'testervalue',
  'ProcessVerifyViewMapping',
  'IntegratedBusinessPlanning',
  'CleanProcessForAttributeTest',
  'ParentProcess',
  'IDSPProcessWithNoScenario',
  'ProcessInteractive',
  'PSProcess',
  'PlanningSpaceProcess',
  'SCA to apply all views',
  'SCAtoapplyallviews',
  'DATA VERSION PROCESS TEST',
  'TestProcNew',
  'IDSP',
  'KPI'
];

const DEFAULT_PROTECTED_SYSTEM_ROLES = [
  'dp_workbench_admin_user',
  'ibp_admin_role',
  'process_admin',
  'insight_procedure_admin',
  'logicalmodel_admin',
  'process_viewer'
];

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

test.describe.serial('Data Setup Batch - IAM Process Roles Cleanup', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
  let apiBaseUrl: string;
  let targetRoles: RoleItem[] = [];

  const isDryRun = (process.env.ROLE_CLEANUP_DRY_RUN || process.env.DRY_RUN || 'false').toLowerCase() === 'true';
  const targetPrefix = (process.env.ROLE_NAME_PREFIX || process.env.ROLE_PREFIX || '').trim();
  const targetFilter = (process.env.ROLE_FILTER || '').trim();
  const specificTargetRoles = (process.env.TARGET_ROLE_NAMES || process.env.TARGET_ROLES || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  const extraExcluded = (process.env.ADDITIONAL_EXCLUDED_PROCESSES || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const allExcludedProcesses = [...DEFAULT_EXCLUDED_PROCESSES, ...extraExcluded];
  const normalizedExcludedProcesses = new Set(allExcludedProcesses.map(p => normalize(p)));
  const protectedSystemRoles = new Set(DEFAULT_PROTECTED_SYSTEM_ROLES.map(r => r.toLowerCase()));

  function statusOf(response: any): number {
    return Number(response && typeof response === 'object' && 'status' in response ? response.status : response);
  }

  function extractEntities(payload: any): any[] {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.entities)) return payload.entities;
    if (Array.isArray(payload?.data?.entities)) return payload.data.entities;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  }

  function isRoleTargeted(roleName: string, baseRoleName: string): boolean {
    const normBase = normalize(baseRoleName);
    const lowerRoleName = roleName.toLowerCase();

    // 1. Never delete protected system roles
    if (protectedSystemRoles.has(lowerRoleName)) {
      return false;
    }

    // 2. Never delete protected test processes
    if (normalizedExcludedProcesses.has(normBase)) {
      return false;
    }

    // 3. If specific target role names are provided, match only those
    if (specificTargetRoles.length > 0) {
      return specificTargetRoles.includes(lowerRoleName);
    }

    // 4. If a specific prefix is provided, match that prefix
    if (targetPrefix) {
      return lowerRoleName.startsWith(targetPrefix.toLowerCase());
    }

    // 5. If a keyword filter is provided, match that substring
    if (targetFilter) {
      return lowerRoleName.includes(targetFilter.toLowerCase());
    }

    // 6. Default mode: all roles containing _admin or _user (orphaned process roles)
    return /(_admin|_user)/i.test(roleName);
  }

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    headers = await apiUtil.buildAuthHeaders();
    apiBaseUrl = (process.env.API_BASE_URL || 'https://api-tst.jdadelivers.com/').replace(/\/+$/, '');
  });

  test('Test Case 1: Identify and report roles for cleanup', async () => {
    const rolesUrl = `${apiBaseUrl}/iam/realm/v1/roles`;
    await commonFunctions.logMessage('INFO', `Fetching all IAM roles from: ${rolesUrl}`);

    const response = await apiUtil.processAPIRequest('GET', rolesUrl, null, headers, 'Fetch all IAM roles', 'full');
    const statusValid = await commonFunctions.compareTwoValues(response.status, 200, 'Get all roles status assertion');
    expect(statusValid).toBeTruthy();

    const allRoles = extractEntities(response.data);
    await commonFunctions.logMessage('INFO', `Total roles in realm: ${allRoles.length}`);

    const preservedRoles: RoleItem[] = [];
    targetRoles = [];

    for (const role of allRoles) {
      const roleName = String(role?.name || '');
      const baseRoleName = roleName.replace(/_(admin|user)(_role)?$/i, '');
      const item: RoleItem = { id: role.id, name: roleName, realmName: role.realmName };

      if (isRoleTargeted(roleName, baseRoleName)) {
        targetRoles.push(item);
      } else {
        if (/(_admin|_user)/i.test(roleName)) {
          preservedRoles.push(item);
        }
      }
    }

    const modeDescription = specificTargetRoles.length > 0
      ? `Specific roles filter: [${specificTargetRoles.join(', ')}]`
      : targetPrefix
        ? `Prefix filter: "${targetPrefix}"`
        : targetFilter
          ? `Keyword filter: "${targetFilter}"`
          : 'All orphaned _admin & _user roles (excluding protected processes & system roles)';

    await commonFunctions.logMessage(
      'INFO',
      `\n================ ROLE CLEANUP CONFIGURATION ================\n` +
      `Dry Run Mode:             ${isDryRun ? 'ENABLED (preview only, no deletion)' : 'DISABLED (deletions will execute)'}\n` +
      `Targeting Mode:           ${modeDescription}\n` +
      `Protected Processes:      ${allExcludedProcesses.length} processes\n` +
      `Protected System Roles:   ${protectedSystemRoles.size} roles\n` +
      `============================================================\n` +
      `Total IAM Roles:          ${allRoles.length}\n` +
      `Protected Roles Found:    ${preservedRoles.length}\n` +
      `Target Roles Identified:  ${targetRoles.length}\n` +
      `============================================================`
    );

    if (preservedRoles.length > 0) {
      await commonFunctions.logMessage(
        'INFO',
        `\n--- PROTECTED ROLES PRESERVED (${preservedRoles.length}) ---\n` +
        preservedRoles.map((r, idx) => `  ${idx + 1}. [ID: ${r.id}] ${r.name}`).join('\n')
      );
    }

    if (targetRoles.length > 0) {
      await commonFunctions.logMessage(
        'INFO',
        `\n--- TARGET ROLES IDENTIFIED FOR CLEANUP (${targetRoles.length}) ---\n` +
        targetRoles.map((r, idx) => `  ${idx + 1}. [ID: ${r.id}] ${r.name}`).join('\n')
      );
    } else {
      await commonFunctions.logMessage('INFO', 'No target roles identified for cleanup. Environment is clean.');
    }
  });

  test('Test Case 2: Unassign users and delete target roles', async () => {
    test.setTimeout(900000); // 15 minutes timeout

    if (targetRoles.length === 0) {
      await commonFunctions.logMessage('INFO', 'No target roles to delete. Skipping cleanup.');
      return;
    }

    if (isDryRun) {
      await commonFunctions.logMessage('INFO', `[DRY RUN] Would delete ${targetRoles.length} role(s):`);
      for (const role of targetRoles) {
        await commonFunctions.logMessage('INFO', `  [DRY RUN] Would unassign users and delete role: [ID: ${role.id}] ${role.name}`);
      }
      return;
    }

    await commonFunctions.logMessage('INFO', `Starting cleanup of ${targetRoles.length} target role(s)...`);

    let totalUsersUnassigned = 0;
    let totalRolesDeleted = 0;
    const failedUnassignments: { roleId: string | number; roleName: string; userId: string; status: number }[] = [];
    const failedRoleDeletions: { roleId: string | number; roleName: string; status: number }[] = [];

    for (let i = 0; i < targetRoles.length; i++) {
      const role = targetRoles[i];
      const roleId = String(role.id);
      const roleName = role.name;

      await commonFunctions.logMessage('INFO', `\n[${i + 1}/${targetRoles.length}] Processing role "${roleName}" (ID: ${roleId})`);

      // 1. Fetch assigned users (handle pagination)
      const assignedUserIds: string[] = [];
      let pageNumber = 1;
      let hasMoreUsers = true;

      while (hasMoreUsers) {
        const usersUrl = `${apiBaseUrl}/iam/realm/v1/roles/${roleId}/users?page-number=${pageNumber}&page-size=${PAGE_SIZE}`;
        const usersResponse = await apiUtil.processAPIRequest(
          'GET',
          usersUrl,
          null,
          headers,
          `Get assigned users for role ${roleName} (page ${pageNumber})`,
          'full'
        );

        const usersStatus = statusOf(usersResponse);
        if (usersStatus === 404) {
          break;
        }

        if (usersStatus !== 200) {
          await commonFunctions.logMessage('WARN', `Failed to fetch users for role ${roleId} (status: ${usersStatus})`);
          break;
        }

        const userEntities = extractEntities(usersResponse.data);
        for (const user of userEntities) {
          if (user?.id && !assignedUserIds.includes(user.id)) {
            assignedUserIds.push(user.id);
          }
        }

        const metaPage = usersResponse.data?.meta?.page;
        const isLastPage = metaPage?.lastPage ?? (userEntities.length < PAGE_SIZE);
        const totalPages = Number(metaPage?.pageCount || 0);

        hasMoreUsers = !isLastPage && (totalPages === 0 || pageNumber < totalPages);
        pageNumber += 1;
      }

      await commonFunctions.logMessage('INFO', `Found ${assignedUserIds.length} user(s) assigned to role "${roleName}"`);

      // 2. Unassign each assigned user
      for (const userId of assignedUserIds) {
        const unassignUrl = `${apiBaseUrl}/iam/realm/v1/roles/${roleId}/subjects/${userId}`;
        const unassignResponse = await apiUtil.processAPIRequest(
          'DELETE',
          unassignUrl,
          null,
          headers,
          `Unassign user ${userId} from role ${roleName}`,
          'full'
        );

        const unassignStatus = statusOf(unassignResponse);
        if (unassignStatus === 200 || unassignStatus === 204 || unassignStatus === 404) {
          totalUsersUnassigned += 1;
          await commonFunctions.logMessage('INFO', `Successfully unassigned user ${userId} from role "${roleName}"`);
        } else {
          failedUnassignments.push({ roleId, roleName, userId, status: unassignStatus });
          await commonFunctions.logMessage('FAIL', `Failed to unassign user ${userId} from role "${roleName}" (status: ${unassignStatus})`);
        }
      }

      // 3. Unassign machine subject if present
      const machineSubjectId = process.env.SUBJECT_ID;
      if (machineSubjectId && !assignedUserIds.includes(machineSubjectId)) {
        const unassignMachineUrl = `${apiBaseUrl}/iam/realm/v1/roles/${roleId}/subjects/${machineSubjectId}`;
        const unassignMachineRes = await apiUtil.processAPIRequest(
          'DELETE',
          unassignMachineUrl,
          null,
          headers,
          `Unassign machine subject from role ${roleName}`,
          'status'
        );
        const mStatus = statusOf(unassignMachineRes);
        if (mStatus === 200 || mStatus === 204) {
          totalUsersUnassigned += 1;
          await commonFunctions.logMessage('INFO', `Unassigned machine subject from role "${roleName}"`);
        }
      }

      // 4. Delete the role
      const deleteRoleUrl = `${apiBaseUrl}/iam/realm/v1/roles/${roleId}`;
      const deleteResponse = await apiUtil.processAPIRequest(
        'DELETE',
        deleteRoleUrl,
        null,
        headers,
        `Delete role ${roleName} (${roleId})`,
        'full'
      );

      const deleteStatus = statusOf(deleteResponse);
      if (deleteStatus === 200 || deleteStatus === 204 || deleteStatus === 404) {
        totalRolesDeleted += 1;
        await commonFunctions.logMessage('PASS', `Successfully deleted role "${roleName}" (ID: ${roleId})`);
      } else {
        failedRoleDeletions.push({ roleId, roleName, status: deleteStatus });
        await commonFunctions.logMessage('FAIL', `Failed to delete role "${roleName}" (ID: ${roleId}) (status: ${deleteStatus})`);
      }
    }

    // Final Summary
    await commonFunctions.logMessage(
      'INFO',
      `\n================ CLEANUP EXECUTION SUMMARY ================\n` +
      `Target Roles Processed:    ${targetRoles.length}\n` +
      `Total Users Unassigned:    ${totalUsersUnassigned}\n` +
      `Total Roles Deleted:       ${totalRolesDeleted}\n` +
      `Failed Unassignments:     ${failedUnassignments.length}\n` +
      `Failed Role Deletions:    ${failedRoleDeletions.length}\n` +
      `===========================================================`
    );

    expect(failedUnassignments.length).toBe(0);
    expect(failedRoleDeletions.length).toBe(0);
  });
});
