import MfePage from './mfe.page';
import CommonFunctions from '../util/common.util';

class SCAPage extends MfePage {

  private get scaDropdownItems()                { return $$(`//li[@data-testid="sca-actions-dropdown-item" and  not(contains(@class,"Mui-disabled"))]`)}
  private get saveBtn()                         { return $(`//button[@data-testid='save-btn']`)}
  private get secondaryScaDropdownInConfig()    { return $(`//div[@data-testid='secondaryActionInput-arrow-icon']`)}
  private get primaryScaDropdownInConfig()      { return $(`//div[@data-testid='primaryActionInput-arrow-icon']`)}
  private get addLaneBtn()                      { return $(`//div[@role="presentation"]//button[text()="Add Lane"]`)}
  private get scaRunButton()                    { return $(`//button[@data-testid='scaRunButton']`)}
  private get getAlertMsg()                     { return $(`//div[contains(@class, 'MuiAlert-message')]`)}
  private get scaNextStepBtn()                  { return $("//button[@data-testid='scaNextStepButton']")}
  private get procedureDropdownBtn()            { return $(`(//button[@aria-label='Open'])[1]`)}
  private get attributeDropdownBtn()            { return $(`(//button[@aria-label='Open'])[2]`)}
  private get procedureSaveBtn()                { return $(`//button[@data-testid = 'po-to-po-context-modal-primary-btn']`)}
  private get procedureDeleteBtnInPopup()       { return $(`//button[@data-testid="po-to-po-delete-modal-primary-btn"]`)}
  private get gridHeaderContainer()             { return $(".grid-header-container")} 
  private get procedureCombobox()               { return $("input.MuiAutocomplete-input[role='combobox']:nth-of-type(1)")}
  private get attributeCombobox()               { return $("//div[contains(@class,'MuiAutocomplete-root')]//input[@id='tags-standard']") }
  private get processDropdownInput()            { return $("//input[@id='single-select-process']")}

  private getProcedureName(procedureName: string)     { return $(`//td[@data-index='0']//span[text()='${procedureName}']`)}
  private getDialogHeaderEle(procedureName: string)   { return $(`//div[@data-testid="lui-ccl-modal"]//div[@role="dialog"]//h5[text()="${procedureName}"]`)};
  private getProcessBtn(processName: string)          { return $(`//tr[@data-testid='lui-ccl-table-row']//a[contains(normalize-space(text()),'${processName}')]`)}
  private procedureDeleteBtn(procedureName: string)   { return $(`//tr[.//td[1]//span[text()='${procedureName}']]//button[@data-testid='cbp-procedure-config-delete-btn']`)}
  private getScaBtnInHeader(name: string, headerNo: number, className: string) { return $(`//div[contains(@class,'sca-header-${headerNo}')]//button[text()='${name}' and contains(@class,'${className}')]`)}
  private getProceduresDropdown(headerNo: number)     { return  $(`//div[contains(@class,'sca-header-${headerNo}')]//button[@data-testid="sca-actions-dropdown-button"]`)}
  private getAction(actionName: string)               { return $(`//ul[@data-testid="lui-ccl-threedot-menu-list"]//*[text()="${actionName}"]/ancestor::div[@role='button']`);}
  private getProcedureCheckBoxItem(procedureName: string) { return $(`//div[@data-testid="mapProcedureList"]//p[text()="${procedureName}"]/ancestor::tr//input`)}
  private getView(viewName: string)                   { return $(`//div[@data-testid="listOfViews"]//div[text()='${viewName}']`)}
  private getScaDropdownItem(itemName: string)        { return $(`//li[@data-testid='sca-actions-dropdown-item']//span[text() = '${itemName}']`)}
  private getScaDropdownItemInConfig(procedureName: string) { return $(`//li[@value='${procedureName}']`)}
  private getThreeDotMenu(entityName: string)         { return $(`//div[@data-testId='lui-ccl-table']//div/p[text()='${entityName}']/ancestor::tr//button[@data-testid="lui-ccl-threedot-menu-icon-button"]`)}
  private getProcedureDragHandle(procedureName: string) { return $(`//div[@data-testid="mapProcedureList"]//p[text()="${procedureName}"]/ancestor::tr//button[@aria-label="Move"]`)}
  private get processDropdownClearBtn()           { return $("//button[@aria-label='Clear' and @title='Clear']");}
  private getActionMenuItem(actionName: string)   { return $(`//ul[@data-testid="lui-ccl-threedot-menu-list"]//div[contains(@class,'MuiListItemButton-root') and .//div[contains(text(),"${actionName}")]]`)}
  private getProcessOption()                      { return (processName: string) => $(`//li[.='${processName}']`)}
  private getTableRowByEntity()                   { return (entityName: string) => $(`//tr[@data-testid='lui-ccl-table-row' and .//td/div/p[contains(text(),'${entityName}')]]`)}
  private getThreeDotMenuInRow()                  { return (row: WebdriverIO.Element) => row.$(`.//td[last()]//button[@data-testid='lui-ccl-threedot-menu-icon-button']`)}
  private get processTableContainer()             { return $("//div[@data-testid='lui-ccl-table']"); }
  private get processLinks()                      { return $$("//tr[@data-testid='lui-ccl-table-row']//a"); }
  private get allToggleBtn()                              { return $(`//*[@role="switch"]`) }
  public getselectedChildView(childViewName: string)      { return $(`//div[contains(@class, 'left-section')]//h2[normalize-space(text())='${childViewName}']`) }
  public getPrimarySCABtn(procedureName: string)          { return $(`//button[@aria-label='${procedureName}']`) }
  public getSecondarySCABtn(procedureName: string)        { return $(`//button[@aria-label='${procedureName}']`) }
  private selectProceduresToMapCheckbox()                         { return $('//p[text()="Select Procedures to Map"]/ancestor::div[contains(@class,"MuiBox-root")]//input[@type="checkbox" and @aria-label="Select All"]')}

  public async isPopupOpened(procedureName: string): Promise<boolean> {
    const dialogHeader: WebdriverIO.Element = await this.getDialogHeaderEle(procedureName);
    await dialogHeader.waitForDisplayed({ timeout: 90000 });
    const isDialogHeaderExist: boolean = await this.doesElementExist(dialogHeader, `Checking if popup layout is opened for ${procedureName} supply chain procedure`);
    await CommonFunctions.logMessage("INFO", `popup layout is opened for ${procedureName} supply chain procedure: ${isDialogHeaderExist}`);
    return isDialogHeaderExist;
  }

  public async getGridHeaderWidth(): Promise<number> {
    const element = await this.gridHeaderContainer;
    await element.waitForDisplayed({ timeout: 90000 });
    const width = await element.getCSSProperty('width');
    await CommonFunctions.logMessage("INFO", `Grid header width: ${width.parsed.value}`);
    return width.parsed.value;
  }

  public async verifySCABtn(name: string, className: string): Promise<boolean> {
    const width: number = await this.getGridHeaderWidth();
    let scaBtn: WebdriverIO.Element;
    if (width <= 960) {
      scaBtn = await this.getScaBtnInHeader(name, 2, className);
    } else {
      scaBtn = await this.getScaBtnInHeader(name, 1, className);
    }
    await scaBtn.waitForDisplayed({ timeout: 90000 });
    const isScaBtnExist: boolean = await this.doesElementExist(scaBtn, `Checking if ${name} SCA button exists`);
    await CommonFunctions.logMessage("INFO", `Is ${name} SCA button exist :: ${isScaBtnExist}`);
    return isScaBtnExist;
  }

  public async clickOnProceduresDropdown(): Promise<boolean> {
    const width: number = await this.getGridHeaderWidth();
    let proceduresDropdown: WebdriverIO.Element;
    if (width <= 960) {
      proceduresDropdown = await this.getProceduresDropdown(2);
    } else {
      proceduresDropdown = await this.getProceduresDropdown(1);
    }
    await proceduresDropdown.waitForDisplayed({ timeout: 90000 });
    const isProceduresDropdownExist: boolean = await this.doesElementExist(proceduresDropdown, "Checking if procedure dropdown exists");
    await CommonFunctions.logMessage("INFO", `Is procedure dropdown exist :: ${isProceduresDropdownExist}`);
    if (isProceduresDropdownExist) {
      await CommonFunctions.logMessage("INFO", "Clicking on procedures dropdown");
      await this.doClick(proceduresDropdown, "Clicking on procedures dropdown");
      return true;
    }
    await CommonFunctions.logMessage("INFO", "Unable to click on procedures dropdown");
    return false;
  }

  public async verifyOtherActionsInProceduresDropdown(actions: { procedureDisplayName: string }[], isProceduresArranged = false): Promise<boolean> {
      await this.clickOnProceduresDropdown();
      await browser.waitUntil(
        async () => {
          const items = await this.scaDropdownItems;
          return items.length > 0;
        },
        { timeout: 30000, timeoutMsg: 'Dropdown items did not load' }
      );
      const scaDropdownEles = await this.scaDropdownItems;
      const dropdownTexts = await Promise.all(scaDropdownEles.map(ele => this.doGetText(ele, `Getting dropdown item text, ${ele}`)));
      if(isProceduresArranged) {
        for (let i = 0; i < actions.length; i++) {
            if (!dropdownTexts?.includes(actions[i].procedureDisplayName)) {
                await CommonFunctions.logMessage("INFO", `${actions[i].procedureDisplayName} not matched with ${dropdownTexts[i]} in dropdown items`);
                await browser.keys('Escape');
                return false;
            }
        }
      }
      else {
        for (const action of actions) {
            if (!dropdownTexts.includes(action.procedureDisplayName)) {
                await CommonFunctions.logMessage("INFO", `${action.procedureDisplayName} not found in dropdown items`);
                await browser.keys('Escape');
                return false;
            }
        }
      }
      await browser.keys('Escape');
      return true;
  }

  public async selectView(viewName: string): Promise<void> {
    const view = await this.getView(viewName);
    await view.waitForClickable({ timeout: 90000 });
    await this.doClick(view, `Clicking on ${viewName} view`);
  }

  public async selectProcedures(procedures: string[]): Promise<void> {
    for (let procedure of procedures) {
      const checkbox = await this.getProcedureCheckBoxItem(procedure);
      const isSelected = await checkbox.isSelected();
      await CommonFunctions.logMessage("INFO", `Is ${procedure} procedure checked :: ${isSelected}`);

      if (!isSelected) {
        await this.doClick(checkbox, `Clicking ${procedure} procedure checkbox`);
      }
    }
  }

  public async deselectProcedures(procedures: string[]): Promise<void> {
    for (let procedure of procedures) {
      const checkbox = await this.getProcedureCheckBoxItem(procedure);
      const isSelected = await checkbox.isSelected();
      await CommonFunctions.logMessage("INFO", `Is ${procedure} procedure checked :: ${isSelected}`);

      if (isSelected) {
        await this.doClick(checkbox, `Clicking ${procedure} procedure checkbox to deselect`);
      }
    }
  }

  public async selectPrimary(procedureName: string): Promise<void> {
    const dropdown = await this.primaryScaDropdownInConfig;
    await dropdown.waitForClickable({ timeout: 90000 });
    await this.doClick(dropdown, "Clicking on primary SCA dropdown");
    const procedure = await this.getScaDropdownItemInConfig(procedureName);
    await procedure.waitForClickable({ timeout: 90000 });
    await this.doClick(procedure, `Selecting ${procedureName} from primary dropdown`);
  }

  public async selectSecondary(procedureName: string): Promise<void> {
    const dropdown = await this.secondaryScaDropdownInConfig;
    await dropdown.waitForClickable({ timeout: 90000 });
    await this.doClick(dropdown, "Clicking on secondary SCA dropdown");
    const procedure = await this.getScaDropdownItemInConfig(procedureName);
    await procedure.waitForClickable({ timeout: 90000 });
    await this.doClick(procedure, `Selecting ${procedureName} from secondary dropdown`);
  }
  public async arrangeProceduresInOrder(sourceProcedureName: string, targetProcedureName: string): Promise<void> {
    await CommonFunctions.logMessage("INFO", `Arranging procedures in order: ${sourceProcedureName} before ${targetProcedureName}`);
    const sourceProcedure = await this.getProcedureDragHandle(sourceProcedureName);
    await sourceProcedure.waitForDisplayed();
    const targetProcedure = await this.getProcedureDragHandle(targetProcedureName);
    await targetProcedure.waitForDisplayed();
    await sourceProcedure.dragAndDrop(targetProcedure);
  }

  public async configureSCP(viewName: string, procedures: string[], primaryAction: string, secondaryAction: string): Promise<boolean> {
    await this.selectView(viewName);
    await this.selectProcedures(procedures);
    await this.arrangeProceduresInOrder(procedures[2], procedures[3]);
    await this.selectPrimary(primaryAction);
    await this.selectSecondary(secondaryAction);
    const saveButton = await this.saveBtn;
    await saveButton.waitForClickable({ timeout: 90000 });
    await this.doClick(saveButton, 'Clicking on save button');
    const verify = await CommonFunctions.verifyAlertMsg('Your changes have been saved successfully');
    return verify;
  }

  public async verifyAllSCAEnabled(viewName: string, procedures: string[]): Promise<boolean> {
    await this.selectView(viewName);
    const results = await Promise.all(procedures.map(async (procedure: string) => {
      const checkbox = await this.getProcedureCheckBoxItem(procedure);
      return await checkbox.isSelected();
    }));
    return results.every(result => result === true);
  }

  public async disableSCA(viewName: string, procedures: string[]): Promise<boolean> {
    await this.selectView(viewName);
    await this.deselectProcedures(procedures);
    const saveButton = await this.saveBtn;
    await saveButton.waitForClickable({ timeout: 3000 });
    await this.doClick(saveButton, 'Clicking on save button');
    const verify = await CommonFunctions.verifyAlertMsg('Your changes have been saved successfully');
    return verify;
  }

  public async selectProcess(processName: string): Promise<void> {
      const tableContainer = await this.processTableContainer;
      await tableContainer.waitForDisplayed({ timeout: 20000 });
      const processLinks = await this.processLinks;
      const linkTexts = await Promise.all(processLinks.map(async link => await link.getText()));
      await CommonFunctions.logMessage("INFO", `Process links found: ${JSON.stringify(linkTexts)}`);

      const processBtn = await this.getProcessBtn(processName);
      if (await processBtn.isExisting() && await processBtn.isClickable()) {
          await this.doClick(processBtn, `Clicking on process button: ${processName}`);
          return;
      }

      const processDropdownInput = await this.processDropdownInput;
      if (await processDropdownInput.isExisting() && await processDropdownInput.isClickable()) {
          await processDropdownInput.waitForClickable({ timeout: 10000 });
          await processDropdownInput.click();
          await browser.pause(500);

          const clearBtn = await this.processDropdownClearBtn;
          if (await clearBtn.isDisplayed()) {
              await clearBtn.click();
              await browser.pause(300);
          }
          await processDropdownInput.setValue(processName);
          await browser.pause(500);

          const processOption = await this.getProcessOption()(processName);
          await processOption.waitForDisplayed({ timeout: 10000 });
          await processOption.click();
          return;
      }

      await CommonFunctions.logMessage("ERROR", `Process "${processName}" not found as link or dropdown input.`);
      throw new Error(`Process "${processName}" not found as link or dropdown input.`);
  }

  public async isProcedureMapped(procedureName: string): Promise<boolean> {
    try {
      const procedureElement = this.getProcedureName(procedureName);
      await procedureElement.waitForDisplayed({ timeout: 90000 });
      const isExisting = await this.doesElementExist(procedureElement, `Checking if procedure ${procedureName} is mapped`);
      return isExisting;
    } catch (error) {
      await CommonFunctions.logMessage("ERROR", `Error while checking if procedure ${procedureName} is mapped: ${error}`);
      return false;
    }
  }

  public async selectProcessesAndAttributes(procedureName: string, attributeValue: string): Promise<void> {
    await CommonFunctions.logMessage("INFO", `Selecting procedure: ${procedureName}`);
    const procDropdownBtn = await this.procedureDropdownBtn;
    await procDropdownBtn.waitForClickable({ timeout: 90000 });
    await this.doClick(procDropdownBtn, 'Clicking on procedure dropdown');
    await this.setComboboxValue({ labelName: 'Procedure', value: procedureName }, await this.procedureCombobox);

    await CommonFunctions.logMessage("INFO", `Selecting attribute: ${attributeValue}`);
    const attrDropdownBtn = await this.attributeDropdownBtn;
    await attrDropdownBtn.waitForClickable({ timeout: 90000 });
    await this.doClick(attrDropdownBtn, "Clicking on attribute dropdown");
    await this.setComboboxValue({ labelName: 'Attribute', value: attributeValue }, await this.attributeCombobox);

    const saveBtn = await this.procedureSaveBtn;
    await saveBtn.waitForDisplayed({ timeout: 90000 });
    const isEnabled = await saveBtn.isEnabled();
    await CommonFunctions.logMessage("INFO", `Save button enabled: ${isEnabled}`);
    await saveBtn.waitForEnabled({ timeout: 90000 });
    await this.doClick(saveBtn, "Clicking on save button");
    await CommonFunctions.logMessage("INFO", `Procedure and attribute selected successfully.`);
  }

  public async deleteProcedure(procedureName: string): Promise<void> {
    const deleteBtn = await this.procedureDeleteBtn(procedureName);
    await deleteBtn.waitForClickable({ timeout: 90000 });
    await this.doClick(deleteBtn, `Clicking on delete Icon of ${procedureName}`);
    const deleteProcedurePopup = await this.procedureDeleteBtnInPopup;
    await deleteProcedurePopup.waitForClickable({ timeout: 90000 });
    await this.doClick(deleteProcedurePopup, `Clicking on delete button in delete popup for ${procedureName}`);
  }

  public async selectAllProceduresCheckboxToMap(enable: boolean): Promise<boolean> {
    try {
      const selectProcedurecheckbox = await this.selectProceduresToMapCheckbox();
      const isProcedureChecked = await selectProcedurecheckbox.isSelected();
      if (isProcedureChecked !== enable) {
        await CommonFunctions.logMessage("INFO", `Clicking checkbox to ${enable ? "enable" : "disable"} Select All`);
        await this.doClick(selectProcedurecheckbox, enable ? "Enabling Select All" : "Disabling Select All");
      }
      const finalChecked = await selectProcedurecheckbox.isSelected();
      return finalChecked === enable;
    } catch (error) {
      await CommonFunctions.logMessage("ERROR", `Error in selectAllProceduresCheckboxToMap: ${error}`);
      return false;
    }
  }

  public async selectPrimaryAndSecondaryActions(primaryValue: string, secondaryValue: string): Promise<void> {
    await this.selectPrimary(primaryValue);
    const primarySelector = await this.primaryScaDropdownInConfig;
    await primarySelector.waitForDisplayed({ timeout: 5000 });
    const primaryText = await primarySelector.getText();
    await this.selectSecondary(secondaryValue);
    const secondarySelector = await this.secondaryScaDropdownInConfig;
    await secondarySelector.waitForDisplayed({ timeout: 5000 });
    const secondaryText = await secondarySelector.getText();
    await CommonFunctions.logMessage("INFO", `Primary action selected: ${primaryText}, Secondary action selected: ${secondaryText}`);
  }

  public async toggleApplyAll(enable: boolean): Promise<boolean> {
    const applyAllToggle = await this.allToggleBtn;
    const isChecked = await applyAllToggle.isSelected();
    if (isChecked !== enable) {
      await this.doClick(applyAllToggle, enable ? "Enabling Apply All" : "Disabling Apply All");
    }
    return !isChecked;
  }

  public async clickSaveButton(): Promise<void> {
    const saveButton = await this.saveBtn;
    await saveButton.waitForClickable({ timeout: 10000 });
    await this.doClick(saveButton, 'Clicking on save button');
  }

  public async isViewLoaded(viewName: string): Promise<boolean> {
    await this.getselectedChildView(viewName).waitForDisplayed({ timeout: 10000 });
    let isDisplayed: boolean = await this.getselectedChildView(viewName).isDisplayed();
    await CommonFunctions.logMessage("INFO", "View " + viewName + " is loaded: " + isDisplayed);
    return isDisplayed;
  }

  public async isPrimaryButtonDisplayed(procedureName: string): Promise<boolean> {
    await this.getPrimarySCABtn(procedureName).waitForDisplayed({ timeout: 10000 });
    let exists = await this.doesElementExist(this.getPrimarySCABtn(procedureName), "Primary SCA button for " + procedureName);
    return exists;
  }

  public async isSecondaryButtonDisplayed(procedureName: string): Promise<boolean> {
    await this.getSecondarySCABtn(procedureName).waitForDisplayed({ timeout: 10000 });
    let exists = await this.doesElementExist(this.getSecondarySCABtn(procedureName), "Secondary SCA button for " + procedureName);
    return exists;
  }

  public async selectSingleAction(entityName: string, actionName: string): Promise<void> {
    const row = await this.getThreeDotMenu(entityName);
    await row.waitForClickable({ timeout: 90000 });
    await CommonFunctions.logMessage("INFO", `Clicking on three dot menu ${entityName}`);
    await this.doClick(row, `Clicking on three dot menu for ${entityName}`);
    const action = await this.getAction(actionName);
    await action.waitForClickable({ timeout: 90000 });
    await CommonFunctions.logMessage("INFO", `Clicking on ${actionName} action in three dot menu`);
    await this.doClick(action, `Clicking on ${actionName} action`);
  }

  public async isActionEnabled(entityName: string, actionName: string): Promise<boolean> {
      const row = await this.getTableRowByEntity()(entityName);
      await row.waitForDisplayed({ timeout: 90000 });

      const threeDotMenu = await this.getThreeDotMenuInRow()(row);
      await threeDotMenu.waitForClickable({ timeout: 90000 });
      await this.doClick(threeDotMenu, `Clicking on three dot menu for ${entityName}`);
      const actionMenuItem = await this.getActionMenuItem(actionName);
      await actionMenuItem.waitForDisplayed({ timeout: 30000 });

      const isDisabled = await actionMenuItem.getAttribute('aria-disabled') === 'true' || 
                        (await actionMenuItem.getAttribute('class') || '').includes('Mui-disabled');
      await CommonFunctions.logMessage("INFO", `Is ${actionName} action enabled :: ${!isDisabled}`);
      return !isDisabled;
  }

  public async clickProcedureItemFromDropdown(procedureName: string): Promise<boolean> {
    await this.clickOnProceduresDropdown();
    await browser.pause(2000);
    await this.doClick(await this.getScaDropdownItem(procedureName), `Clicking on ${procedureName} procedure item from dropdown`);
    return true;
  }

  public async clickOnNextStep(): Promise<void> {
    const nxtStepEle = await this.scaNextStepBtn;
    await nxtStepEle.waitForClickable({ timeout: 90000 });
    await CommonFunctions.logMessage("INFO", "Clicking on next step button");
    await this.doClick(nxtStepEle, "Clicking on next step button");
  }

  public async saveAddLaneForm(): Promise<void> {
    const addLaneEle = await this.addLaneBtn;
    await addLaneEle.waitForClickable({ timeout: 90000 });
    await CommonFunctions.logMessage("INFO", "Add lane button clicked");
    await this.doClick(addLaneEle, "Clicking on Add Lane button");
  }

  public async startSparqEngine(procedureName: string): Promise<void> {
    const isSparqEngineProcedureClicked = await this.clickProcedureItemFromDropdown(procedureName);
    await CommonFunctions.compareTwoValues(isSparqEngineProcedureClicked, true, `is ${procedureName} clicked: ${isSparqEngineProcedureClicked}`);
    const runProcedure = await this.scaRunButton;
    await runProcedure.waitForClickable({ timeout: 90000 });
    await this.doClick(runProcedure, "Clicking run button");
    await CommonFunctions.logMessage('INFO', 'clicked run button');
  }

  public async isSparqEngineDown(waitTime: any = 120000): Promise<boolean> {
    try {
      const getSparqStatusAlertMsg = await this.getAlertMsg;
      await CommonFunctions.logMessage('INFO', 'checking is SPARQ engine down');
      await getSparqStatusAlertMsg.waitForDisplayed({ timeout: waitTime });
      const getText = await this.doGetText(getSparqStatusAlertMsg, "Getting SPARQ status alert message");
      await CommonFunctions.logMessage('INFO', `alert msg:: ${getText}`);
      if (getText.includes('Internal Server Error') || getText.includes('not found or failed to respond.')) {
        return true;
      }
      return false;
    } catch (e) {
      await CommonFunctions.logMessage('INFO', `Error checking SPARQ engine status: ${e}`);
      return false;
    }
  }
}

export default new SCAPage();
