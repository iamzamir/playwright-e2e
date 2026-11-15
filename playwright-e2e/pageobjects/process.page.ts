import { Page, Locator, FrameLocator, expect } from '@playwright/test';
import BasePage from './page';
import { getTimeout, TIMEOUTS, type TimeoutKey } from '../constants/timeouts';
import { CommonFunctions } from '../util/common.util';
import { waitForDelay } from '../util/wait-helpers';
import { exactText } from './planning/text-match';

type ProcessAction = 'Start Process' | 'Close Process' | string;

/**
 * Process Orchestration (PO) listing, process summary and sub-process pages.
 *
 * Markup sources (lui `origin/main` 559886b, 2026-10-08, and its `@by/plan-sop-ui-library` / `@jda/lui-common-component-library-mui5`):
 * - `add-process` (`aria-label="Add Process"`): lui `ListProcess.tsx` (card header) and `ProcessDetails.tsx` (sub-process card).
 * - `po-page-title-three-dot-btn` (`aria-label="more"`, `Menu keepMounted`): lui `Common/PageTitle.tsx`.
 * - `add-procedure-config-btn`: lui `Settings/ProcessToProcedureMapping/ProcessDetailsProceduresTabContent.tsx`.
 * - `refreshIconBtn`, `entityName-<TYPE>` (chip button, `aria-label` = entity name), `simple-tab-<label>` (MUI Tab id):
 *   `@by/plan-sop-ui-library`.
 * - `app-header-block-title`, `lui-ccl-card-cardHeader`, `lui-ccl-object-status-label-container`,
 *   `lui-ccl-threedot-menu-icon-button`, `select-select-simple-select+<field>` input ids: lui-ccl components (ids are built at
 *   runtime, so they are kept exactly as the old XPath used them).
 * - `mrt-rows-per-page`: material-react-table pagination select.
 */
export class ProcessPage extends BasePage {
  private objCommonFunctions: CommonFunctions;

  constructor(page: Page) {
    super(page);
    this.objCommonFunctions = new CommonFunctions();
  }

  // ---------------------------------------------------------------------------
  // Locators
  // ---------------------------------------------------------------------------

  private get frame(): FrameLocator { return this.getMfeFrameLocator(); }

  // --- Header / summary ---
  private get pageTitle(): Locator                  { return this.frame.getByTestId('app-header-block-title'); }
  private get threeDotMenu(): Locator               { return this.frame.getByTestId('po-page-title-three-dot-btn'); }
  private get refreshButton(): Locator              { return this.frame.getByTestId('refreshIconBtn'); }
  private get statusLabels(): Locator               { return this.frame.getByTestId('lui-ccl-object-status-label-container'); }
  private get statusLabel(): Locator                { return this.statusLabels.first(); }
  private get backToProcessFromPowerBar(): Locator  { return this.frame.getByTestId('entityName-PROCESS'); }
  private get alert(): Locator                      { return this.frame.locator('div[class*="MuiAlert-message"]'); }
  /**
   * lui `CannotStartProcessModal` (LuiModal "Process Cannot Be Started", button "Ok"), opened for start errors
   * IBP_PO_50_2042 / IBP_PO_50_2043; the toast text is a fallback in case another code path reports it as a snackbar.
   */
  private get cannotStartModal(): Locator {
    return this.frame.getByRole('dialog').filter({ hasText: 'Process Cannot Be Started' })
      .or(this.alert.filter({ hasText: /Error moving cycle|reached the last cycle/i }))
      .first();
  }
  private get cannotStartModalOk(): Locator         { return this.frame.getByRole('dialog').filter({ hasText: 'Process Cannot Be Started' }).getByRole('button', { name: 'Ok', exact: true }); }

  // --- Listing / navigation ---
  private get getAllProcessButton(): Locator        { return this.frame.getByText('All Processes', { exact: true }).first(); }
  private get listingIcon(): Locator                { return this.frame.getByTestId('listingIcon'); }
  private get addProcess(): Locator {
    return this.frame.getByTestId('lui-ccl-card-cardHeader')
      .filter({ hasText: 'Planning Processes' })
      .getByTestId('add-process')
      .first();
  }
  private get addSubProcess(): Locator {
    return this.frame.getByRole('button', { name: 'Add Process', exact: true })
      .or(this.frame.locator('button[title="Add Process"]'))
      .first();
  }
  private get pageSizeDropdown(): Locator           { return this.frame.locator('div:has(> input#mrt-rows-per-page)'); }

  // --- Confirmation dialog buttons ---
  private get startProcessButton(): Locator         { return this.getPrimaryBtn('Start'); }
  private get closeProcessButton(): Locator         { return this.getPrimaryBtn('Yes, Close'); }

  // --- Create / edit process form ---
  private get displayNameInp(): Locator             { return this.frame.locator('input#displayName'); }
  private get descriptionInp(): Locator             { return this.frame.locator('textarea#description'); }
  private get templateDropdown(): Locator           { return this.getSimpleSelectInput('templateName'); }
  private get calendarDropdown(): Locator           { return this.getSimpleSelectInput('calendarName'); }
  private get cycleNameDropdown(): Locator          { return this.getSimpleSelectInput('cycleName'); }
  private get calcStartDateOnDropdown(): Locator    { return this.getSimpleSelectInput('startOffsetReference'); }
  private get ofSubProcessDropdown(): Locator       { return this.getSimpleSelectInput('referenceNodeName'); }
  private get dataVersionDropdown(): Locator        { return this.frame.locator('input[id="select-select-simple-select+variant"] ~ div').first(); }
  private get offProcessDropdown(): Locator         { return this.frame.locator('div[id="multiselect-select-simple-select+transition.referenceNodeNames"]'); }
  // lui-ccl `LuiSelect` (single selects) opens an MUI Menu: items are role="menuitem", id "select-listitemtext-<key>",
  // aria-label = display name. Multi selects / autocompletes use listbox + option, so both shapes are matched.
  private get dropdownListbox(): Locator            { return this.frame.getByRole('listbox').or(this.frame.getByRole('menu')).first(); }
  private get dropdownOptions(): Locator {
    return this.frame.getByRole('listbox').getByRole('option')
      .or(this.frame.getByRole('menu').getByRole('menuitem'))
      .or(this.frame.locator('li[id^="select-listitemtext-"]'));
  }

  // --- Settings ---
  private get addProcedureBtn(): Locator            { return this.frame.getByTestId('add-procedure-config-btn'); }

  private getSimpleSelectInput(field: string): Locator {
    return this.frame.locator(`input[id="select-select-simple-select+${field}"]`);
  }

  private getPrimaryBtn(buttonName: string): Locator {
    return this.frame.locator('button').filter({ hasText: exactText(buttonName), visible: true }).first();
  }

  private getDropdownItem(optionName: string): Locator {
    return this.frame.getByRole('option', { name: optionName, exact: true })
      .or(this.frame.getByRole('menuitem', { name: optionName, exact: true }))
      .or(this.frame.locator('li[id] span').filter({ hasText: exactText(optionName), visible: true }))
      .first();
  }

  // `@by/plan-sop-ui-library` CommonDatatable renders the name as a link only when the column field is title, name or
  // `linkFieldName`; columns are tenant-configured, so some tables (PSManual3's sub processes on Gravitee pspoat-test1)
  // show plain text in a clickable row. The cell fallback clicks the row, which runs the same onRowClick; it skips cells
  // that hold a link, since a cell precedes its link in DOM order and `.first()` would pick the cell over the link.
  private getProcess(processName: string): Locator {
    return this.frame.getByRole('link', { name: processName, exact: true })
      .or(this.frame.locator('a').filter({ hasText: exactText(processName) }))
      .or(this.frame.getByRole('cell', { name: processName, exact: true }).filter({ hasNot: this.page.locator('a') }))
      .first();
  }

  private getMenuItem(itemName: string): Locator {
    return this.frame.getByRole('menuitem', { name: itemName, exact: true })
      .or(this.frame.getByRole('listitem', { name: itemName, exact: true }))
      .or(this.frame.locator('li').filter({ hasText: exactText(itemName), visible: true }))
      .first();
  }

  private getLeftPaneLink(linkName: string): Locator {
    return this.frame.getByRole('button', { name: linkName, exact: true })
      .or(this.frame.locator(`button[aria-label="${linkName}"]`))
      .first();
  }

  private getTab(tabName: string): Locator {
    return this.frame.locator(`[id="simple-tab-${tabName}"]`);
  }

  private getThreeDotMenu(subProcessName: string): Locator {
    return this.frame.locator('tr')
      .filter({ has: this.getProcess(subProcessName) })
      .getByTestId('lui-ccl-threedot-menu-icon-button')
      .first();
  }

  private getMenuItemOfSubProcess(itemName: string): Locator {
    return this.frame.locator('div[role="button"] span').filter({ hasText: exactText(itemName) }).first();
  }

  private getPageSize(size: string): Locator {
    return this.frame.getByRole('option', { name: size, exact: true })
      .or(this.frame.locator(`li[class][data-value="${size}"]`))
      .first();
  }

  private getDataVersionChip(chipValue: string): Locator {
    return this.frame.locator('p[data-testid="lui-ccl-object-status-label-container"]').filter({ hasText: exactText(chipValue) });
  }

  private getRowStatus(dataIndex: number): Locator {
    return this.frame.locator(`tr[data-index="${dataIndex}"] [data-testid="lui-ccl-object-status-label-container"]`).first();
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  protected async log(level: string, message: string): Promise<void> {
    await this.objCommonFunctions.logMessage(level, message);
  }

  /** Opens a lui-ccl simple select and picks `option` from its listbox. */
  protected async selectFromDropdown(dropdown: Locator, option: string, dropdownName: string): Promise<void> {
    await this.doClick(dropdown, `Clicking on ${dropdownName} dropdown`);
    await this.doClick(this.getDropdownItem(option), `Selecting ${option} from ${dropdownName} dropdown`);
  }

  /** Waits for a dropdown's listbox to render; some selects show "No options" without a listbox, so this never throws. */
  protected async waitForListbox(): Promise<void> {
    await this.dropdownListbox.waitFor({ state: 'visible', timeout: getTimeout('SHORT') }).catch(() => null);
  }

  protected async isMenuItemDisabled(menuItem: Locator): Promise<boolean> {
    const ariaDisabled = await menuItem.getAttribute('aria-disabled').catch(() => null);
    const classAttr = (await menuItem.getAttribute('class').catch(() => null)) ?? '';
    return ariaDisabled === 'true' || classAttr.includes('Mui-disabled');
  }

  /** Re-runs `predicate` until it returns true or `timeoutMs` passes. Unlike `expect.poll`, a miss is not reported as a failed step. */
  protected async pollUntil(predicate: () => Promise<boolean>, timeoutMs: number, intervalMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (!(await predicate())) {
      if (Date.now() + intervalMs > deadline) {
        return false;
      }
      await waitForDelay(this.page, intervalMs);
    }
    return true;
  }

  protected expectedStatusAfter(action: ProcessAction): string {
    return action === 'Start Process' ? 'In Progress' : 'Completed';
  }

  /** "Completed" also accepts "Auto Completed" (a parent closes automatically once all its children are closed). */
  protected isStatusMatch(actual: string, expected: string): boolean {
    const normalizedActual = actual.trim().toLowerCase();
    const normalizedExpected = expected.trim().toLowerCase();
    return normalizedActual === normalizedExpected
      || (normalizedExpected === 'completed' && normalizedActual === 'auto completed')
      || (normalizedExpected === 'auto completed' && normalizedActual === 'completed');
  }

  // ---------------------------------------------------------------------------
  // Atomic actions
  // ---------------------------------------------------------------------------

  public async getPageTitle(expectedTitle?: string): Promise<string> {
    await this.pageTitle.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });

    if (expectedTitle) {
      await expect.poll(async () => {
        const polledText = await this.doGetText(this.pageTitle, 'Getting page title');
        await this.log('INFO', `Page title is :: ${polledText}`);
        return polledText.trim();
      }, {
        timeout: getTimeout('EXTREME'),
        message: `Waiting for process title to match ${expectedTitle}`
      }).toBe(expectedTitle);
      return expectedTitle;
    }

    const text = await this.doGetText(this.pageTitle, 'Getting page title');
    await this.log('INFO', `Page title is :: ${text}`);
    return text;
  }

  public async getProcessStatusLabelText(): Promise<string> {
    const text = await this.doGetText(this.statusLabel, 'Getting process status label');
    await this.log('INFO', `Process status label is :: ${text}`);
    return text;
  }

  public async clickOnAddProcess(): Promise<void> {
    await this.addProcess.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.addProcess, 'Clicking on add process button');
  }

  public async clickOnAddSubProcess(): Promise<void> {
    await this.addSubProcess.waitFor({ state: 'attached', timeout: getTimeout('EXTREME') });
    await this.doClick(this.addSubProcess, 'Clicking on add sub process button');
  }

  public async clickOnAddProcedureBtn(): Promise<void> {
    await this.addProcedureBtn.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.addProcedureBtn, 'Clicking on Add Procedure button');
  }

  public async selectTemplateItem(template: string): Promise<void> {
    await this.selectFromDropdown(this.templateDropdown, template, 'template');
  }

  public async selectCycleDropdownItem(cycleName: string): Promise<void> {
    await this.selectFromDropdown(this.cycleNameDropdown, cycleName, 'cycle name');
  }

  public async selectCalendarItem(calendar: string): Promise<void> {
    await this.selectFromDropdown(this.calendarDropdown, calendar, 'calendar');
  }

  public async selectCalculateStartDateOn(calculateStartDateOn: string): Promise<void> {
    await this.selectFromDropdown(this.calcStartDateOnDropdown, calculateStartDateOn, 'Calculate Start date on');
  }

  public async selectDataVersionItem(dataVersion: string): Promise<void> {
    await this.dataVersionDropdown.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.dataVersionDropdown, 'Clicking Data Version Dropdown');
    await this.doClick(this.getDropdownItem(dataVersion), `Selecting data version: ${dataVersion}`);
  }

  public async setDescription(description: string): Promise<void> {
    await this.clearAndSetInputValue(this.descriptionInp, description);
    await this.log('INFO', `Setting ${description} in description input`);
  }

  public async setDisplayName(displayName: string): Promise<void> {
    await this.clearAndSetInputValue(this.displayNameInp, displayName);
    await this.log('INFO', `Setting ${displayName} in display name input`);
  }

  /** Clicks a visible button by its exact text, e.g. `Create`, `Save`, `Delete`. */
  public async processActions(buttonName: string): Promise<void> {
    const button = this.getPrimaryBtn(buttonName);
    await button.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(button, `Clicking on ${buttonName} button`);
  }

  public async isProcessExist(processName: string): Promise<boolean> {
    const processEle = this.getProcess(processName);
    try {
      await processEle.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
      await processEle.scrollIntoViewIfNeeded().catch(() => null);
      const isProcessCreated = await this.doesElementExist(processEle, `Checking if process ${processName} exists`);
      await this.log('INFO', `Is process created :: ${isProcessCreated}`);
      return isProcessCreated;
    } catch (error) {
      await this.log('ERROR', `Process ${processName} not found: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  public async clickOnThreeDotMenu(): Promise<void> {
    await this.dismissAnyAlertToast();
    await this.threeDotMenu.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.threeDotMenu, 'Clicking on three dot menu in process details page');
  }

  public async clickOnMenuItem(itemName: string): Promise<void> {
    await this.dismissAnyAlertToast();
    const menuItemEle = this.getMenuItem(itemName);
    await menuItemEle.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    if (await this.isMenuItemDisabled(menuItemEle)) {
      throw new Error(`Menu item '${itemName}' is disabled and cannot be clicked`);
    }
    await this.doClick(menuItemEle, `Clicking on menu item: ${itemName}`);
  }

  /** True when the three-dot menu item is visible and enabled. */
  public async processMenuExists(menuItem: string): Promise<boolean> {
    const menuItemElement = this.getMenuItem(menuItem);
    if (!(await this.waitForElementVisible(menuItemElement, getTimeout('SHORT')))) {
      await this.log('INFO', `❌ Menu item '${menuItem}' does not exist.`);
      return false;
    }
    if (await this.isMenuItemDisabled(menuItemElement)) {
      await this.log('INFO', `🚫 Menu '${menuItem}' is disabled.`);
      return false;
    }
    return true;
  }

  public async refreshProcess(): Promise<void> {
    await this.doClick(this.refreshButton, 'Clicking on refresh button');
  }

  public async refreshAndGetStatus(): Promise<string> {
    await this.refreshProcess();
    await this.statusLabel.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    const statusText = await this.doGetText(this.statusLabel, 'Getting Entity status');
    await this.log('INFO', `Status::  ${statusText}`);
    return statusText;
  }

  public async clickLeftpaneLink(sLinkname: string): Promise<void> {
    const leftPaneLink = this.getLeftPaneLink(sLinkname);
    await leftPaneLink.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(leftPaneLink, `Clicking Left Pane Link: ${sLinkname}`);
  }

  public async alertMsg(message: string): Promise<boolean> {
    // Wait for the toast carrying `message`, so an older toast still on screen is not read instead.
    const matchingAlert = this.alert.filter({ hasText: message }).first();
    const isMatchShown = await matchingAlert.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') }).then(() => true, () => false);
    const text = await this.doGetText(isMatchShown ? matchingAlert : this.alert.first(), 'Getting alert message', getTimeout('SHORT'));
    await this.log('INFO', `Alert :: ${text}`);
    return text.includes(message);
  }

  public async clickOnTabInSubProcess(tabName: string): Promise<void> {
    const tabEle = this.getTab(tabName);
    await tabEle.waitFor({ state: 'attached', timeout: getTimeout('XLARGE') });
    await this.doClick(tabEle, `Clicking on tab: ${tabName}`);
  }

  /** Picks the first option of the "Start Process On … of process" multiselect. */
  public async setOffProcess(): Promise<void> {
    await this.offProcessDropdown.waitFor({ state: 'attached', timeout: getTimeout('EXTREME') });
    await this.doClick(this.offProcessDropdown, 'Clicking on off process dropdown');
    await this.waitForListbox();
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
  }

  public async setPageSize(size: string): Promise<void> {
    await this.pageSizeDropdown.waitFor({ state: 'attached', timeout: getTimeout('XLARGE') });
    await this.pageSizeDropdown.scrollIntoViewIfNeeded().catch(() => null);
    await this.doClick(this.pageSizeDropdown, 'Clicking Page Size Dropdown');
    await this.doClick(this.getPageSize(size), `Selecting Page Size: ${size}`);
  }

  public async clickOnThreeDotMenuOfSubProcess(subProcessName: string): Promise<void> {
    await this.doClick(this.getThreeDotMenu(subProcessName), `Clicking three dot menu for subprocess: ${subProcessName}`);
  }

  public async clickOnItem(itemName: string): Promise<void> {
    await this.doClick(this.getMenuItemOfSubProcess(itemName), `Clicking menu item: ${itemName}`);
  }

  // ---------------------------------------------------------------------------
  // Composite actions
  // ---------------------------------------------------------------------------

  public async goToSubProcessDetailsPage(processName: string, subProcessName: string): Promise<void> {
    await this.clickOnProcess(processName);
    await this.log('INFO', `Clicked on process ${processName}`);
    await this.clickOnProcess(subProcessName, false);
    await this.page.waitForURL(url => url.toString().includes('subprocess') || url.toString().includes('processplan'), { timeout: getTimeout('EXTREME') });
    await this.log('INFO', `Clicked on sub-process ${subProcessName}`);
  }

  public async goToPOListingPageAndVerify(): Promise<string> {
    await this.doClick(this.getAllProcessButton, 'Clicked on All Process button');

    const poPath = (process.env.POLINK || '').replace(/\/+$/, '');
    if (poPath) {
      await this.page.waitForURL((url) => url.toString().includes(poPath) && !url.toString().includes('/process/'), { timeout: getTimeout('EXTREME') }).catch(() => null);
    }

    const listingTitle = this.pageTitle.filter({ hasText: 'Process Orchestration' })
      .or(this.frame.getByText('Process Orchestration', { exact: true }))
      .first();
    const isListingShown = await listingTitle.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') }).then(() => true, () => false);
    if (!isListingShown) {
      // lui's lastRememberedEntity can mount the previous process summary instead of the listing; reopen All Processes once.
      await this.log('WARN', 'PO listing not shown after All Processes; retrying from the listing icon');
      await this.doClick(this.listingIcon, 'Clicked Listing Icon');
      await this.doClick(this.getAllProcessButton, 'Clicked on All Process button (retry)');
      await listingTitle.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    }
    return await this.getPageTitle('Process Orchestration');
  }

  public async fillCreateProcessForm(displayName: string, calendar: string, cycleName: string, description: string, template?: string, dataVersion?: string): Promise<void> {
    await this.log('INFO', 'Creating process');
    if (template) {
      await this.selectTemplateItem(template);
    }
    await this.setDisplayName(displayName);
    if (dataVersion) {
      await this.selectDataVersionItem(dataVersion);
    }
    await this.selectCalendarItem(calendar);
    await this.selectCycleDropdownItem(cycleName);
    await this.setDescription(description);
  }

  /** `default` must show no chip; any other data version must show a chip with exactly that text. */
  public async dataVersionChipValidation(dataVersion: string): Promise<boolean> {
    const dataVersionChipEle = this.getDataVersionChip(dataVersion);
    try {
      if (dataVersion.toLowerCase() === 'default') {
        const isChipShown = await this.waitForElementVisible(dataVersionChipEle, getTimeout('SHORT'));
        await this.log('INFO', isChipShown
          ? "Chip is visible but should not be for 'default' version"
          : "Chip is not visible as expected for 'default' version");
        return !isChipShown;
      }

      const chipText = await this.doGetText(dataVersionChipEle, `Getting data version chip '${dataVersion}'`, getTimeout('XLARGE'));
      const isValid = chipText.trim() === dataVersion;
      await this.log('INFO', `Chip validation for '${dataVersion}': found text='${chipText}', valid=${isValid}`);
      return isValid;
    } catch (error) {
      await this.log('ERROR', `Error in chip validation: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /** Opens `processName` from the listing (or a sub-process from the summary table); no-op when it is already open. */
  public async clickOnProcess(processName: string, waitForURLToLoad: boolean = true): Promise<void> {
    const escapedName = processName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isUrlMatch = new RegExp(`/process/${escapedName}(?:/|$|\\?)`).test(this.page.url());
    const isTitleMatch = (await this.pageTitle.textContent({ timeout: getTimeout('SHORT') }).catch(() => ''))?.trim() === processName;
    if (isUrlMatch || isTitleMatch) {
      await this.log('INFO', `Already on ${processName} process`);
      return;
    }

    if (!(await this.isProcessExist(processName))) {
      await this.log('FAIL', `Unable to click on ${processName} process`);
      return;
    }

    await this.doClick(this.getProcess(processName), `Clicking on process: ${processName}`);
    if (waitForURLToLoad) {
      await this.page.waitForURL(url => url.toString().includes('summary'), { timeout: getTimeout('EXTREME') });
    }
  }

  /**
   * Clicks Start Process / Close Process in the open three-dot menu and confirms the dialog.
   * Callers read the result with `refreshAndVerifyStatus` / `waitForStatus` / `verifyGrandchildStatusText`, which all poll.
   */
  public async handleProcessMenuClick(action: ProcessAction): Promise<void> {
    await this.clickOnMenuItem(action);
    const confirmButton = action === 'Start Process' ? this.startProcessButton : this.closeProcessButton;
    await this.doClick(confirmButton, `Clicking on ${action} button`);
    await confirmButton.waitFor({ state: 'hidden', timeout: getTimeout('MEDIUM') }).catch(() => null);
  }

  /**
   * Opens the three-dot menu until `action` is shown enabled, leaving the menu open. Between attempts it closes the menu and
   * refreshes, because right after navigation or a parent's start the menu can be empty or built from the previous status.
   */
  public async openMenuWithAction(action: ProcessAction, timeoutKey: TimeoutKey = 'XLARGE'): Promise<boolean> {
    return await this.pollUntil(async () => {
      await this.clickOnThreeDotMenu();
      if (await this.processMenuExists(action)) {
        return true;
      }
      await this.page.keyboard.press('Escape');
      await this.refreshProcess().catch(() => null);
      return false;
    }, getTimeout(timeoutKey), TIMEOUTS.POLL_INTERVAL * 4);
  }

  /**
   * Opens the three-dot menu and runs `action` once it is enabled.
   * `statusMatched` is false when the menu item was unavailable or the status never reached the expected value.
   */
  public async runProcessAction(action: ProcessAction): Promise<{ menuAvailable: boolean; statusMatched: boolean }> {
    const menuAvailable = await this.openMenuWithAction(action, 'LONG');
    if (!menuAvailable) {
      await this.log('FAIL', `'${action}' is not available in the process menu`);
      return { menuAvailable, statusMatched: false };
    }
    if (action === 'Start Process') {
      await this.startFromOpenMenu();
    } else {
      await this.handleProcessMenuClick(action);
    }
    return { menuAvailable, statusMatched: await this.refreshAndVerifyStatus(action) };
  }

  /**
   * Starts the open process from whatever state it is in (closing it first if it is running). True when it reads In Progress.
   * `fromFirstCycle` also moves the process back to the first cycle of its calendar before starting. Every start of a
   * Completed process uses up a cycle, and near the end of the calendar the cycles behave differently (missing child rows,
   * sub-processes already complete), so specs that run several start/close rounds should begin from the first cycle.
   */
  public async restartProcess(options: { fromFirstCycle?: boolean } = {}): Promise<boolean> {
    await this.clickOnThreeDotMenu();
    const { start } = await this.waitForProcessActionMenu();
    if (!start) {
      await this.log('INFO', 'Process not in startable state, closing first');
      await this.handleProcessMenuClick('Close Process');
      await this.refreshAndVerifyStatus('Close Process');
      await this.clickOnThreeDotMenu();
    }
    if (options.fromFirstCycle) {
      await this.page.keyboard.press('Escape');
      await this.resetProcessToFirstCycle();
      await this.clickOnThreeDotMenu();
    }
    await this.log('INFO', 'Starting the process');
    await this.startFromOpenMenu();
    return await this.refreshAndVerifyStatus('Start Process');
  }

  /**
   * Clicks Start Process in the open three-dot menu. Starting a Completed process moves it to the next calendar cycle; when
   * it is already on the last cycle the PO service rejects the start (IBP_PO_50_2042/2043), lui shows the "Process Cannot Be
   * Started" modal and the process stays Completed. Then the process is moved back to the first cycle and started again.
   */
  public async startFromOpenMenu(): Promise<void> {
    await this.handleProcessMenuClick('Start Process');
    if (!(await this.waitForElementVisible(this.cannotStartModal, getTimeout('SHORT')))) {
      return;
    }
    const errorText = (await this.cannotStartModal.textContent().catch(() => ''))?.replace(/\s+/g, ' ').trim();
    await this.log('WARNING', `Start rejected (${errorText}). Moving the process back to its first calendar cycle and retrying.`);
    if (await this.cannotStartModalOk.isVisible().catch(() => false)) {
      await this.doClick(this.cannotStartModalOk, 'Closing "Process Cannot Be Started" modal');
      await this.cannotStartModalOk.waitFor({ state: 'hidden', timeout: getTimeout('SHORT') }).catch(() => null);
    }
    await this.resetProcessToFirstCycle();
    await this.clickOnThreeDotMenu();
    await this.handleProcessMenuClick('Start Process');
  }

  /** Edit Details → picks the first cycle of the process's calendar → Save; the process then reads Not Started. Returns the cycle picked. */
  public async resetProcessToFirstCycle(): Promise<string> {
    await this.dismissAnyAlertToast();
    await this.clickOnThreeDotMenu();
    await this.clickOnMenuItem('Edit Details');
    await this.cycleNameDropdown.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.cycleNameDropdown, 'Clicking on cycle name dropdown');
    await this.waitForListbox();
    // Scoped to the cycle menu (other menus stay mounted); item ids skip LuiSelect's optional search row, which is also a menu item.
    const cycleItems = 'li[id^="select-listitemtext-"]';
    const firstCycle = this.frame.locator('[id="select-menu-simple-select+cycleName"]').locator(cycleItems)
      .or(this.frame.getByRole('menu').filter({ visible: true }).locator(cycleItems))
      .first();
    await firstCycle.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    const cycleName = ((await firstCycle.getAttribute('aria-label')) || (await firstCycle.textContent()) || '').trim();
    await this.doClick(firstCycle, `Selecting first cycle: ${cycleName}`);
    await this.processActions('Save');
    const isUpdated = await this.alertMsg('has been updated');
    await this.log(isUpdated ? 'INFO' : 'FAIL', `Process cycle reset to '${cycleName}': ${isUpdated}`);
    const status = await this.waitForStatus('Not Started', 'LONG');
    await this.log('INFO', `Status after cycle reset: ${status}`);
    return cycleName;
  }

  public async waitForProcessActionMenu(): Promise<{ start: boolean; close: boolean }> {
    let menu = { start: false, close: false };
    await expect.poll(async () => {
      menu = {
        start: await this.processMenuExists('Start Process'),
        close: await this.processMenuExists('Close Process')
      };
      return menu.start || menu.close;
    }, { timeout: getTimeout('XLARGE'), intervals: [TIMEOUTS.POLL_INTERVAL] }).toBe(true);
    return menu;
  }

  /** Makes sure the Process Summary panel (refresh button + status) is shown, switching to it from the left pane if needed. */
  public async ensureProcessSummaryTab(): Promise<void> {
    try {
      const isSummaryShown = await this.waitForElementVisible(this.refreshButton, getTimeout('SHORT'));
      if (isSummaryShown) {
        return;
      }
      await this.log('INFO', 'Process Summary not active, switching tab...');
      await this.clickLeftpaneLink('Process Summary');
      await this.refreshButton.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') }).catch(() => null);
    } catch (error) {
      await this.log('WARN', `ensureProcessSummaryTab: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Refreshes until the status is exactly `expectedStatus` (case-insensitive) or `timeoutKey` passes; returns the last status read. */
  public async waitForStatus(expectedStatus: string, timeoutKey: TimeoutKey = 'XLARGE'): Promise<string> {
    let statusText = '';
    await this.pollUntil(async () => {
      statusText = (await this.refreshAndGetStatus()).trim();
      return statusText.toLowerCase() === expectedStatus.trim().toLowerCase();
    }, getTimeout(timeoutKey), TIMEOUTS.SHORT / 2);
    return statusText;
  }

  /**
   * Refreshes until the status matches what `action` should produce (In Progress / Completed or Auto Completed).
   * Returns false if it still does not match after the XLARGE timeout.
   */
  public async refreshAndVerifyStatus(action: ProcessAction): Promise<boolean> {
    const expectedStatus = this.expectedStatusAfter(action);
    let statusText = '';
    const isMatch = await this.pollUntil(async () => {
      statusText = await this.refreshAndGetStatus();
      return this.isStatusMatch(statusText, expectedStatus);
    }, getTimeout('XLARGE'), TIMEOUTS.SHORT / 2);

    await this.log('INFO', isMatch
      ? `✅ Status is ${statusText.trim()}`
      : `❌ Expected status: ${expectedStatus}, but got: ${statusText}`);
    return isMatch;
  }

  public async clickSubProcess(subprocess: string): Promise<boolean> {
    await this.log('INFO', `Attempting to click the subprocess: ${subprocess}`);
    // The link opens the sub-process's Planning view when WITH_ROUTE_TO_PS is enabled; the PO header title only shows once
    // Process Summary is active, so it is checked after that switch. It is the only reliable signal: the portal URL also
    // matches on the parent, and right after a parent start/close the click can be swallowed, leaving the parent open.
    const isSubProcessOpen = async (): Promise<boolean> => {
      const title = (await this.pageTitle.textContent({ timeout: getTimeout('SHORT') }).catch(() => ''))?.trim();
      if (!title) return false;
      const normalizedTitle = title.replace(/\s+/g, '').toLowerCase();
      const normalizedExpected = subprocess.replace(/\s+/g, '').toLowerCase();
      return normalizedTitle === normalizedExpected;
    };

    try {
      for (let attempt = 1; attempt <= 2; attempt++) {
        if (await isSubProcessOpen()) {
          await this.log('INFO', `Sub-process ${subprocess} is already open`);
          return true;
        }

        await this.ensureProcessSummaryTab();
        const subProcessLink = this.getProcess(subprocess);
        await subProcessLink.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
        await subProcessLink.scrollIntoViewIfNeeded().catch(() => null);
        await this.doClick(subProcessLink, `Clicked on subprocess: ${subprocess}`);
        await this.page.waitForURL(url => url.toString().includes('subprocess') || url.toString().includes('processplan'), { timeout: getTimeout('XLARGE') }).catch(() => null);

        // If routed to Planning Space (e.g. WITH_ROUTE_TO_PS feature toggle enabled on Gravitee),
        // switch to the PO Process Summary view for the sub-process.
        if (this.page.url().includes('processplan') || this.page.url().includes('ibppsintegration')) {
          await this.log('INFO', `Landed on Planning view for ${subprocess}, navigating directly to PO Process Summary...`);
          const poSummaryUrl = this.page.url()
            .replace('/ibppsintegration/', '/pointegration/')
            .replace('/processplan/', '/summary/')
            .replace(/\/link\/\d+/, '/link/0');
          await this.page.goto(poSummaryUrl);
          await this.page.waitForURL(url => url.toString().includes('pointegration') && url.toString().includes('summary'), { timeout: getTimeout('XLARGE') }).catch(() => null);
        }

        await this.ensureProcessSummaryTab();
        if (await this.pollUntil(isSubProcessOpen, getTimeout('XLARGE'), TIMEOUTS.POLL_INTERVAL)) {
          return true;
        }

        // If the URL points to the subprocess but PO header has not updated, reload to let PO re-render
        if (this.page.url().includes('subprocess') && !await isSubProcessOpen()) {
          await this.log('INFO', `URL has subprocess but header not updated, reloading page...`);
          await this.page.reload();
          await this.ensureProcessSummaryTab();
          if (await this.pollUntil(isSubProcessOpen, getTimeout('XLARGE'), TIMEOUTS.POLL_INTERVAL)) {
            return true;
          }
        }

        const shownTitle = (await this.pageTitle.textContent({ timeout: getTimeout('SHORT') }).catch(() => ''))?.trim();
        await this.log('WARNING', `Sub-process ${subprocess} did not open (attempt ${attempt}); header reads '${shownTitle}', URL ${this.page.url()}`);
      }
      await this.log('FAIL', `❌ Sub-process ${subprocess} did not open; the header still reads another process`);
      return false;
    } catch (error) {
      await this.log('FAIL', `❌ Subprocess ${subprocess} link not found: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  public async backToProcessFromSupProcess(): Promise<void> {
    try {
      if (!this.page.url().includes('subprocess')) {
        await this.ensureProcessSummaryTab();
        return;
      }
      const isPowerBarBackVisible = await this.backToProcessFromPowerBar.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') }).then(() => true, () => false);
      if (isPowerBarBackVisible) {
        await this.doClick(this.backToProcessFromPowerBar, 'Going back to Process from Powerbar');
        await this.page.waitForURL(url => !url.toString().includes('subprocess'), { timeout: getTimeout('XLARGE') }).catch(() => null);
      }
      if (this.page.url().includes('subprocess')) {
        const parentUrl = this.page.url().replace(/\/subprocess\/[^\/]+/, '');
        await this.log('INFO', `Still on sub-process URL, navigating directly to parent process: ${parentUrl}`);
        await this.page.goto(parentUrl);
        await this.page.waitForURL(url => !url.toString().includes('subprocess'), { timeout: getTimeout('XLARGE') }).catch(() => null);
      }
      await this.ensureProcessSummaryTab();
    } catch (error) {
      await this.log('INFO', `backToProcessFromSupProcess: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Checks the sub-process status and its three grandchild rows after `action`. */
  public async checkSubProcessStatus(subprocess: string, action: ProcessAction): Promise<boolean> {
    await this.log('INFO', `Checking ${subprocess} status.`);
    const subProcessStatus = await this.refreshAndVerifyStatus(action);
    const isStart = action === 'Start Process';
    const grandchildProcess1 = await this.verifyGrandchildStatusText(0, isStart ? 'In Progress' : 'Auto Completed');
    const grandchildProcess2 = await this.verifyGrandchildStatusText(1, isStart ? 'Not Started' : 'Auto Completed');
    const grandchildProcess3 = await this.verifyGrandchildStatusText(2, isStart ? 'Not Started' : 'Auto Completed');
    await this.log('INFO', `Subprocess Status: ${subProcessStatus}, Grandchild Process 1: ${grandchildProcess1}, Grandchild Process 2: ${grandchildProcess2}, Grandchild Process 3: ${grandchildProcess3}`);
    return subProcessStatus && grandchildProcess1 && grandchildProcess2 && grandchildProcess3;
  }

  /**
   * Waits (up to XLARGE, refreshing between reads) for table row `dataIndex` to exist and its status to read `expectedText`.
   * Child rows and statuses propagate after the parent's, and the table only re-reads them on refresh.
   */
  public async verifyGrandchildStatusText(dataIndex: number, expectedText: string): Promise<boolean> {
    const rowStatus = this.getRowStatus(dataIndex);
    let isRowFound = false;
    let actualText = '';
    const isMatch = await this.pollUntil(async () => {
      if (await rowStatus.isVisible().catch(() => false)) {
        isRowFound = true;
        actualText = ((await rowStatus.textContent().catch(() => '')) ?? '').trim();
        if (this.isStatusMatch(actualText, expectedText)) {
          return true;
        }
      }
      await this.refreshProcess().catch(() => null);
      await rowStatus.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') }).catch(() => null);
      return false;
    }, getTimeout('XLARGE'), TIMEOUTS.POLL_INTERVAL * 4);

    if (!isRowFound) {
      await this.log('ERROR', `❌ Element not found at data-index ${dataIndex}. Expected Status: "${expectedText}"`);
      return false;
    }
    await this.log('INFO', `Element found at data-index ${dataIndex}. Expected Status: "${expectedText}", Actual Status: "${actualText}"`);
    return isMatch;
  }

  /** Opens `subprocess`, runs `action` from its three-dot menu, and verifies the sub-process and grandchild statuses. */
  public async actionSubProcess(subprocess: string, action: ProcessAction): Promise<boolean> {
    if (!(await this.clickSubProcess(subprocess))) {
      await this.log('FAIL', `Could not open sub-process ${subprocess}, skipping ${action} flow.`);
      return false;
    }
    // The three-dot menu enables Start/Close from the loaded sub-process status, which lags the parent's start/close.
    await this.statusLabel.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') }).catch(() => null);
    if (!(await this.openMenuWithAction(action))) {
      await this.log('FAIL', `${action} not found, skipping ${action} flow.`);
      return false;
    }

    await this.log('INFO', `${action} found, executing ${action} flow.`);
    await this.handleProcessMenuClick(action);
    const isStatusCorrect = await this.refreshAndVerifyStatus(action);
    await this.log('INFO', `Status after ${action} execution: ${isStatusCorrect}`);
    const subprocessStatus = await this.checkSubProcessStatus(subprocess, action);
    await this.log('INFO', `Subprocess status after ${action}: ${subprocessStatus}`);
    return isStatusCorrect && subprocessStatus;
  }

  public async fillSubProcessForm(displayName?: string, description?: string, isOffProcessFieldExist?: boolean): Promise<void> {
    if (displayName) {
      await this.setDisplayName(displayName);
    }
    if (description) {
      await this.setDescription(description);
    }
    if (isOffProcessFieldExist) {
      await this.clickOnTabInSubProcess('Start Process On');
      await this.setOffProcess();
      await this.page.keyboard.press('Escape');
    }
  }

  /** True if `processName` is offered in the "Of sub-process" dropdown. */
  public async validateSubProcessFields(processName: string): Promise<boolean> {
    await this.doClick(this.ofSubProcessDropdown, 'Clicking on Of subprocess dropdown');
    await this.waitForListbox();
    // Select menus stay mounted after closing, so only the open referenceNodeName menu's (visible) items are read.
    const optionTexts = (await this.dropdownOptions.filter({ visible: true }).allTextContents()).map(text => text.trim());
    const processExists = optionTexts.includes(processName);
    await this.log('INFO', `Process ${processName} exists in dropdown: ${processExists}`);
    return processExists;
  }
}
