import { Page, Locator, expect } from '@playwright/test';
import BasePage, { ACTIVE_MFE_IFRAME } from '../page';
import { getTimeout, TIMEOUTS } from '../../constants/timeouts';
import { CommonFunctions } from '../../util/common.util';
import { exactText, textContaining } from '../planning/text-match';
import { dashboardCardByTitle } from './card-locators';

type Point = { x: number; y: number };

/**
 * Cards rendered in a Planning view (`@by/lui-dashboard-library` 10.10.x): card header
 * `lui-dashboard-card-cardHeader` with `lui-dashboard-card-menu-button` (three-dot menu, items
 * `lui-dashboard-card-settings-button` and `li` entries named by a `p`), `refresh-button`, "Minimize Icon Button",
 * `lui-dashboard-card-edit-start-button`; card bodies: Highcharts (`svg.highcharts-root`, x-axis
 * `lui-chart-card-x-axis-wrapper`), `div#network-graph`, `enhanced-table-card-row`, `lui-ccl-empty-state-*`, BDE
 * tables (`tableHeader` / `tableFilter` rows, `toolbar-filter-iconButton`), Maas toolbars (`chart-toolbar-testid*`,
 * `pivot-toolbar*`), quick filter chips `qf-filter-panel-chip` and `data-sync-status-btn`. Locators keep the
 * attributes the old XPath used.
 */
export class DashboardCardsComponent extends BasePage {
  private readonly log = new CommonFunctions();

  constructor(page: Page) {
    super(page);
  }

  // Locators
  public card(cardTitle: string): Locator             { return dashboardCardByTitle(this, cardTitle); }
  private header(cardTitle: string): Locator          { return this.card(cardTitle).getByTestId('lui-dashboard-card-cardHeader').first(); }
  private get allCards(): Locator                     { return this.mfeLocator('div[data-testid="lui-dashboard-card"]'); }
  private get dashboardRefreshBtn(): Locator {
    return this.getMfeFrameLocator().locator('#refresh-btn').or(this.getMfeFrameLocator().getByRole('button', { name: /refresh/i })).first();
  }
  private get settingsMenuItems(): Locator            { return this.mfeLocator('li[data-testid="lui-dashboard-card-settings-button"]'); }
  private get emptyStateTitle(): Locator              { return this.mfeLocator('[data-testid="lui-ccl-empty-state-title-grid-container"]'); }
  private get bdeFilterIcon(): Locator                { return this.mfeLocator('button[data-testid="toolbar-filter-iconButton"]'); }
  private get bdeExpandFilter(): Locator              { return this.getMfeFrameLocator().getByText('Expand Filter', { exact: true }); }
  private get kpiGraph(): Locator                     { return this.mfeLocator('[data-testid="KPI-Quarter Sales"]').first(); }
  private get kpiCardHeader(): Locator                { return this.mfeLocator('[data-testid="KPI-Quarter Sales-card-header"]').first(); }
  private get maasChartIcons(): Locator               { return this.mfeLocator('button[data-testid*="chart-toolbar-testid"]'); }
  private get maasPivotIcons(): Locator               { return this.mfeLocator('button[data-testid*="pivot-toolbar"]'); }
  private get separators(): Locator                   { return this.mfeLocator('[role="separator"]'); }
  private get dataSyncStatusBtn(): Locator            { return this.getMfeFrameLocator().getByTestId('data-sync-status-btn'); }
  private get minimizeIcon(): Locator {
    return this.getMfeFrameLocator().getByRole('button', { name: 'Minimize Icon Button' })
      .or(this.mfeLocator('button[data-testid="lui-dashboard-card-header-iconbutton"][aria-label="Minimize Icon Button"]'))
      .first();
  }

  private menuButton(cardTitle: string): Locator {
    return this.header(cardTitle).locator('button[data-testid="lui-dashboard-card-menu-button"], button[aria-label="more"]').first();
  }
  private menuOption(option: string): Locator {
    return this.mfeLocator('li').filter({ has: this.page.locator('p').filter({ hasText: textContaining(option) }) }).first();
  }
  private titleInDashboard(cardTitle: string): Locator {
    return this.mfeLocator('[data-testid="lui-dashboard-card-title"] span').filter({ hasText: exactText(cardTitle) })
      .or(this.mfeLocator(`[data-testid="lui-dashboard-card-edit-title"] input[value=${JSON.stringify(cardTitle)}]`))
      .first();
  }
  private titleContaining(cardTitle: string): Locator {
    return this.mfeLocator('[data-testid="lui-dashboard-card-title"] span').filter({ hasText: textContaining(cardTitle) })
      .or(this.mfeLocator(`[data-testid="lui-dashboard-card-title"] input[value=${JSON.stringify(cardTitle)}]`))
      .first();
  }
  private headerButton(cardTitle: string, selector: string): Locator { return this.header(cardTitle).locator(selector).first(); }
  private toolbarButton(cardTitle: string, label: string): Locator {
    const selectors = [`button[aria-label^=${JSON.stringify(label)}]`];
    if (label.startsWith('Filter')) selectors.push('button[aria-label^="Filter"]');
    return this.card(cardTitle).locator(selectors.map((s) => `[data-testid="lui-dashboard-card-cardHeader"] ~ div ${s}`).join(', ')).first();
  }
  private bdeColumns(cardTitle: string): Locator {
    return this.card(cardTitle).locator('thead > tr[data-testid="tableHeader"] > th');
  }
  private bdeFilterInput(cardTitle: string, colIndex: string): Locator {
    return this.card(cardTitle).locator(`thead > tr[data-testid="tableFilter"] > th[data-col-idx="${colIndex}"] input[placeholder="Filter"]`);
  }
  private maasXAxisLabels(cardTitle: string): Locator {
    return this.card(cardTitle).locator('div[class*="highcharts-container"] > div[class*="highcharts-axis-labels"][class*="highcharts-xaxis-labels"] div[class*="lui-chart-card-x-axis-wrapper"]');
  }
  private tableRows(cardTitle: string): Locator       { return this.card(cardTitle).getByTestId('enhanced-table-card-row'); }
  private tabbedCard(cardName: string): Locator {
    return this.getMfeFrameLocator().getByRole('tab', { name: exactText(cardName) })
      .or(this.mfeLocator('p').filter({ hasText: exactText(cardName) }))
      .first();
  }
  private quickFilterChip(value: string): Locator     { return this.getMfeFrameLocator().getByTestId('qf-filter-panel-chip').filter({ hasText: exactText(value) }).first(); }

  // Helpers
  private async isShown(locator: Locator, timeout: number): Promise<boolean> {
    return locator.waitFor({ state: 'visible', timeout }).then(() => true, () => false);
  }

  // Atomic actions: card header and menu
  public async isAnyCardShown(): Promise<boolean> {
    const isShown = (await this.allCards.count()) > 0;
    await this.log.logMessage('INFO', isShown ? 'Atleast one card exist in current view' : 'No card exist in current view');
    return isShown;
  }

  public async openMenu(cardTitle: string): Promise<void> {
    const menu = this.menuButton(cardTitle);
    await menu.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(menu, `Clicking three dots menu of card ${cardTitle}`);
  }

  public async selectMenuOption(cardTitle: string, option: string): Promise<void> {
    await this.openMenu(cardTitle);
    const item = this.menuOption(option);
    await item.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(item, `Clicking on option '${option}' from ${cardTitle} card`);
  }

  /** Opens the card's settings from its three-dot menu; several cards render the item, so the visible one is used. */
  public async openSettings(cardTitle: string): Promise<void> {
    await this.openMenu(cardTitle);
    const item = this.settingsMenuItems.filter({ visible: true }).first();
    await item.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await item.scrollIntoViewIfNeeded();
    await this.doClickUsingScript(item, 'Clicking on settings item from three dots menu');
  }

  public async startEdit(cardTitle: string): Promise<void> {
    const card = this.card(cardTitle);
    await card.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    const editButton = card.getByTestId('lui-dashboard-card-edit-start-button').first();
    await editButton.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(editButton, `Clicking edit icon for card ${cardTitle}`);
  }

  /** The card itself (span or input title), or a card title containing `cardTitle` (KPI cards append to it). */
  public async isCardShown(cardTitle: string, timeout: number = getTimeout('EXTREME')): Promise<boolean> {
    const isShown = await this.isShown(this.card(cardTitle).or(this.titleContaining(cardTitle)).first(), timeout);
    await this.log.logMessage('INFO', `Is card ${cardTitle} shown :: ${isShown}`);
    return isShown;
  }

  public async isTitleShown(cardTitle: string, timeout: number = getTimeout('EXTREME')): Promise<boolean> {
    const title = this.mfeLocator(`[data-testid="lui-dashboard-card-title"] span:text-is(${JSON.stringify(cardTitle)})`).first();
    return this.isShown(title, timeout);
  }

  public async refreshCard(cardTitle: string): Promise<boolean> {
    const refresh = this.card(cardTitle).getByTestId('refresh-button').first();
    if (!(await refresh.isVisible())) return false;
    await this.doClick(refresh, `Refreshing ${cardTitle} card`);
    return true;
  }

  public async clickDashboardRefresh(): Promise<boolean> {
    if (!(await this.dashboardRefreshBtn.isVisible())) {
      await this.log.logMessage('INFO', 'Refresh button not found on dashboard');
      return false;
    }
    await this.doClick(this.dashboardRefreshBtn, 'Clicking refresh button on dashboard');
    return true;
  }

  public async toggleMinimize(): Promise<boolean> {
    try {
      await this.minimizeIcon.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
      await this.doClick(this.minimizeIcon, 'Toggling minimize icon');
      return true;
    } catch (error) {
      await this.log.logMessage('FAIL', `Failed to toggle minimize icon: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  // Atomic actions: BDE card
  public async isRefreshIconShown(cardTitle: string): Promise<boolean> {
    const icon = this.headerButton(cardTitle, 'button[data-testid="refresh-button"]');
    const isShown = await this.isShown(icon, getTimeout('EXTREME'));
    await this.log.logMessage('INFO', `Is refresh icon exist in ${cardTitle} card :: ${isShown}`);
    return isShown;
  }

  public async isMinimizeIconShown(cardTitle: string): Promise<boolean> {
    const icon = this.headerButton(cardTitle, 'button[aria-label="Minimize Icon Button"]');
    const isShown = await this.isShown(icon, getTimeout('EXTREME'));
    await this.log.logMessage('INFO', `Is minimize icon exist in ${cardTitle} card :: ${isShown}`);
    return isShown;
  }

  /** The settings button can be collapsed into the header's overflow, so it only has to be in the DOM. */
  public async isSettingsIconPresent(cardTitle: string): Promise<boolean> {
    const icon = this.headerButton(cardTitle, 'button[aria-label="settings"]');
    const isPresent = await icon.waitFor({ state: 'attached', timeout: getTimeout('EXTREME') }).then(() => true, () => false);
    await this.log.logMessage('INFO', `Is settings icon exist in ${cardTitle} card :: ${isPresent}`);
    return isPresent;
  }

  /** Toolbar buttons below the header, matched by an `aria-label` starting with `label` ("Filter" also matches "Filters"). */
  public async isToolbarButtonPresent(cardTitle: string, label: string): Promise<boolean> {
    const button = this.toolbarButton(cardTitle, label);
    const isPresent = await button.waitFor({ state: 'attached', timeout: getTimeout('EXTREME') }).then(() => true, () => false);
    await this.log.logMessage('INFO', `Is ${label} button exist in ${cardTitle} card :: ${isPresent}`);
    return isPresent;
  }

  public async isPaginationShown(cardTitle: string): Promise<boolean> {
    const pagination = this.card(cardTitle).locator('p:text-is("Rows Per Page")').first();
    const isShown = await this.isShown(pagination, getTimeout('EXTREME'));
    await this.log.logMessage('INFO', `Is pagination exist :: ${isShown}`);
    return isShown;
  }

  /** Opens the BDE filter row and checks every named column has a filter input. */
  public async hasFilterInputForEachColumn(cardTitle: string): Promise<boolean> {
    await this.bdeFilterIcon.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.bdeFilterIcon, 'Clicking on filter icon');
    await this.doClick(this.bdeExpandFilter, 'Clicking on expand filter icon');
    const columns = this.bdeColumns(cardTitle);
    const count = await columns.count();
    for (let i = 0; i < count; i++) {
      const column = columns.nth(i);
      const colName = ((await column.textContent()) ?? '').trim();
      const colIndex = await column.getAttribute('data-col-idx');
      if (!colName || colIndex === null) continue;
      if (!(await this.bdeFilterInput(cardTitle, colIndex).isVisible())) {
        await this.log.logMessage('INFO', `filter input is not available for ${colName} column in ${cardTitle} card table`);
        return false;
      }
    }
    await this.log.logMessage('INFO', `filter input field is available for columns in ${cardTitle} card table`);
    return true;
  }

  // Atomic actions: card content
  public async getMaasChartXAxisLabels(cardTitle: string): Promise<string[]> {
    const labelEles = this.maasXAxisLabels(cardTitle);
    await labelEles.first().waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    // Label text without its hover tooltip, line breaks folded to spaces.
    const labels = (await labelEles.evaluateAll((nodes) => nodes.map((node) => {
      const tooltip = (node as HTMLElement).querySelector<HTMLElement>('.lui-chart-axis-tooltip');
      const text = (node as HTMLElement).innerText;
      return (tooltip ? text.replace(tooltip.innerText, '') : text).replace(/\s+/g, ' ').trim();
    }))).filter(Boolean);
    await this.log.logMessage('INFO', `Fetched labels are ${labels.join(', ')}`);
    return labels;
  }

  public async isGraphShown(cardTitle: string): Promise<boolean> {
    const chart = this.card(cardTitle).locator('svg.highcharts-root').first();
    const isShown = await this.isShown(chart, getTimeout('XLARGE'));
    await this.log.logMessage('INFO', `Is Graph in card ${cardTitle} visible :: ${isShown}`);
    return isShown;
  }

  public async isNetworkGraphShown(cardTitle: string): Promise<boolean> {
    const graph = this.card(cardTitle).locator('div#network-graph');
    const isShown = await this.isShown(graph, getTimeout('XLARGE'));
    await this.log.logMessage('INFO', `Is Network Graph in card ${cardTitle} visible :: ${isShown}`);
    return isShown;
  }

  /** Waits for the tree table to settle on rows or on its no-data state (both re-render after a save). */
  public async hasTreeTableRows(cardTitle: string): Promise<boolean> {
    const card = this.mfeLocator(`div[data-card-title=${JSON.stringify(cardTitle)}] div[data-testid="lui-dashboard-card"]`).first();
    if (!(await this.isShown(card, getTimeout('XLARGE')))) {
      await this.log.logMessage('INFO', `Card container not found for ${cardTitle}`);
      return false;
    }
    const rows = card.getByTestId('enhanced-table-card-row');
    const noData = card.locator('[data-testid="lui-ccl-empty-state-heading"]');
    await rows.first().waitFor({ state: 'hidden', timeout: getTimeout('SHORT') }).catch(() => undefined);
    await noData.first().waitFor({ state: 'hidden', timeout: getTimeout('MEDIUM') }).catch(() => undefined);
    const settled = await Promise.race([
      rows.first().waitFor({ state: 'visible', timeout: getTimeout('LONG') }).then(() => 'rows'),
      noData.first().waitFor({ state: 'visible', timeout: getTimeout('LONG') }).then(() => 'empty'),
    ]).catch(() => 'timeout');
    const hasRows = settled !== 'empty' && (await rows.count()) > 0;
    await this.log.logMessage('INFO', `Tree table data is visible in ${cardTitle} :: ${hasRows} (${settled})`);
    return hasRows;
  }

  public async isNoColumnsStateShown(cardTitle?: string): Promise<boolean> {
    const state = cardTitle ? this.card(cardTitle).locator('[data-testid="lui-ccl-empty-state-title-grid-container"]') : this.emptyStateTitle;
    const isShown = await this.isShown(state, getTimeout('LONG'));
    await this.log.logMessage('INFO', `Is no columns state visible${cardTitle ? ` in ${cardTitle}` : ''} :: ${isShown}`);
    return isShown;
  }

  public async hasTableRows(cardTitle: string): Promise<boolean> {
    const hasRows = await this.isShown(this.tableRows(cardTitle).first(), getTimeout('XLARGE'));
    await this.log.logMessage('INFO', `Is table data visible in ${cardTitle} :: ${hasRows}`);
    return hasRows;
  }

  public async clickTableRowTitle(cardTitle: string, rowTitle: string): Promise<void> {
    const title = this.tableRows(cardTitle).getByText(rowTitle, { exact: true }).first();
    await title.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(title, `Clicking on My Task row ${rowTitle} in card ${cardTitle}`);
  }

  /** NPI cards show "No records are available for display." when the endpoint returns nothing. */
  public async hasNpiData(cardTitle: string): Promise<boolean> {
    const card = this.card(cardTitle);
    await card.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await card.locator('.MuiSkeleton-root').first().waitFor({ state: 'hidden', timeout: getTimeout('EXTREME') }).catch(() => undefined);
    const hasData = !(await card.getByText(/No records are available for display\./i).first().isVisible());
    await this.log.logMessage('INFO', `Is NPI data visible in ${cardTitle} :: ${hasData}`);
    return hasData;
  }

  /** Waits for the card to settle on its error, empty or data state, refreshing it once unless it shows the error. */
  public async isLoadErrorShown(cardTitle: string): Promise<boolean> {
    const card = this.card(cardTitle);
    await card.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    const error = card.getByText(/Unable to load data/i).first();
    const empty = card.locator('[data-testid="lui-ccl-empty-state-title-grid-container"]');
    const rows = this.tableRows(cardTitle).first();
    const settle = (): Promise<'error' | 'empty' | 'rows' | 'timeout'> => Promise.race([
      error.waitFor({ state: 'visible', timeout: getTimeout('LONG') }).then(() => 'error' as const),
      empty.waitFor({ state: 'visible', timeout: getTimeout('LONG') }).then(() => 'empty' as const),
      rows.waitFor({ state: 'visible', timeout: getTimeout('LONG') }).then(() => 'rows' as const),
    ]).catch(() => 'timeout' as const);

    let state = await settle();
    if (state !== 'error' && await this.refreshCard(cardTitle)) {
      await this.log.logMessage('INFO', `First settled state for ${cardTitle}: ${state}. Refreshed card once before re-checking error state.`);
      state = await settle();
    }
    await this.log.logMessage('INFO', `Is "Unable to load data" state visible in ${cardTitle} :: ${state === 'error'} (settled: ${state})`);
    return state === 'error';
  }

  /** Clicks the Quarter Sales KPI and checks its header still renders. */
  public async clickKpiAndVerifyHeader(cardTitle: string): Promise<boolean> {
    const isCardShown = await this.isShown(this.titleContaining(cardTitle), getTimeout('EXTREME'));
    await this.kpiGraph.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.kpiGraph, 'Clicking on KPI graph to trigger refresh');
    if (await this.isShown(this.kpiCardHeader, getTimeout('EXTREME'))) {
      return isCardShown;
    }
    await this.log.logMessage('INFO', 'KPI card header not found after click, verifying card still visible');
    return isCardShown;
  }

  public async selectTab(cardName: string): Promise<void> {
    const tab = this.tabbedCard(cardName);
    await tab.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(tab, `Clicking tabbed card: ${cardName}`);
  }

  public async getMaasChartIconCount(): Promise<number> {
    const count = await this.maasChartIcons.count();
    await this.log.logMessage('INFO', `Total icon count for maas chart card ${count}`);
    return count;
  }

  /** The pivot toolbar renders its buttons in stages, so wait until more than three are there and the count holds. */
  public async getMaasPivotIconCount(): Promise<number> {
    let previous = -1;
    await expect.poll(async () => {
      const count = await this.maasPivotIcons.count();
      const stable = count > 3 && count === previous;
      previous = count;
      return stable;
    }, { timeout: getTimeout('MEDIUM'), intervals: [TIMEOUTS.POLL_INTERVAL] }).toBe(true).catch(() => undefined);
    const count = await this.maasPivotIcons.count();
    await this.log.logMessage('INFO', `Total icon count for maas pivot card ${count}`);
    return count;
  }

  public async areQuickFilterChipsShown(values: string[]): Promise<boolean> {
    if (values.length > 0) {
      await this.quickFilterChip(values[0]).waitFor({ state: 'visible', timeout: getTimeout('EXTREME') }).catch(() => undefined);
    }
    for (const value of values) {
      const exists = await this.doesElementExist(this.quickFilterChip(value), `Quick filter chip '${value}' exists`);
      if (!exists) return false;
    }
    return true;
  }

  public async areCardsShown(cardTitles: string[]): Promise<boolean> {
    if (cardTitles.length === 0) return false;
    await this.titleInDashboard(cardTitles[0]).waitFor({ state: 'visible', timeout: getTimeout('EXTREME') }).catch(() => undefined);
    for (const cardTitle of cardTitles) {
      if (!(await this.doesElementExist(this.titleInDashboard(cardTitle), `Card: ${cardTitle} exists in dashboard`))) return false;
    }
    return true;
  }

  public async isDataSyncButtonShown(): Promise<boolean> {
    return this.doesElementExist(this.dataSyncStatusBtn, 'Data sync status button exists');
  }

  // Composite actions: resize
  /** Rounded width x height of every dashboard card, in document order. */
  private async getCardSizes(): Promise<string> {
    const sizes = await this.allCards.evaluateAll((cards) => cards.map((card) => {
      const rect = card.getBoundingClientRect();
      return `${Math.round(rect.width)}x${Math.round(rect.height)}`;
    }));
    return sizes.join(',');
  }

  /**
   * Drags the splitter between the first two cards by 120 px (towards the middle of the viewport) and reports
   * whether any card's size changed, so a drag on the wrong element does not count as a resize.
   */
  public async resizeCards(): Promise<boolean> {
    await this.mfeLocator('[class*="dashboard-card"],[class*="react-grid-item"],[data-testid*="dashboard-card"]').first()
      .waitFor({ state: 'visible', timeout: getTimeout('XLARGE') }).catch(() => undefined);
    await this.separators.first().waitFor({ state: 'attached', timeout: getTimeout('TINY') }).catch(() => undefined);
    const center = (await this.getSeparatorCenter()) ?? (await this.getResizeHandleCenter()) ?? (await this.getCardBoundaryCenter());
    if (!center) {
      await this.log.logMessage('ERROR', 'Resize separator not found in DOM');
      return false;
    }
    const viewport = this.page.viewportSize();
    const dragDelta = viewport && center.x > viewport.width * 0.65 ? -120 : 120;
    const sizesBefore = await this.getCardSizes();
    await this.log.logMessage('INFO', `Performing resize drag from (${center.x}, ${center.y}); card sizes before: ${sizesBefore}`);
    await this.page.mouse.move(center.x, center.y);
    await this.page.mouse.down();
    await this.page.mouse.move(center.x + dragDelta, center.y, { steps: 15 });
    await this.page.mouse.up();
    const isResized = await expect.poll(() => this.getCardSizes(), { timeout: getTimeout('SHORT'), intervals: [TIMEOUTS.POLL_INTERVAL] })
      .not.toBe(sizesBefore).then(() => true, () => false);
    await this.log.logMessage('INFO', `Card sizes after drag: ${await this.getCardSizes()}; resized :: ${isResized}`);
    return isResized;
  }

  private async getSeparatorCenter(): Promise<Point | null> {
    const count = await this.separators.count();
    await this.log.logMessage('INFO', `Found ${count} separator elements in DOM`);
    for (let i = 0; i < count; i++) {
      const separator = this.separators.nth(i);
      if (!(await separator.isVisible())) continue;
      const box = await separator.boundingBox();
      if (box && (box.height >= 80 || box.width >= 80)) {
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      }
    }
    return null;
  }

  private async getFrameOffset(): Promise<Point | null> {
    const box = await this.page.locator(ACTIVE_MFE_IFRAME).first().boundingBox();
    return box ? { x: box.x, y: box.y } : null;
  }

  /** Largest visible element that looks like a resize handle (cursor, role or class). */
  private async getResizeHandleCenter(): Promise<Point | null> {
    await this.log.logMessage('INFO', 'Falling back to computed-style resize handle lookup');
    const offset = await this.getFrameOffset();
    if (!offset) return null;
    const points = await this.mfeLocator('div, span, button').evaluateAll((elements) => elements.flatMap((element) => {
      const el = element as HTMLElement;
      const cursor = window.getComputedStyle(el).cursor.toLowerCase();
      const hints = `${el.getAttribute('role') ?? ''} ${el.getAttribute('data-testid') ?? ''} ${el.className}`.toLowerCase();
      const mayResize = cursor.includes('col-resize') || cursor.includes('ew-resize') || /separator|resize|splitter/.test(hints);
      const rect = el.getBoundingClientRect();
      const inViewport = rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
      return mayResize && inViewport && (rect.height >= 40 || rect.width >= 40)
        ? [{ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, area: rect.width * rect.height }]
        : [];
    }));
    if (!points.length) return null;
    const point = points.sort((a, b) => b.area - a.area)[0];
    return { x: offset.x + point.x, y: offset.y + point.y };
  }

  /** Midpoint of the boundary between the first two cards in the top row. */
  private async getCardBoundaryCenter(): Promise<Point | null> {
    await this.log.logMessage('INFO', 'Falling back to adjacent card boundary lookup');
    const offset = await this.getFrameOffset();
    if (!offset) return null;
    const cards = await this.mfeLocator('div').evaluateAll((elements) => elements.flatMap((element) => {
      const el = element as HTMLElement;
      const hints = `${el.getAttribute('data-testid') ?? ''} ${el.className}`.toLowerCase();
      const rect = el.getBoundingClientRect();
      const inViewport = rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
      return /dashboard-card|react-grid-item|card/.test(hints) && rect.width >= 200 && rect.height >= 120 && inViewport
        ? [{ x: rect.left, y: rect.top, width: rect.width, height: rect.height }]
        : [];
    }));
    if (cards.length < 2) return null;
    cards.sort((a, b) => a.y - b.y || a.x - b.x);
    const topRow = cards.filter((card) => Math.abs(card.y - cards[0].y) < 60).sort((a, b) => a.x - b.x);
    await this.log.logMessage('INFO', `Found ${cards.length} dashboard cards`);
    if (topRow.length < 2) return null;
    const [left, right] = topRow;
    const x = (left.x + left.width + right.x) / 2;
    const overlapTop = Math.max(left.y, right.y);
    const overlapBottom = Math.min(left.y + left.height, right.y + right.height);
    const y = overlapBottom > overlapTop ? (overlapTop + overlapBottom) / 2 : left.y + left.height / 2;
    await this.log.logMessage('INFO', `Using boundary between top-row cards at x=${x}, y=${y}`);
    return { x: offset.x + x, y: offset.y + y };
  }
}
