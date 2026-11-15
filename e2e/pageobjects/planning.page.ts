import MfePage from './mfe.page';
import allureReporter from '@wdio/allure-reporter'
import ProcessPage from './process.page';
import CommonFunctions from '../util/common.util';
import scope from "./scope.page"
import { InputField } from './page';
import TestUtil from '../util/test.util';
import GlobalSettings from './global-settings.page';
import SCAPage from './sca.page';

type entity = 'Process' | 'Sub-process' | 'Assumption';
type ICardType = 'PieChart' | 'Scenario Comparision Chart' | 'Combination Chart' | 'Tree Table'  | 'PivotCard' | 'NPI Card' | 'Heat Map Chart' | 'Enhanced Table' | '';
type myTaskRowTitle = 'Action Items Assigned' | 'Collaborations Tagged' | 'New Insights';
type ICloneMemberType = "New Member" | "New Intersection";
type ICreatePlaceholderMode = "choose" | "ref-assortment";
type ICommentAction = "Edit comment" | "Delete comment";
type IThreadAction = "Unsubscribe from thread";

const DimensionAttributes = {
  "Reference Level": "Select Level",
  "Reference Member": "Select Member",
  "Target Level": "Select Level",
  "Target Member": "Comma-separated values"
}
export interface IProcess {
    process: string;
}
interface ISubProcess extends IProcess {
    subProcess: string;
}
interface IAssumption {
    origin: string;
    assumption: string;
}
interface Context{
  process: string;
  subProcess?: string;
  assumption?: string;
}


class PlanningPage extends MfePage {

  private get refreshBtn()                            { return $(`//button[@id="refresh-btn"]`); }
  private get btnManageScenarios()                    { return $("//button[@data-testid='manage-scenarios']"); } 
  private get btnCloseManageScenarios()               { return $("//button[@aria-label='Close manage scenarios']"); }
  private get slctViewsdd()                           { return $(`//input[@id='select-select-select-views']`); }
  private get getViewsdd()                            { return $$(`//li[contains(@id,'select-listitemtext')]//span[@aria-label]`); }
  private get interactiveDataStatusIcon()             { return $(`//button[@data-testid='data-sync-status-btn']`); }
  private get btnClearProcessDD()                     { return $('//button[@title="Clear"]'); }
  private get editBtnInSca()                          { return $("//button[text()='Edit']"); } 
  private get slctScnHeader()                         { return $("//h5[text()='Select Scenario']"); } 
  private get searchScnDialog()                       { return $("//div[@id='customized-dialog-description']"); } 
  private get btnCancelInPopup()                      { return $("//button[text()='Cancel']"); } 
  private get searchBarInProcedure()                  { return $("//div[@data-testid='search-bar']"); } 
  private get searchIconBtn()                         { return $(`//button[@data-testid='search-views-btn']`)}
  private get drillThroughEle()                       { return $("//li[@data-testid='context-menu-item-drillThrough']")}
  private get searchInputEle()                        { return $(`//button[@aria-label='search-views']/following::div[1]/input`)}
  private get processTitleEle()                       { return $("//h2[@data-testid='app-header-block-title']")}
  private get expandPlanningPlaceBtn()                { return $("//button[@data-testid='toggle-drawer-btn']")}
  private get pinnedIcon()                            { return $(`//*[@data-testid="pinned-icon"]`)}
  private get unpinnedIcon()                          { return $(`//*[@data-testid="unpinned-icon"]`)}
  private get filterDetails()                         { return $(`//button[@data-testid='filter-details-button']`)}
  private get closeFilterDetails()                    { return $(`//button[@data-testid='close-button']`)}
  private get clearBtn()                              { return $("//button[@id='onClearScope']")}
  private get redDotEle()                             { return $("//div[@aria-label='Planning Space']/following-sibling::span[contains(@class,'MuiBadge-dot')]")}
  private get btnAddCard()                            { return $("//button[@data-testid='lui-dashboard-header-add-card-button']")}
  private get btnCreateCard()                         { return $("//button[@data-testid='lui-dashboard-header-card-create-button']")}
  private get cardNames()                             { return $$("//div[@data-testid='lui-dashboard-card-gallery-item-card-title']")}
  private get addCardBtn()                            { return $("//button[text()='Add Card']")}
  private get viewElements()                          { return $$(`//ul[@role='group' and contains(@class,'MuiTreeItem-group')]//div[@class='MuiTreeItem-label']`)}
  private get contextDropdownEle()                    { return $(`//input[@id='select-select-select-context']`)}
  private get processDropdownEle()                    { return $(`//input[@id="select-process"]`)}
  private get launchBtn()                             { return $(`//button[@data-testid="launchButton"]`)}
  private get addIconBtn()                            { return $(`//button[@aria-label="add card button"]`)}
  private get cardSettingsTitleInput()                { return $(`//input[@data-testid="lui-dashboard-card-settings-title-input"]`)}
  private get publishBtn()                            { return $(`//button[@data-testid='lui-dashboard-card-admin-settings-confirm-button']`)}
  private get getMaasChartIcon()                      { return $$(`//button[contains(@data-testid,'chart-toolbar-testid')]`)}
  private get getMaasPivotIcon()                      { return $$(`//button[contains(@data-testid,'maas-pivot-card')]`)}
  private get saveBtn()                               { return $(`//button[@data-testid="lui-dashboard-header-save-button"]`)}
  private get removeItem()                            { return $(`//li[@data-testid="lui-dashboard-card-definition-menu-remove"]`)}
  private get settingsItem()                          { return $(`//li[@data-testid="lui-dashboard-card-definition-menu-settings"]`)}
  private get settingsItemInEditView()                { return $(`//li[@data-testid="lui-dashboard-card-settings-button"]`)}
  private get calenderIcon()                          { return $(`//button[contains(@aria-label, "Choose date")]`)}
  private get deprecateAndRemoveBtn()                 { return $(`//button[@data-testid="lui-dashboard-configuration-remove-confirm-button"]`)}
  private get todaysDateEle()                         { return $(`//button[contains(@class,'MuiPickersDay-today')]`)}
  private get cardDescInput()                         { return $(`//input[@data-testid="lui-dashboard-card-settings-title-short-description"]`)}
  private get configServiceInput()                    { return $(`//div[@data-testid="cardDataConfigurationServiceTextBox"]//input[@type="text"]`)}
  private get controllerServiceInput()                { return $(`//div[@data-testid="cardDataControllerServiceTextBox"]//input[@type="text"]`)}
  private get calcEngineId()                          { return $(`//div[@data-testid="cardDataCalcEngineIdTextBox"]//input[@type="text"]`)}
  private get cardGalleryCloseBtn()                    { return $(`//button[@data-testid="lui-dashboard-global-add-card-modal-title-close-button"]`)}
  private get applyPageContextCheckBoxInput()         { return $(`//span[@data-testid="accept-page-context-subscription"]/input[@type="checkbox"]`)}
  private get saveSettingsBtn()                       { return $(`//button[@data-testid="lui-dashboard-card-settings-save-button"]`)}
  public get actionsDropdownBtn()                     { return $(`//div[contains(@class,'sca-header-2')]//button[@data-testid="sca-actions-dropdown-button"]`)}
  private get supplyChainActionsDropdownBtn()         { return $(`//div[contains(@class,'sca-header-1')]//button[@data-testid="sca-actions-dropdown-button"]`)}
  private get supplyChainActionsDropdownBtn2()        { return $(`//div[contains(@class,'sca-header-2')]//button[@data-testid="sca-actions-dropdown-button"]`)}
  private get scaPopup()                              { return $(`//h2[@id="customized-dialog-title"]`)}
  private get scaDropdown()                           { return $(`//div[contains(@class,'sca-header-1')]//button[@data-testid="sca-actions-dropdown-button"]`)}
  private get lblUnAuth()                             { return $(`//span[@data-testid='lui-ccl-card-title']/span`)}
  private get breadCrumb()                            { return $("//ol[@role='list']/li"); }
  private get title()                                 { return $(`//h1[@data-testid='lui-ccl-page-header-title']`)}
  private get selectProcessDropdown()                 { return $(`//input[@id="select-select-select-views"]`)}
  private get getBackButton()                         { return $$('//button[@id="toggle-drawer-btn"]')[1]}
  private get newTabCheckbox()                        { return $(`//span[@data-testid='lui-card-configuration-subscription-setting-nav-checkbox']/input[@type='checkbox' and @data-testid='lui-card-configuration-subscription-setting-nav-checkbox-input']`)}
  private get headerSaveButton()                      { return $(`//h1//button[@data-testid='lui-dashboard-header-save-button' and contains(text(), 'Save')]`)}
  private get editIcon()                              { return $(`//button[@id='edit-view-btn']`)}
  private get combinationCardDataEndpointInput()      { return $$(`(//input[@data-testid="lui-portal-data-config-endpoint-url"])`)}
  private get deleteSubscript()                       { return $("//button[@aria-label='Delete subscription']")}
  private get cardDataEndpointInput()                 { return $(`//input[@data-testid="lui-portal-data-config-endpoint-url"]`)}
  private get cardMetadataEndpointInput()             { return $(`//input[@data-testid="lui-portal-metadata-config-endpoint-url"]`)}
  private get tableCardDataEndpointInput()            { return $(`//input[@data-testid="lui-portal-data-endpoint-url"]`)}
  private get favouriteIcon()                         { return $(`//button[@data-testid='add-favourite-btn']`)}
  private get childViews()                            { return $(`//ul[@role="group"]//li[@role="treeitem"]`)}
  private get viewName()                              { return $(`//h2[@data-testid="app-header-block-title"]`)}
  private get backBtnHiddenView()                     { return $('//button[@data-testid="toggle-drawer-back-btn"]')}
  private get predefinedData()                        { return $("//span[@data-testid='lui-portal-data-config-predefined-endpoint-switch']//input")}
  private get navToDataintheCardSettings()            { return $(`//button[@data-testid="verticalTab-data"]`)}
  private get addSub()                                { return $ ("//button[@data-testid='lui-card-configuration-subscription-setting-add-subscription']")}
  private get assignedToChipLabel()                   { return $("//input[@id='tags-standard']/preceding-sibling::div//span[@aria-label]")}
  private get cardFieldsAll()                         { return $$("//input[@data-testid='lui-card-configuration-subscription-setting-card-selection-select']")}
  private get eventFieldsAll()                        { return $$("//input[@data-testid='lui-card-configuration-subscription-setting-event-selection-select']")}
  private get actionFieldsAll()                       { return $$("//input[@data-testid='lui-card-configuration-subscription-setting-action-selection-select']")}
  private get cardOptionsAll()                        { return $$("//ul/li[@data-testid='lui-card-configuration-subscription-setting-card-selection-option'][@tabindex='0']")}
  private get eventOptionsAll()                       { return $$("//ul/li[@data-testid='lui-card-configuration-subscription-setting-event-selection-option']")}
  private get actionOptionsAll()                      { return $$("//ul/li[@data-testid='lui-card-configuration-subscription-setting-action-selection-option']")}
  private get saveSubscription()                      { return $("//button[@data-testid='lui-dashboard-card-settings-save-button']")}
  private get graphClick()                            { return $("(//div[@data-testid='KPI-Quarter Sales'])[1]")}
  private get selectedView()                          { return $(`//li[contains(@class, 'Mui-selected')]`)}
  private get moreActionsOption()                     { return $("//li[@data-testid='context-menu-item-moreActions']")}
  private get changeToOption()                        { return $("//li[@data-testid='context-menu-item-change_to']")}
  private get addCommentOption()                      { return $("//li[@data-testid='context-menu-item-cell_addComment']")} 
  private get getCommentInput()                       { return $(`//div[@role='textbox' and @contenteditable='true']`)}
  private get submitComment()                         { return $("//form//button[@type='submit']");}
  private get getCommentsPanelButton()                { return $('//button[@data-testid="comments-btn"]')}
  private get getComments()                           { return $$(`//div[contains(@class,'lb-comment-body')]`)}
  private get getCommentsCloseButton()                { return $(`//button[@data-testid="comments-close-btn"]`)}
  private get getThreadActionsThreeDots()             { return $(`(//button[contains(@class,'lb-comment-action')])[1]`)}
  private get closePopupModalIcon()                   { return $("//button[@data-testid='lui-ccl-modal-title-close-button']")}
  private get closeWizardIcon()                       { return $("//button[@data-testid='closeModal']")}
  private get getContextOverrideChip()                { return $(`//*[@data-testid="context-override-chip"]`)}
  private get dataSyncCardScenario()                  { return $("//p[@data-testid='data-sync-scenario']") }
  private get dataSyncCardCluster()                   { return $(`//p[@data-testid='data-sync-cluster-info']`) }
  private get sessionSelectHeading()                  { return $(`//h5[text()="Sync Interactive Data"]`)} 
  private get scopeSelectionDescription()             { return $('//p[@data-testid="scope-selection-description"]')}
  private get continueWithExistingSession()           { return $(`//button[@data-testid="cancel-button"]`)}
  private get syncButton()                            { return $(`//button[@data-testid="sync-button"]`)}
  private get conditionToggle()                       { return $("//input[@data-testid='enable-drillthrough-conditions']")}
  private get collaborationDialogTitle()              { return $(`//div[@role="presentation"]//h4//div[text()="Collaboration Rooms"]`)}
  private get notificationDialogTitle()               { return $(`//div[@role='presentation']//h3[text()='Notifications']`)}
  private get notificationPanelCloseIcon()            { return $(`//button[@data-testid="lui-portal-notifications-drawer-close-button"]`)}
  private get cardGallerySearch()                     { return $(`//div[@data-testid="lui-dashboard-header-card-search"]//input`)}
  private get noColumnsIcon()                         { return $(`//div[@data-testid="lui-ccl-empty-state-title-grid-container"]`)}
  private get fieldName()                             { return $("//input[@id='tags-standard']")}
  private get preDataField()                          { return $("//input[@data-testid='lui-portal-data-config-predefined-endpoint-select']")}
  private get predefinedDataSwitch()                  { return $("//input[@id='predefined-endpoint-switch']")}
  private get predefinedEndpointInput()               { return $(`//input[@data-testid='cdsp-scenario-comparison-data-config-predefined-endpoint-select']`)}
  private get searchCardInput()                       { return $(`//div[@data-testid='lui-dashboard-header-card-search']//input`)}
  private get procedureDetils()                       { return $(`//p[@data-testid="data-sync-procedureName"]`)}
  private get rubByDetails()                          { return $(`//p[@data-testid="data-sync-runByUserName"]`)}
  private get runIdDetails()                          { return $(`//p[@data-testid="data-sync-executionId"]`)}
  private get processFromBreadCrumb()                 { return $(`//ol[@role='list']/li[last()]`)}
  private get favouriteIconInView()                   { return $(`//button[@id='add-favourite-btn']`)}
  private get removeFavouriteIcon()                   { return $(`//div[@aria-label="Remove from Favorites"]`)}
  private get sideNavTitle()                          { return $(`//h3[@data-testid="side-nav-title"]`)}
  private get scopeChipInPowerBar()                   { return $('//div[@data-testid="scope-chip-btn"]')}
  private get subProcessDropdownClear()               { return $(`//div[@data-testid="select-subprocess"]//button[@aria-label="Clear"]`)}
  private get processContextChipEles()                { return $$(`//div[@data-testid="entityDetails"]//button`)}
  private get processContextChip()                    { return $(`//div[@data-testid='entityDetails']`)}
  private getEntityDetailsByText(entityText: string)  { return $(`//div[@data-testid='entityDetails'][1]//button[normalize-space(text())='${entityText}']`); }
  private get processContextChipCloseIcon()           { return $(`//div[@role="tooltip"]//button[@data-testid="closeButton"]`)}
  private get flyoutTitle()                           { return $(`//h4[text()="Create Placeholder"]`)}
  private get flyoutPresentation()                    { return $(`//div[@role="presentation" and @id="menu-"]`)}
  private get newNameInp()                            { return $(`//label[text()="New Name"]/parent::div//input`)}
  private get selectPrdouctDropdown()                 { return $(`//p[text()='Select Product (single select)']/parent::div//div[@role="combobox"]`)}
  private get noOfVaariantsInp()                      { return $(`//input[@placeholder="Minimum 1 variant"]`)}
  private get dropdownSearchInp()                     { return $(`//input[@placeholder="Minimum 3 characters required to search"]`)}
  private get clearSearchIcon()                       { return $(`//button[@aria-label="clear search text"]`)}
  private get closeIconInFlyout()                     { return $(`//button[@data-testid="close-icon"]`)}
  private get xAxisLabel()                            { return $(`//div[contains(@class,"highcharts-xaxis-labels")]//div[contains(@class,"lui-chart-card-x-axis-wrapper")]`)}
  private get chatButton()                            { return $(`//button[@data-testid="lui-portal-collaboration-icon-button"]`)}
  private get createCollaborationRoomicon()           { return $(`//button[@data-testid="create-collaboration-room-btn"]`)}
  private get collaborationPanelCloseIcon()           { return $(`//*[@data-testid="close-icon"]`)}
  private get userIconButton()                        { return $(`//*[self::button[@data-testid="luminate-avatar-menu"] or self::span[@data-testid="luminate-avatar-menu-badge"]]`)}
  private get signOutButton()                         { return $(`//li[@data-testid="lui-portal-avatarmenu-drilldown-option-logout"]`)}
  private get tableCardMetadataEndpointInput()        { return $(`//input[@data-testid="lui-portal-metadata-endpoint-url"]`)}
  private get viewSettingsSaveBtn()                   { return $(`//div[@role="presentation"]//button[@data-testid="lui-settings-ui-save-button"]`)}
  private get viewGroupInput()                        { return $(`//div[@data-testid="filter-viewgroup"]//input`)}
  private get moreDetailsTitleODM()                   { return $('//h2[@id="customized-dialog-title"]')}
  private get closeBtnMoreDetailsODM()                { return $('//button[@data-testid = "modal-close-button"]') } 
  private get moreDetailsODM()                        { return $('//button[@data-testid="data-sync-more-details-link"]')} 
  private get procedureDetailsODM()                   { return $('//button[@data-testid="data-sync-link"]')}  
  private get dataFromMoreDetialsODM()                { return $('//a[@data-testid="value-dataFromScenario"]') }
  private get updateDateFromMoreDetailsODM()          { return $('//p[@data-testid="value-lastUpdateDate"]') }
  private get procedureNameMoreDetailsODM()           { return $('//p[@data-testid="value-runBy"]') }
  private get planningInstanceFromMoreDetailsODM()    { return $('//p[@data-testid="value-planningInstanceId"]') }
  private get runIdFromMoreDetilasODM()               { return $('//p[@data-testid="value-runId"]')}
  private get procedureTimeFromMoreDetailsODM()       { return $('//p[@data-testid="value-procedureStartTime"]') }
  private get scenarioIdFromMoreDetailsODM()          { return $('//p[@data-testid="value-scenarioId"]') }
  private get realmIdFromMoreDetailsODM()             { return $('//p[@data-testid="value-realmId"]') }
  private get runByFromMoreDetailsODM()               { return $('//p[@data-testId= "value-runBy"]') }
  private get expandFilterInBDE()                     { return $('//p[text()="Expand Filter"]') }
  private get ContextProgressBar()                    { return $('//div[@data-testid="entityDetails"]//span[@role="progressbar"]')}
  private get scenarioChipInPowerBar()                { return $('//div[@data-testid="scenario-chip-btn"]//button')}
  private get manageScenariosButton()                 { return $('//button[@data-testid="manage-scenarios"]') }
  private get manageScenariosDialog()                 { return $('//div[@role="dialog"]') }
  private get descriptionHeaderLabel()                { return $(`//div[@role='dialog']//thead//th//*[self::div or self::p][contains(normalize-space(.), 'Description')]`) }
  private get descriptionHeaderLabelByIndex()         { return $(`//div[@role='dialog']//thead//th[@data-index='7']//*[self::div or self::p][contains(normalize-space(.), 'Description')]`) }
  private get descriptionHeaderCellByIndex()          { return $(`//div[@role='dialog']//thead//th[@data-index='7']`) }
  private get getStatusText()                         { return $(`//span[text()="Status"]`)} 
  private get dimensionSearch()                       { return $(`//div[@data-testid="lui-searchbar"]//input`)}
  private get selectDimensionButton()                 { return $(`//button[@data-testid="plusIcon"]`)}
  private get addDimensionButton()                    { return $(`//button[@data-testid="addDimensions"]`) }
  private get launchDateInput()                       { return $(`//div[@role="presentation"]//input[@placeholder="MM/DD/YYYY"]`)}
  private get cloneMemberCreate()                     { return $(`//div[@role="presentation"]//button[text()="Create"]`)}
  private get cloneMemberCancel()                     { return $(`//div[@role="presentation"]//button[text()="Cancel" and @id="SCA-Modal-dialog-on-secondary-btn"]`)}
  private get noOfCopiesInput()                       { return $(`//div[@role="presentation"]//label[text()="No. of copy"]//parent::div//input`)}
  private get newMemberButton()                       { return $(`//span[@data-testid="newMember"]//input`)}
  private get newIntersectionButton()                 { return $(`//span[@data-testid="newIntersection"]//input`)}
  private get cloneMemberTitle()                      { return $(`//div[@role="presentation"]//h5[text()="Placeholder Creation"]`)}
  private get dimensionTitle()                        { return $$(`//tr[@data-testid="lui-ccl-table-row"]/td//p`)}
  private get ScenarioInODM()                         { return $(`//a[@data-testid="scenarioid"]`)}
  private get getAllScenarios()                       { return $$(`//p[@data-testid='multi-scenario-list']`)}     
  private get dataSyncContentIsVisible()              { return $('//div[@data-testid= "data-sync-content"]')}  
  private get getPortalBYOIcon()                      { return $(`//button[@data-testid='luminate-AIAssistant-icon-button']`)}
  private get getBYOAgentDropdown()                   { return $(`//div[@data-testid='aicopilot-agent-selector-box']//div`)}
  private get getToolTipText()                        { return $(`//p[text()='Context']`)}
  private get showMoreODMButton()                     { return $(`//a[@data-testid='data-sync-more-details-link']`) }
  private get valuePlanningInstanceId()               { return $(`//p[@data-testid='value-planningInstanceId']`)}
  private get showMoreODMClose()                      { return $(`//button[@data-testid='modal-close-button']`)}
  private get relevantFiltersChip()                   { return $(`//button[@data-testid='vf-filterPanel-dimension-LOCATION-attribute-filtering-button']`) }
  private get enableRelevantFilterButton ()           { return $(`//button[@data-testid='vf-filterPanel-dimension-LOCATION-remove-dialog-button-enable']`) }
  private get filterSection()                         { return $(`//div[@data-testid='vf-filterPanel-dimension']`)}
  private get getRecentlyOpenedText()                 { return $(`//p[text()='Recently Opened']`)}
  private get imgListingIcon()                        { return $(`//*[@data-testid='listingIcon']`)} 
  private get getAllProcessButton()                   { return $(`//p[text()='All Processes']`)} 
  private get getContextSwitchItem()                  { return $(`//p[text()='Switch Context']`)} 
  private get getContextSwitchButton()                { return $(`//button[text()='Switch Context']`)} 
  private get getLaunchInNewTabButton()               { return $(`//button[text()='Launch in New Tab']`)} 
  private get getAllDetailsButton()                   { return $(`//button[@data-testid='processDetails']`)} 
  private get getAllRecentlyOpenedEntities()          { return $$(`//p[text()='Recently Opened']/parent::div/following-sibling::div[1]//p`)}
  private get getAssumption()                         { return $('//*[@aria-label="Assumptions"]')}
  private get getBackIcon()                           { return $(`//div[@aria-label="Back"]`)} 
  private get progressBar()                           { return $(`//div[@role='tooltip']//span[@role='progressbar']`)}
  private get globalSaveIcon()                        { return $(`//button[@id='global-save-btn']`)}
  private get getDirtyViewCount()                     { return $(`//button//span[contains(@class,'MuiTypography-caption')]`)}
  private get getPivotCardRevert()                    { return $(`//button[contains(@data-testid,'button-revert-changes-action')]`)}
  private get getObjectiveBar()                       { return $(`//div[@data-testid='objective-bar-lui-carousel-container']`)} 
  private get getPowerbarHistoryIcon()                { return $(`//button[@data-testid="power-bar-history-btn"]`);}
  private get getLatestRunningSCP()                   { return $(`//div[@data-testid="latest-scp-inprogress"]`);}
  private get getProcedureNameInSCPList()             { return $$(`//div[@role='presentation']//p[@data-testid="procedure-name"]`);}
  private get getScenarioNameInSCPList()              { return $$(`//div[@role='presentation']//p[@data-testid="scenario-name"]`);}
  private get getProcedureStatusInSCPList()           { return $$(`(//div[@role='presentation']//div[@data-testid='list-item']/span[1]/*[name()='svg'])`)}
  private get getStatusFilterDropdown()               { return $(`//div[@role='presentation']//button[@data-testid="lui-ccl-status-button-with-dropdown-button"]`);}
  private get getProcedureFilterDropdown()            { return $(`//div[@role='presentation']//button[@data-testid="lui-ccl-procedures-button-with-dropdown-button"]`);}
  private get getBackIconToSCPList()                  { return $(`//div[@role='presentation']//button[@data-testid='back-icon']`); }
  private get getLatestRunningProcedure()             { return $$(`//div[@data-testid="list-item"]`);}
  private get getHistoryCloseIcon()                   { return $(`//div[@role='presentation']//button[@data-testid="close-icon"]`);}
  private get getScenarioNameInDetails()              { return $(`//div[@role='presentation']//p[text()='Scenario']//following::p[1]`);}
  private get getProcedureNameInDetails()             { return $(`//div[@role='presentation']//h4`);}
  private get getHeaderTitle()                        { return $(`//h3[contains(@class,'title')]`)}
  private get toggleDrawerBtn()                       { return $(`//button[@data-testid="toggle-drawer-btn"]`)}
  private get troubleShootIcon()                      { return $(`//button[@data-testid="Troubleshoot"]`)}
  private get restartSessionButton()                  { return $(`//button[@data-testid='data-sync-restart-session']`)}
  private get separator()                             { return $$(`//div[@role ='separator']`)} 
  private get searchComment()                         { return $(`//div[@data-testid='liveblocks-thread-renderer']//input[@placeholder = 'Search']`)}
  private get submit()                                { return $(`//div//button[@aria-label='Submit']`)}
  private get closeViewsPopover()                     { return $(`//button[@data-testid='close-views-popover']`)}

  private titleName(taskName)                                                { return $(`//div/a[text()='${taskName}']`)}
  private getContextValue(contextValue: string)                              { return $(`//span[@data-testid='room-context-tooltip' and contains(text(),'${contextValue}')]`) }
  private rowArrow(sFieldValue:string)                                       {return $(`//div[@data-testid="truncated-cell-tooltip"]/div[text()="${sFieldValue}"]//ancestor::tr//button[@data-testid="icon-button-data-type-column-cell"]`)} 
  private getViewByName(viewName: string)                                    { return $(`//li[@data-testid='child-views']//div//div[2][text()= '${viewName}']`)}
  private getSelectedViewByName(viewName: string)                            { return $(`//li[contains(@class, 'Mui-selected')]//div[contains(text(), '${viewName}')]`)}
  private getHeadingByViewName(viewName: string)                             { return $(`//h2[@class='title' and contains( text(),'${viewName}')]`)}
  private getDrillThroughOptionsAll()                                        { return $$(`//div[@data-testid="lui-ccl-nestedmenu-submenu-container"]//div[text()]`)}
  private getScaOption(procedureName: string)                                { return $(`//span[text()="${procedureName}"]/parent::li`)}
  private getScenarioSelectionDropdown()                                     { return $(`//p[@data-testid='scaContextName']//span[@data-testid='dropArrow']`) }
  private getBaseScenario(scenarioName: string)                              { return $(`//button[@data-testid="treeItemBox" and text()="${scenarioName}"]`)}
  private getExpandBaseScenario(scenarioName: string)                        { return $(`//button[@data-testid="treeItemBox" and text()="${scenarioName}"]/ancestor::li//div[contains(@class,"MuiTreeItem-iconContainer")]//button | //button[@data-testid="treeItemBox" and text()="${scenarioName}"]/ancestor::li//div[contains(@class,"MuiTreeItem-iconContainer")]/*[name()='svg']`)}
  private getChildScenario(childScenarioName: string)                        { return $(`//button[@data-testid="treeItemBox" and text()="${childScenarioName}"]`)}
  private getSaveBtn()                                                       { return $(`//button[@id='confirm-dialog-save-btn']`)}
  private getAlertMsg()                                                      { return $(`//div[@role="alert"]/div[2]`)}
  private getViewEle(dashboardName: string)                                  { return $(`//div[@class='MuiTreeItem-label'][text()='${dashboardName}'][1]`)}
  private getCellEle(value: string)                                          { return $(`//div[text()='${value}'] | //span[text()='${value}']`)}
  private getDrillThroughOptionEle(option: string)                           { return $(`//div[@data-testid="lui-ccl-nestedmenu-submenu-container"]//div[text()='${option}']`)}
  private getSessionRow(sessionName: string)                                 { return $(`//tbody//tr[contains(.,'${sessionName}')]`)}
  private getSessionEle(dataIndex: number)                                   { return $(`//tbody/tr[@data-index='${dataIndex}' and  @data-testid='lui-ccl-table-row']//a`)}
  private getRelatedScenarioEle(dataIndex: number)                           { return $(`//tbody/tr[@data-index='${dataIndex}' and  @data-testid='lui-ccl-table-row']/td[3]`)}
  private getBreadCrumbEle(name: string)                                     { return $(`//nav[@data-testid="luminate-breadcrumbs"]//p[text()='${name}']`)}
  private getLeftPanelIcon(name: string)                                     { return $(`//div[@aria-label='${name}']`)}
  private getContextOptionEle(entityType: entity)                            { return $(`//ul[@role='menu']/li[@value='${entityType}']`)}
  private getSubProcessDropdown(entityType: entity)                          { return $(`//input[@id="${entityType === 'Sub-process' ? 'select-subprocess':'single-select-assumption'}"]`)}
  private getAddCard(item: string)                                           { return $(`//button[contains(text(),'${item}')]`)}
  private getCreateCardBtnByCardName(cardName: string)                       { return $(`//div[@data-testid='lui-dashboard-card-gallery-item-card-title'][text()='${cardName}']`)}
  private getCardTitleFromGallery(cardTitle: string)                         { return $(`//h4[@data-testid="typography-title"][text()='${cardTitle}']`)}
  private getSettingsCard(cardTitle: string)                                 { return $(`//*[text()='${cardTitle}']/ancestor::div[@data-testid='lui-dashboard-card-definition-primary-button']/child::div[2]`);}
  private getSettingsCardByTitle(cardTitle: string)                          { return $(`(//*[text()='${cardTitle}']/ancestor::div[@data-testid='lui-dashboard-card-definition-primary-button']/child::div//button)[1]`)}
  private getRemoveCardByTitle(cardTitle: string)                            { return $(`//h4[@data-testid="typography-title"][text()='${cardTitle}']/ancestor::div[@data-testid='lui-dashboard-card-definition-primary-button']/child::div//button[@data-testid="lui-dashboard-card-definition-menu-remove"]`)}
  private getCardTitleInEditCardActions(cardTitle: string)                   { return $(`//span[@data-testid='lui-dashboard-card-title']//span[text()='${cardTitle}']`)}
  private getCardTitleFromDashboard(cardTitle: string)                       { return $(`//div[@data-testid='lui-dashboard-card-edit-title']//input[@value='${cardTitle}']`)}
  private getCardActionsHeader(title: string)                                { return $(`//*[self::span or self::h2][text()='${title}']`)}
  private getThreeDotsBtnInCard(cardTitle: string)                           { return $(`//span[@data-testid="lui-dashboard-card-definition-card-title"]/span[text()='${cardTitle}']//ancestor :: div[@data-testid="lui-dashboard-card-definition-card"]//button[@data-testid="lui-dashboard-card-definition-more"]`)}
  private getThreeDotsBtnInEditView(cardTitle: string)                       { return $(`//span[@data-testid="lui-dashboard-card-title"]/span[text()='${cardTitle}']//ancestor :: div[@data-testid="lui-dashboard-card-cardHeader"]//button[@aria-label='more']`)}
  private getDeletionSuccessToastForCard(cardTitle: string)                  { return $(`//*[contains(text(),'${cardTitle} is set to be deleted on')]`)}
  private getEditSuccessToastForCard(cardTitle: string)                      { return $(`//*[contains(text(),'${cardTitle} has been updated')]`)}
  private getCardSettingsSuccessToast(cardTitle: string)                     { return $(`//*[contains(text(),'${cardTitle} Card Settings updated')]`)}
  private getAction(option: string)                                          { return $(`//li[@data-testid="sca-actions-dropdown-item"]/span[text()='${option}']`)}
  private getXAxisLabelEleFromMaasChart(cardName: string)                    { return $$(`(//span[@data-testid='lui-dashboard-card-title']//span[normalize-space()='${cardName}']| //span[@data-testid='lui-dashboard-card-title']//input[@value='${cardName}'])/ancestor::div[@data-testid='lui-dashboard-card']//div[contains(@class,"highcharts-container")]/div[contains(@class,"highcharts-axis-labels") and contains(@class,"highcharts-xaxis-labels")]//div[contains(@class,"lui-chart-card-x-axis-wrapper")]`)}
  private getRefreshIconFromBDECard(cardName: string)                        { return $(`//span[@data-testid='lui-dashboard-card-title']//input[@value='${cardName}']//ancestor::div[@data-testid='lui-dashboard-card-cardHeader']//button[@data-testid='refresh-button']`)}    
  private getMinimizeIconFromBDECard(cardName: string)                       { return $(`//span[@data-testid='lui-dashboard-card-title']//input[@value='${cardName}']//ancestor::div[@data-testid='lui-dashboard-card-cardHeader']//button[@aria-label='Minimize Icon Button']`)}
  private getPageViewToggleFromBDECard(cardName: string, labelName: string)  { return $("//span[@data-testid='lui-dashboard-card-title']//input[@value='" + cardName + "']//ancestor::div[@data-testid='lui-dashboard-card-cardHeader']/following-sibling::div//button[@aria-label='" + labelName + "']") }
  private getFilterIconFromBDECard(cardName: string)                         { return $(`//button[@data-testid='toolbar-filter-iconButton']`)}
  private getPaginationEleFromBDECard(cardName: string)                      { return $(`//span[@data-testid='lui-dashboard-card-title']//input[@value='${cardName}']//ancestor::div[@data-testid='lui-dashboard-card']//p[text()='Rows Per Page']`)}
  private getColumnsInTableFromBDECard(cardName: string)                     { return $$(`//span[@data-testid='lui-dashboard-card-title']//input[@value='${cardName}']//ancestor::div[@data-testid='lui-dashboard-card']//thead/tr[@data-testid='tableHeader']/th`)}
  private getFilterInputFromBDECard(cardName: string, dataColIndex: number)  { return $(`//span[@data-testid='lui-dashboard-card-title']//input[@value='${cardName}']//ancestor::div[@data-testid='lui-dashboard-card']//thead/tr[@data-testid='tableFilter']/th[@data-col-idx='${dataColIndex}']//input[@placeholder='Filter']`)}
  private getAllCardsInView()                                                { return $$(`//div[@data-testid="lui-dashboard-card-cardHeader"]//span/span`)}
  private getcardText(cardTitle: string)                                     { return $(`//span[@data-testid='lui-dashboard-card-title']//span[contains(text(),'${cardTitle}')] | //span[@data-testid='lui-dashboard-card-title']//input[@value='${cardTitle}']`)}
  private getdots(cardTitle: string)                                         { return $(`//span[@data-testid='lui-dashboard-card-title']/span[text()='${cardTitle}']//ancestor::div[@data-testid='lui-dashboard-card-cardHeader']//button[@data-testid='lui-dashboard-card-menu-button']`)}
  private settingsItemInEditViewWithIndex(index: number)                     { return $$(`//ul[@role='menu']//li[@data-testid='lui-dashboard-card-settings-button']`)[index];}
  private getGraphByCardTitle(cardTitle: string)                             { return $(`//span[@data-testid="lui-dashboard-card-title"]//input[@value="${cardTitle}"]//ancestor::div[@data-testid="lui-dashboard-card"]`)}
  private getNoDataCard(cardTitle:string)                                    { return $(`//span[@data-testid="lui-dashboard-card-title"]//input[@value="${cardTitle}"]//ancestor::div[@data-testid="lui-dashboard-card"]//h2[text()="It’s empty here"]`)}
  private getViewType(viewType)                                              { return $(`//div[@id='select-menu-select-views']//li[@aria-label='${viewType}']`)}
  private getSomethingWentWrongCard(cardTitle: string)                       { return $(`//span[@data-testid="lui-dashboard-card-title"]//input[@value="${cardTitle}"]//ancestor::div[@data-testid="lui-dashboard-card"]//h2[text()="Unable to load data"]`)}
  private getactionOption(valueName:string)                                  { return $(`//ul/li[@data-testid='lui-card-configuration-subscription-setting-event-selection-option'][@value="${valueName}"]`)}
  private selectChartTypeDropdown()                                          { return $(`//div[@data-testid='lui-dashboard-chartType-select']`)}
  private setChartTypeValue()                                                { return $(`//li[@data-testid='lui-dashboard-chartType-bullet']`)}
  private getPieChartCardCell(sFieldValue: string)                           { return $(`//*[name()='path' and @data-testid='${sFieldValue}']`)}
  private dataSyncStatus(status: string)                                     { return $(`//*[@data-testid='data-sync-status-icon-${status}']`) }
  private dataSyncStatusMessage(expectedMessage: string)                     { return $(`//h6[@data-testid='data-sync-status-message' and contains(text(), '${expectedMessage}')]`);}
  private getInputField(labelName: string)                                   { return $(`//div[@role = 'presentation']//label[.//div[contains(text(), '${labelName}')]]/following-sibling::div//input`)}
  private getdropdownField(labelName: string)                                { return $(`//div[@role="presentation"]//div[text()="${labelName}"]//ancestor::label//following-sibling::div`)}
  private getCalendarIcon(labelName: string)                                 { return $(`//div[@role="presentation"]//label//div[text()="${labelName}"]//ancestor::div[contains(@class,"MuiFormControl-root")]//button[contains(@aria-label,"Choose date")]`)}
  private getMyTaskRowTitleDiv(cardTitle: string, rowTitle: myTaskRowTitle)  { return $(`//div[@data-testid='lui-dashboard-card' and .//input[@value="${cardTitle}"]]//tr[@data-testid='enhanced-table-card-row']//div[text()="${rowTitle}"] `)}
  private myTaskCardRows(cardTitle: string)                                  { return $(`//div[@data-testid="lui-dashboard-card-cardHeader"]//span[text()="${cardTitle}"]//ancestor::div[@data-testid="lui-dashboard-card"]//tr[@data-testid="enhanced-table-card-row"]`)}
  private myTaskCardRowsafterSave(cardTitle: string)                         { return $$(`//div[@data-testid='lui-dashboard-card' and .//input[@value="${cardTitle}"]]//tr[@data-testid='enhanced-table-card-row']`);}
  private invalidDataSCCard(cardTitle: string)                               { return $(`//span[@data-testid="lui-dashboard-card-title"]//input[@value="${cardTitle}"]//ancestor::div[@data-testid="lui-dashboard-card"]//p[text()="No column definitions or row data found. Please ensure that your data source is correctly provided and that the necessary configurations (columns and data) are defined."]`)}
  private getSCGraph(cardTitle: string)                                      { return $(`//span[@data-testid="lui-dashboard-card-title"]//input[@value="${cardTitle}"]//ancestor::div[@data-testid="lui-dashboard-card"]//div[@data-testid='scenario-comparison-card']`)}
  private noDataAvailable()                                                  { return $(`//h2[@data-testid="lui-ccl-empty-state-heading"]`)}
  private noDataToDisplayNpiCard(cardTitle: string)                          { return $(`//div[@data-testid='lui-dashboard-card-edit-title' and @data-value='${cardTitle}']/following::p[text()='No records are available for display.']`)}
  private getEditIconByCardTitle(cardTitle: string)                          { return $(`//span[@data-testid='lui-dashboard-card-title']//input[@value='${cardTitle}']/ancestor::div[contains(@class,'MuiBox-root')]//button[@data-testid='lui-dashboard-card-edit-start-button']`)}  
  private getCardEditButtonByTitle(cardTitle: string)                        { return $(`//span[normalize-space(text())='${cardTitle}']/ancestor::div[contains(@class,'MuiCardHeader-root')]//button[@data-testid='lui-dashboard-card-edit-start-button']`); }
  private getCardEditButtonInputByTitle(cardTitle: string)                   { return $(`//input[@value='${cardTitle}']/ancestor::div[contains(@class,'MuiCardHeader-root')]//button[@data-testid='lui-dashboard-card-edit-start-button']`); }
  private getCancelButton()                                                  { return $(`//button[@data-testid='lui-dashboard-card-edit-cancel-button']`)};
  private getSaveButton()                                                    { return $(`//button[@data-testid='lui-dashboard-card-edit-save-button']`)};
  private discardButton()                                                    { return $(`//button[@data-testid='table-edit-confirm-cancel']`)};
  private getChipCellLink()                                                  { return $(`//a[@data-testid='chips-type-cell-link-text']`)};
  private getChipsPopup()                                                    { return $(`//div[@data-testid='chip-list-popup-content']`)};
  private viewsDropDown()                                                    { return $(`//button[@data-testid='views-dropdown' and not(@disabled) and contains(@class,'MuiIconButton-root')]`)}
  private getEntityChip(entity: string)                                      { return $(`//button[@data-testid = 'entityName-undefined']`)}
  private getMultiSelectDropdown(dimensionName: string)                      { return $(`//span[text()='Select ${dimensionName.toUpperCase()}']/ancestor::div[@data-testid="lui-ccl-card-cardHeader"]/parent::div//div[@data-testid="tree-select-multi"]/button`)} 
  private getNodeAccordion(nodeName: string)                                 { return $(`//button/*[name()='svg' and @data-testid="arrow-down-icon-${nodeName}"]`)}
  private getNodeAccordionInMultiSelect(nodeName: string)                    { return $(`//p[contains(text(),"${nodeName}")]//ancestor::label/preceding-sibling::button`)}
  private getNodeOption(nodeName: string)                                    { return $(`//p[contains(text(),"${nodeName}")]`)}
  private getRadioButton(dimensionName: string,mode : ICreatePlaceholderMode){ return $(`//span[text()='Select ${dimensionName}']/ancestor::div[@data-testid="lui-ccl-card"]//span[@data-testid="location-${mode}"]`)}
  private getPlaceholderType(placeholderType: "Member" | "Intersection")     { return $(`//button[text()='${placeholderType}']`)}
  private getDimensionsFromFlyout()                                          { return $$(`//*[@data-testid="lui-ccl-card-title"]//span`)}
  private getViewEleWithViewGroup(viewGroupName: string, viewName: string)   { return $(`//div[@class="MuiTreeItem-label" and contains(text(),"${viewGroupName}")]//ancestor::li//div[@class="MuiTreeItem-label" and contains(text(),"${viewName}")]`)}
  private getDashboardThreeDotBtn(header: number)                            { return $(`//div[contains(@class,"more-btn${header === 1 ? "": "-2"}")]//button[@data-testid='lui-ccl-threedot-menu-icon-button']`)}
  private viewGroupOpened(viewGroup: string)                                 { return $(`//div[@class="MuiTreeItem-label" and contains(text(),"${viewGroup}")]//ancestor::li[@aria-expanded='true']`)}
  private getViewGroup(viewGroup: string)                                    { return $(`//div[@class="MuiTreeItem-label" and text()="${viewGroup}"]//ancestor::li`)}
  private getScopeTab()                                                      { return $(`//div[@role='tablist']/button[@role='tab'][contains(text(), 'Scope')]`)}
  private getSideNavTitle(titleName: string)                                 { return $(`//h3[@data-testid='side-nav-title' and text()='${titleName}']`)}
  private getGlobalChip()                                                    { return $(`//div[@data-testid='scope-chip-btn']`)}
  private getScenariosTab()                                                  { return $(`//div[@role='tablist']/button[@role='tab'][contains(text(), 'Scenario')]`)}
  private get4mProcesslist()                                                 { return $("//table//tbody//tr[td[1]/a[contains(text(),'PSAutomation')]]/td[1]/a")}
  private selectDimesionCheckboxDiv(dimension: string)                       { return $(`//li//span[text()="${dimension}"]//ancestor::div[contains(@role,"checkbox")]//input`)}
  private dimensionInput(dimension: string, attribute: keyof typeof DimensionAttributes) { return $$(`//tr[@data-testid="lui-ccl-table-row"]//p[text()="${dimension}"]//ancestor::tr//input[@placeholder="${DimensionAttributes[attribute]}"]`)}
  private targetValueDimensionInput(dimension: string)                       { return $(`//tr[@data-testid="lui-ccl-table-row"]//p[text()="${dimension}"]//ancestor::tr//textarea[@placeholder="Comma-separated values"]`)}
  private deleteDimensionButton(dimension: string)                           { return $(`//tr[@data-testid="lui-ccl-table-row"]//p[text()="${dimension}"]//ancestor::tr//button[@data-testid="deleteDimension"]`)}
  private getBDECardElement(cardName: string)                                { return $(`//input[@value="${cardName}"]`)}                             
  private getEntityName(entity : string)                                     { return $(`//div[@role="tooltip"]//button[text()='${entity}']`)}  
  private getProcessNameText(entity : string)                                { return $(`//h2[@data-testid='app-header-block-title']//*[text()='${entity}'] | //h2[@data-testid='app-header-block-title'][text()='${entity}']`)}
  private getCycleName(entity : string)                                      { return $(`//span[text()='${entity}']/following-sibling::p`)}
  private getRecentlyOpenedProcess(order : number)                           { return $ (`(//p[text()='Recently Opened']/parent::div/following-sibling::div//p)[${order}]`)}
  private getOption(option: string)                                          { return $(`//span[normalize-space(text())='${option}']`)}
  private getSCRow(scenarioName: string)                                     { return $(`//tr[@data-testid="scenario-table-row"]/td[1]//p[text()="${scenarioName}"]`)}
  private get scenarioChipByName()                                           { return (scenarioName: string) => $(`//div[@data-testid="lui-ccl-chip"]//p[@aria-label="${scenarioName}"]`)}
  private getDockArea()                                                      { return $(`//div[@data-testid='command-bar-bottom-display-area']`)}
  private getDockSearchButton()                                              { return $(`//button[@data-testid='command-bar-bottom-display-area']`)};
  private selectProcessContext(process)                                      { return $(`(//h4[text()='Processes']/following-sibling::div[1]//p[text()="${process}"])`)}
  private selectContextEntity(entity)                                        { return $(`(//div[@role='group']/parent::div/following-sibling::div[1]//p[text()="${entity}"])`)}
  private selectChildProcess()                                               { return $(`//p[text()="Child Processes"]/parent::button`)}
  private selectAssumptions()                                                { return $(`//p[text()="Assumptions"]/parent::button`)}
  public  sideNavClose()                                                     { return $(`//div[@data-testid="CloseIcon"]`)}
  public  externalLinkOpen()                                                 { return $(`//button[@data-testid="external-link-btn"]`)}
  private getViewByNameInSideNav(viewName: string)                           { return $(`//li[@data-testid='child-views'][.//div[text()='${viewName}']]`)};
  private getvfAttributeValuesFromScopeTab(attribute: string)                { return $$(`//div[@data-testid='vf-filterPanel-property-${attribute}-content-box']//ul//li`)}
  private getDirtyViewNameInSideNav(viewName: string)                        { return $(`//li[@data-testid='child-views'][.//div[text()='${viewName} *']]`)}
  private getDirtyStatePopupButton(buttonName: string)                       { return $(`//button[normalize-space(text())='${buttonName}']`)};
  private getBYOAgentOption(agentName: string)                               { return $(`//li[@data-testid='aicopilot-agent-selector-option' and @aria-label='${agentName}']`)}
  private getBYOAgentEvent(eventName: string)                                { return $(`//div[@data-testid='lui-ccl-empty-state-actions']//button[contains(text(), '${eventName}')]`)}
  private setStatusFilterValue(status: string)                               { return $(`//div[@data-testid="lui-ccl-status-button-with-dropdown-menu"]//span[text()='${status}']`)}
  private setProcedureFilterValue(procedure: string)                         { return $(`//div[@data-testid="lui-ccl-procedures-button-with-dropdown-menu"]//span[text()='${procedure}']`)}
  private getViewName(view : string)                                         { return $(`//li[@data-testid='child-views']//div[text()='${view}']`)} 
  private getOverRidePopupCloseIcon()                                        { return $(`//button[@aria-label="Close Icon Button"]`)}
  private pivotCardRefreshIcon()                                             { return $(`//button[contains(@data-testid, 'maas-pivot-card') and contains(@data-testid, 'refresh-action')]`)}
  private getEllipsesInOverridePopup()                                       { return $(`//p[normalize-space(text())=".."]`); }
  private clickOnBreadcrumbLink(viewName: string)                            { return $(`//p[text()= '${viewName}']`); }
  private getBreadCrumbElements()                                            { return $$(`//div[@class="MuiBox-root css-zm0l9g"]`); }
  private getCommentActionOption(action: ICommentAction | IThreadAction)     { return $(`//div[@role='menuitem']//span[text()='${action}']`)}
  private getCommentActionsThreeDots(comment: string)                        { return $(`//div[contains(@class,'lb-root lb-comment')]
      [.//div[contains(@class,'lb-comment-body')]//*[contains(normalize-space(.), "${comment}")]]
      //button[contains(@class,'lb-comment-action')]`);}
  private getFilterValue(value: string)                                       { return $(`//div[@data-testid='qf-filter-panel-chip']//span[text()='${value}']`)}
  private getComment(comment: string)                                         { return $(`//div[@data-testid='liveblocks-thread-renderer']//span[contains(normalize-space(text()),'${comment}')]`)}
  private moreButtonOfComment(comment: string)                                { return $(`//div[@data-testid='liveblocks-thread-renderer']//div[.//span[contains(normalize-space(text()),'${comment}')]]//button[@data-testid='more-actions-btn']`)}
  private getActionOnComment(action: string)                                  { return $(`//li[@role='menuitem']//span[text()='${action}']`)}
  private get clickPowerBarLinkSettingsIcon()                                 { return $(`//div[@data-testid='IBPToolTip-Settings']//button[@data-testid='nav-settings']`);}
  private get threedotIconOfSideNav()                                         { return $(`//span[@data-testid='more']`);}
  private getListItems(ListName: string)                                      { return $$(`//div[@data-testid='list-item']//p[normalize-space()='${ListName}']`);}
  private getliveblocksAvatarGroup()                                          { return $("[data-testid='lui-ccl-avatar-group']"); }
  private getliveblocksAvatars()                                              { return $$('[data-testid="lui-ccl-avatarbadge-avatar"]'); }
  private getCardThreeDotMenuOfCard(cardTitle: string)                        { return $(`//*[text()='${cardTitle}']/ancestor::div[contains(@class,'card')]//button[@data-testid='lui-dashboard-card-menu-button']`); }
  private getCardMenuOption(option: string)                                   { return $(`//li[.//p[contains(text(),'${option}')]]`); }
  private get goToCardConfiguration()                                         { return $(`//button[contains(text(),'Card Configuration')]`); }
  private getSelectPredefinedEndpoint(optionName: string)                     { return $(`//span[text()='${optionName}']`); } 
  private get applyBtnInCardConfiguration()                                   { return $(`//button[@data-testid='lui-dashboard-card-admin-settings-confirm-button']`); }
  private get cancelBtnInCardConfiguration()                                  { return $(`//button[@data-testid='lui-dashboard-card-admin-settings-cancel-button']`); }
  private getRunDifferentBtn(BtnName: string)                                 { return $(`//div[@data-testid='error-action-links']//p[contains(text(),'${BtnName}')]`); }
  private get setFiltersToGetStartedText()                                    { return $(`//h2[contains(text(),'Set filters to get started')]`); }
  private get configureBtn()                                                  { return $(`//button[@data-testid="filterConfigure-button"]`); }

  public async clickDashBoard(dashboardName: string) {
    await browser.pause(5000);
    const clickDashboardLogic = async () => {
      if(await this.isSideDrawerClosed()){
        await this.openSideNav();
      }
      await CommonFunctions.logMessage("INFO", "Clicking Search View Button");
      const elesearch = await this.searchIconBtn;
      await elesearch.waitForDisplayed({ timeout: 150000 });
      await elesearch.waitForClickable({ timeout: 150000 });
      await elesearch.click();
      await browser.pause(5000);
      await CommonFunctions.logMessage("INFO", "Entering View Name in the Search box");
      const elesearch1 = await this.searchInputEle;
      await elesearch1.waitForClickable({ timeout: 100000 });
      await elesearch1.click();
      await elesearch1.setValue(dashboardName);
      await browser.pause(5000);
      await CommonFunctions.logMessage("INFO", "Clicking Dashboard or View Name:: " + dashboardName);
      const demanddash = await this.getViewEle(dashboardName);
      await demanddash.waitForClickable({ timeout: 100000 });
      await demanddash.click();
    };
    try {
      await clickDashboardLogic();
    } catch (e) {
      await CommonFunctions.logMessage("ERROR", e);
      await CommonFunctions.logMessage("ERROR", "Initial attempt failed, retrying...");
      await browser.refresh();
      await browser.pause(10000);
      await this.switchToMFEFrame();
      await clickDashboardLogic();
    }
    return true;
  }

  public async isLiveblocksAvatarGroupDisplayed(isFrame: boolean = true): Promise<boolean> {
    if (isFrame) { await this.switchToMFEFrame(); }
    return await this.getliveblocksAvatarGroup().isDisplayed();
  }

  public async getLiveblocksAvatarCount(isFrame: boolean = true): Promise<number> {
    if (isFrame) { await this.switchToMFEFrame(); }
    await this.getliveblocksAvatarGroup().waitForDisplayed({ timeout: 120000 });
    return (await this.getliveblocksAvatars()).length;
  }

  public async getLiveblocksAvatarLabels(isFrame: boolean = true): Promise<string[]> {
    if (isFrame) { await this.switchToMFEFrame(); }
    await this.getliveblocksAvatarGroup().waitForDisplayed({ timeout: 120000 });
    const avatars = await this.getliveblocksAvatars();
    return Promise.all(avatars.map(async (a) => (await a.getAttribute('aria-label')) || ''));
  }

  public async clickManageScenarios() {
    await this.doClick(this.btnManageScenarios, "Clicking Manage Scenarios button");
  }

  public async closeManageScenarios() {
    await this.btnCloseManageScenarios.waitForDisplayed({ timeout: 60000 });
    await this.doClick(await this.btnCloseManageScenarios, "Clicking on Close Manage Scenarios button");
  }

  public async goToManageScenarios() {
    await scope.clickOnTab('Scenarios');
    await this.clickManageScenarios();
  }

  public async isViewAlreadyFavourite(width: number): Promise<boolean> {
      if(width <= 960) {
        return this.doesElementExist(await this.removeFavouriteIcon,"Remove from Favourites Icon");
      }
      else{
        await this.click3dotIconOnDashboard();
        return await this.doesElementExist(await this.getOption("Remove from Favorites"),"Remove from Favorites Action");
      }
}
  public async addViewToFavourites(sView: string) {
    await this.clickDashBoard(sView);
    const gridHeaderWidth = await SCAPage.getGridHeaderWidth();
    if(await this.isViewAlreadyFavourite(gridHeaderWidth)) {
      await CommonFunctions.logMessage("INFO", "View is already a favourite, skipping below steps.");
      await browser.keys("Escape");
      return;
    }
    if (gridHeaderWidth <= 960) {
      const btnAddfavorite = await this.favouriteIconInView;
      await btnAddfavorite.waitForClickable({ timeout: 60000 });
      await this.doClick(btnAddfavorite, "Clicking on Favourite Icon in View");
    }
    else {
      await this.selectOptionFrom3dotIconOnDashboard("Add to Favorites");
    }
    await browser.pause(2000);
  }
  public async removeViewToFavourites(sView: string) {
    await this.clickDashBoard(sView);
    await CommonFunctions.logMessage("INFO", "UnChecking Favourite Icon");
    const gridHeaderWidth = await SCAPage.getGridHeaderWidth();
    if (gridHeaderWidth <= 960) {
      const btnAddfavorite = await this.favouriteIconInView;
      await btnAddfavorite.waitForClickable({ timeout: 60000 });
      await this.doClick(btnAddfavorite, "Clicking on remove Favourite Icon in View");
    }
    else {
      await this.click3dotIconOnDashboard();
      await this.selectOptionFrom3dotIconOnDashboard("Remove from Favorites");
    }
    await browser.pause(2000);
  }


  public async selectViewsFromPlanning(viewName: string) {
    const DashboardView = await this.getViewEle(viewName);
    await DashboardView.waitForDisplayed({ timeout: 60000 });
    await DashboardView.waitForClickable({ timeout: 60000 });
    await this.doClickUsingScript(DashboardView, `Clicking on Dashboard or View Name: ${viewName}`);
  }

   public async getProceduresFromDropdown(procedureName: string): Promise<string[]> {
    const menuDropdown = this.scaDropdown;
    const isDropdownExists = await menuDropdown.isExisting();
    if (isDropdownExists) {
      await this.doClick(menuDropdown, 'Clicked on SCA dropdown to get procedures');
      const dropdownItem = await this.getAction(procedureName);
      const procedures: string[] = [];
      if (await dropdownItem.isExisting()) {
        procedures.push(await dropdownItem.getText());
      }
      await browser.keys('Escape');
      return procedures;
    } else {
      await CommonFunctions.logMessage('INFO', 'SCA dropdown does not exist.');
      await browser.keys('Escape');
      return [];
    }
  }

  public async selectFavourites() {
    // await this.searchViewGoBack();
    await this.selectAllViewsOrFavourites("Favourites")
  }

  public async selectAllViewsOrFavourites(sViewType: string, switchToFrame: boolean = false) {
    if (switchToFrame) { await this.switchToMfe() };
    try {
      await this.selectViewTypesDropDown();
      await this.selectViewType(sViewType);
    }
    catch (e) {
      await CommonFunctions.logMessage("INFO", "Trying Again!");
      await this.selectViewTypesDropDown();
      await this.selectViewType(sViewType);
    }
  }

  public async selectViewTypesDropDown() {
    await this.slctViewsdd.waitForDisplayed({ timeout: 60000 });
    await this.doClick(await this.slctViewsdd, "Clicking Select Views Dropdown");
    await browser.pause(2000);
  }

  public async selectViewType(sViewType: string) {
    const ddOption = await $("//span[text()='" + sViewType + "']");
    await ddOption.waitForDisplayed({ timeout: 60000 });
    await this.doClick(await ddOption, "Selecting View Type:: " + sViewType);
    await browser.pause(2000);
  }

  public async getAllViewTypes(switchToFrame: boolean = false) {
    if (switchToFrame) { await this.switchToMfe() };
    await this.selectViewTypesDropDown();
    let arrViewTypes: string[] = [];
    for (let i = 0; i < await this.getViewsdd.length; i++) {
      let viewType: string = await this.doGetText(await this.getViewsdd[i], "Fetching View Type: " + i);
      await CommonFunctions.logMessage("INFO", "View Type: " + viewType);
      arrViewTypes.push(viewType);
    }
    await CommonFunctions.logMessage("INFO", "All View Types in the Dropdown: " + arrViewTypes);
    return arrViewTypes;
  }

  public async clickViewsDropDown() {
    try{
      await this.viewsDropDown().waitForDisplayed({ timeout: 60000 });
      await this.doClick(await this.viewsDropDown(), "Clicked on views drop down");
    }
    catch(e){
      await CommonFunctions.logMessage("INFO", "Retrying to click on views drop down");
      await this.viewsDropDown().waitForDisplayed({ timeout: 60000 });
      await this.doClick(await this.viewsDropDown(), "Clicked on views drop down");
    }
    return true;
  }

  public async closeViewsDropdown() {
    try {
      this.doClick(await this.closeViewsPopover, "Closed views popover");
    } catch(e) {
      await CommonFunctions.logMessage("INFO", "Views popover is not opened");
    }
  }

  public async navigateToSourceView(sourceViewName: string): Promise<boolean> {
    try {
        await this.clickViewsDropDown();
        await browser.pause(2000);
        await this.clickDashBoard(sourceViewName);
        await browser.pause(5000);
        return true;
    } catch (error) {
        console.error('Error navigating back to source view:', error);
        return false;
    }
}

  public async isFavouriteIconDisplayed(){
    const element = await this.favouriteIcon;
    await CommonFunctions.logMessage("INFO", "Checking for favourite icon")
    return await element.isDisplayed();
  }

  public async clickOnChildviews(){
    const view = await this.childViews;
    await CommonFunctions.logMessage("INFO", "Clicking on first view from selected views dropdown")
    await view.click();
  }

  public async getViewNameText(){
    const viewName = await this.viewName;
    await CommonFunctions.logMessage("INFO", `Getting the view name: ${await viewName.getText()}`)
    return await viewName.getText();
  }

  public async validateSideNavThreeDotsMenu(){
    const threeDotsBtn = await this.threedotIconOfSideNav;
    await CommonFunctions.logMessage("INFO", "Clicking on three dots button in side nav");
    await threeDotsBtn.waitForExist({ timeout: 90000 });
    await this.doClick(threeDotsBtn, "Clicking on three dots button in side nav");
    const menuOptions = ['Process Settings', 'CBP Observability', 'BYDM Workbench', 'MaaS Command Center'];
    for(const option of menuOptions){
      const actionOptions = await this.getListItems(option);
      const isOptionExist = await this.doesElementExist(actionOptions[0], `Checking if option ${option} exists under three dot menu`);
      if(!isOptionExist){
        return false;
      }
    }
    return true;
  }

  public async validatePowerBarSettingsIcon(){
    const settingsIcon = await this.clickPowerBarLinkSettingsIcon;
    await settingsIcon.waitForExist({ timeout: 90000 });
    await settingsIcon.waitForClickable({ timeout: 30000 });      
    await this.doClick(settingsIcon, "Clicking on settings icon in power bar");
    const menuOptions = ['Process Settings', 'Cognitive Model'];
    for(const option of menuOptions){
      const actionOptions = await this.getListItems(option);
      const isOptionExist = await this.doesElementExist(actionOptions[0], `Checking if option ${option} exists under settings menu`);
      if(!isOptionExist){
        return false;
       }
    }
    return true;
  } 

  public async isProcessChipCorrect(text: string): Promise<boolean> {
    await CommonFunctions.logMessage('INFO', `Validating process name from powerbar`);
    const processName = await this.getLaunchedProcessFromPowerbar();
    if (typeof processName === 'string') {
      const bValidation1 = processName.includes(text);
      await CommonFunctions.logMessage('INFO', `Process name validation: Expected '${text}', Found '${processName}', Result: ${bValidation1}`);
      return bValidation1;
    }
    await CommonFunctions.logMessage('ERROR', `Failed to get process name from powerbar`);
    return false;
  }

  public async clickBackHiddenView(){
    const backBtn = await this.backBtnHiddenView;
    try {
      await this.switchToMfe();
      await backBtn.waitForClickable({ timeout: 90000 });
      await CommonFunctions.logMessage(
        "INFO",
        "Clicking on back button (normal click)"
      );
      await backBtn.click();
      await this.switchToMFEFrame();
      return true;
    } catch (e) {
      await CommonFunctions.logMessage("INFO", "Normal click failed, trying JS click: " + e);

      try {
        await browser.execute("arguments[0].click();", backBtn);
        await CommonFunctions.logMessage("INFO", "Clicked on back button via JS");
        return true;
      } catch (err) {
        await CommonFunctions.logMessage("INFO", "Unable to click on back button even via JS: " + err);
        return false;
      }
    }
  }

 
  public async searchViewGoBack() {
    await CommonFunctions.logMessage("INFO", "Clicking back button in Search View box");
    const btnGoBack = await $(`//button[@aria-label='search-views']`);
    await btnGoBack.waitForDisplayed({ timeout: 100000 });
    await btnGoBack.click();
    await browser.pause(2000);
  }

  public async performRightClickOnCardFieldValue(sFieldValue: string) {
    await browser.pause(10000);
    await CommonFunctions.logMessage('INFO',`Right clicking on cell ${sFieldValue}`)
    const lblFieldValue = await this.getCellEle(sFieldValue);
    await lblFieldValue.scrollIntoView();
    await lblFieldValue.waitForClickable({timeout: 90000});
    await lblFieldValue.click({ button: 'right' });
    await CommonFunctions.logMessage('INFO',`Performed Right Click On :: ${sFieldValue}`);
    return true;
  }

  public async checkMergeScopeLogic(context, workflowFilters){
    await browser.pause(5000);
    let isValueExist: boolean = false;
    try {
      const lblFieldValue = await this.getCellEle(workflowFilters.VALUES[0]);
      await lblFieldValue.waitForExist({ timeout: 10000 });
      isValueExist = await lblFieldValue.isExisting();
    } catch (e) {
      await CommonFunctions.logMessage('INFO', `Element for ${workflowFilters.ATTRIBUTE_NAME} not found or stale, retrying...`);
      const lblFieldValue = await this.getCellEle(workflowFilters.VALUES[0]);
      isValueExist = await this.doesElementExist(lblFieldValue, `Retry: Checking if dimension level ${workflowFilters.ATTRIBUTE_NAME} exists`);
    }
    if(context.DIMENSION_NAME && context.DIMENSION_NAME!== workflowFilters.DIMENSION_NAME) {
      let isValueExist1: boolean = false;
      try {
        const lblFieldValue1 = context.VALUES && await this.getCellEle(context.VALUES[0]);
        if (lblFieldValue1) {
          await lblFieldValue1.waitForExist({ timeout: 10000 });
          isValueExist1 = await lblFieldValue1.isExisting();
        }
      } catch (e) {
        await CommonFunctions.logMessage('INFO', `Element for ${context.ATTRIBUTE_NAME} not found or stale, retrying...`);
        const lblFieldValue1 = context.VALUES && await this.getCellEle(context.VALUES[0]);
        isValueExist1 = lblFieldValue1 && await this.doesElementExist(lblFieldValue1, `Retry: Checking if dimension level ${context.ATTRIBUTE_NAME} exists`);
      }
      if(!isValueExist1) {
        return false;
      }
    }
    return isValueExist;
  }

  public async performRightClickOnCardCell(cardType: ICardType, identifier: string) {
    await browser.pause(10000);
    await CommonFunctions.logMessage('INFO', `Performing right click on card cell: ${identifier} for card type: ${cardType}`)
    let cell;
    switch(cardType) {
      case 'PieChart': 
        cell = await this.getPieChartCardCell(identifier);
        break;
      case 'PivotCard':
        cell = await this.getCellEle(identifier);
        await cell.scrollIntoView();
        await browser.pause(4000);
        break;
      default : await CommonFunctions.logMessage('INFO', `Invalid card type:: ${cardType}`);
    }
    await CommonFunctions.logMessage('INFO', `is cell exsting:: ${await cell.isExisting()}`)
    await cell.moveTo();
    await cell.click({ button: 'right' });
    await CommonFunctions.logMessage('INFO',`Performed Right Click On :: ${identifier}`);
    return true;
  }

  public async editCardCell(cardType: ICardType, cardName: string, identifier: string = '', updatedValue:string=''): Promise<boolean> {
      let result: boolean = false;
      const editIcon = await this.getCardEditButtonInputByTitle(cardName);
      if (cardType === 'Enhanced Table') {
        await this.waitUntilCardLoaded(cardName);
        await browser.pause(1000);
        await this.editCardAndVerifyButtons(cardName, editIcon);
        await this.makeCellsEditableAndSetValue();
        result = true;
      }
      else {
        await browser.pause(10000);
        const card = await $(`//div[@data-testid='lui-dashboard-card' and .//input[@value ='${cardName}']]`);
        await card.scrollIntoView();
        await card.waitForDisplayed();
        await this.performRightClickOnCardCell(cardType, identifier);
        const changeTo = await this.changeToOption;
        await this.doClick(changeTo, "Clicking on Change To Option");
        const input = await $(`//input[@placeholder="Enter Value"]`);
        await this.doEnterText(input, updatedValue, "Entering value in input field");
        const saveButton = await $(`//button[@data-testid="editrange-save-btn" and @aria-label="Edit Range Save"]`);
        await this.doClick(saveButton, "Clicking on Save Button");
        result = true;
      }
      return result;
  }


  public async performCardCellMoreActions(cardType: ICardType, cellId: string, moreActionsOption: string) {
    await this.performRightClickOnCardCell(cardType, cellId);
    const moreActions = await this.moreActionsOption;
    await moreActions.waitForExist({timeout:90000})
    await CommonFunctions.logMessage('INFO', `More Actions Field Displays :: ${await moreActions.isExisting()}`)
    await moreActions.scrollIntoView(); 
    await browser.pause(10000)
    await CommonFunctions.logMessage("INFO", "Mouse Hovering On More Actions")
    await browser.execute(async (elem) => {
      //Hovering Mouse pointer on Drill Through
      elem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    }, moreActions); 
    await browser.pause(5000)   
    const option = await this.getDrillThroughOptionEle(moreActionsOption)
    await CommonFunctions.logMessage('INFO', ` ${option} field displayed :: ${await option.isExisting()}`)
    await CommonFunctions.logMessage('INFO',`Clicking Dropdown Option :: ${option}`)
    await option.waitForClickable({timeout:90000})
    await browser.execute((elem) => {
      elem.click();
    }, option);
    return true;
  }

  public async performDrillThroughOnCardField(sFieldValue: string, sDrillThroughOption: string) {
    await browser.pause(5000);
    await this.performRightClickOnCardFieldValue(sFieldValue);
    const ddDrillThrough = await this.drillThroughEle;
    await ddDrillThrough.waitForExist({timeout:90000})
    await CommonFunctions.logMessage('INFO', `Drill Through Field Displays :: ${await ddDrillThrough.isExisting()}`)
    await ddDrillThrough.scrollIntoView(); //Scrolling to Drill Through dropdown
    await CommonFunctions.logMessage('INFO', `Mouse Hovering On the Card Field Value :: ${ddDrillThrough}`)
    await browser.pause(10000)
    await CommonFunctions.logMessage("INFO", "Mouse Hovering On Drill Through")
    await browser.execute(async (elem) => {
      //Hovering Mouse pointer on Drill Through
      elem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    }, ddDrillThrough); 
    await browser.pause(5000)   
    const ddInteractive = await this.getDrillThroughOptionEle(sDrillThroughOption)
    await CommonFunctions.logMessage('INFO', ` ${sDrillThroughOption} field displayed :: ${await ddInteractive.isExisting()}`)
    await CommonFunctions.logMessage('INFO',`Clicking Dropdown Option :: ${sDrillThroughOption}`)
    await ddInteractive.waitForClickable({timeout:90000})
    await browser.execute((elem) => {
      elem.click();
    }, ddInteractive);
    return true;
  }

  public async getTargetDrillThroughOptionsOnField(sFieldValue: string) {
    await this.performRightClickOnCardFieldValue(sFieldValue);
    const ddDrillThrough = await this.drillThroughEle;
    await ddDrillThrough.waitForExist({timeout:90000})
    await CommonFunctions.logMessage('INFO', `Drill Through Field Displays :: ${await ddDrillThrough.isExisting()}`)
    await ddDrillThrough.scrollIntoView(); //Scrolling to Drill Through dropdown
    await browser.pause(10000)
    await CommonFunctions.logMessage("INFO", "Mouse Hovering On Drill Through")
    await browser.execute(async (elem) => {
      //Hovering Mouse pointer on Drill Through
      elem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    }, ddDrillThrough); 
    await browser.pause(5000);   
    const ddInteractive: any[] = await this.getDrillThroughOptionsAll();
    let arrOptions: string[] = [];
    for(let i=0;i<ddInteractive.length;i++){
      await arrOptions.push(await ddInteractive[i].getText());
    }
    await CommonFunctions.logMessage('INFO',"Target Views as Dropdown are:: "+arrOptions.toString())
    return arrOptions;
  }

  public async switchToMFEFrame() {
    const sFrame = await $("//iframe[@id='mfe']");
    await browser.switchToFrame(sFrame);
    await CommonFunctions.logMessage("INFO",'Switched to MFE Frame');
  }

  public async getViewTitleName(switchToFrame: boolean = true) {
    if(switchToFrame) {await this.switchToMFEFrame();}
    const lblFieldValue = await this.processTitleEle;
    let sProcessName: string = await lblFieldValue.getText();
    await CommonFunctions.logMessage("INFO", "View Name:: "+sProcessName);
    await browser.switchToParentFrame();
    return sProcessName;
  }

  public async isViewSelected(sView: string, isFrame: boolean = true) {
    if (isFrame) { await this.switchToMFEFrame(); }
    let iSelected: boolean = false;
    const processSelectedLocator = await $("//div[text()='" + sView + "']/parent::div/parent::li");
    let classAttribute: string = "";
    try { classAttribute = await processSelectedLocator.getAttribute("class"); }
    catch (e) {
      await CommonFunctions.logMessage("INFO", "View is not Present!");
      return iSelected;
    }
    console.log("Class Attribute Value:: " + classAttribute);
    if (classAttribute.includes("Mui-selected")) {
      await CommonFunctions.logMessage("INFO", sView + " Selected!!");
      iSelected = true;
    } else {
      await CommonFunctions.logMessage("INFO", sView + " not Selected");
    }
    await browser.switchToParentFrame();
    await CommonFunctions.logMessage('INFO',`Switched to parent frame`);
    return iSelected;
  }

  public async getSelectedViewName():Promise<string> {
    await this.clickViewsDropDown();
    const selectedViewEle = await this.selectedView;
    const selectedViewName: string = await  selectedViewEle.getText();
    await CommonFunctions.logMessage("INFO",`Selected view is :: ${selectedViewName}`);
    return selectedViewName
  }

  public async isRedDotDisplaysOnPlanningSpace(isFrame: boolean = true) {
    if (isFrame) {await this.switchToMFEFrame();}
    const processSelectedLocator = await this.redDotEle
    let isDisplay: boolean = await processSelectedLocator.isExisting();
    await CommonFunctions.logMessage('INFO',`Red Dot on Planning Space Displays :: ${isDisplay}`)
    await browser.switchToParentFrame();
    return isDisplay;
  }

  public async isContextOverrideDisplays(isFrame: boolean = true) {
    if (isFrame) {await this.switchToMFEFrame();}
    const contextLocator = await this.getContextOverrideChip
    let isContextLocatorExists: boolean = await this.doesElementExist(contextLocator, `Context Locator button exists assertion`);;
    await CommonFunctions.logMessage('INFO',`Context Override Displays :: ${isContextLocatorExists}`)
    isContextLocatorExists && await browser.switchToParentFrame();
    return isContextLocatorExists;
  }

  public async isFilterDetailsDisplays(isFrame: boolean = true) {
    if (isFrame) {await this.switchToMFEFrame();}
    const contextLocator = await this.getContextOverrideChip;
    await this.doClick(contextLocator, "Clicking on Context Override icon ");
    const FilterDetails = await this.filterDetails;
    const isFilterDetailsButtonExists: boolean = await this.doesElementExist(FilterDetails, `Filter Details button exists assertion`);
    await this.doClick(contextLocator, "Clicking on Context Override icon ");
    await browser.switchToParentFrame();
    await CommonFunctions.logMessage('INFO',`Switched to parent frame`);
    return isFilterDetailsButtonExists;
  }

  public async closeWorkflowFilterDetails() {
    const closeFilterDetails = await this.closeFilterDetails
    const isCloseButtonExists: boolean = await this.doesElementExist(closeFilterDetails, `Close button exists assertion`);
    await this.doClick(closeFilterDetails, "Clicking on Close button in Filter Details popup");
    return isCloseButtonExists;
  }

  public async refreshPivotCard() {
    await browser.pause(5000); //Wait for card to load
    const refreshIcon = await this.pivotCardRefreshIcon();
    await refreshIcon.waitForDisplayed({ timeout: 20000 });
    const isExisting = await refreshIcon.isExisting();
    await CommonFunctions.compareTwoValues(isExisting, true, 'Pivot Card Refresh icon is be displayed');
    await this.doClick(refreshIcon, "Clicked on Pivot Card Refresh Icon");
  }

  public async clickOnContextOverrideIcon(): Promise<boolean> {
    try {
      const contextOverrideIcon = await this.getContextOverrideChip;
      await contextOverrideIcon.waitForDisplayed({ timeout: 20000 });
      const isExisting = await contextOverrideIcon.isExisting();
      await CommonFunctions.compareTwoValues(isExisting, true, 'Context Override icon is be displayed');
      await this.doClick(contextOverrideIcon, "Clicked on Context Override Icon");
      return true;
    } catch (error) {
      await CommonFunctions.logMessage('ERROR', `Context Override Icon not displayed: ${error}`);
      return false;
    }
  }

  public async closeContextOverridePopup() {
    try {
      const contextOverrideChip = await this.getOverRidePopupCloseIcon();
      await contextOverrideChip.waitForDisplayed({ timeout: 20000 });
      const isExisting = await contextOverrideChip.isExisting();
      await CommonFunctions.compareTwoValues(isExisting, true, 'Close icon of Override Chip is displayed');
      await this.doClick(contextOverrideChip, "Clicked on close icon of Context Override popup");
      return true;
    } catch (error) {
      await CommonFunctions.logMessage('ERROR', `Error in closeContextOverridePopup: ${error}`);
      return false;
    }
  }

  public async clickOnBreadCrumbLink(viewName: string) {
    const breadcrumbLink = await this.clickOnBreadcrumbLink(viewName);
    await breadcrumbLink.waitForDisplayed({ timeout: 6000 });
    await this.doClickUsingScript(breadcrumbLink, `Clicked on Breadcrumb Link: ${viewName}`);
  }

  public async clickOnBackArrowOfHiddenView() {
    try {
      const backArrow = await this.backBtnHiddenView;
      await backArrow.waitForDisplayed({ timeout: 10000 });
      await this.doClickUsingScript(backArrow, "Clicked on Back Arrow of Hidden View");
      return true;
    } catch (error) {
      await CommonFunctions.logMessage("ERROR", `Failed to click Back Arrow of Hidden View: ${error}`);
      return false;
    }
  }

  public async validateBreadCrumbs(viewName1: string, viewName2: string): Promise<boolean> {
    try {
      await CommonFunctions.logMessage('INFO', `Validating breadcrumb labels: ${viewName1} -> ${viewName2}`);
      const breadCrumbs = await this.getBreadCrumbElements();
      if (breadCrumbs.length === 0) {
        await CommonFunctions.compareTwoValues(false, true, `No breadcrumb elements are displayed`);
        return false;
      }
      const allTexts = await Promise.all(
        breadCrumbs.map(async (element, index) => {
          try {
            return await element.getText();
          } catch (e) {
            await CommonFunctions.logMessage('INFO', `Failed to get labels from breadcrumb element ${index}: ${e}`);
            return '';
          }
        })
      );

      await CommonFunctions.logMessage('INFO', `Breadcrumb labels found: [${allTexts.join(', ')}]`);

      let sourceIndex = -1, targetIndex = -1;
      for (let i = 0; i < allTexts.length; i++) {
        const text = allTexts[i].trim();
        if (text.includes(viewName1) && sourceIndex === -1) sourceIndex = i;
        if (text.includes(viewName2) && targetIndex === -1) targetIndex = i;
      }

      let isValid = false;
      if (sourceIndex !== -1 && targetIndex !== -1) {
        if (sourceIndex < targetIndex) {
          isValid = true;
          await CommonFunctions.logMessage('INFO', `Both Source ${viewName1} & Target ${viewName2} Views are displayed`);
        } else if (sourceIndex === targetIndex) {
          const combinedText = allTexts[sourceIndex];
          const sourcePosition = combinedText.indexOf(viewName1);
          const targetPosition = combinedText.indexOf(viewName2);
          isValid = sourcePosition !== -1 && targetPosition !== -1 && sourcePosition < targetPosition;
          await CommonFunctions.logMessage('INFO', `Both views found. Source position: ${sourcePosition}, Target position: ${targetPosition}, Order correct: ${isValid}`);
        }
      }

      await CommonFunctions.compareTwoValues(isValid, true, `Breadcrumbs displayed: ${viewName1} -> ${viewName2} || Actual Value:: ${isValid}`);
      return isValid;

    } catch (error) {
      await CommonFunctions.compareTwoValues(false, true, `Breadcrumb not displayed: "${viewName1}" with error: ${error}`);
      return false;
    }
  }

  public async validateEllipsesInOverridePopup(): Promise<boolean> {
    try {
      await CommonFunctions.logMessage('INFO', 'Validating ellipses in Context Override popup');
      const ellipses = await this.getEllipsesInOverridePopup();
      await ellipses.waitForDisplayed({ timeout: 10000 });
      const isDisplayed = await ellipses.isDisplayed();
      await CommonFunctions.logMessage('INFO', `Ellipses displayed: ${isDisplayed}`);

      if (isDisplayed) {
        await CommonFunctions.compareTwoValues(true, true, 'Ellipses in Context Override popup are displayed successfully');
        return true;
      } else {
        await CommonFunctions.compareTwoValues(false, true, 'Ellipses in Context Override popup are not displayed');
        return false;
      }
    } catch (error) {
      await CommonFunctions.compareTwoValues(false, true, 'Ellipses validation failed due to error');
      return false;
    }
  }

  public async isClearDisplays(isFrame: boolean = true) {
    if (isFrame) {await this.switchToMFEFrame();}
    const contextLocator = await this.getContextOverrideChip;
    await contextLocator.click();
    const clearLocator = await this.clearBtn
    let isDisplay: boolean = await clearLocator.isExisting();
    await CommonFunctions.logMessage('INFO',`Clear Button/Link Displays :: ${isDisplay}`);
    await contextLocator.click();
    await browser.switchToParentFrame();
    await CommonFunctions.logMessage('INFO',`Switched to parent frame`);
    return isDisplay;
  }

  public async showFilterDetails(isFrame: boolean = true, workflowFilters:Record<string, string>) {
    if (isFrame) {await this.switchToMFEFrame();}
    await this.doClick(await this.getContextOverrideChip, "Clicking on Context Override Chip");
    await browser.pause(2000);
    await this.doClick(await this.filterDetails, "Clicking on FilterDetails");
    await browser.pause(2000);
    try {
      const filterElement = await scope.getAppliedWorkflowFilter(workflowFilters.ATTRIBUTE_NAME, workflowFilters.VALUES[0]);
      if (!(await filterElement)) {
         await CommonFunctions.logMessage('INFO',`Filter not applied: ${workflowFilters.ATTRIBUTE_NAME} → ${workflowFilters.VALUES[0]}`);
        return false;
      }
      return true;
    }catch (error) {
      console.error("Error checking applied backend workflow filters:", error);
      return false;
    }
  }


  public async clearContext(isFrame: boolean = true) {
    if (isFrame) {await this.switchToMFEFrame();}
    await this.doClick(await this.getContextOverrideChip, "Clicking on Context Override Chip");
    await browser.pause(2000);
    await this.doClick(await this.clearBtn, "Clicking on Clear context");
    await browser.switchToParentFrame();
    await CommonFunctions.logMessage('INFO',`Switched to parent frame`);
  }

  public async getDrillToNameFromDialogBox(isFrame: boolean = true) {
    if (isFrame) {await this.switchToMFEFrame();}
    const labelName = await $("//div[@aria-labelledby='customized-dialog-title']//h5")
    let isDisplay: boolean = await labelName.isExisting();
    console.log("Drill Through Name Displays? :: "+ isDisplay);
    await allureReporter.addStep("Drill Through Name Displays? :: "+ isDisplay);
    let sTitle: string = await labelName.getText();
    console.log("Drill Through Name in the Dialog Box? :: "+ sTitle);
    await allureReporter.addStep("Drill Through Name in the Dialog Box? :: "+ sTitle);
    return sTitle;
  }

  public async loginToPlanningSpace(sRealmName: string, sUserName: string, sPassword: string, isSecondUser?: boolean, globalCred: boolean = true, clickOnYes: boolean = false) {
    if(isSecondUser) {
      await browser.pause(5000);
    }
    await TestUtil.launchAppFromCatalog(sRealmName, sUserName, sPassword, process.env.PSLINK as string, isSecondUser, globalCred, clickOnYes);
  }

  public async navigateToPlanningSpaceWithProcess(sProcessName: string) {
      await CommonFunctions.logMessage("INFO", "Navigating to Planning Space Process: " + sProcessName + ": by link:: " + process.env.NAVIGATE_TO_PLANNING_SPACE + "process/" + sProcessName + "/processplan/link");
      await browser.url(process.env.NAVIGATE_TO_PLANNING_SPACE + "process/" + sProcessName + "/processplan/link");
  }

  public async loginToPlanningSpaceWithProcess(sRealmName: string, sUserName: string, sPassword: string, sProcessName: string, isSecondUser?: boolean, globalCred: boolean = true) {
    await this.loginToPlanningSpace(sRealmName, sUserName, sPassword, isSecondUser ?? false, globalCred);
    await browser.pause(5000);
    await browser.maximizeWindow();
    await this.navigateToPlanningSpaceWithProcess(sProcessName);
    await this.switchToMFEFrame();
    await this.expandPlanningSpaceLeftSection();
  }

  public async expandPlanningSpaceLeftSection() {
    try {
      await this.expandPlanningPlaceBtn.waitForDisplayed({ timeout: 20000 });
      await browser.pause(5000);
      await this.expandPlanningPlaceBtn.waitForClickable({ timeout: 5000 });
      await CommonFunctions.logMessage("INFO", "Explanding Planning Space");
      await this.expandPlanningPlaceBtn.click();
    }
    catch (e) {
      await CommonFunctions.logMessage("INFO", "Planning Space already Expanded!")
    }
  }


 public async UnpinSideDrawer() {
  try {
    await this.pinnedIcon.waitForDisplayed({ timeout: 10000 });
    await this.doClick(await this.pinnedIcon, "Unpinning Sidrawer");
  }
  catch (e) {
    await CommonFunctions.logMessage("INFO", "SideDrawer already unpinned!")
  }
 }

 public async pinSideDrawer() {
  try {
    await this.unpinnedIcon.waitForDisplayed({ timeout: 10000 });
    await this.doClick(await this.unpinnedIcon, "pinning Sidrawer");
  }
  catch (e) {
    await CommonFunctions.logMessage("INFO", "SideDrawer already pinned!")
  }
 }
 


public async isSideDrawerClosed() {
  return await this.doesElementExist(this.toggleDrawerBtn, "Side Drawer Closed");
}

  public async doesSideNavDrawerOpened(titleName: string): Promise<boolean> {
    try {
      const sideNavTitleEle = await this.getSideNavTitle(titleName);
      return await sideNavTitleEle.isDisplayed();
    } catch (error) {
      await CommonFunctions.logMessage('INFO', `Side navigation drawer with title '${titleName}' is not displayed`);
      return false;
    }
  }

  public async openSideNav() {
    try {
      await this.toggleDrawerBtn.waitForDisplayed({ timeout: 15000 });
      await this.doClick(this.toggleDrawerBtn, "Opening Side Navigation");
    }
    catch (e) {
      await CommonFunctions.logMessage("INFO", "Side Navigation is already opened!");
    }
  }

public async CheckAllViewGroupExpaneded(){
  const listItems = await $$('ul[data-testid="viewsList"] > li');
  let allExpanded = true; // Assume all are expanded initially
  for (let index = 0; index < listItems.length; index++) {
      // Get the value of aria-expanded attribute
      let item=listItems[index]
      const ariaExpandedValue = await item.getAttribute('aria-expanded');
      if (ariaExpandedValue !== "true") {
        allExpanded = false; 
      }
      // Assert it should be true initially
       await CommonFunctions.compareTwoValues(ariaExpandedValue, 'true', `view Group Expanded ${index} working as expected?`);
  }
  return allExpanded;
}

public async MinimizeAllViewGroup(){
  let expandedGroups = await $$('//li[@data-testid="tree-view" and @aria-expanded="true"]');
  const halfLength = Math.floor(expandedGroups.length/2);
  for (let i = 0; i < halfLength; i++) {
    // get the first currently expanded group
    const group = await $('//li[@data-testid="tree-view" and @aria-expanded="true"]//div[@class="MuiTreeItem-iconContainer"]');
    
    await this.doClick(group, `Minimizing view Group ${i + 1}`);
  }
}

public async ExpandAllViewGroup(){
  const viewsList = await $$('//li[@data-testid="tree-view" and @aria-expanded="false"]//div[@class="MuiTreeItem-iconContainer"]');
  const halfLength = Math.floor(viewsList.length/2);
  // Click each item to minimize
  for (let index = 0; index < halfLength; index++) {
    // Get the value of aria-expanded attribute
    let item=viewsList[index];
      await this.doClick(await item, `Expanding view Group ${index}`);
  }
}

public async CheckAllViewGroupMinimized(){
  const listItems = await $$('ul[data-testid="viewsList"] > li');
  let allMinimized = true; // Assume all are expanded initially
  for (let index = 0; index < listItems.length; index++) {
      // Get the value of aria-expanded attribute
      let item=listItems[index]
      const ariaExpandedValue = await item.getAttribute('aria-expanded');
      if (ariaExpandedValue !== "false") {
        allMinimized = false; // Even if one is not expanded, set to false
      }
      // Assert it should be true initially
       await CommonFunctions.compareTwoValues(ariaExpandedValue, 'false', `view Group ${index} should be Minimized `);
  }

  return allMinimized;
}

  public async clickRefreshBtn(): Promise<boolean> {
    const refreshBtn = await this.refreshBtn;
    await refreshBtn.waitForDisplayed({ timeout: 30000 });
    if (refreshBtn) {
      await CommonFunctions.logMessage('INFO', "Refresh btn exist on dashboard")
      await refreshBtn.click();
      return true
    } else {
      await CommonFunctions.logMessage('INFO', "Refresh btn not exist on dashboard")
      return false
    }
  }

  public async isDataSyncButtonExists(): Promise<boolean> {
    return await this.doesElementExist(await this.interactiveDataStatusIcon, 'datasync button exists');
  }

  public async clickInteractiveDataStatus(): Promise<boolean> {
    const idsiBtn = await this.interactiveDataStatusIcon;
    let isVisible: boolean = false;
    try {
      await idsiBtn.waitForDisplayed({ timeout: 30000 });
      await CommonFunctions.logMessage('INFO', "Interactive Data Status Icon exist on dashboard");
      await CommonFunctions.logMessage('INFO', "Clicking Interactive Data Status Icon");
      await idsiBtn.click();
      isVisible = true;
    }
    catch (e) {
      await CommonFunctions.logMessage('INFO', "Interactive Data Status Icon is not exist on dashboard")
    }
    return isVisible;
  }

  public async isDataSyncStatusVisible(status: string, isClick: boolean): Promise<boolean> {
    const statusWidgetEle = await this.dataSyncStatus(status);
    let isStatusVisible: boolean = false;
    try {
      await statusWidgetEle.waitForDisplayed({ timeout: 30000 });
      await CommonFunctions.logMessage('INFO', `Data Sync Status '${status}' is visible on the dashboard`);
  
      if (isClick) {
        await CommonFunctions.logMessage('INFO', `Clicking on Data Sync Status '${status}'`);
        await statusWidgetEle.click();
      }
  
      isStatusVisible = true;
    } catch (e) {
      await CommonFunctions.logMessage('INFO', `Data Sync Status '${status}' is not visible on the dashboard`);
    }
    return isStatusVisible;
  }

  public async click3dotIconOnDashboard() {
    const width = await SCAPage.getGridHeaderWidth();
    let threeDotButton: WebdriverIO.Element;
    if (width <= 960) {
      threeDotButton = await this.getDashboardThreeDotBtn(1);
    } else {
      threeDotButton = await this.getDashboardThreeDotBtn(2);
    }
    await browser.pause(15000);
    await this.doClick(await threeDotButton, "Clicking 3 dot Icon on View")
  }

  public async selectOptionFrom3dotIconOnDashboard(option: string) {
    const optionLocator = await this.getOption(option);
    await optionLocator.waitForDisplayed({ timeout: 10000 });
    await optionLocator.click();
    await CommonFunctions.logMessage('INFO', `Selected option '${option}' from 3 dot icon on dashboard`);
  }
  public async settingOptionOfCard(){
  await this.doClick(await this.settingsItemInEditView,"clicking on settings option");
  }
  public async conditionToggleBtn(turnOn : boolean){
    const toggleInput = await this.conditionToggle;
    await toggleInput.scrollIntoView();
    const isEnabled = await toggleInput.isSelected();
    if (turnOn && !isEnabled) {
        await this.doClick(toggleInput, "Turning ON condition toggle bar");
    } else if (!turnOn && isEnabled) {
        await this.doClick(toggleInput, "Turning OFF condition toggle bar");
    } else {
        await CommonFunctions.logMessage("INFO", "Condition toggle is already ON");
    }
  }
  public async threeDotBtnsOfCard(cardTitle: string){
    await this.doClick(await this.getdots(cardTitle), `clicking on three dots of ${cardTitle} card` );
  }
  public async clickEditBtn(): Promise<boolean> {
    await this.click3dotIconOnDashboard();
    await this.selectOptionFrom3dotIconOnDashboard("Edit View");
    return true;
  }

  public async configureCardFromEditCard(cardTitle: string): Promise<boolean> {
    await this.selectOptionFromCardThreeDotMenu(cardTitle, "Edit Card");
    await this.clickOnGoToCardConfiguration();
    await this.selectMetaData();
    await this.clickOnApplyBtnInCardConfiguration();
    return true;
  }

  public async selectOptionFromCardThreeDotMenu(cardTitle: string, option: string): Promise<void> {
    const cardEle = await this.getCardThreeDotMenuOfCard(cardTitle);
    await cardEle.waitForDisplayed({ timeout: 6000 });
    await this.doClick(cardEle, `Clicking on three dot menu of ${cardTitle} card`);
    const optionLocator = await this.getCardMenuOption(option);
    await optionLocator.waitForDisplayed({ timeout: 6000 });
    await this.doClick(optionLocator, `Clicking on option '${option}' from ${cardTitle} card`);
    await CommonFunctions.logMessage('INFO', `Selected option '${option}' from ${cardTitle} card`);
  }

  public async clickOnGoToCardConfiguration(): Promise<void> {
    const cardConfig = await this.goToCardConfiguration;
    await cardConfig.waitForDisplayed({ timeout: 6000 });
    await this.doClick(cardConfig, `Clicking on card configuration`);
  }

  public async selectMetaData(){
    const checkbox = await $('#predefined-endpoint-switch');
    const isToggleEnabled = await checkbox.isSelected();
    if (!isToggleEnabled) {
        await this.doClick(checkbox, 'Predefined toggle was disabled. Clicking to enable it')
        const predefinedField = await this.predefinedData;
        await this.doClick(predefinedField, 'Clicking on predefined data field');
    } else {
        await CommonFunctions.logMessage('INFO', 'Predefined toggle is already enabled');
    }
    const datasection = await this.navToDataintheCardSettings;
    await this.doClick(datasection, 'Clicking on Meta Data button');
    const predefinedSelect = await this.preDataField;
    await predefinedSelect.waitForDisplayed({timeout: 30000});
    await this.doClick(predefinedSelect, 'Selecting predefined endpoint');
    const data= await this.getSelectPredefinedEndpoint("Bullet Chart 01");
    await data.waitForDisplayed({timeout: 6000});
    await this.doClick(data, 'Selecting Bullet Chart 01 from predefined endpoint');
  }

  public async clickOnApplyBtnInCardConfiguration(){
    const applyBtn = await this.applyBtnInCardConfiguration;
    await applyBtn.waitForDisplayed({ timeout: 6000 });
    await this.doClick(applyBtn, "Clicking on Apply button in card configuration");
    await browser.pause(5000);
    const CancelBtn = await this.cancelBtnInCardConfiguration;
    await CancelBtn.waitForDisplayed({ timeout: 6000 });
    await this.doClick(CancelBtn, "Clicking on Cancel button in card configuration to close the popup");
    await CommonFunctions.logMessage('INFO', "Clicked on Cancel button and Card configuration popup is closed :: " + !(await CancelBtn.isDisplayed()));
  }

  // clicks on provided session and return corresponding related scenario name
  public async clickOnSession(sessionName: string): Promise<string | null> {
    const row = await this.getSessionRow(sessionName);
    const dataIndex: number = await row.getAttribute('data-index') as unknown as number;
    const sessionEle = await this.getSessionEle(dataIndex);
    if (await sessionEle.isExisting()){
      const relatedScenario: string = await this.getRelatedScenarioEle(dataIndex).getText();
      await CommonFunctions.logMessage('INFO',`${sessionName} session exist`)
      await CommonFunctions.logMessage('INFO',`related scenario for  ${sessionName} session is "${relatedScenario}"`)
      await CommonFunctions.logMessage('INFO',`Clicking ${sessionName} session`)
      await sessionEle.click();
      return relatedScenario;
    }
    await CommonFunctions.logMessage('INFO',`${sessionName} session exist`)
    return null
  }

  public async verifySessionAndScenarioInBreadCrumb(sessionName: string, relatedScenario: string): Promise<boolean>{
    const breadcrumbText = `${relatedScenario} : ${sessionName}`
    const breadcrumbEle = await this.getBreadCrumbEle(breadcrumbText)
    if(await breadcrumbEle.isExisting()){
      return true
    }
    return false
  }

  public async verifyLeftPanelIcon(iconName: string): Promise<boolean> {
    const icon = this.getLeftPanelIcon(iconName)
    if(await icon.isExisting()){
      await CommonFunctions.logMessage('INFO',`"${iconName}" icon exist in left panel on drill through`)
      return true
    }
    await CommonFunctions.logMessage('INFO',`"${iconName}" icon exist in left panel on drill through`)
    return false
  }

  public async clickAddCardButton() {
    await this.doClick(await this.btnAddCard, "Clicking Add Card Button");
  }

  public async clickCreateCardButton() {
    await this.doClick(await this.btnCreateCard, "Clicking Create Card Button");
  }

  public async getAllCardNames() {
    let arrCardNames: string[] = [];
    for (let i = 0; i < await this.cardNames.length; i++) {
      await arrCardNames.push(await this.doGetText(await this.cardNames[i], "Fetching Card Name " + (i + 1)));
    }
    await CommonFunctions.logMessage("INFO", "All Card Names:: " + arrCardNames.toString());
    return arrCardNames;
  }


// to launch process :
    //launchContext("Process", { process: 'PSAutomation'});

//to launch sub-process :
    // launchContext("Sub-process", { process: 'PSAutomation', subProcess: 'DemandReview' });

//to launch assumption :
    // launchContext("Assumption", { origin: 'PSAutomation', assumption: 'PS Auto Assumption' }); 

  public async launchContext(entityType: entity, dropdownValues: IProcess | ISubProcess | IAssumption) {
    const contextDropdown = await this.contextDropdownEle;
    await browser.waitUntil(
        async () => (await contextDropdown.isDisplayed()) && (await contextDropdown.isClickable()),
        {
            timeout: 90000,
            timeoutMsg: 'Context dropdown not ready after 90s'
        }
    );
    await this.doClick(await contextDropdown, `Clicking context dropdown`);
    await this.doClick(await this.getContextOptionEle(entityType), `Selecting ${entityType} item from dropdown menu`);
    const processDropdown = await this.processDropdownEle;
    await processDropdown.waitForClickable({ timeout: 90000 })
    await this.doClick(await processDropdown, `Clicking ${entityType == 'Assumption' ? 'Origin' : 'Process'} dropdown`);
    const processValue: string = ('process' in dropdownValues) ? dropdownValues.process : dropdownValues.origin;
    await this.doClick(await this.btnClearProcessDD, "Clicking clear button of process dropdown");
    await driver.pause(2000);
    await CommonFunctions.logMessage('INFO', `Selecting  ${processValue} item from ${entityType == 'Assumption' ? 'Origin' : 'Process'} dropdown`);
    await processDropdown.setValue(processValue);
    const opt = await $$("//*[text()='" + processValue + "']");
    await CommonFunctions.logMessage("INFO", "Selecting process from dropdown " + processValue);
    await driver.pause(2000);
    await opt[await (opt.length) - 1].click();
    await browser.pause(2000);
    if (entityType != 'Process') {
      await browser.pause(1000);
      const subProcessDropdown = await this.getSubProcessDropdown(entityType);
      await subProcessDropdown.waitForDisplayed({ timeout: 90000 });
      await this.doClickUsingScript(subProcessDropdown, "Clicking " + entityType + " Dropdown");
      await browser.pause(5000);
      const subProcessValue: string = (entityType === 'Sub-process' && ('subProcess' in dropdownValues)) ? dropdownValues.subProcess : ('assumption' in dropdownValues) ? dropdownValues.assumption : '';
      await subProcessDropdown.click();
      entityType === "Sub-process" && await this.doClick(await this.subProcessDropdownClear, "Clicking clear button of sub-process dropdown");
      await CommonFunctions.logMessage('INFO', `Selecting  ${subProcessValue} item from ${entityType == 'Sub-process' ? 'Sub-process' : 'Assumption'} dropdown`);
      await subProcessDropdown.setValue(subProcessValue);
      await browser.pause(5000);
      if (entityType === 'Assumption') {
        const opt = await $$("//*[text()='" + subProcessValue + "']");
        await CommonFunctions.logMessage("INFO", "Selecting Assumption:: " + subProcessValue);
        await browser.pause(5000);
        await opt[await (opt.length) - 1].click();
        await browser.pause(2000);
      }
      await browser.keys('Enter');
      await browser.keys('Tab');
      await browser.pause(5000);
    }
    const launchButton = await this.launchBtn;
    await browser.pause(3000);
    const btnEnabled = await launchButton.isEnabled();
    await CommonFunctions.logMessage('INFO', `Is launch button enabled :: ${btnEnabled}`)
    await launchButton.click();
    await browser.pause(20000);
    if (await this.expandPlanningPlaceBtn.isDisplayed()) {
      await this.expandPlanningPlaceBtn.waitForDisplayed({ timeout: 30000 });
      await this.doClick(await this.expandPlanningPlaceBtn, "Expanding Planning Space");
    }
    return btnEnabled;
  }

  public async getAllViews():Promise<string[]> {
    const views: string[] = [];
    const viewItems = await this.viewElements;
    const halfLength = Math.floor(viewItems.length / 2);
    for(let i = 0; i < halfLength; i++){
      const item = viewItems[i];
      const viewName: string = await item.getText();
      views.push(viewName);
    }
    await CommonFunctions.logMessage('INFO',`Fetched views are "${views}"`);
    return views;
  }

  public async verifyViewsMappedToContext(viewsFromPS: string[], viewsFromPO: string[]): Promise<boolean> {
    if(viewsFromPS.length != viewsFromPO.length){
      return false;
    }
    for(let item of viewsFromPS){
      if(viewsFromPO.includes(item))
        continue
      await CommonFunctions.logMessage('INFO',`${item} not found in ${viewsFromPO} mapping`)
      return false
    }
    await CommonFunctions.logMessage('INFO',`all ${viewsFromPS} items  found in ${viewsFromPO} mapping`)
    return true
  }

  public async navToPlanningSPace() {
    await browser.switchToParentFrame();
    await this.mouseHover(await this.breadCrumb, "Mouse Hovering on Breadcrumb");
    await browser.pause(3000);
    await this.doClickUsingScript(await this.getBreadCrumbEle('Planning'), "Going to planning space by clicking 'Planning' Breadcrumbs");
    await this.switchToMFEFrame();
  }

  public async navigateToPlanningSpace() {
    await CommonFunctions.logMessage("INFO", "Navigating to Planning space via URL: " + process.env.NAVIGATE_TO_PLANNING_SPACE as string);
    await browser.url(process.env.NAVIGATE_TO_PLANNING_SPACE as string);
    await browser.pause(5000);
    await this.switchToMFEFrame();
  }

  public async navToProcessOrchestration(openInNewTab: boolean = true){
    if(openInNewTab){
      await CommonFunctions.logMessage("INFO", "Opening URL in new tab:: " + process.env.NAVIGATE_TO_PROCESS_ORCHESTRATION)
      await browser.newWindow(process.env.NAVIGATE_TO_PROCESS_ORCHESTRATION as string)
    } else {
      await CommonFunctions.logMessage("INFO", "Opening URL in same tab:: " + process.env.NAVIGATE_TO_PROCESS_ORCHESTRATION)
      await browser.url(process.env.NAVIGATE_TO_PROCESS_ORCHESTRATION as string)
    }
    await CommonFunctions.logMessage('INFO',"Moved to Process Orchestration")
    await this.switchToMFEFrame();
    await browser.pause(10000);
  }

  public async navToSNA(){
    await CommonFunctions.logMessage("INFO", "Opening URL in new tab:: " + process.env.NAVIGATE_TO_SNA);
    await browser.newWindow(process.env.NAVIGATE_TO_SNA as string);
    await CommonFunctions.logMessage('INFO',"Moved to Semantic Network Architechture Service");
    await this.switchToMFEFrame();
    const headerElement= await this.title
    await browser.waitUntil(async () => (await headerElement.isDisplayed()),{timeout:100000,timeoutMsg:'SNA not loaded',interval:5});
    await browser.pause(10000);
  }

  public async navToIdentityAndAccess(){
    await CommonFunctions.logMessage("INFO", "Opening URL in new tab:: " + process.env.NAVIGATE_TO_IDENTITI_AND_ACCESS)
    await browser.newWindow(process.env.NAVIGATE_TO_IDENTITI_AND_ACCESS as string)
    await CommonFunctions.logMessage('INFO',"Moved to identity and access")
    await this.switchToMFEFrame();
    await browser.pause(10000);
  }

  // when zero cards in the current view
  public async addCardOrContainer(type:'Card' | 'Container'): Promise<boolean> {
    const addIconEle = await this.addIconBtn;
    await addIconEle.waitForClickable({timeout:100000})
    await CommonFunctions.logMessage("INFO",'Hovering on add icon')
    await browser.execute(async (elem) => {
      elem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    }, addIconEle); 
    await browser.pause(5000)
    const addBtn = await this.getAddCard(type);
    await CommonFunctions.logMessage('INFO',`Clicking on add ${type} button`);
    await addBtn.click();
    return true;
  }

  // when one or more cards in the current view
  public async addAnotherCardOrContainer(type:'Card' | 'Container'): Promise<boolean> {
    const addBtn = await this.getAddCard(type);
    await CommonFunctions.logMessage('INFO',`Clicking on add ${type} button`);
    await addBtn.click();
    return true;
  }

  public async clickCreateCardBtn(): Promise <boolean> {
    const createCardEle = await this.btnCreateCard;
    await CommonFunctions .logMessage('INFO','Clicking on Create Card Button');
    await createCardEle.click();
    return true;
  }

  public async clickOnCreateCardInItemGallery(cardName: string): Promise <boolean> {
    const createCardBtn = await this.getCreateCardBtnByCardName(cardName);
    await CommonFunctions.logMessage("INFO",`Clicking on create card button in ${cardName} card`);
    await createCardBtn.scrollIntoView();
    await createCardBtn.click();
    return true;
  }

  public async setCardSettingsTitleInput(value: string) {
    await this.doEnterText(await this.cardSettingsTitleInput, value, `Setting ${value} value for title input`)
  }

  public async setCardDescription(description: string) {
    await this.doEnterText(await this.cardDescInput, description, `setting ${description} value for short description input field`)
  }

  public async setCardConfigServiceInput(value: string) {
    await this.doEnterText(await this.configServiceInput, value, `Setting ${value} value for configuration service input`)
  }

  public async setCardControllerServiceInput(value: string) {
    await this.doEnterText(await this.controllerServiceInput, value, `Setting ${value} value for controller service input`)
  }

  public async setCardcalcEngineIdInput(value: string) {
    await this.doEnterText(await this.calcEngineId, value, `Setting ${value} value for calcEngineId input`)
  }

  public async clickPublishBtn() {
    const publishEle = await this.publishBtn;
    await publishEle.waitForClickable({timeout: 60000})
    await this.doClick(publishEle, 'Clicking on publish button');
  }

  public async getCountOfMaasChartIcons() {
    await CommonFunctions.logMessage('INFO', 'Total number of icon count for maas chart card ' + await this.getMaasChartIcon.length);
    return await this.getMaasChartIcon.length;
  }

  public async getCountOfMaasPivotIcons() {
    await CommonFunctions.logMessage('INFO', 'Total number of icon count for maas pivot card ' + await this.getMaasPivotIcon.length);
    return await this.getMaasPivotIcon.length;
  }

  public async selectCardInTabbedCard(cardName: string) {
    const cardElement = await $("//p[text()='" + cardName + "']");
    await CommonFunctions.logMessage('INFO', 'Click on card name ' + cardName);
    await cardElement.click();
  }  
  
  public async verifyCardAvailableInCardGallery(cardTitle: string): Promise<boolean> {
    const cardTitleEle = await this.getCardTitleFromGallery(cardTitle);
    const isEleExist: boolean = await cardTitleEle.isExisting();
    await CommonFunctions.logMessage('INFO',`Is card with title ${cardTitle} exist :: ${isEleExist}`);
    return isEleExist;
  }

  public async addCardToViewFromGallery(cardTitle: string) {
    await browser.pause(5000);
    await this.getCardTitleFromGallery(cardTitle).scrollIntoView();
    await this.doClick(await this.getCardTitleFromGallery(cardTitle), `Clicking on card with title ${cardTitle} in card gallery`);
    await this.doClick(await this.addCardBtn, "Clicking on Add Card Button")
  }

  public async verifyCardInView(cardTitle: string, viewName: string, editMode: boolean = false): Promise<boolean> {
    const cardTitleEle = await this.getCardTitleInEditCardActions(cardTitle);
    const headingEle = await this.getCardActionsHeader(`${editMode ? 'Edit ' : ''}${viewName}`);
    await headingEle.waitForExist({timeout:60000});
    await cardTitleEle.waitForExist({timeout:60000});
    await CommonFunctions.logMessage("INFO",`In the view ${viewName}`);
    const isHeadingExist: boolean = await headingEle.isExisting();
    const isCardExist: boolean = await cardTitleEle.isExisting();
    await CommonFunctions.logMessage("INFO",`Is naved to ${viewName}  page:: ${isHeadingExist}`);
    await CommonFunctions.logMessage("INFO",`Is Card with title ${cardTitle} exist in ${viewName} :: ${isCardExist}`);
    return isHeadingExist && isCardExist;
  }

  public async verifyCardafterSavingDashboard(cardTitle: string, viewName: string, saveMode: boolean = false): Promise<boolean> {
    const cardTitleEle = await this.getCardTitleFromDashboard(cardTitle);
    await cardTitleEle.waitForDisplayed({timeout:60000});
    const headingEle = await this.getCardActionsHeader(`${viewName}`);
    await headingEle.waitForDisplayed({timeout:60000});
    const isHeadingExist: boolean = await headingEle.isExisting();
    const isCardExist: boolean = await cardTitleEle.isExisting();
    await CommonFunctions.logMessage("INFO",`Is naved to ${viewName}  page:: ${isHeadingExist}`);
    await CommonFunctions.logMessage("INFO",`Is Card with title ${cardTitle} exist in ${viewName} :: ${isCardExist}`);
    return isHeadingExist && isCardExist;
  }
  
  public async saveCardInView() {
    const saveBtn = await this.saveBtn;
    await CommonFunctions.logMessage('INFO', 'Clicking on Save Button');
    await this.doClickUsingScript(saveBtn, 'Clicking on Save Button');
    await browser.pause(5000)
  }

  public async clickBackButtonInCardGallery() {
    await CommonFunctions.logMessage('INFO','Clicking back icon in card gallery');
    await this.cardGalleryCloseBtn.click();
  }

  public async clickSettingsIconOnCard(cardTitle: string) {
    await this.getSettingsCard(cardTitle).waitForExist({ timeout: 30000 });
    await this.mouseHover(await this.getSettingsCard(cardTitle), `Hovering on settings icon for ${cardTitle} card`);
    await this.mouseHover(await this.getSettingsCardByTitle(cardTitle), `Hovering on settings icon for ${cardTitle} card`);
    await this.doClickUsingScript(await this.getSettingsCardByTitle(cardTitle), `Clicking on settings item for ${cardTitle} card`);
  }

  public async editCardInGallery(cardTitle: string, description: string): Promise<boolean> {
    await this.clickSettingsIconOnCard(cardTitle);
    await this.setCardDescription(description);
    await this.clickPublishBtn();
    const successToastEle = await this.getEditSuccessToastForCard(cardTitle);
    await successToastEle.waitForExist({timeout: 60000})
    const isUpdated:boolean = await successToastEle.isExisting();
    return isUpdated;
  }

  public async configCardInGallery(cardTitle: string, configService: string, controllerService, calcEngineId: string): Promise<boolean> {
    await this.doClick(await this.getCardTitleFromGallery(cardTitle), `Clicking on card with title ${cardTitle} in card gallery`);
    await this.doClickUsingScript(await this.getSettingsCardByTitle(cardTitle), `Clicking on settings item for ${cardTitle} card`);
    await this.setCardConfigServiceInput(configService);
    await this.setCardControllerServiceInput(controllerService);
    await this.setCardcalcEngineIdInput(calcEngineId);
    await this.clickPublishBtn();
    const successToastEle = await this.getEditSuccessToastForCard(cardTitle);
    await successToastEle.waitForExist({timeout: 60000})
    const isUpdated:boolean = await successToastEle.isExisting();
    return isUpdated;
  }

  public async enablePageContext(cardTitle: string, view: string): Promise<boolean> {
    await CommonFunctions.logMessage("INFO",`Clicking three dots menu of ${cardTitle} card in edit ${view}`);
    const threeDotsMenu = await this.getThreeDotsBtnInEditView(cardTitle);
    await threeDotsMenu.click()
    await browser.pause(3000)
    await CommonFunctions.logMessage("INFO","Clicking on settings item from 3 dots menu");
    const settingsItem = await this.settingsItemInEditView;
    // await settingsItem.waitForClickable({timeout:60000})
    // await settingsItem.click();
    await settingsItem.scrollIntoView();
    await browser.execute(async(ele) => {
      await ele.click();
    }, settingsItem)
    await browser.pause(5000)
    await CommonFunctions.logMessage("INFO",`Enabling Apply Page Context in ${cardTitle} settings`);
    await this.applyPageContextCheckBoxInput.click();
    await browser.pause(2000)
    await CommonFunctions.logMessage('INFO',`Clicking save button in ${cardTitle} settings`);
    await this.saveSettingsBtn.click();
    const successToastEle = await this.getCardSettingsSuccessToast(cardTitle);
    await successToastEle.waitForDisplayed({timeout: 60000})
    const isUpdated:boolean = await successToastEle.isExisting();
    return isUpdated;
  }

  public async removerCardFromGallery(cardTitle: string): Promise<boolean> {
    await browser.pause(5000)
    await this.getSettingsCard(cardTitle).waitForExist({timeout:30000});
    await this.mouseHover(await this.getSettingsCard(cardTitle), `Hovering on settings icon for ${cardTitle} card`);
    await this.mouseHover(await this.getRemoveCardByTitle(cardTitle), `Hovering on Remove icon for ${cardTitle} card`); 
    await this.doClickUsingScript(await this.getRemoveCardByTitle(cardTitle), `Clicking on Remove icon for ${cardTitle} card`);
    const datePickerInputEle = await this.calenderIcon;
    await CommonFunctions.logMessage('INFO',`Clicking on calendar icon in date picker`);
    await datePickerInputEle.click();
    await CommonFunctions.logMessage('INFO',`Selecting today's date from date picker`);
    await browser.pause(2000);
    const todaysDate = await this.todaysDateEle;
    await todaysDate.waitForExist({timeout:30000})
    await browser.execute(async (ele)=> {
      await ele.click();
    },todaysDate)
    const removeBtn = await this.deprecateAndRemoveBtn;
    await CommonFunctions.logMessage('INFO',`Clicking on Depricate & remove button`);
    await removeBtn.waitForEnabled({timeout: 60000});
    await removeBtn.click();
    const successToastEle = await this.getDeletionSuccessToastForCard(cardTitle);
    await successToastEle.waitForExist({timeout: 60000})
    const isDeleted:boolean = await successToastEle.isExisting();
    return isDeleted;
  }
  
  public async selectSupplyChainProceduresAction(actionName: string) {
    try {
      await this.supplyChainActionsDropdownBtn.waitForDisplayed({ timeout: 40000 });
      await this.doClickUsingScript(await this.supplyChainActionsDropdownBtn, 'Clicking on Supply Chain Actions dropdown button');
    }
    catch {
      await this.doClickUsingScript(await this.supplyChainActionsDropdownBtn2, 'Clicking on Supply Chain Actions dropdown button');
    }
    await browser.pause(2000);
    await this.doClick(await this.getAction(actionName), 'Clicking on ' + actionName + ' Supply Chain Action');
    return true;
  }
  
  public async searchSCAProceduresDropdown() {
    const menuDropdown = await this.scaDropdown;
    const isDropdownExists = await menuDropdown.isExisting();
    if (isDropdownExists) {
      await menuDropdown.click();
      await CommonFunctions.logMessage('INFO', 'SCA dropdown exists and was clicked.');
      return true;
    } else {
      await CommonFunctions.logMessage('INFO', 'SCA dropdown does not exist.');
      return false;
    }
  }

  public async procedureOptionClick(procedureName: string){
    await CommonFunctions.logMessage('INFO', 'Click on ' + procedureName + ' procedure in SCA dropdown');
    const procedureOption = await this.getScaOption(procedureName);
    await procedureOption.click();
  }

  public async searchPublishScenarioSCA(procedureName: string) {
    await this.scaDropdown.waitForExist({ timeout: 45000 });
    await this.doClickUsingScript(await this.scaDropdown, 'Search for ' + procedureName + ' procedure in SCA dropdown')
    await CommonFunctions.logMessage('INFO', 'Verify ' + procedureName + ' procedure exists in SCA dropdown');
    const procedureOption = await this.getScaOption(procedureName).isExisting();
    return procedureOption;
  }

  public async openSCProcedurePopup() {
    const popup = await this.scaPopup;
    const isScaPopupExists = await popup.isExisting()
    return isScaPopupExists; 
  }
  
  public async goToPublishScenario(procedureName: string) {
    await this.procedureOptionClick(procedureName) 
  }

  public async selectScenarioSelectionDropdown() {
    await CommonFunctions.logMessage('INFO', 'Click on scenario selection dropdown');
    const procedureOption = await this.getScenarioSelectionDropdown();
    await procedureOption.click();
  }

  public async selectBaseScenario(scenarioName: string) {
    await this.selectScenarioSelectionDropdown();
    await browser.pause(3000);
    await CommonFunctions.logMessage('INFO', `Click on base scenario "${scenarioName}" in scenario selection dropdown`);
    const baseScenario = await this.getBaseScenario(scenarioName);
    await baseScenario.moveTo({xOffset:30});
    await baseScenario.click()
    const saveBtn = await this.getSaveBtn();
    await saveBtn.click();
    await browser.pause(5000);
    const alert = await this.getAlertMsg().isExisting();
    return alert;
  }

  public async selectChildScenario(baseScenarioName: string, childScenarioName: string) {
    await this.selectScenarioSelectionDropdown();
    await CommonFunctions.logMessage('INFO', `Expanding Base Scenario "${baseScenarioName}"`);
    const baseScenario = await this.getExpandBaseScenario(baseScenarioName);
    await browser.pause(2000);
    await CommonFunctions.logMessage('INFO', 'Expanding Base Scenario Selection');
    await baseScenario.click()
    await browser.pause(3000);
    await CommonFunctions.logMessage('INFO', `Click on child scenario "${childScenarioName}" in scenario selection dropdown`);
    const childScenario = await this.getChildScenario(childScenarioName);
    await childScenario.click();
    const saveBtn = await this.getSaveBtn();
    await saveBtn.click();
    await browser.pause(5000);
    const alert = await this.getAlertMsg().isExisting();
    return alert;
  }

  public async clickEditButtonInProcedure() {
    await this.doClick(await this.editBtnInSca, "Clicking Edit Button");
  }

  public async isSelectScenarioPopupVisible() {
    await CommonFunctions.logMessage("INFO", "Select Scenario Popup Visible:: "+await this.slctScnHeader.isDisplayed());
    return await this.slctScnHeader.isDisplayed();
  } 

  public async isSearchScenarioDialogVisible() {
    await CommonFunctions.logMessage("INFO", "Search Scenario Dialog Visible:: "+await this.searchScnDialog.isDisplayed());
    return await this.searchScnDialog.isDisplayed();
  } 

  public async isSearchBarVisible() {
    await CommonFunctions.logMessage("INFO", "Search Bar Visible:: "+await this.searchBarInProcedure.isDisplayed());
    return await this.searchBarInProcedure.isDisplayed();
  } 

  public async clickCancelButtonInProcedure() {
    await this.doClick(await this.btnCancelInPopup, "Clicking Cancel Button");
  }
  

  public async getUnAuthorizedErrorMsg(){
    let sError: string = await this.lblUnAuth.getText();
    await CommonFunctions.logMessage("INFO", "Error Message: "+ sError);
    return sError;
  }

  public async getXAxisLabelsFromMaasChart(cardName: string): Promise<string[]> {
    const labelEles = await this.getXAxisLabelEleFromMaasChart(cardName);
    const labels: string[] = [];
    for (let ele of labelEles) {
      const text = await browser.execute((node: any) => {
        if (!node) return '';
        const tooltip = node.querySelector('.lui-chart-axis-tooltip');
        if (tooltip) tooltip.remove();
        return node.innerText.replace(/\r/g, '').replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
      }, ele);
      if (text) labels.push(text);
    }
    await CommonFunctions.logMessage('INFO', `fetched labels are ${labels.join(', ')}`);
    return labels;
  }

  public async verifyMaasChartLabels(labelsAfterFilter: string[], initialLabels: string[]): Promise<boolean> {
    const newLabels = labelsAfterFilter.filter(label => !initialLabels.includes(label));
    if (newLabels.length > 0) {
      await CommonFunctions.logMessage('INFO', `New labels after filter: ${newLabels.join(', ')}`);
      return true;
    } else {
      await CommonFunctions.logMessage('INFO', `No new labels after filter. Initial: ${initialLabels.join(', ')}, After: ${labelsAfterFilter.join(', ')}`);
      return false;
    }
  }

  public async verifyRefreshIconInBDE(cardName: string): Promise<boolean> {
    const refreshIcon = await this.getRefreshIconFromBDECard(cardName);
    await refreshIcon.scrollIntoView();
    const isRefreshIconExist = await refreshIcon.isExisting();
    await CommonFunctions.logMessage("INFO", `Is refresh icon exist in ${cardName} card :: ${isRefreshIconExist}`);
    return isRefreshIconExist;
  }

  public async verifyMinimizeIconInBDE(cardName: string): Promise<boolean> {
    const minimizeIcon = await this.getMinimizeIconFromBDECard(cardName);
    await minimizeIcon.waitForExist({ timeout: 60000 });
    const isMinimizeIconExist = await minimizeIcon.isExisting();
    await CommonFunctions.logMessage("INFO", `Is minimize icon exist in ${cardName} card :: ${isMinimizeIconExist}`);
    return isMinimizeIconExist;
  }
  public async toggleMinimizeIcon(): Promise<boolean> {
    const minimizeIcon = await $(`//button[@aria-label='Minimize Icon Button'][@data-testid='lui-dashboard-card-header-iconbutton']`);
    await minimizeIcon.waitForClickable({ timeout: 60000 });
    await this.doClick(minimizeIcon, `Toggling minimize icon`);
    return true;
  }

  public async verifyToggleIconInBDE(cardName: string, labelName: string): Promise<boolean> {
    const toggleIcon = await this.getPageViewToggleFromBDECard(cardName, labelName);
    await toggleIcon.waitForExist({ timeout: 60000 });
    const isToggleIconExist: boolean = await toggleIcon.isExisting();
    await CommonFunctions.logMessage('INFO', `Is ${labelName} button exist in ${cardName} card :: ${isToggleIconExist}`);
    return isToggleIconExist;
  }

  public async verifyPaginationInBDE(cardName: string): Promise<boolean> {
    const paginationEle = await this.getPaginationEleFromBDECard(cardName);
    await paginationEle.waitForExist({ timeout: 60000 });
    const isPaginationExist: boolean = await paginationEle.isExisting();
    await CommonFunctions.logMessage('INFO', `Is pagination exist :: ${isPaginationExist}`);
    return isPaginationExist;
  }

  public async verifyFilterInputInEachColumnAvailable(cardName: string): Promise<boolean> {
    const filterIcon = await this.getFilterIconFromBDECard(cardName);
    await filterIcon.waitForClickable({ timeout: 60000 });
    await CommonFunctions.logMessage('INFO', `Clicking on filter icon`);
    await filterIcon.click();
    await this.doClick(await this.expandFilterInBDE, "Clicking on expand filter icon");
    const bdeTableColumns = await this.getColumnsInTableFromBDECard(cardName);
    for (let column of bdeTableColumns) {
      const colName: string = await column.getText();
      if (colName) {
        const dataIndex: number = await column.getAttribute('data-col-idx') as unknown as number;
        const filterInput = await this.getFilterInputFromBDECard(cardName, dataIndex);
        const isFilterInputExist: boolean = await filterInput.isExisting();
        if (isFilterInputExist)
          continue;
        await CommonFunctions.logMessage('INFO', `filter input is not available for ${colName} column in ${cardName} card table`);
        return false;
      }
    }
    await CommonFunctions.logMessage('INFO', `filter input field is available for columns in ${cardName} card table`);
    return true;
  }

  public async verifyAtleastOneCardExistInView(): Promise<boolean> {
    const cards = await this.getAllCardsInView();
    if (cards.length > 0){
      await CommonFunctions.logMessage("INFO","Atleast one card exist in current view");
      return true;
    }
    await CommonFunctions.logMessage("INFO","No card exist in current view");
    return false;
  }
  
  public async getDTDataInMaasChart(isFrame: boolean = true) {
    if (isFrame) { await this.switchToMFEFrame(); }
    await browser.pause(10000);
    const tScope = await this.xAxisLabel;
    let sText: string = await tScope.getText();
    await CommonFunctions.logMessage('INFO', "Drill Through Data: "+sText.split(/\s+/).join(' '));
    await browser.switchToParentFrame();
    return sText.split(/\s+/).join(' ');
  }
  
  public async metaData(){
    const checkbox = await $('#predefined-endpoint-switch');
    const isToggleEnabled = await checkbox.isSelected();
    if (!isToggleEnabled) {
        await this.doClick(checkbox, 'Predefined toggle was disabled. Clicking to enable it')
        const predifineField = await this.predefinedData;
        await this.doClick(predifineField, 'Clicking on predefined data field');
    } else {
        await CommonFunctions.logMessage('INFO', 'Predefined toggle is already enabled');
    }
    const datasection = await this.navToDataintheCardSettings;
    await this.doClick(datasection, 'Clicking on Meta Data button');
    const predefinedSelect = await this.preDataField;
    await predefinedSelect.waitForDisplayed({timeout: 60000});
    await this.doClick(predefinedSelect, 'Selecting predefined endpoint');
    const data= await $("//span[text()='MyTasksPredefinedEndPointPost']");
    await data.waitForDisplayed({timeout: 60000});
  await this.doClick(data, 'Selecting My Tasks Predefined EndPoint from predefined endpoint');
  }

  public async editMyTaskcard(cardTitle):Promise <boolean>{
    const cardGallerySearch = await this.cardGallerySearch;
    await this.doClick(await this.cardGallerySearch, "Clicking on card gallery search input");
    // await cardGallerySearch.setValue(cardTitle);;
    for (const char of cardTitle) {
        await cardGallerySearch.addValue(char);
        await browser.pause(100); // Small delay to mimic user typing
    }
    await this.clickSettingsIconOnCard(cardTitle);
    await this.metaData();
    await this.clickPublishBtn();
    const successToastEle = await this.getEditSuccessToastForCard(cardTitle);
    await successToastEle.waitForExist({timeout: 60000})
    const isUpdated:boolean = await successToastEle.isExisting();
    return isUpdated;
  }

  public async addingSubscription(cardTitle: string, valueName: string): Promise<boolean> {
      await this.openCardSettings(cardTitle);
      await this.addSubscriptionRow();

      await this.selectLastCardField();
      await this.selectLastEventField();
      await this.selectLastActionField();

      await this.doClick(await this.saveSubscription, "Clicking Save Subscription");

      const successToastEle = await this.getCardSettingsSuccessToast(cardTitle);
      await successToastEle.waitForExist({ timeout: 60000 });
      return await successToastEle.isExisting();
  }

  public async openCardSettings(cardTitle: string) {
      const threeDotsEle = await this.getdots(cardTitle);
      await CommonFunctions.logMessage('INFO', `Clicking three dots menu of card ${cardTitle}`);
      await threeDotsEle.waitForExist({ timeout: 10000 });
      await this.doClick(threeDotsEle, `Clicking three dots menu of card ${cardTitle}`);
      await CommonFunctions.logMessage('INFO', `Clicking on settings item from three dots menu`);
      await this.settingsItemInEditView.waitForDisplayed({ timeout: 6000 });
      await this.doClick(this.settingsItemInEditView, "Clicking on settings item from three dots menu");
      await browser.pause(2000);
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

  public async actionsType(cardTitle:string) : Promise<boolean>{
    await browser.pause(5000);
    await this.saveBtn.click();
    await browser.pause(5000);
    const cardDisplay = await this.getcardText(cardTitle);
    await cardDisplay.waitForExist({timeout: 60000})
    const validationT:boolean= await cardDisplay.isExisting();
    const clickOnGraph = await this.graphClick;
    await this.doClick(clickOnGraph, "Clicking on graph to refresh the card");
    const graphName= await $("//div[@data-testid='KPI-Quarter Sales-card-header'][1]")
    await graphName.waitForExist({timeout: 60000})
    // const refreshCard= await this.graphName
    const validationR:boolean= await graphName.isExisting();
    return (validationT&&validationR)
  }

  public async verifyGraphInCard(cardTitle: string): Promise<boolean> {
    const cardTitleEle = await this.getGraphByCardTitle(cardTitle);
    const hasGraph = await cardTitleEle.$('svg.highcharts-root').isDisplayed();
    await CommonFunctions.logMessage('INFO',`Is Graph with title ${cardTitle} exist :: ${hasGraph}`);
    return hasGraph;
  }

  public async verifyDataInCard(cardTitle: string) {
    await browser.pause(15000)
    const cardData = await this.noDataAvailable();
    const isNoRecords = await cardData.isExisting();
    if(isNoRecords) {
      return false;
    }
    return true;
  }
  
  public async verifyNetworkGraph(cardTitle: string): Promise<boolean> {
    await browser.pause(15000)
    const cardTitleEle = await this.getGraphByCardTitle(cardTitle);
    const hasGraph = await cardTitleEle.$('//div[@id="network-graph"]').isDisplayed();
    await CommonFunctions.logMessage('INFO',`Is Graph with title ${cardTitle} exist :: ${hasGraph}`);
    return hasGraph;
  }

  public async verifyNoDataInCard(cardTitle: string): Promise<boolean> {
    const cardTitleEle = await this.getNoDataCard(cardTitle);
    await cardTitleEle.waitForDisplayed({timeout:4000});
    const isEleExist: boolean = await cardTitleEle.isExisting();
    await CommonFunctions.logMessage('INFO',`Is Graph with title ${cardTitle} exist :: ${isEleExist}`);
     return await isEleExist;
  }

  public async verifyDataInNPICard(cardTitle: string): Promise<boolean> {
    await browser.pause(15000);
    const cardData = await this.noDataToDisplayNpiCard(cardTitle);
    const isNoData = await cardData.isExisting();
    return isNoData ? false : true
  }

  public async verifySomethingWentWrongInCard(cardTitle: string): Promise<boolean> {
    await browser.pause(15000)
    const cardTitleEle = await this.getSomethingWentWrongCard(cardTitle);
    await cardTitleEle.waitForDisplayed({timeout: 4000});
    const isEleExist: boolean = await cardTitleEle.isExisting();
    await CommonFunctions.logMessage('INFO',`Is Graph with title ${cardTitle} exist :: ${isEleExist}`);
     return await isEleExist;
  }

  public async setCardDataEndpoint(value: string) {
    console.log("Value of string", value)
    const inputEle = await this.cardDataEndpointInput;
    await CommonFunctions.logMessage('INFO',`Setting ${value} value for Data input`);
    await browser.pause(25000)
    await inputEle.click(); 
    await inputEle.setValue(['Control', 'a']); 
    await inputEle.keys('Backspace'); 
    await browser.pause(2000);
    await inputEle.setValue(value);
  }

  public async setCardMetadataEndpoint(value: string) {
    console.log("Value of string", value)
    const inputEle = await this.cardMetadataEndpointInput;
    await CommonFunctions.logMessage('INFO',`Setting ${value} value for MetaData input`);
    await browser.pause(15000)
    await inputEle.click(); 
    await inputEle.setValue(['Control', 'a']); 
    await inputEle.keys('Backspace'); 
    await browser.pause(2000);
    await inputEle.setValue(value);
  }

  public async setChartType() {
    console.log("Value of string")
    const chartTypeDropdown = await this.selectChartTypeDropdown();
    chartTypeDropdown.click();
    await this.setChartTypeValue().click()
  }

  public async setCombinationCardDataEndpoint(endPoint1: string, endPoint2: string) {
    await browser.pause(15000);
    const inputEle = await this.combinationCardDataEndpointInput;
    await browser.pause(5000)
    await CommonFunctions.logMessage('INFO',`Setting ${endPoint1} value for Chart1 Data input`);
    await this.clearAndSetInputValue(inputEle[0], endPoint1)
    await browser.pause(5000);
    await CommonFunctions.logMessage('INFO',`Setting ${endPoint2} value for Chart2 Data input`);
    await this.clearAndSetInputValue(inputEle[1], endPoint2)
    await browser.pause(5000)
  }

  public async searchCardInCardGallery(cardTitle: string) {
    const searchInput = await this.searchCardInput;
    await this.addTextFieldValue(cardTitle, searchInput);
  }

  public async editDataEndpoint(cardTitle: string, data: any, cardType: ICardType = ''): Promise<boolean> {
    await this.searchCardInCardGallery(cardTitle);
    await this.clickSettingsIconOnCard(cardTitle);
    await browser.pause(5000);
    await CommonFunctions.logMessage('INFO', `cardtype:: ${cardType}`)
    switch(cardType) {
      case 'Combination Chart':
        await this.setCombinationCardDataEndpoint(data.endPoint1, data.endPoint2);
        break;
      case 'Scenario Comparision Chart':
        await this.setCardPredefinedEndPointt(data);
        break;
      case 'Tree Table':
        await this.setTableCardDataEndpoint(data.endPoint1);
        await this.setTableCardMetadataEndpoint(data.endPoint2);
        break;
      case 'NPI Card':
        const datasection = await this.navToDataintheCardSettings;
        await this.doClick(datasection, 'Clicking on Meta Data button');
        const pathField = await $("//div[@data-testid='cdsp-scenario-comparison-data-config-predefined-endpoint-box']//div[@role='searchbox']");
        await pathField.scrollIntoView();
        await pathField.waitForExist({timeout: 15000});
        await this.doClick(pathField, 'Clicking on path field in NPI card');
        const endPoint= await $(`//div[@role='presentation']//li//span[text()='${data}']`);
        await endPoint.waitForExist({timeout: 15000});
        await this.doClick(endPoint, 'Selecting endpoint in NPI card');
        break;
      case 'Heat Map Chart':
        const heatDropdown = await $("//div/input[@data-testid='lui-portal-data-config-predefined-endpoint-select']");
        await heatDropdown.scrollIntoView();
        await heatDropdown.waitForExist({timeout: 15000});
        await this.doClick(heatDropdown, 'Clicking on Heat Map Chart dropdown');
      const dropdownSelect= await $(`//div[@role='presentation']//li//span[text()='${data}']`);

      await dropdownSelect.waitForExist({timeout: 15000});
      await this.doClick(dropdownSelect, 'Clicking on dropdown select');
        break;
      default:
        await this.setCardDataEndpoint(data);
    }
    await browser.pause(3000);
    await this.clickPublishBtn();
    const successToastEle = await this.getEditSuccessToastForCard(cardTitle);
    await successToastEle.waitForExist({timeout: 60000})
    const isUpdated:boolean = await successToastEle.isExisting();
    return isUpdated;
  }

    // Function to edit data and metadata endpoints
  public async editCardDataEndpoints(cardTitle: string, dataEndPoint: string, metadataEndpoint: string) {
    const cardGallerySearch = await this.cardGallerySearch;
    await cardGallerySearch.click();
    await browser.pause(2000);
    // await cardGallerySearch.setValue(cardTitle);;
    for (const char of cardTitle) {
        await cardGallerySearch.addValue(char);
        await browser.pause(100); // Small delay to mimic user typing
    }
    await this.clickSettingsIconOnCard(cardTitle);
    await browser.pause(15000);
    const btnTest=await this.predefinedData;
    const isSelected:boolean= await btnTest.isSelected();
    if(isSelected){
      // await this.predefinedData.click();
      const field=await this.predefinedData;
      await browser.execute(async (elem) => {
        elem.click();
      }, field);
      await browser.pause(3000);
      await CommonFunctions.logMessage('INFO',`Clicked on predata toggle button`);
    }
    else{
      await CommonFunctions.logMessage('INFO',`predata toggle button is not selected`);
    }
    await this.setCardDataEndpoint(dataEndPoint);
    await browser.pause(3000);
    await this.setCardMetadataEndpoint(metadataEndpoint);
    await browser.pause(5000);
    await this.clickPublishBtn();
    const successToastEle = await this.getEditSuccessToastForCard(cardTitle);
    await successToastEle.waitForExist({timeout: 60000})
    const isUpdated:boolean = await successToastEle.isExisting();
    return isUpdated;
  }
  
  public async setTableCardDataEndpoint(dataEndpoint: string) {
    console.log("data endpint: ", dataEndpoint)
    const dataInputEle = await this.tableCardDataEndpointInput;
    await CommonFunctions.logMessage('INFO',`Setting ${dataEndpoint} value for Data input`);
    await browser.pause(10000);
    await dataInputEle.click(); 
    await dataInputEle.setValue(['Control', 'a']); 
    await dataInputEle.keys('Backspace'); 
    await browser.pause(2000);
    await dataInputEle.setValue(dataEndpoint);
  }

  public async setTableCardMetadataEndpoint(metadataEndpoint: string) {
    console.log("metadata endpoint: ", metadataEndpoint)
    const metaDataInputEle = await this.tableCardMetadataEndpointInput;
    await CommonFunctions.logMessage('INFO',`Setting ${metadataEndpoint} value for MetaData input`);
    await browser.pause(10000);
    await metaDataInputEle.click();
    await metaDataInputEle.setValue(['Control', 'a']);
    await metaDataInputEle.keys('Backspace');
    await browser.pause(2000);
    await metaDataInputEle.setValue(metadataEndpoint);
  }
  public async setCardPredefinedEndPointt(option: string) {
    await browser.pause(15000);
    const predefinedSwitch = await this.predefinedDataSwitch;
    await browser.pause(5000);
    await predefinedSwitch.waitForExist();
    const isSwitchEnabled = await predefinedSwitch.isSelected();
    await CommonFunctions.logMessage('INFO',`is predefined dataendpoint switch enabled:: ${isSwitchEnabled}`);
    if(!isSwitchEnabled) {
      await predefinedSwitch.click();
    }
    const data = {
      value: option,
      labelName: 'Use Predefined Endpoint'
    };
    await this.predefinedEndpointInput.click();
    await this.setDropdownValue(data, this.predefinedEndpointInput, true);
    await browser.pause(5000);
  }

  public async verifySCGraphInCard(cardTitle: string) {
    await browser.pause(25000);
    const hasGraph = await this.getSCGraph(cardTitle);
    await CommonFunctions.logMessage('INFO',`Is Graph with title ${cardTitle} exist :: ${hasGraph}`);
    return await hasGraph.isExisting();
  }

  // public async verifySCselectedScenario(scenarioName: string): Promise<boolean> {
  //   const chip = await this.scenarioChipByName(scenarioName);
  //   return await chip.isExisting();
  // }
  
  
  public async verifyInvalidDataInSCCard(cardTitle: string) {
    await browser.pause(25000)
    const cardTitleEle = await this.invalidDataSCCard(cardTitle);
    // await cardTitleEle.waitForDisplayed({timeout:4000});
    // await cardTitleEle.waitForDisplayed({timeout:4000});
    const isEleExist: boolean = await cardTitleEle.isExisting();
    await CommonFunctions.logMessage('INFO',`Is Graph with title ${cardTitle} exist :: ${isEleExist}`);
     return await isEleExist;
  }

  public async verifySomethingWentWrongInSCCard(){
    const title = await $(`//div[@data-testid="scenario-comparison-empty-error-element"]`);
    await title.waitForDisplayed({ timeout: 90000 })
    return await title.isDisplayed(); 
  }

  public async getViewId(url: string) {
    const params = new URL(url).searchParams;
    await CommonFunctions.logMessage("INFO",`params are ${params}`);
    return params.get('viewId');
  }

  public async getContextId(url: string) {
    const params = new URL(url).searchParams;
    await CommonFunctions.logMessage("INFO",`params are ${params}`);
    return params.get('contextId');
  }
  public async getUrlId(url:String,sName :string){
    if (url.includes(sName)){
      await CommonFunctions.logMessage("INFO",`url contains Scaffolding integration text`);
      return true;
    } 
    else{
      await CommonFunctions.logMessage("INFO",`url does not contains Scaffolding integration text`);
      return false;
    }
  }

  public async assigneeFieldCheck(fieldValue: string, taskName: string): Promise<boolean> {
      await this.switchToMfe();
      const chipLabel = await this.assignedToChipLabel;
      const isChipExist = await chipLabel.isExisting();
      if (isChipExist) {
          const chipText = await chipLabel.getAttribute('aria-label');
          console.log('Assigned To chip text:', chipText);
          const isSameValue = await CommonFunctions.compareTwoValues(fieldValue, chipText, "<>");
          const isTaskPresent = await this.actionTaskName(taskName);
          return (isChipExist && isSameValue && isTaskPresent);
      } else {
          return false;
      }
  }
  
  public async actionTaskName(taskName): Promise <boolean>{
    const taskTitle= await this.titleName(taskName);
    const taskExist:boolean = await taskTitle.isDisplayed();
    if(taskExist)
    {
    await CommonFunctions.logMessage('INFO', 'task assigned to user is displayed');
      return true;
    }
    else{
      await CommonFunctions.logMessage('INFO', 'task assigned to user is not displayed');
      return false;
    }
  }
  public async selectViewByTypeAndName(viewType: "All Views" | "Favourites" | "Hidden Views", viewName: string) {
    await CommonFunctions.logMessage('INFO', 'Selection of the view from the dropdown');
    const selectDropdown = await this.selectProcessDropdown;
    const existingViewType: string = await selectDropdown.getValue();
    await CommonFunctions.logMessage("INFO",`Existing selected view type is ${existingViewType}`);  
    if(existingViewType != viewType){
      await CommonFunctions.logMessage("INFO",`Clicking on views dropdown`);
      await browser.execute(async (ele)=> {
        ele.click();
      },selectDropdown);
      await browser.pause(5000);
      const selectViewType = await this.getViewType(viewType);
      await CommonFunctions.logMessage("INFO",`Selected view type is "${viewType}" from dropdown`);
      await browser.execute(async (ele)=> {
        await ele.click();
      },selectViewType);
      await browser.pause(5000);
    }
    await browser.pause(5000);
    const targetView = await this.getViewByName(viewName);
    await targetView.waitForClickable({timeout:90000});
    await CommonFunctions.logMessage("INFO",`Selecting ${targetView} view from "${viewType}" list`);
    await targetView.click();
  }

  public async isBackBtnDisplayed(): Promise<boolean> {
    await browser.pause(5000);
    const backBtnEle = await this.backBtnHiddenView;
    await browser.pause(3000);
    const isBackBtnExist: boolean = await backBtnEle?.isExisting() ?? false;
    await CommonFunctions.logMessage("INFO",`Is back button exist :: ${isBackBtnExist}`);
    return isBackBtnExist;
  }

  public async drillThroughViewTransition(viewType: string, viewName, previousViewName = 'Hidden View'){
    await CommonFunctions.logMessage('INFO', 'Selecting the view for drill through navigation');
    const selectedView = await this.getSelectedViewByName(viewName)
    await selectedView.isExisting();
    await console.log(`current selected view is ${viewName}`);
    const viewHeading = await this.getHeadingByViewName(viewName)
    await viewHeading.isExisting();
    const contextClear = await this.clearBtn;
    await contextClear.click();
    await console.log('Cleared the context');
    if(viewType == 'Hidden View'){
      await CommonFunctions.logMessage('INFO', 'Hitting the back icon button if the view is a hidden view');
      const backButton = this.getBackButton;
      await backButton.click();
      console.log('Back button is clicked')
      await browser.pause(6000);
      await console.log(`Navigating back to ${viewName} view from ${previousViewName}`)
      const currentViewHeading = await this.getHeadingByViewName(previousViewName)
      await currentViewHeading.isExisting();
    }
  }
 
  public async configurationOfViewToOpenInNewTab(cardTitle: string, tableNumber:number = 0){
    await CommonFunctions.logMessage('INFO', 'Opening the edit view and for new tab configuration');
    // const editViewBtn = await this.editBtn;
    // await editViewBtn.click();
    await this.clickEditBtn()
    await CommonFunctions.logMessage('INFO', 'Clicking on edit view button');
    await browser.pause(2000);
    const threeDotBtn = await this.getThreeDotsBtnInCard(cardTitle)
    await threeDotBtn.click();
    await CommonFunctions.logMessage('INFO', 'Clicking on edit the card three dot menu');
    await browser.pause(2000);
    if(tableNumber > 0){
      const viewSetting = await this.settingsItemInEditViewWithIndex(tableNumber)
      await viewSetting.scrollIntoView();
      await viewSetting.click();
      await CommonFunctions.logMessage('INFO', 'Clicking on edit the setting option ');
    }
    else{
      const viewSetting = await this.settingsItemInEditView
      await viewSetting.scrollIntoView();
      await viewSetting.click();
      await CommonFunctions.logMessage('INFO', 'Clicking on edit the setting option ');
    }
    await browser.pause(3000);
    const newTabCheckBox = await this.newTabCheckbox
    await newTabCheckBox.scrollIntoView();
    const isCheckBoxSelected: boolean = await newTabCheckBox.isSelected();
    await CommonFunctions.logMessage("INFO",`Is new tab checkbox selected :: ${isCheckBoxSelected}`);
    if(!isCheckBoxSelected){
      await CommonFunctions.logMessage('INFO', 'Clicking on the checkbox to open in new tab ');
      await newTabCheckBox.click();
    }
    const saveBtn = await this.saveSettingsBtn;
    await saveBtn.click();
    await CommonFunctions.logMessage('INFO', 'Clicking on the save button ');
    await browser.pause(2000);
    const headerSaveBtn = await this.headerSaveButton;
    await headerSaveBtn.click();
    await CommonFunctions.logMessage('INFO', 'Clicking on the header save button ');
    await browser.pause(5000);
  }
  public async deleteSubscription(cardTitle : string): Promise<boolean> {
    await browser.pause(2000);
    const threeDotsEle = await this.getdots(cardTitle);
    await CommonFunctions.logMessage('INFO',`Clicking three dots menu of card ${cardTitle}`);
    // await browser.pause(10000);
    await threeDotsEle.waitForExist({timeout:10000})
    await threeDotsEle.click();
    await CommonFunctions.logMessage('INFO',`Clicking on settings item from three dots menu`);
    // await browser.pause(5000);
    await this.settingsItemInEditView.waitForDisplayed({timeout:6000});
    await this.settingsItemInEditView.click();
    await browser.pause(5000);
    const deletecardsubscription = await this.deleteSubscript;
    await this.doClickUsingScript(deletecardsubscription, "Clicking on delete subscription button");
    await browser.pause(10000);
    const isDeleted : boolean= await deletecardsubscription.isDisplayed();
    await this.saveSubscription.click();
    await browser.pause(5000);
    await this.saveBtn.click();
    return isDeleted;
  }
  public async dataSyncSatusWidgetExist(status: string): Promise<boolean> {
    const dataSyncStatusWidget = await this.dataSyncStatus(status);
    const exists = await dataSyncStatusWidget.isExisting();
    if (exists) {
        await CommonFunctions.logMessage("PASS", `Data Sync Status widget for '${status}' exists.`);
    } else {
        await CommonFunctions.logMessage("FAIL", `Data Sync Status widget for '${status}' does not exist.`);
    }
    return exists;
}
 public async dataNotAvailableIsExist(){
  const noDataAvailableText = await this.noDataAvailable();
  const exists = await noDataAvailableText.isExisting();
  if (exists) {
      await CommonFunctions.logMessage("PASS", `No Data Availble exists.`);
  } else {
      await CommonFunctions.logMessage("FAIL", `No Data Availble  doesn't exists.`);
  }
  return exists;
 }
public async waitForDataSyncStatusWidget(status: string, maxWaitingTimeInMinutes: number): Promise<boolean> {
    const maxAttempts = maxWaitingTimeInMinutes;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            await CommonFunctions.logMessage("INFO", `Attempt:: ${attempt}`);
            if (await this.dataSyncSatusWidgetExist(status)) {
                await this.clickInteractiveDataStatus();
                return true;
            }
            await browser.pause(60000); // Wait for 1 minute
        } catch (error) {
            console.warn(`Attempt ${attempt + 1} failed. Error: ${error.message}`);
        }
    }
    await CommonFunctions.logMessage(
        "FAIL",
        `Data sync status widget for '${status}' was not found after ${maxWaitingTimeInMinutes} minutes.`
    );
    return false;
}

public async verifyDataSyncStatusMessage(expectedMessage: string, status: string): Promise<boolean> {
  const dataSyncStatusMessage = await this.dataSyncStatusMessage(expectedMessage);
  const exists = await dataSyncStatusMessage.isExisting();
  if (exists) {
      await CommonFunctions.logMessage("PASS", `Data Sync Status message '${expectedMessage}' is verified for status '${status}'.`);
  } else {
      await CommonFunctions.logMessage("FAIL", `Data Sync Status message '${expectedMessage}' does not exist for status '${status}'.`);
  }

  return exists;
}

public async verifyScenarioDetails(status: string): Promise<boolean> {
  const scenarioDetails = await this.dataSyncCardScenario;
  const exists = await scenarioDetails.isExisting();

  if (exists) {
      await CommonFunctions.logMessage("PASS", `Scenario details are verified for status '${status}'.`);
  } else {
      await CommonFunctions.logMessage("FAIL", `Scenario details are missing for status '${status}'.`);
  }

  return exists;
}

public async verifyRunDifferentScopeBtn(btnName: string): Promise<boolean> {
    const runDifferentScopeBtn = await this.getRunDifferentBtn(btnName);
    const isScopeBtnExist = await runDifferentScopeBtn.isExisting();
    return isScopeBtnExist;
}
public async verifyRunDifferentScenarioBtn(btnName: string): Promise<boolean> {
    const runDifferentScenarioBtn = await this.getRunDifferentBtn(btnName);
    const isScenarioBtnExist = await runDifferentScenarioBtn.isExisting();
    return isScenarioBtnExist;
}

public async clickOnRunDifferentScopeOrScenarioBtn(btnName: string): Promise<void> {
    const button = await this.getRunDifferentBtn(btnName);
    await button.waitForExist({ timeout: 10000 });
    await this.doClick(button, `Clicking on '${btnName}' button`);
}

public async verifySetFiltersText(): Promise<boolean> {
    const setFiltersText = await this.setFiltersToGetStartedText;
    const isSetFiltersDisplayed = await setFiltersText.isExisting();
    if (isSetFiltersDisplayed) {
        await CommonFunctions.logMessage("PASS", `"Set filters to get started" text is displayed on the empty state screen`);
    } else {
        await CommonFunctions.logMessage("FAIL", `"Set filters to get started" text is not displayed on the empty state screen`);
    }
    return isSetFiltersDisplayed;
}

public async validateSCADropdownStatus(): Promise<boolean> {
  const scaDropdown = await this.scaDropdown;
  const isScaDropdownExist = await scaDropdown.isExisting();
  if (isScaDropdownExist) {
      const isDisabled = !(await scaDropdown.isEnabled());
      if (isDisabled) {
          await CommonFunctions.logMessage("PASS", `SCA dropdown is displayed and disabled on the screen`);
          return true;
      } else {
          await CommonFunctions.logMessage("FAIL", `SCA dropdown is displayed but is active/enabled on the screen`);
          return false;
      }
  } else {
      await CommonFunctions.logMessage("FAIL", `SCA dropdown is not displayed on the screen`);
      return false;
  }
}

public async verifyConfigureBtn(): Promise<boolean> {
  const configureBtn = await this.configureBtn;
  const isConfigureBtnExist = await configureBtn.isExisting();
  if (isConfigureBtnExist) {
      await CommonFunctions.logMessage("PASS", `Configure button is displayed on the empty state screen`);
  } else {
      await CommonFunctions.logMessage("FAIL", `Configure button is not displayed on the empty state screen`);
  } 
  return isConfigureBtnExist;
}

public async clickOnConfigureBtn(): Promise<void> {
  const configureBtn = await this.configureBtn;
  await configureBtn.waitForExist({ timeout: 6000 });
  await this.doClick(configureBtn, "Clicking on Configure button");
}

public async verifyClusterDetails(status: string): Promise<boolean> {
  const clusterDetails = await this.dataSyncCardCluster;
  const exists = await clusterDetails.isExisting();

  if (exists) {
      await CommonFunctions.logMessage("PASS", `Cluster details are verified for status '${status}'.`);
  } else {
      await CommonFunctions.logMessage("FAIL", `Cluster details are missing for status '${status}'.`);
  }

  return exists;
}
public async verifyProcedureDetails(status: string): Promise<boolean> {
  const procedureDetils = await this.procedureDetils;
  const exists = await procedureDetils.isExisting();

  if (exists) {
      await CommonFunctions.logMessage("PASS", `procedureDetils are verified for status '${status}'.`);
  } else {
      await CommonFunctions.logMessage("FAIL", `procedureDetils are missing for status '${status}'.`);
  }

  return exists;
}
public async verifyRunByUserDetails(status: string,userName: string): Promise<boolean> {
  const runByUserDetails = await this.rubByDetails;
  const exists = await runByUserDetails.isExisting();

  if (exists) {
      await CommonFunctions.logMessage("PASS", `runByUserDetails are verified for status '${status}'.`);
  } else {
      await CommonFunctions.logMessage("FAIL", `runByUserDetails are missing for status '${status}'.`);
  }

  return exists;
}
public async verifyRunIdDetails(status: string): Promise<boolean> {
  const runIdDetails = await this.runIdDetails;
  const exists = await runIdDetails.isExisting();

  if (exists) {
      await CommonFunctions.logMessage("PASS", `runIdDetails are verified for status '${status}'.`);
  } else {
      await CommonFunctions.logMessage("FAIL", `runIdDetails are missing for status '${status}'.`);
  }

  return exists;
}

public async verifyDataFromMoreDetailsODM() {
  const dataFrom = await this.dataFromMoreDetialsODM;
  const exists = await dataFrom.isExisting();
  if (exists) {
      await CommonFunctions.logMessage("PASS", `Data from is verified for status.`);
      await browser.execute(async (elem) => {
      elem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    }, dataFrom); 
    await browser.pause(5000);
    const getAllScenariosInODM =  await this.getAllScenariosInODM();
    return getAllScenariosInODM;
  } else {
    await CommonFunctions.logMessage("FAIL", `Data from is missing for status`);
  }
}

public async verifyUpdateDateFromMoreDetailsODM() {
  const updateDate = await this.updateDateFromMoreDetailsODM; 
  const exists = await updateDate.isExisting();  

  if (exists) {
      await CommonFunctions.logMessage("PASS", `Update Date is verified for status.`);
  } else {
      await CommonFunctions.logMessage("FAIL", `Update Date is missing for status.`);
  }
  return exists;
}

public async verifyRunByFromMoreDetailsODM(){
  const runBy = await this.runByFromMoreDetailsODM;
  const exists = await runBy.isExisting();

  if (exists) {
      await CommonFunctions.logMessage("PASS", `Run By is verified for status.`);
  } else {
      await CommonFunctions.logMessage("FAIL", `Run By is missing for status.`);
  }

  return exists;
}

public async verifyProcedureDetailsFromMoreDetailsODM(){
  const procedureDetails = await this.procedureNameMoreDetailsODM;
  const exists = await procedureDetails.isExisting();

  if (exists) {
      await CommonFunctions.logMessage("PASS", `Procedure Details are verified for status.`);
  } else {
      await CommonFunctions.logMessage("FAIL", `Procedure Details are missing for status.`);
  }

  return exists;
}

public async verifyPlanningInstanceIdFromMoreDetailsODM(){
  const planningInstanceId = await this.planningInstanceFromMoreDetailsODM;
  const exists = await planningInstanceId.isExisting();
  if (exists) {
      await CommonFunctions.logMessage("PASS", `Planning Instance ID is verified for status.`);
  } else {
      await CommonFunctions.logMessage("FAIL", `Planning Instance ID is missing for status.`);
  }

  return exists;
}

public async getPlanningInstanceId(){
  const planningInstanceId = await this.doGetText(await this.planningInstanceFromMoreDetailsODM, "Fetch planning instance id");
  return planningInstanceId;
}

public async getPlanningInstanceIdFromMoreDetailsODM() {
  const planningInstanceId = await this.planningInstanceFromMoreDetailsODM.getText();
  return planningInstanceId;
}

public async verifyRunIdFromMoreDetailsODM(){
  const runId = await this.runIdFromMoreDetilasODM;
  const exists = await runId.isExisting();

  if (exists) {
      await CommonFunctions.logMessage("PASS", `Run ID is verified for status.`);
  } else {
      await CommonFunctions.logMessage("FAIL", `Run ID is missing for status.`);
  }

  return exists;
}

public async getRunIdFromMoreDetailsODM() {
  const runId = await this.runIdFromMoreDetilasODM.getText();
  return runId;
}

public async verifyProcedureTimeFromMoreDetailsODM(){
  const procedureTime = await this.procedureTimeFromMoreDetailsODM;
  const exists = await procedureTime.isExisting();

  if (exists) {
      await CommonFunctions.logMessage("PASS", `Procedure Time is verified for status.`);
  } else {
      await CommonFunctions.logMessage("FAIL", `Procedure Time is missing for status.`);
  }

  return exists;
}

public async verifyScenarioIdFromMoreDetailsODM(){
  const scenarioId = await this.scenarioIdFromMoreDetailsODM;
  const exists = await scenarioId.isExisting();

  if (exists) {
      await CommonFunctions.logMessage("PASS", `Scenario ID is verified for status.`);
  } else {
      await CommonFunctions.logMessage("FAIL", `Scenario ID is missing for status.`);
  }

  return exists;
}

public async clickODMButtom() {
  const ODMIsVisible = await this.dataSyncContentIsVisible.isExisting();
  if(!ODMIsVisible){
  const ODMButton = await this.interactiveDataStatusIcon;
  await ODMButton.waitForDisplayed({ timeout: 60000 });
  await ODMButton.click();
  await browser.pause(5000);
  }
}

public async verifyDataSyncStatusTest(
    status: string,
    expectedMessage: string,
    verifyCluster = false,
    maxWaitingTimeInMinutes = 0,
    userName?: string,
): Promise<boolean> {
    const isIconVisible = await this.clickInteractiveDataStatus();
    const dataResponse = await this.waitForDataSyncStatusWidget(status, maxWaitingTimeInMinutes);
    // Handle "started" status with dynamic waiting
    if (status === "started" && !dataResponse) {
        return false;
    }
    // Proceed with verification if the widget exists
    if (isIconVisible && (await this.dataSyncSatusWidgetExist(status))) {
        await browser.pause(10000);
        await this.clickODMButtom();
        await browser.pause(5000);
        const messageVerified = await this.verifyDataSyncStatusMessage(expectedMessage, status);
        const runByUserDetailsVerified = userName ? await this.verifyRunByUserDetails(status,userName): true;
        return messageVerified && runByUserDetailsVerified;
    }
    await CommonFunctions.logMessage("PASS", `Data Sync Status widget for '${status}' is not present, skipping further checks.`);
    return true;
}

 public async verifyRealmIdDataSyncStatus(realmId){
  const realm = await this.realmIdFromMoreDetailsODM.getText();
  if(realm === realmId){
    return true;
  }
  else{
    return false
  }
 }

 public async openMoreDetailsODM() {
    const showMoreDetailsBtn = await this.moreDetailsODM;
    await showMoreDetailsBtn.click();
    await browser.pause(2000);
    CommonFunctions.logMessage("INFO", "Clicked show more to open More details popup ODM")
 }

 public async navigateToProcedureDetailsODM() {
    await this.doClick(await this.interactiveDataStatusIcon, 'Clicking on Interactive Data Status Icon');
    await browser.pause(2000);
    await this.doClick(await this.procedureDetailsODM, 'Clicking on Procedure Details to navigate to Obsevability');
    CommonFunctions.logMessage("INFO", "Clicked on Procedure Details to navigate to Obsevability")
  }

 public async verifyAllScenariosInODM() {
    const scenarioName = await this.ScenarioInODM;
    await browser.execute(async (elem) => {
      elem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    }, scenarioName); 
    await browser.pause(5000);
    const getAllScenariosInODM = await this.getAllScenariosInODM();
    CommonFunctions.logMessage("INFO", `All scenarios from planning instaceId : ${getAllScenariosInODM}`);
    return getAllScenariosInODM;
 }
 
  public async getAllScenariosInODM() {
    let scenariosInODM : any = [];
    const getAllScenarios = await this.getAllScenarios;
    for (const scenario of getAllScenarios) {
      const scenarioText = await scenario.getText();
      scenariosInODM.push(scenarioText);
    }
    CommonFunctions.logMessage("INFO", `All scenarios from planning instaceId : ${scenariosInODM}`);
    return scenariosInODM;
  }
  public async closeMoreDetailsODM() {
    const isTitleExist = await this.moreDetailsTitleODM.isExisting();
    const closeBtn =await this.closeBtnMoreDetailsODM;
    await closeBtn.click();
    CommonFunctions.logMessage("INFO", "Clicked Close to close More details popup ODM")
    await browser.pause(3000);
    return isTitleExist;
  }

  public async configureFilters(filterConfigs: { type: string; category: string; value: string[] }[], enableRelevantFilter: boolean = false): Promise<boolean> {
    let filterCols: string[];
  try{
    // Step 1: Navigate to the Scope tab and open the Configure Filter dialog
    await scope.clickOnTab('Scope');
    await browser.pause(1000);
    await scope.click3Dot();
    await browser.pause(1000);
    await scope.select3DotOption('Edit Configuration');
  
    // Step 2: Iterate through each filter configuration and apply the filters
    for (const config of filterConfigs) {
      await scope.selectFilterEntryFromDialogConfig('Select', config.type);
      await browser.pause(1000); // Allow filter selection to take effect
    }
  
    // Step 3: Proceed to the next step in the dialog
    await scope.filterDialogSaveCancel('Next');
  
    // Step 4: Select dimension hierarchy levels for each filter
    for (const config of filterConfigs) {
      await scope.selectDimensionHierarchyLevel(config.type, [config.category], 'check');
    }
  
    await browser.pause(1000);
    // Step 5: Save the configured filters
    await scope.filterDialogSaveCancel('Save');

    if(enableRelevantFilter){
      const filterSectionElement = await this.filterSection;
      await filterSectionElement.moveTo();
      const enableRelevantFilterElement = await this.relevantFiltersChip;
      await enableRelevantFilterElement.click();
      const enableRelevantButtonElement = await this.enableRelevantFilterButton;
      await enableRelevantButtonElement.click();
      await browser.pause(3000);
    }
  
    // Step 6: Add specific values to the selected filters
    for (const config of filterConfigs) {
      await scope.addFiltersToDimensionHierarchyInScope(config.type, config.category, config.value);
    }
    // Step 7: Apply the filters and finalize the configuration
    await scope.clickOnApplyFiltersBtn();
    await browser.pause(5000); 
  
    return true;
  }
  catch(error){
    console.error('Error configuring filters:', error);
    return false;
  }
  }

  public async openViews() {
    await scope.clickOnTab('Views');
  }
  


  public async sessionSelectPopup(option: string) {
    // Log checking the presence of the popup heading and description
    await CommonFunctions.logMessage('INFO', 'Checking for the existence of session selection popup heading and description.');

    const sessionSelectPopupHeading = await this.sessionSelectHeading;
    const scopeSelectionPopupDescription = await this.scopeSelectionDescription;

    if (sessionSelectPopupHeading.isExisting() && scopeSelectionPopupDescription.isExisting()) {
        await CommonFunctions.logMessage('INFO', 'Session selection popup is displayed.');

        // Handle the options using a switch statement
        switch (option) {
            case "createNewSession":
                const syncBtn = await this.syncButton;
                // Log before checking and clicking Option 1
                if(syncBtn.isExisting()){
                  await CommonFunctions.logMessage('INFO', 'Sync Button exist clicking on it');
                    syncBtn.click()
                  }
                return true
                break;

            case "syncExistingSession":
                // Log before checking and clicking Option 2
                await CommonFunctions.logMessage('INFO', 'Option 2 selected: Continuing with an existing session.');

                const option2 = await this.continueWithExistingSession;
                if (option2.isExisting()) {
                    await CommonFunctions.logMessage('INFO', 'Option 2 (Continue with Existing Session) is available. Clicking on it.');
                    await option2.click();
                } else {
                    await CommonFunctions.logMessage('ERROR', 'Option 2 (Continue with Existing Session) is not available.');
                }
                return true;
                break;

            default:
                await CommonFunctions.logMessage('ERROR', `Invalid option provided: ${option}.`);
        }
       
    } else {
        await CommonFunctions.logMessage('ERROR', 'Session selection popup heading or description is not displayed.');
        return false
    }
  }
public async isRowArrowExists(sFieldValue: string){
    await browser.pause(10000);
    await CommonFunctions.logMessage('INFO',`verifying the cell ${sFieldValue}`)
    const lblFieldValue = await this.getCellEle(sFieldValue);
    // await lblFieldValue.scrollIntoView();
    console.log('check 1')
    await lblFieldValue.waitForClickable({timeout: 40000});
    await lblFieldValue.click();
    await browser.pause(2000);
    const arrowBtn= await this.rowArrow(sFieldValue);
    await browser.pause(2000);
    // await arrowBtn.waitForExist({timeout:25000});
    const arrowDisplay: boolean= await arrowBtn.isDisplayed();
    return arrowDisplay;
  }
  public async onRowDrillThrough(sFieldValue){
    const arrowBtn= await this.rowArrow(sFieldValue);
    await arrowBtn.click();
    await browser.pause(2000);
    await CommonFunctions.switchToSpecificWindow(1);
    }
    public async verifyTargetName()
    { 
      this.switchToMFEFrame();
    await browser.pause(5000);
    const header= await $("//h2[text()='DR Destination']");
    let name = await header.getText();
    await browser.pause(5000);
    return name;
  }
  public async rowCondition(cardTitle: string, turnOn: boolean) {
    await this.threeDotBtnsOfCard(cardTitle);
    await this.settingOptionOfCard();
    await browser.pause(5000);
    await this.conditionToggleBtn(turnOn);
    await browser.pause(5000);
    await this.saveSubscription.click();
    // await browser.pause(5000);
    const successToastEle = await this.getCardSettingsSuccessToast(cardTitle);
    await successToastEle.waitForExist({timeout: 60000})
    const isUpdated:boolean = await successToastEle.isExisting();
    await browser.pause(5000);
    await this.saveBtn.click();
    return isUpdated;
  }
  
  public async closePopupModal() {
    const closeBtn = await this.closePopupModalIcon
    await closeBtn.click();
    await browser.pause(4000);
    return true;
  }

  public async closeWizard() {
    const closeBtn = await this.closeWizardIcon
    await closeBtn.click();
    await browser.pause(4000);
    return true;
  }

  public async fillFormData(inputFields: InputField[]){
    for(let field of inputFields){
      const inpEle = await this.getInputField(field.labelName);
      const isInpFieldExist: boolean = await inpEle.isExisting();
      await CommonFunctions.logMessage("INFO",`Is ${field.labelName} input field exist in form :: ${isInpFieldExist}`);
      if(isInpFieldExist) {
        await browser.pause(2000);
        if(field.fieldType === "dropdown"){
          await this.setDropdownValue(field, this.getdropdownField(field.labelName))
          await browser.keys('Tab');
        }
        else if(field.fieldType === "combobox") {
          await this.setComboboxValue(field, inpEle);
          await browser.keys('Tab');
        }
        else if(field.fieldType === "date") {
          await this.setDateValue(field, this.getCalendarIcon(field.labelName));
          await browser.keys('Tab');
        }
        else {
          await this.setTextField(field, inpEle);
          await browser.keys('Tab');
        }
      }
    }
  }

  public async clickOnMyTaskTitle(cardTitle: string, rowTitle: myTaskRowTitle) {
    const getMyTaskRowTitleDiv = await this.getMyTaskRowTitleDiv(cardTitle, rowTitle);
    await getMyTaskRowTitleDiv.click();
    await browser.pause(70000);
  }

  public async doesCollaborationDialogOpened() {
    await browser.pause(5000);
    await browser.switchToParentFrame()
    const collaborationRoomsDialogTitle = await this.collaborationDialogTitle;
    const collaborationRoomsDialogExists = await collaborationRoomsDialogTitle.isExisting();
    await this.switchToMFEFrame()
    if (collaborationRoomsDialogExists) {
      return true;
    }
    return false;
  }

  public async doesNotificationDialogOpened() {
    await browser.pause(5000);
    await browser.switchToParentFrame()
    const notificationsDialogTitle = await this.notificationDialogTitle;
    const notificationDialogExists = await notificationsDialogTitle.isExisting();
    await this.switchToMFEFrame()
    if (notificationDialogExists) {
      return true;
    }
    return false;
  }

  public async closeNotificationsPanel() {
    await browser.switchToParentFrame();
    const closeIcon = await this.notificationPanelCloseIcon;
    await closeIcon.click();
    await browser.pause(2000);
    await this.switchToMfe();
  }

public async verifyNoColumnsStateInCard(cardTitle?: string) {
  const icon = await this.noColumnsIcon;
  await icon.waitForDisplayed({ timeout: 10000 });
  const doesIconExists = await icon.isExisting();
  if(doesIconExists) {
    return true;
  }
  return false;
}

public async verifyDataInMyTaskCardAfterSave(cardTitle: string) {
    const dataAfterSave = await this.myTaskCardRowsafterSave(cardTitle);
    if (Array.isArray(dataAfterSave) && dataAfterSave.length > 0) {
      await dataAfterSave[0].waitForDisplayed({ timeout: 5000 });
      const dataExists = await dataAfterSave[0].isExisting();
      if(dataExists) {
        return true;
      }
    }
    return false;
  }

  public async verifyDataInMyTaskCard(cardTitle: string) {
    const data = await this.myTaskCardRows(cardTitle);
    await data.waitForDisplayed({ timeout: 5000 });
    const dataExists = await data.isExisting();
    if(dataExists) {
      return true;
    }
    return false;
  }

  public async editCardAndVerifyButtons(cardTitle: string, editIconLocator?: WebdriverIO.Element) {
    const editIcon = editIconLocator || await this.getCardEditButtonByTitle(cardTitle);
    await editIcon.waitForClickable({ timeout: 5000 });
    await CommonFunctions.logMessage('INFO', `Clicking the edit icon in ${cardTitle} card`);
    await editIcon.click();

    await browser.pause(2000);
  
    const cancelButton = await this.getCancelButton();
    const saveButton = await this.getSaveButton();
    const result = await cancelButton.isDisplayed() && await saveButton.isDisplayed();
    return result;
  }
  
  private async makeCellsEditableAndSetValue() {
    const cells = await $$(
      `//div[@data-testid='enhanced-table-edit-cell-default' and ./div/input[@type='text' and string-length(@value) > 0]]`
    );
  
    for (const cell of cells.slice(0, 3)) {
      await browser.pause(500);
  
      const inputField = await cell.$('./div/input');
      await CommonFunctions.logMessage('INFO', 'Focussing the input to enter the value!');
      await browser.execute((el) => el.click(), inputField);
  
      await inputField.waitForDisplayed({ timeout: 2000 });
      await CommonFunctions.logMessage('INFO', `Entering the value in the input cell: ${this.getRandomSpecialCharacter()}`);

      await inputField.setValue(` ${this.getRandomSpecialCharacter()}`);
    }
  }
  
  // Method for saving changes
  public async makeCellEditableAndSaveChanges() {
    await this.makeCellsEditableAndSetValue();
  
    // Get and click the Save button
    const saveButton = await this.getSaveButton();
    await saveButton.waitForDisplayed({ timeout: 1000 });
    await CommonFunctions.logMessage('INFO', 'Clicking the Save button!');
    await saveButton.click();

    // Wait for and interact with the snackbar
    const snackbar = await $(
      `//div[@role="presentation" and contains(@class, "MuiSnackbar-root") and contains(@class, "MuiSnackbar-anchorOriginBottomCenter")]`
    );
    await snackbar.waitForDisplayed({ timeout: 5000 });
    await CommonFunctions.logMessage('INFO', 'Snackbar is displayed!');

    return await snackbar.isDisplayed()    // Logs true or false
  }
  
  // Method for canceling changes
  public async makeCellEditableAndCancelChanges() {
    await this.makeCellsEditableAndSetValue();
  
    // Click the cancel button
    const cancelButton = await this.getCancelButton();
    await cancelButton.waitForDisplayed({ timeout: 5000 });
    await CommonFunctions.logMessage('INFO', 'Clicking the Cancel button!');
    await cancelButton.click();

    await browser.pause(2000);
  
    // Wait for the discard button in popup and click it
    const discardBtnInPopup = await this.discardButton();
    await discardBtnInPopup.waitForDisplayed({ timeout: 5000 });
    const isDisplayed = await discardBtnInPopup.isDisplayed();
    await CommonFunctions.logMessage('INFO', 'Clicking the Discard button to cancel the changes!');

    await discardBtnInPopup.click();
    return isDisplayed;
  }
  
  
  public async multipleChipsFiltering() {
      const anchorElement = await this.getChipCellLink();
      await anchorElement.waitForDisplayed();
      await anchorElement.scrollIntoView();

      const tdElement = await browser.execute((anchor) => {
        return anchor.closest('td');
      }, anchorElement);
      const tdElementWebdriverIO = await $(tdElement);
      await tdElementWebdriverIO.moveTo();    
      await CommonFunctions.logMessage('INFO', 'Clicking the multiple chips');
      await browser.execute((element) => element.click(), anchorElement);
  
      await browser.pause(1000);
  
      const popupElement = await this.getChipsPopup();
      await popupElement.waitForDisplayed({ timeout: 5000 });
      const isPopupDisplayed = await popupElement.isDisplayed();
  
      await browser.pause(1000);
  
      const inputField = await $("[data-testid='chip-list-popup-lui-search'] input");
      await inputField.waitForDisplayed({ timeout: 5000 });
      await CommonFunctions.logMessage('INFO', 'Entering the value to the search control: Archived');
      await inputField.setValue('Archived');
  
      await browser.pause(1000);
  
      const closeBtn = await $(`//button[@data-testid='chip-list-popup-content-close-icon']`);
      await closeBtn.waitForDisplayed({ timeout: 5000 });
      await CommonFunctions.logMessage('INFO', 'Clicking the close button!');
      await closeBtn.click();
  
      return isPopupDisplayed;
  }
  
  public async dropdownWithFiltering(cardTitle: string) {
    await this.editCardAndVerifyButtons(cardTitle);
  
    const firstButton = await $$('//button[@data-testid="list-type-cell-edit-link-icon"]')[0];
    await firstButton.scrollIntoView();
    await firstButton.waitForClickable({ timeout: 5000 });
    await CommonFunctions.logMessage('INFO', `Clicking the dropdown to view the content in ${cardTitle} card`);
    await firstButton.click();
  
    await browser.pause(500);
  
    const popup = await $('//div[@data-testid="listpopupcontent"]');
    await popup.waitForDisplayed({ timeout: 5000 });
    const isPopupDisplayed = await popup.isDisplayed();
    await browser.waitUntil(
      async () => {
        const items = await popup.$$('[data-testid="lui-ccl-list-item-container"]');
        return items.length > 0;
      },
      {
        timeout: 10000,
        timeoutMsg: 'No dropdown items rendered inside the popup within timeout'
      }
    );
  
    const input = await popup.$('input');
    await CommonFunctions.logMessage('INFO', 'Searching the dropdown filter with user input: Leonardo');
    await input.setValue('Leonardo');
  
    const checkbox = await $('//span[@data-testid="list-popupcontent-cell-list-check-checkbox"]');
    await CommonFunctions.logMessage('INFO', 'Clicking the checkbox to select from dropdown');
    await checkbox.click();
  
    await browser.pause(1000);
  
    const closeButton = await $('//button[@data-testid="list-popupcontent-close-icon"]');
    await CommonFunctions.logMessage('INFO', 'Clicking the close button to close the popup');
    await closeButton.click();
  
    return isPopupDisplayed;
  }

  private getRandomSpecialCharacter(): string {
    const specialCharacters = "!@#$%^&*()_+[]{}|;:',.<>?/`~";
    const randomIndex = Math.floor(Math.random() * specialCharacters.length);
    return specialCharacters[randomIndex];
}
  
  public async waitUntilCardLoaded(cardTitle) {
    await browser.waitUntil(
      async () => {
        const dashboardCard = await $(`//*[@data-testid="lui-dashboard-card"]//input[contains(@value, "${cardTitle}")]`);
        return await dashboardCard.isExisting();
      },
      {
        timeout: 60000,
        timeoutMsg: `${cardTitle} card not found`,
        interval: 5000
      }
    );
  }  
  
 public async openCollaborationRoomPanel() {
    await browser.switchToParentFrame();
    const chatButton = await this.chatButton;
    await this.doClick(chatButton, "Clicked on collaboration chat icon");
  }

  public async createCollaborationRoom() {
    const createRoomButton = await this.createCollaborationRoomicon;
    await this.doClick(createRoomButton, "Clicked on create + collaboration room button");
  }

public async ContextDataFromUI(entity: string, entityName: string, viewId: string | number, viewName : string): Promise<{ entity: string, entityName: string, viewId: string | number, viewName : string}> {
    
    const entityEle = this.getContextValue(String(entity));
    await entityEle.waitForDisplayed({ timeout: 20000 });
    const entityValue = await entityEle.getText();

    let entityNameValue = '';
    const entityNameEle = this.getContextValue(String(entityName));
    await entityNameEle.waitForDisplayed({ timeout: 20000 });
    entityNameValue = await entityNameEle.getText();

    const viewIdEle = this.getContextValue(String(viewId));
    await viewIdEle.waitForDisplayed({ timeout: 20000 });
    const viewIdValue = await viewIdEle.getText();
    
    const selectedViewName = await this.getContextValue(viewName).getText();
    CommonFunctions.logMessage("INFO", `Entity: ${entityValue}, Entity Name: ${entityNameValue}, View ID: ${viewIdValue}`);
    return { entity: entityValue, entityName: entityNameValue, viewId: viewIdValue, viewName: selectedViewName };
}

  public async getAssumptionIdFromCollaborationRoom(entityId: string){
      const assumptionId = await this.getContextValue(entityId);
      await assumptionId.waitForDisplayed({ timeout: 20000 });
      return await assumptionId.getText();
    }

public async getContextDataFromURL(entity: string | number, entityName: string | number): Promise<string> {
    const url = await browser.getUrl();
    const urlObj = new URL(url);
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

  public async closeCollaborationPanel() {
    await browser.switchToParentFrame();
    const closeIcon = await this.collaborationPanelCloseIcon;
    await closeIcon.click();
    await browser.pause(2000);
    await CommonFunctions.logMessage("INFO", "Closed collaboration room panel");
    await this.switchToMfe();
  }

  public async signOut() {
    await browser.switchToParentFrame();
    await CommonFunctions.logMessage("INFO", "Clicking on user profile icon");
    const userIconButton = await this.userIconButton;
    await userIconButton.click();
    await CommonFunctions.logMessage("INFO", "Clicked on user profile icon");
    await browser.pause(2000);
    await CommonFunctions.logMessage("INFO", "Clicking on Signout button");
    const signOutButton = await this.signOutButton;
    await signOutButton.click();
    await CommonFunctions.logMessage("INFO", "Clicked on Signout");
    await browser.pause(10000);
  }

  public async getProcessName(): Promise<string> {
    await browser.switchToParentFrame();
    const breadcrumbEle = await this.processFromBreadCrumb;
    const processName = await breadcrumbEle.getText();
    await CommonFunctions.logMessage("INFO",`Process name :: ${processName}`);
    await this.switchToMFEFrame();
    return processName;
  }

  public async openViewSettings(view: string) {
    await this.clickViewsDropDown();
    await this.selectAllViewsOrFavourites('All Views');
    await this.clickDashBoard(view);
    await this.click3dotIconOnDashboard();
    await browser.pause(5000);
    await this.selectOptionFrom3dotIconOnDashboard("View Settings");
  }

  public async openDuplicateView(view: string) {
    await this.clickViewsDropDown();
    await this.selectAllViewsOrFavourites('All Views');
    await this.clickDashBoard(view);
    await browser.pause(4000);
    await this.click3dotIconOnDashboard();
    await browser.pause(2000);
    await this.selectOptionFrom3dotIconOnDashboard("Duplicate View");
  }

  public async saveViewsettings() {
    const btn = await this.viewSettingsSaveBtn;
    await btn.waitForClickable({ timeout: 5000 });
    await this.doClick(btn, "Clicked on View Settings save button");
  }

  public async saveDuplicateView() {
    const btn = await this.viewSettingsSaveBtn;
    await btn.waitForClickable({ timeout: 5000 });
    await this.doClick(btn, "Clicked on Duplicate View save button");
    await browser.pause(2000);
    await CommonFunctions.verifyAlertMsg('Duplicating your view - this should only take a moment.');
    return await CommonFunctions.verifyAlertMsg('View duplicated successfully.');
  }

  public async changeViewGroupOfView(viewName: string, targetVG: string) {
    await this.openViewSettings(viewName);
    await GlobalSettings.selectViewGroup(targetVG);
    await this.saveViewsettings();
    await browser.pause(50000);
  }

  public async checkViewExistsWithViewGroup(viewGroupName: string, viewName: string) {
    const valid = await this.toggleViewGroupExpansion(viewGroupName, 'OPEN');
    if(!valid) {
      return false;
    }
    const view = await this.getViewEleWithViewGroup(viewGroupName, viewName);
    await view.waitForDisplayed({ timeout: 30000 })
    if(view){
      await CommonFunctions.logMessage("INFO", `View: ${viewName} exists under view group: ${viewGroupName}`);
      return true;
    }
    await CommonFunctions.logMessage("INFO", `View: ${viewName} doesn't exists under view group: ${viewGroupName}`);
    return false;
  }

  public async verifyViewGroupInPO(viewGroupName: string, viewName: string) {
    const input = await this.viewGroupInput;
    await this.clearAndSetInputValue(input, viewGroupName);
    await browser.keys('Down arrow');
    await CommonFunctions.logMessage("INFO",`${viewGroupName} selected from dropdown`);
    await browser.keys('Enter');
    const viewExists = await GlobalSettings.searchViewExist(viewName);
    return viewExists;
  }

  public async isViewGroupExists(viewGroup: string) {
    const viewGp = await this.getViewGroup(viewGroup);
    await viewGp.waitForExist({ timeout: 10000});
    const isExists = await viewGp.isExisting();
    await CommonFunctions.logMessage("INFO", `View group: ${viewGroup} exists :: ${isExists}`);
    if(isExists) {
      return true;
    }
    return false;
  }

  public async isViewGroupOpened(viewGroup: string) {
    const viewGp = await this.viewGroupOpened(viewGroup);
    if(await viewGp.isExisting()) {
      await CommonFunctions.logMessage("INFO", `View group: ${viewGroup} is in OPEN state`);
      return true;
    }
    await CommonFunctions.logMessage("INFO", `View group: ${viewGroup} is not found in OPEN state`);
    return false;
  }

  public async toggleViewGroupExpansion(viewGroup: string, toggle: 'OPEN' | 'CLOSE') {
    await browser.pause(5000);
    const isExists = await this.isViewGroupExists(viewGroup);
    if(!isExists) {
      await CommonFunctions.logMessage("INFO", `View group: ${viewGroup} not found`);
      return false;
    }
    const isOpen = await this.isViewGroupOpened(viewGroup);
    if ((isOpen && toggle === 'CLOSE') || (!isOpen && toggle === 'OPEN')) {
      const vg = await this.getViewGroup(viewGroup);
      await vg.click();
    }
    await CommonFunctions.logMessage("INFO", `View group expansion ${toggle} done`);
    return true;
  }

  public async getCurrentPageTitle(expectedTitle: string): Promise<boolean> {
    const title = await $(`//*[contains(text(), "${expectedTitle}")]`);
    await title.waitForDisplayed({ timeout: 50000 })
    return await title.isDisplayed();
  }

  public async isScopeApplied(dimensions: Record<string, string>): Promise<boolean> {
    try {
      await browser.pause(5000);
      // const scopeTab = await this.getScopeTab();
      // await scopeTab.moveTo();
      // await scopeTab.click();
      await CommonFunctions.logMessage('INFO', `Clicked on Scope tab`);
      await browser.pause(30000);
      for (const [dimensionCategory, filters] of Object.entries(dimensions)){
        await CommonFunctions.logMessage('INFO', `Processing dimension category: ${dimensionCategory}`);
        
        for (const [filterName, appliedFilterValue] of Object.entries(filters)) {
          const filterSectionExists = await $(`//div[@data-testid='vf-filterPanel-property-${filterName.toUpperCase()}']`).isExisting();
          if (!filterSectionExists) {
          await CommonFunctions.logMessage('INFO', `Filter section not found : ${filterName}`);
          return false;
        }
        
        const filterElement = await scope.verifyAppliedFilterInScope(filterName, appliedFilterValue);
        if (!(await filterElement)) {
          console.log(`Filter not applied: ${filterName} → ${appliedFilterValue}`);
          return false;
        }
      }
    }
      return true;
    } catch (error) {
      console.error("Error checking applied filters:", error);
      return false;
    }
  }

  public async isScopeAppliedInDrawer(dimensions: Record<string, string>): Promise<boolean> {
    scope.clickOnTab('Scope');
    await browser.pause(5000);
    const isScope = await this.isScopeApplied(dimensions);
    scope.closeDrawer();
    return isScope;
  }

  public async isColumnsValidated(cellValue: string): Promise<boolean> {
    await browser.pause(5000);
    await CommonFunctions.logMessage('INFO', `Validating column with value: ${cellValue}`);
    const lblFieldValue = await this.getCellEle(cellValue);
    await lblFieldValue.waitForDisplayed({ timeout: 90000 });
    const isDisplayed = await lblFieldValue.isDisplayed();
    return isDisplayed;
  }

  public async  isBDEElementPresent(cellValue) {
    await browser.pause(5000);
    await CommonFunctions.logMessage('INFO', `Validating column with value: ${cellValue}`);
    const element = await $$(`//p[text()='${cellValue}']`);
    return element.length > 0;
}

  public async isScenarioChipCorrect(text: string): Promise<boolean> {
    await CommonFunctions.logMessage('INFO', `Fetching tooltip text for scenario chip`);
    const toolTipText = await scope.getBudgeText();
    const bValidation1 = toolTipText.includes(text);
    return bValidation1;
  }

  public async isGlobalScopeChipDisplays() {
    const globalScopeChip = await this.getGlobalChip();
    let isDisplay: boolean = await globalScopeChip.isExisting();
    await CommonFunctions.logMessage('INFO', `Global Scope Chip Displays :: ${isDisplay}`)
    return isDisplay;
  }

  public async getScenarioChipText():Promise<string> {
    // await this.switchToMFEFrame();
    await CommonFunctions.logMessage('INFO', `Fetching text from scenario chip`);
    const chipText = await scope.getBudgeText();
    return chipText;
  }

  public async isTextPresentInChip(text) {
    await browser.pause(5000);
    const xpath = `//div[@data-testid="lui-ccl-chip"]//*[text()="${text}"]`;
    const elements = await $$(xpath);
    return elements.length > 0;
  }

  public async verifyDefaultScenarioInTab(text) {
    try {
      await browser.pause(5000);
      // const scopeTab = await this.getScenariosTab();
      // await scopeTab.moveTo();
      // await scopeTab.click();
      await scope.clickOnTab('Scenarios');
      await CommonFunctions.logMessage('INFO', `Clicked on Scenario tab`);
      await browser.pause(10000);
      await CommonFunctions.logMessage('INFO', `Check Scenario in Scenario tab`);
      return this.isTextPresentInChip(text);
    } catch (error) {
      console.error("Error checking applied Scenario:", error);
      return false;
    }
  }

  public async Processlist(){
      await this.doClick(await this.get4mProcesslist(), "Click on PSAutomation from the list");
    }


  public async getBDETableCellChevron() {
    // return process.env.PSENV === "QA"
    //   ? await $('//tbody//tr[2][@data-testid="tableRow"]//td[7][@data-testid="tableCellChevron"]')
    //   : await $('//tbody//tr[2][@data-testid="tableRow"]//td[6][@data-testid="tableCellChevron"]');
      return await $('//tbody//tr[2][@data-testid="tableRow"]//td[6][@data-testid="tableCellChevron"]');
  }

  public async performDrillThroughOnBDECard(cardName: string) {
    await browser.pause(15000);
    const bdeCardElement = await this.getBDECardElement(cardName);
    await bdeCardElement.moveTo();
    await CommonFunctions.compareTwoValues(await bdeCardElement.isExisting(), true, "BDE Card Exists");
    const tableCellChevron = await this.getBDETableCellChevron();
    if (await tableCellChevron.isExisting()) {
      await tableCellChevron.click();
      await CommonFunctions.logMessage("INFO", "Peforming Drill Through - Clicked on the table cell chevron.");
    } else {
      await CommonFunctions.logMessage("FAIL", "Peforming Drill Through - Table cell chevron not found.");
    }
  }


  public async getPlanningInstaceIdFromODM() {
    const showMoreODM = await this.showMoreODMButton;
    if(await !showMoreODM.isDisplayed()){
      const ODMButton = await this.interactiveDataStatusIcon;
      await ODMButton.waitForDisplayed({ timeout: 60000 });
      await ODMButton.click();
    }
    await showMoreODM.click();
    await browser.pause(2000);
    const planningInstanceId = await this.valuePlanningInstanceId.getText();
    const ODMModalCloseButton = await this.showMoreODMClose;
    await ODMModalCloseButton.click();
    await browser.pause(2000)
    return planningInstanceId;
  }
  public async getEntityNameForPowerBar(processName: string, subProcessName?: string, Assumption?: string) {
    const context = [processName, subProcessName || Assumption].filter(Boolean).join(' > ');
    const entityName = await this.processContextChip;
    await CommonFunctions.logMessage('INFO',`Context name and entityName are : ${context} ${await entityName.getText()}`);
    return entityName
  }
  public async clickOnSpecificEntityInPowerBar(processName: string, subProcessName?: string, Assumption?: string) {
    const entityName = [processName, subProcessName || Assumption].filter(Boolean).pop() as string;
    const entityElement = await this.getEntityDetailsByText(entityName);
    await this.doClick(entityElement, `Clicked on PowerBar entity: ${entityName}`);
  }

  public async verifyContextEntity(processName : string, subProcessName? : string, Assumption? : string, waitForDetailsPage?: boolean ) {
    const pageTitle = await this.getProcessNameText(subProcessName || Assumption || processName);
    waitForDetailsPage && await browser.waitUntil(async () => (await pageTitle.isDisplayed()),{timeout:90000,timeoutMsg:'sub process details not loaded',interval:5});
    const context = [processName, subProcessName || Assumption].filter(Boolean).join('>');
    await CommonFunctions.logMessage('INFO', `Context is : ${context}`);
    await browser.pause(5000);
    let entityEles:WebdriverIO.Element[] = await this.processContextChipEles;
    entityEles = (subProcessName || Assumption) ? entityEles : (entityEles.length > 0 ? entityEles.slice(0,1) : []) ; // If subProcessName or Assumption is not provided, only take the first entity
    let powerBarEntityName :string = '';
    for (const entityEle of entityEles) {
      const entityText = await entityEle.getText();
      await CommonFunctions.logMessage('INFO', `Entity text is : ${entityText}`);
      powerBarEntityName+= entityText;
    }
    await CommonFunctions.logMessage('INFO', `PowerBar entity name is : ${powerBarEntityName}`);
    // Remove separators from both before comparing
    const normalizedPowerBar = powerBarEntityName.replace(/>/g, '');
    const normalizedContext = context.replace(/>/g, '');
    return normalizedPowerBar === normalizedContext;
  }

  public async goToSubProcessDetailsPage(processName, subProcessName) {
    await ProcessPage.clickOnProcess(processName);
    await CommonFunctions.logMessage('INFO', `Clicked on process ${processName}`);
    await ProcessPage.clickOnProcess(subProcessName);
    await CommonFunctions.logMessage('INFO', `Clicked on sub-process ${subProcessName}`);
  }

  public async goToAssumptionDetailsPage(processName, assumption) {
    if (processName) {
      await ProcessPage.clickOnProcess(processName);
      await CommonFunctions.logMessage('INFO', `Clicked on process ${processName}`);
    }
    const getAssumption = await this.getAssumption;
    await getAssumption.click();
    await browser.pause(5000);
    await ProcessPage.clickOnProcess(assumption);
    await CommonFunctions.logMessage('INFO', `Clicked on assumption ${assumption}`);
  }

  public async verifyScopeInBudgeAndVF() {
    const scopeInbudge = await this.scopeChipInPowerBar.getText();
    const scopeInVF = await scope.getAppliedVFTitle();
    const normalizedBudge = scopeInbudge.toLocaleLowerCase().replace(/\*/g, '').replace(/\s+/g, ' ').trim();
    const normalizedVF = scopeInVF.toLocaleLowerCase().replace(/\*/g, '').replace(/\s+/g, ' ').trim();
    await CommonFunctions.compareTwoValues(normalizedBudge, normalizedVF, `Scope in Budge is ${scopeInbudge} and Scope in VF is ${scopeInVF}`);
    return normalizedBudge === normalizedVF;
  }

  public async verifyPowerBarDetails( type: entity = 'Sub-process', processName : string, subProcessName? : string, assumption?: string, waitForDetailsPage?: boolean) {
    let bValidation1 = false;
    let bValidation2 = true; 
    let bValidation3 = true;
    let bValidation4 = true;
    const isEntityNameDisplayed = await this.verifyContextEntity(processName, subProcessName, assumption, waitForDetailsPage);
    bValidation1 = await CommonFunctions.compareTwoValues(isEntityNameDisplayed, true, "PowerBar entity name is displayed");
    if(type === 'Process') {
      const isProgressBarExist = await this.ContextProgressBar.isExisting();
      bValidation2 = await CommonFunctions.compareTwoValues(isProgressBarExist, true, "PowerBar progress bar is displayed");
    }
    const activePage = await this.getActivePageName();
    if(activePage === 'Planning') {
      const scopeChip = await this.scopeChipInPowerBar;
      bValidation3 = await CommonFunctions.compareTwoValues(await scopeChip.isExisting(), true, `PowerBar scope chip is displayed as ${await scopeChip.getText()}`);
      const scenarioChip = await this.scenarioChipInPowerBar;
      bValidation4 = await CommonFunctions.compareTwoValues(await scenarioChip.isExisting(), true, `PowerBar scenario chip is displayed as ${await scenarioChip.getText()}`);
    }
    return bValidation1 && bValidation2 && bValidation3 && bValidation4;
  }

  public async verifyPowerBarScopeChipClick() {
    const scopeChip = await this.scopeChipInPowerBar;
    await scopeChip.waitForDisplayed({ timeout: 50000 });
    await scopeChip.click();
    await CommonFunctions.logMessage('INFO', `Clicked on PowerBar scope chip`);
    await browser.pause(2000);
    const isScopeDrawerOpened = await this.doesSideNavDrawerOpened('Scope');
    if (isScopeDrawerOpened) {
      await CommonFunctions.logMessage('INFO', `Scope side navigation panel opened successfully`);
      return true;
    }
    await CommonFunctions.logMessage('INFO', `Scope side navigation panel doesn't exist`);
    return false;
  }

  public async verifyPowerBarScenarioChipClick() {
    const scenarioChip = await this.scenarioChipInPowerBar;
    await scenarioChip.waitForDisplayed({ timeout: 150000 });
    await scenarioChip.click();
    await CommonFunctions.logMessage('INFO', `Clicked on PowerBar scenario chip`);
    await browser.pause(2000);
    const isScenariosDrawerOpened = await this.doesSideNavDrawerOpened('Scenarios');
    if (isScenariosDrawerOpened) {
      await CommonFunctions.logMessage('INFO', `Scenarios side navigation panel opened successfully`);
      return true;
    }
    await CommonFunctions.logMessage('INFO', `Scenarios side navigation panel doesn't exist`);
    return false;
  }
  
  public async verifyPowerBarDetailsInAllPages(quickLinksList: any, type: entity = 'Sub-process', processName: string, subProcessName?: string, assumption?: string) {
    let isValidation: boolean = true;
    for(const item of quickLinksList) {
      await CommonFunctions.logMessage('INFO', `Verifying PowerBar details in ${item} page`);
      await browser.pause(5000);
      await ProcessPage.clickLeftpaneLinks(item);
      await browser.pause(15000);
      const isPowerBarDisplayed = await this.verifyPowerBarDetails(type, processName, subProcessName, assumption);
      let powerbarValidation = await CommonFunctions.compareTwoValues(isPowerBarDisplayed, true, `PowerBar details are displayed in "${item}" page`);
      if(!powerbarValidation) {
        CommonFunctions.logMessage('INFO', `PowerBar details are not displayed in ${await item} page`);
        isValidation = false;
      }
      isValidation = isValidation && powerbarValidation;
      await browser.pause(2000);
    }
    return isValidation;
  }

  public async clickOnPowerBarEntity(processName : string, subProcessName? : string, assumption? : string) {
    const entityName = await this.getEntityNameForPowerBar(processName, subProcessName, assumption);
    await this.doClick(entityName, `Clicked on PowerBar entity: ${entityName}`);
    await browser.pause(2000);
  }

  public async closePowerBarEntityTooltip(processName : string, subProcessName? : string, assumption? : string) {
    const closeIcon = await this.processContextChipCloseIcon;
    await this.doClick(closeIcon, "Clicked on PowerBar entity tooltip close icon");
  }

  public async verifyPowerBarToolTipDetails(processName : string, entityType : string, subProcessName? : string, assumption? : string) {
    let checkProcessProgress = true;
    await this.clickOnSpecificEntityInPowerBar(processName, subProcessName, assumption);
    const toolTipHeading = await this.getToolTipText.getText();
    const entity = subProcessName || assumption || processName;
    const cycleName = subProcessName ? 'Cycle Name' : assumption ? 'Origin Cycle' : 'Cycle Name';
    if(entity === processName) {
      checkProcessProgress = await this.progressBar.isExisting();
      await CommonFunctions.compareTwoValues(checkProcessProgress, true, "Progress bar is displayed");
    }
    await CommonFunctions.logMessage('INFO',`Entity: ${entity}, Cycle Name: ${cycleName}`);
    
    const entityNameText = await this.getEntityName(entity).getText();
    const statusText = await this.getStatusText.getText();
    const cycleNameText = await this.getCycleName(cycleName).getText();
    await this.closePowerBarEntityTooltip(processName, subProcessName, assumption);
    await this.clickOnListingIcon();
    const recentlyOpenedText = await this.getRecentlyOpenedText.getText();
    await CommonFunctions.logMessage('INFO',`entityNameText : ${entityNameText}, statusText : ${statusText}, cycleNameText:  ${cycleNameText}, recentlyOpenedText : ${recentlyOpenedText}`);
    const headerElement = await this.goToPOListingPageAndVerify();
    await this.navToPreviousPage();
    
    await this.navToDetailsPage(processName, entityType , subProcessName, assumption);
    const processNameText = await this.getProcessNameText(entity);
    await browser.waitUntil(async () => (await processNameText.isDisplayed()),{timeout:25000,timeoutMsg:'PO process details not loaded',interval:5});
    await browser.pause(10000);
    await CommonFunctions.logMessage('INFO',`headerElement : ${headerElement} processNameText : ${await this.getProcessNameText(entity).getText()} toolTipHeading :  ${toolTipHeading} checkProcessProgress : ${checkProcessProgress}`);
    if (toolTipHeading && entityNameText && statusText &&  cycleNameText && recentlyOpenedText && headerElement && processNameText && checkProcessProgress) {
      return true;
    };
  }

  public async clickOnListingIcon() {
    await this.doClick(await this.imgListingIcon, "Clicked Listing Icon");
  }

  public async goToPOListingPageAndVerify() {
    await this.doClick(await this.getAllProcessButton, "Clicked on All Process button");
    return await ProcessPage.getPageTitle();
  }

  public async navToPreviousPage() {
    await browser.back();
    await browser.pause(10000);
    await this.switchToMfe();
    await CommonFunctions.logMessage('INFO',`back to previous page`);
  }

  public async navToDetailsPage(processName : string, entityType : string, subProcessName? : string, assumption? : string ) {
    await this.clickOnSpecificEntityInPowerBar(processName, subProcessName, assumption);
    const allDetailsButton = await this.getAllDetailsButton;
    await allDetailsButton.click();
    await CommonFunctions.logMessage('INFO',`back to previous page`);
  }

  public async verifyRecentlyViewedProcess(processName : string, entityType : string, recentlyOpenedProcess : string[], isPlanningSpace ?: boolean, subProcessName ?: string, assumption ?: string) {
    let recentlyOpenedEntites: string[] = [];
    await browser.pause(5000);
    // navigate to each process in recentlyOpenedProcess and passed process
    for(const process of [...recentlyOpenedProcess, processName]) {
      await this.clickOnListingIcon();
      await this.doClick(await this.getAllProcessButton, "Clicked on All Process button");
      await ProcessPage.getPageTitle();
      await ProcessPage.clickOnProcess(process);
      if(!isPlanningSpace) {
        await ProcessPage.clickLeftpaneLinks('Planning');
      }
      await browser.pause(10000);
    }

    // await this.getPowerBarToolTip(recentlyOpenedProcess[recentlyOpenedProcess.length - 1], entityType, subProcessName, assumption);
    await this.clickOnListingIcon();
    const getAllRecentlyOpenedProcess = await this.getAllRecentlyOpenedEntities;
    for (const recentlyOpenedProcess of getAllRecentlyOpenedProcess) {    
      await recentlyOpenedProcess.isDisplayed();
      const recentlyOpenedProcessText = await recentlyOpenedProcess.getText();  
      recentlyOpenedEntites.push(recentlyOpenedProcessText);
    }

    const checkRecentlyOpenedEntityContext = await this.verifyRecentlyViewedEntityContext(processName, 'Process'); // check if passed process is the top one in recently opened list and context is correct or not
    await CommonFunctions.logMessage('INFO',`recentlyOpenedProcess: ${JSON.stringify([...recentlyOpenedProcess, processName].sort())},recentlyOpenedEntites: ${JSON.stringify([...recentlyOpenedEntites].sort())}, checkRecentlyOpenedEntityContext : ${checkRecentlyOpenedEntityContext}`);
    if(JSON.stringify([...recentlyOpenedProcess, processName].sort()) === JSON.stringify([...recentlyOpenedEntites].sort()) && checkRecentlyOpenedEntityContext) {
        await CommonFunctions.logMessage('INFO',`recentlyOpenedProcess : ${recentlyOpenedProcess} recentlyOpenedEntites : ${recentlyOpenedEntites} checkRecentlyOpenedEntityContext : ${checkRecentlyOpenedEntityContext}`);
        return true
    }
  }

  public async getRowDimensionsForBDECard(rowNo: number): Promise<{[key: string]: {[key: string]: string}}> {
    try {
      const columnXPaths = [
        `//tbody//tr[${rowNo + 1}][@data-testid="tableRow"]//td[2]//p`,
        `//tbody//tr[${rowNo + 1}][@data-testid="tableRow"]//td[3]//p`,
        `//tbody//tr[${rowNo + 1}][@data-testid="tableRow"]//td[4]//p`
      ];

      const keys = ['CUSTOMER', 'ITEM', 'LOCATION'];
      const labels = ['Customer', 'Item', 'Location'];
      const result: {[key: string]: {[key: string]: string}} = {};

      for (let i = 0; i < columnXPaths.length; i++) {
        const element = await $(columnXPaths[i]);
        const text = await this.getElemementText(element);
        result[keys[i]] = { [labels[i]]: text };
        await CommonFunctions.logMessage('INFO', `Row ${rowNo} ${keys[i]}: ${labels[i]} = ${text}`);
      }
      return result;
    } catch (error) {
      await CommonFunctions.logMessage('ERROR', `Failed to get table row data for row ${rowNo}: ${error.message}`);
      return {};
    }
  }

  public async verifyRecentlyViewedEntityContext(processName : string, entityType : string) {
    const recentlyOpenedProcess = await this.getRecentlyOpenedProcess(1); 
    await recentlyOpenedProcess.click();
    await CommonFunctions.switchToSpecificWindow(1);
    await browser.pause(10000);
    await this.switchToMfe();
    await browser.pause(3000);
    const getProcessName = await this.verifyContextEntity(processName);
    await browser.pause(3000);
    await CommonFunctions.switchToSpecificWindow(0);
    await this.switchToMfe();
    await browser.pause(5000);
    const getProcess = await this.verifyContextEntity(processName);
    await CommonFunctions.logMessage('INFO',`getProcess : ${getProcess} getProcessName : ${getProcessName}`);
    if(getProcessName && getProcess) {
      await CommonFunctions.logMessage('INFO',`getProcess and getProcessName are : ${getProcess} ${getProcessName}`);
      return  true;
    }
  }

  public async hoverOnPowerBarEntityName(entityType : string) {
    await this.mouseHover(await this.getEntityChip(entityType), "Mouse Hovering on power bar entity");
    await browser.pause(5000);
  }

  public async clickOnPowerBarEntityName(entityType : string) {
    await this.doClick(await this.getEntityChip(entityType), "Clicking on power bar entity::" + entityType);
    await browser.pause(2000);
  }

  public async navToEntityDetailsPage(entityType : string) {
    await this.clickOnPowerBarEntityName(entityType);
    await this.doClick(await this.getAllDetailsButton, "Clicking on entity details button");
    await CommonFunctions.logMessage('INFO',`Navigated to ${entityType} details page from PowerBar`);
  }

   public async verifyPowerBarEntityToolTipDetails(entityType : string, processName : string, subProcessName? : string, assumption? : string) {
    let checkProcessProgress : any = true;
    await this.clickOnSpecificEntityInPowerBar(processName, subProcessName, assumption);
    await browser.pause(5000);
    const toolTipHeading = await this.doGetText(await this.getToolTipText, "Fetch tooltip text");
    const entity = entityType === 'PROCESS' ? processName : entityType === 'SUBPROCESS' ? subProcessName : assumption;
    const cycleName = (entityType === 'PROCESS' || entityType === 'SUBPROCESS') ? 'Cycle Name' : 'Origin Cycle';
    if(entity === processName) {
      checkProcessProgress = this.doesElementExist(await this.progressBar,"progress bar exists or not");
      await CommonFunctions.compareTwoValues(checkProcessProgress, true, "Progress bar is displayed");
    }
    await CommonFunctions.logMessage('INFO',`Entity: ${entity}, Cycle Name: ${cycleName}`);
    
    const entityNameText = await this.doGetText(await this.getEntityName(entity ?? ''), "Fetch entity name text");;
    const statusText = await this.doGetText(await this.getStatusText, "Fetch status text");
    const cycleNameText = await this.doGetText(await this.getCycleName(cycleName), "Fetch cycle name text");
    await CommonFunctions.logMessage('INFO',`entityNameText : ${entityNameText}, statusText : ${statusText}, cycleNameText:  ${cycleNameText}`);
    
    await this.navToEntityDetailsPage(entityType);
    const processNameText = await this.getProcessNameText(entity ?? '');
    await browser.waitUntil(async () => (await processNameText.isDisplayed()),{timeout:25000,timeoutMsg:'PO process details not loaded',interval:5});
    await browser.pause(10000);
    await CommonFunctions.logMessage('INFO',`processNameText : ${await this.getProcessNameText(entity ?? '').getText()} toolTipHeading :  ${toolTipHeading} checkProcessProgress : ${checkProcessProgress}`);
    if (toolTipHeading && entityNameText && statusText &&  cycleNameText && processNameText && checkProcessProgress) {
      return true;
    };
  }

  public async verifyBackButtonExsits() {
    const isBackButtonExists = await this.doesElementExist(await this.getBackIcon, "Back button exists or not");
    await CommonFunctions.logMessage('INFO',`${isBackButtonExists} - back button does not exists`);
    return isBackButtonExists;
  }
  
  public async verifyNavigationOnClickOfEntityChip(entityType: string, processName :string, subProcessName?: string, assumption?: string) {
    await this.clickOnSpecificEntityInPowerBar(processName, subProcessName, assumption);
    let entity = entityType === 'PROCESS' ? processName : entityType === 'SUBPROCESS' ? subProcessName : assumption;
    const processNameText = await this.getProcessNameText(entity ?? '');
    await browser.waitUntil(async () => (await processNameText.isDisplayed()),{timeout:25000,timeoutMsg:'PO process details not loaded',interval:5});
    await CommonFunctions.logMessage('INFO',`Navigated to ${entityType} details page from PowerBar`);
    const isProcessNameDisplayed = await this.doesElementExist(await processNameText , "process name text is exists or not");
    return isProcessNameDisplayed;
  }

  public async verifyNavigationOnClickOfEntityChipInPo(entityType: string, processName :string, subProcessName?: string, assumption?: string) {
    // Click on the specific entity based on entityType
    let targetEntityName: string;
    if (entityType === 'PROCESS') {
      targetEntityName = processName;
    } else if (entityType === 'SUBPROCESS') {
      targetEntityName = subProcessName || '';
    } else {
      targetEntityName = assumption || '';
    }
    
    const entityElement = await this.getEntityDetailsByText(targetEntityName);
    await this.doClick(entityElement, `Clicked on PowerBar entity: ${targetEntityName}`);
    
    let entity = entityType === 'PROCESS' ? processName : entityType === 'SUBPROCESS' ? subProcessName : assumption;
    const processNameText = await this.getProcessNameText(entity ?? '');
    await browser.waitUntil(async () => (await processNameText.isDisplayed()),{timeout:25000,timeoutMsg:'PO process details not loaded',interval:5});
    await CommonFunctions.logMessage('INFO',`Navigated to ${entityType} details page from PowerBar`);
    const isProcessNameDisplayed = await this.doesElementExist(await processNameText , "process name text is exists or not");
    return isProcessNameDisplayed;
  }

  public async selectCloneMemberType(cloneMemberType: ICloneMemberType) {
    if(cloneMemberType == "New Intersection") {
      const input = await this.newIntersectionButton;
      const isSelected = await input.isSelected();
      !isSelected && await input.click();
      await CommonFunctions.logMessage("INFO", "Selected clone member as New intersection");
    } else {
      const input = await this.newMemberButton;
      const isSelected = await input.isSelected();
      !isSelected && await input.click();
      await CommonFunctions.logMessage("INFO", "Selected clone member as New member");
    }
  }

  public async clickSelectDimensionBtn() {
    const selectDimensionButton = await this.selectDimensionButton;
    await selectDimensionButton.click();
    await browser.pause(2000);
    await CommonFunctions.logMessage("INFO", "Clicked on plus icon to select dimensions from list");
  }

  public async toggleDimensionCheckbox(selectDimension: boolean, dimension: string) {
    const checkbox = await this.selectDimesionCheckboxDiv(dimension);
    const isChecked = await checkbox.isSelected();
    if(selectDimension) {
      !isChecked && await checkbox.click();
      await CommonFunctions.logMessage("INFO", `Selected dimension: ${dimension}`);
    } else {
      isChecked && await checkbox.click();
      await CommonFunctions.logMessage("INFO", `Unselected dimension: ${dimension}`);
    }
  }

  public async clickAddDimesnionsBtn() {
    const addButton = await this.addDimensionButton;
    await addButton.click();
    await CommonFunctions.logMessage("INFO", "Clicked on add button");
    await browser.pause(2000);
  }

  public async toggleDimension(dimension: string, selectDimension: boolean) {
    await this.clickSelectDimensionBtn();
    const searchInput = await this.dimensionSearch;
    await this.enterInputValue(searchInput, dimension);
    await this.toggleDimensionCheckbox(selectDimension, dimension);
    await this.clickAddDimesnionsBtn();
  }


  public async selectDimensionValue(cloneMemberType: ICloneMemberType, dimension: string, attribute: keyof typeof DimensionAttributes, value: string) {
    let input: any;
    let inputEle = await this.dimensionInput(dimension, attribute);
    if(cloneMemberType == "New Member" && attribute === "Target Level") {
      input = await inputEle[1];
    } else {
      input = await inputEle[0];
    }
    await this.selectWithSearchInDropdown(input, value);
    await CommonFunctions.logMessage("INFO", `Selected value: ${value} for dimension: ${dimension} for attribute: ${attribute}`);
    await browser.pause(1000);
  }

  public async getDimensionValue(cloneMemberType: ICloneMemberType, dimension: string, attribute: keyof typeof DimensionAttributes) {
    let input: any;
    let inputEle = await this.dimensionInput(dimension, attribute);
    if(cloneMemberType == "New Member" && attribute === "Target Level") {
      input = await inputEle[1];
    } else {
      input = await inputEle[0];
    }
    const value = await this.getInputValue(input);
    await CommonFunctions.logMessage("INFO", `Value of ${attribute} for dimension: ${dimension} is ${value}`);
    await browser.pause(1000);
    return value;
  }

  public async getTargetDimensionValue(dimension: string) {
    let targetValueText = await this.targetValueDimensionInput(dimension);
    const value = await this.getInputValue(targetValueText);
    await CommonFunctions.logMessage("INFO", `Value of Target Member for dimension: ${dimension} is ${value}`);
    await browser.pause(1000);
    return value;
  }
  
  public async selectTargetDimensionValue(dimension: string, value: string) {
    let targetValueText = await this.targetValueDimensionInput(dimension);
    let title = await this.cloneMemberTitle;
    await targetValueText.setValue(value);
    await title.click();
    await browser.pause(3000);
  }

  public async enterInputValue(input: any, value: any) {
    await input.click();
    await input.setValue(['Control', 'a']); 
    await input.keys('Backspace'); 
    await input.setValue(value);
    await CommonFunctions.logMessage("INFO", `Entered value: ${value}`);
    await browser.pause(1000);
  }

  public async selectWithSearchInDropdown(input: any, value: any) {
    await this.enterInputValue(input, value);
    await browser.keys('Down arrow')
    await browser.pause(500);
    await browser.keys('Enter');
    await CommonFunctions.logMessage("INFO", `Selected value: ${value} for input`);
    await browser.pause(1000);
  }

  public async deleteDimension(dimension: string) {
    const deleteButton = await this.deleteDimensionButton(dimension);
    await deleteButton.click();
    await browser.pause(1000);
    await CommonFunctions.logMessage("INFO", "Clicked on delete dimension icon");
    return true;
  }

  public async selectLaunchDate(date?: string) {
    const inputEle = await this.launchDateInput;
    if(date) {
      const inputEle = await this.launchDateInput;
      await this.enterInputValue(inputEle, date);
      await CommonFunctions.logMessage("INFO", `Selected ${date} as launch date`);
    } else {
      await CommonFunctions.logMessage("INFO", "Selected today's date as launch date");
    }
  }

  public async isCreateCloneMemberEnabled() {
    await browser.pause(2000);
    const createButton = await this.cloneMemberCreate;
    const isEnabled = await createButton.isEnabled();
    await CommonFunctions.logMessage("INFO", `Create clone member button is enabled :: ${isEnabled}`);
    if(isEnabled) {
      return true;
    }
    return false;
  }

  public async cancelCloneMemberFromModal() {
    const button = await this.cloneMemberCancel;
    await button.click();
    await browser.pause(2000);
    await CommonFunctions.logMessage("INFO", `Clicked on Cancel button`);
  }

  public async clickOnCancelIcon() {
    await this.doClick(await this.closeIconInFlyout, "Clicked on Cancel icon in flyout");
  }


  public async createCloneMember() {
    const isEnabled = await this.isCreateCloneMemberEnabled()
    if(isEnabled) {
      await this.doClick(await this.cloneMemberCreate, "Clicked on create button to clone member");
      return true;
    }
    return false;
  }

  public async setNoOfCopies(copies: number) {
    const inputEle = await this.noOfCopiesInput;
    await this.enterInputValue(inputEle, copies);
    await CommonFunctions.logMessage("INFO", `Set no. of copies to ${copies}`);
  }

  public async verifyCloneMemberTriggered(): Promise<boolean> {
    const title = await this.cloneMemberTitle;
    await title.waitForDisplayed({ timeout: 10000 });
    if((await title.isDisplayed())) {
      await CommonFunctions.logMessage("INFO", "Clone member got triggered");
      return true;
    }
    await CommonFunctions.logMessage("INFO", "Clone member didn't triggered");
    return false;
  }

  public async getDimensionsSelected() {
    let titlesArray: any = [];
    const titles = await this.dimensionTitle;
    for (let i = 0; i < titles.length; i++) {
      const element = await titles[i];
      const title = await this.getElemementText(element);
      titlesArray.push(title);
    }
    await CommonFunctions.logMessage("INFO", `Dimensions selected: ${titlesArray}`);
    return titlesArray;
  }

  public async verifyDimensionsPrefilled(cloneMemberType: ICloneMemberType, dimensions: string[]) {
    for (let i = 0; i < dimensions.length; i++) {
      const dimension = dimensions[i];
      const isPrefilled = await this.verifyDimensionPrefilled(cloneMemberType, dimension);
      if(!isPrefilled) {
        return false;
      }
    }
    await CommonFunctions.logMessage("INFO", "Dimension values got prefilled:: true");
    return true;
  }

  public async verifyDimensionPrefilled(cloneMemberType: ICloneMemberType, dimension: string) {
    let isPrefilled = true;
    if(cloneMemberType === "New Member") {
      await this.isDimensionValueEmpty(cloneMemberType, dimension, "Reference Level") ? isPrefilled = false : '';
      await this.isDimensionValueEmpty(cloneMemberType, dimension, "Reference Member") ? isPrefilled = false: '';
    }
    await this.isDimensionValueEmpty(cloneMemberType, dimension, "Target Level") ? isPrefilled = false : '';
    await this.isDimensionValueEmpty(cloneMemberType, dimension, "Target Member") ? isPrefilled = false : '';
    return isPrefilled;
  }

  public async isDimensionValueEmpty(cloneMemberType: ICloneMemberType, dimension: string, attribute: keyof typeof DimensionAttributes) {
    const value = (attribute === "Target Member") ? await this.getTargetDimensionValue(dimension): await this.getDimensionValue(cloneMemberType,dimension,attribute);
    if(!value) {
      await CommonFunctions.logMessage("INFO", `No Value of ${attribute} for dimension: ${dimension} is selected`);
      return true;
    }
    return false;
  }

  

  public async getInputValue(input: any) {
    await input.waitForDisplayed({ timeout: 3000 });
    const value = await input.getValue();
    await CommonFunctions.logMessage("INFO", `Value of input: ${value}`);
    return value;
  }

  public async getElemementText(element: any) {
    await element.waitForDisplayed({ timeout: 3000 });
    const value = await element.getText();
    await CommonFunctions.logMessage("INFO", `Value of the element: ${value}`);
    return value;
  }

  public async triggerDockSearchInput(searchText: string, isHiddenView: boolean = false) {
    await browser.switchToParentFrame();
    const searchInput = await $('[data-testid="command-bar-search-textfield-input"]');
    const isSearchInputDisplayed = await searchInput.isDisplayed();
    if (isSearchInputDisplayed) {
      await CommonFunctions.logMessage("INFO", "Search input already displayed, clicking on it directly");
      await searchInput.click();
    } else {
      const dockArea = await this.getDockArea();
      await dockArea.waitForExist({ timeout: 20000 });
      await dockArea.waitForDisplayed({ timeout: 20000 });
      await dockArea.scrollIntoView();
      await dockArea.moveTo();
      await CommonFunctions.logMessage("INFO", "Clicked on search button in dock area");
      await browser.pause(5000);
      await searchInput.waitForDisplayed({ timeout: 20000 });
    }
    await CommonFunctions.logMessage("INFO", `Setting search text in dock area: ${searchText}`);
    await searchInput.setValue(searchText);
    await browser.pause(2000);

    return isHiddenView ? false : true;
  }

  public async navigateToView(viewName, isHiddenView:boolean = false) {
    let isViewNavigated: boolean;
    if (isHiddenView) {
      await this.switchToMFEFrame();
      // await (await $("body")).click();
      await browser.pause(1000);
      await CommonFunctions.compareTwoValues(isHiddenView, true, `${viewName} is hidden, Navigation not possible`);
      isViewNavigated = false;
    } else {
      await browser.keys("Enter");
      await browser.pause(20000);
      await CommonFunctions.compareTwoValues(!isHiddenView, true, `Navigating to the view ${viewName}`);
      isViewNavigated = true;
    }

    return isViewNavigated;
  }

  public async selectViewByType(viewType: "All Views" | "Favourites" | "Hidden Views") {
    await CommonFunctions.logMessage("INFO","Selection of the view from the dropdown");
    await this.clickViewsDropDown();
    const selectDropdown = await this.selectProcessDropdown;
    const existingViewType: string = await selectDropdown.getValue();
    await CommonFunctions.logMessage("INFO",`Existing selected view type is ${existingViewType}`);

    if (existingViewType != viewType) {
      await CommonFunctions.logMessage("INFO", `Waiting for views dropdown to be clickable`);
      await selectDropdown.waitForClickable({ timeout: 10000 });

      await CommonFunctions.logMessage("INFO", `Clicking on views dropdown`);
      await browser.execute(async (ele) => {
        ele.click();
      }, selectDropdown);
      await browser.pause(10000);
      const selectViewType = await this.getViewType(viewType);
      await CommonFunctions.logMessage("INFO",`Selected view type is "${viewType}" from dropdown`);
      await browser.execute(async (ele) => {
        await ele.click();
      }, selectViewType);
      await browser.pause(10000);
    }
  }

  public async verifyObjectiveBarDetails(){
    await browser.switchToParentFrame();
    const objectiveBar = await this.getObjectiveBar;
    await CommonFunctions.logMessage("INFO",`Objective bar is displayed : ${await objectiveBar.isExisting()}`);
    return await objectiveBar.isExisting();
  }

  public async closeScenarioFilter(){
  await this.sideNavClose();
  await CommonFunctions.logMessage("INFO", "Closed the side navigation panel");
  }

  public async verifyNewScopeFilter(title: string): Promise<boolean> {
    const scopeChip = await this.scopeChipInPowerBar;
    await scopeChip.waitForDisplayed({ timeout: 90000 });
    await this.doClick(scopeChip, "Clicked on scope chip in PowerBar");
    await browser.pause(2000);
    const sideNavTabText = await this.doGetText(await this.sideNavTitle,"Fetching side navigation title");
    await CommonFunctions.logMessage('INFO', `${sideNavTabText} opened in sidenav`);
    return  (sideNavTabText === title);
  }

  public async verifyNewScenarioFilter(title) {
    const scenarioChip = await this.scenarioChipInPowerBar;
    await scenarioChip.waitForDisplayed({ timeout: 90000 });
    await this.doClick(scenarioChip, "Clicked on PowerBar scenario chip");
    await browser.pause(2000);
    const sideNavTitle = await this.doGetText(await this.sideNavTitle,"Fetching side navigation title");
    await CommonFunctions.logMessage('INFO', `${sideNavTitle} opened in sidenav`);
    return  (sideNavTitle === title);
  }


  public async externalLinkOpenFromScenarioFilter() {
    try {
      await browser.pause(2000);
      const xpathToClick = "//button[@data-testid='external-link-btn']"
      // Step 1: Locate and click the external link
      const linkElement = await $(xpathToClick);
      await browser.pause(3000);
      await linkElement.click();
      await CommonFunctions.logMessage('INFO', 'Clicked on external link');

      // Step 2: Wait for 'All Scenarios' text to appear
      await browser.pause(10000);
      const allScenariosSelector = "//*[contains(text(), 'All Scenarios')]";
      const allScenariosElement = await $(allScenariosSelector);

      const appeared = await allScenariosElement.waitForDisplayed({
        timeout: 10000,
        timeoutMsg: "'All Scenarios' text did not appear within 10 seconds"
      });

      if (appeared) {
        await CommonFunctions.logMessage('INFO', "Verified: 'All Scenarios' text appeared");
        return true;
      }
    } catch (error) {
      await CommonFunctions.logMessage('ERROR', `externalLinkOpen failed: ${String((error as any)?.message || error)}`);
      return false;
    }
  };

  public async selectEntityFromContext(Context:Context,isOpenedInTab:boolean=false, waitForDetailsPage?: boolean) {
    const { process, subProcess, assumption } = Context;
    await browser.pause(5000);
    await this.clickOnListingIcon();
    await this.doClick(await this.getContextSwitchItem, "Clicked on context switch item memu");
    await this.doClick(await this.selectProcessContext(process), `Clicked on ${process} process from context switch`);
    let validation;
    if(subProcess){
      await this.doClick(await this.selectChildProcess(), "Clicked on child process button");
      await this.doClick(await this.selectContextEntity(subProcess), `Clicked on ${subProcess} process from context switch`);
      await browser.pause(3000);
      validation= await this.verifySwitchContextEntity({process,subProcess},isOpenedInTab,waitForDetailsPage);
    } else if(assumption) {
      await this.doClick(await this.selectAssumptions(), "Clicked on child process button");
      await this.doClick(await this.selectContextEntity(assumption), `Clicked on ${assumption} process from context switch`); 
      validation= await this.verifySwitchContextEntity({process,assumption},isOpenedInTab,waitForDetailsPage);
    }else{
      validation= await this.verifySwitchContextEntity({process},isOpenedInTab,waitForDetailsPage);
    }
    return validation
  }

  public async verifySwitchContextEntity(context:Context,isOpenedInTab:boolean = false, waitForDetailsPage?: boolean) {
    const { process, subProcess, assumption } = context;
    await browser.pause(5000);    
    if(!isOpenedInTab){
      const switchButton =await  this.getContextSwitchButton
      await switchButton.click();       
    }else{
      const launchButton =await  this.getLaunchInNewTabButton
      await launchButton.click();  
      await browser.closeWindow();
      await CommonFunctions.switchToSpecificWindow(0);
      await browser.pause(10000);
      await this.switchToMfe();   
    }
    await browser.pause(10000)
    const getProcessName = await this.verifyContextEntity(process,subProcess,assumption,waitForDetailsPage);
    if(getProcessName) {
      await CommonFunctions.logMessage('INFO',`Context is changed :  ${getProcessName}`);
      return  true;
    }
  }

  public async verifyGlobalSaveDisabled(): Promise<boolean> {
    let isDisabled: boolean = false;
    const globalSaveBtn = await this.globalSaveIcon;
    await globalSaveBtn.waitForDisplayed({ timeout: 30000 });
    try {
      isDisabled = await globalSaveBtn.isEnabled();
      if (!isDisabled) {
        await CommonFunctions.logMessage('INFO', "Global Save Icon is disabled on dashboard");
      } else {
        await CommonFunctions.logMessage('INFO', "Global Save Icon is enabled on dashboard");
      }
    }
    catch (e) {
      await CommonFunctions.logMessage('INFO', "Global Save Icon is not exist on dashboard")
    }
    return !isDisabled;
  }

  public async clickGlobalSaveAndVerify(): Promise<boolean> {
    const isDisabled = await this.verifyGlobalSaveDisabled();
    if(!isDisabled) {
      await CommonFunctions.logMessage('INFO', "Clicking Global Save Icon");
      const globalSaveBtn = await this.globalSaveIcon;
      await globalSaveBtn.click();
      await browser.pause(5000);
      const verifySavingAlert = await CommonFunctions.verifyAlertMsg('We are saving your changes.')
      await CommonFunctions.compareTwoValues(verifySavingAlert, true, "Global Save Saving is displayed");
      if(verifySavingAlert) {
        const verifySuccessAlert = await CommonFunctions.verifyAlertMsg('Your changes have been saved successfully.');
        await CommonFunctions.compareTwoValues(verifySuccessAlert, true, 'Global save done successfully');
        return verifySavingAlert && verifySuccessAlert;
      }
      return false;
    }
    else {
      await CommonFunctions.logMessage('INFO', "Global Save Icon is disabled, not clicking");
      return false;
    }
  }
  


  public async launchPSFromDockSearchWithContext(searchTerm: string, entityType: entity, entityVal: string) {
      await this.triggerDockSearchInput(searchTerm);
      await browser.keys("Enter");
      await browser.pause(15000);
      await this.switchToMFEFrame();
      await this.launchContext(entityType, {process: entityVal});
  }

  public async launchPOFromDockSearch(searchTerm: string) {
    await this.triggerDockSearchInput(searchTerm);
    await browser.keys("Enter");
    await browser.pause(15000);   //change it to 15000
    await this.switchToMFEFrame();
  }


  public async getScopeNameFromPowerBar(): Promise<string> {
    return await this.doGetText(this.scopeChipInPowerBar, "Fetching filtername from powerbar");
  }

  public async isFlyoutOpen(): Promise<boolean> {
    const flyout = await this.flyoutTitle;
    await flyout.waitForDisplayed({ timeout: 10000 });
    const isDisplayed = await flyout.isDisplayed();
    await CommonFunctions.logMessage('INFO', `Flyout is opened: ${isDisplayed}`);
    return isDisplayed;
  }

  public async createMemberForm(formData: any, mode: "choose" | "ref-assortment", placeholderType: "Member" | "Intersection") {
    await browser.pause(5000);
    await this.doClick(await this.getPlaceholderType(placeholderType), `Clicked on ${placeholderType} button`);
    await browser.pause(5000);
    for (let field of formData) {
      if (field.DIMENSION_NAME === "ITEM") {
        const nodes = field.VALUE?.split(">") || [];
        if (nodes.length > 0) {
          await this.doClick(await this.selectPrdouctDropdown, "Clicked on product dropdown");
          await this.doEnterText(await this.dropdownSearchInp, nodes[nodes?.length - 1], `Entering ${nodes[nodes?.length - 1]} in search input`);
          for (let i = 0; i < nodes.length - 1; i++) {
            await this.doClick(await this.getNodeAccordion(nodes[i]), `Expanding ${nodes[i]} from dropdown`);
          }
          await this.doClick(await this.getNodeOption(nodes[nodes?.length - 1]), `Selecting ${nodes[nodes?.length - 1]} from dropdown`);
        }
        if (placeholderType === "Member") {
          await this.doEnterText(await this.newNameInp, field.newItemName || '', "Entering new name");
          await this.clearAndSetInputValue(await this.noOfVaariantsInp, field.noOfVariants || '1')
        }
        continue;
      }
      placeholderType === "Member" && await this.doClick(await this.getRadioButton(field.DIMENSION_NAME, mode), `Clicked on ${mode} radio button in ${field.DIMENSION_NAME} dimension`);
      if (mode === "choose") {
        await this.doClick(await this.getMultiSelectDropdown(field.DIMENSION_NAME), `Clicked on ${field.DIMENSION_NAME} dropdown`);
        for (let value of field.VALUE) {
          const nodes = value?.split(">") || [];
          await this.doEnterText(await this.dropdownSearchInp, nodes[nodes?.length - 1], `Entering ${nodes[nodes?.length - 1]} in search input`);
          for (let i = 0; i < nodes.length - 1; i++) {
            await this.doClick(await this.getNodeAccordionInMultiSelect(nodes[i]), `Expanding ${nodes[i]} from dropdown`);
          }
          await this.doClick(await this.getNodeOption(nodes[nodes?.length - 1]), `Selecting ${nodes[nodes?.length - 1]} from dropdown`);
          await this.doClick(await this.clearSearchIcon, `Clearing search input in dropdown`);
        }
        await this.doClick(await this.flyoutPresentation, `Clicking on away to close dropdown`);
      }
    }
    await this.createCloneMember()
  }

  public async validateDimesionsInUI(expectedDimensions: string[]): Promise<boolean> {
    const dimensionEle = await this.getDimensionsFromFlyout();
    const dimensionTexts: string[] = [];
    for (const ele of dimensionEle) {
      const text = await ele.getText();
      dimensionTexts.push(text);
    }
    if(dimensionTexts.length != expectedDimensions.length) {
      await CommonFunctions.logMessage("ERROR", `Expected dimensions count: ${expectedDimensions.length}, Actual dimensions count: ${dimensionTexts.length}`);
      return false
    }
    const allExist = expectedDimensions.every(item1 => dimensionTexts.some(item2 => item2.toLowerCase().includes(item1.toLowerCase())));
    return allExist;
  }

  public async verifyViewIsDirty(viewName: string, cardsDirtyCount: number): Promise<boolean> {
    try {
      const viewHeader = await this.getViewNameText();
      const isViewHeaderDirty = viewHeader?.startsWith(viewName) && viewHeader?.endsWith('*');
      await CommonFunctions.logMessage('INFO', `View header dirty status for ${viewHeader}: ${isViewHeaderDirty}`);
      await browser.pause(2000);
      const dirtyCount = await this.getDirtyViewCount.getText();
      const dirtyCountInPowerbar = await CommonFunctions.compareTwoValues(parseInt(dirtyCount), cardsDirtyCount, `Dirty view count in powerbar for ${viewName}: ${dirtyCount}`);
      return isViewHeaderDirty && dirtyCountInPowerbar;
    }
    catch (error) {
      await CommonFunctions.logMessage('ERROR', `Error while verifying dirty view: ${String((error as any)?.message || error)}`);
      return false;
    }
  }

  public async clickOnDirtyStatePopupButton(buttonName: string): Promise<void> {
    const button = await this.getDirtyStatePopupButton(buttonName);
    await button.waitForClickable({ timeout: 10000 });
    await button.click();
    await CommonFunctions.logMessage('INFO', `Clicked on ${buttonName} button in dirty state popup`);
    await browser.pause(2000);
  }

  public async revertMaasPivotCardChanges() {
    const revertBtn = await this.getPivotCardRevert;
    await revertBtn.waitForClickable({ timeout: 10000 });
    await this.doClickUsingScript(revertBtn, "Clicked on Revert button in Maas Pivot Card");
    await browser.pause(2000);
  }

  public async handleBrowserPopup(action: 'ok' | 'cancel' = 'cancel', timeout: number = 5000): Promise<boolean> {
    try {
      await CommonFunctions.logMessage('INFO', `Waiting for browser popup/alert to handle with action: ${action}`);
      
      await browser.waitUntil(async () => {
        try {
          await browser.getAlertText();
          return true;
        } catch {
          return false;
        }
      }, { timeout: timeout, timeoutMsg: 'No alert/popup appeared within timeout' });

      const alertText = await browser.getAlertText();
      await CommonFunctions.logMessage('INFO', `Alert detected with text: "${alertText}"`);

      if (action === 'ok') {
        await browser.acceptAlert();
        await CommonFunctions.logMessage('INFO', 'Alert accepted');
      } else {
        await browser.dismissAlert();
        await CommonFunctions.logMessage('INFO', 'Alert canceled');
      }

      return true;
    } catch (error) {
      await CommonFunctions.logMessage('INFO', `No popup/alert detected or failed to handle: ${error}`);
      return false;
    }     
  }

  public async verifyPortalBYOICon(): Promise<boolean> {
    await browser.switchToParentFrame();
    const portalBYOIcon = await this.getPortalBYOIcon;
    await portalBYOIcon.waitForDisplayed({ timeout: 10000 });
    const isDisplayed = await portalBYOIcon.isDisplayed();
    await CommonFunctions.logMessage('INFO', `Portal BYO icon is displayed: ${isDisplayed}`);
    return isDisplayed;
  }

  public async clickPortalBYOIcon(): Promise<void> {
    await this.doClick(await this.getPortalBYOIcon, "Clicked on Portal BYO icon");
  }

  public async selectBYOAgent(agentName: string): Promise<void> {
    await CommonFunctions.logMessage('INFO', `Selecting BYO Agent: ${agentName}`);
    await this.doClick(await this.getBYOAgentDropdown, "Clicked on BYO Agent dropdown");
    await this.doClick(await this.getBYOAgentOption(agentName), `Clicked on BYO Agent option: ${agentName}`);
  }

  public async initiateBYOAgentEvent(agentName: string, event: string) {
    await this.selectBYOAgent(agentName);
    await browser.pause(2000);
    await this.doClick(await this.getBYOAgentEvent(event), `Clicked on BYO Agent event button: ${event}`, 500);
  }
  
  public async getLaunchedProcessFromPowerbar() {
    const process = await this.processContextChipEles[0];
    try{
      await browser.pause(7000);
      const isExisting = await process.isDisplayed();
      await CommonFunctions.logMessage("INFO", `Launched Process is existing: ${isExisting}`);
      return await process.getText();
    } catch (error) {
      await CommonFunctions.logMessage("ERROR", `Launched Process is not existing: ${String((error as any)?.message || error)}`);
      return false;
    }
  }

    public async getLaunchedSubProcessFromPowerbar() {
    const process = await this.processContextChipEles[1];
    try{
      await browser.pause(7000);
      const isExisting = await process.isDisplayed();
      await CommonFunctions.logMessage("INFO", `Launched SubProcess is existing: ${isExisting}`);
      return await process.getText();
    } catch (error) {
      await CommonFunctions.logMessage("ERROR", `Launched SubProcess is not existing: ${String((error as any)?.message || error)}`);
      return false;
    }
  }

   public async isLatestRunningSCPDisplayed() {
    const scp = await this.getLatestRunningSCP;
    try {
      await scp.waitForExist({ timeout: 15000 });
      const isExisting = await scp.isDisplayed();
      await CommonFunctions.logMessage("INFO", `Latest Running SCP is existing: ${isExisting}`);
      return true
    } catch (error) {
      await CommonFunctions.logMessage("ERROR", `Latest Running SCP is not existing: ${String((error as any)?.message || error)}`);
      return false;
    }
  }

  public async openSCPListFromPowerBar() {
    await this.doClick(await this.getPowerbarHistoryIcon, "Clicked on SCP List button in PowerBar");
    await browser.pause(5000);
    await CommonFunctions.logMessage("INFO", "Opened SCP List from PowerBar");
  }

  public async isHistoryIconExistsInPowerbar() {
    const historyIcon = await this.getPowerbarHistoryIcon;
    try {
      await historyIcon.waitForDisplayed({ timeout: 5000 });
      const isDisplayed = await historyIcon.isDisplayed();
      await CommonFunctions.logMessage("INFO", `History Icon in PowerBar is displayed: ${isDisplayed}`);
      return isDisplayed;
    } catch (error) {
      await CommonFunctions.logMessage("FAIL", `History Icon in PowerBar is not displayed: ${String((error as any)?.message || error)}`);
      return false;
    }
  }

  public async getProcedureNameOfLatestSCP() {
    const procedureNameEle = await this.getProcedureNameInSCPList;
    await browser.pause(3000);
    const procedureName = await this.doGetText(procedureNameEle[0], "Fetching latest running procedure name from SCP List");
    if (!procedureName) {
      await CommonFunctions.logMessage("ERROR", "Latest Running Procedure Name is not found in SCP List");
      return "";
    }
    await CommonFunctions.logMessage("INFO", `Latest Running Procedure Name from SCP List: ${procedureName}`);
    return procedureName;
  }

  public async getScenarioNameOfLatestSCP() {
    const scenarioNameEle = await this.getScenarioNameInSCPList;
    await browser.pause(3000);
    const scenarioName = await this.doGetText(scenarioNameEle[0], "Fetching latest running scenario name from SCP List");
    if (!scenarioName) {
      await CommonFunctions.logMessage("ERROR", "Latest Running Scenario Name is not found in SCP List");
      return "";
    }
    await CommonFunctions.logMessage("INFO", `Latest Running Scenario Name from SCP List: ${scenarioName}`);
    return scenarioName;
  }

  public async setStatusFilterInSCPList(status: string) {
    await this.doClick(await this.getStatusFilterDropdown, "Clicked on Status Filter Dropdown");
    await this.doClick(await this.setStatusFilterValue(status), `Clicked on Status Filter Value: ${status}`);
    await browser.pause(3000);
  }

  public async setProcedureFilterInSCPList(procedure: string) {
    await this.doClick(await this.getProcedureFilterDropdown, "Clicked on Procedure Filter Dropdown");
    await this.doClick(await this.setProcedureFilterValue(procedure), `Clicked on Procedure Filter Value: ${procedure}`);
    await browser.pause(3000);
  }

  public async goBackToSCPList() {
    await this.doClick(await this.getBackIconToSCPList, "Clicked on Back Icon to SCP List");
  }

  public async getProcedureStatusesFromSCPList() {
    const procedureStatusIcon = await this.getProcedureStatusInSCPList;
    const procedureStatuses: string[] = [];
    for (let i = 0; i < procedureStatusIcon.length; i++) {
      const procedureStatus = await this.doGetAttribute(procedureStatusIcon[i], "data-testid", `Fetching procedure status from SCP List`);
      if (procedureStatus) {
        procedureStatuses.push(procedureStatus);
      }
    }
    await CommonFunctions.logMessage("INFO", `Procedure Statuses from SCP List: ${procedureStatuses.join(", ")}`);
    return procedureStatuses;
  }

  public async getProcedureNamesFromSCPList() {
    const procedureNameEle = await this.getProcedureNameInSCPList;
    const procedureNames: string[] = [];
    for (let i = 0; i < procedureNameEle.length; i++) {
      const procedureName = await this.doGetText(procedureNameEle[i], `Fetching procedure name from SCP List`);
      if (procedureName) {
        procedureNames.push(procedureName);
      }
    }
    await CommonFunctions.logMessage("INFO", `Procedure Names from SCP List: ${procedureNames.join(", ")}`);
    return procedureNames;
  }

  public async clickOnLatestSCPFromList() {
    const latestSCPFromList = await this.getLatestRunningProcedure;
    await this.doClick(latestSCPFromList[0],"Clicking on Latest SCP from SCP List");
  }

  public async getProcedureNameInDetailsPage() {
    const procedureNameEle = await this.getProcedureNameInDetails;
    const procedureNameText = await this.doGetText(procedureNameEle, "Fetching procedure name in procedure details page");
    if (!procedureNameText) {
      await CommonFunctions.logMessage("ERROR", "Procedure Name is not found in Procedure Details Page");
      return "";
    }
    return procedureNameText;
  }

  public async getScenarioNameInDetailsPage() {
    const scenarioNameEle = await this.getScenarioNameInDetails;
    const scenarioNameText = await this.doGetText(scenarioNameEle, "Fetching scenario name in procedure details page");
    if (!scenarioNameText) {
      await CommonFunctions.logMessage("ERROR", "Scenario Name is not found in Procedure Details Page");
      return "";
    }
    return scenarioNameText;
  }

  public async closeSCPList() {
    const closeButton = await this.getHistoryCloseIcon;
    await this.doClick(closeButton, "Clicked on Close SCP List button");
  }

  public async headerTitle() {
    await this.getHeaderTitle.waitForDisplayed({ timeout: 10000 });
  }

  public async verifyViewsDropdown() {
    await this.switchToMFEFrame();
    await browser.pause(10000);
    const isViewsDropDownExist: boolean = await this.doesElementExist(await this.viewsDropDown(),"views drop down exists or not");
    await CommonFunctions.logMessage("INFO",`Is viewsDropDown exist :: ${isViewsDropDownExist}`);
    return isViewsDropDownExist;
  }

  public async viewsSelectionInNewViewsModal(view : string) {
    await this.doClick(await this.viewsDropDown(), "Clicked on views drop down");
    await this.doClick(await this.getViewName(view), "Clicked on view in views tab panel");
    const headerElement = await this.processTitleEle;
    await browser.waitUntil(async () => (await headerElement.isDisplayed()),{timeout:100000,timeoutMsg:'view is not loaded in ps',interval:5});
    return await this.doesElementExist(await headerElement,"header element exists or not");
  }

  public async clickOnAddCommentActionOnCardCell(cardType: ICardType, fieldValue: string) {
    await this.performRightClickOnCardCell(cardType, fieldValue);
    const commentOptionEle = await this.addCommentOption;
    await commentOptionEle.waitForExist({ timeout: 5000 });
    await this.doClick(commentOptionEle, `Clicked on Add Comment option for ${cardType} card with field value: ${fieldValue}`);
  }

  public async sendComment() {
    await browser.pause(2000);
    await this.doClick(await this.submitComment, "Clicked on Submit Comment button");
    await browser.pause(2000);
    await browser.keys("Escape");
    await browser.pause(1000);
  }

  public async addCommentInCardCell(comment: string, tagUser: string = '', shouldClear: boolean = true) {
    if(tagUser) {
      await this.addTextFieldValue(tagUser, this.getCommentInput);
      await browser.keys('Enter');
      await browser.pause(2000);
    }
    await this.addTextFieldValue(comment, this.getCommentInput, shouldClear);
    await this.sendComment();
  }

  public async tagUserInComment(userName: string) {
    await this.addTextFieldValue(userName, this.getCommentInput);
    await browser.keys('Enter');
    await browser.pause(2000);
    await this.sendComment();
  }

  public async editCommentInCardCell(oldComment: string, newComment: string, isUserTagging: boolean = false) {
    const commentElement = await this.getCommentElement(oldComment);
    if(commentElement == null) {
      await CommonFunctions.logMessage("INFO", `Comment "${oldComment}" not found for editing`);
      return ;
    } else {
      await this.performCellCommentAction(oldComment, "Edit comment");
      if(isUserTagging) {
        await this.tagUserInComment(newComment);
      } else {
        await this.addCommentInCardCell(newComment);
      }
    }
  }

  public async openCommentsPanel() {
    await this.doClick(await this.getCommentsPanelButton, "Clicked on Comments Panel button");
    await browser.pause(2000);
  }

  public async performActionOnCommentIfExists(action: string) {
    const commentAction = await this.getActionOnComment(action);
    if(await commentAction.isExisting()) {
      await this.doClick(commentAction, `clicking on action-${action}`)
      return true;
    }
    await CommonFunctions.logMessage('INFO', `${action} doesn't exist`);
    return false;
  }

  public async selectActionOnComment(comment: string, action: string) {
    const getComment = await this.getComment(comment);
    await getComment.waitForExist({timeout:20000});
    if(await getComment.isExisting()) {
      await this.mouseHover(getComment, `hovering on comment - ${comment}`)
    }
    await getComment.scrollIntoView();
    const ele = await this.moreButtonOfComment(comment);
    await ele.waitForExist({timeout:30000})
    await browser.execute(async (ele)=> {
      await ele.click();
    },ele)
    return await this.performActionOnCommentIfExists(action);
  }

  public async editComment(comment: string, editedComment: string) {
    await this.selectActionOnComment(comment, 'Edit Comment')
    await this.addTextFieldValue(editedComment, this.getCommentInput);
    await this.doClick(this.submit, 'clicked submit');
    return true;
  }

    public async deleteComment(comment: string) {
    await this.selectActionOnComment(comment, 'Delete Comment');
    await this.doClick(this.getSaveBtn(), `deleting comment ${comment}`);
    return true;
  }

  public async getCommentDetails() {
    const sections = await $$(`//div[@id='customized-dialog-description']//div[h6]`)
    const details = {};

    for (const section of sections) {
      // Section title
      const titleElem = await section.$('.//h6');
      await titleElem.waitForDisplayed({ timeout: 3000 });
      const title = await titleElem.getText();

      // Initialize section in map
      details[title] = {};

      // Rows inside section
      const rows = await section.$$('.//div[p[contains(@class, "MuiTypography-root")]]');
      for (const row of rows) {
        await row.waitForDisplayed({ timeout: 500 });
        const ps = await row.$$('p');
        if (ps.length >= 2) {
          const label = (await ps[0].getText()).trim();
          const value = (await ps[1].getText()).trim();
          details[title][label] = value;
        }
      }
    }

    await CommonFunctions.logMessage('INFO', `details: ${JSON.stringify(details)}`)
    await this.doClick($(`//button[text()='Close']`), 'closing details');
    return details;
  }

  public async checkCommentExist(comment: string) {
    try {
      await CommonFunctions.logMessage('INFO', `checking comment exists - ${comment}`)
      await this.getComment(comment).scrollIntoView();
      const getComment = await this.getComment(comment);
      if(await getComment.isExisting()) {
        CommonFunctions.logMessage('INFO', `Comment exist - ${comment}`);
        return true;
      }
      CommonFunctions.logMessage('INFO', `Comment doesn't exist - ${comment}`);
      return false;
    }
    catch(e) {
      CommonFunctions.logMessage('INFO', `Comment doesn't exist - ${comment}`);
      return false;
    }
  }

  public async searchCommentInThepannel(comment: string) {
    await CommonFunctions.logMessage('INFO', `searching ${comment}`)
    await this.clearAndSetInputValue(this.searchComment, comment);
  }

  public async getCommentElement(commentString: string) {
  const comments = await this.getComments;
  for (const commentElement of comments) {
    const text = await commentElement.getText();
    if (text.includes(commentString)) {
      return commentElement;
    }
  }
  return null;
}
  
  public async closeCommentsPanel() {
    await browser.pause(2000);
    await this.doClick(await this.getCommentsCloseButton, "Clicked on Close Comments Panel button", 5000);
  }

  public async performCellThreadAction(action: IThreadAction) {
    await this.doClick(await this.getThreadActionsThreeDots, `Clicked on three dots for comments thread action`);
    await this.doClick(await this.getCommentActionOption(action), `Clicked on ${action} button`);
    await browser.pause(2000);
    await browser.keys("Escape");
    await browser.pause(100);
  }

  public async performCellCommentAction(comment: string, action: ICommentAction) {
    await this.doClick(await this.getCommentActionsThreeDots(comment), `Clicked on three dots for comment`);
    await this.doClick(await this.getCommentActionOption(action), `Clicked on ${action} button`);
    if (action === "Delete comment") {
      await browser.keys("Escape");
    }
  }

  public async TroubleShootClick() {
    await this.doClick(await this.troubleShootIcon, "Clicked on TroubleShoot icon");
  }
  public async RestartSession() {
    await this.doClick(await this.restartSessionButton, "Clicked on Restart Session button");
  }

  public async verifyCardsResize() {
    const separator = await this.separator[1];
    const isSeperatorExists = await this.doesElementExist(await separator, "seperator exists or not");
    const location = await separator.getLocation();
    const size = await separator.getSize();
    const startX = location.x + size.width / 2;  // Calculate starting point (center of separator)
    const startY = location.y + size.height / 2;
    await browser.performActions([{   // Perform drag to resize (100px right as example)
        type: 'pointer',
        id: 'mouse',
        parameters: { pointerType: 'mouse' },
        actions: [
            { type: 'pointerMove', duration: 0, x: startX, y: startY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 },
            { type: 'pointerMove', duration: 500, x: startX + 100, y: startY + 50 },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await browser.releaseActions();
    return isSeperatorExists;
  }

  public async verifyCardsInDashboard(cards: Array<string>) {
    await this.waitUntilCardLoaded(cards[0]); // wait until  cards loaded
    for (const each of cards) {
      const isCardExist = await this.doesElementExist(await this.getCardTitleFromDashboard(each), `Card: ${each} exists or not`);
      if (!isCardExist) return false;
    }
    return true;
  }

  public async verifyQuickFilterConfig(quickFilter: Array<string>) {
    await browser.pause(4000);
    for (const each of quickFilter) {
      const value = await this.getFilterValue(each);
      await CommonFunctions.logMessage("INFO", `Quick filter value: ${each} exists: ${await value.isExisting()}`);
      if (!(await value.isExisting())) return false;
    }
    return true;
  }

  public async openManageScenarios(): Promise<void> {
    await this.scenarioChipInPowerBar.waitForDisplayed({ timeout: 20000 });
    await this.scenarioChipInPowerBar.scrollIntoView();
    await browser.waitUntil(async () => await this.scenarioChipInPowerBar.isClickable(), {
      timeout: 20000,
      timeoutMsg: 'Scenario chip button not clickable'
    });
    await this.doClick(this.scenarioChipInPowerBar, 'Clicked on Scenario chip in PowerBar');

    await this.manageScenariosButton.waitForDisplayed({ timeout: 20000 });
    await browser.waitUntil(async () => await this.manageScenariosButton.isClickable(), {
      timeout: 20000,
      timeoutMsg: 'Manage scenarios button not clickable'
    });
    await this.doClick(this.manageScenariosButton, 'Clicked on Manage Scenarios button');
  }

  public async clickBaseScenarioChip(): Promise<void> {
    await this.scenarioChipInPowerBar.waitForClickable({ timeout: 15000 });
    await this.doClick(this.scenarioChipInPowerBar, 'Clicked on Scenario chip in PowerBar');
  }

  public async isDescriptionColumnVisible(): Promise<boolean> {
    await this.manageScenariosDialog.waitForDisplayed({ timeout: 20000 });
    // Give the table a moment to render headers
    await browser.pause(500);

    const candidates = [
      this.descriptionHeaderLabel,
      this.descriptionHeaderLabelByIndex,
      this.descriptionHeaderCellByIndex
    ];

    for (const el of candidates) {
      if (await el.isExisting()) {
        await CommonFunctions.logMessage('INFO', 'Description column is visible');
        return true;
      }
    }
    await CommonFunctions.logMessage('INFO', 'Description column is not visible');
    return false;
  }

  public async isManageScenariosDialogVisible(): Promise<boolean> {
    await this.manageScenariosDialog.waitForDisplayed({ timeout: 20000 });
    const visible = await this.manageScenariosDialog.isDisplayed();
    await CommonFunctions.logMessage('INFO', `Manage Scenarios dialog visible: ${visible}`);
    return visible;
  }

  // Extract assumption ID from URL
  private extractAssumptionId(url: string): string | null {
    const assumptionMatch = url.match(/\/assumption\/([^\/]+)\//); 
    return assumptionMatch ? assumptionMatch[1] : null;
  }

  // Validate that assumption IDs match between two URLs
  public async validateAssumptionIdMatch(firstUrl: string, secondUrl: string, validationMessage: string): Promise<boolean> {
    const firstAssumptionId = this.extractAssumptionId(firstUrl);
    const secondAssumptionId = this.extractAssumptionId(secondUrl);
    
    return await CommonFunctions.compareTwoValues(
      firstAssumptionId === secondAssumptionId && firstAssumptionId !== null,
      true,
      `${validationMessage}: ${firstAssumptionId}`
    );
  }
}
export default new PlanningPage();

