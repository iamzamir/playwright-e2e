import { Page, Locator, expect } from '@playwright/test';
import BasePage from '../page';
import { getTimeout, TIMEOUTS } from '../../constants/timeouts';
import { CommonFunctions } from '../../util/common.util';
import { exactText } from './text-match';

/**
 * Power bar chips, badges, context override popover, filter details modal, and process context of Planning Space.
 *
 * Markup sources:
 * - Power bar and chips: `@by/plan-sop-ui-library` 2026.4.x (`powerBar`, `scope-chip-btn`, `scenario-chip-btn`, `entityDetails`).
 *   The Scenario chip has a badge (`[data-testid="scenario-chip-btn-count"]` / `.MuiBadge-badge`), tooltip, and button label.
 *   The Scope chip has `scope-chip-btn` with button label.
 *   The Process/Subprocess chips are rendered in `entityDetails` with buttons `entityName-process` / `entityName-subprocess`.
 *   The Power bar settings icon is `nav-settings` inside tooltip wrapper `IBPToolTip-Settings`.
 * - Context override: planning-mfe `ContextOverrideChip.tsx` (`data-testid="context-override-chip"`), rendering a `StyledLuiPopover`
 *   with close button `aria-label="Close Icon Button"`, clear button `data-testid="clear-button"`, filter details button
 *   `data-testid="filter-details-button"`, and breadcrumbs `data-testid="drill-through-previous-views"` ('..').
 * - Filter details modal: planning-mfe `WorkFlowFilterDetailsModal.tsx` (`data-testid="workflow-filter-details-modal"`),
 *   rendering `DimensionScope` with `data-testid="content-label"` and `data-testid="content-value"`, closed via `close-button`.
 */
export class PowerBarChipsComponent extends BasePage {
  private readonly log = new CommonFunctions();

  constructor(page: Page) {
    super(page);
  }

  // --- Locators: Power Bar & Scenario Chip ---
  private get powerBar(): Locator {
    return this.getMfeFrameLocator().getByTestId('powerBar');
  }

  private get btnScenarioChip(): Locator {
    return this.powerBar.getByTestId('scenario-chip-btn');
  }

  private get btnScenarioChipText(): Locator {
    return this.btnScenarioChip.getByRole('button');
  }

  private get lblScenarioBadgeCount(): Locator {
    return this.powerBar
      .getByTestId('scenario-chip-btn-count')
      .or(this.powerBar.locator('.MuiBadge-badge'))
      .first();
  }

  private get txtScenarioSelectFilter(): Locator {
    return this.getMfeFrameLocator().getByTestId('lui-ccl-table').locator('tr td:first-child p');
  }

  // --- Locators: Scope Chip ---
  private get btnScopeChip(): Locator {
    return this.getMfeFrameLocator().getByTestId('scope-chip-btn');
  }

  // --- Locators: Process Context Chips ---
  private get processChipButtons(): Locator {
    return this.getMfeFrameLocator().getByTestId('entityDetails').getByRole('button');
  }

  // --- Locators: Power Bar Settings ---
  private get btnSettings(): Locator {
    return this.getMfeFrameLocator().getByTestId('nav-settings');
  }

  private menuItem(itemName: string): Locator {
    return this.getMfeFrameLocator().getByTestId('list-item').filter({ hasText: exactText(itemName) });
  }

  // --- Locators: Context Override Popover ---
  public get btnContextOverrideChip(): Locator {
    return this.getMfeFrameLocator().getByTestId('context-override-chip');
  }

  private get popoverContextOverride(): Locator {
    return this.getMfeFrameLocator().getByTestId('lui-popover');
  }

  private get btnCloseContextOverride(): Locator {
    return this.getMfeFrameLocator().getByRole('button', { name: 'Close Icon Button' });
  }

  private get contextOverrideEllipses(): Locator {
    return this.getMfeFrameLocator()
      .getByTestId('drill-through-previous-views')
      .or(this.getMfeFrameLocator().locator('p').filter({ hasText: exactText('..') }))
      .first();
  }

  private get btnClearContextOverride(): Locator {
    return this.getMfeFrameLocator().getByTestId('clear-button');
  }

  // --- Locators: Filter Details Modal ---
  private get btnFilterDetails(): Locator {
    return this.getMfeFrameLocator().getByTestId('filter-details-button');
  }

  private get modalFilterDetails(): Locator {
    return this.getMfeFrameLocator().getByTestId('workflow-filter-details-modal');
  }

  private get btnCloseFilterDetails(): Locator {
    return this.modalFilterDetails
      .getByTestId('workflow-filter-details-close-button')
      .or(this.modalFilterDetails.getByTestId('close-button'))
      .or(this.getMfeFrameLocator().getByTestId('workflow-filter-details-close-button'))
      .or(this.getMfeFrameLocator().getByTestId('close-button'))
      .first();
  }

  private appliedWorkflowFilter(attributeName: string, appliedValue: string): Locator {
    const frame = this.getMfeFrameLocator();
    return frame.locator('.MuiGrid-container').filter({
      has: this.page.getByTestId('content-label').filter({ hasText: new RegExp(`^${attributeName}$`, 'i') }),
      // The chip label span wraps an inner span with the same text, so both match.
    }).getByTestId('content-value').locator('span').filter({ hasText: appliedValue }).first();
  }

  // ==========================================
  // Scenario Chip & Badge Actions
  // ==========================================

  public async scenarioBudgeExist(): Promise<boolean> {
    await this.log.logMessage('INFO', 'Looking for Scenario budge');
    await this.btnScenarioChipText.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    const isBudgeDisplayed = await this.btnScenarioChipText.isVisible().catch(() => false);
    if (isBudgeDisplayed) {
      await this.log.logMessage('INFO', 'Budge is displayed');
      return true;
    }
    await this.log.logMessage('INFO', 'Budge is not displayed');
    return false;
  }

  public async verifyBudgeIsDefault(defaultScenario: string): Promise<boolean> {
    await this.log.logMessage('INFO', 'Looking for budge text');
    let budgeText = await this.doGetText(this.btnScenarioChipText, 'Getting scenario badge text');
    budgeText = budgeText.replace('...', '').trim();
    const normalizedDefault = defaultScenario.trim();
    const isDefault = normalizedDefault.includes(budgeText) || budgeText.includes(normalizedDefault);
    await this.log.logMessage(isDefault ? 'PASS' : 'FAIL', isDefault ? 'Budge is part of the default scenario.' : 'Budge is not part of the default scenario.');
    return isDefault;
  }

  public async getBudgeCount(): Promise<number> {
    await this.log.logMessage('INFO', 'Fetching budge count.');
    try {
      const isVisible = await this.lblScenarioBadgeCount.isVisible().catch(() => false);
      if (!isVisible) {
        await this.log.logMessage('INFO', 'Badge count element is not visible; count is 0');
        return 0;
      }
      const badgeText = (await this.lblScenarioBadgeCount.textContent())?.trim() || '0';
      await this.log.logMessage('INFO', `Retrieved budge text: ${badgeText}`);
      return Number.parseInt(badgeText, 10) || 0;
    } catch (error) {
      await this.log.logMessage('INFO', `Error fetching budge count: ${String(error)}`);
      return 0;
    }
  }

  public async checkBudgeCountUI(): Promise<boolean> {
    await this.log.logMessage('INFO', 'Starting check for budge count UI.');
    const isVisible = await this.lblScenarioBadgeCount.isVisible().catch(() => false);
    if (!isVisible) {
      await this.log.logMessage('PASS', 'Count UI is correctly not visible (badge count is 0).');
      return true;
    }
    const badgeText = (await this.lblScenarioBadgeCount.textContent())?.trim() || '0';
    const badgeClass = (await this.lblScenarioBadgeCount.getAttribute('class')) || '';
    const badgeCount = Number.parseInt(badgeText, 10) || 0;
    const isInvisible = (badgeCount === 0 && badgeClass.includes('MuiBadge-invisible')) || !isVisible;

    if (badgeCount === 0 && isInvisible) {
      await this.log.logMessage('PASS', 'Count UI is correctly not visible (badge count is 0).');
      return true;
    }
    if (badgeCount > 0 && !isInvisible) {
      await this.log.logMessage('PASS', 'Count UI is correctly visible (badge count is greater than 0).');
      return true;
    }

    await this.log.logMessage('FAIL', `Count UI is not working as expected. Badge count: ${badgeCount}, isInvisible: ${isInvisible}`);
    return false;
  }

  public async budgeClickedScenarioOpened(): Promise<boolean> {
    await this.log.logMessage('INFO', 'Locate budge element.');
    await this.btnScenarioChip.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.btnScenarioChip, 'Clicking on scenario badge');
    await this.log.logMessage('INFO', 'Budge element clicked.');
    const scenarioRows = this.txtScenarioSelectFilter;
    await scenarioRows.first().waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    const isScenarioTabDisplayed = await scenarioRows.count() > 0 && await scenarioRows.first().isVisible();
    if (isScenarioTabDisplayed) {
      await this.log.logMessage('PASS', 'Scenario tab is correctly displayed after clicking the budge.');
      return true;
    }
    await this.log.logMessage('FAIL', 'Scenario tab is not displayed after clicking the budge.');
    return false;
  }

  public async getBudgeTooltip(): Promise<string> {
    await this.log.logMessage('INFO', 'Fetching budge tooltip text.');
    const budgeText = await this.doGetAttribute(this.btnScenarioChip, 'aria-label', 'Getting badge tooltip text');
    await this.log.logMessage('INFO', `Retrieved budge tooltip text: ${budgeText}`);
    return budgeText || '';
  }

  public async getBudgeText(): Promise<string> {
    await this.log.logMessage('INFO', 'Fetching budge text.');
    await this.btnScenarioChipText.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    const budgeText = await this.doGetText(this.btnScenarioChipText, 'Getting badge text');
    await this.log.logMessage('INFO', `Retrieved budge text: ${budgeText}`);
    return budgeText;
  }

  public async validateToolTipText(budgeCount: number, toolTipText: string): Promise<boolean> {
    await this.log.logMessage('INFO', 'Starting tooltip text validation.');
    if (budgeCount === 0 && toolTipText.includes('Default scenario')) {
      await this.log.logMessage('PASS', 'Tooltip text is valid for default scenario (budge count is 0).');
      return true;
    }
    if (budgeCount > 0 && toolTipText.includes('Multiple scenarios selected')) {
      await this.log.logMessage('PASS', 'Tooltip text is valid for multiple scenarios (budge count is greater than 0).');
      return true;
    }
    await this.log.logMessage('FAIL', 'Tooltip text is not valid. Please check the budge count and tooltip text.');
    return false;
  }

  public async getScenarioChipText(): Promise<string> {
    const chipText = await this.getBudgeText();
    await this.log.logMessage('INFO', `Scenario chip text is :: ${chipText}`);
    return chipText.replace('...', '').trim();
  }

  public async isScenarioChipCorrect(text: string): Promise<boolean> {
    const chipText = await this.getScenarioChipText();
    await this.log.logMessage('INFO', `Comparing scenario chip text :: ${chipText} with expected text :: ${text}`);
    return chipText.includes(text);
  }

  // ==========================================
  // Scope Chip & Power Bar Scope Actions
  // ==========================================

  public async isGlobalScopeChipDisplays(scopeName?: string): Promise<boolean> {
    await this.btnScopeChip.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    if (!scopeName) {
      return await this.btnScopeChip.isVisible();
    }
    const rawChipText = await this.doGetText(this.btnScopeChip, 'Getting Global Scope chip text');
    const normalizedChipText = rawChipText.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
    const normalizedScopeName = scopeName.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
    const hasExpectedScope = normalizedChipText.includes(normalizedScopeName) || normalizedChipText.includes(normalizedScopeName.replace(/\*/g, ''));
    const validation = await this.log.compareTwoValues(hasExpectedScope, true, `Global Scope chip text validation for scope: ${scopeName} | Actual: ${normalizedChipText}`);
    return validation;
  }

  public async getScopeNameFromPowerBar(): Promise<string> {
    await this.btnScopeChip.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    const scopeName = await this.doGetText(this.btnScopeChip, 'Getting scope name from powerbar');
    await this.log.logMessage('INFO', `Scope name from powerbar: ${scopeName}`);
    return scopeName;
  }

  public async waitForScopeNameInPowerBar(expectedScopeName: string, timeout: number = getTimeout('XLARGE')): Promise<string> {
    const normalizedExpected = expectedScopeName.replace(/\s+/g, ' ').trim();
    let latestScopeName = '';
    try {
      await expect.poll(async () => {
        latestScopeName = (await this.getScopeNameFromPowerBar()).replace(/\s+/g, ' ').trim();
        return latestScopeName;
      }, { timeout }).toBe(normalizedExpected);
    } catch {
      await this.log.logMessage('INFO', `Powerbar scope name "${latestScopeName}" did not equal expected "${normalizedExpected}" within timeout`);
    }
    return latestScopeName;
  }

  public async verifyScopeInBudgeAndVF(scopeNameInVF: string): Promise<boolean> {
    const scopeInBudge = await this.getScopeNameFromPowerBar();
    const normalizedBudge = scopeInBudge.toLowerCase().replace(/\*/g, '').replace(/\s+/g, ' ').trim();
    const normalizedVF = scopeNameInVF.toLowerCase().replace(/\*/g, '').replace(/\s+/g, ' ').trim();
    await this.log.compareTwoValues(normalizedBudge, normalizedVF, `Scope in Budge is ${scopeInBudge} and Scope in VF is ${scopeNameInVF}`);
    return normalizedBudge === normalizedVF;
  }

  public async clickScopeChip(): Promise<void> {
    await this.btnScopeChip.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.btnScopeChip, 'Clicking Scope Chip');
  }

  public async openScopeFilterByChip(): Promise<void> {
    const vfTitle = this.getMfeFrameLocator().getByTestId('vf-filter-card-title').first();
    // Check the loader first: during a scope re-render the old card title can stay visible behind the overlay.
    const loader = this.getMfeFrameLocator().getByTestId('loading-overlay').or(this.getMfeFrameLocator().getByText('Setting up your page')).first();
    if (await loader.isVisible().catch(() => false)) {
      // The loader was seen, so a timeout here means the page never settled: let it fail rather than click behind it.
      await loader.waitFor({ state: 'hidden', timeout: getTimeout('LONG') });
    }
    if (await vfTitle.isVisible().catch(() => false)) {
      return;
    }
    await this.btnScopeChip.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await expect(async () => {
      if (!(await vfTitle.isVisible().catch(() => false))) {
        await this.doClick(this.btnScopeChip, 'Clicking Scope Chip');
      }
      await expect(vfTitle).toBeVisible({ timeout: getTimeout('MEDIUM') });
    }).toPass({ timeout: getTimeout('EXTREME') });
  }

  // ==========================================
  // Process Context Chips Actions
  // ==========================================

  public async isProcessChipCorrect(text: string): Promise<boolean> {
    await this.log.logMessage('INFO', 'Validating process name from powerbar');
    const processName = await this.getLaunchedProcessFromPowerbar();
    if (typeof processName === 'string') {
      const bValidation1 = processName.includes(text);
      await this.log.logMessage('INFO', `Process name validation: Expected '${text}', Found '${processName}', Result: ${bValidation1}`);
      return bValidation1;
    }
    await this.log.logMessage('ERROR', 'Failed to get process name from powerbar');
    return false;
  }

  public async getLaunchedProcessFromPowerbar(): Promise<string | boolean> {
    try {
      const processChips = this.processChipButtons;
      await processChips.first().waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
      const processName = (await processChips.first().textContent())?.trim();
      if (processName) {
        await this.log.logMessage('INFO', `Launched Process: ${processName}`);
        return processName;
      }
      await this.log.logMessage('ERROR', 'No process chip found in power bar');
      return false;
    } catch (error) {
      await this.log.logMessage('ERROR', `Failed to get launched process from powerbar: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  public async getLaunchedSubProcessFromPowerbar(): Promise<string | boolean> {
    try {
      const processChips = this.processChipButtons;
      await processChips.first().waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
      const count = await processChips.count();
      if (count > 1) {
        const subProcessName = (await processChips.nth(1).textContent())?.trim();
        if (subProcessName) {
          await this.log.logMessage('INFO', `Launched SubProcess: ${subProcessName}`);
          return subProcessName;
        }
      }
      await this.log.logMessage('ERROR', 'No subprocess chip found in power bar');
      return false;
    } catch (error) {
      await this.log.logMessage('ERROR', `Failed to get launched subprocess from powerbar: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  // ==========================================
  // Power Bar Settings Actions
  // ==========================================

  public async validatePowerBarSettingsIcon(): Promise<boolean> {
    const settingsIcon = this.btnSettings;
    await settingsIcon.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(settingsIcon, 'Clicking on settings icon in power bar');

    const menuOptions = ['Process Settings', 'Cognitive Model'];
    for (const option of menuOptions) {
      const actionOption = this.menuItem(option);
      const isVisible = await actionOption.first().waitFor({ state: 'visible', timeout: getTimeout('SHORT') }).then(() => true, () => false);
      if (!isVisible) {
        await this.log.logMessage('INFO', `Menu option ${option} not found in power bar`);
        return false;
      }
    }
    return true;
  }

  // ==========================================
  // Context Override Actions
  // ==========================================

  public async clickOnContextOverrideIcon(): Promise<boolean> {
    await this.btnContextOverrideChip.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.btnContextOverrideChip, 'Clicked on Context Override Icon');
    return true;
  }

  public async isContextOverrideDisplays(): Promise<boolean> {
    return this.btnContextOverrideChip.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') }).then(() => true, () => false);
  }

  public async closeContextOverridePopup(): Promise<boolean> {
    const isCloseIconVisible = await this.btnCloseContextOverride.isVisible().catch(() => false);
    if (!isCloseIconVisible) {
      return false;
    }
    await this.doClick(this.btnCloseContextOverride, 'Clicked on close icon of Context Override popup');
    return true;
  }

  public async isContextOverrideHidden(): Promise<boolean> {
    return !(await this.btnContextOverrideChip.isVisible().catch(() => false));
  }

  public async validateEllipsesInOverridePopup(): Promise<boolean> {
    await this.contextOverrideEllipses.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    return await this.contextOverrideEllipses.isVisible();
  }

  public async isClearDisplays(toggleContextPopup: boolean = true): Promise<boolean> {
    if (toggleContextPopup) {
      await this.clickOnContextOverrideIcon();
    }
    await this.btnClearContextOverride.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    const isVisible = await this.btnClearContextOverride.isVisible();
    if (toggleContextPopup) {
      await this.clickOnContextOverrideIcon();
    }
    return isVisible;
  }

  public async clearContext(): Promise<boolean> {
    await this.btnContextOverrideChip.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.btnContextOverrideChip, 'Clicking on Context Override Chip to open popup');
    await this.btnClearContextOverride.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.btnClearContextOverride, 'Clicking on Clear context button');
    await expect(this.btnClearContextOverride).toBeHidden({ timeout: getTimeout('MEDIUM') }).catch(() => { });
    await expect(this.btnContextOverrideChip).toBeHidden({ timeout: getTimeout('LONG') });
    return true;
  }

  // ==========================================
  // Filter Details & Merge Scope Actions
  // ==========================================

  public async isFilterDetailsDisplays(): Promise<boolean> {
    await this.clickOnContextOverrideIcon();
    const isVisible = await this.btnFilterDetails.isVisible().catch(() => false);
    await this.closeContextOverridePopup();
    return isVisible;
  }

  public async showFilterDetails(workflowFilter: { DIMENSION_NAME: string; ATTRIBUTE_NAME: string; VALUES: string[] }): Promise<boolean> {
    await this.doClick(this.btnContextOverrideChip, 'Clicking on Context Override chip');
    await this.btnFilterDetails.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.btnFilterDetails, 'Clicking on filter details button');

    try {
      const filterElement = this.appliedWorkflowFilter(workflowFilter.ATTRIBUTE_NAME, workflowFilter.VALUES[0]);
      await filterElement.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
      return true;
    } catch (error) {
      await this.log.logMessage('INFO', `Filter not applied: ${workflowFilter.ATTRIBUTE_NAME} -> ${workflowFilter.VALUES[0]}`);
      return false;
    }
  }

  public async closeWorkflowFilterDetails(): Promise<boolean> {
    const isCloseButtonExists = await this.btnCloseFilterDetails.isVisible().catch(() => false);
    if (isCloseButtonExists) {
      await this.doClick(this.btnCloseFilterDetails, 'Clicking Close button in Filter Details popup');
      // Wait on the modal itself: btnCloseFilterDetails falls back to any `close-button` in the frame,
      // which can stay visible after this modal has faded out.
      const isModalHidden = await this.modalFilterDetails.waitFor({ state: 'hidden', timeout: getTimeout('MEDIUM') }).then(() => true, () => false);
      if (!isModalHidden) {
        await this.log.logMessage('INFO', 'Filter Details popup is still visible after clicking Close');
      }
      return isModalHidden;
    }
    return isCloseButtonExists;
  }

  public async checkMergeScopeLogic(context: Record<string, any>, workflowFilters: Record<string, any>): Promise<boolean> {
    const workflowValue = String(workflowFilters?.VALUES?.[0] ?? '').trim();
    if (!workflowValue) {
      return false;
    }
    const hasContextScope = Boolean(context?.DIMENSION_NAME) && context.DIMENSION_NAME !== workflowFilters?.DIMENSION_NAME;
    const contextValue = String(context?.VALUES?.[0] ?? '').trim();
    if (hasContextScope && !contextValue) {
      return false;
    }

    try {
      const frame = this.getMfeFrameLocator();
      // The values are read from the pivot's row headers, so wait for the pivot to render rows (it shows skeletons
      // while loading). If it never does, carry on: the fallbacks below and the assertion decide the result.
      const isPivotRendered = await frame.locator('.side-axis-font').first().waitFor({ state: 'visible', timeout: getTimeout('XLARGE') }).then(() => true, () => false);
      if (!isPivotRendered) {
        await this.log.logMessage('INFO', 'Pivot rows did not render before checkMergeScopeLogic');
      }
      await expect(async () => {
        let isWorkflowVisible = await frame.getByText(workflowValue).filter({ visible: true }).first().isVisible().catch(() => false);
        if (!isWorkflowVisible) {
          // If workflowValue is a leaf dimension (e.g. FG-01) rolled up in the pivot grid,
          // verify it is active via Context Override Chip -> Filter Details popup.
          const btnChip = this.btnContextOverrideChip;
          if (await btnChip.isVisible().catch(() => false)) {
            await this.clickOnContextOverrideIcon();
            if (await this.btnFilterDetails.isVisible().catch(() => false)) {
              await this.doClick(this.btnFilterDetails, 'Clicking on filter details button in checkMergeScopeLogic');
              const filterEl = this.appliedWorkflowFilter(workflowFilters.ATTRIBUTE_NAME ?? '', workflowValue);
              isWorkflowVisible = await filterEl.isVisible().catch(() => false);
              // A popup left open (or still fading) would sit over the next interactions, so a failed close fails the check.
              expect(await this.closeWorkflowFilterDetails(), 'Filter Details popup closed').toBe(true);
            } else {
              expect(await this.closeContextOverridePopup(), 'Context Override popup closed').toBe(true);
            }
          }
        }
        expect(isWorkflowVisible).toBe(true);

        if (hasContextScope) {
          const contextElement = frame.getByText(contextValue).filter({ visible: true }).first();
          let isContextVisible = await contextElement.isVisible().catch(() => false);
          if (!isContextVisible) {
            // If contextValue is not directly visible on the page (e.g. rolled up in pivot grid or in closed scope drawer),
            // open Scope chip to verify it is applied in the Scope drawer.
            const btnScope = this.btnScopeChip;
            if (await btnScope.isVisible().catch(() => false)) {
              await this.doClick(btnScope, 'Opening Scope drawer to verify context value in checkMergeScopeLogic');
              const inScopeVisible = await frame.getByText(contextValue).filter({ visible: true }).first().isVisible().catch(() => false);
              const btnCloseDrawer = frame.getByTestId('drawer-close-btn').filter({ visible: true }).first();
              await this.doClick(btnCloseDrawer, 'Closing Scope drawer in checkMergeScopeLogic');
              await expect(frame.getByTestId('vf-filter-card-title'), 'Scope drawer closed').toBeHidden({ timeout: getTimeout('MEDIUM') });
              expect(inScopeVisible).toBe(true);
            } else {
              expect(isContextVisible).toBe(true);
            }
          } else {
            expect(isContextVisible).toBe(true);
          }
        }
      }).toPass({ timeout: getTimeout('MEDIUM') });
      return true;
    } catch {
      return false;
    }
  }
}
