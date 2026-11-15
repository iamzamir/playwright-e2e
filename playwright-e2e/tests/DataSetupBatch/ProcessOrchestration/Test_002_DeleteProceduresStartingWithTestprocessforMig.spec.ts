import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { assertDestructiveRunAllowed } from '../../../util/destructive-guard.util';

const PROCEDURE_NAME_PREFIX = 'testprocessforMig';

// Roles for these processes are created by the migration test, which assigns its Testdata
// users; reuse those ids so the roles can be unassigned before deletion.
const migrationTestData = require('../../../testdata/' + process.env.PSENV + '/ProcessOrchestrationBackend/Migration/Test_002_ProcessMigration.json');

const sourceRealm = process.env.REALM_NAME_SOURCE || '';
const sourceRealmId = process.env.REALM_ID_SOURCE || '';
const sourceMachineClientId = process.env.REALM_CLIENT_ID_SOURCE || '';
const sourceMachineClientSecret = process.env.REALM_CLIENT_SECRET_SOURCE || '';

const targetRealm = process.env.REALM_NAME_TARGET || '';
const targetRealmId = process.env.REALM_ID_TARGET || '';
const targetMachineClientId = process.env.REALM_CLIENT_ID_TARGET || '';
const targetMachineClientSecret = process.env.REALM_CLIENT_SECRET_TARGET || '';

const sourceMachineSubjectId = process.env.REALM_MACHINE_SUBJECT_ID_SOURCE || '';
const targetMachineSubjectId = process.env.REALM_MACHINE_SUBJECT_ID_TARGET || '';

interface RealmContext {
  name: string;
  headers: Record<string, string>;
  subjectIds: string[];
}

// processAPIRequest returns response[responseType] on success and a { status, data, headers }
// object on error; normalize both shapes to a numeric HTTP status.
function statusOf(result: any): number {
  return Number(result && typeof result === 'object' && 'status' in result ? result.status : result);
}

test.describe('Data Setup Batch - Procedure and actor cleanup', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let realms: RealmContext[];
  let getProceduresUrl: string;
  let deleteProcedureUrlTemplate: string;
  let getActorsUrl: string;
  let deleteActorUrlTemplate: string;
  let rolesUrl: string;
  let unassignRoleUrlTemplate: string;
  let deleteRoleUrlTemplate: string;

  test.beforeAll(async () => {
    assertDestructiveRunAllowed(['REALM_ID_SOURCE', 'REALM_ID_TARGET']);
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();

    const sourceAccessToken = await apiUtil.getBearerToken(undefined, sourceMachineClientId, sourceMachineClientSecret, undefined, sourceRealmId);
    const targetAccessToken = await apiUtil.getBearerToken(undefined, targetMachineClientId, targetMachineClientSecret, undefined, targetRealmId);

    realms = [
      { name: sourceRealm, headers: { accept: 'application/json', Authorization: 'Bearer ' + sourceAccessToken }, subjectIds: [migrationTestData.USER_ID_IN_SOURCE_REALM, sourceMachineSubjectId].filter(Boolean) },
      { name: targetRealm, headers: { accept: 'application/json', Authorization: 'Bearer ' + targetAccessToken }, subjectIds: [migrationTestData.USER_ID_IN_TARGET_REALM, targetMachineSubjectId].filter(Boolean) },
    ];

    const apiBaseUrl = process.env.API_BASE_URL as string;
    const getProceduresPath = process.env.GET_PROCEDURES as string;
    const deleteProcedurePath = process.env.DELETE_PROCEDURE as string;
    const deleteActorPath = process.env.DELETE_ACTOR as string;

    getProceduresUrl = `${apiBaseUrl}${getProceduresPath.replace('limit=10', 'limit=500')}`;
    deleteProcedureUrlTemplate = `${apiBaseUrl}${deleteProcedurePath}`;
    // Derive the actor list endpoint from the delete-actor path (mirrors the procedures list URL).
    getActorsUrl = `${apiBaseUrl}${deleteActorPath.replace('/{actorName}', '').replace('limit=10', 'limit=500')}`;
    deleteActorUrlTemplate = `${apiBaseUrl}${deleteActorPath}`;
    rolesUrl = `${apiBaseUrl}${process.env.GET_PROCESS_ROLES as string}`;
    unassignRoleUrlTemplate = `${apiBaseUrl}${process.env.UNASSIGN_ROLE_TO_USER as string}`;
    deleteRoleUrlTemplate = `${apiBaseUrl}${process.env.DELETE_ROLE as string}`;
  });

  test(`Delete all procedures starting with ${PROCEDURE_NAME_PREFIX}`, async () => {
    let hardDeleteFailures = 0;

    for (const realm of realms) {
      const listResponse = await apiUtil.processAPIRequest('GET', getProceduresUrl, null, realm.headers, `Get procedures list for cleanup in ${realm.name}`, 'full');
      const listStatusValidation = await commonFunctions.compareTwoValues(listResponse.status, 200, `Get procedures list success assertion in ${realm.name}`);
      expect(listStatusValidation).toBeTruthy();

      const entities = Array.isArray(listResponse.data)
        ? listResponse.data
        : listResponse.data?.data?.entities || [];

      const matchingProcedures = entities.filter((procedure: any) => {
        const procedureName = String(procedure?.name || '').toLowerCase();
        return procedureName.startsWith(PROCEDURE_NAME_PREFIX.toLowerCase());
      });

      await commonFunctions.logMessage('INFO', `Procedures matched for cleanup in realm ${realm.name}: ${matchingProcedures.length}`);

      for (const procedure of matchingProcedures) {
        const procedureName = procedure?.name;
        if (!procedureName) {
          continue;
        }

        const deleteUrl = deleteProcedureUrlTemplate.includes('{procedureName}')
          ? deleteProcedureUrlTemplate.replace('{procedureName}', procedureName)
          : `${deleteProcedureUrlTemplate}/${procedureName}`;

        const deleteStatus = await apiUtil.processAPIRequest('DELETE', deleteUrl, null, realm.headers, `Delete procedure ${procedureName} in ${realm.name}`, 'status');
        const numericStatus = Number(deleteStatus);

        const isDeleted = numericStatus === 200 || numericStatus === 204;
        if (!isDeleted) {
          hardDeleteFailures++;
          await commonFunctions.logMessage('FAIL', `Unexpected delete status ${deleteStatus} for procedure: ${procedureName} in ${realm.name}`);
        }
      }
    }

    expect(hardDeleteFailures).toBe(0);
  });

  test(`Delete all actors starting with ${PROCEDURE_NAME_PREFIX}`, async () => {
    let hardDeleteFailures = 0;

    for (const realm of realms) {
      const listResponse = await apiUtil.processAPIRequest('GET', getActorsUrl, null, realm.headers, `Get actors list for cleanup in ${realm.name}`, 'full');
      const listStatusValidation = await commonFunctions.compareTwoValues(listResponse.status, 200, `Get actors list success assertion in ${realm.name}`);
      expect(listStatusValidation).toBeTruthy();

      const entities = Array.isArray(listResponse.data)
        ? listResponse.data
        : listResponse.data?.data?.entities || [];

      const matchingActors = entities.filter((actor: any) => {
        const actorName = String(actor?.name || '').toLowerCase();
        return actorName.startsWith(PROCEDURE_NAME_PREFIX.toLowerCase());
      });

      await commonFunctions.logMessage('INFO', `Actors matched for cleanup in realm ${realm.name}: ${matchingActors.length}`);

      for (const actor of matchingActors) {
        const actorName = actor?.name;
        if (!actorName) {
          continue;
        }

        const deleteUrl = deleteActorUrlTemplate.includes('{actorName}')
          ? deleteActorUrlTemplate.replace('{actorName}', actorName)
          : `${deleteActorUrlTemplate}/${actorName}`;

        const deleteStatus = await apiUtil.processAPIRequest('DELETE', deleteUrl, null, realm.headers, `Delete actor ${actorName} in ${realm.name}`, 'status');
        const numericStatus = Number(deleteStatus);

        const isDeleted = numericStatus === 200 || numericStatus === 204;
        if (!isDeleted) {
          hardDeleteFailures++;
          await commonFunctions.logMessage('FAIL', `Unexpected delete status ${deleteStatus} for actor: ${actorName} in ${realm.name}`);
        }
      }
    }

    expect(hardDeleteFailures).toBe(0);
  });

  test(`Unassign and delete all process roles starting with ${PROCEDURE_NAME_PREFIX}`, async () => {
    let hardDeleteFailures = 0;

    for (const realm of realms) {
      const rolesResponse = await apiUtil.processAPIRequest('GET', rolesUrl, null, realm.headers, `Get roles list for cleanup in ${realm.name}`, 'full');
      const listStatusValidation = await commonFunctions.compareTwoValues(rolesResponse.status, 200, `Get roles list success assertion in ${realm.name}`);
      expect(listStatusValidation).toBeTruthy();

      const roles = Array.isArray(rolesResponse.data)
        ? rolesResponse.data
        : rolesResponse.data?.data?.entities || [];

      const matchingRoles = roles.filter((role: any) => {
        const roleName = String(role?.name || '').toLowerCase();
        return roleName.startsWith(PROCEDURE_NAME_PREFIX.toLowerCase());
      });

      await commonFunctions.logMessage('INFO', `Roles matched for cleanup in realm ${realm.name}: ${matchingRoles.length}`);

      for (const role of matchingRoles) {
        const roleId = role?.id;
        if (!roleId) {
          continue;
        }

        // GET on roles/{roleId}/subjects is not supported, so unassign the known candidate
        // subjects (migration test user + realm machine) before deleting the role.
        for (const subjectId of realm.subjectIds) {
          const unassignUrl = unassignRoleUrlTemplate.replace('{roleId}', String(roleId)).replace('{subjectId}', subjectId);
          const unassignStatus = await apiUtil.processAPIRequest('DELETE', unassignUrl, null, realm.headers, `Unassign subject ${subjectId} from role ${role.name} in ${realm.name}`, 'status');
          const numericUnassignStatus = statusOf(unassignStatus);
          // 204 = unassigned; 404 = no such association (acceptable during cleanup).
          if (numericUnassignStatus !== 204 && numericUnassignStatus !== 404) {
            await commonFunctions.logMessage('WARN', `Unexpected unassign status ${numericUnassignStatus} for subject ${subjectId} on role ${role.name} in ${realm.name}`);
          }
        }

        const deleteRoleUrl = deleteRoleUrlTemplate.replace('{roleId}', String(roleId));
        const deleteRoleStatus = await apiUtil.processAPIRequest('DELETE', deleteRoleUrl, null, realm.headers, `Delete role ${role.name} in ${realm.name}`, 'status');
        const numericStatus = statusOf(deleteRoleStatus);

        const isDeleted = numericStatus === 200 || numericStatus === 204;
        if (!isDeleted) {
          hardDeleteFailures++;
          await commonFunctions.logMessage('FAIL', `Unexpected delete status ${numericStatus} for role: ${role.name} in ${realm.name}`);
        }
      }
    }

    expect(hardDeleteFailures).toBe(0);
  });
});
