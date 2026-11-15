import { test, expect } from '../../../configs/fixtures';
import type { Page } from '@playwright/test';
import { CommonFunctions, getErrorMessage } from '../../../util/common.util';
import { TestUtil } from '../../../util/test.util';
import { ACTIVE_MFE_IFRAME } from '../../../pageobjects/page';
import { PortalPage } from '../../../pageobjects/portal.page';
import { getTimeout } from '../../../constants/timeouts';
import { applyGatewayOverrides } from '../../../util/gateway.util';

const psEnv = process.env.PSENV || process.env.ENVIRONMENT || 'INTEROP';
const testDataPath = "testdata/" + psEnv + "/PlanningSpace/QuickLinks/Test_001_EasyAccessQuickLinksFromPS.json";
// Loaded at module level because the test list is built from quickLinks; wrapped so Gravitee runs get the GRAVITEE block.
const TestData = applyGatewayOverrides(require("../../../" + testDataPath), testDataPath);

const NEW_TAB_LINKS = ["Cognitive Model", "Process Settings"];
const POWER_BAR_LINKS = ["Cognitive Model", "Process Settings"];

test.describe.serial('Quick Links Navigation Validations - PS', () => {
  test('Test Case 1: Login and navigate to Planning Space process', async ({ testUtil, portalPage, page }) => {
    await testUtil.launchAppFromCatalog(
      TestData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
    );
    await portalPage.dismissPortalDialog();
    await page.goto(`${process.env.NAVIGATE_TO_PLANNING_SPACE as string}process/${TestData.PROCESS_NAME}/processplan/link`);
    await portalPage.dismissPortalDialog();
    // Gravitee portals can restore the AI briefing over the app after a navigation, which hides the side nav.
    await portalPage.showApplicationIfBriefingOpen();
  });

  TestData.quickLinks.forEach((link: { name: string; pageTitle: string; env: string }, index: number) => {
    test(`Test Case ${index + 2}: Validate Navigation for ${link.name}`, async ({ page, testUtil, portalPage, commonFunctions }) => {
      const result = await validateNavigation(page, testUtil, portalPage, commonFunctions, link.name, link.pageTitle, link.env);
      expect(result).toBe(true);
    });
  });
});

async function validateNavigation(
  page: Page,
  testUtil: TestUtil,
  portalPage: PortalPage,
  commonFunctions: CommonFunctions,
  linkName: string,
  expectedTitle: string,
  env: string,
): Promise<boolean> {
  const isNewTab = NEW_TAB_LINKS.includes(linkName);
  const isPowerBarLink = POWER_BAR_LINKS.includes(linkName);
  const originPage = page;
  let activePage = page;

  try {
    await commonFunctions.logMessage('INFO', `Testing link: ${linkName}`);
    // The previous link's navigation back to Planning can bring the briefing back.
    await portalPage.showApplicationIfBriefingOpen();

    if (isPowerBarLink) {
      if (isNewTab) {
        await commonFunctions.logMessage('INFO', `Opening ${linkName} in a new tab`);
        activePage = await testUtil.clickPowerBarLinkOpeningNewTab(linkName);
      } else {
        await testUtil.clickPowerBarLink(linkName);
      }
    } else {
      await testUtil.clickLeftpaneLinks(linkName);
    }

    try {
      await activePage.waitForURL(url => url.toString().includes(env), { timeout: getTimeout('XLARGE') });
    } catch (error) {
      await commonFunctions.logMessage('WARN', `URL validation timeout for ${linkName}: ${getErrorMessage(error)}`);
    }

    // A link that opens a new tab or another app lands on a fresh portal page, which can open on the briefing.
    // The fixture is bound to the origin page, so only a new tab needs its own PortalPage.
    await (activePage === originPage ? portalPage : new PortalPage(activePage)).showApplicationIfBriefingOpen();
    const currentUrl = activePage.url();
    await commonFunctions.logMessage('INFO', `Current URL: ${currentUrl}`);

    const urlValidation = await commonFunctions.compareTwoValues(currentUrl.includes(env), true, `URL Validation for ${linkName}`);
    const titleValidation = await validatePageTitle(activePage, commonFunctions, expectedTitle, linkName);
    const isValidationSuccessful = urlValidation && titleValidation;

    await commonFunctions.logMessage(
      isValidationSuccessful ? 'PASS' : 'FAIL',
      `${linkName} navigation validation ${isValidationSuccessful ? 'successful' : 'failed'}`,
    );

    await cleanupNavigation(originPage, activePage, testUtil, commonFunctions, isNewTab, linkName);
    return isValidationSuccessful;
  } catch (error) {
    await commonFunctions.logMessage('FAIL', `Error during navigation validation for ${linkName}: ${getErrorMessage(error)}`);
    return false;
  }
}

async function validatePageTitle(page: Page, commonFunctions: CommonFunctions, expectedTitle: string, linkName: string): Promise<boolean> {
  try {
    if (linkName === 'Identity & Access') {
      const mainPageTitleLocator = page.getByText(expectedTitle, { exact: false }).first();
      try {
        await mainPageTitleLocator.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
        return await commonFunctions.compareTwoValues(true, true, `Page Title Validation for ${linkName}`);
      } catch {
        await commonFunctions.logMessage('INFO', `Title not found in main page for ${linkName}, checking MFE frame`);
      }
    }

    if (linkName === 'Planning') {
      const planningHeaderLocator = page.frameLocator(ACTIVE_MFE_IFRAME).getByTestId('app-header-block-title')
        .or(page.frameLocator(ACTIVE_MFE_IFRAME).getByTestId('power-bar'))
        .or(page.getByRole('button', { name: 'Planning' }))
        .first();
      try {
        await planningHeaderLocator.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
        return await commonFunctions.compareTwoValues(true, true, `Page Title Validation for ${linkName}`);
      } catch {
        await commonFunctions.logMessage('INFO', `Planning header not found in MFE frame, checking fallback`);
      }
    }

    const frameTitleLocator = page.frameLocator(ACTIVE_MFE_IFRAME).getByText(expectedTitle, { exact: false }).first();
    try {
      await frameTitleLocator.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
      return await commonFunctions.compareTwoValues(true, true, `Page Title Validation for ${linkName}`);
    } catch {
      await commonFunctions.logMessage('WARN', `Expected title '${expectedTitle}' not found in MFE frame for ${linkName}`);
      if (page.url().includes(linkName.toLowerCase().replace(/\s+/g, '').replace(/&/g, ''))
          || (linkName === 'Planning' && (page.url().includes('ibppsintegration') || page.url().includes('processplan')))) {
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

async function cleanupNavigation(
  originalPage: Page,
  activePage: Page,
  testUtil: TestUtil,
  commonFunctions: CommonFunctions,
  isNewTab: boolean,
  linkName: string,
): Promise<void> {
  if (isNewTab && activePage !== originalPage && !activePage.isClosed()) {
    await commonFunctions.logMessage('INFO', 'Cleaning up: Closing the new tab');
    await activePage.close();
    await testUtil.switchToSpecificWindow(0);
    testUtil.page = originalPage.isClosed() ? testUtil.page : originalPage;
    return;
  }

  if (!isNewTab && linkName !== 'Planning') {
    try {
      await testUtil.clickLeftpaneLinks('Planning');
      await originalPage.waitForURL(url => url.toString().includes('ibppsintegration'), { timeout: getTimeout('XLARGE') });
      const planningTitleLocator = originalPage.frameLocator(ACTIVE_MFE_IFRAME).getByTestId('app-header-block-title')
        .or(originalPage.frameLocator(ACTIVE_MFE_IFRAME).getByTestId('power-bar'))
        .first();
      await planningTitleLocator.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') }).catch(() => {});
    } catch (error) {
      await commonFunctions.logMessage('WARN', `Navigation back to Planning failed: ${getErrorMessage(error)}`);
    }
  }
}
