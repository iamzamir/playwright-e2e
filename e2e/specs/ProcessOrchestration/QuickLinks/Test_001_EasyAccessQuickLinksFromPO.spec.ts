import PlanningSpace from '../../../pageobjects/planning.page';
import processPage from '../../../pageobjects/process.page';
import ProcessPage from '../../../pageobjects/process.page';
import CommonFunctions from '../../../util/common.util';
import TestUtil from "../../../util/test.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/QuickLinks/Test_001_EasyAccessQuickLinks.json");

describe('Quick Links Navigation Validations - PO', () => {

  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    await browser.pause(10000);
  });

  const quickLinks = TestData.quickLinks; // Mapping through Quick Links Data in json

  quickLinks.forEach(link => {
    it(`Validate Navigation for ${link.name}`, async () => {
      await CommonFunctions.logMessage('INFO', `Link: ${link}`);
      const result = await validateNavigation(link.name, link.pageTitle, link.env);
      expect(result).toBe(true);
    });
  });

});

async function validateNavigation(sLinkName: string, expectedTitle: string, env: string) {
  let isValidationSuccessful = false;

  // List of links that open in a new tab
  const newTabLinks = [
    "Cognitive Model",
    "Process Settings",
  ];

  const isNewTab = newTabLinks.includes(sLinkName);
  const moreLinks = ["Process Settings", "Cognitive Model"];
  try {
    if(moreLinks.includes(sLinkName)) 
      await TestUtil.clickPowerBarLink(sLinkName);
    else
      await ProcessPage.clickLeftpaneLinks(sLinkName);
    await browser.pause(10000);
    const windowHandles = await browser.getWindowHandles();

    // Switch to new tab
    if (isNewTab && windowHandles.length > 1) {
      await CommonFunctions.logMessage('INFO', `Switching to new tab for ${sLinkName}`);
      await CommonFunctions.switchToSpecificWindow(1);
      await PlanningSpace.switchToMFEFrame();
      await browser.pause(10000);
    }

    // Validate URL 
    let currentUrl = await browser.getUrl();
    let urlValidation = await CommonFunctions.compareTwoValues(currentUrl.includes(env), true, `URL Validation for ${sLinkName}`);

    // Validate Page Title
    const isTitlePresent = await PlanningSpace.getCurrentPageTitle(expectedTitle);
    let titleValidation = await CommonFunctions.compareTwoValues(isTitlePresent, true, `Page Title Validation for ${sLinkName}`);

    // Log status
    isValidationSuccessful = urlValidation && titleValidation;
    await CommonFunctions.logMessage(isValidationSuccessful ? 'PASS' : 'FAIL', `${sLinkName} navigation validation ${isValidationSuccessful ? 'successful' : 'failed'}`);

  } catch (error) {
    await CommonFunctions.logMessage('FAIL', `Error during navigation validation for ${sLinkName}: ${error.message}`);
    isValidationSuccessful = false;
  } finally {
    // Cleanup: Close window if navigated so that other cases run smoothly
    try {
      const windowHandles = await browser.getWindowHandles();
      if (windowHandles.length > 1) {
        await CommonFunctions.logMessage('INFO', 'Cleaning up: Closing the new tab');
        await browser.closeWindow();
        await CommonFunctions.switchToSpecificWindow(0);
        await PlanningSpace.switchToMFEFrame();
        await browser.pause(10000);
      }
      if (!isNewTab) {
        await processPage.clickLeftpaneLinks('Process Summary');
        await browser.pause(10000);
      }
    } catch (cleanupError) {
      await CommonFunctions.logMessage('FAIL', `Error during cleanup (closing tabs): ${cleanupError.message}`);
    }
  }

  return isValidationSuccessful;
}
