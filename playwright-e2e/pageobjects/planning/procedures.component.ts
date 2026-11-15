import { Page, Locator, expect } from '@playwright/test';
import BasePage from '../page';
import { getTimeout } from '../../constants/timeouts';
import { CommonFunctions } from '../../util/common.util';
import { exactText } from './text-match';

/**
 * Supply chain procedures of the Planning page: the procedures dropdown in the view header and the procedure
 * history flyout opened from the power bar.
 * planning-mfe `SideNavWithRightPanel.tsx` renders the `PrimarySecondaryActions.tsx` dropdown twice (`.sca-header-1`
 * and `.sca-header-2`, one hidden by a container query), so the visible one is used; it is a
 * `LuiButtonWithDropDown` (`@jda/lui-common-component-library-mui5` 3.12.x, `dataTestId="sca-actions-dropdown"`,
 * so `-button` and `-item`) that stays disabled until the dashboard is ready. The history button is
 * `power-bar-history-btn` (`SCASideNav/index.tsx`); the flyout comes from `@by/plan-sop-ui-library` 2026.4.x: a
 * modal drawer (`role="presentation"`) with `close-icon`, `list-item` cards (status icon in the first `span`,
 * `procedure-name`, `scenario-name`), the `lui-ccl-status-` and `lui-ccl-procedures-button-with-dropdown` filters,
 * and a details page whose header is `back-icon` followed by the procedure name.
 */
export class ProceduresComponent extends BasePage {
  private readonly log = new CommonFunctions();

  constructor(page: Page) {
    super(page);
  }

  // Locators
  private get btnActionsDropdown(): Locator {
    return this.getMfeFrameLocator().getByTestId('sca-actions-dropdown-button').filter({ visible: true }).first();
  }
  private actionItem(actionName: string): Locator {
    return this.getMfeFrameLocator().getByTestId('sca-actions-dropdown-item')
      .filter({ has: this.page.locator('span').filter({ hasText: exactText(actionName) }) }).first();
  }
  private get actionItems(): Locator { return this.getMfeFrameLocator().getByTestId('sca-actions-dropdown-item'); }
  // The first item ("Procedures") is a disabled label.
  private get enabledActionItems(): Locator { return this.mfeLocator('li[data-testid="sca-actions-dropdown-item"]:not([class*="Mui-disabled"])'); }
  // Primary (`variant="contained"`) and secondary (`variant="outlined"`) buttons next to the dropdown, with the procedure
  // display name as `aria-label` (`PrimarySecondaryActions.tsx`).
  private headerActionButton(actionName: string, variantClass?: string): Locator {
    const variant = variantClass ? `[class*=${JSON.stringify(variantClass)}]` : '';
    return this.mfeLocator(`[class*="sca-header-"] button[aria-label=${JSON.stringify(actionName)}]${variant}`).filter({ visible: true }).first();
  }
  private get btnHistory(): Locator { return this.getMfeFrameLocator().getByTestId('power-bar-history-btn'); }
  private get historyPanel(): Locator { return this.mfeLocator('[role="presentation"]'); }
  private get rows(): Locator { return this.historyPanel.getByTestId('list-item'); }
  private get procedureNames(): Locator { return this.historyPanel.getByTestId('procedure-name'); }
  private get scenarioNames(): Locator { return this.historyPanel.getByTestId('scenario-name'); }
  private get statusIcons(): Locator { return this.historyPanel.locator('[data-testid="list-item"] > span:first-of-type svg'); }
  private get btnStatusFilter(): Locator { return this.historyPanel.getByTestId('lui-ccl-status-button-with-dropdown-button'); }
  private get btnProcedureFilter(): Locator { return this.historyPanel.getByTestId('lui-ccl-procedures-button-with-dropdown-button'); }
  private filterOption(menuTestId: string, value: string): Locator {
    return this.getMfeFrameLocator().getByTestId(menuTestId).locator('span').filter({ hasText: exactText(value) });
  }
  private get btnBack(): Locator { return this.historyPanel.getByTestId('back-icon'); }
  private get btnClose(): Locator { return this.historyPanel.getByTestId('close-icon'); }
  private get procedureNameInDetails(): Locator { return this.getMfeFrameLocator().locator('[data-testid="back-icon"] ~ p'); }
  private get scenarioNameInDetails(): Locator { return this.getMfeFrameLocator().locator('p:text-is("Scenario") ~ p').first(); }
  private get statusInDetails(): Locator { return this.getMfeFrameLocator().getByTestId('lui-ccl-chip').locator('p').first(); }

  // Procedures dropdown
  private async isDisabled(button: Locator): Promise<boolean> {
    const classAttr = (await button.getAttribute('class')) || '';
    return !(await button.isEnabled()) || classAttr.includes('Mui-disabled') || (await button.getAttribute('aria-disabled')) === 'true';
  }

  /** Waits for the dropdown and reports whether it is disabled (as in empty or error states). */
  public async isDropdownDisabled(): Promise<boolean> {
    await this.btnActionsDropdown.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    return this.isDisabled(this.btnActionsDropdown);
  }

  /** Instant probe: true only when the dropdown is shown and enabled. */
  public async isDropdownUsable(): Promise<boolean> {
    if (!(await this.btnActionsDropdown.isVisible())) {
      return false;
    }
    return !(await this.isDisabled(this.btnActionsDropdown));
  }

  /** Opens the procedures dropdown and clicks the procedure, retrying both while the dashboard settles. */
  public async runFromDropdown(actionName: string): Promise<void> {
    await this.btnActionsDropdown.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    const item = this.actionItem(actionName);
    await expect(async () => {
      if (!(await item.isVisible())) {
        await expect(this.btnActionsDropdown).toBeEnabled({ timeout: getTimeout('SHORT') });
        await this.doClick(this.btnActionsDropdown, 'Clicking on Supply Chain Actions dropdown button');
      }
      await this.doClick(item, `Clicking on ${actionName} Supply Chain Action`);
    }).toPass({ timeout: getTimeout('EXTREME') });
  }

  /** Instant probe: true when the dropdown button is shown (enabled or not). */
  public async isDropdownShown(): Promise<boolean> {
    return this.btnActionsDropdown.isVisible();
  }

  /**
   * Opens the procedures dropdown unless it is already open. The button stays disabled until the dashboard is ready
   * and can swallow the first click, so it is clicked once more when no item shows. Returns whether items are shown.
   */
  public async openDropdown(timeout: number = getTimeout('XLARGE')): Promise<boolean> {
    if (await this.actionItems.first().isVisible()) {
      return true;
    }
    if (!(await this.btnActionsDropdown.waitFor({ state: 'visible', timeout }).then(() => true, () => false))) {
      await this.log.logMessage('ERROR', 'Procedures dropdown button is not shown');
      return false;
    }
    await expect(this.btnActionsDropdown).toBeEnabled({ timeout: getTimeout('LONG') }).catch(() => undefined);
    for (let attempt = 1; attempt <= 2; attempt++) {
      await this.doClick(this.btnActionsDropdown, `Opening procedures dropdown (attempt ${attempt})`);
      if (await this.actionItems.first().waitFor({ state: 'visible', timeout: getTimeout('SHORT') }).then(() => true, () => false)) {
        return true;
      }
    }
    return false;
  }

  public async closeDropdown(): Promise<void> {
    await this.page.keyboard.press('Escape').catch(() => undefined);
  }

  /**
   * Opens the dropdown and returns the enabled procedure names in menu order. Planning reads the mapped procedures
   * when it loads, so mappings made moments earlier can be missing; with `maxReloads` > 0 it reloads and reopens the
   * menu on a miss. Throws when no enabled item shows. Leaves the dropdown open.
   */
  public async getEnabledItemNames(maxReloads: number = 0): Promise<string[]> {
    for (let attempt = 0; ; attempt++) {
      await this.openDropdown();
      const timeout = getTimeout(attempt < maxReloads ? 'MEDIUM' : 'EXTREME');
      if (await this.enabledActionItems.first().waitFor({ state: 'visible', timeout }).then(() => true, () => false)) {
        const names = (await this.enabledActionItems.allTextContents()).map((text) => text.trim()).filter(Boolean);
        await this.log.logMessage('INFO', `Enabled procedures in dropdown: ${JSON.stringify(names)}`);
        return names;
      }
      if (attempt >= maxReloads) {
        throw new Error(`No enabled procedures in the SCA dropdown after ${maxReloads} reloads`);
      }
      await this.log.logMessage('INFO', `No enabled procedures in the SCA dropdown yet; reloading Planning (attempt ${attempt + 1}/${maxReloads})`);
      await this.closeDropdown();
      await this.page.reload();
    }
  }

  /** Opens the dropdown, reports whether `actionName` is listed, and closes it again. */
  public async isItemListed(actionName: string): Promise<boolean> {
    await this.openDropdown();
    const isListed = await this.actionItem(actionName).waitFor({ state: 'visible', timeout: getTimeout('SHORT') }).then(() => true, () => false);
    await this.closeDropdown();
    await this.log.logMessage('INFO', `Procedure ${actionName} visible in dropdown: ${isListed}`);
    return isListed;
  }

  /** Waits for the primary or secondary procedure button in the view header (`variantClass` narrows to one of them). */
  public async isHeaderButtonShown(actionName: string, variantClass?: string, timeout: number = getTimeout('EXTREME')): Promise<boolean> {
    const isShown = await this.headerActionButton(actionName, variantClass).waitFor({ state: 'visible', timeout }).then(() => true, () => false);
    await this.log.logMessage('INFO', `Is ${actionName} SCA button shown in the view header :: ${isShown}`);
    return isShown;
  }

  /** Clicks a procedure in the already open dropdown. */
  public async clickDropdownItem(actionName: string): Promise<void> {
    const item = this.actionItem(actionName);
    await item.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(item, `Clicking on ${actionName} Supply Chain Action`);
  }

  // History flyout
  public async isHistoryButtonShown(): Promise<boolean> {
    return this.btnHistory.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') }).then(() => true, () => false);
  }

  public async openHistory(): Promise<void> {
    await this.btnHistory.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.btnHistory, 'Clicked on SCP list button in PowerBar');
  }

  public async waitForHistoryRows(): Promise<void> {
    await this.rows.first().waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
  }

  public async getLatestProcedureName(): Promise<string> {
    return (await this.doGetText(this.procedureNames.first(), 'Fetching latest procedure name from SCP list', getTimeout('XLARGE'))).trim();
  }

  public async getLatestScenarioName(): Promise<string> {
    return (await this.doGetText(this.scenarioNames.first(), 'Fetching latest scenario name from SCP list', getTimeout('XLARGE'))).trim();
  }

  public async openLatest(): Promise<void> {
    await this.waitForHistoryRows();
    await this.doClick(this.rows.first(), 'Clicking on latest SCP from list');
  }

  public async getProcedureNames(): Promise<string[]> {
    if ((await this.rows.count()) === 0) {
      return [];
    }
    await this.procedureNames.first().waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    return (await this.procedureNames.allTextContents()).map((name) => name.trim()).filter((name) => name.length > 0);
  }

  /** Status of each listed procedure, read from the status icon's test ID (for example `progress`, `error`). */
  public async getStatuses(): Promise<string[]> {
    if ((await this.rows.count()) === 0) {
      return [];
    }
    await this.statusIcons.first().waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    const statuses: string[] = [];
    for (const icon of await this.statusIcons.all()) {
      const testId = await icon.getAttribute('data-testid');
      if (testId) {
        statuses.push(testId.trim());
      }
    }
    await this.log.logMessage('INFO', `Procedure statuses in SCP list: ${statuses.join(', ')}`);
    return statuses;
  }

  public async filterByStatus(status: string): Promise<void> {
    await this.selectFilter(
      this.btnStatusFilter,
      'lui-ccl-status-button-with-dropdown-menu',
      status,
      'status',
      (url) => url.includes('status=')
    );
  }

  public async filterByProcedure(procedure: string): Promise<void> {
    await this.selectFilter(
      this.btnProcedureFilter,
      'lui-ccl-procedures-button-with-dropdown-menu',
      procedure,
      'procedure',
      (url) => url.includes('procedureName=')
    );
  }

  private async selectFilter(
    button: Locator,
    menuTestId: string,
    value: string,
    filterName: string,
    urlPredicate?: (url: string) => boolean
  ): Promise<void> {
    await button.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(button, `Clicked on ${filterName} filter dropdown in SCP list`);
    const option = this.filterOption(menuTestId, value);
    await option.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('procedureExecutions')
        && resp.status() === 200
        && (!urlPredicate || urlPredicate(resp.url())),
      { timeout: getTimeout('XLARGE') }
    );
    await this.doClick(option, `Selected ${filterName} filter value: ${value}`);
    await responsePromise;
  }

  public async getDetailsProcedureName(): Promise<string> {
    return (await this.doGetText(this.procedureNameInDetails, 'Fetching procedure name in SCP details page', getTimeout('XLARGE'))).trim();
  }

  public async getDetailsScenarioName(): Promise<string> {
    return (await this.doGetText(this.scenarioNameInDetails, 'Fetching scenario name in SCP details page', getTimeout('XLARGE'))).trim();
  }

  public async getDetailsStatus(): Promise<string> {
    return (await this.doGetText(this.statusInDetails, 'Getting actual status text in SCP details page')).trim();
  }

  public async backToList(): Promise<void> {
    await this.btnBack.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.btnBack, 'Clicked on back icon to SCP list');
  }

  public async closeHistory(): Promise<void> {
    await this.btnClose.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.btnClose, 'Clicked on close SCP list button');
  }
}
