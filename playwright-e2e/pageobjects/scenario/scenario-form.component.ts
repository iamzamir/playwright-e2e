import { Page, Locator, expect } from '@playwright/test';
import BasePage from '../page';
import { getTimeout } from '../../constants/timeouts';
import { CommonFunctions } from '../../util/common.util';

export type ScenarioVisibility = 'Public' | 'Private';
export type DefaultCheckboxAction = 'Check' | 'Uncheck';

/**
 * The scenario create / edit form, opened from a Manage Scenarios row action ("Create Child Scenario", "Edit"),
 * from the `create-scenario-with-api-btn` icon of the Scenarios drawer (planning-mfe `SideNavTabPanelNew.tsx`) or from
 * the "Create Scenario" procedure (popup or wizard; the wizard needs Edit first and Save before Create).
 * Fields keep the attributes the old XPath used: `input[name="scenarioName"]`, `textarea[name="scenarioDescription"]`,
 * the `PUBLIC` / `PRIVATE` radio values and the "Set as Default" checkbox (`aria-label="Set as Default"` or, in older
 * builds, `uncontrolled-checkbox`). Several forms can be mounted at once (wizard + popup), so the last one is used.
 * "Child Of" is planning-mfe `SelectWithSearch.tsx` (`search-select`) over `SearchWithTreeView.tsx` (`treeItemBox`).
 */
export class ScenarioFormComponent extends BasePage {
  private readonly log = new CommonFunctions();

  constructor(page: Page) {
    super(page);
  }

  // Locators
  private get tfldName(): Locator             { return this.mfeLocator('input[name="scenarioName"]').last(); }
  private get txtDescription(): Locator       { return this.mfeLocator('textarea[name="scenarioDescription"]').last(); }
  private get rdoPublic(): Locator            { return this.mfeLocator('input[value="PUBLIC"]').last(); }
  private get rdoPrivate(): Locator           { return this.mfeLocator('input[value="PRIVATE"]').last(); }
  private get chkDefault(): Locator           { return this.mfeLocator('input[aria-label="Set as Default"], input[aria-label="uncontrolled-checkbox"]').last(); }
  private get childOfField(): Locator         { return this.mfeLocator('label:text-is("Child Of *") ~ div[id], label:text-is("Child Of *") ~ * div[id]'); }
  private get childOfDropdown(): Locator      { return this.getMfeFrameLocator().getByTestId('search-select'); }
  private get childOfSearch(): Locator        { return this.getMfeFrameLocator().getByPlaceholder('Search', { exact: true }).last(); }
  private childOfTreeItem(scenarioName: string): Locator {
    return this.mfeLocator(`button[data-testid="treeItemBox"]:text-is(${JSON.stringify(scenarioName)})`);
  }
  private childOfExpandIcon(scenarioName: string): Locator {
    return this.mfeLocator('div[class*="MuiTreeItem-content"]')
      .filter({ has: this.page.locator(`button[data-testid="treeItemBox"]:text-is(${JSON.stringify(scenarioName)})`) })
      .locator('div[class="MuiTreeItem-iconContainer"]');
  }
  private get btnEdit(): Locator              { return this.mfeLocator('button').filter({ hasText: /Edit/ }); }
  private get btnSave(): Locator              { return this.mfeLocator('button:text-is("Save")'); }
  private get btnCreate(): Locator            { return this.mfeLocator('button:text-is("Create")').last(); }
  private get btnCancel(): Locator            { return this.getMfeFrameLocator().getByTestId('cancel-btn').last(); }
  private get btnConfirmDelete(): Locator     { return this.mfeLocator('button:text-is("Delete")'); }
  private get successAlert(): Locator {
    return this.mfeLocator('div[class*="MuiAlert-root"][class*="MuiAlert-colorSuccess"][role="alert"] div[class*="MuiAlert-message"]')
      .filter({ hasText: /successfully/ });
  }

  // Helpers
  /** Waits for the success toast ("... successfully") and returns its text. */
  private async readSuccessMessage(timeout: number): Promise<string> {
    await this.successAlert.waitFor({ state: 'visible', timeout });
    const message = await this.doGetText(this.successAlert, 'Getting Success Message');
    await this.log.logMessage('INFO', `Success Message: ${message}`);
    return message;
  }

  // Atomic actions
  public async setName(scenarioName: string): Promise<void> {
    await this.log.logMessage('INFO', `Entering Scenario Name:: ${scenarioName}`);
    await this.tfldName.clear();
    await this.doEnterText(this.tfldName, scenarioName, 'Setting scenario name');
  }

  public async getName(): Promise<string> {
    await this.tfldName.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    return (await this.doGetAttribute(this.tfldName, 'value', 'Getting scenario name')) || '';
  }

  public async setDescription(description: string): Promise<void> {
    await this.txtDescription.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.txtDescription.clear();
    await this.doEnterText(this.txtDescription, description, 'Setting scenario description');
  }

  /** Reads the description once the edit form has loaded it (the field renders empty first). */
  public async getDescription(): Promise<string> {
    await this.txtDescription.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await expect.poll(() => this.txtDescription.inputValue(), { timeout: getTimeout('MEDIUM') }).not.toBe('').catch(() => undefined);
    const description = await this.txtDescription.inputValue();
    await this.log.logMessage('INFO', `Scenario description:: ${description}`);
    return description;
  }

  public async selectVisibility(visibility: ScenarioVisibility): Promise<void> {
    if (visibility === 'Public') {
      await this.doClick(this.rdoPublic, 'Selecting Radio button Public');
    } else {
      await this.doClick(this.rdoPrivate, 'Selecting Radio button Private');
    }
  }

  /** Clicks the "Set as Default" checkbox (it starts checked, so a click unchecks it). */
  public async uncheckDefault(): Promise<void> {
    await this.log.logMessage('INFO', 'Unchecking Default Button');
    await this.doClick(this.chkDefault, 'Unchecking Default checkbox');
  }

  public async checkDefault(): Promise<void> {
    await this.log.logMessage('INFO', 'Checking Default Button');
    if (!(await this.chkDefault.isChecked())) {
      await this.doClick(this.chkDefault, 'Checking Default checkbox');
    }
  }

  public async selectChildOf(scenarioName: string): Promise<void> {
    await this.doClickUsingScript(this.childOfDropdown, 'Clicking Child Of Search-Select Dropdown');
    const expandIcon = this.childOfExpandIcon(scenarioName);
    if (await expandIcon.isVisible().catch(() => false)) {
      await this.doClick(expandIcon, `Expanding scenario "${scenarioName}" in Child Of tree`);
    }
    await this.childOfSearch.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doEnterText(this.childOfSearch, scenarioName, 'Entering scenario name in Child Of search box');
    const treeItem = this.childOfTreeItem(scenarioName);
    await treeItem.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(treeItem, `Selecting ${scenarioName} in Child Of tree`);
  }

  /** Opens the Child Of tree, expands `parentName` and reports whether `scenarioName` is listed under it. */
  public async isInChildOfTree(parentName: string, scenarioName: string): Promise<boolean> {
    await this.childOfDropdown.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.childOfDropdown, 'Clicking Search-Select Dropdown');
    const expandIcon = this.childOfExpandIcon(parentName);
    if (await expandIcon.isVisible()) {
      await this.doClick(expandIcon, 'Expanding Parent Scenario');
    }
    const isListed = await this.childOfTreeItem(scenarioName).isVisible();
    await this.log.logMessage('INFO', `Is scenario ${scenarioName} present in child-of tree :: ${isListed}`);
    return isListed;
  }

  public async clickEdit(): Promise<void> {
    await this.doClick(this.btnEdit, 'Clicking Edit Button On Scenario Details');
  }

  public async clickSave(): Promise<void> {
    await this.btnSave.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.btnSave, 'Clicking Save Button On Scenario Details');
  }

  public async clickCreate(): Promise<void> {
    await this.btnCreate.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.btnCreate, 'Clicking Create button');
  }

  /** Cancels the form and waits for it to close. */
  public async cancel(): Promise<void> {
    await this.btnCancel.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.btnCancel, 'Clicking Cancel Button');
    await this.waitForClosed();
  }

  /** Waits for the name field to unmount; throws when the form stays open so callers do not act under it. */
  public async waitForClosed(): Promise<void> {
    await this.tfldName.waitFor({ state: 'hidden', timeout: getTimeout('MEDIUM') }).catch(async (error) => {
      await this.log.logMessage('FAIL', 'Scenario form is still open');
      throw error;
    });
  }

  public isNameEnabled(): Promise<boolean>        { return this.tfldName.isEnabled(); }
  public isDescriptionEnabled(): Promise<boolean> { return this.txtDescription.isEnabled(); }
  public isDefaultEnabled(): Promise<boolean>     { return this.chkDefault.isEnabled(); }
  public isPublicEnabled(): Promise<boolean>      { return this.rdoPublic.isEnabled(); }
  public isPrivateEnabled(): Promise<boolean>     { return this.rdoPrivate.isEnabled(); }
  public isChildOfEnabled(): Promise<boolean>     { return this.childOfField.isEnabled(); }

  // Composite actions
  /** Saves an edit and returns whether the success toast says "success". */
  public async saveEdit(): Promise<boolean> {
    await this.clickSave();
    return (await this.readSuccessMessage(getTimeout('LONG'))).includes('success');
  }

  /** Confirms the delete dialog and returns whether the success toast says "success". */
  public async confirmDelete(): Promise<boolean> {
    await this.btnConfirmDelete.waitFor({ state: 'visible', timeout: getTimeout('SHORT') });
    await this.doClick(this.btnConfirmDelete, 'Clicking Delete Button');
    const isDeleted = (await this.readSuccessMessage(getTimeout('EXTREME') + getTimeout('MEDIUM') + getTimeout('MEDIUM'))).includes('success');
    await this.log.logMessage(isDeleted ? 'PASS' : 'FAIL', isDeleted ? 'Scenario Deleted Successfully' : 'Scenario Deletion Failed');
    return isDeleted;
  }

  /**
   * Fills and submits the form. `isEdit` clicks Edit first and `isSave` clicks Save before Create (the procedure
   * wizard); `checkOrUncheckDefault` 'Uncheck' clicks the default checkbox, which starts checked.
   */
  public async fillAndCreate(scenarioName: string, description: string, visibility: ScenarioVisibility = 'Public', checkOrUncheckDefault: DefaultCheckboxAction = 'Uncheck', isSave = false, isEdit = false): Promise<void> {
    if (isEdit) {
      await this.clickEdit();
    }
    await this.setName(scenarioName);
    await this.setDescription(description);
    await this.selectVisibility(visibility);
    if (checkOrUncheckDefault === 'Uncheck') {
      await this.uncheckDefault();
    } else {
      await this.checkDefault();
    }
    if (isSave) {
      await this.clickSave();
    }
    await this.clickCreate();
  }
}
