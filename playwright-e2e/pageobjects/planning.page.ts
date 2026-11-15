import { Page, Locator, expect } from '@playwright/test';
import BasePage from './page';
import { getTimeout, TIMEOUTS } from '../constants/timeouts';
import { CommonFunctions } from '../util/common.util';
import { ViewsDrawerComponent, VIEW_TYPES } from './planning/views-drawer.component';
import { ViewActionsComponent } from './planning/view-actions.component';
import { ComponentDrawerComponent } from './planning/component-drawer.component';
import { SideNavComponent } from './planning/side-nav.component';
import { ProceduresComponent } from './planning/procedures.component';
import { PowerBarChipsComponent } from './planning/power-bar-chips.component';
import { PlaceholderFormsComponent, FormInputField } from './planning/placeholder-forms.component';
import { CommentsCollaborationComponent } from './planning/comments-collaboration.component';
import { LoadersEmptyStatesComponent } from './planning/loaders-empty-states.component';
import { AIAssistantComponent } from './planning/ai-assistant.component';
import { CardsPage } from './cards.page';
import { textContaining } from './planning/text-match';
import { ManageScenariosComponent } from './scenario/manage-scenarios.component';

export type { FormInputField } from './planning/placeholder-forms.component';

export class PlanningPage extends BasePage {
  private objCommonFunctions: CommonFunctions;
  private readonly viewTypes = VIEW_TYPES;
  public readonly viewsDrawer: ViewsDrawerComponent;
  public readonly viewActions: ViewActionsComponent;
  public readonly componentDrawer: ComponentDrawerComponent;
  public readonly sideNav: SideNavComponent;
  public readonly procedures: ProceduresComponent;
  public readonly powerBarChips: PowerBarChipsComponent;
  public readonly placeholderForms: PlaceholderFormsComponent;
  public readonly commentsCollaboration: CommentsCollaborationComponent;
  public readonly loadersEmptyStates: LoadersEmptyStatesComponent;
  public readonly aiAssistant: AIAssistantComponent;
  public readonly cards: CardsPage;

  constructor(page: Page) {
    super(page);
    this.objCommonFunctions = new CommonFunctions();
    this.cards = new CardsPage(page);
    this.viewsDrawer = new ViewsDrawerComponent(page);
    this.viewActions = new ViewActionsComponent(page);
    this.componentDrawer = new ComponentDrawerComponent(page);
    this.sideNav = new SideNavComponent(page);
    this.procedures = new ProceduresComponent(page);
    this.powerBarChips = new PowerBarChipsComponent(page);
    this.placeholderForms = new PlaceholderFormsComponent(page);
    this.commentsCollaboration = new CommentsCollaborationComponent(
      page,
      () => this.getMfeFrameLocator(),
      (cardType, fieldValue) => this.cards.performRightClickOnCardCell(cardType, fieldValue)
    );
    this.loadersEmptyStates = new LoadersEmptyStatesComponent(page, () => this.getMfeFrameLocator());
    this.aiAssistant = new AIAssistantComponent(page, () => this.getMfeFrameLocator());
  }

  protected override onPageChanged(newPage: Page): void {
    if (!this.cards) return;
    this.cards.page = newPage;
    this.viewsDrawer.page = newPage;
    this.viewActions.page = newPage;
    this.componentDrawer.page = newPage;
    this.sideNav.page = newPage;
    this.procedures.page = newPage;
    this.powerBarChips.page = newPage;
    this.placeholderForms.page = newPage;
    this.commentsCollaboration.page = newPage;
    this.loadersEmptyStates.page = newPage;
    this.aiAssistant.page = newPage;
  }

  public get viewsPanel(): Locator {
    const frame = this.getMfeFrameLocator();
    return frame.getByRole('tooltip').filter({ has: frame.getByRole('tree') }).first();
  }
  private get btnManageScenarios(): Locator            { return this.getMfeFrameLocator().getByTestId('manage-scenarios'); }
  private get lblDashboardTitle(): Locator             { return this.getMfeFrameLocator().getByTestId('app-header-block-title'); }

  private scopeFilterSection(filterName: string): Locator { return this.mfeLocator(`div[data-testid="vf-filterPanel-property-${filterName.toUpperCase()}"]`); }
  private getAppliedScopeValue(filterName: string, value: string): Locator {
    return this.scopeFilterSection(filterName).locator("span, p, div").filter({ hasText: textContaining(value) }).first();
  }

  public async waitForSpecificDashboardToBeDisplayed(viewName: string): Promise<void> {
    return this.loadersEmptyStates.waitForSpecificDashboardToBeDisplayed(viewName);
  }

  public async verifyPlanningSpaceLoadingTitle(expectedText: string = 'Setting up your page'): Promise<void> {
    return this.loadersEmptyStates.verifyPlanningSpaceLoadingTitle(expectedText);
  }

  // Parks planning-data requests so the transient loading screen can be captured.
  public async holdPlanningDataRequests(urlParts: string[] = ['planningInstance/search', 'scenarios/planningSpace', 'simulations/search']): Promise<() => Promise<void>> {
    return this.loadersEmptyStates.holdPlanningDataRequests(urlParts);
  }

  public async getVisibleLoadingIndicator(loaderText: string = 'Setting up your page'): Promise<Locator> {
    return this.loadersEmptyStates.getVisibleLoadingIndicator(loaderText);
  }

  public async waitForCaseValidationTitle(timeout: number): Promise<void> {
    return this.loadersEmptyStates.waitForCaseValidationTitle(timeout);
  }

  public async waitForPlanningSpaceLoaderToDisappear(expectedText: string = 'Setting up your page'): Promise<void> {
    return this.loadersEmptyStates.waitForPlanningSpaceLoaderToDisappear(expectedText);
  }

  public async waitForViewToBeDisplayed(): Promise<void> {
    try {
      await this.lblDashboardTitle.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    } catch (error) {
      // Name the stuck-loader case so triage doesn't see it as a generic iframe locator timeout
      if (await this.loadersEmptyStates.isPlanningSpaceLoaderVisible()) {
        throw new Error(`Planning Space stuck on the "Setting up your page" loader. ${(error as Error).message}`);
      }
      throw error;
    }
    await this.objCommonFunctions.logMessage("INFO", `View is displayed`);
  }

  public async isViewTypeSelected(viewType: typeof this.viewTypes[number]): Promise<boolean> {
    return this.viewsDrawer.isViewTypeSelected(viewType);
  }

  public async switchViewTypeAndWaitForSave(viewType: typeof this.viewTypes[number]): Promise<boolean> {
    return this.viewsDrawer.switchViewTypeAndWaitForSave(viewType);
  }

  public async isPlanningSpaceLoaderHidden(): Promise<boolean> {
    return this.loadersEmptyStates.isPlanningSpaceLoaderHidden();
  }

  public async waitForPlanningSpaceToSettle(appearTimeout?: number): Promise<boolean> {
    return this.loadersEmptyStates.waitForPlanningSpaceToSettle(appearTimeout);
  }

  public async isPlanningViewsSettingsButtonDisplayed(): Promise<boolean> {
    return this.loadersEmptyStates.isPlanningViewsSettingsButtonDisplayed();
  }

  public async selectViewInPlanning(viewName: string): Promise<void> {
    const frame = this.getMfeFrameLocator();
    const loader = frame.getByTestId('loading-overlay').or(frame.getByText('Setting up your page')).first();
    await loader.waitFor({ state: 'hidden', timeout: getTimeout('MEDIUM') }).catch(() => {});
    const currentViewTitle = (await this.lblDashboardTitle.textContent().catch(() => ''))?.trim() || '';
    if (currentViewTitle.toLowerCase() === viewName.toLowerCase()) {
      await this.objCommonFunctions.logMessage('INFO', `View "${viewName}" is already active in Planning`);
      return;
    }
    await this.clickViewDropdown();
    await this.selectAllViewsOrFavourites('All Views');
    await this.selectView(viewName);
  }

  public async selectViewByTypeAndName(viewType: typeof this.viewTypes[number], viewName: string): Promise<void> {
    await this.clickViewDropdown();
    await this.selectViewType(viewType);
    await this.selectView(viewName);
  }

  public async isViewDrawerOpen(): Promise<boolean> {
    return this.viewsDrawer.isOpen();
  }

  public async clickViewDropdown(): Promise<void> {
    await this.viewsDrawer.open();
  }

  public async closeViewsDropdown(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  public async selectViewType(viewType: typeof this.viewTypes[number]): Promise<void> {
    await this.viewsDrawer.selectViewType(viewType);
  }

  public async selectViewTypesDropDown(): Promise<void> {
    await this.viewsDrawer.openViewTypeSelect();
  }

  public async selectAllViewsOrFavourites(sViewType: string, switchToFrame: boolean = false): Promise<void> {
    if (switchToFrame) {
      await this.switchToMfe();
    }

    const viewType = this.viewTypes.find((type) => type === sViewType);
    if (!viewType) {
      throw new Error(`Unsupported view type: ${sViewType}`);
    }
    await this.viewsDrawer.switchViewType(viewType);
  }

  public async selectViewTypeOptions(viewType: typeof this.viewTypes[number]): Promise<void> {
    await this.viewsDrawer.selectViewTypeOption(viewType);
  }

  public async getAllViewTypes(): Promise<string[]> {
    return this.viewsDrawer.getViewTypes();
  }

  public async getAllViews(groupName?: string): Promise<string[]> {
    return this.viewsDrawer.getViews(groupName);
  }

  public async getPSContainersAndViews(viewGroupName?: string): Promise<string[]> {
    return this.viewsDrawer.getGroupsAndViews(viewGroupName);
  }

  public async verifyViewsMappedToContext(viewsFromPlanningSpace: string[], expectedViews: string[]): Promise<boolean> {
    const normalizedActual = viewsFromPlanningSpace.map((view) => view.trim());
    const normalizedExpected = expectedViews.map((view) => view.trim());
    const isMapped = normalizedExpected.every((expectedView) => normalizedActual.includes(expectedView));
    await this.objCommonFunctions.logMessage(
      'INFO',
      `Mapped view validation :: expected=[${normalizedExpected.join(', ')}], actual=[${normalizedActual.join(', ')}], result=${isMapped}`
    );
    return isMapped;
  }

  public async closeViewDropdown(): Promise<void> {
    await this.viewsDrawer.close();
  }

  public async selectView(viewName: string): Promise<void> {
    await this.viewsDrawer.selectView(viewName);
  }

  public async isViewPresentInDropdown(viewName: string): Promise<boolean> {
    return this.viewsDrawer.isViewListed(viewName);
  }

  public async clickViewActionsMenu(): Promise<void> {
    await this.viewActions.openMenu();
  }

  public async clickOnViewActions(actionName: string): Promise<void> {
    await this.viewActions.clickAction(actionName);
  }

  public async selectViewAction(actionName: string) {
    await this.viewActions.clickAction(actionName);
  }

  public async isViewActionVisible(actionName: string): Promise<boolean> {
    return this.viewActions.isActionListed(actionName);
  }

  public async addViewToFavourites(viewName: string): Promise<void> {
    await this.selectView(viewName);
    await this.viewActions.addToFavourites();
  }

  public async removeViewToFavourites(viewName: string): Promise<void> {
    await this.selectView(viewName);
    await this.viewActions.removeFromFavourites();
  }

  public async isViewSelected(viewName: string): Promise<boolean> {
    const view = this.viewsDrawer.viewItem(viewName);

    // Check if the view even exists/is visible to avoid a 30s timeout on negative checks
    if (!(await view.isVisible())) {
      return false;
    }

    const classAttribute = (await view.getAttribute('class').catch(() => '')) || '';
    return classAttribute.includes('Mui-selected');
  }

  public async openEditView(): Promise<void> {
    await this.viewActions.openEditView();
  }

  public async clickSaveView(): Promise<void> {
    await this.viewActions.clickSaveView();
  }

  public async saveViewIfEditing(): Promise<void> {
    await this.viewActions.saveViewIfEditing();
  }

  public async openSetDefaultScopeFilter(): Promise<void> {
    await this.viewActions.openDefaultFilterDialog();
  }

  public async openSetDefaultScopeFilterMenu(): Promise<void> {
    await this.viewActions.openDefaultFilterDialog();
  }

  public async clickDefaultScopeFilterDropdown(): Promise<void> {
    await this.viewActions.openDefaultFilterSelect();
  }

  public async selectDefaultScopeFilterOption(filterName: string): Promise<void> {
    await this.viewActions.selectDefaultFilterOption(filterName);
  }

  public async saveDefaultScopeFilter(): Promise<void> {
    await this.viewActions.saveDefaultFilter();
  }

  public async setDefaultScopeFilter(filterName: string): Promise<void> {
    await this.viewActions.setDefaultFilter(filterName);
  }

  public async setAdminDefaultScopeFilterCheckbox(checked: boolean = true): Promise<void> {
    await this.viewActions.setApplyForAllUsers(checked);
  }

  public async setAdminDefaultScopeFilter(filterName: string): Promise<void> {
    await this.viewActions.setDefaultFilter(filterName, true);
  }

  public async getViewTitleName(): Promise<string> {
    await this.lblDashboardTitle.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    const viewName = await this.doGetText(this.lblDashboardTitle, 'Getting view title name');
    await this.objCommonFunctions.logMessage("INFO", `View title name is :: ${viewName}`);
    return viewName.trim();
  }

  public async getSelectedViewName(): Promise<string> {
    const selectedViewName = await this.getViewTitleName();
    await this.objCommonFunctions.logMessage('INFO', `Selected view is :: ${selectedViewName}`);
    return selectedViewName;
  }

  public async saveViewsettings(): Promise<void> {
    await this.viewActions.saveViewSettings();
  }

  public async changeViewGroupOfView(viewName: string, targetVG: string): Promise<void> {
    await this.selectView(viewName);
    await this.viewActions.moveToViewGroup(targetVG);
  }

  public async getScenarioChipText(): Promise<string> {
    return this.powerBarChips.getScenarioChipText();
  }

  public async verifyRunDifferentScopeBtn(buttonName: string): Promise<boolean> {
    return this.loadersEmptyStates.verifyRunDifferentScopeBtn(buttonName);
  }

  public async verifyRunDifferentScenarioBtn(buttonName: string): Promise<boolean> {
    return this.loadersEmptyStates.verifyRunDifferentScenarioBtn(buttonName);
  }

  public async clickOnRunDifferentScopeOrScenarioBtn(buttonName: string): Promise<void> {
    return this.loadersEmptyStates.clickOnRunDifferentScopeOrScenarioBtn(buttonName);
  }

  public async verifySetFiltersText(processName: string): Promise<boolean> {
    return this.loadersEmptyStates.verifySetFiltersText(processName);
  }

  public async verifySetFilterBtn(optionName: string): Promise<boolean> {
    return this.loadersEmptyStates.verifySetFilterBtn(optionName);
  }

  public async verifyNoBaselineAdminActionLink(expectedText: string = 'Option Name'): Promise<boolean> {
    return this.loadersEmptyStates.verifyNoBaselineAdminActionLink(expectedText);
  }

  public async verifyNoBaselineAdminActionLinks(expectedTexts: string[]): Promise<boolean> {
    return this.loadersEmptyStates.verifyNoBaselineAdminActionLinks(expectedTexts);
  }

  public async openNoBaselineAdminActionLinkInNewTab(optionName: string = 'Option Name'): Promise<Page> {
    return this.loadersEmptyStates.openNoBaselineAdminActionLinkInNewTab(optionName);
  }

  public async verifyNoBaselineAdminState(expectedTitle: string = 'Waiting for baseline scenario', expectedLinkTexts: string[] = ['Option Name']): Promise<boolean> {
    return this.loadersEmptyStates.verifyNoBaselineAdminState(expectedTitle, expectedLinkTexts);
  }

  public async verifyNoBaselineAdminTitle(expectedTitle: string = 'Waiting for baseline scenario'): Promise<boolean> {
    return this.loadersEmptyStates.verifyNoBaselineAdminTitle(expectedTitle);
  }

  public async verifyNoBaselineUserTitle(expectedTitle: string = 'Preparing planning data'): Promise<boolean> {
    return this.loadersEmptyStates.verifyNoBaselineUserTitle(expectedTitle);
  }

  public async verifyNoViewsAdminTitle(expectedTitle: string = 'No views created yet'): Promise<boolean> {
    return this.loadersEmptyStates.verifyNoViewsAdminTitle(expectedTitle);
  }

  public async verifyNoViewsUserTitle(expectedTitle: string = 'No views to show yet'): Promise<boolean> {
    return this.loadersEmptyStates.verifyNoViewsUserTitle(expectedTitle);
  }

  public async clickNoBaselineUserActionButton(buttonText: string = 'Go to Process List'): Promise<void> {
    return this.loadersEmptyStates.clickNoBaselineUserActionButton(buttonText);
  }

  public async openNoBaselineUserActionButtonInNewTab(buttonText: string = 'Go to Process List'): Promise<Page> {
    return this.loadersEmptyStates.openNoBaselineUserActionButtonInNewTab(buttonText);
  }

  public async clickOnSetFilterBtn(optionName: string = 'Configure'): Promise<void> {
    return this.loadersEmptyStates.clickOnSetFilterBtn(optionName);
  }

  public async validateSCADropdownStatus(): Promise<boolean> {
    return this.procedures.isDropdownDisabled();
  }

  public async isActionsDropdownVisible(): Promise<boolean> {
    return this.procedures.isDropdownUsable();
  }

  public async doesDrawerOpened(titleName: string): Promise<boolean> {
    await this.componentDrawer.waitForOpen(titleName);
    return true;
  }

  public async isDrawerOpened(titleName: string): Promise<boolean> {
    return this.componentDrawer.isOpen(titleName);
  }

  public async waitForDrawerToClose(titleName: string): Promise<void> {
    await this.componentDrawer.waitForClosed(titleName);
  }

  public async pinSideDrawer(): Promise<void> {
    await this.componentDrawer.pin();
  }

  public async unpinSideDrawer(): Promise<void> {
    await this.componentDrawer.unpin();
  }

  public async isScenarioChipCorrect(text: string): Promise<boolean> {
    return this.powerBarChips.isScenarioChipCorrect(text);
  }

  public async isGlobalScopeChipDisplays(scopeName?: string): Promise<boolean> {
    return this.powerBarChips.isGlobalScopeChipDisplays(scopeName);
  }

  public async isColumnsValidated(cellValue: string, timeoutMs: number = 30000): Promise<boolean> {
    return this.cards.isColumnsValidated(cellValue, timeoutMs);
  }

  public async isBDEElementPresent(cellValue: string): Promise<boolean> {
    return this.cards.isBDEElementPresent(cellValue);
  }

  public async getDTDataInMaasChart(): Promise<string> {
    return this.cards.getDTDataInMaasChart();
  }

  public async getRowDimensionsForBDECard(rowNo: number): Promise<Record<string, Record<string, string>>> {
    return this.cards.getRowDimensionsForBDECard(rowNo);
  }

  public async verifyCardsResize(): Promise<boolean> {
    return this.cards.verifyCardsResize();
  }

  private async isScopeApplied(dimensions: Record<string, Record<string, string>>): Promise<boolean> {
    for (const filters of Object.values(dimensions)) {
      for (const [filterName, filterValue] of Object.entries(filters)) {
        const section = this.scopeFilterSection(filterName);
        await section.scrollIntoViewIfNeeded({ timeout: getTimeout('SHORT') }).catch(() => { });
        await section.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
        await this.objCommonFunctions.logMessage("INFO", `Checking if Scope section for filter ${filterName} is visible`);
        if (!(await section.isVisible().catch(() => false))) {
          await this.objCommonFunctions.logMessage("ERROR", `Scope section for filter ${filterName} is not visible in the Scope drawer`);
          return false;
        }
        await this.objCommonFunctions.logMessage("INFO", `Scope section for filter ${filterName} is visible`);
        await this.objCommonFunctions.logMessage("INFO", `Checking if filter value ${filterValue} for filter ${filterName} is visible in the Scope drawer`);
        const valueElement = this.getAppliedScopeValue(filterName, filterValue);
        await valueElement.scrollIntoViewIfNeeded({ timeout: getTimeout('SHORT') }).catch(() => { });
        await valueElement.waitFor({ state: 'visible', timeout: getTimeout('SHORT') }).catch(() => { });
        if (!(await valueElement.isVisible().catch(() => false))) {
          await this.objCommonFunctions.logMessage("ERROR", `Filter value ${filterValue} for filter ${filterName} is not visible in the Scope drawer`);
          return false;
        }
        await this.objCommonFunctions.logMessage("INFO", `Filter value ${filterValue} for filter ${filterName} is visible in the Scope drawer`);
      }
    }
    await this.objCommonFunctions.logMessage("INFO", `All specified scope filters are applied and visible in the drawer`);
    return true;
  }

  public async isScopeAppliedInDrawer(dimensions: Record<string, Record<string, string>>): Promise<boolean> {
    await this.openComponent('Scope');
    const isScopeApplied = await this.isScopeApplied(dimensions);
    await this.closeDrawer();
    return isScopeApplied;
  }

  public async clickOnContextOverrideIcon(): Promise<boolean> {
    return this.powerBarChips.clickOnContextOverrideIcon();
  }

  public async isContextOverrideDisplays(): Promise<boolean> {
    return this.powerBarChips.isContextOverrideDisplays();
  }

  public async closeContextOverridePopup(): Promise<boolean> {
    return this.powerBarChips.closeContextOverridePopup();
  }

  public async clickOnBreadCrumbLink(viewName: string): Promise<void> {
    return this.cards.clickOnBreadCrumbLink(viewName);
  }

  public async validateBreadCrumbs(viewName1: string, viewName2: string): Promise<boolean> {
    return this.cards.validateBreadCrumbs(viewName1, viewName2);
  }

  public async validateEllipsesInOverridePopup(): Promise<boolean> {
    return this.powerBarChips.validateEllipsesInOverridePopup();
  }

  public async isClearDisplays(toggleContextPopup: boolean = true): Promise<boolean> {
    return this.powerBarChips.isClearDisplays(toggleContextPopup);
  }

  public async isBackBtnDisplayed(timeout: number = getTimeout('MEDIUM')): Promise<boolean> {
    return this.viewActions.isBackButtonShown(timeout);
  }

  public async isFavouriteIconDisplayed(): Promise<boolean> {
    return this.viewActions.isFavouriteButtonShown();
  }

  public async clickOnBackArrowOfHiddenView(): Promise<void> {
    await this.viewActions.clickBack();
  }

  public async clickScopeChip(): Promise<void> {
    return this.powerBarChips.clickScopeChip();
  }

  public async openScopeFilterByChip(): Promise<void> {
    return this.powerBarChips.openScopeFilterByChip();
  }

  public async closeDrawer(): Promise<void> {
    await this.componentDrawer.close();
  }

  public async isNavigatedToView(viewName: string) {
    return this.loadersEmptyStates.isNavigatedToView(viewName);
  }

  public async goToManageScenarios(): Promise<void> {
    await this.objCommonFunctions.logMessage("INFO", "Navigating to Manage Scenarios");
    const manageScenarios = new ManageScenariosComponent(this.page);
    if (await manageScenarios.isOpen()) {
      await this.objCommonFunctions.logMessage("INFO", "Manage Scenarios dialog is already open");
      return;
    }
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.openComponent("Scenarios");
        await this.clickManageScenarios();
        await manageScenarios.waitForOpen();
        return;
      } catch (error) {
        await this.objCommonFunctions.logMessage("INFO", `Attempt ${attempt}/${maxAttempts} to navigate to Manage Scenarios failed: ${(error as Error).message}. Retrying...`);
        await this.dismissAnyAlertToast();
        if (await manageScenarios.isOpen()) {
          return;
        }
      }
    }
    await manageScenarios.waitForOpen(getTimeout('LONG'));
  }

  public async clickManageScenarios(): Promise<void> {
    await this.btnManageScenarios.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.btnManageScenarios, "Clicking Manage Scenarios button");
  }

  public async selectSupplyChainProceduresAction(actionName: string): Promise<boolean> {
    await this.procedures.runFromDropdown(actionName);
    return true;
  }

  public async selectSupplyChainAction(actionName: string) {
    await this.procedures.clickDropdownItem(actionName);
  }

  public async isHistoryIconExistsInPowerbar(): Promise<boolean> {
    return this.procedures.isHistoryButtonShown();
  }

  public async openSCPListFromPowerBar(): Promise<void> {
    await this.procedures.openHistory();
  }

  public async isSCPHistoryPanelOpen(): Promise<boolean> {
    await this.procedures.waitForHistoryRows();
    return true;
  }

  public async getProcedureNameOfLatestSCP(): Promise<string> {
    return this.procedures.getLatestProcedureName();
  }

  public async getScenarioNameOfLatestSCP(): Promise<string> {
    return this.procedures.getLatestScenarioName();
  }

  public async clickOnLatestSCPFromList(): Promise<void> {
    await this.procedures.openLatest();
  }

  public async getProcedureNameInDetailsPage(): Promise<string> {
    return this.procedures.getDetailsProcedureName();
  }

  public async getScenarioNameInDetailsPage(): Promise<string> {
    return this.procedures.getDetailsScenarioName();
  }

  public async isStatusDisplayedInDetails(statusText: string): Promise<boolean> {
    await this.objCommonFunctions.logMessage("INFO", `Expected status text: ${statusText}`);
    const actualStatusText = await this.procedures.getDetailsStatus();
    await this.objCommonFunctions.logMessage("INFO", `Actual status text: ${actualStatusText}`);
    return actualStatusText === statusText;
  }

  public async goBackToSCPList(): Promise<void> {
    await this.procedures.backToList();
  }

  public async setStatusFilterInSCPList(status: string): Promise<void> {
    await this.procedures.filterByStatus(status);
  }

  public async setProcedureFilterInSCPList(procedure: string): Promise<void> {
    await this.procedures.filterByProcedure(procedure);
  }

  public async getProcedureStatusesFromSCPList(): Promise<string[]> {
    return this.procedures.getStatuses();
  }

  public async getProcedureNamesFromSCPList(): Promise<string[]> {
    return this.procedures.getProcedureNames();
  }

  public async closeSCPList(): Promise<void> {
    await this.procedures.closeHistory();
  }

  public async closePopupModal(): Promise<boolean> {
    return this.placeholderForms.closePopupModal();
  }

  public async closeWizard(): Promise<boolean> {
    return this.placeholderForms.closeWizard();
  }

  public async fillFormData(inputFields: FormInputField[]): Promise<void> {
    return this.placeholderForms.fillFormData(inputFields);
  }

  public async checkViewExistsWithViewGroup(viewGroupName: string, viewName: string) {
    return this.viewsDrawer.isViewInGroup(viewGroupName, viewName);
  }

  public async expandAllViewGroup(): Promise<void> {
    await this.viewsDrawer.expandAllGroups();
  }

  public async minimizeAllViewGroup(): Promise<void> {
    await this.viewsDrawer.collapseAllGroups();
  }

  public async areAllViewGroupsExpanded(): Promise<boolean> {
    return this.viewsDrawer.areAllGroupsExpanded();
  }

  public async areAllViewGroupsCollapsed(): Promise<boolean> {
    return this.viewsDrawer.areAllGroupsCollapsed();
  }

  public async validateSideNavThreeDotsMenu(): Promise<boolean> {
    return this.sideNav.hasMoreMenuOptions(['Process Settings', 'CBP Observability', 'BYDM Workbench', 'MaaS Command Center']);
  }

  public async validatePowerBarSettingsIcon(): Promise<boolean> {
    return this.powerBarChips.validatePowerBarSettingsIcon();
  }

  public async isProcessChipCorrect(text: string): Promise<boolean> {
    return this.powerBarChips.isProcessChipCorrect(text);
  }

  public async getLaunchedProcessFromPowerbar(): Promise<string | boolean> {
    return this.powerBarChips.getLaunchedProcessFromPowerbar();
  }

  public async getLaunchedSubProcessFromPowerbar(): Promise<string | boolean> {
    return this.powerBarChips.getLaunchedSubProcessFromPowerbar();
  }

  public async getUnAuthorizedErrorMsg(): Promise<string> {
    return this.loadersEmptyStates.getUnAuthorizedErrorMsg();
  }

  public async Processlist(): Promise<void> {
    await this.sideNav.openProcessFromList('PSAutomation');
  }

  public async clickOnListingIcon(): Promise<void> {
    await this.sideNav.openListing();
  }

  public async goToPOListingPageAndVerify(): Promise<string> {
    await this.sideNav.openAllProcesses();
    return await this.getViewTitleName();
  }

  /** Waits for the Planning Space frame to be attached; locators already resolve inside it. */
  public async switchToMfe(): Promise<void> {
    await this.objCommonFunctions.logMessage("INFO", "Switching to MFE frame context");
    await this.getMfeFrameLocator().locator('body').waitFor({ state: 'attached', timeout: getTimeout('EXTREME') });
  }

  public async openComponent(componentName: string): Promise<boolean> {
    return this.componentDrawer.open(componentName);
  }

  public async clickApply(): Promise<void> {
    await this.componentDrawer.applyScenarios();
  }

  public async clickOnDashboardRefreshBtn(): Promise<boolean> {
    return this.cards.clickOnDashboardRefreshBtn();
  }

  public async waitForPivotCardToLoad(timeout: number = getTimeout('LONG')): Promise<void> {
    return this.cards.waitForPivotCardToLoad(timeout);
  }

  public async scrollPivotResourceRowIntoView(resourceName: string, maxScrollAttempts: number = 30, scrollStep: number = 200): Promise<boolean> {
    return this.cards.scrollPivotResourceRowIntoView(resourceName, maxScrollAttempts, scrollStep);
  }

  public async performRightClickOnCardCell(cardType: 'PieChart' | 'PivotCard', fieldValue: string): Promise<boolean> {
    return this.cards.performRightClickOnCardCell(cardType, fieldValue);
  }

  public async performCardCellMoreActions(cardType: 'PieChart' | 'PivotCard', cellId: string, moreActionsOption: string): Promise<boolean> {
    return this.cards.performCardCellMoreActions(cardType, cellId, moreActionsOption);
  }

  public async selectPivotView(optionName: string): Promise<void> {
    return this.cards.selectPivotView(optionName);
  }
  public async isFlyoutOpen(): Promise<boolean> {
    return this.placeholderForms.isFlyoutOpen();
  }

  public async createCloneMember(): Promise<boolean> {
    return this.placeholderForms.createCloneMember();
  }

  public async clickOnCancelIcon(): Promise<void> {
    return this.placeholderForms.clickOnCancelIcon();
  }

  public async createMemberForm(formData: any[], mode: 'choose' | 'ref-assortment', placeholderType: 'Member' | 'Intersection'): Promise<void> {
    return this.placeholderForms.createMemberForm(formData, mode, placeholderType);
  }

  public async validateDimesionsInUI(expectedDimensions: string[]): Promise<boolean> {
    return this.placeholderForms.validateDimesionsInUI(expectedDimensions);
  }

  public async clickOnAddCommentActionOnCardCell(cardType: 'PieChart' | 'PivotCard', fieldValue: string): Promise<void> {
    return this.commentsCollaboration.clickOnAddCommentActionOnCardCell(cardType, fieldValue);
  }

  public async sendComment(): Promise<void> {
    return this.commentsCollaboration.sendComment();
  }

  public async addCommentInCardCell(comment: string, tagUser: string = ''): Promise<void> {
    return this.commentsCollaboration.addCommentInCardCell(comment, tagUser);
  }

  public async tagUserInComment(userName: string): Promise<void> {
    return this.commentsCollaboration.tagUserInComment(userName);
  }

  public async editCommentInCardCell(oldComment: string, newComment: string, isUserTagging: boolean = false): Promise<void> {
    return this.commentsCollaboration.editCommentInCardCell(oldComment, newComment, isUserTagging);
  }

  public async openCommentsPanel(): Promise<void> {
    return this.commentsCollaboration.openCommentsPanel();
  }

  public async checkCommentExist(comment: string): Promise<boolean> {
    return this.commentsCollaboration.checkCommentExist(comment);
  }

  public async searchCommentInThepannel(comment: string): Promise<void> {
    return this.commentsCollaboration.searchCommentInThepannel(comment);
  }

  public async performActionOnCommentIfExists(action: string): Promise<boolean> {
    return this.commentsCollaboration.performActionOnCommentIfExists(action);
  }

  public async selectActionOnComment(comment: string, action: string): Promise<boolean> {
    return this.commentsCollaboration.selectActionOnComment(comment, action);
  }

  public async editComment(comment: string, editedComment: string): Promise<boolean> {
    return this.commentsCollaboration.editComment(comment, editedComment);
  }

  public async deleteComment(comment: string): Promise<boolean> {
    return this.commentsCollaboration.deleteComment(comment);
  }

  public async getCommentDetails(): Promise<Record<string, Record<string, string>>> {
    return this.commentsCollaboration.getCommentDetails();
  }

  public async closeCommentsPanel(): Promise<void> {
    return this.commentsCollaboration.closeCommentsPanel();
  }

  public async performCellThreadAction(action: string): Promise<void> {
    return this.commentsCollaboration.performCellThreadAction(action);
  }

  public async performCellCommentAction(comment: string, action: string): Promise<void> {
    return this.commentsCollaboration.performCellCommentAction(comment, action);
  }

  public async isLiveblocksAvatarGroupDisplayed(): Promise<boolean> {
    return this.commentsCollaboration.isLiveblocksAvatarGroupDisplayed();
  }

  public async getLiveblocksAvatarCount(): Promise<number> {
    return this.commentsCollaboration.getLiveblocksAvatarCount();
  }

  public async getLiveblocksAvatarLabels(): Promise<string[]> {
    return this.commentsCollaboration.getLiveblocksAvatarLabels();
  }

  public async verifyViewIsDirty(viewName: string, cardsDirtyCount: number): Promise<boolean> {
    return this.cards.verifyViewIsDirty(viewName, cardsDirtyCount);
  }

  public async clickOnDirtyStatePopupButton(buttonName: string): Promise<void> {
    return this.cards.clickOnDirtyStatePopupButton(buttonName);
  }

  public async scenarioBudgeExist(): Promise<boolean> {
    return this.powerBarChips.scenarioBudgeExist();
  }

  public async verifyBudgeIsDefault(defaultScenario: string): Promise<boolean> {
    return this.powerBarChips.verifyBudgeIsDefault(defaultScenario);
  }

  public async getBudgeCount(): Promise<number> {
    return this.powerBarChips.getBudgeCount();
  }

  public async checkBudgeCountUI(): Promise<boolean> {
    return this.powerBarChips.checkBudgeCountUI();
  }

  public async budgeClickedScenarioOpened(): Promise<boolean> {
    return this.powerBarChips.budgeClickedScenarioOpened();
  }

  public async getBudgeTooltip(): Promise<string> {
    return this.powerBarChips.getBudgeTooltip();
  }

  public async getBudgeText(): Promise<string> {
    return this.powerBarChips.getBudgeText();
  }

  public async validateToolTipText(budgeCount: number, toolTipText: string): Promise<boolean> {
    return this.powerBarChips.validateToolTipText(budgeCount, toolTipText);
  }

  public async getScopeNameFromPowerBar(): Promise<string> {
    return this.powerBarChips.getScopeNameFromPowerBar();
  }

  public async waitForScopeNameInPowerBar(expectedScopeName: string, timeout: number = getTimeout('XLARGE')): Promise<string> {
    return this.powerBarChips.waitForScopeNameInPowerBar(expectedScopeName, timeout);
  }

  public async verifyScopeInBudgeAndVF(scopeNameInVF: string): Promise<boolean> {
    return this.powerBarChips.verifyScopeInBudgeAndVF(scopeNameInVF);
  }

  public async toggleMinimizeIcon(): Promise<boolean> {
    return this.cards.toggleMinimizeIcon();
  }

  public async clearContext(): Promise<boolean> {
    return this.powerBarChips.clearContext();
  }

  public async openCollaborationRoomPanel(): Promise<void> {
    return this.commentsCollaboration.openCollaborationRoomPanel();
  }

  public async createCollaborationRoom(): Promise<void> {
    return this.commentsCollaboration.createCollaborationRoom();
  }

  public async getContextDataFromUI(entity: string, entityName: string, viewId?: string, viewName?: string): Promise<{ entity: string; entityName: string; viewId: string; viewName: string; }> {
    return this.commentsCollaboration.getContextDataFromUI(entity, entityName, viewId, viewName);
  }

  public async getAssumptionIdFromCollaborationRoom(entityId: string): Promise<string> {
    return this.commentsCollaboration.getAssumptionIdFromCollaborationRoom(entityId);
  }

  public async getContextDataFromURL(entity: string | number, _entityName: string | number): Promise<string> {
    return this.commentsCollaboration.getContextDataFromURL(entity, _entityName);
  }

  public async getViewId(currentUrl: string): Promise<string> {
    return this.commentsCollaboration.getViewId(currentUrl);
  }

  public async closeCollaborationPanel(): Promise<void> {
    return this.commentsCollaboration.closeCollaborationPanel();
  }

  public async verifyPortalBYOICon(): Promise<boolean> {
    return this.aiAssistant.verifyPortalBYOICon();
  }

  public async clickPortalBYOIcon(): Promise<void> {
    return this.aiAssistant.clickPortalBYOIcon();
  }

  public async selectBYOAgent(agentName: string): Promise<void> {
    return this.aiAssistant.selectBYOAgent(agentName);
  }

  public async initiateBYOAgentEvent(agentName: string, eventName: string): Promise<void> {
    return this.aiAssistant.initiateBYOAgentEvent(agentName, eventName);
  }

  public async selectCardInTabbedCard(cardName: string): Promise<void> {
    return this.cards.selectCardInTabbedCard(cardName);
  }

  public async getCountOfMaasChartIcons(): Promise<number> {
    return this.cards.getCountOfMaasChartIcons();
  }

  public async getCountOfMaasPivotIcons(): Promise<number> {
    return this.cards.getCountOfMaasPivotIcons();
  }

  public async verifyQuickFilterConfig(quickFilter: Array<string>): Promise<boolean> {
    return this.cards.verifyQuickFilterConfig(quickFilter);
  }

  public async verifyCardsInDashboard(cards: Array<string> | string): Promise<boolean> {
    return this.cards.verifyCardsInDashboard(cards);
  }

  public async isContextOverrideHidden(): Promise<boolean> {
    return this.powerBarChips.isContextOverrideHidden();
  }

  public async isFilterDetailsDisplays(): Promise<boolean> {
    return this.powerBarChips.isFilterDetailsDisplays();
  }

  public async checkMergeScopeLogic(context: Record<string, any>, workflowFilters: Record<string, any>): Promise<boolean> {
    return this.powerBarChips.checkMergeScopeLogic(context, workflowFilters);
  }

  public async showFilterDetails(workflowFilter: { DIMENSION_NAME: string; ATTRIBUTE_NAME: string; VALUES: string[] }): Promise<boolean> {
    return this.powerBarChips.showFilterDetails(workflowFilter);
  }

  public async closeWorkflowFilterDetails(): Promise<boolean> {
    return this.powerBarChips.closeWorkflowFilterDetails();
  }

  public async isDataSyncButtonExists(): Promise<boolean> {
    return this.cards.isDataSyncButtonExists();
  }

  public async getIndexOfContainer(containerId: string): Promise<number> {
    const index = await this.mfeLocator('[data-testid^="viewsList-"]').evaluateAll(
      (elements, id) =>
        elements.findIndex(el =>
          el.getAttribute("data-testid")?.startsWith(`viewsList-${id}`)
        ),
      containerId
    );
    return index;
  }
}


