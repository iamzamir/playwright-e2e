import { Page, expect, Locator } from '@playwright/test';
import BasePage from './page';
import { getTimeout, TIMEOUTS } from '../constants/timeouts'
import { CommonFunctions } from '../util/common.util';
import { PowerBarPage } from './powerbar.page';
import { exactText } from './planning/text-match';

/**
 * Planning listing (context selection) page. Locators come from plan-sop-planning-mfe `src/pages/ContextSetting/ContextSetting.tsx`
 * (main @ caac1eb, 2026-10-15): the Context `LuiSelect` (`id="select-context"`, rendered by `@jda/lui-common-component-library-mui5`
 * 3.12.2 as input `select-select-select-context` with `select-listitemtext-<key>` options), the MUI Autocompletes `select-process`,
 * `select-subprocess` and `single-select-assumption`, and the Launch button `goto-planning-btn`.
 */
export class PlanningListingPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get ddContext(): Locator { return this.mfeLocator('input#select-select-select-context'); }
  // MUI Autocomplete renders its clear button in the end adornment right after the input.
  private get clearProcess(): Locator { return this.mfeLocator('input#select-process ~ div > button[title="Clear"]'); }
  private get slctProcess(): Locator { return this.mfeLocator('input#select-process'); }
  private get clearSubprocess(): Locator { return this.mfeLocator('input#select-subprocess ~ div > button[title="Clear"]'); }
  private get slctSubprocess(): Locator { return this.mfeLocator('input#select-subprocess'); }
  private get slctAssumption(): Locator { return this.mfeLocator('input#single-select-assumption'); }
  private get btnLaunch(): Locator { return this.mfeLocator('button#goto-planning-btn'); }
  private get powerBarListingIcon(): Locator { return this.getMfeFrameLocator().getByTestId('listingIcon'); }
  private slctContext(context: string): Locator { return this.mfeLocator(`li[id*="select-listitemtext"] span:text-is(${JSON.stringify(context)})`); }
  // Options of the open Autocomplete popup; matched by exact text, since "PSAutomation" is a prefix of "PSAutomationProcess".
  // Process options (`optionRoleOnly`) also match on `title`, which `LabelWithEllipsis` sets to the full name, as the XPath did.
  private autocompleteOption(name: string, optionRoleOnly: boolean = true): Locator {
    const options = `ul[class*="MuiAutocomplete-listbox"] li${optionRoleOnly ? '[role="option"]' : ''}`;
    const byText = this.mfeLocator(options).filter({ hasText: exactText(name) });
    return optionRoleOnly ? byText.or(this.mfeLocator(`${options}[title=${JSON.stringify(name)}]`)) : byText;
  }

  // Polls the autocomplete input until it shows the selected value; false when it never does.
  protected async waitForInputValue(input: Locator, value: string): Promise<boolean> {
    return expect.poll(async () => (await input.inputValue().catch(() => '')).trim(), { timeout: getTimeout('TINY'), intervals: [TIMEOUTS.POLL_INTERVAL] })
      .toBe(value)
      .then(() => true)
      .catch(() => false);
  }

  public async selectContext(context: string): Promise<void> {
    // Right after the planning MFE loads, the dropdown can take a click without opening its list,
    // so reopen it until the option shows instead of retrying a click on an option that is not rendered.
    const option = this.slctContext(context);
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await this.doClick(this.ddContext, `Clicking Context Dropdown (attempt ${attempt}/${maxAttempts})`);
      const isOptionVisible = await option
        .waitFor({ state: 'visible', timeout: getTimeout('SHORT') })
        .then(() => true)
        .catch(() => false);
      if (isOptionVisible) {
        break;
      }
      if (attempt === maxAttempts) {
        throw new Error(`selectContext: "${context}" option did not appear after opening the Context dropdown ${maxAttempts} times`);
      }
      await this.page.keyboard.press('Escape');
    }
    await this.doClick(option, "Selecting " + context + " Context");
  }

  public async isContextDropdownVisible(timeout: number = getTimeout('LONG')): Promise<boolean> {
    return this.ddContext.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);
  }

  public async waitForContextDropdown() {
    await this.ddContext.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
  }

  public async selectProcess(processName: string): Promise<void> {
    await this.mouseHover(this.slctProcess, "Hovering over Process Dropdown");
    if (await this.clearProcess.isVisible().catch(() => false)) {
      await this.doClick(this.clearProcess, "Clearing Process Dropdown");
    }
    await this.doEnterText(this.slctProcess, processName, "Entering Process Name");
    const option = this.autocompleteOption(processName).first();
    if (await option.waitFor({ state: 'visible', timeout: getTimeout('SHORT') }).then(() => true, () => false)) {
      await this.doClick(option, `Selecting Process: ${processName}`);
    } else {
      await this.slctProcess.press('Enter');
    }
    if (!await this.waitForInputValue(this.slctProcess, processName)) {
      await this.slctProcess.fill(processName);
      await this.slctProcess.press('ArrowDown');
      await this.slctProcess.press('Enter');
      await this.waitForInputValue(this.slctProcess, processName);
    }
    // Only dismiss listbox if it remains open, avoiding Escape on focused input which reverts MUI Autocomplete selection
    if (await this.slctProcess.getAttribute('aria-expanded').catch(() => 'false') === 'true') {
      await this.page.keyboard.press('Escape').catch(() => { });
    }
    // Wait for the selected process card to reflect the process if rendered
    await this.mfeLocator('[data-testid="entityName-PROCESS"]').filter({ hasText: processName }).first().waitFor({ state: 'visible', timeout: getTimeout('SHORT') }).catch(() => { });
  }

  public async selectSubprocess(subprocessName: string): Promise<void> {
    await this.mouseHover(this.slctSubprocess, "Hovering over Subprocess Dropdown");
    if (await this.clearSubprocess.isVisible().catch(() => false)) {
      await this.doClick(this.clearSubprocess, "Clearing Subprocess Dropdown");
    }
    await this.doEnterText(this.slctSubprocess, subprocessName, "Entering Subprocess Name");
    const option = this.autocompleteOption(subprocessName, false);
    if (await option.waitFor({ state: 'visible', timeout: getTimeout('SHORT') }).then(() => true, () => false)) {
      await this.doClick(option, `Selecting Subprocess: ${subprocessName}`);
    } else {
      const currentValue = (await this.slctSubprocess.inputValue().catch(() => '')).trim();
      if (currentValue !== subprocessName) {
        await this.slctSubprocess.press('Enter');
      }
      // Subprocess can already be selected from persisted context; close dropdown and continue.
      if (await this.slctSubprocess.getAttribute('aria-expanded').catch(() => 'false') === 'true') {
        await this.slctSubprocess.press('Escape');
      }
    }
  }

  public async selectAssumption(assumptionName: string): Promise<void> {
    await this.mouseHover(this.slctAssumption, "Hovering over Assumption Dropdown");
    await this.doClick(this.slctAssumption, "Clicking Assumption Dropdown");
    await this.doEnterText(this.slctAssumption, assumptionName, "Entering Assumption Name");
    // Match the listbox option only: an unscoped text match also hits the "Recently Opened" table link, which opens the
    // assumption directly and leaves no Launch button (user 2 on Gravitee, ActionItemsBatch Test_002 TC9, 2026-10-16).
    const option = this.getMfeFrameLocator().getByRole('listbox').getByRole('option', { name: assumptionName, exact: true }).first();
    if (await option.waitFor({ state: 'visible', timeout: getTimeout('SHORT') }).then(() => true, () => false)) {
      await this.doClick(option, `Selecting Assumption: ${assumptionName}`);
    } else {
      await this.slctAssumption.press('Enter');
    }
    if (!await this.waitForInputValue(this.slctAssumption, assumptionName)) {
      throw new Error(`selectAssumption: "${assumptionName}" was not selected in the Assumption dropdown`);
    }
  }

  public async clickLaunch(): Promise<void> {
    await this.doClick(this.btnLaunch, "Clicking Launch Button");
  }

  /**
   * Launches the context from the PowerBar when the listing's Context dropdown is not shown
   * (e.g. the planning app resumed a previous context). Returns true when it did, so the caller stops.
   */
  private async launchFromPowerBarIfNoContextDropdown(context: string, processName: string, subProcessName: string, assumptionName: string, waitTillViewLoad: boolean): Promise<boolean> {
    // The listing can render more than 15 s after its iframe loads (Gravitee, 2026-10-16), and it has no power bar,
    // so wait for either the Context dropdown or a resumed context's power bar before choosing the path.
    await expect.poll(async () => await this.ddContext.isVisible() || await this.powerBarListingIcon.isVisible(), { timeout: getTimeout('EXTREME') })
      .toBe(true)
      .catch(() => undefined);
    if (await this.ddContext.isVisible()) {
      return false;
    }
    const commonFunctions = new CommonFunctions();
    const powerBarPage = new PowerBarPage(this.page);
    const powerBarContext: { process: string; subProcess?: string; assumption?: string } = { process: processName };
    if (context == "Subprocess" && subProcessName) {
      powerBarContext.subProcess = subProcessName;
    } else if (context != "Process" && assumptionName) {
      powerBarContext.assumption = assumptionName;
    }
    await commonFunctions.logMessage("INFO", `Context dropdown is not visible. Launching ${context} context from PowerBar.`);
    await powerBarPage.selectEntityFromContext(powerBarContext, false, waitTillViewLoad);
    return true;
  }

  public async launchContext(context: string, processName: string, subProcessName: string = "", assumptionName: string = "", waitTillViewLoad: boolean = true): Promise<void> {
    if (await this.launchFromPowerBarIfNoContextDropdown(context, processName, subProcessName, assumptionName, waitTillViewLoad)) {
      return;
    }

    if (context == "Process") {
      await this.selectContext("Process");
      await this.selectProcess(processName);
    } else if (context == "Subprocess") {
      await this.selectContext("Sub-process");
      await this.selectProcess(processName);
      await this.selectSubprocess(subProcessName);
    } else {
      await this.selectContext("Assumption");
      await this.selectProcess(processName);
      await this.selectAssumption(assumptionName);
    }
    await this.clickLaunch();
    if (waitTillViewLoad) {
      await this.page.waitForURL(
        url => url.toString().includes('viewId') || url.toString().includes('processplan'),
        { timeout: getTimeout('EXTREME'), waitUntil: 'domcontentloaded' }
      );
      const currentUrl = this.page.url();
      const processPattern = `/process/${encodeURIComponent(processName)}/`;
      const processRawPattern = `/process/${processName}/`;
      if (processName && !currentUrl.includes(processPattern) && !currentUrl.includes(processRawPattern)) {
        const navigateBase = process.env.NAVIGATE_TO_PLANNING_SPACE || `${process.env.LUMINATE_PORTAL_URL as string}${process.env.PSLINK as string || ''}`;
        const targetUrl = `${navigateBase}process/${processName.replace(/\s/g, '')}/processplan/link`;
        await this.page.goto(targetUrl);
        await this.page.waitForURL(
          url => url.toString().includes('viewId') || url.toString().includes('processplan'),
          { timeout: getTimeout('EXTREME'), waitUntil: 'domcontentloaded' }
        );
      }
    }
  }
}

