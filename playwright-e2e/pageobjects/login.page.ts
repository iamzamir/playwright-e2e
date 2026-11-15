import { Locator } from '@playwright/test';
import { CommonFunctions } from '../util/common.util';
import { getTimeout, TIMEOUTS } from '../constants/timeouts';
import BasePage from './page';
import { textContaining } from './planning/text-match';

export default class LoginPage extends BasePage {

  public get btnSignIn(): Locator { return this.page.locator('button[data-testid="login-form-submit-button"]'); }
  public get tfldEnterRealm(): Locator { return this.page.locator('input#realm'); }
  public get btnContinue(): Locator { return this.page.locator('button[data-testid="login-form-submit-button"]'); }
  public get tfldEmail(): Locator { return this.page.locator('input[type="email"]'); }
  public get tfldPassword(): Locator { return this.page.locator('input[name="passwd"]'); }
  public get btnNext(): Locator { return this.page.locator('input[type="submit"]'); }
  public get btnSupportSignIn(): Locator {
    return this.page.getByRole('button', { name: 'Blue Yonder Support Sign In' })
      .or(this.page.getByRole('link', { name: 'Blue Yonder Support Sign In' }));
  }
  public get btnUserStoreSso(): Locator {
    return this.page.getByRole('button', { name: /Blue Yonder User Store/i });
  }
  public get btnUseAnotherAct(): Locator { return this.page.locator('div:text-is("Use another account")'); }
  public get btnAvatarMenu(): Locator { return this.page.locator('[data-testid="luminate-avatar-menu"], button[aria-label="Profile menu"]'); }
  public get btnYes(): Locator {
    return this.page.getByRole('button', { name: 'Yes' })
      .or(this.page.locator('input[type="submit"][value="Yes"], input[type="submit"]#idSIButton9'))
      .or(this.page.locator('button').filter({ hasText: textContaining('Yes') }));
  }

  public get tfldGraviteeEmail(): Locator {
    return this.page.getByRole('textbox', { name: 'Email address or username' });
  }

  public get tfldGraviteePassword(): Locator {
    return this.page.getByRole('textbox', { name: /Enter the password/i });
  }

  public get btnGraviteeSignIn(): Locator {
    return this.page.getByRole('button', { name: 'Sign in' });
  }


  public async isLoggedIn(timeoutMs: number = getTimeout('XLARGE')): Promise<boolean> {
    let objCommonFunctions: CommonFunctions = new CommonFunctions();
    try {
      await this.page.waitForLoadState('load', { timeout: timeoutMs });
      const currentUrl = this.page.url();

      const isStandardLoginPage = await this.btnSignIn.isVisible().catch(() => false);
      const isGraviteeLoginPage = await this.tfldGraviteeEmail.isVisible().catch(() => false);

      if (isStandardLoginPage || isGraviteeLoginPage || currentUrl.includes('/login') || currentUrl.includes('.auth.')) {
        await objCommonFunctions.logMessage('INFO', 'On Login Page -> Already Logged In?:: false');
        return false;
      }

      // A cold portal load can take over 10s to show either the avatar or the login form (CI p90 9.5s, slower locally),
      // so wait for whichever appears. Reading "no avatar yet" as logged out sends the login flow to wait for a realm
      // input that a valid session never shows.
      await this.btnAvatarMenu.or(this.tfldEnterRealm).or(this.tfldGraviteeEmail).first().waitFor({ state: 'visible', timeout: timeoutMs });
      const avatarVisible = await this.btnAvatarMenu.first().isVisible();
      await objCommonFunctions.logMessage('INFO', `User avatar / header element visible? ${avatarVisible}`);
      return avatarVisible;
    } catch {
      await objCommonFunctions.logMessage('INFO', 'Error checking logged in state -> returning false');
      return false;
    }
  }

  public async isUserAvatarVisible(timeoutMs?: number): Promise<boolean> {
    let objCommonFunctions: CommonFunctions = new CommonFunctions();
    const visible = timeoutMs !== undefined ? await this.waitForAvatarVisible(timeoutMs) : await this.btnAvatarMenu.isVisible().catch(() => false);
    await objCommonFunctions.logMessage('INFO', `User Avatar is visible? ${visible}`);
    return visible;
  }

  public async waitForAvatarVisible(timeout?: number): Promise<boolean> {
    let objCommonFunctions: CommonFunctions = new CommonFunctions();
    try {
      await this.btnAvatarMenu.first().waitFor({ state: 'visible', timeout: timeout ?? getTimeout('XLARGE') });
      await objCommonFunctions.logMessage('INFO', 'User avatar menu is visible');
      return true;
    } catch {
      await objCommonFunctions.logMessage('WARN', 'User avatar menu is not visible after waiting');
      return false;
    }
  }

  public async clickSignIn(): Promise<void> {
    await this.doClick(this.btnSignIn, 'Clicking Sign In Button');
  }

  public async enterRealmName(sRealmName: string, timeout?: number): Promise<void> {
    if (timeout) {
      await this.tfldEnterRealm.waitFor({ state: 'visible', timeout });
    }
    await this.doEnterText(this.tfldEnterRealm, sRealmName, `Entering Realm Name:: ${sRealmName}`);
  }

  public async clickContinue(): Promise<void> {
    await this.doClick(this.btnContinue, 'Clicking Continue Button');
  }

  public async enterUserName(sUserName: string, timeout?: number): Promise<void> {
    if (timeout) {
      await this.tfldEmail.waitFor({ state: 'visible', timeout });
    }
    await this.doEnterText(this.tfldEmail, sUserName, `Entering User Name:: ${sUserName}`);
  }

  public async clickNext(): Promise<void> {
    await this.doClick(this.btnNext, 'Clicking Next Button');
  }

  public async enterPassword(sPassword: string, timeout?: number): Promise<void> {
    if (timeout) {
      await this.tfldPassword.waitFor({ state: 'visible', timeout });
    }
    await this.doEnterText(this.tfldPassword, sPassword, 'Entering Password');
  }

  public async clickSignInBtn(): Promise<void> {
    await this.doClick(this.btnNext, 'Clicking Sign In Button');
  }

  public async clickYesBtn(timeout?: number): Promise<void> {
    await this.btnNext.waitFor({ state: 'visible', timeout: timeout ?? getTimeout('XLARGE') });
    await this.doClick(this.btnNext, 'Clicking Yes Button');
  }

  public async clickSupportSignIn(timeout?: number): Promise<void> {
    await this.btnSupportSignIn.waitFor({ state: 'visible', timeout: timeout ?? getTimeout('XLARGE') });
    await this.doClick(this.btnSupportSignIn, 'Clicking Blue Yonder Support Sign In Link');
  }

  public async clickUseAnotherAccount(): Promise<void> {
    await this.doClick(this.btnUseAnotherAct, 'Clicking Use Another Account Link');
  }

  public async enterGraviteeUserName(sUserName: string, timeout?: number): Promise<void> {
    if (timeout) {
      await this.tfldGraviteeEmail.waitFor({ state: 'visible', timeout });
    }
    await this.doEnterText(this.tfldGraviteeEmail, sUserName, `Entering Gravitee User Name:: ${sUserName}`);
  }

  public async enterGraviteePassword(sPassword: string, timeout?: number): Promise<void> {
    if (timeout) {
      await this.tfldGraviteePassword.waitFor({ state: 'visible', timeout });
    }
    await this.doEnterText(this.tfldGraviteePassword, sPassword, 'Entering Gravitee Password');
  }

  public async clickGraviteeSignIn(timeout?: number): Promise<void> {
    if (timeout) {
      await this.btnGraviteeSignIn.waitFor({ state: 'visible', timeout });
    }
    await this.doClick(this.btnGraviteeSignIn, 'Clicking Gravitee Sign In Button');
  }

  public async clickIfVisible(locator: Locator, timeout: number): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout });
      await this.doClick(locator, "Clicking Button if visible");
      return true;
    } catch {
      return false;
    }
  }

  public async clickSupportSignInIfVisible(timeout: number): Promise<boolean> {
    return await this.clickIfVisible(this.btnSupportSignIn, timeout);
  }

  public async completeOidcSignInOptions(timeout?: number): Promise<boolean> {
    const wait = timeout ?? getTimeout('EXTREME');
    await this.page.waitForLoadState('domcontentloaded');
    const signInOptions = this.btnUserStoreSso.or(this.btnSupportSignIn).first();
    try {
      await signInOptions.waitFor({ state: 'visible', timeout: wait });
    } catch {
      return false;
    }
    if (await this.btnUserStoreSso.isVisible().catch(() => false)) {
      await this.doClick(this.btnUserStoreSso, 'Clicking Blue Yonder User Store (SSO)');
      return true;
    }
    return await this.clickSupportSignInIfVisible(wait);
  }

  public async clickUseAnotherAccountIfVisible(timeout: number): Promise<boolean> {
    return await this.clickIfVisible(this.btnUseAnotherAct, timeout);
  }

  public async clickYesBtnIfVisible(timeout: number): Promise<boolean> {
    return await this.clickIfVisible(this.btnYes, timeout);
  }
}


