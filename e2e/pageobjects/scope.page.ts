import MfePage from './mfe.page';
import CommonFunctions from '../util/common.util';
import PlanningSpacePage from './planning.page';
import scaPage from './sca.page';

interface IVerticalFilter{
  dimesionName: string;
  filterName: string;
  filterValues: string[];
}
export class ScopePage extends MfePage {

  private get expandPlanningPlaceBtn()          { return $(`//button[@data-testid='toggle-drawer-btn']`)}
  private get saveFilterCreateInput()           { return $(`//input[@data-testid='vf-save-filterInstance-input-create']`) }
  private get overWriteFilterRbtn()             { return $(`//input[@value='saveFilterDialog.overwrite']/parent::span`) }
  private get secondLevelErrorEle()             { return $(`//*[text()='Filter was applied partially because impacted by external restrictions.']`) }
  public  get dataGridEle()                     { return $(`//div[@class="MuiGrid-root MuiGrid-container MuiGrid-spacing-xs-1 MuiGrid-align-items-xs-flex-end"]//*[contains(@*,'table')]//div[@id="row-rowDimensons-wrapper"]`) }
  private get verticalThreeDotsEleUnderScope()  { return $(`//div[@data-testid='lui-ccl-cardheader']//button[@data-testid='lui-ccl-threedot-menu-icon-button']`) }
  public getOverwriteExistingButton()           { return $("//button[@data-testid='vf-save-filterInstance-button-save' and text()='Overwrite existing']") }
  private get closeButton()                     { return $("//button[@data-testid='vf-manage-filterInstance-button-close' and text()='Close']")}
  private get verticalThreeDotsEleInManageScope() { return $(`//div[@role="presentation"]//button[@data-testid='lui-ccl-threedot-menu-icon-button'][1]`) }
  private get dropDownTreeInput()               { return $(`//input[@id="groupdropdowntree-input-Tree Select"]`) }
  private get applyFilterBtnUnderScope()        { return $(`//button[@data-testid='vf-apply-button']`) }
  private get applyFilterBtnUnderManageScope()  { return $(`//div[@role="presentation"]//button[@data-testid='vf-apply-button']`) }
  private get scopeEmptyState()                 { return $(`//h2[@data-testid="lui-ccl-empty-state-heading"]//div[text()='No data available']`) }
  private get searchIconBtn()                   { return $(`//div[@data-testid='lui-searchbar']/input[@placeholder='Search'][not(@autocomplete)]`) }
  private get dropdownArrow()                   { return $(`//button[@data-testid='vf-filter-card-dropdown-button']`) }
  private get getViewEle()                      { return $(`//ul[@role="menu"]//li[@data-testid="vf-filter-card-filterInstance-item"]`) }
  private get tablist()                         { return $(`//div[@role="tablist"]`) }
  private get appliedFiltersInScope()           { return $$(`//div[@data-testid="vf-chips-list-controller"]//h4/div`) }
  private get btnDeleteFilter()                 { return $("//button[@data-testid='vf-filterInstance-settings-button-delete']") }
  private get btnDeleteFilterConfirm()          { return $("//button[@data-testid='vf-manage-delete-button-confirm']") }
  private get noFilterConfigure()               { return $("//div[@data-testid='vf-empty-state-title-grid-container']")}
  private get btnSave()                         { return $("//button[@data-testid='vf-values-selection-save-button']")}
  private get editIcon()                        { return $("//button[@data-testid='edit-dimensions']")}
  private get searchByID()                      { return $("//input[@placeholder='Search by ID / Description']")}
  private get btnConfigFilter()                 { return $("//button[text()='Configure Filter']")}
  private get selectedDimensions()              { return $$("//div[@data-rbd-droppable-id='dimensionsDroppable']//ul/div/li")}
  private get manageScopeBtn()                  { return $("//button[@data-testid='manage-scope-btn']")}
  private get threeDotInView()                  { return $("(//div[contains(@class,'more-btn')]//button[@data-testid='lui-ccl-threedot-menu-icon-button'])[1]")}
  private get filterDropdown()                  { return $("//label[.='Filter']/..//input[@id='select-select']")}
  private get globalScopeCheckBoxSvg()          { return $("//input[@aria-label='uncontrolled-checkbox']/parent::span/*[name()='svg']")}
  private get globalScopeCheckBox()             { return $("//input[@aria-label='uncontrolled-checkbox']")}
  private get setGlobalScope()                  { return $("//button[@data-testid='save-btn']")}
  private get appliedVFtitle()                  { return $("//p[@data-testid='vf-filter-card-title']")}
  private get draftFilterLabel()                         { return $(`//span[@data-testid="vf-instance-status-subtitle" and text()='Draft']`)}
  private get hierarchyItemsFromPopup()         { return $$("//div[@data-testid='vf-values-selection-value-row']/p")}
  private get revertVerticalFilterBtn()         { return $("//button[@data-testid='vf-revert-button']")}
  private get getVFSelectedValues()             { return $$(`//span[@data-testid='vf-filterPanel-property-values-checkbox']/../div`)} 
  private get draftFilter()                     { return $("//h5[@data-testid='vf-filter-card-title']/div[2]")}
  private get vfemptystate()                    { return $(`//div[@data-testid="vf-empty-state-actions"]`)}
  private get threeDotMenuBackdrop()            { return $(`//div[@data-testid="lui-ccl-threedot-menu-popper"]`)}
  private get vfValuesPopoverClose()            { return $(`//button[@data-testid="vf-values-selection-popover-close"]`)}
  private get saveOrOverwriteButton()           { return $("//button[@data-testid='vf-save-filterInstance-button-save']")}
  private get showHideSearch()                  { return $("//button[@aria-label='Show/Hide search']")}
  private get searchInput()                     { return $("//input[@placeholder][not(@autocomplete='off')]")}
  private get scopeChipBtn()                    { return $("//div[@data-testid='scope-chip-btn']")}
  private get closeDrawerBtn()                  { return $("//button[@data-testid='drawer-close-btn']")}
  private filterInManageScope(filterName: string)           { return $(`//p[@data-testid='vf-filterInstance-list-item-label' and text()='${filterName}']`) }
  private getDimensionLevelFilter(region: string)           { return $(`//div[@data-testId = 'vf-filterPanel-property-${region}-counters-box']`) }
  public getExpandDimensionEle(dimension: string)           { return $(`//h4[text()='${dimension}']/ancestor::div[contains(@class,'MuiAccordionSummary-root')]`) }
  public getDimensionChipInScope(dimension: string)         { return $(`//div[@data-testid='lui-ccl-chip']//span[contains(text(),'${dimension}')]`) }
  public getExpandDimensionEleByProperty(property: string)  { return $(`//div[@data-testid='vf-filterPanel-property-${property.toUpperCase()}']//div[contains(@class,'MuiAccordionSummary-root')]`) }
  public getFilterEntryFromDialogConfig(optionName: string) { return $(`//div[@id='customized-dialog-description']//span[text()='${optionName}']//parent::p//parent::div//span`) }
  public getFilterEntryFromDialogConfigPO(optionName: string) { return $(`//div[@id='customized-dialog-description']//span[text()='${optionName}']//parent::div//parent::div//span`) }
  public getCheckBoxEle(optionName: string)                 { return $(`//input[@aria-labelledby='checkbox-list-label-${optionName.toUpperCase()}']`) }
  public getDialogButton(buttonName: string)                { return $(`(//div[@role='dialog']//button[text()='${buttonName}'])[last()]`) }
  public getCreateNewButton()                               { return $("//button[@data-testid='vf-save-filterInstance-button-save' and text()='Create new']")}
  public getTabEle(tabName: String)                         { return $(`//div[@role='tablist']/button[@role='tab'][contains(text(), '${tabName}')]`); }
  public getEleFromThreeDotsMenu(optionName: string)        { return $$(`//h4[@aria-label="${optionName}"]`) }
  public getFilterEleByNameFromVerticalFilter(filterName: string)   { return $(`//h4//*[text()='${filterName}']//following::button[@data-testid="vf-filter-button"][1]`) }
  public getFilterToSelectEle(filterSelect: string)                 { return $(`//ul//li/div//following::div[text()='${filterSelect}']`) }
  public getAppliedFiltersUnderScopeEle(filterName: string, appliedFilterValue: string) { return $(`//div[@data-testid='vf-chips-list-controller']//h4[. = '${filterName}']/ancestor::div[contains(@class, 'MuiCollapse-root')][1]//span[. = '${appliedFilterValue}']`) }
  public getAppliedFilterInScopeEle(filterName: string, appliedFilterValue: string)     { return $(`//div[@data-testid='vf-filterPanel-property-${filterName.toUpperCase()}']//div[@data-testid='virtuoso-item-list']//span[text()='${appliedFilterValue}']`) }
  public getEmptyScopeStateText()                             { return $(`//h6[@data-testid='vf-empty-state-heading']`)}
  public getAppliedWorkflowFilter(filterName: string, appliedFilterValue: string) { return $("//p[text()='" + filterName + "']/ancestor::div/following-sibling::div//div[contains(@data-testid,'content-value')]/following-sibling::div/div[@aria-label='chip']/span[text()='" + appliedFilterValue + "']") }
  public getLocationCell(location: string)                    { return $(`//p[contains(@data-testid,"row-dimension-sticky-header")]//span[text()='${location}']`) }
  public getItemCell(itemName: string)                        { return $(`//p[contains(@data-testid,"row-dimension-sticky-header")]//span[text()='${itemName}']`) }
  public getCustomerCell(customerName: string)                { return $(`//p[contains(@data-testid,"row-dimension-sticky-header")]//span[text()='${customerName}']`) }
  public getScenarioBudge()                                   { return $("//div[@data-testid='scenario-chip-btn']") }
  public getScenarioBudgeText()                               { return $("//div[@data-testid='scenario-chip-btn']//button") }
  public getScenarioBudgeCount()                              { return $("//div[@data-testid='scenario-chip-btn']/parent::*/div/span/span") }
  public txtScenarioSlctFilter()                              { return $("//div[@data-testid='lui-ccl-table']//tr//td[1]//p") }
  public getDimesionInDataScope(dimensionName: string)        { return $(`//div[@data-testid="content-title"]//h4[text()="${dimensionName}"]`)}
  public getFilterValues(filterName: string)                  { return $$(`//div[@data-testid="content-label"]/p[text()="${filterName}"]/parent::div/following::div[@data-testid="chip-${filterName.toUpperCase()}"]`)}
  private getViewAction(actionName: string)                   { return $(`//div[@role='presentation']//ul[@data-testid="lui-ccl-threedot-menu-list"]//li//span[text()='${actionName}']`);}
  private  getFilterDropdownItem(itemName: string)            { return $(`//li[@data-testid='lui-ccl-select-option' and @value='${itemName}']`) }
  private getRelaventFilterBtn(filter: string)                { return $(`//button[@data-testid='vf-filterPanel-dimension-${filter}-attribute-filtering-button']`)};
  private getSelectedHierarchyCheckbox(levelOrProperty: string, hierarchy: string) {return $(`//li[@data-testid='vf-filterPanel-property-${levelOrProperty.toUpperCase()}']//span[text()='${hierarchy}']/../..//input`)}
  private getSelectedHierarchyCheckboxSvg(levelOrProperty: string, hierarchy: string) {return $(`//li[@data-testid='vf-filterPanel-property-${levelOrProperty.toUpperCase()}']//span[text()='${hierarchy}']/../..//*[name()='svg']`)}
  private getFilterSection(filterName: string)                { return $(`//div[@data-testid='vf-filterPanel-property-${filterName.toUpperCase()}']`)}
  private getFilterSectionCheckboxTitle(filterName: string, hierarchy: string) { return $(`//div[@data-testid='vf-filterPanel-property-${filterName.toUpperCase()}']//span[text()='${hierarchy}']`)}
  private getTopFacetsInMaasPivot(cardName: string)           { return $(`//span[@data-testid="lui-dashboard-card-title"]//div[@data-testid="lui-dashboard-card-edit-title" and @data-value="${cardName}"]/ancestor::div[@data-testid="lui-dashboard-card"]//div[contains(@data-testid,"table-header-wrapper-facet-container-top-facets")]`)}
  private getSelectedPropertiesInMaasHeader(cardName: string) { return $$(`//span[@data-testid="lui-dashboard-card-title"]//div[@data-testid="lui-dashboard-card-edit-title" and @data-value="${cardName}"]/ancestor::div[@data-testid="lui-dashboard-card"]//span[@class="axis-title-name"]`)}
  private getDimentionName(dimension:string)                  { return $(`//div[@data-testid='vf-filterPanel-dimension']//h4[text()="${dimension}"]`)}
  private getThreeDotInView(className: string)                { return $(`//div[contains(@class,"${className}")]/button`)}
  private getSideNavTitle(titleName: string)                  { return $(`//h3[@data-testid="side-nav-title" and text()='${titleName}']`)}
  private get noScopeTextElement()                            { return $(`//h2[contains(normalize-space(), 'This process has no specific scope set')]`) }
  private get threeDotMenuDefaultFilterSelection()            { return $(`(//div[contains(@class,"more-btn-2")]//button[@data-testid='lui-ccl-threedot-menu-icon-button'])`)};
  private get quickFilterConfigIcon()                         { return $(`//button[@data-testid="qf-configure-button"]`); }
  private get quickFilterNameInput()                          { return $(`//div[@data-testid="qf-configuration-data-source-box"]`); }
  private get quickFilterValueInput()                         { return $(`//div[@aria-label="Insights"]`); }
  private get quickFilterApplyBtn()                           { return $(`//button[@data-testid="qf-configuration-modal-save-button"]`); }
  private get quickFilterReloadBtn()                          { return $(`//div[@data-testid='lui-ccl-empty-state-actions']//button[text()='Reload']`); }
  private getOption(option: string)                           { return $("//span[text()='" + option + "']")}
  private getQuickFilterAttributeOption(qfFilterName: string)         { return $(`//div[contains(@class,'MuiTreeItem-label')]//span[starts-with(normalize-space(),'${(qfFilterName ?? '').toUpperCase()}')]`) }
  private getSelectQuickFilterAttribute(qfFilterName: string)         { return $(`//div[contains(@class,'MuiTreeItem-label')]//span[starts-with(translate(normalize-space(), 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), '${qfFilterName}')]`) }
  private getQFFilterSectionCheckboxTitle(qfHierarchy: string)        { return $(`//input[@type='checkbox' and @aria-label='${qfHierarchy}']`) }
  private getClickOnQFList(qfList: string)                            { return $(`//div[@data-testid='qf-filter-panel-chip']//span[contains(text(),'${qfList}')]/ancestor::div[@data-testid='qf-filter-panel-chip']`) }  
  private getSelectQFValues(qfValue: string)                          { return $(`//span[normalize-space()='${qfValue}']/ancestor::div[@data-testid='qf-filter-panel-chip']`) }
  private getSelectQFValuesInput(qfValue: string)                     { return $(`//div[@data-testid='qf-values-selection-popover-wrapper']//span[@data-testid='qf-values-selection-checkbox-${qfValue}']//input[@type='checkbox']`) }
  private get qfValueCloseBtn()                                       { return $(`//button[@data-testid='qf-values-selection-popover-close']`) }
  private get qfValueApplyBtn()                                       { return $(`//button[@data-testid='qf-apply-button']`) }
  private getScopeDataValue(filterValue1: string, filterValue2: string)  { return $(`//div[@aria-label='tooltip'][.//span[normalize-space()='${filterValue1}'] and .//span[normalize-space()='${filterValue2}']]`) }

  public async getNoScopeText(): Promise<string> {
  const noScopeText = await this.noScopeTextElement;
  await noScopeText.waitForDisplayed({ timeout: 60000 });
  const result = await this.doGetText(noScopeText, "Getting no scope text");
  return result;  
}

  public async click3Dot() {
    const threeDot = await this.verticalThreeDotsEleUnderScope;
    const isThreeDotExist = await this.doesElementExist(threeDot, "Checking if three dots exist under scope tab");
    if (isThreeDotExist) {
      await this.doClickUsingScript(threeDot, "Clicking three dots exist under scope tab")
      await CommonFunctions.logMessage('INFO', `clicked on three dots`)
      return true
    } else {
      await CommonFunctions.logMessage('INFO', `three dots not exist under scope tab`)
      return false
    }
  }

  public async click3DotInManageScope() {
    const threeDot = await this.verticalThreeDotsEleInManageScope;
    await threeDot.waitForDisplayed({ timeout: 60000 });
    const isThreeDotExist = await this.doesElementExist(threeDot, "Checking if three dots exist in manage scope");
    if (isThreeDotExist) {
      await this.doClickUsingScript(threeDot, "Clicking three dots exist under scope tab")
      await CommonFunctions.logMessage('INFO', `clicked on three dots`)
      return true
    } else {
      await CommonFunctions.logMessage('INFO', `three dots not exist under scope tab`)
      return false
    }
  }

  public async select3DotOption(optionName: string): Promise<boolean> {
    await CommonFunctions.logMessage("INFO", `Looking for ${optionName} option in the menu`);
    const elements = await this.getEleFromThreeDotsMenu(optionName);
    const optExist = elements[elements.length - 1];
    const isOptionExist = await this.doesElementExist(optExist, `Checking if ${optionName} option exists in menu`);
    if (isOptionExist) {
      await CommonFunctions.logMessage('INFO', `${optionName} option exists in the menu`);
      await browser.pause(2000);
      // Re-fetch the element before interaction to avoid stale element reference errors
      const elements = await this.getEleFromThreeDotsMenu(optionName);
      const refreshedOpt = elements[elements.length - 1];

      await refreshedOpt.waitForDisplayed({ timeout: 60000 });
      await refreshedOpt.waitForClickable({ timeout: 60000 });
      await this.doClickUsingScript(refreshedOpt, `Clicking on ${optionName} option`);
      return true;
    } else {
      await CommonFunctions.logMessage('INFO', `${optionName} option not exist in the menu`);
      return false
    }
  }
  
  public async selectFilterEntryFromDialogConfig(selectUnselect: 'Select' | 'UnSelect', optionName: string, isPO: boolean = false): Promise<boolean> {
    const optExist = await this.getFilterEntryFromDialogConfig(optionName);
    const isOptionExist = await this.doesElementExist(optExist, `Checking if ${optionName} option exists`);
    if (isOptionExist) {
      const optCheckbox = await this.getCheckBoxEle(optionName);
      await CommonFunctions.logMessage('INFO', `${optionName} option exist`)
      const isSelected = await this.doGetAttribute(optCheckbox, 'checked', `Getting checked status for ${optionName}`);
      const isChecked = isSelected === 'true';
      
      if (selectUnselect.toUpperCase() === 'SELECT' && !isChecked) {
        await browser.execute(async (ele) => {
          await ele.click();
        }, optCheckbox);
        await CommonFunctions.logMessage('INFO', `Checked ${optionName} option`)
      } else if (selectUnselect.toUpperCase() === 'UNSELECT' && isChecked) {
        await browser.execute(async (ele) => {
          await ele.click();
        }, optCheckbox);
        await CommonFunctions.logMessage('INFO', `UnChecked ${optionName} option`)
      }
      else if (selectUnselect.toUpperCase() === 'SELECT' && isChecked) {
        await CommonFunctions.logMessage('INFO', `Already Checked ${optionName} option`)
      }
      else if (selectUnselect.toUpperCase() === 'UNSELECT' && !isChecked) {
        await CommonFunctions.logMessage('INFO', `Already UnChecked ${optionName} option`)
      }
      return true
    } else {
      return false
    }
  }

  public async expandDimensionInVF(name: string, type: 'dimension' | 'property' = 'dimension') {
      let expandClassAttribute: string;
      if (type === 'dimension') {
          expandClassAttribute = await this.doGetAttribute(await this.getExpandDimensionEle(name), "class", "Getting expand dimension class attribute");
          if (!expandClassAttribute.includes("Mui-expanded"))
              await this.doClick(await this.getExpandDimensionEle(name), "Expanding Dimension Filter:: " + name);
          else
              await CommonFunctions.logMessage("INFO", "Dimension " + name + " Filter already Expanded")
      } else {
          expandClassAttribute = await this.doGetAttribute(await this.getExpandDimensionEleByProperty(name), "class", "Getting expand property class attribute");
          if (!expandClassAttribute.includes("Mui-expanded"))
              await this.doClick(await this.getExpandDimensionEleByProperty(name), "Expanding Property Filter:: " + name);
          else
              await CommonFunctions.logMessage("INFO", "Property " + name + " Filter already Expanded")
      }
  }

  public async checkOrUncheckHierarchyLevel(hierarchy: string[], action: "check" | "uncheck") {
    for (const item of hierarchy) {
      const checkbox = await $(`//span[text()='${item}']/ancestor::div[@data-testid='vf-items-selection-checkbox']/span[@data-testid]`);
      const classAttribute = await this.doGetAttribute(checkbox, "class", `Getting class attribute for ${item}`);
      const isChecked = classAttribute.includes("Mui-checked");
      if ((action === "check" && !isChecked) || (action === "uncheck" && isChecked)) {
        await this.doClickUsingScript(checkbox, `${action === "check" ? "Selecting" : "Unchecking"} Checkbox of Hierarchy:: ${item}`);
      } else {
        await CommonFunctions.logMessage("INFO", `${item} Hierarchy checkbox already ${isChecked ? "Checked" : "UnChecked"}`);
      }
    }
  }

  public async selectDimensionHierarchyLevel(dimension: string, hierarchy: string[], action: "check" | "uncheck") {
    const selectedDimensions = await this.selectedDimensions
    if (selectedDimensions.length > 1)
      await this.expandDimensionInVF(dimension);
    await this.checkOrUncheckHierarchyLevel(hierarchy, action);
  }

  public async clickFilterValuesIconByDimensionAndHierarchy(dimension: string, hierarchy: string) {
    await browser.pause(6000);
    let icon = await $("//div[@data-testid='vf-filterPanel-property-" + hierarchy.toUpperCase() + "-edit-button']");
    if (!(await icon.isExisting())) {
      icon = await $("//div[@data-testid='vf-filterPanel-property-" + hierarchy.toUpperCase() + "-counters-box']");
    }
    await icon.waitForExist({ timeout: 10000 });
    await this.doClickUsingScript(icon, "Clicking Filter Values Icon for the hierarchy:: " + hierarchy + " and Dimension:: " + dimension);
  }

  public async addFiltersToDimensionHierarchyInScope(dimension: string, hierarchy: string, filter: string[]) {
    await this.clickFilterValuesIconByDimensionAndHierarchy(dimension, hierarchy);
    await this.checkOrUncheckFilters(filter, 'check');
    await this.clickSaveInFilterValuesBox();
  }

  public async checkOrUncheckFilters(filter: string[], action: "check" | "uncheck") {
    for (const item of filter) {
      // const checkbox = await $(`//p//span[text()='${item}']/ancestor::div[@data-testid='vf-values-selection-value-row']/span`);
      const checkbox = await $(`//div[@data-testid='vf-values-selection-value-row'][.//span[normalize-space()='${item}']]//input[@type='checkbox']`);
      const isChecked = await this.doGetAttribute(checkbox, "checked", `Getting class attribute for filter ${item}`);

      if ((action === "check" && !isChecked) || (action === "uncheck" && isChecked)) {
        await this.doClickUsingScript(checkbox, `${action === "check" ? "Selecting" : "Unchecking"} Checkbox of Filter:: ${item}`);
      } else {
        await CommonFunctions.logMessage("INFO", `${item} Filter checkbox already ${isChecked ? "Checked" : "UnChecked"}`);
      }
    }
  }

  public async getAvailableHierarchyValuesFromPopup(dimension: string, hierarchy: string) {
    await this.clickFilterValuesIconByDimensionAndHierarchy(dimension, hierarchy);
    const availableHierarchyItems = await this.hierarchyItemsFromPopup;
    let itemsArr: string[] = [];
    if(availableHierarchyItems.length > 0) {
      for (let item of availableHierarchyItems) {
        const itemText = await this.doGetText(item, `Getting hierarchy item text`);
        CommonFunctions.logMessage('INFO', `Getting the text of ${itemText} hierarchy item`);
        itemsArr.push(itemText);
      }
    } else {
      CommonFunctions.logMessage("INFO", 'There are no available hierarchy items');
    }
    const closeIcon = await this.vfValuesPopoverClose;
    await this.doClick(closeIcon,`Clicking on close icon of vf values popover`);
    return itemsArr;
  }

  public async checkOrUncheckSelectedHierarchies(levelOrProperty: string, hierarchy: string, mode: 'check' | 'uncheck') {
    const checkboxInput = await this.getSelectedHierarchyCheckbox(levelOrProperty, hierarchy);
    const checkboxSvg = await this.getSelectedHierarchyCheckboxSvg(levelOrProperty, hierarchy);
    const checkboxState = await this.doGetAttribute(checkboxSvg, 'data-testid', `Getting checkbox state for ${hierarchy}`);
    if (mode === 'check') {
      if (checkboxState === 'CheckBoxOutlineBlankIcon') {
        await this.doClick(checkboxInput, `Checking ${hierarchy} hierarchy`);
        CommonFunctions.logMessage('INFO', `Changes the state of ${hierarchy} to ${mode}`);
      } else {
        CommonFunctions.logMessage('INFO', `${hierarchy} is already in ${mode} state`);
      }
    } else {
      if (checkboxState === 'CheckBoxIcon') {
        await this.doClick(checkboxInput, `Unchecking ${hierarchy} hierarchy`);
        CommonFunctions.logMessage('INFO', `Changes the state of ${hierarchy} to ${mode}`);
      } else {
        CommonFunctions.logMessage('INFO', `${hierarchy} is already in ${mode} state`);
      }
    }
  }

  public async getAllSelectedHierarchialValues(levelOrPropertyName: string) {
    let itemsArr: string[] = [];
    const selectedHierarchyItems = await $$(`//li[@data-testid='vf-filterPanel-property-${levelOrPropertyName.toUpperCase()}']//span[@data-testid='vf-filterPanel-property-values-checkbox']/../div`)
    if (selectedHierarchyItems?.length > 0) {
      for (const item of selectedHierarchyItems) {
        const itemText = await this.doGetText(item, `Getting hierarchy item text`);
        CommonFunctions.logMessage('INFO', `Getting the text of ${itemText} hierarchy item`);
        itemsArr.push(itemText)
      }
    } else {
      CommonFunctions.logMessage('INFO', `No Hierarchy items have been selected for ${levelOrPropertyName} level or property`);
    }
    return itemsArr;
  }

  public async enableRelaventFilter(dimension: string) {
    const dimensionName = await this.getDimentionName(dimension);
    await dimensionName.moveTo();
    const relaventFilterBtn = await this.getRelaventFilterBtn(dimension);
    await this.mouseHover(relaventFilterBtn, `Mouse Hover on ${dimension} Relavent Filter Button`);
    await relaventFilterBtn.waitForDisplayed({timeout: 30000});
    await relaventFilterBtn.waitForClickable({ timeout: 60000 });
    await this.doClick(relaventFilterBtn, `Clicking on Relevant filter button of ${dimension} dimension`);
    CommonFunctions.logMessage('INFO', `Clicked on Revalent filter button of ${dimension} dimension`);
    const enableRelaventFiltersDialogBtn = await this.getDialogButton('Enable');
    await enableRelaventFiltersDialogBtn.waitForClickable({ timeout: 60000 });
    await this.doClick(enableRelaventFiltersDialogBtn, `Clicking on Enable Relevant filter button in Confirmation popup`);
    CommonFunctions.logMessage('INFO', `Clicked on Enable Relavent filter button in Confirmation popup`);
  }

  public async clickSaveInFilterValuesBox() {
    await this.doClickUsingScript(await this.btnSave, "Clicking Save Button In Filter Values Icon");
  }

  public async selectOptionInDimensionFilter(dimension: string, filter: string[]){
    const selectDimension = await this.getDimensionLevelFilter(dimension);
    await selectDimension.waitForClickable({ timeout: 60000 });
    await this.doClick(selectDimension, `Clicking on dimension filter for ${dimension}`);
    await this.checkOrUncheckFilters(filter, "check")
    await this.clickSaveInFilterValuesBox()
    return true;
  }

  public async filterDialogSaveCancel(buttonName: string): Promise<boolean> {
    const optExist = await this.getDialogButton(buttonName);
    const isButtonExist = await this.doesElementExist(optExist, `Checking if ${buttonName} button exists in dialog`);
    if (isButtonExist) {
      await CommonFunctions.logMessage("INFO", `${buttonName} button exist in dialog`)
      await this.doClick(optExist, `Clicking ${buttonName} button in dialog`);
      await CommonFunctions.logMessage('INFO', `Clicked ${buttonName} button in dialog `)
      await this.clickPropertiesCheckbox(buttonName)
      return true
    } else {
      await CommonFunctions.logMessage('INFO', `${buttonName} button not exist in dialog`)
      return false
    }
  }

  public async clickCreateNewButton(): Promise<boolean> {
      const saveBtn = await this.saveOrOverwriteButton;
      const isDisplayed = await saveBtn.isDisplayed();
      if (isDisplayed) {
          await saveBtn.waitForClickable({ timeout: 10000 });
          await this.doClick(saveBtn, "Clicking 'Create new' or 'Overwrite existing' button in dialog");
          return true;
      } else {
          await CommonFunctions.logMessage('INFO', "'Create new'/'Overwrite existing' button not displayed in dialog");
          return false;
      }
  }

  public async clickCloseButton(): Promise<boolean> {
      const closeBtn = await this.closeButton;
      const isDisplayed = await closeBtn.isDisplayed();
      if (isDisplayed) {
          await closeBtn.waitForClickable({ timeout: 10000 });
          await this.doClick(closeBtn, "Clicking 'Close' button in dialog");
          return true;
      } else {
          await CommonFunctions.logMessage('INFO', "'Close' button not displayed in dialog");
          return false;
      }
  }

  public async clickPropertiesCheckbox(buttonName:string){
    if(buttonName === 'Next'){
      const checkbox = await $('label[data-testid="vf-filter-configurations-hide-properties-switcher"] input[type="checkbox"]');
      const isCheckboxExist = await this.doesElementExist(checkbox, "Checking if Properties checkbox exists");
      if(isCheckboxExist){
        await CommonFunctions.logMessage('INFO', `'Properties' checkbox exists`)
        await this.doClick(checkbox, "Clicking Properties checkbox");
        await CommonFunctions.logMessage('INFO', `Clicked 'Properties' checkbox`)
      }
    }
  }

  public async disableFilter(sFilterName: string) {
    await this.doClick(await this.showHideSearch, "Clicking on Show/Hide search icon");
    await this.doEnterText(await this.searchInput, sFilterName, "Entering Filter text in search box");
    const toggleFilterVisibleBtn = await $("//p[text()='" + sFilterName + "']/ancestor::td/following-sibling::td//input[@data-testid='vf-filterInstance-list-item-visibility-switch']");
    await this.doClick(toggleFilterVisibleBtn, "Disabling the Filter:: " + sFilterName);
  }
  

  public async deleteFilter(sFilterName: string) {
    await this.click3Dot();
    await this.select3DotOption('Manage All');
    await this.doClick(await this.showHideSearch, "Clicking on Show/Hide search icon");
    await browser.pause(2000);
    await this.doEnterText(await this.searchInput, sFilterName, "Entering Filter text in search box");
    const filterEle = await this.filterInManageScope(sFilterName);
    await this.doClick(filterEle, `Expanding filter ${sFilterName}`);

    await CommonFunctions.logMessage("INFO", "Clicking Delete Filter");
    await this.btnDeleteFilter.waitForClickable({ timeout: 30000 });
    await this.doClick(await this.btnDeleteFilter, "Clicking delete filter button");

    await CommonFunctions.logMessage("INFO", "Clicking Delete button in the Confirmation Popup");
    await this.btnDeleteFilterConfirm.waitForClickable({ timeout: 30000 });
    await this.doClick(await this.btnDeleteFilterConfirm, "Clicking delete confirmation button");

    return true;
  }

  public async verifyAppliedFilterInScope(filterName: string, appliedFilterValue: string) {
    await CommonFunctions.logMessage('INFO', `Verifying ${filterName} filter applied with ${appliedFilterValue} or not`);
    const optExist = await this.getAppliedFilterInScopeEle(filterName, appliedFilterValue);
    await CommonFunctions.logMessage('INFO', 'Filter Applied on ' + filterName + ' Value : ' + appliedFilterValue)
    await optExist.waitForDisplayed({ timeout: 60000 });
    return await this.doesElementExist(optExist, `Checking if filter ${filterName} with value ${appliedFilterValue} exists in scope`);
  }

  public async getFilterName() {
    let filterName: string = await this.doGetText(await this.appliedVFtitle, "Fetching Filter Name");
    await CommonFunctions.logMessage("INFO", "Filter Name:: " + filterName);
    return filterName
  }  

  // public async clickOnTab(tabName: string): Promise<boolean> {
  //   await PlanningSpacePage.expandPlanningSpaceLeftSection();
  //   const tablist = await this.tablist;
  //   await tablist.scrollIntoView();
  //   const tabExist: boolean = await this.verifyTabExist(tabName)
  //   const eleTab = await this.getTabEle(tabName);
  //   if (tabExist) {
  //     await CommonFunctions.logMessage('INFO', `Triggering ${tabName} tab `)
  //     await eleTab.moveTo();
  //     await this.doClick(eleTab, `Clicking on ${tabName} tab`);
  //     await CommonFunctions.logMessage('INFO', `Clicked on  ${tabName} tab `)
  //     return true
  //   } else {
  //     await CommonFunctions.logMessage("INFO", tabName + " Tab does not Exist");
  //     return false
  //   }
  // }

  public async clickOnTab(tabName: string) {
    let chipEle;
    switch (tabName) {
      case "Scope":
        chipEle = await this.scopeChipBtn;
        break;
      case "Scenarios":
        chipEle = await this.getScenarioBudge();
        break;
      default:
        await CommonFunctions.logMessage('INFO', `${tabName} chip button not exist (unknown tabName)`);
        return false;
    }
    await chipEle.waitForDisplayed({ timeout: 20000 });
    const isChipExist = await this.doesElementExist(chipEle, `Checking if ${tabName} chip button exists`);
    if (!isChipExist) {
      await CommonFunctions.logMessage('INFO', `${tabName} chip button not exist`)
      return false;
    } else {
      await chipEle.scrollIntoView();
      await browser.pause(5000);
      // Re-fetch to avoid stale element after page re-rendering
      switch (tabName) {
        case "Scope":
          chipEle = await this.scopeChipBtn;
          break;
        case "Scenarios":
          chipEle = await this.getScenarioBudge();
          break;
      }
      await chipEle.waitForDisplayed({ timeout: 20000 });
      await this.doClickUsingScript(chipEle, `Clicking on ${tabName} chip button`);
      await browser.keys('Escape');
      await browser.pause(5000);
      return true;
    }
  }

  public async verifyTabExist(tabName: string): Promise<boolean> {
    const eleTab = await this.getTabEle(tabName);
    await eleTab.waitForDisplayed({ timeout: 100000 })
    const isTabExist = await this.doesElementExist(eleTab, `Checking if ${tabName} tab exists`);
    if (isTabExist) {
      await CommonFunctions.logMessage('INFO', `${tabName} exist `)
      return true
    } else {
      await CommonFunctions.logMessage('INFO', `${tabName} not exist `)
      return false
    }
  }

  public async clickOnApplyFiltersBtn(): Promise<boolean> {
    const filterBtn = await this.applyFilterBtnUnderScope;
    await filterBtn.waitForClickable({ timeout: 60000 });
    await CommonFunctions.logMessage('INFO', 'Looking for Apply filter button')
    const isFilterBtnExist = await this.doesElementExist(filterBtn, "Checking if apply filter button exists");
    if (isFilterBtnExist) {
      await this.doClick(filterBtn, 'Clicking on Apply filter button')
      await CommonFunctions.logMessage('INFO', 'Clicked on  Apply filter button')
      return true
    }
    await CommonFunctions.logMessage('INFO', 'Apply filter button not exist')
    return false
  }

  public async clickOnApplyFiltersBtnInManageScope(): Promise<boolean> {
    await CommonFunctions.logMessage('INFO', 'Looking for Apply filter button')
    const filterBtn = await this.applyFilterBtnUnderManageScope
    await filterBtn.waitForDisplayed({ timeout: 60000 });
    const isFilterBtnExist = await this.doesElementExist(filterBtn, "Checking if apply filter button exists in manage scope");
    if (isFilterBtnExist) {
      await this.doClick(filterBtn, 'Clicking on Apply filter button in manage scope')
      await CommonFunctions.logMessage('INFO', 'Clicked on  Apply filter button')
      return true
    }
    await CommonFunctions.logMessage('INFO', 'Apply filter button not exist')
    return false
  }

  public async setCreateInputFilterValue(value: string): Promise<void> {
    const createInputField = await this.saveFilterCreateInput
    await createInputField.waitForDisplayed({ timeout: 60000 });
    await this.doClearAndEnterText(createInputField, value, `Setting ${value} value in create input field of save filter`);
    await CommonFunctions.logMessage('INFO', `set ${value} value in create input field of save filter`)
  }

  public async selectOverWriteFilter() {
    await this.doClick(await this.overWriteFilterRbtn, "Selecting Overwrite Filter radio button");
  }

  public async verifyExistingLocationCellInTable(location: string): Promise<boolean> {
    const locationEle = await this.getLocationCell(location);
    await locationEle.waitForExist({ timeout: 100000 });
    const isLocationExist = await this.doesElementExist(locationEle, `Checking if location ${location} exists in table`);
    await CommonFunctions.logMessage('INFO', `Is provided location  '${location}' exist in table :: ${isLocationExist}`);
    return isLocationExist;
  }

  public async verifyExistingCustomerCellInTable(customer: string): Promise<boolean> {
    const customerEle = await this.getCustomerCell(customer);
    await customerEle.waitForExist({ timeout: 100000 });
    const isCustomerExist = await this.doesElementExist(customerEle, `Checking if customer ${customer} exists in table`);
    await CommonFunctions.logMessage('INFO', `Is provided customer  '${customer}' exist in table :: ${isCustomerExist}`);
    return isCustomerExist;
  }

  public async verifyScopeFilterValueAfterDrillThrough(filterValues: {filterValue1: string, filterValue2: string}[]): Promise<boolean> {
    for (const fv of filterValues) {
      const filterEle = await this.getScopeDataValue(fv.filterValue1, fv.filterValue2);
      await filterEle.waitForDisplayed({ timeout: 10000 });
      const isFilterExist = await this.doesElementExist(filterEle, `Checking if filter ${fv.filterValue1} with value ${fv.filterValue2} exists in scope`);
      await CommonFunctions.logMessage('INFO', `Is filter '${fv.filterValue1}' with value '${fv.filterValue2}' exist in scope :: ${isFilterExist}`);
      if (!isFilterExist) {
        return false;
      }
    }
    return true;
  }

  public async isEmptyStateExistInScope() {
    const emptyEle = await this.scopeEmptyState;
    const isEmptyState: boolean = await emptyEle.isExisting();
    await CommonFunctions.logMessage('INFO', `Is card is empty :: ${isEmptyState}`);
    return isEmptyState;
  }

  public async searchFilter(filterName: string) {
    const dropdownArrow = await this.dropdownArrow;
    await dropdownArrow.waitForClickable({ timeout: 30000 });
    await this.doClick(dropdownArrow, "Clicking on dropdown arrow");
    const elesearch1 = await this.searchIconBtn;
    await this.doClearAndEnterText(elesearch1, filterName, `Searching for filter ${filterName}`);
    await CommonFunctions.logMessage("INFO", "Clicking Scope Tab  Filter Option:: " + `${filterName}`);
    const filterOption = await this.getViewEle;
    const isFilterOptionExist = await this.doesElementExist(filterOption, `Checking if filter option ${filterName} exists`);
    if (isFilterOptionExist) {
      await filterOption.waitForClickable({ timeout: 60000 });
      await this.doClick(filterOption, `Clicking on filter option ${filterName}`);
      return true
    } else {
      await CommonFunctions.logMessage("FAIL", "Clicking Scope Tab  Filter Option not avaialable:: " + `${filterName}`);
      return false
    }
  }

  public async getAppliedFilterNamesInScope(): Promise<string[]> {
    const filterEles: any[] = await this.appliedFiltersInScope;
    const filters: string[] = [];
    for (let ele of filterEles) {
      const value: string = await this.doGetText(ele, "Getting applied filter name");
      filters.push(value);
    }
    return filters;
  }

  public async scenarioBudgeExist(): Promise<boolean> {
    await CommonFunctions.logMessage('INFO', 'Looking for Scenario budge')
    const budge = await this.getScenarioBudgeText();
    await budge.waitForDisplayed({ timeout: 30000 });
    const isBudgeDisplayed = await this.doesElementExist(budge, "Checking if scenario badge exists");
    if (isBudgeDisplayed) {
      await CommonFunctions.logMessage('INFO', 'Budge is displayed');
      return true;
    }
    else {
      await CommonFunctions.logMessage('INFO', 'Budge is not displayed');
      return false;
    }
  }

  public async verifyBudgeIsDefault(defaultScenario: string): Promise<boolean> {
    await CommonFunctions.logMessage('INFO', 'Looking for budge text');
    const budgeTextEle = await this.getScenarioBudgeText();
    let budgeText = await this.doGetText(budgeTextEle, "Getting scenario badge text");
    budgeText = budgeText.replace('...', '');
    const isDefault = defaultScenario.includes(budgeText);
    if (isDefault) {
      await CommonFunctions.logMessage('PASS', 'Budge is part of the default scenario.');
    } else {
      await CommonFunctions.logMessage('FAIL', 'Budge is not part of the default scenario.');
    }
    return isDefault;
  }

  public async getBudgeCount(): Promise<number> {
    await CommonFunctions.logMessage('INFO', 'Fetching budge count.');
    try {
      const badgeElement = await this.getScenarioBudgeCount();
      await CommonFunctions.logMessage('INFO', 'Located budge count element.');
      const badgeText = await this.doGetText(badgeElement, "Getting badge count text");
      await CommonFunctions.logMessage('INFO', `Retrieved budge text: ${badgeText}`);
      const badgeCount = parseInt(badgeText, 10);
      await CommonFunctions.logMessage('INFO', `Parsed budge count: ${badgeCount}`);
      return badgeCount;
    } catch (error) {
      await CommonFunctions.logMessage('INFO', `Error fetching budge count: ${error}`);
      return 0; // Return 0 if there's an error fetching the badge count, which may indicate that the badge is not displayed or has no count.
    }
  }

  public async checkBudgeCountUI(): Promise<boolean> {
    await CommonFunctions.logMessage('INFO', 'Starting check for budge count UI.');
    const badgeElement = await this.getScenarioBudgeCount();
    await CommonFunctions.logMessage('INFO', 'Located budge count element.');
    const badgeText = await this.doGetText(badgeElement, "Getting badge text");
    await CommonFunctions.logMessage('INFO', `Retrieved budge text: ${badgeText}`);
    const badgeClass = await this.doGetAttribute(badgeElement, 'class', "Getting badge class attribute");
    await CommonFunctions.logMessage('INFO', `Retrieved budge element class: ${badgeClass}`);
    const isInvisible = badgeText === '0' && badgeClass.includes('MuiBadge-invisible');
    const badgeCount = parseInt(badgeText, 10);

    if (badgeCount === 0 && isInvisible) {
      await CommonFunctions.logMessage('PASS', 'Count UI is correctly not visible (badge count is 0).');
      return true;
    } else if (badgeCount > 0 && !isInvisible) {
      await CommonFunctions.logMessage('PASS', 'Count UI is correctly visible (badge count is greater than 0).');
      return true;
    } else {
      await CommonFunctions.logMessage('FAIL', `Count UI is not working as expected. Badge count: ${badgeCount}, isInvisible: ${isInvisible}`);
      return false;
    }
  }

  public async budgeClickedScenarioOpened(): Promise<boolean> {
    await CommonFunctions.logMessage('INFO', 'Locate budge element.');
    const budgeElement = await this.getScenarioBudge();
    await budgeElement.waitForDisplayed({ timeout: 60000 });
    await this.doClick(budgeElement, "Clicking on scenario badge");
    await CommonFunctions.logMessage('INFO', 'Budge element clicked.');
    const sceanrioTab = await this.txtScenarioSlctFilter();
    await CommonFunctions.logMessage('INFO', 'Located filter icon element.');
    await sceanrioTab.waitForDisplayed({ timeout: 60000 });
    const isScenarioTabDisplayed = await this.doesElementExist(sceanrioTab, "Checking if scenario tab is displayed");
    if (isScenarioTabDisplayed) {
      await CommonFunctions.logMessage('PASS', 'Scenario tab is correctly displayed after clicking the budge.');
      return true;
    } else {
      await CommonFunctions.logMessage('FAIL', 'Scenario tab is not displayed after clicking the budge.');
      return false;
    }
  }

  public async getBudgeTooltip(): Promise<string> {
    await CommonFunctions.logMessage('INFO', 'Fetching budge tooltip text.');
    const budgeElement = await this.getScenarioBudge();
    await CommonFunctions.logMessage('INFO', 'Located budge element.');
    const budgeText = await this.doGetAttribute(budgeElement, 'aria-label', "Getting badge tooltip text");
    await CommonFunctions.logMessage('INFO', `Retrieved budge tooltip text: ${budgeText}`);
    return budgeText;
  }

  public async getBudgeText(): Promise<string> {
    await CommonFunctions.logMessage('INFO', 'Fetching budge text.');
    const budgeElement = await this.getScenarioBudgeText();
    const budgeText = await this.doGetText(budgeElement, "Getting badge text");
    await CommonFunctions.logMessage('INFO', `Retrieved budge text: ${budgeText}`);
    return budgeText;
  }

  public async validateToolTipText(budgeCount: number, toolTipText: string): Promise<boolean> {
    await CommonFunctions.logMessage('INFO', 'Starting tooltip text validation.');
    let isValid = false;

    if (budgeCount === 0 && toolTipText.includes('Default scenario')) {
      isValid = true;
      await CommonFunctions.logMessage('PASS', 'Tooltip text is valid for default scenario (budge count is 0).');
    } else if (budgeCount > 0 && toolTipText.includes('Multiple scenarios selected')) {
      isValid = true;
      await CommonFunctions.logMessage('PASS', 'Tooltip text is valid for multiple scenarios (budge count is greater than 0).');
    } else {
      await CommonFunctions.logMessage('FAIL', 'Tooltip text is not valid. Please check the budge count and tooltip text.');
    }
    return isValid;
  }

  public async getBadgeClass(): Promise<string> {
    const badgeElement = await this.getScenarioBudgeCount();
    await CommonFunctions.logMessage('INFO', 'Located badge element.');
    const className = await this.doGetAttribute(badgeElement, 'class', "Getting badge class name");
    await CommonFunctions.logMessage('INFO', `Retrieved budge element class: ${className}`);
    return className;
  }

  public async isFilterConfigured(){
    const noFilterConfiguredEle = await this.noFilterConfigure;
    const isNoFilterExist = await this.doesElementExist(noFilterConfiguredEle, "Checking if no filter configured element exists");
    if(isNoFilterExist){
    await CommonFunctions.logMessage('PASS', 'Located No filter view defined element.');
      return false;
    }else{
      await CommonFunctions.logMessage('FAIL', 'No filter view defined element does not exist.');
      return true;
    }
  }

  public async clickOnEditDimensions() {
    const editIconEle = await this.editIcon;
    await editIconEle.waitForDisplayed({ timeout: 60000 });
    const isEditIconExist: boolean = await this.doesElementExist(editIconEle, "Checking if edit icon exists");
    await CommonFunctions.logMessage("INFO", `Is edit icon exist :: ${isEditIconExist}`);
    if (isEditIconExist) {
      await CommonFunctions.logMessage("INFO", "Clicking on edit icon");
      await this.doClick(editIconEle, "Clicking on edit dimensions icon");
  
      try {
        await Promise.race([
          this.searchByID.waitForExist({ timeout: 30000 }),
          this.btnConfigFilter.waitForExist({ timeout: 30000 })
        ]);
        await CommonFunctions.logMessage("INFO", "Either searchByID or btnConfigFilter exists");
      } catch (e) {
        await CommonFunctions.logMessage("INFO", "Neither searchByID nor btnConfigFilter exists within the timeout");
      }
    } else {
      await CommonFunctions.logMessage("INFO", "Unable to click on edit icon");
    }
  }

  public async clickOnResetDimensions(){
    const resetIcon = await $("//button[@data-testid='reset-dimensions']");
    await resetIcon.waitForDisplayed({ timeout: 60000 });
    const isResetIconExist: boolean = await this.doesElementExist(resetIcon, "Checking if reset dimensions icon exists");
    await CommonFunctions.logMessage("INFO",`Is reset dimensions icon exist :: ${isResetIconExist}`);
    if(isResetIconExist){
      await CommonFunctions.logMessage("INFO", "Clicking on reset dimensions icon");
      await this.doClick(resetIcon, "Clicking on reset dimensions icon");
      const removeButton=await $('button*=Remove')
      await removeButton.waitForDisplayed({ timeout: 30000 });
      const isRemoveButtonExist = await this.doesElementExist(removeButton, "Checking if remove button exists");
      if(isRemoveButtonExist){
        await CommonFunctions.logMessage("INFO", "Remove button is present");
        await CommonFunctions.logMessage("INFO", "Clicking on Remove dimensions button");
        await this.doClick(removeButton, "Clicking on Remove dimensions button");
        const emptyScope=await $('h2*=This process has no specific scope set')
        await emptyScope.waitForDisplayed({ timeout: 30000 });
        const isEmptyScopeDisplayed = await this.doesElementExist(emptyScope, "Checking if empty scope message is displayed");
        if(isEmptyScopeDisplayed){
          await CommonFunctions.logMessage("INFO", "Dimensions deleted successfully");
          return true;
        }
      }
    } else {
      await CommonFunctions.logMessage("INFO", "Unable to click on reset dimensions icon");
    }
  }

  public async verifyAppliedFilterInDataScope(filter:IVerticalFilter): Promise<boolean> {
    const dimensionEle = await this.getDimesionInDataScope(filter.dimesionName);
    await dimensionEle.waitForDisplayed({ timeout: 60000 });
    const isDimensionExist: boolean = await this.doesElementExist(dimensionEle, `Checking if ${filter.dimesionName} dimension exists`);
    await CommonFunctions.logMessage("INFO",`Is ${filter.dimesionName} dimension exist :: ${isDimensionExist}`);
    const filterValueEles = await this.getFilterValues(filter.filterName);
    if(filterValueEles.length === filter.filterValues.length){
      for(let filterEle of filterValueEles) {
        const value = await this.doGetText(filterEle, "Getting filter value text");
        if(!filter.filterValues.includes(value)){
          await CommonFunctions.logMessage("INFO",`${value} not exist in ${filter.filterValues} values`);
          return false;
        }
      }
    }
    return isDimensionExist;
  }

  public async clickOnManageScope(){
    const manageScopeEle = await this.manageScopeBtn;
    await manageScopeEle.waitForClickable({timeout: 30000});
    await CommonFunctions.logMessage("INFO","Clicking on manage scope button");
    await this.doClick(manageScopeEle, "Clicking on manage scope button");
  }

  public async doesActionExist(actionName: string): Promise<boolean> {
    await this.clickOnThreeDotOfView();
    const viewActionEle = await this.getViewAction(actionName);
    const isEleExist: boolean = await this.doesElementExist(viewActionEle,`${actionName} `);
    const backDropEle = this.threeDotMenuBackdrop;
    try {
      await backDropEle.waitForDisplayed({ timeout: 5000 });
      await this.doClick(backDropEle,`Clicking outside of 3 dot menu`);
      // Wait for backdrop to disappear completely before returning
      await backDropEle.waitForDisplayed({ timeout: 5000, reverse: true });
      await browser.pause(500);
    } catch (error) {
      await CommonFunctions.logMessage('INFO', `Backdrop click failed or already gone: ${error}`);
    }
    return isEleExist;
  }

  public async clickOnThreeDotOfView(){
    const width: number = await scaPage.getGridHeaderWidth();
    let threeDotEle: WebdriverIO.Element;
    if (width <= 960) {
      threeDotEle = await this.getThreeDotInView("more-btn")
    } else {
      threeDotEle = await this.getThreeDotInView("more-btn-2")
    }
    await this.doClick(threeDotEle,`Click on 3 dot menu of view`)
  }

  public async clickOnViewActions(actionName: string, isTestThree: boolean = false) { 
  await this.clickOnThreeDotOfView();
  await browser.pause(2000);
  const viewActionEle = await this.getViewAction(actionName);
  await CommonFunctions.logMessage("INFO", `Clicking on view action: ${actionName}`);
  await browser.execute(async (ele) =>  await ele.click(), viewActionEle);
  }

  public async setDefaultScopeFilter(filterName: string) {
     const filterDropdownEle = await this.filterDropdown;
     await filterDropdownEle.waitForClickable({timeout: 60000});
     await CommonFunctions.logMessage("INFO",'Clicking on filter dropdown');
     await this.doClick(filterDropdownEle, "Clicking on filter dropdown");
     const optionEle = await this.getFilterDropdownItem(filterName);
     await optionEle.waitForClickable({timeout: 30000});
     await CommonFunctions.logMessage("INFO",`Clicking on ${filterName} option `);
     await this.doClick(optionEle, `Clicking on ${filterName} filter option`);
     const setBtnEle = await this.setGlobalScope;
     await setBtnEle.waitForClickable({timeout: 30000});
     await CommonFunctions.logMessage("INFO",`Clicking on Set Button`);
     await this.doClick(setBtnEle, "Clicking on Set global scope button");
  }

  public async getAppliedVFTitle(): Promise<string> {
    const titleEle = await this.appliedVFtitle;
    await titleEle.waitForDisplayed({ timeout: 30000 });
    let filterName = await this.doGetText(titleEle, "Getting applied VF title");
    return filterName;
  }

  public async isDraftFilterCreated() {
    return await this.doesElementExist(await this.draftFilterLabel, "Checking if draft filter label exists");
  }

  public async checkFilterExists(filterName: string, hierarchy: string) {
    const filterSectionElement = await this.getFilterSection(filterName);
    const filterSectionExist = await filterSectionElement.isExisting();
    const filterSectionTitle = await this.getFilterSectionCheckboxTitle(filterName, hierarchy);
    const filterSectionTitleExist = await filterSectionTitle.isExisting();
    return filterSectionExist && filterSectionTitleExist;
  }
  
    public async checkQuickFilterExists(qfFilterName: string, qfHierarchy: string) {
      const filterSectionExist = await (await this.getSelectQuickFilterAttribute(qfFilterName)).isExisting();
      await this.doClickUsingScript(await this.getSelectQuickFilterAttribute(qfFilterName), `Clicking on filter section element of ${qfFilterName} filter`);
      await browser.pause(2000);
      const filterSectionTitleExist = await (await this.getQFFilterSectionCheckboxTitle(qfHierarchy)).isExisting();
      if (filterSectionTitleExist) {
        // Fetch again before isSelected to avoid stale reference after DOM update
        const isChecked = await (await this.getQFFilterSectionCheckboxTitle(qfHierarchy)).isSelected();
        if (!isChecked) {
          await this.doClickUsingScript(await this.getQFFilterSectionCheckboxTitle(qfHierarchy), `Checking checkbox for ${qfHierarchy} hierarchy`);
          await CommonFunctions.logMessage("INFO", `Checked ${qfHierarchy} hierarchy checkbox`);
        } else {
          await CommonFunctions.logMessage("INFO", `${qfHierarchy} hierarchy checkbox is already checked, proceeding`);
        }
      }
      return filterSectionExist && filterSectionTitleExist;
    }

    public async clickOnQuickFilterConfigIcon() {
      const quickFilterConfigIcon = this.quickFilterConfigIcon;
      await quickFilterConfigIcon.waitForDisplayed({ timeout: 30000 });
      await this.doClick(quickFilterConfigIcon, "Clicking on Quick Filter Configuration Icon");
    }
  
    public async configureQuickFilter(quickFilters: {filterName: string, hierarchy: string}[]): Promise<boolean> {
      let firstFilterItem = await this.getSelectQuickFilterAttribute(quickFilters[0].filterName);
      let filterDataLoaded = await firstFilterItem.isExisting();

      if (filterDataLoaded) {
        await CommonFunctions.logMessage("INFO", `Filter items already preloaded in popup, skipping data source dropdown selection`);
      } else {
        const dataSourcedd = this.quickFilterNameInput;
        await dataSourcedd.waitForDisplayed({ timeout: 30000 });
        await this.doClickUsingScript(dataSourcedd, "Clicking on Data Source Dropdown field");
        await browser.pause(1000);
        const SelectQFList = await this.getOption("Insights");
        await SelectQFList.waitForDisplayed({ timeout: 10000 });
        await this.doClickUsingScript(SelectQFList, "Selecting 'Insights' option from dropdown");
        await browser.pause(1000);

        // Retry with reload if still not loaded
        firstFilterItem = await this.getSelectQuickFilterAttribute(quickFilters[0].filterName);
        filterDataLoaded = await firstFilterItem.isExisting();

        if (!filterDataLoaded) {
          const maxRetries = 8;
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            await CommonFunctions.logMessage("INFO", `Filter items not displayed (attempt ${attempt}/${maxRetries}), waiting 10s`);
            await browser.pause(10000);

            const reloadBtn = this.quickFilterReloadBtn;
            const isReloadBtnExist = await reloadBtn.isExisting();
            if (isReloadBtnExist) {
              await reloadBtn.waitForClickable({ timeout: 6000 });
              await this.doClickUsingScript(reloadBtn, `Clicking Reload button (attempt ${attempt}/${maxRetries})`);
            }

            firstFilterItem = await this.getSelectQuickFilterAttribute(quickFilters[0].filterName);
            filterDataLoaded = await firstFilterItem.isExisting();
            if (filterDataLoaded) {
              await CommonFunctions.logMessage("INFO", `Filter items displayed after ${attempt} attempt(s)`);
              break;
            }
          }
        }
      }

      for (const qf of quickFilters) {
        const filterSectionElement = await this.checkQuickFilterExists(qf.filterName, qf.hierarchy);
        if (filterSectionElement) {
          await CommonFunctions.logMessage("INFO", `Filter section for ${qf.filterName} with ${qf.hierarchy} hierarchy exists and checkbox is ensured checked`);
        } else {
          await CommonFunctions.logMessage("INFO", `Filter section for ${qf.filterName} with ${qf.hierarchy} hierarchy does not exist`);
        }
        await CommonFunctions.logMessage("INFO", `Processed ${qf.filterName} with ${qf.hierarchy} hierarchy`);
      }

      const saveBtn = await this.quickFilterApplyBtn;
      await this.doClick(saveBtn, "Clicking on Save button of Quick Filter configuration");
      return true;
    }

  public async verifyQFValuesPurged(quickFilters: {qfItemName: string, qfValue: string}[]): Promise<boolean> {
    let allPurged = true;
    for (const qf of quickFilters) {
      const qfChip = await this.getClickOnQFList(qf.qfItemName);
      const isChipExisting = await qfChip.isExisting();
      if (!isChipExisting) {
        await CommonFunctions.logMessage('INFO', `QF chip '${qf.qfItemName}' does not exist - considered purged`);
        continue;
      }
      await this.doClickUsingScript(qfChip, `Clicking QF chip '${qf.qfItemName}' to check purge state`);
      await browser.pause(1000);
      const qfValueInput = await this.getSelectQFValuesInput(qf.qfValue);
      const isInputExisting = await qfValueInput.isExisting();
      if (!isInputExisting) {
        await CommonFunctions.logMessage('INFO', `QF value '${qf.qfValue}' input not found - considered purged`);
      } else {
        const isValueSelected = await qfValueInput.isSelected();
        if (isValueSelected) {
          await CommonFunctions.logMessage('FAIL', `QF value '${qf.qfValue}' for '${qf.qfItemName}' is still selected after VF change - not purged`);
          allPurged = false;
        } else {
          await CommonFunctions.logMessage('INFO', `QF value '${qf.qfValue}' for '${qf.qfItemName}' is not selected - purged correctly`);
        }
      }
      const closeBtn = await this.qfValueCloseBtn;
      if (await closeBtn.isExisting()) {
        await this.doClickUsingScript(closeBtn, `Closing QF chip '${qf.qfItemName}'`);
      }
      await browser.pause(500);
    }
    return allPurged;
  }

  public async selectAndApplyQF(quickFilters: {qfItemName: string, qfValue: string}[]): Promise<boolean> {
    for (const qf of quickFilters) {
      const qfChip = await this.getClickOnQFList(qf.qfItemName);
      await qfChip.waitForExist({ timeout: 30000 });
      await qfChip.waitForDisplayed({ timeout: 30000 });
      await this.doClickUsingScript(qfChip, `Clicked on the QF List item ${qf.qfItemName}`);
      await browser.pause(2000);
      const qfValueInput = await this.getSelectQFValuesInput(qf.qfValue);
      await qfValueInput.waitForExist({ timeout: 30000 });
      const isAlreadyChecked = await qfValueInput.isSelected();
      if (!isAlreadyChecked) {
        await this.doClickUsingScript(qfValueInput, `Selecting value ${qf.qfValue} for ${qf.qfItemName}`);
        await CommonFunctions.logMessage("INFO", `Selected value ${qf.qfValue} for QF item ${qf.qfItemName}`);
      } else {
        await CommonFunctions.logMessage("INFO", `Value ${qf.qfValue} is already selected for QF item ${qf.qfItemName}, proceeding`);
      }
      await browser.pause(3000);
      const closeBtn = await this.qfValueCloseBtn;
      const isCloseBtnExist = await this.doesElementExist(closeBtn, `Checking if close button exists for ${qf.qfItemName} chip`);
      if (isCloseBtnExist) {
        await this.doClickUsingScript(closeBtn, `Clicking on close button of ${qf.qfItemName} chip after value selection`);
        await CommonFunctions.logMessage("INFO", `Closed value selection for QF item ${qf.qfItemName}`);
      } else {
        await CommonFunctions.logMessage("INFO", `Close button does not exist for ${qf.qfItemName} chip`);
      }
      await browser.pause(1000);
    }
    const applyBtn = await this.qfValueApplyBtn;
    await applyBtn.waitForClickable({ timeout: 30000 });
    await this.doClick(applyBtn, "Clicking on Apply button after selecting QF values");
    return true;
  }

  public async verifyAndApplyQFChipValuesAfterDrillThrough(quickFilters: {qfItemName: string, qfValue: string}[]): Promise<boolean> {
    for (const qf of quickFilters) {
      const qfChip = await this.getClickOnQFList(qf.qfItemName);
      await qfChip.waitForExist({ timeout: 30000 });
      await qfChip.waitForDisplayed({ timeout: 30000 });
      const isChipExist = await this.doesElementExist(qfChip, `Checking if QF chip '${qf.qfItemName}' exists after drill through`);
      if (!isChipExist) {
        await CommonFunctions.logMessage("FAIL", `QF chip '${qf.qfItemName}' does not exist after drill through`);
        return false;
      }
      await CommonFunctions.logMessage("INFO", `QF chip '${qf.qfItemName}' exists after drill through`);
      await this.doClickUsingScript(qfChip, `Clicking on QF chip '${qf.qfItemName}' to verify and select value`);
      await browser.pause(2000);
      const qfValueInput = await this.getSelectQFValuesInput(qf.qfValue);
      await qfValueInput.waitForExist({ timeout: 30000 });
      const isValueSelected = await qfValueInput.isSelected();
      if (isValueSelected) {
        await CommonFunctions.logMessage("INFO", `Value '${qf.qfValue}' is already selected for QF item '${qf.qfItemName}'`);
      } else {
        await CommonFunctions.logMessage("INFO", `Value '${qf.qfValue}' is NOT selected for QF item '${qf.qfItemName}', selecting it now`);
        const qfValueSpan = await this.getSelectQFValues(qf.qfValue);
        await this.doClickUsingScript(qfValueSpan, `Selecting value '${qf.qfValue}' for QF item '${qf.qfItemName}'`);
        await CommonFunctions.logMessage("INFO", `Selected value '${qf.qfValue}' for QF item '${qf.qfItemName}'`);
      }
      const closeBtn = await this.qfValueCloseBtn;
      const isCloseBtnExist = await this.doesElementExist(closeBtn, `Checking if close button exists for ${qf.qfItemName}`);
      if (isCloseBtnExist) {
        await this.doClickUsingScript(closeBtn, `Closing value selection for ${qf.qfItemName}`);
      }
      await browser.pause(1000);
    }
    const applyBtn = await this.qfValueApplyBtn;
    await applyBtn.waitForClickable({ timeout: 30000 });
    await this.doClick(applyBtn, "Clicking on Apply button after selecting QF values");
    return true;
  }
  
  public async getAllVFSelectedValues() {
    let itemsArr : string[] = [];
    const selectedValues = await this.getVFSelectedValues;
   try {
    if (selectedValues?.length > 0) {
      for (const item of selectedValues) {
        const itemText = await this.doGetText(item, `Getting selected value text`);
        CommonFunctions.logMessage('INFO', `Getting the text of ${itemText} hierarchy item`);
        itemsArr.push(itemText)
      }
    } else {
      CommonFunctions.logMessage('INFO', `No items have been selected`);
    }
   }
   catch(e) {
    CommonFunctions.logMessage('INFO', `No selected values found`);
   }
   finally {
    return itemsArr;
   }
  }

  public async clickRevertVFChanges() {
    const revertBtn = await this.revertVerticalFilterBtn;
    try{
      await revertBtn.waitForDisplayed({timeout: 30000});
      await revertBtn.waitForClickable({timeout: 30000});
      await CommonFunctions.logMessage("INFO",`Clicking on Revert Changes button`);
      await this.doClick(revertBtn, "Clicking on Revert Changes button");
      await CommonFunctions.logMessage("INFO",`Revert Changes button is present`);
    } catch(e) {
      await CommonFunctions.logMessage("INFO",`Revert Changes button is not present or not clickable`);
    }
  }

  // This function is used to check if the dimension is present in the Maas Pivot header which are displaying as columns
  public async isDimensionExistInTopFacetsOfMaas(dimensionName: string,cardName: string): Promise<boolean> {
    const topFacetsEle  = await this.getTopFacetsInMaasPivot(cardName);
    const topFacetsText = await topFacetsEle.getText();
    await CommonFunctions.logMessage("INFO",`Fetched dimensions from ${cardName} card are ${topFacetsText}`);
    if(topFacetsText.includes(dimensionName)){
      await CommonFunctions.logMessage("INFO",`Dimension ${dimensionName} is present in ${cardName} card`);
      return true;
    }
    return false;
  }

  public async doesSelectedPropertiesReflectedInMaasAsColumns(selectedProperties: string[], cardName: string): Promise<boolean> {
    const maasProperties = await this.getSelectedPropertiesInMaasHeader(cardName);
    if(maasProperties.length !== selectedProperties.length){
      await CommonFunctions.logMessage("INFO",`Selected properties count ${selectedProperties.length} is not equal to the columns count in ${cardName} card`);
      return false;
    }
    for(let property of maasProperties){
      const propertyText = await property.getText();
      if(!selectedProperties.includes(propertyText)){
        await CommonFunctions.logMessage("INFO",`Scope mismatch in ${cardName} card`);
        return false;
      }
    }
    return true;
  }

  public async doesDrawerOpened(titleName: string): Promise<boolean> {
    const scopeDrawerEle = await this.getSideNavTitle(titleName);
    return scopeDrawerEle.isDisplayed();
  }

  public async closeDrawer() {
    await this.doClick(await this.closeDrawerBtn, "Clicking on Close Drawer Button");
  }

}



export default new ScopePage();
