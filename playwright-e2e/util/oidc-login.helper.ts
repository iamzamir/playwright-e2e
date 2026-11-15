import { BrowserContext, Page } from '@playwright/test';
import LoginPage from '../pageobjects/login.page';
import { CommonFunctions } from './common.util';
import { isGraviteeGateway } from './gateway.util';

type OidcLoginOptions = {
  portalPage: Page;
  realmName: string;
  username: string;
  password: string;
  isSecondUser?: boolean;
  clickStaySignedIn?: boolean;
  strictStaySignedIn?: boolean;
  supportSignInRealms?: string[];
  timeoutMs?: {
    realm?: number;
    oidcPage?: number;
    authInput?: number;
    avatar?: number;
    optionalClick?: number;
  };
};

const DEFAULT_SUPPORT_SIGN_IN_REALMS = ['cbp-interop-ps-automation-2', 'cbp-test-interop-1'];

export const performOidcLoginFlow = async (options: OidcLoginOptions): Promise<void> => {
  const {
    portalPage,
    realmName,
    username,
    password,
    isSecondUser = false,
    clickStaySignedIn = true,
    strictStaySignedIn = false,
    supportSignInRealms = DEFAULT_SUPPORT_SIGN_IN_REALMS,
    timeoutMs,
  } = options;
  const objCommonFunction: CommonFunctions = new CommonFunctions();
  const context: BrowserContext = portalPage.context();
  const realmTimeout = timeoutMs?.realm ?? 60000;
  const oidcPageTimeout = timeoutMs?.oidcPage ?? 60000;
  const authInputTimeout = timeoutMs?.authInput ?? 60000;
  const avatarTimeout = timeoutMs?.avatar ?? 60000;
  const optionalClickTimeout = timeoutMs?.optionalClick ?? 60000;

  const isGravitee = isGraviteeGateway();

  if (isGravitee) {
    await objCommonFunction.logMessage('INFO', `Initiating Gravitee login flow for realm: ${realmName}, username: ${username}`);
    await portalPage.waitForLoadState('domcontentloaded');
    const oidcLoginPage = new LoginPage(portalPage);

    if (isSecondUser) {
      await oidcLoginPage.clickUseAnotherAccountIfVisible(optionalClickTimeout);
    }

    await objCommonFunction.logMessage('INFO', `Entering Gravitee username: ${username}`);
    await oidcLoginPage.enterGraviteeUserName(username, authInputTimeout);

    await objCommonFunction.logMessage('INFO', 'Clicking Gravitee Sign In button for username submission');
    await oidcLoginPage.clickGraviteeSignIn();

    // After a portal sign-out the Gravitee AM session can still be alive: submitting the username then redirects
    // straight back to the portal with no password step, so wait for whichever comes first.
    // Each branch handles its own rejection: the losing wait times out later and must not surface as an unhandled rejection.
    // If neither shows, fall through to the password step so its own wait reports the failure.
    const passwordStep = await Promise.race([
      oidcLoginPage.tfldGraviteePassword.waitFor({ state: 'visible', timeout: authInputTimeout }).then(() => true, () => true),
      portalPage.waitForURL((url) => url.href.includes('.portal.') && !url.href.includes('.auth.'), { timeout: authInputTimeout }).then(() => false, () => true),
    ]);

    if (passwordStep) {
      await objCommonFunction.logMessage('INFO', 'Entering Gravitee password');
      await oidcLoginPage.tfldGraviteePassword.click().catch(() => null);
      await oidcLoginPage.enterGraviteePassword(password, authInputTimeout);

      await objCommonFunction.logMessage('INFO', 'Clicking Gravitee Sign In button for password submission');
      await oidcLoginPage.clickGraviteeSignIn();

      await objCommonFunction.logMessage('INFO', 'Checking for "Stay signed in?" prompt');
      await oidcLoginPage.clickYesBtnIfVisible(optionalClickTimeout);
    } else {
      await objCommonFunction.logMessage('INFO', 'Gravitee session still active; redirected to the portal without a password step');
    }

    await objCommonFunction.logMessage('INFO', 'Waiting for Gravitee OAuth redirect and MSAL token exchange...');
    await portalPage.waitForURL((url) => url.href.includes('.portal.') && !url.href.includes('.auth.'), { timeout: oidcPageTimeout });

    const avatarVisible = await oidcLoginPage.waitForAvatarVisible(avatarTimeout);
    if (!avatarVisible) {
      throw new Error('Gravitee login completed without a visible avatar menu');
    }

    await portalPage.bringToFront();
    return;
  }

  const portalLoginPage = new LoginPage(portalPage);

  await objCommonFunction.logMessage('INFO', `Initiating OIDC login flow for realm: ${realmName}, username: ${username}`);
  await portalLoginPage.enterRealmName(realmName, realmTimeout);

  const popupPromise = context.waitForEvent('page', { timeout: oidcPageTimeout }).catch(() => null);
  await objCommonFunction.logMessage('INFO', 'Submitting realm to trigger OIDC login flow');
  await portalLoginPage.clickContinue();

  const popup = await popupPromise;
  const oidcPage = popup || portalPage;
  await oidcPage.waitForLoadState('domcontentloaded');

  const oidcLoginPage = new LoginPage(oidcPage);

  try {
    if (supportSignInRealms.some((candidate) => realmName.includes(candidate))) {
      await objCommonFunction.logMessage('INFO', 'Clicking Blue Yonder Support Sign In button');
      await oidcLoginPage.clickSupportSignInIfVisible(authInputTimeout);
    }

    if (isSecondUser) {
      await objCommonFunction.logMessage('INFO', 'Clicking Use another account button');
      await oidcLoginPage.clickUseAnotherAccountIfVisible(optionalClickTimeout);
    }

    await objCommonFunction.logMessage('INFO', `Entering username: ${username}`);
    await oidcLoginPage.enterUserName(username, authInputTimeout);
    await oidcLoginPage.clickNext();

    await objCommonFunction.logMessage('INFO', 'Entering password');
    await oidcLoginPage.enterPassword(password, authInputTimeout);
    await oidcLoginPage.clickSignInBtn();

    if (clickStaySignedIn) {
      if (strictStaySignedIn) {
        await objCommonFunction.logMessage('INFO', 'Strict mode enabled - waiting for Stay signed in prompt and clicking it');
        await oidcLoginPage.clickYesBtn(authInputTimeout);
      } else {
        await objCommonFunction.logMessage('INFO', 'Attempting to click Stay signed in prompt if it appears');
        await oidcLoginPage.clickYesBtnIfVisible(authInputTimeout);
      }
    }
  } catch (error: any) {
    const isClosedError = error.message && (error.message.includes('Target page, context or browser has been closed') || error.message.includes('Target closed'));
    if (isClosedError || oidcPage.isClosed()) {
      await objCommonFunction.logMessage('INFO', 'OIDC page closed during credentials entry. Assuming login completed automatically via existing session.');
    } else {
      throw error;
    }
  }

  await portalPage.bringToFront();
  await objCommonFunction.logMessage('INFO', 'Waiting for avatar menu to be visible');
  await portalLoginPage.waitForAvatarVisible(avatarTimeout);
};
