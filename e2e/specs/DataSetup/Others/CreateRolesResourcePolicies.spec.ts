const TestData = require("../../../Testdata/" + process.env.PSENV + "/DataSetup/Others/CreateRolesResourcePolicies.json");
import CommonFunctions from "../../../util/common.util";
import ApiUtil from "../../../util/api.util";

describe('Reset Process Scope', () => {
    let url: string, headers: Record<string, string>;
    let roleId: string[] = ["1002333784", "1002333785"];
    const resourceName: number = 1002000268;
    const accessToken: string = "";
    const baseUrl: string = "https://api-tst.jdadelivers.com/";

    before(async () => {
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessToken
        };
    });

    it('Get all Liam Resources', async () => {
        url = `${baseUrl}iam/realm/v1/resourceNamespaces/${resourceName}/resources`;
        const response = await ApiUtil.processAPIRequest("GET", url, null, headers, "Fetching All Resources", "full");
        const validation = await CommonFunctions.compareTwoValues(response.status, "200", "Get All Resources Success Assertion");
        expect(validation).toBeTruthy();
        // Optionally, check that response.data is an array
        expect(Array.isArray(response.data)).toBeTruthy();
    });

    it('Get all Roles', async () => {
        url = `${baseUrl}iam/realm/v1/roles`;
        const response = await ApiUtil.processAPIRequest("GET", url, null, headers, "Fetching All Roles", "full");
        const validation = await CommonFunctions.compareTwoValues(response.status, "200", "Get All Roles Success Assertion");
        expect(validation).toBeTruthy();
        expect(Array.isArray(response.data)).toBeTruthy();
    });

    it('Get all Policies under each Role', async () => {
        // for (const id of roleId) {
        let id = 1002338344
        const policiesUrl = `${baseUrl}iam/realm/v1/roles/${id}/policies`;
        const response = await ApiUtil.processAPIRequest("GET", policiesUrl, null, headers, `Fetching Policies for Role ${id}`, "full");
        const validation = await CommonFunctions.compareTwoValues(response.status, "200", `Get Policies for Role ${id} Success Assertion`);
        expect(validation).toBeTruthy();
        expect(Array.isArray(response.data)).toBeTruthy();
        // }
    });


    it('1. Create Liam Resources', async () => {
        url = `${baseUrl}iam/realm/v1/resourceNamespaces/${resourceName}/resources`;
        for (const resource of TestData[0]) {
            const response = await ApiUtil.processAPIRequest("POST", url, resource, headers, "Creating Resource", "full");
            const validation = await CommonFunctions.compareTwoValues(response.status, "201", "Resource Creation Success Assertion");
            expect(validation).toBeTruthy();
        }
    });

    it('2. Create Roles', async () => {
        url = `${baseUrl}iam/realm/v1/roles`;
        for (let i = 0; i < TestData[1].length; i++) {
            const response = await ApiUtil.processAPIRequest("POST", url, TestData[1][i], headers, "Creating Role", "full");
            const validation = await CommonFunctions.compareTwoValues(response.status, "201", "Role Creation Success Assertion");
            roleId[i] = response.data.id;
            expect(validation).toBeTruthy();
        }
    });

    it('3. Add Policies to the Role Integrated Business Planning Admin', async () => {
        url = `${baseUrl}iam/realm/v1/roles/${roleId[0]}/policies`;
        for (const policy of TestData[2]) {
            const response = await ApiUtil.processAPIRequest("POST", url, policy, headers, "Creating Policies", "full");
            const validation = await CommonFunctions.compareTwoValues(response.status, "201", "Policy Creation Success Assertion");
            expect(validation).toBeTruthy();
        }
    });

    it('4. Add Policies to the Role Integrated Business Planning User', async () => {
        url = `${baseUrl}iam/realm/v1/roles/${roleId[1]}/policies`;
        for (const policy of TestData[3]) {
            const response = await ApiUtil.processAPIRequest("POST", url, policy, headers, "Creating Policies", "full");
            const validation = await CommonFunctions.compareTwoValues(response.status, "201", "Policy Creation Success Assertion");
            expect(validation).toBeTruthy();
        }
    });

    it('6. Delete Roles', async () => {
        for (const id of roleId) {
            const deleteRoleUrl = `${baseUrl}iam/realm/v1/roles/${id}`;
            const response = await ApiUtil.processAPIRequest("DELETE", deleteRoleUrl, null, headers, "Deleting Role", "full");
            const validation = await CommonFunctions.compareTwoValues(response.status, "204", "Role Deletion Success Assertion");
            expect(validation).toBeTruthy();
        }
    });

    it('7. Delete Resources', async () => {
        const createdResourceNames = TestData[0].map(r => r.name);
        const getResourcesUrl = `${baseUrl}iam/realm/v1/resourceNamespaces/${resourceName}/resources`;
        const resourcesResponse = await ApiUtil.processAPIRequest("GET", getResourcesUrl, null, headers, "Fetching Resources", "full");
        const resources = resourcesResponse.data || [];
        const resourcesToDelete = resources.filter(r => createdResourceNames.includes(r.name));
        for (const resource of resourcesToDelete) {
            const deleteResourceUrl = `${baseUrl}iam/realm/v1/resourceNamespaces/${resourceName}/resources/${resource.id}`;
            const response = await ApiUtil.processAPIRequest("DELETE", deleteResourceUrl, null, headers, "Deleting Resource", "full");
            const validation = await CommonFunctions.compareTwoValues(response.status, "204", "Resource Deletion Success Assertion");
            expect(validation).toBeTruthy();
        }
    });

    it('Get all Roles and Delete ProcessCreate Roles', async () => {
        url = `${baseUrl}iam/realm/v1/roles`;
        const response = await ApiUtil.processAPIRequest("GET", url, null, headers, "Fetching All Roles", "full");
        const validation = await CommonFunctions.compareTwoValues(response.status, "200", "Get All Roles Success Assertion");

        if (validation && Array.isArray(response.data)) {
            // Filter and delete roles with "processcreate" in name
            const processCreateRoles = response.data.filter((role: { id: string; name: string }) =>
                role.name?.toLowerCase().includes('processcreate')
            );

            console.log(`Found ${processCreateRoles.length} processcreate roles to delete`);

            for (const role of processCreateRoles) {
                const deleteUrl = `${baseUrl}iam/realm/v1/roles/${role.id}`;
                const deleteResponse = await ApiUtil.processAPIRequest("DELETE", deleteUrl, null, headers, `Deleting Role: ${role.name}`, "full");

                if (deleteResponse.status == 204) {
                    console.log(`✅ Deleted role: ${role.name} (ID: ${role.id})`);
                } else {
                    console.log(`❌ Failed to delete role: ${role.name} (ID: ${role.id})`);
                }
            }
        }

        expect(validation).toBeTruthy();
    });
});
