import PlanningSpace from '../../../pageobjects/planning.page';
import ProcessPage from '../../../pageobjects/process.page';
import apiUtil from '../../../util/api.util';
import CommonFunctions from '../../../util/common.util';
import TestUtil from "../../../util/test.util";
const TestData = require('../../../Testdata/' + process.env.PSENV + '/PlanningSpace/QuickLinks/Test_002_LinkValidationPS.json');


describe('Open Recently opened process from planning space', () => {
let accessToken: string, headers: Record<string, string>;

const url: string = process.env.API_BASE_URL as string + (process.env.UPDATE_FEATURE_TOGGLE as string).replace("{featureFlagName}", TestData.FEATURE_FLAG_NAME);

    before(async () => {
    accessToken = await apiUtil.getBearerToken();
        headers = {
            "accept": "application/json",
            "Authorization" : "Bearer " + accessToken
        };   
    });

  it('Test case 01: Disable the FF (WITH_SETTINGS_REFACTOR) and validate the 3-dot menu from Side Nav', async () => {
        const featureFlagResponseDisable = await apiUtil.processAPIRequest("PUT", url, { name: TestData.FEATURE_FLAG_NAME, isEnabled: false }, headers, "Enable feature toggle WITH_SETTINGS_REFACTOR", "status");
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(featureFlagResponseDisable, 200, "Feature flag disabled successfully");
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);        
        await browser.pause(5000);
        await PlanningSpace.launchContext("Process", {process: TestData.PROCESS_NAME});
        const sideNavThreeDotsVisible = await PlanningSpace.validateSideNavThreeDotsMenu();
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(sideNavThreeDotsVisible, true, "3-dot menu visible in Side Nav when FF is enabled");        
        expect(bValidation1 && bValidation2).toEqual(true);
  });

  it('Test case 02: Enable the FF (WITH_SETTINGS_REFACTOR) and validate the settings icon from PowerBar', async () => {
        const featureFlagResponseEnable = await apiUtil.processAPIRequest("PUT", url, { name: TestData.FEATURE_FLAG_NAME, isEnabled: true }, headers, "Disable WITH_SETTINGS_REFACTOR feature flag", "status");
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(featureFlagResponseEnable, 200, "Feature flag Enabled successfully");
        await browser.refresh();
        await browser.pause(5000);
        await PlanningSpace.switchToMfe();
        const powerBarSettingsVisible = await PlanningSpace.validatePowerBarSettingsIcon();
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(powerBarSettingsVisible, true, "Settings icon visible in PowerBar when FF is disabled");
        expect(bValidation1 && bValidation2).toEqual(true);
  });
  
  it('Test case 03: Validating the process name in the URL & Breadcrum Name', async () => {
    await browser.refresh();
    await browser.pause(5000);
    await PlanningSpace.switchToMfe();
    const processName1Validation = await PlanningSpace.isProcessChipCorrect(TestData.PROCESS_NAME);
    const currentUrl = await browser.getUrl(); 
    const Process1Validation = await CommonFunctions.compareTwoValues(currentUrl.includes(TestData.PROCESS_NAME), true, 'URL Validation for PSAutomation');
    const ProcessChipValidation = await CommonFunctions.compareTwoValues(processName1Validation, true, 'Process name validation from PowerBar');
    expect(Process1Validation && ProcessChipValidation).toBeTruthy();
  });

  it('Test case 04: Navigate back to Planning, Select a different process, and validate its name in the URL & Breadcrumb', async () => {
    await PlanningSpace.navigateToPlanningSpace();
    await browser.pause(3000);
    await PlanningSpace.launchContext("Process", {process: TestData.PROCESS_NAME_2});
    const processName2Validation = await PlanningSpace.isProcessChipCorrect(TestData.PROCESS_NAME_2);
    const currentUrl = await browser.getUrl(); 
    const Process2Validation = await CommonFunctions.compareTwoValues(currentUrl.includes(TestData.PROCESS_NAME_2), true, 'URL Validation for PSManual');
    const ProcessChipValidation = await CommonFunctions.compareTwoValues(processName2Validation, true, 'Process name validation from PowerBar');
    expect(Process2Validation && ProcessChipValidation).toBeTruthy();
  });
  

  it('Test case 05: Go back to Planning Space, Reopen PS Automation Process from the list, and revalidate', async () => {
    await PlanningSpace.navigateToPlanningSpace();
    await browser.pause(3000);    
    await PlanningSpace.Processlist();   
    const ProcessNameFromList = await PlanningSpace.isProcessChipCorrect(TestData.PROCESS_NAME);
    const currentUrl = await browser.getUrl(); 
    const Back2Process1 = await CommonFunctions.compareTwoValues(currentUrl.includes(TestData.PROCESS_NAME), true, 'Revalidation of First Launched Process of PSAutomation');
    expect(ProcessNameFromList && Back2Process1).toBeTruthy();
  });

});