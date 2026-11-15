import { test, expect } from '../../../configs/fixtures';

test.describe('Validate Sub Process Creation with Event Restrictions on Process', () => {

  test('Test Case 1: Validate Lookup Field for Sub Process Creation', async ({ testUtil, processPage, commonFunctions, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME);
    await testUtil.navigateToProcessListingPage();
    await processPage.clickOnProcess(testData.PROCESS_NAME);
    await processPage.clickOnAddSubProcess();
    await processPage.selectCalculateStartDateOn("End");
    const bValidation = await commonFunctions.compareTwoValues(await processPage.validateSubProcessFields(testData.PROCESS_NAME), false, `PROCESS_NAME (${testData.PROCESS_NAME}) should not be listed in the dropdown when Calculate start date on is END`);
    expect(bValidation).toBeTruthy();
  });
});

