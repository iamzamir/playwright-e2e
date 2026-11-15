import MfePage from './mfe.page';
import PlanningSpace from './planning.page';
import scope from './scope.page';
import { clearText } from '../commands/material-ui-commands';
import CommonFunctions from '../util/common.util';
import scopePage from './scope.page';

export class ScenarioPage extends MfePage {

  private get lblTitle()                { return $("//h2[@data-testid='app-header-block-title']"); } 
  private get btnEdit()                 { return $("(//button[normalize-space()='Edit'])[1]"); }  
  private get tfldScenarioName()        { return $("(//input[@name='scenarioName'])[last()]"); }
  private get slctPublic()              { return $("(//input[@value='PUBLIC'])[last()]"); }
  private get slctPrivate()             { return $("(//input[@value='PRIVATE'])[last()]"); }
  private get uncheckDefault()          { return $("(//input[@aria-label='Set as Default'] | //input[@aria-label='uncontrolled-checkbox'])[last()]"); }
  private get btnSave()                 { return $("//button[text()='Save']"); }
  private get btnCancel()               { return $("(//button[@data-testid='cancel-btn'])[last()]"); }
  private get btnCloseScnFilter()       { return $("//button[@data-testid='drawer-close-btn']"); }
  private get btnCreate()               { return $("(//button[text()='Create'])[last()]"); }
  private get btnRun()                  { return $("//button[text()='Run']"); }
  public  get btnAll()                  { return $("//button/p[text()='All']"); }
  public  get btnPinned()               { return $("//button[@aria-label='button Pinned']"); }
  public  get btnRefresh()              { return $("//button[@data-testid='refreshIconBtn']"); }
  public  get btnReset()                { return $("//button[@data-testid='lui-ccl-horizontal-filter-reset-button']"); }
  public  get btnApply()                { return $("//button[@data-testid='lui-ccl-horizontal-filter-submit-button']"); }
  public  get btnResetScnTab()          { return $("//button[text()='Reset']"); }
  private gettxtBaseScenario(scenarioName : string)         { return $(`//*[@data-testid='scenario-chip-btn']//button[starts-with(normalize-space(), '${scenarioName}')]`); }
  private get txtScenarios()            { return $$("//tr[@data-testid='lui-ccl-table-row']//td[@data-index='1']/p"); }
  private get txtScenarioDesc()         { return $("(//textarea[@name='scenarioDescription'])[last()]"); }
  private get txtSaveSuccess()          { return $("//div[contains(@class,'MuiAlert-root') and contains(@class,'MuiAlert-colorSuccess') and @role='alert']//div[contains(@class,'MuiAlert-message') and contains(text(),'successfully')]"); }
  private get threedotIcon()            { return $("//button[@data-testid='threeDotButton']"); }
  private get editAction()              { return $("//li[contains(text(),'Edit')]"); }
  private get deleteAction()            { return $("//li[contains(text(),'Delete')]"); }
  private get btnDelete()               { return $("//button[text()='Delete']"); }
  private get btnBackArrow()            { return $("//button[@data-testid='app-header-block-back-button']"); }
  private get btnScenarioSlctFilter()   { return $("//div[contains(@class,'MuiGrid-root MuiGrid-item MuiGrid-grid-xs-2')]//*[name()='svg']"); }  
  private get btnApplyFilters()         { return $("//button[@data-testid='lui-ccl-horizontal-filter-submit-button']")}
  public get btnSaveFilter()            { return $("//button[@data-testid='save-btn']")}
  private get txtScenarioSlctFilter()   { return $$("//div[@data-testid='lui-ccl-table']//tr//td[1]//p")}
  // private get txtScenarioSlctFilter()   { return $("//p[text()='Scenarios']/ancestor::div[@id='panel1a-header']/following-sibling::div")}
  private get presentationEle()         { return $(`//div[@role='presentation']/div[1]`)}
  private get userNameEle()             { return $(`//div[@data-testid='avatar-image-container']/div`)}
  private get luminateAvtharEle()       { return $(`//span[@data-testid='luminate-avatar-menu-badge']`)}
  private get btnDone()                 { return $(`//button[@data-testid="done-button"]`)}
  private get childOfLabel()            { return $(`//label[text()='Child Of *']/parent::div//div[@id]`)}
  private get defaultScenario()         { return $(`(//span[@aria-label='Default']/ancestor::td//preceding-sibling::td[1])[last()]/p`)}
  // private get defaultScenarioInPSLink() { return $(`//*[name()='svg' and contains(@class,'MuiChip-iconColorDefault')]//ancestor::div[@data-testid="lui-ccl-chip"]//span/p`)}
  private get defaultScenarioInPSLink() { return $(`(//div[@data-testid="scenario-chip-btn"]//span[text()='Default'])[1]//ancestor::tr/td//p`)}
  private get searchSelectDropdown()    { return $(`//div[@data-testid="search-select"]`)}
  private get searchBar()               { return $(`//input[@placeholder="Search"]`)}
  private get setAsDefaultOption()      { return $(`//div[contains(@data-testid,"action-menu-item")]/span[text()='Set as Default']`)}
  private get moreInfoLink()            { return $(`//button[@data-testid="show-5"]`)} 
  private get createdScenarioEditMenu() { return $(`//div[contains(@data-testid,"action-menu-item")]/span[text()='Edit']`)};
  private get editTextArea()            { return $(`//textarea[@name="scenarioDescription"]`)}
  private get continueButton()          { return $(`//button[@data-testid='continue-button']`)}
  private get cancelButton()            { return $(`//button[@data-testid='cancel-button']`)}
  public get dropDown()                 { return $(`//div//label[text()='Visibility']/parent::div/div/div`) }
  public get applyBtn()                 { return $(`//button[@data-testid="save-btn"]`)}
  public get cancelBtn()                { return $(`//button[@data-testid="cancel-btn"]`)}
  private get getDefaultScenarioFromPlanningSpace() { return $(`(//div[@data-testid='lui-ccl-table']//tr[.//div[@data-testid="scenario-chip-btn"]]//p)[1]`)}
  private get selectedScenariosList()   { return $$(`//div[@data-testid='lui-ccl-modal-selected']//tr//p`)}
  private get scenariosList()           { return $$(`//div[@data-testid='lui-ccl-modal-all']//tr//p`)}

  private getscenarioLabel(scenarioName: string)    { return $(`//div[@class='MuiTreeItem-label']//button[@data-testid='treeItemBox' and text()='${scenarioName}']`)}
  private getScenarioColumn(columnName: string)     { return $(`//th[contains(., '${columnName}')]`)}
  private getColumValues(dataIndex: string)         { return $$(`//tr[@data-testid='lui-ccl-table-row']//td[@data-index='${dataIndex}']`)}
  private getCreatedByColumnValueEleBasedOnScenarioName(scenarioName: string, dataIndex: number) { return $(`//tr[.//td[contains(., '${scenarioName}')]]//td[@data-index='${dataIndex}']//div[@data-testid="lui-ccl-avatarbadge-avatar"]`) }
  private getRightIconForDefaultScenario(scenarioName: string, dataIndex: number)                { return $(`//p[text()='${scenarioName}'][@title]/parent::td/following-sibling::td[1]//span[@aria-label='Default']`)}
  private getPinnedIconForDefaultScenario(scenarioName: string, dataIndex: number)               { return $(`//tr[.//p[text()='${scenarioName}']]/td[${+dataIndex + 1}]//div[@aria-label='This Scenario is Pinned']`)}
  private getScenarioEle(scenarioName: string)                { return $(`//table//p[text()='${scenarioName}']`)}
  private getScenarioEleInPSFIlter(scenarioName: string)      { return $(`//td//p[text()='${scenarioName}']`)}
  private getScenarioEleInPlanningSpace(scenarioName: string) { return $(`//p[contains(@aria-label, '${scenarioName}')]/ancestor::div[@data-testid="lui-ccl-chip"]`)}
  private getScenarioLabelInPivot(scenarioName: string)       { return $(`//*[self::p or self::div][@data-testid="senario-listtree-label-text" and text()='${scenarioName}']/ancestor::span/preceding-sibling::span//input[@type='checkbox']`)}
  private getTopAxisItem(itemName: string)                    { return $(`(//span[@class="axis-title-name"]/span[text()="${itemName}"])[1]`)}
  private getDescFromScenarioDetails(description: string)     { return $(`//div[text()='Description']/following::p[text()='${description}']`)}
  private getScenarioLiveIcon(cardName: string)               { return $(`//input[@value='${cardName}']//ancestor::div[@data-testid="lui-dashboard-card"]//button[contains(@data-testid,"icon-button-scenarios-popup")]`)}
  private getTableHeaderByCardName(cardName: string)          { return $(`//input[@value='${cardName}']//ancestor::div[@data-testid="lui-dashboard-card"]//div[contains(@class,"table-header-wrapper")]/div[contains(@class,"facets-container")]`)}
  private getExpandParentScenario(parentScenario: string)     { return $(`//button[@data-testid="treeItemBox" and text()="${parentScenario}"]/parent::div/parent::div[contains(@class,"MuiTreeItem-content")]/div[@class="MuiTreeItem-iconContainer"]`)}
  private getScenarioEleInChildOfTree(scenarioName: string)   { return $(`//button[@data-testid="treeItemBox" and text()="${scenarioName}"]`); }
  private getCreatedScenarioMenu(scenarioName: string)        { return $(`(//table//p[text()='${scenarioName}']/following::button[1])[last()]`)}; 
  private getcreatedScenarioSetAsDefault(sAction: string)     { return $(`//div[contains(@data-testid,"action-menu-item")]/span[text()='${sAction}']`)} 
  private getSelectedScenarioEle(scenarioName: string)        { return $(`//div[@data-testid='lui-ccl-modal']//td/p[text()='${scenarioName}']/parent::td//preceding-sibling::td//input`)}
  private defaultCheckedScenarioSvg(scenarioName: string)     { return $(`//div[@data-testid='lui-ccl-table']//tr//p[text()='${scenarioName}']//ancestor::tr//*[name()='svg' and @data-testid='scenario-selection-checkbox-default']`)}
  private setDefaultScenarioBtn(scenarioName: string)         { return $(`//div[@data-testid='lui-ccl-table']//tr//p[text()='${scenarioName}']//ancestor::tr//div[@data-testid="scenario-selection-default"]`)}
  public getDropDownItem(item: string)                        { return $("//span[text()='" + item + "']/ancestor::li//input[@type='checkbox']") }
  private getScenarioInModal(scenarioName: string)            { return $(`//div[@data-testid='lui-ccl-table']//tr[.//p[text()='${scenarioName}']]`)}
  private checkedScenarioSvg(scenarioName: string)            { return $(`//div[@data-testid='lui-ccl-table']//tr[.//p[text()='${scenarioName}']]//*[name()='svg' and @data-testid='scenario-selection-checkbox']`)}
  private uncheckedScenarioSvg(scenarioName: string)          { return $(`//div[@data-testid='lui-ccl-table']//tr[.//p[text()='${scenarioName}']]//*[name()='svg' and @data-testid='scenario-selection-checkbox-select']`)}
  private getSelectedScenarioDefaultButton(scenarioName : string) { return $(`//div[@data-testid='lui-ccl-table']//tr[.//p[text()='${scenarioName}']]//div[@data-testid='scenario-selection-default']`)}
  private defaultScenarioBtn(scenarioName: string)            { return $$(`//div[@data-testid='lui-ccl-table']//tr//p[text()='${scenarioName}']//ancestor::tr//div[@data-testid="scenario-chip-btn"]`)}
  private scenarioCreationicon()                              { return $(`//button[@data-testid="create-scenario-with-api-btn"]`); }
  private getbaseScenariotxt()                                { return $(`((//tr[@data-testid='lui-ccl-table-row'])[1]//p)[1]`)}

  public async getHeaderTitle() {
    const sTitle: string = await this.doGetText(this.lblTitle, "Getting header title");
    await CommonFunctions.logMessage("INFO", "Title:: " + sTitle);
    return sTitle;
  }

  public async openTree(sScenarioName: string) {
    const arrowDown = await $(`//table//tr//a[text()='${sScenarioName}']/ancestor::td/preceding-sibling::td//button[@aria-label='Expand']/parent::span`);
    const sAttributeValue = await this.doGetAttribute(arrowDown, "aria-label", "Getting aria-label attribute");
    console.log("sAttributeValue:: " + sAttributeValue)
    if (sAttributeValue == "Expand") {
      await CommonFunctions.logMessage("INFO", "Expanding  " + sScenarioName + " tree ");
      await this.doClick(arrowDown, "Clicking expand arrow");
    }
    else {
      await CommonFunctions.logMessage("INFO", "Already Scenario  " + sScenarioName + " tree expanded");
    }
  }

  public async ScenarioLinkVisible(sScenarioName: string) {
    const elelink = await $(`(//p[text()='${sScenarioName}'])[last()]`);
    try {
      await elelink.waitForDisplayed({ timeout: 15000 });
    }
    catch (e) {
      CommonFunctions.logMessage("INFO", "Scenario " + sScenarioName + " does not exist");
      return false;
    }
    const objVisible = await elelink.isDisplayed();
    if (objVisible === true || await elelink.isExisting()) {
      await CommonFunctions.logMessage("INFO", "Scenario " + sScenarioName + " is Visible!!");
      return true
    } else {
      await CommonFunctions.logMessage("INFO", "Scenario " + sScenarioName + " is NOT Visible!!");
      return false
    }
  }

  public async isScenarioVisibleUnderALLTab(sScenarioName: string) {
    await this.clickResetButton();
    return await this.ScenarioLinkVisible(sScenarioName);
  }

  public async clickResetButton() {
    await this.btnReset.waitForClickable({ timeout: 15000 });
    await this.doClick(this.btnReset, "Clicking Reset Button");
  }

  public async clickApplyScenarioTab() {
    await this.doClick(this.applyBtn, "Clicking Apply Button", 5000);
  }

  public async clickResetScenarioTab() {
    await this.doClick(await this.cancelBtn, "Clicking Cancel Button", 5000);
  }

  public async clickAllScenarios() {
    await CommonFunctions.logMessage("INFO", "Clicking on All Scenarios");
    await this.btnAll.waitForDisplayed({ timeout: 60000 });
    await this.btnAll.waitForClickable({ timeout: 60000 });
    await this.doClick(this.btnAll, "Clicking All Scenarios button");
  }

  public async clickPinnedScenarios() {
    await CommonFunctions.logMessage("INFO", "Clicking on Pinned Scenarios");
    await this.btnPinned.waitForDisplayed({ timeout: 60000 });
    await this.btnPinned.waitForClickable({ timeout: 60000 });
    await this.doClick(this.btnPinned, "Clicking Pinned Scenarios button");
  }

  // public async scenarioSelect(scenarios: string[], mode: 'Check' | 'Uncheck'): Promise<boolean> {
  //   // console.log("Selecting scenarios: " + scenarios + " with mode: " + mode);
  //   // await this.clickOnScenarioFilters();
  //   // await this.clickAllScenarios();
  //   for (let scenario of scenarios) {
  //     const selectScenario = await this.getSelectedScenarioEle(scenario);
  //     const isSelected: boolean = await selectScenario.isSelected();
  //     if (mode === 'Check' && isSelected) {
  //       await CommonFunctions.logMessage('INFO', `${scenario} scenario is already checked`);
  //       continue;
  //     }

  //     else if (mode === 'Uncheck' && !isSelected) {
  //       await CommonFunctions.logMessage('INFO', `${scenario} scenario is already unchecked`);
  //       continue;
  //     }
  //     await selectScenario.scrollIntoView();
  //     await this.doClick(selectScenario, `${mode}ing ${scenario} scenario from list`);
  //   }
  //   await CommonFunctions.logMessage("INFO", "Clicking Select Button");
  //   await this.btnSaveFilter.waitForClickable({ timeout: 30000 });
  //   await this.doClick(this.btnSaveFilter, "Clicking Save Filter button", 5000);
  //   return true;
  // }

  public async scenarioSelect(scenarios: string[], mode: 'Check' | 'Uncheck'): Promise<boolean> {
    for (const scenario of scenarios) {
      const row = await this.getScenarioInModal(scenario);

      if (!(await row.isExisting())) {
        await CommonFunctions.logMessage('ERROR', `Scenario "${scenario}" not found in table`);
        continue;
      }

      const checkedSvg = await this.checkedScenarioSvg(scenario);
      const uncheckedSvg = await this.uncheckedScenarioSvg(scenario);
      const isChecked = await checkedSvg.isExisting();

      if (mode === 'Check') {
        if (isChecked) {
          await CommonFunctions.logMessage('INFO', `${scenario} scenario is already checked`);
          continue;
        }
        if (await uncheckedSvg.isExisting()) {
          await uncheckedSvg.scrollIntoView();
          await this.doClick(uncheckedSvg, `Checking ${scenario} scenario`);
          await browser.pause(800);
          const nowChecked = await checkedSvg.isExisting();
          if (!nowChecked) {
            await CommonFunctions.logMessage('WARN', `${scenario} did not change to checked state`);
          }
        }
      }

      if (mode === 'Uncheck') {
        if (!isChecked) {
          await CommonFunctions.logMessage('INFO', `${scenario} scenario is already unchecked`);
          continue;
        }
        if (await checkedSvg.isExisting()) {
          await checkedSvg.scrollIntoView();
          await this.doClick(checkedSvg, `Unchecking ${scenario} scenario`);
          await browser.pause(800);
          const nowUnchecked = await uncheckedSvg.isExisting();
          if (!nowUnchecked) {
            await CommonFunctions.logMessage('WARN', `${scenario} did not change to unchecked state`);
          }
        }
      }
    }
    return true;
}

 public async verifySCselectedScenario(scenarioName: string): Promise<boolean> {
  let chip = await this.checkedScenarioSvg(scenarioName);
  if(!await chip.isExisting()) {
    chip = await this.defaultCheckedScenarioSvg(scenarioName);
  }
  return await chip.isExisting();
 }

  public async clickOnMoreInfoIconIfExists() {
    const moreInfoEleExist = await this.doesElementExist(this.moreInfoLink,"More Info link");
    if(moreInfoEleExist) {
      await this.doClick(this.moreInfoLink, "Clicking More Info Icon");
    }
  }

  // public async scenarioMap(scenarios: string[]) {
  //   const scName: string = await this.doGetText(this.txtScenarioSlctFilter, "Getting mapped scenario filter names");
  //   await CommonFunctions.logMessage("INFO", "Mapped Scenario Filter Names: " + scName);
  //   for (let item of scenarios) {
  //     if (scName.includes(item))
  //       continue;
  //     await CommonFunctions.logMessage("INFO", "Scenario " + item + " is Not available");
  //     return false;
  //   }
  //   await CommonFunctions.logMessage("INFO", "Scenario " + scenarios + " is available");
  //   return true;
  // }

  public async scenarioMap(scenarios: string[]): Promise<boolean> {
  const uiScenarioElements = await this.txtScenarioSlctFilter;
  const uiScenarios: string[] = [];

  for (const ele of uiScenarioElements) {
    const sText = await this.doGetText(ele, "Getting scenario name from UI");
    uiScenarios.push(sText.trim());
  }

  await CommonFunctions.logMessage("INFO", "Mapped Scenario Names in UI: " + uiScenarios.join(", "));

  for (const scenario of scenarios) {
    if (!uiScenarios.includes(scenario)) {
      await CommonFunctions.logMessage("INFO", `Scenario "${scenario}" is NOT available in mapped list`);
      return false;
    }
  }
  await CommonFunctions.logMessage("INFO", `All scenarios [${scenarios.join(", ")}] are available in mapped list`);
  return true;
}

  public async clickOnResetBtnInScenarioTab() {
    await CommonFunctions.logMessage('INFO', 'Looking for Reset button in Scenario Tab')
    const filterBtn = this.btnResetScnTab
    if (await this.doesElementExist(filterBtn, "Reset button in scenario tab")) {
      await filterBtn.scrollIntoView();
      await this.doClick(filterBtn, "Clicking Reset button")
      await CommonFunctions.logMessage('INFO', 'Clicked on  Reset button')
      return true
    }
    await CommonFunctions.logMessage('INFO', 'Reset button not exist')
    return false
  }

  // to create a private scenario as a child to base scenario
  public async createScenario(scenarioName) {
    await CommonFunctions.logMessage("INFO", "Clicking Edit Icon on Scenario Details");
    await this.btnEdit.waitForClickable({ timeout: 15000 })
    await this.doClick(this.btnEdit, "Clicking Edit button");
    await this.setScenarioName(scenarioName);
    await CommonFunctions.logMessage("INFO", "Unchecking Default Button");
    await this.doClick(this.uncheckDefault, "Unchecking Default checkbox");
    await CommonFunctions.logMessage("INFO", "Clicking Save Button");
    await this.btnSave.waitForClickable({ timeout: 15000 })
    await this.doClick(this.btnSave, "Clicking Save button");
    await CommonFunctions.logMessage("INFO", "Clicking Create Button");
    await this.btnCreate.waitForClickable({ timeout: 15000 })
    await this.doClick(this.btnCreate, "Clicking Create button");
  }
  
  public async openScenario(sScenarioName: string) {
    await CommonFunctions.logMessage("INFO", "Opening Scenario: " + sScenarioName)
    const scenario = await $(`//table//a[text()='${sScenarioName}']`);
    await scenario.waitForClickable({ timeout: 30000 });
    await this.doClick(scenario, "Clicking on scenario link");
  }

  public async editScenarioInDetail() {
    await CommonFunctions.logMessage("INFO", "Clicking Edit Icon(3 dot) On Scenario Details Page");
    await this.threedotIcon.waitForClickable({ timeout: 15000 });
    await this.doClick(this.threedotIcon, "Clicking three dot icon");
    await CommonFunctions.logMessage("INFO", "Clicking Edit Action");
    await this.editAction.waitForClickable({ timeout: 15000 });
    await this.doClick(this.editAction, "Clicking Edit action");
  }

  public async deleteScenarioInDetail(sScenarioName: string) {
    await CommonFunctions.logMessage("INFO", "Clicking Edit Icon(3 dot) On Scenario Details Page");
    await this.threedotIcon.waitForClickable({ timeout: 30000 });
    await this.doClick(this.threedotIcon, "Clicking three dot icon");
    await CommonFunctions.logMessage("INFO", "Clicking Edit Action");
    await this.deleteAction.waitForClickable({ timeout: 30000 });
    await this.doClick(this.deleteAction, "Clicking Delete action");
    await this.btnDelete.waitForClickable({ timeout: 60000 });
    await CommonFunctions.logMessage("INFO", "Clicking Delete Button")
    await this.doClick(this.btnDelete, "Clicking Delete button");
    await this.txtSaveSuccess.waitForDisplayed({ timeout: 60000 });
    const saveSuccess = await this.doGetText(this.txtSaveSuccess, "Getting success message");
    await CommonFunctions.logMessage("INFO", "Success Message: " + saveSuccess);
    if (saveSuccess !== '') {
      await CommonFunctions.logMessage("PASS", "Scenario " + sScenarioName + " deleted Successfully");
      return true;
    } else {
      await CommonFunctions.logMessage("FAIL", "Scenario " + sScenarioName + " deletion Failed");
      return false;
    }
  }

  public async editScenarioItem(scenarioName: string, description: string) {
        const scenarioItem = await this.getCreatedScenarioMenu(scenarioName);
        await scenarioItem.waitForDisplayed({ timeout: 15000 });
        await scenarioItem.waitForClickable({ timeout: 15000 });
        await this.doClick(scenarioItem, "Clicking Created Scenario Menu");
        const scenarioEdit = this.createdScenarioEditMenu;
        await scenarioEdit.waitForDisplayed({ timeout: 15000 });
        await scenarioEdit.waitForClickable({ timeout: 15000 });
        await this.doClick(scenarioEdit, "Clicking Edit Scenario Menu");
        const textarea = this.editTextArea;
        await textarea.waitForDisplayed({ timeout: 15000 });
        await textarea.waitForClickable({ timeout: 15000 });
        await clearText(textarea);
        await this.doEnterText(textarea, description, "Entering description in the edit text area");
  }

  public async editScenarioItemIsDefault(scenarioName) {
    await CommonFunctions.logMessage("INFO", 'Editing scenario' + scenarioName);
    await CommonFunctions.logMessage("INFO", "Clicking Edit Icon(3 dot) On Scenario Details Page");
    const scenarioItem = await this.getCreatedScenarioMenu(scenarioName);
    await scenarioItem.scrollIntoView();
    await scenarioItem.waitForClickable({ timeout: 15000 })
    await this.doClick(scenarioItem, "Clicking scenario menu button");
    if (await this.setAsDefaultOption.isExisting()) {
        await this.setAsDefaultOption.waitForDisplayed({ timeout: 15000 });
        await this.doClick(this.setAsDefaultOption, "Clicking Set as Default");
        const dataIndex = await this.getDataIndexByColumnName('Information');
        await browser.waitUntil(
            async () => await this.verifyRightIconInScenarioTable(scenarioName, dataIndex),
            { timeout: 10000, timeoutMsg: 'Default scenario icon did not appear' }
        );
    } else {
        await CommonFunctions.logMessage("INFO", `"Set as Default" not present, scenario is already default.`);
    }
  }

  public async setScenarioDesciption(sDescription: string) {
    await this.txtScenarioDesc.waitForDisplayed({ timeout: 15000 });
    await this.txtScenarioDesc.waitForClickable({ timeout: 15000 });
    await clearText(await this.txtScenarioDesc);
    await CommonFunctions.logMessage("INFO", "Entering Description:: " + sDescription);
    await this.doClearAndEnterText(await this.txtScenarioDesc, sDescription, "Setting scenario description");
  }

  public async setScenarioName(scenarioName: string) {
    await CommonFunctions.logMessage("INFO", "Entering Scenario Name:: " + scenarioName);
    await clearText(await this.tfldScenarioName);
    await this.doClearAndEnterText(await this.tfldScenarioName, scenarioName, "Setting scenario name");
  }

  public async getScenarioName() {
    await this.tfldScenarioName.waitForDisplayed({ timeout: 3000 });
    const scenarioName = await this.doGetAttribute(await this.tfldScenarioName, "value", "Getting scenario name");
    await CommonFunctions.logMessage("INFO", "Scenario Name:: " + scenarioName);
    return scenarioName;
  }

  public async clickScenarioSaveButton() {
    await this.btnSave.waitForClickable({ timeout: 10000 });
    await this.doClick(this.btnSave, "Clicking Save Button");
    await this.txtSaveSuccess.waitForDisplayed({ timeout: 10000 });
    const successMsg: string = await this.doGetText(this.txtSaveSuccess, "Getting Success Message");
    await CommonFunctions.logMessage("INFO", "Success Message: " + successMsg);
    if (successMsg.includes('success')) {
      await CommonFunctions.logMessage("PASS", "Scenario Save Successfull!");
      return true;
    } else {
      await CommonFunctions.logMessage("PASS", "Scenario Save Failed!");
      return false;
    }
  }

  public async clickScenarioCancelButton() {
    await this.doClick(this.btnCancel, "Clicking Cancel Button");
  }

  public async clickScenarioFilterCloseButton() {
    await this.doClick(this.btnCloseScnFilter, "Clicking Close Button");
  }

  public async clickBackArrowButton() {
    await CommonFunctions.logMessage("INFO", "Clicking Back Arrow Button");
    await this.btnBackArrow.waitForClickable({ timeout: 30000 });
    await this.doClick(this.btnBackArrow, "Clicking Back Arrow Button");
  }

  public async getBaseScenario() {
    const baseScenarioEle = await this.gettxtBaseScenario("Base");
    await baseScenarioEle.waitForDisplayed({ timeout: 30000 });
    const sBaseScenario: string = await this.doGetText(baseScenarioEle, "Getting Base Scenario");
    await CommonFunctions.logMessage("INFO", "Base Scenario:: " + sBaseScenario);
    return sBaseScenario.trim();
  }

  public async getScenarioNames() {
    const ele = await this.txtScenarios;
    let scenarioNames: string[] = [];
    for (let i = 0; i < ele.length; i++) {
      const scenarioName: string = await this.doGetText(ele[i], "Getting scenario name");
      scenarioNames.push(scenarioName);
    }
    await CommonFunctions.logMessage("INFO", "Scenario Names:: " + scenarioNames);
    return scenarioNames;
  }

  public async clickThreeDotIconOnScenario(sScenarioName: string) {
    const scenarioItem = await $(`(//tr[.//td[normalize-space()='${sScenarioName}']]//td[last()]//button)[last()]`);
    await scenarioItem.scrollIntoView();
    await scenarioItem.waitForExist({ timeout: 30000 });
    await this.doClickUsingScript(scenarioItem, "Clicking 3 dots on " + sScenarioName);
  }

  public async selectScenarioAction(sAction: string) {
    const actionButton = await this.getcreatedScenarioSetAsDefault(sAction);
    await actionButton.waitForDisplayed({ timeout: 6000 });
    await actionButton.waitForClickable({ timeout: 6000 });
    await this.doClick(actionButton, "Clicking " + sAction + " Action");
  }

  public async tableActionClick(sScenarioName: string, sAction: string, isClickAll: boolean = true) {
    // if (isClickAll) await this.clickAllScenarios();
    await CommonFunctions.logMessage("INFO", "Performing " + sAction + " Action on " + sScenarioName);
    await this.clickThreeDotIconOnScenario(sScenarioName);
    await this.selectScenarioAction(sAction);
  }

  public async setDefaultScenarioInPlanning(sScenarioName: string) {
      const isNotDefaultScenario = await this.doesElementExist(this.setDefaultScenarioBtn(sScenarioName), "Default Scenario link in Planning Space");
      if(isNotDefaultScenario) {
          await CommonFunctions.logMessage("INFO", "Setting " + sScenarioName + " as Default Scenario");
          await this.doClick(this.setDefaultScenarioBtn(sScenarioName), "Clicking Default Scenario button");
      }
      await this.clickApplyScenarioTab();
  }

  public async deleteChildScenario(sScenarioName: string) {
    await this.tableActionClick(sScenarioName, "Delete");
    await this.btnDelete.waitForClickable({ timeout: 5000 });
    await this.doClick(this.btnDelete, "Clicking Delete Button");
    await this.txtSaveSuccess.waitForDisplayed({ timeout: 80000 });
    const successMsg: string = await this.doGetText(this.txtSaveSuccess, "Getting Success Message");
    await CommonFunctions.logMessage("INFO", "Success Message: " + successMsg);
    if (successMsg.includes('success')) {
      await CommonFunctions.logMessage("PASS", "Scenario Deleted Successfully");
      return true;
    } else {
      await CommonFunctions.logMessage("FAIL", "Scenario Deletion Failed");
      return false;
    }
  }

  public async scenariodelete() {
    const deletebutton = await $(`//button/span[text()='Delete']//parent::button`);
    await this.doClick(deletebutton, "Clicking delete button");
  }

  public async isScenarioCreated(scenarioName: string): Promise<boolean> {
    const scenarioItem = await this.getScenarioEle(scenarioName);
    try {
      await scenarioItem.waitForDisplayed({ timeout: 150000 })
    }
    catch (e) {
      return false
    }
    if (await scenarioItem.isExisting()) {
      return true
    }
    else {
      return false
    }
  }

  // to create a public scenario as a child to base scenario
  public async createPublicScenario(sScenarioName: string) {
    await CommonFunctions.logMessage("INFO", "Clicking Edit Icon on Scenario Details");
    await this.doClick(this.btnEdit, "Clicking Edit button");
    await this.setScenarioName(sScenarioName);
    await CommonFunctions.logMessage("INFO", "Selecting Radio button Public");
    await this.doClick(this.slctPublic, "Selecting Public radio button");
    await CommonFunctions.logMessage("INFO", "Unchecking Default Button");
    await this.doClick(this.uncheckDefault, "Unchecking Default checkbox");
    await CommonFunctions.logMessage("INFO", "Clicking Save Button");
    await this.btnSave.waitForClickable({ timeout: 60000 })
    await this.doClick(this.btnSave, "Clicking Save button");
    await CommonFunctions.logMessage("INFO", "Clicking Create Button");
    await this.btnCreate.waitForClickable({ timeout: 60000 })
    await this.doClick(this.btnCreate, "Clicking Create button");
  }

  public async clickEditButton() {
    try {
      await this.btnEdit.waitForClickable({ timeout: 15000 });
      await this.doClick(this.btnEdit, "Clicking Edit Button On Scenario Details");
    } catch (error) {
      await CommonFunctions.logMessage("INFO", `Normal click on Edit button failed, retrying with JS: ${String((error as any)?.message || error)}`);
      await browser.execute((xpath: string) => {
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const element = result.singleNodeValue as HTMLElement | null;
        if (!element) throw new Error(`Edit button not found for xpath: ${xpath}`);
        element.click();
      }, "(//button[normalize-space()='Edit'])[1]");
      await browser.pause(1000);
    }
  }

  public async selectVisibility(visibility: 'Public' | 'Private') {
    if (visibility == 'Public')
      await this.doClick(this.slctPublic, "Selecting Radio button Public");
    else if (visibility == 'Private')
      await this.doClick(this.slctPrivate, "Selecting Radio button Private");
  }

  public async clickSaveButton() {
    await this.btnSave.waitForClickable({ timeout: 5000 });
    await this.doClick(this.btnSave, "Clicking Save Button On Scenario Details");
  }

  public async clickCreateButton() {
    await this.btnCreate.waitForClickable({ timeout: 5000 });
    await this.doClick(this.btnCreate, "Clicking Create Button On Scenario Details");
  }

  public async createChildScenario(scenarioName: string, scenarioDesc: string, visibility: 'Public' | 'Private' = 'Public', checkOrUncheckDefault: 'Check' | 'Uncheck' = 'Uncheck', isSave: boolean = false, isEdit: boolean = false) {
    if (isEdit) {
      await this.clickEditButton();
    }
    await this.setScenarioName(scenarioName);
    await this.setScenarioDesciption(scenarioDesc);
    await this.selectVisibility(visibility);
    if (checkOrUncheckDefault === 'Uncheck')
      await this.doClick(this.uncheckDefault, "Unchecking Default Button");
    else if (checkOrUncheckDefault === 'Check')
      await this.checkSetAsDefaultField();
    if (isSave) {
      await this.clickSaveButton();
      await browser.pause(3000);
    }
    await this.clickCreateButton();
  }

  public async createChildScenarioPopupLayout(scenarioName: string, scenarioDesc: string, visibility: 'Public' | 'Private' = 'Public', checkOrUncheckDefault: 'Check' | 'Uncheck' = 'Uncheck', childOf_scenario_name: string = '') {
    await this.setScenarioName(scenarioName);
    await this.setScenarioDesciption(scenarioDesc);
    await this.selectVisibility(visibility);
    if (checkOrUncheckDefault === 'Uncheck')
      await this.doClick(this.uncheckDefault, "Unchecking Default Button");
    else if (checkOrUncheckDefault === 'Check')
      await this.checkSetAsDefaultField();
    if (childOf_scenario_name !== '') {
      await this.selectChildOfScenario(childOf_scenario_name);
    }
    await this.clickCreateButton();
  }

  public async clickApplyFilters() {
    await CommonFunctions.logMessage('INFO', 'Clicking apply button')
    await this.btnApplyFilters.waitForClickable({ timeout: 10000 })
    await this.doClick(this.btnApplyFilters, "Clicking apply filters button")
  }

  public async getScenariosTableDataByColumnName(columnName: string): Promise<string[]> {
    await CommonFunctions.logMessage('INFO', `Looking for ${columnName}`)
    const column = await this.getScenarioColumn(columnName)
    const dataIndex: string = await this.doGetAttribute(column, "data-index", "Getting data index");
    await CommonFunctions.logMessage("INFO", `data index for ${columnName} is ${dataIndex}`);
    await browser.pause(4000); // to ensure that table data is loaded
    const colElements = await this.getColumValues(dataIndex)
    await CommonFunctions.logMessage('INFO', `Fetching values of ${columnName} column`)
    let colValues: string[] = [];
    for (let ele of colElements) {
      const text = await this.doGetText(ele, "Getting column value");
      colValues.push(text.trim());
    }
    colValues.shift(); // removing first element as it is extra
    const normalizedValues = colValues
      .map(value => value.trim())
      .filter(value => value.length > 0);
    await CommonFunctions.logMessage('INFO', `Fetched values of ${normalizedValues}`)
    return normalizedValues;
  }

  public async verifyFilterApplied(appliedFilter: 'Public' | 'Private' | 'All', values: string[]): Promise<boolean> {
    const normalizedValues = values
      .map(val => val.trim().toUpperCase())
      .filter(val => val.length > 0);
    await CommonFunctions.logMessage('INFO', `Checking whether all column values of ${normalizedValues} is ${appliedFilter}`)

    if (normalizedValues.length === 0) {
      await CommonFunctions.logMessage("INFO", `all column values of ${normalizedValues} is ${appliedFilter} :: false (no values found)`);
      return false;
    }

    if (appliedFilter === 'All') {
      const hasPublic = normalizedValues.some(val => val === 'PUBLIC');
      const hasPrivate = normalizedValues.some(val => val === 'PRIVATE');
      const allValid = hasPublic && hasPrivate;

      await CommonFunctions.logMessage('INFO', `all column values of ${normalizedValues} include both 'Public' and 'Private' :: ${allValid}`);
      return allValid;
    }
    for (let val of normalizedValues) {
      if (val === appliedFilter.toUpperCase()) {
        continue
      }
      await CommonFunctions.logMessage("INFO", `all column values of ${normalizedValues} is ${appliedFilter} :: false`);
      return false
    }
    await CommonFunctions.logMessage("INFO", `all column values of ${normalizedValues} is ${appliedFilter} :: true`);
    return true
  }

  public async verifyScenarioCreatedByUser(createdBy: string, scenarioName: string, columnName: string): Promise<boolean> {
    await CommonFunctions.logMessage('INFO', `Looking for ${columnName} column`)
    const column = await this.getScenarioColumn(columnName)
    await browser.waitUntil(
      async () => {
        return await column.isDisplayed();
      },
      { timeout: 15000, timeoutMsg: 'Column did not load' }
    );
    const dataIndex: number = await this.doGetAttribute(column, "data-index", "Getting data index") as unknown as number
    await CommonFunctions.logMessage("INFO", `data index for ${columnName} column is ${dataIndex}`)
    const createByEle = await this.getCreatedByColumnValueEleBasedOnScenarioName(scenarioName, dataIndex)
    await createByEle.waitForDisplayed({ timeout: 90000 })
    const createByEleValue: string = await this.doGetText(createByEle, "Getting created by value");
    return createByEleValue === createdBy
  }

  public async verifyUserFilterApplied(userAvtarsText: string[], columnName: string = 'Created By'): Promise<boolean> {
    const createdByColumnValues: string[] = await this.getScenariosTableDataByColumnName(columnName)
    for (let eachAvtar of createdByColumnValues) {
      if (userAvtarsText.includes(eachAvtar))
        continue
      await CommonFunctions.logMessage('INFO', `${eachAvtar} user not in provided ${userAvtarsText}`)
      return false
    }
    return true
  }

  public async getCurrentLoginUserName(): Promise<string | null> {
    await browser.switchToParentFrame();
    await CommonFunctions.logMessage('INFO', `Switched to parent frame`);
    const ele = this.luminateAvtharEle;
    await ele.waitForClickable({ timeout: 100000 });
    if (await this.doesElementExist(ele, "User avatar element")) {
      await CommonFunctions.logMessage('INFO', `User Avatar ele is found in header`);
      await CommonFunctions.logMessage('INFO', `Opening user info popup`);
      await this.doClick(ele, "Clicking user avatar");
      await CommonFunctions.logMessage('INFO', `User Avatar ele is clicked in header`);
      const name = await this.doGetText(this.userNameEle, "Getting user name")
      await CommonFunctions.logMessage('INFO', `Curerrent login user name is '${name}'`);
      await browser.waitUntil(
        async () => {
          return await this.presentationEle.isDisplayed();
        },
        { timeout: 15000, timeoutMsg: 'Presentation element did not appear' }
      );
      await CommonFunctions.logMessage('INFO', `Closing user info popup`);
      await this.doClick(this.presentationEle, "Clicking presentation element to close popup")
      return name;
    }
    return null
  }

  public getUserAvthar(userName: string): string {
    const [firstName, lastName] = userName.toUpperCase().split(' ')
    return firstName.charAt(0) + lastName.charAt(0)
  }

  public async getDataIndexByColumnName(columnName: string): Promise<number> {
    await CommonFunctions.logMessage('INFO', `Looking for ${columnName} column`)
    const column = await this.getScenarioColumn(columnName);
    const dataIndex: number = await this.doGetAttribute(column, "data-index", "Getting data index") as unknown as number;
    await CommonFunctions.logMessage("INFO", `data index for ${columnName} column is ${dataIndex}`)
    return dataIndex;
  }

  public async verifyPinIconInScenarioTable(scenarioName: string, dataIndex: number): Promise<boolean> {
    const pinnedIcon = await this.getPinnedIconForDefaultScenario(scenarioName, dataIndex);
    const isPinnedIconExist: boolean = await this.doesElementExist(pinnedIcon, `Pinned icon for scenario ${scenarioName}`);
    await CommonFunctions.logMessage('INFO', `Is pinned icon exist for scenario ${scenarioName} :: ${isPinnedIconExist}`)
    return isPinnedIconExist;
  }

  public async verifyRightIconInScenarioTable(scenarioName: string, dataIndex: number): Promise<boolean> {
    const rightIcon = await this.getRightIconForDefaultScenario(scenarioName, dataIndex);
    await browser.pause(2000);
    const isRightIconExist: boolean = await this.doesElementExist(rightIcon, `Right icon for scenario ${scenarioName}`);
    await CommonFunctions.logMessage('INFO', `Is right icon exist for scenario ${scenarioName}::${isRightIconExist}`);
    return isRightIconExist;
  }

  public async verifyIsDefaultScenario(scenarioName: string, columnName: string = 'Information'): Promise<boolean> {
    await CommonFunctions.logMessage('INFO', `verify provided ${scenarioName} scenario is default or not`)
    const dataIndex: number = await this.getDataIndexByColumnName(columnName)
    const isRightIconExist: boolean = await this.verifyRightIconInScenarioTable(scenarioName, dataIndex);
    await CommonFunctions.logMessage("INFO", "isRightIconExist? " + isRightIconExist);
    return isRightIconExist;
  }

  public async verifyIsScenarioUnderPinnedTab(scenarioName: string): Promise<boolean> {
    // await CommonFunctions.logMessage('INFO', `Clicking on pinned tab`);
    // await this.btnPinned.waitForClickable({ timeout: 100000 });
    // await this.doClick(this.btnPinned, "Clicking pinned tab");
    const scenario = await this.getScenarioEle(scenarioName);
    const isScenarioExist = await this.doesElementExist(scenario, `Scenario ${scenarioName} exists in scenarios tab`);
    await CommonFunctions.logMessage('INFO', `Is scenario ${scenarioName} available in scenarios page :: ${isScenarioExist}`);
    return isScenarioExist;
  }

  // public async verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(scenarioName: string): Promise<boolean> {
  //   const defaultScenario = await this.getScenarioEleInPlanningSpace(scenarioName)
  //   const rightIcon = await defaultScenario.$(`//*[name()='svg' and contains(@class,'MuiChip-iconColorDefault')]`); // checking right icon beside scenario
  //   const isrightIcontExist = await this.doesElementExist(rightIcon, `Right icon for default scenario ${scenarioName}`);
  //   await CommonFunctions.logMessage('INFO', `Is default scenario  ${scenarioName} exist under scenarios tab of planning space :: ${isrightIcontExist}`)
  //   return isrightIcontExist;
  // }

  public async verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(scenarioName: string): Promise<boolean> {
    const defaultScenarioBtns = await this.defaultScenarioBtn(scenarioName);
    await CommonFunctions.logMessage('INFO', `Number of default scenario buttons found for scenario ${scenarioName} in planning space :: ${defaultScenarioBtns.length}`);
    await CommonFunctions.logMessage('INFO', `is Exist: ${await Promise.all(defaultScenarioBtns.map(btn => btn.isExisting()))}`);
    const isDefaultScenarioExist = defaultScenarioBtns.length > 0 && await defaultScenarioBtns[0].isExisting();
    await CommonFunctions.logMessage('INFO', `Is default scenario ${scenarioName} exist under scenarios filters of planning space :: ${isDefaultScenarioExist}`);
    return isDefaultScenarioExist;
  }

  public async verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpaceInDrawer(scenarioName: string): Promise<boolean> {
    await scopePage.clickOnTab('Scenarios')
    let isDefaultScenarioExit= await this.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(scenarioName);
    await scopePage.closeDrawer();
    return isDefaultScenarioExit;
  }

  // public async getDefaultScenarioNameFromPlanningSpace(scenarioName: string) {
  //   const defaultScenario = await this.getScenarioEleInPlanningSpace(scenarioName);
  //   const getDefaultScenarioName = await this.doGetText(defaultScenario, "Getting default scenario name");
  //   const rightIcon = await defaultScenario.$(`//*[name()='svg' and contains(@class,'MuiChip-iconColorDefault')]`); // checking right icon beside scenario
  //   const isrightIcontExist = await this.doesElementExist(rightIcon, `Right icon for default scenario ${scenarioName}`);
  //   await CommonFunctions.logMessage('INFO', `Is default scenario  ${scenarioName} exist under scenarios tab of planning space :: ${isrightIcontExist}`)
  //   return isrightIcontExist && getDefaultScenarioName;
  // }

  public async getDefaultScenarioNameFromPlanningSpace() {
    const defaultScenario = this.getDefaultScenarioFromPlanningSpace;
    const getDefaultScenarioName = await this.doGetText(defaultScenario, "Getting default scenario name");
    return getDefaultScenarioName;
  }

  // Commenting as scenarios modal is changed to new layout
  // public async setDefaultScenario(sScenario: string) {
  //   await this.clickOnScenarioFilters()
  //   // await this.clickAllScenarios();
  //   await browser.waitUntil(
  //     async () => {
  //       const modal = await $("[data-testid='lui-ccl-modal']");
  //       return await modal.isDisplayed();
  //     },
  //     { timeout: 10000, timeoutMsg: 'Scenario modal did not load' }
  //   );
  //   const selectscenario = await $(`//div[@data-testid='lui-ccl-modal']//td/p[text()='${sScenario}']/parent::td//preceding-sibling::td//following-sibling::td//button[contains(text(), 'Set as default')]`);
  //   await CommonFunctions.logMessage("INFO", "Selecting Scenario " + sScenario + " from the list");
  //   await this.doClickUsingScript(selectscenario, "Clicking set as default for scenario");
  //   await CommonFunctions.logMessage("INFO", "Clicking Save Button");
  //   await this.doClick(this.btnSaveFilter, "Clicking save filter button");
  // }

  public async clickOnScenarioFilters() {
    await CommonFunctions.logMessage("INFO", "Clicking on Scenario Filter Icon");
    await this.btnScenarioSlctFilter.waitForClickable({ timeout: 60000 });
    await this.doClick(this.btnScenarioSlctFilter, "Clicking scenario filter icon");
  }

  // public async verifyCheckBoxStateForDefaultScenario(sScenario: string): Promise<boolean> {
  //   const selectscenario = await $(`//div[@data-testid='lui-ccl-modal']//td/p[text()='${sScenario}']/parent::td//preceding-sibling::td//input`);
  //   const isCheckBoxEnabled = await this.doGetAttribute(selectscenario, "enabled", "Getting checkbox enabled state") as unknown as boolean;
  //   await CommonFunctions.logMessage("INFO", "Clicking Save Button");
  //   await this.doClick(this.btnSaveFilter, "Clicking save filter button");
  //   return isCheckBoxEnabled;
  // }

  public async verifyCheckBoxStateForDefaultScenario(scenarioName: string): Promise<boolean> {
    const scenarioDefaultSelected = await this.doesElementExist(await this.defaultCheckedScenarioSvg(scenarioName), `Checked checkbox for scenario ${scenarioName}`);
    return scenarioDefaultSelected;
  }

  public async checkDefaultScenarioOnEdit(scenarioName: string) {
    await this.tableActionClick(scenarioName, 'Edit');
    const defaultCheckBox = await $(`//input[@aria-label='uncontrolled-checkbox']`);
    await this.doClick(defaultCheckBox, "Clicking default checkbox");
    await CommonFunctions.logMessage("INFO", "Clicking Save Button");
    const btnSave = this.btnSave
    await btnSave.moveTo()
    await this.doClick(btnSave, "Clicking Save button");
    return true;
  }

  public async clickOnScenarioLiveIcon(cardName: string): Promise<boolean> {
    const btnScenario = await this.getScenarioLiveIcon(cardName);
    await btnScenario.waitForClickable({ timeout: 15000 })
    await btnScenario.scrollIntoView();
    await this.mouseHover(await btnScenario, `Hovering on scenario live button in ${cardName} card`);
    await CommonFunctions.logMessage('INFO', `Clicking scenario live button in ${cardName} card`)
    await this.doClickUsingScript(await btnScenario, `Clicking scenario live button in ${cardName} card`);
    return true;
  }

  public async verifyScenarioInPivotPopup(scenarioName: string, isSelected?: boolean): Promise<boolean> {
    const scenarioLabelEle = await this.getScenarioLabelInPivot(scenarioName);
    const isEleExist = await this.doesElementExist(scenarioLabelEle, `Scenario ${scenarioName} in pivot popup`);
    if (!isEleExist) {
        await CommonFunctions.logMessage('INFO', `Scenario ${scenarioName} does not exist in pivot popup`);
        return false;
    }
    if (typeof isSelected === 'boolean') {
        const isCheckBoxSelected = await scenarioLabelEle.isSelected();
        await CommonFunctions.logMessage('INFO', `Is ${scenarioName} scenario selected :: ${isCheckBoxSelected}`);
        return isCheckBoxSelected === isSelected;
    }
    return true;
}

  public async applyScenarioPivotFilter(scenarios: string[]): Promise<boolean> {
    for (let scenarioName of scenarios) {
      const checkbox = await this.getScenarioLabelInPivot(scenarioName);
      await checkbox.waitForExist({ timeout: 10000 });
      const isChecked = await checkbox.isSelected();
      if (!isChecked) {
        await this.doClick(checkbox, `Clicking on ${scenarioName} scenario label in pivot popup`);
      } else {
        await CommonFunctions.logMessage('INFO', `${scenarioName} checkbox is already checked`);
      }
    }
    await this.doClick(this.btnDone, "Clicking done button in pivot");
    await browser.waitUntil(
      async () => {
        const column = await this.getTopAxisItem(scenarios[0]);
        return await column.isExisting();
      },
      { timeout: 10000, timeoutMsg: 'Scenario columns did not appear' }
    );
    let isColumnExist: boolean = false;
    for (let scenarioName of scenarios) {
      const childScenarioColumn = await this.getTopAxisItem(scenarioName);
      isColumnExist = await this.doesElementExist(childScenarioColumn, `Column with scenario name ${scenarioName}`);
      await CommonFunctions.logMessage('INFO', `Is column exist with name ${scenarioName} scenario in table :: ${isColumnExist} `)
    }
    return isColumnExist;
  }

  public async isScenarioNameFieldEnabled(): Promise<boolean> {
    return await this.tfldScenarioName.isEnabled();
  }

  public async isDefaultCheckBoxEnabled(): Promise<boolean> {
    return await this.uncheckDefault.isEnabled();
  }

  public async isPublicRadioBtnEnabled(): Promise<boolean> {
    return await this.slctPublic.isEnabled();
  }

  public async isPrivateRadioBtnEnabled(): Promise<boolean> {
    return await this.slctPrivate.isEnabled();
  }

  public async isScenarioDescFieldEnabled(): Promise<boolean> {
    return await this.txtScenarioDesc.isEnabled();
  }

  public async isChildofInpFieldDisabled(): Promise<boolean> {
    return await this.childOfLabel.isEnabled();
  }

  public async checkSetAsDefaultField(): Promise<boolean> {
    await CommonFunctions.logMessage("INFO", `Check Default Button `);
    const isChecked: boolean = await this.uncheckDefault.isSelected();
    await CommonFunctions.logMessage('INFO', `is Set As Default already checked :: ${isChecked} `);
    if (isChecked) {
      return false;
    }
    await this.doClick(this.uncheckDefault, "Checking Set As Default");
    await CommonFunctions.logMessage('INFO', 'checked Set As Default');
    return true;
  }

  public async uncheckSetAsDefaultField(): Promise<boolean> {
    await CommonFunctions.logMessage("INFO", `Check Default Button `);
    const isChecked: boolean = await this.uncheckDefault.isSelected();
    await CommonFunctions.logMessage('INFO', `is Set As Default already checked :: ${isChecked} `);
    if (!isChecked)
      return false;
    await this.doClick(this.uncheckDefault, "Unchecking Set As Default");
    await CommonFunctions.logMessage('INFO', 'UnChecked Set As Default');
    return true;
  }

  public async clickOnCreate() {
    await CommonFunctions.logMessage("INFO", `Clicking on Create Button`);
    const createScenarioBtn = this.btnCreate;
    await this.doClick(createScenarioBtn, "Clicking Create button");
  }

  public async runProcedure() {
    await CommonFunctions.logMessage("INFO", `Clicking on run Button`);
    const runProcedureBtn = this.btnRun;
    await this.doClick(runProcedureBtn, "Clicking Run button");
  }

  public async clickOnScenario(scenarioName: string) {
    await browser.pause(5000)
    await this.getScenarioEle(scenarioName).scrollIntoView();
    await this.doClick(this.getScenarioEle(scenarioName), `Clicking on scenario ${scenarioName}`);
  }

  public async verifyDescription(scenarioDesc: string): Promise<boolean> {
    const descEle = await this.getDescFromScenarioDetails(scenarioDesc);
    const isDescExist: boolean = await this.doesElementExist(descEle, `Description ${scenarioDesc} in scenario details`);
    await CommonFunctions.logMessage("INFO", `Is provided ${scenarioDesc} description available in scenario details :: ${isDescExist}`);
    return isDescExist;
  }

  public async verifyColumnExistsInPivotTable(columns: string[], cardName: string): Promise<boolean> {
    try {
        const tblHeaderEle = await this.getTableHeaderByCardName(cardName);
        const tblHeaderValue: string = await this.doGetText(tblHeaderEle, "Getting table header value");

        for (let col of columns) {
            if (!tblHeaderValue.includes(col)) {
                await CommonFunctions.logMessage('INFO', `${col} column doesn't exist in ${cardName} card.`);
                return false; 
            }
        }

        await CommonFunctions.logMessage('INFO', `${columns} exist in ${cardName} card table.`);
        return true; 
    } catch (error) {
        await CommonFunctions.logMessage('FAIL', `Failed to verify columns in ${cardName} card: ${error.message}`);
        return false; 
    }
}


  public async getDefaultScenario() {
    // await this.clickAllScenarios()
    const defaultScenario = await this.doGetText(this.defaultScenario, "Getting default scenario");
    await CommonFunctions.logMessage("INFO",`fetched default scenario :: ${defaultScenario}`);
    return defaultScenario;
  }

  public async getDefaultScenarioUnderScenariosTabInVF(): Promise<string> {
    const defaultScenarioEle = this.defaultScenarioInPSLink;
    const scenarioName: string = await this.doGetText(defaultScenarioEle, "Getting default scenario from Planning Space");
    await CommonFunctions.logMessage("INFO", `Fetched default scenario from scenarios tab in Planning Space left panel link is ${scenarioName}`);
    return scenarioName.trim();
  }

  public async setBaseAsDefaultScenario() {
    const baseScenario = await this.getBaseScenario();
    const defaultScenario = await this.getDefaultScenario();
    if (baseScenario !== defaultScenario) {
      await this.editScenarioItemIsDefault(baseScenario);
    }
  }

   public async openScenarioCreationPopupUsingIcon(){
    const scenarioCreateicon = await this.scenarioCreationicon();
    await scenarioCreateicon.waitForExist({ timeout: 60000 });
    await this.doClick(scenarioCreateicon, "Clicking Scenario Creation Icon");
  }

  public async getBaseScenarioFromScenariosPanel(): Promise<string> {
    const baseScenarioEle = await this.getbaseScenariotxt();
    const baseScenarioName: string = await this.doGetText(baseScenarioEle, "Getting Base Scenario from Scenarios Panel");
    await CommonFunctions.logMessage("INFO", `Fetched Base Scenario from Scenarios Panel is ${baseScenarioName}`);
    return baseScenarioName.trim();
  }

  public async createScenarioFromWizardLayout(scenarioName: string, scenarioDesc: string) {
    await CommonFunctions.logMessage("INFO", "Clicking Edit Icon on Scenario Details");
    await this.doClick(this.btnEdit, "Clicking Edit button");
    await this.setScenarioName(scenarioName);
    await this.setScenarioDesciption(scenarioDesc);
    await CommonFunctions.logMessage("INFO", "Selecting Radio button Public");
    await this.doClick(this.slctPublic, "Selecting Public radio button");
    const saveBtn = this.btnSave;
    await this.doClickUsingScript(saveBtn, "Clicking Save button using script");
    await CommonFunctions.logMessage("INFO", "Clicking Create Button");
    await this.btnCreate.waitForClickable({ timeout: 60000 })
    await this.doClick(this.btnCreate, "Clicking Create button");
  }

  public async getInlineScenariosCreatedWithSCA(scenarioName: string): Promise<string[]> {
    const scenarios: string[] = await this.getScenariosTableDataByColumnName('Name');
    const latestScenarios: string[] =[]
    for(let scenario of scenarios){
      if(scenario.startsWith(scenarioName)){
        await CommonFunctions.logMessage("INFO",`Found one matched scenario :: ${scenario}`);
        latestScenarios.push(scenario)
      }
    }
    return latestScenarios;
  }

  public async ScenarioSaveAndCreate() {
    await this.btnSave.waitForClickable({ timeout: 60000 })
    await this.doClick(this.btnSave, "Clicking Save button");
    await CommonFunctions.logMessage("INFO", "Clicking Create Button");
    await this.btnCreate.waitForClickable({ timeout: 60000 })
    await this.doClick(this.btnCreate, "Clicking Create button");
  }

  public async verifyDefaultScenario(deafltScenario: string): Promise<boolean> {
    // await this.clickAllScenarios();
    const defaultScenario = await this.doGetText(this.defaultScenario, "Getting default scenario");
    CommonFunctions.logMessage('INFO', `defaultScenario: ${defaultScenario}, expectedScenario: ${deafltScenario}, match: ${defaultScenario === `Scenario: ${deafltScenario}`}`);
    return defaultScenario === `${deafltScenario}`;
  }

  public async refreshScenarioPage(){
    const refreshBtn = this.btnRefresh;
    await refreshBtn.waitForDisplayed({ timeout: 30000 });
    if (await this.doesElementExist(refreshBtn, "Refresh button")) {
      await CommonFunctions.logMessage('INFO', "Refresh btn exist on dashboard")
      await this.doClick(refreshBtn, "Clicking refresh button");
    } else {
      await CommonFunctions.logMessage('INFO', "Refresh btn not exist on dashboard")
    }
  }

  public async validateScenarioSelectionNewUI(scenario: string): Promise<boolean> {
    try {
      const validation1 = await PlanningSpace.verifyNewScenarioFilter('Scenarios');
      await CommonFunctions.compareTwoValues(validation1, true, "Scenario chip click opens scenarios filter");
      const isSelected = await $(`//div[@data-testid='lui-ccl-modal-selected']//td//p[text()='${scenario}']/ancestor::tr//div[@data-testid='scenario-chip-btn']`);
      await isSelected.waitForDisplayed({ timeout: 10000 });
      const isScenarioExistInSelected: boolean = await this.doesElementExist(isSelected, `Scenario ${scenario} in selected list`);
      await CommonFunctions.logMessage("INFO", `${scenario} found in selected list? ${isScenarioExistInSelected}`);

      if (!isScenarioExistInSelected) {
        await CommonFunctions.logMessage("ERROR", `${scenario} not found in selected list!`);
        return false;
      }

      await PlanningSpace.closeScenarioFilter();
      return true;
    } catch (error) {
      await CommonFunctions.logMessage("ERROR", `Error validating scenario selection: ${error.message}`);
      return false;
    }
  }

  public async selectDefaultScenarioFromNewUI(scenario: string): Promise<boolean> {
    try {
      const searchIcon = await $('//button[@data-testid="search-icon"]');
      if (!await this.doesElementExist(searchIcon, "Search icon")) {
        await CommonFunctions.logMessage("ERROR", "Search icon not found!");
        return false;
      }
      await this.doClick(searchIcon, "Clicking search icon");

      const searchInput = await $('//input[@placeholder="Search"]');
      if (!await this.doesElementExist(searchInput, "Search input")) {
        await CommonFunctions.logMessage("ERROR", "Search input not found!");
        return false;
      }
      await this.doClearAndEnterText(searchInput, scenario, "Entering scenario name in search");
      const scenarioExist = await $(`//div[@data-testid='lui-ccl-modal-all']//td//p[text()='${scenario}']/ancestor::tr//td[@data-index="2"]`);
      const isScenarioExist: boolean = await this.doesElementExist(scenarioExist, `Scenario ${scenario} in search results`);
      await CommonFunctions.logMessage("INFO", `${scenario} found in list? ${isScenarioExist}`);

      if (!isScenarioExist) {
        await CommonFunctions.logMessage("ERROR", `${scenario} not found in the list!`);
        return false;
      }

      await CommonFunctions.logMessage("INFO", `Hovering on table row to display actions`);
      await scenarioExist.scrollIntoView();
      await this.mouseHover(scenarioExist, "Hovering on scenario row");
      await CommonFunctions.logMessage("INFO", `Clicking on default action to set default`);
      await this.doClick(scenarioExist, "Clicking on scenario to set default");

      const isSelected = await $(`//div[@data-testid='lui-ccl-modal-selected']//td/div/p[text()='${scenario}']/ancestor::tr//div[@data-testid='scenario-chip-btn']`);
      await isSelected.waitForDisplayed({ timeout: 10000 });
      const isScenarioExistInSelected: boolean = await this.doesElementExist(isSelected, `Scenario ${scenario} in selected list`);
      await CommonFunctions.logMessage("INFO", `${scenario} found in selected list? ${isScenarioExistInSelected}`);

      if (!isScenarioExistInSelected) {
        await CommonFunctions.logMessage("ERROR", `${scenario} not found in selected list!`);
        return false;
      }

      await CommonFunctions.logMessage("INFO", "Clicking Select Button");
      await this.doClick(this.btnSaveFilter, "Clicking save filter button");

      return true;
    } catch (error) {
      await CommonFunctions.logMessage("ERROR", `Error during scenario selection: ${error.message}`);
      return false;
    }
  }

  public async unselectScenariosNewUI(scenarioNames: string[]): Promise<boolean> {
    try {
      for (const scenarioName of scenarioNames) {
        await CommonFunctions.logMessage("INFO", `${scenarioName} checking inside selected scenario list.`);
        const selectedScenario = await $(`//div[@data-testid='lui-ccl-modal-selected']//td//p[text()='${scenarioName}']/ancestor::tr//td[@data-index="2"]`);
        const isScenarioSelected = await this.doesElementExist(selectedScenario, `Selected scenario ${scenarioName}`);

        if (!isScenarioSelected) {
          await CommonFunctions.logMessage("INFO", `${scenarioName} is not selected, no action needed.`);
          continue;
        }

        await CommonFunctions.logMessage("INFO", `Unselecting scenario: ${scenarioName}`);
        await this.doClick(selectedScenario, `Unselecting scenario ${scenarioName}`);
      }

      await CommonFunctions.logMessage("INFO", "Clicking Select Button");
      await this.btnSaveFilter.moveTo();
      await this.doClick(this.btnSaveFilter, "Clicking save filter button");
      return true;
    } catch (error) {
      await CommonFunctions.logMessage("ERROR", `Error while unselecting scenarios: ${error.message}`);
      return false;
    }
  }

  public async selectScenarioFromNewUI(scenarios: string[], mode: 'Check' | 'Uncheck'='Check'): Promise<boolean> {
    try {      
      for (let i = 0; i < scenarios.length; i++) {
        const scenario = scenarios[i];      
        if (i === 0) {
          const searchIcon = await $(`//button[@data-testid='search-icon']`);
          await searchIcon.waitForClickable({ timeout: 5000 });
          await this.doClick(searchIcon, "Clicking search icon");
        }

        const searchInput = await $('//input[@placeholder="Search"]');
        await searchInput.waitForDisplayed({ timeout: 5000 });
        await this.doClearAndEnterText(searchInput, scenario, "Entering scenario name in search");
        const scenarioTd = await $(`//div[@data-testid='lui-ccl-modal-all']//td//p[text()='${scenario}']/ancestor::tr//td[4]`);
        await scenarioTd.waitForDisplayed({ timeout: 10000 });
        const isScenarioExist = await this.doesElementExist(scenarioTd, `Scenario ${scenario} found in list`);

        if (!isScenarioExist) {
          await CommonFunctions.logMessage("ERROR", `${scenario} not found in list! Skipping.`);
          continue;
        }

        await CommonFunctions.logMessage("INFO", `${scenario} clicking select action.`);
        await scenarioTd.moveTo();
        await this.doClick(scenarioTd, "Clicking select action");
      }
      await CommonFunctions.logMessage("INFO", "Clicking Select Button");
      await this.btnSaveFilter.waitForClickable({ timeout: 30000 });
      await this.doClick(this.btnSaveFilter, "Clicking Save Filter button");
      return true;
    } catch (error) {
      await CommonFunctions.logMessage("ERROR", `Error in selectScenarioFromNewUi2: ${error.message}`);
      return false;
    }
  }

  public async getScenarioNamesFromNewUI () {
    const ele = await this.scenariosList;
    let scenarioNames: string[] = [];
    for (let i = 0; i < ele.length; i++) {
      const scenarioName: string = await this.doGetText(ele[i], "Getting scenario name");
      scenarioNames.push(scenarioName);
    }
    await CommonFunctions.logMessage("INFO", "Scenario Names:: " + scenarioNames);
    return scenarioNames;
  }

  public async getSelectedScenarioNamesFromNewUI() {
    const ele = await this.selectedScenariosList;
    let scenarioNames: string[] = [];
    for (let i = 0; i < ele.length; i++) {
      const scenarioName: string = await this.doGetText(ele[i], "Getting selected scenario name");
      scenarioNames.push(scenarioName);
    }
    await CommonFunctions.logMessage("INFO", "Selected Scenario Names:: " + scenarioNames);
    return scenarioNames;
  }


  // public async scenarioSelectandSetDetault(scenarios: string[], mode: 'Check' | 'Uncheck', isClickAll: boolean = true, isInteractiveView ?: boolean, isContinue ?: boolean): Promise<boolean> {
  //   // await this.clickOnScenarioFilters();
  //   await browser.pause(5000);
  //   if (isClickAll) await this.clickAllScenarios();
  //   await browser.pause(15000);
  //   for (let scenario of scenarios) {
  //     const selectScenario = await $(`//div[@data-testid='lui-ccl-modal']//td/p[text()='${scenario}']/parent::td//preceding-sibling::td//input`);
  //     const isSelected: boolean = await selectScenario.isSelected();
  //     if (!isSelected) {
  //       await selectScenario.scrollIntoView();
  //       await CommonFunctions.logMessage("INFO", `${mode}ed ${scenario} scenario from list`);
  //       await selectScenario.click();
  //       await CommonFunctions.logMessage('INFO', `${scenario} scenario is already unchecked`);
  //     }
  //     await browser.pause(8000);
  //     const selectscenario2 = await $(`//div[@data-testid='lui-ccl-modal']//td[p[text()='${scenario}']]/following-sibling::td[@data-index='4']/button`);
  //     await CommonFunctions.logMessage("INFO", "Setting default " + scenario + " from the list");
  //     await browser.execute(async (elem) => {
  //       await elem.click();
  //     }, selectscenario2);
  //   }
  //    if(isInteractiveView) {
  //     if(isContinue){
  //       const continueButton = await this.continueButton;
  //       await continueButton.click();
  //       await CommonFunctions.logMessage("INFO", "Clicked on Continue Button in scenario change pop up");
  //     }
  //     else {
  //       const cancelButton = await this.cancelButton;
  //       await cancelButton.click();
  //       await CommonFunctions.logMessage("INFO", "Clicked on Cancel Button in scenario change pop up");
  //     }
  //   }
  //   await browser.pause(8000);
  //   await CommonFunctions.logMessage("INFO", "Clicking Select Button");
  //   await this.btnSaveFilter.click();
  //   await browser.pause(5000);
  //   return true;
  // }

   public async scenarioSelectandSetDetault(scenarios: string[], mode: 'Check' | 'Uncheck', isInteractiveView ?: boolean, isContinue ?: boolean): Promise<boolean> {
    await browser.pause(10000);
    await this.scenarioSelect(scenarios, mode);
    for (let scenario of scenarios) {
      await CommonFunctions.logMessage("INFO", `Checking ${scenario} scenario`);
      const selectScenario = await this.getScenarioInModal(scenario);
      const isDefault = await this.verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(scenario);
      await CommonFunctions.logMessage("INFO", `Is default scenario ${scenario} exist under scenarios filters of planning space :: ${isDefault}`);
      await browser.pause(10000);
      if (!isDefault) {
        await selectScenario.scrollIntoView();
        const selectscenario2 = await this.getSelectedScenarioDefaultButton(scenario);
        await CommonFunctions.logMessage("INFO", "Setting default " + scenario + " from the list");
        await browser.execute(async (elem) => {
          await elem.click();
        }, selectscenario2);
      }
      await browser.pause(8000);
    }
    await CommonFunctions.logMessage("INFO", "Clicking Select Button");
    await browser.keys('Escape');
    await this.btnSaveFilter.click();
    if(isInteractiveView) {
      if(isContinue){
        const continueButton = await this.continueButton;
        await continueButton.click();
        await CommonFunctions.logMessage("INFO", "Clicked on Continue Button in scenario change pop up");
      }
      else {
        const cancelButton = await this.cancelButton;
        await cancelButton.click();
        await CommonFunctions.logMessage("INFO", "Clicked on Cancel Button in scenario change pop up");
      }
    }
    await browser.pause(5000);
    return true;
  }
  
  public async selectChildOfScenario(scenarioName: string, parentScenarioName?: string) {
    await this.doClickUsingScript(await this.searchSelectDropdown, "Clicking Search-Select Dropdown");
    await browser.pause(2000);
    // await this.doClick(await this.chevronIcon, "Expanding Dropdown");
    if (parentScenarioName) {
        const parentExpandArrow = await this.getExpandParentScenario(parentScenarioName);
        if (await parentExpandArrow.isExisting()) {
            await this.doClick(parentExpandArrow, `Expanding parent scenario "${parentScenarioName}"`);
            await browser.pause(500);
        }
    }
    const childExpandArrow = await this.getExpandParentScenario(scenarioName);
    if (await childExpandArrow.isExisting()) {
        await this.doClick(childExpandArrow, `Expanding child scenario "${scenarioName}"`);
        await browser.pause(500);
    }
    await this.searchBar.waitForDisplayed({ timeout: 10000 });
    await this.searchBar.waitForEnabled({ timeout: 10000 });
    await this.doEnterText(await this.searchBar, scenarioName, "Entering Scenario Name in Search Box");
    await browser.pause(1000);
    await this.doClick(await this.getscenarioLabel(scenarioName), "Clicking Scenario:: " + scenarioName);
  }

  public async verifyScenarioName(scenarioName: string, isFilterOpened: boolean = false): Promise<boolean> {
    if(!isFilterOpened) {
      await this.clickOnScenarioFilters();
      await browser.pause(5000);
      // await this.clickAllScenarios();
      await browser.pause(10000);
    }
    const scenario = await this.getScenarioEle(scenarioName);
    const isScenarioExist: boolean = await scenario.isExisting();
    await CommonFunctions.logMessage('INFO', `Is scenario ${scenarioName} exist in scenario list :: ${isScenarioExist}`);
    return isScenarioExist;
  }

  public async verifyScenarioNameInPSFilter(scenarioName: string): Promise<boolean> {
    const scenario = await this.getScenarioEleInPSFIlter(scenarioName);
    const isScenarioExist: boolean = await scenario.isExisting();
    await CommonFunctions.logMessage('INFO', `Is scenario ${scenarioName} exist in scenario list :: ${isScenarioExist}`);
    return isScenarioExist;
  }

  public async verifyScenarioNameInChildOfTree(baseScenarioName: string, scenarioName: string): Promise<boolean> {
    await this.doClickUsingScript(await this.searchSelectDropdown, "Clicking Search-Select Dropdown");
    await this.doClick(await this.getExpandParentScenario(baseScenarioName), "Expanding Dropdown");
    const ele = await this.getScenarioEleInChildOfTree(scenarioName);
    const isScenarioExist: boolean = await ele.isExisting();
    await CommonFunctions.logMessage('INFO', `Is scenario ${scenarioName} exist in child of tree :: ${isScenarioExist}`);
    return isScenarioExist;
  }
  
  public async createScenarioFromSCA(
    child_scenario_name: string = '',
    child_scenario_desc: string = '',
    childOf_scenario_name: string = '',
    isDefault: boolean = true,
    isPublic: boolean = true,
    isWizard: boolean = true
  ) {
    if(isWizard){
      await CommonFunctions.logMessage("INFO", "Clicking Edit Icon on Scenario Details");
      await this.btnEdit.click();
    }
    await browser.pause(2000);
    await this.setScenarioName(child_scenario_name);
    await this.setScenarioDesciption(child_scenario_desc);
    if (childOf_scenario_name !== '') {
      await this.selectChildOfScenario(childOf_scenario_name);
    }
    if (!isDefault) {
      await CommonFunctions.logMessage("INFO", "Unchecking Default Button");
      await this.uncheckDefault.click();
    }
    if (!isPublic) {
      await CommonFunctions.logMessage("INFO", "Selecting Radio button Private");
      await this.slctPrivate.click();
    }
    if(isWizard){
      const saveBtn = await this.btnSave;
      await browser.execute(async (ele) => {
        await ele.click();
      }, saveBtn);
    }
    await browser.pause(2000);
    await browser.setupInterceptor();
    await CommonFunctions.logMessage("INFO", "Clicking Create Button");
    await this.btnCreate.waitForClickable({ timeout: 60000 });
    await this.btnCreate.click();
  }

  public async validateTheJsonRequest(requestedUrl: string, checkProcedureName: string, checkScenarioName: string, checkParentScenarioName: string, checkParentScenarioId: string, checkParentScenarioDisplayName?: string) {
    await browser.waitUntil(async () => {
      const requests = await browser.getRequests();
      return requests.some((request) => request.url.includes(requestedUrl));
    }, { timeout: 10000, timeoutMsg: "API request not made within 5 seconds" }
    );

    // Get the intercepted requests
    const requests = await browser.getRequests();
    let JRequests: string = JSON.stringify(requests, null, 2);
    const jsonRequests = JSON.parse(JRequests);

    let procedureName: string = "", scenarioName: string = "", parentScenario: string = "", parentScenarioId: string = "", parentScenarioDisplayName: string = "";
    for (let i = 0; i < jsonRequests.length; i++) {
      if (jsonRequests[i].url.includes(requestedUrl) && !jsonRequests[i].url.includes("status")) {
        await CommonFunctions.logMessage("INFO", "URL: " + jsonRequests[i].url);
        await CommonFunctions.logMessage("INFO", "Method: " + jsonRequests[i].method);
        procedureName = jsonRequests[i].body.procedureName;
        scenarioName = jsonRequests[i].body.procInput.scenarioName;
        parentScenario = jsonRequests[i].body.procInput.parentScenario;
        parentScenarioId = jsonRequests[i].body.procInput.parentScenarioId;
        parentScenarioDisplayName = jsonRequests[i].body.procInput.parentScenarioDisplayName;
        await CommonFunctions.logMessage("INFO", "Procedure Name: " + procedureName);
        await CommonFunctions.logMessage("INFO", "Scenario Name: " + scenarioName);
        await CommonFunctions.logMessage("INFO", "Parent Scenario Name: " + parentScenario);
        await CommonFunctions.logMessage("INFO", "Parent Scenario Id: " + parentScenarioId);
        await CommonFunctions.logMessage("INFO", "Parent Scenario Display Name: " + parentScenarioDisplayName);

        let validation1: boolean = await CommonFunctions.compareTwoValues(procedureName, checkProcedureName, "Procedure Name Validation");
        let validation2: boolean = await CommonFunctions.compareTwoValues(scenarioName, checkScenarioName, "Scenario Name Validaiton");
        let validation3: boolean = await CommonFunctions.compareTwoValues(parentScenario, checkParentScenarioName, "Parent Scenario Name Validation");
        let validation4 = await CommonFunctions.compareTwoValues(parentScenarioId, checkParentScenarioId, "Parent Scenario Id Validation");
        let validation5 = checkParentScenarioDisplayName ? await CommonFunctions.compareTwoValues(parentScenarioDisplayName, checkParentScenarioDisplayName, "Parent Scenario Display Name Validation") : true;
        return validation1 && validation2 && validation3 && validation4 && validation5;
      }
    }
  }

  public async selectFilter(filterValue: string) {
    await this.clickResetButton();
    await this.doClick(await this.dropDown, "Clicking Visibility Dropdown");
    await this.doClick(await this.getDropDownItem(filterValue), "Clicking " + filterValue + " Visibility");
    await browser.pause(1000);
    await browser.keys('Tab');
  }

  public async selectOrUnselectFilter(fieldName: string, fieldValue: string) {
    const filterField = await $(`//div//label[text()='${fieldName}']/following::div/input[@id='tags-standard']`);
    if (await filterField.isExisting()) {
      await CommonFunctions.compareTwoValues(true, true, `${fieldValue} user is found in Create By Dropdown options`)
      await filterField.click();
      await browser.pause(1000);
      await filterField.setValue(fieldValue);
      await browser.keys('Down arrow');
      await browser.pause(100);
      await browser.keys('Enter');
      await browser.pause(100);
      await browser.keys('Tab');
    }
    else {
      await CommonFunctions.compareTwoValues(false, true, `${fieldValue} user is found in Create By Dropdown options`)
    }
  }

  public async getAccessToken(requestedUrl: string) {
    try {
      await browser.waitUntil(async () => {
        const requests = await browser.getRequests();
        return requests.some((request) => request.url.includes(requestedUrl));
      }, { timeout: 10000, timeoutMsg: "API request not made within 5 seconds" }
      );
    } catch (error) {
      console.log("error in getting access token", error);
    }
    // Get the intercepted requests
    const requests = await browser.getRequests();
    let JRequests: string = JSON.stringify(requests, null, 2);
    const jsonRequests = JSON.parse(JRequests);
    let accessToken: string = "";
    for (let i = 0; i < jsonRequests.length; i++) {
      if (jsonRequests[i].url.includes(requestedUrl)) {
        await CommonFunctions.logMessage("INFO", "URL: " + jsonRequests[i].url);
        await CommonFunctions.logMessage("INFO", "Method: " + jsonRequests[i].method);
        accessToken = jsonRequests[i].headers.authorization;
        await CommonFunctions.logMessage("INFO", "Access Token: " + accessToken);
        return accessToken;
      }
    }
  }

  public async getJsonRequests(requestedUrl: string) {
    await browser.waitUntil(async () => {
      const requests = await browser.getRequests();
      return requests.some((request) => request.url.includes(requestedUrl));
    }, { timeout: 10000, timeoutMsg: "API request not made within 10 seconds" }
    );

    // Get the intercepted requests
    const requests = await browser.getRequests();
    let JRequests: string = JSON.stringify(requests, null, 2);
    const jsonRequests = JSON.parse(JRequests);
    return jsonRequests;
  }

  public async getApiResponse(jsonRequests: any[],requestedUrl: string) {
    for (let i = 0; i < jsonRequests.length; i++) {
      if (jsonRequests[i].url.includes(requestedUrl)) {
        await CommonFunctions.logMessage("INFO", "URL: " + jsonRequests[i].url);
        await CommonFunctions.logMessage("INFO", "Method: " + jsonRequests[i].method);
        await CommonFunctions.logMessage("INFO", "Body: " + JSON.stringify(jsonRequests[i].response.body, null, 2));
        return jsonRequests[i].response.body;
      }
    }
  }

}
export default new ScenarioPage();
