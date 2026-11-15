import MfePage from './mfe.page';
import ProcessPage from './process.page';
import CommonFunctions from '../util/common.util';
import ScopePage  from './scope.page';

export class GlobalSettingsPage extends MfePage {

  private get threeDotButton()                                 { return $(`//button[@data-testid='threeDotButton']`) }
  private get settingsTxtItem()                                { return $(`//ul/li[text()='Settings']`) }
  private get processDropdown()                                { return $(`//input[@id="single-select-process"]`)}
  private get btnSave()                                        { return $("//button[@data-testid='save-btn']")}
  private get btnRemove()                                      { return $("//button[@id='confirm-dialog-save-btn']")}
  private getGlobalSettingsItemFromMenu(itemName: string)      { return $(`//div[contains(@class,'MuiTreeItem-label') and text()='${itemName}']`) }
  private getProcessMenuButton(processName: string)            { return $(`//tr[contains(.,'${processName}')]//button[@data-testid='lui-ccl-threedot-menu-icon-button']`) }
  private getProcessRow(processName: string)                   { return $(`//tr[contains(.,'${processName}')]`) }
  private getMenuOptionsMenuItem(menuTitle: string)            { return $(`//div[contains(@data-testid, 'lui-ccl-threedot-menu-listitem')]//span[text()='${menuTitle}']`) }
  private get allViewsGroupDropdown()                          { return $(`//input[@data-testid="select-container-select"]`) }
  private getViewElementFromDropdown(title: string)            { return $(`//li[@data-testid="select-container-option"][@value='${title}']`) }
  private getCheckViewIsInArrangeViews(title: string)          { return $(`//p[contains(text(), '${title}')][ancestor::*[@data-testid='arrange-views-row']]`) }
  private get primarySecondaryButtonSection()                  { return $(`(//button[@aria-label="Procedures"]/ancestor::div[2])[2]`) }
  private get threeDotbtn()                                    { return $(`(//button[@data-testid='lui-ccl-threedot-menu-icon-button'])[last()]`); }
  private get removeDatasetupConfigurationHeading()            { return $(`//h2[@id='customized-dialog-title']//h5[contains(text(), 'Remove Configuration')]`)}
  private get saveInteractivePlanningConfiguraton()            { return $(`//button[contains(@class, 'MuiButton-containedPrimary') and contains(text(), 'Save')]`)}
  private get cancelDataSetupModal()                           { return $(`//button[contains(@class, 'MuiButton-outlinedPrimary ') and contains(text(), 'Cancel')]`)}
  private get removeDataSetupConfigurationBtn()                { return $(`//button[contains(text(),'Remove')]`)}
  private get assignedActorProcedure()                         { return $(`//span[@data-testid="lui-ccl-object-status-label-container"]`)}
  private get assignedActorProcedureValidate()                 { return $$(`//span[@data-testid="lui-ccl-object-status-label-container"]`)}
  private get primaryContainedBtn()                            { return $(`//button[contains(@class,"MuiButton-containedPrimary")]`)}
  private get nameInput()                                      { return $(`//div[@role="presentation"]//input`)}
  private get viewNameInput()                                  { return $(`//input[@data-testid="lui-settings-ui-text-field-input-name"]`)}
  private get viewGroupInput()                                 { return $(`//input[@id="lui-settings-ui-autocomplete-containerId"]`)}
  private get viewSearchInput()                                { return $(`//input[@placeholder='Search']`)}
  private get canReadDropdown()                                { return $(`//input[@data-testid="lui-settings-ui-autocomplete-input-read"]`)}
  private get cycles()                                         { return $$(`//tbody//td[@data-index="1"]`)} 
  private get mixedLayoutOption()                              { return $("//button[@data-testid='lui-dashboard-layout-mixed']")}
  private get rowLayoutOption()                                { return $("//button[@data-testid='lui-dashboard-layout-row']")}
  private get layoutContentHeading()                           { return $("//*[contains(text(), 'Layout Content')]")}
  private get disabledRowLayoutOption()                        { return $(`//button[@data-testid="lui-dashboard-layout-row" and (contains(@class,"Mui-disabled"))]`)}
  private get disabledMixedLayoutOption()                      { return $(`//button[@data-testid="lui-dashboard-layout-mixed" and (contains(@class,"Mui-disabled"))]`)}
  private get viewModalCancelBtn()                             { return $("//button[@data-testid='lui-settings-ui-cancel-button']")}
  private getPlusIcon(title: string)                           { return $(`//button[@title="${title}"]`)}
  private getView(viewName: string)                            { return $(`//tr[contains(@class, 'MuiTableRow-root')]//td//p[text()='${viewName}']`)}
  private getThreeDotMenuOfView(viewName: string)              { return $(`//p[text()="${viewName}"]//ancestor::tr//button[@data-testid="lui-ccl-threedot-menu-icon-button"]`)}
  private getThreeDotMenuOfViewGroup(viewGroupName: string)    { return $(`//p[text()="${viewGroupName}"]//ancestor::tr//button[@data-testid="lui-ccl-threedot-menu-icon-button"]`)}
  private workFlowFilterTab()                                  { return $(`//button[@data-testid='filterTab']`)}
  public workFlowFilterConfigureBtn()                          { return $(`//button[@data-testid='workflowFilterConfigure']`)};  
  public workFlowFilterDimensionBtn(dimension:string)          { return $(`//button[@data-testid='${dimension}']`)};
  public workFlowFilterSaveBtn()                               { return $(`//button[@data-testid='save-btn']`)}  
  private getViewByName(viewName: string)                      { return $(`//li//div[text()='${viewName}']`)}
  private getCalendar(name: string)                            { return $(`//a[text()="${name}"]`)} 
  private dataSetupField(label: string, value: string)         { return $(`//label[text()='${label}']//parent::div//input[@value='${value}']`)}
  private get deleteViewOption()                               { return $("//span[text()='Delete View']")}
  private get enableQuickFilterToggle()                        { return $(`//span[@data-testid='quick-filter-checkbox']//input[@type='checkbox']`)}
  private getselectProcessFromPO(ProcessName: string)         { return $(`//tr[@data-testid='lui-ccl-table-row']/td//a[text()='${ProcessName}']`)}

  public async clickGlobalSettings(): Promise<void> {
    const elegeneralsettings = await this.threeDotButton;
    await elegeneralsettings.waitForExist({ timeout: 60000 });
    await elegeneralsettings.waitForDisplayed({ timeout: 60000 });
    await this.doClick(elegeneralsettings, 'Clicking 3 dot button in PO');
    
    const gSettings = await this.settingsTxtItem;
    await gSettings.waitForDisplayed({ timeout: 60000 });
    await this.doClick(gSettings, 'Clicking settings in PO');
  }

  public async clickGlobalSettingsListMenu(itemName: string): Promise<void> {
    const elegeneralsettingsMenu = await this.getGlobalSettingsItemFromMenu(itemName);
    await elegeneralsettingsMenu.waitForExist({ timeout: 60000 });
    await elegeneralsettingsMenu.waitForDisplayed({ timeout: 60000 });
    await this.doClick(elegeneralsettingsMenu, `Clicking ${itemName} item from settings in PO`);
  }

  public async clickOnProcessFromList(processName: string): Promise<void> {
    const selectProcessFromList = await this.getselectProcessFromPO(processName);
    await selectProcessFromList.waitForExist({ timeout: 60000 });
    await selectProcessFromList.waitForClickable({ timeout: 60000 });
    await this.doClick(selectProcessFromList, `Clicking ${processName} item from settings in PO`);
  }

  public async clickOnPlus(title: "Create View" | "Create View Group"): Promise<void> {
      const plusEle = await this.getPlusIcon(title);
      await plusEle.waitForClickable({timeout: 30000});
      await this.doClick(plusEle, `Clicking on ${title} button`);
  }

  public async setViewName(viewName: string): Promise<void> {
    const eleViewNameInp = await this.viewNameInput;
    await this.doClearAndEnterText(eleViewNameInp, viewName, `Setting view name: ${viewName}`);
  }

  public async selectViewGroup(viewGroupName: string): Promise<void> {
    const viewGroupInp = await this.viewGroupInput;
    await this.doClearAndEnterText(viewGroupInp, viewGroupName, `Entering view group name: ${viewGroupName}`);
    await browser.keys('Down arrow');
    await browser.keys('Enter');
    await CommonFunctions.logMessage("INFO", `${viewGroupName} view group selected`);
  }

  public async setViewGroupName(name: string): Promise<void> {
    const nameInpEle = await this.nameInput;
    await this.doClearAndEnterText(nameInpEle, name, `Set name value with "${name}"`);
  }

  public async clickOnPrimaryAction(): Promise<void> {
    const primaryBtn = await this.primaryContainedBtn;
    const btnName = await this.doGetText(primaryBtn, "Getting primary button text");
    await primaryBtn.waitForEnabled({timeout: 30000});
    const isBtnEnabled = await primaryBtn.isEnabled();
    if(isBtnEnabled){
      await this.doClick(primaryBtn, `Clicking on ${btnName} button`);
    } else {
      await CommonFunctions.logMessage("INFO", `Unable to click on ${btnName} button`);
    }
  }

  public async createPlanningView(viewName: string, viewGroupName: string): Promise<void> {
    await this.clickOnPlus("Create View");
    await this.setViewName(viewName);
    await this.selectViewGroup(viewGroupName);
    await this.verifyLayout();
    await this.clickOnPrimaryAction();
  }

  public async createViewGroup(viewGroupName: string): Promise<void> {
    await this.clickOnPlus("Create View Group");
    await this.setViewGroupName(viewGroupName);
    await this.clickOnPrimaryAction();
  }

  public async searchForEle(name: string): Promise<void> {
    const eleSearchBox = await this.viewSearchInput;
    await this.doClearAndEnterText(eleSearchBox, name, `Searching for: ${name}`);
  }

  public async planningViewSearch(name: string): Promise<void> {
    const eleSearchBox = await this.viewSearchInput;
    await this.doEnterText(eleSearchBox, name, `Planning view search: ${name}`);
  }

  public async searchViewExist(viewName: string): Promise<boolean> {
    await this.searchForEle(viewName);
    const eleViewNameAppear = await this.getView(viewName);
    await eleViewNameAppear.waitForDisplayed({ timeout: 30000 });
    const isViewExist: boolean = await this.doesElementExist(eleViewNameAppear, `Checking if view ${viewName} exists`);
    return isViewExist;
  }

  public async selectProcess(processName: string): Promise<void> {
    const processDropdownEle = await this.processDropdown;
    await this.doClick(processDropdownEle, 'Clicking process dropdown of global settings');
    await this.doClearAndEnterText(processDropdownEle, processName, `Selecting ${processName} item from dropdown`);
    await browser.pause(1000);
    const opt = $("//*[text()='" + processName + "']");
    await this.doClick(opt, `Selecting Process: ${processName}`);
  }

  public async select3DotButtonForEntity(entity: string): Promise<void> {
    const btn3Dot = await $("//td[div/p[text()='" + entity + "']]/following-sibling::td//button[@aria-label='Action Items']")
    await this.doClick(btn3Dot, "Clicking 3 dot Button for the Entity: " + entity);
  }

  public async selectActionItemForEntity(actionItem: string): Promise<void> {
    const slctAction = await $("//ul[@data-testid='lui-ccl-threedot-menu-list']//span[contains(text(),'" + actionItem + "')]");
    await this.doClick(slctAction, "Selecting Action Item: " + actionItem);
  }

  public async selectingView(view: string): Promise<void> {
    const chckView = await $("//p[text()='" + view + "']/parent::td/preceding-sibling::td//input[@type='checkbox']");
    await this.doClick(chckView, "Selecting View: " + view);
  }

  public async clickSave(): Promise<void> {
    await this.doClick(await this.btnSave, "Clicking Save button");
  }

  public async clickRemove(): Promise<void> {
    await this.doClick(await this.btnRemove, "Clicking Remove button");
  }

  public async addViewMappingToEntity(entity: string, arrView: string[]): Promise<boolean> {
    await this.select3DotButtonForEntity(entity);
    await this.selectActionItemForEntity("Map With");
    for (let i = 0; i < arrView.length; i++) {
      await this.selectingView(arrView[i]);
    }
    await this.clickSave();
    return await CommonFunctions.verifyAlertMsg("Your changes have been saved successfully");
  }

  public async removeViewMappingToEntity(entity: string): Promise<boolean> {
    await this.select3DotButtonForEntity(entity);
    await this.selectActionItemForEntity("Remove Mappings");
    await this.clickRemove();
    return await CommonFunctions.verifyAlertMsg("Removed all mapped views successfully");
  }

  public async clickThreeDotIcon(): Promise<boolean> {
    try {
      await this.doClick(await this.threeDotbtn, "Clicking three-dot icon on the view");
      return true;
    } catch (error) {
      await CommonFunctions.logMessage("ERROR", `Failed to click three-dot icon: ${error}`);
      return false;
    }
  }

  public async selectOptionFromThreeDotMenu(option: string): Promise<boolean> {
    try {
      const optionLocator = await $(`//span[text()='${option}']`);
      await this.doClick(optionLocator, `Selecting "${option}" option from the dropdown`);
      return true;
    } catch (error) {
      await CommonFunctions.logMessage("ERROR", `Failed to select "${option}" option from the dropdown: ${error}`);
      return false;
    }
  }

  public async mappingDataConfig(actorName: string, procedureName: string, label: string): Promise<boolean> {
    const ddMaasActorClick = await $('//input[@id="'+ actorName +'" and @placeholder="'+label+'" and @type="text"]');
    await ddMaasActorClick.waitForDisplayed({timeout: 2000});
    const currentValue = await this.doGetAttribute(ddMaasActorClick, "value", `Getting current value of ${actorName} field`);
    if (currentValue && currentValue.trim() === procedureName.trim()) {
      await CommonFunctions.logMessage("INFO", `The ${actorName} field is already set with the expected value: ${procedureName}`);
      return true;
    }
    await ddMaasActorClick.waitForClickable({timeout: 2000});
    await this.doClick(ddMaasActorClick, `Clicking data config dropdown for ${actorName}`);
    
    const actorOption = await $('//*[text()="'+ procedureName +'"]');
    const optionExists = await this.doesElementExist(actorOption, `Checking if option ${procedureName} exists`);
    if (optionExists) {
      await this.doClick(actorOption, `Selecting option: ${procedureName}`);
      await browser.keys('Enter');
      return true;
    } else {
      await CommonFunctions.logMessage("ERROR", `Option "${procedureName}" not found in the options list.`);
      return false;
    }
  }

  public async validateActorProcedure(actorName?: string, procedureName?: string): Promise<boolean> {
    let actorValidation = true;
    let procedureValidation = true;

    if (actorName) {
      const assignedActorName = await $(
        `//span[@data-testid="lui-ccl-object-status-label-container" and contains(text(),'${actorName.substring(0, 17)}')]`
      );
      actorValidation = await this.doesElementExist(assignedActorName, `Validating actor assignment: ${actorName}`);
      if (actorValidation) {
        await CommonFunctions.logMessage("INFO", `Actor name "${actorName}" assignment validated successfully.`);
      } else {
        await CommonFunctions.logMessage("ERROR", `Actor name "${actorName}" assignment validation failed.`);
      }
    }

    if (procedureName) {
      const assignedProcedureName = await $(
        `//span[@data-testid="lui-ccl-object-status-label-container" and contains(text(),'${procedureName.substring(0, 19)}')]`
      );
      procedureValidation = await this.doesElementExist(assignedProcedureName, `Validating procedure assignment: ${procedureName}`);
      if (procedureValidation) {
        await CommonFunctions.logMessage("INFO", `Procedure name "${procedureName}" assignment validated successfully.`);
      } else {
        await CommonFunctions.logMessage("ERROR", `Procedure name "${procedureName}" assignment validation failed.`);
      }
    }

    return actorValidation && procedureValidation;
  }

  public async removeDataSetupConfiguration(): Promise<void> {
    try {
      await this.clickThreeDotIcon();
      await this.selectOptionFromThreeDotMenu('Remove Configuration');
      
      const removeConfig = await this.removeDatasetupConfigurationHeading;
      const headerExists = await this.doesElementExist(removeConfig, "Checking data setup remove configuration header");
      if (headerExists) {
        await this.doClick(removeConfig, "Clicking data setup remove configuration header");
      } else {
        await CommonFunctions.logMessage("WARN", "Remove Configuration heading not found.");
      }

      const removeConfigBtn = await this.removeDataSetupConfigurationBtn;
      const buttonExists = await this.doesElementExist(removeConfigBtn, "Checking data setup remove button");
      if (buttonExists) {
        await this.doClick(removeConfigBtn, "Clicking on Remove Configuration button");
        await browser.waitUntil(async () => !(await this.assignedActorProcedure.isExisting()), {
          timeout: 20000, 
          timeoutMsg: 'assignedActorProcedure still exists after removal'
        });
        await CommonFunctions.logMessage("INFO", "Clicked on Remove Configuration button and waited for removal.");
      } else {
        await CommonFunctions.logMessage("WARN", "Remove Configuration button not found.");
      }
    } catch (error) {
      await CommonFunctions.logMessage("ERROR", `An error occurred during data setup configuration removal: ${error.message}`);
      throw error;
    }
  }

  public async isInteractivePlanningConfigured(): Promise<boolean> {
    try {
      const isConfigured = await this.doesElementExist(await this.assignedActorProcedure, "Checking if Interactive Planning is configured");
      if (isConfigured) {
        await CommonFunctions.logMessage("INFO", "Interactive Planning is already configured.");
        return true;
      } else {
        await CommonFunctions.logMessage("INFO", "Interactive Planning is not configured.");
        return false;
      }
    } catch (error) {
      await CommonFunctions.logMessage("ERROR", `An error occurred while checking if Interactive Planning is configured: ${error.message}`);
      throw error;
    }
  }

  public async dataSetupConfiguredValidate(): Promise<boolean> {
    try {
      const elements = await this.assignedActorProcedureValidate;
      if (elements.length > 0) {
        const exists = await this.doesElementExist(elements[0], "Checking if Data Setup is configured");
        if (exists) {
          await CommonFunctions.logMessage("INFO", "Data Setup is still configured.");
          return true;
        } else {
          await CommonFunctions.logMessage("INFO", "Data Setup configuration is removed.");
          return false;
        }
      } else {
        await CommonFunctions.logMessage("INFO", "Data Setup configuration is removed.");
        return false;
      }
    } catch (error) {
      await CommonFunctions.logMessage("ERROR", `An error occurred while checking if Data Setup is configured: ${error.message}`);
      throw error;
    }
  }

  public async clickOnThreeDotMenuOfViewGroup(viewGroupName: string): Promise<void> {
    const threeDotMenu = await this.getThreeDotMenuOfViewGroup(viewGroupName);
    await this.doClick(threeDotMenu, 'Clicking on three dot menu of view group');
  }

  public async clickOnThreeDotMenuOfView(viewName: string): Promise<void> {
    const threeDotMenu = await this.getThreeDotMenuOfView(viewName);
    await threeDotMenu.waitForClickable({timeout: 30000});
    await this.doClick(threeDotMenu, 'Clicking on three dot menu of view');
  }

  public async deleteView(viewName: string): Promise<void> {
    await this.searchForEle(viewName);
    await browser.pause(1000);
    await this.clickOnThreeDotMenuOfView(viewName);
    let deleteOption = await this.deleteViewOption;
    let found = await deleteOption.isDisplayed();
    if (!found) {
        await CommonFunctions.logMessage("WARN", "Delete View option not found, retrying three-dot menu click...");
        await this.clickOnThreeDotMenuOfView(viewName);
        await browser.pause(500);
        deleteOption = await this.deleteViewOption;
        found = await deleteOption.isDisplayed();
    }

    if (found) {
        await this.selectOptionFromThreeDotMenu('Delete View');
        await browser.pause(500);
        await this.clickOnPrimaryAction();
        await browser.pause(1000);
    } else {
        await CommonFunctions.logMessage("ERROR", "Delete View option could not be found after retry.");
        throw new Error("Delete View option could not be found after retry.");
    }
  }

  public async editView(viewName: string, viewGroupName?: string): Promise<void> {
    await this.searchForEle(viewName);
    await browser.pause(1000);
    await this.clickOnThreeDotMenuOfView(viewName);
    await this.selectOptionFromThreeDotMenu('Settings');
    
    if(viewGroupName) {
      await this.selectViewGroup(viewGroupName);
    }
    
    const dropdownEle = await this.canReadDropdown;
    await this.doClick(dropdownEle, "Clicking can read dropdown");
    await browser.keys('Down arrow');
    await browser.keys('Enter');
    await this.clickOnPrimaryAction();
    const disabledRowLayoutOption = await this.doesElementExist(this.disabledRowLayoutOption, "Checking if Row layout option is disabled");
    const disabledMixedLayoutOption = await this.doesElementExist(this.disabledMixedLayoutOption, "Checking if Mixed layout option is disabled");
    if(disabledRowLayoutOption || disabledMixedLayoutOption) {
      await CommonFunctions.logMessage("INFO", "Layout selection is disabled as expected.");
    }
    else await CommonFunctions.logMessage("INFO", "Page Template field is not there as WITH_FF_PAGE_LAYOUTS feature flag is off.");
  }

  public async verifySelectedLayout(viewName: string): Promise<void> {
    await this.searchForEle(viewName);
    await browser.pause(1000);
    await this.clickOnThreeDotMenuOfView(viewName);
    await this.selectOptionFromThreeDotMenu('Settings');
    const disabledMixedLayoutOption = await this.doesElementExist(this.disabledMixedLayoutOption, "Checking if Mixed layout option is disabled");
    if(disabledMixedLayoutOption) {
      await CommonFunctions.logMessage("INFO", "Row Layout is selected as expected.");
    }
    else await CommonFunctions.logMessage("INFO", "Page Template field is not there as WITH_FF_PAGE_LAYOUTS feature flag is off.");
    await this.doClick(this.viewModalCancelBtn, "Closing the view settings modal");
  }

  public async deleteViewGroup(viewGroupName: string): Promise<void> {
    await this.searchForEle(viewGroupName);
    await this.clickOnThreeDotMenuOfViewGroup(viewGroupName);
    await this.selectOptionFromThreeDotMenu('Delete');
    await this.clickOnPrimaryAction();
  }

  public async openViewsMappingMenu(processName: string, menuTitle: string): Promise<void> {
    const processRow = this.getProcessRow(processName);
    await processRow.waitForDisplayed({ timeout: 90000, timeoutMsg: `Not exist process row ${processName}` });
    
    const threeDotMenu = await this.getProcessMenuButton(processName);
    await threeDotMenu.waitForDisplayed({ timeout: 90000, timeoutMsg: "Not exist three dot menu" });
    await this.doClick(threeDotMenu, 'Clicking three dot menu');
    
    const menuButton = await this.getMenuOptionsMenuItem(menuTitle);
    await menuButton.waitForDisplayed({ timeout: 2000, timeoutMsg: "Not exist" });
    await this.doClick(menuButton, `Clicking menu button ${menuTitle}`);
  }

  public async checkPrimaryAndSecondaryButtons(buttonsCount: number): Promise<boolean> {
    await CommonFunctions.logMessage('INFO', 'Checking primary and secondary SNA actions exists');
    const primarySecondaryButtonSection = await this.primarySecondaryButtonSection;
    await primarySecondaryButtonSection.waitForDisplayed({ timeout: 90000, timeoutMsg: "buttons Not exist" });
    await CommonFunctions.logMessage('INFO', 'Found primary and secondary SNA actions');
    const children = await primarySecondaryButtonSection.$$(':scope > *');
    await CommonFunctions.logMessage('INFO', `Number of buttons exists ${children.length}`);
    return children.length === buttonsCount;
  }

  public async addNewViewGroupToProcess(viewGroupName: string): Promise<boolean> {
    const allViewsDropdown = await this.allViewsGroupDropdown;
    await allViewsDropdown.waitForDisplayed({ timeout: 1000, timeoutMsg: "Not exist" });
    await this.doClick(allViewsDropdown, 'Clicking all views dropdown');
    await browser.pause(5000);
    const viewDropdownOption = await this.getViewElementFromDropdown(viewGroupName);
    await allViewsDropdown.waitForDisplayed({ timeout: 90000, timeoutMsg: "Not exist" });
    await this.doClick(viewDropdownOption, `Selecting the view ${viewGroupName}`);
    await this.selectingView(viewGroupName);
    await browser.pause(5000);
    const newViewInArrangeViews = await this.getCheckViewIsInArrangeViews(viewGroupName);
    await newViewInArrangeViews.waitForDisplayed({ timeout: 5000, timeoutMsg: "Not exist" });
    await CommonFunctions.logMessage('INFO', 'Checking added view is in arrange views');
    return await this.doesElementExist(newViewInArrangeViews, "Checking if view exists in arrange views");
  }

  public async AddDataSetupConfig(viewName: string, actors_Procedure: {"actorName": string, "procedureName": string, "labelName": string}[]): Promise<void> {
    await this.clickOnThreeDotMenuOfView(viewName);
    await this.selectOptionFromThreeDotMenu('Data Setup');
    for(let i=0; i<= actors_Procedure.length-1; i++){
      const currentFieldData = actors_Procedure[i];
      await this.mappingDataConfig(currentFieldData.actorName, currentFieldData.procedureName, currentFieldData.labelName);
    }
    await this.doClick(await this.saveInteractivePlanningConfiguraton, "Clicking On Save Button of Data Setup Popup");
  }

  public async validateViewDataSetup(viewName: string, data: {label: string, value: string}[]): Promise<boolean> {
    await browser.pause(2000);
    await this.planningViewSearch(viewName);
    await browser.pause(2000);
    await this.clickOnThreeDotMenuOfView(viewName);
    await this.selectOptionFromThreeDotMenu('Data Setup');
    await CommonFunctions.logMessage('INFO', 'Validating Data Setup Configuration');
    for (const item of data) {
      const element = await this.dataSetupField(item.label, item.value);
      const exists = await this.doesElementExist(element, `Validating ${item.label} with value ${item.value}`);
      if(!exists) {
        await CommonFunctions.logMessage("ERROR", `${item.label} with value ${item.value} validation failed.`);
        return false;
      }
    }
    await browser.pause(2000);
    await this.doClick(await this.cancelDataSetupModal, "Clicking On Cancel Button of Data Setup Popup");
    return true;
  }

  public async ValidateSelectedValues(actors_Procedure: {"actorName": string, "procedureName": string, "labelName": string}[]): Promise<void> {
    for(let i=0; i<= actors_Procedure.length-1; i++){
      const currentFieldData = actors_Procedure[i];
      const actorName= currentFieldData.labelName === "Select Procedure" ? undefined : currentFieldData.procedureName;
      const procedureName= currentFieldData.labelName === "Select Procedure" ? currentFieldData.procedureName : undefined;
      await this.validateActorProcedure(actorName, procedureName);
    }
  }
  
  public async enableQuickFilterCheckbox(entity: string, viewNames: string | string[]): Promise<boolean> {
      await this.select3DotButtonForEntity(entity);
      await this.selectActionItemForEntity("Configure View specific Procedures & Filters");
      const views = Array.isArray(viewNames) ? viewNames : [viewNames];
      for (const viewName of views) {
        await this.doClick(await this.getViewByName(viewName), `Clicked on ${viewName} view button`);
        const filterTab = await this.workFlowFilterTab();
        await this.doClick(filterTab, 'Clicking on Workflow Filter tab');
        const quickFilterToggle = await this.enableQuickFilterToggle;
        const isChecked = await quickFilterToggle.isSelected();
        if (!isChecked) {
          await this.doClick(quickFilterToggle, 'Enabling Quick Filter checkbox');
          await CommonFunctions.logMessage('INFO', `Quick Filter checkbox enabled successfully for ${viewName}`);
        } else {
          await CommonFunctions.logMessage('INFO', `Quick Filter checkbox is already enabled for ${viewName}, skipping`);
        }
      }
      const saveBtn = await this.workFlowFilterSaveBtn();
      await this.doClick(saveBtn, 'Clicking on Save button to save the workflow filter configuration');
      return true;
  } 

  public async workFlowFilterActionItemClick(entity: string, viewName:string): Promise<void> {
    await this.select3DotButtonForEntity(entity);
    await this.selectActionItemForEntity("Configure View specific Procedures & Filters");
    await this.doClick(await this.getViewByName(viewName), `Clicked on ${viewName} view button`);
    const filterTab = await this.workFlowFilterTab();
    await this.doClick(filterTab, 'Clicking on Workflow Filter tab');
  }

  public async configureWorkflowFilter(entityName: string, viewName: string, scope: any, mode: 'Define filter' | 'Edit filter' | 'Delete filter', isPO: boolean = false): Promise<boolean> {
    await this.workFlowFilterActionItemClick(entityName, viewName);
    const resetDmnsBtn = await this.workFlowFilterDimensionBtn('reset-dimensions');
    if(mode === "Delete filter") {
      await this.doClick(resetDmnsBtn, "Clicking Reset button to reset the workflow filter configuration");
    }
    else {
      if(mode === "Define filter"){
        const isResetBtnVisible = await this.doesElementExist(resetDmnsBtn, "Checking if Reset button is visible");
        if(isResetBtnVisible){
          await this.doClick(resetDmnsBtn, "Clicking Reset button to reset the existing workflow filter configuration");
        }
        const workflowBtn = await this.workFlowFilterConfigureBtn();
        await this.doClick(workflowBtn, "Clicking workflow filter configure button");
      }
      else {
        const editDmnsBtn = await this.workFlowFilterDimensionBtn('edit-dimensions');
        await this.doClick(editDmnsBtn, "Clicking workflow filter edit icon");
      }
      await browser.pause(5000);
      await ScopePage.click3Dot();
      await ScopePage.select3DotOption('Edit Configuration');
      await ScopePage.selectFilterEntryFromDialogConfig("Select",scope.DIMENSION_NAME, isPO);
      await ScopePage.filterDialogSaveCancel('Next');
      await ScopePage.selectDimensionHierarchyLevel(scope.DIMENSION_NAME, [scope.ATTRIBUTE_NAME], 'check');
      await ScopePage.filterDialogSaveCancel('Save');
      await browser.pause(5000);
      await ScopePage.addFiltersToDimensionHierarchyInScope(scope.DIMENSION_NAME, scope.ATTRIBUTE_NAME, scope.VALUES);
      await ScopePage.clickOnApplyFiltersBtnInManageScope();
    }
    const saveBtn = await this.workFlowFilterSaveBtn();
    await this.doClick(saveBtn, `Clicking Save button to save the workflow filter configuration for ${viewName} view`);
    return await CommonFunctions.verifyAlertMsg("Your changes have been saved successfully");
  }
  
  public async selectProcessDropdown(process: string): Promise<void> {
    await this.clickGlobalSettings();
    await this.clickGlobalSettingsListMenu('Process');
    await ProcessPage.selectSingleProcess({ process });
  }

  public async verifyCyclesForCalendar(calendarName: string, expectedCycles: string[]): Promise<boolean> {
    const calendarEle = await this.getCalendar(calendarName);
    if (await this.doesElementExist(calendarEle, `Looking for calendar: ${calendarName}`)) {
      await this.doClick(calendarEle, `Clicking on calendar: ${calendarName}`);
      const actualCycles = await this.getCycleNames();
      
      if(expectedCycles.length != actualCycles.length) {
        await CommonFunctions.logMessage("FAIL", `Cycles data length mismatched: ${calendarName}`);
        return false;
      }
      
      const allCyclesExist = expectedCycles.every(cycle => actualCycles.includes(cycle));
      if (allCyclesExist) {
        await CommonFunctions.logMessage("INFO", `All cycles exist for calendar: ${calendarName}`);
        return true;
      }
      await CommonFunctions.logMessage("FAIL", `Not all cycles exist for calendar: ${calendarName}`);
      return false;
    }
    await CommonFunctions.logMessage("FAIL", `Calendar not found: ${calendarName}`);
    return false;
  }

  public async getCycleNames(): Promise<string[]> {
    const cycleNames: string[] = [];
    const cycleElements = await this.cycles;
    for (const cycleElement of cycleElements) {
      const cycleName = await this.doGetText(cycleElement, "Getting cycle name");
      cycleNames.push(cycleName);
    }
    await CommonFunctions.logMessage("INFO", `Cycle names found: ${cycleNames}`);
    return cycleNames;
  }

  public async verifyLayout(type?: 'row' | 'mixed'): Promise<void> {
    const isLayoutPresent = await this.doesElementExist(this.layoutContentHeading, "Checking if Layout Section exists");
    if(isLayoutPresent) {
      if(type === 'row') {
        const rowLayoutOption = await this.rowLayoutOption;
        await this.doClick(rowLayoutOption, `Clicking on page field: ${rowLayoutOption}`);
      } else {
        const mixedLayoutOption = await this.mixedLayoutOption;
        await this.doClick(mixedLayoutOption, `Clicking on page field: ${mixedLayoutOption}`);
      }
    }
  }
}

export default new GlobalSettingsPage();