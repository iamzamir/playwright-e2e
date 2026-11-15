import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ViewsBatch/Test_019_PinUnpinInPs.json");

describe('Pin and Unpin Side Drawer', () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(
            TestData.REALM_NAME,
            process.env.FUNCTIONAL_TEST_USERNAME2 as string,
            process.env.FUNCTIONAL_TEST_PASSWORD as string,
            TestData.PROCESS_NAME
        );
    });

    const switchToView = async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.selectAllViewsOrFavourites('All Views');
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        await browser.pause(3000);
    };

    it('Test Case 1: Should verify the scenarios panel is closed initially and behaves as unpinned on view switch by default', async () => {
        await browser.pause(5000);
        const isScenariosDrawerOpenedInitially: boolean = await PlanningSpace.doesSideNavDrawerOpened('Scenarios');
        const isScenariosDrawerOpenedInitiallyValidation = await CommonFunctions.compareTwoValues(isScenariosDrawerOpenedInitially, false, 'Scenarios side panel should not exist initially');
        const isScenariosDrawerOpened: boolean = await PlanningSpace.verifyPowerBarScenarioChipClick();
        const isScenariosDrawerOpenedValidation = await CommonFunctions.compareTwoValues(isScenariosDrawerOpened, true, 'Scenarios side panel should open when the scenario chip is clicked');
        await PlanningSpace.clickRefreshBtn();
        await browser.pause(3000);
        const isScenariosDrawerOpenedAfterRefresh: boolean = await PlanningSpace.doesSideNavDrawerOpened('Scenarios');
        const isScenariosDrawerClosedAfterRefreshValidation = await CommonFunctions.compareTwoValues(isScenariosDrawerOpenedAfterRefresh, false, 'Scenarios side panel should close on view switch when it is unpinned by default');
        expect(isScenariosDrawerOpenedInitiallyValidation && isScenariosDrawerOpenedValidation && isScenariosDrawerClosedAfterRefreshValidation).toBeTruthy();
    });

    it('Test Case 2: Should pin the scenarios panel and verify it persists on view switch', async () => {
        await browser.pause(3000);
        const isScenariosDrawerOpened: boolean = await PlanningSpace.verifyPowerBarScenarioChipClick();
        const isScenariosDrawerOpenedValidation = await CommonFunctions.compareTwoValues(isScenariosDrawerOpened, true, 'Scenarios side panel should open before pinning');
        await PlanningSpace.pinSideDrawer();
        await browser.pause(3000);
        await switchToView();
        const isScenariosDrawerOpenedAfterSwitch: boolean = await PlanningSpace.doesSideNavDrawerOpened('Scenarios');
        const isScenariosDrawerOpenedAfterSwitchValidation = await CommonFunctions.compareTwoValues(isScenariosDrawerOpenedAfterSwitch, true, 'Scenarios side panel should persist in open state after a view switch when pinned');
        expect(isScenariosDrawerOpenedValidation && isScenariosDrawerOpenedAfterSwitchValidation).toBeTruthy();
    });

    it('Test Case 3: Should verify the pinned scenarios panel remains open by default', async () => {
        await browser.pause(3000);
        const isScenariosDrawerOpened: boolean = await PlanningSpace.doesSideNavDrawerOpened('Scenarios');
        const isScenariosDrawerOpenedValidation = await CommonFunctions.compareTwoValues(isScenariosDrawerOpened, true, 'Pinned scenarios side panel should remain open by default');
        expect(isScenariosDrawerOpenedValidation).toBeTruthy();
    });

    it('Test Case 4: Should unpin the scenarios panel and verify it closes on view switch', async () => {
        await browser.pause(3000);
        await PlanningSpace.UnpinSideDrawer();
        await browser.pause(3000);
        const isScenariosDrawerOpened: boolean = await PlanningSpace.verifyPowerBarScenarioChipClick();
        const isScenariosDrawerOpenedValidation = await CommonFunctions.compareTwoValues(isScenariosDrawerOpened, true, 'Scenarios side panel should open when the scenario chip is clicked');
        await PlanningSpace.clickRefreshBtn();
        await browser.pause(3000);
        const isScenariosDrawerOpenedAfterViewSwitch: boolean = await PlanningSpace.doesSideNavDrawerOpened('Scenarios');
        const isScenariosDrawerClosedAfterViewSwitchValidation = await CommonFunctions.compareTwoValues(isScenariosDrawerOpenedAfterViewSwitch, false, 'Scenarios side panel should close after view switch once it is unpinned');
        expect(isScenariosDrawerOpenedValidation && isScenariosDrawerClosedAfterViewSwitchValidation).toBeTruthy();
    });
})