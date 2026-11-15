import { Page, Locator, expect } from '@playwright/test';
import { getTimeout } from '../../constants/timeouts';
import { exactText } from '../planning/text-match';
import { GlobalSettingsComponent } from './settings-component';

/**
 * Process rows of the PO Global Settings / Process Orchestration tables (`lui-ccl-table`, rows `lui-ccl-table-row`
 * with the process as a link or a `p`, and a `lui-ccl-threedot-menu-icon-button`), the `single-select-process`
 * dropdown, and the "Configure Process" procedure mapping: procedure rows with `cbp-procedure-config-delete-btn`, the
 * add-procedure form (two MUI Autocompletes, procedure then attribute, opened with their `Open` buttons and saved
 * with `po-to-po-context-modal-primary-btn`) and the delete confirmation (`po-to-po-delete-modal-primary-btn`).
 * Test IDs are the ones the earlier XPath locators used.
 */
export class ProcessProceduresComponent extends GlobalSettingsComponent {
  constructor(page: Page) {
    super(page);
  }

  // --- Locators: process tables ---
  private get processTable(): Locator                          { return this.getMfeFrameLocator().getByTestId('lui-ccl-table'); }
  private get processRows(): Locator                           { return this.mfeLocator('tr[data-testid="lui-ccl-table-row"]'); }
  private get processLinks(): Locator                          { return this.processRows.locator('a'); }
  private processLink(processName: string): Locator            { return this.processLinks.filter({ hasText: processName }).first(); }
  private processLinkRowMenu(processName: string): Locator {
    return this.mfeLocator('tr').filter({ has: this.page.locator('td a').filter({ hasText: exactText(processName) }) })
      .getByTestId('lui-ccl-threedot-menu-icon-button').first();
  }
  private entityRowMenu(entityName: string): Locator {
    return this.tableRowByName(entityName, '[data-testid="lui-ccl-table"] tr').getByTestId('lui-ccl-threedot-menu-icon-button').first();
  }
  private entityRow(entityName: string): Locator {
    return this.processRows.filter({ has: this.page.locator('td > div > p').filter({ hasText: entityName }) }).first();
  }
  private entityRowMenuItem(actionName: string): Locator {
    return this.mfeLocator('ul[data-testid="lui-ccl-threedot-menu-list"] div[class*="MuiListItemButton-root"]').filter({ hasText: actionName }).first();
  }
  private menuEntry(actionName: string): Locator              { return this.mfeLocator(`span:text-is(${JSON.stringify(actionName)})`).filter({ visible: true }).first(); }
  private get processDropdownInput(): Locator                  { return this.mfeLocator('#single-select-process'); }
  private get processDropdownClear(): Locator                  { return this.mfeLocator('button[aria-label="Clear"][title="Clear"]'); }
  private processOption(processName: string): Locator          { return this.mfeLocator(`li:text-is(${JSON.stringify(processName)})`).first(); }

  // --- Locators: Configure Process ---
  private mappedProcedure(procedureName: string): Locator      { return this.mfeLocator(`td span:text-is(${JSON.stringify(procedureName)})`); }
  private procedureDeleteButton(procedureName: string): Locator {
    return this.mfeLocator('tr').filter({ has: this.page.locator(`td:first-child span:text-is(${JSON.stringify(procedureName)})`) })
      .getByTestId('cbp-procedure-config-delete-btn');
  }
  private get btnConfirmDelete(): Locator                      { return this.getMfeFrameLocator().getByTestId('po-to-po-delete-modal-primary-btn'); }
  private get autocompleteOpenButtons(): Locator               { return this.mfeLocator('button[aria-label="Open"]'); }
  private get autocompleteInputs(): Locator                    { return this.mfeLocator('input[class*="MuiInputBase-input"]'); }
  private get autocompleteOptions(): Locator                   { return this.mfeLocator('[role="listbox"] [role="option"]'); }
  private get btnSaveMapping(): Locator                        { return this.getMfeFrameLocator().getByTestId('po-to-po-context-modal-primary-btn'); }

  // --- Helpers ---
  /** Opens the `index`-th autocomplete of the add-procedure form, types `value` and picks the first match. */
  private async pickAutocompleteValue(index: number, value: string, label: string): Promise<void> {
    const openButton = this.autocompleteOpenButtons.nth(index);
    await openButton.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(openButton, `Clicking on ${label} dropdown`);
    const input = this.autocompleteInputs.nth(index);
    await input.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doEnterText(input, value, `Entering ${label} name: ${value}`);
    await this.autocompleteOptions.first().waitFor({ state: 'visible', timeout: getTimeout('SHORT') }).catch(() => undefined);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
  }

  // --- Process rows ---
  /** Opens a process from the table link, or picks it in the process dropdown when the table has no link for it. */
  public async selectProcess(processName: string): Promise<void> {
    await this.processTable.first().waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.log.logMessage('INFO', `Process links found: ${JSON.stringify(await this.processLinks.allTextContents())}`);

    const link = this.processLink(processName);
    if (await link.waitFor({ state: 'visible', timeout: getTimeout('SHORT') }).then(() => true, () => false)) {
      await this.doClick(link, `Clicking on process button: ${processName}`);
      return;
    }

    const input = this.processDropdownInput;
    if (await input.waitFor({ state: 'visible', timeout: getTimeout('SHORT') }).then(() => true, () => false)) {
      await input.click();
      if (await this.processDropdownClear.waitFor({ state: 'visible', timeout: getTimeout('TINY') }).then(() => true, () => false)) {
        await this.processDropdownClear.click();
      }
      await input.fill(processName);
      const option = this.processOption(processName);
      if (await option.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') }).then(() => true, () => false)) {
        await option.click();
        return;
      }
    }

    const message = `Process "${processName}" not found as link or dropdown input.`;
    await this.log.logMessage('ERROR', message);
    throw new Error(message);
  }

  public async openProcessLinkMenu(processName: string): Promise<void> {
    const menuButton = this.processLinkRowMenu(processName);
    await menuButton.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(menuButton, `Clicking on 3 dot icon of process ${processName}`);
  }

  public async clickMenuEntry(actionName: string): Promise<void> {
    const entry = this.menuEntry(actionName);
    await entry.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(entry, `Selecting ${actionName} from 3 dot menu`);
  }

  /** Opens the three-dot menu of the row named `entityName` and clicks `actionName`, reopening the menu if it closed. */
  public async selectRowAction(entityName: string, actionName: string): Promise<void> {
    const menuButton = this.entityRowMenu(entityName);
    await menuButton.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.selectRowMenuOption(() => this.doClick(menuButton, `Clicking on three dot menu for ${entityName}`), actionName);
  }

  /** Opens the row menu of `entityName` and reports whether `actionName` is enabled there. Closes the menu again. */
  public async isRowActionEnabled(entityName: string, actionName: string): Promise<boolean> {
    const row = this.entityRow(entityName);
    await row.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    const menuButton = row.locator('td > button[data-testid="lui-ccl-threedot-menu-icon-button"]');
    await menuButton.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    try {
      await this.doClick(menuButton, `Clicking on three dot menu for ${entityName}`);
      const item = this.entityRowMenuItem(actionName);
      await item.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
      const isAriaDisabled = ((await item.getAttribute('aria-disabled')) || '').toLowerCase() === 'true';
      const hasDisabledClass = /(^|\s)Mui-disabled(\s|$)/.test((await item.getAttribute('class')) || '');
      const isEnabled = !(isAriaDisabled || hasDisabledClass);
      await this.log.logMessage('INFO', `Is ${actionName} action enabled :: ${isEnabled}`);
      return isEnabled;
    } finally {
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }
  }

  // --- Configure Process ---
  public async isProcedureMapped(procedureName: string): Promise<boolean> {
    try {
      const procedure = this.mappedProcedure(procedureName);
      await procedure.first().waitFor({ state: 'visible', timeout: getTimeout('SHORT') });
      return await procedure.first().isVisible();
    } catch (error) {
      await this.log.logMessage('INFO', `Procedure ${procedureName} is not mapped: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
      return false;
    }
  }

  /** Fills the add-procedure form with `procedureName` and its context attribute, then saves it. */
  public async mapProcedure(procedureName: string, attributeValue: string): Promise<void> {
    await this.log.logMessage('INFO', `Selecting procedure: ${procedureName}`);
    await this.pickAutocompleteValue(0, procedureName, 'procedure');
    await this.log.logMessage('INFO', `Selecting attribute: ${attributeValue}`);
    await this.pickAutocompleteValue(1, attributeValue, 'attribute');

    await this.btnSaveMapping.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await expect(this.btnSaveMapping).toBeEnabled({ timeout: getTimeout('SHORT') }).catch(() => undefined);
    await this.doClick(this.btnSaveMapping, 'Clicking on save button');
    // The add-procedure form closes once the save is accepted.
    await this.btnSaveMapping.waitFor({ state: 'hidden', timeout: getTimeout('XLARGE') }).catch(() => undefined);
    await this.log.logMessage('INFO', 'Procedure and attribute selected successfully.');
  }

  public async deleteProcedure(procedureName: string): Promise<void> {
    const deleteButton = this.procedureDeleteButton(procedureName);
    await deleteButton.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(deleteButton, `Clicking on delete Icon of ${procedureName}`);
    await this.btnConfirmDelete.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.btnConfirmDelete, `Clicking on delete button in delete popup for ${procedureName}`);
    await this.btnConfirmDelete.waitFor({ state: 'hidden', timeout: getTimeout('XLARGE') }).catch(() => undefined);
  }
}
