import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Configure Views To Entities and Verify in Planning Space', () => {
  test.beforeAll(async ({ testUtil, planningPage, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      testData.PROCESS_CONTEXT.PROCESS_NAME
    );
    await planningPage.waitForViewToBeDisplayed();
  });

  test('Test Case 7: Remove Mapped Views to the Entities', async ({ testUtil, globalSettingsPage, commonFunctions, testData }) => {
    await testUtil.navigateToProcessListingPage();
    await globalSettingsPage.clickGlobalSettings();
    await globalSettingsPage.clickGlobalSettingsListMenu('Process');
    await globalSettingsPage.selectProcess(testData.PROCESS_CONTEXT.PROCESS_NAME);

    const processValidation: boolean = await commonFunctions.compareTwoValues(
      await globalSettingsPage.removeViewMappingToEntity(testData.PROCESS_CONTEXT.PROCESS_NAME),
      true,
      'Remove Mapping Assertion for Process'
    );
    const subProcessValidation: boolean = await commonFunctions.compareTwoValues(
      await globalSettingsPage.removeViewMappingToEntity(testData.SUB_PROCESS_CONTEXT.SUB_PROCESS_NAME),
      true,
      'Remove Mapping Assertion for Subprocess'
    );

    await globalSettingsPage.clickGlobalSettingsListMenu('Assumption Type');
    const assumptionValidation: boolean = await commonFunctions.compareTwoValues(
      await globalSettingsPage.removeViewMappingToEntity(testData.ASSUMPTION_RISK_CONTEXT.ASSUMPTION_TYPE),
      true,
      'Remove Mapping Assertion for Assumption'
    );

    expect(processValidation && subProcessValidation && assumptionValidation).toBeTruthy();
  });

  test('Test Case 8: verify views removed to process - should display all by default', async ({ testUtil, planningListingPage, planningPage, commonFunctions, testData }) => {
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Process', testData.PROCESS_CONTEXT.PROCESS_NAME);
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.clickViewDropdown();

    const viewsFromPS: string[] = await planningPage.getAllViews();
    const validation: boolean = await commonFunctions.compareTwoValues(
      await planningPage.verifyViewsMappedToContext(viewsFromPS, testData.EXPECTED_VIEWS_IN_PS),
      true,
      'All Views should be displayed in Planning Space after removing mapping Assertion by default'
    );
    expect(validation).toBeTruthy();
  });

  test('Test Case 9: verify views removed to sub process', async ({ testUtil, planningListingPage, planningPage, commonFunctions, powerBarPage, testData }) => {
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Subprocess', testData.SUB_PROCESS_CONTEXT.PROCESS_NAME, testData.SUB_PROCESS_CONTEXT.SUB_PROCESS_NAME, "", false);
    await testUtil.clickLeftpaneLinks('Planning');
    const validation = await planningPage.isPlanningViewsSettingsButtonDisplayed();
    await commonFunctions.compareTwoValues(validation, true, 'Planning Views settings button should be visible even after removing the mapping of views to subprocess');
    expect(validation).toBeTruthy();
  });

  test('Test Case 10: verify views removed to assumption', async ({ testUtil, planningListingPage, planningPage, commonFunctions, powerBarPage, testData }) => {
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Assumption', testData.ASSUMPTION_RISK_CONTEXT.ORIGIN, '',testData.ASSUMPTION_RISK_CONTEXT.ASSUMPTION, false);
    const validation = await planningPage.isPlanningViewsSettingsButtonDisplayed();
    await commonFunctions.compareTwoValues(validation, true, 'Planning Views settings button should be visible even after removing the mapping of views to assumption');
    expect(validation).toBeTruthy();
  });

  

  
});
