import { uniqueAlphanumericName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';

const Testdata = require('../../../testdata/' + process.env.PSENV + '/ProcessOrchestrationBackend/Migration/Test_002_ProcessMigration.json');

const sourceRealm = process.env.REALM_NAME_SOURCE || '';
const targetRealm = process.env.REALM_NAME_TARGET || '';
const isGraviteeGateway = (process.env.GATEWAY_TYPE || 'AZURE').toUpperCase() === 'GRAVITEE';
const sourceRealmTitle = isGraviteeGateway
  ? (process.env.REALM_KEY_SOURCE || process.env.REALM_KEY || sourceRealm)
  : sourceRealm;
const targetRealmTitle = isGraviteeGateway
  ? (process.env.REALM_KEY_TARGET || process.env.REALM_KEY || targetRealm)
  : targetRealm;
const sourceRealmId = process.env.REALM_ID_SOURCE || '';
const targetRealmId = process.env.REALM_ID_TARGET || '';
const sourceMachineClientId = process.env.REALM_CLIENT_ID_SOURCE || '';
const targetMachineClientId = process.env.REALM_CLIENT_ID_TARGET || '';
const sourceMachineClientSecret = process.env.REALM_CLIENT_SECRET_SOURCE || '';
const targetMachineClientSecret = process.env.REALM_CLIENT_SECRET_TARGET || '';
const sourceMachineSubjectId = isGraviteeGateway
  ? (process.env.REALM_MACHINE_SUBJECT_ID_SOURCE_GVT || '')
  : (process.env.REALM_MACHINE_SUBJECT_ID_SOURCE || '');
const targetMachineSubjectId = isGraviteeGateway
  ? (process.env.REALM_MACHINE_SUBJECT_ID_TARGET_GVT || '')
  : (process.env.REALM_MACHINE_SUBJECT_ID_TARGET || '');
const sourceUserId = isGraviteeGateway
  ? (Testdata.USER_ID_IN_SOURCE_REALM_GVT || Testdata.USER_ID_IN_SOURCE_REALM)
  : Testdata.USER_ID_IN_SOURCE_REALM;
const targetUserId = isGraviteeGateway
  ? (Testdata.USER_ID_IN_TARGET_REALM_GVT || Testdata.USER_ID_IN_TARGET_REALM)
  : Testdata.USER_ID_IN_TARGET_REALM;
const sourceAuthUrl = process.env.AUTH_URL_SOURCE || '';
const targetAuthUrl = process.env.AUTH_URL_TARGET || '';
const processName: string = uniqueAlphanumericName(Testdata.PAYLOAD.displayName || 'Process');
const sourceBaseUrl = process.env.API_BASE_URL_SOURCE as string;
const targetBaseUrl = process.env.API_BASE_URL_TARGET as string;

function buildUrl(baseUrl: string, endpoint: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
}

function getRolesUrl(baseUrl: string): string {
  const endpoint = (process.env.GET_PROCESS_ROLES as string || 'iam/realm/v1/roles');
  return buildUrl(baseUrl, endpoint);
}

function extractEntities(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.entities)) return payload.entities;
  if (Array.isArray(payload?.data?.entities)) return payload.data.entities;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function findProcessRole(roles: any[], namePrefix: string, suffix: 'admin' | 'user'): any | undefined {
  const normalizedPrefix = namePrefix.replace(/\s/g, '').toLowerCase();
  return roles.find((role: any) => {
    const roleName = String(role?.name || '').toLowerCase();
    return (
      roleName === `${normalizedPrefix}_${suffix}` ||
      roleName === `${normalizedPrefix}_${suffix}_role`
    );
  });
}

test.describe.serial('process migration', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
  let headersForTarget: Record<string, string>;
  let dataToImportInTarget: any;
  const subProcessName: string = uniqueAlphanumericName('testsubprocess');
  let adminRoleInSource: any;
  let adminRoleInTarget: any;
  let userRoleInSource: any;
  let userRoleInTarget: any;

  function getResponseStatus(response: any): unknown {
    return response && typeof response === 'object' && 'status' in response ? response.status : response;
  }

  async function validateCleanupStatus(response: any, allowedStatuses: number[], label: string): Promise<boolean> {
    const status = getResponseStatus(response);
    const valid = allowedStatuses.some((allowedStatus) => commonFunctions.isStatus(status, allowedStatus));
    return commonFunctions.compareTwoValues(valid, true, `${label} status assertion (actual: ${String(status)})`);
  }

  async function cleanupProcedureAndActor(baseUrl: string, requestHeaders: Record<string, string>, realmLabel: string): Promise<boolean> {
    const proceduresEndpoint = (process.env.GET_PROCEDURES as string || '').replace('limit=10', 'limit=500');
    const getProceduresUrl = buildUrl(baseUrl, proceduresEndpoint);
    const proceduresResponse = await apiUtil.processAPIRequest('GET', getProceduresUrl, null, requestHeaders, `Get procedures in ${realmLabel}`, 'full');
    const getProceduresValid = await validateCleanupStatus(proceduresResponse, [200], `Get procedures in ${realmLabel}`);
    if (!getProceduresValid) {
      return false;
    }

    const procedures = extractEntities(proceduresResponse.data);
    const normalizedProcessName = processName.replace(/\s/g, '').toLowerCase();
    const procedure = procedures.find((item: any) => String(item?.name || '').toLowerCase().includes(normalizedProcessName));
    if (!procedure) {
      await commonFunctions.logMessage('INFO', `${realmLabel} procedure for '${processName}' is already absent`);
      return true;
    }

    let cleanupSuccessful = true;
    if (procedure.name) {
      const deleteProcedureEndpoint = (process.env.DELETE_PROCEDURE as string || '').replace('{procedureName}', procedure.name);
      const deleteProcedureResponse = await apiUtil.processAPIRequest('DELETE', buildUrl(baseUrl, deleteProcedureEndpoint), null, requestHeaders, `Delete procedure in ${realmLabel}`, 'status');
      cleanupSuccessful = await validateCleanupStatus(deleteProcedureResponse, [200, 204, 404], `Delete procedure in ${realmLabel}`) && cleanupSuccessful;
    }

    const actorName = procedure.actorsConfig?.[0];
    if (actorName) {
      const deleteActorEndpoint = (process.env.DELETE_ACTOR as string || '').replace('{actorName}', actorName);
      const deleteActorResponse = await apiUtil.processAPIRequest('DELETE', buildUrl(baseUrl, deleteActorEndpoint), null, requestHeaders, `Delete actor in ${realmLabel}`, 'status');
      cleanupSuccessful = await validateCleanupStatus(deleteActorResponse, [200, 204, 404], `Delete actor in ${realmLabel}`) && cleanupSuccessful;
    }

    return cleanupSuccessful;
  }

  async function cleanupRoles(baseUrl: string, requestHeaders: Record<string, string>, realmName: string, userId: string, machineSubjectId: string, capturedAdminRole: any, capturedUserRole: any): Promise<boolean> {
    const rolesResponse = await apiUtil.processAPIRequest('GET', getRolesUrl(baseUrl), null, requestHeaders, `Get process roles in ${realmName}`, 'full');
    const getRolesValid = await validateCleanupStatus(rolesResponse, [200], `Get process roles in ${realmName}`);
    if (!getRolesValid) {
      return false;
    }

    const allRoles = extractEntities(rolesResponse.data);
    const normalizedName = processName.replace(/\s/g, '').toLowerCase();
    const targetRoles: any[] = allRoles.filter((candidate: any) => {
      const name = String(candidate?.name || '').toLowerCase();
      return (
        name === `${normalizedName}_admin` ||
        name === `${normalizedName}_user` ||
        name === `${normalizedName}_admin_role` ||
        name === `${normalizedName}_user_role`
      );
    });

    for (const captured of [capturedAdminRole, capturedUserRole]) {
      if (captured?.id && !targetRoles.some((r: any) => r.id === captured.id)) {
        targetRoles.push(captured);
      }
    }

    if (targetRoles.length === 0) {
      await commonFunctions.logMessage('INFO', `No process IAM roles found for '${processName}' in ${realmName}`);
      return true;
    }

    let rolesSuccessful = true;
    const unassignTemplate = (process.env.UNASSIGN_ROLE_TO_USER as string || 'iam/realm/v1/roles/{roleId}/subjects/{subjectId}').replace(/^\/+/, '');
    const deleteRoleTemplate = (process.env.DELETE_ROLE as string || 'iam/realm/v1/roles/{roleId}').replace(/^\/+/, '');

    for (const role of targetRoles) {
      const roleId = role?.id;
      const roleName = role?.name;
      if (!roleId) continue;

      // 1. Discover all users assigned to this role
      const usersEndpoint = `iam/realm/v1/roles/${roleId}/users?page-number=1&page-size=50`;
      const usersResponse = await apiUtil.processAPIRequest('GET', buildUrl(baseUrl, usersEndpoint), null, requestHeaders, `Get assigned users for role ${roleName} in ${realmName}`, 'full');
      const assignedUsers = extractEntities(usersResponse?.data);
      const assignedUserIds: string[] = assignedUsers
        .map((u: any) => u?.id || u?.userId || u?.subjectId)
        .filter(Boolean);

      await commonFunctions.logMessage('INFO', `Found ${assignedUserIds.length} user(s) assigned to role '${roleName}' in ${realmName}`);

      // 2. Unassign each discovered user
      for (const assignedId of assignedUserIds) {
        const unassignUrl = buildUrl(baseUrl, unassignTemplate.replace('{roleId}', roleId).replace('{subjectId}', assignedId));
        const unassignRes = await apiUtil.processAPIRequest('DELETE', unassignUrl, null, requestHeaders, `Unassign user ${assignedId} from role ${roleName} in ${realmName}`, 'status');
        const unassignOk = await validateCleanupStatus(unassignRes, [200, 204, 404], `Unassign user ${assignedId} from role ${roleName} in ${realmName}`);
        rolesSuccessful = unassignOk && rolesSuccessful;
      }

      // 3. Unassign known candidate subjects (test user and machine subject) if not already unassigned
      const candidateSubjects = [userId, machineSubjectId].filter(Boolean);
      for (const subjectId of candidateSubjects) {
        if (!assignedUserIds.includes(subjectId)) {
          const unassignCandidateUrl = buildUrl(baseUrl, unassignTemplate.replace('{roleId}', roleId).replace('{subjectId}', subjectId));
          const unassignRes = await apiUtil.processAPIRequest('DELETE', unassignCandidateUrl, null, requestHeaders, `Unassign candidate subject ${subjectId} from role ${roleName} in ${realmName}`, 'status');
          await validateCleanupStatus(unassignRes, [200, 204, 404, 400], `Unassign candidate subject from role ${roleName} in ${realmName}`);
        }
      }

      // 4. Delete the role now that all subjects are unassigned
      const deleteRoleUrl = buildUrl(baseUrl, deleteRoleTemplate.replace('{roleId}', roleId));
      let deleteRes = await apiUtil.processAPIRequest('DELETE', deleteRoleUrl, null, requestHeaders, `Delete role ${roleName} in ${realmName}`, 'status');
      if (getResponseStatus(deleteRes) === 409) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        deleteRes = await apiUtil.processAPIRequest('DELETE', deleteRoleUrl, null, requestHeaders, `Retry delete role ${roleName} in ${realmName}`, 'status');
      }
      const deleteOk = await validateCleanupStatus(deleteRes, [200, 204, 404], `Delete role ${roleName} in ${realmName}`);
      rolesSuccessful = deleteOk && rolesSuccessful;
    }

    return rolesSuccessful;
  }

  async function cleanupRealm(baseUrl: string, requestHeaders: Record<string, string>, realmName: string, userId: string, machineSubjectId: string, capturedAdminRole: any, capturedUserRole: any): Promise<boolean> {
    // 0. Delete process model if configured
    const modelEntity = (process.env.GET_PROCESSMODEL_ENTITY as string || '').replace(/^\/+/, '');
    if (modelEntity) {
      const modelUrl = `${baseUrl.replace(/\/+$/, '')}/${modelEntity}${encodeURIComponent(processName.replace(/\s/g, ''))}`;
      const deleteModelRes = await apiUtil.processAPIRequest('DELETE', modelUrl, null, requestHeaders, `Delete process model in ${realmName}`, 'status');
      await validateCleanupStatus(deleteModelRes, [200, 204, 401, 404, 400], `Delete process model in ${realmName}`);
    }

    // 1. Delete subprocess first if it exists
    const deleteSubprocessEndpoint = (process.env.CREATE_SUBPROCESS as string || 'cbp/interop/ibp/process-orchestration/v1/process/{processName}/subprocess')
      .replace('{processName}', encodeURIComponent(processName)) + `/${encodeURIComponent(subProcessName)}`;
    const deleteSubprocessUrl = buildUrl(baseUrl, deleteSubprocessEndpoint);
    const deleteSubprocessResponse = await apiUtil.processAPIRequest('DELETE', deleteSubprocessUrl, null, requestHeaders, `Delete subprocess in ${realmName}`, 'status');
    await validateCleanupStatus(deleteSubprocessResponse, [200, 204, 401, 404], `Delete subprocess in ${realmName}`);

    // 2. Delete parent process
    const deleteProcessEndpoint = (process.env.DELETE_PROCESS as string || 'cbp/interop/ibp/process-orchestration/v1/process/{processName}')
      .replace('{processName}', encodeURIComponent(processName));
    const deleteProcessUrl = buildUrl(baseUrl, deleteProcessEndpoint);
    const deleteProcessResponse = await apiUtil.processAPIRequest('DELETE', deleteProcessUrl, null, requestHeaders, `Delete process in ${realmName}`, 'status');
    const processDeleted = await validateCleanupStatus(deleteProcessResponse, [200, 204, 401, 404], `Delete process in ${realmName}`);

    // 3. Clean up procedure & actor
    const procedureAndActorDeleted = await cleanupProcedureAndActor(baseUrl, requestHeaders, realmName);

    // 4. Clean up IAM roles (unassign all users + delete roles)
    const rolesDeleted = await cleanupRoles(baseUrl, requestHeaders, realmName, userId, machineSubjectId, capturedAdminRole, capturedUserRole);

    return processDeleted && procedureAndActorDeleted && rolesDeleted;
  }

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    headers = await apiUtil.buildAuthHeaders(sourceMachineClientId, sourceMachineClientSecret, sourceRealmId, sourceAuthUrl);
    headersForTarget = await apiUtil.buildAuthHeaders(targetMachineClientId, targetMachineClientSecret, targetRealmId, targetAuthUrl);
  });

  test.afterAll(async () => {
    if (!headers || !headersForTarget) {
      return;
    }
    await commonFunctions.logMessage('INFO', 'Running process migration cleanup in source and target realms');
    const cleanupResults = await Promise.allSettled([
      cleanupRealm(sourceBaseUrl, headers, sourceRealm, sourceUserId, sourceMachineSubjectId, adminRoleInSource, userRoleInSource),
      cleanupRealm(targetBaseUrl, headersForTarget, targetRealm, targetUserId, targetMachineSubjectId, adminRoleInTarget, userRoleInTarget)
    ]);

    let cleanupSuccessful = true;
    for (const [index, result] of cleanupResults.entries()) {
      const realmLabel = index === 0 ? sourceRealm : targetRealm;
      if (result.status === 'rejected') {
        const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
        await commonFunctions.logMessage('ERROR', `${realmLabel} process cleanup failed: ${message}`);
        cleanupSuccessful = false;
      } else {
        cleanupSuccessful = cleanupSuccessful && result.value;
      }
    }
    expect(cleanupSuccessful, 'Process migration cleanup should succeed in source and target realms').toBeTruthy();
  });

  test(`Test Case 1: Create process in source realm: ${sourceRealmTitle}`, async () => {
    const url: string = buildUrl(sourceBaseUrl, process.env.CREATE_PROCESS_WITH_TEMPLATE as string);
    const createProcessStatus = await apiUtil.processAPIRequest('POST', url, { ...Testdata.PAYLOAD, displayName: processName }, headers, 'creating process', 'status');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(createProcessStatus, 201, 'Create process success assertion');

    const rolesResponse = await apiUtil.processAPIRequest('GET', getRolesUrl(sourceBaseUrl), null, headers, 'Get process roles', 'full');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(rolesResponse.status, 200, 'Get process roles success assertion');

    const sourceRoles = extractEntities(rolesResponse.data);
    adminRoleInSource = findProcessRole(sourceRoles, processName, 'admin');
    userRoleInSource = findProcessRole(sourceRoles, processName, 'user');

    const assignEndpoint = (process.env.ASSIGN_ROLE_TO_USER as string || 'iam/realm/v1/roles/{roleId}/subjects').replace('{roleId}', adminRoleInSource?.id);
    const assignRoleToUserUrl: string = buildUrl(sourceBaseUrl, assignEndpoint);
    const assignRoleResponse = await apiUtil.processAPIRequest('POST', assignRoleToUserUrl, { id: sourceUserId }, headers, 'Assign role to user', 'status');
    const bValidation3: boolean = await commonFunctions.compareTwoValues(assignRoleResponse, 200, 'Assign role to user success assertion');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test(`Test Case 2: Verify created process reflected in source realm: ${sourceRealmTitle}`, async () => {
    const getProcessEndpoint = (process.env.GET_PROCESS_WITH_NAME as string || 'cbp/interop/ibp/process-orchestration/v1/process') + '/' + encodeURIComponent(processName);
    const getProcessUrl: string = buildUrl(sourceBaseUrl, getProcessEndpoint);
    const getProcessName = await apiUtil.processAPIRequest('GET', getProcessUrl, null, headers, 'Get process with Name', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(getProcessName.status, 200, 'Get process with Name success response assertion');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(getProcessName.data?.name, processName, 'Process Name assertion');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test(`Test Case 3: Export process from source realm ${sourceRealmTitle}`, async () => {
    const url: string = buildUrl(sourceBaseUrl, process.env.EXPORT_DATA as string);
    const exportDataPayload = { processes: [processName] };
    const exportProcessResponse = await apiUtil.processAPIRequest('POST', url, exportDataPayload, headers, 'Export process', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(exportProcessResponse.status, 200, 'Export process success assertion');
    dataToImportInTarget = exportProcessResponse.data;

    expect(bValidation1).toBeTruthy();
  });

  test(`Test Case 4: Import process  to target realm ${targetRealmTitle}`, async () => {
    const url: string = buildUrl(targetBaseUrl, process.env.IMPORT_DATA as string);
    const importProcessResponse = await apiUtil.processAPIRequest('POST', url, dataToImportInTarget, headersForTarget, 'Import process', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(importProcessResponse.status, 200, `Import process success assertion in target realm:  ${targetRealm}`);
    const bValidation2: boolean = await commonFunctions.compareTwoValues(importProcessResponse.data?.processes?.[0], processName, `Import process response assertion in target realm:  ${targetRealm}`);

    const rolesResponse = await apiUtil.processAPIRequest('GET', getRolesUrl(targetBaseUrl), null, headersForTarget, 'Get process roles', 'full');
    const bValidation3: boolean = await commonFunctions.compareTwoValues(rolesResponse.status, 200, 'Get process roles success assertion');
    const targetRoles = extractEntities(rolesResponse.data);
    adminRoleInTarget = findProcessRole(targetRoles, processName, 'admin');
    userRoleInTarget = findProcessRole(targetRoles, processName, 'user');

    const assignEndpoint = (process.env.ASSIGN_ROLE_TO_USER as string || 'iam/realm/v1/roles/{roleId}/subjects').replace('{roleId}', adminRoleInTarget?.id);
    const assignRoleToUserUrl: string = buildUrl(targetBaseUrl, assignEndpoint);
    const assignRoleResponse = await apiUtil.processAPIRequest('POST', assignRoleToUserUrl, { id: targetUserId }, headersForTarget, 'Assign role to user', 'status');
    const bValidation4: boolean = await commonFunctions.compareTwoValues(assignRoleResponse, 200, 'Assign role to user success assertion');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test(`Test Case 5: Verify imported process reflected in target realm: ${targetRealmTitle}`, async () => {
    const getProcessEndpoint = (process.env.GET_PROCESS_WITH_NAME as string || 'cbp/interop/ibp/process-orchestration/v1/process') + '/' + encodeURIComponent(processName);
    const getProcessUrl: string = buildUrl(targetBaseUrl, getProcessEndpoint);
    const getProcessName = await apiUtil.processAPIRequest('GET', getProcessUrl, null, headersForTarget, 'Get process with Name', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(getProcessName.status, 200, 'Get process with Name success response assertion');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(getProcessName.data?.name, processName, 'Process Name assertion');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test(`Test Case 6: add subprocess in source realm: ${sourceRealmTitle}`, async () => {
    const subprocessPayload = {
      attributes: [],
      startOffsetReference: 'START',
      startOffset: 0,
      duration: 1,
      displayName: subProcessName,
      referenceNodeName: processName,
      description: 'This subprocess is used for testing of process migration',
      transition: { reference: 'START', referenceNodeNames: [processName] },
      parentNodeName: processName
    };
    const subprocessEndpoint = (process.env.CREATE_SUBPROCESS as string || 'cbp/interop/ibp/process-orchestration/v1/process/{processName}/subprocess')
      .replace('{processName}', encodeURIComponent(processName));
    const url: string = buildUrl(sourceBaseUrl, subprocessEndpoint);
    const createSubprocessStatus = await apiUtil.processAPIRequest('POST', url, subprocessPayload, headers, 'Update process API', 'status');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(createSubprocessStatus, 201, 'Create subprocess success assertion in source realm ' + sourceRealm);

    expect(bValidation1).toBeTruthy();
  });

  test(`Test Case 7: Verify created subprocess reflected in source realm: ${sourceRealmTitle}`, async () => {
    const getProcessEndpoint = (process.env.GET_PROCESS_WITH_NAME as string || 'cbp/interop/ibp/process-orchestration/v1/process') + '/' + encodeURIComponent(processName);
    const getProcessUrl: string = buildUrl(sourceBaseUrl, getProcessEndpoint);
    const getProcessName = await apiUtil.processAPIRequest('GET', getProcessUrl, null, headers, 'Get process with Name', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(getProcessName.status, 200, 'Get process with Name success response assertion');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(getProcessName.data?.name, processName, 'Process Name assertion');

    const getSubProcessEndpoint = (process.env.CREATE_SUBPROCESS as string || 'cbp/interop/ibp/process-orchestration/v1/process/{processName}/subprocess')
      .replace('{processName}', encodeURIComponent(processName)) + '/' + encodeURIComponent(subProcessName);
    const getSubProcessUrl: string = buildUrl(sourceBaseUrl, getSubProcessEndpoint);
    const getSubProcessName = await apiUtil.processAPIRequest('GET', getSubProcessUrl, null, headers, 'Get subprocess with Name', 'full');
    const bValidation3: boolean = await commonFunctions.compareTwoValues(getSubProcessName.status, 200, 'Get subprocess with Name success response assertion');
    const bValidation4: boolean = await commonFunctions.compareTwoValues(getSubProcessName.data?.name, subProcessName, 'Subprocess Name assertion');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test(`Test Case 8: Export process from source realm ${sourceRealmTitle}`, async () => {
    const url: string = buildUrl(sourceBaseUrl, process.env.EXPORT_DATA as string);
    const exportDataPayload = { processes: [processName] };
    const exportProcessResponse = await apiUtil.processAPIRequest('POST', url, exportDataPayload, headers, 'Export process', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(exportProcessResponse.status, 200, 'Export process success assertion');
    dataToImportInTarget = exportProcessResponse.data;

    expect(bValidation1).toBeTruthy();
  });

  test(`Test Case 9: Import process  to target realm ${targetRealmTitle}`, async () => {
    const url: string = buildUrl(targetBaseUrl, process.env.IMPORT_DATA as string);
    const importProcessResponse = await apiUtil.processAPIRequest('POST', url, dataToImportInTarget, headersForTarget, 'Import process', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(importProcessResponse.status, 200, `Import process success assertion in target realm:  ${targetRealm}`);
    const bValidation2: boolean = await commonFunctions.compareTwoValues(importProcessResponse.data?.processes?.[0], processName, `Import process response assertion in target realm:  ${targetRealm}`);

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test(`Test Case 10: Verify created subprocess reflected in target realm: ${targetRealmTitle}`, async () => {
    const getProcessEndpoint = (process.env.GET_PROCESS_WITH_NAME as string || 'cbp/interop/ibp/process-orchestration/v1/process') + '/' + encodeURIComponent(processName);
    const getProcessUrl: string = buildUrl(targetBaseUrl, getProcessEndpoint);
    const getProcessName = await apiUtil.processAPIRequest('GET', getProcessUrl, null, headersForTarget, 'Get process with Name', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(getProcessName.status, 200, 'Get process with Name success response assertion');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(getProcessName.data?.name, processName, 'Process Name assertion');

    const getSubProcessEndpoint = (process.env.CREATE_SUBPROCESS as string || 'cbp/interop/ibp/process-orchestration/v1/process/{processName}/subprocess')
      .replace('{processName}', encodeURIComponent(processName)) + '/' + encodeURIComponent(subProcessName);
    const getSubProcessUrl: string = buildUrl(targetBaseUrl, getSubProcessEndpoint);
    const getSubProcessName = await apiUtil.processAPIRequest('GET', getSubProcessUrl, null, headersForTarget, 'Get subprocess with Name', 'full');
    const bValidation3: boolean = await commonFunctions.compareTwoValues(getSubProcessName.status, 200, 'Get subprocess with Name success response assertion');
    const bValidation4: boolean = await commonFunctions.compareTwoValues(getSubProcessName.data?.name, subProcessName, 'Subprocess Name assertion');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

});