import { Page, Locator, FrameLocator, expect } from '@playwright/test';
import BasePage from './page';
import { getTimeout } from '../constants/timeouts'
import { CommonFunctions } from '../util/common.util';
import { ProcessPage } from './process.page';
import { PlanningPage } from './planning.page';
import { TestUtil } from '../util/test.util';
import { AssumptionPage } from './assumption.page';
import { exactText } from './planning/text-match';

type entity = 'Process' | 'Sub-process' | 'Assumption';

interface Context {
  process: string;
  subProcess?: string;
  assumption?: string;
}

/** Text fields read from an entity chip popover. */
interface EntityTooltipDetails {
  heading: string;
  entityName: string;
  status: string;
  cycleName: string;
  progressBarShown: boolean;
}

export class PowerBarPage extends BasePage {
    private objCommonFunctions: CommonFunctions;
    private processPage: ProcessPage;
    private planningPage: PlanningPage;
    private testUtil: TestUtil;
    private assumptionPage: AssumptionPage;

    constructor(page: Page) {
        super(page);
        this.objCommonFunctions = new CommonFunctions();
        this.processPage = new ProcessPage(page);
        this.planningPage = new PlanningPage(page);
        this.testUtil = new TestUtil(page);
        this.assumptionPage = new AssumptionPage(page);
    }

    // --- Locators ---
    // Markup: `@by/plan-sop-ui-library` 2026.4.x (compiled copy in plan-sop-lui node_modules), rendered in the MFE iframe.
    // - Power bar: `entityDetails` chip per context entity holding an `entityName-<type>` button (aria-label = entity name)
    //   and, for a process, a progressbar. `scope-chip-btn` / `scenario-chip-btn` on Planning only.
    // - Entity chip popover (role="tooltip"): "Context" title, `processDetails` and `closeButton` buttons, then one
    //   `.MuiGrid-item` per field holding a caption `span` label ("Status", "Cycle Name", "Origin Cycle") and a `p` value.
    // - `listingIcon` popover (MUI Paper): "Recently Opened", then two LuiLists (`.MuiList-root`): recent entities
    //   (`p` names), then All Processes / Switch Context.
    // - "Planning Context" switcher panel: "Processes" h4 + list, a toggle group (Child Processes / Assumptions) above the
    //   entity list, and Launch in New Tab / Switch Context buttons. The listing icon's MUI tooltip also names it
    //   "Switch Context", so switcher controls are scoped to the panel.
    private get frame(): FrameLocator                                                 { return this.getMfeFrameLocator(); }
    private get scopeChipInPowerBar(): Locator                                        { return this.frame.getByTestId('scope-chip-btn'); }
    private get scenarioChipInPowerBar(): Locator                                     { return this.frame.getByTestId('scenario-chip-btn'); }
    private get imgListingIcon(): Locator                                             { return this.frame.getByTestId('listingIcon'); }
    private get processContextChip(): Locator                                         { return this.frame.getByTestId('entityDetails'); }
    private get ContextProgressBar(): Locator                                         { return this.processContextChip.getByRole('progressbar'); }
    private get processContextChipEles(): Locator                                     { return this.processContextChip.getByRole('button'); }
    private get pageTitle(): Locator                                                  { return this.frame.getByTestId('app-header-block-title'); }
    private get getActivePage(): Locator                                              { return this.frame.locator('div.nav-item.active button'); }
    private get entityTooltip(): Locator                                              { return this.frame.getByRole('tooltip').filter({ has: this.page.getByTestId('closeButton') }); }
    private get processContextChipCloseIcon(): Locator                                { return this.entityTooltip.getByTestId('closeButton'); }
    private get getStatusText(): Locator                                              { return this.entityTooltip.getByText('Status', { exact: true }); }
    private get getToolTipText(): Locator                                             { return this.entityTooltip.getByText('Context', { exact: true }); }
    private get getAllDetailsButton(): Locator                                        { return this.frame.getByTestId('processDetails'); }
    private get progressBar(): Locator                                                { return this.entityTooltip.getByRole('progressbar'); }
    private get closeAssumptionButton(): Locator                                      { return this.frame.getByTestId('close-icon').and(this.frame.getByRole('button')); }
    private get recentlyOpenedPopover(): Locator                                      { return this.frame.locator('.MuiPaper-root').filter({ has: this.page.getByText('Recently Opened', { exact: true }) }).last(); }
    private get getRecentlyOpenedText(): Locator                                      { return this.recentlyOpenedPopover.getByText('Recently Opened', { exact: true }); }
    private get getAllRecentlyOpenedEntities(): Locator                               { return this.recentlyOpenedPopover.locator('.MuiList-root').first().locator('p'); }
    private get getContextSwitchItem(): Locator                                       { return this.recentlyOpenedPopover.getByText('Switch Context', { exact: true }); }
    private get contextSwitcherPanel(): Locator {
        return this.frame.locator('div')
            .filter({ has: this.page.getByRole('heading', { name: 'Planning Context', exact: true }) })
            .filter({ has: this.page.getByRole('heading', { name: 'Processes', exact: true }) })
            .last();
    }
    private get processesColumn(): Locator                                            { return this.contextSwitcherPanel.locator('div').filter({ has: this.page.getByRole('heading', { name: 'Processes', exact: true }) }).last(); }
    private get contextEntityColumn(): Locator {
        return this.contextSwitcherPanel.locator('div')
            .filter({ has: this.page.getByRole('group') })
            .filter({ has: this.page.locator('.MuiList-root') })
            .last();
    }
    // Live accessible names don't match the labels (toggles read "button <label>", Launch in New Tab has none), so match visible text.
    private contextEntityToggle(label: string): Locator                               { return this.contextSwitcherPanel.getByRole('group').getByRole('button').filter({ hasText: exactText(label) }); }
    private get getContextSwitchButton(): Locator                                     { return this.contextSwitcherPanel.getByRole('button', { name: 'Switch Context', exact: true }); }
    private get getLaunchInNewTabButton(): Locator                                    { return this.contextSwitcherPanel.getByRole('button').filter({ hasText: exactText('Launch in New Tab') }); }
    private getEntityDetailsByText(entityText: string): Locator                       { return this.processContextChip.getByRole('button', { name: entityText, exact: true }).first(); }
    private getEntityName(entity: string): Locator                                    { return this.entityTooltip.getByRole('button', { name: entity, exact: true }); }
    private getCycleName(label: string): Locator                                      { return this.entityTooltip.locator('.MuiGrid-item').filter({ has: this.page.getByText(label, { exact: true }) }).locator('p'); }
    private selectProcessContext(process: string): Locator                            { return this.processesColumn.getByText(process, { exact: true }); }
    private selectContextEntity(entity: string): Locator                              { return this.contextEntityColumn.getByText(entity, { exact: true }); }
    private selectChildProcess(): Locator                                             { return this.contextEntityToggle('Child Processes'); }
    private selectAssumptions(): Locator                                              { return this.contextEntityToggle('Assumptions'); }
    private getProcessNameText(entity: string): Locator                               { return this.pageTitle.filter({ hasText: exactText(entity) }).or(this.pageTitle.getByText(entity, { exact: true })).first(); }
    private getRecentlyOpenedProcess(order: number): Locator                          { return this.getAllRecentlyOpenedEntities.nth(order - 1); }
    private getBackIcon(): Locator                                                    { return this.frame.locator('div[aria-label="Back"]'); }

    // --- Helpers ---

    /** The innermost entity of a context: the sub-process or assumption when given, else the process. */
    protected leafEntity(processName: string, subProcessName?: string, assumption?: string): string {
        return subProcessName || assumption || processName;
    }

    /** Maps a `PROCESS` / `SUBPROCESS` / other entity type to its name. */
    protected entityForType(entityType: string, processName: string, subProcessName?: string, assumption?: string): string {
        if (entityType === 'PROCESS') return processName;
        if (entityType === 'SUBPROCESS') return subProcessName || '';
        return assumption || '';
    }

    /** Waits for a details page header showing `entity` and returns its text. */
    protected async waitForDetailsPageTitle(entity: string): Promise<string> {
        const title = this.getProcessNameText(entity);
        await title.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
        return await title.textContent() || '';
    }

    /** Waits for the left-pane nav to mark `pageName` active (scenario page is slow); warns and continues if it never does. */
    protected async waitForActivePage(pageName: string): Promise<void> {
        try {
            await expect(this.getActivePage).toHaveAttribute('aria-label', pageName, { timeout: getTimeout('XLARGE') });
        } catch {
            await this.objCommonFunctions.logMessage('WARN', `${pageName} page did not become the active nav item`);
        }
    }

    /** Reads the open entity chip popover; the progress bar is only checked for a process. */
    protected async readEntityTooltip(entity: string, cycleLabel: string, isProcess: boolean): Promise<EntityTooltipDetails> {
        const heading = await this.getToolTipText.textContent() || '';
        let progressBarShown = true;
        if (isProcess) {
            progressBarShown = await this.waitForElementVisible(this.progressBar);
            await this.objCommonFunctions.compareTwoValues(progressBarShown, true, "Progress bar is displayed");
        }
        await this.objCommonFunctions.logMessage('INFO', `Entity: ${entity}, Cycle Name: ${cycleLabel}`);
        const entityName = await this.getEntityName(entity).textContent() || '';
        const status = await this.getStatusText.textContent() || '';
        const cycleName = await this.getCycleName(cycleLabel).textContent() || '';
        await this.objCommonFunctions.logMessage('INFO', `entityNameText : ${entityName}, statusText : ${status}, cycleNameText:  ${cycleName}`);
        return { heading, entityName, status, cycleName, progressBarShown };
    }

    /** Clicks `trigger`, verifies the context in the tab it opens, then closes that tab. Returns null when no tab opened. */
    protected async verifyContextInNewTab(trigger: Locator, logMessage: string, context: Context, waitForDetailsPage?: boolean, required: boolean = true): Promise<boolean | null> {
        const newPagePromise = this.page.context().waitForEvent('page', { timeout: getTimeout('MEDIUM') });
        if (!required) newPagePromise.catch(() => null);
        await this.doClick(trigger, logMessage);
        const newPage = required ? await newPagePromise : await newPagePromise.catch(() => null);
        if (!newPage) return null;
        await newPage.waitForLoadState('domcontentloaded');
        try {
            return await new PowerBarPage(newPage).verifyContextEntity(context.process, context.subProcess, context.assumption, waitForDetailsPage);
        } finally {
            await newPage.close();
        }
    }

    /** Opens a Planning component drawer from its power bar chip. */
    protected async verifyComponentDrawerOpens(component: 'Scope' | 'Scenarios'): Promise<boolean> {
        const isDrawerOpened = await this.planningPage.openComponent(component);
        await this.objCommonFunctions.logMessage('INFO', isDrawerOpened
            ? `${component} side navigation panel opened successfully`
            : `${component} side navigation panel doesn't exist`);
        return isDrawerOpened;
    }

    // --- Atomic actions ---

    public async verifyBackButtonExists(): Promise<boolean> {
        const isBackButtonExists = await this.getBackIcon().isVisible();
        await this.objCommonFunctions.logMessage('INFO', `${isBackButtonExists} - back button exists`);
        return isBackButtonExists;
    }

    public async clickOnSpecificEntityInPowerBar(processName: string, subProcessName?: string, assumption?: string): Promise<void> {
        const entityName = this.leafEntity(processName, subProcessName, assumption);
        await this.doClick(this.getEntityDetailsByText(entityName), `Clicked on PowerBar entity: ${entityName}`);
    }

    public async closePowerBarEntityTooltip(): Promise<void> {
        await this.doClick(this.processContextChipCloseIcon, "Clicked on PowerBar entity tooltip close icon");
    }

    public async getActivePageName(): Promise<string> {
        const activePageName = await this.getActivePage.getAttribute('aria-label') || '';
        await this.objCommonFunctions.logMessage("INFO", `Active page name: ${activePageName}`);
        return activePageName;
    }

    public async closeAssumptions(): Promise<void> {
        await this.doClick(this.closeAssumptionButton, "Clicked on Close Assumption button");
    }

    public async clickOnListingIcon(): Promise<void> {
        await this.doClick(this.imgListingIcon, "Clicked Listing Icon");
    }

    // --- Composite actions ---

    public async verifyPowerBarDetailsInAllPages(quickLinksList: any[], type: entity = 'Sub-process', processName: string, subProcessName?: string, assumption?: string): Promise<boolean> {
        let isValidation = true;
        for (const item of quickLinksList) {
            await this.objCommonFunctions.logMessage('INFO', `Verifying PowerBar details in ${item} page`);
            await this.testUtil.clickLeftpaneLinks(item);
            await this.waitForActivePage(item);
            const isPowerBarDisplayed = await this.verifyPowerBarDetails(type, processName, subProcessName, assumption);
            const powerbarValidation = await this.objCommonFunctions.compareTwoValues(isPowerBarDisplayed, true, `PowerBar details are displayed in "${item}" page`);
            if (!powerbarValidation) {
                await this.objCommonFunctions.logMessage('INFO', `PowerBar details are not displayed in ${item} page`);
                isValidation = false;
            }
        }
        return isValidation;
    }

    public async verifyContextEntity(processName: string, subProcessName?: string, assumption?: string, waitForDetailsPage?: boolean): Promise<boolean> {
        if (waitForDetailsPage) {
            await this.pageTitle.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') }); // Waiting for details page to load
        }
        const context = [processName, subProcessName || assumption].filter(Boolean).join('>');
        await this.objCommonFunctions.logMessage('INFO', `Context is : ${context}`);

        const chipButtons = this.processContextChipEles;
        await chipButtons.first().waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });

        const normalizedContext = context.replace(/>/g, '').trim();
        // A process-only context reads just the first chip; a child context concatenates every chip.
        const readAllChips = Boolean(subProcessName || assumption);
        try {
            await expect.poll(async () => {
                const texts = readAllChips ? await chipButtons.allTextContents() : [await chipButtons.first().textContent() || ''];
                return texts.join('').replace(/>/g, '').trim();
            }, {
                timeout: getTimeout('EXTREME'),
                message: `Waiting for powerbar entity to match ${normalizedContext}`
            }).toBe(normalizedContext);

            await this.objCommonFunctions.logMessage('INFO', `PowerBar entity name matches context: ${normalizedContext}`);
            return true;
        } catch {
            await this.objCommonFunctions.logMessage('WARN', `PowerBar entity name did not match context: ${normalizedContext}`);
            return false;
        }
    }

    public async verifyPowerBarDetails(type: entity = 'Sub-process', processName: string, subProcessName?: string, assumption?: string, waitForDetailsPage?: boolean): Promise<boolean> {
        const isEntityNameDisplayed = await this.verifyContextEntity(processName, subProcessName, assumption, waitForDetailsPage);
        let isValid = await this.objCommonFunctions.compareTwoValues(isEntityNameDisplayed, true, "PowerBar entity name is displayed");

        if (type === 'Process') {
            const isProgressBarExist = await this.waitForElementVisible(this.ContextProgressBar);
            isValid = await this.objCommonFunctions.compareTwoValues(isProgressBarExist, true, "PowerBar progress bar is displayed") && isValid;
        }

        if (await this.getActivePageName() === 'Planning') {
            for (const [chip, label] of [[this.scopeChipInPowerBar, 'scope'], [this.scenarioChipInPowerBar, 'scenario']] as const) {
                const isChipVisible = await this.waitForElementVisible(chip);
                const chipText = isChipVisible ? await chip.textContent() || '' : '';
                isValid = await this.objCommonFunctions.compareTwoValues(isChipVisible, true, `PowerBar ${label} chip is displayed as ${chipText}`) && isValid;
            }
        }
        return isValid;
    }

    public async navToDetailsPage(processName: string, entityType: string, subProcessName?: string, assumption?: string): Promise<void> {
        // Right after a navigation (a sub process routed to its Planning view) the view's re-render swallows the chip click or
        // closes the popover, so click the chip until `processDetails` shows. The chip toggles the popover: click only while it is closed.
        await expect(async () => {
            if (!await this.getAllDetailsButton.isVisible()) {
                await this.clickOnSpecificEntityInPowerBar(processName, subProcessName, assumption);
            }
            await expect(this.getAllDetailsButton).toBeVisible({ timeout: getTimeout('SHORT') });
        }).toPass({ timeout: getTimeout('XLARGE') });
        await this.doClick(this.getAllDetailsButton, "Clicked on All Details button");
    }

    public async navToPreviousPage(processName?: string, subProcessName?: string, assumption?: string): Promise<void> {
        if (!processName) {
            await this.page.goBack();
        } else if (subProcessName) {
            await this.processPage.goToSubProcessDetailsPage(processName, subProcessName);
        } else if (assumption) {
            await this.assumptionPage.goToAssumptionDetailsPage(processName, assumption);
        } else {
            await this.processPage.clickOnProcess(processName);
        }
        await this.objCommonFunctions.logMessage('INFO', 'back to previous page');
    }

    public async verifyPowerBarToolTipDetails(processName: string, entityType: string, subProcessName?: string, assumption?: string): Promise<boolean> {
        await this.clickOnSpecificEntityInPowerBar(processName, subProcessName, assumption);
        const entity = this.leafEntity(processName, subProcessName, assumption);
        const tooltip = await this.readEntityTooltip(entity, assumption && !subProcessName ? 'Origin Cycle' : 'Cycle Name', entity === processName);

        await this.closePowerBarEntityTooltip();
        await this.clickOnListingIcon();
        const recentlyOpenedText = await this.getRecentlyOpenedText.textContent() || '';

        const headerElement = await this.processPage.goToPOListingPageAndVerify();
        await this.navToPreviousPage(processName, subProcessName, assumption);

        await this.navToDetailsPage(processName, entityType, subProcessName, assumption);
        const processNameText = await this.waitForDetailsPageTitle(entity);

        await this.objCommonFunctions.logMessage('INFO', `recentlyOpenedText : ${recentlyOpenedText}, headerElement : ${headerElement} processNameText : ${processNameText} toolTipHeading :  ${tooltip.heading} checkProcessProgress : ${tooltip.progressBarShown}`);
        return Boolean(tooltip.heading && tooltip.entityName && tooltip.status && tooltip.cycleName && recentlyOpenedText && headerElement && processNameText && tooltip.progressBarShown);
    }

    public async verifyPowerBarEntityToolTipDetails(entityType: string, processName: string, subProcessName?: string, assumption?: string): Promise<boolean> {
        await this.clickOnSpecificEntityInPowerBar(processName, subProcessName, assumption);
        await this.getToolTipText.waitFor({ state: 'visible', timeout: getTimeout('SHORT') });
        const entity = this.entityForType(entityType, processName, subProcessName, assumption);
        const cycleLabel = (entityType === 'PROCESS' || entityType === 'SUBPROCESS') ? 'Cycle Name' : 'Origin Cycle';
        const tooltip = await this.readEntityTooltip(entity, cycleLabel, entity === processName);

        await this.navToDetailsPage(processName, entityType, subProcessName, assumption);
        const processNameText = await this.waitForDetailsPageTitle(entity);
        await this.objCommonFunctions.logMessage('INFO', `processNameText : ${processNameText} toolTipHeading :  ${tooltip.heading} checkProcessProgress : ${tooltip.progressBarShown}`);
        return Boolean(tooltip.heading && tooltip.entityName && tooltip.status && tooltip.cycleName && processNameText && tooltip.progressBarShown);
    }

    public async verifyNavigationOnClickOfEntityChipInPo(entityType: string, processName: string, subProcessName?: string, assumption?: string): Promise<boolean> {
        const entity = this.entityForType(entityType, processName, subProcessName, assumption);
        await this.getEntityDetailsByText(entity).click();
        await this.objCommonFunctions.logMessage('INFO', `Clicked on PowerBar entity: ${entity}`);

        await this.waitForDetailsPageTitle(entity);
        await this.objCommonFunctions.logMessage('INFO', `Navigated to ${entityType} details page from PowerBar`);
        return await this.getProcessNameText(entity).isVisible();
    }

    public async verifyRecentlyViewedProcess(processName: string, entityType: string, recentlyOpenedProcess: string[], isPlanningSpace?: boolean, subProcessName?: string, assumption?: string): Promise<boolean> {
        for (const process of recentlyOpenedProcess) {
            if (isPlanningSpace) {
                await this.selectEntityFromContext({ process });
            } else {
                await this.clickOnListingIcon();
                await this.processPage.goToPOListingPageAndVerify();
                await this.processPage.getPageTitle();
                await this.processPage.clickOnProcess(process);
            }
        }

        await this.clickOnListingIcon();
        const recentEntities = this.getAllRecentlyOpenedEntities;
        await recentEntities.first().waitFor({ state: 'visible' });
        const recentlyOpenedEntites = await recentEntities.allTextContents();

        const checkRecentlyOpenedEntityContext = await this.verifyRecentlyViewedEntityContext(recentlyOpenedProcess[recentlyOpenedProcess.length - 1], 'Process');
        const sorted = (list: string[]) => JSON.stringify([...list].sort());
        await this.objCommonFunctions.logMessage('INFO', `recentlyOpenedProcess: ${sorted(recentlyOpenedProcess)}, recentlyOpenedEntites: ${sorted(recentlyOpenedEntites)}, checkRecentlyOpenedEntityContext: ${checkRecentlyOpenedEntityContext}`);

        // The exact-list checks are subsets of the `every` check, kept so the intent stays readable.
        const actualEntities = sorted(recentlyOpenedEntites);
        const isListMatching = actualEntities === sorted([...recentlyOpenedProcess, processName])
            || actualEntities === sorted(recentlyOpenedProcess)
            || recentlyOpenedProcess.every(proc => recentlyOpenedEntites.includes(proc));

        return isListMatching && checkRecentlyOpenedEntityContext;
    }

    public async selectEntityFromContext(Context: Context, isOpenedInTab: boolean = false, waitForDetailsPage?: boolean) {
        const { process, subProcess, assumption } = Context;
        await this.clickOnListingIcon();
        await this.doClick(this.getContextSwitchItem, "Clicked on context switch item menu");
        await this.doClick(this.selectProcessContext(process), `Clicked on ${process} process from context switch`);
        if (subProcess) {
            await this.doClick(this.selectChildProcess(), "Clicked on child process button");
            await this.doClick(this.selectContextEntity(subProcess), `Clicked on ${subProcess} process from context switch`);
            return await this.verifySwitchContextEntity({ process, subProcess }, isOpenedInTab, waitForDetailsPage);
        }
        if (assumption) {
            await this.doClick(this.selectAssumptions(), "Clicked on assumptions button");
            await this.doClick(this.selectContextEntity(assumption), `Clicked on ${assumption} process from context switch`);
            return await this.verifySwitchContextEntity({ process, assumption }, isOpenedInTab, waitForDetailsPage);
        }
        return await this.verifySwitchContextEntity({ process }, isOpenedInTab, waitForDetailsPage);
    }

    public async verifyRecentlyViewedEntityContext(processName: string, entityType: string): Promise<boolean> {
        // The recent entry may open in a new tab or in the current one.
        const inNewTab = await this.verifyContextInNewTab(this.getRecentlyOpenedProcess(1), "Clicking on recently opened process", { process: processName }, undefined, false);
        const getProcess = await this.verifyContextEntity(processName);
        await this.objCommonFunctions.logMessage('INFO', `getProcess: ${getProcess} getProcessName (new tab): ${inNewTab}`);
        return inNewTab === null ? getProcess : inNewTab && getProcess;
    }

    public async verifySwitchContextEntity(context: Context, isOpenedInTab: boolean = false, waitForDetailsPage?: boolean) {
        const { process, subProcess, assumption } = context;
        const button = isOpenedInTab ? this.getLaunchInNewTabButton : this.getContextSwitchButton;
        const label = isOpenedInTab ? 'Launch in New Tab' : 'Switch Context';
        await expect(button, `Waiting for ${label} button to become enabled`).toBeEnabled({ timeout: getTimeout('MEDIUM') });

        const isContextChanged = isOpenedInTab
            ? await this.verifyContextInNewTab(button, `Clicked ${label} button`, context, waitForDetailsPage)
            : (await this.doClick(button, `Clicked ${label} button`), await this.verifyContextEntity(process, subProcess, assumption, waitForDetailsPage));

        if (isContextChanged) {
            await this.objCommonFunctions.logMessage('INFO', `Context is changed${isOpenedInTab ? ' in new tab' : ''}: ${isContextChanged}`);
            return true;
        }
        return false;
    }

    public async verifyPowerBarScopeChipClick(): Promise<boolean> {
        return await this.verifyComponentDrawerOpens('Scope');
    }

    public async verifyPowerBarScenarioChipClick(): Promise<boolean> {
        return await this.verifyComponentDrawerOpens('Scenarios');
    }

}
