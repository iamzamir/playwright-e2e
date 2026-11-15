import MfePage from './mfe.page';
import CommonFunctions from '../util/common.util';

export class SupplyChainActionPage extends MfePage {

  public sHeaderTitle: string = "Supply Chain Procedures - History";

  private get headerTitle()           { return $(`//h2[@data-testid='app-header-block-title']`); }
  private get btnApply()              { return $("//button[@data-testid='lui-ccl-horizontal-filter-submit-button']"); }
  private get columnNames()           { return $$("//table//th//div[contains(@class,'Wrapper')]"); }
  private get defaultScenarioName()   { return $(`//p[@data-testid='scaContextName']`)}

  public async isPageLoaded(isSwitchToFrame: boolean = false) {
    if (isSwitchToFrame) await this.switchToMfe();
    await browser.waitUntil(async () => { return (await this.headerTitle.getText() === await this.sHeaderTitle); }, { timeout: 60000, timeoutMsg: 'Header title not loaded within the specified time', interval: 500 });
  }

  public async getAllColumnNames() {
    await this.isPageLoaded();
    let arrColumnNames: string[] = [];
    const Columns = await this.columnNames;
    for (let i = 0; i < Columns.length - 1; i++) {
      await Columns[i].waitForExist({ timeout: 60000 });
      const columnName = await this.doGetText(await Columns[i], `Getting column name at index ${i}`);
      arrColumnNames.push(columnName);
    }
    await CommonFunctions.logMessage("INFO", "Column Names:: " + arrColumnNames.toString());
    return arrColumnNames;
  }

  public async clickApplyButton() {
    await this.doClick(await this.btnApply, "Clicking Apply Button", 2000);
  }

  public async selectFilter(sDropdownName: string, sDropdownValue: string) {
    await browser.keys('Tab');
    await this.doClick($(`//div//label[text()="${sDropdownName}"]`), `Clicking on ${sDropdownName} dropdown`);
    await this.doClick(await $("//span[text()='" + sDropdownValue + "']/ancestor::li"), `Selecting Option:: ${sDropdownValue}`);
  }

  public async getAllValuesInaColumnValue(sColumnName: string, isSwitchToFrame: boolean = false) {
    await this.isPageLoaded(isSwitchToFrame);
    const tableColumnNames = await this.columnNames;
    let index = 0;
    for (let i = 0; i < tableColumnNames.length; i++) {
      await tableColumnNames[i].waitForDisplayed({ timeout: 30000 });
      let sColName: string =  await this.doGetText(await tableColumnNames[i], `Getting column name at index ${i}`);
      if (sColName == sColumnName) {
        index = i + 1;
        break;
      }
    }
    let arrColumnValues: string[] = [];
    const totalRecords = await $$("//table//tr");
    for (let i = 2; i < totalRecords.length; i++) {
      const colValueLocator = await $("((//table//tr)[" + i + "]//td)[" + index + "]");
      let colValue: string = await this.doGetText(colValueLocator, `Getting column value at row ${i} and column ${index}`);
      await arrColumnValues.push(colValue);
    }
    await CommonFunctions.logMessage("INFO", "Column Name:: " + sColumnName);
    await CommonFunctions.logMessage("INFO", "Column Values:: " + arrColumnValues.toString());
    return arrColumnValues;
  }

  public async verifyDefaultScenario(defaultScenario: string) {
    await browser.pause(5000);
    const defaultScenarioName = await this.doGetText(this.defaultScenarioName, `Getting default scenario name`);
    CommonFunctions.logMessage('INFO', `defaultScenarioName ${defaultScenarioName}, ${defaultScenario}, ${defaultScenarioName === `Scenario: ${defaultScenario}`}`)
    return defaultScenarioName === `Scenario: ${defaultScenario}`;
  }

}
export default new SupplyChainActionPage();
