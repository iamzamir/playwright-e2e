import { Locator } from '@playwright/test';
import BasePage from './page';
import type { Page } from '@playwright/test';
import { getTimeout } from '../constants/timeouts';
import { exactText } from './planning/text-match';

export type ConstraintFormAction = 'Create' | 'Copy' | 'Save';

export type ConstraintResourceCapacityRow = {
  period: string;
  capacity?: string;
  cost?: string;
};

export type ConstraintResourceDetails = {
  resourceName?: string;
  location?: string;
  type?: string;
  group?: string;
  granularity?: string;
  resourceType?: string;
  quantityUom?: string;
  capacityPlanningRows?: ConstraintResourceCapacityRow[];
};

export type ConstraintAddAssociationDetails = {
  query: string;
};

export class ConstraintPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  private get resourceTypeDropdown(): Locator                               { return this.inputAfterLabel('Resource Type'); }
  private get uomInput(): Locator                                           { return this.inputAfterLabel('Quantity UOM'); }
  private get continueButton(): Locator                                     { return this.mfeLocator('button').filter({ hasText: exactText('Continue') }); }
  private get constrainedItemsInput(): Locator                              { return this.mfeLocator('div[class*="monaco-editor"], div[class*="CodeMirror"], div[contenteditable="true"]').first(); }
  private get constrainedItemsTextarea(): Locator                           { return this.mfeLocator('div:has(> :text-is("Constrained Items")) ~ * textarea').first(); }
  private get validateAndSeeResultsButton(): Locator                        { return this.mfeLocator('button').filter({ hasText: exactText('Validate & See Results') }); }
  private get copyButton(): Locator                                         { return this.mfeLocator('button').filter({ hasText: exactText('Copy') }); }
  private get successToast(): Locator                                       { return this.getMfeFrameLocator().getByText('Resource created successfully'); }
  private get constraintDialog(): Locator                                   { return this.getMfeFrameLocator().getByRole('dialog'); }
  private get resourceDetailsTab(): Locator                                 { return this.constraintDialog.getByTestId('Resource Details'); }
  private get addAssociationsTab(): Locator                                 { return this.constraintDialog.getByTestId('Add Associations'); }
  private get normalDropdownMenu(): Locator                                 { return this.getMfeFrameLocator().getByRole('menu').first(); }

  private getDropdownOption(optionText: string): Locator                    { return this.mfeLocator('li').filter({ hasText: exactText(optionText) }); }
  private getRegularCapacityInputForRow(rowLabel: string): Locator          { return this.getResourceRow(rowLabel).locator('td').nth(2).locator('input'); }
  private getRegularCostInputForRow(rowLabel: string): Locator              { return this.getResourceRow(rowLabel).locator('td').nth(3).locator('input'); }
  private getConstraintSubmitButton(action: ConstraintFormAction): Locator  { return this.constraintDialog.getByRole('button', { name: action, exact: true }); }

  private getFieldByLabel(labelName: string): Locator {
    const escaped = labelName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const labelMatch = this.constraintDialog.getByLabel(new RegExp(`^${escaped}\\s*\\*?$`));
    return this.constraintDialog.locator('input, textarea').and(labelMatch);
  }

  // The first input after the label whose whole text is `labelText`, inside the same container.
  private inputAfterLabel(labelText: string): Locator {
    const label = `label:text-is(${JSON.stringify(labelText)})`;
    return this.mfeLocator(`${label} ~ input, ${label} ~ * input`).first();
  }

  private getResourceRow(rowLabel: string): Locator {
    const frame = this.getMfeFrameLocator();
    return frame.locator('tr').filter({ has: frame.getByText(rowLabel, { exact: true }) });
  }

  private getNormalDropdownOption(optionText: string): Locator {
    return this.getMfeFrameLocator().locator(`li[data-testid="lui-ccl-select-option"][aria-label="${optionText}" i]`)
      .or(this.getMfeFrameLocator().locator(`li[data-testid="lui-ccl-select-option"][value="${optionText}" i]`))
      .first();
  }

  private getSearchableDropdownOption(optionText: string): Locator {
    const frame = this.getMfeFrameLocator();
    return frame.locator('[data-testid="common-search-select-option-row"]')
      .filter({ has: frame.getByText(optionText, { exact: true }) })
      .first();
  }

  private getConstraintToast(resourceName: string, action: ConstraintFormAction): Locator {
    const message = action === 'Save'
      ? `The change for resource ${resourceName} is being saved`
      : `The resource ${resourceName} is being created`;
    return this.getMfeFrameLocator().getByText(message, { exact: false });
  }

  // For resources imported from an external system, the Add Associations rule builder is
  // replaced by this read-only message (no query field to fill/read in that case).
  private get noRuleAvailableMessage(): Locator {
    return this.constraintDialog.getByText(
      "This record was imported from an external system, so there\u2019s no rule to display. You can review the current associations in Preview.",
      { exact: false }
    );
  }

  public async selectResourceType(optionText: string, timeout: number = getTimeout('LONG')): Promise<void> {
    await this.doClick(this.resourceTypeDropdown, 'Clicking Resource Type dropdown');
    const option = this.getDropdownOption(optionText);
    const isOptionVisible = await option.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);
    if (!isOptionVisible) {
      throw new Error(`Resource Type option "${optionText}" was not found after opening the Resource Type dropdown.`);
    }
    await this.doClick(option, `Selecting Resource Type option: ${optionText}`);
  }

  public async enterUom(value: string): Promise<void> {
    await this.doEnterText(this.uomInput, value, `Entering UOM: ${value}`);
  }

  public async enterRegularCapacity(rowLabel: string, value: string): Promise<void> {
    await this.doEnterText(this.getRegularCapacityInputForRow(rowLabel), value, `Entering Regular Capacity for row ${rowLabel}: ${value}`);
  }

  public async enterRegularCost(rowLabel: string, value: string): Promise<void> {
    await this.doEnterText(this.getRegularCostInputForRow(rowLabel), value, `Entering Regular Cost for row ${rowLabel}: ${value}`);
  }

  public async clickContinue(): Promise<void> {
    await this.doClick(this.continueButton, 'Clicking Continue button');
  }

  // Atomic actions - Add Associations tab
  public async enterConstrainedItemsQuery(query: string, timeout: number = getTimeout('LONG')): Promise<void> {
    if (await this.constrainedItemsInput.isVisible().catch(() => false)) {
      await this.doClick(this.constrainedItemsInput, 'Clicking Constrained Items editor');
      await this.page.keyboard.press('Control+A');
      await this.page.keyboard.press('Backspace');
      await this.page.keyboard.type(query);
    } else {
      await this.constrainedItemsTextarea.waitFor({ state: 'visible', timeout });
      await this.doClick(this.constrainedItemsTextarea, 'Clicking Constrained Items textarea');
      await this.doEnterText(this.constrainedItemsTextarea, query, `Entering Constrained Items query: ${query}`);
    }
  }

  public async clickValidateAndSeeResults(): Promise<void> {
    await this.doClick(this.validateAndSeeResultsButton, 'Clicking Validate & See Results button');
  }

  public async clickCopy(): Promise<void> {
    await this.doClick(this.copyButton, 'Clicking Copy button');
  }

  public async isResourceCreatedSuccessToastVisible(timeout: number = getTimeout('LONG')): Promise<boolean> {
    const isVisible = await this.successToast.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);
    return isVisible;
  }

  public async waitForDialogOpen(timeout: number = getTimeout('EXTREME')): Promise<void> {
    await this.constraintDialog.waitFor({ state: 'visible', timeout });
    await this.resourceDetailsTab.waitFor({ state: 'visible', timeout });
  }

  public async openResourceDetailsTab(): Promise<void> {
    await this.doClick(this.resourceDetailsTab, 'Opening Resource Details tab');
  }

  public async openAddAssociationsTab(): Promise<void> {
    await this.doClick(this.addAssociationsTab, 'Opening Add Associations tab');
  }

  // Disabled fields in this app do not expose aria-disabled/readonly reliably, so DOM-based
  // enabled/editable checks are not trustworthy here. Instead, read the field's current value
  // and only interact with it when it differs from the desired test-data value - this works
  // uniformly for Create (field is empty), Copy (prefilled but usually matches, so no-op), and
  // Edit (prefilled with a value that needs to change).
  private async shouldUpdateField(locator: Locator, desiredValue: string): Promise<boolean> {
    const currentValue = await locator.inputValue().catch(() => undefined);
    return currentValue !== desiredValue;
  }

  private async isNormalDropdownMenuOpen(): Promise<boolean> {
    return this.normalDropdownMenu.isVisible().catch(() => false);
  }

  private async ensureNormalDropdownOpen(input: Locator, fieldLabel: string): Promise<void> {
    if (await this.isNormalDropdownMenuOpen()) {
      return;
    }

    await this.doClick(input, `Clicking ${fieldLabel} input`);
    if (await this.normalDropdownMenu.waitFor({ state: 'visible', timeout: getTimeout('SHORT') }).then(() => true).catch(() => false)) {
      return;
    }

    await input.press('ArrowDown');
    if (await this.normalDropdownMenu.waitFor({ state: 'visible', timeout: getTimeout('SHORT') }).then(() => true).catch(() => false)) {
      return;
    }

    // Last resort: some implementations only toggle open on a second interaction once focus
    // is already established from the first click above.
    await this.doClick(input, `Re-clicking ${fieldLabel} input`);
    await this.normalDropdownMenu.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
  }

  // Normal dropdown (Type, Granularity): open the menu (self-verifying, with fallback
  // strategies), then click the matching <li data-testid="lui-ccl-select-option">.
  private async selectFromNormalDropdown(field: Locator, fieldLabel: string, fieldIdSuffix: string, optionText: string): Promise<void> {
    const input = this.constraintDialog.locator(`input[id$="${fieldIdSuffix}"]`);
    await input.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.ensureNormalDropdownOpen(input, fieldLabel);
    const option = this.getNormalDropdownOption(optionText);
    await option.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(option, `Selecting ${fieldLabel} option: ${optionText}`);
  }

  // Searchable dropdown (Location, Group, Resource Type): click to open the popup,
  // then click the matching common-search-select-option-row.
  private async selectFromSearchableDropdown(field: Locator, fieldLabel: string, optionText: string): Promise<void> {
    await this.doClick(field, `Clicking ${fieldLabel} searchable dropdown`);
    const option = this.getSearchableDropdownOption(optionText);
    await option.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(option, `Selecting ${fieldLabel} option: ${optionText}`);
  }

  // Composite action - fill the Resource Details (tab 1) form.
  // Only defined fields are set, and each field is skipped (with a log entry)
  // when disabled, so the same function works for Create (all empty/editable),
  // Copy (most fields prefilled/editable) and Edit (most fields prefilled/disabled).
  public async fillResourceDetailsForm(details: ConstraintResourceDetails): Promise<void> {
    if (details.resourceName !== undefined && await this.shouldUpdateField(this.getFieldByLabel('Resource Name'), details.resourceName)) {
      await this.doEnterText(this.getFieldByLabel('Resource Name'), details.resourceName, `Entering Resource Name: ${details.resourceName}`);
    }
    if (details.location !== undefined && await this.shouldUpdateField(this.getFieldByLabel('Location'), details.location)) {
      await this.selectFromSearchableDropdown(this.getFieldByLabel('Location'), 'Location', details.location);
    }
    if (details.type !== undefined && await this.shouldUpdateField(this.getFieldByLabel('Type'), details.type)) {
      await this.selectFromNormalDropdown(this.getFieldByLabel('Type'), 'Type', 'constraintType', details.type);
    }
    if (details.group !== undefined && await this.shouldUpdateField(this.getFieldByLabel('Group'), details.group)) {
      await this.selectFromSearchableDropdown(this.getFieldByLabel('Group'), 'Group', details.group);
    }
    if (details.granularity !== undefined && await this.shouldUpdateField(this.getFieldByLabel('Granularity'), details.granularity)) {
      await this.selectFromNormalDropdown(this.getFieldByLabel('Granularity'), 'Granularity', 'timeGranularity', details.granularity);
    }
    if (details.resourceType !== undefined && await this.shouldUpdateField(this.getFieldByLabel('Resource Type'), details.resourceType)) {
      await this.selectFromSearchableDropdown(this.getFieldByLabel('Resource Type'), 'Resource Type', details.resourceType);
    }
    if (details.quantityUom !== undefined && await this.shouldUpdateField(this.getFieldByLabel('Quantity UOM'), details.quantityUom)) {
      await this.doEnterText(this.getFieldByLabel('Quantity UOM'), details.quantityUom, `Entering Quantity UOM: ${details.quantityUom}`);
    }
    if (details.capacityPlanningRows) {
      for (const row of details.capacityPlanningRows) {
        if (row.capacity !== undefined) {
          await this.enterRegularCapacity(row.period, row.capacity);
        }
        if (row.cost !== undefined) {
          await this.enterRegularCost(row.period, row.cost);
        }
      }
    }
  }

  // Composite action - read the current values of the Resource Details (tab 1) form.
  public async readResourceDetailsForm(): Promise<ConstraintResourceDetails> {
    return {
      resourceName: await this.getFieldByLabel('Resource Name').inputValue().catch(() => ''),
      location: await this.getFieldByLabel('Location').inputValue().catch(() => ''),
      type: await this.getFieldByLabel('Type').inputValue().catch(() => ''),
      group: await this.getFieldByLabel('Group').inputValue().catch(() => ''),
      granularity: await this.getFieldByLabel('Granularity').inputValue().catch(() => ''),
      resourceType: await this.getFieldByLabel('Resource Type').inputValue().catch(() => ''),
      quantityUom: await this.getFieldByLabel('Quantity UOM').inputValue().catch(() => ''),
    };
  }

  // Composite action - fill the Add Associations (tab 2) form.
  public async fillAddAssociationsForm(details: ConstraintAddAssociationDetails, timeout: number = getTimeout('LONG')): Promise<void> {
    await this.openAddAssociationsTab();
    await this.enterConstrainedItemsQuery(details.query, timeout);
  }

  // Composite action - read the current query on the Add Associations (tab 2) form.
  public async readAddAssociationsForm(): Promise<ConstraintAddAssociationDetails> {
    await this.openAddAssociationsTab();
    const query = await this.constrainedItemsTextarea.inputValue().catch(() => '');
    return { query };
  }

  // For resources imported from an external system (e.g. interfaced constraints), the Add
  // Associations tab shows a read-only "No rule available" message instead of the rule builder.
  public async isNoRuleAvailableMessageVisible(timeout: number = getTimeout('LONG')): Promise<boolean> {
    // await this.openAddAssociationsTab();
    return this.noRuleAvailableMessage.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);
  }

  // Common submit for the Create/Copy/Edit Resource dialog. The visible button
  // label changes per flow: Create -> "Create", Copy -> "Copy", Edit -> "Save".
  public async submitConstraintForm(action: ConstraintFormAction): Promise<void> {
    await this.doClick(this.getConstraintSubmitButton(action), `Clicking ${action} button to submit constraint form`);
  }

  public async isConstraintToastVisible(resourceName: string, action: ConstraintFormAction, timeout: number = getTimeout('LONG')): Promise<boolean> {
    return this.getConstraintToast(resourceName, action).waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);
  }

  // Composite action - full Create/Copy/Edit flow: fill tab 1, continue, fill tab 2,
  // validate, submit with the flow-specific button label, then confirm the toast.
  public async completeConstraintForm(resourceDetails: ConstraintResourceDetails, addAssociationDetails: ConstraintAddAssociationDetails, action: ConstraintFormAction): Promise<boolean> {
    await this.fillResourceDetailsForm(resourceDetails);
    await this.clickContinue();
    await this.fillAddAssociationsForm(addAssociationDetails);
    await this.clickValidateAndSeeResults();
    await this.submitConstraintForm(action);
    return this.isConstraintToastVisible(resourceDetails.resourceName ?? '', action);
  }
}