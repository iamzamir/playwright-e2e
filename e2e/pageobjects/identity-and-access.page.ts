import MfePage from './mfe.page';
import CommonFunctions from '../util/common.util';

export class IdentityAndAccessPage extends MfePage {

  private get tfldCustomSearchBar()               { return $(`//input[@id='custom-search-bar']`); }
  private get assignRoleRightArrow()              { return $(`//button[@data-testid='lui-ccl-list-collector-move-right-button']`); }
  private get assignRoleLeftArrow()               { return $(`//button[@data-testid='lui-ccl-list-collector-move-left-button']`); }
  private get btnClose()                          { return $(`//span[text()='Close']/parent::button`); }
  private get alertMessage()                      { return $(`//div[@class='MuiAlert-message']`); }
  private get roleAlertMessage()                  { return $(`//div[@id='snackbar-alert-component']//div[@class='MuiAlert-message css-1xsto0d']`); }
  private get searchInp()                         { return $("//input[@id='custom-search-bar']")}
  private get moveLeftBtn()                       { return $("//button[@data-testid='lui-ccl-list-collector-move-left-button']")}
  private get alert()                             { return $("//div[contains(@class,'MuiSnackbar-root')]//div[contains(@class,'MuiAlert-message')]")}
  private get closeManageRoles()                  { return $("//span[text()='Close']/parent::button")}
  private get deleteRoleIcon()                    { return $("//button[@aria-label='delete']")}
  private get deleteRoleBtn()                     { return $("//button[@id='okBtn']")}
  private get addPolicyButton()                   { return $("//button[@id='add-policy-rule-button']"); }
  private get policyTypeDropdown()                { return $("//input[@id='policy-rule-dropdown']"); }
  private get entitiesPolicyTypeOption()          { return $("//div[text()='Entities']"); }
  private get policyNameInput()                   { return $("//input[@id='policyName']"); }
  private get policyDescriptionInput()            { return $("//input[@id='policyDescription']"); }
  private get namespaceDropdown()                 { return $("//label[text()='Namespace']/parent::div/div/input"); }
  private get resourceDropdown()                  { return $("//input[@id='policyResource']"); }
  private get permissionsDropdown()               { return $("//div[@id='multiselect-select']"); }
  private get selectAllPermissionsCheckbox()      { return $("//span/input[@id='multiselect-checkbox-All']"); }
  private get createPolicyButton()                { return $("//button[@name='saveBtn' and normalize-space()='Create Policy']"); }
  private get policySearchBar()                   { return $(`//input[@id='policy-details-search-bar']`); }
  private get policyClearButton()                 { return $(`//input[@id='policy-details-search-bar']/parent::div//button[@data-testid='lui-searchbar-clear']`); }
  private get policyRows()                        { return $$("//tr[@data-testid='lui-ccl-material-table-row']"); }
  private get editAndDelete()                     { return $$("//div[@data-testid='lui-ccl-material-table-actions-component']/span[@title='delete']"); }
  private getDelete(policyName: string)           { return $$("//tr[.//p[normalize-space()='" + policyName + "']]//button[@aria-label='delete']"); }
  private get btnOkPolicy()                       { return $("//button[@id='okBtn']"); }

  // Dynamic locators with parameters
  private getThreeDotForUser(userName: string)    { return $(`//p[contains(text(),"${userName}")]//ancestor::tr//button[@data-testid="lui-ccl-threedot-menu-icon-button"]`)}
  private getAction(actionName: string)           { return $(`//span[text()="${actionName}"]`)}
  private getSearchInp(sectionName: string)       { return $(`//p[text()="${sectionName}"]//ancestor::div[contains(@class,"MuiGrid-root") and contains(@class,"MuiGrid-item")]//input`)}
  private getRole(roleName: string)               { return $(`//span[text()="${roleName}"]/parent::div`)}
  private getTab(tabName: string)                 { return $(`//button[@role="tab"]/span[ text()="${tabName}"]`)}
  private getCoseIcon(roleName: string)           { return $(`//span[text()="${roleName}"]/parent::div//*[name()="svg"]`)}
  private getNamespaceOption(namespace: string)   { return $(`//li[@role="option" and normalize-space()="${namespace}"]`) }  
  private getResourceOption(resourceName: string) { return $(`//span[text()='${resourceName}']`); }
  private getTabButton(tabName: string)           { return $(`//button[text()='${tabName}']`); }
  private getThreeDotForUserValue(userName: string) { return $(`//p[text()='${userName}']/ancestor::tr//td//button[@data-testid='lui-ccl-threedot-menu-icon-button']`); }
  private getMenuOption(option: string)           { return $(`//ul[@data-testid='lui-ccl-threedot-menu-list']//li//span[text()='${option}']`); }
  private getRoleSelector(role: string)           { return $(`//span[text()='${role}']`); }
  private getPolicyByName(policyName: string)     { return $(`//td[@data-index='1']//p[@title='${policyName}']`); }

  private async clickAddPolicyButton(): Promise<void> {
    const addPolicyBtn = await this.addPolicyButton;
    await this.doClick(addPolicyBtn, "Clicking on add policy button");
  }

  private async selectPolicyType(): Promise<void> {
    const policyTypeDropdown = await this.policyTypeDropdown;
    await this.doClick(policyTypeDropdown, "Opening policy type dropdown");

    const entitiesOption = await this.entitiesPolicyTypeOption;
    await this.doClick(entitiesOption, "Selecting Entities policy type");
  }

  private async enterPolicyName(policyName: string): Promise<void> {
    const policyNameInput = await this.policyNameInput;
    await this.doClearAndEnterText(policyNameInput, policyName, `Entering policy name: ${policyName}`);
  }

  private async enterPolicyDescription(policyDescription: string): Promise<void> {
    const policyDescInput = await this.policyDescriptionInput;
    await this.doClearAndEnterText(policyDescInput, policyDescription, `Entering policy description: ${policyDescription}`);
  }

  private async selectNamespace(namespace: string): Promise<void> {
    const namespaceDropdown = await this.namespaceDropdown;
    await this.doClick(namespaceDropdown, `Opening namespace dropdown`);
    const namespaceOption = await this.getNamespaceOption(namespace);
    await namespaceOption.scrollIntoView();
    await namespaceOption.waitForClickable({ timeout: 30000 });
    await this.doClick(namespaceOption, `Selecting namespace: ${namespace}`);
  }

  private async selectResource(resourceName: string): Promise<void> {
    const resourceDropdown = await this.resourceDropdown;
    await this.doClick(resourceDropdown, `Opening resource dropdown`);
    await this.doClearAndEnterText(resourceDropdown, resourceName.split(" ")[0], `Searching for resource: ${resourceName}`);
    const resourceOption = await this.getResourceOption(resourceName);
    await this.doClick(resourceOption, `Selecting resource: ${resourceName}`);
  }

  private async selectAllPermissions(): Promise<void> {
    const permissionsDropdown = await this.permissionsDropdown;
    await this.doClick(permissionsDropdown, "Opening permissions dropdown");
    const selectAllCheckbox = await this.selectAllPermissionsCheckbox;
    await this.doClick(selectAllCheckbox, "Selecting all permissions");
    await browser.keys('Escape');
    await browser.pause(1000);
  }

  private async submitPolicyCreation(): Promise<void> {
    const createBtn = await this.createPolicyButton;
    await createBtn.scrollIntoView();
    await createBtn.waitForClickable({ timeout: 30000 });
    await this.doClick(createBtn, "Clicking Create Policy button");
  }

  public async createNewPolicy(namespace: string, roleName: string, policyName: string, policyDescription: string, procedureName: string, resourceName: string): Promise<boolean> {
    try {
      await this.clickAddPolicyButton();
      await this.selectPolicyType();
      await this.enterPolicyName(policyName);
      await this.enterPolicyDescription(policyDescription);
      await this.selectNamespace(namespace);
      await this.selectResource(resourceName);
      await this.selectAllPermissions();
      await this.submitPolicyCreation();
      const policyExists = await this.isPolicyExist(policyName);
      
      if (policyExists) {
        await CommonFunctions.logMessage("INFO", `Policy '${policyName}' created successfully`);
      } else {
        await CommonFunctions.logMessage("ERROR", `Policy '${policyName}' creation failed`);
      }
      return policyExists;
    } catch (error) {
      await CommonFunctions.logMessage("ERROR", `Error creating policy '${policyName}': ${error.message}`);
      throw error;
    }
  }

  public async navigateToIdentityaccessMfe(): Promise<void> {
    await CommonFunctions.logMessage("INFO", "Navigating to Identity Access Mfe by link:: https://bylumuiportalpltna.azureedge.net/identityaccess/");
    await browser.url("https://bylumuiportalpltna.azureedge.net/identityaccess/");
    await browser.pause(10000);
    await this.switchToMfe();
  }

  public async clickTab(tabName: string): Promise<void> {
    const eleTab = await this.getTabButton(tabName);
    await eleTab.waitForClickable({ timeout: 60000 });
    await this.doClick(eleTab, `Clicking on Tab: ${tabName}`);
  }

  public async clickOnRolesTab(roleName: string): Promise<void> {
    await this.clickTab("Roles");
    const searchrole = await this.searchInp;
    await this.doClearAndEnterText(searchrole, roleName, `Searching for role name: ${roleName}`);
    await browser.keys(' ');
    await browser.keys('Backspace');
    await browser.keys('Enter');
  }

  public async isPolicyExist(policyName: string): Promise<boolean> {
    const elePolicyName = await this.policySearchBar;
    await this.doClearAndEnterText(elePolicyName, policyName, `Searching Policy: ${policyName}`);

    const policy = await this.getPolicyByName(policyName);
    const policyExists = await this.doesElementExist(policy, `Checking if policy ${policyName} exists`);
    await CommonFunctions.logMessage("INFO", `${policyName} policy exists: ${policyExists}`);
    await this.clearSearchFilterInPolicy();
    return policyExists;
  }

  public async clearSearchFilterInPolicy(): Promise<void> {
    const clearField = await this.policyClearButton;
    const clearButtonExists = await this.doesElementExist(clearField, "Checking if clear button exists");
    if (clearButtonExists) {
      await this.doClick(clearField, "Clearing search filter in policy");
    }
  }

  public async addExecutePolicy(namespace: string, roleName: string, policyName: string, policyDescription: string, procedureName: string, resourceName: string): Promise<boolean> {
    await this.clickOnRolesTab(roleName);
    const policyExists = await this.isPolicyExist(policyName);
    if (!policyExists) {
      const policyCreated = await this.createNewPolicy(namespace, roleName, policyName, policyDescription, procedureName, resourceName);
      return policyCreated;
    } else {
      await CommonFunctions.logMessage("INFO", `${policyName} Policy is already present`);
      return true;
    }
  }

  public async searchUserName(sUserName: string): Promise<void> {
    await this.doEnterText(await this.tfldCustomSearchBar, sUserName, `Entering User Name ${sUserName} in the Custom Search Field`);
    await browser.keys('Enter');
  }

  public async click3dotsOnUser(sUserName: string): Promise<void> {
    const threedot = await this.getThreeDotForUserValue(sUserName);
    await this.doClick(threedot, `Clicking 3 dot button on the User Name ${sUserName}`);
  }

  public async selectOptionIn3dotDropdown(sOption: string): Promise<void> {
    const option = await this.getMenuOption(sOption);
    await this.doClick(option, `Selecting Option: ${sOption}`);
  }

  public async selectRole(sRole: string): Promise<void> {
    const role = await this.getRoleSelector(sRole);
    await role.waitForClickable({ timeout: 30000 });
    await this.doClick(role, `Selecting Role: ${sRole}`);
  }

  public async assignOrUnAssignRole(action: string): Promise<void> {  //To Assign - "assign", To UnAssign - "unassign"
    if (action.toLowerCase() == "assign")
      await this.doClick(await this.assignRoleRightArrow, "Assign Role to the User");
    else
      await this.doClick(await this.assignRoleLeftArrow, "Un Assigning Role from the User");
  }

  public async clickClose(): Promise<void> {
    await this.doClick(await this.btnClose, "Clicking Close Button");
    await browser.pause(5000);
  }

  public async getAlertMessage(locator?: WebdriverIO.Element): Promise<string> {
    let sAlertMessage: string = await this.doGetText(locator ? locator : await this.alertMessage, "Getting Alert Message");
    await CommonFunctions.logMessage("INFO", `Alert Message: ${sAlertMessage}`);
    return sAlertMessage;
  }

  public async assignRoleToUser(sUserName: string, sRole: string): Promise<string> {
    await this.searchUserName(sUserName);
    await this.click3dotsOnUser(sUserName);
    await this.selectOptionIn3dotDropdown("Manage Roles");
    await this.selectRole(sRole);
    await this.assignOrUnAssignRole("assign");
    let sAlertMessage: string = await this.getAlertMessage(await this.roleAlertMessage);
    // await this.clickClose();
    return sAlertMessage;
  }

  public async unAssignRoleToUser(sUserName: string, sRole: string): Promise<string> {
    await this.searchUserName(sUserName);
    await this.click3dotsOnUser(sUserName);
    await this.selectOptionIn3dotDropdown("Manage Roles");
    await this.selectRole(sRole);
    await this.assignOrUnAssignRole("unassign");
    let sAlertMessage: string = await this.getAlertMessage(await this.roleAlertMessage);
    // await this.clickClose();
    return sAlertMessage;
  }

  public async searchForUserOrMachine(userName: string): Promise<void> {
    const searchInpEle = await this.searchInp;
    await this.doClearAndEnterText(searchInpEle, userName, `Searching for user with username: ${userName}`);
  }

  public async clickOnThreeDot(userName: string): Promise<void> {
    const threeDotEle = await this.getThreeDotForUser(userName);
    await threeDotEle.waitForClickable({ timeout: 30000 });
    await this.doClick(threeDotEle, `Clicking on three dot menu for user: ${userName}`);
  }

  public async actionOnUser(optionName: string): Promise<void> {
    const actionEle = await this.getAction(optionName);
    await actionEle.waitForClickable({ timeout: 30000 });
    await this.doClick(actionEle, `Clicking on ${optionName} option`);
  }

  public async unAssignRoleForUser(role: string): Promise<void> {
    const searchInpEle = await this.getSearchInp("Assigned Roles");
    await this.doClearAndEnterText(searchInpEle, role, `Searching for role: ${role}`);

    const roleItem = await this.getRole(role);
    await roleItem.waitForClickable({ timeout: 30000 });
    await this.doClick(roleItem, `Clicking on ${role} role`);

    const leftBtnEle = await this.moveLeftBtn;
    await this.doClick(leftBtnEle, "Clicking on left button to unassign role");
  }

  public async unAssignRoleForMachine(role: string, machineUserName: string): Promise<void> {
    await this.searchForUserOrMachine(machineUserName);

    const closeIcon = await this.getCoseIcon(role);
    await closeIcon.scrollIntoView();
    await closeIcon.waitForClickable({ timeout: 30000 });
    await this.doClick(closeIcon, `Clicking on close icon for role: ${role}`);
  }

  public async deleteRole(roleName: string): Promise<void> {
    await this.searchForUserOrMachine(roleName);
    const deleteIcon = await this.deleteRoleIcon;
    await deleteIcon.waitForClickable({ timeout: 30000 });
    await this.doClick(deleteIcon, "Clicking on delete icon");

    const deleteRoleBtn = await this.deleteRoleBtn;
    await deleteRoleBtn.waitForClickable({ timeout: 30000 });
    await this.doClick(deleteRoleBtn, `Clicking on delete role button for: ${roleName}`);
  }

  public async verifyDeleteToast(msg: string): Promise<boolean> {
    const alertEle = await this.alert;
    alertEle.waitForDisplayed({ timeout: 10000 });
    const text = await this.doGetText(alertEle, "Getting alert message text");
    await CommonFunctions.logMessage('INFO', `Alert message: ${text}`);
    if (text.includes(msg))
      return true
    return false;
  }

  public async closeManageRolesDialog(): Promise<void> {
    const closeBtn = await this.closeManageRoles;
    await this.doClick(closeBtn, "Clicking on close manage roles button");
  }

  public async clickOnTab(tabName: string): Promise<void> {
    const tabEle = await this.getTab(tabName);
    await tabEle.waitForClickable({ timeout: 10000 });
    await this.doClick(tabEle, `Clicking on ${tabName} tab`);
  }

  public async searchPolicy(policyName: string): Promise<void> {
    await this.doEnterText(await this.policySearchBar, policyName, 'Search Policy name ' + policyName)
  }

  public async clickOk(): Promise<void> {
    await this.doClick(await this.btnOkPolicy, 'Clicking OK button to confirm policy deletion');
  }

  public async clickOnPolicyRow(): Promise<void> {
    await this.doClick(await this.policyRows[0], 'Clicking on the First row to view actions for policy');
  }

  public async clickDeleteIcon(policyName: string): Promise<void> {
    await this.doClick(await this.getDelete(policyName)[0], 'Clicking on delete icon');
  }

  public async deletePolicy(policyName: string) {
    await this.searchPolicy(policyName);
    await CommonFunctions.logMessage('INFO', 'Hover or click the row to view the edit and delete actions');
    // await this.clickOnPolicyRow();
    await this.clickDeleteIcon(policyName);
    await this.clickOk();
    return await this.isPolicyExist(policyName);
  }

}

export default new IdentityAndAccessPage();

