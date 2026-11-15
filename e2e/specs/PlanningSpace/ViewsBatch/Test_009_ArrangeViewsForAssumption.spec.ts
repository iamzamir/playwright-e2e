import GlobalSettings from "../../../pageobjects/global-settings.page"
import PlanningSpace from "../../../pageobjects/planning.page"
import SettingsArrangeViews from '../../../pageobjects/view-mapping.page';
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ViewsBatch/Test_009_ArrangeViewsForAssumption.json");


describe('Arranging Views and Verify in Planning space - Assumption', () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
        await browser.pause(5000);
    })
    it('Test case1 : map with 1 process', async () => {
        await PlanningSpace.navToProcessOrchestration();
        await GlobalSettings.clickGlobalSettings();
        await GlobalSettings.clickGlobalSettingsListMenu('Assumption Type');
        await SettingsArrangeViews.selectAssumptionAction(TestData.ASSUMPTION.ASSUMPTION_TYPE,'Remove Mappings');
        await browser.pause(3000);
        await SettingsArrangeViews.selectAssumptionAction(TestData.ASSUMPTION.ASSUMPTION_TYPE, 'Map With...');
        let mapWithProcess: boolean = await SettingsArrangeViews.mapWithProcesscount('Assumption Type'); 
        expect(mapWithProcess).toBeTruthy(); 
    })
    
    it('Test case2 : display selected views in arrange views', async () => {
        const selectedViews = await SettingsArrangeViews.displaySelectedViews(TestData.VIEW_GROUPS.VIEW_GROUP1);
        expect(selectedViews).toBeTruthy();
    })
    it('Test case3 : selected views order', async () => {
        const selectedViewsOrder = await SettingsArrangeViews.displayViewsOrder(TestData.VIEWS.VIEW1);
        expect(selectedViewsOrder).toBeTruthy();
    })

    it('Should test drag and drop of views', async() => {
        const poList = await SettingsArrangeViews.checkDragAndDropViews(TestData.VIEW_GROUPS.VIEW_GROUP1,TestData.VIEWS.VIEW2, TestData.VIEWS.VIEW1); 
        CommonFunctions.logMessage('INFO', `Views list after drag and drop ${poList}`);
        await PlanningSpace.navigateToPlanningSpace();
        await PlanningSpace.launchContext('Assumption',{ origin: TestData.PROCESS_NAME,assumption: TestData.ASSUMPTION.ASSUMPTION_NAME });
        await PlanningSpace.clickViewsDropDown();
        const PSList = await SettingsArrangeViews.getPSContainersAndViews();
        CommonFunctions.logMessage('INFO', `Views list after drag and drop in PS ${PSList}`)
        const validation: boolean = JSON.stringify(poList) === JSON.stringify(PSList);
        expect(validation).toBeTruthy();
    })

    it('Should test drag and drop of view groups', async () => {
        await PlanningSpace.navToProcessOrchestration();
        await GlobalSettings.clickGlobalSettings();
        await GlobalSettings.clickGlobalSettingsListMenu('Assumption Type');
        await SettingsArrangeViews.selectAssumptionAction(TestData.ASSUMPTION.ASSUMPTION_TYPE,'Remove Mappings');
        await browser.pause(3000);
        await SettingsArrangeViews.selectAssumptionAction(TestData.ASSUMPTION.ASSUMPTION_TYPE, 'Map With...');  
        const poList = await SettingsArrangeViews.dragAndDropContainer(TestData.VIEW_GROUPS.VIEW_GROUP2,TestData.VIEW_GROUPS.VIEW_GROUP1);
        await PlanningSpace.navigateToPlanningSpace();
        await PlanningSpace.launchContext('Assumption',{ origin: TestData.PROCESS_NAME,assumption: TestData.ASSUMPTION.ASSUMPTION_NAME });
        await PlanningSpace.clickViewsDropDown();
        const psViews : string[] = await SettingsArrangeViews.getPSContainersAndViews(TestData.VIEW_GROUPS.VIEW_GROUP2);
        CommonFunctions.logMessage('INFO', `Views list after drag and drop in ps ${psViews}`)
        let bv1 : boolean = JSON.stringify(poList) === JSON.stringify(psViews)
        expect(bv1).toBeTruthy();
    })
})