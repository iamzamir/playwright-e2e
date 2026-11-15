import { Page, Locator } from '@playwright/test';
import BasePage from './page';
import { getTimeout } from '../constants/timeouts';
import { CommonFunctions } from '../util/common.util';

/**
 * ProcessSettingsPage
 *
 * Process Settings window (PO MFE): process hierarchy table, the create/edit sub-process form
 * and the Configure Process (procedure mapping) panel.
 *
 * Locators keep the attributes the old XPath used. `lui-ccl-*` test IDs and `select-select-simple-select+<field>`
 * ids are generated at runtime by `@jda/lui-common-component-library-mui5`; `add-procedure-config-btn` and
 * `processToProcedureDelete` come from the PO MFE.
 */
export class ProcessSettingsPage extends BasePage {
  private objCommonFunctions: CommonFunctions;

  constructor(page: Page) {
    super(page);
    this.objCommonFunctions = new CommonFunctions();
  }

  // --- Locators: shared ---
  private get alert(): Locator                                  { return this.mfeLocator('div[class*="MuiAlert-message"]'); }
  private get createButton(): Locator                           { return this.mfeLocator('button[type="button"][class*="MuiButton-containedPrimary"]'); }
  private getButtonByText(buttonName: string): Locator          { return this.mfeLocator(`button:text-is(${JSON.stringify(buttonName)})`); }

  // --- Locators: process hierarchy table ---
  private getEntity(entityName: string): Locator                { return this.mfeLocator(`a:text-is(${JSON.stringify(entityName)})`); }
  private getThreeDotMenu(entityName: string): Locator {
    return this.mfeLocator('tr')
      .filter({ has: this.page.locator(`a:text-is(${JSON.stringify(entityName)})`) })
      .getByTestId('lui-ccl-threedot-menu-icon-button');
  }
  private getThreeDotMenuItem(itemName: string): Locator        { return this.mfeLocator(`div[role="button"] span:text-is(${JSON.stringify(itemName)})`); }

  // --- Locators: sub-process form ---
  private get displayNameInp(): Locator                         { return this.mfeLocator('input#displayName'); }
  private get descriptionInp(): Locator                         { return this.mfeLocator('textarea#description'); }
  private get offsetInput(): Locator                            { return this.mfeLocator('input#startOffset'); }
  private get durationInput(): Locator                          { return this.mfeLocator('input#duration'); }
  private get startOffsetReferenceDropdown(): Locator           { return this.mfeLocator('input[id="select-select-simple-select+startOffsetReference"]'); }
  // lui-ccl `LuiSelect` opens an MUI Menu (role="menuitem", id "select-listitemtext-<key>", aria-label = display name);
  // older builds rendered `li[data-testid="lui-ccl-select-option"]`. Menus stay mounted, so only visible items count.
  private calculateStartDateOption(value: string): Locator {
    const frame = this.getMfeFrameLocator();
    return frame.getByRole('menuitem', { name: value, exact: true })
      .or(frame.getByRole('option', { name: value, exact: true }))
      .or(frame.locator(`li[data-testid="lui-ccl-select-option"][value="${value}"]`))
      .filter({ visible: true })
      .first();
  }
  private get ofProcessDropdown(): Locator                      { return this.mfeLocator('input[id="select-select-simple-select+referenceNodeName"]'); }
  private get ofProcessOptions(): Locator {
    const frame = this.getMfeFrameLocator();
    return frame.getByRole('menu').getByRole('menuitem')
      .or(frame.getByRole('listbox').getByRole('option'))
      .or(frame.locator('li[data-testid="lui-ccl-select-option"]'))
      .filter({ visible: true });
  }
  private getTab(tabName: string): Locator                      { return this.mfeLocator(`button[id="simple-tab-${tabName}"]`); }

  // --- Locators: "Start Process On" tab ---
  private get offProcessDropdown(): Locator                     { return this.mfeLocator('div[id="multiselect-select-simple-select+transition.referenceNodeNames"]'); }
  private get startProcessOnDropdown(): Locator                 { return this.mfeLocator('div[data-testid="lui-ccl-select-box"]'); }
  private startProcessOnOption(event: string): Locator          { return this.mfeLocator(`li[role="menuitem"][value="${event}"]`); }
  private get startOfProcessDropdown(): Locator                 { return this.mfeLocator('div[data-testid="lui-ccl-multi-select-select"]'); }
  private get startOfProcessOptions(): Locator                  { return this.mfeLocator('ul[role="listbox"] li[role="option"]').filter({ visible: true }); }

  // --- Locators: Configure Process (procedure mapping) ---
  private get addProcedureBtn(): Locator                        { return this.getMfeFrameLocator().getByTestId('add-procedure-config-btn'); }
  private get procedureTableNameHeader(): Locator               { return this.mfeLocator('div:text-is("Name")'); }
  private get procedureDropdown(): Locator                      { return this.mfeLocator('button[aria-label="Open"]').nth(0); }
  private get attributeDropdown(): Locator                      { return this.mfeLocator('button[aria-label="Open"]').nth(1); }
  private get procedureInput(): Locator                         { return this.mfeLocator('label:text-is("Procedure") ~ div > input'); }
  private get attributeInput(): Locator                         { return this.mfeLocator('label:text-is("Context Attributes") ~ div > input'); }
  private get mappedProcedureNameSpans(): Locator               { return this.mfeLocator('td[data-index="0"] span'); }
  private getProcedureName(procedureName: string): Locator {
    return this.mfeLocator('td[data-index="0"]').filter({ has: this.page.locator(`span:text-is(${JSON.stringify(procedureName)})`) });
  }
  private getProcedureDeleteButton(procedureName: string): Locator {
    return this.mfeLocator('tr')
      .filter({ has: this.page.locator(`span:text-is(${JSON.stringify(procedureName)})`) })
      .locator('button[aria-label="processToProcedureDelete"]');
  }

  // --- Helpers ---

  /** Steps a numeric input with the arrow keys until it holds `target`; the inputs ignore typed values. */
  protected async stepNumberInput(input: Locator, target: number, fieldName: string): Promise<void> {
    await this.objCommonFunctions.logMessage('INFO', `Setting ${fieldName} value to: ${target}`);
    await input.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(input, `Clicking on ${fieldName} input`);

    const readValue = async (): Promise<number> => parseInt((await input.inputValue()) || '0', 10);
    let currentValue = await readValue();
    // Guard against a field that clamps (e.g. a min value) and would otherwise loop forever.
    let stepsLeft = Math.abs(target - currentValue) + 5;
    while (currentValue !== target && stepsLeft-- > 0) {
      await this.page.keyboard.press(currentValue < target ? 'ArrowUp' : 'ArrowDown');
      currentValue = await readValue();
    }

    await this.objCommonFunctions.logMessage('INFO', `${fieldName} value set to: ${currentValue}`);
    if (currentValue !== target) {
      throw new Error(`Failed to set ${fieldName} value to ${target}. Current value: ${currentValue}`);
    }
  }

  /** Opens an autocomplete, types `value` and picks the option named `value` once the list has filtered to it. */
  protected async selectAutocompleteValue(openButton: Locator, input: Locator, value: string, fieldName: string): Promise<void> {
    await openButton.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(openButton, `Clicking on ${fieldName} dropdown`);
    await this.doEnterText(input, value, `Entering ${fieldName} name: ${value}`);
    const option = this.getMfeFrameLocator().getByRole('listbox').getByRole('option', { name: value, exact: true }).first();
    if (await option.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') }).then(() => true, () => false)) {
      await this.doClick(option, `Selecting ${fieldName}: ${value}`);
      return;
    }
    // The option label can differ from the typed value (e.g. a display name); fall back to the first filtered option.
    await this.getMfeFrameLocator().getByRole('listbox').getByRole('option').first().waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
  }

  /** Clicks the first option of an open dropdown and returns its text. */
  protected async selectFirstOption(options: Locator, dropdownName: string): Promise<string> {
    const firstOption = options.first();
    await firstOption.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    const optionText = await this.doGetText(firstOption, `Getting first option text from ${dropdownName} dropdown`);
    await this.doClick(firstOption, `Selecting ${optionText} from ${dropdownName} dropdown`);
    return optionText;
  }

  // --- Atomic actions: shared ---

  public async processActions(buttonName: string): Promise<void> {
    const button = this.getButtonByText(buttonName);
    await button.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(button, `Clicking on ${buttonName} button`);
  }

  public async clickCancelButton(): Promise<void> {
    await this.doClick(this.getButtonByText('Cancel'), 'Clicking on Cancel button');
  }

  public async clickCreateButton(): Promise<void> {
    await this.doClick(this.createButton, 'Clicking on Create button');
  }

  public async clickSave(): Promise<void> {
    await this.doClick(this.getButtonByText('Save'), 'Clicking Save button');
  }

  public async clickDelete(): Promise<void> {
    await this.doClick(this.getButtonByText('Delete'), 'Confirming deletion by clicking Delete button');
  }

  public async alertMsg(message: string): Promise<boolean> {
    const alerts = this.alert;
    await alerts.first().waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    // A failed save renders both a snackbar and an inline form alert, and they can appear a beat apart;
    // give the one carrying the expected text a chance to render before falling back to the first alert.
    let alertEle = alerts.filter({ hasText: message }).first();
    try {
      await alertEle.waitFor({ state: 'visible', timeout: getTimeout('SHORT') });
    } catch {
      alertEle = alerts.first();
    }
    const text = await this.doGetText(alertEle, 'Getting alert message');
    await this.objCommonFunctions.logMessage('INFO', `Alert :: ${text}`);
    return text.includes(message);
  }

  // --- Atomic actions: process hierarchy table ---

  public async isEntityExist(entityName: string): Promise<boolean> {
    const entityEle = this.getEntity(entityName);
    try {
      await entityEle.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
      await entityEle.scrollIntoViewIfNeeded();
      const isEntityCreated = await this.doesElementExist(entityEle, `Checking if entity ${entityName} exists`);
      await this.objCommonFunctions.logMessage('INFO', `Is entity created :: ${isEntityCreated}`);
      return isEntityCreated;
    } catch (e) {
      await this.objCommonFunctions.logMessage('ERROR', `Entity ${entityName} not found: ${e}`);
      return false;
    }
  }

  public async clickOnThreeDotMenuOnEntity(entityName: string): Promise<void> {
    const threeDotMenu = this.getThreeDotMenu(entityName);
    await threeDotMenu.scrollIntoViewIfNeeded();
    await threeDotMenu.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(threeDotMenu, `Clicking on three dot menu of entity: ${entityName}`);
  }

  public async clickOnItem(itemName: string): Promise<void> {
    const menuItemEle = this.getThreeDotMenuItem(itemName);
    await menuItemEle.waitFor({ state: 'attached', timeout: getTimeout('EXTREME') });
    await this.doClick(menuItemEle, `Clicking on item: ${itemName}`);
  }

  // --- Atomic actions: sub-process form ---

  public async setDisplayName(displayName: string): Promise<void> {
    await this.clearAndSetInputValue(this.displayNameInp, displayName);
    await this.objCommonFunctions.logMessage('INFO', `Setting ${displayName} in display name input`);
  }

  public async setDescription(description: string): Promise<void> {
    await this.clearAndSetInputValue(this.descriptionInp, description);
    await this.objCommonFunctions.logMessage('INFO', `Setting ${description} in description input`);
  }

  public async clickOnTabInSubProcess(tabName: string): Promise<void> {
    const tabEle = this.getTab(tabName);
    await tabEle.waitFor({ state: 'attached', timeout: getTimeout('XLARGE') });
    await this.doClick(tabEle, `Clicking on tab: ${tabName}`);
  }

  public async setOffsetValue(offset: number = 1): Promise<void> {
    await this.stepNumberInput(this.offsetInput, offset, 'Offset');
  }

  public async setDurationValue(duration: number): Promise<void> {
    await this.stepNumberInput(this.durationInput, duration, 'Duration');
  }

  public async setCalculateStartDateOn(value: string): Promise<void> {
    await this.objCommonFunctions.logMessage('INFO', `Setting Calculate Start Date On to: ${value}`);
    await this.startOffsetReferenceDropdown.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.startOffsetReferenceDropdown, 'Clicking on Calculate Start Date On dropdown trigger');
    const option = this.calculateStartDateOption(value);
    await option.waitFor({ state: 'visible' });
    await this.doClick(option, `Selecting ${value} from Calculate Start Date On dropdown`);
  }

  public async setOfProcessToFirstOption(): Promise<void> {
    await this.ofProcessDropdown.waitFor({ state: 'visible' });
    await this.doClick(this.ofProcessDropdown, 'Clicking on Of Process dropdown trigger');
    const hasOptions = await this.ofProcessOptions.first().waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') }).then(() => true, () => false);
    if (!hasOptions) {
      throw new Error("No options found in 'Of Process' dropdown");
    }
    await this.selectFirstOption(this.ofProcessOptions, 'Of Process');
  }

  // --- Atomic actions: "Start Process On" tab ---

  public async setOffProcess(): Promise<void> {
    await this.offProcessDropdown.waitFor({ state: 'attached', timeout: getTimeout('EXTREME') });
    await this.doClick(this.offProcessDropdown, 'Clicking on off process dropdown');
    await this.startOfProcessOptions.first().waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
  }

  public async setStartProcessOnEvent(event: string): Promise<void> {
    await this.objCommonFunctions.logMessage('INFO', `Setting Start Process On Event to: ${event}`);
    await this.startProcessOnDropdown.waitFor({ state: 'visible' });
    await this.doClick(this.startProcessOnDropdown, 'Clicking on Start Process On dropdown');
    await this.doClick(this.startProcessOnOption(event), `Selecting ${event} from Start Process On dropdown`);
  }

  public async setStartProcessOnOfProcess(): Promise<void> {
    await this.startOfProcessDropdown.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(this.startOfProcessDropdown, 'Clicking on Of Process dropdown');
    const optionText = await this.selectFirstOption(this.startOfProcessOptions, 'Of Process');
    await this.objCommonFunctions.logMessage('INFO', `Of Process dropdown value set to: ${optionText}`);
  }

  // --- Atomic actions: Configure Process (procedure mapping) ---

  public async clickOnAddProcedureBtn(): Promise<void> {
    await this.doClick(this.addProcedureBtn, 'Clicking on Add Procedure button');
  }

  public async addProcedure(procedureName: string): Promise<void> {
    await this.selectAutocompleteValue(this.procedureDropdown, this.procedureInput, procedureName, 'procedure');
  }

  public async addContextAttribute(attributeValue: string): Promise<void> {
    await this.selectAutocompleteValue(this.attributeDropdown, this.attributeInput, attributeValue, 'attribute');
  }

  public async isProcedureMapped(procedureName: string): Promise<boolean> {
    await this.objCommonFunctions.logMessage('INFO', `Checking if procedure ${procedureName} is mapped`);
    try {
      await this.procedureTableNameHeader.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
      await this.getProcedureName(procedureName).waitFor({ state: 'visible', timeout: getTimeout('SHORT') });
      await this.objCommonFunctions.logMessage('INFO', `Procedure ${procedureName} mapped: true`);
      return true;
    } catch {
      await this.objCommonFunctions.logMessage('INFO', `Procedure ${procedureName} is not mapped`);
      return false;
    }
  }

  public async getMappedProcedureNames(): Promise<string[]> {
    await this.procedureTableNameHeader.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    const names = (await this.mappedProcedureNameSpans.allTextContents()).map((name) => name.trim()).filter(Boolean);
    await this.objCommonFunctions.logMessage('INFO', `Mapped procedures: ${JSON.stringify(names)}`);
    return names;
  }

  // --- Composite actions ---

  public async fillSubProcessForm(displayName?: string, description?: string, isOffProcessFieldExist?: boolean): Promise<void> {
    if (displayName) {
      await this.setDisplayName(displayName);
    }
    if (description) {
      await this.setDescription(description);
    }
    if (isOffProcessFieldExist) {
      await this.clickOnTabInSubProcess('Start Process On');
      await this.setOffProcess();
      await this.page.keyboard.press('Escape');
    }
  }

  /** `ofProcess` is not used: "Of Process" is always set to the first option. Kept for caller compatibility. */
  public async createSubProcess(displayName: string, offset: number, duration: number, startEvent: string, ofProcess: string): Promise<boolean> {
    await this.objCommonFunctions.logMessage('INFO', `Creating subprocess with Display Name: ${displayName} (Of Process requested: ${ofProcess})`);
    await this.setDisplayName(displayName);
    await this.setCalculateStartDateOn('Start');
    await this.setOfProcessToFirstOption();
    await this.setOffsetValue(offset);
    await this.setDurationValue(duration);
    await this.clickOnTabInSubProcess('Start Process On');
    await this.setStartProcessOnEvent(startEvent);
    await this.setStartProcessOnOfProcess();
    // Close the open "Of Process" listbox so it doesn't cover the Create button.
    await this.page.keyboard.press('Escape');
    await this.clickCreateButton();
    const isCreated = await this.alertMsg(`Process ${displayName.replace(/\s/g, '')} has been created`);
    await this.objCommonFunctions.logMessage('INFO', `Subprocess creation status: ${isCreated}`);
    return isCreated;
  }

  public async selectProcessesAndAttributes(procedureName: string, attributeValue: string): Promise<void> {
    await this.objCommonFunctions.logMessage('INFO', `Selecting procedure: ${procedureName} with attribute: ${attributeValue}`);
    await this.addProcedure(procedureName);
    await this.addContextAttribute(attributeValue);
    await this.clickSave();
  }

  public async deleteProcedure(procedureName: string): Promise<void> {
    await this.objCommonFunctions.logMessage('INFO', `Deleting procedure: ${procedureName}`);
    await this.doClick(this.getProcedureDeleteButton(procedureName), `Clicking delete button for procedure: ${procedureName}`);
    await this.clickDelete();
  }
}
