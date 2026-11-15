import MfePage from './mfe.page';
import CommonFunctions from '../util/common.util';
import { IProcess } from './planning.page';

class ProcessPage extends MfePage {

  public get pageTitle()                              { return $("//h2[@data-testid='app-header-block-title']")}
  private get addProcess()                            { return $(`//span[text()="Planning Processes"]//ancestor::div[@data-testid="lui-ccl-card-cardHeader"]//button[@data-testid="add-process"]`)}
  private get addSubProcess()                         { return $(`//button[@title="Add Process"]`)}
  private get startProcessButton()                    { return $(`//button[normalize-space()='Start']`)}
  private get closeProcessButton()                    { return $(`//button[normalize-space()='Yes, Close']`)}
  private get refreshButton()                         { return $(`//*[@data-testid='refreshIconBtn']`)}
  private get statusLabel()                           { return $(`//*[@data-testid='lui-ccl-object-status-label-container']`)}
  private get backToProcessFromPowerBar()             { return $(`//button[@data-testid='entityName-PROCESS']`)}
  private get templateDropdown()                      { return $(`//input[@id="select-select-simple-select+templateName"]`)}
  private get displayNameInp()                        { return $(`//input[@id="displayName"]`)}
  private get calendarDropdown()                      { return $(`//input[@id="select-select-simple-select+calendarName"]`)}
  private get cycleNameDropdown()                     { return $(`//input[@id="select-select-simple-select+cycleName"]`)}
  private get descriptionInp()                        { return $(`//textarea[@id="description"] | //input[@id="description"]`)}
  private get threeDotMenu()                          { return $("//button[@data-testid='po-page-title-three-dot-btn']")}
  private get alert()                                 { return $(`//div[contains(@class, 'MuiAlert-message')]`)}
  private get offProcessDropdown()                    { return $(`//div[@id="multiselect-select-simple-select+transition.referenceNodeNames"]`)}
  private get calcStartDateOnDropdown()               { return $(`//input[@id="select-select-simple-select+startOffsetReference"]`)}
  private get ofSubProcessDropdown()                  { return $(`//input[@id="select-select-simple-select+referenceNodeName"]`)}
  private get backDrop()                              { return $(`//div[@id="menu-"]/div`)}
  private get processDropdownEle()                    { return $(`//input[@id="single-select-process"]`)}
  private get offsetInput()                           { return $(`input#startOffset`); }
  private get durationInput()                         { return $(`input#duration`); }
  private get startProcessOnDropdown()                { return $(`div[data-testid="lui-ccl-select-box"]`); }
  private get startofProcessDropdown()                { return $(`div[data-testid="lui-ccl-multi-select-select"]`); }
  private get dropdownOptions()                       { return $$('ul[role="listbox"] li[role="option"]'); }
  private get dropOptions()                           { return $$(`li[data-testid="lui-ccl-select-option"]`); }
  private get dropdownTrigger()                       { return $(`div[data-testid="lui-ccl-select-arrow-icon"]`); }
  private get ofProcessDropdownContainers()           { return $$(`div[data-testid="lui-ccl-select-box"]`); }
  private get addProcedureBtn()                       { return $(`//button[@data-testid="add-procedure-config-btn"]`)}   
  private get createButton()                          { return $(`button[type="button"][class*="MuiButton-containedPrimary"]`); }
  private get pageSizeDropdown()                      { return $("//input[@id='mrt-rows-per-page']/parent::div") }
  private get dataVersionDropdown()                   { return $$(`//input[@id='select-select-simple-select+variant']/following-sibling::div`)}

  private calculateStartDateOption(value: string)     { return $(`li[data-testid="lui-ccl-select-option"][value="${value}"]`); }
  private startProcessOnOption(event: string)         { return $(`li[role="menuitem"][value="${event}"]`); }
  private getPrimaryBtn(buttonName: string)           { return $$(`//button[text()="${buttonName}"]`)}
  private getDropdownItem(optionName: string)         { return $(`//li[@aria-label="${optionName}"]`)}
  private getProcess(processName: string)             { return $(`//a[text()="${processName}"]`)}
  private getMenuItem(itemName: string)               { return $(`//li[text()="${itemName}"]`)}
  private getTab(tabName: string)                     { return $(`//button[@id="simple-tab-${tabName}"]`)}
  private getThreeDotMenu(subProcessName: string)     { return $(`//a[text()="${subProcessName}"]//ancestor::tr//button[@data-testid="lui-ccl-threedot-menu-icon-button"]`)}
  private getMenuItemOfSubProcess(itemName: string)   { return $(`//div[@role="button"]//span[text()="${itemName}"]`)}                     
  private getLeftPaneLink(linkName: string)           { return $(`//*[@aria-label='${linkName}']`)}
  private getdataVersionChip(chipValue: string)       { return $(`//p[@data-testid='lui-ccl-object-status-label-container' and text()='${chipValue}']`)}
  private getPageSize(size: string)                   { return $("//li[@class][@data-value='" + size + "']") }


  public async clickLeftpaneLinks(sLinkname: string): Promise<boolean> {
    const Leftlink = await this.getLeftPaneLink(sLinkname);
    await Leftlink.waitForDisplayed({ timeout: 90000 });
    if (await this.doesElementExist(Leftlink, `Checking if left pane link ${sLinkname} exists`)) {
      await this.doClick(Leftlink, "Clicking Left Pane Link:: " + sLinkname);
      await browser.pause(5000);
      return true;
    } else {
      await CommonFunctions.logMessage("FAIL", "Left Pane Link:: " + sLinkname + " is not Visible");
      return false;
    }
  }

  public async isLeftPanelLinkExists(sLinkName: string) {
    const leftPanelLink = await this.getLeftPaneLink(sLinkName);
    try {
      await CommonFunctions.logMessage("INFO", "Left Pane Link:: " + sLinkName + " is Visible");
      return await leftPanelLink.isDisplayed();
    } catch (error) {
      await CommonFunctions.logMessage("FAIL", "Left Pane Link:: " + sLinkName + " is not Visible");
      return false;
    }
  }

  public async getPageTitle(): Promise<string> {
    const selector = await this.pageTitle;
    await selector.waitForDisplayed({ timeout: 60000 });
    const text = await this.doGetText(selector, "Getting page title");
    await CommonFunctions.logMessage("INFO", `Page title is :: ${text}`);
    return text;
  }

  public async clickOnTab(sTabName: string): Promise<boolean> {
    const eleTab = await $(`//div[@role='tablist']/button[text()='${sTabName}']`);
    if (await this.doesElementExist(eleTab, `Checking if tab ${sTabName} exists`)) {
      await CommonFunctions.logMessage("INFO", "Clicking Tab:: " + sTabName);
      await this.doClick(eleTab, `Clicking on tab: ${sTabName}`);
      await browser.pause(5000);
      return true;
    } else {
      await CommonFunctions.logMessage("INFO", "Tab:: " + sTabName + " Not Visible!!");
      return false;
    }
  }

  public async clickOnAddProcess(): Promise<void> {
    const addProcessEle = await this.addProcess;
    await addProcessEle.waitForDisplayed({ timeout: 90000 });
    await addProcessEle.waitForClickable({ timeout: 90000 });
    await CommonFunctions.logMessage("INFO", `Clicking on + icon`);
    await this.doClick(addProcessEle, "Clicking on add process button");
  }

  public async selectTemplateItem(template: string): Promise<void> {
    const templateDropdownEle = await this.templateDropdown;
    await CommonFunctions.logMessage("INFO", `Clicking on template dropdown`);
    await this.doClick(templateDropdownEle, "Clicking on template dropdown");
    const templateDropdownItemEle = await this.getDropdownItem(template);
    await CommonFunctions.logMessage("INFO", `Selecting ${template} from template dropdown`);
    await this.doClick(templateDropdownItemEle, `Selecting template: ${template}`);
  }

  public async selectCycleDropdownItem(cycleName: string): Promise<void> {
    const cycleDropdownEle = await this.cycleNameDropdown;
    await CommonFunctions.logMessage("INFO", `Clicking on cycle name dropdown`);
    await this.doClick(cycleDropdownEle, "Clicking on cycle name dropdown");
    const cycleDropdownItemEle = await this.getDropdownItem(cycleName);
    await CommonFunctions.logMessage("INFO", `Selecting ${cycleName} from cycle name dropdown`);
    await this.doClick(cycleDropdownItemEle, `Selecting cycle name: ${cycleName}`);
  }

  public async selectCalendarItem(calendar: string): Promise<void> {
    const calendarDropdownEle = await this.calendarDropdown;
    await CommonFunctions.logMessage("INFO", `Clicking on calendar dropdown`);
    await this.doClick(calendarDropdownEle, "Clicking on calendar dropdown");
    const calendarDropdownItemEle = await this.getDropdownItem(calendar);
    await CommonFunctions.logMessage("INFO", `Selecting ${calendar} from calendar dropdown`);
    await this.doClick(calendarDropdownItemEle, `Selecting calendar: ${calendar}`);
  }

  public async selectDataVersionItem(dataVersion: string, action: string = 'create'): Promise<void> {
    if (action == 'create') {
      await this.dataVersionDropdown[0].waitForDisplayed({ timeout: 60000 });
      await browser.pause(5000);
      await this.doClick(await this.dataVersionDropdown[0], "Clicking Data Version Dropdown", 3000);
    }
    else{
      await this.dataVersionDropdown[1].waitForDisplayed({ timeout: 60000 });
      await browser.pause(5000);
      await this.doClick(await this.dataVersionDropdown[1], "Clicking Data Version Dropdown", 3000);
    }
    await this.doClick(await this.getDropdownItem(dataVersion), `Selecting data version: ${dataVersion}`);
  }

public async dataVersionChipValidation(dataVersion: string): Promise<boolean> {
    try {
        const dataVersionChipEle = await this.getdataVersionChip(dataVersion);
        await dataVersionChipEle.waitForDisplayed({ timeout: 30000 });
        const isExisting = await dataVersionChipEle.isExisting();
      if (!isExisting) {
            await CommonFunctions.logMessage("INFO", "Chip is not present in DOM");
            return dataVersion.toLowerCase() === 'default';
        }
        const isDisplayed = await dataVersionChipEle.isDisplayed();
        const chipText = await dataVersionChipEle.getText();
        await CommonFunctions.logMessage("INFO", `Chip found with text: '${chipText}', isDisplayed: ${isDisplayed}`);
     if (dataVersion.toLowerCase() === 'default') {
          return !isDisplayed;
        } else {
          return isDisplayed && chipText.trim() === dataVersion;
        }
    } catch (error) {
        await CommonFunctions.logMessage("ERROR", `Error in chip validation: ${error}`);
        return dataVersion.toLowerCase() === 'default';
    }
}

  public async setDescription(description: string): Promise<void> {
    const descriptionInpEle = await this.descriptionInp;
    await this.doClearAndEnterText(descriptionInpEle, description, `Setting ${description} in description input`);
  }

  public async setDisplayName(displayName: string): Promise<void> {
    const displayNameInpEle = await this.displayNameInp;
    await this.doClearAndEnterText(displayNameInpEle, displayName, `Setting ${displayName} in display name input`);
  }

 public async fillCreateProcessForm(displayName: string, calendar: string, cycleName: string, description: string, template?: string, dataVersion?: string): Promise<void> {
    await CommonFunctions.logMessage("INFO", `Creating process`);
    template && await this.selectTemplateItem(template);
    await this.setDisplayName(displayName);
    dataVersion && await this.selectDataVersionItem(dataVersion);
    await this.selectCalendarItem(calendar);
    await this.selectCycleDropdownItem(cycleName);
    await this.setDescription(description);
  }

  public async editDataVersionInEditProcess(dataversion: string): Promise<boolean> {
    await CommonFunctions.logMessage("INFO", `Editing Data Version in the process`);
    dataversion && await this.selectDataVersionItem(dataversion, "edit");
    return true;
  }

  public async processActions(buttonName: string, action: string = 'create'): Promise<void> {
    const button = await this.getPrimaryBtn(buttonName);
    if (action === 'create') {
      await button[0].waitForDisplayed({ timeout: 60000 });
      await browser.pause(5000);
        await this.doClickUsingScript(button[0], `Clicking on ${buttonName} button for create`);
      }
       else if (action === 'edit/Save') {
        await button[1].waitForDisplayed({ timeout: 60000 });
        await browser.pause(10000);
        await this.doClickUsingScript(button[1], `Clicking on ${buttonName} button for edit`);
      }
      else {
     throw new Error(`Invalid action: ${action}. Expected 'create' or 'edit'.`); 
    }
  }

  public async isProcessExist(processName: string): Promise<boolean> {
    const processEle = await this.getProcess(processName);
    try {
      await processEle.waitForExist({ timeout: 60000 });
      await processEle.scrollIntoView();
      const isProcessCreated = await this.doesElementExist(processEle, `Checking if process ${processName} exists`);
      await CommonFunctions.logMessage("INFO", `Is process created :: ${isProcessCreated}`);
      return isProcessCreated;
    }
    catch (e) {
      await CommonFunctions.logMessage("ERROR", `Process ${processName} not found: ${e}`);
      return false;
    }
  }

  public async clickOnProcess(processName: string): Promise<void> {
    const isProcessInList: boolean = await this.isProcessExist(processName);
    if (isProcessInList) {
      const processEle = await this.getProcess(processName);
      await processEle.waitForClickable({ timeout: 60000 });
      await CommonFunctions.logMessage("INFO", `Clicking on ${processName} process`);
      await this.doClick(processEle, `Clicking on process: ${processName}`);
    }
    else {
      await CommonFunctions.logMessage("INFO", `Unable to click on ${processName} process`);
    }
  }

  public async clickOnThreeDotMenu(): Promise<void> {
    const threeDotEle = await this.threeDotMenu;
    await threeDotEle.waitForClickable({ timeout: 60000 });
    await CommonFunctions.logMessage("INFO", `Clicking on three dot menu in process details page`);
    await this.doClick(threeDotEle, "Clicking on three dot menu");
  }

  public async clickOnMenuItem(itemName: string): Promise<void> {
    const menuItemEle = await this.getMenuItem(itemName);
    await menuItemEle.waitForClickable({ timeout: 30000 });
    await CommonFunctions.logMessage("INFO", `Clicking on ${itemName} option`);
    await this.doClick(menuItemEle, `Clicking on menu item: ${itemName}`);
  }

  public async handleProcessMenuClick(action) {
    await this.clickOnMenuItem(action);
    const actionButton = action === 'Start Process' ? await this.startProcessButton : await this.closeProcessButton;
    await this.doClick(await actionButton, `Clicking on ${action} button`);
    await CommonFunctions.logMessage("INFO", `Waiting for 15 sec`);
    await browser.pause(15000);
  }

  public async processMenuExists(menuItem: string) {
    const menuItemElement = await $(`//li[text()="${menuItem}"]`);

    // Check if the element exists
    const isExisting = await this.doesElementExist(menuItemElement, `Checking if menu item ${menuItem} exists`);
    if (!isExisting) {
      await CommonFunctions.logMessage("INFO", `❌ Menu item '${menuItem}' does not exist.`);
      return false;
    }
    // Get the 'aria-disabled' attribute
    const isDisabled = await this.doGetAttribute(menuItemElement, "aria-disabled", "Fetching aria-disabled");
    await CommonFunctions.logMessage("INFO", `Checking menu '${menuItem}': aria-disabled = ${isDisabled}`);
    // If 'aria-disabled' is "true", the menu is disabled → return false
    if (isDisabled === 'true') {
      await CommonFunctions.logMessage("INFO", `🚫 Menu '${menuItem}' is disabled.`);
      return false;
    }
    return true;
  }

  public async refreshProcess() {
    await this.doClick(await this.refreshButton, "Clicking on refresh button");
  }

  public async refreshAndVerifyStatus(action) {
    await this.refreshProcess();
    await this.statusLabel.waitForDisplayed({ timeout: 15000 });
    const statusText = await this.doGetText(await this.statusLabel, "Getting status label text");
    const expectedStatus = action === 'Start Process' ? 'in progress' : 'completed';
    if (statusText.trim() === expectedStatus) {
      await CommonFunctions.logMessage("INFO", `✅ Status is ${expectedStatus}`);
      return true;
    } else if (expectedStatus == 'completed' && statusText.trim() === 'auto completed') {
      await CommonFunctions.logMessage("INFO", `✅ Status is ${'auto completed'}`);
      return true;
    } else {
      await CommonFunctions.logMessage("INFO", `❌ Expected status: ${expectedStatus}, but got: ${statusText}`);
      return false;
    }
  }

  public async clickSubProcess(subprocess) {
    await CommonFunctions.logMessage('INFO', 'Attempting to click the subprocess.');
    const menuButton = await $(`//a[contains(text(), '${subprocess}')]`);
    if (menuButton) {
      await menuButton.scrollIntoView();
      await browser.execute(() => { window.scrollBy(0, 100); });
      await this.doClick(await menuButton, `Clicked on subprocess: ${subprocess}`);
      return true;
    } else {
      await CommonFunctions.logMessage('FAIL', '❌ Subprocess menu button not found.');
      return false;
    }
  }

  public async backToProcessFromSupProcess() {
    await this.doClick(await this.backToProcessFromPowerBar, "Going Back to Process via Powerbar");
  }

  public async checkSubProcessStatus(subprocess: string, action: string) {
    await browser.pause(5000);
    await CommonFunctions.logMessage('INFO', 'Checking subprocess status.');
    let subProcessStatus = await this.refreshAndVerifyStatus(action);
    await browser.pause(5000);
    const expectedStatus1 = action === 'Start Process' ? 'In Progress' : 'Auto Completed';
    let grandchildProcess1 = await this.verifyElementText(0, expectedStatus1);
    const expectedStatus = action === 'Start Process' ? 'Not Started' : 'Auto Completed';
    let grandchildProcess2 = await this.verifyElementText(1, expectedStatus);
    let grandchildProcess3 = await this.verifyElementText(2, expectedStatus);
    await CommonFunctions.logMessage('INFO', '✅ Subprocess status checked successfully.');
    await CommonFunctions.logMessage('INFO', `Subprocess Status: ${subProcessStatus}, Grandchild Process 1: ${grandchildProcess1}, Grandchild Process 2: ${grandchildProcess2}, Grandchild Process 3: ${grandchildProcess3}`);
    return subProcessStatus && grandchildProcess1 && grandchildProcess2 && grandchildProcess3;
  }

  public async verifyElementText(dataIndex, expectedText) {
    const element = $(`//tr[@data-index="${dataIndex}"]//span[@data-testid="lui-ccl-object-status-label-container" and normalize-space(text())="${expectedText}"]`);
    const isElementPresent = await this.doesElementExist(element, `Checking if element with data-index ${dataIndex} and expected text "${expectedText}" exists`);

    if (isElementPresent) {
      const actualText = await this.doGetText(await element, "Getting element text");
      await CommonFunctions.logMessage('INFO', `✅ Element found at data-index ${dataIndex}. Expected Status: "${expectedText}", Actual Status: "${actualText.trim()}"`);
      return actualText.trim() === expectedText.toLowerCase();
    } else {
      await CommonFunctions.logMessage('ERROR', `❌ Element not found at data-index ${dataIndex}. Expected Status: "${expectedText}"`);
    }
    return false;
  }

  public async actionSubProcess(subprocess, action) {
    await this.clickSubProcess(subprocess);
    await browser.pause(8000);
    await this.clickOnThreeDotMenu();
    await browser.pause(5000);
    let isExist = await this.processMenuExists(action)
    if (isExist) {
      await CommonFunctions.logMessage('INFO', `${action} found, executing ${action} flow.`);
      await this.handleProcessMenuClick(action);
      let isStatusCorrect = await this.refreshAndVerifyStatus(action);
      await CommonFunctions.logMessage('INFO', `Status after ${action} execution: ${isStatusCorrect}`);
      await browser.pause(5000);
      let subprocessStatus = await this.checkSubProcessStatus(subprocess, action);
      await CommonFunctions.logMessage('INFO', `Subprocess status after ${action}: ${subprocessStatus}`);
      return isStatusCorrect && subprocessStatus;
    }
    else {
      await CommonFunctions.logMessage('FAIL', `${action} not found, skipping ${action} flow.`);
      return false;
    }
  }

  public async alertMsg(message: string, maxTimeout: number = 30000): Promise<boolean> {
    const ele = await this.alert;
    // await ele.waitForDisplayed({ timeout: maxTimeout });
    await ele.waitForExist({ timeout: maxTimeout });
    const text = await this.doGetText(ele, "Getting alert message");
    await CommonFunctions.logMessage("INFO", `Alert :: ${text}`);
    if (text.includes(message))
      return true;
    return false;
  }

  public async clickOnAddSubProcess(): Promise<void> {
    const plusIconEle = await this.addSubProcess;
    await plusIconEle.waitForClickable({ timeout: 90000 });
    await CommonFunctions.logMessage("INFO", `Clicking on + icon`);
    await this.doClick(plusIconEle, "Clicking on add sub process button");
  }

  public async clickOnTabInSubProcess(tabName: string): Promise<void> {
    const tabEle = await this.getTab(tabName);
    await tabEle.waitForClickable({ timeout: 30000 });
    await CommonFunctions.logMessage("INFO", `Clicking on ${tabName} tab in form`);
    await this.doClick(tabEle, `Clicking on tab: ${tabName}`);
  }

  public async clickOnAddProcedureBtn(): Promise<void> {
    const addProcedureBtnEle = await this.addProcedureBtn;
    await this.doClick(addProcedureBtnEle, "Clicking on Add Procedure button");
  }

  public async setOffProcess(): Promise<void> {
    const offProcessDropdownEle = await this.offProcessDropdown;
    await CommonFunctions.logMessage("INFO", `Clicking on off process dropdown`);
    await offProcessDropdownEle.waitForClickable({ timeout: 90000 });
    await this.doClick(offProcessDropdownEle, "Clicking on off process dropdown");
    await browser.pause(2000);
    await browser.keys('Down arrow');
    await browser.keys('Enter');
  }

  public async clickOutsideDropdown(): Promise<void> {
    const backDropEle = await this.backDrop;
    await CommonFunctions.logMessage("INFO", `Clicking outside of menu`);
    await this.doClick(backDropEle, "Clicking outside dropdown");
  }

  public async clickOnThreeDotMenuOfSubProcess(subprocessName: string): Promise<void> {
    const threeDotMenu = await this.getThreeDotMenu(subprocessName);
    await threeDotMenu.scrollIntoView();
    await CommonFunctions.logMessage("INFO", `Clicking on three dot menu of ${subprocessName}`);
    await threeDotMenu.waitForClickable({ timeout: 90000 });
    await this.doClick(threeDotMenu, `Clicking on three dot menu of subprocess: ${subprocessName}`);
  }

  public async clickOnItem(itemName: string): Promise<void> {
    const menuItemEle = await this.getMenuItemOfSubProcess(itemName);
    await menuItemEle.waitForClickable({ timeout: 60000 });
    await CommonFunctions.logMessage("INFO", `Clicking on ${itemName} item`);
    await this.doClick(menuItemEle, `Clicking on item: ${itemName}`);
  }

  public async setOffsetValue(offset: number = 1): Promise<void> {
    await CommonFunctions.logMessage("INFO", `Setting Offset value to: ${offset}`);
    await this.doClick(await this.offsetInput, "Clicking on Offset input");

    let currentValue = parseInt(await this.offsetInput.getValue(), 10);

    while (currentValue !== offset) {
      if (currentValue < offset) {
        await this.offsetInput.setValue(['ArrowUp']);
      } else {
        await this.offsetInput.setValue(['ArrowDown']);
      }
      currentValue = parseInt(await this.offsetInput.getValue(), 10);
    }

    await CommonFunctions.logMessage("INFO", `Offset value set to: ${currentValue}`);
    if (currentValue !== offset) {
      throw new Error(`Failed to set Offset value to ${offset}. Current value: ${currentValue}`);
    }
  }

  public async setDurationValue(duration: number): Promise<void> {
    await CommonFunctions.logMessage("INFO", `Setting Duration value to: ${duration}`);
    await this.durationInput.waitForDisplayed();
    await this.doClick(await this.durationInput, "Clicking on Duration input");

    let currentValue = parseInt(await this.durationInput.getValue(), 10);

    while (currentValue !== duration) {
      if (currentValue < duration) {
        await this.durationInput.setValue(['ArrowUp']);
      } else {
        await this.durationInput.setValue(['ArrowDown']);
      }
      currentValue = parseInt(await this.durationInput.getValue(), 10);
    }

    await CommonFunctions.logMessage("INFO", `Duration value set to: ${currentValue}`);
    if (currentValue !== duration) {
      throw new Error(`Failed to set Duration value to ${duration}. Current value: ${currentValue}`);
    }
  }

  public async setStartProcessOnEvent(event: string): Promise<void> {
    await CommonFunctions.logMessage("INFO", `Setting Start Process On Event to: ${event}`);
    await this.startProcessOnDropdown.waitForDisplayed();
    await this.doClick(await this.startProcessOnDropdown, "Clicking on Start Process On dropdown");

    const eventOption = await this.startProcessOnOption(event);
    await this.doClick(eventOption, `Selecting ${event} from Start Process On dropdown`);
  }

  public async setStartProcessOnOfProcess(): Promise<void> {
    await CommonFunctions.logMessage("INFO", `Clicking on Of Process dropdown`);
    const combobox = await this.startofProcessDropdown;
    await combobox.waitForDisplayed();
    await this.doClick(combobox, "Clicking on Of Process dropdown");

    await browser.waitUntil(
      async () => {
        const dropdownOptions = await this.dropdownOptions;
        return dropdownOptions.length > 0;
      },
      {
        timeout: 10000,
        timeoutMsg: 'Dropdown options did not load within 10 seconds',
      }
    );

    const firstOption = (await this.dropdownOptions)[0];
    const optionText = await this.doGetText(firstOption, "Getting first option text");
    await this.doClick(firstOption, `Selecting ${optionText} from Of Process dropdown`);
    await CommonFunctions.logMessage("INFO", `Of Process dropdown value set to: ${optionText}`);
  }

  public async validateRequiredFields(): Promise<boolean> {
    const alertMessage = await this.alert;
    await alertMessage.waitForDisplayed();
    const text = await this.doGetText(alertMessage, "Getting validation alert message");
    await CommonFunctions.logMessage("INFO", `Validation Alert: ${text}`);
    return text.includes('Complete all required fields');
  }

  public async clickCancelButton(): Promise<void> {
    const cancelButton = await this.getPrimaryBtn('Cancel');
    await CommonFunctions.logMessage("INFO", `Clicking on Cancel button`);
    await this.doClick(cancelButton[0], "Clicking on Cancel button");
  }

  public async clickCreateButton(): Promise<void> {
    const createButton = await this.createButton;
    await this.doClick(createButton, "Clicking on Create button");
  }

  public async createSubProcess(displayName: string, offset: number, duration: number, startEvent: string, ofProcess: string): Promise<boolean> {
    await CommonFunctions.logMessage("INFO", `Creating subprocess with Display Name: ${displayName}`);
    await this.setDisplayName(displayName);
    await this.setCalculateStartDateOn('Start');
    await this.setOfProcessToFirstOption();
    await this.setOffsetValue(offset);
    await this.setDurationValue(duration);
    await this.clickOnTabInSubProcess('Start Process On');
    await this.setStartProcessOnEvent(startEvent);
    await this.setStartProcessOnOfProcess();
    await CommonFunctions.logMessage("INFO", `Sending Escape key to dismiss dropdown/modal`);
    await browser.keys('Escape');
    await this.clickCreateButton();
    const alertMessage = `Process ${displayName.replace(/\s/g, "")} has been created`;
    const isCreated = await this.alertMsg(alertMessage);
    await CommonFunctions.logMessage("INFO", `Subprocess creation status: ${isCreated}`);
    return isCreated;
  }

  public async setCalculateStartDateOn(value: string): Promise<void> {
    await CommonFunctions.logMessage("INFO", `Setting Calculate Start Date On to: ${value}`);
    await this.dropdownTrigger.waitForDisplayed();
    await this.doClick(this.dropdownTrigger, "Clicking on Calculate Start Date On dropdown trigger");
    const option = this.calculateStartDateOption(value);
    await option.waitForDisplayed();
    await this.doClick(option, `Selecting ${value} from Calculate Start Date On dropdown`);
  }

  public async setOfProcessToFirstOption(): Promise<void> {
    await CommonFunctions.logMessage("INFO", `Locating the second dropdown container for 'Of Process'`);
    const dropdownContainers = await this.ofProcessDropdownContainers;
    if (dropdownContainers.length < 2) {
      throw new Error("Unable to locate the second dropdown container for 'Of Process'");
    }

    const dropdownContainer = dropdownContainers[1];
    const dropdownTrigger = await dropdownContainer.$(`div[data-testid="lui-ccl-select-arrow-icon"]`);
    await dropdownTrigger.waitForDisplayed();
    await CommonFunctions.logMessage("INFO", `Clicking on Of Process dropdown trigger`);
    await this.doClick(dropdownTrigger, "Clicking on Of Process dropdown trigger");

    await browser.waitUntil(
      async () => {
        const dropdownOptions = await this.dropOptions;
        const optionsCount = dropdownOptions.length;
        await CommonFunctions.logMessage("DEBUG", `Dropdown options count: ${optionsCount}`);
        return optionsCount > 0;
      },
      {
        timeout: 10000,
        timeoutMsg: 'Dropdown options did not load within 10 seconds',
      }
    );

    const dropdownOptions = await this.dropOptions;
    if (dropdownOptions.length === 0) {
      throw new Error("No options found in 'Of Process' dropdown");
    }

    const firstOption = dropdownOptions[0];
    await firstOption.waitForDisplayed();
    const optionText = await this.doGetText(firstOption, "Getting first option text from Of Process dropdown");
    await CommonFunctions.logMessage("INFO", `Selecting ${optionText} from Of Process dropdown`);
    await this.doClick(firstOption, `Selecting ${optionText} from Of Process dropdown`);
  }

  public async fillSubProcessForm(displayName?: string, description?: string, isOffProcessFieldExist?: boolean): Promise<void> {
    displayName && await this.setDisplayName(displayName);
    description && await this.setDescription(`testing creation of sub process using AT`);

    if (isOffProcessFieldExist) {
      await this.clickOnTabInSubProcess('Start Process On');
      await this.setOffProcess();
      await browser.keys('Escape');
    }
  }

  public async selectCalculateStartDateOn(calculateStartDateOn: string): Promise<void> {
    await this.doClick(await this.calcStartDateOnDropdown, "Clicking on Calculate Start date on dropdown");
    await this.doClick(await this.getDropdownItem(calculateStartDateOn), `Selecting ${calculateStartDateOn} from dropdown`);
  }

  public async validateSubProcessFields(processName: string): Promise<boolean> {
    await this.doClick(await this.ofSubProcessDropdown, `Clicking on Of subprocess dropdown`);
    await browser.pause(2000);

    // Get all the dropdown options
    const dropdownOptions = await $$('ul[role="listbox"] li[role="option"]');

    // Extract text from options
    const optionTexts = await Promise.all(dropdownOptions.map(async (option) => {
      return await this.doGetText(option, "Getting dropdown option text");
    }));

    // Check if PROCESS_NAME exists in options
    const processExists = optionTexts.includes(processName);
    await CommonFunctions.logMessage("INFO", `Process ${processName} exists in dropdown: ${processExists}`);
    return processExists;
  }

  public async selectSingleProcess(dropdownValues: IProcess): Promise<void> {
    const processDropdown = await this.processDropdownEle;
    await CommonFunctions.logMessage('INFO', `Clicking Process dropdown`);
    await processDropdown.waitForClickable({ timeout: 90000 });
    await this.doClick(processDropdown, "Clicking on process dropdown");
    await browser.pause(5000);

    const processValue: string = ('process' in dropdownValues) ? dropdownValues.process : '';
    console.log("Process Value: ", processValue);

    const existProcessValue = await processDropdown.getValue();
    const backSpaces = new Array(existProcessValue.length).fill('Backspace');
    await processDropdown.setValue(backSpaces);

    await CommonFunctions.logMessage('INFO', `Selecting ${processValue} item from Process dropdown`);
    await this.doEnterText(processDropdown, processValue, `Entering process value: ${processValue}`);
    await browser.pause(2000);

    const opt = await $$("//*[text()='" + processValue + "']");
    await CommonFunctions.logMessage("INFO", "Selecting process from dropdown " + processValue);
    await this.doClick(opt[await (opt.length) - 1], `Selecting process option: ${processValue}`);
    await browser.pause(2000);
  }

  public async setPageSize(size: string) {
    await this.pageSizeDropdown.waitForExist({ timeout: 30000 });
    await this.pageSizeDropdown.scrollIntoView();
    await this.doClick(await this.pageSizeDropdown, "Clicking Page Size Dropdown");
    await this.doClick(await this.getPageSize(size), "Selecting Page Size: " + size);
  }

}

export default new ProcessPage();
