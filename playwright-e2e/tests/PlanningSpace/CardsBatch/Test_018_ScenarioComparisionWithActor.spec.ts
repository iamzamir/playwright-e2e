import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';

const cardTitle = 'scenario comparison with Actors';

test.describe.serial('Should edit & Configure Scenario Comparision card with Actor', () => {
  test.beforeAll(async ({ testUtil, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);
  });

  test('Test Case 1: Should check if card exists', async ({ cardsPage, planningPage, commonFunctions, testData }) => {
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    const bValidation1: boolean = await cardsPage.verifyCardAfterSavingDashboard(cardTitle, testData.VIEW_NAME);
    await commonFunctions.compareTwoValues(bValidation1, true, `Does card with title ${cardTitle} available in ${testData.VIEW_NAME} Page`);
    expect(bValidation1).toBeTruthy();
  });

  test('Test case 2: Verify Something went wrong', async ({ cardsPage, planningPage, globalSettingsPage, commonFunctions, testData, testUtil }) => {
    await planningPage.clickOnListingIcon();
    await planningPage.goToPOListingPageAndVerify();
    await globalSettingsPage.clickGlobalSettings();
    await globalSettingsPage.clickGlobalSettingsListMenu('Planning Views');
    await globalSettingsPage.planningViewSearch(testData.VIEW_NAME);
    await globalSettingsPage.removeDataSetupConfiguration(testData.VIEW_NAME);
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    const bValidation = await cardsPage.verifySomethingWentWrongInCard(cardTitle);
    await commonFunctions.compareTwoValues(bValidation, true, 'Error message displayed in card');
    expect(bValidation).toBeTruthy();
  });

  test('Test Case 3: Verify Graph is Visible', async ({ cardsPage, planningPage, globalSettingsPage, commonFunctions, testData, testUtil }) => {
    await planningPage.clickOnListingIcon();
    await planningPage.goToPOListingPageAndVerify();
    await globalSettingsPage.clickGlobalSettings();
    await globalSettingsPage.clickGlobalSettingsListMenu('Planning Views');
    await globalSettingsPage.AddDataSetupConfig(testData.VIEW_NAME, testData.ACTORS_PROCEDURE1);
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    const isGraphVisible = await cardsPage.verifyGraphInCard(cardTitle);
    await commonFunctions.compareTwoValues(isGraphVisible, true, `Graph should be visible in the card titled '${cardTitle}'`);
    expect(isGraphVisible).toBe(true);
  });

  test('Test Case 4: Validate Scenarios', async ({ planningPage, scenarioPage, commonFunctions, testData }) => {
    const bValidation1: boolean = await planningPage.openComponent('Scenarios');
    await commonFunctions.compareTwoValues(bValidation1, true, 'Clicked on scenario tab');
    const bValidation2: boolean = await scenarioPage.scenarioSelect([testData.SCENARIO_TO_APPLY_IN_SCENARIOS], 'Check');
    await commonFunctions.compareTwoValues(bValidation2, true, `Is ${testData.SCENARIO_TO_APPLY_IN_SCENARIOS} checked`);
    const bValidation3: boolean = await scenarioPage.verifySCselectedScenario(testData.SCENARIO_TO_APPLY_IN_SCENARIOS);
    await commonFunctions.compareTwoValues(bValidation3, true, `Is ${testData.SCENARIO_TO_APPLY_IN_SCENARIOS} selected in card`);
    await planningPage.closeDrawer();
    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 5: Open edit card configuration and add custom actions', async ({ planningPage, cardsPage, commonFunctions, testData }) => {
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    const bValidation2: boolean = await cardsPage.clickEditView();
    await commonFunctions.compareTwoValues(bValidation2, true, `Clicked on edit icon in ${testData.VIEW_NAME} view`);
    await cardsPage.openCardSettings(cardTitle);
    const bValidation3: boolean = await cardsPage.addCustomActions();
    await commonFunctions.compareTwoValues(bValidation3, true, `Custom actions added to ${cardTitle} card`);
    expect(bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 6: Add Subscription event and publish scenario', async ({ cardsPage, commonFunctions }) => {
    const bValidation1: boolean = await cardsPage.addSubscriptionEvent(cardTitle);
    await commonFunctions.compareTwoValues(bValidation1, true, `Subscription event added to ${cardTitle} card`);
    await cardsPage.saveCardInView();
    const bValidation2: boolean = await cardsPage.publishScenarioAction();
    await commonFunctions.compareTwoValues(bValidation2, true, `publish scenario ${cardTitle} card`);
    const bValidation3: boolean = await cardsPage.verifyAlertMsg('Publish Scenario procedure completed successfully', getTimeout('EXTREME'));
    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 7: Delete subscription event', async ({ planningPage, cardsPage, commonFunctions, testData }) => {
    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    const bValidation1: boolean = await cardsPage.clickEditView();
    await commonFunctions.compareTwoValues(bValidation1, true, `Clicked on edit icon in ${testData.VIEW_NAME} view`);
    const bValidation2 = await cardsPage.deleteSubscription(cardTitle);
    await commonFunctions.compareTwoValues(bValidation2, true, `Subscription event deleted from ${cardTitle} card`);
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 8: verify delta values and trending up/down with default settings', async ({ cardsPage, commonFunctions }) => {
    const bValidation1 = await cardsPage.openMeasureWeightageTargetSettings(cardTitle);
    await commonFunctions.compareTwoValues(bValidation1, true, `Clicked on measure weightage and target settings in ${cardTitle} card`);
    const rankedScenarios = await cardsPage.rankingScenariosCalculation();
    const bValidation2 = await cardsPage.verifyScenariosRanking(rankedScenarios);
    await commonFunctions.compareTwoValues(bValidation2, true, `Verified scenario rankings in ${cardTitle} card`);
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 9: verify delta values and trending up/down with custom settings', async ({ cardsPage, commonFunctions }) => {
    const bValidation1 = await cardsPage.openMeasureWeightageTargetSettings(cardTitle);
    await commonFunctions.compareTwoValues(bValidation1, true, `Clicked on measure weightage and target settings in ${cardTitle} card`);
    await cardsPage.updateMeasureWeightageTarget();
    const rankedScenarios = await cardsPage.rankingScenariosCalculation();
    const bValidation2 = await cardsPage.verifyScenariosRanking(rankedScenarios);
    await commonFunctions.compareTwoValues(bValidation2, true, `Verified scenario rankings in ${cardTitle} card`);
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 10: Reset measure settings to default target and weightage', async ({ cardsPage, commonFunctions, page }) => {
    await page.reload();
    const bValidation1 = await cardsPage.resetMeasureWeightageTargetToDefault(cardTitle);
    await commonFunctions.compareTwoValues(bValidation1, true, `Clicked on reset measure weightage and target settings in ${cardTitle} card`);
    const bValidation2 = await cardsPage.openMeasureWeightageTargetSettings(cardTitle);
    await commonFunctions.compareTwoValues(bValidation2, true, `Clicked on measure weightage and target settings in ${cardTitle} card`);
    const rankedScenarios = await cardsPage.rankingScenariosCalculation();
    const bValidation3 = await cardsPage.verifyScenariosRanking(rankedScenarios);
    await commonFunctions.compareTwoValues(bValidation3, true, `Verified scenario rankings in ${cardTitle} card`);
    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 11: Changing the orientation of a measure to higher the negative and lesser the positive', async ({ cardsPage, commonFunctions, testData }) => {
    const bValidation1: boolean = await cardsPage.clickEditView();
    await commonFunctions.compareTwoValues(bValidation1, true, `Clicked on edit icon in ${testData.VIEW_NAME} view`);
    await cardsPage.openCardSettings(cardTitle);
    const measureOrientations = await cardsPage.updateNegativeOrientationToMeasure();
    await cardsPage.saveCardInView();
    const bValidation2 = await cardsPage.openMeasureWeightageTargetSettings(cardTitle);
    await commonFunctions.compareTwoValues(bValidation2, true, `Clicked on measure weightage and target settings in ${cardTitle} card`);
    const rankedScenarios = await cardsPage.rankingScenariosCalculation(measureOrientations);
    const bValidation3 = await cardsPage.verifyScenariosRanking(rankedScenarios);
    await commonFunctions.compareTwoValues(bValidation3, true, `Verified scenario rankings in ${cardTitle} card`);
    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 12: Changing the orientation of a measure to lesser the negative and higher the positive', async ({ cardsPage, commonFunctions, testData }) => {
    const bValidation1: boolean = await cardsPage.clickEditView();
    await commonFunctions.compareTwoValues(bValidation1, true, `Clicked on edit icon in ${testData.VIEW_NAME} view`);
    await cardsPage.openCardSettings(cardTitle);
    const measureOrientations = await cardsPage.updatePositiveOrientationToMeasure();
    await cardsPage.saveCardInView();
    const bValidation2 = await cardsPage.openMeasureWeightageTargetSettings(cardTitle);
    await commonFunctions.compareTwoValues(bValidation2, true, `Clicked on measure weightage and target settings in ${cardTitle} card`);
    const rankedScenarios = await cardsPage.rankingScenariosCalculation(measureOrientations);
    const bValidation3 = await cardsPage.verifyScenariosRanking(rankedScenarios);
    await commonFunctions.compareTwoValues(bValidation3, true, `Verified scenario rankings in ${cardTitle} card`);
    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 13: Switch toggle to hide graphical View', async ({ cardsPage, commonFunctions, testData }) => {
    const bValidation1: boolean = await cardsPage.verifyHideGraphicalViewOnToggle(cardTitle, testData.SCENARIO_TO_APPLY_IN_SCENARIOS);
    await commonFunctions.compareTwoValues(bValidation1, true, `Hide chart for the ${cardTitle} card`);
    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 14: Reset', async ({ planningPage, scenarioPage, commonFunctions, testData }) => {
    const bValidation1: boolean = await planningPage.openComponent('Scenarios');
    await commonFunctions.compareTwoValues(bValidation1, true, 'Clicked on scenario tab');
    const bValidation2: boolean = await scenarioPage.scenarioSelect([testData.SCENARIO_TO_APPLY_IN_SCENARIOS], 'Uncheck');
    await commonFunctions.compareTwoValues(bValidation2, true, `unselected ${testData.SCENARIO_TO_APPLY_IN_SCENARIOS}`);
    expect(bValidation1 && bValidation2).toBeTruthy();
  });
});
