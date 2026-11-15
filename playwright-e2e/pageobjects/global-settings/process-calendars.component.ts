import { Page, Locator, expect } from '@playwright/test';
import { getTimeout } from '../../constants/timeouts';
import { GlobalSettingsComponent } from './settings-component';

/**
 * Process Calendars screen of PO Global Settings (lui `src/Components/CalendarManager`): the calendar list, the
 * calendar create/edit/delete modal, and the calendar detail page with its cycles.
 *
 * `Add Calendar` and `Add Cycle` are `aria-label`s in lui `CalendarManager/index.tsx` and `calendarDetails.tsx`.
 * Clicking a calendar row opens its detail page (`onRowClick`). `lui-ccl-*` test IDs are generated at runtime by
 * `@jda/lui-common-component-library-mui5`. While the table loads, it renders `lui-ccl-table-loading-cell` rows.
 *
 * PO allows only one cycle per start date in a calendar (`calendar_cycles_unique`). It reports a clash as
 * `IBP_PO_40_2100` "Calendar cycle name … already exists", and lui then shows "Something went wrong", so callers
 * creating several cycles pass a distinct `startDay` for each one.
 */
export class ProcessCalendarsComponent extends GlobalSettingsComponent {
  constructor(page: Page) {
    super(page);
  }

  // --- Locators: calendar list ---
  private get btnAddCalendar(): Locator                         { return this.mfeLocator('button[aria-label="Add Calendar"]').first(); }
  private calendarRow(calendarName: string): Locator            { return this.getMfeFrameLocator().getByRole('row').filter({ hasText: calendarName }).first(); }
  private calendarNameCell(calendarName: string): Locator       { return this.calendarRow(calendarName).getByText(calendarName, { exact: true }).first(); }
  private calendarThreeDotButton(calendarName: string): Locator { return this.calendarRow(calendarName).getByTestId('lui-ccl-threedot-menu-icon-button').first(); }
  private calendarDescription(calendarName: string, description: string): Locator {
    return this.calendarRow(calendarName).getByText(description, { exact: true }).first();
  }

  // --- Locators: calendar and cycle modal ---
  private get modal(): Locator {
    const frame = this.getMfeFrameLocator();
    return frame.getByTestId('lui-ccl-modal').or(frame.locator('div[role="dialog"]')).first();
  }
  private get nameInput(): Locator                              { return this.modal.getByPlaceholder('Add Name').or(this.modal.locator('input#calendarName')).first(); }
  private get calendarDescriptionInput(): Locator               { return this.modal.locator('input#description, textarea#description').first(); }
  private get cycleDescriptionInput(): Locator                  { return this.modal.getByPlaceholder('Add Description').first(); }
  private get btnCreate(): Locator                              { return this.modal.getByRole('button', { name: 'Create', exact: true }).first(); }
  private get btnSave(): Locator                                { return this.modal.getByRole('button', { name: 'Save', exact: true }).first(); }
  private get btnDelete(): Locator                              { return this.modal.getByRole('button', { name: 'Delete', exact: true }).first(); }
  private get cycleDateButtons(): Locator                       { return this.modal.getByRole('button', { name: /choose date/i }); }
  // The MUI date picker opens as its own dialog on top of the cycle modal.
  private get datePickerDays(): Locator {
    return this.getMfeFrameLocator().locator('div[role="dialog"]').last().locator('button.MuiPickersDay-root:not([disabled])');
  }

  // --- Locators: calendar detail (cycles) ---
  private get btnAddCycle(): Locator                            { return this.mfeLocator('button[aria-label="Add Cycle"]').first(); }
  private get cycleRows(): Locator                              { return this.getMfeFrameLocator().getByTestId('lui-ccl-table-row'); }
  private get tableLoadingCells(): Locator                      { return this.getMfeFrameLocator().getByTestId('lui-ccl-table-loading-cell'); }
  private cycleRow(cycleName: string): Locator                  { return this.getMfeFrameLocator().getByRole('row').filter({ hasText: cycleName }).first(); }

  // --- Helpers ---
  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /** Opens the start (0) or end (1) date picker and clicks a random enabled day in [minDay, maxDay] (any enabled day if none fits). */
  private async pickCycleDate(pickerIndex: number, minDay: number, maxDay: number): Promise<number> {
    const label = pickerIndex === 0 ? 'start' : 'end';
    await this.doClick(this.cycleDateButtons.nth(pickerIndex), `Opening cycle ${label} date picker`);
    await this.datePickerDays.first().waitFor({ state: 'visible', timeout: getTimeout('LONG') });

    const days = (await this.datePickerDays.allTextContents())
      .map((text, index) => ({ day: Number.parseInt(text.trim(), 10), index }))
      .filter(({ day }) => !Number.isNaN(day));
    if (days.length === 0) {
      throw new Error('No enabled dates available in cycle date picker');
    }
    const inRange = days.filter(({ day }) => day >= minDay && day <= maxDay);
    const pool = inRange.length > 0 ? inRange : days;
    const pick = pool[this.randomInt(0, pool.length - 1)];
    await this.doClick(this.datePickerDays.nth(pick.index), `Selecting cycle ${label} date day ${pick.day}`);
    return pick.day;
  }

  private async waitForTableLoaded(): Promise<void> {
    await expect(this.tableLoadingCells).toHaveCount(0, { timeout: getTimeout('LONG') });
  }

  // --- Atomic actions ---
  public async openCalendarFromList(calendarName: string): Promise<void> {
    const nameCell = this.calendarNameCell(calendarName);
    await nameCell.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(nameCell, `Opening calendar from list by clicking name: ${calendarName}`);
    if (!(await this.waitForElementVisible(this.btnAddCycle, getTimeout('MEDIUM')))) {
      await this.doClick(this.calendarRow(calendarName), `Retrying: clicking calendar row for ${calendarName}`);
    }
    await this.btnAddCycle.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
  }

  public async getCycleRowCount(): Promise<number> {
    await this.btnAddCycle.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.waitForTableLoaded();
    return this.cycleRows.count();
  }

  public async isCalendarListed(calendarName: string, description: string, expectListed: boolean = true): Promise<boolean> {
    const row = this.calendarRow(calendarName);
    if (!expectListed) {
      await row.waitFor({ state: 'hidden', timeout: getTimeout('LONG') });
      return true;
    }
    await row.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    // After an edit the row is already there with the old description until the list refreshes.
    return this.waitForElementVisible(this.calendarDescription(calendarName, description), getTimeout('MEDIUM'));
  }

  // --- Composite actions ---
  public async createCalendar(calendarName: string, description: string): Promise<void> {
    await this.btnAddCalendar.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.btnAddCalendar, 'Clicking Add Calendar button');
    await this.nameInput.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.clearAndSetInputValue(this.nameInput, calendarName);
    await this.clearAndSetInputValue(this.calendarDescriptionInput, description);
    await this.doClick(this.btnCreate, `Creating calendar: ${calendarName}`);
  }

  public async editCalendarDescription(calendarName: string, updatedDescription: string): Promise<void> {
    await this.calendarRow(calendarName).waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.selectRowMenuOption(() => this.doClick(this.calendarThreeDotButton(calendarName), `Opening three dot menu for calendar: ${calendarName}`), 'Edit');
    await this.calendarDescriptionInput.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.clearAndSetInputValue(this.calendarDescriptionInput, updatedDescription);
    await this.doClick(this.btnSave, `Saving updated description for calendar: ${calendarName}`);
  }

  public async deleteCalendar(calendarName: string): Promise<void> {
    await this.calendarRow(calendarName).waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.selectRowMenuOption(() => this.doClick(this.calendarThreeDotButton(calendarName), `Opening three dot menu for calendar deletion: ${calendarName}`), 'Delete');
    await this.btnDelete.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.btnDelete, `Deleting process calendar: ${calendarName}`);
  }

  /**
   * Adds a cycle to the open calendar. Pass `startDay` (day of the month shown in the picker) to pin the start date;
   * the end date is then `startDay + minDayGap`. Without it, both days are random, so repeated calls can clash on start date.
   */
  public async createCalendarCycle(cycleName: string, cycleDescription: string, minDayGap: number = 3, startDay?: number): Promise<void> {
    await this.btnAddCycle.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.btnAddCycle, `Opening Add Cycle modal for cycle: ${cycleName}`);

    await this.nameInput.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.clearAndSetInputValue(this.nameInput, cycleName);
    await this.clearAndSetInputValue(this.cycleDescriptionInput, cycleDescription);

    const chosenStart = await this.pickCycleDate(0, startDay ?? 1, startDay ?? 23);
    if (startDay !== undefined && chosenStart !== startDay) {
      await this.log.logMessage('WARNING', `Start day ${startDay} is not selectable for cycle ${cycleName}; picked ${chosenStart}`);
    }
    const minEndDay = Math.min(chosenStart + minDayGap, 31);
    await this.pickCycleDate(1, minEndDay, startDay !== undefined ? minEndDay : 31);

    await this.doClick(this.btnCreate, `Creating cycle: ${cycleName}`);
    await this.btnCreate.waitFor({ state: 'hidden', timeout: getTimeout('LONG') });
    await this.cycleRow(cycleName).waitFor({ state: 'visible', timeout: getTimeout('LONG') });
  }
}
