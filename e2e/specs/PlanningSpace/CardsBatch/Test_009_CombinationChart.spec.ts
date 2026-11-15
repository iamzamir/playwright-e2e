const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/CardsBatch/Test_009_CombinationChart.json");
import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';

const cardTitle = 'Combination_Chart_Cards_test';

describe('Should Create, Edit, Configure & Delete Combination Chart', async () => {
  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    await browser.pause(5000);
    await PlanningSpace.clickViewsDropDown();
    await PlanningSpace.selectAllViewsOrFavourites("All Views")
    await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
  });

  it('Test Case 1: Should check if card exists', async () => {
    await browser.pause(5000);
    await CommonFunctions.logMessage('INFO', 'Starting Test Case 1: Should check if card exists');        
    const bValidation1: boolean = await PlanningSpace.verifyCardafterSavingDashboard(cardTitle, TestData.VIEW_NAME);
    await CommonFunctions.compareTwoValues(bValidation1, true, `Does card with title ${cardTitle} available in ${TestData.VIEW_NAME} Page`);
    expect(bValidation1).toBeTruthy();
    await CommonFunctions.logMessage('PASS', 'Test Case 1 completed successfully.');
  });

  it("Test Case 2: Verify Graph is Visible", async () => {
      await browser.pause(5000);
      await CommonFunctions.logMessage('INFO', 'Starting Test Case 2: Verify Graph is Visible');
      const bValidation1: boolean = await PlanningSpace.clickEditBtn();
      await CommonFunctions.compareTwoValues(bValidation1, true, `Clicked on edit icon in ${TestData.VIEW_NAME} view`);
      await PlanningSpace.addAnotherCardOrContainer('Card');
      const bValidation2: boolean = await PlanningSpace.editDataEndpoint(cardTitle, {endPoint1: TestData.DATA_ENDPOINT1, endPoint2: TestData.DATA_ENDPOINT2}, 'Combination Chart');
      await CommonFunctions.compareTwoValues(bValidation2, true, `Is Description field updated successfully for ${cardTitle} card`);

      await PlanningSpace.clickBackButtonInCardGallery();
      
      await PlanningSpace.saveCardInView();
      
      await browser.pause(5000);
      const isGraphVisible = await PlanningSpace.verifyGraphInCard(cardTitle);
      await CommonFunctions.compareTwoValues(isGraphVisible, true, `Graph should be visible in the card titled '${cardTitle}'`);
      expect(isGraphVisible).toBe(true);
      await CommonFunctions.logMessage('PASS', `Test Case 2: Graph is successfully verified as visible in the card titled '${cardTitle}'`);
  });
  
  // Commenting this test case because the PS environment does not have control over the endpoint data.
  /* it('Test case 3: Verify No data available', async () => {
      await browser.pause(5000);

      await CommonFunctions.logMessage('INFO', 'Starting Test Case 3: Verify No data available');

      const bValidation1: boolean = await PlanningSpace.clickEditBtn();
      await CommonFunctions.compareTwoValues(bValidation1, true, `Clicked on edit icon in ${TestData.VIEW_NAME} view`);
      await PlanningSpace.addAnotherCardOrContainer('Card');
      const bValidation2: boolean = await PlanningSpace.editDataEndpoint(cardTitle, {endPoint1: TestData.NO_DATA_ENDPOINT, endPoint2: TestData.NO_DATA_ENDPOINT}, 'Combination Chart');
      await CommonFunctions.compareTwoValues(bValidation2, true, `Is Description field updated successfully for ${cardTitle} card`);

      await PlanningSpace.clickBackButtonInCardGallery();
      await PlanningSpace.saveCardInView();
      await browser.pause(5000);
      const bValidation3 = await PlanningSpace.verifyNoDataInCard(cardTitle);

      expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();

      await CommonFunctions.logMessage('INFO', 'Test Case 3: Verify No data available Completed');
  }) */

  // Commenting this test case because the PS environment does not have control over the endpoint data.
  // it('Test case 4: Verify Something went wrong', async () => {
  //     await browser.pause(5000);

  //     await CommonFunctions.logMessage('INFO', 'Starting Test Case 4: Verify Something went wrong');

  //     const bValidation1: boolean = await PlanningSpace.clickEditBtn();
  //     await CommonFunctions.compareTwoValues(bValidation1, true, `Clicked on edit icon in ${TestData.VIEW_NAME} view`);
  //     await PlanningSpace.addAnotherCardOrContainer('Card');
  //     const bValidation2: boolean = await PlanningSpace.editDataEndpoint(cardTitle, {endPoint1: TestData.WRONG_ENDPOINT, endPoint2: TestData.WRONG_ENDPOINT}, 'Combination Chart');
  //     await CommonFunctions.compareTwoValues(bValidation2, true, `Is Description field updated successfully for ${cardTitle} card`);

  //     await PlanningSpace.clickBackButtonInCardGallery();
      
  //     await PlanningSpace.saveCardInView();
      
  //     await browser.pause(5000);
  //     const bValidation3 = await PlanningSpace.verifySomethingWentWrongInCard(cardTitle);

  //     expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();

  //     await CommonFunctions.logMessage('INFO', 'Test Case 4: Verify Something went wrong Completed');
  // })
});
