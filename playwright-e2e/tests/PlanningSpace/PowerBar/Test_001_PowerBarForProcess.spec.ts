import { test, expect } from '../../../configs/fixtures';

test.describe.serial("PowerBar Details for Process - Planning Space", () => {
  test("Test Case 1: Launch app and verify powerbar details", async ({ powerBarPage, commonFunctions, testUtil, planningListingPage, testData }) => {
    await test.step("Step 1: Launch app and Process context", async () => {
      await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
      await testUtil.navigateToPlanningListingPage();
      await planningListingPage.launchContext("Process", testData.PROCESS_NAME);
    });

    await test.step("Step 2: Verify powerbar details", async () => {
      const validation1 = await powerBarPage.verifyPowerBarDetails('Process', testData.PROCESS_NAME);
      await commonFunctions.compareTwoValues(validation1, true, "verify process details in power bar tooltip");
      expect(validation1).toEqual(true);
    });
  });

  test("Test Case 2: Verify scope chip click opens scope tab", async ({ powerBarPage, commonFunctions }) => {
    await test.step("Step 1: Click scope chip and verify drawer opens", async () => {
      const validation1 = await powerBarPage.verifyPowerBarScopeChipClick();
      await commonFunctions.compareTwoValues(validation1, true, "scope chip click opens scope tab");
      expect(validation1).toEqual(true);
    });
  });

  test("Test Case 3: Verify scenario chip click opens scope tab", async ({ powerBarPage, commonFunctions }) => {
    await test.step("Step 1: Click scenario chip and verify drawer opens", async () => {
      const validation1 = await powerBarPage.verifyPowerBarScenarioChipClick();
      await commonFunctions.compareTwoValues(validation1, true, "scenario chip click opens scenarios tab");
      expect(validation1).toEqual(true);
    });
  });

  test("Test Case 4: Verify process details in power tooltip", async ({ powerBarPage, commonFunctions, testData }) => {
    await test.step("Step 1: Verify process details in power tooltip", async () => {
      const validation1 = await powerBarPage.verifyPowerBarToolTipDetails(testData.PROCESS_NAME, 'Process');
      await commonFunctions.compareTwoValues(validation1, true, "verify process details in power bar tooltip");
      expect(validation1).toEqual(true);
    });
  });
});


