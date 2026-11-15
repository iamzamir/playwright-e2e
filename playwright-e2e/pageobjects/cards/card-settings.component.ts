import { Page, Locator, expect } from '@playwright/test';
import BasePage from '../page';
import { getTimeout } from '../../constants/timeouts';
import { CommonFunctions } from '../../util/common.util';
import { exactText } from '../planning/text-match';

export interface CardSubscription {
  subscriptionName: string;
  sourceCardName: string;
  eventName: string;
  actionName: string;
  targetViewName: string;
}

export type MeasureOrientation = 'Greater' | 'Lesser';

/**
 * Card settings and configuration forms (`@by/lui-dashboard-library` 10.10.x), opened from a gallery tile or from a
 * card's three-dot menu in edit mode. Gallery form: `lui-dashboard-card-settings-title-input`,
 * `…-title-short-description`, `cardDataConfigurationServiceTextBox` / `cardDataControllerServiceTextBox`, the Data
 * tab `verticalTab-data`, the predefined endpoint switch (`lui-portal-data-config-predefined-endpoint-switch`) and
 * select (`lui-portal-data-config-predefined-endpoint-select`), endpoint inputs `lui-portal-data-config-endpoint-url`
 * / `lui-portal-metadata-config-endpoint-url` (table cards: `lui-portal-data-endpoint-url` /
 * `lui-portal-metadata-endpoint-url`); NPI cards use `cdsp-scenario-comparison-data-config-predefined-endpoint-select`.
 * Publish / Apply is `lui-dashboard-card-admin-settings-confirm-button`, Cancel `…-cancel-button`. In-view settings:
 * `accept-page-context-subscription`, subscriptions `lui-card-configuration-subscription-setting-*`, custom actions
 * `add-new-custom-event`, measure orientation in `lui-ccl-list-collector-right-list`, Save
 * `lui-dashboard-card-settings-save-button`.
 */
export class CardSettingsComponent extends BasePage {
  private readonly log = new CommonFunctions();

  constructor(page: Page) {
    super(page);
  }

  // Locators: gallery card settings form
  private get inputTitle(): Locator               { return this.mfeLocator('input[data-testid="lui-dashboard-card-settings-title-input"]'); }
  private get inputShortDescription(): Locator    { return this.mfeLocator('input[data-testid="lui-dashboard-card-settings-title-short-description"]'); }
  private get inputConfigService(): Locator       { return this.mfeLocator('[data-testid="cardDataConfigurationServiceTextBox"] input[type="text"]'); }
  private get inputControllerService(): Locator   { return this.mfeLocator('[data-testid="cardDataControllerServiceTextBox"] input[type="text"]'); }
  private get btnPublish(): Locator               { return this.mfeLocator('button[data-testid="lui-dashboard-card-admin-settings-confirm-button"]'); }
  private get btnCancel(): Locator                { return this.mfeLocator('button[data-testid="lui-dashboard-card-admin-settings-cancel-button"]'); }
  private get tabData(): Locator                  { return this.mfeLocator('[data-testid="verticalTab-data"]'); }
  private get predefinedSwitch(): Locator         { return this.mfeLocator('[id="predefined-endpoint-switch"]'); }
  private get predefinedToggle(): Locator         { return this.mfeLocator('[data-testid="lui-portal-data-config-predefined-endpoint-switch"] input'); }
  private get predefinedSelect(): Locator         { return this.mfeLocator('[data-testid="lui-portal-data-config-predefined-endpoint-select"]'); }
  private get inputDataEndpoint(): Locator        { return this.mfeLocator('input[data-testid="lui-portal-data-config-endpoint-url"]'); }
  private get inputMetadataEndpoint(): Locator    { return this.mfeLocator('[data-testid="lui-portal-metadata-config-endpoint-url"]'); }
  private get inputTableDataEndpoint(): Locator   { return this.mfeLocator('input[data-testid="lui-portal-data-endpoint-url"]'); }
  private get inputTableMetaEndpoint(): Locator   { return this.mfeLocator('input[data-testid="lui-portal-metadata-endpoint-url"]'); }
  private get npiEndpointSearchBox(): Locator {
    return this.mfeLocator('[role="searchbox"]:has(input[data-testid="cdsp-scenario-comparison-data-config-predefined-endpoint-select"])');
  }
  private get inputNpiEndpoint(): Locator         { return this.mfeLocator('input[data-testid="cdsp-scenario-comparison-data-config-predefined-endpoint-select"]'); }
  private get btnCardConfiguration(): Locator {
    return this.getMfeFrameLocator().getByTestId('lui-dashboard-card-settings-card-configuration-button')
      .or(this.getMfeFrameLocator().getByRole('button', { name: 'Card Configuration' }))
      .first();
  }
  private get btnBackToCardEdit(): Locator        { return this.getMfeFrameLocator().getByTestId('lui-dashboard-card-admin-settings-action-back-button').first(); }
  private get btnDeleteCustomAction(): Locator    { return this.getMfeFrameLocator().getByTestId('custom-action-item-delete-action-button-0').first(); }
  private get btnAddCustomAction(): Locator       { return this.getMfeFrameLocator().getByTestId('add-new-custom-event').first(); }
  private get selectCustomActionLocation(): Locator { return this.getMfeFrameLocator().getByTestId('lui-ccl-select-select').first(); }
  private get endpointMethodSelect(): Locator     { return this.getMfeFrameLocator().getByTestId('data-endpoint-method-type-select'); }
  private get endpointMethodOptions(): Locator    { return this.getMfeFrameLocator().getByTestId('data-endpoint-method-type-option'); }
  private get metaMethodSelect(): Locator         { return this.getMfeFrameLocator().getByTestId('metadata-endpoint-method-type-select'); }
  private get metaMethodOptions(): Locator        { return this.getMfeFrameLocator().getByTestId('metadata-endpoint-method-type-option'); }
  private get btnAddAllColumns(): Locator         { return this.getMfeFrameLocator().getByTestId('attribute-list-container-add-all'); }
  private get switchOnRowDrillThrough(): Locator  { return this.getMfeFrameLocator().getByTestId('switch-enable-on-row-drill-through'); }

  private predefinedOption(name: string): Locator {
    return this.mfeLocator('li[role="option"], li[role="menuitem"]')
      .filter({ has: this.page.locator(`span:text-is(${JSON.stringify(name)})`) })
      .first();
  }
  private npiOption(name: string): Locator        { return this.getMfeFrameLocator().getByRole('menuitem', { name, exact: true }); }
  private customActionLocation(option: string): Locator { return this.getMfeFrameLocator().getByRole('option', { name: option, exact: true }).first(); }

  // Locators: in-view card settings
  private get chkApplyPageContext(): Locator      { return this.mfeLocator('span[data-testid="accept-page-context-subscription"] > input[type="checkbox"]'); }
  private get btnSaveSettings(): Locator          { return this.mfeLocator('button[data-testid="lui-dashboard-card-settings-save-button"]'); }
  private get btnAddSubscription(): Locator       { return this.mfeLocator('[data-testid="lui-card-configuration-subscription-setting-add-subscription"]'); }
  private get subscriptionNames(): Locator        { return this.getMfeFrameLocator().getByTestId('lui-card-configuration-subscription-setting-subscription-name-input'); }
  private get subscriptionCards(): Locator        { return this.mfeLocator('[data-testid="lui-card-configuration-subscription-setting-card-selection-select"]'); }
  private get subscriptionEvents(): Locator       { return this.mfeLocator('[data-testid="lui-card-configuration-subscription-setting-event-selection-select"]'); }
  private get subscriptionActions(): Locator      { return this.mfeLocator('[data-testid="lui-card-configuration-subscription-setting-action-selection-select"]'); }
  private get subscriptionTargetViews(): Locator  { return this.getMfeFrameLocator().getByTestId('lui-card-configuration-subscription-setting-add-target-view').locator('input'); }
  private get subscriptionCardOptions(): Locator  { return this.mfeLocator('[data-testid="lui-card-configuration-subscription-setting-card-selection-option"][tabindex="0"]'); }
  private get subscriptionAnyCardOptions(): Locator { return this.mfeLocator('[data-testid="lui-card-configuration-subscription-setting-card-selection-option"]'); }
  private get subscriptionEventOptions(): Locator { return this.mfeLocator('[data-testid="lui-card-configuration-subscription-setting-event-selection-option"]'); }
  private get subscriptionActionOptions(): Locator { return this.mfeLocator('[data-testid="lui-card-configuration-subscription-setting-action-selection-option"]'); }
  private get targetViewOptions(): Locator        { return this.getMfeFrameLocator().getByTestId('lui-autocomplete-dropdown-option'); }
  private get btnDeleteSubscription(): Locator    { return this.mfeLocator('[aria-label="Delete subscription"]'); }
  private get measureNames(): Locator {
    return this.getMfeFrameLocator().locator('[data-testid="lui-ccl-list-collector-right-list"] [data-testid="accordion-summary"] p');
  }
  private get measureOrientationSelect(): Locator { return this.getMfeFrameLocator().locator('[data-testid="lui-ccl-select-box"] > div').first(); }
  private measureOrientationOption(orientation: MeasureOrientation): Locator {
    return this.getMfeFrameLocator().locator(`li[data-testid="lui-ccl-select-option"][aria-label="${orientation}"]`).first();
  }

  // Helpers
  /** Waits for the form to load its saved value into the input (it can arrive after the input shows). */
  private async waitForLoadedValue(input: Locator, fieldName: string): Promise<void> {
    await input.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await expect(input).not.toHaveValue(/^\s*$/, { timeout: getTimeout('MEDIUM') })
      .catch(() => this.log.logMessage('INFO', `${fieldName} was empty while loading; continuing with update`));
  }

  private async setInputValue(input: Locator, value: string, fieldName: string): Promise<void> {
    await input.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.log.logMessage('INFO', `Setting ${value} value for ${fieldName}`);
    await expect(async () => {
      await input.click();
      await input.fill('');
      await input.fill(value);
      await expect(input).toHaveValue(value, { timeout: getTimeout('TINY') });
    }).toPass({ timeout: getTimeout('MEDIUM') });
  }

  private async waitForPredefinedToggleEnabled(): Promise<void> {
    await this.predefinedToggle.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await expect(this.predefinedToggle, 'Predefined endpoint toggle stays disabled').toBeEnabled({ timeout: getTimeout('MEDIUM') });
  }

  // Atomic actions: gallery card settings
  public async setTitle(value: string): Promise<void> {
    await this.doEnterText(this.inputTitle, value, `Setting ${value} value for title input`);
  }

  public async setShortDescription(value: string): Promise<void> {
    await this.doEnterText(this.inputShortDescription, value, `Setting ${value} value for short description input field`);
  }

  public async setServices(configService: string, controllerService: string): Promise<void> {
    await this.doEnterText(this.inputConfigService, configService, `Setting ${configService} value for configuration service input`);
    await this.doEnterText(this.inputControllerService, controllerService, `Setting ${controllerService} value for controller service input`);
  }

  public async publish(): Promise<void> {
    await this.btnPublish.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.btnPublish, 'Clicking on publish button');
  }

  public async openDataTab(): Promise<void> {
    await this.tabData.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.tabData, 'Clicking on Data tab in card settings');
  }

  /** Turns the predefined endpoint switch on or off; it stays disabled until the form has loaded. */
  public async setPredefinedEndpointEnabled(enabled: boolean): Promise<void> {
    await this.waitForPredefinedToggleEnabled();
    if ((await this.predefinedToggle.isChecked()) === enabled) {
      await this.log.logMessage('INFO', `Predefined endpoint toggle already ${enabled ? 'enabled' : 'disabled'}`);
      return;
    }
    await this.predefinedToggle.setChecked(enabled, { force: true });
    await this.log.logMessage('INFO', `${enabled ? 'Enabled' : 'Disabled'} predefined endpoint toggle`);
  }

  /** Turns the switch on with a click, as the card configuration page needs. */
  public async clickPredefinedEndpointSwitchOn(): Promise<void> {
    await this.waitForPredefinedToggleEnabled();
    if (await this.predefinedSwitch.isChecked()) {
      await this.log.logMessage('INFO', 'Predefined toggle is already enabled');
      return;
    }
    await this.doClick(this.predefinedToggle, 'Enabling predefined endpoint toggle');
  }

  public async selectPredefinedEndpoint(name: string): Promise<void> {
    await this.predefinedSelect.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.predefinedSelect, 'Clicking on predefined endpoint dropdown');
    const option = this.predefinedOption(name);
    await option.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(option, `Selecting predefined endpoint: ${name}`);
  }

  /**
   * Picks an NPI predefined endpoint. The option list re-renders while it loads and filters, which detached the
   * option between the wait and the click (CardsBatch Test_016 on CI), so open + click retry as one unit.
   */
  public async selectNpiEndpoint(name: string): Promise<void> {
    await this.npiEndpointSearchBox.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    const option = this.npiOption(name);
    let attempt = 0;
    await expect(async () => {
      attempt++;
      if (!(await option.isVisible())) {
        if (attempt === 1) {
          await this.doClick(this.npiEndpointSearchBox, 'Opening NPI endpoint dropdown');
        } else {
          await this.log.logMessage('INFO', `Searching NPI endpoint ${name} (attempt ${attempt})`);
          await this.inputNpiEndpoint.click();
          await this.inputNpiEndpoint.fill('');
          await this.inputNpiEndpoint.pressSequentially(name, { delay: 50 });
        }
      }
      await option.click({ timeout: getTimeout('SHORT') });
      await expect(this.inputNpiEndpoint).toHaveValue(name, { timeout: getTimeout('TINY') });
    }).toPass({ timeout: getTimeout('XLARGE') });
    await this.log.logMessage('INFO', `Selected ${name} predefined endpoint`);
  }

  /** Sets the data endpoint, by default after the saved value has loaded so the form does not overwrite it. */
  public async setDataEndpoint(value: string, waitForSavedValue: boolean = true): Promise<void> {
    if (waitForSavedValue) {
      await this.waitForLoadedValue(this.inputDataEndpoint.first(), 'Data input');
    }
    await this.setInputValue(this.inputDataEndpoint.first(), value, 'Data input');
  }

  public async setMetadataEndpoint(value: string): Promise<void> {
    await this.setInputValue(this.inputMetadataEndpoint, value, 'Metadata input');
  }

  /** Combination charts have one data endpoint input per chart. */
  public async setCombinationDataEndpoints(endpoint1: string, endpoint2: string): Promise<void> {
    await this.waitForLoadedValue(this.inputDataEndpoint.first(), 'Chart1 Data input');
    await this.setInputValue(this.inputDataEndpoint.nth(0), endpoint1, 'Chart1 Data input');
    await this.setInputValue(this.inputDataEndpoint.nth(1), endpoint2, 'Chart2 Data input');
  }

  public async setTableEndpoints(dataEndpoint: string, metadataEndpoint: string): Promise<void> {
    await this.waitForLoadedValue(this.inputTableDataEndpoint, 'Table data input');
    await this.setInputValue(this.inputTableDataEndpoint, dataEndpoint, 'Table data input');
    await this.waitForLoadedValue(this.inputTableMetaEndpoint, 'Table metadata input');
    await this.setInputValue(this.inputTableMetaEndpoint, metadataEndpoint, 'Table metadata input');
  }

  public async configureDataEndpointMethod(method: string, url: string): Promise<void> {
    await this.doClick(this.endpointMethodSelect, 'Clicking Data Endpoint Method Dropdown');
    await this.doClick(this.endpointMethodOptions.filter({ hasText: exactText(method) }).first(), `Selecting Data Endpoint Method: ${method}`);
    await this.setInputValue(this.inputTableDataEndpoint, url, 'Data endpoint url');
  }

  public async configureMetadataEndpointMethod(method: string, url: string): Promise<void> {
    await this.doClick(this.metaMethodSelect, 'Clicking Meta Data Endpoint Method Dropdown');
    await this.doClick(this.metaMethodOptions.filter({ hasText: exactText(method) }).first(), `Selecting Meta Data Endpoint Method: ${method}`);
    await this.setInputValue(this.inputTableMetaEndpoint, url, 'Metadata endpoint url');
  }

  public async addAllColumns(): Promise<void> {
    await this.btnAddAllColumns.scrollIntoViewIfNeeded();
    await this.doClick(this.btnAddAllColumns, 'Clicking Add All Columns Button');
  }

  public async enableOnRowDrillThrough(): Promise<void> {
    await this.switchOnRowDrillThrough.scrollIntoViewIfNeeded();
    await this.doClick(this.switchOnRowDrillThrough, 'Enabling On Row Drill Through');
  }

  // Atomic actions: card configuration page (from in-view settings)
  public async openCardConfiguration(): Promise<void> {
    await this.btnCardConfiguration.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.btnCardConfiguration, 'Clicking on card configuration');
  }

  /**
   * Applies the card configuration and closes it. Newer library versions close the page on Apply, so Cancel is
   * only clicked while it is still shown (CardsBatch Test_010 waited for it on CI and failed).
   */
  public async applyAndCloseConfiguration(cardTitle: string): Promise<void> {
    await this.btnPublish.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(this.btnPublish, 'Clicking on Apply button in card configuration');
    await this.verifyAlertMsg(`${cardTitle} has been updated successfully`);
    if (await this.btnCancel.waitFor({ state: 'visible', timeout: getTimeout('SHORT') }).then(() => true, () => false)) {
      await this.doClick(this.btnCancel, 'Clicking on Cancel button to close card configuration popup');
      return;
    }
    await this.log.logMessage('INFO', 'Card configuration closed after Apply');
  }

  /** Replaces the first custom action with a Context Menu action, applies it and goes back to the card edit form. */
  public async addContextMenuCustomAction(): Promise<void> {
    await this.openCardConfiguration();
    if (await this.btnDeleteCustomAction.isVisible()) {
      await this.doClick(this.btnDeleteCustomAction, 'Clicking on delete custom action button');
    }
    await this.btnAddCustomAction.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(this.btnAddCustomAction, 'Clicking on add custom action button');
    await this.doClick(this.selectCustomActionLocation, 'Clicking on action location dropdown');
    const contextMenu = this.customActionLocation('Context Menu');
    await contextMenu.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(contextMenu, 'Selecting Context Menu option');
    await this.btnPublish.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(this.btnPublish, 'Clicking on apply changes to card button');
    await this.btnBackToCardEdit.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(this.btnBackToCardEdit, 'Clicking on back to card edit button');
  }

  // Atomic actions: in-view card settings
  public async waitForSubscriptionSettings(): Promise<void> {
    await this.btnAddSubscription.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
  }

  public async setApplyPageContext(): Promise<boolean> {
    await this.chkApplyPageContext.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.log.logMessage('INFO', 'Enabling Apply Page Context in card settings');
    await this.chkApplyPageContext.check();
    return this.chkApplyPageContext.isChecked();
  }

  public async saveSettings(): Promise<void> {
    await this.btnSaveSettings.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(this.btnSaveSettings, 'Clicking save button in card settings');
  }

  /** Adds a subscription row and picks the last card, event and action offered. */
  public async addLastOptionSubscription(): Promise<void> {
    const row = await this.subscriptionCards.count();
    await this.doClick(this.btnAddSubscription, 'Clicking Add Subscription button');
    await this.subscriptionCards.nth(row).waitFor({ state: 'visible', timeout: getTimeout('SHORT') });
    const pairs: Array<[Locator, Locator, string]> = [
      [this.subscriptionCards, this.subscriptionCardOptions, 'card'],
      [this.subscriptionEvents, this.subscriptionEventOptions, 'event'],
      [this.subscriptionActions, this.subscriptionActionOptions, 'action'],
    ];
    for (const [fields, options, name] of pairs) {
      const field = fields.nth(row);
      await field.waitFor({ state: 'visible', timeout: getTimeout('SHORT') });
      await field.scrollIntoViewIfNeeded();
      await this.doClick(field, `Clicking last ${name} field`);
      await options.last().waitFor({ state: 'visible', timeout: getTimeout('SHORT') });
      await this.doClick(options.last(), `Selecting last ${name} option`);
    }
  }

  /** Adds one subscription row per entry, filling every field by name. */
  public async addSubscriptions(subscriptions: CardSubscription[]): Promise<void> {
    const existing = await this.subscriptionCards.count();
    for (let i = 0; i < subscriptions.length; i++) {
      const row = existing + i;
      const sub = subscriptions[i];
      await this.doClick(this.btnAddSubscription, 'Clicking Add Subscription Btn');
      await this.setInputValue(this.subscriptionNames.nth(row), sub.subscriptionName, 'Subscription name');
      await this.doClick(this.subscriptionCards.nth(row), 'Clicking Source Card Dropdown');
      await this.doClick(this.subscriptionAnyCardOptions.filter({ hasText: exactText(sub.sourceCardName) }).first(), `Selecting Source Card Option: ${sub.sourceCardName}`);
      await this.doClick(this.subscriptionEvents.nth(row), 'Clicking Event Selection Dropdown');
      await this.doClick(this.subscriptionEventOptions.filter({ hasText: exactText(sub.eventName) }).first(), `Selecting Event Selection Option: ${sub.eventName}`);
      await this.doClick(this.subscriptionActions.nth(row), 'Clicking Action Selection Dropdown');
      await this.doClick(this.subscriptionActionOptions.filter({ hasText: exactText(sub.actionName) }).first(), `Selecting Action Selection Option: ${sub.actionName}`);
      await this.setInputValue(this.subscriptionTargetViews.nth(row), sub.targetViewName, 'Target view');
      const targetView = this.targetViewOptions.filter({ hasText: exactText(sub.targetViewName) }).first();
      await targetView.scrollIntoViewIfNeeded({ timeout: getTimeout('SHORT') });
      await this.doClick(targetView, `Selecting Target View Option: ${sub.targetViewName}`);
    }
  }

  /**
   * Deletes the last subscription row and reports whether one fewer row is left. The old check read `.last()` again
   * after the delete, which is the previous row whenever more than one subscription exists (Test_008 TC4 on CI).
   */
  public async deleteLastSubscription(): Promise<boolean> {
    const deleteButtons = this.btnDeleteSubscription;
    await deleteButtons.last().waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    const before = await deleteButtons.count();
    await this.doClickUsingScript(deleteButtons.last(), 'Clicking delete on the last subscription');
    const deleted = await expect(deleteButtons).toHaveCount(before - 1, { timeout: getTimeout('SHORT') }).then(() => true, () => false);
    await this.log.logMessage('INFO', `Subscriptions before delete: ${before}, deleted: ${deleted}`);
    return deleted;
  }

  /** Expands the first measure, sets its orientation and saves; returns the orientation factor used for ranking. */
  public async setFirstMeasureOrientation(orientation: MeasureOrientation): Promise<Record<string, number>> {
    const firstMeasure = this.measureNames.first();
    await firstMeasure.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    const measureName = ((await firstMeasure.textContent()) ?? '').trim() || 'Measure';
    await this.doClick(firstMeasure, `Clicking on ${measureName} accordion to expand`);
    await this.measureOrientationSelect.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(this.measureOrientationSelect, 'Clicking on Measure Orientation dropdown');
    const option = this.measureOrientationOption(orientation);
    await option.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(option, `Selecting ${orientation} option from Measure Orientation dropdown`);
    await this.saveSettings();
    return { [measureName]: orientation === 'Greater' ? 1 : -1 };
  }
}
