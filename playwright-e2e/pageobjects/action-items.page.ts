import { Page, Locator, FrameLocator, expect } from '@playwright/test';
import BasePage from './page';
import { CommonFunctions } from '../util/common.util';
import { getTimeout, TIMEOUTS } from '../constants/timeouts'

// Whole-text match, like XPath text()='…'; escapes regex characters in the label.
const exactText = (text: string): RegExp => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

export class ActionItemsPage extends BasePage {
  private objCommonFunctions: CommonFunctions

  constructor(page: Page) {
    super(page);
    this.objCommonFunctions = new CommonFunctions();
  }

  /*
   * Locators. Source: plan-sop-lui `src/Components/ProcessOrchestration/ActionItems/ActionItemDetails.tsx`
   * (create button `aria-label="createNew"` + `title="Create new"`, SplitButton bulk actions, LuiThreeDotMenu row
   * actions), `StatusChange.tsx` (`simple-select-bulk-status-change`), `Common/ActionItemFormModal`, and
   * `Common/Tooltip` (a disabled menu item renders `div.tooltip-content[aria-label=<no-access tooltip>] > div`;
   * an enabled one renders its label in a `span`). `lui-ccl-*` test IDs come from @jda/lui-common-component-library-mui5.
   */
  private get mfe(): FrameLocator                   { return this.getMfeFrameLocator(); }
  private get iconCreateNew(): Locator              { return this.mfe.getByRole('button', { name: 'createNew', exact: true }).or(this.mfe.getByTitle('Create new', { exact: true })).first(); }
  private get tfldName(): Locator                   { return this.mfe.locator('input#name'); }
  private get ddStatus(): Locator                   { return this.mfe.locator('input[id="select-select-simple-select+status"]'); }
  private get ddBulkActions(): Locator              { return this.mfe.getByTestId('lui-ccl-button-with-dropdown-button'); }
  private get ddBulkStatusChange(): Locator         { return this.mfe.locator('input#select-select-simple-select-bulk-status-change'); }
  private get ddActionType(): Locator               { return this.mfe.locator('input[id="select-select-simple-select+actionType"]'); }
  private get ddPriority(): Locator                 { return this.mfe.locator('input[id="select-select-simple-select+priority"]'); }
  private get iconCalendar(): Locator               { return this.mfe.locator('button[aria-label*="Choose date"]'); }
  private get todaysDate(): Locator                 { return this.mfe.locator('div[class*="MuiDayCalendar-week"] button[aria-selected="true"]'); }
  private get btnCreate(): Locator                  { return this.mfe.getByRole('button', { name: 'Create', exact: true }); }
  private get btnSave(): Locator                    { return this.mfe.getByRole('button', { name: 'Save', exact: true }); }
  private get btnCancel(): Locator                  { return this.mfe.getByRole('button', { name: 'Cancel', exact: true }); }
  private get txtSave(): Locator                    { return this.mfe.getByText(/success/i); }
  private get visibleToasts(): Locator              { return this.txtSave.filter({ visible: true }); }
  private get toastCloseButton(): Locator           { return this.mfe.locator('.MuiSnackbar-root button[aria-label*="close" i], div[role="alert"] button[aria-label*="close" i]').first(); }
  private get openMenu(): Locator                   { return this.mfe.getByRole('menu').filter({ visible: true }); }
  private get gridRows(): Locator                   { return this.mfe.locator('table[class*="MuiTable"] tbody tr'); }
  // While the grid reloads (e.g. after a bulk action) its rows are MUI skeleton placeholders with no text.
  private get gridSkeletons(): Locator              { return this.mfe.locator('table[class*="MuiTable"] tbody .MuiSkeleton-root'); }
  private get ddEdit(): Locator                     { return this.mfe.locator('span', { hasText: exactText('Edit') }); }
  private get ddEditDisabled(): Locator             { return this.disabledMenuItem('Edit'); }
  private get ddDeleteDisabled(): Locator           { return this.disabledMenuItem('Delete'); }
  private get ddBulkChangeDisabled(): Locator       { return this.disabledMenuItem('Change Status'); }
  private get ddBulkDeleteDisabled(): Locator       { return this.disabledMenuItem('Delete'); }
  private get ddDelete(): Locator                   { return this.mfe.locator('span', { hasText: exactText('Delete') }); }
  private get btnDelete(): Locator                  { return this.mfe.getByRole('button', { name: 'Delete', exact: true }); }
  // The form modal is the div whose direct child is its <h2> title; the page filter bar has its own user inputs.
  private get formModal(): Locator                  { return this.mfe.locator('div').filter({ has: this.page.locator(':scope > h2') }); }
  private get tfldAssignedToUnderPopup(): Locator   { return this.formModal.locator('input#tags-standard').nth(0); }
  private get tfldObserver(): Locator               { return this.formModal.locator('input#tags-standard').nth(1); }
  private get tfldDescription(): Locator            { return this.mfe.locator('input#description'); }
  private get tfldRemarks(): Locator                { return this.mfe.locator('textarea#remarks'); }
  private get chckBoxAll(): Locator                 { return this.mfe.getByTestId('lui-ccl-table-checkbox-title'); }
  private get partialAlertMsg(): Locator            { return this.mfe.locator('div[class*="MuiAlert-message"]'); }
  private get pageSizeDropdown(): Locator           { return this.mfe.locator('div').filter({ has: this.page.locator(':scope > input#mrt-rows-per-page') }); }
  private getddBulkAction(action: string)           { return this.mfe.locator('li').filter({ has: this.page.locator(':scope > span', { hasText: exactText(action) }) }); }
  // Live DOM: li[role=menuitem][data-testid=status-dropdown-option][aria-label=<status>] > div > span > span.
  private getBulkChangeStatusOption(status: string) { return this.mfe.getByRole('menuitem', { name: status, exact: true }); }
  private getOption(status: string)                 { return this.mfe.locator('li').filter({ has: this.page.locator('span', { hasText: exactText(status) }) }); }
  private disabledMenuItem(label: string)           { return this.mfe.locator('div.tooltip-content').filter({ has: this.page.locator(':scope > div', { hasText: exactText(label) }) }); }
  private actionItemElement(actionItem: string)     { return this.mfe.locator('a', { hasText: exactText(actionItem) }); }
  private actionItemRow(actionItem: string)         { return this.mfe.locator('tr').filter({ has: this.page.locator('a', { hasText: exactText(actionItem) }) }); }
  private getThreeDotIcon(actionItem: string)       { return this.actionItemRow(actionItem).getByTestId('lui-ccl-threedot-menu-icon-button'); }
  private dataIndexEle(columnName: string)          { return this.mfe.locator('table[class*="MuiTable"] th').filter({ has: this.page.locator('div[class*="Mui-TableHeadCell-Content-Wrapper"]', { hasText: exactText(columnName) }) }); }
  private colValueEle(actionItem: string, dataIndex: string) { return this.actionItemRow(actionItem).locator(`td[data-index="${dataIndex}"]`).first(); }
  private colValuesEle(dataIndex: string)           { return this.mfe.locator(`td[data-index="${dataIndex}"]`); }
  private getPageSize(size: string)                 { return this.mfe.locator(`li[class][data-value="${size}"]`); }
  private getUserOption(userName: string)           { return this.mfe.getByText(userName, { exact: true }); }

  // A success toast left from the previous action covers the Bulk Actions button and would be read as the next
  // action's message, so close it (or let it auto-hide) before starting another action.
  protected async waitForToastToClear(): Promise<void> {
    if (await this.visibleToasts.count() === 0) return;
    if (await this.toastCloseButton.isVisible()) {
      await this.toastCloseButton.click().catch(() => undefined);
    }
    await expect.poll(() => this.visibleToasts.count(), { timeout: getTimeout('LONG'), intervals: [TIMEOUTS.POLL_INTERVAL] }).toBe(0)
      .catch(async () => this.objCommonFunctions.logMessage("INFO", "Success toast still visible; continuing"));
  }

  // The grid renders its header before the rows arrive and shows skeleton rows while reloading; wait until no
  // skeleton is left and the row count holds between two polls.
  protected async waitForGridToSettle(): Promise<void> {
    await this.dataIndexEle("Name").waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    let previousCount = -1;
    await expect.poll(async () => {
      const count = await this.gridRows.count();
      const isStable = count > 0 && count === previousCount && await this.gridSkeletons.count() === 0;
      previousCount = count;
      return isStable;
    }, { timeout: getTimeout('XLARGE'), intervals: [TIMEOUTS.POLL_INTERVAL] }).toBe(true);
  }

  private async readColumnValue(actionItem: string, columnName: string): Promise<string> {
    const dataIndex = await this.dataIndexEle(columnName).getAttribute("data-index");
    return ((await this.colValueEle(actionItem, dataIndex ?? "").textContent()) ?? "").trim();
  }

  public async clickCreateNewIcon() {
    await this.iconCreateNew.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.waitForToastToClear();
    await this.doClick(this.iconCreateNew, "Clicking Create New(+) Icon");
  }

  public async setName(sName: string) {
    await this.tfldName.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doEnterText(this.tfldName, sName, "Entering Action Item Name: " + sName);
  }

  public async selectStatus(sStatus: string) {
    await this.ddStatus.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.ddStatus, "Clicking Status Dropdown");
    await this.getOption(sStatus).waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.getOption(sStatus), "Selecting Status:: " + sStatus);
  }

  public async selectActionType(sActionType: string) {
    await this.ddActionType.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.ddActionType, "Clicking Action Type Dropdown");
    await this.getOption(sActionType).waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.getOption(sActionType), "Selecting Action Type:: " + sActionType);
  }

  public async selectPriority(sPriority: string) {
    await this.ddPriority.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.ddPriority, "Clicking Priority Dropdown");
    await this.getOption(sPriority).waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.getOption(sPriority), "Selecting Priority:: " + sPriority);
  }

  public async selectDueDate() {
    await this.iconCalendar.scrollIntoViewIfNeeded();
    await this.doClick(this.iconCalendar, "Clicking Calendar Icon");
    await this.doClick(this.todaysDate, "Selecting Today's Date");
  }

  public async selectAssignedTo(userName: string) {
    await this.tfldAssignedToUnderPopup.scrollIntoViewIfNeeded();
    await this.doClick(this.tfldAssignedToUnderPopup, "Clicking Assigned Username");
    await this.doEnterText(this.tfldAssignedToUnderPopup, userName.split(" ")[0], "Entering Assigned Username: " + userName.split(" ")[0]);
    await this.doClick(this.getUserOption(userName), "Selecting username: " + userName);
    await this.page.keyboard.press('Tab');
  }

  public async selectObserver(userName: string) {
    await this.tfldObserver.scrollIntoViewIfNeeded();
    await this.doClick(this.tfldObserver, "Clicking Observer Username");
    await this.doEnterText(this.tfldObserver, userName.split(" ")[0], "Entering Observer Username: " + userName.split(" ")[0]);
    await this.doClick(this.getUserOption(userName), "Selecting username: " + userName);
    await this.page.keyboard.press('Tab');
  }

  public async setDescription(sDescription: string) {
    await this.tfldDescription.scrollIntoViewIfNeeded();
    await this.doEnterText(this.tfldDescription, sDescription, "Entering Description: " + sDescription);
  }

  public async setRemarks(sRemarks: string) {
    await this.tfldRemarks.scrollIntoViewIfNeeded();
    await this.doEnterText(this.tfldRemarks, sRemarks, "Entering Remarks: " + sRemarks);
  }

  public async clickSave() {
    await this.btnSave.scrollIntoViewIfNeeded();
    await this.btnSave.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.btnSave, "Clicking Save Button");
  }

  public async clickCreate() {
    await this.btnCreate.scrollIntoViewIfNeeded();
    await this.btnCreate.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.btnCreate, "Clicking Create Button");
  }

  public async clickCancel() {
    await this.btnCancel.scrollIntoViewIfNeeded();
    await this.btnCancel.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.btnCancel, "Clicking Cancel Button");
  }

  public async setPageSize(size: string) {
    await this.pageSizeDropdown.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.pageSizeDropdown.scrollIntoViewIfNeeded();
    await this.doClick(this.pageSizeDropdown, "Clicking Page Size Dropdown");
    await this.doClick(this.getPageSize(size), "Selecting Page Size: " + size);
  }

  public async getSuccessMsg() {
    const toast = this.visibleToasts.last();
    await toast.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    let success: string = await this.doGetText(toast, "Fetch Success Message");
    await this.objCommonFunctions.logMessage("INFO", success);
    return success;
  }

  public async getPartialAlertMsg() {
    let msg: string = await this.doGetText(this.partialAlertMsg, "Fetch Partial Alert Message");
    await this.objCommonFunctions.logMessage("INFO", msg);
    return msg;
  }

  public async clickThreeDotIconForActionItem(actionItem: string) {
    await this.getThreeDotIcon(actionItem).waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.waitForToastToClear();
    await this.doClick(this.getThreeDotIcon(actionItem), "Clicking Three Dot Icon for Action Item: " + actionItem);
  }

  // Closes an open row or Bulk Actions menu so the next control on the page can be clicked.
  public async closeOpenMenu() {
    if (await this.openMenu.count() === 0) return;
    await this.page.keyboard.press('Escape');
    await this.openMenu.first().waitFor({ state: 'hidden', timeout: getTimeout('MEDIUM') })
      .catch(async () => this.objCommonFunctions.logMessage("INFO", "Menu still open after Escape"));
  }

  public async selectEdit(actionItem: string) {
    await this.clickThreeDotIconForActionItem(actionItem);
    await this.doClick(this.ddEdit, "Selecting Edit from Dropdown");
  }

  public async clickDelete() {
    await this.btnDelete.scrollIntoViewIfNeeded();
    await this.btnDelete.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.btnDelete, "Clicking Delete Button");
  }

  public async isEditClickable(actionItem: string) {
    await this.clickThreeDotIconForActionItem(actionItem);
    const isExist: boolean = await this.waitForElementVisible(this.ddEditDisabled, getTimeout('MEDIUM'));
    await this.objCommonFunctions.logMessage("INFO", "Is Disabled Edit exist?: " + isExist);
    return isExist;
  }

  public async toolTipOfEdit() {
    await this.ddEditDisabled.hover();
    let toolTip: string | null = await this.doGetAttribute(this.ddEditDisabled, "aria-label", "Fetch Tool Tip");
    await this.objCommonFunctions.logMessage("INFO", "Tool Tip Of UnAuthorized Edit: " + toolTip)
    return toolTip;
  }

  public async isDeleteClickable(actionItem: string, click3dotIcon: boolean = true) {
    if (click3dotIcon) await this.clickThreeDotIconForActionItem(actionItem);
    const isExist: boolean = await this.waitForElementVisible(this.ddDeleteDisabled, getTimeout('MEDIUM'));
    await this.objCommonFunctions.logMessage("INFO", "Is Disabled Delete exist?: " + isExist);
    return isExist;
  }

  public async toolTipOfDelete() {
    await this.ddDeleteDisabled.hover();
    let toolTip: string | null = await this.doGetAttribute(this.ddDeleteDisabled, "aria-label", "Fetch Tool Tip");
    await this.objCommonFunctions.logMessage("INFO", "Tool Tip Of UnAuthorized Delete: " + toolTip)
    return toolTip;
  }

  public async toolTipOfBulkChange() {
    try {
      await this.ddBulkChangeDisabled.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
      await this.ddBulkChangeDisabled.hover();
    } catch (e) {
      await this.objCommonFunctions.logMessage("INFO", "Hover on Bulk Change Disabled failed, retrying...");
      await this.clickBulkAction();
      await this.ddBulkChangeDisabled.hover();
    }
    let toolTip: string | null = await this.doGetAttribute(this.ddBulkChangeDisabled, "aria-label", "Fetch Tool Tip");
    await this.objCommonFunctions.logMessage("INFO", "Tool Tip Of UnAuthorized Bulk Change: " + toolTip)
    return toolTip;
  }

  public async toolTipOfBulkDelete() {
    await this.ddBulkDeleteDisabled.hover();
    let toolTip: string | null = await this.doGetAttribute(this.ddBulkDeleteDisabled, "aria-label", "Fetch Tool Tip");
    await this.objCommonFunctions.logMessage("INFO", "Tool Tip Of UnAuthorized Bulk Delete: " + toolTip)
    return toolTip;
  }

  public async selectDelete(actionItem: string) {
    await this.clickThreeDotIconForActionItem(actionItem);
    await this.doClick(this.ddDelete, "Selecting Delete from Dropdown");
    await this.clickDelete();
    return await this.getSuccessMsg();
  }

  public async selectAllCheckbox() {
    await this.chckBoxAll.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    if (await this.chckBoxAll.isChecked()) {
      await this.objCommonFunctions.logMessage("INFO", "Select all Checkbox is already selected");
      return;
    } else {
      await this.doClick(this.chckBoxAll, "Clicking Checkbox to select all");
    }
  }

  public async clickBulkAction() {
    await this.waitForToastToClear();
    await this.ddBulkActions.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    try {
      await this.doClick(this.ddBulkActions, "Clicking Bulk Actions Dropdown");
    } catch (e) {
      await this.objCommonFunctions.logMessage("INFO", "Standard click on Bulk Actions failed, falling back to script click");
      await this.doClickUsingScript(this.ddBulkActions, "Clicking Bulk Actions Dropdown using script");
    }
  }

  public async selectBulkAction(action: string) {
    await this.waitForGridToSettle();
    await this.selectAllCheckbox();
    const option = this.getddBulkAction(action);
    // A click that lands while the just-closed toast is still fading out over the button leaves the menu shut.
    for (let attempt = 1; attempt <= 2; attempt++) {
      await this.clickBulkAction();
      if (await this.waitForElementVisible(option, getTimeout('SHORT'))) break;
      await this.objCommonFunctions.logMessage("INFO", `Bulk Actions menu did not open (attempt ${attempt}), reopening`);
    }
    await this.doClick(option, "Selecting Bulk Action: " + action);
  }

  public async changeBulkStatus(status: string, checkPartialAlert: boolean = false): Promise<{ alertMsg?: string, successMsg: string }> {
    let alertMsg: string | undefined;
    try {
      await this.ddBulkActions.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
      await this.selectBulkAction("Change Status");
    } catch (e) {
      await this.selectBulkAction("Change Status");
    }
    if (checkPartialAlert) {
      alertMsg = await this.getPartialAlertMsg();
      await this.objCommonFunctions.logMessage("INFO", "Partial Alert Message: " + alertMsg);
    }
    await this.doClick(this.ddBulkStatusChange, "Clicking Change Status Dropdown");
    await this.doClick(this.getBulkChangeStatusOption(status), "Selecting Change Status from Dropdown");
    await this.clickSave();
    const successMsg = await this.getSuccessMsg();
    return { alertMsg, successMsg };
  }

  public async deleteBulkActionItems(checkPartialAlert: boolean = false): Promise<{ alertMsg?: string, successMsg: string }> {
    let alertMsg: string | undefined;
    try {
      await this.ddBulkActions.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
      await this.selectBulkAction("Delete");
    } catch (e) {
      await this.objCommonFunctions.logMessage("INFO", "Failed to click Delete from Bulk Actions Dropdown. Retrying...");
      await this.selectBulkAction("Delete");
    }
    if (checkPartialAlert) {
      alertMsg = await this.getPartialAlertMsg();
      await this.objCommonFunctions.logMessage("INFO", "Partial Alert Message: " + alertMsg);
    }
    await this.clickDelete();
    const successMsg = await this.getSuccessMsg();
    return { alertMsg, successMsg };
  }

  public async createActionItem(sName: string, sStatus: string, sActionType: string, sPriority: string, sAssignedTo?: string, sObserver?: string, sDescription?: string, sRemarks?: string) {
    await this.clickCreateNewIcon();
    await this.setName(sName);
    await this.selectStatus(sStatus);
    await this.selectActionType(sActionType);
    await this.selectPriority(sPriority);
    await this.selectDueDate();
    if (sAssignedTo) await this.selectAssignedTo(sAssignedTo);
    if (sObserver) await this.selectObserver(sObserver);
    if (sDescription) await this.setDescription(sDescription);
    if (sRemarks) await this.setRemarks(sRemarks);
    await this.clickCreate();
    return await this.getSuccessMsg();
  }

  // Opens the row menu of an action item the user cannot change and reads the disabled Edit and Delete entries.
  public async getDisabledRowActions(actionItem: string): Promise<{ isEditDisabled: boolean, editToolTip: string | null, isDeleteDisabled: boolean, deleteToolTip: string | null }> {
    const isEditDisabled = await this.isEditClickable(actionItem);
    const editToolTip = isEditDisabled ? await this.toolTipOfEdit() : null;
    const isDeleteDisabled = await this.isDeleteClickable(actionItem, false);
    const deleteToolTip = isDeleteDisabled ? await this.toolTipOfDelete() : null;
    await this.closeOpenMenu();
    return { isEditDisabled, editToolTip, isDeleteDisabled, deleteToolTip };
  }

  public async isActionItemDisplayed(actionItem: string): Promise<boolean> {
    await this.iconCreateNew.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    try {
      await this.waitForGridToSettle();
      let isVisible: boolean = await this.actionItemElement(actionItem).isVisible();
      await this.objCommonFunctions.logMessage("INFO", `Is Action Item ${actionItem} already available? ${isVisible}`);
      return isVisible;
    } catch (e) {
      await this.objCommonFunctions.logMessage("INFO", `Is Action Item ${actionItem} already available? false`);
      return false;
    }
  }

  // Returns false when the row is still shown after the timeout, so the caller can assert on it.
  public async waitForActionItemRemoved(actionItem: string): Promise<boolean> {
    const isRemoved: boolean = await this.actionItemElement(actionItem).waitFor({ state: 'hidden', timeout: getTimeout('XLARGE') }).then(() => true).catch(() => false);
    await this.objCommonFunctions.logMessage("INFO", `Is Action Item ${actionItem} removed from the grid? ${isRemoved}`);
    return isRemoved;
  }

  public async getColumnValueByActionItem(actionItem: string, columnName: string): Promise<string> {
    await this.iconCreateNew.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    const dataIndex = await this.dataIndexEle(columnName).getAttribute("data-index");
    const colValue: string = await this.doGetText(this.colValueEle(actionItem, dataIndex ?? ""), `Fetch Column Value of ${columnName} for Action Item: ${actionItem}`);
    await this.objCommonFunctions.logMessage("INFO", `Column Value of ${columnName} for Action Item ${actionItem}: ${colValue}`);
    return colValue;
  }

  // The grid refreshes after a save, so poll the cell (case-insensitive) and return the last value read for the assertion.
  public async waitForColumnValue(actionItem: string, columnName: string, expectedValue: string): Promise<string> {
    await this.colValueEle(actionItem, (await this.dataIndexEle(columnName).getAttribute("data-index")) ?? "").waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    let actualValue = "";
    await expect.poll(async () => {
      actualValue = await this.readColumnValue(actionItem, columnName);
      return actualValue.toLowerCase();
    }, { timeout: getTimeout('LONG'), intervals: [TIMEOUTS.POLL_INTERVAL] }).toBe(expectedValue.toLowerCase()).catch(() => undefined);
    await this.objCommonFunctions.logMessage("INFO", `Column Value of ${columnName} for Action Item ${actionItem}: ${actualValue}`);
    return actualValue;
  }

  public async getAllValuesOfColumn(columnName: string): Promise<string[]> {
    await this.iconCreateNew.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.waitForGridToSettle();
    const dataIndex = await this.dataIndexEle(columnName).getAttribute("data-index");
    const arrColValues: string[] = (await this.colValuesEle(dataIndex ?? "").allTextContents()).map((value) => value.trim());
    await this.objCommonFunctions.logMessage("INFO", `Column Values of ${columnName}: ${arrColValues}`);
    return arrColValues;
  }

}

