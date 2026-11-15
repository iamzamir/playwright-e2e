import { Page, Locator, expect } from '@playwright/test';
import BasePage from './page';
import { CommonFunctions } from '../util/common.util';
import { getTimeout, TIMEOUTS } from '../constants/timeouts';
import { ViewActionsComponent } from './planning/view-actions.component';
import { CardGalleryComponent } from './cards/card-gallery.component';
import { CardSettingsComponent, CardSubscription } from './cards/card-settings.component';
import { DashboardCardsComponent } from './cards/dashboard-cards.component';
import { CardCellsComponent, CellCardType } from './cards/card-cells.component';
import { ScenarioComparisonComponent, RankedScenario } from './cards/scenario-comparison.component';

export type { CardSubscription } from './cards/card-settings.component';

/**
 * Cards in a Planning view. The card gallery lives in `gallery`, card settings and configuration forms in
 * `settings`, cards rendered in the view in `dashboard`, cell-level actions (inline edit, right click, drill-through,
 * breadcrumbs, dirty state) in `cells`, and the scenario comparison card in `scenarioComparison`. The methods below
 * delegate to them and keep their existing signatures. This class keeps the view-level steps around cards: edit
 * mode, save, and Duplicate View (moved here from the removed `pages-and-blocks.page.ts`).
 */
export class CardsPage extends BasePage {
  private objCommonFunctions: CommonFunctions;
  private readonly viewActions: ViewActionsComponent;
  public readonly gallery: CardGalleryComponent;
  public readonly settings: CardSettingsComponent;
  public readonly dashboard: DashboardCardsComponent;
  public readonly cells: CardCellsComponent;
  public readonly scenarioComparison: ScenarioComparisonComponent;

  constructor(page: Page) {
    super(page);
    this.objCommonFunctions = new CommonFunctions();
    this.viewActions = new ViewActionsComponent(page);
    this.gallery = new CardGalleryComponent(page);
    this.settings = new CardSettingsComponent(page);
    this.dashboard = new DashboardCardsComponent(page);
    this.cells = new CardCellsComponent(page);
    this.scenarioComparison = new ScenarioComparisonComponent(page);
  }

  protected override onPageChanged(newPage: Page): void {
    if (!this.gallery) return;
    this.viewActions.page = newPage;
    this.gallery.page = newPage;
    this.settings.page = newPage;
    this.dashboard.page = newPage;
    this.cells.page = newPage;
    this.scenarioComparison.page = newPage;
  }

  // Locators
  /** Header Save of a view in edit mode (`@by/lui-dashboard-library`, rendered only in edit mode). */
  private get btnSaveView(): Locator { return this.mfeLocator('button[data-testid="lui-dashboard-header-save-button"]'); }
  private viewHeading(heading: string): Locator {
    return this.mfeLocator(`:is(span, h2):text-is(${JSON.stringify(heading)})`).filter({ visible: true }).first();
  }
  private get duplicateViewDialog(): Locator { return this.getMfeFrameLocator().getByRole('dialog', { name: /Duplicate View/i }); }

  // View edit mode and save
  /** Opens the view in edit mode from "More actions"; true once the edit-mode Save shows (or already showed). */
  public async clickEditView(): Promise<boolean> {
    if (await this.btnSaveView.isVisible()) {
      await this.objCommonFunctions.logMessage('INFO', 'View is already in edit mode');
      return true;
    }
    try {
      await this.viewActions.openEditView();
      await this.btnSaveView.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
      await this.objCommonFunctions.logMessage('INFO', 'Clicked Edit View Option');
      return true;
    } catch (error) {
      await this.objCommonFunctions.logMessage('INFO', `Edit View did not open: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /** Saves the view and waits for it to leave edit mode. */
  public async saveCardInView(): Promise<void> {
    await this.btnSaveView.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(this.btnSaveView, 'Clicking on Save Button');
    await this.btnSaveView.waitFor({ state: 'hidden', timeout: getTimeout('XLARGE') }).catch(() => undefined);
  }

  public async verifyCardInView(cardTitle: string, viewName: string, editMode: boolean = false): Promise<boolean> {
    const heading = `${editMode ? 'Edit ' : ''}${viewName}`;
    await this.viewHeading(heading).waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    const isCardShown = await this.dashboard.isTitleShown(cardTitle);
    await this.objCommonFunctions.logMessage('INFO', `Is Card with title ${cardTitle} exist in ${viewName} :: ${isCardShown}`);
    return isCardShown;
  }

  /** True when the view heading shows, the view is back in view mode ("More actions" shown) and the card is on it. */
  public async verifyCardAfterSavingDashboard(cardTitle: string, viewName: string): Promise<boolean> {
    await this.viewHeading(viewName).waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    const isViewMode = await this.viewActions.waitForMenuButton(getTimeout('EXTREME'));
    const isCardShown = await this.dashboard.isCardShown(cardTitle);
    await this.objCommonFunctions.logMessage('INFO', `Is ${viewName} shown in view mode :: ${isViewMode}, with card ${cardTitle} :: ${isCardShown}`);
    return isViewMode && isCardShown;
  }

  /**
   * Duplicates the current view from "More actions" and waits for the success toast or the new view's name. A
   * closed dialog alone is not success: on a partial copy the app closes it and warns "Duplication completed, but not
   * everything transferred" (INTEROP 2026-10-18), and the copy did not show in All Views, so that warning fails here.
   */
  public async duplicateCurrentView(duplicateViewName: string): Promise<void> {
    await this.viewActions.clickAction('Duplicate View');
    const dialog = this.duplicateViewDialog;
    await dialog.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    const nameInput = dialog.getByLabel('View Name');
    await expect(async () => {
      await nameInput.fill(duplicateViewName);
      await expect(nameInput).toHaveValue(duplicateViewName, { timeout: getTimeout('TINY') });
    }).toPass({ timeout: getTimeout('XLARGE') });
    const btnDuplicate = dialog.getByRole('button', { name: 'Duplicate' });
    await expect(btnDuplicate).toBeEnabled({ timeout: getTimeout('MEDIUM') });
    await this.doClick(btnDuplicate, 'Clicking Duplicate View Button');
    const successToast = this.getMfeFrameLocator().getByText('View duplicated successfully.');
    const partialToast = this.getMfeFrameLocator().getByText(/Duplication completed, but not everything transferred/i).first();
    const newViewName = this.getMfeFrameLocator().getByText(duplicateViewName, { exact: true }).first();
    let outcome = '';
    await expect.poll(async () => {
      if (await successToast.isVisible()) outcome = 'success toast';
      else if (await newViewName.isVisible()) outcome = 'new view name';
      else if (await partialToast.isVisible()) outcome = 'partial';
      return outcome;
    }, { timeout: getTimeout('EXTREME'), intervals: [TIMEOUTS.POLL_INTERVAL] }).not.toBe('');
    if (outcome === 'partial') {
      throw new Error(`Duplicating to "${duplicateViewName}" only partly completed: ${((await partialToast.textContent()) ?? '').trim()}`);
    }
    await this.objCommonFunctions.logMessage('INFO', `Duplicated view successfully (${outcome})`);
  }

  // Card gallery
  public async clickAddCardButton(): Promise<void> {
    await this.gallery.open('Card');
  }

  public async addCardOrContainer(type: 'Card' | 'Container'): Promise<boolean> {
    await this.gallery.open(type);
    return true;
  }

  public async addAnotherCardOrContainer(type: 'Card' | 'Container'): Promise<boolean> {
    return this.addCardOrContainer(type);
  }

  public async clickCreateCardButton(): Promise<void> {
    await this.gallery.clickCreateCard();
  }

  public async clickCreateCardBtn(): Promise<boolean> {
    await this.gallery.clickCreateCard();
    return true;
  }

  public async getAllCardNames(): Promise<string[]> {
    return this.gallery.getCardTypeNames();
  }

  public async clickOnCreateCardInItemGallery(cardName: string): Promise<boolean> {
    await this.gallery.selectCardType(cardName);
    return true;
  }

  public async setCardSettingsTitleInput(value: string): Promise<void> {
    await this.settings.setTitle(value);
  }

  public async clickPublishBtn(): Promise<void> {
    await this.settings.publish();
  }

  public async verifyCardAvailableInCardGallery(cardTitle: string): Promise<boolean> {
    return this.gallery.isCardListed(cardTitle);
  }

  public async addCardToViewFromGallery(cardTitle: string): Promise<void> {
    await this.gallery.addCardToView(cardTitle);
  }

  public async clickBackButtonInCardGallery(): Promise<void> {
    await this.gallery.close();
  }

  public async searchCardInCardGallery(cardTitle: string): Promise<void> {
    await this.gallery.search(cardTitle);
  }

  public async clickOnCheckBoxToSelectCard(cardTitle: string): Promise<void> {
    await this.gallery.selectCard(cardTitle);
  }

  public async removeCardFromGallery(cardTitle: string): Promise<boolean> {
    await this.gallery.removeCard(cardTitle);
    return true;
  }

  public async editCardInGallery(cardTitle: string, description: string): Promise<void> {
    await this.gallery.openCardSettings(cardTitle);
    await this.settings.setShortDescription(description);
    await this.settings.publish();
  }

  public async configCardInGallery(cardTitle: string, configService: string, controllerService: string): Promise<void> {
    await this.gallery.openCardSettings(cardTitle);
    await this.settings.setServices(configService, controllerService);
    await this.settings.publish();
  }

  public async editDataEndpoint(cardTitle: string, dataEndpoint: string): Promise<boolean> {
    await this.gallery.searchAndOpenCardSettings(cardTitle);
    await this.settings.setDataEndpoint(dataEndpoint);
    await this.settings.publish();
    return true;
  }

  public async editPredefinedEndpoint(cardTitle: string, endpointOption: string): Promise<boolean> {
    await this.gallery.searchAndOpenCardSettings(cardTitle);
    await this.settings.setPredefinedEndpointEnabled(true);
    await this.settings.selectPredefinedEndpoint(endpointOption);
    await this.settings.publish();
    return true;
  }

  public async editMyTaskCard(cardTitle: string): Promise<boolean> {
    await this.gallery.searchAndOpenCardSettings(cardTitle);
    await this.settings.setPredefinedEndpointEnabled(true);
    await this.settings.openDataTab();
    await this.settings.selectPredefinedEndpoint('MyTasksPredefinedEndPointPost');
    await this.settings.publish();
    return true;
  }

  public async editDataAndMetadataEndpoints(cardTitle: string, dataEndpoint: string, metadataEndpoint: string): Promise<boolean> {
    await this.gallery.searchAndOpenCardSettings(cardTitle);
    await this.settings.setPredefinedEndpointEnabled(false);
    await this.settings.openDataTab();
    await this.settings.setDataEndpoint(dataEndpoint, false);
    await this.settings.setMetadataEndpoint(metadataEndpoint);
    await this.settings.publish();
    return true;
  }

  public async editTreeTableEndpoints(cardTitle: string, dataEndpoint: string, metadataEndpoint: string): Promise<boolean> {
    await this.gallery.searchAndOpenCardSettings(cardTitle);
    await this.settings.setTableEndpoints(dataEndpoint, metadataEndpoint);
    await this.settings.publish();
    return true;
  }

  public async editNpiCardEndpoint(cardTitle: string, endpointName: string): Promise<boolean> {
    await this.gallery.searchAndOpenCardSettings(cardTitle);
    await this.settings.openDataTab();
    await this.settings.selectNpiEndpoint(endpointName);
    await this.settings.publish();
    return true;
  }

  public async editCombinationDataEndpoints(cardTitle: string, endPoint1: string, endPoint2: string): Promise<boolean> {
    await this.gallery.searchAndOpenCardSettings(cardTitle);
    await this.settings.setCombinationDataEndpoints(endPoint1, endPoint2);
    await this.settings.publish();
    return true;
  }

  /** Creates an Enhanced Table card with all columns and on-row drill-through, and publishes it to the gallery. */
  public async createEnhancedTableCard(cardTitle: string, dataEndpoint: string, metadataEndpoint: string): Promise<void> {
    await this.gallery.clickCreateCard();
    await this.gallery.selectCardType('Enhanced Table');
    await this.settings.setTitle(cardTitle);
    await this.settings.configureDataEndpointMethod('POST', dataEndpoint);
    await this.settings.configureMetadataEndpointMethod('GET', metadataEndpoint);
    await this.settings.addAllColumns();
    await this.settings.enableOnRowDrillThrough();
    await this.settings.publish();
    await this.verifyAlertMsg(`${cardTitle} has been created`, getTimeout('XLARGE'));
  }

  // Card settings in the view
  public async openCardSettings(cardTitle: string): Promise<void> {
    await this.dashboard.openSettings(cardTitle);
    await this.settings.waitForSubscriptionSettings();
  }

  public async enablePageContext(cardTitle: string, view: string): Promise<boolean> {
    await this.objCommonFunctions.logMessage('INFO', `Enabling Apply Page Context for ${cardTitle} card in edit ${view}`);
    await this.dashboard.openSettings(cardTitle);
    const isEnabled = await this.settings.setApplyPageContext();
    await this.settings.saveSettings();
    return isEnabled;
  }

  public async addSubscriptionEvent(cardTitle: string): Promise<boolean> {
    await this.openCardSettings(cardTitle);
    await this.settings.addLastOptionSubscription();
    await this.settings.saveSettings();
    return true;
  }

  /** Adds named subscriptions to the card and saves its settings. */
  public async addSubscriptionsToCard(cardTitle: string, subscriptions: CardSubscription[]): Promise<void> {
    await this.openCardSettings(cardTitle);
    await this.settings.addSubscriptions(subscriptions);
    await this.settings.saveSettings();
  }

  /** Deletes the card's last subscription, saves the settings and the view; true when a row was removed. */
  public async deleteSubscription(cardTitle: string): Promise<boolean> {
    await this.openCardSettings(cardTitle);
    const isDeleted = await this.settings.deleteLastSubscription();
    await this.settings.saveSettings();
    await this.btnSaveView.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClickUsingScript(this.btnSaveView, 'Clicking on Save Button');
    return isDeleted;
  }

  public async addCustomActions(): Promise<boolean> {
    await this.settings.addContextMenuCustomAction();
    return true;
  }

  public async selectOptionFromCardThreeDotMenu(cardTitle: string, option: string): Promise<void> {
    await this.dashboard.selectMenuOption(cardTitle, option);
  }

  public async clickGoToCardConfiguration(): Promise<void> {
    await this.settings.openCardConfiguration();
  }

  public async selectPredefinedEndpoint(endpointName: string): Promise<void> {
    await this.settings.clickPredefinedEndpointSwitchOn();
    await this.settings.openDataTab();
    await this.settings.selectPredefinedEndpoint(endpointName);
  }

  public async applyAndCloseCardConfiguration(cardTitle: string = 'Bullet Chart'): Promise<void> {
    await this.settings.applyAndCloseConfiguration(cardTitle);
  }

  public async configureCardFromEditCard(cardTitle: string, predefinedEndpoint: string): Promise<boolean> {
    await this.dashboard.selectMenuOption(cardTitle, 'Edit Card');
    await this.settings.openCardConfiguration();
    await this.selectPredefinedEndpoint(predefinedEndpoint);
    await this.settings.applyAndCloseConfiguration(cardTitle);
    return true;
  }

  public async updatePositiveOrientationToMeasure(): Promise<Record<string, number>> {
    return this.settings.setFirstMeasureOrientation('Greater');
  }

  public async updateNegativeOrientationToMeasure(): Promise<Record<string, number>> {
    return this.settings.setFirstMeasureOrientation('Lesser');
  }

  // Cards in the view
  public async verifyAtleastOneCardExistInView(): Promise<boolean> {
    return this.dashboard.isAnyCardShown();
  }

  public async verifyGraphInCard(cardTitle: string): Promise<boolean> {
    return this.dashboard.isGraphShown(cardTitle);
  }

  public async verifyNetworkGraphInCard(cardTitle: string): Promise<boolean> {
    return this.dashboard.isNetworkGraphShown(cardTitle);
  }

  public async verifyTreeTableDataInCard(cardTitle: string): Promise<boolean> {
    return this.dashboard.hasTreeTableRows(cardTitle);
  }

  public async verifyNoColumnsStateInCard(cardTitle?: string): Promise<boolean> {
    return this.dashboard.isNoColumnsStateShown(cardTitle);
  }

  public async verifyDataInMyTaskCardAfterSave(cardTitle: string): Promise<boolean> {
    return this.dashboard.hasTableRows(cardTitle);
  }

  public async clickOnMyTaskTitle(cardTitle: string, rowTitle: string): Promise<void> {
    await this.dashboard.clickTableRowTitle(cardTitle, rowTitle);
  }

  public async verifyDataInNPICard(cardTitle: string): Promise<boolean> {
    return this.dashboard.hasNpiData(cardTitle);
  }

  public async verifySomethingWentWrongInCard(cardTitle: string): Promise<boolean> {
    await this.viewActions.waitForMenuButton();
    return this.dashboard.isLoadErrorShown(cardTitle);
  }

  public async verifyRefreshIconInBDE(cardName: string): Promise<boolean> {
    return this.dashboard.isRefreshIconShown(cardName);
  }

  public async verifyMinimizeIconInBDE(cardName: string): Promise<boolean> {
    return this.dashboard.isMinimizeIconShown(cardName);
  }

  public async verifySettingsIconInBDE(cardName: string): Promise<boolean> {
    return this.dashboard.isSettingsIconPresent(cardName);
  }

  public async verifyToggleIconInBDE(cardName: string, labelName: string): Promise<boolean> {
    return this.dashboard.isToolbarButtonPresent(cardName, labelName);
  }

  public async verifyPaginationInBDE(cardName: string): Promise<boolean> {
    return this.dashboard.isPaginationShown(cardName);
  }

  public async verifyFilterInputInEachColumnAvailable(cardName: string): Promise<boolean> {
    return this.dashboard.hasFilterInputForEachColumn(cardName);
  }

  public async getXAxisLabelsFromMaasChart(cardName: string): Promise<string[]> {
    return this.dashboard.getMaasChartXAxisLabels(cardName);
  }

  /**
   * Reads the chart's x-axis labels once they differ from `previousLabels`, for use right after a filter is applied
   * (the apply does not wait for the dashboard refresh). A filter can leave the labels unchanged, so after
   * MEDIUM (the old fixed 10 s sleep) the current labels are returned.
   */
  public async getXAxisLabelsAfterRefresh(cardName: string, previousLabels: string[]): Promise<string[]> {
    const previous = previousLabels.join('|');
    let labels: string[] = [];
    await expect.poll(async () => {
      labels = await this.dashboard.getMaasChartXAxisLabels(cardName).catch(() => []);
      return labels.length > 0 && labels.join('|') !== previous;
    }, { timeout: getTimeout('MEDIUM'), intervals: [TIMEOUTS.POLL_INTERVAL * 2] }).toBe(true)
      .catch(() => this.objCommonFunctions.logMessage('INFO', `${cardName} labels did not change within ${getTimeout('MEDIUM')} ms after the filter`));
    return labels.length > 0 ? labels : this.dashboard.getMaasChartXAxisLabels(cardName);
  }

  /** The chart still has data after the filter: its labels changed, or it kept a non-empty set. */
  public async verifyMaasChartLabels(labelsAfterFilter: string[], initialLabels: string[]): Promise<boolean> {
    const added = labelsAfterFilter.filter((label) => !initialLabels.includes(label));
    const removed = initialLabels.filter((label) => !labelsAfterFilter.includes(label));
    if (added.length > 0 || removed.length > 0) {
      await this.objCommonFunctions.logMessage('INFO', `Labels changed after filter. New: [${added.join(', ')}], Removed: [${removed.join(', ')}]`);
      return true;
    }
    const hasLabels = labelsAfterFilter.length > 0;
    await this.objCommonFunctions.logMessage('INFO', hasLabels
      ? `Labels unchanged after filter (${labelsAfterFilter.length} labels). Chart data persisted after filter applied.`
      : 'No labels after filter. Chart appears empty.');
    return hasLabels;
  }

  /** Saves the view, then clicks the Quarter Sales KPI and checks the card still renders. */
  public async verifyMultiKPICardRefresh(cardTitle: string): Promise<boolean> {
    await this.btnSaveView.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClickUsingScript(this.btnSaveView, 'Clicking on Save Button');
    await this.btnSaveView.waitFor({ state: 'hidden', timeout: getTimeout('XLARGE') });
    return this.dashboard.clickKpiAndVerifyHeader(cardTitle);
  }

  public async clickOnDashboardRefreshBtn(): Promise<boolean> {
    return this.dashboard.clickDashboardRefresh();
  }

  public async toggleMinimizeIcon(): Promise<boolean> {
    return this.dashboard.toggleMinimize();
  }

  public async selectCardInTabbedCard(cardName: string): Promise<void> {
    await this.dashboard.selectTab(cardName);
  }

  public async getCountOfMaasChartIcons(): Promise<number> {
    return this.dashboard.getMaasChartIconCount();
  }

  public async getCountOfMaasPivotIcons(): Promise<number> {
    return this.dashboard.getMaasPivotIconCount();
  }

  public async verifyQuickFilterConfig(quickFilter: Array<string>): Promise<boolean> {
    return this.dashboard.areQuickFilterChipsShown(quickFilter);
  }

  public async verifyCardsInDashboard(cards: Array<string> | string): Promise<boolean> {
    return this.dashboard.areCardsShown(Array.isArray(cards) ? cards : [cards]);
  }

  public async isDataSyncButtonExists(): Promise<boolean> {
    return this.dashboard.isDataSyncButtonShown();
  }

  public async verifyCardsResize(): Promise<boolean> {
    return this.dashboard.resizeCards();
  }

  // Card cells
  public async editTableCardAndVerifyButtons(cardTitle: string): Promise<boolean> {
    return this.cells.startTableEdit(cardTitle);
  }

  public async makeTableCellEditableAndSaveChanges(): Promise<boolean> {
    return this.cells.editTableCellsAndSave();
  }

  public async makeTableCellEditableAndCancelChanges(): Promise<boolean> {
    return this.cells.editTableCellsAndDiscard();
  }

  public async multipleChipsFiltering(): Promise<boolean> {
    return this.cells.filterChipsPopup();
  }

  public async editCardCell(cardType: 'PivotCard' | 'Enhanced Table', cardName: string, identifier: string = '', updatedValue: string = ''): Promise<boolean> {
    return this.cells.editCell(cardType, cardName, identifier, updatedValue);
  }

  public async editPivotCardCellValue(cardName: string, identifier: string, updatedValue: string): Promise<boolean> {
    return this.cells.editCell('PivotCard', cardName, identifier, updatedValue);
  }

  public async revertMaasPivotCardChanges(): Promise<boolean> {
    return this.cells.revertPivotChanges();
  }

  public async isColumnsValidated(cellValue: string, timeoutMs: number = getTimeout('XLARGE')): Promise<boolean> {
    return this.cells.isCellShown(cellValue, timeoutMs);
  }

  public async isBDEElementPresent(cellValue: string): Promise<boolean> {
    return this.cells.isParagraphPresent(cellValue);
  }

  public async getDTDataInMaasChart(): Promise<string> {
    return this.cells.getMaasChartFirstLabel();
  }

  public async getRowDimensionsForBDECard(rowNo: number): Promise<Record<string, Record<string, string>>> {
    return this.cells.getBdeRowDimensions(rowNo);
  }

  public async performRightClickOnCardCell(cardType: CellCardType, fieldValue: string): Promise<boolean> {
    return this.cells.rightClickCell(cardType, fieldValue);
  }

  public async performCardCellMoreActions(cardType: CellCardType, cellId: string, moreActionsOption: string): Promise<boolean> {
    return this.cells.clickCellMoreAction(cardType, cellId, moreActionsOption);
  }

  /** Selects the enhanced-table row holding `matchingText` and clicks its drill-through button. */
  public async triggerDrillThrough(matchingText: string): Promise<void> {
    await this.cells.drillThroughFromTableRow(matchingText);
  }

  /** True when every row of the drill-through target table contains `matchingText`. */
  public async verifyDrillThroughTargetTableRows(matchingText: string): Promise<boolean> {
    return this.cells.areAllTableRowsMatching(matchingText);
  }

  public async waitForPivotCardToLoad(timeout: number = getTimeout('LONG')): Promise<void> {
    await this.cells.waitForPivotToLoad(timeout);
  }

  public async scrollPivotResourceRowIntoView(resourceName: string, maxScrollAttempts: number = 30, scrollStep: number = 200): Promise<boolean> {
    return this.cells.scrollPivotRowIntoView(resourceName, maxScrollAttempts, scrollStep);
  }

  public async selectPivotView(optionName: string): Promise<void> {
    await this.cells.selectPivotView(optionName);
  }

  public async validateBreadCrumbs(viewName1: string, viewName2: string): Promise<boolean> {
    return this.cells.isBreadcrumbOrder(viewName1, viewName2);
  }

  public async clickOnBreadCrumbLink(viewName: string): Promise<void> {
    await this.cells.clickBreadcrumb(viewName);
  }

  public async verifyViewIsDirty(viewName: string, cardsDirtyCount: number): Promise<boolean> {
    return this.cells.isViewDirty(viewName, cardsDirtyCount);
  }

  public async clickOnDirtyStatePopupButton(buttonName: string): Promise<void> {
    await this.cells.clickDirtyStatePromptButton(buttonName);
  }

  // Scenario comparison card
  public async publishScenarioAction(): Promise<boolean> {
    return this.scenarioComparison.publishFirstScenario();
  }

  public async verifyHideGraphicalViewOnToggle(cardTitle: string, scenario: string): Promise<boolean> {
    return this.scenarioComparison.hideChartOnToggle(cardTitle, scenario);
  }

  public async openMeasureWeightageTargetSettings(cardTitle: string): Promise<boolean> {
    return this.scenarioComparison.openMeasureSettings(cardTitle);
  }

  public async resetMeasureWeightageTargetToDefault(cardTitle: string): Promise<boolean> {
    return this.scenarioComparison.resetMeasureSettings(cardTitle);
  }

  public async updateMeasureWeightageTarget(): Promise<void> {
    await this.scenarioComparison.updateMeasureSettings();
  }

  public async rankingScenariosCalculation(measureOrientations?: Record<string, number>): Promise<RankedScenario[]> {
    return this.scenarioComparison.rankScenarios(measureOrientations);
  }

  public async verifyScenariosRanking(scenarios: RankedScenario[]): Promise<boolean> {
    return this.scenarioComparison.isRankedInOrder(scenarios);
  }
}
