import { Page, Locator, expect } from '@playwright/test';
import BasePage from '../page';
import { getTimeout } from '../../constants/timeouts';
import { CommonFunctions } from '../../util/common.util';

/**
 * Scenario comparison on a Maas pivot card: the card (`lui-dashboard-card`, matched by its title input value) has a
 * scenario "live" icon button (`*icon-button-scenarios-popup*`) that opens a scenario tree whose labels carry a
 * `*enario-listtree-label-text*` test ID, with the checkbox in the sibling `span` before the label's `span`; Done is
 * `done-button`. Applied scenarios become top-axis columns (`span.axis-title-name > span`) and are listed in the
 * card's `table-header-wrapper` / `facets-container` header. These keep the attributes the old XPath used.
 */
export class ScenarioPivotComponent extends BasePage {
  private readonly log = new CommonFunctions();

  constructor(page: Page) {
    super(page);
  }

  // Locators
  private card(cardName: string): Locator {
    return this.mfeLocator('div[data-testid="lui-dashboard-card"]').filter({ has: this.page.locator(`input[value=${JSON.stringify(cardName)}]`) });
  }
  private liveIcon(cardName: string): Locator {
    return this.card(cardName).locator('button[data-testid*="icon-button-scenarios-popup"]');
  }
  private tableHeader(cardName: string): Locator {
    return this.card(cardName).locator('div[class*="table-header-wrapper"] > div[class*="facets-container"]');
  }
  private scenarioLabelSelector(scenarioName: string): string {
    return `:is(p, div)[data-testid*="enario-listtree-label-text"]:text-is(${JSON.stringify(scenarioName)})`;
  }
  private scenarioLabel(scenarioName: string): Locator { return this.mfeLocator(this.scenarioLabelSelector(scenarioName)).first(); }
  private scenarioCheckbox(scenarioName: string): Locator {
    return this.mfeLocator(`span:has(~ span ${this.scenarioLabelSelector(scenarioName)}) input[type="checkbox"]`);
  }
  private topAxisItem(itemName: string): Locator {
    return this.mfeLocator(`span[class="axis-title-name"] > span:text-is(${JSON.stringify(itemName)})`).first();
  }
  private get btnDone(): Locator { return this.getMfeFrameLocator().getByTestId('done-button'); }

  // Actions
  /** Waits for the card's scenario icon (scrolling it into view), clicks it and waits for the popup's Done button. */
  public async openScenarioPopup(cardName: string): Promise<boolean> {
    const icon = this.liveIcon(cardName);
    await expect(async () => {
      await icon.first().scrollIntoViewIfNeeded({ timeout: getTimeout('TINY') }).catch(() => undefined);
      await expect(icon.first()).toBeVisible({ timeout: getTimeout('TINY') });
    }).toPass({ timeout: getTimeout('EXTREME') }).catch(() => undefined);
    await icon.waitFor({ state: 'visible', timeout: getTimeout('SHORT') });
    await icon.scrollIntoViewIfNeeded();
    await this.mouseHover(icon, `Hovering on scenario live button in ${cardName} card`);
    await this.log.logMessage('INFO', `Clicking scenario live button in ${cardName} card`);
    try {
      await this.doClick(icon, `Clicking scenario live button in ${cardName} card`);
    } catch {
      await this.log.logMessage('WARNING', `Normal click failed for scenario live button in ${cardName} card, using JavaScript click`);
      await this.doClickUsingScript(icon, `Clicking scenario live button in ${cardName} card using JavaScript`);
    }
    await this.btnDone.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    return true;
  }

  /** Whether the scenario is listed in the popup and, when `isSelected` is given, has that checked state. */
  public async isScenarioListed(scenarioName: string, isSelected?: boolean): Promise<boolean> {
    const checkbox = this.scenarioCheckbox(scenarioName);
    const isListed = await this.scenarioLabel(scenarioName).waitFor({ state: 'visible', timeout: getTimeout('XLARGE') }).then(() => true, () => false);
    if (!isListed) {
      await this.log.logMessage('INFO', `Scenario ${scenarioName} does not exist in pivot popup`);
      return false;
    }
    if (typeof isSelected !== 'boolean') {
      return true;
    }
    const isChecked = await checkbox.isChecked();
    await this.log.logMessage('INFO', `Is ${scenarioName} scenario selected :: ${isChecked}`);
    return isChecked === isSelected;
  }

  /** Checks each scenario in the popup, clicks Done and reports whether every scenario became a top-axis column. */
  public async applyScenarios(scenarios: string[]): Promise<boolean> {
    for (const scenarioName of scenarios) {
      const checkbox = this.scenarioCheckbox(scenarioName);
      await checkbox.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
      if (await checkbox.isChecked()) {
        await this.log.logMessage('INFO', `${scenarioName} checkbox is already checked`);
        continue;
      }
      await this.doClick(checkbox, `Clicking on ${scenarioName} scenario label in pivot popup`);
      const isChecked = await expect.poll(() => checkbox.isChecked().catch(() => false), { timeout: getTimeout('MEDIUM') }).toBe(true).then(() => true, () => false);
      if (!isChecked) {
        await this.log.logMessage('WARNING', `${scenarioName} checkbox did not enter checked state after click, retrying`);
        await this.doClick(checkbox, `Retrying click on ${scenarioName} scenario label in pivot popup`);
      }
      await this.log.logMessage('INFO', `${scenarioName} checkbox is now checked`);
    }

    await this.doClick(this.btnDone, 'Clicking done button in pivot');
    await this.topAxisItem(scenarios[0]).waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    for (const scenarioName of scenarios) {
      const isColumnShown = await this.doesElementExist(this.topAxisItem(scenarioName), `Column with scenario name ${scenarioName}`);
      await this.log.logMessage('INFO', `Is column exist with name ${scenarioName} scenario in table :: ${isColumnShown}`);
      if (!isColumnShown) {
        return false;
      }
    }
    return true;
  }

  /** Whether the card's table header lists every one of `columns`. */
  public async hasColumns(columns: string[], cardName: string): Promise<boolean> {
    try {
      const header = this.tableHeader(cardName);
      await this.waitForElementVisible(header);
      const headerText = await this.doGetText(header, `Getting table header value for ${cardName}`);
      await this.log.logMessage('INFO', `Table header value for ${cardName} card: ${headerText}`);
      const missing = columns.find((column) => !headerText.includes(column));
      if (missing) {
        await this.log.logMessage('INFO', `${missing} column doesn't exist in ${cardName} card.`);
        return false;
      }
      await this.log.logMessage('INFO', `${columns} exist in ${cardName} card table.`);
      return true;
    } catch (error) {
      await this.log.logMessage('FAIL', `Failed to verify columns in ${cardName} card: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}
