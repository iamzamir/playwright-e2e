import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/fixtures';
import { getTimeout } from '../../../constants/timeouts';
import { registerScenario, SCENARIO_SEARCH_URL_PART } from '../../../util/scenario-cleanup.util';

test.describe.serial('Scenario Actions', () => {
  const childScenario = uniqueName('Scenario_Actions');
  const childScenarioEdited1 = uniqueName('Scenario_Actions_Edited');
  const description1 = `Description Edit 1_${childScenario}`;
  const baseScenarioName = uniqueName('Base_Scenario');
  let scenarioRequests: () => { authorization: string; body: string } = () => ({ authorization: '', body: '' });

  test.beforeAll(async ({ testUtil, testData, scenarioPage }) => {
    scenarioRequests = scenarioPage.trackApiRequests(SCENARIO_SEARCH_URL_PART);
    await testUtil.loginToPlanningSpaceWithProcess(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      testData.PROCESS_NAME,
    );
  });

  test('Test Case 1: Edit Base Scenario name', async ({ planningPage, scenarioPage, commonFunctions }) => {
    await planningPage.goToManageScenarios();
    await scenarioPage.waitForScenarioTable();
    const baseScenario = await scenarioPage.getBaseScenario();
    await scenarioPage.tableActionClick(baseScenario, 'Edit');
    await scenarioPage.setScenarioName(baseScenarioName);
    const validation = await commonFunctions.compareTwoValues(
      await scenarioPage.clickScenarioSaveButton(),
      true,
      `Edit Base Scenario ${baseScenarioName} Success Assertion`,
    );
    expect(validation).toBe(true);
  });

  test('Test Case 2: Create Child Scenario 1', async ({ planningPage, scenarioPage, commonFunctions, testData, createdEntities }) => {
    await scenarioPage.closeManageScenarios();
    await planningPage.selectSupplyChainProceduresAction('Create Scenario');
    // Registered before the create: a failure after submit can still leave the scenario ("not found" is a clean delete).
    registerScenario(createdEntities, childScenario, testData.PROCESS_NAME, scenarioRequests());
    await scenarioPage.createChildScenario(childScenario, `${childScenario} Description`, 'Public', 'Uncheck', true, true);

    const running = await scenarioPage.verifyAlertMsg('procedure is running');
    const success = await scenarioPage.verifyAlertMsg('success', getTimeout('EXTREME'));
    await commonFunctions.compareTwoValues(running, true, 'Verify "Create Scenario" procedure is running');
    await commonFunctions.compareTwoValues(success, true, 'Verify child scenario is created successfully');
    await planningPage.dismissAnyAlertToast();
    await planningPage.goToManageScenarios();
    const validation = await commonFunctions.compareTwoValues(
      await scenarioPage.isScenarioVisibleUnderManageScenarios(childScenario),
      true,
      `Child Scenario ${childScenario} Created Assertion`,
    );

    expect(running && success && validation).toBeTruthy();
  });

  test('Test Case 3: Edit Child Scenario', async ({ scenarioPage, commonFunctions, page, testData, createdEntities }) => {
    await scenarioPage.tableActionClick(childScenario, 'Edit');

    const validation1 = await commonFunctions.compareTwoValues(await scenarioPage.isScenarioNameFieldEnabled(), true, 'Scenario name field should be Enabled');
    const validation2 = await commonFunctions.compareTwoValues(await scenarioPage.isChildofInpFieldDisabled(), true, 'Child of field should be disabled');
    const validation3 = await commonFunctions.compareTwoValues(await scenarioPage.isDefaultCheckBoxEnabled(), false, 'Set as Default checkbox should be disabled');
    const validation4 = await commonFunctions.compareTwoValues(await scenarioPage.isPublicRadioBtnEnabled(), false, 'Public radio button should be disabled');
    const validation5 = await commonFunctions.compareTwoValues(await scenarioPage.isPrivateRadioBtnEnabled(), false, 'Private radio button should be disabled');
    const validation6 = await commonFunctions.compareTwoValues(await scenarioPage.isScenarioDescFieldEnabled(), true, 'Scenario description field should be Enabled');

    await scenarioPage.setScenarioName(childScenarioEdited1);
    await scenarioPage.setScenarioDescription(description1);
    // Registered before the save: the rename may be saved even if the save check fails ("not found" is a clean delete).
    registerScenario(createdEntities, childScenarioEdited1, testData.PROCESS_NAME, scenarioRequests());
    const validation7 = await commonFunctions.compareTwoValues(
      await scenarioPage.clickScenarioSaveButton(),
      true,
      `Edit Child Scenario ${childScenario} Success Assertion`,
    );

    // The table refreshes after the save, so wait for both new names.
    const namesUpdated = await expect.poll(async () => {
      const names = await scenarioPage.getScenarioNames();
      return names.includes(baseScenarioName) && names.includes(childScenarioEdited1);
    }, { timeout: getTimeout('LONG') }).toBe(true).then(() => true, () => false);
    const validation8 = await commonFunctions.compareTwoValues(namesUpdated, true, `Base and child scenario names are changed to ${baseScenarioName} and ${childScenarioEdited1}`);

    await scenarioPage.tableActionClick(baseScenarioName, 'Edit');
    const validation9 = await commonFunctions.compareTwoValues(
      await scenarioPage.getScenarioName(),
      baseScenarioName,
      `Base Scenario name is changed to ${baseScenarioName}`,
    );
    await scenarioPage.clickScenarioCancelButton();
    await page.keyboard.press('Escape');

    await scenarioPage.tableActionClick(childScenarioEdited1, 'Edit');
    const validation10 = await commonFunctions.compareTwoValues(
      await scenarioPage.getScenarioName(),
      childScenarioEdited1,
      `Child Scenario name is changed to ${childScenarioEdited1}`,
    );
    await scenarioPage.clickScenarioCancelButton();
    await page.keyboard.press('Escape');

    expect(
      validation1 && validation2 && validation3 && validation4 && validation5 && validation6 &&
      validation7 && validation8 && validation9 && validation10,
    ).toBe(true);
  });

  test('Test Case 4: Verify the scenario names are updated in Planning page', async ({ testUtil, scenarioPage }) => {
    await scenarioPage.closeManageScenarios();
    await testUtil.clickLeftpaneLinks('Scenarios');

    const validation1 = await scenarioPage.verifyScenarioNameInPSFilter(baseScenarioName);
    const validation2 = await scenarioPage.verifyScenarioNameInPSFilter(childScenarioEdited1);
    await scenarioPage.clickScenarioFilterCloseButton();

    expect(validation1 && validation2).toBe(true);
  });

  test('Test Case 5: Verify the scenario names are updated in childOf tree', async ({ planningPage, scenarioPage, page }) => {
    await planningPage.selectSupplyChainProceduresAction('CreateScenarioPopup');

    const validation1 = await scenarioPage.verifyScenarioNameInChildOfTree(baseScenarioName, childScenarioEdited1);
    await page.keyboard.press('Escape');
    await planningPage.closePopupModal();

    expect(validation1).toBe(true);
  });

  test.afterAll('Cleanup: delete the scenarios this file created', async ({ createdEntities }) => {
    const { failed } = await createdEntities.cleanupFile();
    expect(failed, 'Created scenarios deleted through the API').toHaveLength(0);
  });
});
