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

  test('Test Case 1: Map Views To Process', async ({ testUtil, globalSettingsPage, commonFunctions, testData }) => {
    await testUtil.navigateToProcessListingPage();
    await globalSettingsPage.clickGlobalSettings();
    await globalSettingsPage.clickGlobalSettingsListMenu('Process');
    await globalSettingsPage.selectProcess(testData.PROCESS_CONTEXT.PROCESS_NAME);

    const resetValidation: boolean = await commonFunctions.compareTwoValues(
      await globalSettingsPage.removeViewMappingToEntity(testData.PROCESS_CONTEXT.PROCESS_NAME),
      true,
      'Reset Step - Remove Mapping Assertion for Process'
    );
    const isViewMapSuccess: boolean = await globalSettingsPage.addViewMappingToEntity(
      testData.PROCESS_CONTEXT.PROCESS_NAME,
      testData.MAP_VIEWS_TO_PROCESS
    );
    const saveValidation: boolean = await commonFunctions.compareTwoValues(
      isViewMapSuccess,
      true,
      'View Mapping Save Assertion for Process'
    );

    expect(resetValidation && saveValidation).toBeTruthy();
  });

  test('Test Case 2: Map Views To Sub Process', async ({ globalSettingsPage, commonFunctions, testData }) => {
    const resetValidation: boolean = await commonFunctions.compareTwoValues(
      await globalSettingsPage.removeViewMappingToEntity(testData.SUB_PROCESS_CONTEXT.SUB_PROCESS_NAME),
      true,
      'Reset Step - Remove Mapping Assertion for Subprocess'
    );
    const isViewMapSuccess: boolean = await globalSettingsPage.addViewMappingToEntity(
      testData.SUB_PROCESS_CONTEXT.SUB_PROCESS_NAME,
      testData.MAP_VIEWS_TO_SUBPROCESS
    );
    const saveValidation: boolean = await commonFunctions.compareTwoValues(
      isViewMapSuccess,
      true,
      'View Mapping Save Assertion for Subprocess'
    );

    expect(resetValidation && saveValidation).toBeTruthy();
  });

  test('Test Case 3: Map Views To Assumption', async ({ globalSettingsPage, commonFunctions, testData }) => {
    await globalSettingsPage.clickGlobalSettingsListMenu('Assumption Type');

    const resetValidation: boolean = await commonFunctions.compareTwoValues(
      await globalSettingsPage.removeViewMappingToEntity(testData.ASSUMPTION_RISK_CONTEXT.ASSUMPTION_TYPE),
      true,
      'Reset Step - Remove Mapping Assertion for Assumption'
    );
    const isViewMapSuccess: boolean = await globalSettingsPage.addViewMappingToEntity(
      testData.ASSUMPTION_RISK_CONTEXT.ASSUMPTION_TYPE,
      testData.MAP_VIEWS_TO_ASSUMPTION
    );
    const saveValidation: boolean = await commonFunctions.compareTwoValues(
      isViewMapSuccess,
      true,
      'View Mapping Save Assertion for Assumption'
    );

    expect(resetValidation && saveValidation).toBeTruthy();
  });

  test('Test Case 4: verify views mapped to process', async ({ testUtil, planningListingPage, planningPage, commonFunctions, testData }) => {
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Process', testData.PROCESS_CONTEXT.PROCESS_NAME);
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.clickViewDropdown();

    const viewsFromPS: string[] = await planningPage.getAllViews();
    const validation: boolean = await commonFunctions.compareTwoValues(
      await planningPage.verifyViewsMappedToContext(viewsFromPS, testData.EXPECTED_VIEWS_IN_PS),
      true,
      'Views Mapped to Process in Planning Space Assertion'
    );
    expect(validation).toBeTruthy();
  });

  test('Test Case 5: verify views mapped to sub process', async ({ testUtil, planningListingPage, planningPage, commonFunctions, testData }) => {
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Subprocess', testData.SUB_PROCESS_CONTEXT.PROCESS_NAME, testData.SUB_PROCESS_CONTEXT.SUB_PROCESS_NAME);
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.clickViewDropdown();

    const viewsFromPS: string[] = await planningPage.getAllViews();
    const validation: boolean = await commonFunctions.compareTwoValues(
      await planningPage.verifyViewsMappedToContext(viewsFromPS, testData.EXPECTED_VIEWS_IN_PS),
      true,
      'Views mapped to Subprocess in Planning Space Assertion'
    );
    expect(validation).toBeTruthy();
  });

  test('Test Case 6: verify views mapped to assumption', async ({ testUtil, planningListingPage, planningPage, commonFunctions, testData }) => {
    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext(
      'Assumption',
      testData.ASSUMPTION_RISK_CONTEXT.ORIGIN,
      '',
      testData.ASSUMPTION_RISK_CONTEXT.ASSUMPTION
    );
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.clickViewDropdown();

    const viewsFromPS: string[] = await planningPage.getAllViews();
    const validation: boolean = await commonFunctions.compareTwoValues(
      await planningPage.verifyViewsMappedToContext(viewsFromPS, testData.EXPECTED_VIEWS_IN_PS),
      true,
      'Views mapped to Assumption in Planning Space Assertion'
    );
    expect(validation).toBeTruthy();
  });
  
});
