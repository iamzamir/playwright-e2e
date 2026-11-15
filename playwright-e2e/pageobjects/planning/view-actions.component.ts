import { Page, Locator, expect } from '@playwright/test';
import BasePage from '../page';
import { getTimeout } from '../../constants/timeouts';
import { CommonFunctions } from '../../util/common.util';

// planning-mfe renamed "Set Default Scope Filter" to "Set Default Filter"; callers may still pass the old label.
const ACTION_ALIASES: Record<string, string> = { 'Set Default Scope Filter': 'Set Default Filter' };

/**
 * View header actions of the Planning page: the "More actions" three-dot menu and the dialogs it opens, plus the
 * header's back arrow (`toggle-drawer-back-btn`, hidden views only) and favourite star (`add-favourite-btn`).
 * planning-mfe `SideNavWithRightPanel.tsx` renders two `LuiThreeDotMenu`s inside `.grid-header-container`
 * (`.more-btn` and `.more-btn-2`, both `aria-label="More actions"`); a container query shows only one, so the
 * visible one is used. Both use `key={Date.now()}`, so a re-render remounts the menu and closes it, which is why
 * opening and clicking retry as one unit. Menu markup is from `@jda/lui-common-component-library-mui5` 3.12.x
 * (`lui-ccl-threedot-menu-list`, items are `role="button"` named by their label). Dialogs: "Set Default Filter"
 * (`SetDefaultFilterPopup.tsx`: `save-btn`, `apply-for-all-users-checkbox`, a `LuiSelect` with
 * `lui-ccl-select-select` and `lui-ccl-select-menu`) and "Settings" (`@by/lui-settings-ui-library` 1.2.x:
 * `lui-settings-ui-save-button`, `lui-settings-ui-autocomplete-input-containerId`).
 */
export class ViewActionsComponent extends BasePage {
  private readonly log = new CommonFunctions();

  constructor(page: Page) {
    super(page);
  }

  // Locators
  private get header(): Locator { return this.mfeLocator('.grid-header-container'); }
  private get btnMoreActions(): Locator {
    return this.header.getByLabel('More actions').getByTestId('lui-ccl-threedot-menu-icon-button').filter({ visible: true }).first();
  }
  private get menuList(): Locator { return this.getMfeFrameLocator().locator('ul[data-testid="lui-ccl-threedot-menu-list"]').or(this.getMfeFrameLocator().getByTestId('lui-ccl-threedot-menu-list')).last(); }
  private get btnSaveView(): Locator { return this.getMfeFrameLocator().getByTestId('lui-dashboard-header-save-button'); }
  /** Back arrow before the view name, rendered only for hidden views. */
  private get btnBack(): Locator { return this.getMfeFrameLocator().getByTestId('toggle-drawer-back-btn'); }
  /** Favourite star icon button, rendered while the header is wide enough and the view is not hidden. */
  private get btnFavourite(): Locator { return this.getMfeFrameLocator().getByTestId('add-favourite-btn').filter({ visible: true }).first(); }
  private get defaultFilterDialog(): Locator { return this.getMfeFrameLocator().getByRole('dialog', { name: /Set Default (Scope )?Filter/ }); }
  private get defaultFilterSelect(): Locator { return this.defaultFilterDialog.getByTestId('lui-ccl-select-select'); }
  private get btnSetDefaultFilter(): Locator { return this.defaultFilterDialog.getByTestId('save-btn'); }
  private get chkApplyForAllUsers(): Locator { return this.defaultFilterDialog.getByTestId('apply-for-all-users-checkbox').getByRole('checkbox'); }
  private get btnSaveViewSettings(): Locator { return this.getMfeFrameLocator().getByTestId('lui-settings-ui-save-button'); }
  private get btnCancelViewSettings(): Locator { return this.getMfeFrameLocator().getByTestId('lui-settings-ui-cancel-button'); }
  private get inputViewGroup(): Locator { return this.getMfeFrameLocator().getByTestId('lui-settings-ui-autocomplete-input-containerId'); }
  /** The View Settings dialog (the one holding its Save button), for area snapshots. */
  public get viewSettingsDialog(): Locator { return this.getMfeFrameLocator().getByRole('dialog').filter({ has: this.btnSaveViewSettings }).first(); }
  private defaultFilterOption(filterName: string): Locator {
    return this.getMfeFrameLocator().getByTestId('lui-ccl-select-menu').getByRole('menuitem', { name: filterName }).first();
  }
  private viewGroupOption(groupName: string): Locator { return this.getMfeFrameLocator().getByRole('option', { name: groupName, exact: true }); }

  /** The menu item for an action, accepting the old "Set Default Scope Filter" label. */
  public actionItem(actionName: string): Locator {
    return this.menuList.getByRole('button', { name: ACTION_ALIASES[actionName] ?? actionName, exact: true });
  }

  // Helpers
  private async openMenuOnce(): Promise<void> {
    if (!(await this.menuList.isVisible())) {
      await this.doClick(this.btnMoreActions, 'Opening view actions menu');
    }
    await expect(this.menuList).toBeVisible({ timeout: getTimeout('SHORT') });
  }

  // Actions
  /** Waits for the "More actions" button; card specs use it as the sign that a saved view is back in view mode. */
  public async waitForMenuButton(timeout: number = getTimeout('XLARGE')): Promise<boolean> {
    return this.btnMoreActions.waitFor({ state: 'visible', timeout }).then(() => true, () => false);
  }

  public async openMenu(): Promise<void> {
    await expect(async () => {
      await this.openMenuOnce();
    }).toPass({ timeout: getTimeout('EXTREME') });
  }

  /** Opens the menu if needed and clicks the action, retrying both if the menu remounts in between. */
  public async clickAction(actionName: string): Promise<void> {
    await expect(async () => {
      await this.openMenuOnce();
      await this.doClick(this.actionItem(actionName), `Clicking on view action: ${actionName}`);
    }).toPass({ timeout: getTimeout('EXTREME') });
  }

  /** Opens the menu and reports whether the action is listed. The menu is left open. */
  public async isActionListed(actionName: string): Promise<boolean> {
    await this.openMenu();
    const isListed = await this.actionItem(actionName).isVisible();
    await this.log.logMessage('INFO', `View action "${actionName}" visibility: ${isListed}`);
    return isListed;
  }

  public async addToFavourites(): Promise<void> {
    if (await this.isActionListed('Add to Favorites')) {
      await this.clickAction('Add to Favorites');
      return;
    }
    await this.log.logMessage('INFO', 'View is already in Favorites, skipping add action.');
    await this.page.keyboard.press('Escape');
  }

  public async removeFromFavourites(): Promise<void> {
    await this.clickAction('Remove from Favorites');
  }

  public async openEditView(): Promise<void> {
    await this.clickAction('Edit View');
  }

  public async isBackButtonShown(timeout: number = getTimeout('SHORT')): Promise<boolean> {
    return this.btnBack.waitFor({ state: 'visible', timeout }).then(() => true, () => false);
  }

  public async clickBack(): Promise<void> {
    await this.btnBack.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.btnBack, 'Clicking on back arrow of hidden view');
  }

  /** Instant probe: callers check that hidden views have no favourite star. */
  public async isFavouriteButtonShown(): Promise<boolean> {
    return this.btnFavourite.isVisible();
  }

  public async clickSaveView(): Promise<void> {
    await this.btnSaveView.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    await this.doClick(this.btnSaveView, 'Clicking Save View button');
  }

  public async saveViewIfEditing(): Promise<void> {
    if (await this.btnSaveView.isVisible().catch(() => false)) {
      await this.doClick(this.btnSaveView, 'Saving view to exit edit mode').catch(() => {});
    }
  }

  // Set Default Filter dialog
  public async openDefaultFilterDialog(): Promise<void> {
    await this.clickAction('Set Default Filter');
    await expect(this.btnSetDefaultFilter).toBeVisible({ timeout: getTimeout('LONG') });
  }

  public async openDefaultFilterSelect(): Promise<void> {
    await this.doClick(this.defaultFilterSelect, 'Clicking default scope filter dropdown');
  }

  public async selectDefaultFilterOption(filterName: string): Promise<void> {
    const option = this.defaultFilterOption(filterName);
    await option.scrollIntoViewIfNeeded({ timeout: getTimeout('SHORT') }).catch(() => {});
    await this.doClick(option, `Selecting default scope filter option: ${filterName}`);
  }

  public async saveDefaultFilter(): Promise<void> {
    await this.doClick(this.btnSetDefaultFilter, 'Saving default scope filter');
    await expect(this.defaultFilterDialog).toBeHidden({ timeout: getTimeout('LONG') });
  }

  public async setApplyForAllUsers(checked: boolean): Promise<void> {
    await this.chkApplyForAllUsers.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    if ((await this.chkApplyForAllUsers.isChecked()) === checked) {
      await this.log.logMessage('INFO', `Admin default scope filter checkbox already ${checked ? 'checked' : 'unchecked'}`);
      return;
    }
    await this.chkApplyForAllUsers.setChecked(checked);
    await this.log.logMessage('INFO', `${checked ? 'Checked' : 'Unchecked'} admin default scope filter checkbox`);
  }

  public async setDefaultFilter(filterName: string, forAllUsers?: boolean): Promise<void> {
    await this.openDefaultFilterDialog();
    if (forAllUsers !== undefined) {
      await this.setApplyForAllUsers(forAllUsers);
    }
    await this.openDefaultFilterSelect();
    await this.selectDefaultFilterOption(filterName);
    await this.saveDefaultFilter();
  }

  // View Settings dialog
  /** Save turns enabled once the dialog has loaded the view's settings. */
  public async waitForViewSettingsLoaded(): Promise<void> {
    await expect(this.btnSaveViewSettings).toBeEnabled({ timeout: getTimeout('LONG') });
  }

  public async saveViewSettings(): Promise<void> {
    await expect(this.btnSaveViewSettings).toBeEnabled({ timeout: getTimeout('LONG') });
    await this.doClick(this.btnSaveViewSettings, 'Clicked on View Settings save button');
  }

  /** Moves the current view to another view group through View Settings and waits for the dialog to close. */
  public async moveToViewGroup(groupName: string): Promise<void> {
    await this.clickAction('View Settings');
    await expect(this.inputViewGroup).toBeVisible({ timeout: getTimeout('LONG') });
    if ((await this.inputViewGroup.inputValue()).trim() === groupName) {
      // The current group is filtered out of the options, so there is nothing to pick.
      await this.log.logMessage('INFO', `View is already in view group "${groupName}", closing View Settings.`);
      await expect(this.btnCancelViewSettings).toBeEnabled({ timeout: getTimeout('LONG') });
      await this.doClick(this.btnCancelViewSettings, 'Cancelling View Settings');
      await expect(this.btnSaveViewSettings).toBeHidden({ timeout: getTimeout('LONG') });
      return;
    }
    await this.clearAndSetInputValue(this.inputViewGroup, groupName);
    await this.doClick(this.viewGroupOption(groupName), `Selecting view group ${groupName}`);
    await expect(this.inputViewGroup).toHaveValue(groupName);
    await this.saveViewSettings();
    await this.verifyAlertMsg('success', getTimeout('XLARGE'));
    await expect(this.btnSaveViewSettings).toBeHidden({ timeout: getTimeout('LONG') });
  }
}
