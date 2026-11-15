import PlanningSpace from '../../../pageobjects/planning.page';
import ProcessPage from '../../../pageobjects/process.page';
import CommonFunctions from '../../../util/common.util';

const TestData = require('../../../Testdata/' + process.env.PSENV + '/PlanningSpace/Collaboration/Test_001_CollaborationPanel.json');

describe('Test suite for Collaboration panel testing', () => {
    const entityofProcess = 'process';             const entityNameofProcess = 'PSAutomation';
    const entityofSubProcess = 'subprocess';       const entityNameofSubProcess = 'DemandReview';
    const entityofAssumption = 'assumption';       const entityNameofAssumption = 'PS Auto Assumption'

  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME, false, false);
    await browser.pause(5000);
  });

  it('Test case 01: Validate the context data of collaboration room from Process', async () => {
    await browser.pause(5000);
    await PlanningSpace.clickViewsDropDown();
    await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
    await PlanningSpace.openCollaborationRoomPanel();
    await PlanningSpace.createCollaborationRoom();
    const currentURL = await browser.getUrl();
    const viewIdRaw = await PlanningSpace.getViewId(currentURL);
    const viewId = viewIdRaw ?? '';
    await CommonFunctions.logMessage("INFO", `View id is ${viewId}`);
    const uiData = await PlanningSpace.ContextDataFromUI(entityofProcess, entityNameofProcess, viewId, TestData.VIEW_NAME);
    const urlDataValues = await PlanningSpace.getContextDataFromURL(entityofProcess, entityNameofProcess);
    const urlData = JSON.parse(urlDataValues);
    const sActualViewName: string = await PlanningSpace.getViewTitleName();
    await PlanningSpace.closeCollaborationPanel();
    const bValidation1 = await CommonFunctions.compareTwoValues(uiData.entity, urlData.entity, 'Entity validated successfully...');
    const bValidation2 = await CommonFunctions.compareTwoValues(uiData.entityName, urlData.entityName, 'Entity Name validated successfully...');
    const bValidation3 = await CommonFunctions.compareTwoValues(uiData.viewId, viewId, 'View Id validated successfully...');
    const bValidation4 = await CommonFunctions.compareTwoValues(uiData.viewName,sActualViewName, 'View Name validated successfully...');
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  it('Test case 02: Validate the Entity data of collaboration room from SubProcess', async () => {
    await PlanningSpace.navigateToPlanningSpace();
    await PlanningSpace.launchContext("Sub-process", { process: TestData.PROCESS_NAME, subProcess: TestData.SUB_PROCESS_NAME });
    await PlanningSpace.clickViewsDropDown();
    await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
    await browser.pause(5000);
    const currentURL = await browser.getUrl();
    const viewIdRaw = await PlanningSpace.getViewId(currentURL);
    const viewId = viewIdRaw ?? '';
    await CommonFunctions.logMessage("INFO", `View id is ${viewId}`);
    await PlanningSpace.openCollaborationRoomPanel();
    await PlanningSpace.createCollaborationRoom();
    const uiData = await PlanningSpace.ContextDataFromUI(entityofSubProcess, entityNameofSubProcess, viewId, TestData.VIEW);
    const urlDataValues = await PlanningSpace.getContextDataFromURL(entityofSubProcess, entityNameofSubProcess);
    const urlData = JSON.parse(urlDataValues);
    const sActualViewName: string = await PlanningSpace.getViewTitleName();
    await PlanningSpace.closeCollaborationPanel();
    const bValidation1 = await CommonFunctions.compareTwoValues(uiData.entity, urlData.entity, 'Entity validated successfully...');
    const bValidation2 = await CommonFunctions.compareTwoValues(uiData.entityName, urlData.entityName, 'Entity Name validated successfully...');
    const bValidation3 = await CommonFunctions.compareTwoValues(uiData.viewId, viewId, 'View Id validated successfully...');
    const bValidation4 = await CommonFunctions.compareTwoValues(uiData.viewName,sActualViewName, 'View Name validated successfully...');
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  it('Test case 03: Validate the Entity data of collaboration room from Process Orchestration', async () => {
    await ProcessPage.clickLeftpaneLinks('Process Summary');
    await PlanningSpace.openCollaborationRoomPanel();
    await PlanningSpace.createCollaborationRoom();
    const uiData = await PlanningSpace.ContextDataFromUI(entityofSubProcess, entityNameofSubProcess, '', '');
    const urlDataValues = await PlanningSpace.getContextDataFromURL(entityofSubProcess, entityNameofSubProcess);
    const urlData = JSON.parse(urlDataValues);
    await PlanningSpace.closeCollaborationPanel();
    const bValidation1 = await CommonFunctions.compareTwoValues(uiData.entity, urlData.entity, 'Entity validated successfully...');
    const bValidation2 = await CommonFunctions.compareTwoValues(uiData.entityName, urlData.entityName, 'Entity Name validated successfully...');
    expect(bValidation1 && bValidation2).toBeTruthy();
  })

  it('Test case 04: Validate the context data from Assumptions with viewId', async () => {
    await PlanningSpace.navigateToPlanningSpace()
    await PlanningSpace.launchContext("Assumption", { origin: TestData.PROCESS_NAME, assumption: TestData.ASSUMPTION_NAME });
    await browser.pause(5000);
    await PlanningSpace.clickViewsDropDown();
    await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
    await browser.pause(5000);
    const currentURL = await browser.getUrl(); 
    const viewIdRaw = await PlanningSpace.getViewId(currentURL);
    const viewId = viewIdRaw ?? '';
    await CommonFunctions.logMessage("INFO", `View id is ${viewId}`);
    await PlanningSpace.openCollaborationRoomPanel();
    await PlanningSpace.createCollaborationRoom();
    const AssumptionIdFromUI = await PlanningSpace.getAssumptionIdFromCollaborationRoom(entityNameofAssumption)
    const uiData = await PlanningSpace.ContextDataFromUI(entityofAssumption, entityNameofAssumption, viewId, TestData.VIEW);
    const urlDataValues = await PlanningSpace.getContextDataFromURL(entityofAssumption, entityNameofAssumption);
    const urlData = JSON.parse(urlDataValues);
    const sActualViewName: string = await PlanningSpace.getViewTitleName();
    await PlanningSpace.closeCollaborationPanel();
    const bValidation1 = await CommonFunctions.compareTwoValues(uiData.entity, urlData.entity, 'Entity validated successfully...');
    const bValidation2 = await CommonFunctions.compareTwoValues(AssumptionIdFromUI, uiData.entityName, 'Entity Name validated successfully...');
    const bValidation3 = await CommonFunctions.compareTwoValues(uiData.viewId, viewId, 'View Id validated successfully...');
    const bValidation4 = await CommonFunctions.compareTwoValues(uiData.viewName,sActualViewName, 'View Name validated successfully...');
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

});