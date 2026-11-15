import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Test suite for Collaboration panel testing', () => {
  const entityOfProcess = 'process';                    const entityNameOfProcess = 'PSAutomation';
  const entityOfSubProcess = 'subprocess';              const entityNameOfSubProcess = 'DemandReview';
  const entityOfAssumption = 'assumption';              const entityNameOfAssumption = 'PS Auto Assumption';

  test.beforeAll(async ({ testUtil, testData, page }) => {
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
    await page.waitForTimeout(5000);
  });

  test('Test case 01: Validate the context data of collaboration room from Process', async ({ planningPage, commonFunctions, testData, page }) => {
    await planningPage.selectViewByTypeAndName("All Views", testData.VIEW_NAME);
    await planningPage.openCollaborationRoomPanel();
    await planningPage.createCollaborationRoom();
    const viewId = await planningPage.getViewId(page.url());
    await commonFunctions.logMessage('INFO', `View id is ${viewId}`);
    const uiData = await planningPage.getContextDataFromUI(entityOfProcess, entityNameOfProcess, viewId, testData.VIEW_NAME);
    const urlData = JSON.parse(await planningPage.getContextDataFromURL(entityOfProcess, entityNameOfProcess));
    const actualViewName = await planningPage.getViewTitleName();
    await planningPage.closeCollaborationPanel();
    const validation1 = await commonFunctions.compareTwoValues(uiData.entity, urlData.entity, 'Entity validated successfully...');
    const validation2 = await commonFunctions.compareTwoValues(uiData.entityName, urlData.entityName, 'Entity Name validated successfully...');
    const validation3 = await commonFunctions.compareTwoValues(uiData.viewId, viewId, 'View Id validated successfully...');
    const validation4 = await commonFunctions.compareTwoValues(uiData.viewName, actualViewName, 'View Name validated successfully...');
    expect(validation1 && validation2 && validation3 && validation4).toBeTruthy();
  });

  test('Test case 02: Validate the Entity data of collaboration room from SubProcess', async ({ testUtil, planningListingPage, planningPage, commonFunctions, testData, page }) => {
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Subprocess', testData.PROCESS_NAME, testData.SUB_PROCESS_NAME);
    await planningPage.selectViewByTypeAndName("All Views", testData.VIEW_NAME);
    const viewId = await planningPage.getViewId(page.url());
    await commonFunctions.logMessage('INFO', `View id is ${viewId}`);
    await planningPage.openCollaborationRoomPanel();
    await planningPage.createCollaborationRoom();
    const uiData = await planningPage.getContextDataFromUI(entityOfSubProcess, entityNameOfSubProcess, viewId, testData.VIEW_NAME);
    const urlData = JSON.parse(await planningPage.getContextDataFromURL(entityOfSubProcess, entityNameOfSubProcess));
    const actualViewName = await planningPage.getViewTitleName();
    await planningPage.closeCollaborationPanel();
    const validation1 = await commonFunctions.compareTwoValues(uiData.entity, urlData.entity, 'Entity validated successfully...');
    const validation2 = await commonFunctions.compareTwoValues(uiData.entityName, urlData.entityName, 'Entity Name validated successfully...');
    const validation3 = await commonFunctions.compareTwoValues(uiData.viewId, viewId, 'View Id validated successfully...');
    const validation4 = await commonFunctions.compareTwoValues(uiData.viewName, actualViewName, 'View Name validated successfully...');
    expect(validation1 && validation2 && validation3 && validation4).toBeTruthy();
  });

  test('Test case 03: Validate the Entity data of collaboration room from Process Orchestration', async ({ testUtil, planningPage, commonFunctions }) => {
    await testUtil.clickLeftpaneLinks('Process Summary');
    await planningPage.openCollaborationRoomPanel();
    await planningPage.createCollaborationRoom();
    const uiData = await planningPage.getContextDataFromUI(entityOfSubProcess, entityNameOfSubProcess);
    const urlData = JSON.parse(await planningPage.getContextDataFromURL(entityOfSubProcess, entityNameOfSubProcess));
    await planningPage.closeCollaborationPanel();
    const validation1 = await commonFunctions.compareTwoValues(uiData.entity, urlData.entity, 'Entity validated successfully...');
    const validation2 = await commonFunctions.compareTwoValues(uiData.entityName, urlData.entityName, 'Entity Name validated successfully...');
    expect(validation1 && validation2).toBeTruthy();
  });

  test('Test case 04: Validate the context data from Assumptions with viewId', async ({ testUtil, planningListingPage, planningPage, commonFunctions, testData, page }) => {
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Assumption', testData.PROCESS_NAME, '', testData.ASSUMPTION_NAME);
    await page.waitForTimeout(5000);
    await planningPage.clickViewDropdown();
    await planningPage.selectView(testData.VIEW_NAME);
    await page.waitForTimeout(5000);
    const viewId = await planningPage.getViewId(page.url());
    await commonFunctions.logMessage('INFO', `View id is ${viewId}`);
    await planningPage.openCollaborationRoomPanel();
    await planningPage.createCollaborationRoom();
    const assumptionIdFromUI = await planningPage.getAssumptionIdFromCollaborationRoom(entityNameOfAssumption);
    const uiData = await planningPage.getContextDataFromUI(entityOfAssumption, entityNameOfAssumption, viewId, testData.VIEW_NAME);
    const urlData = JSON.parse(await planningPage.getContextDataFromURL(entityOfAssumption, entityNameOfAssumption));
    const actualViewName = await planningPage.getViewTitleName();
    await planningPage.closeCollaborationPanel();
    const validation1 = await commonFunctions.compareTwoValues(uiData.entity, urlData.entity, 'Entity validated successfully...');
    const validation2 = await commonFunctions.compareTwoValues(assumptionIdFromUI, uiData.entityName, 'Entity Name validated successfully...');
    const validation3 = await commonFunctions.compareTwoValues(uiData.viewId, viewId, 'View Id validated successfully...');
    const validation4 = await commonFunctions.compareTwoValues(uiData.viewName, actualViewName, 'View Name validated successfully...');
    expect(validation1 && validation2 && validation3 && validation4).toBeTruthy();
  });
});
