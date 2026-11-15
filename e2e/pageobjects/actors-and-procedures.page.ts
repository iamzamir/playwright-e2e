import MfePage from './mfe.page';
import CommonFunctions from '../util/common.util';

export class ActorsAndProceduresPage extends MfePage {
    private get actorsAndProcedures()   { return $("//div[@aria-label='Actors and Procedures']");}
    private get proceduresBtn()         { return $("//button[@data-testid='abp-procedure-tab']");}
    private get searchField()           { return $("//input[@name='search']");}
    private get arrowBtn()              { return $("//button[@data-testid='abp-procedure-table-details-button']");}
    private get metaData()              { return $("//button[text()='Metadata']"); }
    private get dataBlock()             { return $("//textarea[@class='inputarea monaco-mouse-cursor-text']");}
    private get saveBtn()               { return $("//button[@data-testid='abp-procedure-config-details-save']");}
    private get publishBtn()            { return $("//button[@data-testid='abp-procedure-config-details-publish-button']");}
    private get addProcedure()          { return $("//button[@data-testid='abp-procedure-table-add-button']")}
    private get dropdown()              { return $("//div/button[@aria-label='Open']");}
    private get addBtn()                { return $("//div/button[@aria-label='Add']");}
    private get addActor()              { return $("//button[@data-testid='abp-actor-sequence-add-actor-button']");}
    private get Actor()                 { return $("//input[@placeholder='Select Actor']")} 
    private get selectActor()           { return $("//ul[@aria-labelledby='actor-label']//li[1]");}
    private get map()                   { return $("//div[@data-testid='nav-item4']");}
    private get process()               { return $("//span[text()='IBPJapan']//ancestor::div//button[@data-testid='cbp-po-to-po-details-btn']")}
    private get mapProcedure()          { return $("//button[@data-testid='cbp-procedure-config-add-button']")}
    private get selectProcedure()       { return $("//div[@data-testid='cbp-po-to-po-modal-procedure-autocomplete']")}
    private get contextType()           { return $("//div[@data-testid='cbp-po-to-po-modal-context-attributes-autocomplete']")}
    private get savepopBtn()            { return $("//button[@data-testid='cbp-po-to-po-context-modal-primary-btn']");}
    private get selectContextType()     { return $("//ul[@aria-labelledby='tags-standard-label']//li[1]")}
    private get selectProtype()         { return $("//ul[@aria-labelledby=':rne:-label']//li[1]")};
    private get inputText()             { return $("//input[@id=':rne:']");}
    private get searchDeleteField()     { return $("//input[@placeholder='Search']");}
    private get deleteProced()          { return $("//span[text()='createscenario23']//ancestor::div//button[@data-testid='cbp-procedure-config-delete-btn']")}
    private get confirmDelete()         { return $("//button[@data-testid='cbp-po-to-po-delete-modal-primary-btn']");}
    private get threeDots()             { return $("//button[@data-testid='lui-ccl-threedot-menu-icon-button']");}
    private get removeProcedure()       { return $("//button[@data-testid='lui-ccl-threedot-menu-listitem-0']")}
    private get deleteBtn()             { return $("//button[@data-testid='abp-modal-primary-action-button']");}
    private get addingActor()           { return $("//button[@data-testid='abp-add-actor-to-sequence-modal-action-add-btn']");}
    private get text()                  { return $("//input[@id='tags-standard']");}
    private get closeAlert()            { return $(`//button[@title="Close"]`)}
    private getTab(datatestId: string)  { return $(`//button[@data-testid='${datatestId}']`)}
    private getThreeDotMenu(procedureName: string, type:"Actor" | 'Procedure') { return $(`//p[contains(text(),'${procedureName}')]//ancestor::tr//button[@data-testid='${type === "Procedure" ? 'lui-ccl-threedot-menu-icon-button' : 'abp-actor-table-three-dot-menu-icon-button'}']`)}
    private getListItem(itemName: string){ return $(`//span[text()="${itemName}"]`)}

    public async openProcedure() {
        await this.doClick(await this.actorsAndProcedures, "Clicking on Actors and Procedures", 2000);
        await this.doClick(await this.proceduresBtn, "Clicking on procedures tab");
    }

    public async searchForProcedure(procedureName: string): Promise<void> {
        await this.doEnterText(await this.searchField, procedureName, `Searching for procedure: ${procedureName}`);
    }

    public async expandProcedureDetails(): Promise<void> {
        await (await this.arrowBtn).waitForDisplayed({ timeout: 30000 });
        await this.doClick(await this.arrowBtn, "Clicking arrow button to expand procedure details");
    }

    public async prepareMetaDataTextArea(): Promise<WebdriverIO.Element> {
        const metaDataTxtArea = await this.dataBlock;
        await metaDataTxtArea.waitForDisplayed({ timeout: 30000 });
        await metaDataTxtArea.scrollIntoView();
        await this.doClickUsingScript(metaDataTxtArea, "Clicking in Text area of MetaData block");
        return metaDataTxtArea;
    }

    public async clearExistingMetaData(): Promise<void> {
        await CommonFunctions.logMessage("INFO", "Clearing the existing data");
        await browser.keys(['Control', 'a']);
        await browser.keys(['Backspace']);
    }

    public async enterMetaDataContent(metaDataTxtArea: WebdriverIO.Element, metaData: string): Promise<void> {
        await this.doEnterText(metaDataTxtArea, metaData, `Setting configured meta data: ${metaData}`);
    }

    public async navigateToMetaDataTab(): Promise<void> {
        await this.doClick(await this.metaData, "Clicking on Metadata tab");
    }

    public async saveMetaDataChanges(): Promise<void> {
        const isSaveBtnEnabled: boolean = await (await this.saveBtn).isEnabled();
        if (isSaveBtnEnabled) {
            await this.doClick(await this.saveBtn, "Clicking on Save button");
        } else {
            await CommonFunctions.logMessage("INFO", "Save button is not enabled");
        }
    }

    public async setMetaDataForProcedure(procedureName: string, metaData: string): Promise<boolean> {
        try {
            await this.openProcedure();
            await this.searchForProcedure(procedureName);
            await this.expandProcedureDetails();
            
            const metaDataTxtArea = await this.prepareMetaDataTextArea();
            await this.clearExistingMetaData();
            await this.enterMetaDataContent(metaDataTxtArea, metaData);
            await this.navigateToMetaDataTab();
            await this.saveMetaDataChanges();
            
            return true;
        } catch (error) {
            await CommonFunctions.logMessage("ERROR", `Failed to set metadata for procedure ${procedureName}: ${error}`);
            return false;
        }
    }

    public async clickOnTab(tabName: 'Actors' | 'Procedures') {
        let tabEle: WebdriverIO.Element;
        if (tabName === 'Actors') {
            tabEle = await this.getTab('abp-actor-tab');
        }
        else {
            tabEle = await this.getTab('abp-procedure-tab');
        }
        await tabEle.waitForClickable({ timeout: 60000 });
        await this.doClick(tabEle, `Clicking on ${tabName} tab`);
    }

    public async searchForProcedureOrActor(processName: string): Promise<void> {
        await this.doEnterText(await this.searchField, processName, `Searching for: ${processName}`);
        await (await this.searchField).waitForDisplayed({ timeout: 30000 });
    }

    public async clickOnThreeDotMenu(processName: string, type: "Actor" | 'Procedure'): Promise<void> {
        const threeDotEle = await this.getThreeDotMenu(processName, type);
        await threeDotEle.waitForClickable({ timeout: 30000 });
        await this.doClick(threeDotEle, `Clicking on three dot menu of ${processName} ${type}`);
    }

    public async selectDeleteAction(): Promise<void> {
        const deleteEle = await this.getListItem('Delete');
        await deleteEle.waitForClickable({ timeout: 30000 });
        await this.doClick(deleteEle, "Clicking on delete action");
    }

    public async deleteProcedureOrActor(processName: string, type: "Actor" | 'Procedure'): Promise<void> {
        await this.searchForProcedureOrActor(processName);
        await this.clickOnThreeDotMenu(processName, type);
        await this.selectDeleteAction();
    }

    public async validateToastMessage(text: string, processName: string, type: "Actor" | 'Procedure') {
        if (type === "Actor") {
            return text.startsWith('Actor config') && text.includes(processName) && text.endsWith('has been deleted successfully.');
        } else {
            return text.startsWith('Procedures config') && text.includes(processName) && text.endsWith('has been deleted successfully.');
        }
    }

    public async closeToastNotification(): Promise<void> {
        await this.doClick(await this.closeAlert, "Closing toast notification");
    }

    public async clickAddActorButton(): Promise<void> {
        await this.doClick(await this.addActor, "Clicking Add Actor button");
    }

    public async clickActorDropdown(): Promise<void> {
        await this.doClick(await this.Actor, "Clicking on Actor dropdown");
    }

    public async selectFirstActor(): Promise<void> {
        await this.doClick(await this.selectActor, "Selecting first actor from dropdown");
    }

    public async confirmActorAddition(): Promise<void> {
        await this.doClick(await this.addingActor, "Confirming add actor action");
    }

    public async selectActorFromDropdown(): Promise<void> {
        await this.clickActorDropdown();
        await this.selectFirstActor();
    }

    public async addActorToSequence(): Promise<void> {
        await this.clickAddActorButton();
        await this.selectActorFromDropdown();
        await this.confirmActorAddition();
    }

    public async navigateToMapSection(): Promise<void> {
        await this.doClick(await this.map, "Navigating to Map section");
    }

    public async selectIBPJapanProcess(): Promise<void> {
        await this.doClick(await this.process, "Selecting IBPJapan process");
    }

    public async clickMapProcedureButton(): Promise<void> {
        await this.doClick(await this.mapProcedure, "Clicking Map Procedure button");
    }

    public async openProcedureDropdown(): Promise<void> {
        await this.doClick(await this.selectProcedure, "Clicking on Procedure dropdown");
    }

    public async openContextTypeDropdown(): Promise<void> {
        await this.doClick(await this.contextType, "Clicking on Context Type dropdown");
    }

    public async selectFirstContextType(): Promise<void> {
        await this.doClick(await this.selectContextType, "Selecting first context type");
    }

    public async savePopupChanges(): Promise<void> {
        await this.doClick(await this.savepopBtn, "Clicking Save button in popup");
    }

    public async selectContextTypeFromDropdown(): Promise<void> {
        await this.openContextTypeDropdown();
        await this.selectFirstContextType();
    }

    public async mapProcedureToProcess(): Promise<void> {
        await this.navigateToMapSection();
        await this.selectIBPJapanProcess();
        await this.clickMapProcedureButton();
        await this.openProcedureDropdown();
        await this.selectContextTypeFromDropdown();
        await this.savePopupChanges();
    }

    public async searchForSpecificProcedure(procedureName: string = "createscenario23"): Promise<void> {
        await this.doEnterText(await this.searchDeleteField, procedureName, `Searching for ${procedureName} to delete`);
    }

    public async clickDeleteButtonForProcedure(): Promise<void> {
        await this.doClick(await this.deleteProced, "Clicking delete button for specific procedure");
    }

    public async confirmDeletionAction(): Promise<void> {
        await this.doClick(await this.confirmDelete, "Confirming delete action");
    }

    public async deleteSpecificProcedure(procedureName: string = "createscenario23"): Promise<void> {
        await this.searchForSpecificProcedure(procedureName);
        await this.clickDeleteButtonForProcedure();
        await this.confirmDeletionAction();
    }

    public async openThreeDotsMenu(): Promise<void> {
        await this.doClick(await this.threeDots, "Clicking three dots menu");
    }

    public async selectRemoveProcedureOption(): Promise<void> {
        await this.doClick(await this.removeProcedure, "Clicking remove procedure option");
    }

    public async confirmDeleteInModal(): Promise<void> {
        await this.doClick(await this.deleteBtn, "Confirming delete action in modal");
    }

    public async removeProcedureFromThreeDotsMenu(): Promise<void> {
        await this.openThreeDotsMenu();
        await this.selectRemoveProcedureOption();
        await this.confirmDeleteInModal();
    }

    public async enterTextInMainField(text: string): Promise<void> {
        await this.doEnterText(await this.text, text, `Entering text: ${text}`);
    }

    public async enterTextInSecondaryField(text: string): Promise<void> {
        await this.doEnterText(await this.inputText, text, `Entering text in input field: ${text}`);
    }

    public async selectProcedureTypeFromDropdown(): Promise<void> {
        await this.doClick(await this.selectProtype, "Selecting procedure type from dropdown");
    }

    public async clickAddProcedureButton(): Promise<void> {
        await this.doClick(await this.addProcedure, "Clicking Add Procedure button");
    }

    public async clickPublishButton(): Promise<void> {
        const publishBtn = await this.publishBtn;
        const isEnabled = await publishBtn.isEnabled();
        if (isEnabled) {
            await this.doClick(publishBtn, "Clicking Publish button");
        } else {
            await CommonFunctions.logMessage("INFO", "Publish button is not enabled");
        }
    }

    public async completeActorWorkflow(): Promise<void> {
        await this.clickOnTab('Actors');
        await this.addActorToSequence();
    }

    public async completeProcedureWorkflow(procedureName: string, metaData: string): Promise<boolean> {
        try {
            await this.clickOnTab('Procedures');
            await this.clickAddProcedureButton();
            const result = await this.setMetaDataForProcedure(procedureName, metaData);
            if (result) {
                await this.clickPublishButton();
            }
            return result;
        } catch (error) {
            await CommonFunctions.logMessage("ERROR", `Complete procedure workflow failed: ${error}`);
            return false;
        }
    }
}

export default new ActorsAndProceduresPage();

