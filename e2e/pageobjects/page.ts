import CommonFunctions from '../util/common.util';


type fieldType = "text" | "dropdown" | "date" | "combobox" 
export interface InputField { 
  labelName: string;
  value?: string;
  fieldType?:fieldType
}
export default class page {
  private get getActivePage()                          { return $(`//div[contains(@class, "nav-item") and contains(@class, "active")]//button`).getAttribute('aria-label')}
  private getDropdownOption(optionName: string)        { return $(`//div[@role="presentation"]//li//span[text()="${optionName}"]`)}
  private dateInput(day)                               { return $(`//div[@role="dialog"]//button[contains(@class,"MuiPickersDay") and text() = '${day}']`)}

  public async doClick(locator: WebdriverIO.Element, sLogMessage: string, waitTime: number = 1000) {
    await browser.pause(waitTime);
    await CommonFunctions.logMessage("INFO", sLogMessage);
    await locator.click();
    await browser.pause(waitTime);
  }

  public async doEnterText(locator: WebdriverIO.Element, sValue: string, sLogMessage: string) {
    await this.doClearAndEnterText(locator, sValue, sLogMessage, false);
  }

  public async doGetText(locator: WebdriverIO.Element, sLogMessage: string) {
    await CommonFunctions.logMessage("INFO", sLogMessage);
    let sText: string = await locator.getText();
    return sText;
  }

  public async doGetAttribute(locator: WebdriverIO.Element, sAttribute: string, sLogMessage: string) {
    await CommonFunctions.logMessage("INFO", sLogMessage);
    let sAttributeValue: string = await locator.getAttribute(sAttribute);
    await CommonFunctions.logMessage("INFO", `Attribute value: ${sAttributeValue}`);
    return sAttributeValue;
  }

  public async doClickUsingScript(locator: WebdriverIO.Element, sLogMessage: string) {
    await CommonFunctions.logMessage("INFO", sLogMessage);
    await browser.execute((elem) => {
      elem.click();
    }, locator);
    await browser.pause(1000);
  }

  public async mouseHover(locator: WebdriverIO.Element, sLogMessage: string) {
    await CommonFunctions.logMessage("INFO", sLogMessage);
    await locator.waitForExist({ timeout: 30000 });
    await browser.execute(async (elem) => {
      elem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    }, locator);
    await browser.pause(5000);
  }

  public async clearAndSetInputValue(inputField, inputValue) {
    await inputField.click();
    const currentValue = await inputField.getValue();
    if(currentValue !== '') {
      const backspaces = [...currentValue].map(() => 'Backspace');
      await inputField.setValue(backspaces);
      CommonFunctions.logMessage("INFO", 'cleared input value ' + await inputField.getValue());
    }
    await browser.pause(1000);
    await inputField.setValue(inputValue);
    CommonFunctions.logMessage("INFO", `done set input value ${inputValue}`);
    await browser.pause(1000);
  }

  public async setDropdownValue(fieldData: InputField, fieldLocator: WebdriverIO.Element, edit: boolean = false) {
    await CommonFunctions.logMessage("INFO",`Selecting ${fieldData.value} from ${fieldData.labelName} dropdown`); 
    await CommonFunctions.logMessage("INFO",`dropdown - ${fieldData.labelName} value: ${await fieldLocator.getValue()}`);
    const isFieldEmpty = await fieldLocator.getValue() === '' || await fieldLocator.getValue() === null;
    if (edit || isFieldEmpty) {
      await fieldLocator.click();
      const optionEle = await this.getDropdownOption(fieldData.value as any);
      await optionEle.waitForExist({timeout: 10000});
      await optionEle.waitForClickable({timeout: 10000});
      await optionEle.click();
    }
  }

  public async setComboboxValue(fieldData: InputField, fieldLocator: WebdriverIO.Element, edit: boolean = false) {
    await CommonFunctions.logMessage("INFO",`combobox - ${fieldData.labelName} value: ${await fieldLocator.getValue()}`);
    const isFieldEmpty = await fieldLocator.getValue() === '';
    if(edit || isFieldEmpty) {
      await fieldLocator.click();
      await browser.pause(2000);
      await CommonFunctions.logMessage("INFO",`Searching "${fieldData.value}" value in "${fieldData.labelName}" dropdown field`);
      await this.clearAndSetInputValue(fieldLocator, fieldData.value);
      await browser.pause(2000);
      await browser.keys('Down arrow');
      await browser.keys('Enter'); 
      await CommonFunctions.logMessage("INFO",`selected option ${fieldData.value}`);
    }
  }

  public async setDateValue(fieldData: InputField, fieldLocator: WebdriverIO.Element) {
    const calendarEle = await fieldLocator;
    await CommonFunctions.logMessage("INFO", `Clicking calendar icon of ${fieldData.labelName} field`);
    await calendarEle.waitForClickable({timeout: 30000});
    await calendarEle.click();
    const todaysDateEle = await this.dateInput(fieldData.value);
    await todaysDateEle.waitForClickable({timeout: 30000})
    await CommonFunctions.logMessage("INFO", `Selecting today's date for ${fieldData.labelName} field`);
    await browser.execute(async (elem) => {
      await elem.click();
    }, todaysDateEle);
  }

  public async setTextField(fieldData: InputField , fieldLocator: WebdriverIO.Element, edit: boolean = false) {
    await CommonFunctions.logMessage("INFO",`textField - ${fieldData.labelName} value: ${await fieldLocator.getValue()}`);
    const isFieldEmpty = await fieldLocator.getValue() === '';
    if(edit || isFieldEmpty) {
      await CommonFunctions.logMessage("INFO",`Setting "${fieldData.value}" value for "${fieldData.labelName}" field`);
      await fieldLocator.setValue(fieldData.value as any);
    }
  }

  public async addTextFieldValue(value, fieldLocator, shouldClear: boolean = true) {
    await fieldLocator.click();
    if (shouldClear) {
      await browser.keys(['Control','a']);
      await browser.pause(2000);
      await browser.keys('Delete'); 
      await browser.pause(500);
    }
    for (let char of value) { 
      await fieldLocator.addValue(char); 
      await browser.pause(500); 
    } 
    await browser.pause(1000);
  }

  public async getActivePageName() {
    const activePageName = await this.getActivePage;
    await CommonFunctions.logMessage("INFO", `Active page name: ${activePageName}`);
    return activePageName;
  }

  public async doesElementExist(locator: WebdriverIO.Element, sLogMessage: string): Promise<boolean> {
    let isExist: boolean = await locator.isExisting();
    if (isExist) {
      await CommonFunctions.logMessage("INFO", `${sLogMessage} - Element is existing`);
      return true;
    } else {
      await CommonFunctions.logMessage("INFO", `${sLogMessage} - Element is not existing`);
      return false;
    }
  }

  // Keep this as the primary function
  public async doClearAndEnterText(locator: WebdriverIO.Element, sValue: string, sLogMessage: string, shouldClear: boolean = true) {
    await CommonFunctions.logMessage("INFO", sLogMessage);
    await locator.waitForDisplayed({ timeout: 60000 });
    
    if (shouldClear) {
        // Clear existing text
        await locator.setValue(['Control', 'a']);
        await locator.keys('Backspace');
        await browser.pause(500);
    }
    
    // Enter new text
    await locator.setValue(sValue);
    await browser.pause(1000);
  }
}
