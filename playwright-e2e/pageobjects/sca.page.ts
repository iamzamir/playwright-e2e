import { Page, Locator } from "@playwright/test";
import BasePage from "./page";
import { CommonFunctions } from "../util/common.util";
import { getTimeout } from '../constants/timeouts';
import { ProceduresComponent } from './planning/procedures.component';
import { ViewProceduresComponent } from './global-settings/view-procedures.component';
import { ProcessProceduresComponent } from './global-settings/process-procedures.component';

/**
 * Supply chain procedures (SCA / SCP) across Planning and PO Global Settings. The Planning procedures dropdown and
 * header buttons live in `procedures` (shared with `PlanningPage`), the "Configure View specific Procedures &
 * Filters" page in `viewProcedures`, and process rows and procedure mapping in `processProcedures`; the methods
 * below delegate to them. This class keeps the procedure dialogs opened from Planning: the popup or wizard header
 * (`lui-ccl-modal`), the Publish Scenario scenario picker (`scaContextName` / `treeItemBox`,
 * `confirm-dialog-save-btn`), `scaNextStepButton`, `scaRunButton` and the Add Lane form.
 */
class SCAPage extends BasePage {
  private objCommonFunctions: CommonFunctions;
  public readonly procedures: ProceduresComponent;
  public readonly viewProcedures: ViewProceduresComponent;
  public readonly processProcedures: ProcessProceduresComponent;

  constructor(page: Page) {
    super(page);
    this.objCommonFunctions = new CommonFunctions();
    this.procedures = new ProceduresComponent(page);
    this.viewProcedures = new ViewProceduresComponent(page);
    this.processProcedures = new ProcessProceduresComponent(page);
  }

  protected override onPageChanged(newPage: Page): void {
    if (!this.procedures) return;
    this.procedures.page = newPage;
    this.viewProcedures.page = newPage;
    this.processProcedures.page = newPage;
  }

  // Locators
  private dialogHeader(procedureName: string): Locator           { return this.mfeLocator(`[data-testid="lui-ccl-modal"] [role="dialog"] h5:text-is(${JSON.stringify(procedureName)})`); }
  private viewHeader(viewName: string): Locator                  { return this.mfeLocator(`[class*="left-section"] h2:text-is(${JSON.stringify(viewName)})`); }
  private get scenarioPickerArrow(): Locator                     { return this.mfeLocator('[data-testid="scaContextName"] [data-testid="dropArrow"]'); }
  private scenarioTreeItem(scenarioName: string): Locator        { return this.mfeLocator(`button[data-testid="treeItemBox"]:text-is(${JSON.stringify(scenarioName)})`); }
  private scenarioExpandIcon(scenarioName: string): Locator {
    return this.mfeLocator('li').filter({ has: this.page.locator(`button[data-testid="treeItemBox"]:text-is(${JSON.stringify(scenarioName)})`) })
      .locator('[class*="MuiTreeItem-iconContainer"]').first();
  }
  private get btnScenarioSave(): Locator                         { return this.mfeLocator('#confirm-dialog-save-btn'); }
  private get unauthorizedPublishAlert(): Locator                { return this.getMfeFrameLocator().getByText('You are not authorized to publish the selected scenario').first(); }
  private get btnNextStep(): Locator                             { return this.getMfeFrameLocator().getByTestId('scaNextStepButton'); }
  private get btnRun(): Locator                                  { return this.getMfeFrameLocator().getByTestId('scaRunButton'); }
  private get btnAddLane(): Locator                              { return this.mfeLocator('[role="presentation"] button:text-is("Add Lane")'); }
  private get alertMessage(): Locator                            { return this.mfeLocator('[class*="MuiAlert-message"]').first(); }
  private get planningGridHeader(): Locator                      { return this.mfeLocator('.grid-header-container'); }

  // Procedure dialogs opened from Planning
  public async isPopupOpened(procedureName: string): Promise<boolean> {
    const header = this.dialogHeader(procedureName);
    await header.waitFor({ timeout: getTimeout('EXTREME') });
    const isOpen = await this.doesElementExist(header, `Checking if popup layout is opened for ${procedureName} supply chain procedure`);
    await this.objCommonFunctions.logMessage("INFO", `popup layout is opened for ${procedureName} supply chain procedure: ${isOpen}`);
    return isOpen;
  }

  public async isViewLoaded(viewName: string): Promise<boolean> {
    await this.viewHeader(viewName).waitFor({ state: "visible", timeout: getTimeout('MEDIUM') });
    const isDisplayed = await this.viewHeader(viewName).isVisible();
    await this.objCommonFunctions.logMessage("INFO", `View ${viewName} is loaded: ${isDisplayed}`);
    return isDisplayed;
  }

  public async openScenarioSelectionDropdown(): Promise<void> {
    await this.scenarioPickerArrow.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.scenarioPickerArrow, 'Opening scenario selection dropdown');
  }

  public async selectBaseScenarioAndSave(scenarioName: string): Promise<boolean> {
    await this.openScenarioSelectionDropdown();
    const baseScenario = this.scenarioTreeItem(scenarioName);
    await baseScenario.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(baseScenario, `Selecting base scenario: ${scenarioName}`);
    return true;
  }

  public async selectChildScenarioAndSave(baseScenarioName: string, childScenarioName: string): Promise<boolean> {
    await this.openScenarioSelectionDropdown();
    const expandIcon = this.scenarioExpandIcon(baseScenarioName);
    await expandIcon.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(expandIcon, `Expanding base scenario: ${baseScenarioName}`);
    const childScenario = this.scenarioTreeItem(childScenarioName);
    await childScenario.scrollIntoViewIfNeeded();
    await childScenario.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(childScenario, `Selecting child scenario: ${childScenarioName}`);
    await this.btnScenarioSave.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.btnScenarioSave, 'Saving selected child scenario from publish popup');
    return true;
  }

  public async isAuthorizationAlertMessage(): Promise<boolean> {
    const isVisible = await this.unauthorizedPublishAlert.waitFor({ state: "visible", timeout: getTimeout('MEDIUM') }).then(() => true, () => false);
    if (!isVisible) {
      await this.objCommonFunctions.logMessage("INFO", "Authorization alert message not visible");
    }
    return isVisible;
  }

  public async clickOnNextStep(): Promise<void> {
    await this.btnNextStep.waitFor({ state: "visible", timeout: getTimeout('EXTREME') });
    await this.doClick(this.btnNextStep, "Clicking on next step button");
  }

  public async saveAddLaneForm(): Promise<void> {
    await this.btnAddLane.waitFor({ state: "visible", timeout: getTimeout('EXTREME') });
    await this.doClick(this.btnAddLane, "Clicking on Add Lane button");
  }

  public async startSparqEngine(procedureName: string): Promise<void> {
    const isClicked = await this.clickProcedureItemFromDropdown(procedureName);
    await this.objCommonFunctions.compareTwoValues(isClicked, true, `is ${procedureName} clicked: ${isClicked}`);
    await this.btnRun.waitFor({ state: "visible", timeout: getTimeout('EXTREME') });
    await this.doClick(this.btnRun, "Clicking run button");
  }

  /** Waits for the alert shown after starting a procedure and reports whether it says the SPARQ engine is down. */
  public async isSparqEngineDown(waitTime: number = 2 * getTimeout('EXTREME')): Promise<boolean> {
    try {
      await this.objCommonFunctions.logMessage("INFO", "checking is SPARQ engine down");
      await this.alertMessage.waitFor({ state: "visible", timeout: waitTime });
      const text = await this.doGetText(this.alertMessage, "Getting SPARQ status alert message");
      await this.objCommonFunctions.logMessage("INFO", `alert msg:: ${text}`);
      return text.includes("Internal Server Error") || text.includes("not found or failed to respond.");
    } catch (error) {
      await this.objCommonFunctions.logMessage("INFO", `Error checking SPARQ engine status: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  // Planning procedures dropdown and header buttons (delegates)
  /** Checks the primary (`MuiButton-contained`) or secondary (`MuiButton-outlined`) procedure button in the view header. */
  public async verifySCABtn(name: string, className: string): Promise<boolean> {
    return this.procedures.isHeaderButtonShown(name, className);
  }

  public async isPrimaryButtonDisplayed(procedureName: string): Promise<boolean> {
    return this.procedures.isHeaderButtonShown(procedureName, 'MuiButton-contained', getTimeout('MEDIUM'));
  }

  public async isSecondaryButtonDisplayed(procedureName: string): Promise<boolean> {
    return this.procedures.isHeaderButtonShown(procedureName, 'MuiButton-outlined', getTimeout('MEDIUM'));
  }

  /**
   * Checks that every action is an enabled item of the procedures dropdown, then closes it. With
   * `isProceduresArranged` they must also appear in that order (other items may sit between them).
   * Planning reads the mapped procedures when it loads, so mappings made moments earlier (for example
   * ProcessBatch/Test_008 Case 1) can be missing; on a miss it reloads and reopens the menu up to `maxReloads` times.
   */
  public async verifyOtherActionsInProceduresDropdown(actions: { procedureDisplayName: string }[], isProceduresArranged = false, maxReloads = 0): Promise<boolean> {
    const expected = actions.map((action) => action.procedureDisplayName.trim());
    try {
      const listed = await this.procedures.getEnabledItemNames(maxReloads);
      await this.objCommonFunctions.logMessage('INFO', `Expected actions: ${JSON.stringify(expected)} (in order: ${isProceduresArranged})`);
      let lastIndex = -1;
      for (const name of expected) {
        const index = isProceduresArranged ? listed.indexOf(name, lastIndex + 1) : listed.indexOf(name);
        if (index === -1) {
          await this.objCommonFunctions.logMessage('INFO', `Action "${name}" not found${isProceduresArranged ? ' in expected order' : ''}. Available items: ${JSON.stringify(listed)}`);
          return false;
        }
        lastIndex = index;
      }
      return true;
    } catch (error) {
      await this.objCommonFunctions.logMessage('ERROR', `Error verifying procedures dropdown: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    } finally {
      await this.procedures.closeDropdown();
    }
  }

  /** Waits for the Planning dashboard grid header. */
  public async waitForPlanningGrid(): Promise<void> {
    await this.planningGridHeader.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
  }

  /** Instant probe: true when the procedures dropdown button is shown (enabled or not). */
  public async isSCAProceduresDropdownVisible(): Promise<boolean> {
    const isVisible = await this.procedures.isDropdownShown();
    await this.objCommonFunctions.logMessage('INFO', `SCA procedures dropdown visible: ${isVisible}`);
    return isVisible;
  }

  public async clickProcedureItemFromDropdown(procedureName: string): Promise<boolean> {
    await this.procedures.runFromDropdown(procedureName);
    return true;
  }

  public async isProcedureAvailableInDropdown(procedureName: string): Promise<boolean> {
    return this.procedures.isItemListed(procedureName);
  }

  // PO process rows and procedure mapping (delegates)
  public async selectProcess(processName: string): Promise<void> {
    await this.processProcedures.selectProcess(processName);
  }

  public async click3DotIconOfProcess(processDisplayName: string): Promise<void> {
    await this.processProcedures.openProcessLinkMenu(processDisplayName);
  }

  public async selectActionFrom3DotMenu(actionName: string): Promise<void> {
    await this.processProcedures.clickMenuEntry(actionName);
  }

  public async selectSingleAction(entityName: string, actionName: string): Promise<void> {
    await this.processProcedures.selectRowAction(entityName, actionName);
  }

  public async isActionEnabled(entityName: string, actionName: string): Promise<boolean> {
    return this.processProcedures.isRowActionEnabled(entityName, actionName);
  }

  public async isProcedureMapped(procedureName: string): Promise<boolean> {
    return this.processProcedures.isProcedureMapped(procedureName);
  }

  public async mapProcessToProcedureWithContext(procedureName: string, attributeValue: string): Promise<void> {
    await this.processProcedures.mapProcedure(procedureName, attributeValue);
  }

  public async deleteProcedure(procedureName: string): Promise<void> {
    await this.processProcedures.deleteProcedure(procedureName);
  }

  // View specific procedures configuration (delegates and workflows)
  /** Selects `procedures` for the view, moves the 3rd before the 4th, sets primary and secondary, and saves. */
  public async configureSCP(viewName: string, procedures: string[], primaryAction: string, secondaryAction: string): Promise<boolean> {
    await this.viewProcedures.selectView(viewName);
    await this.viewProcedures.selectProcedures(procedures);
    await this.viewProcedures.moveProcedure(procedures[2], procedures[3]);
    await this.viewProcedures.selectPrimary(primaryAction);
    await this.viewProcedures.selectSecondary(secondaryAction);
    return this.viewProcedures.save();
  }

  public async verifyAllSCAEnabled(viewName: string, procedures: string[]): Promise<boolean> {
    await this.viewProcedures.selectView(viewName);
    return this.viewProcedures.areProceduresChecked(procedures);
  }

  public async disableSCA(viewName: string, procedures: string[]): Promise<boolean> {
    await this.viewProcedures.selectView(viewName);
    await this.viewProcedures.clearSelectAll();
    await this.viewProcedures.deselectProcedures(procedures);
    return this.viewProcedures.save();
  }

  public async selectAllProceduresCheckboxToMap(enable: boolean): Promise<boolean> {
    try {
      return await this.viewProcedures.setSelectAll(enable);
    } catch (error) {
      await this.objCommonFunctions.logMessage("ERROR", `Error in selectAllProceduresCheckboxToMap: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  public async selectPrimaryAndSecondaryActions(primaryValue: string, secondaryValue: string): Promise<void> {
    await this.viewProcedures.selectPrimary(primaryValue);
    const primaryText = await this.viewProcedures.getPrimaryText();
    await this.viewProcedures.selectSecondary(secondaryValue);
    const secondaryText = await this.viewProcedures.getSecondaryText();
    await this.objCommonFunctions.logMessage("INFO", `Primary action selected: ${primaryText}, Secondary action selected: ${secondaryText}`);
  }

  public async toggleApplyAll(enable: boolean): Promise<boolean> {
    return this.viewProcedures.setApplyAll(enable);
  }

  public async clickSaveButton(): Promise<boolean> {
    return this.viewProcedures.save(getTimeout('XLARGE'));
  }
}

export default SCAPage;
