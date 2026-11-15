import MfePage from './mfe.page';
import CommonFunctions from '../util/common.util';
import planningPage from './planning.page';


export class SettingsArrangeViewsPage extends MfePage {

    private get getSearchProcessInput()                     { return $(`//div[@data-testid="searchprocess"]//input`); }
    private get mapWithProcessCount()                       { return $(`//h2[@id="customized-dialog-title"]//h5`) }
    private get mapViewsSelectedContainer()                 { return $$(`(//div[@data-testid="lui-ccl-table"])[2]//tbody//tr[@data-selected='true']`) }
    private get arrangeViewsContainer()                     { return $$(`//div[@data-testid='arrange-views']//table//tbody//tr[@data-testid='arrange-views-row']`)}
    private get displayContainers()                         { return $$(`//div//div//div[@class = 'MuiTreeItem-label']`)} 
    private get saveBtn()                                   { return $(`//button[@data-testid="save-btn"]`)}
    private get headerTitle()                               { return $(`//h3[text()='Planning']`)}
    private get viewListExpand()                            { return $$(`//tr[@data-testid="arrange-views-row"]/td/span[@aria-label="Expand"]`) }
    private get processBulkMappingCheckBox()                { return $(`//th[@data-index = 1]//input`)}
    private get assumptionBulkMappingCheckBox()             { return $(`//th//div//input[@data-testid="lui-ccl-table-checkbox-title"]`)}
    private get selectBulkMapWith()                         { return $(`//button[@data-testid='lui-ccl-button-with-dropdown-button']/span`)}
    private get removeMapping()                             { return $(`//div[@role='presentation']//button[@id="confirm-dialog-save-btn"]`)}
    private get selectAllProcess()                          { return $$(`//tr[@data-selected="true"]`)}
    private get successToast()                              { return $(`//div[text()='Your changes have been saved successfully']`)}
    private get assumptionSearch()                          { return $(`//input[@data-testid="process-search"]`)}
    private get clearProcessName()                          { return $(`//button[@aria-label='Clear']`)}
    private get containerText()                             { return $$(`//tr[@data-testid='arrange-views-row']//td[1]//button[not(contains(@class,'Mui-disabled'))]//ancestor::tr/td[3]/p`)}               
    private get successAlertOnSave()                        { return $("//div[@role='alert' and contains(@class,'MuiAlert-colorSuccess') and contains(@class,'MuiAlert-filledSuccess')]//div[contains(@class,'MuiAlert-message')]")}

    private containerMove(containerName: string)            { return $(`//div[@role="presentation"]//tbody//tr[@data-testid="arrange-views-row"]//td//p[text()='${containerName}']//ancestor::tr//button[@aria-label='Move']`)}
    private viewMove(viewName: string)                      { return $(`//div[@role="presentation"]//tr[@data-testid="arrange-views-row"]//p[text()='${viewName}']//ancestor::td[1]//preceding-sibling::td//button[@aria-label='Move']`)}
    private containerCheckBox(containerName: string)        { return $(`//div[@role="presentation"]//tr[@data-testid="lui-ccl-table-row"]//p[text()='${containerName}']//ancestor::td//preceding-sibling::td[1]//input`)}
    private selectedContainer(containerName: string)        { return $(`//div[@role="presentation"]//tr[@data-testid="lui-ccl-table-row"]//p[text()='${containerName}']//ancestor::td//preceding-sibling::td[1]//span[@aria-label="Toggle select row" and contains(@class,'Mui-checked')]`)}
    private semiSelectedContainer(containerName: string)    { return $(`//div[@role="presentation"]//tr[@data-testid="lui-ccl-table-row"]//p[text()='${containerName}']//ancestor::td//preceding-sibling::td[1]//span[@aria-label="Toggle select row" and contains(@class,'MuiCheckbox-indeterminate')]`)}
    private selectedView(viewName: string)                  { return $(`//div[@role="presentation"]//tr[@data-testid="lui-ccl-table-row"]//p[text()='${viewName}']//ancestor::td//preceding-sibling::td[1]//span[@aria-label="Toggle select row" and contains(@class,'Mui-checked')]`)}
    private viewCheckBox(viewName: string)                  { return $(`//div[@role="presentation"]//tr[@data-testid="lui-ccl-table-row"]//p[text()='${viewName}']//ancestor::td//preceding-sibling::td[1]//input`)}
    private assumptionMenu(assumptionType: string)          { return $(`//tr[@data-testid="lui-ccl-table-row"]//div/p[text()='${assumptionType}']//following::td[2]//button[@data-testid="lui-ccl-threedot-menu-icon-button"]`)}
    private containerByName(containerName: string)          { return $(`//tr[@data-testid='arrange-views-row']//td//p[text()='${containerName}']//ancestor::tr`)}
    private containerNextViews(containerName: string)       { return $$(`//tr[@data-testid='arrange-views-row']//td//p[text()='${containerName}']//ancestor::tr//following::tr/td//button[contains(@class,'Mui-disabled')]//ancestor::tr`)}
    private containerNextViewText(containerName: string)    { return $$(`//tr[@data-testid='arrange-views-row']//td//p[text()='${containerName}']//ancestor::tr//following::tr/td//button[contains(@class,'Mui-disabled')]//ancestor::tr/td[3]/p`)}
    private bulkMapActionName(actionName : string)          { return $(`//li[@data-testid = 'lui-ccl-button-with-dropdown-item']//span[@aria-label='${actionName}']`)}
    private getArrangeViewTableRow(viewName: string)        { return $(`//p[text()="${viewName}"]/ancestor::tr[@data-testid="arrange-views-row"]`)}   
    private getEyeIcon(viewName)                            { return $(`//p[text()="${viewName}"]/ancestor::tr[@data-testid="arrange-views-row"]//td[4]//div[@class="options"]/span`)}
    private getContainer(containerName: string)             { return $(`//div[contains(@class,"MuiTreeItem-content")]/div[text()="${containerName}"]//parent::div//parent::li`)}
    private viewText(viewName : string)                     { return $(`(//div[@data-testid="lui-ccl-table"])[2]//tbody//tr//p[@title = '${viewName}']`) }
    private rowLevelMenu(entityName: string)                { return $(`//tbody/tr/td[3]//div/p[text()='${entityName}']//following::td[2]//button`) }
    private action(actionName: string)                      { return $(`//ul[@data-testid="lui-ccl-threedot-menu-list"]//div/span[text()='${actionName}']`) }
    
    public async selectProcess(processName: string) {  
        const getSearchProcessInput = await this.getSearchProcessInput;
        await getSearchProcessInput.waitForClickable({ timeout: 5000 });
        await this.doClick(getSearchProcessInput, `Clicking on process search input`);
        const clearProcessName = await this.clearProcessName;
        await this.doClick(clearProcessName, `Clicking clear process name`);
        await this.doClearAndEnterText(getSearchProcessInput, processName, `Entering process name: ${processName}`);
        const opt = $("//*[text()='" + processName + "']");
        await CommonFunctions.logMessage("INFO", "Selecting Process: " + processName);
        await this.doClick(opt, `Selecting process: ${processName}`);
    }

    public async selectProcessAction(entityName:string, actionName: string) {
        await this.doClick(await this.rowLevelMenu(entityName), `Clicking 3 dot icon on ${entityName}'s to perform ${actionName} action`);
        await this.doClick(await this.action(actionName), `Clicking ${actionName} action`);
        if(actionName === "Remove Mappings") {
            await this.doClick(await this.removeMapping, `Clicking Remove Mapping`);
        }
    }

    public async expandViewContainer(containerName: string) {
        const containerEle = await this.getContainer(containerName);
        const containerExist: boolean = await this.doesElementExist(containerEle, `Checking if ${containerName} container exists`);
        if (containerExist) {
            const attrValue = await this.doGetAttribute(containerEle, 'aria-expanded', `Getting aria-expanded attribute for ${containerName}`);
            if (attrValue === 'false') {
                await containerEle.waitForClickable({ timeout: 30000 });
                await CommonFunctions.logMessage("INFO", `Expanding ${containerName} container in views list`);
                await this.doClick(containerEle, `Expanding ${containerName} container`);
            }
            else {
                await CommonFunctions.logMessage('INFO', `${containerName} container is already expanded`);
            }
        }
    }

    public async hideOrUnhideView(viewName: string, visibilityMode: "HIDE_VIEW" | "SHOW_VIEW"): Promise<boolean> {
        const eyeIcon = await this.getEyeIcon(viewName);
        const attrValue = await this.doGetAttribute(eyeIcon, 'aria-label', `Getting aria-label for ${viewName} eye icon`);
        if (visibilityMode === "SHOW_VIEW") {
            if (attrValue === 'show view') {
                await CommonFunctions.logMessage("INFO", `Clicking on eye icon of ${viewName} view`);
                await this.clickOnEyeIcon(eyeIcon);
            }
            else {
                await CommonFunctions.logMessage("INFO", `${viewName} is already not a hidden view`)
            }
        }
        else {
            if (attrValue === 'simple') {
                const viewEle = await this.getArrangeViewTableRow(viewName);
                await CommonFunctions.logMessage("INFO", `Hovering on ${viewName} view in arrange views`);
                await this.doClick(viewEle, `Clicking on ${viewName} view row`);
                await CommonFunctions.logMessage("INFO", `Clicking on eye icon of ${viewName} view`);
                await this.clickOnEyeIcon(eyeIcon);
            }
            else {
                await CommonFunctions.logMessage("INFO", `${viewName} view is already hidden`);
            }
        }

        return true;
    }

    public async clickOnEyeIcon(eyeIcon: WebdriverIO.Element){
        await eyeIcon.waitForClickable({timeout:10000});
        await this.doClick(eyeIcon, `Clicking on eye icon`);
    }

    public async clickSave(){
        await CommonFunctions.logMessage("INFO", "Clicking on save button")
        await this.doClick(await this.saveBtn, `Clicking save button`);
        await (await this.successAlertOnSave).waitForDisplayed({ timeout: 30000 });
        return true;
    }

    public async selectAssumptionAction(assumptionType:string, actionName: string) {
        const assumptionSearch = await this.assumptionSearch;
        await this.doClick(assumptionSearch, `Clicking assumption search`);
        await this.doClearAndEnterText(assumptionSearch, assumptionType, `Entering assumption type: ${assumptionType}`);
        const row = await this.assumptionMenu(assumptionType);
        await this.doClick(row, `Clicking assumption menu for ${assumptionType}`);
        const action = await this.action(actionName)
        await this.doClick(action, `Clicking ${actionName} action`);
        if(actionName === "Remove Mappings") {
            const confirmRemove = await this.removeMapping;
            await this.doClick(confirmRemove, `Clicking confirm remove mapping`);
        }
    }

    public async selectProcessBulkAction(actionName: string) {
        await this.doClick(await this.processBulkMappingCheckBox, "Selecting All Checkbox for process");
        await this.doClick(await this.selectBulkMapWith, "Selecting Bulk Action Dropdown");
        await this.doClick(await this.bulkMapActionName(actionName), "Selecting Bulk Map Action Name: " + actionName);
        if (actionName === 'Remove All Mappings') {
            await this.doClick(await this.removeMapping, "Clicking on Remove Mapping");
        }
    }

    public async selectAssumptionBulkAction(actionName : string) {
        await this.doClick(await this.assumptionBulkMappingCheckBox, "Selecting All Checkbox for Assumption");
        await this.doClick(await this.selectBulkMapWith, "Selecting Bulk Action Dropdown");
        await this.doClick(await this.bulkMapActionName(actionName), "Selecting Bulk Map Action Name: " + actionName);
        if(actionName === 'Remove All Mappings') {
            const removeMappings = await this.removeMapping;
            await this.doClick(removeMappings, "Clicking on Remove Mapping");
        }
    }

    public async selectedViews() {
        let selectedlist: string[] = [];
        const selectedContainers = await this.mapViewsSelectedContainer;
        for (let element of selectedContainers) {
            const selectedViewGroups = await this.doGetText(element, `Getting selected view group text`);
            selectedlist.push(selectedViewGroups);
        };
        await CommonFunctions.logMessage('INFO',`Fetched selected views and containers in map Views are "${selectedlist}"`);          
        return selectedlist;
    }

    public async showSelectedViews() {
        let displaySelectedList: string[] = [];
        const displayContainer = await this.arrangeViewsContainer;
        for (let element of displayContainer) {
            const selectedViewGroups = await this.doGetText(element, `Getting arrange view text`);
            displaySelectedList.push(selectedViewGroups);
        };
        await CommonFunctions.logMessage('INFO',`Fetch containers and views in arrange views are "${displaySelectedList}"`);
        return displaySelectedList ?? []
    }

    public async expandContainers() {
        try{
        const viewListExpand = await this.viewListExpand;
        for(let ele of viewListExpand) {
            const expandIcon = ele;
            if (await this.doesElementExist(expandIcon, `Checking if expand icon exists`)) {
                await this.doClick(expandIcon, `Clicking expand icon`); 
                await CommonFunctions.logMessage('INFO', 'Expand icon clicked.');
            } else {
                await CommonFunctions.logMessage('INFO', 'Container list is already expanded.');
            }
        }}
        catch(error){
            await CommonFunctions.logMessage('INFO',`Containers are already expanded`);
        }
    }

    public async getPSContainersAndViews(viewGroupName?: string) {
        const headerTitle = await this.headerTitle;
        await headerTitle.waitForDisplayed({timeout:60000});
        await browser.pause(5000);
        await planningPage.ExpandAllViewGroup();
        const displayContainers = await this.displayContainers;
        let displayViewList :string[] = [];
        const halfLength = Math.floor(displayContainers.length / 2);
        for (let i =0; i< halfLength; i++) {
            const element = displayContainers[i];
            const text = await this.doGetText(element, `Getting container/view text`);
            displayViewList.push(text);
        }
        CommonFunctions.logMessage('INFO',`Fetch containers and views are ${displayViewList}`)
        return displayViewList;
    }

    public async dragContainer(sourceContainerName: string, targetContainerName: string) {
        const sourceMove = await this.containerMove(sourceContainerName);
        const targetMove = await this.containerMove(targetContainerName);
        await sourceMove.dragAndDrop(targetMove);
        CommonFunctions.logMessage('INFO',`${sourceContainerName} is moved to ${targetContainerName}`)
    }
 
    public async dragView(sourceViewName: string, targetViewName: string) {
        const sourceMove = await this.viewMove(sourceViewName);
        const targetMove = await this.viewMove(targetViewName);
        await sourceMove.dragAndDrop(targetMove);
        CommonFunctions.logMessage('INFO',`${sourceViewName} is moved to ${targetViewName}`)
    }

    public async toggleContainer(containerName: string, select: boolean) { // to select container in map views, select boolean as true otherwise false
        const containerCheckBox = await this.containerCheckBox(containerName);
        // To select the container
        if(select && !(await this.doesElementExist(await this.selectedContainer(containerName), `Checking if ${containerName} is selected`))) {           
            if(await this.doesElementExist(await this.semiSelectedContainer(containerName), `Checking if ${containerName} is semi-selected`)){
                // Container is semi selected
                await this.doClick(containerCheckBox, `Clicking ${containerName} container checkbox - semi selected`);
                CommonFunctions.logMessage('INFO','semiSelected Container in map views is selected');
                if(!(await this.doesElementExist(await this.selectedContainer(containerName), `Checking if ${containerName} is now selected`))) {
                    await this.doClick(containerCheckBox, `Clicking ${containerName} container checkbox again`);
                    CommonFunctions.logMessage('INFO','Container in map views selected');
                }
            } else {
                await this.doClick(containerCheckBox, `Clicking ${containerName} container checkbox`);
                CommonFunctions.logMessage('INFO','Container in map views is unselected');
            }
        }
        // To unselect the container
        if(!select && (await this.doesElementExist(await this.selectedContainer(containerName), `Checking if ${containerName} is selected for unselection`))) {
            // Container is selected
            await this.doClick(containerCheckBox, `Clicking ${containerName} container checkbox to unselect`);
            CommonFunctions.logMessage('INFO','Container in map views is unselected');
        } else if(!select && (await this.doesElementExist(await this.semiSelectedContainer(containerName), `Checking if ${containerName} is semi-selected for unselection`))) {
            // Container is semi selected
            await this.doClick(containerCheckBox, `Clicking ${containerName} semi-selected container checkbox`);
            CommonFunctions.logMessage('INFO','semiSelected Container in map views is unselected');
            if((await this.doesElementExist(await this.selectedContainer(containerName), `Checking if ${containerName} is now selected after unselection`))) {
                await this.doClick(containerCheckBox, `Clicking ${containerName} container checkbox final time`);
                CommonFunctions.logMessage('INFO','selected Container in map views is selected');
            }
        }
    }

    public async toggleView(viewName: string, select: boolean) { // to select view in map views, select boolean as true otherwise false
        const viewCheckBox = await this.viewCheckBox(viewName);
        if(select && !(await this.doesElementExist(await this.selectedView(viewName), `Checking if ${viewName} view is selected`))) {
            await this.doClick(viewCheckBox, `Selecting ${viewName} view checkbox`);
            CommonFunctions.logMessage('INFO','view in map views selected');
        }
        if(!select && (await this.doesElementExist(await this.selectedView(viewName), `Checking if ${viewName} view is selected for unselection`))) {
            await this.doClick(viewCheckBox, `Unselecting ${viewName} view checkbox`);
            CommonFunctions.logMessage('INFO','view in map views unselected');
        }
    }

    public async getContainerViews(containerName: string) {
        let list: string[] = [];
        const container = await this.containerByName(containerName);
        let index = await this.doGetAttribute(container, "data-index", `Getting data-index for ${containerName}`);
        console.log('indexindexindexindex', index);

        const views = await this.containerNextViews(containerName);
        const viewText = await this.containerNextViewText(containerName);
        const len = await views.length
        for (let i = 0; i < len; i++) {
            const text = await this.doGetText(viewText[i], `Getting view text at index ${i}`)
            list.push(text);
        }
        CommonFunctions.logMessage('INFO', `Container view list: ${list}`)
        return list;
    }

    public async displaySelectedViews(containerName : string) {
        await this.toggleContainer(containerName, true); 
        const selectedList = await this.selectedViews();
        CommonFunctions.logMessage('INFO',`selected views and containers in map views are ${selectedList}`);
        await this.expandContainers();
        const displaySelectedList = await this.showSelectedViews();  
        CommonFunctions.logMessage('INFO',`selected views and containers in arranged views are ${displaySelectedList}`);     
        const bv1 : boolean = JSON.stringify(selectedList) === JSON.stringify(displaySelectedList)
        return bv1;
    }

    public async displayViewsOrder(viewName : string) {
        await this.toggleView(viewName, false);
        const selectedList =  await this.selectedViews();
        await CommonFunctions.logMessage('INFO',`selected views and containers in map views are ${selectedList}`);
        const selectedListInArrangeViews = await this.showSelectedViews(); 
        await CommonFunctions.logMessage('INFO',`selected views and containers in arrage views are ${selectedListInArrangeViews}`);
        let validation1: boolean = await CommonFunctions.compareTwoValues(selectedList.toString(), selectedListInArrangeViews.toString(), 'View mapping and arrange views selected views ');
        await this.toggleView(viewName, true);
        await this.toggleView(viewName, true);
        const displaySelectedList = await this.showSelectedViews(); 
        await CommonFunctions.logMessage('INFO',`selected views and containers in arrage views are ${displaySelectedList[displaySelectedList.length - 1]}`);
        const viewText = await this.viewText(viewName);
        await CommonFunctions.logMessage('INFO',`Fetched containers are "${displaySelectedList}"`);
        let validation2: boolean = await CommonFunctions.compareTwoValues(viewName.toString(), displaySelectedList[displaySelectedList.length - 1].toString(), 'View mapping and arrange views last selected view ');
        return validation1 && validation2 ; 
    }

    public async mapWithProcesscount(entityType : string) {
        const selectedProcessCount = await this.selectAllProcess;
        const processCount = selectedProcessCount.length > 0 ? selectedProcessCount.length : 1;
        CommonFunctions.logMessage('INFO',`${processCount} process is selected for view mapping`);
        const mapWithProcess = await this.mapWithProcessCount; 
        const mapText = await this.doGetText(mapWithProcess, `Getting map with process count text`);
        let validation: boolean = await CommonFunctions.compareTwoValues(mapText,`Map Selected ${processCount} ${entityType} with`, 'View mapping for process ');
        return validation;
    }

    public async displayBulkMappingViewsInPS() {
        const headerTitle = await this.headerTitle;
        await headerTitle.waitForDisplayed({timeout:100000});
        const getAllContainers = await this.getPSContainersAndViews();
        await CommonFunctions.logMessage('INFO',`Fetched views are "${getAllContainers}"`);
        return getAllContainers;
    }

    public async checkDragAndDropViews(containerName : string, sourceViewName : string, targetViewName : string) {
        await this.toggleContainer(containerName, false); 
        await this.expandContainers();
        const initialViewList: any[] = await this.getContainerViews(containerName);
        console.log('initialViewList',initialViewList)
        await this.dragView(sourceViewName, targetViewName);
        await CommonFunctions.logMessage('INFO',`Drag and drop of view from ${sourceViewName} to ${targetViewName}`);
        const finalViewList: any[] = await this.getContainerViews(containerName);
        const firstEle = initialViewList.shift();
        initialViewList.push(firstEle);
        console.log('finalViewList',finalViewList)
        console.log('initialViewList 1',initialViewList)
        const bv1 = JSON.stringify(initialViewList) === JSON.stringify(finalViewList);
        await CommonFunctions.logMessage("INFO","Views after Drag and Drop Assertion:: "+bv1);
        const poList = await this.showSelectedViews();
        await CommonFunctions.logMessage("INFO", "Selected Views:: "+poList);
        await this.doClick(await this.saveBtn, "Clicking Save Button");
        const bv2 = await this.doesElementExist(await this.successToast, `Checking if success toast is displayed`);
        await CommonFunctions.logMessage("INFO","Success Toast Message Displayed:: "+bv2);
        return poList;
    }

    public async dragAndDropContainer(sourceContainerName : string, targetContainerName : string ) {
        await this.toggleContainer(sourceContainerName, true); 
        await this.toggleContainer(targetContainerName, true); 
        await this.expandContainers();
        const containerText = await this.containerText;
        const initialFirstContainer = await this.doGetText(containerText[0], `Getting first container text`);
        const initialLastContainer = await this.doGetText(containerText[1], `Getting second container text`);
        
        await this.dragContainer(sourceContainerName,targetContainerName);
        CommonFunctions.logMessage('INFO',`Drag and drop of Containers ${sourceContainerName} to ${targetContainerName}`);
        const finalFirstContainer = await this.doGetText(containerText[0], `Getting first container text after drag`);
        const finalLastContainer = await this.doGetText(containerText[1], `Getting second container text after drag`);
        const bv1 = ((initialFirstContainer === finalLastContainer) && (initialLastContainer === finalFirstContainer));
        console.log('Drag and drop success ::', bv1);
        const poList = await this.showSelectedViews();
        const saveBtn = await this.saveBtn;
        await this.doClick(saveBtn, `Clicking save button`);
        const bv2 = await this.doesElementExist(await this.successToast, `Checking if success toast is displayed after container drag`);
        console.log('Success Toast Message ::', bv2);
        return poList;
    }
   
}
export default new SettingsArrangeViewsPage;
