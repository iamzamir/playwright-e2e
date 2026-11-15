import { Page, Locator, expect } from '@playwright/test';
import BasePage from '../page';
import { getTimeout } from '../../constants/timeouts';
import { CommonFunctions } from '../../util/common.util';
import { exactText } from './text-match';

export const VIEW_TYPES = ['All Views', 'Favourites', 'Hidden Views'] as const;
export type ViewType = typeof VIEW_TYPES[number];

const TREE_ITEM_LABEL = '[class*="MuiTreeItem-label"]';
const TREE_ITEM_ICON = '[class*="MuiTreeItem-iconContainer"]';

/**
 * Views drawer of the Planning page: the view dropdown button, the view-type select (All Views, Favourites,
 * Hidden Views) and the view-group tree. Test IDs come from planning-mfe `SideNavWithRightPanel.tsx`
 * (`views-dropdown`) and `TabPanelContent.tsx` (`select-views`, `close-views-popover`), and from `ViewsTree` in
 * `@by/plan-sop-ui-library` 2026.4.x: one `ul[data-testid="viewsList-<groupId>"]` per group holding a single
 * `tree-view` item (the group, `aria-expanded` only when it has views) whose children are `child-views` items
 * (the selected one carries `Mui-selected`). Collapsed groups unmount their children (MUI TreeItem `unmountOnExit`).
 */
export class ViewsDrawerComponent extends BasePage {
  private readonly log = new CommonFunctions();

  constructor(page: Page) {
    super(page);
  }

  // Locators
  private get btnViewDropdown(): Locator   { return this.getMfeFrameLocator().getByTestId('views-dropdown').first(); }
  private get inputViewType(): Locator     { return this.mfeLocator('input#select-select-select-views').first(); }
  private get viewTypeMenu(): Locator      { return this.mfeLocator('#select-menu-select-views'); }
  private get viewTypeOptions(): Locator   { return this.viewTypeMenu.locator('li[aria-label]'); }
  private get viewGroups(): Locator        { return this.mfeLocator('ul[data-testid*="viewsList"] > li'); }
  private get groupNodes(): Locator        { return this.getMfeFrameLocator().getByTestId('tree-view'); }
  private get childViews(): Locator        { return this.getMfeFrameLocator().getByTestId('child-views'); }
  private get viewLabels(): Locator        { return this.childViews.locator(TREE_ITEM_LABEL); }
  private get treeLabels(): Locator        { return this.groupNodes.locator(TREE_ITEM_LABEL); }
  private get btnClose(): Locator          { return this.getMfeFrameLocator().getByTestId('close-views-popover').first(); }
  private viewTypeOption(viewType: ViewType): Locator { return this.viewTypeMenu.locator(`li[aria-label="${viewType}"]`); }
  // Inner `has` locators are resolved relative to the outer element, so they are built from `page`, not the frame.
  private groupNode(groupName: string): Locator {
    return this.groupNodes.filter({ has: this.page.locator(TREE_ITEM_LABEL).filter({ hasText: exactText(groupName) }) }).first();
  }

  /** The tree item of a view, matched on its exact (whitespace-normalised) name. */
  public viewItem(viewName: string): Locator {
    return this.childViews.filter({ has: this.page.getByText(viewName, { exact: true }) }).first();
  }

  // Helpers
  private async ensureOpen(): Promise<void> {
    if (!(await this.isOpen())) {
      await this.open();
    }
  }

  private async setGroupExpanded(group: Locator, expanded: boolean, label: string): Promise<void> {
    const icon = group.locator(TREE_ITEM_ICON).first();
    await icon.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.log.logMessage('INFO', label);
    await icon.click({ force: true });
    await expect(group).toHaveAttribute('aria-expanded', String(expanded), { timeout: getTimeout('SHORT') });
  }

  private async allGroupsHaveState(expanded: boolean, label: (index: number) => string): Promise<boolean> {
    await this.ensureOpen();
    await this.viewGroups.first().waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    const groupCount = await this.viewGroups.count();
    for (let index = 0; index < groupCount; index++) {
      const ariaExpanded = await this.viewGroups.nth(index).getAttribute('aria-expanded');
      if (!(await this.log.compareTwoValues(ariaExpanded, String(expanded), label(index)))) {
        return false;
      }
    }
    return true;
  }

  // Atomic actions
  /** True when any part of the drawer (view-type select, group list or view list) is visible right now. */
  public async isOpen(): Promise<boolean> {
    return (await this.inputViewType.or(this.viewGroups).or(this.viewLabels).filter({ visible: true }).count()) > 0;
  }

  public async open(): Promise<void> {
    if (await this.isOpen()) {
      return;
    }
    await this.btnViewDropdown.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.btnViewDropdown, 'Clicking View Dropdown in Planning');
    try {
      await this.inputViewType.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    } catch {
      await this.log.logMessage('INFO', 'View dropdown not opened, retrying click');
      await this.doClick(this.btnViewDropdown, 'Clicking View Dropdown in Planning - Retry');
      await this.inputViewType.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    }
  }

  public async close(): Promise<void> {
    await this.log.logMessage('INFO', 'Closing View Dropdown in Planning');
    await this.doClick(this.btnClose, 'Clicking close button on view dropdown');
  }

  public async openViewTypeSelect(): Promise<void> {
    await this.inputViewType.waitFor({ state: 'visible', timeout: getTimeout('SHORT') });
    await this.doClick(this.inputViewType, 'Opening view type dropdown');
  }

  public async selectViewTypeOption(viewType: ViewType): Promise<void> {
    const option = this.viewTypeOption(viewType);
    await option.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(option, `Selecting view type: ${viewType}`);
  }

  public async selectViewType(viewType: ViewType): Promise<void> {
    await this.inputViewType.waitFor({ state: 'visible', timeout: getTimeout('SHORT') });
    await this.doClick(this.inputViewType, `Opening view type dropdown to select: ${viewType}`);
    await this.selectViewTypeOption(viewType);
  }

  /** Waits for the view-type select to display the given type; returns false if it does not within LONG. */
  public async isViewTypeSelected(viewType: ViewType): Promise<boolean> {
    await this.ensureOpen();
    try {
      await expect(this.inputViewType).toHaveValue(viewType, { timeout: getTimeout('LONG') });
      await this.log.logMessage('INFO', `View type "${viewType}" is selected`);
      return true;
    } catch {
      await this.log.logMessage('INFO', `View type "${viewType}" is not selected`);
      return false;
    }
  }

  /** Switches the view type and waits for planning-mfe to persist it to the user's preferences; returns whether the save succeeded. */
  public async switchViewTypeAndWaitForSave(viewType: ViewType): Promise<boolean> {
    const saved = this.page.waitForResponse(
      (response) =>
        response.url().includes('/userPreferences') &&
        response.request().method() === 'POST' &&
        (response.request().postData() ?? '').includes(`"displayName":"${viewType}"`),
      { timeout: getTimeout('LONG') }
    );
    await this.switchViewType(viewType);
    const ok = (await saved).ok();
    await this.log.logMessage('INFO', `View type "${viewType}" saved to user preferences: ${ok}`);
    return ok;
  }

  /** Instant check, no waiting: callers use it to probe whether a view already exists. */
  public async isViewListed(viewName: string): Promise<boolean> {
    return this.viewItem(viewName).isVisible();
  }

  public async expandAllGroups(): Promise<void> {
    await this.ensureOpen();
    const groups = this.groupNodes.filter({ visible: true });
    for (let index = 0; index < await groups.count(); index++) {
      const group = groups.nth(index);
      if ((await group.getAttribute('aria-expanded')) === 'false') {
        await this.setGroupExpanded(group, true, `Expanding view Group ${index + 1}`);
      }
    }
  }

  public async collapseAllGroups(): Promise<void> {
    await this.ensureOpen();
    const groups = this.groupNodes.filter({ visible: true });
    for (let index = 0; index < await groups.count(); index++) {
      const group = groups.nth(index);
      if ((await group.getAttribute('aria-expanded')) === 'true') {
        await this.setGroupExpanded(group, false, `Minimizing view Group ${index + 1}`);
      }
    }
  }

  public async areAllGroupsExpanded(): Promise<boolean> {
    return this.allGroupsHaveState(true, (index) => `view Group Expanded ${index} working as expected?`);
  }

  public async areAllGroupsCollapsed(): Promise<boolean> {
    return this.allGroupsHaveState(false, (index) => `view Group ${index} should be Minimized `);
  }

  // Composite actions
  public async selectView(viewName: string): Promise<void> {
    const targetView = this.viewItem(viewName);

    await expect.poll(async () => {
      if (!(await this.isOpen())) {
        await this.open();
        await this.selectViewType('All Views');
      }

      if ((await targetView.count().catch(() => 0)) === 0) {
        await this.expandAllGroups();
        return false;
      }

      const isVisible = await targetView.isVisible().catch(() => false);
      if (!isVisible) {
        await this.expandAllGroups();
      }
      return isVisible;
    }, {
      timeout: getTimeout('EXTREME'),
      message: `View "${viewName}" did not become visible in the All Views list.`
    }).toBeTruthy();

    await targetView.scrollIntoViewIfNeeded();
    await this.doClick(targetView, `Selecting View: ${viewName}`);
  }

  /** Picks a view type from the select, reopening the drawer once if the first attempt fails. */
  public async switchViewType(viewType: ViewType): Promise<void> {
    try {
      await this.openViewTypeSelect();
      await this.selectViewTypeOption(viewType);
    } catch {
      await this.log.logMessage('INFO', 'Trying Again!');
      await this.open();
      await this.openViewTypeSelect();
      await this.selectViewTypeOption(viewType);
    }
  }

  public async getViewTypes(): Promise<string[]> {
    await this.open();
    await this.inputViewType.waitFor({ state: 'visible', timeout: getTimeout('SHORT') });
    await this.doClick(this.inputViewType, 'Opening view type dropdown for validation');
    await this.viewTypeOptions.first().waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    const allTypes = (await this.viewTypeOptions.allTextContents()).map((item) => item.trim()).filter(Boolean);
    await this.log.logMessage('INFO', `View types in dropdown: ${allTypes.join(', ')}`);
    return allTypes;
  }

  public async getViews(groupName?: string): Promise<string[]> {
    await this.ensureOpen();

    if (groupName) {
      const group = this.groupNode(groupName);
      await group.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
      if ((await group.getAttribute('aria-expanded')) === 'false') {
        await this.setGroupExpanded(group, true, `Expanding view group ${groupName}`);
      }
      const childLabels = group.locator(`[data-testid="child-views"] ${TREE_ITEM_LABEL}`);
      await childLabels.first().waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') }).catch(() => {});
      const views = (await childLabels.allInnerTexts()).map((item) => item.trim()).filter(Boolean);
      await this.log.logMessage('INFO', `Views for group ${groupName}: ${views.join(', ')}`);
      return views;
    }

    await this.viewLabels.first().waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    const allViews = (await this.viewLabels.allInnerTexts()).map((item) => item.trim()).filter(Boolean);
    const resolvedViews = Array.from(new Set(allViews));
    await this.log.logMessage('INFO', `Visible views in side nav: ${resolvedViews.join(', ')}`);
    return resolvedViews;
  }

  /** Group and view labels of the whole tree, all groups expanded, duplicates removed. */
  public async getGroupsAndViews(viewGroupName?: string): Promise<string[]> {
    await this.ensureOpen();
    await this.treeLabels.first().waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.expandAllGroups();

    const labels = (await this.treeLabels.allInnerTexts()).map((item) => item.trim()).filter(Boolean);
    const displayViewList = labels.filter((value, index, arr) => arr.indexOf(value) === index);
    await this.log.logMessage(
      'INFO',
      `Fetch containers and views are ${displayViewList}${viewGroupName ? ` for view group ${viewGroupName}` : ''}`
    );
    return displayViewList;
  }

  /**
   * Substring match on group and view names, as before. The drawer keeps the tree it loaded with the page: a view
   * moved through View Settings showed in its new group only after a reload (INTEROP, 2026-10-09), so a miss is
   * re-checked once after reloading.
   */
  public async isViewInGroup(viewGroupName: string, viewName: string): Promise<boolean> {
    let exists = await this.findViewInGroup(viewGroupName, viewName);
    if (!exists) {
      await this.log.logMessage('INFO', `View: ${viewName} not under view group: ${viewGroupName}; reloading to refresh the views tree`);
      await this.page.reload();
      await this.btnViewDropdown.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
      exists = await this.findViewInGroup(viewGroupName, viewName);
    }
    await this.log.logMessage('INFO', `View: ${viewName} ${exists ? 'exists' : "doesn't exist"} under view group: ${viewGroupName}`);
    return exists;
  }

  private async findViewInGroup(viewGroupName: string, viewName: string): Promise<boolean> {
    await this.ensureOpen();
    const group = this.groupNodes.filter({ has: this.page.locator(TREE_ITEM_LABEL).filter({ hasText: viewGroupName }) }).first();
    const groupFound = await group.waitFor({ state: 'attached', timeout: getTimeout('LONG') }).then(() => true, () => false);
    if (!groupFound) {
      return false;
    }
    await group.scrollIntoViewIfNeeded().catch(() => {});
    if ((await group.getAttribute('aria-expanded')) === 'false') {
      await this.setGroupExpanded(group, true, `Expanding view group ${viewGroupName}`);
    }
    const view = group.getByTestId('child-views').filter({ has: this.page.locator(TREE_ITEM_LABEL).filter({ hasText: viewName }) }).first();
    await view.scrollIntoViewIfNeeded().catch(() => {});
    return view.waitFor({ state: 'visible', timeout: getTimeout('LONG') }).then(() => true, () => false);
  }
}
