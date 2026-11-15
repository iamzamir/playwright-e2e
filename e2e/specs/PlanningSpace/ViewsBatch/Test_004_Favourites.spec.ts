import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ViewsBatch/Test_004_Favourites.json");
// import TestData from '../../../Testdata/PlanningSpace/ViewsBatch/Test_004_Favourites.json';


describe('Favourites Test', () => {

    let sViewName: string = TestData.VIEW_NAME;

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    });

    it('Test Case 1: Add Favorites', async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.selectAllViewsOrFavourites("All Views");
        await PlanningSpace.addViewToFavourites(sViewName);
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.selectFavourites();

        let sProcessTitle: string = await PlanningSpace.getViewTitleName(false);
        let bValidation1: boolean = await CommonFunctions.compareTwoValues(sProcessTitle, sViewName, sViewName + " View Successfully appeared under Favourites Assertion!");
        let isViewSelected: boolean = await PlanningSpace.isViewSelected(sViewName, true);
        let bValidation2: boolean = await CommonFunctions.compareTwoValues(isViewSelected, true, "View Selected Assertion, View Should be Selected on the Rightside under Favourites");
        expect(bValidation1 && bValidation2).toEqual(true);
    });

    it('Test Case 2: Remove From Favorites', async () => {
        await PlanningSpace.selectAllViewsOrFavourites("All Views", true);
        await PlanningSpace.removeViewToFavourites(sViewName);
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.selectFavourites();
        let isViewSelectedAfterRemoveFav: boolean = await PlanningSpace.isViewSelected(sViewName, false);
        let bValidation: boolean = await CommonFunctions.compareTwoValues(isViewSelectedAfterRemoveFav, false, "View Selected Assertion, should not be present under favourites as removed from Favrouites");
        expect(bValidation).toEqual(true);
        await PlanningSpace.selectAllViewsOrFavourites("All Views");
        await browser.pause(5000);
    });

});