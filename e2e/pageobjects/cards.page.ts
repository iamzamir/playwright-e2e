import MfePage from "./mfe.page";
import CommonFunctions from '../util/common.util';

class CardsPage extends MfePage {
    private gotoCardConfigBtn()                                                { return $(`//button[@data-testid='lui-dashboard-card-settings-card-configuration-button']`)}
    private deleteCustomActionBtn()                                            { return $(`//button[@data-testid='custom-action-item-delete-action-button-0']`)}
    private addNewCustomActionBtn()                                            { return $(`//button[@data-testid='add-new-custom-event']`)}
    private getCustomActionNameInput()                                         { return $(`//input[@data-testid='lui-ccl-select-select']`)}
    private selectActionLocation(option:string)                                { return $(`//span[@aria-label='${option}']`)}
    private backToCardEditBtn()                                                { return $(`//button[@data-testid='lui-dashboard-card-admin-settings-action-back-button']`)}
    private getScenarioRows()                                                  { return $(`//tr[@data-testid='scenario-table-row']`)}
    private getBumpChartLine(scenario:string)                                  { return $(`//path[@data-testid='line.${scenario}']`)}
    private getChartCompareToggle()                                            { return $(`//button[@aria-label='Chart Compare']`)}
    private openMeasureSettings()                                              { return $(`//button[@data-testid='measure-weightage-target-settings']`)}
    private getAdjustTargetsBtn()                                              { return $(`//input[@role="switch"]`)}
    private getMeasureName()                                                   { return $$(`//div[@data-testid='measure-display-name']`)}
    private getMeasureWeightageSlider()                                        { return $$(`//span[@data-testid='measure-weightage-slider']//input`)}
    private getMeasureTargetTextField()                                        { return $$(`//div[@data-testid='measure-target-input']//input`)}
    private getApplyMeasureSettingsBtn()                                       { return $(`//button[@data-testid='measure-weightage-apply-button']`)}
    private getResetMeasureSettingsBtn()                                       { return $(`//button[@data-testid='measure-weightage-reset-button']`)}
    private getScenariosTableCellValue(rowIndex: number, cellIndex)            { return $(`//tr[@data-testid="scenario-table-row" and @data-index=${rowIndex}]/td[@data-index=${cellIndex}]`)}
    private getScenariosTableCellActualValue(rowIndex: number, cellIndex)      { return $(`//tr[@data-testid="scenario-table-row" and @data-index=${rowIndex}]/td[@data-index=${cellIndex}]//div//p`)}
    private getNeutralDeltaIndicator(rowIndex: number, cellIndex: number)      { return $(`//tr[@data-testid="scenario-table-row" and @data-index=${rowIndex}]/td[@data-index=${cellIndex}]//div[@data-testid="neutral-indicator"]`)}
    private getTrendingDownDeltaIndicator(rowIndex: number, cellIndex: number) { return $(`//tr[@data-testid="scenario-table-row" and @data-index=${rowIndex}]/td[@data-index=${cellIndex}]//div[@data-testid='trending-down-indicator']`)}
    private getTrendingUpDeltaIndicator(rowIndex: number, cellIndex: number)   { return $(`//tr[@data-testid="scenario-table-row" and @data-index=${rowIndex}]/td[@data-index=${cellIndex}]//div[@data-testid='trending-up-indicator']`)}
    private getMeasureAccordion()                                              { return $$(`//ul[@data-testid="lui-ccl-list-collector-right-list"]//div/div[@data-testid="accordion-summary"]//p`)}
    private getMeasureOrientationDropdown()                                    { return $(`//div[@data-testid="lui-ccl-select-box"]/div`)}
    private getPositiveOrientation()                                           { return $(`//li[@data-testid="lui-ccl-select-option" and @aria-label="Greater"]`)}
    private getNegativeOrientation()                                           { return $(`//li[@data-testid="lui-ccl-select-option" and @aria-label="Lesser"]`)}
    private get saveSubscription()                                             { return $("//button[@data-testid='lui-dashboard-card-settings-save-button']")}
    private get publishBtn()                                                   { return $(`//button[@data-testid='lui-dashboard-card-admin-settings-confirm-button']`)}
    private get publishScenarioButton()                                        { return $("//button[text()='Publish Scenario']"); } 
    private get scaRunButton()                                                 { return $(`//button[@data-testid='scaRunButton']`)} 
    private getCardSettingsSuccessToast(cardTitle: string)                     { return $(`//*[contains(text(),'${cardTitle} Card Settings updated')]`)}
    private get addSub()                                                       { return $ ("//button[@data-testid='lui-card-configuration-subscription-setting-add-subscription']")}
    private get cardFieldsAll()                                                { return $$("//input[@data-testid='lui-card-configuration-subscription-setting-card-selection-select']")}
    private get eventFieldsAll()                                               { return $$("//input[@data-testid='lui-card-configuration-subscription-setting-event-selection-select']")}
    private get cardOptionsAll()                                               { return $$("//ul/li[@data-testid='lui-card-configuration-subscription-setting-card-selection-option'][@tabindex='0']")}
    private get eventOptionsAll()                                              { return $$("//ul/li[@data-testid='lui-card-configuration-subscription-setting-event-selection-option']")}
    private get actionFieldsAll()                                              { return $$("//input[@data-testid='lui-card-configuration-subscription-setting-action-selection-select']")}
    private get actionOptionsAll()                                             { return $$("//ul/li[@data-testid='lui-card-configuration-subscription-setting-action-selection-option']")}

    public async addCustomActions(){
        const gotoCardSettingBtn = await this.gotoCardConfigBtn();
        await CommonFunctions.logMessage('INFO', `checking for goto card settings button`);
        await gotoCardSettingBtn.waitForExist({ timeout: 3000 });
        await this.doClick(gotoCardSettingBtn, `Clicking on goto card settings button`);
        const deleteCustomActionBtn = await this.deleteCustomActionBtn();
        const isDeleteBtnExist = await deleteCustomActionBtn.isExisting();
        if(isDeleteBtnExist){
            await CommonFunctions.logMessage('INFO', `Delete custom action button exists`);
            await this.doClick(deleteCustomActionBtn, `Clicking on delete custom action button`);
        }
        const addCustomActionBtn = await this.addNewCustomActionBtn();
        await this.doClick(addCustomActionBtn, `Clicking on add custom action button`);
        const actionNameInput = await this.getCustomActionNameInput();
        await this.doClick(actionNameInput, `Clicking on action location dropdown`);
        const contextMenuOption = await this.selectActionLocation('Context Menu');
        await this.doClick(contextMenuOption, `Selecting Context Menu option`);
        const saveChangesBtn = await this.publishBtn;
        await this.doClick(saveChangesBtn, `Clicking on apply changes to card button`);
        const backToCardEditBtn = await this.backToCardEditBtn();
        await this.doClick(backToCardEditBtn, `Clicking on back to card edit button`);
        return true;
    }

    private async addSubscriptionRow() {
        await this.doClick(await this.addSub, "Clicking Add Subscription button");
        await browser.pause(2000);
    }

    private async selectLastCardField() {
        const cardFields = await this.cardFieldsAll;
        const lastCardField = cardFields[cardFields.length - 1];
        await lastCardField.scrollIntoView();
        await this.doClick(lastCardField, "Clicking last card field");
        const cardOptions = await this.cardOptionsAll;
        await this.doClick(cardOptions[cardOptions.length - 1], "Selecting last card option");
    }

    private async selectLastEventField() {
        const cardFields = await this.cardFieldsAll;
        await browser.waitUntil(async () => {
            const events = await this.eventFieldsAll;
            return events.length === cardFields.length;
        }, { timeout: 5000, timeoutMsg: 'Event field did not appear for new subscription' });

        const events = await this.eventFieldsAll;
        const lastEvent = events[events.length - 1];
        await lastEvent.scrollIntoView();
        await this.doClick(lastEvent, "Clicking last event field");
        const eventOptions = await this.eventOptionsAll;
        await this.doClick(eventOptions[eventOptions.length - 1], "Selecting last event option");
    }

    private async selectLastActionField() {
        const cardFields = await this.cardFieldsAll;
        await browser.waitUntil(async () => {
            const actions = await this.actionFieldsAll;
            return actions.length === cardFields.length;
        }, { timeout: 5000, timeoutMsg: 'Action field did not appear for new subscription' });

        const actions = await this.actionFieldsAll;
        const lastAction = actions[actions.length - 1];
        await lastAction.scrollIntoView();
        await this.doClick(lastAction, "Clicking last action field");
        const actionOptions = await this.actionOptionsAll;
        await this.doClick(actionOptions[actionOptions.length - 1], "Selecting last action option");
    }
  
    public async addSubscriptionEvent(cardTitle: string): Promise<boolean> {
        await this.addSubscriptionRow();
        await this.selectLastCardField();
        await this.selectLastEventField();
        await this.selectLastActionField();
        await this.doClick(await this.saveSubscription, "Clicking Save Subscription");
    
        const successToastEle = await this.getCardSettingsSuccessToast(cardTitle);
        await successToastEle.waitForExist({ timeout: 60000 });
        return await successToastEle.isExisting();
    }
  
    public async publishScenarioAction(){
        const tablerow = await this.getScenarioRows();
        tablerow.waitForDisplayed({ timeout: 5000 });
        await this.mouseHover(tablerow, `Clicking on first row in scenario table ${tablerow?'row 1':''}` );
        const publishScnBtn = await this.publishScenarioButton;
        publishScnBtn.waitForDisplayed({ timeout: 5000 });
        if(publishScnBtn){
            await this.doClick(publishScnBtn, `Clicking on publish scenario button`);
            const publishBtn = await this.scaRunButton;
            publishBtn.waitForDisplayed({ timeout: 5000 });
            await this.doClick(publishBtn, `Clicking on publish button`);
        }
        return publishScnBtn ? true : false;
    }
  
    public async verifyHideGraphicalViewOnToggle(cardTitle: string, scenario:string): Promise<boolean> {
        let scnOnChart = await this.getBumpChartLine(scenario);
        const toggleBtn = await this.getChartCompareToggle();
        await this.doClick(toggleBtn, `Clicking on Chart-Compare toggle button of ${cardTitle} card`);
        scnOnChart = await this.getBumpChartLine(scenario);
        return scnOnChart?true:false;
    }
  
    public async updatePositiveOrientationToMeasure(): Promise<any> {
        const measureName = await this.getMeasureAccordion()[0];
        await this.doClick(measureName, `Clicking on ${measureName.getText()} accordion to expand`);
        const getMeasureOrientationDropdown = await this.getMeasureOrientationDropdown();
        await this.doClick(getMeasureOrientationDropdown, `Clicking on Measure Orientation dropdown`);
        const positiveOrientationOption = await this.getPositiveOrientation();
        await this.doClick(positiveOrientationOption, `Selecting greater option from Measure Orientation dropdown`);
        const applyBtn = await this.saveSubscription;
        await this.doClick(applyBtn, "Clicking Save button to apply changes");
        return { [measureName.getText()]:1};
    }
  
    public async updateNegativeOrientationToMeasure(): Promise<any> {
        const measureName = await this.getMeasureAccordion()[0];
        await this.doClick(measureName, `Clicking on ${measureName.getText()} accordion to expand`);
        const getMeasureOrientationDropdown = await this.getMeasureOrientationDropdown();
        await this.doClick(getMeasureOrientationDropdown, `Clicking on Measure Orientation dropdown`);
        const nagativeOrientationOption = await this.getNegativeOrientation();
        await this.doClick(nagativeOrientationOption, `Selecting lesser option from Measure Orientation dropdown`);
        const applyBtn = await this.saveSubscription;
        await this.doClick(applyBtn, "Clicking Save button to apply changes");
        return { [measureName.getText()]: -1};
    }
  
  
    public async collectDefaultMeasureSettings(): Promise<any> {
        const measuresInfo:any = {};
        const mesuresList:any = await this.getMeasureName();
        await CommonFunctions.logMessage('INFO', ` ${mesuresList.length}`);
        let totalWeightage = 0;
        for (let i = 0; i < mesuresList?.length; i++) {
            const measureName = await mesuresList[i].getText();
            const weightage = await this.getMeasureWeightageSlider()[i].getValue();
            const target = await this.getMeasureTargetTextField()[i].getValue();
            await CommonFunctions.logMessage('INFO', `Measure Name: ${measureName}, weightage: ${weightage}, target: ${target}`);
            measuresInfo[measureName] = { weightage, target  };
            totalWeightage+=Number(weightage)
        }
        measuresInfo.weightage = totalWeightage;
        await CommonFunctions.logMessage('INFO', ` ${measuresInfo}`);
        return measuresInfo;
    };
  
    private async verifyIndicatorExistence(rowIndex: number, colIndex: number, diffValue: number): Promise<boolean> {
        const neutralIndicator = await this.getNeutralDeltaIndicator(rowIndex, colIndex);
        const trendingDownIndicator = await this.getTrendingDownDeltaIndicator(rowIndex, colIndex);
        const trendingUpIndicator = await this.getTrendingUpDeltaIndicator(rowIndex, colIndex);
        let indicatorExists = false;
        if(diffValue<0){
            indicatorExists= await this.doesElementExist(trendingDownIndicator, `Verifying trending down indicator at row ${rowIndex} and column ${colIndex}`);
        }
        else if(diffValue>0){
            indicatorExists = await this.doesElementExist(trendingUpIndicator, `Verifying trending up indicator at row ${rowIndex} and column ${colIndex}`);
        }
        else{
            indicatorExists = await this.doesElementExist(neutralIndicator, `Verifying neutral indicator at row ${rowIndex} and column ${colIndex}`);
        }
        return indicatorExists;
    }
  
    public async rankingScenariosCalculation(measureOrientations?:any): Promise<any> {
        const measureInfo = await this.collectDefaultMeasureSettings();
        const applyBtn = await this.getApplyMeasureSettingsBtn();
        await this.doClick(applyBtn, `Clicking on Apply button to save measure settings`);
        const measureKeys = Object.keys(measureInfo);
        const scenarios:any = [];
        for(let i =0; i<4; i++){
            let normalizedScore = 0;
            for(let j=0; j<measureKeys?.length+1;j++){
                const cellValue = await this.getScenariosTableCellValue(i,j).getText();
                if(j>1){
                    const value  =  await this.getScenariosTableCellActualValue(i,j).getAttribute('data-value');
                    const orientation = measureOrientations?.[measureKeys[j-2]] || 1;
                    const diffValue:any = ((orientation*(Number(value)-Number(measureInfo[measureKeys[j-2]].target))/Number(measureInfo[measureKeys[j-2]].target))*100).toFixed(1);
                    const normalizedValue = diffValue*(Number(measureInfo[measureKeys[j-2]].weightage)/Number(measureInfo.totalWeightage));
                    await CommonFunctions.logMessage('INFO', `Cell Value at row ${i} and column ${j} is: ${cellValue}, ${value}, ${diffValue}`);
                    const indicatorExists = await this.verifyIndicatorExistence(i, j, diffValue);
                    await CommonFunctions.compareTwoValues(indicatorExists, true, `Indicator existence at row ${i} and column ${j} is: ${indicatorExists}`);
                    normalizedScore+=normalizedValue;
                }
            }
            const scenario = {
            normalizedScore: normalizedScore,
            scenarioName: await this.getScenariosTableCellValue(i,0).getText()
            }
            scenarios.push(scenario)
        }
        scenarios.sort((a, b) => b.normalizedScore - a.normalizedScore);
        return scenarios;
    }
  
    public async openMeasureWeightageTargetSettings(cardTitle: string) {
        const settingBtn = await this.openMeasureSettings();
        settingBtn.waitForDisplayed({ timeout: 60000 });
        await this.doClick(settingBtn, `Clicking on settings button of ${cardTitle} card`);
        const adjustTargetToggle = await this.getAdjustTargetsBtn();
        const adjustTargetToggleExits= this.doesElementExist(adjustTargetToggle, `Verifying Measure Weightage Target settings opened for ${cardTitle} card`);
        await this.doClick(adjustTargetToggle, `Clicking on Measure Weightage Target button`);
        return adjustTargetToggleExits;
    }
  
    public async resetMeasureWeightageTargetToDefault(cardTitle: string) {
        const settingBtn = await this.openMeasureSettings();
        settingBtn.waitForDisplayed({ timeout: 60000 });
        await this.doClick(settingBtn, `Clicking on settings button of ${cardTitle} card`);
        const resetBtn = await this.getResetMeasureSettingsBtn();
        resetBtn.waitForDisplayed({ timeout: 60000 });
        const resetBtnExits = await this.doesElementExist(resetBtn, `Verifying Measure Weightage Target settings reset to default for ${cardTitle} card`);
        await this.doClick(resetBtn, `Clicking on Reset button to reset measure settings to default`);
        return resetBtnExits;
    };
  
    public async updateMeasureWeightageTarget() {
        const mesuresList:any = await this.getMeasureName();
        await CommonFunctions.logMessage('INFO', ` ${mesuresList.length}`);
        for (let i = 0; i < mesuresList?.length; i++) {
            const measureName = await mesuresList[i].getText();
            const weightage = await this.getMeasureWeightageSlider()[i];
            const target = await this.getMeasureTargetTextField()[i];
            await weightage.setValue(Number(weightage.getValue())+i*5+1);
            await target.setValue(Number(target.getValue())+(i+2)*1000);
        }
    };
  
    public async verifyScenariosRanking(scenarios:any): Promise<boolean> {
        let isRankingCorrect = true;
        for(let i=0; i<scenarios.length-1;i++){
            let scenarioValue =await this.getScenariosTableCellValue(i,0).getText();
            isRankingCorrect = await CommonFunctions.compareTwoValues(scenarioValue, scenarios[i].scenarioName, `Verifying scenario name at row ${i}`);
            if(!isRankingCorrect){
            break;
            }
        }
        return isRankingCorrect;
    }
}

export default new CardsPage();
