import { Page, Locator, expect } from '@playwright/test';
import BasePage from '../page';
import { getTimeout } from '../../constants/timeouts';
import { CommonFunctions } from '../../util/common.util';
import { textContaining, textStartingWith } from '../planning/text-match';

/**
 * Scenario selection inside the Scenarios drawer (planning-mfe `SelectDefaultScenarioModalNew.tsx`): the selected
 * list (`lui-ccl-modal-selected`) above all scenarios (`lui-ccl-modal-all`), both lui-ccl tables
 * (`lui-ccl-table`, rows `lui-ccl-table-row`, name in `td[data-index="1"]`, or `td[data-index="0"]` in the selected
 * list). A row's selection icon is `scenario-selection-checkbox` (selected), `scenario-selection-checkbox-default`
 * (selected and default) or `scenario-selection-checkbox-select` (not selected); `scenario-selection-default` makes
 * it the default, and the default row also shows a `scenario-chip-btn` chip with a "Default" label. The "+" icon is
 * `create-scenario-with-api-btn` (`SideNavTabPanelNew.tsx`); Apply is `save-btn`, and the "Scenario Change"
 * confirmation (`ConfirmationModal.tsx`) uses `continue-button` / `cancel-button`.
 */
export class ScenarioSelectionComponent extends BasePage {
  private readonly log = new CommonFunctions();

  constructor(page: Page) {
    super(page);
  }

  // Locators
  private get rows(): Locator               { return this.mfeLocator('tr[data-testid="lui-ccl-table-row"]'); }
  private get nameCells(): Locator          { return this.rows.locator('td[data-index="1"] p'); }
  private get selectedNameCells(): Locator  { return this.rows.locator('td[data-index="0"] p'); }
  private get allListNames(): Locator       { return this.mfeLocator('[data-testid="lui-ccl-modal-all"] tr p'); }
  private get selectedListNames(): Locator  { return this.mfeLocator('[data-testid="lui-ccl-modal-selected"] tr p'); }
  private get baseNameInAllList(): Locator {
    return this.mfeLocator('[data-testid="lui-ccl-modal-all"] tr[data-testid="lui-ccl-table-row"] p').filter({ hasText: textStartingWith('Base') })
      .or(this.rows.first().locator('p').first())
      .first();
  }
  private row(scenarioName: string): Locator {
    return this.mfeLocator('[data-testid="lui-ccl-table"] tr').filter({ has: this.page.locator(`p:text-is(${JSON.stringify(scenarioName)})`) });
  }
  private nameInTable(scenarioName: string): Locator { return this.mfeLocator(`td p:text-is(${JSON.stringify(scenarioName)})`); }
  private nameInSelectedList(scenarioName: string): Locator {
    return this.mfeLocator('[data-testid="lui-ccl-modal-selected"] p').filter({ hasText: textContaining(scenarioName) });
  }
  private get defaultRowNames(): Locator {
    return this.mfeLocator('tr').filter({ has: this.page.locator('[data-testid="scenario-chip-btn"] span:text-is("Default")') }).first().locator('td p');
  }
  private checkedIcon(row: Locator): Locator        { return row.getByTestId('scenario-selection-checkbox').first(); }
  private defaultCheckedIcon(row: Locator): Locator { return row.getByTestId('scenario-selection-checkbox-default').first(); }
  private uncheckedIcon(row: Locator): Locator      { return row.getByTestId('scenario-selection-checkbox-select').first(); }
  private get btnCreateScenario(): Locator          { return this.getMfeFrameLocator().getByTestId('create-scenario-with-api-btn'); }
  private get btnApply(): Locator                   { return this.getMfeFrameLocator().getByTestId('save-btn'); }
  private get btnContinue(): Locator                { return this.getMfeFrameLocator().getByTestId('continue-button'); }
  private get btnCancel(): Locator                  { return this.getMfeFrameLocator().getByTestId('cancel-button'); }
  private get btnCloseDrawer(): Locator             { return this.getMfeFrameLocator().getByTestId('drawer-close-btn'); }

  // Helpers
  private async readTexts(locator: Locator, description: string): Promise<string[]> {
    const texts: string[] = [];
    for (const element of await locator.all()) {
      texts.push(await this.doGetText(element, description));
    }
    return texts;
  }

  /** The first visible table row for the scenario, or null (logged) when none shows. */
  private async visibleRow(scenarioName: string, timeout: number = getTimeout('SHORT')): Promise<Locator | null> {
    const row = this.row(scenarioName).filter({ visible: true }).first();
    if (await row.waitFor({ state: 'visible', timeout }).then(() => true, () => false)) {
      return row;
    }
    const count = await this.row(scenarioName).count();
    await this.log.logMessage('ERROR', count === 0 ? `Scenario "${scenarioName}" not found in table` : `Scenario "${scenarioName}" matched ${count} row(s), but none are visible in table`);
    return null;
  }

  private async isRowSelected(row: Locator): Promise<boolean> {
    return (await this.checkedIcon(row).isVisible().catch(() => false)) || (await this.defaultCheckedIcon(row).isVisible().catch(() => false));
  }

  // State
  public async getAllScenarioNames(): Promise<string[]> {
    const names = await this.readTexts(this.allListNames, 'Getting scenario name');
    await this.log.logMessage('INFO', `Scenario Names:: ${names}`);
    return names;
  }

  public async getSelectedScenarioNames(timeout: number = getTimeout('MEDIUM')): Promise<string[]> {
    await this.selectedListNames.first().waitFor({ state: 'visible', timeout }).catch(() => {});
    const names = await this.readTexts(this.selectedListNames, 'Getting selected scenario name');
    await this.log.logMessage('INFO', `Selected Scenario Names:: ${names}`);
    return names;
  }

  /** True when every name in `scenarios` is listed (in the selected list when `selected`). */
  public async areListed(scenarios: string[], selected = false): Promise<boolean> {
    const listed = (await this.readTexts(selected ? this.selectedNameCells : this.nameCells, 'Getting scenario name from mapped list'))
      .map((name) => name.trim()).filter(Boolean);
    await this.log.logMessage('INFO', `Mapped Scenario Names in UI: ${listed.join(', ')}`);
    const missing = scenarios.find((scenario) => !listed.includes(scenario));
    if (missing) {
      await this.log.logMessage('INFO', `Scenario "${missing}" is NOT available in mapped list`);
      return false;
    }
    return true;
  }

  public async isNameInTable(scenarioName: string): Promise<boolean> {
    const isListed = await this.nameInTable(scenarioName).first().isVisible().catch(() => false);
    await this.log.logMessage('INFO', `Is scenario ${scenarioName} present in filter :: ${isListed}`);
    return isListed;
  }

  public async isSelected(scenarioName: string): Promise<boolean> {
    return this.isRowSelected(this.row(scenarioName));
  }

  /** Waits up to `timeout` for the scenario to show as default (Default chip in its row, or in the selected list). */
  public async isDefault(scenarioName: string, timeout: number = getTimeout('XLARGE')): Promise<boolean> {
    const defaultChip = this.row(scenarioName).getByTestId('scenario-chip-btn');
    const isDefault = await defaultChip.or(this.nameInSelectedList(scenarioName)).first()
      .waitFor({ state: 'visible', timeout }).then(() => true, () => false);
    await this.log.logMessage('INFO', `Is default scenario ${scenarioName} exist under scenarios filters of planning space :: ${isDefault}`);
    return isDefault;
  }

  public async getDefaultScenarioName(): Promise<string> {
    return (await this.doGetText(this.defaultRowNames, 'Getting default scenario name from planning space')).trim();
  }

  public async getBaseScenarioName(): Promise<string> {
    return (await this.doGetText(this.baseNameInAllList, 'Getting Base Scenario from Scenarios Panel')).trim();
  }

  // Actions
  /** Checks or unchecks each scenario; already-matching rows and missing rows are logged and skipped. */
  public async select(scenarios: string[], mode: 'Check' | 'Uncheck'): Promise<boolean> {
    for (const scenario of scenarios) {
      const row = await this.visibleRow(scenario);
      if (!row) {
        continue;
      }
      const isSelected = await this.isRowSelected(row);
      if ((mode === 'Check') === isSelected) {
        await this.log.logMessage('INFO', `${scenario} scenario is already ${mode === 'Check' ? 'checked' : 'unchecked'}`);
        continue;
      }
      const icon = mode === 'Check' ? this.uncheckedIcon(row) : this.checkedIcon(row);
      if (!(await icon.isVisible().catch(() => false))) {
        continue;
      }
      await icon.scrollIntoViewIfNeeded();
      await this.doClick(icon, `${mode === 'Check' ? 'Checking' : 'Unchecking'} ${scenario} scenario`);
      // A selection beyond the limit is refused, so the new state is waited on but not required.
      await expect.poll(() => this.isRowSelected(row), { timeout: getTimeout('TINY') }).toBe(mode === 'Check')
        .catch(async () => this.log.logMessage('INFO', `${scenario} selection did not change after ${mode}`));
    }
    return true;
  }

  /** Makes the scenario the default from its row; returns false when the row is missing. */
  public async setDefault(scenarioName: string): Promise<boolean> {
    const row = await this.visibleRow(scenarioName, getTimeout('TINY'));
    if (!row) {
      return false;
    }
    if (await this.defaultCheckedIcon(row).isVisible().catch(() => false)) {
      await this.log.logMessage('INFO', `Scenario "${scenarioName}" is already set as default, skipping`);
      return true;
    }
    const btnDefault = row.locator('div[data-testid="scenario-selection-default"]').first();
    await btnDefault.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await btnDefault.scrollIntoViewIfNeeded();
    await this.doClick(btnDefault, `Setting ${scenarioName} as default from scenario component`);
    await this.defaultCheckedIcon(row).waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') })
      .catch(async () => this.log.logMessage('INFO', `${scenarioName} does not show the default icon yet`));
    return true;
  }

  /** Tries to select a fifth scenario and reports whether the selected list stays at four or fewer. */
  public async isSelectionLimitedToFour(): Promise<boolean> {
    try {
      const initial = await this.getSelectedScenarioNames();
      const all = await this.getAllScenarioNames();
      await this.log.logMessage('INFO', `Initial: ${initial.length}, Total: ${all.length}`);
      if (initial.length <= 4) {
        const toSelect = all.filter((name) => !initial.includes(name)).slice(0, 5 - initial.length);
        if (toSelect.length > 0) {
          await this.select(toSelect, 'Check');
        }
      }
      const finalCount = (await this.getSelectedScenarioNames()).length;
      const isLimited = finalCount <= 4;
      await this.log.logMessage('INFO', `Final: ${finalCount}, Limited: ${isLimited}`);
      return isLimited;
    } catch (error) {
      await this.log.logMessage('ERROR', `Error: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  public async openCreateScenario(): Promise<void> {
    await this.btnCreateScenario.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.btnCreateScenario, 'Clicking Scenario Creation Icon');
  }

  public async clickApply(): Promise<void> {
    await expect(this.btnApply).toBeEnabled({ timeout: getTimeout('MEDIUM') });
    await this.doClick(this.btnApply, 'Clicking Apply Button');
  }

  /** Answers the "Scenario Change" confirmation shown by Apply in an interactive view. */
  public async confirmScenarioChange(isContinue: boolean): Promise<void> {
    const button = isContinue ? this.btnContinue : this.btnCancel;
    await button.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(button, `Clicked on ${isContinue ? 'Continue' : 'Cancel'} Button in scenario change pop up`);
  }

  public async closeDrawer(): Promise<void> {
    await this.btnCloseDrawer.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.btnCloseDrawer, 'Clicking Close Button');
  }
}
