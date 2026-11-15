import MfePage from './mfe.page';
import CommonFunctions from '../util/common.util';


export class ActionItemsPage extends MfePage {

  private get iconCreateNew()                                 { return $("//button[@title='Create new']") }
  private get tfldName()                                      { return $("//input[@id='name']") }
  private get ddStatus()                                      { return $("//input[@id='select-select-simple-select+status']") }
  private get ddBulkActions()                                 { return $("//button[@data-testid='lui-ccl-button-with-dropdown-button']") }
  private get ddBulkStatusChange()                            { return $("//input[@id='select-select-simple-select-bulk-status-change']") }
  private get ddActionType()                                  { return $("//input[@id='select-select-simple-select+actionType']") }
  private get ddPriority()                                    { return $("//input[@id='select-select-simple-select+priority']") }
  private get iconCalendar()                                  { return $("//button[contains(@aria-label,'Choose date')]") }
  private get todaysDate()                                    { return $("//div[contains(@class,'MuiDayCalendar-week')]//button[@aria-selected='true']") }
  private get btnCreate()                                     { return $("//button[text()='Create']") }
  private get btnSave()                                       { return $("//button[text()='Save']") }
  private get btnCancel()                                     { return $("//button[text()='Cancel']") }
  private get txtSave()                                       { return $("//*[self::span or self::div][contains(text(), 'Success') or contains(text(), 'success')]") }
  private get ddEdit()                                        { return $("//span[text()='Edit']") }
  private get ddEditDisabled()                                { return $("//div[text()='Edit']/parent::div") }
  private get ddDeleteDisabled()                              { return $("//div[text()='Delete']/parent::div") }
  private get ddDelete()                                      { return $("//span[text()='Delete']") }
  private get btnDelete()                                     { return $("//button[text()='Delete']") }
  private get tfldAssignedToUnderPopup()                      { return $("(//h2/parent::div//input[@id='tags-standard'])[1]") }
  private get tfldObserver()                                  { return $("(//h2/parent::div//input[@id='tags-standard'])[2]") }
  private get tfldDescription()                               { return $("//input[@id='description']") }
  private get tfldRemarks()                                   { return $("//textarea[@id='remarks']") }
  private get chckBoxAll()                                    { return $("//input[@data-testid='lui-ccl-table-checkbox-title']") }
  private get partialAlertMsg()                               { return $("//div[contains(@class,'MuiAlert-message')]") }
  private get pageSizeDropdown()                              { return $("//input[@id='mrt-rows-per-page']/parent::div") }

  private getddBulkAction(action: string)                     { return $("//span[text()='" + action + "']/parent::li") }
  private getBulkChangeStatusOption(status: string)           { return $("//li//span[text()='" + status + "']") }
  private getOption(status: string)                           { return $("//span[text()='" + status + "']/ancestor::li") }
  private getThreeDotIcon(actionItem: string)                 { return $("//a[text()='" + actionItem + "']/ancestor::td/following-sibling::td//button[@data-testid='lui-ccl-threedot-menu-icon-button']") }
  private getPageSize(size: string)                           { return $("//li[@class][@data-value='" + size + "']") }



  public async clickCreateNewIcon() {
    await this.iconCreateNew.waitForDisplayed({ timeout: 60000 });
    await this.iconCreateNew.waitForClickable({ timeout: 60000 });
    await this.doClick(await this.iconCreateNew, "Clicking Create New(+) Icon");
  }

  public async setName(sName: string) {
    await this.tfldName.waitForClickable({ timeout: 15000 });
    await this.doEnterText(await this.tfldName, sName, "Entering Action Item Name: " + sName);
  }

  public async selectStatus(sStatus: string) {
    await this.doClick(await this.ddStatus, "Clicking Status Dropdown");
    await this.getOption(sStatus).waitForDisplayed({ timeout: 15000 });
    await this.doClick(await this.getOption(sStatus), "Selecting Status:: " + sStatus);
  }

  public async selectActionType(sActionType: string) {
    await this.doClick(await this.ddActionType, "Clicking Action Type Dropdown");
    await this.doClick(await this.getOption(sActionType), "Selecting Action Type:: " + sActionType);
  }

  public async selectPriority(sPriority: string) {
    await (await this.ddPriority).waitForDisplayed({ timeout: 10000 });
    await (await this.ddPriority).waitForClickable({ timeout: 10000 });
    await this.doClick(await this.ddPriority, "Clicking Priority Dropdown");

    const option = await this.getOption(sPriority);
    await option.waitForDisplayed({ timeout: 10000 });
    await option.waitForClickable({ timeout: 10000 });
    await this.doClick(await this.getOption(sPriority), "Selecting Priority:: " + sPriority);
  }

  public async selectDueDate() {
    await this.iconCalendar.scrollIntoView();
    await this.doClick(await this.iconCalendar, "Clicking Calendar Icon");
    await this.doClick(await this.todaysDate, "Selecting Today's Date");
  }

  public async selectAssignedTo(userName: string) {
    await this.tfldAssignedToUnderPopup.scrollIntoView();
    await this.doClick(await this.tfldAssignedToUnderPopup, "Clicking Assigned Username");
    await this.doEnterText(await this.tfldAssignedToUnderPopup, userName.split(" ")[0], "Entering Assigned Username: " + userName.split(" ")[0]);
    await this.doClick(await $("//*[text()='" + userName + "']"), "Selecting username: " + userName)
    await browser.keys('Tab');
  }

  public async selectObserver(userName: string) {
    await this.tfldObserver.scrollIntoView();
    await this.doClick(await this.tfldObserver, "Clicking Observer Username");
    await this.doEnterText(await this.tfldObserver, userName.split(" ")[0], "Entering Observer Username: " + userName.split(" ")[0]);
    await this.doClick(await $("//*[text()='" + userName + "']"), "Selecting username: " + userName)
    await browser.keys('Tab');
  }

  public async setDescription(sDescription: string) {
    await this.tfldDescription.scrollIntoView();
    await this.doEnterText(await this.tfldDescription, sDescription, "Entering Description: " + sDescription);
  }

  public async setRemarks(sRemarks: string) {
    await this.tfldRemarks.scrollIntoView();
    await this.doEnterText(await this.tfldRemarks, sRemarks, "Entering Remarks: " + sRemarks);
  }

  public async clickCreate() {
    await this.btnCreate.scrollIntoView();
    await this.btnCreate.waitForClickable({ timeout: 15000 });
    await this.doClick(await this.btnCreate, "Clicking Create Button");
  }

  public async clickSave() {
    await this.btnSave.scrollIntoView();
    await this.btnSave.waitForClickable({ timeout: 15000 });
    await this.doClick(await this.btnSave, "Clicking Save Button");
  }

  public async clickCancel() {
    await this.btnCancel.waitForClickable({ timeout: 15000 });
    await this.doClick(await this.btnCancel, "Clicking Cancel Button");
  }

  public async getSuccessMsg() {
    await this.txtSave.scrollIntoView();
    let success: string = await this.doGetText(await this.txtSave, "Fetch Success Message");
    await CommonFunctions.logMessage("INFO", success);
    return success;
  }

  public async getPartialAlertMsg() {
    let msg: string = await this.doGetText(await this.partialAlertMsg, "Fetch Partial Alert Message");
    await CommonFunctions.logMessage("INFO", msg);
    return msg;
  }

  public async clickThreeDotIconForActionItem(actionItem: string) {
    await this.getThreeDotIcon(actionItem).waitForClickable({ timeout: 60000 });
    await this.doClick(await this.getThreeDotIcon(actionItem), "Clicking Three Dot Icon for Action Item: " + actionItem);
  }

  public async selectEdit(actionItem: string) {
    await this.clickThreeDotIconForActionItem(actionItem);
    await this.doClick(await this.ddEdit, "Selecting Edit from Dropdown");
  }

  public async clickDelete() {
    await this.btnDelete.waitForClickable({ timeout: 60000 });
    await this.doClick(await this.btnDelete, "Clicking Delete Button");
  }

  public async isEditClickable(actionItem: string) {
    await this.clickThreeDotIconForActionItem(actionItem);
    const isExist: boolean = await this.ddEditDisabled.isExisting();
    await CommonFunctions.logMessage("INFO", "Is Disabled Edit exist?: " + isExist);
    return isExist;
  }

  public async toolTipOfEdit() {
    await this.ddEditDisabled.moveTo();
    let toolTip: string = await this.doGetAttribute(await this.ddEditDisabled, "aria-label", "Fetch Tool Tip");
    await CommonFunctions.logMessage("INFO", "Tool Tip Of UnAuthorized Edit: " + toolTip)
    return toolTip;
  }

  public async isDeleteClickable(actionItem: string, click3dotIcon: boolean = true) {
    if (click3dotIcon) await this.clickThreeDotIconForActionItem(actionItem);
    let isExist: boolean = await this.ddDeleteDisabled.isExisting();
    await CommonFunctions.logMessage("INFO", "Is Disabled Delete exist?: " + isExist);
    return isExist;
  }

  public async toolTipOfDelete() {
    await this.ddDeleteDisabled.moveTo();
    let toolTip: string = await this.doGetAttribute(await this.ddDeleteDisabled, "aria-label", "Fetch Tool Tip");
    await CommonFunctions.logMessage("INFO", "Tool Tip Of UnAuthorized Delete: " + toolTip)
    return toolTip;
  }

  public async selectDelete(actionItem: string) {
    await this.clickThreeDotIconForActionItem(actionItem);
    await this.doClick(await this.ddDelete, "Selecting Delete from Dropdown");
    await this.clickDelete();
    return await this.getSuccessMsg();
  }

  public async selectAllCheckbox() {
    await this.chckBoxAll.waitForExist({ timeout: 60000 });
    if (await this.chckBoxAll.isSelected()) {
      await CommonFunctions.logMessage("INFO", "Select all Checkbox is already selected");
      return;
    } else
      await this.doClick(await this.chckBoxAll, "Clicking Checkbox to select all");
  }

  public async selectBulkAction(action: string) {
    await this.selectAllCheckbox();
    await browser.pause(2000);
    await this.doClick(await this.ddBulkActions, "Clicking Bulk Actions Dropdown");
    await this.doClick(await this.getddBulkAction(action), "Selecting Bulk Action: " + action);
  }

  public async setPageSize(size: string) {
    await this.pageSizeDropdown.waitForExist({ timeout: 30000 });
    await this.pageSizeDropdown.scrollIntoView();
    await this.doClick(await this.pageSizeDropdown, "Clicking Page Size Dropdown");
    await this.doClick(await this.getPageSize(size), "Selecting Page Size: " + size);
  }

  public async changeBulkStatus(status: string, checkPartialAlert: boolean = false): Promise<{ alertMsg?: string, successMsg: string }> {
    let alertMsg: string | undefined;
    try {
      await this.ddBulkActions.waitForClickable({ timeout: 30000 });
      await this.selectBulkAction("Change Status");
    } catch (e) {
      await this.selectBulkAction("Change Status");
    }
    if (checkPartialAlert) {
      alertMsg = await this.getPartialAlertMsg();
      await CommonFunctions.logMessage("INFO", "Partial Alert Message: " + alertMsg);
    }
    await this.doClick(await this.ddBulkStatusChange, "Clicking Change Status Dropdown");
    await this.doClick(await this.getBulkChangeStatusOption(status), "Selecting Change Status from Dropdown");
    await this.clickSave();
    const successMsg = await this.getSuccessMsg();
    return { alertMsg, successMsg };
  }

  public async deleteBulkActionItems(checkPartialAlert: boolean = false): Promise<{ alertMsg?: string, successMsg: string }> {
    let alertMsg: string | undefined;
    try {
      await this.ddBulkActions.waitForClickable({ timeout: 60000 });
      await this.selectBulkAction("Delete");
    } catch (e) {
      await CommonFunctions.logMessage("INFO", "Failed to click Delete from Bulk Actions Dropdown. Retrying...");
      await this.selectBulkAction("Delete");
    }
    if (checkPartialAlert) {
      alertMsg = await this.getPartialAlertMsg();
      await CommonFunctions.logMessage("INFO", "Partial Alert Message: " + alertMsg);
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
    sAssignedTo && await this.selectAssignedTo(sAssignedTo);
    sObserver && await this.selectObserver(sObserver);
    sDescription && await this.setDescription(sDescription);
    sRemarks && await this.setRemarks(sRemarks);
    await this.clickCreate();
    return await this.getSuccessMsg();
  }

  public async isActionItemDisplayed(actionItem: string): Promise<boolean> {
    await this.iconCreateNew.waitForDisplayed({ timeout: 30000 });
    const actionItemElement = await $(`//a[text()='${actionItem}']`);
    try {
      await actionItemElement.waitForDisplayed({ timeout: 30000 });
      await CommonFunctions.logMessage("INFO", `Is Action Item ${actionItem} already available? true`);
      return true;
    } catch (e) {
      await CommonFunctions.logMessage("INFO", `Is Action Item ${actionItem} already available? false`);
      return false;
    }
  }

  public async getColumnValueByActionItem(actionItem: string, columnName: string): Promise<string> {
    await this.iconCreateNew.waitForDisplayed({ timeout: 30000 });
    const dataIndexEle = await $("//table[contains(@class,'MuiTable')]//th//div[contains(@class,'Mui-TableHeadCell-Content-Wrapper') and text()='" + columnName + "']/ancestor::th");
    const dataIndex = await this.doGetAttribute(dataIndexEle, "data-index", "Fetch Data Index");
    const colValueEle = await $("//a[text()='" + actionItem + "']/ancestor::td/following-sibling::td[@data-index='" + dataIndex + "']");
    const colValue: string = await this.doGetText(await colValueEle, "Fetch Column Value of " + columnName + " for Action Item: " + actionItem);
    await CommonFunctions.logMessage("INFO", `Column Value of ${columnName} for Action Item ${actionItem}: ${colValue}`);
    return colValue;
  }

  public async getAllValuesOfColumn(columnName: string): Promise<string[]> {
    await this.iconCreateNew.waitForDisplayed({ timeout: 30000 });
    const dataIndexEle = await $("//table[contains(@class,'MuiTable')]//th//div[contains(@class,'Mui-TableHeadCell-Content-Wrapper') and text()='" + columnName + "']/ancestor::th");
    const dataIndex = await this.doGetAttribute(dataIndexEle, "data-index", "Fetch Data Index");
    const colValuesEle = await $$("//td[@data-index='" + dataIndex + "']");
    let arrColValues: string[] = [];
    for (let i = 0; i < colValuesEle.length; i++) {
      arrColValues.push(await this.doGetText(colValuesEle[i], "Fetch Column Values of " + columnName + " of record " + (i + 1)));
    }
    await CommonFunctions.logMessage("INFO", `Column Values of ${columnName}: ${arrColValues}`);
    return arrColValues;
  }


}
export default new ActionItemsPage();