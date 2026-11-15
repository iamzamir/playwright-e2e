import MfePage from './mfe.page';
import CommonFunctions from '../util/common.util';

export class InteractivePlanningPage extends MfePage {

  public sTitle: string = "Interactive Planning";

  private get pageTitle()        { return $(`//h2[@data-testid='app-header-block-title']`); }
  private get iFrame()           { return $("//iframe[@id='mfe']"); }
  private get navigatingIcons()  { return $$("//span[contains(@class,'MuiBadge-root')]//div"); }
  private get scopeCard()        { return $("//span[@data-testid='lui-ccl-card-title']"); }
  private get relatedScenario()  { return $("//p[@data-testid='app-header-block-subtitle']"); }
  private get status()           { return $("//span[@data-testid='lui-ccl-object-status-label-container']"); }
  private get sessionName()      { return $("//h2[@data-testid='app-header-block-title']"); }
  private get breadCrumbNames()  { return $$("//button[contains(@data-testid,'luminate-portal-breadcrumbs-item')]"); }
  private get breadCrumb()       { return $("//ol[@role='list']/li"); }

  public async switchToMFEFrame() {
    await browser.switchToFrame(this.iFrame);
  }

  public async isPageLoaded(isSwitchToFrame: boolean = false) {
    if (isSwitchToFrame) await this.switchToMFEFrame();
    await browser.waitUntil(async () => { return (await this.pageTitle.getText() === await this.sTitle); }, { timeout: 60000, timeoutMsg: 'Page title not loaded within the specified time', interval: 500 });
  }

  public async getColumnValueBySessionName(sSessionName: string, sColumnName: string, isSwitchToFrame: boolean = false) {
    await this.isPageLoaded(isSwitchToFrame);
    const tableColumnNames = await $$("//table[contains(@class,'MuiTable-root')]//th//div[contains(@class,'Mui-TableHeadCell-Content-Wrapper')]");
    let index = 0;
    for (let i = 1; i <= tableColumnNames.length; i++) {
      await tableColumnNames[i].waitForDisplayed({ timeout: 30000 });
      let sColName: string = await tableColumnNames[i].getText();
      if (sColName == sColumnName) {
        index = i;
        break;
      }
    }
    let sColumnValue: string = await this.doGetText(await $("//p[text()='" + sSessionName + "']/ancestor::td//following-sibling::td[" + index + "]"), "Fetching Column "+sColumnName+" Value ");
    await CommonFunctions.logMessage("INFO", "Session Name:: " + sSessionName + " || Column Name:: " + sColumnName + " || Column Value:: " + sColumnValue);
    return sColumnValue;
  }

  public async getFirstSession(isSwitchToFrame: boolean = false) {
    await this.isPageLoaded(isSwitchToFrame);
    let sessionName: string = await this.doGetText(await $("(//p[contains(@title,'PlanningInstance')])[1]"), "Fetching First Session Name");
    await CommonFunctions.logMessage("INFO", "First Session Name:: "+sessionName);
    return sessionName;
  }

  public async clickSession(sSessionName: string, isSwitchToFrame: boolean = false) {
    await this.isPageLoaded(isSwitchToFrame);
    await this.doClick(await $("//a[text()='" + sSessionName + "']"), "Clicking Session Name:: " + sSessionName)
  }

  public async getAllNavigatingIcons(isSwitchToFrame: boolean = false) {
    await browser.pause(10000);
    if (isSwitchToFrame) await this.switchToMFEFrame();
    let arrIconNames: string[] = [];
    for (let i = 0; i < await this.navigatingIcons.length; i++) {
      await this.navigatingIcons[i].waitForDisplayed({ timeout: 30000 });
      arrIconNames.push(await this.navigatingIcons[i].getAttribute("aria-label"));
    }
    await CommonFunctions.logMessage("INFO", "All Icons in the Left Pane:: " + arrIconNames.toString());
    return arrIconNames;
  }

  public async isScopeCardDisplays(isSwitchToFrame: boolean = false) {
    if (isSwitchToFrame) await this.switchToMFEFrame();
    let isDisplay: boolean = await this.scopeCard.isExisting();
    await CommonFunctions.logMessage("INFO", "Scope Card Displays? :: " + isDisplay);
    return isDisplay;
  }

  /*
  As part of ABP-9305, ABP-9492
  public async getRelatedScenarioInsideSession(isSwitchToFrame: boolean = false) {
    if (isSwitchToFrame) await this.switchToMFEFrame();
    let isDisplay: boolean = await this.relatedScenario.isExisting();
    await CommonFunctions.logMessage("INFO", "Related Scenario Displays? :: " + isDisplay);
    let sRelatedScenario: string = await this.doGetText(await this.relatedScenario, "Fetching Related Scenario");
    await CommonFunctions.logMessage("INFO", "Related Scenario :: " + sRelatedScenario);
    return sRelatedScenario;
  }*/

  public async getStatusInsideSession(isSwitchToFrame: boolean = false) {
    if (isSwitchToFrame) await this.switchToMFEFrame();
    let isDisplay: boolean = await this.status.isExisting();
    await CommonFunctions.logMessage("INFO", "Status Displays? :: " + isDisplay);
    let sStatus: string = await this.status.getText();
    await CommonFunctions.logMessage("INFO", "Status :: " + sStatus);
    return sStatus;
  }

  public async getSessionNameInsideSession(isSwitchToFrame: boolean = false) {
    if (isSwitchToFrame) await this.switchToMFEFrame();
    let isDisplay: boolean = await this.sessionName.isExisting();
    await CommonFunctions.logMessage("INFO", "Session Name Displays? :: " + isDisplay)
    let sSessionName: string = await this.sessionName.getText();
    await CommonFunctions.logMessage("INFO", "Session Name :: " + sSessionName)
    await browser.switchToParentFrame();
    return sSessionName;
  }

  public async getAllBreadCrumbsNames() {
    await browser.pause(10000);
    await this.breadCrumb.waitForExist({ timeout: 30000 });
    await CommonFunctions.logMessage("INFO", "Mouse Hovering on Process Name Breadcrumb");
    //Hovering Mouse pointer on Process Name BreadCrumb
    await browser.execute(async (elem) => {
      elem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    }, await this.breadCrumb);
    await browser.pause(3000);
    let arrNames: string[] = [];
    for (let i = 0; i < await this.breadCrumbNames.length; i++) {
      await CommonFunctions.logMessage("INFO", "Fetching BreadCrumb Names of link " + (i + 1));
      arrNames.push(await this.breadCrumbNames[i].getText());
    }
    await CommonFunctions.logMessage("INFO", "All BreadCrumb Names:: " + arrNames.toString());
    return arrNames;
  }


}
export default new InteractivePlanningPage();
