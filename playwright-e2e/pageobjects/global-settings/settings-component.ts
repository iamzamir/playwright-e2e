import { Page, Locator } from '@playwright/test';
import BasePage from '../page';
import { getTimeout } from '../../constants/timeouts';
import { CommonFunctions } from '../../util/common.util';
import { exactText } from '../planning/text-match';

/**
 * Shared base for the PO Global Settings component objects. Holds the lui-ccl three-dot row menu
 * (`div[role="button"]` items with a `span` label, rendered by `@jda/lui-common-component-library-mui5`) used by the
 * calendar list, the planning views table and the view groups table.
 */
export abstract class GlobalSettingsComponent extends BasePage {
  protected readonly log = new CommonFunctions();

  constructor(page: Page) {
    super(page);
  }

  // --- Locators: three-dot row menu ---
  protected get threeDotMenuButtons(): Locator              { return this.getMfeFrameLocator().getByTestId('lui-ccl-threedot-menu-icon-button'); }
  protected get openThreeDotMenu(): Locator                 { return this.getMfeFrameLocator().getByTestId('lui-ccl-threedot-menu-list').filter({ visible: true }); }
  protected threeDotMenuItem(itemName: string): Locator     { return this.mfeLocator(`div[role="button"] span:text-is(${JSON.stringify(itemName)})`); }
  // Some labels are truncated ("Configure..."), so fall back to a prefix match.
  protected threeDotMenuItemByPrefix(itemName: string): Locator {
    const escaped = itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.mfeLocator('div[role="button"] span').filter({ hasText: new RegExp(`^\\s*${escaped}`) }).first();
  }
  /** Table row whose name cell (`p`) reads exactly `name`. Inner `has` locators resolve relative to the row, so they come from `page`. */
  protected tableRowByName(name: string, rowSelector = 'tr'): Locator {
    return this.mfeLocator(rowSelector).filter({ has: this.page.locator('p').filter({ hasText: exactText(name) }) });
  }

  protected rowMenuItem(option: string): Locator               { return this.threeDotMenuItem(option).or(this.threeDotMenuItemByPrefix(option)).filter({ visible: true }).first(); }

  // --- Helpers ---
  /**
   * Opens a row's three-dot menu with `openMenu` and clicks `option`. lui tables re-render after loads and saves, which
   * closes an open menu or detaches its items, so the menu is reopened (up to 3 tries) when the item is not clickable.
   */
  protected async selectRowMenuOption(openMenu: () => Promise<void>, option: string, item: (option: string) => Locator = (name) => this.rowMenuItem(name)): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      await openMenu();
      const menuItem = item(option);
      try {
        await menuItem.waitFor({ state: 'visible', timeout: getTimeout('SHORT') });
        await menuItem.click({ timeout: getTimeout('SHORT') });
        await this.log.logMessage('INFO', `Selected ${option} from three dot menu`);
        return;
      } catch (error) {
        if (attempt >= 3) {
          throw error;
        }
        await this.log.logMessage('INFO', `Menu option "${option}" not clickable (attempt ${attempt}); reopening the menu`);
        await this.page.keyboard.press('Escape');
        // Let the open menu close before the next attempt reopens it.
        await this.openThreeDotMenu.first().waitFor({ state: 'hidden', timeout: getTimeout('TINY') }).catch(() => null);
      }
    }
  }
}
