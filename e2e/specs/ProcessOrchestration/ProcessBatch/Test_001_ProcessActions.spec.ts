
import ProcessPage from "../../../pageobjects/process.page";
import CommonFunctions from "../../../util/common.util";
import TestUtil from "../../../util/test.util";
import ApiUtil from "../../../util/api.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/ProcessBatch/Test_001_ProcessActions.json");
const random_name = Math.floor(1000 + Math.random() * 900000) + Math.floor(10000 + Math.random() * 900000);
const processName = TestData.CREATE_PROCESS_FORM_DATA.DISPLAY_NAME + " " + random_name;
// const processName = "timeoutcheck1";
const subProcessName = 'Test Subprocess ' + random_name;
const adminRole = processName.replace(/\s/g, "").toLowerCase() + "_admin";
const userRole = processName.replace(/\s/g, "").toLowerCase() + "_user";
const machineSubId: string = process.env.SUBJECT_ID as string;
let accessToken: string;
let headers: Record<string, string>;

describe(`Actions on process in PO`, async () => {

    before(async () => {
        accessToken = await ApiUtil.getBearerToken();
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessToken
        };
        await TestUtil.launchAppFromCatalog(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string);
        await browser.pause(5000);
    })

    it(`Test Case 1: Create a process with name ${processName}`, async () => {
        await ProcessPage.clickOnAddProcess();
        await ProcessPage.fillCreateProcessForm(processName, TestData.CREATE_PROCESS_FORM_DATA.CALENDAR, TestData.CREATE_PROCESS_FORM_DATA.CYCLE_NAME, TestData.CREATE_PROCESS_FORM_DATA.DESCRIPTION, TestData.CREATE_PROCESS_FORM_DATA.TEMPLATE_NAME,);
        await ProcessPage.processActions('Create');
        const bValidation1 = await CommonFunctions.compareTwoValues(await ProcessPage.alertMsg(`Process ${processName.replace(/\s/g, "")} has been created successfully`, 60000), true, `Is success toast displayed`);
        await browser.pause(3000);
        const bValidation2 = await CommonFunctions.compareTwoValues(await ProcessPage.isProcessExist(processName), true, `Is ${processName} process available in the list`);
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

    it(`Test Case 2: Create a sub process`, async () => {
        await ProcessPage.clickOnProcess(processName);
        await ProcessPage.refreshProcess(); //Remove this Later
        await ProcessPage.setPageSize("10");
        await ProcessPage.clickOnAddSubProcess();
        await ProcessPage.fillSubProcessForm(subProcessName, `testing creation of sub process using AT`, true);
        await ProcessPage.processActions('Create');
        const bValidation1 = await CommonFunctions.compareTwoValues(await ProcessPage.alertMsg(`Process ${subProcessName.replace(/\s/g, "")} has been created`), true, `Is creation of ${subProcessName} sub process successfull`);
        await browser.pause(3000);
        await ProcessPage.setPageSize("10");
        const bValidation2 = await CommonFunctions.compareTwoValues(await ProcessPage.isProcessExist(subProcessName), true, `Is ${subProcessName} sub process available in the table`);
        expect(bValidation1 && bValidation2).toBeTruthy();
    })

    it(`Test Case 3: Edit ${subProcessName} sub process`, async () => {
        await ProcessPage.refreshProcess(); //Remove this Later
        await ProcessPage.setPageSize("10");
        await ProcessPage.clickOnThreeDotMenuOfSubProcess(subProcessName);
        await ProcessPage.clickOnItem('Edit');
        await ProcessPage.fillSubProcessForm('', `edit description`, false);
        await ProcessPage.processActions('Save');
        const bValidation1 = await CommonFunctions.compareTwoValues(await ProcessPage.alertMsg(`Process ${subProcessName.replace(/\s/g, "")} has been updated`), true, `Is sub process details updated`);
        expect(bValidation1).toBeTruthy();
    });

    it(`Test Case 4: Delete the created ${subProcessName} sub process`, async () => {
        await ProcessPage.clickOnThreeDotMenuOfSubProcess(subProcessName);
        await ProcessPage.clickOnItem('Delete');
        await ProcessPage.processActions('Delete');
        const bValidation1 = await CommonFunctions.compareTwoValues(await ProcessPage.alertMsg(`Process ${subProcessName} has been deleted`), true, `Is sub process deleted`);
        expect(bValidation1).toBeTruthy();
    });
/*
    it(`Test Case 5: Edit a process with name ${processName}`, async () => {
        await ProcessPage.clickOnThreeDotMenu();
        await ProcessPage.clickOnMenuItem("Edit Details");
        await ProcessPage.fillCreateProcessForm(processName + " edit", "Weekly Calendar", "2024 Week 8", TestData.CREATE_PROCESS_FORM_DATA.DESCRIPTION + " edit");
        await ProcessPage.processActions('Save');
        const bValidation1 = await CommonFunctions.compareTwoValues(await ProcessPage.alertMsg(`Process ${processName.replace(/\s/g, "")} has been updated successfully`), true, `Is process details updated`);
        expect(bValidation1).toBeTruthy();
    });*/

    it(`Test Case 6: Delete the created ${processName} process`, async () => {
        await ProcessPage.clickOnThreeDotMenu();
        await ProcessPage.clickOnMenuItem("Delete");
        await ProcessPage.processActions('Delete');
        const bValidation1 = await CommonFunctions.compareTwoValues(await ProcessPage.alertMsg(`deleted`), true, `Is process details updated`);
        expect(bValidation1).toBeTruthy();
    });

    it(`Test Case 7: Delete procedure,actor,roles associated with ${processName}`, async () => {
        await browser.pause(2000);
        const rolesUrl: string = process.env.API_BASE_URL as string + process.env.GET_PROCESS_ROLES as string;
        const getProceduresUrl: string = process.env.API_BASE_URL as string + process.env.GET_PROCEDURES as string;
        const getProceduresResponse = await ApiUtil.processAPIRequest("GET", getProceduresUrl, null, headers, "Get procedures", "full");
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(getProceduresResponse.status, 200, "Get procedures success assertion");
        const procedure = getProceduresResponse.data.data.entities.find((procedure: any) => procedure.name.includes(processName.replace(/\s/g, "")));
        const actorConfigName = procedure?.actorsConfig[0];
        const procedureName = procedure?.name;
        const deleteProcedureUrl: string = process.env.API_BASE_URL as string + (process.env.DELETE_PROCEDURE as string).replace("{procedureName}", procedureName);
        const deleteProcedureResponse = await ApiUtil.processAPIRequest("DELETE", deleteProcedureUrl, null, headers, "Delete procedure", "status");
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(deleteProcedureResponse, 200, "Delete procedure success assertion");
        const deleteActorUrl: string = process.env.API_BASE_URL as string + (process.env.DELETE_ACTOR as string).replace("{actorName}", actorConfigName);
        const deleteActorResponse = await ApiUtil.processAPIRequest("DELETE", deleteActorUrl, null, headers, "Delete actor", "status");
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(deleteActorResponse, 200, "Delete actor success assertion");
        const rolesResponse = await ApiUtil.processAPIRequest("GET", rolesUrl, null, headers, "Get process roles", "full");
        const bValidation4: boolean = await CommonFunctions.compareTwoValues(rolesResponse.status, 200, "Get process roles success assertion");
        const adminRoleId = rolesResponse.data.find((role: any) => role.realmName === TestData.REALM_NAME && role.name === adminRole).id;
        const userRoleId = rolesResponse.data.find((role: any) => role.realmName === TestData.REALM_NAME && role.name === userRole).id;
        const unassignRoleToUserUrl: string = process.env.API_BASE_URL as string + (process.env.UNASSIGN_ROLE_TO_USER as string).replace("{roleId}", adminRoleId).replace("{subjectId}", TestData.SUBJECT_ID);
        const unassignRoleResponse = await ApiUtil.processAPIRequest("DELETE", unassignRoleToUserUrl, null, headers, "Unassign admin role to user", "status");
        const bValidation5: boolean = await CommonFunctions.compareTwoValues(unassignRoleResponse, 204, "Unassign admin role to user success assertion");
        const unassignRoleToMachineUrl: string = process.env.API_BASE_URL as string + (process.env.UNASSIGN_ROLE_TO_USER as string).replace("{roleId}", userRoleId).replace("{subjectId}", machineSubId);
        const unassignRoleToMachineResponse = await ApiUtil.processAPIRequest("DELETE", unassignRoleToMachineUrl, null, headers, "Unassign user role to machine", "status");
        const bValidation6: boolean = await CommonFunctions.compareTwoValues(unassignRoleToMachineResponse, 204, "Unassign role to machine success assertion");
        const deleteUserRoleUrl: string = process.env.API_BASE_URL as string + (process.env.DELETE_ROLE as string).replace("{roleId}", userRoleId);
        const deleteUserRoleResponse = await ApiUtil.processAPIRequest("DELETE", deleteUserRoleUrl, null, headers, "Delete user role", "status");
        const bValidation7: boolean = await CommonFunctions.compareTwoValues(deleteUserRoleResponse, 204, "Delete user role success assertion ");
        const deleteAdminRoleUrl: string = process.env.API_BASE_URL as string + (process.env.DELETE_ROLE as string).replace("{roleId}", adminRoleId);
        const deleteAdminRoleResponse = await ApiUtil.processAPIRequest("DELETE", deleteAdminRoleUrl, null, headers, "Delete admin role", "status");
        const bValidation8: boolean = await CommonFunctions.compareTwoValues(deleteAdminRoleResponse, 204, "Delete admin role success assertion");
        expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8).toBeTruthy();
    });

    // it(`Test Case 4: Delete procedure associated with ${processName}`, async () => {
    //     await PlanningSpace.navToSNA()
    //     await browser.pause(5000);
    //     await ProcessPage.clickLeftpaneLinks('Actors and Procedures');
    //     await browser.pause(3000)
    //     await SNAConfig.clickOnTab("Procedues");
    //     await browser.pause(2000);
    //     await SNAConfig.deleteProcedureOrActor(processName.replace(/\s/g,""),"Procedure");
    //     await browser.pause(5000);
    //     await ProcessPage.processActions('Delete');
    //     const bValidation1 = await CommonFunctions.compareTwoValues(await SNAConfig.verifyDeleteToast(processName.replace(/\s/g,""),"Procedure"), true, `Is procedure deleted successfully`);
    //     expect(bValidation1).toBeTruthy();
    // })
    // it(`Test Case 5: Delete actor associated with ${processName}`, async () => {
    //     await browser.pause(3000)
    //     await SNAConfig.clickOnTab("Actors");
    //     await browser.pause(2000);
    //     await SNAConfig.deleteProcedureOrActor(processName.replace(/\s/g,""),"Actor");
    //     await browser.pause(5000);
    //     await ProcessPage.processActions('Delete');
    //     const bValidation1 = await CommonFunctions.compareTwoValues(await SNAConfig.verifyDeleteToast(processName.replace(/\s/g,""),"Actor"), true, `Is actor deleted successfully`);
    //     expect(bValidation1).toBeTruthy();
    // });

    // it(`Test Case 6: Unassign roles associated with ${processName} for user and machine`, async () => {
    //     await PlanningSpace.navToIdentityAndAccess();
    //     await browser.pause(5000);
    //     await IdentityAndAccess.searchForUserOrMachine(TestData.USER_NAME);
    //     await browser.pause(3000);
    //     await IdentityAndAccess.clickOnThreeDot(TestData.USER_NAME);
    //     await browser.pause(2000);
    //     await IdentityAndAccess.actionOnUser("Manage Roles");
    //     await browser.pause(3000);
    //     await IdentityAndAccess.unAssignRoleForUser(adminRole);
    //     const bValidation1 = await CommonFunctions.compareTwoValues(await IdentityAndAccess.verifyDeleteToast(`1 role is deleted from ${TestData.USER_NAME}`), true, `Is successfully un assigned role for user`);
    //     await IdentityAndAccess.closeManageRolesDialog();
    //     await IdentityAndAccess.clickOnTab('Machines');
    //     await IdentityAndAccess.unAssignRoleForMachine(userRole,TestData.MACHINE_USER_NAME);
    //     const bValidation2 = await CommonFunctions.compareTwoValues(await IdentityAndAccess.verifyDeleteToast(`${userRole} role deleted for ${TestData.MACHINE_USER_NAME}`), true, `Is successfully un assigned role for machine`);
    //     expect(bValidation1 && bValidation2).toBeTruthy();
    // });


    // it(`Test Case 7: Delete roles associated with ${processName} `, async () => {
    //     await IdentityAndAccess.clickOnTab('Roles');
    //     await IdentityAndAccess.deleteRole(userRole);
    //     const bValidation1: boolean = await CommonFunctions.compareTwoValues(await IdentityAndAccess.verifyDeleteToast(`Role ${userRole} has been deleted successfully`),true,`Is ${userRole} role deleted successfully`);
    //     await IdentityAndAccess.deleteRole(adminRole);
    //     const bValidation2: boolean = await CommonFunctions.compareTwoValues(await IdentityAndAccess.verifyDeleteToast(`Role ${adminRole} has been deleted successfully`),true,`Is ${adminRole} role deleted successfully`);
    //     expect(bValidation1 && bValidation2).toBeTruthy();
    // });

})