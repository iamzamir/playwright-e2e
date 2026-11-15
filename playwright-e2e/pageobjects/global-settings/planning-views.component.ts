import { Page, Locator, Request, expect } from '@playwright/test';
import { getTimeout, TIMEOUTS } from '../../constants/timeouts';
import { exactText } from '../planning/text-match';
import { GlobalSettingsComponent } from './settings-component';

export type DataSetupActorProcedure = { actorName: string; procedureName: string; labelName: string };

/**
 * View Groups and Planning Views screens of PO Global Settings (lui `src/Components/ViewManager`), including the
 * Create/Edit View settings dialog and the per-view Data Setup modal.
 *
 * The settings dialog comes from the lui settings UI library: `lui-settings-ui-text-field-input-<field>` and
 * `lui-settings-ui-autocomplete-input-<field>` for fields `name`, `user` (Owned By), `containerId` (View Group),
 * `read` (View Access), `create`, `admin`. Autocomplete popups are `ul#<input id>-listbox` with
 * `li[role="option"]` items that carry ids, not test IDs (2026-10-14 INTEROP trace). `create-container-name`,
 * `dialog-save-btn-create`, `filter-viewgroup` and `view-search` come from lui ViewManager; `lui-ccl-*` IDs from
 * `@jda/lui-common-component-library-mui5`.
 */
export class PlanningViewsComponent extends GlobalSettingsComponent {
  constructor(page: Page) {
    super(page);
  }

  // --- Locators: tables and search ---
  private get viewSearchInput(): Locator {
    const frame = this.getMfeFrameLocator();
    return frame.getByTestId('view-search').or(frame.locator('input[placeholder="Search"]:not([data-testid="process-search"])')).first();
  }
  private get tableRows(): Locator                              { return this.mfeLocator('tr[class*="MuiTableRow-root"]'); }
  private tableRowWithView(viewName: string): Locator           { return this.tableRowByName(viewName, 'tr[class*="MuiTableRow-root"]').first(); }
  private tableWithView(viewName: string): Locator {
    return this.mfeLocator('table').filter({ has: this.page.locator('p').filter({ hasText: exactText(viewName) }) }).first();
  }
  private get viewGroupFilterInput(): Locator                   { return this.mfeLocator('[data-testid="filter-viewgroup"] input'); }
  private plusIcon(title: string): Locator                      { return this.mfeLocator(`button[title=${JSON.stringify(title)}]`); }
  private rowThreeDotButton(name: string): Locator              { return this.tableRowByName(name).first().getByTestId('lui-ccl-threedot-menu-icon-button').first(); }
  private get primaryDeleteButton(): Locator                    { return this.mfeLocator('div[class*="MuiBox-root"] button[type="button"]:text-is("Delete")'); }
  // MUI autocomplete popups: `ul#<input id>-listbox` with `li[role="option"]#<input id>-option-<n>` (ids, not test IDs).
  private get anyListboxOption(): Locator                       { return this.mfeLocator('ul[role="listbox"] li[role="option"]').filter({ visible: true }).first(); }
  private get hostListboxOption(): Locator                      { return this.page.locator('ul[role="listbox"] li[role="option"]').filter({ visible: true }).first(); }

  // --- Locators: Create View Group dialog ---
  private get viewGroupNameInput(): Locator                     { return this.mfeLocator('[data-testid="create-container-name"] input'); }
  private get btnCreateViewGroup(): Locator                     { return this.getMfeFrameLocator().getByTestId('dialog-save-btn-create'); }

  // --- Locators: Create/Edit View settings dialog ---
  private get viewNameInput(): Locator                          { return this.getMfeFrameLocator().getByTestId('lui-settings-ui-text-field-input-name'); }
  private get viewGroupInput(): Locator                         { return this.getMfeFrameLocator().getByTestId('lui-settings-ui-autocomplete-input-containerId'); }
  private get viewGroupField(): Locator                         { return this.getMfeFrameLocator().getByTestId('lui-settings-ui-autocomplete-containerId'); }
  private get btnClearViewGroup(): Locator                      { return this.viewGroupField.locator('button[title="Clear"]'); }
  private get btnOpenViewGroup(): Locator                       { return this.viewGroupField.locator('button[title="Open"]'); }
  private get viewGroupListbox(): Locator                       { return this.mfeLocator('ul#lui-settings-ui-autocomplete-containerId-listbox'); }
  private viewGroupOption(viewGroupName: string): Locator       { return this.viewGroupListbox.locator('li[role="option"]').filter({ hasText: exactText(viewGroupName) }).first(); }
  private get viewAccessInput(): Locator                        { return this.getMfeFrameLocator().getByTestId('lui-settings-ui-autocomplete-input-read'); }
  private get btnSaveView(): Locator                            { return this.getMfeFrameLocator().getByTestId('lui-settings-ui-save-button'); }
  private get layoutHeading(): Locator                          { return this.mfeLocator('[data-testid="lui-ccl-card-cardHeader"] span:text-is("Layout")'); }
  private get freeFormLayout(): Locator                         { return this.getMfeFrameLocator().getByTestId('lui-dashboard-layout-freeForm'); }
  private get rowLayout(): Locator                              { return this.getMfeFrameLocator().getByTestId('lui-dashboard-layout-row'); }

  // --- Locators: Data Setup ---
  private dataSetupInput(actorName: string): Locator            { return this.mfeLocator(`input[id=${JSON.stringify(actorName)}]`).first(); }
  private dataSetupOption(value: string): Locator              { return this.getMfeFrameLocator().getByRole('option', { name: value, exact: true }).first(); }
  private dataSetupOptionContaining(value: string): Locator    { return this.getMfeFrameLocator().getByRole('option').filter({ hasText: value }).first(); }
  private get btnDataSetupSave(): Locator                       { return this.getMfeFrameLocator().getByRole('button', { name: 'Save', exact: true }).first(); }
  private get btnDataSetupCancel(): Locator                     { return this.getMfeFrameLocator().getByRole('button', { name: 'Cancel' }).first(); }
  private dataSetupFieldValue(label: string, value: string): Locator {
    return this.mfeLocator(`div:has(> label:text-is(${JSON.stringify(label)})) input[value=${JSON.stringify(value)}]`).first();
  }
  private get assignedProcedureLabels(): Locator                { return this.getMfeFrameLocator().getByTestId('lui-ccl-object-status-label-container'); }
  private get removeConfigurationTitle(): Locator               { return this.getMfeFrameLocator().getByRole('heading', { name: /Remove Configuration/i }).first(); }
  private get btnRemoveConfiguration(): Locator                 { return this.getMfeFrameLocator().getByRole('button', { name: 'Remove', exact: true }).first(); }

  // --- Helpers ---
  private async clickOnThreeDotMenuOfView(viewName: string): Promise<void> {
    const namedButton = this.rowThreeDotButton(viewName);
    if (await this.waitForElementVisible(namedButton, getTimeout('SHORT'))) {
      await this.doClick(namedButton, `Clicking on three dot menu of view ${viewName}`);
      return;
    }
    // After a search the name cell may be rendered differently; the filtered row is then the last one.
    const lastButton = this.threeDotMenuButtons.last();
    await lastButton.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(lastButton, 'Clicking on last three dot menu button (fallback after search filter)');
  }

  /** Selects the first option of an autocomplete, if it offers any (a multi-select lists only roles not yet chosen). */
  private async pickFirstOptionIfAny(input: Locator, description: string): Promise<void> {
    await input.focus();
    await input.press('ArrowDown');
    const openBtn = input.locator('~ div button[title="Open"]').first();
    let optionLocator = (await this.waitForElementVisible(this.anyListboxOption, getTimeout('SHORT')))
      ? this.anyListboxOption
      : (await this.waitForElementVisible(this.hostListboxOption, getTimeout('SHORT')))
        ? this.hostListboxOption
        : null;

    if (!optionLocator) {
      if (await openBtn.isVisible().catch(() => false)) {
        await this.doClick(openBtn, `Clicking Open button on ${description} dropdown`);
      } else {
        await this.doClick(input, `Opening ${description} dropdown`);
      }
      optionLocator = (await this.waitForElementVisible(this.anyListboxOption, getTimeout('SHORT')))
        ? this.anyListboxOption
        : (await this.waitForElementVisible(this.hostListboxOption, getTimeout('SHORT')))
          ? this.hostListboxOption
          : null;
    }
    if (optionLocator) {
      await this.doClick(optionLocator, `Selecting first ${description} option`);
      await optionLocator.waitFor({ state: 'hidden', timeout: getTimeout('SHORT') }).catch(() => {});
      return;
    }
    await this.log.logMessage('INFO', `No ${description} options left to select`);
    await input.press('Escape');
  }

  /**
   * Runs `action` (which opens the view settings dialog) and waits until the dialog stops fetching
   * `dashboard/v2/roles` for a quiet window. Each fetch re-renders it and resets its form state, so input before
   * that is shown but lost.
   */
  private async openViewDialogAndSettle(action: () => Promise<void>): Promise<void> {
    let lastRolesRequestAt = Date.now();
    const onRequest = (request: Request): void => {
      if (request.url().includes('/dashboard/v2/roles')) {
        lastRolesRequestAt = Date.now();
      }
    };
    this.page.on('request', onRequest);
    try {
      await action();
      await this.viewNameInput.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
      await expect.poll(() => Date.now() - lastRolesRequestAt, { timeout: getTimeout('XLARGE'), intervals: [TIMEOUTS.POLL_INTERVAL] })
        .toBeGreaterThan(TIMEOUTS.TINY);
    } finally {
      this.page.off('request', onRequest);
    }
  }

  private async isViewSaveEnabled(): Promise<boolean> {
    return expect(this.btnSaveView).toBeEnabled({ timeout: getTimeout('SHORT') }).then(() => true, () => false);
  }

  // --- Atomic actions ---
  public async clickOnPlus(title: 'Create View' | 'Create View Group'): Promise<void> {
    await this.plusIcon(title).waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.plusIcon(title), `Clicking on ${title} button`);
  }

  public async setViewName(viewName: string): Promise<void> {
    await this.viewNameInput.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.clearAndSetInputValue(this.viewNameInput, viewName);
    await this.log.logMessage('INFO', `Setting view name: ${viewName}`);
  }

  public async selectViewGroup(viewGroupName: string, force: boolean = false): Promise<void> {
    const currentValue = await this.viewGroupInput.inputValue().catch(() => '');
    if (!force && currentValue.trim() === viewGroupName.trim()) {
      return;
    }
    await this.viewGroupInput.hover();
    if (await this.btnClearViewGroup.isVisible()) {
      await this.doClick(this.btnClearViewGroup, 'Clearing existing view group selection');
    }
    // Pick from the full list (typed text is cleared on blur). A click on the input toggles the MUI popup, so open it
    // with ArrowDown, which only opens; fall back to the Open indicator.
    const option = this.viewGroupOption(viewGroupName);
    await this.viewGroupInput.focus();
    await this.viewGroupInput.press('ArrowDown');
    if (!(await this.waitForElementVisible(option, getTimeout('SHORT')))) {
      await this.doClick(this.btnOpenViewGroup, 'Opening view group dropdown');
    }
    await option.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    const rolesResponse = this.page.waitForResponse(
      (res) => res.url().includes('/roles') && res.status() === 200,
      { timeout: getTimeout('SHORT') }
    ).catch(() => null);
    await this.doClick(option, `Selecting view group ${viewGroupName}`);
    await expect(this.viewGroupInput).toHaveValue(viewGroupName, { timeout: getTimeout('SHORT') });
    await this.viewGroupListbox.waitFor({ state: 'hidden', timeout: getTimeout('SHORT') }).catch(() => {});
    await rolesResponse;
  }

  public async setViewGroupName(name: string): Promise<void> {
    await this.clearAndSetInputValue(this.viewGroupNameInput, name);
    await this.log.logMessage('INFO', `Set name value with "${name}"`);
  }

  public async clickOnPrimaryAction(): Promise<void> {
    await this.primaryDeleteButton.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    if (await this.primaryDeleteButton.isEnabled()) {
      await this.doClick(this.primaryDeleteButton, 'Clicking primary button');
    } else {
      await this.log.logMessage('INFO', 'Unable to click primary button - not enabled');
    }
  }

  public async clickCreate(): Promise<void> {
    await this.doClick(this.btnCreateViewGroup, 'Clicking Create button to create View Group');
  }

  /** Saves the view dialog and waits for the views list refresh lui runs afterwards, so it cannot overwrite a later search. */
  public async clickPlanningViewSave(): Promise<void> {
    await expect(this.btnSaveView).toBeEnabled({ timeout: getTimeout('MEDIUM') });
    const listRefresh = this.page.waitForResponse(
      (response) => response.request().method() === 'GET' && response.url().includes('/uiRegistration/v1/views?'),
      { timeout: getTimeout('XLARGE') }
    ).catch(() => null);
    await this.doClick(this.btnSaveView, 'Clicking Save button to save Planning View');
    if (!(await listRefresh)) {
      await this.log.logMessage('INFO', 'No views list refresh seen after saving the view');
    }
  }

  public async verifyLayout(): Promise<boolean> {
    const isLayoutPresent = await this.doesElementExist(this.layoutHeading, 'Checking if Layout section exists');
    const isFreeFormExist = await this.doesElementExist(this.freeFormLayout, 'Checking if Layout Free Form exists');
    const isRowLayoutExist = await this.doesElementExist(this.rowLayout, 'Checking if Layout Row Option exists');
    return isLayoutPresent && isFreeFormExist && isRowLayoutExist;
  }

  public async searchForEle(name: string): Promise<void> {
    await this.clearAndSetInputValue(this.viewSearchInput, name);
    await this.log.logMessage('INFO', `Searching for: ${name}`);
  }

  /**
   * Searches views by `name` and waits until the table holding that row lists only matching rows (logs if it never does).
   * lui sends one views request per input event and never cancels older ones, so a slower response (a typed prefix, or
   * the list refresh after a save) can overwrite the result. `fill` sends a single request, and the search is re-sent
   * if the table does not settle.
   */
  public async planningViewSearch(name: string): Promise<void> {
    const searchInput = this.viewSearchInput;
    await searchInput.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    const isFiltered = async (): Promise<boolean> =>
      (await this.tableRowWithView(name).isVisible()) && (await this.tableWithView(name).locator('tbody tr').filter({ hasNotText: name }).count()) === 0;
    let settled = false;
    for (let attempt = 1; attempt <= 3 && !settled; attempt++) {
      if (attempt > 1) {
        await searchInput.fill(name.slice(0, -1));
      }
      await searchInput.fill(name);
      await searchInput.press('Enter');
      settled = await expect.poll(isFiltered, { timeout: getTimeout('SHORT'), intervals: [TIMEOUTS.POLL_INTERVAL] }).toBe(true).then(() => true, () => false);
    }
    if (!settled) {
      await this.log.logMessage('INFO', `Search for "${name}" did not settle on matching rows; ${await this.tableRows.count()} rows shown`);
    }
  }

  // --- Composite actions: views and view groups ---
  /** Creates a planning view in `viewGroupName`. Returns whether the Layout section showed Row and Free Form. */
  public async createPlanningView(viewName: string, viewGroupName: string): Promise<boolean> {
    await this.openViewDialogAndSettle(() => this.clickOnPlus('Create View'));
    await this.selectViewGroup(viewGroupName);
    await this.setViewName(viewName);
    const isLayoutVerified = await this.verifyLayout();
    // lui `SettingsDialog` re-validates only when name or view group change, and its `useEffect([props])` resets that
    // state on every parent re-render, leaving Save disabled while the inputs still show the values. If a late re-render
    // got through, entering group then name again restores it; selectViewGroup clears first so onChange fires.
    for (let attempt = 1; attempt <= 2 && !(await this.isViewSaveEnabled()); attempt++) {
      await this.log.logMessage('INFO', `Save disabled after filling the view form; re-entering name and view group (attempt ${attempt})`);
      await this.selectViewGroup(viewGroupName, true);
      await this.setViewName(viewName);
    }
    await this.clickPlanningViewSave();
    return isLayoutVerified;
  }

  public async createViewGroup(viewGroupName: string): Promise<void> {
    await this.clickOnPlus('Create View Group');
    await this.setViewGroupName(viewGroupName);
    await this.clickCreate();
  }

  public async verifyViewGroupInPO(viewGroupName: string, viewName: string): Promise<boolean> {
    await this.clearAndSetInputValue(this.viewGroupFilterInput, viewGroupName);
    await this.viewGroupFilterInput.press('ArrowDown');
    await expect(this.viewGroupFilterInput).toHaveAttribute('aria-expanded', 'true', { timeout: getTimeout('SHORT') }).catch(() => {});

    const viewsResponse = this.page.waitForResponse(
      (res) => res.request().method() === 'GET' && res.url().includes('/uiRegistration/v1/views'),
      { timeout: getTimeout('MEDIUM') }
    ).catch(() => null);

    await this.viewGroupFilterInput.press('Enter');
    await this.page.keyboard.press('Enter');
    await viewsResponse;

    await this.planningViewSearch(viewName);
    return this.waitForElementVisible(this.tableRowWithView(viewName), getTimeout('LONG'));
  }

  public async editView(viewName: string, viewGroupName?: string): Promise<void> {
    await this.planningViewSearch(viewName);
    await this.openViewDialogAndSettle(() => this.selectRowMenuOption(() => this.clickOnThreeDotMenuOfView(viewName), 'Settings'));
    if (viewGroupName) {
      await this.selectViewGroup(viewGroupName);
    }
    await this.pickFirstOptionIfAny(this.viewAccessInput, 'View Access');
    await this.clickPlanningViewSave();
  }

  public async deleteView(viewName: string): Promise<void> {
    await this.planningViewSearch(viewName);
    await this.selectRowMenuOption(() => this.clickOnThreeDotMenuOfView(viewName), 'Delete View');
    await this.clickOnPrimaryAction();
  }

  public async deleteViewGroup(viewGroupName: string): Promise<void> {
    await this.searchForEle(viewGroupName);
    const threeDot = this.rowThreeDotButton(viewGroupName);
    await threeDot.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.selectRowMenuOption(() => this.doClick(threeDot, 'Clicking on three dot menu of view group'), 'Delete');
    await this.clickOnPrimaryAction();
  }

  // --- Composite actions: Data Setup ---
  public async addDataSetupConfig(viewName: string, actorsProcedure: DataSetupActorProcedure[]): Promise<void> {
    await this.planningViewSearch(viewName);
    await this.selectRowMenuOption(() => this.clickOnThreeDotMenuOfView(viewName), 'Data Setup');
    for (const data of actorsProcedure) {
      const input = this.dataSetupInput(data.actorName);
      await input.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
      await this.doClick(input, `Opening data setup field: ${data.labelName}`);
      await input.fill(data.procedureName);
      // Prefer the exact name; display names can differ in case or carry a suffix.
      await this.dataSetupOptionContaining(data.procedureName).waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
      const exact = this.dataSetupOption(data.procedureName);
      const option = (await exact.isVisible()) ? exact : this.dataSetupOptionContaining(data.procedureName);
      await this.doClick(option, `Selecting procedure ${data.procedureName} for ${data.labelName}`);
    }
    await this.btnDataSetupSave.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.btnDataSetupSave, 'Saving Data Setup configuration');
  }

  public async validateSelectedValues(actorsProcedure: DataSetupActorProcedure[]): Promise<void> {
    for (const data of actorsProcedure) {
      const expected = (data.procedureName || '').trim();
      if (!expected) {
        continue;
      }
      // Labels are truncated in the table, so match the leading characters only.
      const label = this.assignedProcedureLabels.filter({ hasText: expected.slice(0, 19) }).first();
      await label.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
      await this.log.logMessage('INFO', `Validated selected value: ${expected}`);
    }
  }

  public async dataSetupConfiguredValidate(): Promise<boolean> {
    const isConfigured = await this.waitForElementVisible(this.assignedProcedureLabels.first(), getTimeout('LONG'));
    await this.log.logMessage('INFO', isConfigured ? 'Data Setup is configured.' : 'Data Setup configuration is removed.');
    return isConfigured;
  }

  public async removeDataSetupConfiguration(viewName: string): Promise<void> {
    await this.selectRowMenuOption(() => this.clickOnThreeDotMenuOfView(viewName), 'Remove Configuration');
    await this.removeConfigurationTitle.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.log.logMessage('INFO', 'Remove Configuration dialog is visible');
    await this.btnRemoveConfiguration.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.btnRemoveConfiguration, 'Clicking Remove Configuration button');
    await this.removeConfigurationTitle.waitFor({ state: 'hidden', timeout: getTimeout('XLARGE') }).catch(() => undefined);
  }

  public async validateViewDataSetup(viewName: string, data: { label: string; value: string }[]): Promise<boolean> {
    await this.planningViewSearch(viewName);
    await this.selectRowMenuOption(() => this.clickOnThreeDotMenuOfView(viewName), 'Data Setup');
    await this.btnDataSetupSave.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.log.logMessage('INFO', 'Validating Data Setup Configuration');
    for (const item of data) {
      if (!(await this.waitForElementVisible(this.dataSetupFieldValue(item.label, item.value), getTimeout('EXTREME')))) {
        await this.log.logMessage('ERROR', `${item.label} with value ${item.value} validation failed.`);
        await this.page.keyboard.press('Escape').catch(() => undefined);
        return false;
      }
      await this.log.logMessage('INFO', `Validated ${item.label} with value ${item.value}`);
    }
    await this.doClick(this.btnDataSetupCancel, 'Closing Data Setup modal');
    return true;
  }
}
