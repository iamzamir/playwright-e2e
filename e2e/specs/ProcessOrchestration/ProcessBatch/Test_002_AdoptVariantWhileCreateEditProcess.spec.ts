import ProcessPage from "../../../pageobjects/process.page";
import CommonFunctions from "../../../util/common.util";
import TestUtil from "../../../util/test.util";
import ApiUtil from "../../../util/api.util";
import GlobalSettings from "../../../pageobjects/global-settings.page";

const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/ProcessBatch/Test_002_AdoptVariantWhileCreateEditProcess.json");

const random_name = Math.floor(1000 + Math.random() * 90000) + Math.floor(1000 + Math.random() * 90000);
const processName = TestData.CREATE_PROCESS_FORM_DATA.DISPLAY_NAME + " " + random_name;
const adminRole = processName.replace(/\s/g, "").toLowerCase() + "_admin";
const userRole = processName.replace(/\s/g, "").toLowerCase() + "_user";
let accessToken: string;
let headers: Record<string, string>;

describe(`Data Version Dropdown validation for Process Creation in PO`, () => {

  const RealmId = process.env.REALM_ID_PO_PS_1 || '';
  const machineClientId = process.env.REALM_CLIENT_ID_SOURCE_PO_PS_1 || '';
  const machineClientSecret = process.env.CLIENT_SECRET_PO_PS_1 || '';

  before(async () => {
    accessToken = await ApiUtil.getBearerToken(undefined, machineClientId, machineClientSecret, undefined, RealmId);
    headers = {
      "accept": "application/json",
      "Authorization": "Bearer " + accessToken
    };
    await TestUtil.launchAppFromCatalog(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string);
    await browser.pause(5000);
  });

  it(`Test Case 1: Create a process with name ${processName} with Data Version ${TestData.CREATE_PROCESS_FORM_DATA.DATA_VERSION_VALUE} `, async () => {
    await ProcessPage.clickOnAddProcess();
    await ProcessPage.fillCreateProcessForm(processName, TestData.CREATE_PROCESS_FORM_DATA.CALENDAR, TestData.CREATE_PROCESS_FORM_DATA.CYCLE_NAME, TestData.CREATE_PROCESS_FORM_DATA.DESCRIPTION, TestData.CREATE_PROCESS_FORM_DATA.TEMPLATE_NAME, TestData.CREATE_PROCESS_FORM_DATA.DATA_VERSION_VALUE);
    await ProcessPage.processActions('Create');
    const bValidation1 = await CommonFunctions.compareTwoValues(await ProcessPage.alertMsg(`Process ${processName.replace(/\s/g, "")} has been created successfully`, 60000), true, `Is success toast displayed`);
    await browser.pause(5000);
    const bValidation2 = await CommonFunctions.compareTwoValues(await ProcessPage.isProcessExist(processName), true, `Is ${processName} process available in the list`);
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  it(`Test Case 2: Validate the data version chip when selected with ${TestData.CREATE_PROCESS_FORM_DATA.DATA_VERSION_VALUE} `, async () => {
    await GlobalSettings.clickGlobalSettings();
    await ProcessPage.clickLeftpaneLinks("Process Orchestration");
    await browser.pause(5000);
    await ProcessPage.clickOnProcess(`${processName}`);
    await browser.pause(8000);
    const dataVersionChipExists = await ProcessPage.dataVersionChipValidation(TestData.CREATE_PROCESS_FORM_DATA.DATA_VERSION_VALUE);
    const bValidation = await CommonFunctions.compareTwoValues(dataVersionChipExists, true, `Is data version chip with value ${TestData.CREATE_PROCESS_FORM_DATA.DATA_VERSION_VALUE} displayed correctly`);
    expect(bValidation).toBeTruthy();
  });

  it(`Test Case 3: Edit a data version in the process ${processName}`, async () => {
    await ProcessPage.clickOnThreeDotMenu();
    await ProcessPage.clickOnMenuItem("Edit Details");
    await browser.pause(15000); // Extended wait for edit form to fully load            
    await ProcessPage.editDataVersionInEditProcess(TestData.EDIT_PROCESS_FORM_DATA.DATA_VERSION_DEFAULT);
    await ProcessPage.processActions('Save');
    const bValidation = await CommonFunctions.compareTwoValues(await ProcessPage.alertMsg(`Process ${processName.replace(/\s/g, "")} has been updated successfully`, 60000), true, `Is success toast displayed for process edit`);
    expect(bValidation).toBeTruthy();
  });

  it(`Test Case 4: Validate the data Version Chip when default is selected.`, async () => {
    const dataVersionChipNotDisplayed = await ProcessPage.dataVersionChipValidation(TestData.EDIT_PROCESS_FORM_DATA.DATA_VERSION_DEFAULT);
    const bValidation = await CommonFunctions.compareTwoValues(dataVersionChipNotDisplayed, true, `Is data version chip correctly hidden for default value`);
    expect(bValidation).toBeTruthy();
  });

  it(`Test Case 5: Delete the created ${processName} process`, async () => {
    await ProcessPage.clickOnThreeDotMenu();
    await ProcessPage.clickOnMenuItem("Delete");
    await ProcessPage.processActions('Delete');
    const bValidation = await CommonFunctions.compareTwoValues(await ProcessPage.alertMsg(`deleted`, 60000), true, `Is process details updated`);
    expect(bValidation).toBeTruthy();
  });

  it(`Test Case 6: Delete procedure,actor,roles associated with ${processName}`, async () => {
    const deleteProcessModelEntity: string = process.env.API_BASE_URL as string + process.env.GET_PROCESSMODEL_ENTITY as string + "&processName=" + processName.replace(/\s/g, "");
    const getProcedureDeleteResponse = await ApiUtil.processAPIRequest("DELETE", deleteProcessModelEntity, null, headers, "Delete Process Model", "full");
    await CommonFunctions.compareTwoValues(getProcedureDeleteResponse.status, 200, "Get procedures success assertion");
    const rolesUrl: string = process.env.API_BASE_URL as string + process.env.GET_PROCESS_ROLES as string;
    const getProceduresUrl: string = process.env.API_BASE_URL as string + process.env.GET_PROCEDURES as string;
    const getProceduresResponse = await ApiUtil.processAPIRequest("GET", getProceduresUrl, null, headers, "Get procedures", "full");
    const bValidation1: boolean = await CommonFunctions.compareTwoValues(getProceduresResponse.status, 200, "Get procedures success assertion");
    const procedure = getProceduresResponse.data.data.entities.find((procedure: any) => procedure.displayName.includes(processName.replace(/\s/g, "")));
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
    const unassignRoleToUserUrl: string = process.env.API_BASE_URL as string + (process.env.UNASSIGN_ROLE_TO_USER as string).replace("{roleId}", adminRoleId).replace("{subjectId}", TestData.PSAUTOMATION_SUBJECT_ID);
    const unassignRoleResponse = await ApiUtil.processAPIRequest("DELETE", unassignRoleToUserUrl, null, headers, "Unassign admin role to user", "status");
    const bValidation5: boolean = await CommonFunctions.compareTwoValues(unassignRoleResponse, 204, "Unassign admin role to user success assertion");
    const unassignRoleToMachineUrl: string = process.env.API_BASE_URL as string + (process.env.UNASSIGN_ROLE_TO_USER as string).replace("{roleId}", userRoleId).replace("{subjectId}", TestData.SUBJECT_ID);
    const unassignRoleToMachineResponse = await ApiUtil.processAPIRequest("DELETE", unassignRoleToMachineUrl, null, headers, "Unassign user role to machine", "status");
    const bValidation6: boolean = await CommonFunctions.compareTwoValues(unassignRoleToMachineResponse, 204, "Unassign role to machine success assertion");
    const deleteUserRoleUrl: string = process.env.API_BASE_URL as string + (process.env.DELETE_ROLE as string).replace("{roleId}", userRoleId);
    const deleteUserRoleResponse = await ApiUtil.processAPIRequest("DELETE", deleteUserRoleUrl, null, headers, "Delete user role", "status");
    const bValidation7: boolean = await CommonFunctions.compareTwoValues(deleteUserRoleResponse, 204, "Delete user role success assertion");
    const deleteAdminRoleUrl: string = process.env.API_BASE_URL as string + (process.env.DELETE_ROLE as string).replace("{roleId}", adminRoleId);
    const deleteAdminRoleResponse = await ApiUtil.processAPIRequest("DELETE", deleteAdminRoleUrl, null, headers, "Delete admin role", "status");
    const bValidation8: boolean = await CommonFunctions.compareTwoValues(deleteAdminRoleResponse, 204, "Delete admin role success assertion");
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8).toBeTruthy();
  });

});