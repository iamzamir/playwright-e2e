import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';

test.describe.serial('Cleanup Process Roles', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
  let url: string;

  const sourceRealm = process.env.REALM_NAME_SOURCE || '';
  const sourceMachineSubjectId = '';

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();

    const accessToken = await apiUtil.getBearerToken(undefined, '', '', undefined, '');
    headers = {
      accept: 'application/json',
      Authorization: 'Bearer ' + accessToken
    };
  });

  test('Test Case 1: Cleanup Process Roles', async () => {
    url = (process.env.API_BASE_URL as string) + 'iam/realm/v1/roles';

    const response = await apiUtil.processAPIRequest('GET', url, null, headers, 'Fetching All Roles', 'full');
    const validation = await commonFunctions.compareTwoValues(response.status, 200, 'Get all roles success assertion');
    expect(validation).toBeTruthy();

    await commonFunctions.logMessage('INFO', 'All Roles: ' + JSON.stringify(response.data));

    const roleNames: string[] = [];
    const roleIds: string[] = [];
    await commonFunctions.logMessage('INFO', 'Total Roles: ' + response.data.length);

    for (let i = 0; i < response.data.length; i++) {
      if (String(response.data[i].name || '').includes('processcreate')) {
        roleNames.push(response.data[i].name);
        roleIds.push(response.data[i].id);
      }
    }

    await commonFunctions.logMessage('INFO', 'Role Names: ' + roleNames);

    for (const id of roleIds) {
      const assignAdminRoleToMachineInSourceUrl = `https://api-tst.jdadelivers.com/iam/realm/v1/roles/${id}/subjects`;
      const reqPayload = { id: '718ce689-d2a1-4c45-8ba4-5d180f494b08' };

      const assignResponseStatus = await apiUtil.processAPIRequest('POST', assignAdminRoleToMachineInSourceUrl, reqPayload, headers, 'Assign admin role to machine in source realm', 'status');
      await commonFunctions.compareTwoValues(assignResponseStatus, 200, 'Assign admin role to machine success assertion in source realm ' + sourceRealm);

      const processName = roleNames[roleIds.indexOf(id)].replace('_admin', '').replace('m', 'M');
      if (!processName.includes('_user')) {
        const deleteProcessUrl = `https://api-tst.jdadelivers.com/cbp/qa/ibp/process-orchestration/v1/process/${processName}`;
        const deleteProcessStatus = await apiUtil.processAPIRequest('DELETE', deleteProcessUrl, null, headers, 'Delete process in source realm', 'status');
        await commonFunctions.compareTwoValues(deleteProcessStatus, 200, 'Delete process success assertion in source realm ' + sourceRealm);
      }
    }

    for (const id of roleIds) {
      const unassignAdminRoleToMachineInSourceUrl = (process.env.API_BASE_URL as string) + (process.env.UNASSIGN_ROLE_TO_USER as string).replace('{roleId}', id).replace('{subjectId}', sourceMachineSubjectId);
      const unassignResponseStatus = await apiUtil.processAPIRequest('DELETE', unassignAdminRoleToMachineInSourceUrl, null, headers, 'Unassign admin role to machine in source realm', 'status');
      await commonFunctions.compareTwoValues(unassignResponseStatus, 204, 'Unassign admin role to machine success assertion in source realm ' + sourceRealm);
    }

    for (const id of roleIds) {
      const deleteRoleUrl = (process.env.API_BASE_URL as string) + `iam/realm/v1/roles/${id}`;
      const deleteRoleResponse = await apiUtil.processAPIRequest('DELETE', deleteRoleUrl, null, headers, 'Deleting Role', 'full');
      await commonFunctions.compareTwoValues(deleteRoleResponse.status, 204, 'Role deletion success assertion');
    }

    expect(true).toBeTruthy();
  });
});
