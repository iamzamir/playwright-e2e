import { FrameLocator, Locator, Page } from '@playwright/test';
import BasePage from '../page';
import { getTimeout } from '../../constants/timeouts';
import { CommonFunctions } from '../../util/common.util';
import { exactText, textStartingWithValue } from './text-match';

export type FormInputField = {
  labelName: string;
  value?: string;
  fieldType?: 'text' | 'dropdown' | 'date' | 'combobox';
};

/**
 * Encapsulates the Create Placeholder (NPI) flyout, action wizard modals,
 * and dynamic form controls.
 *
 * Source markup:
 * - plan-sop-planning-mfe:
 *   - `src/pages/ActionPlanner/ActionPages/Placeholder/CreatePlaceholder/CreatePlaceholder.tsx`
 *   - `src/pages/ActionPlanner/ActionPages/Placeholder/TreeVariants/TreeSelectSingle.tsx`
 *   - `src/pages/ActionPlanner/ActionPages/Placeholder/TreeVariants/TreeSelectMulti.tsx`
 *   - `src/pages/ActionPlanner/ActionPages/Placeholder/AssortmentSelection/index.tsx`
 *   - `src/pages/ActionPlanner/ActionPages/Placeholder/PlaceholderTypeToggle/index.tsx`
 *   - `src/pages/ActionPlanner/ActionPlanner.tsx`
 * - `@jda/lui-common-component-library-mui5` modal (`lui-ccl-modal-title-close-button`)
 */
export class PlaceholderFormsComponent extends BasePage {
  protected readonly log: CommonFunctions = new CommonFunctions();

  constructor(page: Page) {
    super(page);
  }

  private get mfe(): FrameLocator {
    return this.getMfeFrameLocator();
  }

  // ==========================================
  // Private Locators - Modal & Wizard
  // ==========================================

  private get closePopupModalIcon(): Locator {
    return this.mfe.getByTestId('lui-ccl-modal-title-close-button');
  }

  private get closeWizardIcon(): Locator {
    return this.mfe.getByTestId('closeModal');
  }

  // ==========================================
  // Private Locators - Form Fields (Action Wizard)
  // ==========================================

  private formFieldContainer(labelName: string): Locator {
    return this.mfe
      .locator('div[role="presentation"]')
      .locator('.MuiFormControl-root, [class*="MuiFormControl"]')
      .filter({ has: this.page.locator(`text="${labelName}"`) });
  }

  private formInputField(labelName: string): Locator {
    return this.formFieldContainer(labelName).locator('input').first();
  }

  private formDropdownField(labelName: string): Locator {
    return this.formFieldContainer(labelName)
      .locator('[role="combobox"], [role="button"], .MuiSelect-select')
      .first();
  }

  private formCalendarIcon(labelName: string): Locator {
    return this.formFieldContainer(labelName)
      .getByRole('button', { name: /choose date/i })
      .first();
  }

  private formDropdownOption(value: string): Locator {
    return this.mfe
      .getByRole('listbox')
      .getByRole('option', { name: value })
      .or(this.mfe.locator('div[role="presentation"] li').filter({ hasText: value }))
      .first();
  }

  /** A combobox option for `value`: the SPARQ `dropdownSearch` behind Add Lane fields also matches descriptions, so other options can be listed above it. */
  private formComboboxOption(value: string): Locator {
    return this.mfe.getByRole('listbox').getByRole('option', { name: textStartingWithValue(value) }).first();
  }

  private calendarDateOption(day: string): Locator {
    return this.mfe
      .getByRole('dialog')
      .locator('button[class*="MuiPickersDay"]')
      .filter({ hasText: exactText(day) })
      .first();
  }

  // ==========================================
  // Private Locators - Create Placeholder Flyout
  // ==========================================

  private get flyoutTitle(): Locator {
    return this.mfe.getByRole('heading', { name: 'Create Placeholder' });
  }

  private get flyoutPresentation(): Locator {
    return this.mfe.locator('div[role="presentation"]#menu-, div#menu-[role="presentation"], div.MuiPopover-root[role="presentation"]').first();
  }

  private get npiNewNameInput(): Locator {
    return this.mfe
      .getByRole('textbox', { name: 'New Name' })
      .or(this.mfe.getByLabel('New Name'))
      .or(this.mfe.locator('label:has-text("New Name") ~ div input'))
      .first();
  }

  private get npiSelectProductDropdown(): Locator {
    return this.mfe
      .locator('div')
      .filter({ has: this.page.locator('text="Select Product (single select)"') })
      .locator('[role="combobox"], #tree-select')
      .first();
  }

  private get npiNoOfVariantsInput(): Locator {
    return this.mfe
      .getByPlaceholder('Minimum 1 variant')
      .or(this.mfe.getByLabel(/no of variants/i))
      .first();
  }

  private get npiDropdownSearchInput(): Locator {
    return this.mfe
      .getByPlaceholder('Minimum 3 characters required to search')
      .or(this.mfe.getByTestId('multi-tree-select-search').locator('input'))
      .first();
  }

  private get npiClearSearchIcon(): Locator {
    return this.mfe.getByRole('button', { name: 'clear search text' });
  }

  private get npiCloseIconInFlyout(): Locator {
    return this.mfe
      .locator('div[role="presentation"]')
      .filter({ has: this.page.getByRole('heading', { name: 'Create Placeholder' }) })
      .getByTestId('close-icon')
      .first();
  }

  private get npiCloneMemberCreateBtn(): Locator {
    return this.mfe
      .locator('div[role="presentation"]')
      .getByRole('button', { name: 'Create', exact: true })
      .first();
  }

  private get dimensionsFromFlyout(): Locator {
    return this.mfe.getByTestId('lui-ccl-card-title').locator('span');
  }

  private placeholderTypeButton(placeholderType: 'Member' | 'Intersection'): Locator {
    return this.mfe.getByRole('button', { name: placeholderType, exact: true });
  }

  private multiSelectDropdown(dimensionName: string): Locator {
    return this.mfe
      .getByTestId('lui-ccl-card')
      .filter({ hasText: new RegExp(`Select ${dimensionName}`, 'i') })
      .getByTestId('tree-select-multi')
      .locator('button, [role="combobox"]')
      .first();
  }

  private nodeAccordion(nodeName: string): Locator {
    return this.mfe.locator(`button:has([data-testid="arrow-down-icon-${nodeName}"])`).first();
  }

  private nodeAccordionInMultiSelect(nodeName: string): Locator {
    return this.mfe
      .locator('li, [class*="ChildLuiListItem"], [class*="StyledCustomListBox"]')
      .filter({ hasText: nodeName })
      .locator(`[data-testid="toggle-${nodeName}"], [data-testid^="toggle-"], [data-testid="tree-select-toggle-icon"], button[aria-label*="toggle" i], button:has(svg)`)
      .first();
  }

  private nodeOption(nodeName: string): Locator {
    return this.mfe.locator('p, span').filter({ hasText: nodeName }).first();
  }

  private radioButton(dimensionName: string, mode: 'choose' | 'ref-assortment'): Locator {
    return this.mfe
      .getByTestId('lui-ccl-card')
      .filter({ hasText: new RegExp(`Select ${dimensionName}`, 'i') })
      .getByTestId(`location-${mode}`)
      .first();
  }

  // ==========================================
  // Public Actions - Modal & Wizard
  // ==========================================

  public async closePopupModal(): Promise<boolean> {
    const icon = this.closePopupModalIcon;
    await icon.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(icon, 'Clicking popup modal close button');
    await icon.waitFor({ state: 'hidden', timeout: getTimeout('SHORT') }).catch(() => undefined);
    return true;
  }

  public async closeWizard(): Promise<boolean> {
    const icon = this.closeWizardIcon;
    await icon.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(icon, 'Clicking wizard close button');
    await icon.waitFor({ state: 'hidden', timeout: getTimeout('SHORT') }).catch(() => undefined);
    return true;
  }

  // ==========================================
  // Form Field Setting Helpers
  // ==========================================

  private async setFormDropdownValue(fieldData: FormInputField): Promise<void> {
    const dropdown = this.formDropdownField(fieldData.labelName);
    await dropdown.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(dropdown, `Opening ${fieldData.labelName} dropdown`);
    const option = this.formDropdownOption(fieldData.value || '');
    await option.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(option, `Selecting ${fieldData.value} from ${fieldData.labelName} dropdown`);
  }

  private async setFormComboboxValue(fieldData: FormInputField): Promise<void> {
    const input = this.formInputField(fieldData.labelName);
    await input.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await input.click();
    await this.clearAndSetInputValue(input, fieldData.value || '');
    // Click this value's option rather than the first listed one; fail here if it is never listed.
    const option = this.formComboboxOption(fieldData.value || '');
    await option.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(option, `Selecting ${fieldData.value} for ${fieldData.labelName}`);
  }

  private async setFormDateValue(fieldData: FormInputField): Promise<void> {
    const calendarIcon = this.formCalendarIcon(fieldData.labelName);
    await calendarIcon.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(calendarIcon, `Opening date picker for ${fieldData.labelName}`);
    const dayOption = this.calendarDateOption(fieldData.value || '1');
    await dayOption.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(dayOption, `Selecting day ${fieldData.value} for ${fieldData.labelName}`);
  }

  private async setFormTextValue(fieldData: FormInputField): Promise<void> {
    const input = this.formInputField(fieldData.labelName);
    await input.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.clearAndSetInputValue(input, fieldData.value || '');
  }

  public async fillFormData(inputFields: FormInputField[]): Promise<void> {
    for (const field of inputFields) {
      const inputField = this.formInputField(field.labelName);
      const isFieldVisible = await inputField.isVisible().catch(() => false);
      await this.log.logMessage('INFO', `Is ${field.labelName} input field visible in form: ${isFieldVisible}`);
      if (!isFieldVisible) {
        continue;
      }
      if (field.fieldType === 'dropdown') {
        await this.setFormDropdownValue(field);
      } else if (field.fieldType === 'combobox') {
        await this.setFormComboboxValue(field);
      } else if (field.fieldType === 'date') {
        await this.setFormDateValue(field);
      } else {
        await this.setFormTextValue(field);
      }
      await this.page.keyboard.press('Tab').catch(() => undefined);
    }
  }

  // ==========================================
  // Public Actions - Create Placeholder Flyout
  // ==========================================

  public async isFlyoutOpen(): Promise<boolean> {
    await this.flyoutTitle.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') }).catch(() => undefined);
    const isDisplayed = await this.flyoutTitle.isVisible().catch(() => false);
    await this.log.logMessage('INFO', `Flyout is opened: ${isDisplayed}`);
    return isDisplayed;
  }

  public async createCloneMember(): Promise<boolean> {
    const isEnabled = await this.npiCloneMemberCreateBtn.isEnabled().catch(() => false);
    if (!isEnabled) {
      await this.log.logMessage('INFO', 'Create clone member button is disabled');
      return false;
    }
    await this.doClick(this.npiCloneMemberCreateBtn, 'Clicked on create button to clone member');
    return true;
  }

  public async clickOnCancelIcon(): Promise<void> {
    await this.npiCloseIconInFlyout.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.npiCloseIconInFlyout, 'Clicked on cancel icon in flyout');
  }

  public async createMemberForm(
    formData: any[],
    mode: 'choose' | 'ref-assortment',
    placeholderType: 'Member' | 'Intersection'
  ): Promise<void> {
    await this.doClick(this.placeholderTypeButton(placeholderType), `Clicked on ${placeholderType} button`);
    for (const field of formData) {
      if (field.DIMENSION_NAME === 'ITEM') {
        const nodes = String(field.VALUE || '').split('>').filter(Boolean);
        if (nodes.length > 0) {
          await this.doClick(this.npiSelectProductDropdown, 'Clicked on product dropdown');
          await this.doEnterText(this.npiDropdownSearchInput, nodes[nodes.length - 1], `Entering ${nodes[nodes.length - 1]} in search input`);
          for (let i = 0; i < nodes.length - 1; i++) {
            const accordion = this.nodeAccordion(nodes[i]);
            if (await accordion.isVisible().catch(() => false)) {
              await this.doClick(accordion, `Expanding ${nodes[i]} from dropdown`);
            }
          }
          await this.doClick(this.nodeOption(nodes[nodes.length - 1]), `Selecting ${nodes[nodes.length - 1]} from dropdown`);
        }
        if (placeholderType === 'Member') {
          await this.doEnterText(this.npiNewNameInput, field.newItemName || '', 'Entering new name');
          await this.clearAndSetInputValue(this.npiNoOfVariantsInput, field.noOfVariants || '1');
        }
        continue;
      }

      if (placeholderType === 'Member') {
        await this.doClick(this.radioButton(field.DIMENSION_NAME, mode), `Clicked on ${mode} radio button in ${field.DIMENSION_NAME} dimension`);
      }

      if (mode === 'choose') {
        await this.doClick(this.multiSelectDropdown(field.DIMENSION_NAME), `Clicked on ${field.DIMENSION_NAME} dropdown`);
        for (const value of field.VALUE || []) {
          const nodes = String(value).split('>').filter(Boolean);
          if (nodes.length === 0) {
            continue;
          }
          await this.doEnterText(this.npiDropdownSearchInput, nodes[nodes.length - 1], `Entering ${nodes[nodes.length - 1]} in search input`);
          for (let i = 0; i < nodes.length - 1; i++) {
            const accordion = this.nodeAccordionInMultiSelect(nodes[i]);
            if (await accordion.isVisible().catch(() => false)) {
              await this.doClick(accordion, `Expanding ${nodes[i]} from dropdown`);
            }
          }
          await this.doClick(this.nodeOption(nodes[nodes.length - 1]), `Selecting ${nodes[nodes.length - 1]} from dropdown`);
          if (await this.npiClearSearchIcon.isVisible().catch(() => false)) {
            await this.doClick(this.npiClearSearchIcon, 'Clearing search input in dropdown');
          }
        }
        if (await this.flyoutPresentation.isVisible().catch(() => false)) {
          await this.doClick(this.flyoutPresentation, 'Clicking away to close dropdown');
        }
      }
    }
    await this.createCloneMember();
  }

  public async validateDimesionsInUI(expectedDimensions: string[]): Promise<boolean> {
    await this.dimensionsFromFlyout.first().waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    const dimensionTexts = (await this.dimensionsFromFlyout.allTextContents()).map((text) => text.trim()).filter(Boolean);
    if (dimensionTexts.length !== expectedDimensions.length) {
      await this.log.logMessage('ERROR', `Expected dimensions count: ${expectedDimensions.length}, Actual dimensions count: ${dimensionTexts.length}`);
      return false;
    }
    return expectedDimensions.every((expected) =>
      dimensionTexts.some((actual) => actual.toLowerCase().includes(expected.toLowerCase()))
    );
  }
}
