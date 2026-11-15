import CommonFunctions from '../util/common.util';
import page from './page';
export default class MfePage extends page {

  private get btnSignIn()                  { return $("//button[@data-testid='login-form-submit-button']")}
  private get tfldEnterRealm()             { return $("//input[@id='realm']")}
  private get btnContinue()                { return $("//button[@data-testid='login-form-submit-button']")}
  private get tfldEmail()                  { return $("//input[@type='email']")}
  private get tfldPassword()               { return $("//input[@name='passwd']")}
  private get btnNext()                    { return $("//input[@type='submit']")}
  private get btnSupportSignIn()           { return $("//button[text()='Blue Yonder Support Sign In']")}
  private get btnUseAnotherAct()           { return $("//div[text()='Use another account']")}
  private get btnCloseWlcPopup()           { return $("//button[@class='_pendo-close-guide']")}
  private getExistingUser(email: string)   {return $(`//small[text()="${email}"]`);}


  public async switchToMfe(): Promise<void> {
    const mfeIframeSelector = await $('#mfe');
    if (await mfeIframeSelector.waitForExist()) {
      await CommonFunctions.logMessage("INFO", "Switching to Mfe frame");
      await browser.switchToFrame(mfeIframeSelector);
    } else {
      await CommonFunctions.logMessage("FAIL", "Mfe frame not visible to switch");
    }
  }

  public async isLoggedIn(): Promise<boolean> {
    try {
      await this.btnSignIn.waitForDisplayed({ timeout: 30000 });
      await CommonFunctions.logMessage("INFO", "Already Logged In?:: false")
      return false;
    } catch {
      await CommonFunctions.logMessage("INFO", "Already Logged In!!");
      return true;
    }
  }

  public async clickSignIn() {
    await this.doClick(await this.btnSignIn, "Clicking Sign In Button");
  }

  public async enterRealmName(sRealmName: string) {
    await this.doEnterText(await this.tfldEnterRealm, sRealmName, "Entering Realm Name:: " + sRealmName);
  }

  public async clickContinue() {
    await this.doClick(await this.btnContinue, "Clicking Continue Button");
  }

  public async enterUserName(sUserName: string) {
    await this.doEnterText(await this.tfldEmail, sUserName, "Entering User Name:: " + sUserName);
  }

  public async clickNext() {
    await this.doClick(await this.btnNext, "Clicking Next Button");
  }

  public async enterPassword(sPassword: string) {
    await this.doEnterText(await this.tfldPassword, sPassword, "Entering Password");
  }

  public async clickSignInBtn() {
    await this.doClick(await this.btnNext, "Clicking Sign In Button");
  }

  public async clickYesBtn() {
    await this.doClick(await this.btnNext, "Clicking Yes Button");
  }

  public async clickSupportSignIn() {
    await this.btnSupportSignIn.waitForDisplayed({ timeout: 30000 });
    await this.doClick(await this.btnSupportSignIn, "Clicking Blueyonder Support Sign In Link");
  }

  public async clickUseAnotherAccount() {
    await this.doClick(await this.btnUseAnotherAct, "Clicking Use Another Account Link");
  }

  public async closeWelcomePopup() {
    try {
      await this.btnCloseWlcPopup.waitForDisplayed({ timeout: 20000 });
      await this.doClick(await this.btnCloseWlcPopup, "Clicking Close Welcome Popup Button");
    } catch (error) {
      await CommonFunctions.logMessage("INFO", "Welcome Popup is not displayed");
    }
  }

  public async doesAccountExists(sUserName: string): Promise<boolean> {
    const existingUser = await this.getExistingUser(sUserName);
    const isExisting = await existingUser.isExisting();
    await CommonFunctions.logMessage("INFO", `Account ${sUserName} exists: ${isExisting}`);
    return isExisting;
  }

}
