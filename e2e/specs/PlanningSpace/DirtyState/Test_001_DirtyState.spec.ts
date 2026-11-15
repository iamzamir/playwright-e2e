const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/DirtyState/Test_001_DirtyState.json");
import PlanningSpace from "../../../pageobjects/planning.page";
import ProcessPage from '../../../pageobjects/process.page';
import CommonFunctions from "../../../util/common.util";
import planningPage from "../../../pageobjects/planning.page";
import ApiUtil from "../../../util/api.util";

describe('Dirty state', async () => {
    let accessToken: string, headers: Record<string, string>;
    const url: string = process.env.API_BASE_URL as string + (process.env.UPDATE_FEATURE_TOGGLE as string).replace("{featureFlagName}", TestData.FEATURE_FLAG_NAME);
    before(async () => {
        accessToken = await ApiUtil.getBearerToken();
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessToken
        };
    });


    it(`Test Case 1: * should be appended for view name when data is modified in the card`, async () => {
        const response = await ApiUtil.processAPIRequest("PUT", url, { name: TestData.FEATURE_FLAG_NAME, isEnabled: true }, headers, "Update feature toggle for dirty state", "status");
        const bValidation: boolean = await CommonFunctions.compareTwoValues(response, 200, "Feature toggle updated successfully");
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME_1);
        await planningPage.editCardCell('Enhanced Table', TestData.ENHANCED_TABLE_CARD_NAME);
        await planningPage.editCardCell('PivotCard', TestData.MAAS_PIVOT_CARD_NAME, TestData.MAAS_PIVOT_CARD_DIRTY_STATE_CELL, TestData.MAAS_PIVOT_CARD_DIRTY_STATE_CELL_CHANGE_TO);
        await browser.pause(4000);
        const isDirty = await planningPage.verifyViewIsDirty(TestData.VIEW_NAME_1, 2);
        await CommonFunctions.compareTwoValues(isDirty, true, `View ${TestData.VIEW_NAME_1} is dirty`);
        expect(bValidation && isDirty).toBeTruthy();
    });

    it(`Test Case 2: Should get popup when we try to switch from one view to another view`, async () => {
        // await PlanningSpace.searchViewGoBack();
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME_2);
        await planningPage.clickOnDirtyStatePopupButton('Stay on this page');
        // await PlanningSpace.searchViewGoBack();
        await PlanningSpace.clickViewsDropDown();
        const isDirty = await planningPage.verifyViewIsDirty(TestData.VIEW_NAME_1, 2);
        await CommonFunctions.compareTwoValues(isDirty, true, `View ${TestData.VIEW_NAME_1} is still dirty after canceling the popup`);
        expect(isDirty).toBeTruthy();
    });

    it(`Test Case 3: Should get popup when we try to switch from one module to another module`, async () => {
        await PlanningSpace.goToManageScenarios();
        await planningPage.clickOnDirtyStatePopupButton('Stay on this page');
        const isDirty = await planningPage.verifyViewIsDirty(TestData.VIEW_NAME_1, 2);
        await CommonFunctions.compareTwoValues(isDirty, true, `View ${TestData.VIEW_NAME_1} is still dirty after canceling the popup`);
        expect(isDirty).toBeTruthy();
    });

    it(`Test Case 4: Should get popup when we try to logout`, async () => {
        await browser.pause(2000)
        await PlanningSpace.signOut();
        const boolean1 = await planningPage.handleBrowserPopup('cancel');
        await PlanningSpace.switchToMFEFrame();
        expect(boolean1).toBeTruthy();
    })

    it(`Test Case 5: Should get popup when we click on refresh button and data should get lost when 'Continue Without Saving' is clicked`, async () => {
        await browser.pause(4000);
        await planningPage.clickRefreshBtn();
        await planningPage.clickOnDirtyStatePopupButton('Continue without saving');
        const isDirty = await planningPage.verifyViewIsDirty(TestData.VIEW_NAME_1, 1);
        await CommonFunctions.compareTwoValues(isDirty, false, `View ${TestData.VIEW_NAME_1} is not dirty after clicking on refresh yes`);
        expect(isDirty).toBeFalsy();
    });

    it(`Test Case 6: Revert Maas pivot card to original state`, async () => {
        await planningPage.editCardCell('PivotCard', TestData.MAAS_PIVOT_CARD_NAME, TestData.MAAS_PIVOT_CARD_DIRTY_STATE_CELL_CHANGE_TO, TestData.MAAS_PIVOT_CARD_DIRTY_STATE_CELL);
        await planningPage.revertMaasPivotCardChanges();
        const isDirty = await planningPage.verifyViewIsDirty(TestData.VIEW_NAME_1, 0);
        await CommonFunctions.compareTwoValues(isDirty, false, `View ${TestData.VIEW_NAME_1} is not dirty after reverting the card`);
        expect(isDirty).toBeFalsy();
    });

    it(`Test Case 8: Should not get popup when we try to logout from non dirty views`, async () => {
        await browser.pause(2000)
        await PlanningSpace.signOut();
        const boolean1 = await planningPage.handleBrowserPopup('cancel');
        expect(boolean1).toBeFalsy();
    })

    it(`Test Case 7: Disable the feature toggle for dirty state`, async () => {
        const disablePayload = {
            name: TestData.FEATURE_FLAG_NAME,
            isEnabled: false
        };
        const response = await ApiUtil.processAPIRequest("PUT", url, disablePayload, headers, "Disable feature toggle for dirty state", "status");
        const bValidation = await CommonFunctions.compareTwoValues(response, 200, "Feature toggle disabled successfully");
        expect(bValidation).toBeTruthy();
    });

})