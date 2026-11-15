import ApiUtil from "../../../util/api.util";
import CommonFunctions from "../../../util/common.util";
const Testdata = require(`../../../Testdata/${process.env.PSENV}/ProcessOrchestrationBackend/Migration/Test_002_ProcessMigration.json`);

const sourceRealm = process.env.REALM_NAME_SOURCE || '';
const targetRealm = process.env.REALM_NAME_TARGET || '';
const sourceRealmId = process.env.REALM_ID_SOURCE || '';
const targetRealmId = process.env.REALM_ID_TARGET || '';
const sourceMachineClientId = process.env.REALM_CLIENT_ID_SOURCE || '';
const targetMachineClientId = process.env.REALM_CLIENT_ID_TARGET || '';
const sourceMachineClientSecret = process.env.REALM_CLIENT_SECRET_SOURCE || '';
const targetMachineClientSecret = process.env.REALM_CLIENT_SECRET_TARGET || '';
const sourceMachineSubjectId = process.env.REALM_MACHINE_SUBJECT_ID_SOURCE || '';
const targetMachineSubjectId = process.env.REALM_MACHINE_SUBJECT_ID_TARGET || '';
const random = Math.floor(1000 + Math.random() * 9000)
const processName: string = Testdata.PAYLOAD.displayName + random || '';
const rolesUrl: string = process.env.API_BASE_URL as string + process.env.GET_PROCESS_ROLES as string;
let accessToken: string, accessTokenForTarget: string, headers: Record<string, string>, headersForTarget: Record<string, string>, dataToImportInTarget: any;
let subProcessName: string = "testsubprocess" + random;
let adminRoleInSource, adminRoleInTarget, userRoleInSource, userRoleInTarget;


describe(`process migration`, () => {
  before(async () => {
    accessToken = await ApiUtil.getBearerToken(undefined, sourceMachineClientId, sourceMachineClientSecret, undefined, sourceRealmId);
    headers = {
      "accept": "application/json",
      "Authorization": "Bearer " + accessToken
    };
    accessTokenForTarget = await ApiUtil.getBearerToken(undefined, targetMachineClientId, targetMachineClientSecret, undefined, targetRealmId);
    headersForTarget = {
      "accept": "application/json",
      "Authorization": "Bearer " + accessTokenForTarget
    };
  });

  it(`Test Case 1: Create process in source realm: ${sourceRealm}`, async () => {
    const url: string = process.env.API_BASE_URL as string + process.env.CREATE_PROCESS_WITH_TEMPLATE as string;
    const createProcessStatus = await ApiUtil.processAPIRequest("POST", url, { ...Testdata.PAYLOAD, displayName: processName }, headers, "creating process", "status");
    const bValidation1: boolean = await CommonFunctions.compareTwoValues(createProcessStatus, 201, "Create process success assertion");

    const rolesResponse = await ApiUtil.processAPIRequest("GET", rolesUrl, null, headers, "Get process roles", "full");
    const bValidation2: boolean = await CommonFunctions.compareTwoValues(rolesResponse.status, 200, "Get process roles success assertion");

    adminRoleInSource = rolesResponse.data.find((role: any) => role.realmName === sourceRealm && role.name === `${processName.toLowerCase()}_admin`);
    userRoleInSource = rolesResponse.data.find((role: any) => role.realmName === sourceRealm && role.name === `${processName.toLowerCase()}_user`);

    const assignRoleToUserUrl: string = process.env.API_BASE_URL as string + (process.env.ASSIGN_ROLE_TO_USER as string).replace("{roleId}", adminRoleInSource?.id);
    const assignRoleResponse = await ApiUtil.processAPIRequest("POST", assignRoleToUserUrl, { "id": Testdata.USER_ID_IN_SOURCE_REALM }, headers, "Assign role to user", "status");
    const bValidation3: boolean = await CommonFunctions.compareTwoValues(assignRoleResponse, 200, "Assign role to user success assertion");

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  it(`Test Case 2: Verify created process reflected in source realm: ${sourceRealm}`, async () => {
    const getProcessUrl: string = process.env.API_BASE_URL as string + process.env.GET_PROCESS_WITH_NAME as string;
    const getProcessName = await ApiUtil.processAPIRequest("GET", getProcessUrl + "/" + processName, null, headers, "Get process with Name", "full");
    const bValidation1: boolean = await CommonFunctions.compareTwoValues(getProcessName.status, 200, "Get process with Name success response assertion");
    const bValidation2: boolean = await CommonFunctions.compareTwoValues(getProcessName.data.name, processName, "Process Name assertion");
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  it(`Test Case 3: Export process from source realm ${sourceRealm}`, async () => {
    const url: string = process.env.API_BASE_URL as string + process.env.EXPORT_DATA as string;
    const exportDataPayload = { "processes": [processName] }
    const exportProcessResponse = await ApiUtil.processAPIRequest("POST", url, exportDataPayload, headers, "Export process", "full");
    const bValidation1: boolean = await CommonFunctions.compareTwoValues(exportProcessResponse.status, 200, "Export process success assertion");
    dataToImportInTarget = exportProcessResponse.data;
    expect(bValidation1).toBeTruthy();
  });

  it(`Test Case 4: Import process  to target realm ${targetRealm}`, async () => {
    const url: string = process.env.API_BASE_URL as string + process.env.IMPORT_DATA as string;
    const importProcessResponse = await ApiUtil.processAPIRequest("POST", url, dataToImportInTarget, headersForTarget, "Import process", "full");
    const bValidation1: boolean = await CommonFunctions.compareTwoValues(importProcessResponse.status, 200, `Import process success assertion in target realm:  ${targetRealm}`);
    const bValidation2: boolean = await CommonFunctions.compareTwoValues(importProcessResponse.data.processes[0], processName, `Import process response assertion in target realm:  ${targetRealm}`);

    const rolesResponse = await ApiUtil.processAPIRequest("GET", rolesUrl, null, headersForTarget, "Get process roles", "full");
    const bValidation3: boolean = await CommonFunctions.compareTwoValues(rolesResponse.status, 200, "Get process roles success assertion");
    adminRoleInTarget = rolesResponse.data.find((role: any) => role.realmName === targetRealm && role.name === `${processName.toLowerCase()}_admin`);
    userRoleInTarget = rolesResponse.data.find((role: any) => role.realmName === targetRealm && role.name === `${processName.toLowerCase()}_user`);

    const assignRoleToUserUrl: string = process.env.API_BASE_URL as string + (process.env.ASSIGN_ROLE_TO_USER as string).replace("{roleId}", adminRoleInTarget?.id);
    const assignRoleResponse = await ApiUtil.processAPIRequest("POST", assignRoleToUserUrl, { "id": Testdata.USER_ID_IN_TARGET_REALM }, headersForTarget, "Assign role to user", "status");
    const bValidation4: boolean = await CommonFunctions.compareTwoValues(assignRoleResponse, 200, "Assign role to user success assertion");
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  it(`Test Case 5: Verify imported process reflected in target realm: ${targetRealm}`, async () => {
    const getProcessUrl: string = process.env.API_BASE_URL as string + process.env.GET_PROCESS_WITH_NAME as string;
    const getProcessName = await ApiUtil.processAPIRequest("GET", getProcessUrl + "/" + processName, null, headersForTarget, "Get process with Name", "full");
    const bValidation1: boolean = await CommonFunctions.compareTwoValues(getProcessName.status, 200, "Get process with Name success response assertion");
    const bValidation2: boolean = await CommonFunctions.compareTwoValues(getProcessName.data.name, processName, "Process Name assertion");
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  it(`Test Case 6: add subprocess in ${processName} in source realm: ${sourceRealm}`, async () => {
    const subprocessPayload = { "attributes": [], "startOffsetReference": "START", "startOffset": 0, "duration": 1, "displayName": subProcessName, "referenceNodeName": processName, "description": "This subprocess is used for testing of process migration", "transition": { "reference": "START", "referenceNodeNames": [processName] }, "parentNodeName": processName }
    const url: string = process.env.API_BASE_URL as string + (process.env.CREATE_SUBPROCESS as string).replace("{processName}", processName);
    const createSubprocessStatus = await ApiUtil.processAPIRequest("POST", url, subprocessPayload, headers, "Update process API", "status");
    const bValidation1: boolean = await CommonFunctions.compareTwoValues(createSubprocessStatus, 201, "Create subprocess success assertion in source realm " + sourceRealm);
    expect(bValidation1).toBeTruthy();
  });

  it(`Test Case 7: Verify created subprocess reflected in source realm: ${sourceRealm}`, async () => {
    const getProcessUrl: string = process.env.API_BASE_URL as string + process.env.GET_PROCESS_WITH_NAME as string;
    const getProcessName = await ApiUtil.processAPIRequest("GET", getProcessUrl + "/" + processName, null, headers, "Get process with Name", "full");
    const bValidation1: boolean = await CommonFunctions.compareTwoValues(getProcessName.status, 200, "Get process with Name success response assertion");
    const bValidation2: boolean = await CommonFunctions.compareTwoValues(getProcessName.data.name, processName, "Process Name assertion");
    const getSubProcessUrl: string = process.env.API_BASE_URL as string + (process.env.CREATE_SUBPROCESS as string).replace("{processName}", processName);
    const getSubProcessName = await ApiUtil.processAPIRequest("GET", getSubProcessUrl + "/" + subProcessName, null, headers, "Get subprocess with Name", "full");
    const bValidation3: boolean = await CommonFunctions.compareTwoValues(getSubProcessName.status, 200, "Get subprocess with Name success response assertion");
    const bValidation4: boolean = await CommonFunctions.compareTwoValues(getSubProcessName.data.name, subProcessName, "Subprocess Name assertion");
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  it(`Test Case 8: Export process from source realm ${sourceRealm}`, async () => {
    const url: string = process.env.API_BASE_URL as string + process.env.EXPORT_DATA as string;
    const exportDataPayload = { "processes": [processName] }
    const exportProcessResponse = await ApiUtil.processAPIRequest("POST", url, exportDataPayload, headers, "Export process", "full");
    const bValidation1: boolean = await CommonFunctions.compareTwoValues(exportProcessResponse.status, 200, "Export process success assertion");
    dataToImportInTarget = exportProcessResponse.data;
    expect(bValidation1).toBeTruthy();
  });

  it(`Test Case 9: Import process  to target realm ${targetRealm}`, async () => {
    const url: string = process.env.API_BASE_URL as string + process.env.IMPORT_DATA as string;
    const importProcessResponse = await ApiUtil.processAPIRequest("POST", url, dataToImportInTarget, headersForTarget, "Import process", "full");
    const bValidation1: boolean = await CommonFunctions.compareTwoValues(importProcessResponse.status, 200, `Import process success assertion in target realm:  ${targetRealm}`);
    const bValidation2: boolean = await CommonFunctions.compareTwoValues(importProcessResponse.data.processes[0], processName, `Import process response assertion in target realm:  ${targetRealm}`);
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  it(`Test Case 10: Verify created subprocess reflected in target realm: ${targetRealm}`, async () => {
    const getProcessUrl: string = process.env.API_BASE_URL as string + process.env.GET_PROCESS_WITH_NAME as string;
    const getProcessName = await ApiUtil.processAPIRequest("GET", getProcessUrl + "/" + processName, null, headersForTarget, "Get process with Name", "full");
    const bValidation1: boolean = await CommonFunctions.compareTwoValues(getProcessName.status, 200, "Get process with Name success response assertion");
    const bValidation2: boolean = await CommonFunctions.compareTwoValues(getProcessName.data.name, processName, "Process Name assertion");
    const getSubProcessUrl: string = process.env.API_BASE_URL as string + (process.env.CREATE_SUBPROCESS as string).replace("{processName}", processName);
    const getSubProcessName = await ApiUtil.processAPIRequest("GET", getSubProcessUrl + "/" + subProcessName, null, headersForTarget, "Get subprocess with Name", "full");
    const bValidation3: boolean = await CommonFunctions.compareTwoValues(getSubProcessName.status, 200, "Get subprocess with Name success response assertion");
    const bValidation4: boolean = await CommonFunctions.compareTwoValues(getSubProcessName.data.name, subProcessName, "Subprocess Name assertion");
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  it(`Test Case 11: Delete process  from source realm: ${sourceRealm} & target realm: ${targetRealm}`, async () => {
    const url: string = process.env.API_BASE_URL as string + (process.env.DELETE_PROCESS as string).replace("{processName}", processName);
    const unassignRoleToUserInSourceUrl: string = process.env.API_BASE_URL as string + (process.env.UNASSIGN_ROLE_TO_USER as string).replace("{roleId}", adminRoleInSource?.id).replace("{subjectId}", Testdata.USER_ID_IN_SOURCE_REALM);
    const getProceduresUrl: string = process.env.API_BASE_URL as string + process.env.GET_PROCEDURES as string;
    const deleteProcessStatusInSource = await ApiUtil.processAPIRequest("DELETE", url, null, headers, "Delete process API", "status");
    const bValidation1: boolean = await CommonFunctions.compareTwoValues(deleteProcessStatusInSource, 200, "Delete process success assertion in source realm " + sourceRealm);
    try {
      const getProceduresResponseInSource = await ApiUtil.processAPIRequest("GET", getProceduresUrl, null, headers, "Get procedures", "full");
      await CommonFunctions.compareTwoValues(getProceduresResponseInSource.status, 200, "Get procedures success assertion in target realm " + targetRealm);
      const procedureInSource = getProceduresResponseInSource.data.data.entities.find((procedure: any) => procedure.name.includes(processName));
      const actorConfigNameForSource = procedureInSource?.actorsConfig[0];
      const procedureNameInSource = procedureInSource?.name;
      const deleteProcedureUrlInSource: string = process.env.API_BASE_URL as string + (process.env.DELETE_PROCEDURE as string).replace("{procedureName}", procedureNameInSource);
      const deleteProcedureResponseInSource = await ApiUtil.processAPIRequest("DELETE", deleteProcedureUrlInSource, null, headers, "Delete procedure in source realm", "status");
      await CommonFunctions.compareTwoValues(deleteProcedureResponseInSource, 200, "Delete procedure success assertion in source realm " + sourceRealm);
      const deleteActorUrlInSource: string = process.env.API_BASE_URL as string + (process.env.DELETE_ACTOR as string).replace("{actorName}", actorConfigNameForSource);
      const deleteActorResponseInSource = await ApiUtil.processAPIRequest("DELETE", deleteActorUrlInSource, null, headers, "Delete actor in source realm", "status");
      await CommonFunctions.compareTwoValues(deleteActorResponseInSource, 200, "Delete actor success assertion in source realm " + sourceRealm);
    }
    catch (error) {
      await CommonFunctions.logMessage('ERROR', 'Error in fetching/deleting procedure/actor in source realm: ' + error);
    }
    const unassignRoleResponseInSource = await ApiUtil.processAPIRequest("DELETE", unassignRoleToUserInSourceUrl, null, headers, "Unassign role to user in source realm", "status");
    const bValidation5: boolean = await CommonFunctions.compareTwoValues(unassignRoleResponseInSource, 204, "Unassign role to user success assertion in source realm " + sourceRealm);
    const unassignAdminRoleToMachineInSourceUrl: string = process.env.API_BASE_URL as string + (process.env.UNASSIGN_ROLE_TO_USER as string).replace("{roleId}", adminRoleInSource?.id).replace("{subjectId}", sourceMachineSubjectId);
    const unassignAdminRoleToMachineResponseInSource = await ApiUtil.processAPIRequest("DELETE", unassignAdminRoleToMachineInSourceUrl, null, headers, "Unassign admin role to machine in source realm", "status");
    const bValidation6: boolean = await CommonFunctions.compareTwoValues(unassignAdminRoleToMachineResponseInSource, 204, "Unassign admin role to machine success assertion in source realm " + sourceRealm);
    const unassignUserRoleToMachineInSourceUrl: string = process.env.API_BASE_URL as string + (process.env.UNASSIGN_ROLE_TO_USER as string).replace("{roleId}", userRoleInSource?.id).replace("{subjectId}", sourceMachineSubjectId);
    const unassignUserRoleToMachineResponseInSource = await ApiUtil.processAPIRequest("DELETE", unassignUserRoleToMachineInSourceUrl, null, headers, "Unassign user role to machine in target realm", "status");
    const bValidation7: boolean = await CommonFunctions.compareTwoValues(unassignUserRoleToMachineResponseInSource, 204, "Unassign user role to machine success assertion in target realm " + sourceRealm);
    const deleteUserRoleInSourceUrl: string = process.env.API_BASE_URL as string + (process.env.DELETE_ROLE as string).replace("{roleId}", userRoleInSource?.id);
    const deleteUserRoleResponseInSource = await ApiUtil.processAPIRequest("DELETE", deleteUserRoleInSourceUrl, null, headers, "Delete user role in source realm", "status");
    const bValidation8: boolean = await CommonFunctions.compareTwoValues(deleteUserRoleResponseInSource, 204, "Delete user role success assertion in source realm " + sourceRealm);
    const deleteAdminRoleInSourceUrl: string = process.env.API_BASE_URL as string + (process.env.DELETE_ROLE as string).replace("{roleId}", adminRoleInSource?.id);
    const deleteAdminRoleResponseInSource = await ApiUtil.processAPIRequest("DELETE", deleteAdminRoleInSourceUrl, null, headers, "Delete admin role in source realm", "status");
    const bValidation9: boolean = await CommonFunctions.compareTwoValues(deleteAdminRoleResponseInSource, 204, "Delete admin role success assertion in source realm " + sourceRealm);
    const deleteProcessStatusInTarget = await ApiUtil.processAPIRequest("DELETE", url, null, headersForTarget, "Delete process API", "status");
    const bValidation10: boolean = await CommonFunctions.compareTwoValues(deleteProcessStatusInTarget, 200, "Delete process assertion in target realm " + targetRealm);
    try {
      const getProceduresResponseInTarget = await ApiUtil.processAPIRequest("GET", getProceduresUrl, null, headersForTarget, "Get procedures", "full");
      await CommonFunctions.compareTwoValues(getProceduresResponseInTarget.status, 200, "Get procedures success assertion in target realm " + targetRealm);
      const procedureInTarget = getProceduresResponseInTarget.data.data.entities.find((procedure: any) => procedure.name.includes(processName));
      const actorConfigNameForTarget = procedureInTarget?.actorsConfig[0];
      const procedureNameInTarget = procedureInTarget?.name;
      const deleteProcedureUrlInTarget: string = process.env.API_BASE_URL as string + (process.env.DELETE_PROCEDURE as string).replace("{procedureName}", procedureNameInTarget);
      const deleteProcedureResponseInTarget = await ApiUtil.processAPIRequest("DELETE", deleteProcedureUrlInTarget, null, headersForTarget, "Delete procedure in target realm", "status");
      await CommonFunctions.compareTwoValues(deleteProcedureResponseInTarget, 200, "Delete procedure success assertion in target realm " + targetRealm);
      const deleteActorUrlInTarget: string = process.env.API_BASE_URL as string + (process.env.DELETE_ACTOR as string).replace("{actorName}", actorConfigNameForTarget);
      const deleteActorResponseInTarget = await ApiUtil.processAPIRequest("DELETE", deleteActorUrlInTarget, null, headersForTarget, "Delete actor in target realm", "status");
      await CommonFunctions.compareTwoValues(deleteActorResponseInTarget, 200, "Delete actor success assertion in target realm " + targetRealm);
    }
    catch (error) {
      await CommonFunctions.logMessage('ERROR', 'Error in fetching/deleting procedure/actor in target realm: ' + error);
    }
    const unassignRoleToUserInTargeteUrl: string = process.env.API_BASE_URL as string + (process.env.UNASSIGN_ROLE_TO_USER as string).replace("{roleId}", adminRoleInTarget?.id).replace("{subjectId}", Testdata.USER_ID_IN_TARGET_REALM);
    const unassignRoleResponseInTarget = await ApiUtil.processAPIRequest("DELETE", unassignRoleToUserInTargeteUrl, null, headersForTarget, "Unassign role to user in source realm", "status");
    const bValidation14: boolean = await CommonFunctions.compareTwoValues(unassignRoleResponseInTarget, 204, "Unassign role to user success assertion in target realm " + targetRealm);
    const unassignAdminRoleToMachineInTargetUrl: string = process.env.API_BASE_URL as string + (process.env.UNASSIGN_ROLE_TO_USER as string).replace("{roleId}", adminRoleInTarget?.id).replace("{subjectId}", targetMachineSubjectId);
    const unassignAdminRoleResponseInTarget = await ApiUtil.processAPIRequest("DELETE", unassignAdminRoleToMachineInTargetUrl, null, headersForTarget, "Unassign admin role to machine in target realm", "status");
    const bValidation15: boolean = await CommonFunctions.compareTwoValues(unassignAdminRoleResponseInTarget, 204, "Unassign admin role to machine success assertion in target realm " + targetRealm);
    const unassignUserRoleToMachineInTargetUrl: string = process.env.API_BASE_URL as string + (process.env.UNASSIGN_ROLE_TO_USER as string).replace("{roleId}", userRoleInTarget?.id).replace("{subjectId}", targetMachineSubjectId);
    const unassignUserRoleResponseInTarget = await ApiUtil.processAPIRequest("DELETE", unassignUserRoleToMachineInTargetUrl, null, headersForTarget, "Unassign user role to machine in target realm", "status");
    const bValidation16: boolean = await CommonFunctions.compareTwoValues(unassignUserRoleResponseInTarget, 204, "Unassign user role to machine success assertion in target realm " + targetRealm);
    const deleteUserRoleInTargetUrl: string = process.env.API_BASE_URL as string + (process.env.DELETE_ROLE as string).replace("{roleId}", userRoleInTarget?.id);
    const deleteUserRoleResponseInTarget = await ApiUtil.processAPIRequest("DELETE", deleteUserRoleInTargetUrl, null, headersForTarget, "Delete user role in target realm", "status");
    const bValidation17: boolean = await CommonFunctions.compareTwoValues(deleteUserRoleResponseInTarget, 204, "Delete user role success assertion in target realm " + targetRealm);
    const deleteAdminRoleInTargetUrl: string = process.env.API_BASE_URL as string + (process.env.DELETE_ROLE as string).replace("{roleId}", adminRoleInTarget?.id);
    const deleteAdminRoleResponseInTarget = await ApiUtil.processAPIRequest("DELETE", deleteAdminRoleInTargetUrl, null, headersForTarget, "Delete admin role in target realm", "status");
    const bValidation18: boolean = await CommonFunctions.compareTwoValues(deleteAdminRoleResponseInTarget, 204, "Delete admin role success assertion in target realm " + targetRealm);

    expect(bValidation1 && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation9 && bValidation10 && bValidation14 && bValidation15 && bValidation16 && bValidation17 && bValidation18).toBeTruthy();
  });
});