import { Page, Locator, expect } from '@playwright/test';
import { getTimeout } from '../../constants/timeouts';
import { GlobalSettingsComponent } from './settings-component';

const ARRANGE_ROW = 'tr[data-testid="arrange-views-row"]';
const DIALOG_SELECTION_ROW = 'div[role="presentation"] tr, div[role="dialog"] tr';

/**
 * "Map With" dialog of PO Global Settings view mapping: the view/view-group selection table (second
 * `lui-ccl-table` on the page) and the Arrange Views panel (`arrange-views`, rows `arrange-views-row`: name in the
 * 3rd cell, eye icon in the 4th, `Move` drag handle, `Expand` toggle). Also reads the Planning view-group tree
 * (`MuiTreeItem-label`). Test IDs are the ones the earlier XPath locators used.
 */
export class ArrangeViewsComponent extends GlobalSettingsComponent {
  constructor(page: Page) {
    super(page);
  }

  // --- Locators: selection table ---
  private get selectedRows(): Locator                           { return this.mfeLocator('div[data-testid="lui-ccl-table"]').nth(1).locator('tbody tr[data-selected="true"]'); }
  private selectionRow(name: string): Locator                   { return this.tableRowByName(name, DIALOG_SELECTION_ROW).first(); }
  private selectionCheckbox(name: string): Locator              { return this.selectionRow(name).locator('td input[type="checkbox"]').first(); }
  private checkedSelectionMark(name: string): Locator           { return this.selectionRow(name).locator('span[aria-label="Toggle select row"][class*="Mui-checked"]'); }

  // --- Locators: Arrange Views panel ---
  private get arrangeRows(): Locator                            { return this.mfeLocator(ARRANGE_ROW); }
  private get arrangePanelRows(): Locator                       { return this.mfeLocator(`[data-testid="arrange-views"] table tbody ${ARRANGE_ROW}`); }
  private get expandIcons(): Locator                            { return this.mfeLocator(`${ARRANGE_ROW} > td > span[aria-label="Expand"]`); }
  // Names of rows whose first-cell button is enabled, i.e. the containers.
  private get containerNames(): Locator {
    return this.arrangeRows.filter({ has: this.page.locator('td:nth-child(1) button:not([class*="Mui-disabled"])') }).locator('td:nth-child(3) > p');
  }
  private arrangeRow(name: string): Locator                     { return this.tableRowByName(name, ARRANGE_ROW).first(); }
  private dialogArrangeRow(name: string): Locator               { return this.tableRowByName(name, `div[role="presentation"] tbody ${ARRANGE_ROW}`).first(); }
  private eyeIcon(viewName: string): Locator                    { return this.arrangeRow(viewName).locator('td:nth-child(4) div[class*="options"] span').first(); }
  private expandIcon(containerName: string): Locator            { return this.arrangeRow(containerName).locator('td > span[aria-label="Expand"]').first(); }
  private moveHandle(name: string): Locator                     { return this.dialogArrangeRow(name).locator('button[aria-label="Move"]').first(); }
  private get btnSave(): Locator                                { return this.getMfeFrameLocator().getByTestId('save-btn'); }
  private get successToast(): Locator                           { return this.mfeLocator('div:text-is("Your changes have been saved successfully")').first(); }

  // --- Locators: Planning view-group tree ---
  private get planningHeader(): Locator                         { return this.mfeLocator('h3:text-is("Planning")'); }
  private get treeLabels(): Locator                             { return this.mfeLocator('div div div[class="MuiTreeItem-label"]'); }

  // --- Helpers ---
  private async isSelectionChecked(name: string): Promise<boolean> {
    const checkbox = this.selectionCheckbox(name);
    const isChecked = await checkbox.isChecked().catch(() => false);
    const isIndeterminate = await checkbox.evaluate((node: HTMLInputElement) => node.indeterminate).catch(() => false);
    return isChecked || isIndeterminate;
  }

  /** Clicks the selection checkbox of `name` until its state is `select` (one retry, like a missed click). */
  private async setSelection(name: string, select: boolean, isSelected: () => Promise<boolean>): Promise<void> {
    for (let attempt = 1; attempt <= 2 && (await isSelected()) !== select; attempt++) {
      await this.doClick(this.selectionCheckbox(name), `${select ? 'Checking' : 'Unchecking'} ${name} checkbox (attempt ${attempt})`);
      await expect.poll(isSelected, { timeout: getTimeout('SHORT') }).toBe(select).catch(() => undefined);
    }
  }

  /** Names of the arrange rows that follow `containerName` (what the old following-sibling XPath returned). */
  private async getContainerViews(containerName: string): Promise<string[]> {
    const rows = await this.arrangeRows.evaluateAll((elements, name) => elements.map((row) => ({
      isContainer: Array.from(row.querySelectorAll('p')).some((p) => (p.textContent || '').trim() === name),
      name: (row.querySelector('td:nth-child(3) > p')?.textContent || '').trim()
    })), containerName);
    const start = rows.findIndex((row) => row.isContainer);
    const list = start < 0 ? [] : rows.slice(start + 1).map((row) => row.name).filter(Boolean);
    await this.log.logMessage('INFO', `Container view list: ${list}`);
    return list;
  }

  private async dragContainer(sourceContainerName: string, targetContainerName: string): Promise<void> {
    const source = this.moveHandle(sourceContainerName);
    const target = this.dialogArrangeRow(targetContainerName);
    await source.scrollIntoViewIfNeeded();
    await target.scrollIntoViewIfNeeded();
    const sourceBox = await source.boundingBox();
    const targetBox = await target.boundingBox();
    if (sourceBox && targetBox) {
      // Manual drag in steps so the drag library sees a drag start, then drop on the upper quarter of the target row.
      const startX = sourceBox.x + sourceBox.width / 2;
      const startY = sourceBox.y + sourceBox.height / 2;
      await this.page.mouse.move(startX, startY);
      await this.page.mouse.down();
      await this.page.mouse.move(startX, startY + 10, { steps: 5 });
      await this.page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 4, { steps: 20 });
      await this.page.mouse.up();
    } else {
      await source.dragTo(target);
    }
    await this.log.logMessage('INFO', `${sourceContainerName} is moved to ${targetContainerName}`);
  }

  private async dragView(sourceViewName: string, targetViewName: string): Promise<void> {
    const source = this.moveHandle(sourceViewName);
    const target = this.moveHandle(targetViewName);
    await source.scrollIntoViewIfNeeded();
    await target.scrollIntoViewIfNeeded();
    await source.dragTo(target);
    await this.log.logMessage('INFO', `${sourceViewName} is moved to ${targetViewName}`);
  }

  private async saveArrangement(): Promise<void> {
    await this.doClick(this.btnSave, 'Clicking Save button');
    await expect(this.successToast).toBeVisible({ timeout: getTimeout('XLARGE') });
  }

  public async toggleContainer(containerName: string, select: boolean): Promise<void> {
    const row = this.selectionRow(containerName);
    await row.waitFor({ state: 'attached', timeout: getTimeout('LONG') });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await this.setSelection(containerName, select, () => this.isSelectionChecked(containerName));
  }

  public async toggleView(viewName: string, select: boolean): Promise<void> {
    await this.setSelection(viewName, select, () => this.checkedSelectionMark(viewName).isVisible());
  }

  public async expandContainers(): Promise<void> {
    const count = await this.expandIcons.count();
    for (let i = 0; i < count; i++) {
      const icon = this.expandIcons.nth(i);
      if (await icon.isVisible()) {
        await this.doClick(icon, 'Clicking expand icon');
      }
    }
  }

  public async expandContainer(containerName: string): Promise<void> {
    if ((await this.getContainerViews(containerName)).length > 0) {
      return;
    }
    const icon = this.expandIcon(containerName);
    if (await icon.isVisible()) {
      await this.doClick(icon, `Clicking expand icon for ${containerName}`);
      await expect.poll(async () => (await this.getContainerViews(containerName)).length, { timeout: getTimeout('SHORT') })
        .toBeGreaterThan(0).catch(() => undefined);
    }
  }

  public async getPSContainersAndViews(_viewGroupName?: string): Promise<string[]> {
    await this.planningHeader.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    const all = (await this.treeLabels.allTextContents()).map((item) => item.trim()).filter(Boolean);
    // The tree is rendered twice; the first half is the visible copy.
    const resolved = all.slice(0, Math.floor(all.length / 2) || all.length);
    await this.log.logMessage('INFO', `Fetch containers and views are ${resolved}`);
    return resolved;
  }

  public async selectedViews(): Promise<string[]> {
    const selected = (await this.selectedRows.allTextContents()).map((text) => text.trim());
    await this.log.logMessage('INFO', `Fetched selected views and containers in map Views are "${selected}"`);
    return selected;
  }

  public async showSelectedViews(): Promise<string[]> {
    const shown = (await this.arrangePanelRows.allTextContents()).map((text) => text.trim());
    await this.log.logMessage('INFO', `Fetch containers and views in arrange views are "${shown}"`);
    return shown;
  }

  public async hideOrUnhideView(viewName: string, visibilityMode: 'HIDE_VIEW' | 'SHOW_VIEW'): Promise<boolean> {
    const row = this.arrangeRow(viewName);
    await row.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    const eyeIcon = this.eyeIcon(viewName);
    await eyeIcon.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    const ariaLabel = ((await this.doGetAttribute(eyeIcon, 'aria-label', `Getting aria-label for ${viewName} eye icon`)) || '').toLowerCase();

    if (visibilityMode === 'SHOW_VIEW') {
      if (ariaLabel.includes('show view')) {
        await this.doClick(eyeIcon, `Unhiding view: ${viewName}`);
      } else {
        await this.log.logMessage('INFO', `${viewName} is already visible`);
      }
      return true;
    }
    if (ariaLabel === 'simple' || ariaLabel.includes('hide view')) {
      await this.doClick(row, `Selecting arrange view row: ${viewName}`);
      await this.doClick(eyeIcon, `Hiding view: ${viewName}`);
    } else {
      await this.log.logMessage('INFO', `${viewName} is already hidden`);
    }
    return true;
  }

  // --- Composite actions ---
  public async displaySelectedViews(containerName: string): Promise<boolean> {
    await this.toggleContainer(containerName, true);
    const selectedList = await this.selectedViews();
    await this.expandContainers();
    const displaySelectedList = await this.showSelectedViews();
    return JSON.stringify(selectedList) === JSON.stringify(displaySelectedList);
  }

  public async displayViewsOrder(viewName: string): Promise<boolean> {
    await this.toggleView(viewName, false);
    const selectedList = await this.selectedViews();
    const arrangedList = await this.showSelectedViews();
    const validation1 = await this.log.compareTwoValues(selectedList.toString(), arrangedList.toString(), 'View mapping and arrange views selected views ');
    await this.toggleView(viewName, true);
    const isViewPresent = await expect.poll(async () => (await this.showSelectedViews()).includes(viewName), { timeout: getTimeout('SHORT') })
      .toBe(true).then(() => true, () => false);
    const validation2 = await this.log.compareTwoValues(true, isViewPresent, 'View mapping and arrange views view present after checking');
    return validation1 && validation2;
  }

  public async checkDragAndDropViews(containerName: string, sourceViewName: string, targetViewName: string): Promise<string[]> {
    await this.toggleContainer(containerName, true);
    await this.expandContainer(containerName);
    const initialViewList = await this.getContainerViews(containerName);
    await this.dragView(sourceViewName, targetViewName);
    const finalViewList = await this.getContainerViews(containerName);
    const rotated = [...initialViewList.slice(1), ...initialViewList.slice(0, 1)];
    await this.log.logMessage('INFO', `Views after Drag and Drop Assertion:: ${JSON.stringify(rotated) === JSON.stringify(finalViewList)}`);
    const poList = await this.showSelectedViews();
    await this.saveArrangement();
    return poList;
  }

  public async dragAndDropContainer(sourceContainerName: string, targetContainerName: string): Promise<string[]> {
    await this.toggleContainer(sourceContainerName, true);
    await this.toggleContainer(targetContainerName, true);
    await this.containerNames.first().waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    const [initialFirst, initialSecond] = (await this.containerNames.allTextContents()).map((text) => text.trim());
    await this.dragContainer(sourceContainerName, targetContainerName);
    const [finalFirst, finalSecond] = (await this.containerNames.allTextContents()).map((text) => text.trim());
    await this.log.logMessage('INFO', `Drag and drop success :: ${initialFirst === finalSecond && initialSecond === finalFirst}`);
    const poList = await this.showSelectedViews();
    await this.saveArrangement();
    return poList;
  }
}
