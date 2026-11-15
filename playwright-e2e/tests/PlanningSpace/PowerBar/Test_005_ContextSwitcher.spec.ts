import { test, expect } from '../../../configs/fixtures';

test.describe.serial('PowerBar - context switcher - Planning Space', () => {
  test('Test Case 1: Verify context switching to a subprocess in the same tab', async ({ powerBarPage, commonFunctions, testUtil, planningListingPage, testData }) => {
    await test.step('Step 1: Launch app and open Process context', async () => {
      await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
      await testUtil.navigateToPlanningListingPage();
      await planningListingPage.launchContext('Process', testData.PROCESS_NAME);
    });

    await test.step('Step 2: Verify context switch to subprocess in same tab', async () => {
      const verifyContextSwitch = await powerBarPage.selectEntityFromContext({
        process: testData.PROCESS_NAME,
        subProcess: testData.SUBPROCESS_NAME,
      }, false, true);

      const validation = await commonFunctions.compareTwoValues(verifyContextSwitch, true, 'verify context switch in power bar');
      expect(validation).toEqual(true);
      await commonFunctions.logMessage('INFO', 'Test case 1: switching the context in the same tab for subprocess verified successfully');
    });
  });

  test('Test Case 2: Verify context switching to an assumption in the same tab', async ({ powerBarPage, commonFunctions, testData }) => {
    await test.step('Step 1: Verify context switch to assumption in same tab', async () => {
      const verifyContextSwitch = await powerBarPage.selectEntityFromContext({
        process: testData.PROCESS_NAME,
        assumption: testData.ASSUMPTION_NAME,
      }, false, true);

      const validation = await commonFunctions.compareTwoValues(verifyContextSwitch, true, 'verify context switch in power bar');
      expect(validation).toEqual(true);
      await commonFunctions.logMessage('INFO', 'Test case 2: switching the context in the same tab for assumption verified successfully');
    });
  });

  test('Test Case 3: Verify context switching to a process in the same tab', async ({ powerBarPage, commonFunctions, testData }) => {
    await test.step('Step 1: Verify context switch to process in same tab', async () => {
      const verifyContextSwitch = await powerBarPage.selectEntityFromContext({
        process: testData.PROCESS_NAME,
      }, false, true);

      const validation = await commonFunctions.compareTwoValues(verifyContextSwitch, true, 'verify context switch in power bar');
      expect(validation).toEqual(true);
      await commonFunctions.logMessage('INFO', 'Test case 3: switching the context in the same tab for process verified successfully');
    });
  });

  test('Test Case 4: Verify context switching to a subprocess in a new tab', async ({ powerBarPage, commonFunctions, testData }) => {
    await test.step('Step 1: Verify context switch to subprocess in new tab', async () => {
      const newTab = true;
      const verifyContextSwitch = await powerBarPage.selectEntityFromContext({
        process: testData.PROCESS_NAME,
        subProcess: testData.SUBPROCESS_NAME,
      }, newTab);

      const validation = await commonFunctions.compareTwoValues(verifyContextSwitch, true, 'verify context switch in power bar');
      expect(validation).toEqual(true);
      await commonFunctions.logMessage('INFO', 'Test case 4: switching the context in the new tab for subprocess verified successfully');
    });
  });

  test('Test Case 5: Verify context switching to an assumption in a new tab', async ({ powerBarPage, commonFunctions, testData }) => {
    await test.step('Step 1: Verify context switch to assumption in new tab', async () => {
      const newTab = true;
      const verifyContextSwitch = await powerBarPage.selectEntityFromContext({
        process: testData.PROCESS_NAME,
        assumption: testData.ASSUMPTION_NAME,
      }, newTab);

      const validation = await commonFunctions.compareTwoValues(verifyContextSwitch, true, 'verify context switch in power bar');
      expect(validation).toEqual(true);
      await commonFunctions.logMessage('INFO', 'Test case 5: switching the context in the new tab for assumption verified successfully');
    });
  });

  test('Test Case 6: Verify context switching to a process in a new tab', async ({ powerBarPage, commonFunctions, testData }) => {
    await test.step('Step 1: Verify context switch to process in new tab', async () => {
      const newTab = true;
      const verifyContextSwitch = await powerBarPage.selectEntityFromContext({
        process: testData.PROCESS_NAME,
      }, newTab);

      const validation = await commonFunctions.compareTwoValues(verifyContextSwitch, true, 'verify context switch in power bar');
      expect(validation).toEqual(true);
      await commonFunctions.logMessage('INFO', 'Test case 6: switching the context in the new tab for process verified successfully');
    });
  });
});


