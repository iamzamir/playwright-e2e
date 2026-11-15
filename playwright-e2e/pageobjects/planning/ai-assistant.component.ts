import { Page, Locator, FrameLocator } from '@playwright/test';
import BasePage from '../page';
import { getTimeout } from '../../constants/timeouts';
import { CommonFunctions } from '../../util/common.util';

/**
 * AIAssistantComponent
 *
 * Encapsulates the Luminate AI Assistant (BYO Agent) portal panel,
 * agent selector, and agent event triggers.
 *
 * Source:
 *   - Portal App Bar: `@by/plat-lui-portal` (`luminate-AIAssistant-icon-button`)
 *   - Copilot Library: `@by/aicopilot-component-library` (`aicopilot-agent-selector-box`)
 */
export class AIAssistantComponent extends BasePage {
  private objCommonFunctions: CommonFunctions;
  private readonly frameAccessor?: () => FrameLocator;

  constructor(page: Page, frameAccessor?: () => FrameLocator) {
    super(page);
    this.objCommonFunctions = new CommonFunctions();
    this.frameAccessor = frameAccessor;
  }

  protected frame(): FrameLocator | Page {
    return this.frameAccessor ? this.frameAccessor() : this.page;
  }

  // --- Locators ---

  /** AI Assistant / Copilot icon button in the portal app bar or MFE header */
  private get portalByoIcon(): Locator {
    return this.frame().getByTestId('luminate-AIAssistant-icon-button')
      .or(this.frame().getByRole('button', { name: /ai\s*assistant/i }))
      .first();
  }

  private async resolvePortalByoIcon(): Promise<Locator> {
    const frameIcon = this.frame().getByTestId('luminate-AIAssistant-icon-button')
      .or(this.frame().getByRole('button', { name: /ai\s*assistant/i }))
      .first();
    if (await frameIcon.isVisible().catch(() => false)) {
      return frameIcon;
    }
    const pageIcon = this.page.getByTestId('luminate-AIAssistant-icon-button')
      .or(this.page.getByRole('button', { name: /ai\s*assistant/i }))
      .first();
    if (await pageIcon.isVisible().catch(() => false)) {
      return pageIcon;
    }
    return frameIcon;
  }

  /** Agent selector dropdown box */
  private get byoAgentDropdown(): Locator {
    return this.frame().getByTestId('aicopilot-agent-selector-box').locator('div').first()
      .or(this.frame().getByTestId('aicopilot-agent-selector-box'))
      .first();
  }

  /** Dropdown option for a specific BYO Agent */
  private getBYOAgentOption(agentName: string): Locator {
    return this.frame().getByRole('option', { name: agentName })
      .or(this.frame().locator('li[role="option"]').filter({ hasText: agentName }))
      .first();
  }

  /** Event action button for the selected agent */
  private getBYOAgentEvent(eventName: string): Locator {
    return this.frame().getByRole('button', { name: eventName, exact: true })
      .or(this.frame().locator('button').filter({ hasText: eventName }))
      .first();
  }

  // --- Actions & Assertions ---

  public async verifyPortalBYOICon(): Promise<boolean> {
    const icon = await this.resolvePortalByoIcon();
    await icon.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') }).catch(() => {});
    const isDisplayed = await icon.isVisible().catch(() => false);
    await this.objCommonFunctions.logMessage('INFO', `Portal BYO icon is displayed: ${isDisplayed}`);
    return isDisplayed;
  }

  public async clickPortalBYOIcon(): Promise<void> {
    const icon = await this.resolvePortalByoIcon();
    await icon.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(icon, 'Clicked on Portal BYO icon');
  }

  public async selectBYOAgent(agentName: string): Promise<void> {
    await this.objCommonFunctions.logMessage('INFO', `Selecting BYO Agent: ${agentName}`);
    await this.byoAgentDropdown.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.byoAgentDropdown, 'Clicked on BYO Agent dropdown');
    const option = this.getBYOAgentOption(agentName);
    await option.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(option, `Clicked on BYO Agent option: ${agentName}`);
  }

  public async initiateBYOAgentEvent(agentName: string, eventName: string): Promise<void> {
    await this.selectBYOAgent(agentName);
    const eventButton = this.getBYOAgentEvent(eventName);
    await eventButton.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(eventButton, `Clicked on BYO Agent event button: ${eventName}`);
  }
}
