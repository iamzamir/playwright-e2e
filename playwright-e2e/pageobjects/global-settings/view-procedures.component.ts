import { Page, Locator } from '@playwright/test';
import { getTimeout } from '../../constants/timeouts';
import { pollUntilTrue } from '../../util/wait-helpers';
import { exactText } from '../planning/text-match';
import { GlobalSettingsComponent } from './settings-component';

const SAVED_MESSAGE = 'Your changes have been saved successfully';

/**
 * "Configure View specific Procedures & Filters" page of a process in PO Global Settings: the view list
 * (`listOfViews`), the procedure table (`mapProcedureList`, one row per procedure with a checkbox, the name in a `p`
 * and a `Move` drag handle), the primary and secondary action selects (`primaryActionInput-arrow-icon`,
 * `secondaryActionInput-arrow-icon`, options are `li[value="<procedure>"]`), the Apply all switch and `save-btn`.
 * Test IDs are the ones the earlier XPath locators used.
 */
export class ViewProceduresComponent extends GlobalSettingsComponent {
  constructor(page: Page) {
    super(page);
  }

  // --- Locators ---
  private view(viewName: string): Locator                     { return this.mfeLocator(`[data-testid="listOfViews"] div:text-is(${JSON.stringify(viewName)})`); }
  private get procedureRows(): Locator                         { return this.mfeLocator('[data-testid="mapProcedureList"] tr'); }
  private procedureRow(procedureName: string): Locator         { return this.procedureRows.filter({ has: this.page.locator('p').filter({ hasText: exactText(procedureName) }) }); }
  private procedureCheckbox(procedureName: string): Locator    { return this.procedureRow(procedureName).locator('input[type="checkbox"]'); }
  private procedureCheckboxRoot(procedureName: string): Locator { return this.procedureRow(procedureName).locator('span[class*="MuiCheckbox-root"]'); }
  private procedureSelectCell(procedureName: string): Locator  { return this.procedureRow(procedureName).locator('td[data-index="1"]'); }
  private procedureDragHandle(procedureName: string): Locator  { return this.procedureRow(procedureName).locator('button[aria-label="Move"]'); }
  private get primaryActionSelect(): Locator                   { return this.getMfeFrameLocator().getByTestId('primaryActionInput-arrow-icon'); }
  private get secondaryActionSelect(): Locator                 { return this.getMfeFrameLocator().getByTestId('secondaryActionInput-arrow-icon'); }
  private actionOption(procedureName: string): Locator         { return this.mfeLocator(`li[value=${JSON.stringify(procedureName)}]`); }
  private get applyAllSwitch(): Locator                        { return this.mfeLocator('[role="switch"]'); }
  private get btnSave(): Locator                               { return this.getMfeFrameLocator().getByTestId('save-btn'); }
  private get savedToast(): Locator {
    return this.mfeLocator('[class*="MuiAlert-message"], [role="alert"]').filter({ hasText: new RegExp(SAVED_MESSAGE, 'i') }).first();
  }
  private get selectAllCheckbox(): Locator {
    return this.mfeLocator('input[type="checkbox"][aria-label="Select All"]')
      .or(this.mfeLocator('[data-testid="select-all-checkbox"] input'))
      .or(this.mfeLocator('label:has(span:has-text("Select All")) input[type="checkbox"]'))
      .first();
  }
  // The MUI checkbox input is visually hidden, so click its label when there is one.
  private get selectAllClickable(): Locator {
    return this.mfeLocator('label:has(span:has-text("Select All"))')
      .or(this.mfeLocator('[data-testid="select-all-checkbox"]'))
      .or(this.mfeLocator('span:has-text("Select All")'))
      .or(this.selectAllCheckbox)
      .first();
  }

  // --- Helpers ---
  private async isProcedureChecked(procedureName: string): Promise<boolean> {
    return this.procedureCheckbox(procedureName).isChecked().catch(() => false);
  }

  private async selectAction(select: Locator, procedureName: string, label: string): Promise<void> {
    await select.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(select, `Clicking on ${label} SCA dropdown`);
    const option = this.actionOption(procedureName);
    await option.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(option, `Selecting ${procedureName} from ${label} dropdown`);
  }

  // --- Atomic actions ---
  public async selectView(viewName: string): Promise<void> {
    const view = this.view(viewName);
    await view.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(view, `Clicking on ${viewName} view`);
    await this.procedureRows.first().waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') }).catch(() => undefined);
  }

  public async selectProcedures(procedures: string[]): Promise<void> {
    for (const procedure of procedures) {
      const input = this.procedureCheckbox(procedure);
      await input.waitFor({ state: 'attached', timeout: getTimeout('MEDIUM') });
      const isSelected = await input.isChecked();
      await this.log.logMessage('INFO', `Is ${procedure} procedure checked :: ${isSelected}`);
      if (!isSelected) {
        await input.setChecked(true, { force: true });
        await this.log.logMessage('INFO', `After select, is ${procedure} checked :: ${await input.isChecked()}`);
      }
    }
  }

  public async deselectProcedures(procedures: string[]): Promise<void> {
    for (const procedure of procedures) {
      const input = this.procedureCheckbox(procedure);
      await input.waitFor({ state: 'attached', timeout: getTimeout('MEDIUM') }).catch(() => null);
      const isSelected = await this.isProcedureChecked(procedure);
      await this.log.logMessage('INFO', `Is ${procedure} procedure checked :: ${isSelected}`);
      if (!isSelected) {
        continue;
      }
      const cell = this.procedureSelectCell(procedure);
      const checkboxRoot = this.procedureCheckboxRoot(procedure);
      const target = (await cell.isVisible().catch(() => false)) ? cell : (await checkboxRoot.isVisible().catch(() => false)) ? checkboxRoot : input;
      await this.doClick(target, `Clicking ${procedure} procedure checkbox to deselect`);
      await pollUntilTrue(async () => !(await this.isProcedureChecked(procedure)), 'SHORT').catch(() => undefined);
      await this.log.logMessage('INFO', `After deselect, is ${procedure} checked :: ${await this.isProcedureChecked(procedure)}`);
    }
  }

  public async areProceduresChecked(procedures: string[]): Promise<boolean> {
    const results = await Promise.all(procedures.map((procedure) => this.procedureCheckbox(procedure).isChecked()));
    return results.every(Boolean);
  }

  public async selectPrimary(procedureName: string): Promise<void> {
    await this.selectAction(this.primaryActionSelect, procedureName, 'primary');
  }

  public async selectSecondary(procedureName: string): Promise<void> {
    await this.selectAction(this.secondaryActionSelect, procedureName, 'secondary');
  }

  public async getPrimaryText(): Promise<string> {
    await this.primaryActionSelect.waitFor({ state: 'visible', timeout: getTimeout('SHORT') });
    return (await this.primaryActionSelect.textContent()) || '';
  }

  public async getSecondaryText(): Promise<string> {
    await this.secondaryActionSelect.waitFor({ state: 'visible', timeout: getTimeout('SHORT') });
    return (await this.secondaryActionSelect.textContent()) || '';
  }

  /** Drags `sourceProcedureName` onto `targetProcedureName` to change the order in the procedures dropdown. */
  public async moveProcedure(sourceProcedureName: string, targetProcedureName: string): Promise<void> {
    await this.log.logMessage('INFO', `Arranging procedures in order: ${sourceProcedureName} before ${targetProcedureName}`);
    const source = this.procedureDragHandle(sourceProcedureName);
    const target = this.procedureDragHandle(targetProcedureName);
    await source.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await target.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await source.dragTo(target);
  }

  /** Sets the Select All checkbox to `enable` and reports whether it ended in that state. */
  public async setSelectAll(enable: boolean): Promise<boolean> {
    const checkbox = this.selectAllCheckbox;
    if ((await checkbox.isChecked()) !== enable) {
      await this.log.logMessage('INFO', `Clicking checkbox to ${enable ? 'enable' : 'disable'} Select All`);
      await this.doClick(checkbox, enable ? 'Enabling Select All' : 'Disabling Select All');
    }
    return (await checkbox.isChecked()) === enable;
  }

  /** Unchecks Select All by clicking its label, once more if the first click did not take. Best effort. */
  public async clearSelectAll(): Promise<void> {
    const checkbox = this.selectAllCheckbox;
    try {
      await checkbox.waitFor({ state: 'attached', timeout: getTimeout('MEDIUM') });
      const isAllChecked = await checkbox.isChecked().catch(() => false);
      await this.log.logMessage('INFO', `Select All checked before disable: ${isAllChecked}`);
      for (let attempt = 1; attempt <= 2 && (await checkbox.isChecked().catch(() => false)); attempt++) {
        await this.doClick(this.selectAllClickable, `Clicking Select All to deselect all procedures (attempt ${attempt})`);
        await pollUntilTrue(async () => !(await checkbox.isChecked().catch(() => false)), 'TINY').catch(() => undefined);
      }
    } catch (error) {
      await this.log.logMessage('WARNING', `Could not toggle Select All: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Sets the Apply all switch and returns whether it was off before. */
  public async setApplyAll(enable: boolean): Promise<boolean> {
    const toggle = this.applyAllSwitch;
    const isChecked = await toggle.isChecked();
    if (isChecked !== enable) {
      await this.doClick(toggle, enable ? 'Enabling Apply All' : 'Disabling Apply All');
    }
    return !isChecked;
  }

  /** Clicks Save and waits for the "saved successfully" toast. A toast left from an earlier save is dismissed first. */
  public async save(timeout: number = getTimeout('LONG')): Promise<boolean> {
    await this.dismissAnyAlertToast();
    await this.savedToast.waitFor({ state: 'hidden', timeout: getTimeout('SHORT') }).catch(() => null);
    await this.btnSave.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.btnSave, 'Clicking on save button');
    return this.verifyAlertMsg(SAVED_MESSAGE, timeout);
  }
}
