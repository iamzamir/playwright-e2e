import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Tests for Create Lane procedure through card cell', () => {
  test.beforeAll(async ({ testUtil, planningPage, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await planningPage.clickViewDropdown();
    await planningPage.selectViewType('All Views');
    await planningPage.selectView(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);
  });

  test('Test Case 1: Start SPARQ Engine if it is down then open Create Lane popup modal through Piechart card cell', async ({ planningPage, scaPage, commonFunctions, testData, page }) => {
    await page.waitForTimeout(5000);
    await planningPage.performCardCellMoreActions('PieChart', 'testing-point-id-47', 'Create Lane');
    const isSparqEngineDown = await scaPage.isSparqEngineDown();
    await commonFunctions.logMessage('INFO', `Is SPARQ engine down: ${isSparqEngineDown}`);

    if (isSparqEngineDown) {
      const closeModal = await planningPage.closePopupModal();
      await commonFunctions.compareTwoValues(closeModal, true, `Is ${testData.PROCEDURE_NAME} popup closed: ${closeModal}`);
      await scaPage.startSparqEngine(testData.SPARQ_ENGINE_PROCEDURE_NAME);
      await planningPage.closeWizard();
      const isSparqExecuted = await planningPage.verifyAlertMsg('Success! Start SPARQ Interactive Planning procedure is completed', 300000);
      await commonFunctions.compareTwoValues(isSparqExecuted, true, `Is SPARQ engine executed successfully: ${isSparqExecuted}`);
      await page.waitForTimeout(10000);
      await planningPage.performCardCellMoreActions('PieChart', 'testing-point-id-1', 'Create Lane');
    }

    const isPopupOpened = await scaPage.isPopupOpened(testData.PROCEDURE_NAME);
    const validation = await commonFunctions.compareTwoValues(isPopupOpened, true, `Is popup opened with title ${testData.PROCEDURE_NAME} through card cell: ${isPopupOpened}`);
    expect(validation).toBeTruthy();
    await commonFunctions.logMessage('PASS', 'Test Case 1 completed successfully.');
  });

  test('Test Case 2: Verify Create Lane form is saved successfully through Piechart card cell', async ({ planningPage, scaPage, commonFunctions, testData, page }) => {
    await page.waitForTimeout(10000);
    await planningPage.fillFormData(testData.ADDLANE_FORM_INPUT_FIELDS);
    await scaPage.saveAddLaneForm();
    await commonFunctions.logMessage('INFO', `Verifying alert message: ${testData.PROCEDURE_NAME} procedure is running`);
    const runningAlertMsg = await planningPage.verifyAlertMsg(`${testData.PROCEDURE_NAME} procedure is running`);
    const validation1 = await commonFunctions.compareTwoValues(runningAlertMsg, true, `Verify ${testData.PROCEDURE_NAME} procedure running alert message through card cell`);
    await commonFunctions.logMessage('INFO', `Verifying alert message: Success! ${testData.PROCEDURE_NAME} procedure is completed`);
    const successAlertMsg = await planningPage.verifyAlertMsg(`Success! ${testData.PROCEDURE_NAME} procedure is completed`);
    const validation2 = await commonFunctions.compareTwoValues(successAlertMsg, true, `Verify ${testData.PROCEDURE_NAME} procedure completed alert message through card cell`);
    expect(validation1 && validation2).toBeTruthy();
    await commonFunctions.logMessage('PASS', 'Test Case 2 completed successfully.');
  });
});
