import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Arranging Views and Verify in Planning space - Process & Subprocess', () => {
  test.beforeAll(async ({ testUtil, planningPage, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      testData.PROCESS_NAME
    );
    await planningPage.waitForViewToBeDisplayed();
  });

  test('Test case 1 : Map with 1 process', async ({ testUtil, globalSettingsPage, commonFunctions, testData }) => {
    await testUtil.navigateToProcessListingPage();
    await globalSettingsPage.clickGlobalSettings();
    await globalSettingsPage.clickGlobalSettingsListMenu('Process');
    await globalSettingsPage.selectProcess(testData.PROCESS_CONTEXT.PROCESS_NAME);
    await globalSettingsPage.selectProcessBulkAction('Remove All Mappings');
    await globalSettingsPage.selectProcessAction(testData.PROCESS_CONTEXT.PROCESS_NAME, 'Map With...');
    const mapWithProcess = await globalSettingsPage.mapWithProcesscount('Process');
    await commonFunctions.logMessage('INFO', `${mapWithProcess} test case 1`);
    expect(mapWithProcess).toBeTruthy();
  });

  test('Test case 2 : Display selected Views', async ({ globalSettingsPage, testData }) => {
    const selectedViews = await globalSettingsPage.displaySelectedViews(testData.VIEW_GROUPS.VIEW_GROUP1);
    expect(selectedViews).toBeTruthy();
  });

  test('Test case 3 : selected views order', async ({ globalSettingsPage, testData }) => {
    const selectedViewsOrder = await globalSettingsPage.displayViewsOrder(testData.VIEWS.VIEW1);
    expect(selectedViewsOrder).toBeTruthy();
  });

  test('Test case 4 : Should test drag and drop of views', async ({ globalSettingsPage, testUtil, planningPage, commonFunctions, testData }) => {
    let compareViewsAfterDragAndDrop: any[] = await globalSettingsPage.checkDragAndDropViews(
      testData.VIEW_GROUPS.VIEW_GROUP1,
      testData.VIEWS.VIEW2,
      testData.VIEWS.VIEW1
    );
    await commonFunctions.logMessage('INFO', `Fetched containers and views after drag and drop ${compareViewsAfterDragAndDrop}`);
    compareViewsAfterDragAndDrop = compareViewsAfterDragAndDrop.slice(1) ; // Removing the first element as it is container name
    await commonFunctions.logMessage('INFO', `Fetched views after drag and drop ${compareViewsAfterDragAndDrop}`);
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.clickViewDropdown();

    const psList = await planningPage.getAllViews(testData.VIEW_GROUPS.VIEW_GROUP1);
    await commonFunctions.logMessage('INFO', `Fetched containers and views after drag and drop in ps ${psList}`);
    const validation: boolean = await commonFunctions.compareTwoValues(
      compareViewsAfterDragAndDrop.toString(),
      psList.toString(),
      'Arrange Views Assertion'
    );
    expect(validation).toBeTruthy();
  });

  test('Test case 5 : Should test drag and drop of view groups', async ({ testUtil, globalSettingsPage, planningPage, commonFunctions, testData }) => {
    await testUtil.navigateToProcessListingPage();
    await globalSettingsPage.clickGlobalSettings();
    await globalSettingsPage.clickGlobalSettingsListMenu('Process');
    await globalSettingsPage.selectProcess(testData.PROCESS_CONTEXT.PROCESS_NAME);
    await globalSettingsPage.selectProcessBulkAction('Remove All Mappings');
    await globalSettingsPage.selectProcessAction(testData.PROCESS_CONTEXT.PROCESS_NAME, 'Map With...');

    const compareViewGroupsAfterDragAndDrop = await globalSettingsPage.dragAndDropContainer(
      testData.VIEW_GROUPS.VIEW_GROUP2,
      testData.VIEW_GROUPS.VIEW_GROUP1
    );
    await commonFunctions.logMessage('INFO', `Fetched containers and views after drag and drop ${compareViewGroupsAfterDragAndDrop}`);

    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.clickViewDropdown();

    const getAllViewGroups: string[] = await planningPage.getPSContainersAndViews();
    await commonFunctions.logMessage('INFO', `Fetched containers and views after drag and drop in ps ${getAllViewGroups}`);
    const validation: boolean = await commonFunctions.compareTwoValues(
      compareViewGroupsAfterDragAndDrop.toString(),
      getAllViewGroups.toString(),
      'Arrange Views Assertion'
    );
    expect(validation).toBeTruthy();
  });
});
