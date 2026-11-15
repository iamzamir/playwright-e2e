import { test, expect } from '../../../configs/fixtures';

test.describe.serial('Edit Process Calendar and Cycle in PO', () => {

  test('Test Case 1: Edit calendar and its cycle from PO Summary', async ({ testUtil, processPage, commonFunctions, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME, process.env.FUNCTIONAL_TEST_PASSWORD, process.env.POLINK as string);
    await testUtil.navigateToProcessListingPage();

    await processPage.clickOnProcess(testData.PROCESS_NAME);
    const titleText = await processPage.getPageTitle(testData.PROCESS_NAME);
    const titleValidation = await commonFunctions.compareTwoValues(titleText?.trim(), testData.PROCESS_NAME, `Validating process name as title: ${testData.PROCESS_NAME}`);

    await processPage.clickOnThreeDotMenu();
    await processPage.clickOnMenuItem('Edit Details');
    await processPage.fillCreateProcessForm(testData.PROCESS_NAME, testData.CALENDAR, testData.CYCLE_NAME, '', '');

    await processPage.processActions('Save');
    const successValidation = await commonFunctions.compareTwoValues(await processPage.alertMsg(`Process ${testData.PROCESS_NAME.replace(/\s/g, "")} has been updated successfully`), true, `Validating success toast for process update: ${testData.PROCESS_NAME}`);

    const statusText = await processPage.getProcessStatusLabelText();
    const statusValidation = await commonFunctions.compareTwoValues(statusText?.trim(), 'Not Started', `Validating process status is "Not Started"`);

    expect(titleValidation && successValidation && statusValidation).toBeTruthy();
  });
});
