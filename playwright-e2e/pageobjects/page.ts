import { Page, Locator, Frame, FrameLocator, expect } from '@playwright/test';
import { CommonFunctions } from '../util/common.util';
import { getTimeout, TIMEOUTS } from '../constants/timeouts';
import { waitForDelay } from '../util/wait-helpers';

/**
 * The micro-frontend iframe that is currently shown. Older portals render every app in `iframe#mfe`; newer portals
 * keep a pool (`iframe.mfe-pool-iframe`, e.g. `#mfe-pool-pointegration` for PO) and mark the inactive ones
 * `aria-hidden="true"` (plus `inert`, `visibility: hidden`), so only the visible one matches.
 */
export const ACTIVE_MFE_IFRAME = 'iframe#mfe:not([aria-hidden="true"]), iframe.mfe-pool-iframe:not([aria-hidden="true"])';

export default class BasePage {
  protected _page: Page;

  constructor(page: Page) {
    this._page = page;
  }

  public get page(): Page {
    return this._page;
  }

  public set page(newPage: Page) {
    this._page = newPage;
    this.onPageChanged(newPage);
  }

  protected onPageChanged(_newPage: Page): void {}

  public mfeLocator(selector: string): Locator                  { return this.getMfeFrameLocator().locator(selector); }
  private getAlertLocators(expectedMessage: string): Locator[] {
    const alertContainerSelector = 'div[class*="MuiAlert-root"], div[role="alert"], div[class*="MuiAlert-message"]';
    const trimmed = expectedMessage.trim().toLowerCase();

    if (trimmed === 'success') {
      const textPattern = /(success|procedure is ready|is ready|view results)/i;
      const successClassSelector = 'div[class*="MuiAlert-root"][class*="Success" i], div[role="alert"][class*="Success" i]';

      const mfeAlert = this.mfeLocator(alertContainerSelector)
        .filter({ hasNotText: /(something went wrong|failed|error)/i })
        .filter({ hasText: textPattern })
        .or(this.mfeLocator(successClassSelector));
      const hostAlert = this.page.locator(alertContainerSelector)
        .filter({ hasNotText: /(something went wrong|failed|error)/i })
        .filter({ hasText: textPattern })
        .or(this.page.locator(successClassSelector));

      return [mfeAlert, hostAlert];
    }

    if (trimmed === 'running' || trimmed === 'procedure is running') {
      const textPattern = /(procedure is being run|is being run|procedure is running|\bprocedure\b.*?\brunning\b)/i;
      const mfeRunning = this.mfeLocator(alertContainerSelector)
        .filter({ hasNotText: /(something went wrong|failed|error)/i })
        .filter({ hasText: textPattern });
      const hostRunning = this.page.locator(alertContainerSelector)
        .filter({ hasNotText: /(something went wrong|failed|error)/i })
        .filter({ hasText: textPattern });
      return [mfeRunning, hostRunning];
    }

    const mfeAlert = this.mfeLocator(alertContainerSelector).filter({ hasText: new RegExp(expectedMessage, 'i') });
    const hostAlert = this.page.locator(alertContainerSelector).filter({ hasText: new RegExp(expectedMessage, 'i') });
    return [mfeAlert, hostAlert];
  }


  public getMfeFrameLocator(): FrameLocator {
    return this.page.frameLocator(ACTIVE_MFE_IFRAME);
  }

  /**
   * Starts recording requests the app sends whose URL contains `urlPart` (the whole browser context, so MFE iframes
   * and new tabs count). The getter returns the latest one's Authorization header and POST body ('' until one is seen).
   * Used to register user-owned entities with `createdEntities`, whose deleters need the user's token.
   */
  public trackApiRequests(urlPart: string): () => { authorization: string; body: string } {
    const latest = { authorization: '', body: '' };
    this.page.context().on('request', (request) => {
      if (!request.url().includes(urlPart)) {
        return;
      }
      const headers = request.headers();
      latest.authorization = headers['authorization'] || latest.authorization;
      latest.body = request.method() === 'POST' ? (request.postData() || latest.body) : latest.body;
    });
    return () => ({ ...latest });
  }

  public async dismissAnyAlertToast(): Promise<void> {
    try {
      const alertCloseSelector = "div[role='alert'] button[aria-label*='Close' i], .MuiAlert-root button[aria-label*='Close' i], .MuiSnackbar-root button[aria-label*='Close' i], div[role='alert'] svg[data-testid='CloseOutlinedIcon'], .MuiAlert-root svg[data-testid='CloseOutlinedIcon']";
      const mfeClose = this.mfeLocator(alertCloseSelector).first();
      const hostClose = this.page.locator(alertCloseSelector).first();
      const close = (await mfeClose.isVisible().catch(() => false)) ? mfeClose
        : (await hostClose.isVisible().catch(() => false)) ? hostClose : null;
      if (!close) {
        return;
      }
      // Hold this toast's button: once it closes, `.first()` can resolve to another stacked toast.
      const closeButton = await close.elementHandle({ timeout: getTimeout('TINY') });
      await closeButton.click({ force: true }).catch(() => null);
      // MUI unmounts the toast after its exit transition; wait for that rather than a fixed delay.
      await closeButton.waitForElementState('hidden', { timeout: getTimeout('TINY') }).catch(() => null);
      await closeButton.dispose();
    } catch {
      // Ignored if no alert is present
    }
  }

  /**
   * @param waitBeforeClick Deprecated: a fixed sleep before the click. Wait for the condition the click needs instead; no caller passes it.
   * @param waitAfterClick Deprecated: a fixed sleep after the click. Wait for the click's outcome instead; no caller passes it.
   */
  public async doClick(locator: Locator, sLogMessage: string, waitBeforeClick: number = 0, waitAfterClick: number = 0): Promise<void> {
    let objCommonFunctions: CommonFunctions = new CommonFunctions();
    await objCommonFunctions.logMessage('INFO', sLogMessage);
    if (waitBeforeClick > 0) {
      await waitForDelay(this.page, waitBeforeClick);
    }
    try {
      await locator.click({ timeout: 10000 });
    } catch (error) {
      await this.dismissAnyAlertToast();
      try {
        await locator.click({ timeout: 5000 });
      } catch {
        try {
          await locator.click({ force: true, timeout: 5000 });
        } catch {
          await locator.evaluate((element: Element) => {
            (element as HTMLElement).click();
          }, undefined, { timeout: getTimeout('SHORT') });
        }
      }
    }
    if (waitAfterClick > 0) {
      await waitForDelay(this.page, waitAfterClick);
    }
  }

  /**
   * @param waitBeforeClick Deprecated: a fixed sleep before the click. Wait for the condition the click needs instead; no caller passes it.
   * @param waitAfterClick Deprecated: a fixed sleep after the click. Wait for the click's outcome instead; no caller passes it.
   */
  public async doClickUsingScript(locator: Locator, sLogMessage: string, waitBeforeClick: number = 0, waitAfterClick: number = 0): Promise<void> {
    let objCommonFunctions: CommonFunctions = new CommonFunctions();
    await objCommonFunctions.logMessage('INFO', sLogMessage);
    if (waitBeforeClick > 0) {
      await waitForDelay(this.page, waitBeforeClick);
    }
    await locator.evaluate((element: Element) => {
      (element as HTMLElement).click();
    });
    if (waitAfterClick > 0) {
      await waitForDelay(this.page, waitAfterClick);
    }
  }

  public async doEnterText(locator: Locator, sValue: string, sLogMessage: string): Promise<void> {
    let objCommonFunctions: CommonFunctions = new CommonFunctions();
    await objCommonFunctions.logMessage('INFO', sLogMessage);
    await locator.fill(sValue);
  }

  public async doGetText(locator: Locator, sLogMessage: string, timeout: number = getTimeout('EXTREME')): Promise<string> {
    let objCommonFunctions: CommonFunctions = new CommonFunctions();
    await objCommonFunctions.logMessage('INFO', sLogMessage);
    await locator.waitFor({ state: 'visible', timeout });
    return await locator.textContent() ?? '';
  }

  public async doGetInnerText(locator: Locator, sLogMessage: string, timeout: number = getTimeout('EXTREME')): Promise<string> {
    let objCommonFunctions: CommonFunctions = new CommonFunctions();
    await objCommonFunctions.logMessage('INFO', sLogMessage);
    await locator.waitFor({ state: 'visible', timeout });
    return (await locator.allInnerTexts()).join(' ') ?? '';
  }

  public async doGetAttribute(locator: Locator, sAttribute: string, sLogMessage: string, timeout: number = getTimeout('EXTREME')): Promise<string | null> {
    let objCommonFunctions: CommonFunctions = new CommonFunctions();
    await objCommonFunctions.logMessage('INFO', sLogMessage);
    await locator.waitFor({ state: 'visible', timeout });
    const value = await locator.getAttribute(sAttribute);
    await objCommonFunctions.logMessage('INFO', `Attribute value: ${value}`);
    return value;
  }

  public async mouseHover(locator: Locator, sLogMessage: string): Promise<void> {
    let objCommonFunctions: CommonFunctions = new CommonFunctions();
    await objCommonFunctions.logMessage('INFO', sLogMessage);
    try {
      await locator.hover({ timeout: 5000 });
    } catch {
      await locator.hover({ force: true, timeout: 5000 }).catch(() => {});
    }
  }

  public async clearAndSetInputValue(inputField: Locator, inputValue: string): Promise<void> {
    await inputField.click();
    await inputField.fill('');
    let objCommonFunctions: CommonFunctions = new CommonFunctions();
    await objCommonFunctions.logMessage('INFO', 'Cleared input value');
    await inputField.fill(inputValue);
    await objCommonFunctions.logMessage("INFO", `Set input value to ${inputValue}`);
    // A controlled input can re-render and drop what was typed: fill once more if the value did not hold, then fail if it still does not.
    const held = await expect(inputField).toHaveValue(inputValue, { timeout: getTimeout('TINY') }).then(() => true, () => false);
    if (!held) {
      await objCommonFunctions.logMessage('WARNING', `Input did not keep "${inputValue}"; filling it again`);
      await inputField.fill(inputValue);
      await expect(inputField, `input keeps "${inputValue}"`).toHaveValue(inputValue, { timeout: getTimeout('TINY') });
    }
  }

  public async addTextFieldValue(value: string, fieldLocator: Locator): Promise<void> {
    await fieldLocator.click();
    await fieldLocator.type(value, { delay: TIMEOUTS.TYPE_CHAR_DELAY });
  }

  public async doesElementExist(locator: Locator, sLogMessage: string): Promise<boolean> {
    const isVisible = await locator.isVisible();
    let objCommonFunctions: CommonFunctions = new CommonFunctions();
    await objCommonFunctions.logMessage('INFO', `${sLogMessage} - Element ${isVisible ? 'is' : 'is not'} visible`);
    return isVisible;
  }

  public async waitForElementVisible(locator: Locator, timeout: number = getTimeout('SHORT')): Promise<boolean> {
    let objCommonFunctions: CommonFunctions = new CommonFunctions();
    try {
      await locator.waitFor({ state: 'visible', timeout });
      await objCommonFunctions.logMessage('INFO', 'Element is visible');
      return true;
    } catch {
      await objCommonFunctions.logMessage('WARN', 'Element is not visible after waiting');
      return false;
    }
  }

  public async verifyAlertMsg(expectedMessage: string, timeout: number = 15000): Promise<boolean> {
    const objCommonFunctions: CommonFunctions = new CommonFunctions();
    try {
      const candidates = this.getAlertLocators(expectedMessage);
      let resolved = false;
      const matchedAlert = await new Promise<Locator | null>((resolve) => {
        let pending = candidates.length;
        for (const loc of candidates) {
          const first = loc.first();
          first.waitFor({ state: 'visible', timeout }).then(() => {
            if (!resolved) {
              resolved = true;
              resolve(first);
            }
          }).catch(() => {
            pending--;
            if (pending === 0 && !resolved) {
              resolve(null);
            }
          });
        }
      });

      if (!matchedAlert) {
        await objCommonFunctions.logMessage('WARN', `Alert message "${expectedMessage}" is not visible`);
        return false;
      }

      const isVisible = await matchedAlert.isVisible().catch(() => false);
      if (isVisible) {
        const text = (await matchedAlert.textContent() ?? '').trim().replace(/\s+/g, ' ');
        await objCommonFunctions.logMessage('INFO', `Alert message "${expectedMessage}" is visible (matched text: "${text}")`);
        return true;
      }
      await objCommonFunctions.logMessage('WARN', `Alert message "${expectedMessage}" is not visible`);
      return false;
    } catch (error) {
      await objCommonFunctions.logMessage('ERROR', `Error while verifying alert message "${expectedMessage}": ${(error as Error).message}`);
      return false;
    }
  }

}
