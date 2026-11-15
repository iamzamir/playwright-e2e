import { Page, Locator } from '@playwright/test';
import BasePage from '../page';
import { getTimeout } from '../../constants/timeouts';
import { CommonFunctions } from '../../util/common.util';
import { exactText } from './text-match';

/**
 * Left rail and power bar navigation of the Planning page, all from `@by/plan-sop-ui-library` 2026.4.x: the rail's
 * "more" item (`span[data-testid="more"]`, shown while `WITH_SETTINGS_REFACTOR` is off; `nav-settings` replaces it)
 * opens a popover of `list-item` entries, and the power bar's `listingIcon` opens the recently opened list with
 * "All Processes". The planning listing table links each process by name in its first column (kept from the old
 * XPath, substring match included; on INTEROP 2026-10-09 the listing link reopened the last process instead).
 */
export class SideNavComponent extends BasePage {
  private readonly log = new CommonFunctions();

  constructor(page: Page) {
    super(page);
  }

  // Locators
  private get btnMore(): Locator { return this.getMfeFrameLocator().getByTestId('more'); }
  private get btnListing(): Locator { return this.getMfeFrameLocator().getByTestId('listingIcon'); }
  private get btnAllProcesses(): Locator { return this.getMfeFrameLocator().getByText('All Processes', { exact: true }); }
  private menuItem(itemName: string): Locator {
    return this.getMfeFrameLocator().getByTestId('list-item').filter({ hasText: exactText(itemName) });
  }
  private processLink(processName: string): Locator {
    return this.mfeLocator('table tbody tr > td:first-child a').filter({ hasText: processName });
  }

  // Actions
  /** Opens the rail's "more" menu and reports whether every option is listed. */
  public async hasMoreMenuOptions(options: string[]): Promise<boolean> {
    await this.btnMore.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.btnMore, 'Clicking on three dots button in side nav');
    for (const option of options) {
      const isListed = await this.menuItem(option).first().waitFor({ state: 'visible', timeout: getTimeout('SHORT') }).then(() => true, () => false);
      if (!isListed) {
        await this.log.logMessage('INFO', `Menu option ${option} not found in side nav`);
        return false;
      }
    }
    return true;
  }

  public async openListing(): Promise<void> {
    await this.btnListing.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.btnListing, 'Clicked Listing Icon');
  }

  public async openAllProcesses(): Promise<void> {
    await this.btnAllProcesses.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.btnAllProcesses, 'Clicked on All Process button');
  }

  public async openProcessFromList(processName: string): Promise<void> {
    await this.processLink(processName).waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.processLink(processName), `Click on ${processName} from the list`);
  }
}
