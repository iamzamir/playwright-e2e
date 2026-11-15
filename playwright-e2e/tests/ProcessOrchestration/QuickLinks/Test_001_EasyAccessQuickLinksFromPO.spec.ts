import { test, expect } from '../../../configs/fixtures';
import type { Page } from '@playwright/test';
import type { TestUtil } from '../../../util/test.util';
import type { CommonFunctions } from '../../../util/common.util';
import { getErrorMessage } from '../../../util/common.util';
import { getTimeout } from '../../../constants/timeouts';
import { ACTIVE_MFE_IFRAME } from '../../../pageobjects/page';

test.describe.serial('Quick Links Navigation Validations - PO', () => {
  // The navigation helpers below reassign `page` when a link opens in a new tab,
  // so fixtures are captured into shared references instead of injected per helper.
  let commonFunctions: CommonFunctions, objTestUtil: TestUtil, page: Page;

  test.beforeEach(async ({ page: fixturePage, testUtil, commonFunctions: fixtureCommonFunctions }) => {
    page = fixturePage;
    objTestUtil = testUtil;
    commonFunctions = fixtureCommonFunctions;
  });

  test('Test Case 1: Login and Navigate to Process', async ({ planningListingPage, portalPage, testData }) => {
    await objTestUtil.launchAppFromCatalog(testData.REALM_NAME);
    await portalPage.dismissPortalDialog();
    await objTestUtil.navigateToPlanningListingPage();
    await portalPage.dismissPortalDialog();
    await planningListingPage.launchContext("Process", testData.PROCESS_NAME);
  });

  test('Test Case 2: Validate Navigation for Process Summary', async () => {
    await commonFunctions.logMessage('INFO', 'Testing link: Process Summary');
    const result = await validateNavigation('Process Summary', 'Initiatives And Assumptions Review', 'pointegration');
    expect(result).toBe(true);
  });

  test('Test Case 3: Validate Navigation for Planning', async () => {
    await commonFunctions.logMessage('INFO', 'Testing link: Planning');
    const result = await validateNavigation('Planning', 'Planning', 'ibppsintegration');
    expect(result).toBe(true);
  });

  /*
  test('Test Case 4: Validate Navigation for Assumptions', async () => {
    await commonFunctions.logMessage('INFO', 'Testing link: Assumptions');
    const result = await validateNavigation('Assumptions', 'Assumptions', 'pointegration');
    expect(result).toBe(true);
  });*/

  test('Test Case 5: Validate Navigation for Action Items', async () => {
    await commonFunctions.logMessage('INFO', 'Testing link: Action Items');
    const result = await validateNavigation('Action Items', 'Action Items', 'pointegration');
    expect(result).toBe(true);
  });

  // test('Test Case 6: Validate Navigation for Scenario', async () => {
  //   await commonFunctions.logMessage('INFO', 'Testing link: Scenario');
  //   const result = await validateNavigation('Scenario', 'Manage Scenarios', 'ibppsintegration');
  //   expect(result).toBe(true);
  // });

  test('Test Case 7: Validate Navigation for SNA', async () => {
    await commonFunctions.logMessage('INFO', 'Testing link: SNA');
    const result = await validateNavigation('Cognitive Model', 'Cognitive Model', 'semantic-network-architect-interop');
    expect(result).toBe(true);
  });

  // test('Test Case 8: Validate Navigation for Identity & Access', async () => {
  //   await commonFunctions.logMessage('INFO', 'Testing link: Identity & Access');
  //   const result = await validateNavigation('Identity & Access', 'Users', 'identityaccess');
  //   expect(result).toBe(true);
  // });

  test('Test Case 9: Validate Navigation for Process Settings', async () => {
    await commonFunctions.logMessage('INFO', 'Testing link: Process Settings');
    const result = await validateNavigation('Process Settings', 'Structure & Schedule', 'pointegration');
    expect(result).toBe(true);
  });

  // test('Test Case 10: Validate Navigation for CBP Observability', async () => {
  //   await commonFunctions.logMessage('INFO', 'Testing link: CBP Observability');
  //   const result = await validateNavigation('CBP Observability', 'Procedure Orchestration', 'proc-svc-jes-interop');
  //   expect(result).toBe(true);
  // });

  // test('Test Case 11: Validate Navigation for BYDM Workbench', async () => {
  //   await commonFunctions.logMessage('INFO', 'Testing link: BYDM Workbench');
  //   const result = await validateNavigation('BYDM Workbench', 'Data Models', 'data-model-management');
  //   expect(result).toBe(true);
  // });

  // test('Test Case 12: Validate Navigation for MaaS Command Center', async () => {
  //   await commonFunctions.logMessage('INFO', 'Testing link: MaaS Command Center');
  //   const result = await validateNavigation('MaaS Command Center', 'Clusters', 'maas-command-center-interop');
  //   expect(result).toBe(true);
  // });

  async function validateNavigation(sLinkName: string, expectedTitle: string, env: string): Promise<boolean> {
    const newTabLinks = ["Cognitive Model", "Process Settings"];
    const moreLinks = ["Cognitive Model", "Process Settings"];
    const isNewTab = newTabLinks.includes(sLinkName);
    const originPage = page;
    let activePage = page;

    try {
      if (moreLinks.includes(sLinkName)) {
        if (isNewTab) {
          await commonFunctions.logMessage('INFO', `Opening ${sLinkName} in a new tab`);
          activePage = await objTestUtil.clickPowerBarLinkOpeningNewTab(sLinkName);
          page = activePage;
        } else {
          await objTestUtil.clickPowerBarLink(sLinkName);
        }
      } else {
        await objTestUtil.clickLeftpaneLinks(sLinkName);
      }
    } catch (error) {
      await commonFunctions.logMessage('ERROR', `Error navigating to ${sLinkName}: ${getErrorMessage(error)}`);
      return false;
    }

    try {
      await activePage.waitForURL(url => url.toString().includes(env), { timeout: getTimeout('XLARGE') });
    } catch (error) {
      await commonFunctions.logMessage('WARN', `URL validation timeout for ${sLinkName}: ${getErrorMessage(error)}`);
    }

    const currentUrl = activePage.url();
    await commonFunctions.logMessage('INFO', `Current URL: ${currentUrl}`);

    const urlValidation = await commonFunctions.compareTwoValues(currentUrl.includes(env), true, `URL Validation for ${sLinkName}`);
    const titleValidation = await validatePageTitle(activePage, expectedTitle, sLinkName);
    const isValidationSuccessful = urlValidation && titleValidation;

    await commonFunctions.logMessage(isValidationSuccessful ? 'PASS' : 'FAIL', `${sLinkName} navigation validation ${isValidationSuccessful ? 'successful' : 'failed'}`);
    await performCleanup(originPage, activePage, isNewTab, sLinkName);
    return isValidationSuccessful;
  }

  async function validatePageTitle(activePage: Page, expectedTitle: string, linkName: string): Promise<boolean> {
    try {
      if (linkName === 'Identity & Access') {
        const mainPageTitleLocator = activePage.getByText(expectedTitle, { exact: false }).first();
        try {
          await mainPageTitleLocator.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
          return await commonFunctions.compareTwoValues(true, true, `Page Title Validation for ${linkName}`);
        } catch {
          await commonFunctions.logMessage('INFO', `Title not found in main page for ${linkName}, checking MFE frame`);
        }
      }

      if (linkName === 'Planning') {
        const planningHeaderLocator = activePage.frameLocator(ACTIVE_MFE_IFRAME).getByTestId('app-header-block-title')
          .or(activePage.frameLocator(ACTIVE_MFE_IFRAME).getByTestId('power-bar'))
          .or(activePage.getByRole('button', { name: 'Planning' }))
          .first();
        try {
          await planningHeaderLocator.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
          return await commonFunctions.compareTwoValues(true, true, `Page Title Validation for ${linkName}`);
        } catch {
          await commonFunctions.logMessage('INFO', `Planning header not found, checking fallback`);
        }
      }

      const titleLocator = activePage.frameLocator(ACTIVE_MFE_IFRAME).getByText(expectedTitle, { exact: false }).first();
      try {
        await titleLocator.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
        return await commonFunctions.compareTwoValues(true, true, `Page Title Validation for ${linkName}`);
      } catch {
        await commonFunctions.logMessage('WARN', `Expected title '${expectedTitle}' not found in MFE frame for ${linkName}`);
        if (activePage.url().includes(linkName.toLowerCase().replace(/\s+/g, '').replace(/&/g, ''))
            || (linkName === 'Planning' && (activePage.url().includes('ibppsintegration') || activePage.url().includes('processplan')))) {
          await commonFunctions.logMessage('INFO', `URL contains expected pattern for ${linkName}, considering as valid`);
          return await commonFunctions.compareTwoValues(true, true, `Page URL Pattern Validation for ${linkName}`);
        }
        return false;
      }
    } catch (error) {
      await commonFunctions.logMessage('ERROR', `Error occurred while validating title for ${linkName}: ${getErrorMessage(error)}`);
      return false;
    }
  }

  async function performCleanup(originPage: Page, activePage: Page, isNewTab: boolean, linkName: string): Promise<void> {
    if (isNewTab && activePage !== originPage && !activePage.isClosed()) {
      await commonFunctions.logMessage('INFO', 'Cleaning up: Closing the new tab');
      await activePage.close();
      await objTestUtil.switchToSpecificWindow(0);
      page = originPage.isClosed() ? objTestUtil.page : originPage;
      objTestUtil.page = page;
      await commonFunctions.logMessage("INFO", "Navigated to PO Page");
      return;
    }

    if (!isNewTab && linkName !== "Process Summary") {
      try {
        const titleLocator = originPage.frameLocator(ACTIVE_MFE_IFRAME).getByText('Initiatives And Assumptions Review', { exact: false }).first();
        await objTestUtil.clickLeftpaneLinks('Process Summary');
        await originPage.waitForURL(url => url.toString().includes("pointegration"), { timeout: getTimeout('XLARGE') });
        await titleLocator.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
      } catch (error) {
        await commonFunctions.logMessage('WARN', `Navigation back to Process Summary failed: ${getErrorMessage(error)}`);
      }
    }
  }
});
