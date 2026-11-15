import { Page, Locator, expect } from '@playwright/test';
import BasePage from './page';
import { getTimeout, TIMEOUTS } from '../constants/timeouts'
import { CommonFunctions } from '../util/common.util';

export class OdmPage extends BasePage {
  private objCommonFunctions: CommonFunctions;

  constructor(page: Page) {
    super(page);
    this.objCommonFunctions = new CommonFunctions();
  }

  // Locators. Test IDs from planning-mfe SideNav: DataSyncWidget (status button and icons), DataSyncStatusCard
  // (status card), ODMDetailsDataSyncModal (More details modal, a LuiModal), ODMUtility (scenario tooltip list),
  // ScopeSelectionPopup (session popup, a LuiModal with dataTestId `scope-selection-dialog`) and GlobalSave.
  private get interactiveDataStatusIcon(): Locator      { return this.mfeLocator('button[data-testid="data-sync-status-btn"]'); }
  private get globalSaveIcon(): Locator                 { return this.mfeLocator('button#global-save-btn'); }
  // The Troubleshoot button's test ID is its translated label.
  private get troubleShootIcon(): Locator               { return this.mfeLocator('button[data-testid="Troubleshoot"]'); }
  // LuiModal renders every modal title as h2#customized-dialog-title.
  private get moreDetailsTitleODM(): Locator            { return this.mfeLocator('h2#customized-dialog-title'); }
  private get closeBtnMoreDetailsODM(): Locator         { return this.mfeLocator('button[data-testid="modal-close-button"]'); }
  private get moreDetailsODM(): Locator                 { return this.mfeLocator('button[data-testid="data-sync-more-details-link"]'); }
  private get procedureDetailsODM(): Locator            { return this.mfeLocator('button[data-testid="data-sync-link"]'); }
  private get dataFromMoreDetialsODM(): Locator         { return this.mfeLocator('a[data-testid="value-dataFromScenario"]'); }
  private get procedureNameMoreDetailsODM(): Locator    { return this.mfeLocator('p[data-testid="value-runBy"]'); }
  private get planningInstanceFromMoreDetailsODM(): Locator { return this.mfeLocator('p[data-testid="value-planningInstanceId"]'); }
  private get runIdFromMoreDetilasODM(): Locator        { return this.mfeLocator('p[data-testid="value-runId"]'); }
  private get procedureTimeFromMoreDetailsODM(): Locator { return this.mfeLocator('p[data-testid="value-lastUpdateDate"]'); }
  private get scenarioIdFromMoreDetailsODM(): Locator   { return this.mfeLocator('p[data-testid="value-scenarioId"]'); }
  private get realmIdFromMoreDetailsODM(): Locator      { return this.mfeLocator('p[data-testid="value-realmId"]'); }
  private get runByFromMoreDetailsODM(): Locator        { return this.mfeLocator('p[data-testid="value-runBy"]'); }
  private get noDataAvailable(): Locator                { return this.getMfeFrameLocator().getByText(/no data available/i); }
  private get rubByDetails(): Locator                   { return this.mfeLocator('p[data-testid="data-sync-runByUserName"]'); }
  private get scenarioDetails(): Locator                { return this.mfeLocator('p[data-testid="data-sync-scenario"] > a'); }
  private get scenarioId(): Locator                     { return this.mfeLocator('a[data-testid="scenarioid"]'); }
  private get allScenariosInODM(): Locator              { return this.mfeLocator('p[data-testid="multi-scenario-list"]'); }
  private get sessionSelectHeading(): Locator           { return this.mfeLocator('h5:text-is("Sync Interactive Data")'); }
  // The popup has two descriptions, scope-selection-description1 and 2 (a single unnumbered one before 2024-11).
  private get scopeSelectionDescription(): Locator      { return this.mfeLocator('p[data-testid^="scope-selection-description"]').first(); }
  private get continueWithExistingSession(): Locator    { return this.mfeLocator('button[data-testid="cancel-button"]'); }
  private get syncButton(): Locator                     { return this.mfeLocator('button[data-testid="sync-button"]'); }
  private get dataSyncCloseIcon(): Locator              { return this.mfeLocator('button[data-testid="data-sync-close-icon"]'); }

  private dataSyncStatusMessage(expectedMessage: string): Locator {
    const escaped = expectedMessage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.mfeLocator('h6[data-testid="data-sync-status-message"]').filter({ hasText: new RegExp(escaped) });
  }

  private dataSyncStatus(status: string): Locator {
    return this.mfeLocator(`[data-testid="data-sync-status-icon-${status}"]`);
  }

  private get errorDataSyncStatusIcon(): Locator {
    return this.mfeLocator('[data-testid="data-sync-status-icon-error"], [data-testid="data-sync-status-icon-failed"]');
  }

  private get parentErrorDataSyncStatusIcon(): Locator {
    return this.page.locator('[data-testid="data-sync-status-icon-error"], [data-testid="data-sync-status-icon-failed"]');
  }

  private get errorDataSyncStatusMessage(): Locator {
    const errorPattern = /Data could(?:n[’']t|\s+not)\s+be\s+synced/i;
    return this.getMfeFrameLocator().getByText(errorPattern);
  }

  private get parentErrorDataSyncStatusMessage(): Locator {
    const errorPattern = /Data could(?:n[’']t|\s+not)\s+be\s+synced/i;
    return this.page.getByText(errorPattern);
  }

  public async clickOnCloseDataSyncIcon(): Promise<boolean> {
    await this.dataSyncCloseIcon.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(this.dataSyncCloseIcon, 'Clicking on Click on close Data Sync Icon');
    return true;
  }

  private async getScenarioHoverTarget(): Promise<Locator> {
    if ((await this.scenarioId.count()) > 0) {
      return this.scenarioId.first();
    }

    return this.scenarioDetails;
  }

  // Methods
  public async clickInteractiveDataStatusIcon(): Promise<boolean> {
    try {
      await this.interactiveDataStatusIcon.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
      await this.objCommonFunctions.logMessage('INFO', 'Interactive Data Status Icon exist on dashboard');
      await this.doClick(this.interactiveDataStatusIcon, 'Clicking Interactive Data Status Icon');
      return true;
    } catch (e) {
      await this.objCommonFunctions.logMessage('INFO', 'Interactive Data Status Icon is not exist on dashboard');
      return false;
    }
  }

  public async verifyDataSyncStatusMessage(expectedMessage: string, status: string): Promise<boolean> {
    const dataSyncStatusMessage = this.dataSyncStatusMessage(expectedMessage);
    await dataSyncStatusMessage.first().waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    const exists = (await dataSyncStatusMessage.count()) > 0;
    if (exists) {
      await this.objCommonFunctions.logMessage('PASS', `Data Sync Status message '${expectedMessage}' is verified for status '${status}'.`);
    } else {
      await this.objCommonFunctions.logMessage('FAIL', `Data Sync Status message '${expectedMessage}' does not exist for status '${status}'.`);
    }

    return exists;
  }

  public async getDataFromScenariosInODM(): Promise<string[]> {
    const scenarioDetailsText = await this.doGetText(this.scenarioDetails, 'Getting ODM data from scenario details');
    const scenarios = scenarioDetailsText
      .split(',')
      .map((scenario) => scenario.trim())
      .filter((scenario) => scenario.length > 0);

    await this.objCommonFunctions.logMessage('INFO', `Data from scenarios in ODM: ${scenarios.join(', ')}`);
    return scenarios;
  }

  public async getHoveredScenariosInODM(): Promise<string[]> {
    const hoverTarget = await this.getScenarioHoverTarget();
    await hoverTarget.scrollIntoViewIfNeeded();
    await this.mouseHover(hoverTarget, 'Hovering on ODM scenario details');
    await this.allScenariosInODM.first().waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });

    const scenarios = (await this.allScenariosInODM.allTextContents())
      .flatMap((scenarioGroup) => scenarioGroup.split(','))
      .map((scenario) => scenario.trim())
      .filter((scenario) => scenario.length > 0);

    await this.objCommonFunctions.logMessage('INFO', `All scenarios from ODM hover: ${scenarios.join(', ')}`);
    return scenarios;
  }

  public async verifyRunByUserDetails(status: string): Promise<boolean> {
    const runByUserDetails = this.rubByDetails;
    const exists = (await runByUserDetails.count()) > 0;

    if (exists) {
      await this.objCommonFunctions.logMessage('PASS', `runByUserDetails are verified for status '${status}'.`);
    } else {
      await this.objCommonFunctions.logMessage('FAIL', `runByUserDetails are missing for status '${status}'.`);
    }

    return exists;
  }

  public async dataSyncStatusWidgetExist(status: string): Promise<boolean> {
    const exists = (await this.dataSyncStatus(status).count()) > 0;
    await this.objCommonFunctions.logMessage(exists ? 'PASS' : 'FAIL', `Data Sync Status widget for '${status}' ${exists ? 'exists' : 'does not exist'}.`);
    return exists;
  }

  public async waitForDataSyncStatusWidget(status: string, maxWaitingTimeInMinutes: number): Promise<boolean> {
    const effectiveWaitTime = Math.min(maxWaitingTimeInMinutes, 3);
    if (effectiveWaitTime <= 0) {
      return this.dataSyncStatusWidgetExist(status);
    }

    const isWaitingForError = status.toLowerCase() === 'error' || status.toLowerCase() === 'failed';
    let earlyAborted = false;
    let abortReason = '';

    try {
      await expect.poll(async () => {
        if (!isWaitingForError) {
          const hasErrorIcon = (await this.errorDataSyncStatusIcon.count().catch(() => 0)) > 0
            || (await this.parentErrorDataSyncStatusIcon.count().catch(() => 0)) > 0;
          const hasErrorMessage = (await this.errorDataSyncStatusMessage.count().catch(() => 0)) > 0
            || (await this.parentErrorDataSyncStatusMessage.count().catch(() => 0)) > 0;
          if (hasErrorIcon || hasErrorMessage) {
            earlyAborted = true;
            abortReason = hasErrorIcon ? 'error status icon detected' : 'data sync error message detected';
            return true;
          }
        }
        return (await this.dataSyncStatus(status).count().catch(() => 0)) > 0;
      }, {
        timeout: effectiveWaitTime * 60 * 1000,
        intervals: [2000, 5000, 10000]
      }).toBe(true);

      if (earlyAborted) {
        await this.objCommonFunctions.logMessage('FAIL', `Data sync status polling aborted early: error state encountered while waiting for '${status}' (${abortReason}).`);
        return false;
      }

      await this.objCommonFunctions.logMessage('PASS', `Data Sync Status widget for '${status}' exists.`);
      return true;
    } catch {
      await this.objCommonFunctions.logMessage('FAIL', `Data sync status widget for '${status}' was not found after ${effectiveWaitTime} minute(s).`);
      return false;
    }
  }

  public async verifyRunByUserDetailsWithName(status: string, userName: string): Promise<boolean> {
    const runByUserDetails = this.rubByDetails;
    const exists = (await runByUserDetails.count()) > 0;
    if (!exists) {
      await this.objCommonFunctions.logMessage('FAIL', `runByUserDetails are missing for status '${status}'.`);
      return false;
    }
    const actualRunBy = ((await runByUserDetails.first().textContent()) || '').trim();
    const isMatched = actualRunBy.includes(userName);
    await this.objCommonFunctions.logMessage(isMatched ? 'PASS' : 'FAIL', `Run By user validation for status '${status}'. Expected to include '${userName}', actual '${actualRunBy}'.`);
    return isMatched;
  }

  public async dataNotAvailableIsExist(): Promise<boolean> {
    const exists = (await this.noDataAvailable.count()) > 0;
    await this.objCommonFunctions.logMessage(exists ? 'PASS' : 'FAIL', `No Data Available ${exists ? 'exists' : 'does not exist'}.`);
    return exists;
  }

  public async verifyDataSyncStatusTest(status: string, expectedMessage: string, verifyCluster: boolean = false, maxWaitingTimeInMinutes: number = 0, userName?: string): Promise<boolean> {
    const isIconVisible = await this.clickInteractiveDataStatusIcon();
    if (!isIconVisible) {
      return false;
    }

    if (status === 'started' && maxWaitingTimeInMinutes > 0) {
      const dataResponse = await this.waitForDataSyncStatusWidget(status, maxWaitingTimeInMinutes);
      if (!dataResponse) {
        return false;
      }
    }

    const widgetExists = await this.dataSyncStatusWidgetExist(status);
    if (!widgetExists) {
      return false;
    }

    const messageVerified = await this.verifyDataSyncStatusMessage(expectedMessage, status);
    const runByUserDetailsVerified = userName ? await this.verifyRunByUserDetailsWithName(status, userName) : true;
    return messageVerified && runByUserDetailsVerified;
  }

  public async openMoreDetailsODM(): Promise<void> {
    await this.moreDetailsODM.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.moreDetailsODM, 'Clicked show more to open More details popup ODM');
    await this.moreDetailsTitleODM.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
  }

  public async closeMoreDetailsODM(): Promise<boolean> {
    const isTitleExist = await this.moreDetailsTitleODM.isVisible().catch(() => false);
    await this.closeBtnMoreDetailsODM.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.closeBtnMoreDetailsODM, 'Clicked Close to close More details popup ODM');
    await this.moreDetailsTitleODM.waitFor({ state: 'hidden', timeout: getTimeout('XLARGE') });
    return isTitleExist;
  }

  public async navigateToProcedureDetailsODM(): Promise<void> {
    await this.interactiveDataStatusIcon.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.interactiveDataStatusIcon, 'Clicking on Interactive Data Status Icon');
    await this.procedureDetailsODM.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.procedureDetailsODM, 'Clicking on Procedure Details to navigate to Observability');
  }

  public async getAllScenariosInODM(): Promise<string[]> {
    await this.allScenariosInODM.first().waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    const scenarios = (await this.allScenariosInODM.allTextContents())
      .flatMap((scenarioGroup) => scenarioGroup.split(','))
      .map((scenario) => scenario.trim())
      .filter((scenario) => scenario.length > 0);
    await this.objCommonFunctions.logMessage('INFO', `All scenarios from planning instance id: ${scenarios.join(', ')}`);
    return scenarios;
  }

  public async verifyAllScenariosInODM(): Promise<string[]> {
    const hoverTarget = await this.getScenarioHoverTarget();
    await hoverTarget.scrollIntoViewIfNeeded();
    await this.mouseHover(hoverTarget, 'Hovering on ODM scenario details to get all scenarios');
    return this.getAllScenariosInODM();
  }

  public async verifyDataFromMoreDetailsODM(): Promise<string[]> {
    const exists = (await this.dataFromMoreDetialsODM.count()) > 0;
    if (!exists) {
      await this.objCommonFunctions.logMessage('FAIL', 'Data from is missing for status');
      return [];
    }
    await this.objCommonFunctions.logMessage('PASS', 'Data from is verified for status.');
    await this.mouseHover(this.dataFromMoreDetialsODM.first(), 'Hovering on data from scenario list in more details');
    return this.getAllScenariosInODM();
  }

  public async verifyRunByFromMoreDetailsODM(): Promise<boolean> {
    const exists = (await this.runByFromMoreDetailsODM.count()) > 0;
    await this.objCommonFunctions.logMessage(exists ? 'PASS' : 'FAIL', `Run By is ${exists ? 'verified' : 'missing'} for status.`);
    return exists;
  }

  public async getRunByFromMoreDetailsODM(): Promise<string> {
    return ((await this.runByFromMoreDetailsODM.first().textContent()) || '').trim();
  }

  public async verifyProcedureDetailsFromMoreDetailsODM(): Promise<boolean> {
    const exists = (await this.procedureNameMoreDetailsODM.count()) > 0;
    await this.objCommonFunctions.logMessage(exists ? 'PASS' : 'FAIL', `Procedure Details are ${exists ? 'verified' : 'missing'} for status.`);
    return exists;
  }

  public async verifyPlanningInstanceIdFromMoreDetailsODM(): Promise<boolean> {
    const exists = (await this.planningInstanceFromMoreDetailsODM.count()) > 0;
    await this.objCommonFunctions.logMessage(exists ? 'PASS' : 'FAIL', `Planning Instance ID is ${exists ? 'verified' : 'missing'} for status.`);
    return exists;
  }

  public async getPlanningInstanceIdFromMoreDetailsODM(): Promise<string> {
    return ((await this.planningInstanceFromMoreDetailsODM.first().textContent()) || '').trim();
  }

  public async getPlanningInstaceIdFromODM(): Promise<string> {
    const isMoreDetailsOpen = await this.moreDetailsTitleODM.isVisible().catch(() => false);
    if (!isMoreDetailsOpen) {
      // Closing More details also closes the status card, so reopen the card first when its link is gone.
      if (!(await this.moreDetailsODM.isVisible().catch(() => false))) {
        await this.clickInteractiveDataStatusIcon();
      }
      await this.openMoreDetailsODM();
    }
    const planningInstanceId = await this.getPlanningInstanceIdFromMoreDetailsODM();
    if (!isMoreDetailsOpen) {
      await this.closeMoreDetailsODM();
    }
    return planningInstanceId;
  }

  /** Text of the first description in the Sync Interactive Data popup, once the popup is open. */
  public async getSessionPopupDescription(): Promise<string> {
    await this.sessionSelectHeading.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    return ((await this.scopeSelectionDescription.textContent()) || '').trim();
  }

  /** Whether the popup offers to sync the scope into a new session (its Sync button), without choosing it. */
  public async isSessionPopupSyncOptionVisible(): Promise<boolean> {
    return this.syncButton.isVisible();
  }

  public async sessionSelectPopup(option: string): Promise<boolean> {
    // The popup opens after the scope is applied, so give it time instead of checking once.
    const isPopupVisible = await this.waitForElementVisible(this.sessionSelectHeading, getTimeout('LONG'));
    const isDescriptionVisible = await this.waitForElementVisible(this.scopeSelectionDescription, getTimeout('SHORT'));
    if (!isPopupVisible || !isDescriptionVisible) {
      await this.objCommonFunctions.logMessage('ERROR', 'Session selection popup heading or description is not displayed.');
      return false;
    }

    if (option === 'createNewSession') {
      await this.syncButton.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
      await this.doClick(this.syncButton, 'Selecting create new session option');
      return true;
    }

    if (option === 'syncExistingSession') {
      await this.continueWithExistingSession.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
      await this.doClick(this.continueWithExistingSession, 'Selecting continue with existing session option');
      return true;
    }

    await this.objCommonFunctions.logMessage('ERROR', `Invalid session selection option: ${option}`);
    return false;
  }

  public async verifyRunIdFromMoreDetailsODM(): Promise<boolean> {
    const exists = (await this.runIdFromMoreDetilasODM.count()) > 0;
    await this.objCommonFunctions.logMessage(exists ? 'PASS' : 'FAIL', `Run ID is ${exists ? 'verified' : 'missing'} for status.`);
    return exists;
  }

  public async getRunIdFromMoreDetailsODM(): Promise<string> {
    return ((await this.runIdFromMoreDetilasODM.first().textContent()) || '').trim();
  }

  public async verifyProcedureTimeFromMoreDetailsODM(): Promise<boolean> {
    const exists = (await this.procedureTimeFromMoreDetailsODM.count()) > 0;
    await this.objCommonFunctions.logMessage(exists ? 'PASS' : 'FAIL', `Last Update Date is ${exists ? 'verified' : 'missing'} for status.`);
    return exists;
  }

  public async verifyScenarioIdFromMoreDetailsODM(): Promise<boolean> {
    const exists = (await this.scenarioIdFromMoreDetailsODM.count()) > 0;
    await this.objCommonFunctions.logMessage(exists ? 'PASS' : 'FAIL', `Scenario ID is ${exists ? 'verified' : 'missing'} for status.`);
    return exists;
  }

  public async verifyRealmIdDataSyncStatus(realmId: string): Promise<boolean> {
    const realm = ((await this.realmIdFromMoreDetailsODM.first().textContent()) || '').trim();
    return realm === realmId;
  }

  public async clickGlobalSaveAndVerify(): Promise<boolean> {
    const isVisible = await this.globalSaveIcon.isVisible().catch(() => false);
    if (!isVisible) {
      return false;
    }
    const isEnabled = await this.globalSaveIcon.isEnabled().catch(() => false);
    if (!isEnabled) {
      return false;
    }
    await this.doClick(this.globalSaveIcon, 'Clicking Global Save button');
    return true;
  }

  public async troubleShootClick(): Promise<void> {
    await this.troubleShootIcon.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.troubleShootIcon, 'Clicked on TroubleShoot icon');
  }

  /** Whether the More details modal offers Troubleshoot and it can be clicked (the MFE disables it while a recovery it started runs). */
  public async isTroubleShootEnabled(): Promise<boolean> {
    await this.troubleShootIcon.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    return this.troubleShootIcon.isEnabled();
  }
}

