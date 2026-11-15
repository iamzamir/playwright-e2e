import PlanningSpace from '../../../pageobjects/planning.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
import CommonFunctions from '../../../util/common.util';
import scope from '../../../pageobjects/scope.page';
import scenarioPage from '../../../pageobjects/scenario.page';

const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/OnDemandMaas/Test_007_OnDemandMaasStatusSubProcess.json");

describe('Data Sync Status Verification Tests in Sub process', () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
        await PlanningSpace.launchContext('Sub-process', { process: TestData.PROCESS_NAME, subProcess: TestData.SUBPROCESS_NAME })
    });

    // it('Test Case 1: Verify Error Data Sync status in Sub Process', async () => {
    //     await PlanningSpace.launchContext('Sub-process', { process: TestData.PROCESS_NAME, subProcess: TestData.SUBPROCESS_NAME })
    //     await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
    //     const result = await PlanningSpace.verifyDataSyncStatusTest("error", "Data could");
    //     const isGlobalSaveDisabled = await PlanningSpace.verifyGlobalSaveDisabled();
    //     await CommonFunctions.compareTwoValues(isGlobalSaveDisabled, true, 'Global Save button disabled')
    //     expect(result && isGlobalSaveDisabled).toEqual(true);
    // });

    it('Test Case 2: Verify Inprogress Data Sync status in Sub process', async () => {
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
        // await browser.pause(5000);
        // const verifyScenariosInODM = await PlanningSpace.verifyDataFromMoreDetailsODM();
        // const bValidation1 = JSON.stringify(verifyScenariosInODM) === JSON.stringify([TestData.SCENARIOS]);
        // await PlanningSpace.closeMoreDetailsODM();
        // const isGlobalSaveDisabled = await PlanningSpace.verifyGlobalSaveDisabled();
        // await CommonFunctions.compareTwoValues(isGlobalSaveDisabled, true, 'Global Save button disabled')
        expect(configuredFilter).toEqual(true);
    });

    it('Test Case 3: Verify Started Data Sync status in Sub process', async () => {
        const result = await PlanningSpace.verifyDataSyncStatusTest("started", "Data is Synced", true, 10, TestData.LoGGEDIN_USER_NAME);
        const bValidation1: boolean = await ScenarioPage.verifyColumnExistsInPivotTable(['ITEM'], TestData.CARD_NAME);
        const bValidation2: boolean = await PlanningSpace.dataNotAvailableIsExist();
        await CommonFunctions.compareTwoValues(bValidation1, true, `Is ${[]} cols reflected in table`);
        const verifyAllScenariosInODM = await PlanningSpace.verifyAllScenariosInODM();
        let scenariosArray = verifyAllScenariosInODM[0].split(',').map(s => s.trim());
        const bValidation3 = JSON.stringify(scenariosArray) === JSON.stringify(TestData.SCENARIOS);
        const verifyGlobalSave = await PlanningSpace.clickGlobalSaveAndVerify();
        await CommonFunctions.compareTwoValues(verifyGlobalSave, true, 'Global Save successful');
        expect(result && (bValidation1 || bValidation2) && bValidation3 && verifyGlobalSave).toEqual(true);
    });

    it('Test Case 4: Verify show more details in Data Sync Status in Sub process', async () => {
        const result = await PlanningSpace.verifyDataSyncStatusTest("started", "Data is Synced", true, 10, TestData.LoGGEDIN_USER_NAME);
        await PlanningSpace.openMoreDetailsODM();
        const dataFromMoreDetails = await PlanningSpace.verifyDataFromMoreDetailsODM();
        let scenariosArray = dataFromMoreDetails[0].split(',').map(s => s.trim());
        const bValidation1 = JSON.stringify(scenariosArray) === JSON.stringify(TestData.SCENARIOS);
        const bValidation2 = await CommonFunctions.compareTwoValues( await PlanningSpace.verifyRunByFromMoreDetailsODM(), true, "Run By should be there in more details");
        const bValidation3 = await CommonFunctions.compareTwoValues( await PlanningSpace.verifyProcedureDetailsFromMoreDetailsODM(), true, "Procedure Details should be there in more details");
        const bValidation4 = await CommonFunctions.compareTwoValues( await PlanningSpace.verifyPlanningInstanceIdFromMoreDetailsODM(), true, "Planning Instance ID should be there in more details");
        const bValidation5 = await CommonFunctions.compareTwoValues( await PlanningSpace.verifyRunIdFromMoreDetailsODM(), true, "Run ID should be there in more details");
        const bValidation6 = await CommonFunctions.compareTwoValues( await PlanningSpace.verifyProcedureTimeFromMoreDetailsODM(), true, "Procedure Time should be there in more details");
        const bValidation7 = await CommonFunctions.compareTwoValues( await PlanningSpace.verifyScenarioIdFromMoreDetailsODM(), true, "Scenario ID should be there in more details");
        const bValidation8 = await CommonFunctions.compareTwoValues( await PlanningSpace.verifyRealmIdDataSyncStatus(TestData.REALM_ID), true, "Verify Realm ID");
        const allValidations = bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8;

        expect(allValidations).toBeTruthy();


    })

    it('Test Case 5: Close Data Sync Status more details popup in Sub process', async () => {
        const moreDetailsPopup = await PlanningSpace.closeMoreDetailsODM();

        const bValidation1 = await CommonFunctions.compareTwoValues(!moreDetailsPopup, false, "More details popup closed")

        expect(bValidation1).toBeTruthy();
    })

     it("Test Case 6: Apply Hierarchy level filter in sub-process", async() => {
            // await PlanningSpace.pinSideDrawer();
            // await browser.pause(3000);
            // to verify scenario change pop up - clicking on cancel button
            await scope.clickOnTab('Scenarios');
            const defaultScenario = await ScenarioPage.getDefaultScenarioNameFromPlanningSpace();
            await ScenarioPage.scenarioSelectandSetDetault([TestData.SCENARIO_NAME],'Check',true, false);
             // again changing default scenario
            await ScenarioPage.scenarioSelectandSetDetault([TestData.BASE_SCENARIO_NAME],'Check');
            await scope.clickOnTab('Scenarios');
            const defaultScenarioInPs = await ScenarioPage.getDefaultScenarioNameFromPlanningSpace();
            const bValidation3 = await CommonFunctions.compareTwoValues(defaultScenario, defaultScenarioInPs, "Default scenario not set successfully");
            // to verify scenario change pop up - clicking on save button
            await scope.clickOnTab('Scenarios');
            const bValidation = await ScenarioPage.scenarioSelectandSetDetault([TestData.SCENARIO_NAME],'Check', true, true);
            await browser.pause(5000);
            await scope.clickOnTab('Scenarios');
            const bValidation1: boolean = await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(TestData.SCENARIO_NAME);
            // setting base scenario as defalut scenario
            await ScenarioPage.scenarioSelectandSetDetault([TestData.BASE_SCENARIO_NAME],'Check', true, true);
            await scope.clickOnTab('Scenarios');
            // uncheck selected scenarios in scenario filter pop up
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
            await browser.pause(5000);
             await scope.clickOnTab('Scope');
            const configuredFilter : boolean = await scope.searchFilter(TestData.HIERARCHY_LEVEL_TO_APPLY_IN_SCOPE);
            await scope.clickOnApplyFiltersBtn();
            await browser.pause(5000);
            await scope.clickOnTab('Scope');
            await browser.pause(5000);
            // const configuredFilter2 = await scope.selectOptionInDimensionFilter("REGION", [ "REGION-00" ])
            // await browser.pause(20000);
            // const configSubLevelFilter = await scope.selectOptionInDimensionFilter("COUNTRY", ["CNTRY-01"])
            // await browser.pause(20000);
            // await scope.closeDrawer();
            const bValidation2 = await CommonFunctions.compareTwoValues(configuredFilter, true, "Sub level filters should be applied")
    
            // const result = await PlanningSpace.verifyDataSyncStatusTest("inprogress", "Data is currently syncing", false, 10, TestData.LoGGEDIN_USER_NAME);
            
            expect(bValidation2 && bValidation3 && bValidation && bValidation1).toBeTruthy();
        })
    
        it('Test Case 7: Verify Started Data Sync status in Hierarchy level filter in sub-process', async () => {
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
            await CommonFunctions.compareTwoValues(bValidation2, true, `Is ${[]} cols reflected in table`);
    
            expect(result && (bValidation2 || bValidation3) && bvalidation && bValidation1).toEqual(true);
        });


});
