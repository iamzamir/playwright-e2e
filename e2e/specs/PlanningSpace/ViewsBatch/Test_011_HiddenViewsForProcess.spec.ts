import GlobalSettings from '../../../pageobjects/global-settings.page';
import PlanningSpace from '../../../pageobjects/planning.page';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ViewsBatch/Test_011_HiddenViewsForProcess.json");
import SettingsArrangeViews from '../../../pageobjects/view-mapping.page';
import CommonFunctions from '../../../util/common.util';

describe(`Testing Hidden views feature for ${TestData.PROCESS_NAME} process`, () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
    })

    it(`Test Case 1: Hide ${TestData.VIEW_NAME} view for ${TestData.PROCESS_NAME} process in PO`, async () => {
        await PlanningSpace.navToProcessOrchestration();
        await browser.pause(3000);
        await GlobalSettings.clickGlobalSettings();
        await browser.pause(2000);
        await GlobalSettings.clickGlobalSettingsListMenu('Process');
        await browser.pause(3000);
        await SettingsArrangeViews.selectProcess(TestData.PROCESS_NAME);
        await browser.pause(3000);
        await SettingsArrangeViews.selectProcessAction(TestData.PROCESS_NAME, 'Map With...');
        await browser.pause(5000);
        await SettingsArrangeViews.hideOrUnhideView(TestData.VIEW_NAME,"HIDE_VIEW");
        await browser.pause(3000);
        const isSaved = await SettingsArrangeViews.clickSave();
        await browser.pause(5000);
        await CommonFunctions.compareTwoValues(isSaved, true, 'Should save the configuration');
        expect(isSaved).toBeTruthy
    });

    it('Test Case 2: Add to favourite icon should not be displayed for hidden view', async () => {
        await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
        await browser.pause(5000);
        await PlanningSpace.switchToMfe();
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.selectAllViewsOrFavourites("Hidden Views", false);
        await browser.pause(3000);
        await SettingsArrangeViews.expandViewContainer(TestData.VIEW_GROUP_NAME);
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        await browser.pause(3000);
        const favouriteIcon = await PlanningSpace.isFavouriteIconDisplayed();
        await CommonFunctions.compareTwoValues(favouriteIcon, false, `Favourite icon should not be present in ${TestData.VIEW_NAME} hidden view`)
        expect(favouriteIcon).not.toBeTruthy;
    });

    it('Test Case 3: Click on back button from selected hidden view it should go to the previous view', async () => {
        // await PlanningSpace.searchViewGoBack();
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.selectAllViewsOrFavourites("All Views", false);
        await browser.pause(3000);
        await PlanningSpace.clickOnChildviews();
        const previousView = await PlanningSpace.getSelectedViewName();
        await PlanningSpace.selectAllViewsOrFavourites("Hidden Views");
        await browser.pause(3000);
        // await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.ExpandAllViewGroup();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        await browser.pause(3000);
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.clickBackHiddenView(), true , `Should able to click on back btn of hidden view`)
        await browser.pause(3000);
        // await PlanningSpace.searchViewGoBack();
        const currentView = await PlanningSpace.getSelectedViewName();
        await browser.pause(3000);
        const bValidation2 = await CommonFunctions.compareTwoValues(previousView, currentView, `Should navigate to previous view on click of back button`)
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

    it(`Test Case 4: UnHide ${TestData.VIEW_NAME} view for ${TestData.PROCESS_NAME} process in PO`, async () => {
        await PlanningSpace.navToProcessOrchestration();
        await browser.pause(3000);
        await GlobalSettings.clickGlobalSettings();
        await browser.pause(2000);
        await GlobalSettings.clickGlobalSettingsListMenu('Process');
        await browser.pause(3000);
        await SettingsArrangeViews.selectProcess(TestData.PROCESS_NAME);
        await browser.pause(3000);
        await SettingsArrangeViews.selectProcessAction(TestData.PROCESS_NAME, 'Map With...');
        await browser.pause(5000);
        await SettingsArrangeViews.hideOrUnhideView(TestData.VIEW_NAME,"SHOW_VIEW");
        await browser.pause(3000);
        const isSaved = await SettingsArrangeViews.clickSave();
        await browser.pause(5000);
        await CommonFunctions.compareTwoValues(isSaved, true, 'Should save the configuration');
        expect(isSaved).toBeTruthy
    });

});