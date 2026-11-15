import { Page, Locator, expect } from '@playwright/test';
import BasePage from '../page';
import { getTimeout } from '../../constants/timeouts';

/** The Manual Review button (`REVIEW`) is commented out in the MFE as a future enhancement. */
export type RebaseStrategy = 'INHERIT_ALL' | 'INHERIT_NONE';

/** The Resolve Conflicts dialog (planning-mfe `ResolveConflictsModal.tsx`), opened for an out-of-sync scenario. */
export class ResolveConflictsComponent extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get parentUpdatedAlert(): Locator { return this.getMfeFrameLocator().getByTestId('resolve-conflicts-parent-updated-alert'); }
  private get targetScenarioChip(): Locator { return this.getMfeFrameLocator().getByTestId('scenario-conflict-target-scenario-chip'); }
  private strategyButton(strategy: RebaseStrategy): Locator {
    const testIds: Record<RebaseStrategy, string> = {
      INHERIT_ALL: 'resolve-conflicts-rebaseline-apply-override-btn',
      INHERIT_NONE: 'resolve-conflicts-rebaseline-btn',
    };
    return this.getMfeFrameLocator().getByTestId(testIds[strategy]);
  }

  public async isOpen(timeout: number = getTimeout('LONG')): Promise<boolean> {
    return this.parentUpdatedAlert.waitFor({ state: 'visible', timeout }).then(() => true, () => false);
  }

  public async getTargetScenario(): Promise<string> {
    return (await this.doGetText(this.targetScenarioChip, 'Getting target scenario in Resolve Conflicts')).trim();
  }

  /** Picks a strategy and waits for the dialog to close. */
  public async choose(strategy: RebaseStrategy): Promise<void> {
    await this.doClick(this.strategyButton(strategy), `Choosing ${strategy} in Resolve Conflicts`);
    await expect(this.parentUpdatedAlert).toBeHidden({ timeout: getTimeout('LONG') });
  }
}
