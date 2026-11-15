import PlanningSpace from '../../../pageobjects/planning.page';
import scenarioPage from '../../../pageobjects/scenario.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
import scope from '../../../pageobjects/scope.page';
import apiUtil from '../../../util/api.util';
import CommonFunctions from '../../../util/common.util';

const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/OnDemandMaas/Test_004_OnDemandMaasStatus.json");

let planningInstanceId1;
let planningInstanceId2;
let runId1;
let runId2;

const RealmId = process.env.PSENV === 'QA' ? process.env.REALM_ID :process.env.REALM_ID_PO_PS_1 || '';
const MachineClientId = process.env.PSENV === 'QA' ? process.env.REALM_CLIENT_ID_SOURCE : process.env.REALM_CLIENT_ID_SOURCE_PO_PS_1 || '';
const MachineClientSecret = process.env.PSENV === 'QA' ? process.env.CLIENT_SECRET : process.env.CLIENT_SECRET_PO_PS_1 || '';

describe('Data Sync Status Verification Tests - Maas', () => {
    let url: string, accessToken: string, headers: Record<string, string>;
    let stopClusterUrl : string;
    let deleteCalcEngineUrl : string;
    before(async () => {
        url = process.env.API_BASE_URL as string + process.env.PLANNING_INSTANCE as string;
        stopClusterUrl = process.env.API_BASE_URL as string + process.env.RESOURCE_POOL_MANAGER as string;
        deleteCalcEngineUrl = process.env.API_BASE_URL as string + process.env.MAAS_CONFIG as string;
        accessToken = await apiUtil.getBearerToken();
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessToken
        };
    });

    // it('Test Case 1: Verify Error Data Sync status', async () => {
    //     await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, TestData.USER_NAME, TestData.PASSWORD, TestData.PROCESS_NAME);
    //     await PlanningSpace.clickViewsDropDown();
    //     await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
    //     const result = await PlanningSpace.verifyDataSyncStatusTest("error", "Data could");
    //     const isGlobalSaveDisabled = await PlanningSpace.verifyGlobalSaveDisabled();
    //     await CommonFunctions.compareTwoValues(isGlobalSaveDisabled, true, 'Global Save button disabled')
    //     expect(result && isGlobalSaveDisabled).toEqual(true);
    // });

    it('Test Case 2: Verify Inprogress Data Sync status', async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        // const filterConfigs = [
        //     { type: 'ITEM', category: 'Brand', value: ['PF-00', 'PF-10'] },
        //     { type: 'LOCATION', category: 'Country', value: ['CNTRY-01'] }
        // ];
        // const configuredFilter = await PlanningSpace.configureFilters(filterConfigs);
        // await browser.pause(20000);
        await scope.clickOnTab('Scope');
        const configuredFilter : boolean = await scope.searchFilter(TestData.FILTER_TO_APPLY_IN_SCOPE);
        await scope.clickOnApplyFiltersBtn();
        // const result = await PlanningSpace.verifyDataSyncStatusTest("inprogress", "Data is currently syncing", false, 10, TestData.LoGGEDIN_USER_NAME);
        // const verifyAllScenariosInODM = await PlanningSpace.verifyAllScenariosInODM();
        // const bvalidation = JSON.stringify(verifyAllScenariosInODM) === JSON.stringify([TestData.SCENARIOS]);
        // await PlanningSpace.openMoreDetailsODM();
        // await browser.pause(2000);
        // const verifyScenariosInODM = await PlanningSpace.verifyDataFromMoreDetailsODM();
        // const bValidation1 = JSON.stringify(verifyScenariosInODM) === JSON.stringify([TestData.SCENARIOS]);
        // await PlanningSpace.closeMoreDetailsODM();
        // const isGlobalSaveDisabled = await PlanningSpace.verifyGlobalSaveDisabled();
        // await CommonFunctions.compareTwoValues(isGlobalSaveDisabled, true, 'Global Save button disabled');
        expect(configuredFilter).toEqual(true);
        await CommonFunctions.logMessage("INFO", `Test Case 2: Verify inprogress Data Sync status completed successfully`);
    });

    it('Test Case 3: Verify Started Data Sync status', async () => {
        const result = await PlanningSpace.verifyDataSyncStatusTest("started", "Data is Synced", true, 10, TestData.LoGGEDIN_USER_NAME);
        const bValidation1: boolean = await ScenarioPage.verifyColumnExistsInPivotTable(['LOCATION'], TestData.CARD_NAME);
        const bValidation2: boolean = await PlanningSpace.dataNotAvailableIsExist();
        await CommonFunctions.compareTwoValues(bValidation1, true, `Is ${[]} cols reflected in table`);
        const verifyAllScenariosInODM = await PlanningSpace.verifyAllScenariosInODM();
        let scenariosArray = verifyAllScenariosInODM[0].split(',').map(s => s.trim());
        const bValidation3 = JSON.stringify(scenariosArray) === JSON.stringify(TestData.SCENARIOS);
        const verifyGlobalSave = await PlanningSpace.clickGlobalSaveAndVerify();
        await CommonFunctions.compareTwoValues(verifyGlobalSave, true, 'Global Save successful');
        expect(result && (bValidation1 || bValidation2) && bValidation3 && verifyGlobalSave).toEqual(true);
        await CommonFunctions.logMessage("INFO", `Test Case 3: Verify Started Data Sync status completed successfully`);
    });

    it('Test Case 4: Verify show more details in Data Sync Status', async () => {
        const result = await PlanningSpace.verifyDataSyncStatusTest("started", "Data is Synced", true, 10, TestData.LoGGEDIN_USER_NAME);
        await PlanningSpace.openMoreDetailsODM();
        const dataFromMoreDetails = await PlanningSpace.verifyDataFromMoreDetailsODM();
        let scenariosArray = dataFromMoreDetails[0].split(',').map(s => s.trim());
        const bValidation1 = JSON.stringify(scenariosArray) === JSON.stringify(TestData.SCENARIOS);
        const planningInstanceId = await PlanningSpace.getPlanningInstanceId();
        url = process.env.API_BASE_URL as string + process.env.PLANNING_INSTANCE as string + `/${planningInstanceId}`;
        const response = await apiUtil.processAPIRequest("GET", url, null, headers, "Fetching calc engine id", "full");
        const bvalidation = await CommonFunctions.compareTwoValues(response.status, "200", "Get All Resources Success Assertion");
        const calcEngineId = response?.data?.engineContext?.maas?.customAttributes?.CALC_ENGINE_ID;
        const bValidation2 = await CommonFunctions.compareTwoValues( await PlanningSpace.verifyRunByFromMoreDetailsODM(), true, "Run By should be there in more details");
        const bValidation3 = await CommonFunctions.compareTwoValues( await PlanningSpace.verifyProcedureDetailsFromMoreDetailsODM(), true, "Procedure Details should be there in more details");
        const bValidation4 = await CommonFunctions.compareTwoValues( await PlanningSpace.verifyPlanningInstanceIdFromMoreDetailsODM(), true, "Planning Instance ID should be there in more details");
        planningInstanceId1 = await PlanningSpace.getPlanningInstanceIdFromMoreDetailsODM();
        const bValidation5 = await CommonFunctions.compareTwoValues( await PlanningSpace.verifyRunIdFromMoreDetailsODM(), true, "Run ID should be there in more details");
        runId1 = await PlanningSpace.getRunIdFromMoreDetailsODM();
        const bValidation6 = await CommonFunctions.compareTwoValues( await PlanningSpace.verifyProcedureTimeFromMoreDetailsODM(), true, "Procedure Time should be there in more details");
        const bValidation7 = await CommonFunctions.compareTwoValues( await PlanningSpace.verifyScenarioIdFromMoreDetailsODM(), true, "Scenario ID should be there in more details");
        const bValidation8 = await CommonFunctions.compareTwoValues( await PlanningSpace.verifyRealmIdDataSyncStatus(TestData.REALM_ID), true, "Verify Realm ID");
        stopClusterUrl = stopClusterUrl + `/${calcEngineId}/stopCluster`
        const stopClusterResponse = await apiUtil.processAPIRequest("POST", stopClusterUrl, null, headers, "Stopping Cluster", "full");
        const stopClusterValidation = await CommonFunctions.compareTwoValues(stopClusterResponse.status, "202", "Stop Cluster Success Assertion");
        await PlanningSpace.TroubleShootClick();
        const bValidation9 = await CommonFunctions.verifyAlertMsg('Troubleshooting now and preparing a fix');
        const bValidation10 = await CommonFunctions.verifyAlertMsg("Troubleshooting complete - everything’s back to normal", 500000);
        // deleteCalcEngineUrl = deleteCalcEngineUrl + `/${calcEngineId}`
        // const deleteCalcEngineResponse = await apiUtil.processAPIRequest("DELETE", deleteCalcEngineUrl, null, headers, "Deleting Calc Engine", "full");
        // const deleteCalcEngineValidation = await CommonFunctions.compareTwoValues(deleteCalcEngineResponse.status, "200", "Delete Calc Engine Success Assertion");
        // await PlanningSpace.verifyDataSyncStatusTest("started", "Data is Synced", true, 10, TestData.LoGGEDIN_USER_NAME);
        // await PlanningSpace.openMoreDetailsODM();
        // await PlanningSpace.TroubleShootClick();
        // await browser.pause(5000);
        // const bValidation11 = await CommonFunctions.verifyAlertMsg('Troubleshooting ended without a resolution - problem still remains');
        // const result1 = await PlanningSpace.verifyDataSyncStatusTest("error", "Data could");
        // await PlanningSpace.RestartSession();
        // const bValidation12 = await CommonFunctions.verifyAlertMsg('onDemandMaasCluster procedure is running.');
        const clusterStatusUrl = process.env.API_BASE_URL as string + process.env.RESOURCE_POOL_MANAGER as string + `/${calcEngineId}/status`;
        const clusterStatus = await apiUtil.processAPIRequest("GET", clusterStatusUrl, null, headers, "Fetching calc engine id", "full");
        const bValidation11 = await CommonFunctions.compareTwoValues(clusterStatus?.data?.overallStatus, "STARTED", "Cluster Stopped Assertion");
        const allValidations = bvalidation && bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation9 && bValidation10  && stopClusterValidation && bValidation11;
        expect(result && allValidations).toBeTruthy();
    });

    it("Test Case 6: Apply Hierarchy level filter", async() => {
        // await PlanningSpace.pinSideDrawer();
        // await browser.pause(3000);
        // to verify scenario change pop up - clicking on cancel button
        await scope.clickOnTab('Scenarios');
        const defaultScenario = await ScenarioPage.getDefaultScenarioNameFromPlanningSpace();
        await ScenarioPage.scenarioSelectandSetDetault([TestData.SCENARIO_NAME],'Check',true,false);
        // again changing default scenario
        await ScenarioPage.scenarioSelectandSetDetault([TestData.BASE_SCENARIO_NAME],'Check');
        await scope.clickOnTab('Scenarios');
        const defaultScenarioInPs = await ScenarioPage.getDefaultScenarioNameFromPlanningSpace();
        const bValidation3 = await CommonFunctions.compareTwoValues(defaultScenario, defaultScenarioInPs, "Default scenario not set successfully");
        // to verify scenario change pop up - clicking on save button
        await scope.clickOnTab('Scenarios');
        const bValidation = await ScenarioPage.scenarioSelectandSetDetault([TestData.SCENARIO_NAME],'Check', true, true);
        await scope.clickOnTab('Scenarios');
        const bValidation1: boolean = await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(TestData.SCENARIO_NAME);
        // setting base scenario as defalut scenario
        await ScenarioPage.scenarioSelectandSetDetault([TestData.BASE_SCENARIO_NAME],'Check',true,true);
        await scope.clickOnTab('Scenarios');
        // unchecking the selected scenarios except base scenario
        await scenarioPage.scenarioSelect([TestData.SCENARIO_NAME], 'Uncheck');
        await scenarioPage.applyBtn.click();
        // const filterConfigs1 = [
        //     { type: 'ITEM', category: 'Brand', value: ['PF-00', 'PF-10'] },
        //     {type: 'LOCATION', category: 'Region', value: ['REGION-00']},
        //     { type: 'LOCATION', category: 'Country', value: ['CNTRY-01'] }
        // ];
        // const configuredFilter1 = await PlanningSpace.configureFilters(filterConfigs1);
        // await browser.pause(20000);
        // await scope.enableRelaventFilter('LOCATION')
        await browser.pause(3000);
        await scope.clickOnTab('Scope');
        const configuredFilter : boolean = await scope.searchFilter(TestData.HIERARCHY_LEVEL_TO_APPLY_IN_SCOPE);
        await scope.clickOnApplyFiltersBtn();
        await browser.pause(5000);
        await scope.clickOnTab('Scope');
        await browser.pause(5000);
        expect(configuredFilter && bValidation3 && bValidation1 && bValidation).toBeTruthy();
        await CommonFunctions.logMessage("INFO", `Test Case 6: Applied Hierarchy level filter successfully`);
    })

    it('Test Case 7: Verify Started Data Sync status in Hierarchy level filter', async () => {
        const result = await PlanningSpace.verifyDataSyncStatusTest("started", "Data is Synced", true, 10, TestData.LoGGEDIN_USER_NAME);
        const verifyAllScenariosInODM = await PlanningSpace.verifyAllScenariosInODM();
        let scenariosArray = verifyAllScenariosInODM[0].split(',').map(s => s.trim());
        const bvalidation = JSON.stringify(scenariosArray) === JSON.stringify(TestData.SCENARIOS);
        await PlanningSpace.openMoreDetailsODM();
        await browser.pause(5000);
        const verifyScenariosInODM = await PlanningSpace.verifyDataFromMoreDetailsODM();
        let scenariosInODM = verifyScenariosInODM[0].split(',').map(s => s.trim());
        const bValidation1 = JSON.stringify(scenariosInODM) === JSON.stringify(TestData.SCENARIOS);
        await PlanningSpace.closeMoreDetailsODM();
        const bValidation2: boolean = await ScenarioPage.verifyColumnExistsInPivotTable(['LOCATION'], TestData.CARD_NAME);
        const bValidation3: boolean = await PlanningSpace.dataNotAvailableIsExist();
        await CommonFunctions.compareTwoValues(bValidation1, true, `Is ${[]} cols reflected in table`);
        expect(result && (bValidation2 || bValidation3) && bValidation1 && bvalidation).toEqual(true);
    });

    it('Test Case 8: Navigate to another interactive view with same filter', async () =>{
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.ANOTHER_VIEW_NAME);
        await browser.pause(3000);
        // const filterConfigs1 = [
        //     { type: 'ITEM', category: 'Brand', value: ['PF-00', 'PF-10'] },
        //     {type: 'LOCATION', category: 'Region', value: ['REGION-00']},
        //     { type: 'LOCATION', category: 'Country', value: ['CNTRY-01'] }
        // ];
        // const configuredFilter1 = await PlanningSpace.configureFilters(filterConfigs1);
        // await browser.pause(20000);
        // await scope.enableRelaventFilter('LOCATION')
        await scope.clickOnTab('Scope');
        const configuredFilter : boolean = await scope.searchFilter(TestData.HIERARCHY_LEVEL_TO_APPLY_IN_SCOPE);
        await scope.clickOnApplyFiltersBtn();
        await browser.pause(5000);
        await scope.clickOnTab('Scope');
        await browser.pause(5000);
        // const configSubLevelFilter = await scope.selectOptionInDimensionFilter("COUNTRY", ["CNTRY-01"])
        // await browser.pause(20000);
        // const configuredFilter2 = await scope.selectOptionInDimensionFilter("REGION", [ "REGION-00" ])
        // await browser.pause(20000);
        expect(configuredFilter).toBeTruthy();
    })

    it('Test Case 9: Verify Started Data Sync status in another view', async () => {
        const result = await PlanningSpace.verifyDataSyncStatusTest("started", "Data is Synced", true, 10, TestData.LoGGEDIN_USER_NAME);
        const verifyAllScenariosInODM = await PlanningSpace.verifyAllScenariosInODM();
        let scenariosArray = verifyAllScenariosInODM[0].split(',').map(s => s.trim());
        const bvalidation = JSON.stringify(scenariosArray) === JSON.stringify(TestData.SCENARIOS);
        await PlanningSpace.openMoreDetailsODM();
        await browser.pause(5000);
        const verifyScenariosInODM = await PlanningSpace.verifyDataFromMoreDetailsODM();
        let scenariosInODM = verifyScenariosInODM[0].split(',').map(s => s.trim());
        const bValidation1 = JSON.stringify(scenariosInODM) === JSON.stringify(TestData.SCENARIOS);
        await PlanningSpace.closeMoreDetailsODM();
        const bValidation2: boolean = await ScenarioPage.verifyColumnExistsInPivotTable(['LOCATION'], TestData.CARD_NAME);
        await browser.pause(5000);
        const bValidation3: boolean = await PlanningSpace.dataNotAvailableIsExist();
        await CommonFunctions.compareTwoValues(bValidation2, true, `Is ${[]} cols reflected in table`);
        expect(result && (bValidation2 || bValidation3) && bvalidation && bValidation1).toEqual(true);
    });

    it('Test Case 10: Verify show more details in Data Sync Status', async () => {
        const result = await PlanningSpace.verifyDataSyncStatusTest("started", "Data is Synced", true, 10, TestData.LoGGEDIN_USER_NAME);
        await PlanningSpace.openMoreDetailsODM();
        const dataFromMoreDetails = await PlanningSpace.verifyDataFromMoreDetailsODM();
        let scenariosArray = dataFromMoreDetails[0].split(',').map(s => s.trim());
        const bValidation1 = JSON.stringify(scenariosArray) === JSON.stringify(TestData.SCENARIOS);
        const bValidation2 = await CommonFunctions.compareTwoValues( await PlanningSpace.verifyRunByFromMoreDetailsODM(), true, "Run By should be there in more details");
        const bValidation3 = await CommonFunctions.compareTwoValues( await PlanningSpace.verifyProcedureDetailsFromMoreDetailsODM(), true, "Procedure Details should be there in more details");
        const bValidation4 = await CommonFunctions.compareTwoValues( await PlanningSpace.verifyPlanningInstanceIdFromMoreDetailsODM(), true, "Planning Instance ID should be there in more details");
        planningInstanceId2 = await PlanningSpace.getPlanningInstanceIdFromMoreDetailsODM();
        const bValidation5 = await CommonFunctions.compareTwoValues( await PlanningSpace.verifyRunIdFromMoreDetailsODM(), true, "Run ID should be there in more details");
        runId2 = await PlanningSpace.getRunIdFromMoreDetailsODM();
        const bValidation6 = await CommonFunctions.compareTwoValues( await PlanningSpace.verifyProcedureTimeFromMoreDetailsODM(), true, "Procedure Time should be there in more details");
        const bValidation7 = await CommonFunctions.compareTwoValues( await PlanningSpace.verifyScenarioIdFromMoreDetailsODM(), true, "Scenario ID should be there in more details");
        const bValidation8 = await CommonFunctions.compareTwoValues( await PlanningSpace.verifyRealmIdDataSyncStatus(TestData.REALM_ID), true, "Verify Realm ID");
        const allValidations = bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8;
        expect(result && allValidations).toBeTruthy();
    })

    it("Test Case 11: Verify planning instanceId and run ID in both views", async () => {
        const bValidation1 = await CommonFunctions.compareTwoValues(planningInstanceId1, planningInstanceId2, "The planning instanceId of the two views should be same");
        const bValidation2 = await CommonFunctions.compareTwoValues(runId1, runId2, "The run ID of the two views should be same")

        expect(bValidation1 && bValidation2).toBeTruthy();

    })

    it('Test Case 5: Close Data Sync Status more details popup ', async () => {
        const moreDetailsPopup = await PlanningSpace.closeMoreDetailsODM();
        const bValidation1 = await CommonFunctions.compareTwoValues(!moreDetailsPopup, false, "More details popup closed")
        expect(bValidation1).toBeTruthy();
    })

    it("Test Case 12: Verify Procedure details navigation", async () => {
        const initialTabs = await browser.getWindowHandles();
        await PlanningSpace.navigateToProcedureDetailsODM();
        const newTabs = await browser.getWindowHandles();
        await CommonFunctions.switchToSpecificWindow(1);
        const areTabsMatched = await CommonFunctions.compareTwoValues(newTabs.length, initialTabs.length + 1, "New tab should be opened for Observability");
        const url = await browser.getUrl();
        const isURLContainsProcedureExecutions = await CommonFunctions.compareTwoValues(url.includes("procedureExecutions"), true, "New tab URL should contain 'procedureExecutions'");
        expect(areTabsMatched && isURLContainsProcedureExecutions).toBeTruthy();
    });
});
