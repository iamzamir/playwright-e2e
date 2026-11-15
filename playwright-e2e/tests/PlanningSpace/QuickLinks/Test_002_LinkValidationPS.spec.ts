import { test, expect } from '../../../configs/fixtures';
import type { Page } from '@playwright/test';
import { CommonFunctions } from '../../../util/common.util';
import { TestUtil } from '../../../util/test.util';
import { ApiUtil } from '../../../util/api.util';
import { PlanningPage } from '../../../pageobjects/planning.page';

const TestData = require("../../../testdata/" + process.env.PSENV + "/PlanningSpace/QuickLinks/Test_002_LinkValidationPS.json");

test.describe.serial('Open Recently opened process from planning space', () => {
  let accessToken: string;
  let headers: Record<string, string>;
  const apiUtil = new ApiUtil();
  const url: string = (process.env.API_BASE_URL as string) + (process.env.UPDATE_FEATURE_TOGGLE as string).replace("{featureFlagName}", TestData.FEATURE_FLAG_NAME);

  test.beforeAll(async () => {
    accessToken = await apiUtil.getBearerToken();
    headers = {
      "accept": "application/json",
      "Authorization": "Bearer " + accessToken
    };
  });

  test('Test case 01: Disable the FF (WITH_SETTINGS_REFACTOR) and validate the 3-dot menu from Side Nav', async ({planningListingPage, testUtil, page, commonFunctions }) => {
    const featureFlagResponseDisable = await apiUtil.processAPIRequest("PUT", url, { name: TestData.FEATURE_FLAG_NAME, isEnabled: false }, headers, "Disable feature toggle WITH_SETTINGS_REFACTOR", "status");
    const bValidation1: boolean = await commonFunctions.compareTwoValues(featureFlagResponseDisable, 200, "Feature flag disabled successfully");
    
    await testUtil.launchAppFromCatalog(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    await page.waitForTimeout(5000);
    
    const planningPage = new PlanningPage(page);
    await planningListingPage.launchContext("Process", TestData.PROCESS_NAME);
    
    const sideNavThreeDotsVisible = await planningPage.validateSideNavThreeDotsMenu();
    const bValidation2: boolean = await commonFunctions.compareTwoValues(sideNavThreeDotsVisible, true, "3-dot menu visible in Side Nav when FF is enabled");
    
    expect(bValidation1 && bValidation2).toEqual(true);
  });

  test('Test case 02: Enable the FF (WITH_SETTINGS_REFACTOR) and validate the settings icon from PowerBar', async ({ page, commonFunctions }) => {
    const featureFlagResponseEnable = await apiUtil.processAPIRequest("PUT", url, { name: TestData.FEATURE_FLAG_NAME, isEnabled: true }, headers, "Enable WITH_SETTINGS_REFACTOR feature flag", "status");
    const bValidation1: boolean = await commonFunctions.compareTwoValues(featureFlagResponseEnable, 200, "Feature flag Enabled successfully");
    
    await page.reload();
    await page.waitForTimeout(5000);
    
    const planningPage = new PlanningPage(page);
    await planningPage.switchToMfe();
    
    const powerBarSettingsVisible = await planningPage.validatePowerBarSettingsIcon();
    const bValidation2: boolean = await commonFunctions.compareTwoValues(powerBarSettingsVisible, true, "Settings icon visible in PowerBar when FF is disabled");
    
    expect(bValidation1 && bValidation2).toEqual(true);
  });

  test('Test case 03: Validating the process name in the URL & Breadcrum Name', async ({ page, commonFunctions }) => {
    await page.reload();
    await page.waitForTimeout(5000);
    
    const planningPage = new PlanningPage(page);
    await planningPage.switchToMfe();
    
    const processName1Validation = await planningPage.isProcessChipCorrect(TestData.PROCESS_NAME);
    const currentUrl = page.url();
    const Process1Validation = await commonFunctions.compareTwoValues(currentUrl.includes(TestData.PROCESS_NAME), true, 'URL Validation for PSAutomation');
    const ProcessChipValidation = await commonFunctions.compareTwoValues(processName1Validation, true, 'Process name validation from PowerBar');
    
    expect(Process1Validation && ProcessChipValidation).toBeTruthy();
  });

  test('Test case 04: Navigate back to Planning, Select a different process, and validate its name in the URL & Breadcrumb', async ({planningListingPage, page, commonFunctions, testUtil }) => {
    const planningPage = new PlanningPage(page);
    await testUtil.navigateToPlanningListingPage();
    await page.waitForTimeout(3000);
    await planningListingPage.launchContext("Process", TestData.PROCESS_NAME_2);  
    const processName2Validation = await planningPage.isProcessChipCorrect(TestData.PROCESS_NAME_2);
    const currentUrl = page.url();
    const Process2Validation = await commonFunctions.compareTwoValues(currentUrl.includes(TestData.PROCESS_NAME_2), true, 'URL Validation for PSManual');
    const ProcessChipValidation = await commonFunctions.compareTwoValues(processName2Validation, true, 'Process name validation from PowerBar');
    expect(Process2Validation && ProcessChipValidation).toBeTruthy();
  });

  test('Test case 05: Go back to Planning Space, Reopen PS Automation Process from the list, and revalidate', async ({ page, commonFunctions, testUtil }) => {
    const planningPage = new PlanningPage(page);
    
    await testUtil.navigateToPlanningListingPage();
    await page.waitForTimeout(3000);
    
    await planningPage.Processlist();
    
    const ProcessNameFromList = await planningPage.isProcessChipCorrect(TestData.PROCESS_NAME);
    const currentUrl = page.url();
    const Back2Process1 = await commonFunctions.compareTwoValues(currentUrl.includes(TestData.PROCESS_NAME), true, 'Revalidation of First Launched Process of PSAutomation');
    
    expect(ProcessNameFromList && Back2Process1).toBeTruthy();
  });
});
