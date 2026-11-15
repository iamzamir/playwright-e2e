import { Locator } from '@playwright/test';
import BasePage from '../page';

/**
 * A dashboard card (`div[data-testid="lui-dashboard-card"]`) by its title: the title span in view mode, or the
 * title input (`lui-dashboard-card-title` / `lui-dashboard-card-edit-title`) on cards with an editable title and in
 * edit mode. A tabbed card contains other cards, so the outermost match comes first, as with the old XPath.
 */
export function dashboardCardByTitle(base: BasePage, cardTitle: string): Locator {
  const title = JSON.stringify(cardTitle);
  return base.mfeLocator('div[data-testid="lui-dashboard-card"]')
    .filter({
      has: base.page.locator(
        `[data-testid="lui-dashboard-card-title"] span:text-is(${title}), ` +
        `[data-testid="lui-dashboard-card-title"] input[value=${title}], ` +
        `[data-testid="lui-dashboard-card-edit-title"] input[value=${title}]`
      ),
    })
    .first();
}
