import allureReporter from '@wdio/allure-reporter'
export class CommonFunctions {

  private sanitizeLogMessage(message: string): string {
    return message
      .replace(/(["']?authorization["']?\s*[:=]\s*["']?)bearer\s+[^"'\s,}]+/ig, '$1Bearer [REDACTED]')
      .replace(/(["']?(?:access_token|refresh_token|id_token)["']?\s*[:=]\s*["']?)[^"'\s,}]+/ig, '$1[REDACTED]')
      .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}\.[A-Za-z0-9._-]{10,}\b/g, '[REDACTED_JWT]');
  }

  public async compareTwoValues(sActualValue: any, sExpectedValue: any, sLogMessage: string): Promise<boolean> {
    let bValidation: boolean = false;
    if (sActualValue == sExpectedValue) {
      await this.logMessage("PASS", sLogMessage + " Success !! Actual and Expected Values are:: " + sActualValue)
      bValidation = true;
    }
    else {
      await this.logMessage("FAIL", sLogMessage + " Failed!! Expected Value:: " + sExpectedValue + " || Actual Value:: " + sActualValue)
    }
    return bValidation;
  }

  public async getJobIdFromUrl(url: string) {
    const match = url.match(/\/transitionJob\/([^/]+)\//);
    let jobId = match ? match[1] : null;
    await this.logMessage('INFO', `Extracted Job ID: ${jobId}`);
    return jobId;
  }

  public async logMessage(sLogLevel: string, sMessage: string) {
    const sanitizedMessage = this.sanitizeLogMessage(sMessage);
    let date = new Date();
    switch (sLogLevel) {
      case "INFO": sMessage = "[INFO " + date.toLocaleString() + "] " + sanitizedMessage; break;
      case "PASS": sMessage = "[PASS " + date.toLocaleString() + "] " + sanitizedMessage; break;
      case "FAIL": sMessage = "[FAIL " + date.toLocaleString() + "] " + sanitizedMessage; break;
      case "WARNING": sMessage = "[WARNING " + date.toLocaleString() + "] " + sanitizedMessage; break;
      default: sMessage = sanitizedMessage; break;
    }
    await console.log(sMessage);
    await allureReporter.addStep(sMessage);
  }

  public async switchToSpecificWindow(nWindow: number = 1) {
    await browser.waitUntil(
    async () => {
      const handles = await browser.getWindowHandles();
      return handles.length > nWindow;
    },
    {
      timeout: 10000,
      timeoutMsg: `Window index ${nWindow} not available`
    });
    const windowHandles = await browser.getWindowHandles();
    await this.logMessage('INFO', 'Active windows: ' + windowHandles);
    await this.logMessage('INFO', 'Switching to window of index: ' + nWindow);
    await browser.switchToWindow(windowHandles[nWindow]);
  }

  public async verifyAlertMsg(msg: string, waitTime: number = 100000) {
    try {
      await this.logMessage('INFO', 'Verifying alert message: ' + msg);
      const runningAlert = await $(`//div[contains(@class, 'MuiAlert-message') and contains(text(),"${msg}")]`)
      await runningAlert.waitForDisplayed({ timeout: waitTime });
      await this.logMessage('INFO', runningAlert.isExisting() ? await runningAlert.getText() : "alertmsgnotexist" + '  alertmsgverification')
      return await runningAlert.isExisting();
    }
    catch (error) {
      await this.logMessage('FAIL', 'Alert message not found: ' + msg + '  alertmsgverification');
      return false;
    }
  }

  // Verify Checkbox
  public async isCheckboxPresent(text: string): Promise<boolean> {
    const setDefaultLabel = await $(`//label[span[text()="${text}"]]`);
    const isCheckboxPresent = await setDefaultLabel.isExisting();
    return isCheckboxPresent;
  }

  public async testDataFile(__filename: string): Promise<any> {
    const normalizedFilePath = __filename.replace(/\\/g, '/');
    const testName = normalizedFilePath.split('/').pop()?.replace('.spec.ts', '') || 'default_test';
    const basePath = normalizedFilePath.split('/specs/')[1].replace(/\/[^/]+$/, '')
    const filePath = `../Testdata/${process.env.PSENV}/${basePath}/${testName}.json`;
    return await require(filePath);
  }

  public async zoomOut(times: number = 1): Promise<void> {
    await browser.execute((steps) => {
      const current = parseFloat((document.body.style as any).zoom || '1');
      (document.body.style as any).zoom = String(Math.max(0.25, current - steps * 0.1));
    }, times);
    await this.logMessage('INFO', `Zoomed out ${times} time(s)`);
  }

  public async zoomIn(times: number = 1): Promise<void> {
    await browser.execute((steps) => {
      const current = parseFloat((document.body.style as any).zoom || '1');
      (document.body.style as any).zoom = String(Math.min(2, current + steps * 0.1));
    }, times);
    await this.logMessage('INFO', `Zoomed in ${times} time(s)`);
  }

  public async setZoom(level: number): Promise<void> {
    await browser.execute((zoom) => {
      (document.body.style as any).zoom = String(zoom);
    }, level);
    await this.logMessage('INFO', `Zoom set to ${level}`);
  }

  public async resetZoom(): Promise<void> {
    await browser.execute(() => {
      (document.body.style as any).zoom = '1';
    });
    await this.logMessage('INFO', 'Zoom reset to default');
  }

}
export default new CommonFunctions();

