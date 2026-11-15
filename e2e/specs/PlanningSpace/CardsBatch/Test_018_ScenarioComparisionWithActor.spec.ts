import cardsPage from "../../../pageobjects/cards.page";
import GlobalSettings from "../../../pageobjects/global-settings.page";
import planningPage from "../../../pageobjects/planning.page";
import PlanningSpace from "../../../pageobjects/planning.page";
import scenarioPage from "../../../pageobjects/scenario.page";
import scopePage from "../../../pageobjects/scope.page";
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/CardsBatch/Test_018_ScenarioComparisionWithActor.json");

const cardTitle = 'scenario comparison with Actors';


describe('Should edit & Configure Scenario Comparision card with Actor', async () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await browser.pause(5000);
        await PlanningSpace.clickViewsDropDown();
        // await PlanningSpace.selectAllViewsOrFavourites("All Views")
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME)
    });

    it('Test Case 1: Should check if card exists', async () => {
        await browser.pause(5000);
        await CommonFunctions.logMessage('INFO', 'Starting Test Case 1: Should check if card exists');
        const bValidation1: boolean = await PlanningSpace.verifyCardafterSavingDashboard(cardTitle, TestData.VIEW_NAME);
        await CommonFunctions.compareTwoValues(bValidation1, true, `Does card with title ${cardTitle} available in ${TestData.VIEW_NAME} Page`);
        expect(bValidation1).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 1 Card Exists: ' + bValidation1);
    });
    it('Test case 2: Verify Something went wrong', async () => {
        await browser.pause(5000);
        await PlanningSpace.navToProcessOrchestration();
        await browser.pause(5000);
        await GlobalSettings.clickGlobalSettings();
        await GlobalSettings.clickGlobalSettingsListMenu('Planning Views');
        await GlobalSettings.planningViewSearch(TestData.VIEW_NAME);
        await GlobalSettings.removeDataSetupConfiguration();
        await CommonFunctions.switchToSpecificWindow(0);
        await browser.refresh();
        await browser.pause(5000);
        await PlanningSpace.switchToMfe();
        const bValidation = await PlanningSpace.verifySomethingWentWrongInSCCard();
        await CommonFunctions.compareTwoValues(bValidation, true, `Error message displayed in card`);
        expect(bValidation).toBeTruthy();
    })
    it("Test Case 3: Verify Graph is Visible", async () => {
        await CommonFunctions.switchToSpecificWindow(1);
        await PlanningSpace.switchToMfe();
        await GlobalSettings.AddDataSetupConfig(TestData.VIEW_NAME, TestData.ACTORS_PROCEDURE1);
        await CommonFunctions.switchToSpecificWindow(0);
        await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
        await PlanningSpace.switchToMFEFrame();
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        const isGraphVisible = await PlanningSpace.verifySCGraphInCard(cardTitle);
        await CommonFunctions.compareTwoValues(isGraphVisible, true, `Graph should be visible in the card titled '${cardTitle}'`);
        expect(isGraphVisible).toBe(true);
    });
    it('Test Case 4: Validate Scenarios', async () => {
        const bValidation1: boolean = await scopePage.clickOnTab('Scenarios');
        await CommonFunctions.compareTwoValues(bValidation1, true, `Clicked on scenario tab`);
        const bValidation2: boolean = await scenarioPage.scenarioSelect([TestData.SCENARIO_TO_APPLY_IN_SCENARIOS], 'Check');
        await CommonFunctions.compareTwoValues(bValidation2, true, `Is ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS} checked`)
        const bValidation3: boolean = await scenarioPage.verifySCselectedScenario(TestData.SCENARIO_TO_APPLY_IN_SCENARIOS); 
        await CommonFunctions.compareTwoValues(bValidation3, true, `Is ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS} selected in card`);
        await scopePage.closeDrawer();
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    })

    it('Test Case 5: Open edit card configuration and add custom actions', async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME)
        const bValidation2: boolean = await PlanningSpace.clickEditBtn();
        await CommonFunctions.compareTwoValues(bValidation2,true,`Clicked on edit icon in ${TestData.VIEW_NAME} view`);
        await planningPage.openCardSettings(cardTitle);
        const bValidation3: boolean = await cardsPage.addCustomActions();
        await CommonFunctions.compareTwoValues(bValidation3,true,`Custom actions added to ${cardTitle} card`);
        expect(bValidation2 && bValidation3).toBeTruthy();    
    });

    it('Test Case 6: Add Subscription event and publish scenario', async () => {
        const bValidation1: boolean = await cardsPage.addSubscriptionEvent(cardTitle);
        await CommonFunctions.compareTwoValues(bValidation1,true,`Subscription event added to ${cardTitle} card`);  
        await planningPage.saveCardInView();
        await planningPage.clickRefreshBtn();
        const bValidation2: boolean = await cardsPage.publishScenarioAction();
        await CommonFunctions.compareTwoValues(bValidation2,true,`publish scenario ${cardTitle} card`);  
        const bValidation3: boolean = await CommonFunctions.verifyAlertMsg('Publish Scenario procedure completed successfully', 60000);
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();   
    });

    it('Test Case 7: Delete subscription event', async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        const bValidation1: boolean = await PlanningSpace.clickEditBtn();
        await CommonFunctions.compareTwoValues(bValidation1,true,`Clicked on edit icon in ${TestData.VIEW_NAME} view`);
        const bValidation2 = await planningPage.deleteSubscription(cardTitle);
        await CommonFunctions.compareTwoValues(!bValidation2,true,`Subscription event deleted to ${cardTitle} card`);  
        expect(bValidation1 && !bValidation2).toBeTruthy(); 
    });

     it('Test Case 8: verify delta values and trending up/down with default settings', async () => {
        const bValidation1 = await cardsPage.openMeasureWeightageTargetSettings(cardTitle);
        await CommonFunctions.compareTwoValues(bValidation1,true,`Clicked on measure weightage and target settings in ${cardTitle} card`);
        const rankedScenarios = await cardsPage.rankingScenariosCalculation();
        const bValidation2 = await cardsPage.verifyScenariosRanking(rankedScenarios);
        await CommonFunctions.compareTwoValues(bValidation2,true,`Verified scenario rankings in ${cardTitle} card`);
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

    it('Test Case 9: verify delta values and trending up/down with custom settings', async () => {
        const bValidation1 = await cardsPage.openMeasureWeightageTargetSettings(cardTitle);
        await CommonFunctions.compareTwoValues(bValidation1,true,`Clicked on measure weightage and target settings in ${cardTitle} card`);
        await cardsPage.updateMeasureWeightageTarget();
        const rankedScenarios = await cardsPage.rankingScenariosCalculation();
        const bValidation2 = await cardsPage.verifyScenariosRanking(rankedScenarios);
        await CommonFunctions.compareTwoValues(bValidation2,true,`Verified scenario rankings in ${cardTitle} card`);
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

    it('Test Case 10: Reset measure settings to default target and weightage', async () => {
        await planningPage.clickRefreshBtn();
        const bValidation1 = await cardsPage.resetMeasureWeightageTargetToDefault(cardTitle);
        await CommonFunctions.compareTwoValues(bValidation1,true,`Clicked on reset measure weightage and target settings in ${cardTitle} card`);
        const bValidation2 = await cardsPage.openMeasureWeightageTargetSettings(cardTitle);
        await CommonFunctions.compareTwoValues(bValidation2,true,`Clicked on measure weightage and target settings in ${cardTitle} card`);
        const rankedScenarios = await cardsPage.rankingScenariosCalculation();
        const bValidation3 = await cardsPage.verifyScenariosRanking(rankedScenarios);
        await CommonFunctions.compareTwoValues(bValidation3,true,`Verified scenario rankings in ${cardTitle} card`);
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it('Test Case 11: Changing the orientation of a measure to higher the negative and lesser the positive', async () => {
        const bValidation1: boolean = await PlanningSpace.clickEditBtn();
        await CommonFunctions.compareTwoValues(bValidation1,true,`Clicked on edit icon in ${TestData.VIEW_NAME} view`);
        await planningPage.openCardSettings(cardTitle);
        const measureOrientations = await cardsPage.updateNegativeOrientationToMeasure();
        await planningPage.saveCardInView();
        const bValidation2 = await cardsPage.openMeasureWeightageTargetSettings(cardTitle);
        await CommonFunctions.compareTwoValues(bValidation2,true,`Clicked on measure weightage and target settings in ${cardTitle} card`);
        const rankedScenarios = await cardsPage.rankingScenariosCalculation(measureOrientations);
        const bValidation3 = await cardsPage.verifyScenariosRanking(rankedScenarios);
        await CommonFunctions.compareTwoValues(bValidation3,true,`Verified scenario rankings in ${cardTitle} card`);
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it('Test Case 12: Changing the orientation of a measure to lesser the negative and higher the positive', async () => {
        const bValidation1: boolean = await PlanningSpace.clickEditBtn();
        await CommonFunctions.compareTwoValues(bValidation1,true,`Clicked on edit icon in ${TestData.VIEW_NAME} view`);
        await planningPage.openCardSettings(cardTitle);
        const measureOrientations = await cardsPage.updatePositiveOrientationToMeasure();
        await planningPage.saveCardInView();
        const bValidation2 = await cardsPage.openMeasureWeightageTargetSettings(cardTitle);
        await CommonFunctions.compareTwoValues(bValidation2,true,`Clicked on measure weightage and target settings in ${cardTitle} card`);
        const rankedScenarios = await cardsPage.rankingScenariosCalculation(measureOrientations);
        const bValidation3 = await cardsPage.verifyScenariosRanking(rankedScenarios);
        await CommonFunctions.compareTwoValues(bValidation3,true,`Verified scenario rankings in ${cardTitle} card`);
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it('Test Case 13: Switch toggle to hide graphical View', async () => {
        const bValidation1: boolean = await cardsPage.verifyHideGraphicalViewOnToggle(cardTitle,TestData.SCENARIO_TO_APPLY_IN_SCENARIOS);
        await CommonFunctions.compareTwoValues(bValidation1,true,`Hide chart for the ${cardTitle} card`);  
        expect(bValidation1).toBeTruthy();
    });
    
    it(`Test Case 14: Reset`, async () => {
        const bValidation1: boolean = await scopePage.clickOnTab('Scenarios');
        await CommonFunctions.compareTwoValues(bValidation1, true, `Clicked on scenario tab`);
        const bValidation2: boolean = await scenarioPage.scenarioSelect([TestData.SCENARIO_TO_APPLY_IN_SCENARIOS], 'Uncheck');
        await CommonFunctions.compareTwoValues(bValidation2, true, `unselected ${TestData.SCENARIO_TO_APPLY_IN_SCENARIOS}`);
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

})