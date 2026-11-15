import { Page, Locator, expect } from '@playwright/test';
import BasePage from '../page';
import { getTimeout } from '../../constants/timeouts';
import { CommonFunctions } from '../../util/common.util';
import { exactText, textContaining } from '../planning/text-match';

/**
 * Card gallery of a view in edit mode (`@by/lui-dashboard-library` 10.10.x). The edit-mode header has
 * `lui-dashboard-header-add-card-button`; older layouts had a speed dial (`aria-label="add card button"`) with
 * "Card" / "Container" items instead. The gallery dialog has `lui-dashboard-header-card-search`,
 * `lui-dashboard-header-card-create-button` (opens the card type list, `lui-dashboard-card-gallery-item-card-title`)
 * and `lui-dashboard-global-add-card-modal-title-close-button`. Each published card is a tile
 * `lui-dashboard-card-definition-primary-button` with its title in `h4[data-testid="typography-title"]`, a selection
 * checkbox, and `lui-dashboard-card-definition-menu-settings` / `-menu-remove` buttons that show while the tile is
 * hovered or selected. `lui-dashboard-add-card-confirm` adds the selected tiles to the view.
 */
export class CardGalleryComponent extends BasePage {
  private readonly log = new CommonFunctions();

  constructor(page: Page) {
    super(page);
  }

  // Locators
  private headerAddButton(type: 'Card' | 'Container'): Locator {
    return this.mfeLocator(`button[data-testid="lui-dashboard-header-add-${type.toLowerCase()}-button"]`);
  }
  private get btnAddSpeedDial(): Locator        { return this.mfeLocator('button[aria-label="add card button"]'); }
  private get btnCreateCard(): Locator          { return this.mfeLocator('button[data-testid="lui-dashboard-header-card-create-button"]'); }
  private get btnClose(): Locator               { return this.mfeLocator('button[data-testid="lui-dashboard-global-add-card-modal-title-close-button"]'); }
  private get btnAddToView(): Locator {
    return this.getMfeFrameLocator().getByTestId('lui-dashboard-add-card-confirm')
      .or(this.mfeLocator('button').filter({ hasText: exactText('Add Card') }))
      .first();
  }
  private get inputSearch(): Locator            { return this.mfeLocator('[data-testid="lui-dashboard-header-card-search"] input'); }
  private get cardTypeTitles(): Locator         { return this.mfeLocator('div[data-testid="lui-dashboard-card-gallery-item-card-title"]'); }
  private get btnCalendar(): Locator            { return this.mfeLocator('button[aria-label*="Choose date"]'); }
  private get btnToday(): Locator               { return this.mfeLocator('button[class*="MuiPickersDay-today"]'); }
  private get btnDeprecateAndRemove(): Locator  { return this.mfeLocator('button[data-testid="lui-dashboard-configuration-remove-confirm-button"]'); }

  private speedDialItem(item: string): Locator {
    return this.mfeLocator('button, [role="menuitem"]').filter({ hasText: textContaining(item) }).first();
  }
  private cardType(cardType: string): Locator   { return this.cardTypeTitles.filter({ hasText: exactText(cardType) }).first(); }
  /** Search highlights the matched text in a nested element, so match the h4's whole text rather than `:text-is`. */
  private tileTitle(cardTitle: string): Locator { return this.mfeLocator('h4[data-testid="typography-title"]').filter({ hasText: exactText(cardTitle) }).first(); }
  private tile(cardTitle: string): Locator {
    return this.mfeLocator('[data-testid="lui-dashboard-card-definition-primary-button"]')
      .filter({ has: this.page.locator('h4[data-testid="typography-title"]', { hasText: exactText(cardTitle) }) })
      .first();
  }
  private tileCheckbox(cardTitle: string): Locator { return this.tile(cardTitle).locator('input[type="checkbox"]'); }
  private tileSettings(cardTitle: string): Locator { return this.tile(cardTitle).getByTestId('lui-dashboard-card-definition-menu-settings'); }
  private tileRemove(cardTitle: string): Locator   { return this.tile(cardTitle).getByTestId('lui-dashboard-card-definition-menu-remove'); }

  // Atomic actions
  /**
   * Adds a card or container from the edit-mode header (`lui-dashboard-header-add-card-button` /
   * `-add-container-button`), falling back to the older speed dial. The old code tried the speed dial first and
   * waited 15 s for it on every call (CI 2026-10-18: 16 of 17 calls fell back to the header).
   */
  public async open(type: 'Card' | 'Container' = 'Card'): Promise<void> {
    const headerButton = this.headerAddButton(type);
    await headerButton.or(this.btnAddSpeedDial).first().waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    if (await headerButton.isVisible()) {
      await this.doClick(headerButton, `Clicking Add ${type} Button from header`);
      return;
    }
    await this.mouseHover(this.btnAddSpeedDial, 'Hovering on add icon');
    const item = this.speedDialItem(type);
    if (!(await item.waitFor({ state: 'visible', timeout: getTimeout('TINY') }).then(() => true, () => false))) {
      await this.doClick(this.btnAddSpeedDial, 'Clicking add icon');
    }
    await item.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(item, `Clicking on add ${type} button`);
  }

  public async clickCreateCard(): Promise<void> {
    await this.btnCreateCard.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(this.btnCreateCard, 'Clicking Create Card Button');
  }

  public async getCardTypeNames(): Promise<string[]> {
    await this.cardTypeTitles.first().waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    const names = (await this.cardTypeTitles.allTextContents()).map((name) => name.trim());
    await this.log.logMessage('INFO', `All Card Names:: ${names.toString()}`);
    return names;
  }

  public async selectCardType(cardType: string): Promise<void> {
    const option = this.cardType(cardType);
    await option.scrollIntoViewIfNeeded();
    await this.doClick(option, `Clicking on create card button in ${cardType} card`);
  }

  public async close(): Promise<void> {
    await this.btnClose.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(this.btnClose, 'Clicking back icon in card gallery');
  }

  public async search(cardTitle: string): Promise<void> {
    await this.inputSearch.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.inputSearch.clear();
    await this.doEnterText(this.inputSearch, cardTitle, `Searching for card ${cardTitle} in card gallery`);
    await this.mfeLocator('h4[data-testid="typography-title"]').filter({ hasText: textContaining(cardTitle) }).first()
      .waitFor({ state: 'visible', timeout: getTimeout('LONG') });
  }

  public async isCardListed(cardTitle: string): Promise<boolean> {
    const isListed = await this.tileTitle(cardTitle).waitFor({ state: 'visible', timeout: getTimeout('LONG') }).then(() => true, () => false);
    await this.log.logMessage('INFO', `Is card with title ${cardTitle} exist :: ${isListed}`);
    return isListed;
  }

  public async selectCard(cardTitle: string): Promise<void> {
    const checkbox = this.tileCheckbox(cardTitle);
    await checkbox.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(checkbox, `Clicking on checkbox for card ${cardTitle}`);
  }

  public async addCardToView(cardTitle: string): Promise<void> {
    const title = this.tileTitle(cardTitle);
    await title.scrollIntoViewIfNeeded();
    await this.doClick(title, `Clicking on card with title ${cardTitle} in card gallery`);
    await this.btnAddToView.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(this.btnAddToView, 'Clicking on Add Card Button');
  }

  /** Hovers the tile so its menu shows and clicks its settings button, which opens the card settings form. */
  public async openCardSettings(cardTitle: string): Promise<void> {
    const title = this.tileTitle(cardTitle);
    await title.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await title.scrollIntoViewIfNeeded();
    const settings = this.tileSettings(cardTitle);
    await expect(async () => {
      await this.mouseHover(this.tile(cardTitle), `Hovering on ${cardTitle} card in card gallery`);
      await expect(settings).toBeVisible({ timeout: getTimeout('TINY') });
    }).toPass({ timeout: getTimeout('MEDIUM') });
    await this.doClick(settings, `Clicking settings button for ${cardTitle} in card gallery`);
  }

  /** Searches for the card, selects it (which keeps its menu shown) and opens its settings. */
  public async searchAndOpenCardSettings(cardTitle: string): Promise<void> {
    await this.search(cardTitle);
    await this.selectCard(cardTitle);
    const settings = this.tileSettings(cardTitle);
    await settings.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(settings, `Clicking on card ${cardTitle}`);
  }

  /** Deprecates the card from today and removes it from the gallery. */
  public async removeCard(cardTitle: string): Promise<void> {
    const remove = this.tileRemove(cardTitle);
    await this.tileTitle(cardTitle).waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await expect(async () => {
      await this.mouseHover(this.tile(cardTitle), `Hovering on ${cardTitle} card in card gallery`);
      await expect(remove).toBeVisible({ timeout: getTimeout('TINY') });
    }).toPass({ timeout: getTimeout('MEDIUM') });
    await this.doClickUsingScript(remove, `Clicking remove button of ${cardTitle} card`);
    await this.btnCalendar.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(this.btnCalendar, 'Clicking on calendar icon in date picker');
    await this.btnToday.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClickUsingScript(this.btnToday, "Selecting today's date from date picker");
    await this.btnDeprecateAndRemove.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.btnDeprecateAndRemove, 'Clicking on Deprecate & remove button');
  }
}
