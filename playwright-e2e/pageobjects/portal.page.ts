import { Page, expect, Locator } from '@playwright/test';
import BasePage, { ACTIVE_MFE_IFRAME } from './page';
import { getTimeout, TimeoutKey } from '../constants/timeouts';
import { CommonFunctions } from '../util/common.util';
import { pollUntilTrue } from '../util/wait-helpers';

/**
 * Luminate portal shell (`@by/plat-lui-portal`): header logo, command bar and app catalog. The deployed command bar is newer
 * than the 1.21.2 build under plan-sop-lui/node_modules, so its test IDs are kept from the earlier XPath and were checked on
 * INTEROP (2026-10-19): `command-bar-search-textfield-input`, results listbox `command-bar-results` with
 * `command-bar-list-item-app-<namespace>` options.
 */
export class PortalPage extends BasePage {

  private objCommonFunctions: CommonFunctions;
  
  constructor(page: Page) {
    super(page);
    this.objCommonFunctions = new CommonFunctions();
  }

  private get btnByLogo(): Locator                  { return this.page.locator('button[data-testid="luminate-toggle-drawer-button"], button#luminate-toggle-drawer-button, textarea[data-testid="command-bar-search-textfield-input"], div[data-testid="lui-portal-main-app-container"]').first(); }
  private get btnAppCatalogLeft(): Locator          { return this.page.locator('button#luminate-toggle-drawer-button'); }
  private get btnAppCatalog(): Locator              { return this.txtSearchApp; }
  private get getObjectiveBar(): Locator            { return this.page.locator('[data-testid="objective-bar-lui-carousel-container"] div:text-is("Forecast Accuracy")'); }
  private get searchInputInDockArea(): Locator      { return this.txtSearchApp; }
  private get txtSearchApp(): Locator               { return this.page.locator('textarea[data-testid="command-bar-search-textfield-input"]'); }
  private appDivSelector(appName: string): Locator  { return this.page.locator(`span:text-is(${JSON.stringify(appName)})`).first(); }
  private getDockArea(): Locator                    { return this.page.locator('div[data-testid="command-bar-bottom-display-area"]'); }
  // The highlighted command bar result, which Enter opens.
  private get commandBarSelectedOption(): Locator   { return this.page.locator('[data-testid="command-bar-list-wrapper"] li[role="option"][aria-selected="true"]'); }
  // Command bar navigation results (views/pages); the option's text block carries the bare title as its aria-label.
  private get commandBarNavOptions(): Locator       { return this.page.locator("li[role='option'][data-testid^='command-bar-list-item-nav-']"); }
  private commandBarNavOption(title: string): Locator { return this.commandBarNavOptions.filter({ has: this.page.locator(`div[aria-label=${JSON.stringify(title)}]`) }).first(); }
  // Newer portals (Gravitee pspoat-test1) toggle between the AI briefing and the app with one header button whose
  // name flips between "Show Application" (briefing shown, app iframe aria-hidden) and "Show Briefing" (app shown).
  private get btnShowApplication(): Locator         { return this.page.getByRole('button', { name: 'Show Application', exact: true }).first(); }
  // Portal announcement / onboarding dialogs that can cover the app right after login.
  private get btnPortalDialogClose(): Locator       { return this.page.locator('div[role="dialog"] button[aria-label="Close"], div[role="dialog"] button:has-text("×"), div[role="dialog"] button:has-text("Close"), button:has-text("Get started")').first(); }


  public async clickAppCatalog(): Promise<void> {
    await this.waitForBYLogo();
    await this.doClick(this.btnAppCatalog, 'Clicking App Catalog Button');
  }

  public async waitForBYLogo(): Promise<void> {
    await this.btnByLogo.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
  }

  public async clickBYLogo(): Promise<void> {
    await this.waitForBYLogo();
    await this.doClick(await this.btnByLogo, "Clicking BY Logo")
  }

  public async waitForAppCatalogToLoad(): Promise<void> {
    if (process.env.ENVIRONMENT === 'PSR')
      await this.btnAppCatalogLeft.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    else
      await this.btnAppCatalog.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
  }

  public async searchApp(appName: string): Promise<void> {
    await this.txtSearchApp.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doEnterText(this.txtSearchApp, appName, `Searching for App: ${appName}`);
  }

  public async waitForPlanningAppCardToVisible(): Promise<void> {
    await this.appDivSelector("Planning").waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
  }

  public async selectApp(appName: string): Promise<void> {
    await this.doClick(this.appDivSelector(appName), `Selecting App: ${appName}`);
  }

  public async searchAndSelectApp(appName: string): Promise<void> {
    await this.clickAppCatalog();
    await this.searchApp(appName);
    await this.selectApp(appName);
  }

  public async clickOnDockSearchButton() {
    try {
      // Newer portal layouts render the command bar at the top and leave the bottom dock area empty (never visible),
      // so the dock hover is best-effort and the search textarea itself is the click target.
      const dockArea = await this.getDockArea();
      try {
        await dockArea.waitFor({ state: 'visible', timeout: getTimeout('SHORT') });
        await dockArea.hover({ timeout: getTimeout('SHORT') });
      } catch (error: any) {
        await this.objCommonFunctions.logMessage("INFO", `Dock area not visible or hover failed, continuing with search input: ${error.message}`);
      }
      await this.txtSearchApp.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
      await this.doClick(await this.txtSearchApp, "Clicking on dock search button");
    } catch (error: any) {
      await this.objCommonFunctions.logMessage("FAIL", `Failed to click dock search button: ${error.message}`);
      throw error;
    }
  }

  public async triggerDockSearchInput(searchText: string) {
    try {
      await this.clickOnDockSearchButton();
      await this.searchInputInDockArea.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
      await this.doEnterText(await this.searchInputInDockArea, searchText, `Entering search text in dock area: ${searchText}`);
      // Enter opens the highlighted result, so wait until it matches the search (about 20 ms on INTEROP, 2026-10-19).
      // Capped at MEDIUM, the fixed sleep this replaces; on timeout Enter is pressed anyway, as before.
      await expect(this.commandBarSelectedOption.first()).toContainText(searchText, { ignoreCase: true, timeout: getTimeout('MEDIUM') })
        .catch(() => this.objCommonFunctions.logMessage("INFO", `No highlighted command bar result for "${searchText}"; pressing Enter anyway`));
      await this.page.keyboard.press('Enter');
    } catch (error: any) {
      await this.objCommonFunctions.logMessage("FAIL", `Failed to trigger dock search input: ${error.message}`);
      return false;
    }
  }

  /**
   * When the portal opens on its briefing, the app iframe is aria-hidden and slid off screen, so MFE locators never
   * resolve. Switches back to the app. After a navigation the portal re-renders its header, and the toggle can take
   * longer than SHORT to return, so this waits for whichever comes first: visible app content (no briefing, returns at
   * once on portals without one) or the "Show Application" toggle.
   */
  /** Closes a portal announcement / onboarding dialog if one is showing; does nothing otherwise. */
  public async dismissPortalDialog(): Promise<void> {
    if (await this.btnPortalDialogClose.isVisible().catch(() => false)) {
      await this.btnPortalDialogClose.click({ force: true }).catch(() => {});
    }
  }

  public async showApplicationIfBriefingOpen(): Promise<void> {
    // Polled rather than combined with or(): a locator inside a FrameLocator cannot be part of a composite locator.
    const visibleAppContent = this.getMfeFrameLocator().locator('body *:visible').first();
    let isBriefingOpen = false;
    await pollUntilTrue(async () => {
      isBriefingOpen = await this.btnShowApplication.isVisible().catch(() => false);
      return isBriefingOpen || await visibleAppContent.isVisible().catch(() => false);
    }, 'XLARGE').catch(() => null);
    if (!isBriefingOpen) {
      return;
    }
    await this.doClick(this.btnShowApplication, 'Portal opened on the briefing; clicking Show Application');
    await this.page.locator(ACTIVE_MFE_IFRAME).first().waitFor({ state: 'attached', timeout: getTimeout('XLARGE') });
  }

  /**
   * Types `searchText` into the portal command bar. The results popup opens only on a click (`fill` alone leaves focus
   * in the app iframe). On PO pages the textarea sits outside the viewport in the collapsed bottom dock, and elsewhere
   * the command bar tooltip intercepts pointer clicks (~15 s of doClick fallbacks), so this uses a DOM click.
   */
  public async searchCommandBar(searchText: string): Promise<void> {
    await this.searchInputInDockArea.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.searchInputInDockArea.evaluate((element: HTMLElement) => { element.click(); element.focus(); });
    await this.searchInputInDockArea.fill('');
    await this.doEnterText(this.searchInputInDockArea, searchText, `Searching command bar for: ${searchText}`);
  }

  /**
   * Whether the command bar offers `viewName` as a navigation result. PO and PS share only the current context's
   * non-hidden views with the portal (plan-sop-lui `getSearchableViewsForPortal`), so a hidden view is never listed.
   */
  public async isViewOfferedInCommandBar(viewName: string, timeoutKey: TimeoutKey = 'XLARGE'): Promise<boolean> {
    // The app hands its views to the portal a few seconds after a navigation, and results typed before that only list
    // apps and never refresh, so the search is re-typed until the view shows up or the timeout ends.
    const option = this.commandBarNavOption(viewName);
    const isOffered = await pollUntilTrue(async () => {
      await this.searchCommandBar(viewName);
      return option.waitFor({ state: 'visible', timeout: getTimeout('SHORT') }).then(() => true, () => false);
    }, timeoutKey).then(() => true, () => false);
    await this.objCommonFunctions.logMessage("INFO", `Command bar offers view "${viewName}": ${isOffered}`);
    return isOffered;
  }

  /** Searches the command bar and clicks the exact `viewName` result (Enter would open whichever result is first). */
  public async openViewFromCommandBar(viewName: string): Promise<void> {
    if (!(await this.isViewOfferedInCommandBar(viewName))) {
      throw new Error(`Command bar did not offer view "${viewName}"`);
    }
    await this.doClick(this.commandBarNavOption(viewName), `Opening view from command bar: ${viewName}`);
  }

  /** Clears and closes the command bar results so they do not cover the app. */
  public async closeCommandBar(): Promise<void> {
    await this.searchInputInDockArea.fill('').catch(() => {});
    await this.page.keyboard.press('Escape');
    await this.commandBarNavOptions.first().waitFor({ state: 'hidden', timeout: getTimeout('SHORT') }).catch(() => {});
  }

  public async verifyObjectiveBarDetails(): Promise<boolean> {
    const objectiveBar = await this.getObjectiveBar;
    const isVisible = await objectiveBar.isVisible();
    await this.objCommonFunctions.logMessage("INFO", `Objective bar is displayed : ${isVisible}`);
    return isVisible;
  }

}

