import { Page, Locator, FrameLocator } from '@playwright/test';
import BasePage from '../page';
import { CommonFunctions } from '../../util/common.util';
import { getTimeout } from '../../constants/timeouts';
import { textStartingWith } from './text-match';

/**
 * Component object for Comments and Collaboration features in Planning Space.
 * Covers LiveBlocks cell comments, thread rendering, action menus, presence avatars,
 * and Collaboration Room panel on the Luminate Portal header.
 *
 * Source UI references:
 * - LiveBlocks components in `@by/plan-sop-ui-library` (`LiveBlocksThreadRenderer`, `LiveBlocksStack`, `LuiAvatarGroup`)
 * - Comments panel in `plan-sop-planning-mfe/src/components/SideNav/DashboardHeaderIcons/CommentsButton.tsx`
 * - Collaboration Room in Luminate Portal header (`lui-portal-collaboration-icon-button`, `create-collaboration-room-btn`)
 */
export class CommentsCollaborationComponent extends BasePage {
  private readonly log: CommonFunctions;

  constructor(
    page: Page,
    private readonly getMfeFrame: () => FrameLocator = () => page.frameLocator('iframe#mfe'),
    private readonly rightClickCell?: (cardType: 'PieChart' | 'PivotCard', fieldValue: string) => Promise<boolean>
  ) {
    super(page);
    this.log = new CommonFunctions();
  }

  private get frame(): FrameLocator {
    return this.getMfeFrame();
  }

  // ── Portal Collaboration Room Locators (outside iframe) ────────────────────
  private get collaborationChatButton(): Locator {
    return this.page.getByTestId('lui-portal-collaboration-icon-button');
  }

  private get createCollaborationRoomButton(): Locator {
    return this.page.getByTestId('create-collaboration-room-btn');
  }

  private get collaborationPanelCloseIcon(): Locator {
    return this.page.getByTestId('close-icon');
  }

  private getContextValue(contextValue: string): Locator {
    // Case-sensitive prefix: 'assumption' must not match 'PS Auto Assumption 5', while test data passes
    // name prefixes such as 'PS Auto Assumption'.
    return this.page.getByTestId('room-context-tooltip').filter({ hasText: textStartingWith(contextValue) });
  }

  // ── LiveBlocks / Comments Locators (inside iframe) ─────────────────────────
  private get addCommentOption(): Locator {
    return this.frame.getByTestId('context-menu-item-cell_addComment');
  }

  private get commentInput(): Locator {
    return this.frame.locator('div[role="textbox"][contenteditable="true"]').first();
  }

  private get editCommentInput(): Locator {
    return this.frame.getByRole('textbox', { name: 'Composer editor' });
  }

  private get submitCommentBtn(): Locator {
    return this.frame.locator('form button[type="submit"]');
  }

  private get commentPopover(): Locator {
    return this.frame.locator('#comment-popover');
  }

  private get searchCommentInput(): Locator {
    return this.frame.getByTestId('liveblocks-thread-renderer').getByPlaceholder('Search');
  }

  private get commentsPanelButton(): Locator {
    return this.frame.getByTestId('comments-btn');
  }

  private get commentsCloseButton(): Locator {
    return this.frame.getByTestId('comments-close-btn');
  }

  private get threadActionsThreeDots(): Locator {
    return this.frame.locator('button.lb-comment-action').first();
  }

  private get submitEditedCommentBtn(): Locator {
    return this.frame.getByRole('button', { name: 'Submit' });
  }

  private get commentDetailsSections(): Locator {
    return this.frame.locator('#customized-dialog-description > div').filter({ has: this.page.locator('h6') });
  }

  private get closeCommentDetailsBtn(): Locator {
    return this.frame.getByRole('button', { name: 'Close' });
  }

  private get liveblocksAvatarGroup(): Locator {
    return this.frame.getByTestId('lui-ccl-avatar-group').first();
  }

  private get liveblocksAvatars(): Locator {
    return this.frame.getByTestId('lui-ccl-avatarbadge-avatar');
  }

  private get deleteConfirmSaveBtn(): Locator {
    return this.frame.locator('#confirm-dialog-save-btn');
  }

  private getCommentActionOption(action: string): Locator {
    return this.frame.getByRole('menuitem').filter({ hasText: action });
  }

  private getCommentActionsThreeDots(comment: string): Locator {
    return this.frame
      .locator('.lb-root.lb-comment')
      .filter({ has: this.page.locator('.lb-comment-body', { hasText: comment }) })
      .locator('button.lb-comment-action');
  }

  private getComment(comment: string): Locator {
    return this.frame.getByTestId('liveblocks-thread-renderer').locator('span').filter({ hasText: comment });
  }

  private moreButtonOfComment(comment: string): Locator {
    return this.frame
      .getByTestId('liveblocks-thread-renderer')
      .locator('div')
      .filter({ has: this.page.locator('span', { hasText: comment }) })
      .getByTestId('more-actions-btn');
  }

  private getActionOnComment(action: string): Locator {
    return this.frame.getByRole('menuitem').filter({ hasText: new RegExp(`^${action}$`, 'i') });
  }

  // ── Public Actions & Assertions ─────────────────────────────────────────────

  public async clickOnAddCommentActionOnCardCell(cardType: 'PieChart' | 'PivotCard', fieldValue: string): Promise<void> {
    if (this.rightClickCell) {
      await this.rightClickCell(cardType, fieldValue);
    }
    await this.addCommentOption.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.addCommentOption, `Clicked on Add Comment option for ${cardType} card with field value: ${fieldValue}`);
  }

  public async sendComment(): Promise<void> {
    await this.submitCommentBtn.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.log.logMessage('INFO', 'Clicked on Submit Comment button');
    await this.submitCommentBtn.dispatchEvent('click');
    // Wait for the comment popover to close after submission, then press Escape as fallback
    await this.commentPopover
      .waitFor({ state: 'detached', timeout: getTimeout('MEDIUM') })
      .catch(() => this.page.keyboard.press('Escape').catch(() => undefined));
  }

  public async addCommentInCardCell(comment: string, _tagUser: string = ''): Promise<void> {
    await this.commentInput.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.commentInput.click();
    await this.page.keyboard.press('Control+a').catch(() => undefined);
    await this.page.keyboard.press('Backspace').catch(() => undefined);
    await this.doEnterText(this.commentInput, comment, 'Entering comment: ' + comment);
    await this.sendComment();
  }

  public async tagUserInComment(userName: string): Promise<void> {
    await this.commentInput.scrollIntoViewIfNeeded();
    await this.commentInput.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.commentInput, 'Clicked on comment input to tag user');
    await this.page.keyboard.press('Control+a').catch(() => undefined);
    await this.page.keyboard.press('Backspace').catch(() => undefined);
    await this.doEnterText(this.commentInput, userName, 'Entering user name to tag in comment: ' + userName);
    await this.sendComment();
  }

  public async editCommentInCardCell(oldComment: string, newComment: string, isUserTagging: boolean = false): Promise<void> {
    const commentElement = this.getComment(oldComment);
    if (!(await commentElement.isVisible().catch(() => false))) {
      await this.log.logMessage('INFO', `Comment "${oldComment}" not found for editing`);
      return;
    }
    await this.performCellCommentAction(oldComment, 'Edit comment');
    if (isUserTagging) {
      await this.tagUserInComment(newComment);
      return;
    }
    await this.addCommentInCardCell(newComment);
  }

  public async openCommentsPanel(): Promise<void> {
    await this.commentsPanelButton.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.commentsPanelButton, 'Clicked on Comments Panel button');
  }

  public async checkCommentExist(comment: string): Promise<boolean> {
    const commentLocator = this.getComment(comment).first();
    const exists = await commentLocator.waitFor({ state: 'visible', timeout: getTimeout('MEDIUM') }).then(() => true).catch(() => false);
    await this.log.logMessage('INFO', `Comment ${exists ? 'exists' : 'does not exist'}: ${comment}`);
    return exists;
  }

  public async searchCommentInThepannel(comment: string): Promise<void> {
    await this.searchCommentInput.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.clearAndSetInputValue(this.searchCommentInput, comment);
  }

  public async performActionOnCommentIfExists(action: string): Promise<boolean> {
    const actionLocator = this.getActionOnComment(action);
    const isVisible = await actionLocator.isVisible().catch(() => false);
    if (!isVisible) {
      await this.log.logMessage('INFO', `${action} doesn't exist`);
      return false;
    }
    await this.doClick(actionLocator, `Clicking on action-${action}`);
    return true;
  }

  public async selectActionOnComment(comment: string, action: string): Promise<boolean> {
    const commentLocator = this.getComment(comment).first();
    await commentLocator.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await commentLocator.scrollIntoViewIfNeeded();
    await this.mouseHover(commentLocator, `Hovering on comment - ${comment}`);
    const moreButton = this.moreButtonOfComment(comment).first();
    await moreButton.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(moreButton, `Clicking more actions for comment - ${comment}`);
    return this.performActionOnCommentIfExists(action);
  }

  public async editComment(comment: string, editedComment: string): Promise<boolean> {
    const isEditVisible = await this.selectActionOnComment(comment, 'Edit Comment');
    if (!isEditVisible) {
      return false;
    }
    await this.editCommentInput.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.editCommentInput.click();
    await this.page.keyboard.press('Control+a').catch(() => undefined);
    await this.page.keyboard.press('Backspace').catch(() => undefined);
    await this.doEnterText(this.editCommentInput, editedComment, `Editing comment to: ${editedComment}`);
    // Press Escape to dismiss any open mention suggestion dropdown before submitting
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.submitEditedCommentBtn.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.submitEditedCommentBtn, 'Clicked submit for edited comment');
    return true;
  }

  public async deleteComment(comment: string): Promise<boolean> {
    const isDeleteVisible = await this.selectActionOnComment(comment, 'Delete Comment');
    if (!isDeleteVisible) {
      return false;
    }
    const saveBtn = this.deleteConfirmSaveBtn;
    await saveBtn.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(saveBtn, `Deleting comment ${comment}`);
    return true;
  }

  public async getCommentDetails(): Promise<Record<string, Record<string, string>>> {
    const details: Record<string, Record<string, string>> = {};
    await this.commentDetailsSections.first().waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    const sectionCount = await this.commentDetailsSections.count();

    for (let i = 0; i < sectionCount; i++) {
      const section = this.commentDetailsSections.nth(i);
      const title = ((await section.locator('h6').first().textContent()) || '').trim();
      if (!title) {
        continue;
      }
      details[title] = {};
      const rows = section.locator('div:has(> p.MuiTypography-root), div:has(> p)');
      const rowCount = await rows.count();
      for (let j = 0; j < rowCount; j++) {
        const row = rows.nth(j);
        const cells = row.locator('> p');
        const cellCount = await cells.count();
        if (cellCount < 2) {
          continue;
        }
        const label = ((await cells.nth(0).textContent()) || '').trim();
        const value = ((await cells.nth(1).textContent()) || '').trim();
        details[title][label] = value;
      }
    }

    await this.log.logMessage('INFO', `details: ${JSON.stringify(details)}`);
    await this.closeCommentDetailsBtn.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.closeCommentDetailsBtn, 'Closing comment details modal');
    return details;
  }

  public async closeCommentsPanel(): Promise<void> {
    await this.commentsCloseButton.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.commentsCloseButton, 'Clicked on Close Comments Panel button');
  }

  public async performCellThreadAction(action: string): Promise<void> {
    await this.threadActionsThreeDots.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(this.threadActionsThreeDots, 'Clicked on three dots for comments thread action');
    await this.doClick(this.getCommentActionOption(action), `Clicked on ${action} button`);
    await this.page.keyboard.press('Escape').catch(() => undefined);
  }

  public async performCellCommentAction(comment: string, action: string): Promise<void> {
    const moreButton = this.getCommentActionsThreeDots(comment);
    await moreButton.waitFor({ state: 'visible', timeout: getTimeout('LONG') });
    await this.doClick(moreButton, 'Clicked on three dots for comment');
    await this.doClick(this.getCommentActionOption(action), `Clicked on ${action} button`);
    if (action === 'Delete comment') {
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }
  }

  public async isLiveblocksAvatarGroupDisplayed(): Promise<boolean> {
    return await this.liveblocksAvatarGroup.isVisible().catch(() => false);
  }

  public async getLiveblocksAvatarCount(): Promise<number> {
    await this.liveblocksAvatarGroup.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    return await this.liveblocksAvatars.count();
  }

  public async getLiveblocksAvatarLabels(): Promise<string[]> {
    await this.liveblocksAvatarGroup.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    const avatarCount = await this.liveblocksAvatars.count();
    const labels: string[] = [];
    for (let i = 0; i < avatarCount; i++) {
      labels.push((await this.liveblocksAvatars.nth(i).getAttribute('aria-label')) || '');
    }
    return labels;
  }

  public async openCollaborationRoomPanel(): Promise<void> {
    await this.collaborationChatButton.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.collaborationChatButton, 'Clicking on collaboration chat icon');
  }

  public async createCollaborationRoom(): Promise<void> {
    await this.createCollaborationRoomButton.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(this.createCollaborationRoomButton, 'Clicking on create collaboration room button');
  }

  public async getContextDataFromUI(
    entity: string,
    entityName: string,
    viewId?: string,
    viewName?: string
  ): Promise<{ entity: string; entityName: string; viewId: string; viewName: string }> {
    const entityEle = this.getContextValue(entity);
    await entityEle.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    const entityValue = (await entityEle.textContent())?.trim() || '';
    const entityNameEle = this.getContextValue(entityName);
    await entityNameEle.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    const entityNameValue = (await entityNameEle.textContent())?.trim() || '';
    let viewIdValue = '';
    if (viewId) {
      const viewIdEle = this.getContextValue(viewId);
      await viewIdEle.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
      viewIdValue = (await viewIdEle.textContent())?.trim() || '';
    }
    let selectedViewName = '';
    if (viewName) {
      const viewNameEle = this.getContextValue(viewName);
      await viewNameEle.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
      selectedViewName = (await viewNameEle.textContent())?.trim() || '';
    }
    await this.log.logMessage('INFO', `Entity: ${entityValue}, Entity Name: ${entityNameValue}, View ID: ${viewIdValue}, View Name: ${selectedViewName}`);
    return { entity: entityValue, entityName: entityNameValue, viewId: viewIdValue, viewName: selectedViewName };
  }

  public async getAssumptionIdFromCollaborationRoom(entityId: string): Promise<string> {
    const assumptionId = this.getContextValue(entityId);
    await assumptionId.waitFor({ state: 'visible', timeout: getTimeout('XLARGE') });
    return (await assumptionId.textContent())?.trim() || '';
  }

  public async getContextDataFromURL(entity: string | number, _entityName: string | number): Promise<string> {
    const urlObj = new URL(this.page.url());
    const pathParts = urlObj.pathname.split('/');
    let entityValue = '';
    let entityNameValue = '';
    for (let i = 0; i < pathParts.length; i++) {
      if (pathParts[i] === String(entity)) {
        entityValue = pathParts[i];
        entityNameValue = pathParts[i + 1] || '';
        break;
      }
    }
    return JSON.stringify({ entity: entityValue, entityName: entityNameValue });
  }

  public async getViewId(currentUrl: string): Promise<string> {
    const match = currentUrl.match(/[a-f0-9]{24}/i);
    return match ? match[0] : '';
  }

  public async closeCollaborationPanel(): Promise<void> {
    const closeIcon = this.collaborationPanelCloseIcon.first();
    await closeIcon.waitFor({ state: 'visible', timeout: getTimeout('EXTREME') });
    await this.doClick(closeIcon, 'Closing collaboration panel');
    await closeIcon.waitFor({ state: 'hidden', timeout: getTimeout('SHORT') }).catch(() => {});
    await this.log.logMessage('INFO', 'Closed collaboration room panel');
  }
}
