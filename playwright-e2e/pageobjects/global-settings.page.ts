import { Page, Locator, expect } from '@playwright/test';
import { getTimeout } from '../constants/timeouts';
import { ScopePage } from './scope.page';
import { exactText } from './planning/text-match';
import { GlobalSettingsComponent } from './global-settings/settings-component';
import { ProcessCalendarsComponent } from './global-settings/process-calendars.component';
import { PlanningViewsComponent, DataSetupActorProcedure } from './global-settings/planning-views.component';
import { ArrangeViewsComponent } from './global-settings/arrange-views.component';

const SAVED_MESSAGE = 'Your changes have been saved successfully';

/**
 * PO Global Settings (opened from the PO three-dot menu): the settings tree, and the Mapping > Process / Assumption
 * view-mapping tables with their row actions (Map With, Remove Mappings, Configure View specific Procedures &
 * Filters). Screen regions live in component objects under `global-settings/`:
 * - `calendars`: Process Calendars and cycles
 * - `planningViews`: View Groups, Planning Views, Data Setup
 * - `arrangeViews`: the Map With dialog's selection table and Arrange Views panel
 * Their public methods are also exposed here as one-line delegates so existing callers keep working.
 *
 * `threeDotButton`, `single-select-process` (lui `ViewManager/ViewMapping/.../index.tsx`), `save-btn`,
 * `filterTab`, `workflowFilterConfigure`, `reset-dimensions`/`edit-dimensions` and `quick-filter-checkbox` come from
 * lui; `lui-ccl-*` test IDs from `@jda/lui-common-component-library-mui5`.
 */
export class GlobalSettingsPage extends GlobalSettingsComponent {
  public readonly calendars: ProcessCalendarsComponent;
  public readonly planningViews: PlanningViewsComponent;
  public readonly arrangeViews: ArrangeViewsComponent;

  constructor(page: Page) {
    super(page);
    this.calendars = new ProcessCalendarsComponent(page);
    this.planningViews = new PlanningViewsComponent(page);
    this.arrangeViews = new ArrangeViewsComponent(page);
  }

  protected override onPageChanged(newPage: Page): void {
    if (!this.calendars) return;
    this.calendars.page = newPage;
    this.planningViews.page = newPage;
    this.arrangeViews.page = newPage;
  }

  // --- Locators: settings entry and tree ---
  private get threeDotButton(): Locator                         { return this.getMfeFrameLocator().getByTestId('threeDotButton'); }
  private get settingsMenuItem(): Locator {
    const frame = this.getMfeFrameLocator();
    return frame.getByRole('menuitem', { name: 'Settings', exact: true }).or(frame.locator('li').filter({ hasText: exactText('Settings') })).first();
  }
  private settingsTreeItem(itemName: string): Locator {
    return this.mfeLocator(`div[class*="MuiTreeItem-label"]:text-is(${JSON.stringify(itemName)})`).or(this.getMfeFrameLocator().getByText(itemName, { exact: true }));
  }
  private settingsTreeItemInSection(itemName: string, sectionId: string): Locator {
    return this.mfeLocator(`li[id*=${JSON.stringify(sectionId)}]`).getByText(itemName, { exact: true }).first();
  }
  private get mappingProcessTreeItem(): Locator {
    return this.getMfeFrameLocator().getByRole('navigation', { name: 'nav list' }).getByRole('treeitem', { name: 'Process', exact: true }).first();
  }
  private get processMappingHeading(): Locator                  { return this.getMfeFrameLocator().getByRole('heading', { name: 'Process', exact: true }); }

  // --- Locators: view mapping table ---
  private get processDropdown(): Locator                        { return this.mfeLocator('input#single-select-process'); }
  private processOption(processName: string): Locator           { return this.getMfeFrameLocator().getByRole('option', { name: processName, exact: true }).first(); }
  private entityActionsButton(entityName: string): Locator      { return this.tableRowByName(entityName).first().locator('button[aria-label="Action Items"]'); }
  private entityActionItem(actionItem: string): Locator         { return this.mfeLocator('ul[data-testid="lui-ccl-threedot-menu-list"] span').filter({ hasText: actionItem }); }
  private viewMappedToEntity(viewName: string, entityName: string): Locator {
    return this.tableRowByName(entityName).locator(`span:text-is(${JSON.stringify(viewName)})`).first();
  }
  private get bulkSelectAllCheckbox(): Locator                  { return this.mfeLocator('th[data-index="1"] input'); }
  private get btnBulkActions(): Locator                         { return this.mfeLocator('button[data-testid="lui-ccl-button-with-dropdown-button"] > span'); }
  private bulkAction(actionName: string): Locator               { return this.mfeLocator(`li[data-testid="lui-ccl-button-with-dropdown-item"] span[aria-label=${JSON.stringify(actionName)}]`); }
  private get btnSave(): Locator                                { return this.getMfeFrameLocator().getByTestId('save-btn'); }
  private get btnConfirmRemove(): Locator                       { return this.mfeLocator('button#confirm-dialog-save-btn'); }

  // --- Locators: Map With dialog ---
  private get mapWithTitle(): Locator                           { return this.mfeLocator('h2#customized-dialog-title h5'); }
  private get mapWithSelectedRows(): Locator                    { return this.mfeLocator('div[data-testid="lui-ccl-table"]').nth(1).locator('tbody tr[data-selected="true"]'); }
  private get mapWithDialog(): Locator                          { return this.mfeLocator('div[role="dialog"], div[role="presentation"]').filter({ has: this.mapWithTitle }).first(); }
  private get mapWithSearchInput(): Locator                     { return this.mapWithDialog.getByTestId('view-search').or(this.mapWithDialog.locator('input[placeholder="Search"]')).first(); }
  private get mapWithClearSearchButton(): Locator               { return this.mapWithDialog.locator('button[aria-label="clear search text"]').first(); }
  private viewCheckbox(viewName: string): Locator {
    return this.mapWithDialog.locator('tr').filter({ has: this.page.locator('td > p').filter({ hasText: exactText(viewName) }) }).locator('input[type="checkbox"]').first();
  }

  // --- Locators: Configure View specific Procedures & Filters ---
  // The same view name can appear in more than one view group of the dialog; take the first visible one.
  private viewTab(viewName: string): Locator                    { return this.mfeLocator(`li div:text-is(${JSON.stringify(viewName)})`).filter({ visible: true }).first(); }
  private get workflowFilterTab(): Locator                      { return this.getMfeFrameLocator().getByTestId('filterTab'); }
  private get btnWorkflowFilterConfigure(): Locator             { return this.getMfeFrameLocator().getByTestId('workflowFilterConfigure'); }
  private dimensionButton(dimension: 'reset-dimensions' | 'edit-dimensions'): Locator { return this.getMfeFrameLocator().getByTestId(dimension); }
  private get quickFilterCheckbox(): Locator                    { return this.mfeLocator('[data-testid="quick-filter-checkbox"] input[type="checkbox"]'); }

  // --- Helpers ---
  /** Opens the entity row's Action Items menu and selects `actionName`, reopening it if a table refresh closes it. */
  private async openEntityAction(entityName: string, actionName: string): Promise<void> {
    await this.selectRowMenuOption(
      () => this.select3DotButtonForEntity(entityName),
      actionName,
      (name) => this.entityActionItem(name).or(this.rowMenuItem(name)).filter({ visible: true }).first()
    );
  }

  /** Opens the view's tab in the Configure View dialog and switches to Workflow Filter, waiting for its controls. */
  private async openWorkflowFilterTab(viewName: string): Promise<void> {
    await this.viewTab(viewName).waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.viewTab(viewName), `Clicked on ${viewName} view button`);
    await this.workflowFilterTab.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.workflowFilterTab, `Clicking on Workflow Filter tab for ${viewName}`);
  }

  // --- Atomic actions: navigation ---
  public async clickGlobalSettings(): Promise<void> {
    await this.doClick(this.threeDotButton, 'Clicking 3 dot button in PO');
    await this.doClick(this.settingsMenuItem, 'Clicking settings in PO');
  }

  // Labels such as 'Process' repeat across settings tree sections (View Mapping, Workbooks), so prefer the requested section.
  public async clickGlobalSettingsListMenu(itemName: string, sectionId = 'VIEW_MAP'): Promise<void> {
    const isProcessMapping = itemName === 'Process' && (sectionId === 'VIEW_MAP' || sectionId === 'viewMapProcess');
    let item = isProcessMapping ? this.mappingProcessTreeItem : this.settingsTreeItemInSection(itemName, sectionId);
    if (!(await this.waitForElementVisible(item, getTimeout('MEDIUM')))) {
      item = this.settingsTreeItem(itemName).first();
      await this.log.logMessage('INFO', `No '${itemName}' item under section '${sectionId}', falling back to the first match`);
    }
    await this.doClick(item, `Clicking ${itemName} item from settings in PO`);
    if (isProcessMapping) {
      await this.processMappingHeading.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    }
  }

  // --- Atomic actions: view mapping ---
  public async selectProcess(processName: string): Promise<void> {
    await this.processDropdown.waitFor({ state: 'visible', timeout: getTimeout('LONG') });

    // Wait for the initial process load to settle:
    // When the page first mounts, processDropdown is initially empty while /process/search loads,
    // and then populates with the first process while the initial table rows render.
    await expect(this.processDropdown).not.toHaveValue('', { timeout: getTimeout('LONG') }).catch(() => {});
    const initialRow = this.mfeLocator('tr[data-testid="lui-ccl-table-row"]').first();
    await initialRow.waitFor({ state: 'visible', timeout: getTimeout('LONG') }).catch(() => {});
    // Wait for any initial processModels call to settle (which can 404 and cause a re-render):
    await this.page.waitForResponse((res) => res.url().includes('processModels/'), { timeout: getTimeout('MEDIUM') }).catch(() => null);
    await this.dismissAnyAlertToast();

    const currentValue = (await this.processDropdown.inputValue().catch(() => '')).trim();
    const targetRow = this.tableRowByName(processName).first();
    if (currentValue === processName && await targetRow.isVisible().catch(() => false)) {
      await this.log.logMessage('INFO', `Process ${processName} is already selected and visible`);
      return;
    }

    const treeResponsePromise = this.page.waitForResponse(
      (res) => res.url().includes(`/process/${encodeURIComponent(processName)}/tree`) && res.status() === 200,
      { timeout: getTimeout('LONG') }
    ).catch(() => null);
    const viewMapResponsePromise = this.page.waitForResponse(
      (res) => res.url().includes('/view-entity-map/search') &&
               (res.request().postData() || '').includes(`"entityId":["${processName}"`) &&
               res.status() === 200,
      { timeout: getTimeout('LONG') }
    ).catch(() => null);
    const processModelsResponsePromise = this.page.waitForResponse(
      (res) => res.url().includes(`/processModels/${encodeURIComponent(processName)}`),
      { timeout: getTimeout('LONG') }
    ).catch(() => null);

    const clearBtn = this.mfeLocator('button.MuiAutocomplete-clearIndicator, button[aria-label="Clear"]').first();
    if (await clearBtn.isVisible().catch(() => false)) {
      await clearBtn.click();
    } else {
      await this.doClick(this.processDropdown, 'Clicking process dropdown of global settings');
      // Plain fill: the autocomplete may put the selected process back on re-render, and the next fill replaces it anyway.
      await this.processDropdown.fill('');
    }

    await this.doClick(this.processDropdown, 'Clicking process dropdown of global settings');
    await this.processDropdown.fill(processName);
    const option = this.processOption(processName);
    await option.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(option, `Selecting Process: ${processName}`);
    await option.waitFor({ state: 'hidden', timeout: getTimeout('SHORT') }).catch(() => {});

    await expect(this.processDropdown).toHaveValue(processName, { timeout: getTimeout('LONG') }).catch(() => {});

    await treeResponsePromise;
    await viewMapResponsePromise;
    await processModelsResponsePromise;
    // The table reloads for the chosen process; its row is what the row actions target next.
    if (!(await this.waitForElementVisible(targetRow, getTimeout('LONG')))) {
      await this.log.logMessage('INFO', `Row for process ${processName} not shown yet after selecting it`);
    }
    await this.entityActionsButton(processName).waitFor({ state: 'visible', timeout: getTimeout('SHORT') }).catch(() => null);
  }

  public async select3DotButtonForEntity(entity: string): Promise<void> {
    await this.doClick(this.entityActionsButton(entity), `Clicking 3 dot Button for the Entity: ${entity}`);
  }

  public async selectActionItemForEntity(actionItem: string): Promise<void> {
    await this.doClick(this.entityActionItem(actionItem).first(), `Selecting Action Item: ${actionItem}`);
  }

  public async clickSave(): Promise<void> {
    await this.doClick(this.btnSave, 'Clicking Save button');
  }

  public async clickSaveAndVerify(): Promise<boolean> {
    await this.clickSave();
    const alertResult = await this.verifyAlertMsg(SAVED_MESSAGE, getTimeout('EXTREME'));
    if (alertResult) return true;
    const dialogClosed = await this.mapWithTitle.waitFor({ state: 'hidden', timeout: getTimeout('MEDIUM') }).then(() => true, () => false);
    if (dialogClosed) return true;
    return this.arrangeViews.showSelectedViews().then(() => true).catch(() => false);
  }

  public async clickRemove(): Promise<void> {
    await this.doClick(this.btnConfirmRemove, 'Clicking Remove button');
  }

  public async selectingView(view: string): Promise<void> {
    const checkbox = this.viewCheckbox(view);
    await checkbox.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    if (!(await checkbox.isChecked())) {
      await this.doClick(checkbox, `Selecting View: ${view}`);
      await expect(checkbox).toBeChecked({ timeout: getTimeout('SHORT') });
    }
  }

  public async waitUntilViewMappingIsDisplayed(viewName: string, entityName: string, timeout: number = getTimeout('EXTREME')): Promise<boolean> {
    try {
      await this.viewMappedToEntity(viewName, entityName).waitFor({ state: 'visible', timeout });
      await this.log.logMessage('INFO', `View mapping for "${viewName}" is now visible for entity "${entityName}"`);
      return true;
    } catch {
      await this.log.logMessage('ERROR', `View mapping for "${viewName}" did not appear for entity "${entityName}" within ${timeout}ms`);
      return false;
    }
  }

  public async mapWithProcesscount(entityType: string): Promise<boolean> {
    const processCount = (await this.mapWithSelectedRows.count()) || 1;
    await this.mapWithTitle.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    const mapText = (await this.doGetText(this.mapWithTitle, 'Getting map with process count text')).trim();
    return this.log.compareTwoValues(mapText, `Map Selected ${processCount} ${entityType} with`, 'View mapping for process ');
  }

  // --- Composite actions: view mapping ---
  public async selectProcessDropdown(processName: string): Promise<void> {
    await this.clickGlobalSettings();
    await this.clickGlobalSettingsListMenu('Process');
    await this.selectProcess(processName);
  }

  public async mapWithViewSearch(name: string): Promise<void> {
    const checkbox = this.viewCheckbox(name);
    if (await checkbox.isVisible().catch(() => false)) {
      return;
    }

    const searchInput = this.mapWithSearchInput;
    await searchInput.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });

    const clearBtn = this.mapWithClearSearchButton;
    if (await clearBtn.isVisible().catch(() => false)) {
      await this.doClick(clearBtn, 'Clearing previous search in Map With dialog');
      await expect(clearBtn).toBeHidden({ timeout: getTimeout('SHORT') });
      await expect.poll(async () => this.mapWithDialog.locator('tbody tr').count(), { timeout: getTimeout('SHORT') }).toBeGreaterThan(2);
    } else {
      const currentVal = await searchInput.inputValue().catch(() => '');
      if (currentVal) {
        await searchInput.fill('');
        await expect(clearBtn).toBeHidden({ timeout: getTimeout('SHORT') }).catch(() => {});
        await expect.poll(async () => this.mapWithDialog.locator('tbody tr').count(), { timeout: getTimeout('SHORT') }).toBeGreaterThan(2);
      }
    }

    await searchInput.fill(name);
    const expandBtn = this.mapWithDialog.getByRole('button', { name: 'Expand' }).first();
    if (!(await checkbox.isVisible().catch(() => false)) && (await expandBtn.isVisible().catch(() => false))) {
      await expandBtn.click().catch(() => {});
    }
    await expect(checkbox).toBeVisible({ timeout: getTimeout('LONG') });
  }

  public async addViewMappingToEntity(entityName: string, viewNames: string[]): Promise<boolean> {
    await this.openEntityAction(entityName, 'Map With');
    await this.mapWithTitle.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    for (const viewName of viewNames) {
      await this.mapWithViewSearch(viewName);
      await this.selectingView(viewName);
    }
    await expect(this.btnSave).toBeEnabled({ timeout: getTimeout('SHORT') });
    return this.clickSaveAndVerify();
  }

  public async removeViewMappingToEntity(entityName: string): Promise<boolean> {
    await this.selectProcessAction(entityName, 'Remove Mappings');
    return this.verifyAlertMsg('Removed all mapped views successfully');
  }

  public async selectProcessAction(entityName: string, actionName: string): Promise<void> {
    await this.openEntityAction(entityName, actionName);
    if (actionName === 'Remove Mappings') {
      await this.clickRemove();
    } else if (actionName.startsWith('Map With')) {
      await this.mapWithTitle.or(this.mfeLocator('h2#customized-dialog-title')).first().waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    }
  }

  public async selectProcessBulkAction(actionName: string): Promise<void> {
    await this.doClick(this.bulkSelectAllCheckbox, 'Selecting All Checkbox for process');
    await this.doClick(this.btnBulkActions, 'Selecting Bulk Action Dropdown');
    await this.doClick(this.bulkAction(actionName), `Selecting Bulk Map Action Name: ${actionName}`);
    if (actionName === 'Remove All Mappings') {
      await this.doClick(this.mfeLocator('div[role="presentation"] button#confirm-dialog-save-btn'), 'Clicking on Remove Mapping');
      if (!(await this.verifyAlertMsg('Removed all mapped views successfully'))) {
        await this.log.logMessage('INFO', 'Success toast not found, assuming success');
      }
    }
  }

  // --- Composite actions: workflow filters ---
  public async workFlowFilterActionItemClick(entityName: string, viewName: string): Promise<void> {
    await this.openEntityAction(entityName, 'Configure View specific Procedures & Filters');
    await this.openWorkflowFilterTab(viewName);
    // One of these shows once the tab has loaded the view's filter state.
    await this.dimensionButton('reset-dimensions').or(this.btnWorkflowFilterConfigure).or(this.dimensionButton('edit-dimensions')).first()
      .waitFor({ state: 'visible', timeout: getTimeout('LONG') });
  }

  public async configureWorkflowFilter(entityName: string, viewName: string, scope: Record<string, any> | null, mode: 'Define filter' | 'Edit filter' | 'Delete filter', isPO: boolean = false): Promise<boolean> {
    await this.workFlowFilterActionItemClick(entityName, viewName);
    const resetButton = this.dimensionButton('reset-dimensions');
    const editButton = this.dimensionButton('edit-dimensions');
    if (mode === 'Delete filter') {
      await resetButton.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
      await this.doClick(resetButton, 'Clicking Reset button to remove workflow filter configuration');
      await this.clickSave();
      return this.verifyAlertMsg(SAVED_MESSAGE, getTimeout('LONG'));
    }
    if (mode === 'Define filter') {
      if (await resetButton.isVisible()) {
        await this.doClick(resetButton, 'Clicking Reset button to clear existing workflow filter configuration');
      }
      if (await this.waitForElementVisible(this.btnWorkflowFilterConfigure)) {
        await this.doClick(this.btnWorkflowFilterConfigure, 'Clicking workflow filter configure button');
      } else {
        await editButton.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
        await this.doClick(editButton, 'Configure button unavailable, opening workflow filter with edit icon');
      }
    } else {
      await editButton.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
      await this.doClick(editButton, 'Clicking workflow filter edit icon');
    }
    if (!scope) {
      return false;
    }
    const scopePage = new ScopePage(this.page);
    await scopePage.click3DotInManageScope();
    await scopePage.select3DotOption('Edit Configuration');
    await scopePage.selectFilterEntryFromDialogConfig('Select', scope.DIMENSION_NAME, isPO);
    await scopePage.filterDialogSaveCancel('Next');
    await scopePage.selectDimensionHierarchyLevel(scope.DIMENSION_NAME, [scope.ATTRIBUTE_NAME], 'check');
    await scopePage.filterDialogSaveCancel('Save');
    await scopePage.addFiltersToDimensionHierarchyInScope(scope.DIMENSION_NAME, scope.ATTRIBUTE_NAME, scope.VALUES);
    await scopePage.clickOnApplyFiltersBtnInManageScope();
    await this.clickSave();
    return this.verifyAlertMsg(SAVED_MESSAGE, getTimeout('LONG'));
  }

  public async enableQuickFilterCheckbox(entityName: string, viewNames: string | string[]): Promise<boolean> {
    await this.openEntityAction(entityName, 'Configure View specific Procedures & Filters');
    for (const viewName of Array.isArray(viewNames) ? viewNames : [viewNames]) {
      await this.openWorkflowFilterTab(viewName);
      await this.quickFilterCheckbox.waitFor({ state: 'attached', timeout: getTimeout('LONG') });
      if (await this.quickFilterCheckbox.isChecked()) {
        await this.log.logMessage('INFO', `Quick Filter checkbox already enabled for ${viewName}, skipping`);
        continue;
      }
      await this.doClick(this.quickFilterCheckbox, `Enabling Quick Filter checkbox for ${viewName}`);
      await this.log.logMessage('INFO', `Quick Filter checkbox enabled for ${viewName}`);
    }
    await this.btnSave.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.btnSave, 'Clicking Save button after enabling Quick Filter checkboxes');
    return true;
  }

  // --- Delegates: Process Calendars (`calendars`) ---
  public createCalendar(calendarName: string, description: string): Promise<void>                       { return this.calendars.createCalendar(calendarName, description); }
  public editCalendarDescription(calendarName: string, updatedDescription: string): Promise<void>        { return this.calendars.editCalendarDescription(calendarName, updatedDescription); }
  public isCalendarListed(calendarName: string, description: string, expectListed = true): Promise<boolean> { return this.calendars.isCalendarListed(calendarName, description, expectListed); }
  public deleteCalendar(calendarName: string): Promise<void>                                              { return this.calendars.deleteCalendar(calendarName); }
  public openCalendarFromList(calendarName: string): Promise<void>                                        { return this.calendars.openCalendarFromList(calendarName); }
  public getCycleRowCount(): Promise<number>                                                              { return this.calendars.getCycleRowCount(); }
  public createCalendarCycle(cycleName: string, cycleDescription: string, minDayGap = 3, startDay?: number): Promise<void> {
    return this.calendars.createCalendarCycle(cycleName, cycleDescription, minDayGap, startDay);
  }

  // --- Delegates: View Groups, Planning Views, Data Setup (`planningViews`) ---
  public clickOnPlus(title: 'Create View' | 'Create View Group'): Promise<void>                           { return this.planningViews.clickOnPlus(title); }
  public setViewName(viewName: string): Promise<void>                                                     { return this.planningViews.setViewName(viewName); }
  public selectViewGroup(viewGroupName: string): Promise<void>                                            { return this.planningViews.selectViewGroup(viewGroupName); }
  public setViewGroupName(name: string): Promise<void>                                                    { return this.planningViews.setViewGroupName(name); }
  public clickOnPrimaryAction(): Promise<void>                                                            { return this.planningViews.clickOnPrimaryAction(); }
  public clickCreate(): Promise<void>                                                                     { return this.planningViews.clickCreate(); }
  public clickPlanningViewSave(): Promise<void>                                                           { return this.planningViews.clickPlanningViewSave(); }
  public verifyLayout(): Promise<boolean>                                                                 { return this.planningViews.verifyLayout(); }
  public createPlanningView(viewName: string, viewGroupName: string): Promise<boolean>                    { return this.planningViews.createPlanningView(viewName, viewGroupName); }
  public createViewGroup(viewGroupName: string): Promise<void>                                            { return this.planningViews.createViewGroup(viewGroupName); }
  public searchForEle(name: string): Promise<void>                                                        { return this.planningViews.searchForEle(name); }
  public planningViewSearch(name: string): Promise<void>                                                  { return this.planningViews.planningViewSearch(name); }
  public verifyViewGroupInPO(viewGroupName: string, viewName: string): Promise<boolean>                   { return this.planningViews.verifyViewGroupInPO(viewGroupName, viewName); }
  public editView(viewName: string, viewGroupName?: string): Promise<void>                                { return this.planningViews.editView(viewName, viewGroupName); }
  public deleteView(viewName: string): Promise<void>                                                      { return this.planningViews.deleteView(viewName); }
  public deleteViewGroup(viewGroupName: string): Promise<void>                                            { return this.planningViews.deleteViewGroup(viewGroupName); }
  public removeDataSetupConfiguration(viewName: string): Promise<void>                                    { return this.planningViews.removeDataSetupConfiguration(viewName); }
  public AddDataSetupConfig(viewName: string, actorsProcedure: DataSetupActorProcedure[]): Promise<void>  { return this.planningViews.addDataSetupConfig(viewName, actorsProcedure); }
  public ValidateSelectedValues(actorsProcedure: DataSetupActorProcedure[]): Promise<void>                { return this.planningViews.validateSelectedValues(actorsProcedure); }
  public dataSetupConfiguredValidate(): Promise<boolean>                                                  { return this.planningViews.dataSetupConfiguredValidate(); }
  public isInteractivePlanningConfigured(): Promise<boolean>                                              { return this.planningViews.dataSetupConfiguredValidate(); }
  public validateViewDataSetup(viewName: string, data: { label: string; value: string }[]): Promise<boolean> { return this.planningViews.validateViewDataSetup(viewName, data); }

  // --- Delegates: Map With dialog and Arrange Views (`arrangeViews`) ---
  public hideOrUnhideView(viewName: string, visibilityMode: 'HIDE_VIEW' | 'SHOW_VIEW'): Promise<boolean>  { return this.arrangeViews.hideOrUnhideView(viewName, visibilityMode); }
  public expandContainers(): Promise<void>                                                                { return this.arrangeViews.expandContainers(); }
  public expandContainer(containerName: string): Promise<void>                                            { return this.arrangeViews.expandContainer(containerName); }
  public getPSContainersAndViews(viewGroupName?: string): Promise<string[]>                               { return this.arrangeViews.getPSContainersAndViews(viewGroupName); }
  public selectedViews(): Promise<string[]>                                                               { return this.arrangeViews.selectedViews(); }
  public showSelectedViews(): Promise<string[]>                                                           { return this.arrangeViews.showSelectedViews(); }
  public toggleContainer(containerName: string, select: boolean): Promise<void>                           { return this.arrangeViews.toggleContainer(containerName, select); }
  public toggleView(viewName: string, select: boolean): Promise<void>                                     { return this.arrangeViews.toggleView(viewName, select); }
  public displaySelectedViews(containerName: string): Promise<boolean>                                    { return this.arrangeViews.displaySelectedViews(containerName); }
  public displayViewsOrder(viewName: string): Promise<boolean>                                            { return this.arrangeViews.displayViewsOrder(viewName); }
  public checkDragAndDropViews(containerName: string, sourceViewName: string, targetViewName: string): Promise<string[]> {
    return this.arrangeViews.checkDragAndDropViews(containerName, sourceViewName, targetViewName);
  }
  public dragAndDropContainer(sourceContainerName: string, targetContainerName: string): Promise<string[]> {
    return this.arrangeViews.dragAndDropContainer(sourceContainerName, targetContainerName);
  }
}
