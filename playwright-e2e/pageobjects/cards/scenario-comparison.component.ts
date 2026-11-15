import { Page, Locator } from '@playwright/test';
import BasePage from '../page';
import { getTimeout } from '../../constants/timeouts';
import { CommonFunctions } from '../../util/common.util';
import { dashboardCardByTitle } from './card-locators';

export interface RankedScenario {
  normalizedScore: number;
  scenarioName: string;
}

type MeasureSettings = Record<string, { weightage: number; target: number } | number>;

/**
 * Scenario comparison card (planning-mfe `cdsp-scenario-comparison`): rows `scenario-table-row` (cells by
 * `data-index`, value in `div p` with `data-value`, delta icons `trending-up-indicator` / `trending-down-indicator` /
 * `neutral-indicator`), the measure weightage and target popover (`measure-weightage-target-settings`,
 * `measure-display-name`, `measure-weightage-slider`, `measure-target-input`, Apply / Reset
 * `measure-weightage-apply-button` / `-reset-button`), the "Chart Compare" toggle with lines `line.<scenario>`, and the
 * "Publish Scenario" row action that runs `scaRunButton`.
 */
export class ScenarioComparisonComponent extends BasePage {
  private readonly log = new CommonFunctions();

  constructor(page: Page) {
    super(page);
  }

  // Locators
  private get rows(): Locator                   { return this.getMfeFrameLocator().getByTestId('scenario-table-row'); }
  private get btnPublishScenario(): Locator     { return this.getMfeFrameLocator().getByRole('button', { name: 'Publish Scenario', exact: true }).first(); }
  private get btnScaRun(): Locator              { return this.getMfeFrameLocator().getByTestId('scaRunButton').first(); }
  private get switchAdjustTargets(): Locator    { return this.getMfeFrameLocator().getByRole('switch').first(); }
  private get measureNames(): Locator           { return this.getMfeFrameLocator().getByTestId('measure-display-name'); }
  private get weightageInputs(): Locator        { return this.mfeLocator('[data-testid="measure-weightage-slider"] input'); }
  private get targetInputs(): Locator           { return this.mfeLocator('[data-testid="measure-target-input"] input'); }
  private get btnApply(): Locator               { return this.getMfeFrameLocator().getByTestId('measure-weightage-apply-button').first(); }
  private get btnReset(): Locator               { return this.getMfeFrameLocator().getByTestId('measure-weightage-reset-button').first(); }
  private btnSettings(cardTitle: string): Locator { return dashboardCardByTitle(this, cardTitle).getByTestId('measure-weightage-target-settings').first(); }
  private chartLine(cardTitle: string, scenario: string): Locator {
    return dashboardCardByTitle(this, cardTitle).locator(`[data-testid=${JSON.stringify(`line.${scenario}`)}]`).first();
  }
  private btnChartCompare(cardTitle: string): Locator {
    return dashboardCardByTitle(this, cardTitle).getByRole('button', { name: 'Chart Compare', exact: true }).first();
  }
  private cell(row: number, col: number): Locator {
    return this.mfeLocator(`tr[data-testid="scenario-table-row"][data-index="${row}"] td[data-index="${col}"]`).first();
  }
  private deltaIndicator(row: number, col: number, diff: number): Locator {
    const testId = diff < 0 ? 'trending-down-indicator' : diff > 0 ? 'trending-up-indicator' : 'neutral-indicator';
    return this.cell(row, col).getByTestId(testId).first();
  }

  // Helpers
  private async readMeasureSettings(): Promise<MeasureSettings> {
    const settings: MeasureSettings = {};
    let totalWeightage = 0;
    const count = await this.measureNames.count();
    for (let i = 0; i < count; i++) {
      const name = ((await this.measureNames.nth(i).textContent()) ?? '').trim();
      const weightage = Number(await this.weightageInputs.nth(i).inputValue());
      const target = Number(await this.targetInputs.nth(i).inputValue());
      settings[name] = { weightage, target };
      totalWeightage += weightage;
    }
    settings.totalWeightage = totalWeightage;
    return settings;
  }

  private async scenarioName(row: number): Promise<string> {
    return ((await this.cell(row, 0).textContent()) ?? '').trim();
  }

  // Actions
  /** Opens the card's measure settings and clicks the "adjust targets" switch; returns whether the switch showed. */
  public async openMeasureSettings(cardTitle: string): Promise<boolean> {
    const settings = this.btnSettings(cardTitle);
    await settings.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(settings, `Clicking on settings button of ${cardTitle} card`);
    await this.switchAdjustTargets.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    const isShown = await this.switchAdjustTargets.isVisible();
    await this.doClick(this.switchAdjustTargets, `Clicking on Measure Weightage Target toggle in ${cardTitle} card`);
    return isShown;
  }

  public async resetMeasureSettings(cardTitle: string): Promise<boolean> {
    const settings = this.btnSettings(cardTitle);
    await settings.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(settings, `Clicking on settings button of ${cardTitle} card`);
    await this.btnReset.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    const isShown = await this.btnReset.isVisible();
    await this.doClick(this.btnReset, 'Clicking on Reset button to reset measure settings to default');
    return isShown;
  }

  /** Raises each measure's weightage by `i * 5 + 1` and its target by `(i + 2) * 1000`. */
  public async updateMeasureSettings(): Promise<void> {
    const count = await this.measureNames.count();
    for (let i = 0; i < count; i++) {
      const weightage = Number(await this.weightageInputs.nth(i).inputValue());
      const target = Number(await this.targetInputs.nth(i).inputValue());
      await this.weightageInputs.nth(i).fill(String(weightage + i * 5 + 1));
      await this.targetInputs.nth(i).fill(String(target + (i + 2) * 1000));
    }
  }

  /**
   * Applies the measure settings, then scores each scenario: per measure, the delta from target (in %, signed by the
   * measure's orientation) weighted by its share of the total weightage. Checks each cell shows the matching delta
   * indicator (logged, as before) and returns the scenarios best first.
   */
  public async rankScenarios(measureOrientations?: Record<string, number>): Promise<RankedScenario[]> {
    const settings = await this.readMeasureSettings();
    await this.btnApply.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(this.btnApply, 'Clicking on Apply button to save measure settings');
    const measureNames = Object.keys(settings).filter((key) => key !== 'totalWeightage');
    const totalWeightage = Number(settings.totalWeightage || 1);
    const scenarios: RankedScenario[] = [];

    const rowCount = await this.rows.count();
    for (let row = 0; row < rowCount; row++) {
      let normalizedScore = 0;
      for (let m = 0; m < measureNames.length; m++) {
        const col = m + 2;
        const value = this.cell(row, col).locator('div p').first();
        const actual = Number((await value.getAttribute('data-value')) ?? ((await value.textContent()) || '0'));
        const measure = settings[measureNames[m]] as { weightage: number; target: number };
        const orientation = measureOrientations?.[measureNames[m]] ?? 1;
        const target = Number(measure.target || 1);
        const diff = Number((((orientation * (actual - target)) / target) * 100).toFixed(1));
        normalizedScore += diff * (Number(measure.weightage) / totalWeightage);
        const hasIndicator = await this.deltaIndicator(row, col, diff).isVisible();
        await this.log.compareTwoValues(hasIndicator, true, `Indicator existence at row ${row} and column ${col} is: ${hasIndicator}`);
      }
      scenarios.push({ normalizedScore, scenarioName: await this.scenarioName(row) });
    }
    return scenarios.sort((a, b) => b.normalizedScore - a.normalizedScore);
  }

  public async isRankedInOrder(scenarios: RankedScenario[]): Promise<boolean> {
    for (let row = 0; row < scenarios.length; row++) {
      const matched = await this.log.compareTwoValues(await this.scenarioName(row), scenarios[row].scenarioName, `Verifying scenario name at row ${row}`);
      if (!matched) return false;
    }
    return true;
  }

  /** Hovers the first scenario row and runs its "Publish Scenario" action; false when the row offers none. */
  public async publishFirstScenario(): Promise<boolean> {
    await this.rows.first().waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.rows.first().hover();
    if (!(await this.btnPublishScenario.isVisible())) return false;
    await this.doClick(this.btnPublishScenario, 'Clicking on publish scenario button');
    await this.btnScaRun.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') });
    await this.doClick(this.btnScaRun, 'Clicking on publish/run button');
    return true;
  }

  /** Clicks "Chart Compare" and checks the scenario's chart line is hidden afterwards. */
  public async hideChartOnToggle(cardTitle: string, scenario: string): Promise<boolean> {
    const toggle = this.btnChartCompare(cardTitle);
    await toggle.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    const line = this.chartLine(cardTitle, scenario);
    const wasShown = await line.isVisible();
    await this.doClick(toggle, `Clicking on Chart Compare toggle button of ${cardTitle} card`);
    if (!wasShown) return true;
    return line.waitFor({ state: 'hidden', timeout: getTimeout('XLARGE') }).then(() => true, () => false);
  }
}
