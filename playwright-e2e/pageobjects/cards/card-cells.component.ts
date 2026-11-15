import { Page, Locator, expect } from '@playwright/test';
import BasePage from '../page';
import { getTimeout, TIMEOUTS } from '../../constants/timeouts';
import { CommonFunctions } from '../../util/common.util';
import { exactText, textContaining } from '../planning/text-match';
import { dashboardCardByTitle } from './card-locators';

export type CellCardType = 'PieChart' | 'PivotCard';

const SPECIAL_CHARACTERS = ['!', '@', '#', '$', '%', '&', '*'];

/**
 * Cells inside dashboard cards: inline editing of enhanced tables (`enhanced-table-edit-cell-default`, Save / Cancel
 * `lui-dashboard-card-edit-save-button` / `-cancel-button`, discard `table-edit-confirm-cancel`) and Maas pivots
 * (context menu `context-menu-item-change_to`, `editrange-save-btn`, revert `*button-revert-changes-action*`), chip
 * cells (`chips-type-cell-link-text`, `chip-list-popup-*`), right-click "More actions"
 * (`context-menu-item-moreActions`, `lui-ccl-nestedmenu-submenu-container`), enhanced-table drill-through
 * (`icon-button-data-type-column-cell`), drill-through breadcrumbs (`drill-through-source-view` /
 * `-target-view`), the pivot view select and the view's dirty state.
 */
export class CardCellsComponent extends BasePage {
  private readonly log = new CommonFunctions();

  constructor(page: Page) {
    super(page);
  }

  // Locators
  private get btnEditSave(): Locator          { return this.getMfeFrameLocator().getByTestId('lui-dashboard-card-edit-save-button'); }
  private get btnEditCancel(): Locator        { return this.getMfeFrameLocator().getByTestId('lui-dashboard-card-edit-cancel-button'); }
  private get btnEditDiscard(): Locator       { return this.getMfeFrameLocator().getByTestId('table-edit-confirm-cancel'); }
  private get tableEditInputs(): Locator {
    return this.mfeLocator('[data-testid="enhanced-table-edit-cell-default"] input[type="text"], [data-testid*="edit-cell"] input[type="text"]');
  }
  private get tableSkeleton(): Locator        { return this.mfeLocator('.MuiSkeleton-root').first(); }
  private get snackbar(): Locator             { return this.mfeLocator('[role="presentation"].MuiSnackbar-root').first(); }
  private get chipCellLink(): Locator         { return this.getMfeFrameLocator().getByTestId('chips-type-cell-link-text').first(); }
  private get chipsPopup(): Locator           { return this.getMfeFrameLocator().getByTestId('chip-list-popup-content'); }
  private get chipsPopupSearch(): Locator     { return this.getMfeFrameLocator().getByTestId('chip-list-popup-lui-search').locator('input'); }
  private get chipsPopupClose(): Locator      { return this.getMfeFrameLocator().getByTestId('chip-list-popup-content-close-icon'); }
  private get menuChangeTo(): Locator         { return this.mfeLocator('li[data-testid="context-menu-item-change_to"]'); }
  private get inputChangeTo(): Locator        { return this.mfeLocator('input[placeholder="Enter Value"]'); }
  private get btnChangeToSave(): Locator      { return this.mfeLocator('button[data-testid="editrange-save-btn"][aria-label="Edit Range Save"]'); }
  private get btnPivotRevert(): Locator       { return this.mfeLocator('button[data-testid*="button-revert-changes-action"]').first(); }
  private get menuMoreActions(): Locator      { return this.getMfeFrameLocator().getByTestId('context-menu-item-moreActions'); }
  private get xAxisLabel(): Locator           { return this.mfeLocator('[class*="highcharts-xaxis-labels"] [class*="lui-chart-card-x-axis-wrapper"] span').first(); }
  private get pivotHeader(): Locator          { return this.getMfeFrameLocator().getByTestId('pivot-table-header-wrapper'); }
  private get pivotViewSelect(): Locator      { return this.getMfeFrameLocator().getByTestId('pivot-toolbar-filter-toolbar-dropdown-pivotView-action-select'); }
  private get breadcrumbSource(): Locator     { return this.getMfeFrameLocator().getByTestId('drill-through-source-view'); }
  private get breadcrumbTarget(): Locator     { return this.getMfeFrameLocator().getByTestId('drill-through-target-view'); }
  private get breadcrumbs(): Locator {
    return this.breadcrumbSource.or(this.breadcrumbTarget)
      .or(this.mfeLocator('.MuiBreadcrumbs-root, [class*="MuiBreadcrumbs"], nav[aria-label*="breadcrumb" i], [class*="css-zm0l9g"]'));
  }
  private get contextOverrideChip(): Locator  { return this.getMfeFrameLocator().getByTestId('context-override-chip'); }
  private get enhancedTableRows(): Locator    { return this.getMfeFrameLocator().getByTestId('enhanced-table-card-row'); }
  private get enhancedTableSkeleton(): Locator { return this.getMfeFrameLocator().getByTestId('enhanced-table-card-skeleton-component'); }

  /** Text in a cell; the exact match comes first, then partial matches as the old lookup allowed. */
  private cell(value: string): Locator {
    return this.getMfeFrameLocator().getByText(value, { exact: true })
      .or(this.mfeLocator('div, span, p').filter({ hasText: value }))
      .first();
  }
  private gridCell(value: string): Locator {
    const frame = this.getMfeFrameLocator();
    return frame.locator('div[role="gridcell"], td, [role="cell"], tr').locator('span, p, div').filter({ hasText: exactText(value) })
      .or(frame.getByText(value, { exact: true }))
      .or(frame.locator('div[role="gridcell"], td, [role="cell"]').locator('span, p, div').filter({ hasText: value }))
      .or(frame.getByText(value))
      .first();
  }
  private pieSlice(value: string): Locator {
    return this.mfeLocator(`path[data-testid=${JSON.stringify(value)}]`).or(this.mfeLocator(`[data-testid=${JSON.stringify(value)}]`)).first();
  }
  private moreActionsItem(option: string): Locator {
    const submenu = this.getMfeFrameLocator().getByTestId('lui-ccl-nestedmenu-submenu-container');
    return submenu.getByText(option, { exact: true }).or(submenu.locator('div, span, li').filter({ hasText: option })).first();
  }
  private pivotViewOption(name: string): Locator {
    const exactName = new RegExp(exactText(name).source, 'i');
    return this.getMfeFrameLocator().getByRole('option', { name: exactName })
      .or(this.mfeLocator('.MuiTypography-root').filter({ hasText: exactName }))
      .first();
  }
  private breadcrumb(viewName: string): Locator {
    return this.breadcrumbSource.filter({ hasText: exactText(viewName) })
      .or(this.breadcrumbTarget.filter({ hasText: exactText(viewName) }))
      .or(this.mfeLocator('.MuiBreadcrumbs-root p, nav[aria-label*="breadcrumb" i] p, p').filter({ hasText: exactText(viewName) }))
      .first();
  }

  // Helpers
  private randomSpecialCharacter(): string {
    return SPECIAL_CHARACTERS[Math.floor(Math.random() * SPECIAL_CHARACTERS.length)];
  }

  private async startCardEdit(cardTitle: string): Promise<void> {
    const card = dashboardCardByTitle(this, cardTitle);
    await card.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    const editButton = card.getByTestId('lui-dashboard-card-edit-start-button').first();
    await editButton.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(editButton, `Clicking the edit icon in ${cardTitle} card`);
  }

  /** Appends a special character to up to `maxEdits` filled cells, or types one into the first empty cell. */
  private async editTableCells(maxEdits: number = 3): Promise<number> {
    await this.tableSkeleton.waitFor({ state: 'hidden', timeout: getTimeout('EXTREME') }).catch(() => undefined);
    const inputs = await this.tableEditInputs.filter({ visible: true }).all();
    let edited = 0;
    for (const input of inputs) {
      if (edited >= maxEdits) break;
      const existing = (await input.inputValue()).trim();
      if (!existing) continue;
      const updated = `${existing}${this.randomSpecialCharacter()}`;
      await this.doClick(input, 'Focusing table edit input to enter value');
      await this.log.logMessage('INFO', `Entering updated value in table edit cell: ${updated}`);
      await input.fill(updated);
      edited++;
    }
    if (edited === 0 && inputs.length > 0) {
      await this.doClick(inputs[0], 'Focusing fallback table edit input to enter value');
      await inputs[0].fill(this.randomSpecialCharacter());
      edited = 1;
    }
    return edited;
  }

  // Atomic actions: inline editing
  public async startTableEdit(cardTitle: string): Promise<boolean> {
    await this.startCardEdit(cardTitle);
    await this.btnEditCancel.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.btnEditSave.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    return (await this.btnEditCancel.isVisible()) && (await this.btnEditSave.isVisible());
  }

  public async editTableCellsAndSave(): Promise<boolean> {
    if ((await this.editTableCells()) === 0) {
      await this.log.logMessage('INFO', 'No editable table cell was found to update before save');
      return false;
    }
    await this.btnEditSave.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(this.btnEditSave, 'Clicking the Save button');
    if (await this.snackbar.isVisible()) return true;
    await this.btnEditSave.waitFor({ state: 'hidden', timeout: getTimeout('XLARGE') });
    return true;
  }

  public async editTableCellsAndDiscard(): Promise<boolean> {
    await this.editTableCells();
    await this.btnEditCancel.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(this.btnEditCancel, 'Clicking the Cancel button');
    await this.btnEditDiscard.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    const isDiscardShown = await this.btnEditDiscard.isVisible();
    await this.doClick(this.btnEditDiscard, 'Clicking the Discard button to cancel the changes');
    return isDiscardShown;
  }

  /** Puts the card in edit mode and changes one cell: the first enhanced-table cell, or a pivot cell via "Change To". */
  public async editCell(cardType: 'PivotCard' | 'Enhanced Table', cardTitle: string, identifier: string, updatedValue: string): Promise<boolean> {
    try {
      await this.startCardEdit(cardTitle);
      if (cardType === 'Enhanced Table') {
        const input = this.tableEditInputs.first();
        await input.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
        const existing = (await input.inputValue()).trim();
        await input.fill(existing ? `${existing}!` : '1');
        await this.doClick(this.btnEditSave.first(), 'Saving enhanced table cell edit');
      } else {
        const target = this.cell(identifier);
        await target.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
        await target.scrollIntoViewIfNeeded();
        await target.click({ button: 'right' });
        await this.menuChangeTo.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
        await this.doClick(this.menuChangeTo, 'Clicking Change To option in context menu');
        await this.inputChangeTo.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
        await this.inputChangeTo.fill(updatedValue);
        await this.btnChangeToSave.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
        await this.doClick(this.btnChangeToSave, 'Saving pivot cell change');
      }
      return true;
    } catch (error) {
      await this.log.logMessage('INFO', `Failed to edit card ${cardTitle}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  public async revertPivotChanges(): Promise<boolean> {
    if (!(await this.btnPivotRevert.isVisible())) {
      await this.log.logMessage('INFO', 'Pivot revert button not visible');
      return false;
    }
    await this.doClick(this.btnPivotRevert, 'Clicking revert button in Maas pivot card');
    return true;
  }

  /** Opens the first chip cell's popup, searches "Archived" and closes it; returns whether the popup opened. */
  public async filterChipsPopup(): Promise<boolean> {
    await this.chipCellLink.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.chipCellLink, 'Clicking the multiple chips link');
    await this.chipsPopup.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    const isPopupShown = await this.chipsPopup.isVisible();
    await this.chipsPopupSearch.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.log.logMessage('INFO', 'Entering the value to the search control: Archived');
    await this.chipsPopupSearch.fill('Archived');
    await this.chipsPopupClose.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(this.chipsPopupClose, 'Clicking the close button on chips popup');
    return isPopupShown;
  }

  // Atomic actions: cell values
  public async isCellShown(value: string, timeout: number = getTimeout('XLARGE')): Promise<boolean> {
    await this.log.logMessage('INFO', `Validating presence of column for cell value: ${value}`);
    const field = this.gridCell(value);
    await field.scrollIntoViewIfNeeded({ timeout: getTimeout('SHORT') }).catch(() => undefined);
    return field.waitFor({ state: 'visible', timeout }).then(() => true, () => false);
  }

  public async isParagraphPresent(value: string): Promise<boolean> {
    const paragraphs = this.mfeLocator('p').filter({ hasText: value });
    if (await paragraphs.first().waitFor({ state: 'visible', timeout: getTimeout('SHORT') }).then(() => true, () => false)) return true;
    return (await paragraphs.count()) > 0;
  }

  /** First x-axis label of the Maas chart, its "•" separated parts joined with ", ". */
  public async getMaasChartFirstLabel(): Promise<string> {
    const text = await this.doGetText(this.xAxisLabel, 'Getting Drill Through data from Maas chart');
    const normalized = text.split('•').map((part) => part.trim()).filter(Boolean).join(', ');
    await this.log.logMessage('INFO', `Drill Through Data: ${normalized}`);
    return normalized;
  }

  /** Customer, Item and Location (columns 2-4) of a BDE table row (1-based). */
  public async getBdeRowDimensions(rowNo: number): Promise<Record<string, Record<string, string>>> {
    const dimensions: Array<[string, string, number]> = [['CUSTOMER', 'Customer', 2], ['ITEM', 'Item', 3], ['LOCATION', 'Location', 4]];
    const result: Record<string, Record<string, string>> = {};
    for (const [key, label, colIdx] of dimensions) {
      const element = this.mfeLocator(`tbody tr:nth-child(${rowNo + 1})[data-testid="tableRow"] td:nth-child(${colIdx}) p`)
        .or(this.mfeLocator('tbody tr[data-testid="tableRow"]').nth(rowNo - 1).locator(`td:nth-child(${colIdx}) p`))
        .or(this.mfeLocator(`tbody tr:nth-child(${rowNo + 1}) td:nth-child(${colIdx}) p`))
        .first();
      const value = (await this.doGetText(element, `Getting row ${rowNo} dimension ${key}`, getTimeout('LONG'))).trim();
      result[key] = { [label]: value };
      await this.log.logMessage('INFO', `Row ${rowNo} ${key}: ${label} = ${value}`);
    }
    return result;
  }

  public async rightClickCell(cardType: CellCardType, value: string): Promise<boolean> {
    await this.log.logMessage('INFO', `Performing right click on card cell: ${value} for card type: ${cardType}`);
    const cell = cardType === 'PieChart' ? this.pieSlice(value) : this.cell(value);
    await cell.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await cell.scrollIntoViewIfNeeded();
    await this.mouseHover(cell, `Hovering on ${value} cell for ${cardType}`);
    await cell.click({ button: 'right' });
    return true;
  }

  public async clickCellMoreAction(cardType: CellCardType, value: string, option: string): Promise<boolean> {
    await this.rightClickCell(cardType, value);
    await this.menuMoreActions.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.mouseHover(this.menuMoreActions, 'Mouse hovering on More Actions');
    const item = this.moreActionsItem(option);
    await item.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(item, `Clicking More Actions option: ${option}`);
    return true;
  }

  /** Selects the enhanced-table row holding `text` and clicks its drill-through button. */
  public async drillThroughFromTableRow(text: string): Promise<void> {
    const row = this.enhancedTableRows.filter({ hasText: textContaining(text) }).first();
    await this.doClick(row, `Clicked on Row with ${text} in Enhanced Table Card`);
    await this.doClick(row.getByTestId('icon-button-data-type-column-cell'), 'Clicking DrillThrough Button');
  }

  /** True when every row the drill-through target table shows contains `text`. */
  public async areAllTableRowsMatching(text: string): Promise<boolean> {
    await this.enhancedTableSkeleton.waitFor({ state: 'detached', timeout: getTimeout('MEDIUM') });
    await this.enhancedTableRows.first().waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    const total = await this.enhancedTableRows.count();
    const matching = await this.enhancedTableRows.filter({ hasText: textContaining(text) }).count();
    await this.log.logMessage('INFO', `Drill-through target rows: ${total}, matching "${text}": ${matching}`);
    return total === matching;
  }

  // Atomic actions: pivot
  public async waitForPivotToLoad(timeout: number = getTimeout('LONG')): Promise<void> {
    await this.pivotHeader.waitFor({ state: 'visible', timeout });
  }

  /** Scrolls the pivot's row dimension pane until the resource row is shown. */
  public async scrollPivotRowIntoView(resourceName: string, maxScrollAttempts: number = 30, scrollStep: number = 200): Promise<boolean> {
    const container = this.mfeLocator('[data-testid="row-rowDimensons"]').last();
    const row = container.locator(`[data-testid=${JSON.stringify(resourceName)}]`).first();
    const isRowShown = (timeout: number) => row.waitFor({ state: 'visible', timeout }).then(() => true, () => false);

    if (!(await container.waitFor({ state: 'attached', timeout: getTimeout('LONG') }).then(() => true, () => false))) return false;
    let isShown = await row.isVisible();
    if (!isShown) {
      await container.evaluate((el) => { el.scrollTop = 0; }).catch(() => undefined);
      isShown = await isRowShown(getTimeout('TINY'));
      for (let attempt = 0; attempt < maxScrollAttempts && !isShown; attempt++) {
        const { scrolled, atBottom } = await container.evaluate((el, step) => {
          const before = el.scrollTop;
          el.scrollTop = Math.min(el.scrollTop + step, el.scrollHeight);
          return { scrolled: el.scrollTop !== before, atBottom: el.scrollTop + el.clientHeight >= el.scrollHeight };
        }, scrollStep).catch(() => ({ scrolled: false, atBottom: true }));
        isShown = await isRowShown(getTimeout('TINY'));
        if (!scrolled && atBottom) break;
      }
    }
    if (!isShown) return false;
    await row.scrollIntoViewIfNeeded().catch(() => undefined);
    return isRowShown(getTimeout('SHORT'));
  }

  public async selectPivotView(name: string): Promise<void> {
    await this.pivotViewSelect.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.pivotViewSelect, 'Opening Pivot View Dropdown');
    const option = this.pivotViewOption(name);
    await option.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(option, `Selecting Pivot View option: ${name}`);
  }

  // Atomic actions: breadcrumbs
  /** Checks the drill-through breadcrumbs list `sourceView` before `targetView`. */
  public async isBreadcrumbOrder(sourceView: string, targetView: string): Promise<boolean> {
    if (await this.breadcrumbSource.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') }).then(() => true, () => false)) {
      const source = ((await this.breadcrumbSource.textContent()) ?? '').trim();
      const target = ((await this.breadcrumbTarget.textContent().catch(() => '')) ?? '').trim();
      if (source.includes(sourceView) && target.includes(targetView)) {
        await this.log.logMessage('INFO', `Breadcrumb order is correct: ${sourceView} appears before ${targetView}`);
        return true;
      }
    }
    await this.breadcrumbs.first().waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    const texts = (await this.breadcrumbs.allTextContents()).map((text) => text.trim());
    await this.log.logMessage('INFO', `Breadcrumb texts found: ${texts.join(' | ')}`);
    const sourceIndex = texts.findIndex((text) => text.includes(sourceView));
    const targetIndex = texts.findIndex((text) => text.includes(targetView));
    if (sourceIndex === -1 || targetIndex === -1) return false;
    const isOrdered = sourceIndex < targetIndex
      || (sourceIndex === targetIndex && texts[sourceIndex].indexOf(sourceView) < texts[sourceIndex].indexOf(targetView));
    if (isOrdered) {
      await this.log.logMessage('INFO', `Breadcrumb order is correct: ${sourceView} appears before ${targetView}`);
    }
    return isOrdered;
  }

  /** Clicks a breadcrumb; when it is collapsed behind the context override chip, the chip is opened first. */
  public async clickBreadcrumb(viewName: string): Promise<void> {
    const breadcrumb = this.breadcrumb(viewName);
    if (!(await breadcrumb.isVisible()) && await this.contextOverrideChip.isVisible()) {
      await this.doClick(this.contextOverrideChip, 'Clicking context override chip to reveal breadcrumbs');
    }
    await breadcrumb.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClickUsingScript(breadcrumb, `Clicked on Breadcrumb Link: ${viewName}`);
  }

  // Atomic actions: dirty state
  /**
   * The view is dirty when its title ends with "*" and the unsaved-cards count matches, or when the
   * "Stay on this page / Continue without saving" prompt is up.
   */
  public async isViewDirty(viewName: string, dirtyCardsCount: number): Promise<boolean> {
    const prompt = this.getMfeFrameLocator().getByRole('button', { name: /Stay on this page|Continue without saving/i }).first();
    const title = this.getMfeFrameLocator().getByTestId('app-header-block-title');
    const caption = this.mfeLocator('button .MuiTypography-caption, button [class*="MuiTypography-caption"]').first();
    return expect.poll(async () => {
      const header = ((await title.textContent().catch(() => '')) ?? '').trim();
      const count = Number.parseInt(((await caption.textContent().catch(() => '')) ?? '').trim(), 10);
      const countMatches = Number.isNaN(count) ? dirtyCardsCount <= 0 : count === dirtyCardsCount;
      return (header.startsWith(viewName) && header.endsWith('*') && countMatches) || (await prompt.isVisible());
    }, { timeout: getTimeout('MEDIUM'), intervals: [TIMEOUTS.POLL_INTERVAL] }).toBe(true).then(() => true, () => false);
  }

  /** Clicks a dirty-state prompt button, which renders inside the MFE or on the portal page. */
  public async clickDirtyStatePromptButton(buttonName: string): Promise<void> {
    const inFrame = this.getMfeFrameLocator().getByRole('button', { name: buttonName, exact: true })
      .or(this.mfeLocator('button').filter({ hasText: buttonName }))
      .first();
    const onPage = this.page.getByRole('button', { name: buttonName, exact: true })
      .or(this.page.locator('button').filter({ hasText: buttonName }))
      .first();
    let button: Locator | undefined;
    await expect.poll(async () => {
      button = (await inFrame.isVisible()) ? inFrame : (await onPage.isVisible()) ? onPage : undefined;
      return button !== undefined;
    }, { timeout: getTimeout('XLARGE'), intervals: [TIMEOUTS.POLL_INTERVAL] }).toBe(true).catch(() => undefined);
    if (!button) {
      throw new Error(`Dirty-state popup button '${buttonName}' not found within ${getTimeout('XLARGE')}ms`);
    }
    await this.doClick(button, `Clicking ${buttonName} in dirty-state popup`);
  }
}
