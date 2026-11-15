import { Page, Locator, expect } from '@playwright/test';
import BasePage from '../page';
import { getTimeout } from '../../constants/timeouts';
import { CommonFunctions } from '../../util/common.util';
import { exactText } from './text-match';

/** Power bar chips that open a component drawer, keyed by the drawer title. */
const COMPONENT_CHIP_TEST_IDS: Record<string, string> = { Scope: 'scope-chip-btn', Scenarios: 'scenario-chip-btn' };

/**
 * Component drawers of the Planning page (Scope, Scenarios) and the power bar chips that open them.
 * The chips come from the power bar in `@by/plan-sop-ui-library` 2026.4.x: a `div[data-testid="<id>"]` holding an
 * icon and a `<p role="button">` label; the Scenarios chip is matched through that button because Manage Scenarios
 * table rows reuse `scenario-chip-btn` on a plain chip. Each drawer is a planning-mfe `CustomSideDrawer.tsx`
 * (MUI `Drawer`, so a `.MuiDrawer-paper`) with `side-nav-title` (an `h4`), `pinned-icon` or `unpinned-icon` and
 * `drawer-close-btn` in its header; it is only mounted while open. Apply in the Scenarios drawer is `save-btn`
 * (`SelectDefaultScenarioModalNew.tsx`), which other dialogs reuse, so it is scoped to the drawer.
 */
export class ComponentDrawerComponent extends BasePage {
  private readonly log = new CommonFunctions();

  constructor(page: Page) {
    super(page);
  }

  // Locators
  private chip(componentName: string): Locator | null {
    const testId = COMPONENT_CHIP_TEST_IDS[componentName];
    if (!testId) {
      return null;
    }
    const chip = this.getMfeFrameLocator().getByTestId(testId);
    return chip.getByRole('button');
  }
  private title(titleName: string): Locator {
    return this.getMfeFrameLocator().getByTestId('side-nav-title').filter({ hasText: exactText(titleName) });
  }
  private drawer(titleName: string): Locator {
    return this.mfeLocator('.MuiDrawer-paper').filter({ has: this.page.getByTestId('side-nav-title').filter({ hasText: exactText(titleName) }) });
  }
  /** Header buttons of whichever component drawer is open; only one is open at a time. */
  private headerButton(testId: string): Locator {
    return this.getMfeFrameLocator().getByTestId(testId).filter({ visible: true }).first();
  }
  private get btnPinned(): Locator { return this.headerButton('pinned-icon'); }
  private get btnUnpinned(): Locator { return this.headerButton('unpinned-icon'); }
  private get btnClose(): Locator { return this.headerButton('drawer-close-btn'); }
  private get btnApplyScenarios(): Locator { return this.drawer('Scenarios').getByTestId('save-btn'); }
  /** "Scenario Change" confirmation (`ConfirmationModal.tsx`) shown by Apply when the default scenario changes. */
  private get btnConfirmScenarioChange(): Locator { return this.getMfeFrameLocator().getByTestId('continue-button'); }

  // State
  public async isOpen(titleName: string): Promise<boolean> {
    return this.title(titleName).isVisible().catch(() => false);
  }

  public async waitForOpen(titleName: string): Promise<void> {
    await this.title(titleName).waitFor({ state: 'visible', timeout: getTimeout('LONG') });
  }

  public async waitForClosed(titleName: string): Promise<void> {
    await this.title(titleName).waitFor({ state: 'hidden', timeout: getTimeout('LONG') });
  }

  // Actions
  /** Opens the drawer from its power bar chip; returns false for components that have no chip. */
  public async open(componentName: string): Promise<boolean> {
    const chip = this.chip(componentName);
    if (!chip) {
      await this.log.logMessage('INFO', `${componentName} chip button not exist (unknown componentName)`);
      return false;
    }
    const title = this.title(componentName);
    await chip.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await expect(async () => {
      if (!(await this.isOpen(componentName))) {
        await this.doClick(chip, `Clicking on ${componentName} chip button`);
      }
      await expect(title).toBeVisible({ timeout: getTimeout('MEDIUM') });
    }).toPass({ timeout: getTimeout('EXTREME') });
    return true;
  }

  public async pin(): Promise<void> {
    if (!(await this.btnUnpinned.isVisible())) {
      await this.log.logMessage('INFO', 'Side drawer already pinned');
      return;
    }
    await this.doClick(this.btnUnpinned, 'Pinning side drawer');
    await expect(this.btnPinned).toBeVisible({ timeout: getTimeout('SHORT') });
  }

  public async unpin(): Promise<void> {
    if (!(await this.btnPinned.isVisible())) {
      await this.log.logMessage('INFO', 'Side drawer already unpinned');
      return;
    }
    await this.doClick(this.btnPinned, 'Unpinning side drawer');
    // The unpinned icon may not render in every drawer state, so only the pinned one is waited on.
    await expect(this.btnPinned).toBeHidden({ timeout: getTimeout('SHORT') });
  }

  /** Closes the open component drawer; logs and carries on when none is open. */
  public async close(): Promise<void> {
    try {
      await this.btnClose.waitFor({ state: 'visible', timeout: getTimeout('SHORT') });
      await this.doClick(this.btnClose, 'Clicking Close Drawer');
    } catch (error) {
      await this.log.logMessage('ERROR', `Close Drawer button is not visible: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clicks Apply in the Scenarios drawer and waits for the result: the drawer closes, or stays open because it is
   * pinned, or the "Scenario Change" confirmation opens (callers answer it).
   */
  public async applyScenarios(): Promise<void> {
    await this.btnApplyScenarios.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.page.keyboard.press('Escape');
    const isPinned = await this.btnPinned.isVisible();
    await this.doClickUsingScript(this.btnApplyScenarios, 'Clicking apply button in Scenarios component');
    if (isPinned) {
      return;
    }
    await expect(async () => {
      if (await this.btnConfirmScenarioChange.isVisible()) {
        return;
      }
      await expect(this.btnApplyScenarios).toBeHidden({ timeout: getTimeout('TINY') });
    }).toPass({ timeout: getTimeout('LONG') });
  }
}
