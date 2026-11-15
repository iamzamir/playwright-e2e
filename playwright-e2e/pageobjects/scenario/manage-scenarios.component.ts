import { Page, Locator, expect } from '@playwright/test';
import BasePage from '../page';
import { getTimeout } from '../../constants/timeouts';
import { CommonFunctions } from '../../util/common.util';
import { exactText, textContaining, textStartingWith } from '../planning/text-match';

export type VisibilityFilter = 'Public' | 'Private' | 'All';

/** One entry of a row's action menu. A disabled entry that explains why has `tooltip`; it isn't natively disabled. */
export interface ScenarioMenuItem {
  label: string;
  disabled: boolean;
  tooltip: string | null;
}

/**
 * The Manage Scenarios dialog opened from the Scenarios drawer. The table is a lui-ccl Material-React-Table
 * (`lui-ccl-table`, rows `lui-ccl-table-row`): name in `td[data-index="1"]` (a `p` inside a `div`), the Information
 * column (Default chip, `span[aria-label="Default"]`) in `td[data-index="2"]`; sub-rows can also carry
 * `data-index="0"`, so the base scenario is matched by its "Base " name. Row actions are the
 * `lui-ccl-threedot-menu-icon-button` menu (`lui-ccl-threedot-menu-list`, or `action-menu-item` entries in newer
 * builds). The filter bar is the lui-ccl horizontal filter (`lui-ccl-horizontal-filter-reset-button` /
 * `-submit-button`); "Created By" is a MUI Autocomplete (`#tags-standard`). Closing uses
 * `aria-label="Close manage scenarios"`.
 */
export class ManageScenariosComponent extends BasePage {
  private readonly log = new CommonFunctions();

  constructor(page: Page) {
    super(page);
  }

  // Locators
  private get btnClose(): Locator          { return this.mfeLocator('button[aria-label="Close manage scenarios"]'); }
  private get btnReset(): Locator          { return this.getMfeFrameLocator().getByTestId('lui-ccl-horizontal-filter-reset-button'); }
  private get btnApplyFilters(): Locator   { return this.getMfeFrameLocator().getByTestId('lui-ccl-horizontal-filter-submit-button'); }
  private get visibilityDropdown(): Locator { return this.mfeLocator('label:text-is("Visibility") ~ div > div'); }
  private filterOption(item: string): Locator {
    return this.mfeLocator('li').filter({ has: this.page.locator(`span:text-is(${JSON.stringify(item)})`) }).locator('input[type="checkbox"]');
  }
  private autocompleteFilter(fieldName: string): Locator {
    return this.mfeLocator(`label:text-is(${JSON.stringify(fieldName)}) ~ div input#tags-standard, label:text-is(${JSON.stringify(fieldName)}) ~ * div input#tags-standard`).first();
  }
  /** The dialog itself; a pinned Scenarios drawer behind it has its own table rows and Default chips. */
  private get dialog(): Locator            { return this.mfeLocator('[role="dialog"]').filter({ has: this.page.locator('button[aria-label="Close manage scenarios"]') }); }
  private get rows(): Locator              { return this.dialog.locator('tr[data-testid="lui-ccl-table-row"]'); }
  private get nameCells(): Locator         { return this.rows.locator('td[data-index="1"] p'); }
  private get selectedNameCells(): Locator { return this.rows.locator('td[data-index="0"] p'); }
  private row(scenarioName: string): Locator {
    return this.rows.filter({ has: this.page.locator(`p:text-is(${JSON.stringify(scenarioName)})`) });
  }
  /** Any table row (with or without the lui-ccl test ID) holding the name, used for the row action menu. */
  private anyRow(scenarioName: string): Locator {
    return this.dialog.locator('tr').filter({ has: this.page.locator('p').filter({ hasText: exactText(scenarioName) }) });
  }
  private scenarioName(scenarioName: string): Locator {
    return this.dialog.locator(`table p:text-is(${JSON.stringify(scenarioName)})`).last();
  }
  private get baseName(): Locator {
    return this.nameCells.filter({ hasText: textStartingWith('Base ') })
      .or(this.rows.and(this.mfeLocator('[data-index="0"]')).first().locator('td').nth(1).locator('p').first())
      .or(this.rows.first().locator('p').first())
      .first();
  }
  private get defaultName(): Locator {
    const withDefaultSpan = this.dialog.locator('tr').filter({ has: this.page.locator('span[aria-label="Default"]') }).last().locator('td[data-index="1"] p');
    const withDefaultChip = this.rows.filter({ has: this.page.locator('[class*="Chip"]').filter({ hasText: exactText('Default') }) }).locator('td[data-index="1"] p');
    return withDefaultSpan.or(withDefaultChip).first();
  }
  private defaultBadge(scenarioName: string): Locator {
    const name = JSON.stringify(scenarioName);
    return this.row(scenarioName).locator('td[data-index="2"]').locator(':is(span, div)[aria-label="Default"], :is(span, div):text-is("Default")')
      .or(this.dialog.locator(`td:has(p:text-is(${name})) + td :is(span, div)[aria-label="Default"], td:has(p:text-is(${name})) + td :is(span, div):text-is("Default")`).last())
      .first();
  }
  private actionMenuButton(scenarioName: string): Locator {
    return this.anyRow(scenarioName).getByTestId('lui-ccl-threedot-menu-icon-button').filter({ visible: true }).last();
  }
  private actionMenuItem(action: string): Locator {
    const label = JSON.stringify(action);
    return this.mfeLocator(`ul[data-testid="lui-ccl-threedot-menu-list"] span:text-is(${label}), div[data-testid*="action-menu-item"] span:text-is(${label})`).first();
  }
  private get openMenuItems(): Locator {
    return this.mfeLocator('[role="button"]:has([data-testid^="action-menu-item"])').filter({ visible: true });
  }
  private columnHeader(columnName: string): Locator { return this.dialog.locator('th').filter({ hasText: textContaining(columnName) }); }
  private columnCells(dataIndex: string): Locator   { return this.rows.locator(`td[data-index=${JSON.stringify(dataIndex)}]`); }
  private cell(scenarioName: string, dataIndex: string): Locator {
    return this.row(scenarioName).locator(`td[data-index=${JSON.stringify(dataIndex)}]`);
  }

  // Helpers
  private async readTexts(locator: Locator, description: string): Promise<string[]> {
    const texts: string[] = [];
    for (const element of await locator.all()) {
      texts.push((await this.doGetText(element, description)).trim());
    }
    return texts;
  }

  // State
  public async isOpen(): Promise<boolean> {
    return this.btnClose.isVisible().catch(() => false);
  }

  public async waitForOpen(timeout: number = getTimeout('MEDIUM')): Promise<void> {
    await this.btnClose.waitFor({ state: 'visible', timeout });
  }

  /** Waits for the first scenario name in the table. */
  public async waitForRows(): Promise<void> {
    await this.nameCells.first().waitFor({ state: 'visible', timeout: getTimeout('LONG') });
  }

  public async expandScenario(scenarioName: string): Promise<void> {
    await this.waitForRows();
    const r = this.row(scenarioName);
    const expandBtn = r.locator('button[data-testid="scenario-tree-expand"]').first();
    const isVisible = await expandBtn.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') }).then(() => true, () => false);
    if (isVisible) {
      const ariaLabel = await expandBtn.getAttribute('aria-label').catch(() => '');
      if (ariaLabel === 'Expand scenario') {
        await this.log.logMessage('INFO', `Expanding scenario tree row for: ${scenarioName}`);
        await expandBtn.click({ timeout: getTimeout('SHORT') });
        await expect(expandBtn).toHaveAttribute('aria-label', /Collapse scenario/i, { timeout: getTimeout('SHORT') }).catch(async () => {
          await this.log.logMessage('WARN', `Expand button for ${scenarioName} did not transition to Collapse scenario`);
        });
      } else {
        await this.log.logMessage('INFO', `Scenario tree row for ${scenarioName} is already expanded (aria-label: ${ariaLabel})`);
      }
    } else {
      await this.log.logMessage('WARN', `Expand button not found for: ${scenarioName}`);
    }
  }

  public async isScenarioListed(scenarioName: string, timeout: number = getTimeout('LONG')): Promise<boolean> {
    const isListed = await this.scenarioName(scenarioName).waitFor({ state: 'visible', timeout }).then(() => true, () => false);
    await this.log.logMessage('INFO', isListed ? `Scenario ${scenarioName} is Visible!` : `Scenario ${scenarioName} does not exist`);
    return isListed;
  }

  public async getScenarioNames(selected = false): Promise<string[]> {
    const names = await this.readTexts(selected ? this.selectedNameCells : this.nameCells, 'Getting scenario name');
    await this.log.logMessage('INFO', `Scenario Names:: ${names.join(', ')}`);
    return names;
  }

  public async getBaseScenario(): Promise<string> {
    let baseScenario = (await this.doGetText(this.baseName, 'Getting Base Scenario')).trim();
    if (!/^base/i.test(baseScenario)) {
      baseScenario = (await this.getBaseScenarioByName().catch(() => '')) || baseScenario;
    }
    await this.log.logMessage('INFO', `Base Scenario:: ${baseScenario}`);
    return baseScenario;
  }

  /** The first table name that starts with "Base ", whatever the row's selected or default state. */
  public async getBaseScenarioByName(): Promise<string> {
    await this.waitForRows();
    const baseScenario = (await this.getScenarioNames()).find((name) => /^Base\s/i.test(name)) ?? '';
    await this.log.logMessage('INFO', `Base scenario resolved from Manage Scenarios table:: ${baseScenario}`);
    return baseScenario;
  }

  public async getDefaultScenario(): Promise<string> {
    return (await this.doGetText(this.defaultName, 'Getting default scenario')).trim();
  }

  public async hasDefaultBadge(scenarioName: string): Promise<boolean> {
    const hasBadge = await this.defaultBadge(scenarioName).waitFor({ state: 'visible', timeout: getTimeout('SHORT') }).then(() => true, () => false);
    await this.log.logMessage('INFO', `Is default icon exist for scenario ${scenarioName} :: ${hasBadge}`);
    return hasBadge;
  }

  public async getColumnIndex(columnName: string, timeout: number = getTimeout('EXTREME')): Promise<string> {
    await this.log.logMessage('INFO', `Looking for ${columnName} column`);
    const header = this.columnHeader(columnName);
    await header.waitFor({ state: 'visible', timeout });
    const dataIndex = await this.doGetAttribute(header, 'data-index', `Getting data index for ${columnName}`);
    await this.log.logMessage('INFO', `data index for ${columnName} column is ${dataIndex}`);
    return dataIndex || '';
  }

  public async getColumnValues(columnName: string): Promise<string[]> {
    const dataIndex = await this.getColumnIndex(columnName, getTimeout('XLARGE'));
    if (!dataIndex) {
      return [];
    }
    const cells = this.columnCells(dataIndex);
    await cells.first().waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    const values = (await cells.allTextContents()).map((value) => value.trim()).filter((value) => value.length > 0);
    await this.log.logMessage('INFO', `Fetched values for ${columnName}: ${values.join(', ')}`);
    return values;
  }

  public async getCellText(scenarioName: string, dataIndex: string, timeout: number = getTimeout('LONG')): Promise<string> {
    const cell = this.cell(scenarioName, dataIndex).last();
    await cell.waitFor({ state: 'visible', timeout });
    return (await cell.innerText().catch(() => '')).trim();
  }

  // Actions
  /** Clicks Close until the dialog is gone (a click right after a nested form closes can be swallowed); throws if it stays open. */
  public async close(): Promise<void> {
    await this.btnClose.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.log.logMessage('INFO', 'Clicking on Close Manage Scenarios button');
    await expect(async () => {
      if (await this.btnClose.isVisible()) {
        await this.btnClose.click({ timeout: getTimeout('SHORT') });
      }
      await expect(this.btnClose).toBeHidden({ timeout: getTimeout('TINY') });
    }).toPass({ timeout: getTimeout('XLARGE') }).catch(async (error) => {
      await this.log.logMessage('FAIL', 'Manage Scenarios dialog is still open after Close');
      throw error;
    });
  }

  public async resetFilters(): Promise<void> {
    await this.btnReset.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.btnReset, 'Clicking Reset Button');
  }

  public async applyFilters(): Promise<void> {
    await this.btnApplyFilters.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.btnApplyFilters, 'Clicking apply filters button');
  }

  /** Resets the filters and picks `filterValue` in the Visibility dropdown (Apply is separate). */
  public async selectVisibilityFilter(filterValue: VisibilityFilter): Promise<void> {
    await this.resetFilters();
    await this.visibilityDropdown.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    const option = this.filterOption(filterValue);
    await this.log.logMessage('INFO', `Selecting ${filterValue} visibility`);
    // Reset finishes re-rendering after a quick tick and can clear it (or close the menu), so retry until the closed
    // dropdown shows the value. "All" has no distinct label, so only its tick is checked.
    await expect(async () => {
      if (!(await option.isVisible())) {
        await this.visibilityDropdown.click({ timeout: getTimeout('SHORT') });
        await option.waitFor({ state: 'visible', timeout: getTimeout('SHORT') });
      }
      // isChecked waits for a detached option to come back, so bound it and let toPass reopen the menu.
      if (!(await option.isChecked({ timeout: getTimeout('TINY') }))) {
        await option.click({ timeout: getTimeout('SHORT') });
      }
      await expect(option).toBeChecked({ timeout: getTimeout('TINY') });
      await this.page.keyboard.press('Tab');
      if (filterValue !== 'All') {
        await expect(this.visibilityDropdown).toContainText(filterValue, { timeout: getTimeout('TINY') });
      }
    }).toPass({ timeout: getTimeout('XLARGE') });
  }

  /** Types `fieldValue` into an Autocomplete filter (e.g. "Created By") and picks the first suggestion. */
  public async selectAutocompleteFilter(fieldName: string, fieldValue: string): Promise<void> {
    const field = this.autocompleteFilter(fieldName);
    await field.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(field, `Clicking ${fieldName} filter`);
    await field.clear();
    await this.doEnterText(field, fieldValue, `Entering ${fieldValue} in ${fieldName} filter`);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    await this.page.keyboard.press('Tab');
  }

  public async openActionMenu(scenarioName: string): Promise<void> {
    const button = this.actionMenuButton(scenarioName);
    await button.waitFor({ state: 'visible', timeout: getTimeout('LONG') }).catch(() => {
      throw new Error(`No visible action menu found for scenario ${scenarioName}`);
    });
    await this.page.keyboard.press('Escape');
    await this.log.logMessage('INFO', `Clicking Created Scenario Menu for ${scenarioName}`);
    // The table re-renders after Reset or an action, which can detach the button between the wait and the click.
    await expect(async () => {
      await button.scrollIntoViewIfNeeded({ timeout: getTimeout('TINY') });
      await button.click({ force: true, timeout: getTimeout('TINY') });
    }).toPass({ timeout: getTimeout('LONG') });
  }

  public async clickActionMenuItem(action: string): Promise<void> {
    const item = this.actionMenuItem(action);
    await item.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(item, `Clicking ${action} Action`);
  }

  /** Opens a row's action menu, reads its entries and closes it. */
  public async getRowMenuItems(scenarioName: string): Promise<ScenarioMenuItem[]> {
    await this.openActionMenu(scenarioName);
    await this.openMenuItems.first().waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    const items: ScenarioMenuItem[] = [];
    for (const item of await this.openMenuItems.all()) {
      const tooltip = await item.locator('span[aria-label]').first().getAttribute('aria-label', { timeout: getTimeout('TINY') }).catch(() => null);
      const isNativelyDisabled = await item.evaluate((element) => element.getAttribute('aria-disabled') === 'true' || element.classList.contains('Mui-disabled'));
      items.push({ label: (await item.innerText()).trim(), disabled: isNativelyDisabled || tooltip !== null, tooltip });
    }
    await this.page.keyboard.press('Escape');
    await expect(this.openMenuItems).toHaveCount(0, { timeout: getTimeout('SHORT') });
    await this.log.logMessage('INFO', `Menu for ${scenarioName}: ${JSON.stringify(items)}`);
    return items;
  }

  /** The sync status icon's tooltip in the name cell, or null when the row shows no icon. */
  public async getSyncStatusTooltip(scenarioName: string): Promise<string | null> {
    return this.cell(scenarioName, '1').locator('div[aria-label]').first().getAttribute('aria-label', { timeout: getTimeout('SHORT') }).catch(() => null);
  }

  public async runRowAction(scenarioName: string, action: string): Promise<void> {
    await this.log.logMessage('INFO', `Performing ${action} Action on ${scenarioName}`);
    await this.openActionMenu(scenarioName);
    await this.clickActionMenuItem(action);
  }
}
