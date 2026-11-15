import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
import ScenarioPage from '../../../pageobjects/scenario.page';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/OnDemandMaas/Test_002_VerifyDrillThroughForODM.json");

describe('ODM - drill through', () => {

  let scenarioName;
  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    await browser.pause(5000);
  });

  // it('Test Case 1: Interactive Planning UI Validations', async () => {
  //   await ProcessPage.clickLeftpaneLinks('Interactive Planning');
  //   await browser.pause(10000);

  //   let sSessionName: string = await InteractivePlanningPage.getFirstSession();
  //   let sActualRelatedScenario: string = await InteractivePlanningPage.getColumnValueBySessionName(sSessionName, "Related Scenario");
  //   let sActualStatus: string = await InteractivePlanningPage.getColumnValueBySessionName(sSessionName, "Status");

  //   let bValidation3: boolean = false;
  //   try {
  //     await InteractivePlanningPage.clickSession(sSessionName);
  //     await CommonFunctions.logMessage("FAIL", "Session Link is visible, failed");
  //   }
  //   catch (e) {
  //     await CommonFunctions.logMessage("PASS", "Session Link is not visible!, Assertion Passed");
  //     bValidation3 = true;
  //   }

  //   let bValidation1: boolean = await CommonFunctions.compareTwoValues(sActualRelatedScenario != "", true, "Should be no blank Related Scenario");
  //   let bValidation2: boolean = await CommonFunctions.compareTwoValues(sActualStatus != "", true, "Should be no blank Status");
  //   expect(bValidation1 && bValidation2 && bValidation3).toEqual(true);
    /*
    As part of Ondemand changes, below code has been commented
    await ProcessPage.clickLeftpaneLinks('Interactive Planning Scope');
    let arrNavigatingIcons: string[] = await InteractivePlanningPage.getAllNavigatingIcons();
    let bValidation1: boolean = await CommonFunctions.compareTwoValues(arrNavigatingIcons.toString(), "Back,Planning Space,Interactive Planning Scope", "Left Pane Navigating Icons Assertion");
    let bValidation2: boolean = await CommonFunctions.compareTwoValues(await InteractivePlanningPage.isScopeCardDisplays(), true, "Scope Card Displays Assertion");
    // let bValidation3: boolean = await CommonFunctions.compareTwoValues(await InteractivePlanningPage.getRelatedScenarioInsideSession(), sActualRelatedScenario, "Related Scenario Inside Session Assertion");
    let bValidation4: boolean = await CommonFunctions.compareTwoValues(await InteractivePlanningPage.getStatusInsideSession(), sActualStatus, "Status Inside Session Assertion");
    let bValidation5: boolean = await CommonFunctions.compareTwoValues(await InteractivePlanningPage.getSessionNameInsideSession(), sSessionName, "Session Name Inside Session Assertion");

    let arrBreadCrumbNames: string[] = await InteractivePlanningPage.getAllBreadCrumbsNames();
    await CommonFunctions.logMessage("INFO", "Last Breadcrumb Navigaion Name:: " + arrBreadCrumbNames[arrBreadCrumbNames.length - 1]);
    let bValidation6: boolean = await CommonFunctions.compareTwoValues(arrBreadCrumbNames[arrBreadCrumbNames.length - 1], sActualRelatedScenario + " : " + sSessionName, "Breadcrumb Last Navigation Name Assertion, it should contain both Related Scenario Name and Session Name");
    */
    // expect(bValidation1 && bValidation2 && bValidation4 && bValidation5 && bValidation6).toEqual(true);
  // });

  it('Test case1 : verify data after one level drill through from ODM view', async () => {
    await PlanningSpace.clickViewsDropDown();
    await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
    await browser.pause(20000);
    // performing drill through on card field
    await PlanningSpace.performDrillThroughOnCardField(TestData.CELL_VALUE, TestData.ANOTHER_VIEW_NAME);
    await browser.pause(30000);
    let sActualViewName: string = await PlanningSpace.getViewTitleName(false);
    let bValidation: boolean = await CommonFunctions.compareTwoValues(sActualViewName, TestData.ANOTHER_VIEW_NAME, `Process Name Assertion after Drill Through to ${TestData.TC1_DRILL_THROUGH_VIEW_TO}`);
    // verifying context id in url
    let sCurrentUrl: string = await browser.getUrl();
    await CommonFunctions.logMessage('INFO', `current url is ${sCurrentUrl}`)
    let sSplitUrl = sCurrentUrl.split("&");
    let sContextID: string = "";
    for (let i = 0; i < sSplitUrl.length; i++) {
      if (sSplitUrl[i].includes("contextId=")) {
        sContextID = sSplitUrl[i].split("=")[1];
      }
    }
    await CommonFunctions.logMessage('INFO', `context id is  ${sContextID}`)
    let bValidation1: boolean = await CommonFunctions.compareTwoValues(sCurrentUrl.includes("contextId="), true, "URL includes Context ID Assertion");
    let bValidation2: boolean = await CommonFunctions.compareTwoValues(sContextID.length > 1, true, "Context ID Assertion, it should have some ID and its length should be greated than 1");
    // verifying scenario 
    scenarioName = await PlanningSpace.getScenarioChipText();
    let isScenarioMatched: boolean = await CommonFunctions.compareTwoValues(
    await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpaceInDrawer(scenarioName),true, `Checking if ${scenarioName} Scenario Matched`);
    // verifying scope
    let scopeValidation: boolean = await CommonFunctions.compareTwoValues(
    await PlanningSpace.isScopeAppliedInDrawer(TestData.DIMENSIONS),true,`Is Scope applied for dimensions: ${TestData.DIMENSIONS}`);
    let columnValidation: boolean = await CommonFunctions.compareTwoValues(
        await PlanningSpace.isColumnsValidated(TestData.CELL_VALUE),true,`Column validation for cell: ${TestData.CELL_VALUE}`);
    let globalScopeChip: boolean = await CommonFunctions.compareTwoValues(
        await PlanningSpace.isGlobalScopeChipDisplays(),true,"Global Scope Chip is displayed");
    let scenarioChipVdn: boolean = await CommonFunctions.compareTwoValues(
        await PlanningSpace.isScenarioChipCorrect(scenarioName),true,`Scenario Chip displays ${scenarioName}`); 
    // verifying context override icon
    const isContextOverridePopupDisplayed = await PlanningSpace.clickOnContextOverrideIcon();
    // verifying bread crumbs in contextoverride popup
    const isvalidationOfBreadCrumb = await PlanningSpace.validateBreadCrumbs(TestData.VIEW_NAME, TestData.ANOTHER_VIEW_NAME);
    let validateContextOverridePopup = await CommonFunctions.compareTwoValues(isContextOverridePopupDisplayed, true, 'Clicked on Context Override Popup');
    let validationOfBreadCrumb = await CommonFunctions.compareTwoValues(isvalidationOfBreadCrumb, true, 'Breadcrumb Displayed: ' + TestData.VIEW_NAME + ' -> ' + TestData.ANOTHER_VIEW_NAME);
    await PlanningSpace.closeContextOverridePopup();
    expect(bValidation && bValidation1 && bValidation2 && isScenarioMatched && scopeValidation && columnValidation && globalScopeChip && scenarioChipVdn && validateContextOverridePopup && validationOfBreadCrumb).toEqual(true);
  })

  it('Test Case2: Verify data after two level drill through from ODM view', async () => {
    // performing drill through on card field
    await browser.pause(5000);
    await PlanningSpace.performDrillThroughOnCardField(TestData.CELL_VALUE, TestData.TC1_DRILL_THROUGH_VIEW_TO);
    await browser.pause(30000);
    let sActualViewName: string = await PlanningSpace.getViewTitleName(false);
    let bValidation: boolean = await CommonFunctions.compareTwoValues(sActualViewName, TestData.TC1_DRILL_THROUGH_VIEW_TO, `Process Name Assertion after Drill Through to ${TestData.TC1_DRILL_THROUGH_VIEW_TO}`);
    // verifying context id in url
    let sCurrentUrl: string = await browser.getUrl();
    await CommonFunctions.logMessage('INFO', `current url is ${sCurrentUrl}`)
    let sSplitUrl = sCurrentUrl.split("&");
    let sContextID: string = "";
    for (let i = 0; i < sSplitUrl.length; i++) {
      if (sSplitUrl[i].includes("contextId=")) {
        sContextID = sSplitUrl[i].split("=")[1];
      }
    }
    await CommonFunctions.logMessage('INFO', `context id is  ${sContextID}`)
    let bValidation1: boolean = await CommonFunctions.compareTwoValues(sCurrentUrl.includes("contextId="), true, "URL includes Context ID Assertion");
    let bValidation2: boolean = await CommonFunctions.compareTwoValues(sContextID.length > 1, true, "Context ID Assertion, it should have some ID and its length should be greated than 1");
    // verifying scenario 
    scenarioName = await PlanningSpace.getScenarioChipText();
    let isScenarioMatched: boolean = await CommonFunctions.compareTwoValues(
    await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpaceInDrawer(scenarioName),true, `Checking if ${scenarioName} Scenario Matched`);
    // verifying scope
    let scopeValidation: boolean = await CommonFunctions.compareTwoValues(
    await PlanningSpace.isScopeAppliedInDrawer(TestData.DIMENSIONS),true,`Is Scope applied for dimensions: ${TestData.DIMENSIONS}`);
    let columnValidation: boolean = await CommonFunctions.compareTwoValues(
        await PlanningSpace.isColumnsValidated(TestData.CELL_VALUE),true,`Column validation for cell: ${TestData.CELL_VALUE}`);
    let globalScopeChip: boolean = await CommonFunctions.compareTwoValues(
        await PlanningSpace.isGlobalScopeChipDisplays(),true,"Global Scope Chip is displayed");
    let scenarioChipVdn: boolean = await CommonFunctions.compareTwoValues(
        await PlanningSpace.isScenarioChipCorrect(scenarioName),true,`Scenario Chip displays ${scenarioName}`); 
    // verifying context override icon
    const isContextOverridePopupDisplayed = await PlanningSpace.clickOnContextOverrideIcon();
    await browser.pause(5000);
    // verifying bread crumbs in contextoverride popup
    const isvalidationOfBreadCrumb = await PlanningSpace.validateBreadCrumbs(TestData.ANOTHER_VIEW_NAME, TestData.TC1_DRILL_THROUGH_VIEW_TO);
    let validateContextOverridePopup = await CommonFunctions.compareTwoValues(isContextOverridePopupDisplayed, true, 'Clicked on Context Override Popup');
    let validationOfBreadCrumb = await CommonFunctions.compareTwoValues(isvalidationOfBreadCrumb, true, 'Breadcrumb Displayed: ' + TestData.ANOTHER_VIEW_NAME + ' -> ' + TestData.TC1_DRILL_THROUGH_VIEW_TO);
    const isvalidationOfEllipses = await PlanningSpace.validateEllipsesInOverridePopup();
    let validateEllipsesInOverridePopup = await CommonFunctions.compareTwoValues(isvalidationOfEllipses, true, 'Ellipses Displayed in Context Override Popup');
    expect(bValidation && bValidation1 && bValidation2 && isScenarioMatched && scopeValidation && columnValidation && globalScopeChip && scenarioChipVdn && validateContextOverridePopup && validationOfBreadCrumb && validateEllipsesInOverridePopup).toEqual(true);
  });

  it('Case 3: Validate the breadcrumb navigation link to first level drill through view and source view', async () => {
    await CommonFunctions.logMessage('INFO', 'Clicking on Breadcrumb link of first level drill through view');
    await PlanningSpace.clickOnBreadCrumbLink(TestData.ANOTHER_VIEW_NAME);
    await browser.pause(30000);
    let sActualViewName: string = await PlanningSpace.getViewTitleName(false);
    let bValidation: boolean = await CommonFunctions.compareTwoValues(sActualViewName, TestData.ANOTHER_VIEW_NAME, `Process Name Assertion after clicking breadcrumb link to ${TestData.ANOTHER_VIEW_NAME}`);
    await PlanningSpace.switchToMFEFrame();
    const isContextOverridePopupDisplayed = await PlanningSpace.clickOnContextOverrideIcon();
    await PlanningSpace.clickOnBreadCrumbLink(TestData.VIEW_NAME);
    await browser.pause(30000);
    let sSourceViewName: string = await PlanningSpace.getViewTitleName(false);
    let bValidation1: boolean = await CommonFunctions.compareTwoValues(sSourceViewName, TestData.VIEW_NAME, `Process Name Assertion after clicking breadcrumb link to source view ${TestData.VIEW_NAME}`);
    expect(bValidation && bValidation1 && isContextOverridePopupDisplayed).toEqual(true);
  });

  it('Test Case4 : Validate drill through from ODM view to ODM hidden view', async () => {
    await browser.pause(5000);
    await PlanningSpace.performDrillThroughOnCardField(TestData.CELL_VALUE, TestData.HIDDEN_VIEW1);
    await browser.pause(30000);
    let sActualViewName: string = await PlanningSpace.getViewTitleName(false);
    let bValidation: boolean = await CommonFunctions.compareTwoValues(sActualViewName, TestData.HIDDEN_VIEW1, `Process Name Assertion after Drill Through to ${TestData.HIDDEN_VIEW1}`);
    // verifying context id in url
    let sCurrentUrl: string = await browser.getUrl();
    await CommonFunctions.logMessage('INFO', `current url is ${sCurrentUrl}`)
    let sSplitUrl = sCurrentUrl.split("&");
    let sContextID: string = "";
    for (let i = 0; i < sSplitUrl.length; i++) {
      if (sSplitUrl[i].includes("contextId=")) {
        sContextID = sSplitUrl[i].split("=")[1];
      }
    }
    await CommonFunctions.logMessage('INFO', `context id is  ${sContextID}`)
    let bValidation1: boolean = await CommonFunctions.compareTwoValues(sCurrentUrl.includes("contextId="), true, "URL includes Context ID Assertion");
    let bValidation2: boolean = await CommonFunctions.compareTwoValues(sContextID.length > 1, true, "Context ID Assertion, it should have some ID and its length should be greated than 1");
    // verifying scenario 
    scenarioName = await PlanningSpace.getScenarioChipText();
    let isScenarioMatched: boolean = await CommonFunctions.compareTwoValues(
    await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpaceInDrawer(scenarioName),true, `Checking if ${scenarioName} Scenario Matched`);
    // verifying scope
    let scopeValidation: boolean = await CommonFunctions.compareTwoValues(
    await PlanningSpace.isScopeAppliedInDrawer(TestData.DIMENSIONS),true,`Is Scope applied for dimensions: ${TestData.DIMENSIONS}`);
    let columnValidation: boolean = await CommonFunctions.compareTwoValues(
    await PlanningSpace.isColumnsValidated(TestData.CELL_VALUE),true,`Column validation for cell: ${TestData.CELL_VALUE}`);
    let globalScopeChip: boolean = await CommonFunctions.compareTwoValues(
    await PlanningSpace.isGlobalScopeChipDisplays(),true,"Global Scope Chip is displayed");
    let scenarioChipVdn: boolean = await CommonFunctions.compareTwoValues(
    await PlanningSpace.isScenarioChipCorrect(scenarioName),true,`Scenario Chip displays ${scenarioName}`); 
    // verifying context override icon
    const isContextOverridePopupDisplayed = await PlanningSpace.clickOnContextOverrideIcon();
    await browser.pause(5000);
    // verifying bread crumbs in contextoverride popup
    const isvalidationOfBreadCrumb = await PlanningSpace.validateBreadCrumbs(TestData.VIEW_NAME, TestData.HIDDEN_VIEW1);
    let validateContextOverridePopup = await CommonFunctions.compareTwoValues(isContextOverridePopupDisplayed, true, 'Clicked on Context Override Popup');
    let validationOfBreadCrumb = await CommonFunctions.compareTwoValues(isvalidationOfBreadCrumb, true, 'Breadcrumb Displayed: ' + TestData.HIDDEN_VIEW1 + ' -> ' + TestData.HIDDEN_VIEW1);
    // is ckear button displayed in context overirride pop up
    await PlanningSpace.clickOnContextOverrideIcon();
    const isClearDisplays: boolean = await PlanningSpace.isClearDisplays(false);
    await CommonFunctions.compareTwoValues(isClearDisplays, true, `Is clear context button available`);
    // is back button displayed for hidden view
    await PlanningSpace.switchToMFEFrame();
    const isBackBtnExist: boolean = await PlanningSpace.isBackBtnDisplayed();
    await CommonFunctions.compareTwoValues(isBackBtnExist, true, 'Is back button displayed');
    await PlanningSpace.closeContextOverridePopup();
    expect(bValidation && bValidation1 && bValidation2 && isScenarioMatched && scopeValidation && columnValidation && globalScopeChip && scenarioChipVdn && validateContextOverridePopup && validationOfBreadCrumb && isClearDisplays && isBackBtnExist).toEqual(true);
  })

  it('Test case 5: Validate 2nd level drill through from hidden view to hidden view', async () => {
    await PlanningSpace.performDrillThroughOnCardField(TestData.CELL_VALUE, TestData.HIDDEN_VIEW2);
    await browser.pause(30000);
    let sActualViewName: string = await PlanningSpace.getViewTitleName(false);
    let bValidation: boolean = await CommonFunctions.compareTwoValues(sActualViewName, TestData.HIDDEN_VIEW2, `Process Name Assertion after Drill Through to ${TestData.HIDDEN_VIEW2}`);
    // verifying context id in url
    let sCurrentUrl: string = await browser.getUrl();
    await CommonFunctions.logMessage('INFO', `current url is ${sCurrentUrl}`)
    let sSplitUrl = sCurrentUrl.split("&");
    let sContextID: string = "";
    for (let i = 0; i < sSplitUrl.length; i++) {
      if (sSplitUrl[i].includes("contextId=")) {
        sContextID = sSplitUrl[i].split("=")[1];
      }
    }
    await CommonFunctions.logMessage('INFO', `context id is  ${sContextID}`)
    let bValidation1: boolean = await CommonFunctions.compareTwoValues(sCurrentUrl.includes("contextId="), true, "URL includes Context ID Assertion");
    let bValidation2: boolean = await CommonFunctions.compareTwoValues(sContextID.length > 1, true, "Context ID Assertion, it should have some ID and its length should be greated than 1");
    // verifying scenario 
    scenarioName = await PlanningSpace.getScenarioChipText();
    let isScenarioMatched: boolean = await CommonFunctions.compareTwoValues(
    await ScenarioPage.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpaceInDrawer(scenarioName),true, `Checking if ${scenarioName} Scenario Matched`);
    // verifying scope
    let scopeValidation: boolean = await CommonFunctions.compareTwoValues(
    await PlanningSpace.isScopeAppliedInDrawer(TestData.DIMENSIONS),true,`Is Scope applied for dimensions: ${TestData.DIMENSIONS}`);
    let columnValidation: boolean = await CommonFunctions.compareTwoValues(
    await PlanningSpace.isColumnsValidated(TestData.CELL_VALUE),true,`Column validation for cell: ${TestData.CELL_VALUE}`);
    let globalScopeChip: boolean = await CommonFunctions.compareTwoValues(
    await PlanningSpace.isGlobalScopeChipDisplays(),true,"Global Scope Chip is displayed");
    let scenarioChipVdn: boolean = await CommonFunctions.compareTwoValues(
    await PlanningSpace.isScenarioChipCorrect(scenarioName),true,`Scenario Chip displays ${scenarioName}`); 
    // verifying context override icon
    const isContextOverridePopupDisplayed = await PlanningSpace.clickOnContextOverrideIcon();
    await browser.pause(5000);
    // verifying bread crumbs in contextoverride popup
    const isvalidationOfBreadCrumb = await PlanningSpace.validateBreadCrumbs(TestData.HIDDEN_VIEW1, TestData.HIDDEN_VIEW2);
    let validateContextOverridePopup = await CommonFunctions.compareTwoValues(isContextOverridePopupDisplayed, true, 'Clicked on Context Override Popup');
    let validationOfBreadCrumb = await CommonFunctions.compareTwoValues(isvalidationOfBreadCrumb, true, 'Breadcrumb Displayed: ' + TestData.HIDDEN_VIEW1 + ' -> ' + TestData.HIDDEN_VIEW2);
    const isvalidationOfEllipses = await PlanningSpace.validateEllipsesInOverridePopup();
    let validateEllipsesInOverridePopup = await CommonFunctions.compareTwoValues(isvalidationOfEllipses, true, 'Ellipses Displayed in Context Override Popup');
    // is clear button displayed in context override pop up
    await PlanningSpace.clickOnContextOverrideIcon();
    const isClearDisplays: boolean = await PlanningSpace.isClearDisplays(false);
    await CommonFunctions.compareTwoValues(isClearDisplays, true, `Is clear context button available`);
    // is back button displayed for hidden view
    await PlanningSpace.switchToMFEFrame();
    const isBackBtnExist: boolean = await PlanningSpace.isBackBtnDisplayed();
    await CommonFunctions.compareTwoValues(isBackBtnExist, true, 'Is back button displayed');
    expect(bValidation && bValidation1 && bValidation2 && isScenarioMatched && scopeValidation && columnValidation && globalScopeChip && scenarioChipVdn && validateContextOverridePopup && validationOfBreadCrumb && isClearDisplays && isBackBtnExist && validateEllipsesInOverridePopup).toEqual(true);
  })

  it('Test Case 6: Validate the breadcrumb navigation link to first level drill through view and source view', async () => {
    await PlanningSpace.clickOnContextOverrideIcon();
    await CommonFunctions.logMessage('INFO', 'Clicking on Breadcrumb link of first level drill through view');
    await PlanningSpace.clickOnBreadCrumbLink(TestData.HIDDEN_VIEW1);
    await browser.pause(30000);
    let sActualViewName: string = await PlanningSpace.getViewTitleName(false);
    let bValidation: boolean = await CommonFunctions.compareTwoValues(sActualViewName, TestData.HIDDEN_VIEW1, `Process Name Assertion after clicking breadcrumb link to ${TestData.HIDDEN_VIEW1}`);
    await PlanningSpace.switchToMFEFrame();
    await PlanningSpace.clickOnBreadCrumbLink(TestData.VIEW_NAME);
    await browser.pause(30000);
    let sSourceViewName: string = await PlanningSpace.getViewTitleName(false);
    let bValidation1: boolean = await CommonFunctions.compareTwoValues(sSourceViewName, TestData.VIEW_NAME, `Process Name Assertion after clicking breadcrumb link to source view ${TestData.VIEW_NAME}`);
    expect(bValidation && bValidation1).toEqual(true);
  });
})