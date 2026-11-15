import ScenarioPage from '../pageobjects/scenario.page'
import ProcessPage from '../pageobjects/process.page';
import MfePage from '../pageobjects/mfe.page';
import CommonFunctions from './common.util';
import PlanningSpace from '../pageobjects/planning.page';

export class TestUtil extends MfePage {
  public async createPublicChildScenarioTC(scenarioName: string): Promise<boolean> {
    await PlanningSpace.goToManageScenarios();
    await browser.pause(5000);
    const baseScenario: string = await ScenarioPage.getBaseScenario()
    await ScenarioPage.tableActionClick(baseScenario, 'Create Child Scenario');
    await ScenarioPage.createPublicScenario(scenarioName);
    await browser.pause(20000);
    await ScenarioPage.clickResetButton();
    await browser.pause(15000);
    const isCreated: boolean = await ScenarioPage.isScenarioCreated(scenarioName);
    return isCreated;
  }

  public async launchAppFromCatalog(sRealmName: string, sUserName: string, sPassword: string, appNamespace: string = "", isSecondUser?: boolean, globalCred: boolean = true, clickOnYes: boolean = false): Promise<void> {
    let isAccountPresent: boolean = false;
    if (globalCred == true) {
      sUserName = process.env.FUNCTIONAL_TEST_USERNAME as string;
      sPassword = process.env.FUNCTIONAL_TEST_PASSWORD as string;
    }
    const url = process.env.LUMINATE_PORTAL_URL as string + appNamespace;
    await CommonFunctions.logMessage("INFO", `Opening url :: ${process.env.LUMINATE_PORTAL_URL}${appNamespace}`)
    await browser.url(url);
    if (await this.isLoggedIn())
      return;
    await CommonFunctions.logMessage("INFO", `Current URL loaded: ${await browser.getUrl()}`);
    await browser.pause(2000);
    await this.enterRealmName(sRealmName);
    await this.clickContinue();
    await CommonFunctions.switchToSpecificWindow(1);
    if (sRealmName.includes("cbp-test-interop-1") || sRealmName.includes("cbp-interop-ps-automation-2"))
      await this.clickSupportSignIn();
    if (isSecondUser) {
      await browser.pause(5000);
      isAccountPresent = await this.doesAccountExists(sUserName);
      await CommonFunctions.logMessage("INFO", `Account ${sUserName} is present: ${isAccountPresent}`);
      await this.clickUseAnotherAccount();
    }
    await this.enterUserName(sUserName);
    await this.clickNext();
    await this.enterPassword(sPassword);
    await this.clickSignInBtn();
    if (!isSecondUser || isAccountPresent || clickOnYes) {
      await this.clickYesBtn();
    }
    await CommonFunctions.logMessage("INFO", "Switching back to the portal window");
    await CommonFunctions.switchToSpecificWindow(0);
    await this.closeWelcomePopup();
    await this.switchToMfe();
  }

  public async createChildScenarioFromProcedure(procedureName: string, scenarioName: string, scenarioDesc: string, visibility: 'Public' | 'Private' = 'Public', checkOrUncheckDefault: 'Check' | 'Uncheck' = 'Uncheck', isSave: boolean = true, isEdit: boolean = true, clickManage: boolean = true): Promise<boolean> {
    if (clickManage) {
      await PlanningSpace.goToManageScenarios();
      await browser.pause(5000);
      const baseScenario: string = await ScenarioPage.getBaseScenario();
      await CommonFunctions.logMessage("INFO", `Base Scenario name is: ${baseScenario}`);
      await PlanningSpace.closeManageScenarios();
    }
    await PlanningSpace.selectSupplyChainProceduresAction(procedureName);
    await ScenarioPage.createChildScenario(scenarioName, scenarioDesc, visibility, checkOrUncheckDefault, isSave, isEdit);
    if (!isSave) {
      return await CommonFunctions.verifyAlertMsg('success', 120000);
    }
    const running: boolean = await CommonFunctions.verifyAlertMsg(`procedure is running`);
    const success: boolean = await CommonFunctions.verifyAlertMsg('success', 60000);//Scenario created successfully
    await CommonFunctions.compareTwoValues(running, true, `Verify "${procedureName}" procedure is running`);
    await CommonFunctions.compareTwoValues(success, true, `Verify scenario is created successfully from "${procedureName}" procedure`);
    await PlanningSpace.goToManageScenarios();
    let validation: boolean = await CommonFunctions.compareTwoValues(await ScenarioPage.isScenarioVisibleUnderALLTab(scenarioName), true, "Child Scenario " + scenarioName + " Created Assertion")
    return validation;
  }

  // In Scenario Page
  public async createChildScenarioFromBase(scenarioName: string, scenarioDesc: string, visibility: 'Public' | 'Private' = 'Public', checkOrUncheckDefault: 'Check' | 'Uncheck' = 'Uncheck', isSave: boolean = false, isEdit: boolean = false, clickManage: boolean = true): Promise<boolean> {
    if (clickManage) {
      await PlanningSpace.goToManageScenarios();
      await browser.pause(5000);
    }
    const baseScenario: string = await ScenarioPage.getBaseScenario();
    await ScenarioPage.tableActionClick(baseScenario, 'Create Child Scenario');
    await ScenarioPage.createChildScenario(scenarioName, scenarioDesc, visibility, checkOrUncheckDefault, isSave, isEdit);
    if (!isSave) {
      return await CommonFunctions.verifyAlertMsg('success', 120000);
    }
    const running: boolean = await CommonFunctions.verifyAlertMsg(`procedure is running`);
    const success: boolean = await CommonFunctions.verifyAlertMsg('success', 60000);//Scenario created successfully
    return running && success;
  }

  // In Scenario Page
  public async createChildScenarioFromChild(parentScenario: string, scenarioName: string, scenarioDesc: string, visibility: 'Public' | 'Private' = 'Public', checkOrUncheckDefault: 'Check' | 'Uncheck' = 'Uncheck'): Promise<boolean> {
    // await PlanningSpace.goToManageScenarios();
    // await browser.pause(5000);
    await ScenarioPage.tableActionClick(parentScenario, 'Create Child Scenario');
    await ScenarioPage.createChildScenario(scenarioName, scenarioDesc, visibility, checkOrUncheckDefault);
    const running: boolean = await CommonFunctions.verifyAlertMsg(`procedure is running`);
    const success: boolean = await CommonFunctions.verifyAlertMsg('success', 100000);
    return running && success;
  }

  // In Scenario Page
  public async setBaseAsDefaultScenario() {
    await PlanningSpace.goToManageScenarios();
    const baseScenario = await ScenarioPage.getBaseScenario();
    const scenarioName = await ScenarioPage.getDefaultScenario();
    if (scenarioName === baseScenario) {
      await CommonFunctions.logMessage("INFO", `Base Scenario is already set as Default Scenario`);
    }
    else {
      await ScenarioPage.tableActionClick(baseScenario, 'Set as Default');
    }
    await PlanningSpace.closeManageScenarios();
    // await ProcessPage.clickLeftpaneLinks('Planning');
    await browser.pause(5000);
  }

  public async signOutAndLoginToPlanningSpaceWithProcess(realmName: string, userName: string, password: string, processName: string) {
    await PlanningSpace.signOut();
    await PlanningSpace.loginToPlanningSpaceWithProcess(realmName, userName, password, processName, true, false);
    await browser.pause(5000);
  }

  public async generateViewID() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "8";
    for (let i = 0; i < 23; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  public async clickPowerBarLink(sLinkName: string): Promise<void> {
    if (sLinkName == "Process Settings" || sLinkName == "Cognitive Model") {
      const settings = await $(`//button[@data-testid="nav-settings"]`);
      await settings.waitForDisplayed({ timeout: 60000 })
      await this.doClick(await settings, "Clicking on Settings Icon in the Powerbar");
    }
    await this.doClick(await $("//p[text()='" + sLinkName + "']"), `Navigating to "${sLinkName}" from Powerbar`);
  }

  public async leftPaneLinksOfPO(sLinkName: string): Promise<void> {
    const leftPaneLink = await $(`//span[contains(@class,'MuiBadge-root')]//button[@aria-label='${sLinkName}']`);
    await leftPaneLink.waitForDisplayed({ timeout: 60000 });  
    await this.doClick(leftPaneLink, `Clicking on ${sLinkName} link in left pane`);
  }

}
export default new TestUtil();

