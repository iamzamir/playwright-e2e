import MfePage from './mfe.page';
import CommonFunctions from '../util/common.util';
import ProcessPage from './process.page';

const timeoutSettings = { timeout: 3000 };
export class AssumptionPage extends MfePage {

  private get iconCreateNew()                   { return $("//button[@title='Create New']") }
  private get asumptionTitle()                  { return $("//input[@id='title']") }
  private get ddStatus()                        { return $("//div[@id='simple-select+status']") }
  private get ddAssumptionType()                { return $("//div[@id='simple-select+type']") }
  private get ddAssumptionConfidence()          { return $("//div[@id='simple-select+confidenceType']") }
  private get ddPriority()                      { return $("//div[@id='simple-select+priority']") }
  private get ddAssignedTo()                    { return $("(//input[@id='tags-standard'])[2]") }
  private get Savebtn()                         { return $("//button[text()='Save']") }
  private get Cancelbtn()                       { return $("//button[text()='Cancel']") }
  private get Savetxt()                         { return $("//*[contains(text(), 'Success!')]") }
  private get Chatbtn()                         { return $("//button[@data-testid='create-new']") }
  private get CreateThreadbtn()                 { return $("//button[@data-testid='create-button']") }
  private get ThreadCancelbtn()                 { return $("//button[text()='Cancel']") }
  private get situationRoomOverlay()            { return $("//*[@data-testid='close-icon']") }
  private get BacktoAssumption()                { return $("//div[@data-testid='nav-item0']/span") }
  private get threeDotIcon()                    { return $("//button[@data-testid='threeDotButton']") }
  private get clickOnDeleteText()               { return $("//li[text()='Delete']")}
  private get deleteButtonPopup()               { return $(`//button[text()="Delete"]`)}
  private get detailsTab()                      { return $(`//*[@data-testid='details-tab']`)}
  private get currentSituationRoomName()        { return $(`//*[@data-testid='situation-room-data-name']`)}
  private get assumptionName()                  { return $("//h2[@data-testid='app-header-block-title']")}
  private get collaborationRoomCreatedName()    { return $("//span[@data-testid='situation-room-data-name']")}
  private get createdAssumptionName()           { return $("//tr[@data-testid='lui-ccl-table-row']/td//a")[1]}
  private get createRoomButton()                { return $(`//button[@data-testid="create-new"]`)};
  private get assumptionAssignedTo()            { return $(`//*[@data-testid='users-inputbox']//input`)};
  private get createButton()                    { return $(`//button[@data-testid="create-button"]`)};
  private get closeSituationPanelIcon()         { return $(`//*[@data-testid='close-icon']`)};
  private get getChevronIcon()                  { return $(`//*[@data-testid='ArrowChevronDownIcon']`)};
  private get assumptionsStatusList()           { return $$("//span[@data-testid='lui-ccl-object-status-label-container']") }        

  private assumptionStatus(sStatus: string)     { return $(`//li[@data-testid = 'child-views']//div[text()= '${sStatus}']`) }
  private assumptionTitlelink(sName: string)    { return $("//tr[@data-testid='lui-ccl-table-row']/td//a[text()='${sName}']") }
  private getOption(status: string)             { return $("//span[text()='" + status + "']/ancestor::li") }
  private getAssumptionName(sName: string)      { return $("//tr[@data-testid='lui-ccl-table-row']/td//a[text()=" + sName + "]") }

  public async clickCreateNewIcon() {
    await this.iconCreateNew.waitForDisplayed({ timeout: 6000 });
    await this.iconCreateNew.waitForClickable({ timeout: 60000 });
    await this.doClick(await this.iconCreateNew, "Clicking Create New(+) Icon");
  }

  public async setName(sName: string) {
    await this.asumptionTitle.waitForClickable({ timeout: 60000 });
    await this.doEnterText(await this.asumptionTitle, sName, "Entering Assumption title:" + sName);
  }

  public async selectStatus(sStatus: string) {
    await this.doClick(await this.ddStatus, "Clicking Status Dropdown");
    await this.doClick(await this.getOption(sStatus), "Selecting Status:: " + sStatus);
  }

  public async selectAssumptionType(sAssumptionType: string) {
    await this.doClick(await this.ddAssumptionType, "Clicking Action Type Dropdown");
    await this.getOption(sAssumptionType).waitForDisplayed({ timeout: 15000 });
    await this.doClick(await this.getOption(sAssumptionType), "Selecting Action Type:: " + sAssumptionType);
  }

  public async selectConfidence(sConfidence: string) {
    await this.doClick(await this.ddAssumptionConfidence, "Clicking Confidence Dropdown");
    await this.getOption(sConfidence).waitForDisplayed({ timeout: 15000 });
    await this.doClick(await this.getOption(sConfidence), "Selecting Priority:: " + sConfidence);
  }

  public async selectPriority(sPriority: string) {
    await this.doClick(await this.ddPriority, "Clicking Priority Dropdown");
    await this.getOption(sPriority).waitForDisplayed({ timeout: 15000 });
    await this.doClick(await this.getOption(sPriority), "Selecting Priority:: " + sPriority);
  }

  public async selectAssignedTo(userName: string) {
    await this.doClick(await this.ddAssignedTo, "Clicking Assigned Username");
    await this.doClick(await $("//*[text()='" + userName + "']"), "Selecting username: " + userName);
    await browser.keys('Tab');
  }

  public async clickSave() {
    await this.Savebtn.waitForClickable({ timeout: 60000 });
    await this.doClick(await this.Savebtn, "Clicking Save Button");
  }

  public async clickCancel() {
    await this.Cancelbtn.waitForClickable({ timeout: 60000 });
    await this.doClick(await this.Cancelbtn, "Clicking Cancel Button");
  }

  public async getSuccessMsg() {
    let success: string = await this.doGetText(await this.Savetxt, "Fetch Success Message");
    await CommonFunctions.logMessage("INFO", success);
    return success;
  }

  public async selectChatbtn() {
    await this.doClick(await this.Chatbtn, "Clicking Action Type Dropdown");
  }

  public async ClickCreateThreadbtn() {
    await this.CreateThreadbtn.waitForClickable({ timeout: 60000 });
    await this.doClick(await this.CreateThreadbtn, "Clicking Create Button");
  }

  public async clickThreadCancelbtn() {
    await this.ThreadCancelbtn.waitForClickable({ timeout: 60000 });
    await this.doClick(await this.ThreadCancelbtn, "Clicking Thread Cancel Button");
  }

  public async clickCancelIconSituationRoom() {
    await this.doClick(await this.situationRoomOverlay, "Clicking Action Type Dropdown");
  }

  public async getCreatedAssumptionName() {
    await this.doGetText(await this.createdAssumptionName, "Fetch created assumption name")
  }

  public async getAssumptionTitle(){
    await this.assumptionName.waitForDisplayed({ timeout: 60000 });
    const assumptiontitle = await this.doGetText(await this.assumptionName, "Fetch assumption title");
    await CommonFunctions.logMessage("INFO", "Assumption Title: " + assumptiontitle);
    return assumptiontitle;
  }

  public async isCollaborationRoomCreated(){
    await this.doGetText(await this.collaborationRoomCreatedName, "Fetch Collaboration room name")
  }

  async createAssumption(sName: string, sStatus: string, sAssumptionType: string, sConfidence: string, sPriority: string, userName: string) {
    await this.clickCreateNewIcon();
    await this.setName(sName);
    await this.selectStatus(sStatus);
    await this.selectAssumptionType(sAssumptionType);
    await this.selectConfidence(sConfidence);
    await this.selectPriority(sPriority);
    await this.selectAssignedTo(userName);
    await this.clickSave();
    await this.getSuccessMsg();
  }

  async navigateToTheCreatedAssumption(sName: string) {
    const AssumptionTitlelink = await this.assumptionTitlelink(sName);
    await AssumptionTitlelink.waitForDisplayed({ timeout: 10000 });
    await AssumptionTitlelink.waitForClickable({ timeout: 10000 });
    await AssumptionTitlelink.click();
  }

  public async details() {
    await this.detailsTab.waitForClickable({ timeout: 60000 });
    await this.doClick(await this.detailsTab, "Click on deatils tab");
  }
  
  async navigateToSituationRoom(situationRoomName: string) {
    await this.detailsTab.waitForDisplayed({ timeout: 10000, timeoutMsg: "Details tab not displayed" });
    await this.detailsTab.waitForClickable({ timeout: 10000, timeoutMsg: "Details tab not clickable" });
    await this.doClick(await this.detailsTab, "Clicking on details tab ");
    await this.currentSituationRoomName.waitForDisplayed({ timeout: 10000, timeoutMsg: "situation room name not displayed" });
    const situationroomName = await this.currentSituationRoomName.getText();
    expect(situationroomName).toHaveTextContaining(`PS Assumption Script`)
    await CommonFunctions.logMessage("INFO", "Situation room validated successfully");
    await this.closeSituationPanelIcon.waitForClickable(timeoutSettings);
    await this.doClick(await this.closeSituationPanelIcon, "Clicked on close Icon of Situation room");
  }

  public async createCollaborationRoom(assignTo: string) {
    await this.createRoomButton.waitForDisplayed(timeoutSettings);
    await this.createRoomButton.waitForClickable(timeoutSettings);
    await this.doClick(await this.createRoomButton, "Clicking on create Room Button");
    await this.assumptionAssignedTo.waitForDisplayed({ timeout: 10000, timeoutMsg: "Peoples Dropdown is not visible" })
    await this.assumptionAssignedTo.setValue(assignTo);
    await browser.pause(2000);
    await browser.keys('Down arrow');
    await browser.keys('Enter');
    await CommonFunctions.logMessage("INFO", `Added member ${assignTo} to the collaboration room`);
    await browser.keys('Escape');
    await this.createButton.waitForDisplayed(timeoutSettings);
    await this.createButton.waitForClickable(timeoutSettings);
    await this.doClick(await this.createButton, "Clicked on create Button");
    await this.navigateToSituationRoom(assignTo);    
    }

  public async createCollaborationRoomInAssumption(assignTo: string[]) {
    const clickCreateRoomButton = await this.createRoomButton;
    for (let i = 0; i <= 4; i++) {
    if (await clickCreateRoomButton.isEnabled()) {
        try {
          await this.createCollaborationRoom(assignTo[i])
        } catch (error) {
          await CommonFunctions.logMessage("FAIL", error);
        }

      } else {
        await CommonFunctions.logMessage("INFO", "Create button is not enabled in assumption");
      }
    }

    const isCreateRoomIconEnabled = await clickCreateRoomButton.isEnabled();
    expect(isCreateRoomIconEnabled).toBe(false);
    await CommonFunctions.logMessage("INFO", "Create situation room icon successfully disabled after 5 iterations");
    }

  public async backarrowlink() {
    await this.BacktoAssumption.waitForClickable({ timeout: 60000 });
    await this.doClick(await this.BacktoAssumption, "Clicking on back arrow link of side nav bar");
  }
  
  public async threeDotMenu() {
    await this.threeDotIcon.waitForDisplayed({ timeout: 6000 });
    await this.threeDotIcon.waitForClickable({ timeout: 60000 });
    await this.doClick(await this.threeDotIcon, "Clicking Three dot Menu");
  }

  public async deleTextextLink() {
    await this.clickOnDeleteText.waitForDisplayed({ timeout: 6000 });
    await this.clickOnDeleteText.waitForClickable({ timeout: 60000 });
    await this.doClick(await this.clickOnDeleteText, "Clicked on Delete Text Link");
  }
  
   public async deleteButton() {
    await this.deleteButtonPopup.waitForDisplayed({ timeout: 6000 });
    await this.deleteButtonPopup.waitForClickable({ timeout: 60000 });
    await this.doClick(await this.deleteButtonPopup, "Clicked on Delete Text Link");
  }

  public async deleteCreatedAssumption() {
    await this.threeDotMenu();
    await this.deleTextextLink();
    await this.deleteButton();
    await this.getSuccessMsg();
  }

  public async clickonAssumption(assumptionName: string) {
    await ProcessPage.clickLeftpaneLinks('Assumptions');
    await this.getAssumptionName(assumptionName).waitForDisplayed({ timeout: 60000 });
    await this.doClick(await this.getAssumptionName(assumptionName), "Clicking on Assumption: " + assumptionName);
  }

  public async verifyAssumptionsFilter(status: string = "Approved") {
    await this.doClick(await this.getChevronIcon, "Clicking on assumption status dropdown " + status);
    await this.doClick(await this.assumptionStatus(status), "Clicking on Approved assumptions " + status);
    await browser.pause(5000);
    const assumptionStatusList = await this.assumptionsStatusList;
    let assumptionStatusTexts = await Promise.all(assumptionStatusList.map(async el => await el.getText()));
    await CommonFunctions.logMessage("status", `All Assumptions Status are: ${assumptionStatusTexts}`);
    const allApproved = assumptionStatusTexts.every(assumptionStatus => assumptionStatus === 'approved');
    if (!allApproved) {
      await CommonFunctions.logMessage("FAIL", `Not all statuses are "${status}": ${assumptionStatusTexts}`);
      return false;
    }
    await CommonFunctions.logMessage("PASS", `All statuses are "${status}"`);
    return true;
  }

}
export default new AssumptionPage();

