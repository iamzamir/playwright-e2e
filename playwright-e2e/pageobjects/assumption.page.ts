import { Page, Locator, expect } from '@playwright/test';
import BasePage from './page';
import { getTimeout, TIMEOUTS } from '../constants/timeouts';
import { exactText } from './planning/text-match';
import { CommonFunctions } from '../util/common.util';
import { TestUtil } from '../util/test.util';
import { ProcessPage } from './process.page';

/**
 * PO assumption listing (plan-sop-lui `src/Components/ProcessOrchestration/Assumptions/AssmptionListing.tsx`, main @ 559886b,
 * 2026-10-08): the status dropdown button `ArrowChevronDownIcon` in the header, the status list items `child-views`, the row
 * status chips `lui-ccl-object-status-label-container` and the assumption title links.
 */
export class AssumptionPage extends BasePage {
  private commonFunctions: CommonFunctions;
  private processPage: ProcessPage;
  private testUtil: TestUtil;

  constructor(page: Page) {
    super(page);
    this.commonFunctions = new CommonFunctions();
    this.processPage = new ProcessPage(page);
    this.testUtil = new TestUtil(page);
  }

  private get chevronIcon(): Locator                                { return this.mfeLocator('[data-testid="ArrowChevronDownIcon"]'); }
  private get assumptionsStatusList(): Locator                      { return this.mfeLocator('span[data-testid="lui-ccl-object-status-label-container"]'); }
  private assumptionStatus(status: string): Locator                 { return this.mfeLocator(`li[data-testid="child-views"] div:text-is(${JSON.stringify(status)})`); }
  private getAssumption(assumptionName: string): Locator            { return this.mfeLocator('a').filter({ hasText: exactText(assumptionName) }); }

  public async goToAssumptionDetailsPage(processName: string | null, assumption: string): Promise<void> {
    if (processName) {
      await this.processPage.clickOnProcess(processName);
      await this.commonFunctions.logMessage('INFO', `Clicked on process ${processName}`);
    }
    await this.testUtil.clickLeftpaneLinks('Assumptions');
    await this.clickOnAssumption(assumption);
    await this.commonFunctions.logMessage('INFO', `Clicked on assumption ${assumption}`);
  }

  public async clickOnAssumption(assumptionName: string): Promise<void> {
    await this.doClick(await this.getAssumption(assumptionName), `Clicking on assumption: ${assumptionName}`);
  }

  public async clickAssumptionStatusDropdown(): Promise<void> {
    await expect(this.chevronIcon).toBeEnabled({ timeout: getTimeout('MEDIUM') });
    await this.doClick(this.chevronIcon, `Clicking on assumption status dropdown`);
  }

  public async clickAssumptionStatus(status: string): Promise<void> {
    await this.assumptionStatus(status).waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(await this.assumptionStatus(status), `Clicking on ${status} assumption status`);
  }

  public async verifyAssumptionsFilter(status: string = "Approved"): Promise<boolean> {
    try {
      await this.clickAssumptionStatusDropdown();
      await this.clickAssumptionStatus(status);
      await this.assumptionsStatusList.first().waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
      // The table reloads after the status changes, so poll until every row shows the chosen status (or time runs out)
      // instead of reading it once after a fixed sleep.
      const expectedStatus = status.toLowerCase();
      let assumptionStatusTexts: string[] = [];
      await expect.poll(async () => {
        assumptionStatusTexts = (await this.assumptionsStatusList.allTextContents()).map(text => text.toLowerCase().trim()).filter(Boolean);
        return assumptionStatusTexts.length > 0 && assumptionStatusTexts.every(assumptionStatus => assumptionStatus === expectedStatus);
      }, { timeout: getTimeout('MEDIUM'), intervals: [TIMEOUTS.POLL_INTERVAL] }).toBe(true).catch(() => undefined);

      if (assumptionStatusTexts.length === 0) {
        await this.commonFunctions.logMessage("WARN", "No assumption status elements found");
        return false;
      }

      await this.commonFunctions.logMessage("INFO", `All Assumptions Status are: ${assumptionStatusTexts}`);

      const allMatch = assumptionStatusTexts.every(assumptionStatus => assumptionStatus === expectedStatus);

      if (!allMatch) {
        await this.commonFunctions.logMessage("FAIL", `Not all statuses are "${status}": ${assumptionStatusTexts}`);
        return false;
      }

      await this.commonFunctions.logMessage("PASS", `All statuses are "${status}"`);
      return true;

    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.commonFunctions.logMessage("ERROR", `Error in verifyAssumptionsFilter: ${errorMessage}`);
      return false;
    }
  }
}
