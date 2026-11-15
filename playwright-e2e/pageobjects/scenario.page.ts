import { Page, Locator } from '@playwright/test';
import BasePage from './page';
import { getTimeout } from '../constants/timeouts';
import { CommonFunctions } from '../util/common.util';
import { ManageScenariosComponent, VisibilityFilter } from './scenario/manage-scenarios.component';
import { ScenarioFormComponent, ScenarioVisibility, DefaultCheckboxAction } from './scenario/scenario-form.component';
import { ScenarioSelectionComponent } from './scenario/scenario-selection.component';
import { ScenarioPivotComponent } from './scenario/scenario-pivot.component';
import { ResolveConflictsComponent } from './scenario/resolve-conflicts.component';

/**
 * Scenarios in Planning. The Manage Scenarios dialog (table, filters, row actions) lives in `manageScenarios`, the
 * create / edit form in `form`, selection and defaults in the Scenarios drawer in `selection`, and scenario
 * comparison on pivot cards in `pivot`; the methods below delegate to them and keep their existing signatures.
 * This class keeps the user name from the portal header and the request helpers used by scenario procedures.
 */
export class ScenarioPage extends BasePage {
  private objCommonFunctions: CommonFunctions;
  public readonly manageScenarios: ManageScenariosComponent;
  public readonly form: ScenarioFormComponent;
  public readonly selection: ScenarioSelectionComponent;
  public readonly pivot: ScenarioPivotComponent;
  public readonly resolveConflicts: ResolveConflictsComponent;

  constructor(page: Page) {
    super(page);
    this.objCommonFunctions = new CommonFunctions();
    this.manageScenarios = new ManageScenariosComponent(page);
    this.form = new ScenarioFormComponent(page);
    this.selection = new ScenarioSelectionComponent(page);
    this.pivot = new ScenarioPivotComponent(page);
    this.resolveConflicts = new ResolveConflictsComponent(page);
  }

  protected override onPageChanged(newPage: Page): void {
    if (!this.manageScenarios) return;
    this.manageScenarios.page = newPage;
    this.form.page = newPage;
    this.selection.page = newPage;
    this.pivot.page = newPage;
    this.resolveConflicts.page = newPage;
  }

  // Locators
  // The portal header is outside the MFE iframe.
  private get luminateAvatarMenu(): Locator { return this.page.locator('[data-testid="luminate-avatar-menu"], button[aria-label="Profile menu"]'); }

  // Manage Scenarios dialog
  public async isScenarioVisibleUnderManageScenarios(sScenarioName: string): Promise<boolean> {
    await this.manageScenarios.resetFilters();
    return this.manageScenarios.isScenarioListed(sScenarioName);
  }

  public async isScenarioVisible(sScenarioName: string, timeout: number = getTimeout('LONG')): Promise<boolean> {
    return this.manageScenarios.isScenarioListed(sScenarioName, timeout);
  }

  /** @deprecated The wait is part of `isScenarioVisible`; `isFilterOpened` is ignored. */
  public async verifyScenarioName(scenarioName: string, _isFilterOpened: boolean = false): Promise<boolean> {
    return this.manageScenarios.isScenarioListed(scenarioName, getTimeout('XLARGE'));
  }

  public async expandScenarioInManageScenarios(scenarioName: string): Promise<void> {
    await this.manageScenarios.expandScenario(scenarioName);
  }

  public async clickResetButton(): Promise<void> {
    await this.manageScenarios.resetFilters();
  }

  public async closeManageScenarios(): Promise<void> {
    await this.manageScenarios.close();
  }

  /** Waits for the Manage Scenarios table to show its first scenario. */
  public async waitForScenarioTable(): Promise<void> {
    await this.manageScenarios.waitForRows();
  }

  public async getBaseScenario(): Promise<string> {
    return this.manageScenarios.getBaseScenario();
  }

  public async getBaseScenarioFromTable(): Promise<string> {
    return this.manageScenarios.getBaseScenarioByName();
  }

  public async getScenarioNames(): Promise<string[]> {
    return this.manageScenarios.getScenarioNames();
  }

  public async getDefaultScenario(): Promise<string> {
    return this.manageScenarios.getDefaultScenario();
  }

  public async verifyIsDefaultScenario(scenarioName: string): Promise<boolean> {
    return this.manageScenarios.hasDefaultBadge(scenarioName);
  }

  public async getDataIndexByColumnName(columnName: string): Promise<string> {
    return this.manageScenarios.getColumnIndex(columnName);
  }

  public async verifyDefaultInScenarioTable(scenarioName: string, dataIndex: string): Promise<boolean> {
    const cellText = await this.manageScenarios.getCellText(scenarioName, dataIndex);
    const isDefault = cellText === 'Default';
    await this.objCommonFunctions.logMessage('INFO', `Is default icon exist for scenario ${scenarioName}:: ${isDefault} (cell text: '${cellText}')`);
    return isDefault;
  }

  public async tableActionClick(sScenarioName: string, sAction: string): Promise<void> {
    await this.manageScenarios.runRowAction(sScenarioName, sAction);
  }

  public async click3DotIconForScenario(sScenarioName: string): Promise<void> {
    await this.manageScenarios.openActionMenu(sScenarioName);
  }

  public async clickScenarioAction(sAction: string): Promise<void> {
    await this.manageScenarios.clickActionMenuItem(sAction);
  }

  public async editScenarioItemIsDefault(scenarioName: string): Promise<void> {
    await this.objCommonFunctions.logMessage('INFO', `Setting ${scenarioName} as default`);
    await this.manageScenarios.runRowAction(scenarioName, 'Set as Default');
  }

  public async deleteChildScenario(sScenarioName: string, tableAction: boolean = true): Promise<boolean> {
    if (tableAction) {
      await this.manageScenarios.runRowAction(sScenarioName, 'Delete');
    }
    return this.form.confirmDelete();
  }

  public async selectFilter(filterValue: VisibilityFilter): Promise<void> {
    await this.manageScenarios.selectVisibilityFilter(filterValue);
  }

  public async selectOrUnselectFilter(fieldName: string, fieldValue: string): Promise<void> {
    await this.manageScenarios.selectAutocompleteFilter(fieldName, fieldValue);
  }

  public async clickApplyFilters(): Promise<void> {
    await this.manageScenarios.applyFilters();
  }

  public async getScenariosTableDataByColumnName(columnName: string): Promise<string[]> {
    return this.manageScenarios.getColumnValues(columnName);
  }

  public async verifyFilterApplied(appliedFilter: VisibilityFilter, values: string[]): Promise<boolean> {
    const normalized = values.map((value) => value.trim().toUpperCase()).filter((value) => value.length > 0);
    if (normalized.length === 0) {
      await this.objCommonFunctions.logMessage('INFO', `No values found for ${appliedFilter} filter validation`);
      return false;
    }
    const isApplied = appliedFilter === 'All'
      ? normalized.includes('PUBLIC') && normalized.includes('PRIVATE')
      : normalized.every((value) => value === appliedFilter.toUpperCase());
    await this.objCommonFunctions.logMessage('INFO', `${appliedFilter} filter validation result: ${isApplied}`);
    return isApplied;
  }

  public async verifyScenarioCreatedByUser(createdBy: string, scenarioName: string, columnName: string): Promise<boolean> {
    const dataIndex = await this.manageScenarios.getColumnIndex(columnName, getTimeout('LONG'));
    if (!dataIndex) {
      return false;
    }
    return (await this.manageScenarios.getCellText(scenarioName, dataIndex, getTimeout('EXTREME'))) === createdBy;
  }

  public async verifyUserFilterApplied(userAvatarTexts: string[], columnName: string = 'Created By'): Promise<boolean> {
    const createdBy = await this.manageScenarios.getColumnValues(columnName);
    // An empty table proves nothing about the filter (same rule as verifyFilterApplied).
    if (createdBy.length === 0) {
      await this.objCommonFunctions.logMessage('INFO', `No rows found for ${columnName} filter validation`);
      return false;
    }
    const otherUser = createdBy.find((avatar) => !userAvatarTexts.includes(avatar));
    if (otherUser !== undefined) {
      await this.objCommonFunctions.logMessage('INFO', `${otherUser} user not in provided ${userAvatarTexts.join(', ')}`);
      return false;
    }
    return true;
  }

  // Scenario create / edit form
  public async setScenarioName(scenarioName: string): Promise<void> {
    await this.form.setName(scenarioName);
  }

  public async getScenarioName(): Promise<string> {
    return this.form.getName();
  }

  public async setScenarioDescription(sDescription: string): Promise<void> {
    await this.form.setDescription(sDescription);
  }

  public async getScenarioDescription(): Promise<string> {
    return this.form.getDescription();
  }

  public async selectVisibility(visibility: ScenarioVisibility): Promise<void> {
    await this.form.selectVisibility(visibility);
  }

  public async uncheckDefaultField(): Promise<void> {
    await this.form.uncheckDefault();
  }

  public async checkDefaultField(): Promise<void> {
    await this.form.checkDefault();
  }

  public async clickCreateButton(): Promise<void> {
    await this.form.clickCreate();
  }

  public async clickEditButton(): Promise<void> {
    await this.form.clickEdit();
  }

  public async clickSaveButton(): Promise<void> {
    await this.form.clickSave();
  }

  public async clickScenarioSaveButton(): Promise<boolean> {
    return this.form.saveEdit();
  }

  public async clickScenarioCancelButton(): Promise<void> {
    await this.form.cancel();
  }

  public async createChildScenario(scenarioName: string, scenarioDesc: string, visibility: ScenarioVisibility = 'Public', checkOrUncheckDefault: DefaultCheckboxAction = 'Uncheck', isSave: boolean = false, isEdit: boolean = false): Promise<void> {
    await this.form.fillAndCreate(scenarioName, scenarioDesc, visibility, checkOrUncheckDefault, isSave, isEdit);
  }

  public async createScenarioFromSCA(childScenarioName: string = '', childScenarioDesc: string = '', childOfScenarioName: string = '', isDefault: boolean = true, isPublic: boolean = true, isWizard: boolean = true): Promise<void> {
    if (isWizard) {
      await this.form.clickEdit();
    }
    await this.form.setName(childScenarioName);
    await this.form.setDescription(childScenarioDesc);
    if (childOfScenarioName !== '') {
      await this.form.selectChildOf(childOfScenarioName);
    }
    if (!isDefault) {
      await this.form.uncheckDefault();
    }
    if (!isPublic) {
      await this.form.selectVisibility('Private');
    }
    if (isWizard) {
      await this.form.clickSave();
    }
    await this.form.clickCreate();
  }

  public async isScenarioNameFieldEnabled(): Promise<boolean> { return this.form.isNameEnabled(); }
  public async isDefaultCheckBoxEnabled(): Promise<boolean>   { return this.form.isDefaultEnabled(); }
  public async isPublicRadioBtnEnabled(): Promise<boolean>    { return this.form.isPublicEnabled(); }
  public async isPrivateRadioBtnEnabled(): Promise<boolean>   { return this.form.isPrivateEnabled(); }
  public async isScenarioDescFieldEnabled(): Promise<boolean> { return this.form.isDescriptionEnabled(); }
  /** Returns whether the Child Of field is enabled (the name is historical). */
  public async isChildofInpFieldDisabled(): Promise<boolean>  { return this.form.isChildOfEnabled(); }

  public async verifyScenarioNameInChildOfTree(baseScenarioName: string, scenarioName: string): Promise<boolean> {
    return this.form.isInChildOfTree(baseScenarioName, scenarioName);
  }

  // Scenarios drawer
  public async openScenarioCreationPopupUsingIcon(): Promise<void> {
    await this.selection.openCreateScenario();
  }

  public async scenarioSelect(scenarios: string[], mode: 'Check' | 'Uncheck'): Promise<boolean> {
    return this.selection.select(scenarios, mode);
  }

  public async scenarioMap(scenarios: string[], selected: boolean = false): Promise<boolean> {
    return this.selection.areListed(scenarios, selected);
  }

  public async verifySCselectedScenario(scenarioName: string): Promise<boolean> {
    return this.selection.isSelected(scenarioName);
  }

  public async verifyScenarioNameInPSFilter(scenarioName: string): Promise<boolean> {
    return this.selection.isNameInTable(scenarioName);
  }

  public async verifyIsDefaultScenarioExistUnderScenariosFiltersOfPlanningSpace(scenarioName: string): Promise<boolean> {
    return this.selection.isDefault(scenarioName);
  }

  public async setDefaultScenarioInScenarioComponent(scenarioName: string): Promise<boolean> {
    return this.selection.setDefault(scenarioName);
  }

  public async getScenarioNamesFromNewUI(): Promise<string[]> {
    return this.selection.getAllScenarioNames();
  }

  public async getSelectedScenarioNamesFromNewUI(): Promise<string[]> {
    return this.selection.getSelectedScenarioNames();
  }

  public async verifyMultiScenarioSelectionLimitedTo4(): Promise<boolean> {
    return this.selection.isSelectionLimitedToFour();
  }

  public async getDefaultScenarioNameFromPlanningSpace(): Promise<string> {
    return this.selection.getDefaultScenarioName();
  }

  public async getBaseScenarioFromScenariosPanel(): Promise<string> {
    return this.selection.getBaseScenarioName();
  }

  public async clickApplyScenarioTab(): Promise<void> {
    await this.selection.clickApply();
  }

  public async clickScenarioFilterCloseButton(): Promise<void> {
    await this.selection.closeDrawer();
  }

  /**
   * Selects (or unselects) the scenarios, makes each one the default unless it already is, applies the drawer and,
   * in an interactive view, answers the "Scenario Change" confirmation (Continue when `isContinue`).
   */
  public async scenarioSelectandSetDetault(scenarios: string[], mode: 'Check' | 'Uncheck', isInteractiveView?: boolean, isContinue?: boolean): Promise<boolean> {
    await this.selection.select(scenarios, mode);
    for (const scenario of scenarios) {
      await this.objCommonFunctions.logMessage('INFO', `Checking ${scenario} scenario`);
      if (!(await this.selection.isDefault(scenario))) {
        await this.selection.setDefault(scenario);
      }
    }
    const { PlanningPage } = await import('./planning.page');
    await new PlanningPage(this.page).clickApply();
    if (isInteractiveView) {
      await this.selection.confirmScenarioChange(!!isContinue);
    }
    return true;
  }

  // Pivot card scenario comparison
  public async clickOnScenarioLiveIcon(cardName: string): Promise<boolean> {
    return this.pivot.openScenarioPopup(cardName);
  }

  public async verifyScenarioInPivotPopup(scenarioName: string, isSelected?: boolean): Promise<boolean> {
    return this.pivot.isScenarioListed(scenarioName, isSelected);
  }

  public async applyScenarioPivotFilter(scenarios: string[]): Promise<boolean> {
    return this.pivot.applyScenarios(scenarios);
  }

  public async verifyColumnExistsInPivotTable(columns: string[], cardName: string): Promise<boolean> {
    return this.pivot.hasColumns(columns, cardName);
  }

  // Portal header
  public async getCurrentLoginUserName(): Promise<string> {
    await this.luminateAvatarMenu.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    const name = ((await this.luminateAvatarMenu.textContent()) || '').trim();
    await this.objCommonFunctions.logMessage('INFO', `Current login user name is '${name}'`);
    return name;
  }

  // Scenario procedure requests
  public async waitForAccessTokenFromRequestHeader(requestedUrl: string, timeout: number = getTimeout('EXTREME') * 2): Promise<string> {
    const request = await this.page.waitForRequest((req) => req.url().includes(requestedUrl), { timeout });
    const headers = request.headers();
    const accessToken = headers['authorization'] || headers['Authorization'] || '';
    await this.objCommonFunctions.logMessage('INFO', `Captured access token from request header for URL: ${requestedUrl}`);
    return accessToken;
  }

  public async validateTheJsonRequest(requestedUrl: string, checkProcedureName: string, checkScenarioName: string, checkParentScenarioName: string, checkParentScenarioId: string, checkParentScenarioDisplayName?: string): Promise<boolean> {
    const request = await this.page.waitForRequest(
      (req) => req.url().includes(requestedUrl) && !req.url().includes('status') && req.method() === 'POST',
      { timeout: getTimeout('EXTREME') },
    );
    const body = request.postDataJSON() as {
      procedureName?: string;
      procInput?: { scenarioName?: string; parentScenario?: string; parentScenarioId?: string; parentScenarioDisplayName?: string };
    };
    const procedureName = body?.procedureName ?? '';
    const scenarioName = body?.procInput?.scenarioName ?? '';
    const parentScenario = body?.procInput?.parentScenario ?? '';
    const parentScenarioId = body?.procInput?.parentScenarioId ?? '';
    const parentScenarioDisplayName = body?.procInput?.parentScenarioDisplayName ?? '';

    await this.objCommonFunctions.logMessage('INFO', `URL: ${request.url()}`);
    await this.objCommonFunctions.logMessage('INFO', `Method: ${request.method()}`);
    await this.objCommonFunctions.logMessage('INFO', `Procedure Name: ${procedureName}`);
    await this.objCommonFunctions.logMessage('INFO', `Scenario Name: ${scenarioName}`);
    await this.objCommonFunctions.logMessage('INFO', `Parent Scenario Name: ${parentScenario}`);
    await this.objCommonFunctions.logMessage('INFO', `Parent Scenario Id: ${parentScenarioId}`);
    await this.objCommonFunctions.logMessage('INFO', `Parent Scenario Display Name: ${parentScenarioDisplayName}`);

    const validation1 = await this.objCommonFunctions.compareTwoValues(procedureName, checkProcedureName, 'Procedure Name Validation');
    const validation2 = await this.objCommonFunctions.compareTwoValues(scenarioName, checkScenarioName, 'Scenario Name Validation');
    const validation3 = await this.objCommonFunctions.compareTwoValues(parentScenario, checkParentScenarioName, 'Parent Scenario Name Validation');
    const validation4 = await this.objCommonFunctions.compareTwoValues(parentScenarioId, checkParentScenarioId, 'Parent Scenario Id Validation');
    const validation5 = checkParentScenarioDisplayName
      ? await this.objCommonFunctions.compareTwoValues(parentScenarioDisplayName, checkParentScenarioDisplayName, 'Parent Scenario Display Name Validation')
      : true;
    return validation1 && validation2 && validation3 && validation4 && validation5;
  }
}
