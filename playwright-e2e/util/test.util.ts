import { Page, expect, Locator, BrowserContext } from '@playwright/test';
import LoginPage from '../pageobjects/login.page';
import { CommonFunctions } from './common.util';
import { PortalPage } from '../pageobjects/portal.page';
import { ACTIVE_MFE_IFRAME } from '../pageobjects/page';
import { PlanningListingPage } from '../pageobjects/planning-listing.page';
import { PlanningPage } from '../pageobjects/planning.page';
import { ScenarioPage } from '../pageobjects/scenario.page';
import { getTimeout, TIMEOUTS } from '../constants/timeouts';
import { waitForDelay } from './wait-helpers';
import { performOidcLoginFlow } from './oidc-login.helper';
import { isGraviteeGateway } from './gateway.util';
import { getConfig } from '../configs/env';

export class TestUtil extends LoginPage {

  private get userIconButton(): Locator { return this.page.locator("//*[self::button[@data-testid='luminate-avatar-menu'] or self::span[@data-testid='luminate-avatar-menu-badge'] or self::button[@aria-label='Profile menu']]"); }
  private get signOutButton(): Locator { return this.page.locator("//li[@data-testid='lui-portal-avatarmenu-drilldown-option-logout']"); }


  private async resetToPrimaryWindow(): Promise<void> {
    const context = this.page.context();
    const pages = context.pages();
    if (pages.length === 0) {
      return;
    }

    const primaryPage = pages[0];
    for (let i = pages.length - 1; i > 0; i--) {
      await pages[i].close().catch(() => { });
    }

    this.page = primaryPage;
    await this.page.bringToFront().catch(() => { });
  }

  public async launchAppFromCatalog(sRealmName: string, sUserName: string = process.env.FUNCTIONAL_TEST_USERNAME as string, sPassword: string = process.env.FUNCTIONAL_TEST_PASSWORD as string, appNamespace: string = "", isSecondUser?: boolean, maxRetries: number = 2): Promise<void> {
    const url = getConfig().hosts.portal as string + appNamespace;
    let objCommonFunction: CommonFunctions = new CommonFunctions();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (await this.isUserAvatarVisible()) {
          await objCommonFunction.logMessage('INFO', 'User avatar already visible. Skipping login flow.');
          return;
        }

        await objCommonFunction.logMessage('INFO', `launchAppFromCatalog attempt ${attempt}/${maxRetries}`);
        await objCommonFunction.logMessage('INFO', `Opening URL: ${url}`);
        await this.page.goto(url);
        await objCommonFunction.logMessage('INFO', `Current URL loaded: ${this.page.url()}`);

        if (await this.isLoggedIn()) {
          await objCommonFunction.logMessage('INFO', 'User already logged in after navigation.');
          return;
        }

        await performOidcLoginFlow({
          portalPage: this.page,
          realmName: sRealmName,
          username: sUserName,
          password: sPassword,
          isSecondUser: Boolean(isSecondUser),
          clickStaySignedIn: !isSecondUser,
          strictStaySignedIn: !isSecondUser,
        });

        await objCommonFunction.logMessage('INFO', 'Login flow completed. Validating portal landing state.');
        let objPortalPage: PortalPage = new PortalPage(this.page);
        await objPortalPage.waitForBYLogo();
        await objCommonFunction.logMessage('PASS', `launchAppFromCatalog succeeded on attempt ${attempt}`);
        return;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await objCommonFunction.logMessage('WARNING', `launchAppFromCatalog attempt ${attempt} failed: ${errorMessage}`);

        if (attempt === maxRetries) {
          throw new Error(`launchAppFromCatalog failed after ${maxRetries} attempts: ${errorMessage}`);
        }

        await this.resetToPrimaryWindow();
        await this.page.goto('about:blank').catch(() => { });
      }
    }
  }

  public async navigateToPlanningListingPage(): Promise<void> {
    let objPortalPage: PortalPage = new PortalPage(this.page);
    await objPortalPage.waitForBYLogo();
    let objCommonFunction: CommonFunctions = new CommonFunctions();
    if (!isGraviteeGateway()) {
      const listingUrl = getConfig().navigation.NAVIGATE_TO_PLANNING_SPACE as string;
      await objCommonFunction.logMessage("INFO", "Navigating to Planning Listing Page with link: " + listingUrl);
      await this.page.goto(listingUrl);
      await this.waitForActiveMfeLoad();
      await objCommonFunction.logMessage("INFO", "Planning Listing Page loaded: " + this.page.url());
      return;
    }
    // The command bar can land on the app path with or without the trailing slash (e.g. /ibppsintegration).
    const planningPath = '/' + (getConfig().links.PSLINK || '').replace(/^\/+|\/+$/g, '');
    await objCommonFunction.logMessage("INFO", "Navigating to Planning Listing Page via dock search: Planning");
    // triggerDockSearchInput logs and returns false on failure instead of throwing.
    if (await objPortalPage.triggerDockSearchInput("Planning") === false) {
      throw new Error("navigateToPlanningListingPage: dock search for 'Planning' failed");
    }
    const isMatchingPlanningPath = (urlStr: string): boolean => {
      try {
        const pathname = new URL(urlStr, 'https://placeholder.local').pathname;
        return pathname === planningPath || pathname.startsWith(planningPath + '/');
      } catch {
        return false;
      }
    };
    if (!isMatchingPlanningPath(this.page.url())) {
      await this.page.waitForURL(
        (url) => url.pathname === planningPath || url.pathname.startsWith(planningPath + '/'),
        { timeout: getTimeout('EXTREME'), waitUntil: 'domcontentloaded' }
      );
    }
    // Close the command bar so it does not keep focus, then let the planning MFE finish loading
    // (a client-side route change does not wait for it the way page.goto did).
    await this.page.keyboard.press('Escape');
    await this.waitForActiveMfeLoad();
    // Newer portals keep the planning MFE iframe warm, so the command bar can resume the last opened context
    // instead of the listing. Open the listing URL once so every caller starts from the context dropdown.
    if (!await new PlanningListingPage(this.page).isContextDropdownVisible()) {
      await objCommonFunction.logMessage("INFO", "Command bar resumed a previous context; opening Planning Listing Page with link: " + getConfig().navigation.NAVIGATE_TO_PLANNING_SPACE);
      await this.page.goto(getConfig().navigation.NAVIGATE_TO_PLANNING_SPACE as string);
      await this.waitForActiveMfeLoad();
    }
    await objCommonFunction.logMessage("INFO", "Planning Listing Page loaded: " + this.page.url());
  }

  private async waitForActiveMfeLoad(): Promise<void> {
    const mfeFrame = await this.page.locator(ACTIVE_MFE_IFRAME).elementHandle({ timeout: getTimeout('EXTREME') });
    await (await mfeFrame?.contentFrame())?.waitForLoadState('load', { timeout: getTimeout('EXTREME') });
  }

  public async navigateToProcessListingPage(): Promise<void> {
    let objPortalPage: PortalPage = new PortalPage(this.page);
    await objPortalPage.waitForBYLogo();
    let objCommonFunction: CommonFunctions = new CommonFunctions();
    await objCommonFunction.logMessage("INFO", "Navigating to Process Listing Page");
    await this.page.goto(getConfig().navigation.NAVIGATE_TO_PROCESS_ORCHESTRATION as string);
    await objPortalPage.showApplicationIfBriefingOpen();
  }

  public async switchToSpecificWindow(nWindow: number = 1): Promise<void> {
    const context = this.page.context();
    await expect.poll(async () => context.pages().length, { timeout: getTimeout('XLARGE') }).toBeGreaterThan(nWindow);
    const livePage = context.pages().find((openPage) => !openPage.isClosed()) ?? this.page;
    if (!livePage.isClosed()) {
      await waitForDelay(livePage, TIMEOUTS.POST_INPUT_SETTLE * 10);
    }
    const pages = context.pages();
    let objCommonFunctions: CommonFunctions = new CommonFunctions();
    await objCommonFunctions.logMessage('INFO', 'No. of Active windows: ' + pages.length);
    await objCommonFunctions.logMessage('INFO', 'Switching to window of index: ' + nWindow);
    if (pages.length > nWindow) {
      await pages[nWindow].bringToFront();
      this.page = pages[nWindow];
      await this.page.waitForLoadState('domcontentloaded');
      await objCommonFunctions.logMessage('INFO', 'Page URL:: ' + await this.page.url());
    } else {
      throw new Error(`Window index ${nWindow} not found. Total open pages: ${pages.length}`);
    }
  }

  public async clickLeftpaneLinks(sLinkname: string) {
    const Leftlink = await this.getLeftPaneLink(sLinkname);
    const navItem = this.mfeLocator('div.nav-item').filter({ has: this.page.locator(`button[aria-label='${sLinkname}']`) });
    // Toggles (the Assumptions flyout, the Scenarios drawer) would close again, and links outside the side nav have no active state.
    const isSideNavPage = sLinkname !== 'Scenarios' && sLinkname !== 'Assumptions' && await navItem.count() > 0;
    await this.doClick(Leftlink, "Clicking Left Pane Link:: " + sLinkname);
    // A click while a Planning view is still rendering can be lost: the tooltip shows and the page stays put (PO
    // ScopeBatch and PowerBar on CI, 2026-10-16). If the side-nav item has not turned active, click once more. The side
    // nav remounts right after a click, so a missing item only counts as "left the page" once the wait has run out.
    if (isSideNavPage) {
      const isActive = async () => /\bactive\b/.test(await navItem.first().getAttribute('class', { timeout: getTimeout('TINY') }).catch(() => '') ?? '');
      const waitActive = async () => await expect.poll(isActive, { timeout: getTimeout('SHORT') }).toBe(true).then(() => true, () => false)
        || await navItem.count() === 0;
      if (!await waitActive()) {
        await this.doClick(Leftlink, "Left pane link did not open its page; clicking again:: " + sLinkname);
        if (!await waitActive()) {
          await new CommonFunctions().logMessage('WARN', `Left pane link ${sLinkname} is still not the active nav item`);
        }
      }
    }
    return true;
  }

  private async getLeftPaneLink(sLinkname: string): Promise<Locator> {
    const selector = sLinkname === 'Scenarios'
      ? `(//button[@aria-label='Scenarios'] | //div[@data-testid='scenario-chip-btn']/button)[1]`
      : `(//button[@aria-label='${sLinkname}'])[1]`;
    const leftPaneLink = this.mfeLocator(selector);
    // The side nav re-renders right after a page switch, so a count taken after this wait can read 0; the click re-resolves it.
    await leftPaneLink.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') }).catch(() => {
      throw new Error(`Left pane link with name "${sLinkname}" not found`);
    });
    return leftPaneLink;
  }

  public async clickQuickLink(sLinkName: string): Promise<void> {
    const moreOption = this.mfeLocator(`//span[@data-testid='more']`);
    await moreOption.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    if (await moreOption.isVisible()) {
      await this.doClick(moreOption, "Clicked on More option");
    }
    const quickLink = this.mfeLocator(`//p[text()='${sLinkName}']/ancestor::div[@role='button']`);
    await quickLink.waitFor({ state: 'visible', timeout: getTimeout('SHORT') });
    await this.doClick(quickLink, `Clicked on Quick Link: ${sLinkName}`);
  }

  public async clickPowerBarLink(sLinkName: string): Promise<void> {
    const powerBarLink = this.mfeLocator(`//p[text()='${sLinkName}']`);
    if (sLinkName === "Process Settings" || sLinkName === "Cognitive Model") {
      const settings = this.mfeLocator(`//button[@aria-label='Settings'] | //div[@aria-label='Settings']`);
      await settings.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
      // Right after a left pane switch the Settings click can be lost and its menu never opens (INTEROP 2026-10-15).
      await expect(async () => {
        if (!(await powerBarLink.isVisible().catch(() => false))) {
          await this.doClick(settings, "Clicking on Settings Icon in the Powerbar");
        }
        await expect(powerBarLink).toBeVisible({ timeout: getTimeout('MEDIUM') });
      }).toPass({ timeout: getTimeout('XLARGE') });
    }
    await powerBarLink.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(powerBarLink, `Navigating to "${sLinkName}" from Powerbar`);
  }

  public async clickPowerBarLinkOpeningNewTab(sLinkName: string): Promise<Page> {
    const popupPromise = this.page.waitForEvent('popup', { timeout: getTimeout('XLARGE') });
    await this.clickPowerBarLink(sLinkName);
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    this.page = popup;
    return popup;
  }

  public generateSpecUniqueId() {
    return (
      Date.now().toString(36) + Math.random().toString(36).slice(2)
    ).slice(-6);
  }

  public async navigateToPlanningSpaceWithProcess(sProcessName: string): Promise<void> {
    await this.openPlanningSpaceProcess(sProcessName);
    const objPlanningPage: PlanningPage = new PlanningPage(this.page);
    await objPlanningPage.waitForViewToBeDisplayed();
  }

  /** Opens the process link without waiting for a view, for contexts that never render one (e.g. the Unauthorized access page). */
  public async openPlanningSpaceProcess(sProcessName: string): Promise<void> {
    const objCommonFunctions: CommonFunctions = new CommonFunctions();
    await objCommonFunctions.logMessage("INFO", `Navigating to Planning Space Process: ${sProcessName}`);
    const navigateUrl = (getConfig().navigation.NAVIGATE_TO_PLANNING_SPACE as string) + "process/" + sProcessName.replace(/\s/g, '') + "/processplan/link";
    await this.page.goto(navigateUrl);
    const objPortalPage = new PortalPage(this.page);
    await objPortalPage.showApplicationIfBriefingOpen();
  }

  /** Logs in and opens the process without waiting for a view. Install any route that changes the outcome before calling it. */
  public async loginToPlanningSpaceProcessWithoutViewWait(sRealmName: string, sUserName: string, sPassword: string, sProcessName: string): Promise<void> {
    await this.launchAppFromCatalog(sRealmName, sUserName, sPassword, getConfig().links.PSLINK as string);
    await this.openPlanningSpaceProcess(sProcessName);
  }

  public async loginToPlanningSpaceWithProcess(
    sRealmName: string,
    sUserName: string,
    sPassword: string,
    sProcessName: string,
    isSecondUser?: boolean
  ): Promise<void> {
    const objCommonFunctions: CommonFunctions = new CommonFunctions();
    await this.launchAppFromCatalog(sRealmName, sUserName, sPassword, getConfig().links.PSLINK as string, isSecondUser);
    await this.navigateToPlanningSpaceWithProcess(sProcessName);

    // Wait for loading message to appear then disappear
    const loadingMessage = this.page.locator("//*[text()='Setting up your page']");
    await loadingMessage.waitFor({ state: 'visible', timeout: getTimeout('SHORT') }).catch(() => {
      // Element may not appear, continue anyway
    });
    await loadingMessage.waitFor({ state: 'hidden', timeout: getTimeout('SHORT') }).catch(() => {
      // Element may not appear, continue anyway
    });

    await objCommonFunctions.logMessage("INFO", "Logged in and navigated to Planning Space with Process");
  }

  public async createChildScenarioFromBase(
    scenarioName: string,
    scenarioDesc: string,
    visibility: 'Public' | 'Private' = 'Public',
    checkOrUncheckDefault: 'Check' | 'Uncheck' = 'Uncheck'
  ): Promise<boolean> {
    try {
      const objCommonFunctions: CommonFunctions = new CommonFunctions();
      const objScenarioPage: ScenarioPage = new ScenarioPage(this.page);

      await objCommonFunctions.logMessage("INFO", "Getting base scenario and creating child scenario");
      const baseScenario: string = await objScenarioPage.getBaseScenario();
      await objScenarioPage.tableActionClick(baseScenario, 'Create Child Scenario');
      await objScenarioPage.createChildScenario(scenarioName, scenarioDesc, visibility, checkOrUncheckDefault);

      await objCommonFunctions.logMessage("PASS", `Child Scenario ${scenarioName} created successfully`);
      return true;
    } catch (error) {
      await new CommonFunctions().logMessage("FAIL", `Failed to create child scenario: ${error}`);
      return false;
    }
  }

  public async createChildScenarioFromChild(
    parentScenario: string,
    scenarioName: string,
    scenarioDesc: string,
    visibility: 'Public' | 'Private' = 'Public',
    checkOrUncheckDefault: 'Check' | 'Uncheck' = 'Uncheck'
  ): Promise<boolean> {
    try {
      const objCommonFunctions: CommonFunctions = new CommonFunctions();
      const objScenarioPage: ScenarioPage = new ScenarioPage(this.page);

      await objCommonFunctions.logMessage("INFO", `Creating child scenario from parent: ${parentScenario}`);
      await objScenarioPage.tableActionClick(parentScenario, 'Create Child Scenario');
      await objScenarioPage.createChildScenario(scenarioName, scenarioDesc, visibility, checkOrUncheckDefault);

      await objCommonFunctions.logMessage("PASS", `Child Scenario ${scenarioName} created successfully`);
      return true;
    } catch (error) {
      await new CommonFunctions().logMessage("FAIL", `Failed to create child scenario: ${error}`);
      return false;
    }
  }

  public async setBaseAsDefaultScenario(): Promise<string> {
    const objPlanningPage: PlanningPage = new PlanningPage(this.page);
    const objScenarioPage: ScenarioPage = new ScenarioPage(this.page);
    const objCommonFunctions: CommonFunctions = new CommonFunctions();

    await objPlanningPage.goToManageScenarios();
    const baseScenario = await objScenarioPage.getBaseScenario();
    const scenarioName = await objScenarioPage.getDefaultScenario();
    await objCommonFunctions.logMessage('INFO', `Base Scenario is: ${baseScenario}`);
    await objCommonFunctions.logMessage('INFO', `Current Default Scenario is: ${scenarioName}`);

    if (scenarioName === baseScenario) {
      await objCommonFunctions.logMessage('INFO', 'Base Scenario is already set as Default Scenario');
    } else {
      await objScenarioPage.tableActionClick(baseScenario, 'Set as Default');
      await expect.poll(async () => await objScenarioPage.getDefaultScenario(), { timeout: 30000 }).toBe(baseScenario);
    }

    await objScenarioPage.closeManageScenarios();
    return baseScenario;
  }

  public async createChildScenarioFromProcedure(procedureName: string, scenarioName: string, scenarioDesc: string, visibility: 'Public' | 'Private' = 'Public', checkOrUncheckDefault: 'Check' | 'Uncheck' = 'Uncheck', isSave: boolean = true, isEdit: boolean = true, clickManage: boolean = true): Promise<boolean> {
    try {
      const objCommonFunctions: CommonFunctions = new CommonFunctions();
      const objPlanningPage: PlanningPage = new PlanningPage(this.page);
      const objScenarioPage: ScenarioPage = new ScenarioPage(this.page);

      if (clickManage) {
        await objPlanningPage.goToManageScenarios();
        await expect.poll(async () => await objScenarioPage.getBaseScenario(), { timeout: 30000 }).not.toEqual('');
        const baseScenario = await objScenarioPage.getBaseScenario();
        await objCommonFunctions.logMessage('INFO', `Base Scenario name is: ${baseScenario}`);
        await objScenarioPage.closeManageScenarios();
      }

      await objPlanningPage.selectSupplyChainProceduresAction(procedureName);
      await objScenarioPage.createChildScenario(scenarioName, scenarioDesc, visibility, checkOrUncheckDefault, isSave, isEdit);

      if (!isSave) {
        return await objScenarioPage.verifyAlertMsg('success', 120000);
      }

      const running = await objScenarioPage.verifyAlertMsg('procedure is running');
      const success = await objScenarioPage.verifyAlertMsg('success', 60000);
      await objCommonFunctions.compareTwoValues(running, true, `Verify "${procedureName}" procedure is running`);
      await objCommonFunctions.compareTwoValues(success, true, `Verify scenario is created successfully from "${procedureName}" procedure`);

      await objPlanningPage.goToManageScenarios();
      return await objCommonFunctions.compareTwoValues(await objScenarioPage.isScenarioVisibleUnderManageScenarios(scenarioName), true, `Child Scenario ${scenarioName} Created Assertion`);
    } catch (error) {
      await new CommonFunctions().logMessage('FAIL', `Failed to create child scenario from procedure: ${error}`);
      return false;
    }
  }

  public async signOut(): Promise<void> {
    await this.userIconButton.first().waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.userIconButton.first(), 'Clicking user profile icon');
    await this.signOutButton.first().waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.signOutButton.first(), 'Clicking Sign Out button');
    try {
      await this.userIconButton.first().waitFor({ state: 'hidden', timeout: getTimeout('EXTREME') });
    } catch {
      const loggedOutMarker = isGraviteeGateway() ? this.tfldGraviteeEmail : this.tfldEnterRealm;
      await loggedOutMarker.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    }
  }

  /**
   * Signs back in after `signOut()` on either gateway. Azure shows the realm page and the SSO session completes
   * sign-in without credentials (`enterRealmAndCompleteOidcPopup`). Gravitee has no realm page: sign-out ends on the
   * "Get Started" email form, so it logs in with the credentials.
   */
  public async signInAgainAfterSignOut(realmName: string, username: string, password: string): Promise<void> {
    if (isGraviteeGateway()) {
      await performOidcLoginFlow({ portalPage: this.page, realmName, username, password });
      return;
    }
    await this.enterRealmAndCompleteOidcPopup(realmName);
  }

  public async enterRealmAndCompleteOidcPopup(realmName: string): Promise<void> {
    const objCommonFunctions = new CommonFunctions();
    const popupPromise = this.page.context().waitForEvent('page', { timeout: getTimeout('EXTREME') }).catch(() => null);
    await this.enterRealmName(realmName, getTimeout('EXTREME'));
    if (await this.btnContinue.isVisible().catch(() => false)) {
      await this.clickContinue();
    }
    const popup = await popupPromise;
    if (!popup) {
      await objCommonFunctions.logMessage('INFO', 'No OIDC popup opened; completing sign-in options on current page');
      await this.completeOidcSignInOptions();
      return;
    }
    await popup.waitForLoadState('domcontentloaded');
    if (popup.url() === 'about:blank') {
      await popup.waitForURL((popupUrl) => popupUrl.href !== 'about:blank' && popupUrl.href !== '', { timeout: getTimeout('EXTREME') });
      await popup.waitForLoadState('domcontentloaded');
    }
    await popup.bringToFront();
    await objCommonFunctions.logMessage('INFO', `OIDC popup loaded: ${popup.url()}`);
    const popupLogin = new LoginPage(popup);
    await popupLogin.completeOidcSignInOptions();
    if (!this.page.isClosed()) {
      await this.page.bringToFront();
    }
  }

  public async signOutAndLoginFromCatalog(sRealmName: string, sUserName: string, sPassword: string, appNamespace: string = ''): Promise<void> {
    await this.signOut();
    await this.page.context().clearCookies();
    await this.launchAppFromCatalog(sRealmName, sUserName, sPassword, appNamespace);
  }

  public async signOutAndLoginToPlanningSpaceWithProcess(sRealmName: string, sUserName: string, sPassword: string, sProcessName: string): Promise<void> {
    await this.signOut();
    // Clear all browser cookies to prevent SSO auto-login with the previous user
    await this.page.context().clearCookies();
    await this.loginToPlanningSpaceWithProcess(sRealmName, sUserName, sPassword, sProcessName, false);
  }

  public async handleBrowserPopup(action: 'ok' | 'cancel' = 'cancel', timeout: number = 5000): Promise<boolean> {
    try {
      const dialog = await this.page.waitForEvent('dialog', { timeout });
      if (action === 'ok') {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
      return true;
    } catch {
      return false;
    }
  }

}
