import { test, expect } from '../../../configs/fixtures';

// PO allows one cycle per start date in a calendar, so each cycle starts on its own day: 1, 6, 11, 16, 21.
const CYCLE_START_DAY_STEP = 5;
const CYCLE_LENGTH_DAYS = 3;

let calendarName = '';
let calendarDescription = '';
let isCalendarDeleted = false;

test.describe.serial('Calendar with cycle operations in PO', () => {
  test.beforeAll(async ({ testData }) => {
    calendarName = `${testData.CALENDAR_NAME} ${Date.now()}`;
    calendarDescription = testData.CALENDAR_DESCRIPTION;
  });

  test('Test Case 1: Create a Calendar and validate from list', async ({ testUtil, globalSettingsPage, commonFunctions, testData }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2, process.env.FUNCTIONAL_TEST_PASSWORD, process.env.POLINK as string);
    await globalSettingsPage.clickGlobalSettings();
    await globalSettingsPage.clickGlobalSettingsListMenu('Process Calendars');
    await globalSettingsPage.createCalendar(calendarName, calendarDescription);
    const toastValidation = await commonFunctions.compareTwoValues(await globalSettingsPage.verifyAlertMsg('Success'), true, `Validating success toast for calendar creation: ${calendarName}`);
    const isListed = await globalSettingsPage.isCalendarListed(calendarName, calendarDescription);
    const listedValidation = await commonFunctions.compareTwoValues(isListed, true, `Is created calendar listed with expected description: ${calendarName}`);
    expect(toastValidation && listedValidation).toBeTruthy();
  });

  test('Test Case 2: Edit created Calendar and validate updated description', async ({ globalSettingsPage, commonFunctions, testData }) => {
    await globalSettingsPage.editCalendarDescription(calendarName, testData.UPDATED_CALENDAR_DESCRIPTION);
    const isUpdated = await globalSettingsPage.isCalendarListed(calendarName, testData.UPDATED_CALENDAR_DESCRIPTION);
    const updateValidation = await commonFunctions.compareTwoValues(isUpdated, true, `Is edited calendar listed with updated description: ${calendarName}`);
    expect(updateValidation).toBeTruthy();
  });

  test('Test Case 3: Add cycles and validate created cycles', async ({ globalSettingsPage, commonFunctions, testData }) => {
    await globalSettingsPage.openCalendarFromList(calendarName);
    const initialCycleRowCount = await globalSettingsPage.getCycleRowCount();
    const cyclesToCreate = Math.min(5, Math.max(4, Number(testData.CYCLES_TO_CREATE || 4)));

    for (let i = 1; i <= cyclesToCreate; i++) {
      const cycleName = `${testData.CYCLE_NAME} ${i}`;
      const startDay = 1 + (i - 1) * CYCLE_START_DAY_STEP;
      await globalSettingsPage.createCalendarCycle(cycleName, `${testData.CYCLE_DESCRIPTION} ${Date.now()}-${i}`, CYCLE_LENGTH_DAYS, startDay);
      const cycleToastValidation = await commonFunctions.compareTwoValues(await globalSettingsPage.verifyAlertMsg('Success'), true, `Validating success toast for cycle creation: ${cycleName}`);
      expect(cycleToastValidation).toBeTruthy();
    }

    const finalCycleRowCount = await globalSettingsPage.getCycleRowCount();
    const rowCountValidation = await commonFunctions.compareTwoValues(finalCycleRowCount, initialCycleRowCount + cyclesToCreate, `Validating cycle row count after creating ${cyclesToCreate} cycles`);
    expect(rowCountValidation).toBeTruthy();
  });

  test('Test Case 4: Delete the Calendar and validate it is removed from list', async ({ globalSettingsPage, commonFunctions }) => {
    await globalSettingsPage.clickGlobalSettingsListMenu('Process Calendars');
    await globalSettingsPage.deleteCalendar(calendarName);
    const deleteToastValidation = await commonFunctions.compareTwoValues(await globalSettingsPage.verifyAlertMsg('Success'), true, `Validating success toast for calendar deletion: ${calendarName}`);
    const isRemoved = await globalSettingsPage.isCalendarListed(calendarName, calendarDescription, false);
    const removedValidation = await commonFunctions.compareTwoValues(isRemoved, true, `Validating deleted calendar is not present in list: ${calendarName}`);
    isCalendarDeleted = isRemoved;
    expect(deleteToastValidation && removedValidation).toBeTruthy();
  });

  test.afterAll(async ({ testUtil, globalSettingsPage, commonFunctions }) => {
    if (isCalendarDeleted || !calendarName) {
      return;
    }
    // Best-effort cleanup after an earlier failure; the page may be on an error screen, so reopen PO first.
    try {
      await testUtil.navigateToProcessListingPage();
      await globalSettingsPage.clickGlobalSettings();
      await globalSettingsPage.clickGlobalSettingsListMenu('Process Calendars');
      await globalSettingsPage.deleteCalendar(calendarName);
      await globalSettingsPage.isCalendarListed(calendarName, calendarDescription, false);
      await commonFunctions.logMessage('INFO', `Cleanup completed for calendar: ${calendarName}`);
    } catch (error) {
      await commonFunctions.logMessage('WARNING', `Cleanup failed for calendar ${calendarName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
});
