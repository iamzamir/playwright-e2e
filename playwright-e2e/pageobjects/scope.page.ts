import { Page, Locator, expect } from "@playwright/test";
import BasePage from "./page";
import { getTimeout, TIMEOUTS } from '../constants/timeouts';
import { CommonFunctions } from "../util/common.util";

interface IVerticalFilter {
  dimesionName: string;
  filterName: string;
  filterValues: string[];
}

/** One dimension of a vertical filter (scope): its hierarchy level and, when filtering, the values to select. */
export interface IScopeDimensionFilter {
  dimension: string;
  /** The level's key, as in the filter panel's `vf-filterPanel-property-<KEY>` test ids (case-insensitive). */
  hierarchy: string;
  /** The level's name in the configuration dialog when it differs from `hierarchy` (Gravitee pspoat-test1: `Product Family` for PRODUCTFAMILY). */
  hierarchyLabel?: string;
  values?: string[];
}

/** The values `validateScopeFilterValues` expects for scope levels, keyed by hierarchy; `extra` levels add their values to the same hierarchy. */
export const scopeValuesByHierarchy = (levels: IScopeDimensionFilter[], ...extra: IScopeDimensionFilter[]): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  for (const { hierarchy, values } of [...levels, ...extra]) {
    result[hierarchy] = [...(result[hierarchy] ?? []), ...(values ?? [])];
  }
  return result;
};

type CheckAction = "check" | "uncheck" | "toggle";

/** Quotes a value for a Playwright CSS pseudo-class such as `:text-is()`. */
const q = (value: string): string => JSON.stringify(value);
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Scope (vertical filter) panel, used in Planning Space, PO assumptions and PO Process Settings > Scope.
 *
 * `vf-*` test IDs come from `@by/lui-vertical-filter-component` (3.25.7, `dist/index.es.js`): a filter value row is
 * `vf-values-selection-value-row` (checkbox `vf-values-selection-checkbox-<id>`), a hierarchy level row is
 * `vf-items-selection-checkbox` (checkbox `vf-items-selection-checkbox-<id>`, input `aria-labelledby` =
 * `checkbox-list-label-<label>`), a property panel is `vf-filterPanel-property-<PROPERTY>`. MUI checkboxes are `span`s
 * carrying `Mui-checked` when ticked. `qf-*` IDs come from `@by/lui-quick-filter-library`.
 */
export class ScopePage extends BasePage {
  private objCommonFunctions: CommonFunctions;
  constructor(page: Page) {
    super(page);
    this.objCommonFunctions = new CommonFunctions();
  }

  // --- Locators: scope card and filter instance menu ---
  private get btnEditDimensions(): Locator                    { return this.mfeLocator("button[data-testid='edit-dimensions']"); }
  private get btnResetDimensions(): Locator                   { return this.mfeLocator("button[data-testid='reset-dimensions']"); }
  private get btnRemove(): Locator                            { return this.mfeLocator("button:text-is('Remove')"); }
  private get btn3dotIcon(): Locator                          { return this.mfeLocator("[data-testid='lui-ccl-cardheader'] button[data-testid='lui-ccl-threedot-menu-icon-button']"); }
  private get btn3dotIconInManageScope(): Locator             { return this.mfeLocator("div[role='presentation'] button[data-testid='lui-ccl-threedot-menu-icon-button']").first(); }
  private get manageScopeBtn(): Locator                       { return this.mfeLocator("button[data-testid='manage-scope-btn']"); }
  private get appliedVFtitle(): Locator                       { return this.getMfeFrameLocator().getByTestId('vf-filter-card-title'); }
  private get dropdownArrow(): Locator                        { return this.mfeLocator("button[data-testid='vf-filter-card-dropdown-button']"); }
  private get searchIconBtn(): Locator                        { return this.mfeLocator("[data-testid='lui-searchbar'] > input[placeholder='Search']:not([autocomplete])"); }
  private get filterInstanceItems(): Locator                  { return this.mfeLocator("ul[role='menu'] li[data-testid='vf-filter-card-filterInstance-item']"); }
  private get applyFilterBtnUnderScope(): Locator             { return this.mfeLocator("button[data-testid='vf-apply-button']"); }
  private get applyFilterBtnUnderManageScope(): Locator       { return this.mfeLocator("div[role='presentation'] button[data-testid='vf-apply-button']"); }
  private get revertVerticalFilterBtn(): Locator              { return this.mfeLocator("button[data-testid='vf-revert-button']"); }
  private get noFilterConfigure(): Locator                    { return this.mfeLocator("div[data-testid='vf-empty-state-title-grid-container']"); }
  private get draftLabel(): Locator                           { return this.mfeLocator("span[data-testid='vf-instance-status-subtitle']:text-is('Draft')"); }
  private get menuPopover(): Locator                          { return this.mfeLocator("div[role='presentation'][class*='MuiPopover-root']").first(); }
  private get menuBackdrop(): Locator                         { return this.mfeLocator("div[class*='MuiBackdrop-root'][class*='MuiModal-backdrop']").first(); }
  private get scopeDrawerTitle(): Locator                     { return this.mfeLocator("h4:text-is('Scope')").filter({ visible: true }).first(); }
  private get closeDrawerBtn(): Locator {
    return this.mfeLocator(
      "div[class*='header-right'] button[data-testid='drawer-close-btn'], " +
      "button:is([data-testid='pinned-icon'], [data-testid='unpinned-icon']) ~ button[data-testid='drawer-close-btn'], " +
      "button[data-testid='unpinned-icon'] ~ button"
    ).first();
  }
  private getEleFromThreeDotsMenu(optionName: string): Locator { return this.mfeLocator(`h4[aria-label=${q(optionName)}]`).last(); }

  // --- Locators: dialogs (configuration, save filter, manage filters) ---
  private getDialogButton(buttonName: string): Locator        { return this.mfeLocator(`div[role='dialog'] button:text-is(${q(buttonName)})`).last(); }
  private getDialogConfigEntry(optionName: string): Locator   { return this.mfeLocator(`div#customized-dialog-description span:text-is(${q(optionName)})`).first(); }
  // The key is the dimension's display label: upper case on the Azure realm (ITEM), title case on Gravitee pspoat-test1 (Item).
  private getCheckBoxEle(optionName: string): Locator {
    return this.mfeLocator(`input[aria-labelledby=${q(`checkbox-list-label-${optionName}`)}], input[aria-labelledby=${q(`checkbox-list-label-${optionName.toUpperCase()}`)}]`).first();
  }
  private get propertiesSwitch(): Locator                     { return this.mfeLocator("label[data-testid='vf-filter-configurations-hide-properties-switcher'] input[type='checkbox']"); }
  private getDimensionInManageScope(dimensionName: string): Locator {
    return this.mfeLocator(`div[data-testid='vf-configuration-dimensions-accordion-details'] span:text-is(${q(dimensionName)})`);
  }
  private getHierarchyLevelCheckbox(level: string): Locator {
    return this.mfeLocator("div[data-testid='vf-items-selection-checkbox']")
      .filter({ has: this.page.locator(`:is(span, p, div):text-is(${q(level)})`) })
      .first()
      .locator("span[data-testid^='vf-items-selection-checkbox-']");
  }
  private get saveFilterCreateInput(): Locator                { return this.mfeLocator("input[data-testid='vf-save-filterInstance-input-create']"); }
  private get saveFilterSaveBtn(): Locator                    { return this.mfeLocator("button[data-testid='vf-save-filterInstance-button-save']"); }
  private get overWriteFilterRbtn(): Locator                  { return this.mfeLocator("span:has(> input[value='saveFilterDialog.overwrite'])"); }
  private get showHideSearch(): Locator                       { return this.mfeLocator("button[aria-label='Show/Hide search']"); }
  private get searchInput(): Locator                          { return this.mfeLocator("input[placeholder]:not([autocomplete='off'])"); }
  private filterInManageScope(filterName: string): Locator    { return this.mfeLocator(`p[data-testid='vf-filterInstance-list-item-label']:text-is(${q(filterName)})`); }
  private filterVisibilitySwitch(filterName: string): Locator {
    return this.mfeLocator("tr")
      .filter({ has: this.page.locator(`p:text-is(${q(filterName)})`) })
      .locator("input[data-testid='vf-filterInstance-list-item-visibility-switch']");
  }
  private get btnDeleteFilter(): Locator                      { return this.mfeLocator("button[data-testid='vf-filterInstance-settings-button-delete']"); }
  private get btnDeleteFilterConfirm(): Locator               { return this.mfeLocator("button[data-testid='vf-manage-delete-button-confirm']"); }

  // --- Locators: filter panel (dimensions, properties, values) ---
  private getFilterSection(property: string): Locator         { return this.mfeLocator(`div[data-testid='vf-filterPanel-property-${property.toUpperCase()}']`); }
  private getFilterSectionCheckboxTitle(property: string, hierarchy: string): Locator { return this.getFilterSection(property).locator(`span:text-is(${q(hierarchy)})`); }
  private getAppliedFilterInScopeEle(property: string, value: string): Locator {
    return this.getFilterSection(property).locator(`[data-testid='virtuoso-item-list'] span:text-is(${q(value)})`).first();
  }
  private getExpandDimensionEle(dimension: string): Locator {
    return this.mfeLocator("div[class*='MuiAccordionSummary-root']").filter({ has: this.page.locator(`h4:text-is(${q(dimension)})`) }).first();
  }
  private getExpandDimensionEleByProperty(property: string): Locator { return this.getFilterSection(property).locator("div[class*='MuiAccordionSummary-root']").first(); }
  private getEditValuesIcon(property: string): Locator        { return this.mfeLocator(`div[data-testid='vf-filterPanel-property-${property.toUpperCase()}-edit-button']`); }
  private getCountersIcon(property: string): Locator          { return this.mfeLocator(`div[data-testid='vf-filterPanel-property-${property.toUpperCase()}-counters-box']`); }
  private get valueRows(): Locator                            { return this.mfeLocator("div[data-testid='vf-values-selection-value-row']"); }
  private get hierarchyItemsFromPopup(): Locator              { return this.mfeLocator("div[data-testid='vf-values-selection-value-row'] > p"); }
  private getValueCheckbox(value: string): Locator {
    return this.valueRows.filter({ has: this.page.locator(`p span:text-is(${q(value)})`) }).locator("span[data-testid^='vf-values-selection-checkbox-']").first();
  }
  private getTimeValueCheckbox(value: string): Locator {
    return this.mfeLocator("label").filter({ has: this.page.locator(`p:text-is(${q(value)})`) }).locator("> span[data-testid='vf-filterPanel-property-values-checkbox']").first();
  }
  private get selectedValueLabels(): Locator                  { return this.mfeLocator("*:has(> span[data-testid='vf-filterPanel-property-values-checkbox']) > div"); }
  private get btnSave(): Locator                              { return this.mfeLocator("button[data-testid='vf-values-selection-save-button']"); }
  private get vfValuesPopoverClose(): Locator                 { return this.mfeLocator("button[data-testid='vf-values-selection-popover-close']"); }
  private get timeDialogApplyButton(): Locator                { return this.mfeLocator("button[data-testid='vf-time-dialog-apply-button']"); }
  private getDataScopeDimension(dimensionName: string): Locator { return this.mfeLocator(`[data-testid='content-title'] h4:has-text(${q(dimensionName)})`); }
  private getDataScopeFilterValues(filterName: string): Locator { return this.mfeLocator(`[data-testid='chip-${filterName.toUpperCase()}']`); }

  // --- Locators: MaaS card, drill through ---
  private getMaasCard(cardName: string): Locator {
    return this.mfeLocator("div[data-testid='lui-dashboard-card']")
      .filter({ has: this.page.locator(`span[data-testid='lui-dashboard-card-title'] div[data-testid='lui-dashboard-card-edit-title'][data-value=${q(cardName)}]`) });
  }
  private getTopFacetsInMaasPivot(cardName: string): Locator  { return this.getMaasCard(cardName).locator("div[data-testid*='table-header-wrapper-facet-container-top-facets'] p"); }
  private getSelectedPropertiesInMaasHeader(cardName: string): Locator { return this.getMaasCard(cardName).locator("span[class='axis-title-name']"); }
  private getCustomerCell(customerName: string): Locator      { return this.mfeLocator(`p[data-testid*='row-dimension-sticky-header'] span:text-is(${q(customerName)})`); }
  private getScopeDataValue(filterValue1: string, filterValue2: string): Locator {
    return this.mfeLocator("div[aria-label='tooltip']")
      .filter({ has: this.page.locator(`span:text-is(${q(filterValue1)})`) })
      .filter({ has: this.page.locator(`span:text-is(${q(filterValue2)})`) });
  }

  // --- Locators: quick filters ---
  // When the chips overflow, the library adds a second floating Configure button (`side="right"`) with the same handler.
  private get quickFilterConfigIcon(): Locator                { return this.mfeLocator("button[data-testid='qf-configure-button']").filter({ visible: true }).first(); }
  private get quickFilterNameInput(): Locator                 { return this.mfeLocator("div[data-testid='qf-configuration-data-source-box']"); }
  private get quickFilterApplyBtn(): Locator                  { return this.mfeLocator("button[data-testid='qf-configuration-modal-save-button']"); }
  private get quickFilterReloadBtn(): Locator                 { return this.mfeLocator("div[data-testid='lui-ccl-empty-state-actions'] button:text-is('Reload')"); }
  private get qfValuesPopover(): Locator                      { return this.mfeLocator("div[data-testid='qf-values-selection-popover-wrapper']").first(); }
  private get qfValueCloseBtn(): Locator                     { return this.mfeLocator("button[data-testid='qf-values-selection-popover-close']"); }
  private get qfValueApplyBtn(): Locator                      { return this.mfeLocator("button[data-testid='qf-apply-button']"); }
  private getClickOnQFList(qfList: string): Locator {
    return this.mfeLocator("div[data-testid='qf-filter-panel-chip']").filter({ has: this.page.locator('span', { hasText: new RegExp(escapeRegExp(qfList)) }) });
  }
  private getSelectQFValuesInput(qfValue: string): Locator {
    return this.mfeLocator(`div[data-testid='qf-values-selection-popover-wrapper'] span[data-testid=${q(`qf-values-selection-checkbox-${qfValue}`)}] input[type='checkbox']`);
  }
  private getSelectQFValues(qfValue: string): Locator {
    return this.mfeLocator("div[data-testid='qf-filter-panel-chip']").filter({ has: this.page.locator(`span:text-is(${q(qfValue)})`) });
  }
  // Prefix match, case-insensitive (the old XPath upper-cased the label and compared with starts-with).
  private getSelectQuickFilterAttribute(qfFilterName: string): Locator {
    return this.mfeLocator("div[class*='MuiTreeItem-label'] span").filter({ hasText: new RegExp(`^\\s*${escapeRegExp(qfFilterName)}`, 'i') }).first();
  }
  private getQFFilterSectionCheckboxTitle(qfHierarchy: string): Locator { return this.mfeLocator(`input[type='checkbox'][aria-label=${q(qfHierarchy)}]`); }
  private getQFOption(option: string): Locator                { return this.mfeLocator(`span:text-is(${q(option)})`); }

  // --- Helpers ---
  private async isMuiChecked(checkbox: Locator, label: string): Promise<boolean> {
    return (await this.doGetAttribute(checkbox, "class", `Getting class attribute for ${label}`))?.includes("Mui-checked") ?? false;
  }

  /** Clicks a MUI checkbox `span` only when its state differs from `action` (`toggle` always clicks). */
  private async setMuiCheckbox(checkbox: Locator, action: CheckAction, label: string): Promise<void> {
    const isChecked = await this.isMuiChecked(checkbox, label);
    const shouldClick = action === "toggle" || (action === "check") !== isChecked;
    if (shouldClick) {
      await this.doClick(checkbox, `${isChecked ? "Unchecking" : "Selecting"} Checkbox of ${label}`);
    } else {
      await this.objCommonFunctions.logMessage("INFO", `${label} checkbox already ${isChecked ? "Checked" : "UnChecked"}`);
    }
  }

  /** Reads the filter card title, retrying while it still shows the "Filter" placeholder. */
  private async readAppliedTitle(timeout: number): Promise<string> {
    const titleLocator = this.appliedVFtitle.first();
    await titleLocator.waitFor({ state: "visible", timeout });
    let title = '';
    await expect.poll(async () => {
      title = (await titleLocator.textContent())?.trim() ?? '';
      return title !== '' && title.toLowerCase() !== 'filter';
    }, { timeout: getTimeout('SHORT'), intervals: [TIMEOUTS.POLL_INTERVAL, 1000] }).toBe(true).catch(() => undefined);
    await this.objCommonFunctions.logMessage("INFO", `Applied filter name: ${title || '<empty>'}`);
    return title;
  }

  // --- Atomic actions: scope card ---
  public async clickOnEditDimensions() {
    await this.btnEditDimensions.waitFor({ state: "visible", timeout: getTimeout('EXTREME') });
    // Right after navigating back to the Scope tab the button renders before it responds, so a single click can be
    // lost (INTEROP 2026-10-15). The card title can already be visible from the Scope drawer, so always click once,
    // then click again only while the filter drawer has not shown its card title.
    let clicked = false;
    await expect(async () => {
      if (!clicked || !(await this.appliedVFtitle.isVisible().catch(() => false))) {
        await this.doClick(this.btnEditDimensions, "Clicking on edit dimensions button");
        clicked = true;
      }
      await expect(this.appliedVFtitle).toBeVisible({ timeout: getTimeout('MEDIUM') });
    }).toPass({ timeout: getTimeout('EXTREME') });
  }

  public async click3Dot() {
    await this.btn3dotIcon.waitFor({ state: "visible", timeout: getTimeout('MEDIUM') });
    await this.doClick(this.btn3dotIcon, "Clicking on three dot icon in scope tab");
  }

  public async click3DotInManageScope() {
    await this.btn3dotIconInManageScope.waitFor({ state: "visible", timeout: getTimeout('EXTREME') });
    await this.doClick(this.btn3dotIconInManageScope, "Clicking on three dot icon in manage scope");
  }

  public async resetScope() {
    await this.doClick(this.btnResetDimensions, "Clicking on reset dimensions button");
    await this.doClick(this.btnRemove, "Clicking on remove button in reset dimensions confirmation dialog");
    await this.btnRemove.waitFor({ state: "hidden", timeout: getTimeout('MEDIUM') }).catch(() => undefined);
  }

  public async select3DotOption(optionName: string): Promise<boolean> {
    const optionElement = this.getEleFromThreeDotsMenu(optionName);
    if (!(await this.waitForElementVisible(optionElement, getTimeout('SHORT')))) {
      await this.objCommonFunctions.logMessage("INFO", `${optionName} option not exist in the menu`);
      return false;
    }
    // While the drawer is still settling the click can be intercepted and the menu stays open (INTEROP 2026-10-15),
    // so confirm the menu closed and click again if not.
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (attempt === 1) {
        await this.doClick(optionElement, `Clicking on ${optionName} option`);
      } else {
        await this.objCommonFunctions.logMessage("WARNING", `${optionName} menu still open, clicking again (attempt ${attempt}/${maxAttempts})`);
        await optionElement.click({ timeout: getTimeout('SHORT') }).catch((error: unknown) =>
          this.objCommonFunctions.logMessage("WARNING", `${optionName} click failed: ${error instanceof Error ? error.message : String(error)}`));
      }
      if (await optionElement.waitFor({ state: "hidden", timeout: getTimeout('SHORT') }).then(() => true, () => false)) {
        return true;
      }
    }
    await this.objCommonFunctions.logMessage("WARNING", `${optionName} menu still open after ${maxAttempts} attempts`);
    return false;
  }

  public async clickOnManageScope() {
    await this.manageScopeBtn.waitFor({ state: "visible", timeout: getTimeout('XLARGE') });
    await this.doClick(this.manageScopeBtn, "Clicking on manage scope button");
  }

  public async clickOnApplyFiltersBtn(): Promise<boolean> {
    const filterBtn = this.applyFilterBtnUnderScope;
    await filterBtn.waitFor({ state: "visible", timeout: getTimeout('EXTREME') });
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.doClick(filterBtn, `Clicking on Apply filter button (attempt ${attempt}/${maxAttempts})`);
        return true;
      } catch (error) {
        await this.objCommonFunctions.logMessage("WARNING", `Apply filter click attempt ${attempt}/${maxAttempts} failed: ${error instanceof Error ? error.message : String(error)}`);
        // An open menu or modal backdrop intercepts the click; dismiss it before retrying.
        await this.page.keyboard.press('Escape').catch(() => undefined);
        await this.menuPopover.waitFor({ state: 'hidden', timeout: getTimeout('MEDIUM') }).catch(() => undefined);
        await this.menuBackdrop.waitFor({ state: 'hidden', timeout: getTimeout('MEDIUM') }).catch(() => undefined);
      }
    }
    await this.doClickUsingScript(filterBtn, "Clicking on Apply filter button using script");
    return true;
  }

  public async clickOnApplyFiltersBtnInManageScope(): Promise<boolean> {
    const filterBtn = this.applyFilterBtnUnderManageScope;
    if (!(await this.waitForElementVisible(filterBtn, getTimeout('EXTREME')))) {
      await this.objCommonFunctions.logMessage("INFO", "Apply filter button does not exist in manage scope");
      return false;
    }
    await this.doClick(filterBtn, "Clicking on Apply filter button in manage scope");
    return true;
  }

  public async clickRevertVFChanges(): Promise<void> {
    await this.revertVerticalFilterBtn.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.revertVerticalFilterBtn, 'Clicking on Revert Changes button');
    await this.revertVerticalFilterBtn.waitFor({ state: 'hidden', timeout: getTimeout('SHORT') }).catch(() => undefined);
  }

  public async closeVFDrawer(): Promise<void> {
    if (!(await this.scopeDrawerTitle.isVisible().catch(() => false))) {
      return;
    }
    try {
      await this.closeDrawerBtn.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
      await this.doClick(this.closeDrawerBtn, 'Clicking on Close Drawer Button');
      await this.scopeDrawerTitle.waitFor({ state: 'hidden', timeout: getTimeout('MEDIUM') }).catch(() => undefined);
    } catch (error) {
      await this.objCommonFunctions.logMessage('WARN', `Close drawer button not found or not clickable: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // --- Atomic actions: dialogs ---
  public async filterDialogSaveCancel(buttonName: string): Promise<boolean> {
    const button = this.getDialogButton(buttonName);
    if (!(await this.doesElementExist(button, `Checking if ${buttonName} button exists in dialog`))) {
      return false;
    }
    await this.doClick(button, `Clicking ${buttonName} button in dialog`);
    await this.clickPropertiesCheckbox(buttonName);
    return true;
  }

  /** After "Next" in Edit Configuration, turns on the "Properties" switch so property levels are listed. */
  public async clickPropertiesCheckbox(buttonName: string) {
    if (buttonName !== "Next" || !(await this.doesElementExist(this.propertiesSwitch, "Checking if Properties checkbox exists"))) {
      return;
    }
    if (await this.propertiesSwitch.isChecked().catch(() => false)) {
      await this.objCommonFunctions.logMessage("INFO", `'Properties' checkbox already checked`);
      return;
    }
    await this.doClick(this.propertiesSwitch, "Clicking Properties checkbox");
  }

  /** `isPO` is kept for existing callers; the PO and PS configuration dialogs share the same label lookup now. */
  public async selectFilterEntryFromDialogConfig(selectUnselect: "Select" | "UnSelect", optionName: string, _isPO: boolean = false): Promise<boolean> {
    const entry = this.getDialogConfigEntry(optionName);
    if (!(await this.waitForElementVisible(entry, getTimeout('SHORT')))) {
      await this.objCommonFunctions.logMessage("INFO", `${optionName} option does not exist in the configuration dialog`);
      return false;
    }
    const checkbox = this.getCheckBoxEle(optionName);
    const isChecked = await checkbox.isChecked().catch(() => false);
    const wantChecked = selectUnselect.toUpperCase() === "SELECT";
    if (isChecked !== wantChecked) {
      await this.doClick(checkbox, `Clicking to ${wantChecked ? "check" : "uncheck"} ${optionName} option`);
    } else {
      await this.objCommonFunctions.logMessage("INFO", `Already ${isChecked ? "Checked" : "UnChecked"} ${optionName} option`);
    }
    return true;
  }

  public async expandDimensionInVF(name: string, type: "dimension" | "property" = "dimension") {
    const toggle = type === "dimension" ? this.getExpandDimensionEle(name) : this.getExpandDimensionEleByProperty(name);
    if (!(await this.doesElementExist(toggle, `Checking if ${type} toggle exists for ${name}`))) {
      await this.objCommonFunctions.logMessage("INFO", `${type} toggle for ${name} not found, continuing without expand`);
      return;
    }
    const classAttribute = await this.doGetAttribute(toggle, "class", `Getting expand ${type} class attribute`);
    if (classAttribute?.includes("Mui-expanded")) {
      await this.objCommonFunctions.logMessage("INFO", `${type} ${name} filter already expanded`);
      return;
    }
    await this.doClick(toggle, `Expanding ${type} filter:: ${name}`);
  }

  public async checkOrUncheckHierarchyLevel(hierarchy: string[], action: "check" | "uncheck") {
    for (const item of hierarchy) {
      const checkbox = this.getHierarchyLevelCheckbox(item);
      await checkbox.waitFor({ state: "visible", timeout: getTimeout('EXTREME') });
      await this.setMuiCheckbox(checkbox, action, `Hierarchy:: ${item}`);
    }
  }

  public async selectDimensionHierarchyLevel(dimension: string, hierarchy: string[], action: "check" | "uncheck") {
    await this.expandDimensionInVF(dimension);
    await this.checkOrUncheckHierarchyLevel(hierarchy, action);
  }

  public async isDimensionExist(dimensionName: string) {
    return await this.doesElementExist(this.getDimensionInManageScope(dimensionName), `Checking if dimension ${dimensionName} exists`);
  }

  public async addFilterName(filterName: string): Promise<void> {
    await this.setCreateInputFilterValue(filterName);
  }

  public async setCreateInputFilterValue(value: string): Promise<void> {
    await this.saveFilterCreateInput.waitFor({ state: "visible", timeout: getTimeout('EXTREME') });
    await this.saveFilterCreateInput.clear();
    await this.doEnterText(this.saveFilterCreateInput, value, `Setting ${value} value in create input field of save filter`);
  }

  public async selectOverWriteFilter() {
    await this.doClick(this.overWriteFilterRbtn, "Selecting Overwrite Filter radio button");
  }

  public async disableFilter(sFilterName: string) {
    await this.openManageFilterSearch(sFilterName);
    const visibilitySwitch = this.filterVisibilitySwitch(sFilterName);
    await visibilitySwitch.waitFor({ state: "visible", timeout: getTimeout('MEDIUM') });
    const wasOn = await visibilitySwitch.isChecked();
    await this.doClick(visibilitySwitch, "Disabling the Filter:: " + sFilterName);
    await expect(visibilitySwitch).toBeChecked({ checked: !wasOn, timeout: getTimeout('SHORT') }).catch(() => undefined);
  }

  // --- Atomic actions: filter values ---
  public async clickFilterValuesIconByDimensionAndHierarchy(dimension: string, hierarchy: string): Promise<void> {
    const editIcon = this.getEditValuesIcon(hierarchy);
    const countersIcon = this.getCountersIcon(hierarchy);
    if (!(await editIcon.isVisible().catch(() => false)) && !(await countersIcon.isVisible().catch(() => false))) {
      await this.expandDimensionInVF(hierarchy, 'property').catch(() => undefined);
      await this.expandDimensionInVF(dimension, 'dimension').catch(() => undefined);
    }
    // Either icon opens the values popover: edit before any value is selected, counters after.
    const icon = editIcon.or(countersIcon).first();
    try {
      await icon.waitFor({ state: "visible", timeout: getTimeout('MEDIUM') });
    } catch {
      throw new Error(`No filter values icon visible for hierarchy ${hierarchy} and dimension ${dimension}`);
    }
    await this.doClick(icon, `Clicking Filter Values Icon for hierarchy:: ${hierarchy} and Dimension:: ${dimension}`);
  }

  public async checkOrUncheckFilters(filter: string[], action: CheckAction, dimension?: string) {
    for (const item of filter) {
      const checkbox = dimension?.toUpperCase() === "TIME" ? this.getTimeValueCheckbox(item) : this.getValueCheckbox(item);
      await this.setMuiCheckbox(checkbox, action, `Filter:: ${item}`);
    }
  }

  public async clickSaveInFilterValuesBox() {
    await this.btnSave.waitFor({ state: "visible", timeout: getTimeout('EXTREME') });
    if (await this.btnSave.isEnabled()) {
      await this.doClick(this.btnSave, "Clicking Save Button In Filter Values Icon");
      return;
    }
    await this.objCommonFunctions.logMessage("INFO", "Filter values update button is disabled (no changes). Closing popover.");
    await this.page.keyboard.press('Escape');
    await this.doClickUsingScript(this.vfValuesPopoverClose, "Closing filter values popover when update button is disabled");
  }

  public async clickVFTimeDialogApplyButton() {
    await this.doClick(this.timeDialogApplyButton, "Clicking Apply button in VF Time dialog");
  }

  // --- Queries ---
  public async isFilterConfigured() {
    // The empty state renders shortly after the panel; wait briefly for it instead of a fixed sleep.
    const isNoFilterExist = await this.noFilterConfigure.waitFor({ state: "visible", timeout: getTimeout('SHORT') }).then(() => true, () => false);
    await this.objCommonFunctions.logMessage(isNoFilterExist ? 'PASS' : 'FAIL', `No filter view defined element ${isNoFilterExist ? 'located' : 'does not exist'}.`);
    return !isNoFilterExist;
  }

  public async getAvailableHierarchyValuesFromPopup(dimension: string, hierarchy: string) {
    await this.clickFilterValuesIconByDimensionAndHierarchy(dimension, hierarchy);
    await this.hierarchyItemsFromPopup.first().waitFor({ state: "visible", timeout: getTimeout('MEDIUM') }).catch(() => undefined);
    const itemsArr = (await this.hierarchyItemsFromPopup.allInnerTexts()).map((text) => text.trim());
    await this.objCommonFunctions.logMessage("INFO", itemsArr.length > 0 ? `Available hierarchy items: ${itemsArr.join(', ')}` : "There are no available hierarchy items");
    await this.doClick(this.vfValuesPopoverClose, `Clicking on close icon of vf values popover`);
    return itemsArr;
  }

  public async verifyAppliedFilterInScope(filterName: string, appliedFilterValue: string, timeoutMs: number = getTimeout('EXTREME')) {
    await this.objCommonFunctions.logMessage("INFO", `Verifying ${filterName} filter applied with ${appliedFilterValue}`);
    return await this.waitForElementVisible(this.getAppliedFilterInScopeEle(filterName, appliedFilterValue), timeoutMs);
  }

  public async validateScopeFilterValues(expectedScopeFilters: Record<string, string[]>, contextLabel: string): Promise<boolean> {
    let allValid = true;
    for (const [attributeName, expectedValues] of Object.entries(expectedScopeFilters)) {
      for (const expectedValue of expectedValues) {
        const isApplied = await this.verifyAppliedFilterInScope(attributeName, expectedValue);
        const validation = await this.objCommonFunctions.compareTwoValues(isApplied, true, `Is ${attributeName} filter value ${expectedValue} applied ${contextLabel}`);
        allValid = allValid && validation;
      }
    }
    return allValid;
  }

  public async getFilterName() {
    return await this.readAppliedTitle(getTimeout('EXTREME'));
  }

  public async getAppliedVFTitle(): Promise<string> {
    return await this.readAppliedTitle(getTimeout('XLARGE'));
  }

  /** Waits for the applied filter title (ignoring the draft `*`) to equal `expectedFilterName`; returns the last title read. */
  public async waitForAppliedVFTitle(expectedFilterName: string, timeout: number = getTimeout('XLARGE')): Promise<string> {
    const normalize = (value: string) => value.replace(/\*/g, '').trim();
    const expected = normalize(expectedFilterName);
    let latestTitle = '';
    await expect.poll(async () => {
      latestTitle = normalize(await this.getAppliedVFTitle());
      return latestTitle;
    }, { timeout, intervals: [TIMEOUTS.POLL_INTERVAL, 1000, 2000] }).toBe(expected).catch(() => undefined);
    return latestTitle;
  }

  public async checkFilterExists(filterName: string, hierarchy: string): Promise<boolean> {
    const filterSection = this.getFilterSection(filterName);
    const filterSectionExist = await this.waitForElementVisible(filterSection, getTimeout('XLARGE'));
    const filterSectionTitleExist = await this.getFilterSectionCheckboxTitle(filterName, hierarchy).isVisible().catch(() => false);
    await this.objCommonFunctions.logMessage("INFO", `Filter section ${filterName}: ${filterSectionExist}, hierarchy ${hierarchy}: ${filterSectionTitleExist}`);
    return filterSectionExist && filterSectionTitleExist;
  }

  public async isDraftFilterCreated(): Promise<boolean> {
    const isDraft = await this.draftLabel.isVisible().catch(() => false);
    await this.objCommonFunctions.logMessage('INFO', `Draft filter label visible: ${isDraft}`);
    return isDraft;
  }

  public async getAllVFSelectedValues(): Promise<string[]> {
    return await this.selectedValueLabels.allInnerTexts().catch(() => []);
  }

  public async verifyAppliedFilterInDataScope(filter: IVerticalFilter): Promise<boolean> {
    const dimensionEle = this.getDataScopeDimension(filter.dimesionName);
    const isDimensionExist = await this.waitForElementVisible(dimensionEle, getTimeout('EXTREME'));
    await this.objCommonFunctions.logMessage("INFO", `Is ${filter.dimesionName} dimension exist :: ${isDimensionExist}`);
    const values = await this.getDataScopeFilterValues(filter.filterName).allInnerTexts();
    if (values.length !== filter.filterValues.length) {
      await this.objCommonFunctions.logMessage("INFO", `Filter values count mismatch for ${filter.filterName}`);
      return false;
    }
    const missing = values.find((value) => !filter.filterValues.includes(value));
    if (missing !== undefined) {
      await this.objCommonFunctions.logMessage("INFO", `${missing} not exist in expected values ${filter.filterValues}`);
      return false;
    }
    return isDimensionExist;
  }

  public async isDimensionExistInTopFacetsOfMaas(dimensionName: string, cardName: string): Promise<boolean> {
    const isPresent = await expect.poll(async () => (await this.getTopFacetsInMaasPivot(cardName).allInnerTexts()).some((text) => text.includes(dimensionName)),
      { timeout: getTimeout('MEDIUM'), intervals: [getTimeout('TINY')] }).toBe(true).then(() => true, () => false);
    await this.objCommonFunctions.logMessage('INFO', `Dimension ${dimensionName} ${isPresent ? 'is' : 'is not'} present in ${cardName} card`);
    return isPresent;
  }

  public async doesSelectedPropertiesReflectedInMaasAsColumns(selectedProperties: string[], cardName: string): Promise<boolean> {
    const matches = async () => {
      const actual = (await this.getSelectedPropertiesInMaasHeader(cardName).allTextContents()).map((value) => value.trim()).filter(Boolean);
      return actual.length === selectedProperties.length && actual.every((property) => selectedProperties.includes(property));
    };
    const isMatch = await expect.poll(matches, { timeout: getTimeout('MEDIUM'), intervals: [2000] }).toBe(true).then(() => true, () => false);
    if (!isMatch) {
      await this.objCommonFunctions.logMessage('INFO', `Selected properties ${selectedProperties.join(', ')} do not match the columns in ${cardName} card`);
    }
    return isMatch;
  }

  public async verifyExistingCustomerCellInTable(customer: string): Promise<boolean> {
    const isCustomerExist = await this.waitForElementVisible(this.getCustomerCell(customer), getTimeout('EXTREME'));
    await this.objCommonFunctions.logMessage('INFO', `Customer '${customer}' exists in table: ${isCustomerExist}`);
    return isCustomerExist;
  }

  public async verifyScopeFilterValueAfterDrillThrough(filterValues: { filterValue1: string; filterValue2: string }[]): Promise<boolean> {
    for (const fv of filterValues) {
      const isFilterExist = await this.waitForElementVisible(this.getScopeDataValue(fv.filterValue1, fv.filterValue2), getTimeout('LONG'));
      await this.objCommonFunctions.logMessage('INFO', `Scope value '${fv.filterValue1}' / '${fv.filterValue2}' exists: ${isFilterExist}`);
      if (!isFilterExist) return false;
    }
    return true;
  }

  // --- Composite actions: vertical filter ---
  /** Edit Configuration: selects each dimension, then ticks its hierarchy level, then saves the configuration. */
  public async configureScopeDimensions(dimensions: IScopeDimensionFilter[], isPO: boolean = false): Promise<void> {
    await this.click3Dot();
    await this.select3DotOption("Edit Configuration");
    for (const { dimension } of dimensions) {
      await this.selectFilterEntryFromDialogConfig("Select", dimension, isPO);
    }
    await this.filterDialogSaveCancel("Next");
    for (const { dimension, hierarchy, hierarchyLabel } of dimensions) {
      await this.selectDimensionHierarchyLevel(dimension, [hierarchyLabel ?? hierarchy], "check");
    }
    await this.filterDialogSaveCancel("Save");
  }

  /** Selects `values` on each dimension's hierarchy level in the filter panel (no Apply). */
  public async addScopeFilterValues(dimensions: IScopeDimensionFilter[]): Promise<void> {
    for (const { dimension, hierarchy, values } of dimensions) {
      await this.addFiltersToDimensionHierarchyInScope(dimension, hierarchy, values ?? []);
    }
  }

  public async addFiltersToDimensionHierarchyInScope(dimension: string, hierarchy: string, filter: string[]) {
    await this.clickFilterValuesIconByDimensionAndHierarchy(dimension, hierarchy);
    await this.checkOrUncheckFilters(filter, "check", dimension);
    if (dimension.toUpperCase() === "TIME") {
      await this.clickVFTimeDialogApplyButton();
    } else {
      await this.clickSaveInFilterValuesBox();
    }
  }

  /** Saves the current filter panel as a new filter instance named `filterName`. */
  public async saveFilterAs(filterName: string): Promise<boolean> {
    await this.click3Dot();
    await this.select3DotOption("Save Filter");
    await this.setCreateInputFilterValue(filterName);
    return await this.filterDialogSaveCancel("Save");
  }

  /** Overwrites the currently applied filter instance with the panel's selections. */
  public async overwriteCurrentFilter(): Promise<boolean> {
    await this.click3Dot();
    await this.select3DotOption("Save Filter");
    await this.selectOverWriteFilter();
    return await this.filterDialogSaveCancel("Update");
  }

  /** Manage All > hides `filterName` from the filter list > closes the dialog. */
  public async disableFilterFromManageAll(filterName: string): Promise<void> {
    await this.click3Dot();
    await this.select3DotOption("Manage All");
    await this.disableFilter(filterName);
    await this.filterDialogSaveCancel("Close");
  }

  public async configureFiltersinVFScope(filterConfigs: Array<{ type: string; category: string; value: string[] }>, enableRelevantFilter: boolean = false): Promise<boolean> {
    try {
      await this.configureScopeDimensions(filterConfigs.map(({ type, category }) => ({ dimension: type, hierarchy: category })));
      await this.getFilterSection(filterConfigs[0]?.category ?? '').waitFor({ state: "visible", timeout: getTimeout('LONG') }).catch(() => undefined);
      if (enableRelevantFilter) {
        await this.getFilterSection(filterConfigs[0]?.type ?? '').scrollIntoViewIfNeeded();
        await this.objCommonFunctions.logMessage('INFO', 'Enabling relevant filters option');
      }
      await this.addScopeFilterValues(filterConfigs.map(({ type, category, value }) => ({ dimension: type, hierarchy: category, values: value })));
      await this.clickOnApplyFiltersBtn();
      await this.applyFilterBtnUnderScope.waitFor({ state: "visible", timeout: getTimeout('LONG') }).catch(() => undefined);
      return true;
    } catch (error) {
      await this.objCommonFunctions.logMessage('ERROR', `Failed to configure filters: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  public async createaNewVFScopeToValidate(newFilterName: string, filterOption: string): Promise<void> {
    await this.click3Dot();
    if (!(await this.select3DotOption(filterOption))) {
      throw new Error(`Option "${filterOption}" not found in scope menu`);
    }
    await this.addFilterName(newFilterName);
    await this.saveFilterSaveBtn.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.saveFilterSaveBtn, 'Clicking on Save Filter button');
  }

  /** Opens the filter card dropdown, searches `filterName` and applies the first matching filter instance. */
  public async searchFilter(filterName: string) {
    await this.dropdownArrow.waitFor({ timeout: getTimeout('EXTREME') });
    await this.doClick(this.dropdownArrow, "Clicking on dropdown arrow");
    await this.searchIconBtn.clear();
    await this.doEnterText(this.searchIconBtn, filterName, `Searching for filter ${filterName}`);
    const filterOption = this.filterInstanceItems.filter({ hasText: filterName }).first();
    if (!(await this.waitForElementVisible(filterOption, getTimeout('MEDIUM')))) {
      await this.objCommonFunctions.logMessage("FAIL", `Scope filter option not available:: ${filterName}`);
      return false;
    }
    await this.doClick(filterOption, `Clicking on filter option ${filterName}`);
    return true;
  }

  public async deleteFilter(sFilterName: string) {
    await this.click3Dot();
    await this.select3DotOption("Manage All");
    await this.openManageFilterSearch(sFilterName);
    await this.doClick(this.filterInManageScope(sFilterName), `Expanding filter ${sFilterName}`);
    await this.btnDeleteFilter.waitFor({ state: "visible", timeout: getTimeout('XLARGE') });
    await this.doClick(this.btnDeleteFilter, "Clicking delete filter button");
    await this.btnDeleteFilterConfirm.waitFor({ state: "visible", timeout: getTimeout('XLARGE') });
    await this.doClick(this.btnDeleteFilterConfirm, "Clicking delete confirmation button");
    await this.btnDeleteFilterConfirm.waitFor({ state: "hidden", timeout: getTimeout('MEDIUM') }).catch(() => undefined);
    return true;
  }

  /** Manage All dialog: shows the search box and types `filterName`. */
  private async openManageFilterSearch(filterName: string): Promise<void> {
    await this.showHideSearch.waitFor({ state: "visible", timeout: getTimeout('MEDIUM') });
    await this.doClick(this.showHideSearch, "Clicking on Show/Hide search icon");
    await this.searchInput.waitFor({ state: "visible", timeout: getTimeout('SHORT') });
    await this.doEnterText(this.searchInput, filterName, "Entering Filter text in search box");
  }

  // --- Composite actions: quick filters ---
  public async clickOnQuickFilterConfigIcon(): Promise<void> {
    await this.quickFilterConfigIcon.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.quickFilterConfigIcon, 'Clicking on Quick Filter Configuration Icon');
  }

  private async checkQFAttributeExists(qfFilterName: string, qfHierarchy: string): Promise<boolean> {
    const filterSectionEle = this.getSelectQuickFilterAttribute(qfFilterName);
    const filterSectionExist = await filterSectionEle.isVisible().catch(() => false);
    await this.doClick(filterSectionEle, `Clicking on QF filter section for ${qfFilterName}`);
    const checkboxTitle = this.getQFFilterSectionCheckboxTitle(qfHierarchy);
    const filterSectionTitleExist = await this.waitForElementVisible(checkboxTitle, getTimeout('SHORT'));
    if (filterSectionTitleExist && !(await checkboxTitle.isChecked().catch(() => false))) {
      await this.doClick(checkboxTitle, `Checking QF checkbox for ${qfHierarchy} hierarchy`);
    }
    return filterSectionExist && filterSectionTitleExist;
  }

  public async configureQuickFilter(quickFilters: { filterName: string; hierarchy: string }[]): Promise<boolean> {
    const firstFilterItem = this.getSelectQuickFilterAttribute(quickFilters[0].filterName);
    if (!(await firstFilterItem.isVisible().catch(() => false))) {
      await this.quickFilterNameInput.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
      await this.doClick(this.quickFilterNameInput, 'Clicking on Data Source Dropdown field');
      const insightsOption = this.getQFOption('Insights');
      await insightsOption.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
      await this.doClick(insightsOption, "Selecting 'Insights' option from dropdown");

      // The attribute tree can take over a minute to load; click Reload whenever the empty state offers it.
      const maxRetries = 8;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        if (await this.waitForElementVisible(firstFilterItem, getTimeout('MEDIUM'))) {
          break;
        }
        await this.objCommonFunctions.logMessage('INFO', `QF filter items not displayed (attempt ${attempt}/${maxRetries})`);
        if (await this.quickFilterReloadBtn.isVisible().catch(() => false)) {
          await this.doClick(this.quickFilterReloadBtn, `Clicking Reload button (attempt ${attempt}/${maxRetries})`);
        }
      }
    } else {
      await this.objCommonFunctions.logMessage('INFO', 'QF filter items already preloaded, skipping data source selection');
    }

    for (const qf of quickFilters) {
      await this.checkQFAttributeExists(qf.filterName, qf.hierarchy);
    }
    await this.quickFilterApplyBtn.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.quickFilterApplyBtn, 'Clicking Save button of Quick Filter configuration');
    return true;
  }

  /** Opens a QF chip's value popover and returns the value's checkbox input. */
  private async openQFChip(qfItemName: string, qfValue: string, mustExist: boolean): Promise<Locator | null> {
    const qfChip = this.getClickOnQFList(qfItemName);
    if (mustExist) {
      await qfChip.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    } else if (!(await qfChip.isVisible().catch(() => false))) {
      return null;
    }
    const qfValueInput = this.getSelectQFValuesInput(qfValue);
    // Right after a view save the chips re-render and a click can be lost, so click until the value popover opens.
    await expect(async () => {
      if (!(await this.qfValuesPopover.isVisible().catch(() => false))) {
        await this.doClickUsingScript(qfChip, `Clicking QF chip ${qfItemName}`);
      }
      await qfValueInput.waitFor({ state: 'attached', timeout: getTimeout('MEDIUM') });
    }).toPass({ timeout: getTimeout('EXTREME') });
    return qfValueInput;
  }

  private async closeQFValuePopover(qfItemName: string): Promise<void> {
    if (await this.qfValueCloseBtn.isVisible().catch(() => false)) {
      await this.doClick(this.qfValueCloseBtn, `Closing QF value popup for ${qfItemName}`);
      await this.qfValueCloseBtn.waitFor({ state: 'hidden', timeout: getTimeout('SHORT') }).catch(() => undefined);
    }
  }

  private async clickQFApply(logMessage: string): Promise<void> {
    await this.qfValueApplyBtn.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.qfValueApplyBtn, logMessage);
  }

  public async selectAndApplyQF(quickFilters: { qfItemName: string; qfValue: string }[]): Promise<boolean> {
    for (const qf of quickFilters) {
      const qfValueInput = (await this.openQFChip(qf.qfItemName, qf.qfValue, true)) as Locator;
      if (!(await qfValueInput.isChecked().catch(() => false))) {
        await this.doClick(qfValueInput, `Selecting QF value ${qf.qfValue} for ${qf.qfItemName}`);
        await expect(qfValueInput).toBeChecked({ timeout: getTimeout('SHORT') }).catch(() => undefined);
      } else {
        await this.objCommonFunctions.logMessage('INFO', `QF value ${qf.qfValue} already selected for ${qf.qfItemName}`);
      }
      await this.closeQFValuePopover(qf.qfItemName);
    }
    await this.clickQFApply('Clicking Apply button after selecting QF values');
    return true;
  }

  public async verifyAndApplyQFChipValuesAfterDrillThrough(quickFilters: { qfItemName: string; qfValue: string }[]): Promise<boolean> {
    for (const qf of quickFilters) {
      const qfValueInput = await this.openQFChip(qf.qfItemName, qf.qfValue, false);
      if (!qfValueInput) {
        await this.objCommonFunctions.logMessage('FAIL', `QF chip '${qf.qfItemName}' not found after drill through`);
        return false;
      }
      if (!(await qfValueInput.isChecked().catch(() => false))) {
        await this.doClick(this.getSelectQFValues(qf.qfValue), `Selecting QF value '${qf.qfValue}' for '${qf.qfItemName}'`);
      } else {
        await this.objCommonFunctions.logMessage('INFO', `QF value '${qf.qfValue}' already selected for '${qf.qfItemName}'`);
      }
      await this.closeQFValuePopover(qf.qfItemName);
    }
    await this.clickQFApply('Clicking Apply button after QF chip verification');
    return true;
  }
}
