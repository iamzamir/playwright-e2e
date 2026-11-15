import ApiUtil from "../../../util/api.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/DataSetup/UIDataReset/Test_002_MapViewsToContext.json");
import CommonFunctions from "../../../util/common.util";

describe('Cleanup Process Roles', () => {

    let url: string;
    let accessToken: string, accessTokenForTarget: string, headers: Record<string, string>, headersForTarget: Record<string, string>;
    const sourceRealm = process.env.REALM_NAME_SOURCE || '';
    const targetRealm = process.env.REALM_NAME_TARGET || '';
    const sourceRealmId = process.env.REALM_ID_SOURCE || '';
    const targetRealmId = process.env.REALM_ID_TARGET || '';
    const sourceMachineClientId = process.env.REALM_CLIENT_ID_SOURCE || '';
    const targetMachineClientId = process.env.REALM_CLIENT_ID_TARGET || '';
    const sourceMachineClientSecret = process.env.REALM_CLIENT_SECRET_SOURCE || '';
    const targetMachineClientSecret = process.env.REALM_CLIENT_SECRET_TARGET || '';
    const sourceMachineSubjectId = "";
    const targetMachineSubjectId = process.env.REALM_MACHINE_SUBJECT_ID_TARGET || '';

    before(async () => {
        accessToken = await ApiUtil.getBearerToken(undefined, "", "", undefined, "");
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessToken
        };
        accessTokenForTarget = await ApiUtil.getBearerToken(undefined, targetMachineClientId, targetMachineClientSecret, undefined, targetRealmId);
        headersForTarget = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessTokenForTarget
        };
    })

    it(`Test Case 1 : Cleanup Process Roles`, async () => {

        url = process.env.API_BASE_URL as string + "iam/realm/v1/roles";
        const response = await ApiUtil.processAPIRequest("GET", url, null, headers, "Fetching All Roles", "full");
        const validation = await CommonFunctions.compareTwoValues(response.status, "200", "Get All Roles Success Assertion");
        expect(validation).toBeTruthy();
        await CommonFunctions.logMessage('INFO', 'All Roles: ' + JSON.stringify(response.data));
        let arrRoleNames: string[] = [];
        let arrRoleIds: string[] = [];
        await CommonFunctions.logMessage('INFO', 'Total Roles: ' + response.data.length);
        for (let i = 0; i < response.data.length; i++) {
            if (response.data[i].name.includes("processcreate")) {
                arrRoleNames.push(response.data[i].name);
                arrRoleIds.push(response.data[i].id);
            }
        }
        await CommonFunctions.logMessage('INFO', "Role Names: " + arrRoleNames);

        // To assign admin role to machine in source realm, delete process
        for (const id of arrRoleIds) {
            const assignAdminRoleToMachineInSourceUrl: string = "https://api-tst.jdadelivers.com/iam/realm/v1/roles/" + id + "/subjects";
            let reqPayload = { "id": "718ce689-d2a1-4c45-8ba4-5d180f494b08" }
            const assignAdminRoleToMachineResponseInSource = await ApiUtil.processAPIRequest("POST", assignAdminRoleToMachineInSourceUrl, reqPayload, headers, "Assign admin role to machine in source realm", "status");
            await CommonFunctions.compareTwoValues(assignAdminRoleToMachineResponseInSource, 200, "Assign admin role to machine success assertion in source realm " + sourceRealm);

            let processName: string = (arrRoleNames[arrRoleIds.indexOf(id)]).replace("_admin", "").replace("m", "M");
            if (!processName.includes("_user")) {
                const deleteProcessURL: string = "https://api-tst.jdadelivers.com/cbp/qa/ibp/process-orchestration/v1/process/" + processName + "";
                const deleteProcess = await ApiUtil.processAPIRequest("DELETE", deleteProcessURL, null, headers, "Assign admin role to machine in source realm", "status");
                await CommonFunctions.compareTwoValues(deleteProcess, 200, "Assign admin role to machine success assertion in source realm " + sourceRealm);
            }
        }
        // To unassign admin role to machine in source realm
        for (const id of arrRoleIds) {
            const unassignAdminRoleToMachineInSourceUrl: string = process.env.API_BASE_URL as string + (process.env.UNASSIGN_ROLE_TO_USER as string).replace("{roleId}", id).replace("{subjectId}", sourceMachineSubjectId);
            const unassignAdminRoleToMachineResponseInSource = await ApiUtil.processAPIRequest("DELETE", unassignAdminRoleToMachineInSourceUrl, null, headers, "Unassign admin role to machine in source realm", "status");
            await CommonFunctions.compareTwoValues(unassignAdminRoleToMachineResponseInSource, 204, "Unassign admin role to machine success assertion in source realm " + sourceRealm);
        }
        // To Delete Roles in source realm
        for (const id of arrRoleIds) {
            const deleteRoleUrl = process.env.API_BASE_URL as string + "iam/realm/v1/roles/" + id;
            const response = await ApiUtil.processAPIRequest("DELETE", deleteRoleUrl, null, headers, "Deleting Role", "full");
            await CommonFunctions.compareTwoValues(response.status, "204", "Role Deletion Success Assertion");
        }
    });
});