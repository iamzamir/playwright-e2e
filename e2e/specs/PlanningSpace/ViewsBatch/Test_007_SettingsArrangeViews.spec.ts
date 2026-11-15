import GlobalSettings from "../../../pageobjects/global-settings.page"
import PlanningSpace from "../../../pageobjects/planning.page"
// import TestData from '../../../Testdata/INTEROP/PlanningSpace/ViewsBatch/Test_007_SettingsArrangeViews.json';
import SettingsArrangeViews from '../../../pageobjects/view-mapping.page';
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ViewsBatch/Test_007_SettingsArrangeViews.json");

describe('Arranging Views and Verify in Planning space - Process & Subprocess', () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    })

    it('Test case 1 : Map with 1 process', async () => {
        await PlanningSpace.navToProcessOrchestration();
        await GlobalSettings.clickGlobalSettings();
        await GlobalSettings.clickGlobalSettingsListMenu('Process');
        await SettingsArrangeViews.selectProcess(TestData.PROCESS_NAME);
        await SettingsArrangeViews.selectProcessBulkAction('Remove All Mappings');
        await SettingsArrangeViews.selectProcessAction(TestData.PROCESS_NAME, 'Map With...');
        const mapWithProcess = await SettingsArrangeViews.mapWithProcesscount('Process');
        console.log(mapWithProcess,'test case 1');
        expect(mapWithProcess).toBeTruthy();
    })

    it('Test case 2 : Display selected Views', async () => {
        const selectedViews = await SettingsArrangeViews.displaySelectedViews(TestData.VIEW_GROUPS.VIEW_GROUP1);
        console.log(selectedViews,'test case 2');
        expect(selectedViews).toBeTruthy();
    })
    
    it('Test case 3 : selected views order', async () => {
        const selectedViewsOrder = await SettingsArrangeViews.displayViewsOrder(TestData.VIEWS.VIEW1);
        console.log(selectedViewsOrder,'test case 3');
        expect(selectedViewsOrder).toBeTruthy();
    })

    it('Test case 4 : Should test drag and drop of views', async () => {
        const compareViewsAfterDragAndDrop = await SettingsArrangeViews.checkDragAndDropViews(TestData.VIEW_GROUPS.VIEW_GROUP1, TestData.VIEWS.VIEW2, TestData.VIEWS.VIEW1);
        await CommonFunctions.logMessage('INFO', `Fetched containers and views after drag and drop ${compareViewsAfterDragAndDrop}`);
        await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
        await PlanningSpace.switchToMFEFrame();
        // await PlanningSpace.openSideNav();
        await PlanningSpace.clickViewsDropDown();
        const PSList = await SettingsArrangeViews.getPSContainersAndViews();
        await CommonFunctions.logMessage('INFO', `Fetched containers and views after drag and drop in ps ${PSList}`)
        let validation: boolean = await CommonFunctions.compareTwoValues(compareViewsAfterDragAndDrop.toString(), PSList.toString(), "Arrange Views Assertion");
        console.log('test case 6', validation);
        expect(validation).toBeTruthy();
    })

    it('Test case 5 : Should test drag and drop of view groups', async () => {
        await PlanningSpace.navToProcessOrchestration();
        await GlobalSettings.clickGlobalSettings();
        await GlobalSettings.clickGlobalSettingsListMenu('Process');
        await SettingsArrangeViews.selectProcessBulkAction('Remove All Mappings');
        await SettingsArrangeViews.selectProcess(TestData.PROCESS_NAME);
        await SettingsArrangeViews.selectProcessAction(TestData.PROCESS_NAME, 'Map With...');
        await SettingsArrangeViews.toggleContainer(TestData.VIEW_GROUPS.VIEW_GROUP1, true); 
        const compareViewGroupsAfterDragAndDrop = await SettingsArrangeViews.dragAndDropContainer(TestData.VIEW_GROUPS.VIEW_GROUP2, TestData.VIEW_GROUPS.VIEW_GROUP1);
        await CommonFunctions.logMessage('INFO', `Fetched containers and views after drag and drop ${compareViewGroupsAfterDragAndDrop}`);
        await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
        await PlanningSpace.switchToMFEFrame();
        // await PlanningSpace.openSideNav();
        await PlanningSpace.clickViewsDropDown();
        const getAllViewGruops: string[] = await SettingsArrangeViews.getPSContainersAndViews();
        await CommonFunctions.logMessage('INFO', `Fetched containers and views after drag and drop in ps ${getAllViewGruops}`)
        let validation: boolean = await CommonFunctions.compareTwoValues(compareViewGroupsAfterDragAndDrop.toString(), getAllViewGruops.toString(), "Arrange Views Assertion");
        console.log('test case 7', validation);
        expect(validation).toBeTruthy();
    })
})
