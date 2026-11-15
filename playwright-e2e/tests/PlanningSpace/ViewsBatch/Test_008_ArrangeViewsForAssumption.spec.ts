import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Arranging Views and Verify in Planning space - Assumption', () => {
  test.beforeAll(async ({ testUtil, planningPage, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      testData.PROCESS_NAME
    );
    await planningPage.waitForViewToBeDisplayed();
  });

  test('Test case 1 : map with 1 process', async ({ testUtil, globalSettingsPage, testData, page }) => {
    await testUtil.navigateToProcessListingPage();
    await globalSettingsPage.clickGlobalSettings();
    await globalSettingsPage.clickGlobalSettingsListMenu('Assumption Type');
    await globalSettingsPage.removeViewMappingToEntity(testData.ASSUMPTION.ASSUMPTION_TYPE);
    await page.waitForTimeout(3000);
    await globalSettingsPage.selectProcessAction(testData.ASSUMPTION.ASSUMPTION_TYPE, 'Map With...');

    const mapWithProcess = await globalSettingsPage.mapWithProcesscount('Assumption Type');
    expect(mapWithProcess).toBeTruthy();
  });

  test('Test case 2 : display selected views in arrange views', async ({ globalSettingsPage, testData }) => {
    const selectedViews = await globalSettingsPage.displaySelectedViews(testData.VIEW_GROUPS.VIEW_GROUP1);
    expect(selectedViews).toBeTruthy();
  });

  test('Test case 3 : selected views order', async ({ globalSettingsPage, testData }) => {
    const selectedViewsOrder = await globalSettingsPage.displayViewsOrder(testData.VIEWS.VIEW1);
    expect(selectedViewsOrder).toBeTruthy();
  });

  test('Test case 4 : Should test drag and drop of views', async ({ globalSettingsPage, testUtil, planningPage, planningListingPage, commonFunctions, testData }) => {
    const poList = await globalSettingsPage.checkDragAndDropViews(
      testData.VIEW_GROUPS.VIEW_GROUP1,
      testData.VIEWS.VIEW2,
      testData.VIEWS.VIEW1
    );
    await commonFunctions.logMessage('INFO', `Views list after drag and drop ${poList}`);

    await testUtil.navigateToPlanningListingPage();
    await planningListingPage.launchContext('Assumption', testData.PROCESS_NAME, '', testData.ASSUMPTION.ASSUMPTION_NAME);
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.clickViewDropdown();

    const psList = await planningPage.getPSContainersAndViews();
    await commonFunctions.logMessage('INFO', `Views list after drag and drop in PS ${psList}`);

    const validation = await commonFunctions.compareTwoValues(
      poList.toString(),
      psList.toString(),
      'Arrange Views drag and drop of views assertion'
    );
    expect(validation).toBeTruthy();
  });

  test('Test case 5 : Should test drag and drop of view groups', async ({testUtil, globalSettingsPage, planningPage, planningListingPage, commonFunctions, testData, page }) => {
    await testUtil.navigateToProcessListingPage();
    await globalSettingsPage.clickGlobalSettings();
    await globalSettingsPage.clickGlobalSettingsListMenu('Assumption Type');
    await globalSettingsPage.removeViewMappingToEntity(testData.ASSUMPTION.ASSUMPTION_TYPE);
    await page.waitForTimeout(3000);
    await globalSettingsPage.selectProcessAction(testData.ASSUMPTION.ASSUMPTION_TYPE, 'Map With...');

    const poList = await globalSettingsPage.dragAndDropContainer(
      testData.VIEW_GROUPS.VIEW_GROUP2,
      testData.VIEW_GROUPS.VIEW_GROUP1
    );
    await commonFunctions.logMessage('INFO', `URL: ${process.env.LUMINATE_PORTAL_URL}${process.env.PSLINK}process/${testData.PROCESS_NAME}/assumption/${testData.ASSUMPTION.ASSUMPTION_ID}/processplan/link/`);
    await page.goto(`${process.env.LUMINATE_PORTAL_URL}${process.env.PSLINK}process/${testData.PROCESS_NAME}/assumption/${testData.ASSUMPTION.ASSUMPTION_ID}/processplan/link/`);
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.clickViewDropdown();

    const psViews = await planningPage.getPSContainersAndViews(testData.VIEW_GROUPS.VIEW_GROUP2);
    await commonFunctions.logMessage('INFO', `Views list after drag and drop in PS ${psViews}`);

    const validation = await commonFunctions.compareTwoValues(
      poList.toString(),
      psViews.toString(),
      'Arrange Views drag and drop of view groups assertion'
    );
    expect(validation).toBeTruthy();
  });
});
