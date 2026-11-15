import { Page, Locator, FrameLocator, expect } from '@playwright/test';
import BasePage from '../page';
import { CommonFunctions } from '../../util/common.util';
import { getTimeout } from '../../constants/timeouts';

/**
 * Component object for Loaders, Empty States, and Error States in Planning Space.
 *
 * Covers:
 * - Dynamic dashboard loader & overlays (DynamicDashboardLoader.tsx: noBaselineAdmin, noBaselineUser, noViewsAdmin, noViewsUser)
 * - Transient loading screens (loading-title, loading-overlay, holdPlanningDataRequests, getVisibleLoadingIndicator)
 * - Unified empty states (error-action-links, run a different scope/scenario)
 * - Filter configuration prompt (filterConfigure-title, set filter button)
 * - Dashboard display & navigation verification (waitForSpecificDashboardToBeDisplayed, isNavigatedToView)
 * - Unauthorized access message
 */
export class LoadersEmptyStatesComponent extends BasePage {
  private readonly log: CommonFunctions;

  constructor(
    page: Page,
    private readonly getMfeFrame: () => FrameLocator = () => page.frameLocator('iframe#mfe')
  ) {
    super(page);
    this.log = new CommonFunctions();
  }

  private get frame(): FrameLocator {
    return this.getMfeFrame();
  }

  // ── Private Locators ────────────────────────────────────────────────────────

  private dashboardLabel(viewName: string): Locator {
    const escaped = viewName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.frame.getByTestId('app-header-block-title').filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`) });
  }

  private get loadingOverlay(): Locator {
    return this.frame
      .getByTestId('loading-overlay')
      .or(this.frame.getByText('Setting up your page'))
      .first();
  }

  private get loadingTitle(): Locator {
    return this.frame.getByTestId('loading-title');
  }

  private async resolveLoadingTitleLocator(): Promise<Locator> {
    const candidates = [
      this.frame.getByTestId('loading-title'),
      this.page.frameLocator('iframe[title="Planning Space"]').getByTestId('loading-title'),
      this.page.getByTestId('loading-title'),
    ];
    for (const c of candidates) {
      if (await c.isVisible().catch(() => false)) {
        return c;
      }
    }
    return this.frame.getByTestId('loading-title');
  }

  private getCaseValidationTitle(
    titleTestId?: 'noBaselineAdmin-title' | 'noBaselineUser-title' | 'noViewsAdmin-title' | 'noViewsUser-title'
  ): Locator {
    if (titleTestId) {
      return this.frame.getByTestId(titleTestId);
    }
    return this.frame
      .locator(
        '[data-testid="app-header-block-title"], [data-testid="noBaselineAdmin-title"], [data-testid="noBaselineUser-title"], [data-testid="noViewsAdmin-title"], [data-testid="noViewsUser-title"]'
      )
      .first();
  }

  private get btnPlanningViewSettings(): Locator {
    return this.frame
      .getByRole('button', { name: 'Planning View Settings', exact: true })
      .or(this.frame.getByRole('button', { name: 'Planning View Settings' }))
      .first();
  }

  private runDifferentBtn(buttonName: string): Locator {
    return this.frame.getByTestId('error-action-links').locator('p').filter({ hasText: buttonName }).first();
  }

  private setFiltersToGetStartedText(processName: string): Locator {
    return this.frame.getByTestId('filterConfigure-title').filter({ hasText: processName });
  }

  private configureBtn(optionName: string): Locator {
    return this.frame
      .getByRole('button', { name: optionName, exact: true })
      .or(this.frame.getByRole('button', { name: optionName }))
      .first();
  }

  private adminActionLink(optionName: string): Locator {
    return this.frame
      .getByRole('button', { name: optionName, exact: true })
      .or(this.frame.getByRole('button', { name: optionName }))
      .first();
  }

  private userActionLink(buttonText: string): Locator {
    return this.frame
      .getByRole('button', { name: buttonText, exact: true })
      .or(this.frame.getByRole('button', { name: buttonText }))
      .first();
  }

  private get unauthorizedLabel(): Locator {
    return this.frame.getByTestId('lui-ccl-card-title').locator('span').first();
  }

  // ── Public Actions & Assertions ─────────────────────────────────────────────

  public async waitForSpecificDashboardToBeDisplayed(viewName: string): Promise<void> {
    await this.dashboardLabel(viewName).waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    const loader = this.loadingOverlay;
    if (await loader.isVisible().catch(() => false)) {
      await loader.waitFor({ state: 'hidden', timeout: getTimeout('LONG') }).catch(() => {});
    }
  }

  public async verifyPlanningSpaceLoadingTitle(expectedText: string = 'Setting up your page'): Promise<void> {
    const target = await this.resolveLoadingTitleLocator();
    await expect(target).toContainText(expectedText, { timeout: getTimeout('EXTREME') });
  }

  /**
   * Parks planning-data requests so the transient loading screen can be captured.
   */
  public async holdPlanningDataRequests(
    urlParts: string[] = ['planningInstance/search', 'scenarios/planningSpace', 'simulations/search']
  ): Promise<() => Promise<void>> {
    const matches = (url: URL) => urlParts.some((part) => url.pathname.includes(part));
    const heldRequests: Array<() => Promise<void>> = [];
    await this.page.context().route(matches, (route) => {
      heldRequests.push(() => route.continue().catch(() => {}));
    });
    return async () => {
      await this.page.context().unroute(matches);
      await Promise.all(heldRequests.splice(0).map((release) => release()));
    };
  }

  public async getVisibleLoadingIndicator(loaderText: string = 'Setting up your page'): Promise<Locator> {
    const candidates = [
      this.page.getByText(loaderText, { exact: true }).first(),
      this.frame.getByText(loaderText, { exact: true }).first()
    ];
    let visibleLocator: Locator | undefined;
    await expect.poll(async () => {
      for (const candidate of candidates) {
        if (await candidate.isVisible().catch(() => false)) {
          visibleLocator = candidate;
          return true;
        }
      }
      return false;
    }, { timeout: getTimeout('XLARGE'), intervals: [100] }).toBe(true);
    return visibleLocator as Locator;
  }

  public async waitForCaseValidationTitle(timeout: number): Promise<void> {
    await this.getCaseValidationTitle().waitFor({ state: 'visible', timeout });
  }

  public async waitForPlanningSpaceLoaderToDisappear(expectedText: string = 'Setting up your page'): Promise<void> {
    const target = await this.resolveLoadingTitleLocator();
    await expect(target).toContainText(expectedText, { timeout: getTimeout('EXTREME') });
    await expect(target).toBeHidden({ timeout: getTimeout('EXTREME') });
    await this.log.logMessage('INFO', 'Planning Space loader has disappeared');
  }

  /** Instant check, no waiting: true while the "Setting up your page" overlay is on screen. */
  public async isPlanningSpaceLoaderVisible(): Promise<boolean> {
    return this.loadingOverlay.isVisible().catch(() => false);
  }

  // The overlay can flash once more after the view title renders, so wait for it to settle rather than sample it.
  public async isPlanningSpaceLoaderHidden(): Promise<boolean> {
    try {
      await this.loadingOverlay.waitFor({ state: 'hidden', timeout: getTimeout('LONG') });
      return true;
    } catch {
      await this.log.logMessage('INFO', 'Setting up your page loader is still visible');
      return false;
    }
  }

  /**
   * For actions that trigger a re-render after they return (e.g. applying a scope): give the overlay up to
   * `appearTimeout` to show, then wait for it to hide. If it never shows, the page is treated as settled.
   */
  public async waitForPlanningSpaceToSettle(appearTimeout: number = getTimeout('SHORT')): Promise<boolean> {
    const appeared = await this.loadingOverlay.waitFor({ state: 'visible', timeout: appearTimeout }).then(() => true, () => false);
    if (!appeared) {
      await this.log.logMessage('INFO', `Setting up your page loader did not appear within ${appearTimeout} ms`);
    }
    return this.isPlanningSpaceLoaderHidden();
  }

  public async isPlanningViewsSettingsButtonDisplayed(): Promise<boolean> {
    try {
      await this.btnPlanningViewSettings.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
      await this.log.logMessage('INFO', 'Planning View Settings button is visible');
      return true;
    } catch {
      await this.log.logMessage('INFO', 'Planning View Settings button is not visible');
      return false;
    }
  }

  public async verifyRunDifferentScopeBtn(buttonName: string): Promise<boolean> {
    const button = this.runDifferentBtn(buttonName);
    await button.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    return await button.isVisible();
  }

  public async verifyRunDifferentScenarioBtn(buttonName: string): Promise<boolean> {
    const button = this.runDifferentBtn(buttonName);
    await button.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    return await button.isVisible();
  }

  public async clickOnRunDifferentScopeOrScenarioBtn(buttonName: string): Promise<void> {
    const button = this.runDifferentBtn(buttonName);
    await button.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(button, `Clicking on ${buttonName}`);
  }

  public async verifySetFiltersText(processName: string): Promise<boolean> {
    const setFiltersText = this.setFiltersToGetStartedText(processName);
    await setFiltersText.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    return await setFiltersText.isVisible();
  }

  public async verifySetFilterBtn(optionName: string): Promise<boolean> {
    const btn = this.configureBtn(optionName);
    await btn.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    return await btn.isVisible();
  }

  public async verifyNoBaselineAdminActionLink(expectedText: string = 'Option Name'): Promise<boolean> {
    const linkLocator = this.adminActionLink(expectedText);
    await linkLocator.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    const actualText = (await this.doGetText(linkLocator, 'Getting no baseline admin action link text')).trim();
    return actualText === expectedText;
  }

  public async verifyNoBaselineAdminActionLinks(expectedTexts: string[]): Promise<boolean> {
    for (const optionName of expectedTexts) {
      const optionVisible = await this.verifyNoBaselineAdminActionLink(optionName);
      if (!optionVisible) {
        return false;
      }
    }
    return true;
  }

  public async openNoBaselineAdminActionLinkInNewTab(optionName: string = 'Option Name'): Promise<Page> {
    const newPagePromise = this.page.context().waitForEvent('page', { timeout: getTimeout('LONG') });
    await this.doClick(this.adminActionLink(optionName), 'Clicking no baseline admin action link');
    const newPage = await newPagePromise;
    await newPage.waitForLoadState('domcontentloaded');
    return newPage;
  }

  public async verifyNoBaselineAdminState(
    expectedTitle: string = 'Waiting for baseline scenario',
    expectedLinkTexts: string[] = ['Option Name']
  ): Promise<boolean> {
    const titleValidation = await this.verifyNoBaselineAdminTitle(expectedTitle);
    const linkValidation = await this.verifyNoBaselineAdminActionLinks(expectedLinkTexts);
    return titleValidation && linkValidation;
  }

  public async verifyNoBaselineAdminTitle(expectedTitle: string = 'Waiting for baseline scenario'): Promise<boolean> {
    return this.verifyCaseValidationTitle('noBaselineAdmin-title', expectedTitle, 'Getting no baseline admin title');
  }

  public async verifyNoBaselineUserTitle(expectedTitle: string = 'Preparing planning data'): Promise<boolean> {
    return this.verifyCaseValidationTitle('noBaselineUser-title', expectedTitle, 'Getting no baseline user title');
  }

  public async verifyNoViewsAdminTitle(expectedTitle: string = 'No views created yet'): Promise<boolean> {
    return this.verifyCaseValidationTitle('noViewsAdmin-title', expectedTitle, 'Getting no views admin title');
  }

  public async verifyNoViewsUserTitle(expectedTitle: string = 'No views to show yet'): Promise<boolean> {
    return this.verifyCaseValidationTitle('noViewsUser-title', expectedTitle, 'Getting no views user title');
  }

  private async verifyCaseValidationTitle(
    titleTestId: 'noBaselineAdmin-title' | 'noBaselineUser-title' | 'noViewsAdmin-title' | 'noViewsUser-title',
    expectedTitle: string,
    logMessage: string
  ): Promise<boolean> {
    const titleLocator = this.getCaseValidationTitle(titleTestId);
    await titleLocator.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    const actualTitle = (await this.doGetText(titleLocator, logMessage)).trim();
    return actualTitle === expectedTitle;
  }

  public async clickNoBaselineUserActionButton(buttonText: string = 'Go to Process List'): Promise<void> {
    const actionButton = this.userActionLink(buttonText);
    await actionButton.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(actionButton, `Clicking no baseline user action button: ${buttonText}`);
  }

  public async openNoBaselineUserActionButtonInNewTab(buttonText: string = 'Go to Process List'): Promise<Page> {
    const newPagePromise = this.page.context().waitForEvent('page', { timeout: getTimeout('LONG') });
    await this.clickNoBaselineUserActionButton(buttonText);
    const newPage = await newPagePromise;
    await newPage.waitForLoadState('domcontentloaded');
    return newPage;
  }

  public async clickOnSetFilterBtn(optionName: string = 'Configure'): Promise<void> {
    const btn = this.configureBtn(optionName);
    await btn.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(btn, `Clicking on ${optionName} button`);
  }

  public async isNavigatedToView(viewName: string): Promise<boolean> {
    try {
      await this.waitForSpecificDashboardToBeDisplayed(viewName);
      const exists = await this.doesElementExist(this.dashboardLabel(viewName), 'Verify if navigated to view');
      return exists;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.log.logMessage('FAIL', `Navigation to view ${viewName} failed: ${msg}`);
      return false;
    }
  }

  public async getUnAuthorizedErrorMsg(): Promise<string> {
    await this.unauthorizedLabel.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    const errorMessage = (await this.unauthorizedLabel.textContent())?.trim() || '';
    await this.log.logMessage('INFO', `Unauthorized error message: ${errorMessage}`);
    return errorMessage;
  }
}
