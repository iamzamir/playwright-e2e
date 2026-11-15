import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
import scope from "../../../pageobjects/scope.page";

const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/OnDemandMaas/Test_003_OnDemandNoFilterConfigured.json");

describe('Interactive View - Toast Message Tests', () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        await browser.pause(5000); // Wait for the dashboard to load
    });

    it('Test Case 1: Verify Toast Message is Displayed When Filter is Not Configured', async () => {
        // Verify "Interactive Data Status Icon" is visible
        let isIconVisible = await PlanningSpace.clickInteractiveDataStatus();
        let validation = await CommonFunctions.compareTwoValues(isIconVisible, true, "Interactive Data Status Icon should be visible Assertion");
        await scope.clickOnTab('Scope')
        await browser.pause(1000)
        const isFilterConfigured = await scope.isFilterConfigured();
        // Verify alert message is present when the filter is not configured
        let alertValidation = true; // Default to true if filter is configured (skip the alert check)
        if (!isFilterConfigured) {
            alertValidation = await CommonFunctions.compareTwoValues(await CommonFunctions.verifyAlertMsg('Filter is undefined, some cards are out of sync. Set up a filter and choose your data scope.'), true, 'Filter is undefined, some cards are out of sync. Set up a filter and choose your data scope.');
        }
        expect(validation && alertValidation).toEqual(true);
    });


    it('Test Case 2: Verify Toast Message is Removed After Filter is Configured', async () => {
        // Navigate to the "Scope" tab
        await scope.clickOnTab('Scope');
        await browser.pause(1000);

        // Check if the filter is already configured
        const isFilterConfigured = await scope.isFilterConfigured();

        // If the filter is not configured, configure it
        if (!isFilterConfigured) {
            const filterConfigs = [
                { type: 'ITEM', category: 'Brand', value: ['PF-00'] }, // Correctly specify category and value
            ];
            // Pass the dynamic filter configuration to the function
            await PlanningSpace.configureFilters(filterConfigs);
        }
        // Verify alert message is not present after the filter is configured
        const alertValidation = await CommonFunctions.compareTwoValues(await CommonFunctions.verifyAlertMsg('Filter is undefined, some cards are out of sync. Setup a filter and chose your data scope', 10000), false, 'Filter is undefined, some cards are out of sync. Setup a filter and chose your data scope');
        // Assert that the alert message is no longer present
        expect(alertValidation).toEqual(true);
    });
});
