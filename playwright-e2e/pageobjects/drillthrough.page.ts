import { ConsoleMessage, Page, expect } from '@playwright/test';
import { CommonFunctions, LONG_WAIT, SHORT_WAIT } from '../util/common.util';
import BasePage from './page';
import { getTimeout } from '../constants/timeouts';
import { PlanningPage } from './planning.page';
import { textContaining } from './planning/text-match';

/** Scope members in the shape `planningPage.isScopeAppliedInDrawer` reads: `{ DIMENSION: { LEVEL: member } }`. */
export type ScopeDimensions = Record<string, Record<string, string>>;

interface DrillEventDimension {
  id?: string;
  levelsFilter?: Array<{ id?: string; values?: unknown[] }>;
}

/** Converts the `dimensions` of a card's `onDrillThrough` event into `ScopeDimensions` (first member of each filtered level). */
export const toScopeDimensions = (dimensions: DrillEventDimension[]): ScopeDimensions => {
  const scope: ScopeDimensions = {};
  for (const dimension of dimensions) {
    for (const level of dimension.levelsFilter ?? []) {
      const member = level.values?.[0];
      if (dimension.id && level.id && member !== undefined && member !== null && `${member}` !== '') {
        (scope[dimension.id] ??= {})[level.id] = `${member}`;
      }
    }
  }
  return scope;
};

export interface DrillThroughScopeCapture {
  /** Waits for the source card's drill-through event and returns its members, or null if none arrived. */
  wait: (timeoutMs?: number) => Promise<ScopeDimensions | null>;
  /** Stops listening on the source page. */
  stop: () => void;
}

export class DrillThroughPage extends BasePage {
  private planningPage: PlanningPage;
  private commonFunctions: CommonFunctions;
  constructor(page: Page) {
    super(page);
    this.planningPage = new PlanningPage(page);
    this.commonFunctions = new CommonFunctions();
  }

  protected override onPageChanged(newPage: Page): void {
    if (this.planningPage) {
      this.planningPage.page = newPage;
    }
  }

  private get drillThroughMenu() {
    return this.mfeLocator('li[data-testid="context-menu-item-drillThrough"]');
  }

  private get enhancedTableCardRows() {
    return this.mfeLocator('[data-testid="enhanced-table-card-row"]');
  }

  private getCellValue(value: string) {
    // getByText skips <style> and <script> text: the old XPath's first match for a number like "55" was a hidden <style>.
    return this.getMfeFrameLocator().getByText(textContaining(value));
  }

  /**
   * A visible pivot/table cell whose whole text is `value`. A partial match picks row headers ("42" hits "PF-42",
   * whose context menu has no Drill Through) and the grid's hidden `div[role="row"]` copies.
   */
  private getDrillThroughCell(value: string) {
    return this.getMfeFrameLocator().getByText(value, { exact: true }).filter({ visible: true }).first();
  }

  private getDrillThroughOption(option: string) {
    return this.mfeLocator('div[data-testid="lui-ccl-nestedmenu-submenu-container"]').getByText(textContaining(option));
  }

  private getCardMenuButton(cardTitle: string) {
    return this.mfeLocator('div[data-testid="lui-dashboard-card-cardHeader"]')
      .filter({ hasText: cardTitle })
      .locator('button[data-testid="lui-dashboard-card-menu-button"]');
  }

  private get editCardMenuItem() {
    return this.mfeLocator('li[data-testid="lui-dashboard-card-settings-button"]');
  }

  private get drillThroughConditionToggle() {
    return this.mfeLocator('input[data-testid="enable-drillthrough-conditions"]');
  }

  private get cardSettingsSaveBtn() {
    return this.mfeLocator('button[data-testid="lui-dashboard-card-settings-save-button"]');
  }

  private get saveViewBtn() {
    return this.mfeLocator('button[data-testid="lui-dashboard-header-save-button"]');
  }

  private getRowArrow(fieldValue: string) {
    return this.mfeLocator('tr')
      .filter({ hasText: fieldValue })
      .locator('button[data-testid="icon-button-data-type-column-cell"]');
  }

  private getBDECardElement(cardName: string) {
    return this.mfeLocator(`input[value=${JSON.stringify(cardName)}]`);
  }

  private getBDETableCellChevron() {
    return this.mfeLocator('tbody tr:nth-of-type(2)[data-testid="tableRow"] td:nth-of-type(6)[data-testid="tableCellChevron"]');
  }

  private getQueryParam(url: string, paramName: string): string {
    const match = url.match(new RegExp(`[?&]${paramName}=([^&]+)`));
    return match?.[1] ? decodeURIComponent(match[1]) : '';
  }

  public async waitForViewName(expectedViewName: string, timeoutMs: number = 120000): Promise<void> {
    this.planningPage.page = this.page;
    await expect.poll(() => this.planningPage.getViewTitleName(), {
      message: `View "${expectedViewName}" was not shown`,
      timeout: timeoutMs,
      intervals: [1000, 2000, 5000],
    }).toBe(expectedViewName);
  }

  public async waitForContextId(timeoutMs: number = 60000): Promise<string> {
    await expect.poll(() => this.getQueryParam(this.page.url(), 'contextId'), {
      message: 'No contextId in the URL',
      timeout: timeoutMs,
      intervals: [1000, 2000, 5000],
    }).not.toBe('');
    return this.getQueryParam(this.page.url(), 'contextId');
  }

  public async getBackButtonState(): Promise<boolean> {
    return await this.planningPage.isBackBtnDisplayed().catch(() => false);
  }

  private async openCardSettingsDialog(cardTitle: string): Promise<void> {
    const menuBtn = this.getCardMenuButton(cardTitle).first();
    await menuBtn.waitFor({ state: 'visible', timeout: SHORT_WAIT });
    await this.doClick(menuBtn, `Clicking menu button for card: ${cardTitle}`);
    await this.editCardMenuItem.first().waitFor({ state: 'visible', timeout: SHORT_WAIT });
    await this.doClick(this.editCardMenuItem.first(), 'Clicking Edit Card menu item');
    await this.mfeLocator('[data-testid="lui-dashboard-card-settings-dialog-title-toolbar-left-zone"]').getByText(textContaining(cardTitle))
      .waitFor({ state: 'visible', timeout: SHORT_WAIT });
  }

  private async setConditionToggle(enabled: boolean): Promise<void> {
    const toggle = this.drillThroughConditionToggle;
    await toggle.scrollIntoViewIfNeeded();
    const isChecked = await toggle.isChecked();
    if (enabled !== isChecked) {
      await this.doClick(toggle, `Setting drill-through condition toggle to ${enabled}`);
    }
  }

  private async saveCardSettingsAndView(cardTitle: string): Promise<void> {
    await this.doClick(this.cardSettingsSaveBtn, 'Saving card settings');
    await this.cardSettingsSaveBtn.waitFor({ state: 'hidden', timeout: getTimeout('MEDIUM') }).catch(() => {});
  }

  public async setDrillThroughConditions(cardTitle: string, enabled: boolean): Promise<boolean> {
    await this.openCardSettingsDialog(cardTitle);
    await this.setConditionToggle(enabled);
    await this.saveCardSettingsAndView(cardTitle);
    return true;
  }

  /** Visible pivot data cells holding a number (row/column headers such as "FG-01" or "UNITPRICE" do not match). */
  private get numericDataCell() {
    return this.getMfeFrameLocator().getByRole('gridcell', { name: /^-?[\d,.]+$/ }).filter({ visible: true }).first();
  }

  /**
   * The value to drill through on: the first of `candidates` (in order) shown as a whole visible cell, else the
   * first visible numeric data cell, so the spec survives data, filter or pivot changes on the shared view. Uses the
   * same cell match as `performDrillThroughOnCardField`, and polls until `timeoutMs` while the grid renders.
   */
  public async resolveDrillThroughCellValue(candidates: string[], timeoutMs: number = getTimeout('XLARGE')): Promise<string> {
    const uniqueCandidates = candidates.filter((value, index, arr) => value && arr.indexOf(value) === index);
    let resolved = '';
    let source = 'candidate';
    await expect.poll(async () => {
      for (const candidate of uniqueCandidates) {
        if (await this.getDrillThroughCell(candidate).isVisible().catch(() => false)) {
          source = 'candidate';
          return (resolved = candidate);
        }
      }
      const cell = this.numericDataCell;
      const anyNumber = (await cell.isVisible().catch(() => false))
        ? ((await cell.textContent({ timeout: getTimeout('SHORT') }).catch(() => null))?.trim() ?? '')
        : '';
      source = 'first numeric cell';
      return (resolved = anyNumber);
    }, {
      message: `No drill-through cell is visible (candidates: ${uniqueCandidates.join(', ')}, nor any numeric cell)`,
      timeout: timeoutMs,
      intervals: [500, 1000, 2000],
    }).not.toBe('');
    await this.commonFunctions.logMessage('INFO', `Drill-through cell resolved to "${resolved}" from ${source} (candidates: ${uniqueCandidates.join(', ')})`);
    return resolved;
  }

  public async performDrillThroughOnCardField(fieldValue: string, drillThroughOption: string): Promise<boolean> {
    const field = this.getDrillThroughCell(fieldValue);
    try {
      await field.scrollIntoViewIfNeeded({ timeout: 5000 });
    } catch {
    }
    await field.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    try {
      await field.click({ button: 'right', timeout: 5000 });
    } catch {
      await field.click({ button: 'right', force: true });
    }
    const isMenuVisible = await this.drillThroughMenu.isVisible().catch(() => false);
    if (!isMenuVisible) {
      await field.dispatchEvent('contextmenu');
    }
    await this.drillThroughMenu.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.mouseHover(this.drillThroughMenu, `Hovering over drill-through menu for: ${fieldValue}`);
    const option = this.getDrillThroughOption(drillThroughOption);
    await option.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(option, `Selecting drill-through option: ${drillThroughOption}`);
    return true;
  }

  public async isRowArrowExists(fieldValue: string): Promise<boolean> {
    const cell = this.getCellValue(fieldValue).first();
    await cell.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(cell, `Clicking cell to reveal row arrow: ${fieldValue}`);
    const arrowBtn = this.getRowArrow(fieldValue);
    return await arrowBtn.isVisible().catch(() => false);
  }

  public async onRowDrillThrough(fieldValue: string): Promise<void> {
    const cell = this.getCellValue(fieldValue).first();
    await cell.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(cell, `Clicking cell to reveal row arrow: ${fieldValue}`);
    const arrowBtn = this.getRowArrow(fieldValue);
    await this.mouseHover(arrowBtn, `Hovering over row drill-through arrow for: ${fieldValue}`);
    await arrowBtn.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(arrowBtn, `Clicking row drill-through arrow for: ${fieldValue}`);
  }

  public async performDrillThroughOnBDECard(cardName: string): Promise<boolean> {
    const bdeCardElement = this.getBDECardElement(cardName).first();
    await bdeCardElement.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.mouseHover(bdeCardElement, `Hovering over BDE card: ${cardName}`);

    const isBdeCardExisting = await bdeCardElement.isVisible().catch(() => false);
    await this.commonFunctions.compareTwoValues(isBdeCardExisting, true, 'BDE Card Exists');

    const tableCellChevron = this.getBDETableCellChevron().first();
    await tableCellChevron.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    const isTableCellChevronExisting = await tableCellChevron.isVisible().catch(() => false);
    if (isTableCellChevronExisting) {
      const context = this.page.context();
      const initialPageCount = context.pages().length;
      await this.doClick(tableCellChevron, 'Performing Drill Through - Clicked on the table cell chevron.');
      try {
        await expect.poll(() => context.pages().length, { timeout: getTimeout('SHORT') }).toBeGreaterThan(initialPageCount);
      } catch {
        if (context.pages().length <= initialPageCount) {
          await this.commonFunctions.logMessage('WARN', 'New window did not open on first chevron click; retrying click');
          await tableCellChevron.click({ force: true }).catch(() => {});
          try {
            await expect.poll(() => context.pages().length, { timeout: getTimeout('SHORT') }).toBeGreaterThan(initialPageCount);
          } catch {
            await this.commonFunctions.logMessage('FAIL', 'New window did not open after retrying chevron click.');
            return false;
          }
        }
      }
      return context.pages().length > initialPageCount;
    }

    await this.commonFunctions.logMessage('FAIL', 'Performing Drill Through - Table cell chevron not found.');
    return false;
  }

   public async openDrillThroughInNewTab(fieldValue: string, drillThroughOption: string): Promise<string> {
    const sourcePage = this.page;
    const sourceUrl = sourcePage.url();
    const context = sourcePage.context();
    const existingPages = new Set(context.pages());

    const popupPromise = sourcePage.waitForEvent('popup', { timeout: 45000 }).catch(() => null);
    const contextPagePromise = context.waitForEvent('page', { timeout: 45000 }).catch(() => null);

    await this.performDrillThroughOnCardField(fieldValue, drillThroughOption);

    let targetPage: Page | null = await Promise.race([popupPromise, contextPagePromise]);

    if (!targetPage) {
      const [popupPage, contextOpenedPage] = await Promise.all([popupPromise, contextPagePromise]);
      targetPage = popupPage ?? contextOpenedPage;
    }

    if (!targetPage) {
      const newlyOpenedPage = context.pages().find((p) => !existingPages.has(p));
      if (newlyOpenedPage) {
        targetPage = newlyOpenedPage;
      }
    }

    // Some flows navigate in the same tab instead of opening a popup/new tab.
    if (!targetPage) {
      targetPage = sourcePage;
    }

    await targetPage.waitForLoadState('domcontentloaded');
    await targetPage.bringToFront();
    this.page = targetPage;
    this.planningPage.page = targetPage;
    await this.waitForViewName(drillThroughOption);
    await this.planningPage.waitForPlanningSpaceLoaderToDisappear().catch(() => {});
    return sourceUrl;
  }

  /**
   * Starts listening on the current (source) page for the drill-through context Planning Space saves. planning-mfe
   * `MFEActions.tsx` logs it on every drill-through (`console.log` of `{ message: 'Drill Through Source MFE: …',
   * contextId, contextFromCard }`), and the target view applies the same context to its Scope drawer
   * (`SideNavWithRightPanel.tsx`: `cardContext.dimensions`, else `pageContext.scopeFilter.dimensions`, then
   * `setFilterContext`). So the captured members are the expected scope on the target, whatever data the shared view
   * holds. Falls back to the card's own `onDrillThrough` event when a card logs one. Call before the drill-through click.
   */
  public captureDrillThroughScope(): DrillThroughScopeCapture {
    const sourcePage = this.page;
    let captured: ScopeDimensions | null = null;
    let fromCardEvent: ScopeDimensions | null = null;
    const nonEmpty = (dimensions: unknown): dimensions is DrillEventDimension[] => Array.isArray(dimensions) && dimensions.length > 0;
    const onConsole = async (message: ConsoleMessage): Promise<void> => {
      if (captured) return;
      for (const arg of message.args()) {
        const value = await arg.jsonValue().catch(() => null);
        if (!value || typeof value !== 'object') continue;
        const savedContext = value.contextFromCard;
        if (savedContext && typeof value.message === 'string' && value.message.startsWith('Drill Through Source MFE')) {
          // Same precedence as the target view.
          const dimensions = savedContext.cardContext?.dimensions ?? savedContext.pageContext?.scopeFilter?.dimensions;
          if (nonEmpty(dimensions)) {
            captured = toScopeDimensions(dimensions);
            await this.commonFunctions.logMessage('INFO', `Drill-through context ${value.contextId ?? ''} members: ${JSON.stringify(captured)}`);
            return;
          }
        }
        if (value.eventName === 'onDrillThrough' && !fromCardEvent) {
          const dimensions = value.cardContext?.dimensions ?? value.dimensions;
          if (nonEmpty(dimensions)) {
            fromCardEvent = toScopeDimensions(dimensions);
          }
        }
      }
    };
    sourcePage.on('console', onConsole);
    const stop = (): void => {
      sourcePage.off('console', onConsole);
    };
    const wait = async (timeoutMs: number = getTimeout('XLARGE')): Promise<ScopeDimensions | null> => {
      await expect.poll(() => captured !== null, { timeout: timeoutMs }).toBe(true).catch(() => undefined);
      stop();
      if (!captured && fromCardEvent) {
        captured = fromCardEvent;
        await this.commonFunctions.logMessage('WARN', `Planning Space logged no drill-through context; using the card's onDrillThrough members: ${JSON.stringify(captured)}`);
      }
      if (!captured) {
        await this.commonFunctions.logMessage('ERROR', `No drill-through context with dimensions was logged on the source page within ${timeoutMs} ms`);
      }
      return captured;
    };
    return { wait, stop };
  }

  public async closeCurrentTabAndSwitchToWindow(windowIndex: number = 0): Promise<void> {
    const currentPage = this.page;
    await currentPage.close();

    const pages = currentPage.context().pages();
    if (pages.length <= windowIndex) {
      throw new Error(`Window index ${windowIndex} not found. Total open pages: ${pages.length}`);
    }

    const targetPage = pages[windowIndex];
    await targetPage.bringToFront();
    await targetPage.waitForLoadState('domcontentloaded');
    this.page = targetPage;
    this.planningPage.page = targetPage;
  }

  public async validateDrillThroughTransitionState(
    commonFunctions: CommonFunctions,
    options: {
      sourceUrl: string;
      expectedSelectedView: string;
      expectedBackButton: boolean;
      sourceViewName?: string;
      targetViewName?: string;
      compareViewNameWhenViewIdMissing?: boolean;
      clearContextAfterValidation?: boolean;
      logPrefix?: string;
    }
  ): Promise<boolean> {
    const {
      sourceUrl,
      expectedSelectedView,
      expectedBackButton,
      sourceViewName,
      targetViewName,
      compareViewNameWhenViewIdMissing = false,
      clearContextAfterValidation = false,
      logPrefix = 'Drill-through validation'
    } = options;

    await this.waitForViewName(expectedSelectedView);
    await this.planningPage.waitForPlanningSpaceLoaderToDisappear().catch(() => {});

    const navigatedUrl = this.page.url();
    const sourceViewId = this.getQueryParam(sourceUrl, 'viewId');
    const targetViewId = this.getQueryParam(navigatedUrl, 'viewId');

    const isViewChanged = sourceViewId && targetViewId
      ? sourceViewId !== targetViewId
      : compareViewNameWhenViewIdMissing && sourceViewName && targetViewName
        ? sourceViewName !== targetViewName
        : true;

    const viewValidation = await commonFunctions.compareTwoValues(isViewChanged, true, 'Checking two view identities that should not be the same');

    const contextId = await this.waitForContextId();
    const contextValidation = await commonFunctions.compareTwoValues(contextId !== '', true, 'Context id should exist while drillthrough');

    const selectedViewName = await this.planningPage.getViewTitleName();
    const selectedViewValidation = await commonFunctions.compareTwoValues(selectedViewName, expectedSelectedView, `Is ${expectedSelectedView} view selected after drill through`);

    const isBackBtnExist = await this.getBackButtonState();
    const backButtonValidation = await commonFunctions.compareTwoValues(isBackBtnExist, expectedBackButton, 'Is back button displayed');

    const isClearDisplays = await this.planningPage.isClearDisplays();
    const clearValidation = await commonFunctions.compareTwoValues(isClearDisplays, true, 'Is clear context button available');

    if (clearContextAfterValidation) {
      await this.planningPage.clearContext();
    }

    await commonFunctions.logMessage('INFO', `${logPrefix}: viewChanged=${viewValidation}, context=${contextValidation}, backButton=${backButtonValidation}, selectedView=${selectedViewValidation}, clearContext=${clearValidation}`);

    return viewValidation && contextValidation && backButtonValidation && selectedViewValidation && clearValidation;
  }
}

